import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStripe, PLATFORM_FEE_PERCENT } from "./stripe-client";
import { validateBaseUrl } from "../utils/validate-base-url";

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");

export const createCheckoutSession = onCall(
  { secrets: [stripeSecretKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in");
    }
    if (request.auth.token.role !== "student") {
      throw new HttpsError("permission-denied", "Students only");
    }

    const { teacherId, type, planId, packId, baseUrl: rawBaseUrl } = request.data ?? {};
    if (!teacherId || !type || !rawBaseUrl) {
      throw new HttpsError("invalid-argument", "teacherId, type, and baseUrl are required");
    }
    const baseUrl = validateBaseUrl(rawBaseUrl);
    if (type !== "subscription" && type !== "credit_pack") {
      throw new HttpsError("invalid-argument", "type must be 'subscription' or 'credit_pack'");
    }

    const db = getFirestore();
    const uid = request.auth.uid;
    const stripe = getStripe(stripeSecretKey.value());

    // Get teacher's Stripe account
    const profileSnap = await db.doc(`teacherProfiles/${teacherId}`).get();
    if (!profileSnap.exists) {
      throw new HttpsError("not-found", "Teacher not found");
    }
    const profile = profileSnap.data()!;
    if (!profile.stripeOnboarded || !profile.stripeAccountId) {
      throw new HttpsError("failed-precondition", "Teacher has not connected Stripe");
    }
    const stripeAccountId = profile.stripeAccountId as string;

    // Look up the plan or pack
    let stripePriceId: string;
    let credits: number;
    let creditsPerMonth: number | undefined;

    if (type === "subscription") {
      if (!planId) {
        throw new HttpsError("invalid-argument", "planId required for subscriptions");
      }
      const planSnap = await db.doc(`subscriptionPlans/${planId}`).get();
      if (!planSnap.exists || planSnap.data()!.teacherId !== teacherId) {
        throw new HttpsError("not-found", "Plan not found");
      }
      const plan = planSnap.data()!;
      if (!plan.active || !plan.stripePriceId) {
        throw new HttpsError("failed-precondition", "Plan is not available");
      }
      stripePriceId = plan.stripePriceId;
      credits = plan.creditsPerMonth;
      creditsPerMonth = plan.creditsPerMonth;
    } else {
      if (!packId) {
        throw new HttpsError("invalid-argument", "packId required for credit packs");
      }
      const packSnap = await db.doc(`creditPacks/${packId}`).get();
      if (!packSnap.exists || packSnap.data()!.teacherId !== teacherId) {
        throw new HttpsError("not-found", "Pack not found");
      }
      const pack = packSnap.data()!;
      if (!pack.active || !pack.stripePriceId) {
        throw new HttpsError("failed-precondition", "Pack is not available");
      }
      stripePriceId = pack.stripePriceId;
      credits = pack.credits;
    }

    // Get or create studentCredits doc (for stripeCustomerId)
    const creditDocId = `${teacherId}_${uid}`;
    const creditRef = db.doc(`studentCredits/${creditDocId}`);
    const creditSnap = await creditRef.get();

    let stripeCustomerId: string | undefined;

    if (creditSnap.exists) {
      stripeCustomerId = creditSnap.data()!.stripeCustomerId;
    }

    // Create Stripe Customer on connected account if needed
    if (!stripeCustomerId) {
      const userSnap = await db.doc(`users/${uid}`).get();
      const studentEmail = userSnap.exists ? (userSnap.data()!.email as string) : undefined;

      const customer = await stripe.customers.create(
        {
          email: studentEmail,
          metadata: { studentId: uid, teacherId },
        },
        { stripeAccount: stripeAccountId }
      );
      stripeCustomerId = customer.id;

      if (creditSnap.exists) {
        await creditRef.update({
          stripeCustomerId,
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        await creditRef.set({
          teacherId,
          studentId: uid,
          balance: 0,
          stripeCustomerId,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    // Build Checkout Session params
    const sessionParams: Record<string, unknown> = {
      customer: stripeCustomerId,
      line_items: [{ price: stripePriceId, quantity: 1 }],
      mode: type === "subscription" ? "subscription" : "payment",
      success_url: `${baseUrl}/credits/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/credits/buy?teacher=${teacherId}`,
      client_reference_id: uid,
      metadata: { teacherId, studentId: uid, type, credits: String(credits) },
      application_fee_percent: PLATFORM_FEE_PERCENT,
    };

    // For subscriptions, persist metadata on the subscription itself
    if (type === "subscription") {
      sessionParams.subscription_data = {
        metadata: {
          teacherId,
          studentId: uid,
          planId,
          creditsPerMonth: String(creditsPerMonth),
        },
      };
    }

    const session = await stripe.checkout.sessions.create(
      sessionParams as Parameters<typeof stripe.checkout.sessions.create>[0],
      { stripeAccount: stripeAccountId }
    );

    return { url: session.url };
  }
);
