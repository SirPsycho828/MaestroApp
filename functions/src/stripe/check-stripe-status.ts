import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStripe } from "./stripe-client";

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");

export const checkStripeStatus = onCall(
  { secrets: [stripeSecretKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in");
    }
    if (request.auth.token.role !== "teacher") {
      throw new HttpsError("permission-denied", "Only teachers can check Stripe status");
    }

    const db = getFirestore();
    const uid = request.auth.uid;

    const profileRef = db.doc(`teacherProfiles/${uid}`);
    const profileSnap = await profileRef.get();
    if (!profileSnap.exists) {
      throw new HttpsError("not-found", "Teacher profile not found");
    }

    const profile = profileSnap.data()!;
    const stripeAccountId = profile.stripeAccountId as string | undefined;

    if (!stripeAccountId) {
      return { onboarded: false, chargesEnabled: false, payoutsEnabled: false };
    }

    const stripe = getStripe(stripeSecretKey.value());
    const account = await stripe.accounts.retrieve(stripeAccountId);

    const chargesEnabled = account.charges_enabled ?? false;
    const payoutsEnabled = account.payouts_enabled ?? false;
    const onboarded = chargesEnabled && payoutsEnabled;

    // Update Firestore if newly onboarded
    if (onboarded && !profile.stripeOnboarded) {
      await profileRef.update({
        stripeOnboarded: true,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    return { onboarded, chargesEnabled, payoutsEnabled };
  }
);
