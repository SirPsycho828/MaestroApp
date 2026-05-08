import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStripe } from "./stripe-client";

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");

export const createSubscriptionPlan = onCall(
  { secrets: [stripeSecretKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in");
    }
    if (request.auth.token.role !== "teacher") {
      throw new HttpsError("permission-denied", "Teachers only");
    }

    const { name, creditsPerMonth, priceAmount } = request.data ?? {};
    if (!name || !creditsPerMonth || !priceAmount) {
      throw new HttpsError(
        "invalid-argument",
        "name, creditsPerMonth, and priceAmount are required"
      );
    }

    const db = getFirestore();
    const uid = request.auth.uid;

    // Verify Stripe onboarding
    const profileSnap = await db.doc(`teacherProfiles/${uid}`).get();
    if (!profileSnap.exists) {
      throw new HttpsError("not-found", "Teacher profile not found");
    }
    const profile = profileSnap.data()!;
    if (!profile.stripeOnboarded || !profile.stripeAccountId) {
      throw new HttpsError(
        "failed-precondition",
        "Complete Stripe onboarding before creating plans"
      );
    }

    const stripe = getStripe(stripeSecretKey.value());
    const stripeAccountId = profile.stripeAccountId as string;

    // Create Stripe Product + Price on connected account
    const product = await stripe.products.create(
      {
        name,
        metadata: { teacherId: uid, planType: "subscription" },
      },
      { stripeAccount: stripeAccountId }
    );

    const price = await stripe.prices.create(
      {
        product: product.id,
        unit_amount: priceAmount,
        currency: "usd",
        recurring: { interval: "month" },
      },
      { stripeAccount: stripeAccountId }
    );

    // Create Firestore doc
    const planRef = await db.collection("subscriptionPlans").add({
      teacherId: uid,
      name,
      creditsPerMonth,
      priceAmount,
      stripePriceId: price.id,
      stripeProductId: product.id,
      active: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { planId: planRef.id, stripePriceId: price.id };
  }
);
