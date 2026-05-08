import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStripe } from "./stripe-client";

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");

export const createStripeConnectLink = onCall(
  { secrets: [stripeSecretKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in");
    }
    if (request.auth.token.role !== "teacher") {
      throw new HttpsError("permission-denied", "Only teachers can connect Stripe");
    }

    const { baseUrl } = request.data ?? {};
    if (!baseUrl) {
      throw new HttpsError("invalid-argument", "baseUrl is required");
    }

    const db = getFirestore();
    const uid = request.auth.uid;
    const stripe = getStripe(stripeSecretKey.value());

    // Get or create Stripe account
    const profileRef = db.doc(`teacherProfiles/${uid}`);
    const profileSnap = await profileRef.get();
    if (!profileSnap.exists) {
      throw new HttpsError("not-found", "Teacher profile not found");
    }

    let stripeAccountId = profileSnap.data()!.stripeAccountId as string | undefined;

    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: "standard",
        metadata: { teacherId: uid },
      });
      stripeAccountId = account.id;

      await profileRef.update({
        stripeAccountId,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      return_url: `${baseUrl}/stripe/callback?status=complete`,
      refresh_url: `${baseUrl}/stripe/callback?status=refresh`,
      type: "account_onboarding",
    });

    return { url: accountLink.url };
  }
);
