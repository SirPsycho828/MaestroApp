import { user } from "firebase-functions/v1/auth";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

export const onUserCreated = user().onCreate(async (userRecord) => {
  const db = getFirestore();
  const adminAuth = getAuth();
  const role = "teacher";

  // Create user document
  await db.doc(`users/${userRecord.uid}`).set({
    email: userRecord.email || "",
    displayName: userRecord.displayName || "",
    role,
    tosAcceptedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Set custom claims
  await adminAuth.setCustomUserClaims(userRecord.uid, { role });

  // Create initial teacher profile
  await db.doc(`teacherProfiles/${userRecord.uid}`).set({
    slug: "",
    instruments: [],
    locations: [],
    stripeOnboarded: false,
    setupComplete: false,
    cancellationWindowHours: 24,
    creditRolloverCapMonths: 2,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
});
