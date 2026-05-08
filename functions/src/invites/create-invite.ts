// functions/src/invites/create-invite.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { randomBytes } from "crypto";

export const createInvite = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }
  if (request.auth.token.role !== "teacher") {
    throw new HttpsError("permission-denied", "Only teachers can create invites");
  }

  const { studentName, studentEmail } = request.data ?? {};

  if (typeof studentName !== "string" || studentName.length < 2 || studentName.length > 80) {
    throw new HttpsError("invalid-argument", "Student name must be 2-80 characters");
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (typeof studentEmail !== "string" || !emailRegex.test(studentEmail)) {
    throw new HttpsError("invalid-argument", "Valid email is required");
  }

  const db = getFirestore();
  const uid = request.auth.uid;

  // Rate limit: max 50 pending invites per teacher
  const pendingSnap = await db
    .collection("invites")
    .where("teacherId", "==", uid)
    .where("status", "==", "pending")
    .count()
    .get();

  if (pendingSnap.data().count >= 50) {
    throw new HttpsError(
      "resource-exhausted",
      "Maximum 50 pending invites. Revoke unused invites to send more."
    );
  }

  const token = randomBytes(18).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const docRef = await db.collection("invites").add({
    teacherId: uid,
    studentName: studentName.trim(),
    studentEmail: studentEmail.trim().toLowerCase(),
    token,
    status: "pending",
    expiresAt,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return {
    inviteId: docRef.id,
    token,
    inviteUrl: `${request.rawRequest?.headers?.origin || "https://app.tunefolio.com"}/invite/${token}`,
  };
});
