import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

export const completeSetupWizard = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }

  const uid = request.auth.uid;
  const db = getFirestore();

  // Verify role
  if (request.auth.token.role !== "teacher") {
    throw new HttpsError("permission-denied", "Only teachers can complete setup");
  }

  // Check profile has slug
  const profileSnap = await db.doc(`teacherProfiles/${uid}`).get();
  if (!profileSnap.exists) {
    throw new HttpsError("not-found", "Teacher profile not found");
  }
  const profile = profileSnap.data()!;
  if (!profile.slug) {
    throw new HttpsError("failed-precondition", "Profile slug is required");
  }

  // Check at least one lesson type exists
  const lessonTypesSnap = await db
    .collection("lessonTypes")
    .where("teacherId", "==", uid)
    .limit(1)
    .get();
  if (lessonTypesSnap.empty) {
    throw new HttpsError("failed-precondition", "At least one lesson type is required");
  }

  // Check at least one availability slot exists
  const availSnap = await db
    .collection("availability")
    .where("teacherId", "==", uid)
    .limit(1)
    .get();
  if (availSnap.empty) {
    throw new HttpsError("failed-precondition", "At least one availability slot is required");
  }

  // Mark setup complete
  await db.doc(`teacherProfiles/${uid}`).update({
    setupComplete: true,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { success: true };
});
