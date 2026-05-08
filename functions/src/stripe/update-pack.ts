import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStripe } from "./stripe-client";

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");

export const updateCreditPack = onCall(
  { secrets: [stripeSecretKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in");
    }
    if (request.auth.token.role !== "teacher") {
      throw new HttpsError("permission-denied", "Teachers only");
    }

    const { packId, name, credits, priceAmount, active } = request.data ?? {};
    if (!packId) {
      throw new HttpsError("invalid-argument", "packId is required");
    }

    const db = getFirestore();
    const uid = request.auth.uid;

    const packRef = db.doc(`creditPacks/${packId}`);
    const packSnap = await packRef.get();
    if (!packSnap.exists) {
      throw new HttpsError("not-found", "Pack not found");
    }

    const pack = packSnap.data()!;
    if (pack.teacherId !== uid) {
      throw new HttpsError("permission-denied", "Not your pack");
    }

    const profileSnap = await db.doc(`teacherProfiles/${uid}`).get();
    const stripeAccountId = profileSnap.data()!.stripeAccountId as string;
    const stripe = getStripe(stripeSecretKey.value());

    const updates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (priceAmount !== undefined && priceAmount !== pack.priceAmount) {
      if (pack.stripePriceId) {
        await stripe.prices.update(
          pack.stripePriceId,
          { active: false },
          { stripeAccount: stripeAccountId }
        );
      }

      const newPrice = await stripe.prices.create(
        {
          product: pack.stripeProductId,
          unit_amount: priceAmount,
          currency: "usd",
        },
        { stripeAccount: stripeAccountId }
      );

      updates.priceAmount = priceAmount;
      updates.stripePriceId = newPrice.id;
    }

    if (name !== undefined && name !== pack.name) {
      await stripe.products.update(
        pack.stripeProductId,
        { name },
        { stripeAccount: stripeAccountId }
      );
      updates.name = name;
    }

    if (credits !== undefined) updates.credits = credits;
    if (active !== undefined) updates.active = active;

    await packRef.update(updates);

    return { success: true, stripePriceId: updates.stripePriceId ?? pack.stripePriceId };
  }
);
