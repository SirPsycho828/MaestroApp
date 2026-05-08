// functions/src/invites/revoke-invite.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

export const revokeInvite = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }
  if (request.auth.token.role !== "teacher") {
    throw new HttpsError("permission-denied", "Only teachers can revoke invites");
  }

  const { inviteId } = request.data ?? {};
  if (typeof inviteId !== "string") {
    throw new HttpsError("invalid-argument", "inviteId is required");
  }

  const db = getFirestore();
  const inviteRef = db.doc(`invites/${inviteId}`);
  const inviteSnap = await inviteRef.get();

  if (!inviteSnap.exists) {
    throw new HttpsError("not-found", "Invite not found");
  }

  const invite = inviteSnap.data()!;
  if (invite.teacherId !== request.auth.uid) {
    throw new HttpsError("permission-denied", "Not your invite");
  }
  if (invite.status !== "pending") {
    throw new HttpsError("failed-precondition", "Only pending invites can be revoked");
  }

  await inviteRef.update({
    status: "expired",
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { success: true };
});
