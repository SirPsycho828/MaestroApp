import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { getFirestore } from "firebase-admin/firestore";
import { getStripe } from "./stripe-client";

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");

export const createBillingPortalSession = onCall(
  { secrets: [stripeSecretKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in");
    }
    if (request.auth.token.role !== "student") {
      throw new HttpsError("permission-denied", "Students only");
    }

    const { teacherId, baseUrl } = request.data ?? {};
    if (!teacherId || !baseUrl) {
      throw new HttpsError("invalid-argument", "teacherId and baseUrl are required");
    }

    const db = getFirestore();
    const uid = request.auth.uid;
    const stripe = getStripe(stripeSecretKey.value());

    const profileSnap = await db.doc(`teacherProfiles/${teacherId}`).get();
    if (!profileSnap.exists) {
      throw new HttpsError("not-found", "Teacher not found");
    }
    const stripeAccountId = profileSnap.data()!.stripeAccountId as string;
    if (!stripeAccountId) {
      throw new HttpsError("failed-precondition", "Teacher not connected to Stripe");
    }

    const creditSnap = await db.doc(`studentCredits/${teacherId}_${uid}`).get();
    if (!creditSnap.exists || !creditSnap.data()!.stripeCustomerId) {
      throw new HttpsError("not-found", "No billing account found");
    }
    const stripeCustomerId = creditSnap.data()!.stripeCustomerId as string;

    const session = await stripe.billingPortal.sessions.create(
      {
        customer: stripeCustomerId,
        return_url: `${baseUrl}/credits`,
      },
      { stripeAccount: stripeAccountId }
    );

    return { url: session.url };
  }
);
