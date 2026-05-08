import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStripe } from "./stripe-client";

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

export const stripeWebhook = onRequest(
  { secrets: [stripeSecretKey, stripeWebhookSecret] },
  async (request, response) => {
    if (request.method !== "POST") {
      response.status(405).send("Method Not Allowed");
      return;
    }

    const stripe = getStripe(stripeSecretKey.value());
    const sig = request.headers["stripe-signature"] as string;

    let event: ReturnType<typeof stripe.webhooks.constructEvent>;
    try {
      event = stripe.webhooks.constructEvent(
        request.rawBody,
        sig,
        stripeWebhookSecret.value()
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      response.status(400).send("Signature verification failed");
      return;
    }

    const db = getFirestore();

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const obj = event.data.object as any;

      switch (event.type) {
        case "checkout.session.completed":
          await handleCheckoutCompleted(db, obj);
          break;
        case "invoice.paid":
          await handleInvoicePaid(db, obj, stripe, event.account);
          break;
        case "invoice.payment_failed":
          await handleInvoiceFailed(db, obj, stripe, event.account);
          break;
        case "customer.subscription.deleted":
          await handleSubscriptionDeleted(db, obj);
          break;
        case "account.updated":
          await handleAccountUpdated(db, obj);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      response.status(200).json({ received: true });
    } catch (err) {
      console.error(`Error handling ${event.type}:`, err);
      response.status(200).json({ received: true, error: "Handler error" });
    }
  }
);

// ─── checkout.session.completed ──────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleCheckoutCompleted(db: FirebaseFirestore.Firestore, session: any) {
  const meta = session.metadata ?? {};
  const { teacherId, studentId, type, credits: creditsStr } = meta;
  if (!teacherId || !studentId || !type) {
    console.error("Missing metadata on checkout session:", session.id);
    return;
  }

  const creditDocId = `${teacherId}_${studentId}`;
  const creditRef = db.doc(`studentCredits/${creditDocId}`);
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

  // Idempotency: check if transaction with this payment intent already exists
  if (paymentIntentId) {
    const existing = await db
      .collection("transactions")
      .where("stripePaymentIntentId", "==", paymentIntentId)
      .limit(1)
      .get();
    if (!existing.empty) return;
  }

  if (type === "credit_pack") {
    const credits = parseInt(creditsStr ?? "0", 10);
    if (credits <= 0) return;

    await db.runTransaction(async (transaction) => {
      const creditSnap = await transaction.get(creditRef);
      if (creditSnap.exists) {
        transaction.update(creditRef, {
          balance: (creditSnap.data()!.balance || 0) + credits,
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        transaction.set(creditRef, {
          teacherId,
          studentId,
          balance: credits,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      transaction.set(db.collection("transactions").doc(), {
        teacherId,
        studentId,
        type: "credit_pack_purchase",
        amount: session.amount_total,
        credits,
        stripePaymentIntentId: paymentIntentId || null,
        description: `Credit pack: ${credits} credits`,
        createdAt: FieldValue.serverTimestamp(),
      });
    });
  } else if (type === "subscription") {
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;
    const credits = parseInt(creditsStr ?? "0", 10);

    await db.runTransaction(async (transaction) => {
      const creditSnap = await transaction.get(creditRef);
      const currentBalance = creditSnap.exists
        ? (creditSnap.data()!.balance || 0)
        : 0;

      const creditData: Record<string, unknown> = {
        teacherId,
        studentId,
        balance: currentBalance + credits,
        stripeSubscriptionId: subscriptionId,
        subscriptionStatus: "active",
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (creditSnap.exists) {
        transaction.update(creditRef, creditData);
      } else {
        creditData.createdAt = FieldValue.serverTimestamp();
        transaction.set(creditRef, creditData);
      }

      transaction.set(db.collection("transactions").doc(), {
        teacherId,
        studentId,
        type: "subscription_payment",
        amount: session.amount_total,
        credits,
        stripePaymentIntentId: paymentIntentId || null,
        description: `Subscription activated: ${credits} credits/month`,
        createdAt: FieldValue.serverTimestamp(),
      });
    });
  }
}

// ─── invoice.paid (subscription renewal) ─────────────────
async function handleInvoicePaid(
  db: FirebaseFirestore.Firestore,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  invoice: any,
  stripe: ReturnType<typeof getStripe>,
  connectedAccountId?: string | null
) {
  // Skip the first invoice (handled by checkout.session.completed)
  if (invoice.billing_reason === "subscription_create") return;

  const subscriptionId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id;
  if (!subscriptionId || !connectedAccountId) return;

  // Idempotency
  const existing = await db
    .collection("transactions")
    .where("stripeInvoiceId", "==", invoice.id)
    .limit(1)
    .get();
  if (!existing.empty) return;

  // Get subscription metadata from the connected account
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    stripeAccount: connectedAccountId,
  } as Record<string, string>);
  const meta = (subscription as Record<string, any>).metadata ?? {};
  const { teacherId, studentId, creditsPerMonth: creditsStr } = meta;
  if (!teacherId || !studentId || !creditsStr) {
    console.error("Missing metadata on subscription:", subscriptionId);
    return;
  }

  const creditsPerMonth = parseInt(creditsStr, 10);
  const creditDocId = `${teacherId}_${studentId}`;
  const creditRef = db.doc(`studentCredits/${creditDocId}`);

  // Get teacher's rollover cap
  const profileSnap = await db.doc(`teacherProfiles/${teacherId}`).get();
  const rolloverCapMonths = profileSnap.exists
    ? (profileSnap.data()!.creditRolloverCapMonths ?? 2)
    : 2;
  const maxBalance = creditsPerMonth * rolloverCapMonths;

  await db.runTransaction(async (transaction) => {
    const creditSnap = await transaction.get(creditRef);
    const currentBalance = creditSnap.exists
      ? (creditSnap.data()!.balance || 0)
      : 0;

    // Apply rollover cap
    const newBalance = Math.min(currentBalance + creditsPerMonth, maxBalance);
    const actualCreditsAdded = newBalance - currentBalance;

    const subData = subscription as Record<string, any>;
    transaction.update(creditRef, {
      balance: newBalance,
      currentPeriodEnd: subData.current_period_end
        ? new Date(subData.current_period_end * 1000)
        : null,
      lastRolloverAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    transaction.set(db.collection("transactions").doc(), {
      teacherId,
      studentId,
      type: "subscription_renewal",
      amount: invoice.amount_paid,
      credits: actualCreditsAdded,
      stripeInvoiceId: invoice.id,
      description: `Renewal: +${actualCreditsAdded} credits (cap: ${maxBalance})`,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
}

// ─── invoice.payment_failed ──────────────────────────────
async function handleInvoiceFailed(
  db: FirebaseFirestore.Firestore,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  invoice: any,
  stripe: ReturnType<typeof getStripe>,
  connectedAccountId?: string | null
) {
  const subscriptionId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id;
  if (!subscriptionId || !connectedAccountId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    stripeAccount: connectedAccountId,
  } as Record<string, string>);
  const meta = (subscription as Record<string, any>).metadata ?? {};
  const { teacherId, studentId } = meta;
  if (!teacherId || !studentId) return;

  const creditRef = db.doc(`studentCredits/${teacherId}_${studentId}`);
  const creditSnap = await creditRef.get();
  if (creditSnap.exists) {
    await creditRef.update({
      subscriptionStatus: "past_due",
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
}

// ─── customer.subscription.deleted ───────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionDeleted(db: FirebaseFirestore.Firestore, subscription: any) {
  const meta = subscription.metadata ?? {};
  const { teacherId, studentId } = meta;
  if (!teacherId || !studentId) return;

  const creditRef = db.doc(`studentCredits/${teacherId}_${studentId}`);
  const creditSnap = await creditRef.get();
  if (creditSnap.exists) {
    await creditRef.update({
      subscriptionStatus: "cancelled",
      stripeSubscriptionId: null,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
}

// ─── account.updated (teacher Stripe status) ─────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleAccountUpdated(db: FirebaseFirestore.Firestore, account: any) {
  if (!account.charges_enabled || !account.payouts_enabled) return;

  // Find teacher by stripeAccountId
  const profilesSnap = await db
    .collection("teacherProfiles")
    .where("stripeAccountId", "==", account.id)
    .limit(1)
    .get();

  if (profilesSnap.empty) return;

  const profileDoc = profilesSnap.docs[0];
  if (!profileDoc.data().stripeOnboarded) {
    await profileDoc.ref.update({
      stripeOnboarded: true,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
}
