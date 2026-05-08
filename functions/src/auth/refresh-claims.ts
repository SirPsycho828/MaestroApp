import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

export const refreshClaims = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }

  const uid = request.auth.uid;
  const db = getFirestore();
  const userSnap = await db.doc(`users/${uid}`).get();

  if (!userSnap.exists) {
    throw new HttpsError("not-found", "User document not found");
  }

  const userData = userSnap.data()!;
  const role = userData.role;

  if (!role || !["teacher", "student"].includes(role)) {
    throw new HttpsError("internal", "Invalid role in user document");
  }

  await getAuth().setCustomUserClaims(uid, { role });

  return { role };
});
