import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStripe } from "./stripe-client";

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");

export const updateSubscriptionPlan = onCall(
  { secrets: [stripeSecretKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in");
    }
    if (request.auth.token.role !== "teacher") {
      throw new HttpsError("permission-denied", "Teachers only");
    }

    const { planId, name, creditsPerMonth, priceAmount, active } = request.data ?? {};
    if (!planId) {
      throw new HttpsError("invalid-argument", "planId is required");
    }

    const db = getFirestore();
    const uid = request.auth.uid;

    const planRef = db.doc(`subscriptionPlans/${planId}`);
    const planSnap = await planRef.get();
    if (!planSnap.exists) {
      throw new HttpsError("not-found", "Plan not found");
    }

    const plan = planSnap.data()!;
    if (plan.teacherId !== uid) {
      throw new HttpsError("permission-denied", "Not your plan");
    }

    const profileSnap = await db.doc(`teacherProfiles/${uid}`).get();
    const stripeAccountId = profileSnap.data()!.stripeAccountId as string;
    const stripe = getStripe(stripeSecretKey.value());

    const updates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    // If price changed: archive old Price, create new one
    if (priceAmount !== undefined && priceAmount !== plan.priceAmount) {
      // Archive old price
      if (plan.stripePriceId) {
        await stripe.prices.update(
          plan.stripePriceId,
          { active: false },
          { stripeAccount: stripeAccountId }
        );
      }

      // Create new price on the same product
      const newPrice = await stripe.prices.create(
        {
          product: plan.stripeProductId,
          unit_amount: priceAmount,
          currency: "usd",
          recurring: { interval: "month" },
        },
        { stripeAccount: stripeAccountId }
      );

      updates.priceAmount = priceAmount;
      updates.stripePriceId = newPrice.id;
    }

    // If name changed: update Stripe Product
    if (name !== undefined && name !== plan.name) {
      await stripe.products.update(
        plan.stripeProductId,
        { name },
        { stripeAccount: stripeAccountId }
      );
      updates.name = name;
    }

    if (creditsPerMonth !== undefined) updates.creditsPerMonth = creditsPerMonth;
    if (active !== undefined) updates.active = active;

    await planRef.update(updates);

    return { success: true, stripePriceId: updates.stripePriceId ?? plan.stripePriceId };
  }
);
