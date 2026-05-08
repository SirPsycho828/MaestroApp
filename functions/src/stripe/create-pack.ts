import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStripe } from "./stripe-client";

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");

export const createCreditPack = onCall(
  { secrets: [stripeSecretKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in");
    }
    if (request.auth.token.role !== "teacher") {
      throw new HttpsError("permission-denied", "Teachers only");
    }

    const { name, credits, priceAmount } = request.data ?? {};
    if (!name || !credits || !priceAmount) {
      throw new HttpsError(
        "invalid-argument",
        "name, credits, and priceAmount are required"
      );
    }

    const db = getFirestore();
    const uid = request.auth.uid;

    const profileSnap = await db.doc(`teacherProfiles/${uid}`).get();
    if (!profileSnap.exists) {
      throw new HttpsError("not-found", "Teacher profile not found");
    }
    const profile = profileSnap.data()!;
    if (!profile.stripeOnboarded || !profile.stripeAccountId) {
      throw new HttpsError(
        "failed-precondition",
        "Complete Stripe onboarding before creating packs"
      );
    }

    const stripe = getStripe(stripeSecretKey.value());
    const stripeAccountId = profile.stripeAccountId as string;

    const product = await stripe.products.create(
      {
        name,
        metadata: { teacherId: uid, planType: "credit_pack" },
      },
      { stripeAccount: stripeAccountId }
    );

    const price = await stripe.prices.create(
      {
        product: product.id,
        unit_amount: priceAmount,
        currency: "usd",
      },
      { stripeAccount: stripeAccountId }
    );

    const packRef = await db.collection("creditPacks").add({
      teacherId: uid,
      name,
      credits,
      priceAmount,
      stripePriceId: price.id,
      stripeProductId: product.id,
      active: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { packId: packRef.id, stripePriceId: price.id };
  }
);
