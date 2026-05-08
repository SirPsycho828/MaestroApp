import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

export const acceptInvite = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }

  const { token } = request.data ?? {};
  if (typeof token !== "string" || !token) {
    throw new HttpsError("invalid-argument", "Invite token is required");
  }

  const db = getFirestore();
  const uid = request.auth.uid;

  // Find the invite
  const inviteQuery = await db
    .collection("invites")
    .where("token", "==", token)
    .limit(1)
    .get();

  if (inviteQuery.empty) {
    throw new HttpsError("not-found", "Invite not found");
  }

  const inviteDoc = inviteQuery.docs[0];
  const invite = inviteDoc.data();

  if (invite.status !== "pending") {
    throw new HttpsError("failed-precondition", "This invite has already been used or expired");
  }

  if (invite.expiresAt.toDate() < new Date()) {
    // Auto-expire
    await inviteDoc.ref.update({
      status: "expired",
      updatedAt: FieldValue.serverTimestamp(),
    });
    throw new HttpsError("failed-precondition", "This invite has expired");
  }

  // Check if the user is a teacher trying to accept a student invite
  const userSnap = await db.doc(`users/${uid}`).get();
  if (!userSnap.exists) {
    throw new HttpsError("not-found", "User document not found");
  }
  const userData = userSnap.data()!;
  const currentRole = userData.role;

  // Prevent teacher from accepting an invite if they already have setup complete
  // (i.e., they're an established teacher, not a freshly-registered one)
  if (currentRole === "teacher") {
    const profileSnap = await db.doc(`teacherProfiles/${uid}`).get();
    if (profileSnap.exists && profileSnap.data()?.setupComplete) {
      throw new HttpsError(
        "failed-precondition",
        "Teacher accounts cannot accept student invites. Log in with a student account or create a new one."
      );
    }
  }

  // Check for existing relationship with this teacher
  const existingRelation = await db
    .collection("teacherStudents")
    .where("teacherId", "==", invite.teacherId)
    .where("studentId", "==", uid)
    .limit(1)
    .get();

  if (!existingRelation.empty) {
    // Reactivate if inactive
    const relDoc = existingRelation.docs[0];
    if (relDoc.data().status === "inactive") {
      await relDoc.ref.update({
        status: "active",
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    // Mark invite consumed
    await inviteDoc.ref.update({
      status: "accepted",
      acceptedBy: uid,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { success: true, role: "student" };
  }

  const batch = db.batch();

  // If user was created as teacher (fresh registration), convert to student
  if (currentRole === "teacher") {
    // Update user role
    batch.update(db.doc(`users/${uid}`), {
      role: "student",
      displayName: userData.displayName || invite.studentName,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Delete the empty teacher profile
    const profileRef = db.doc(`teacherProfiles/${uid}`);
    const profileSnap = await profileRef.get();
    if (profileSnap.exists) {
      batch.delete(profileRef);
    }

    // Update custom claims
    await getAuth().setCustomUserClaims(uid, { role: "student" });
  }

  // Mark invite as accepted
  batch.update(inviteDoc.ref, {
    status: "accepted",
    acceptedBy: uid,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Create teacher-student relationship
  batch.set(db.collection("teacherStudents").doc(), {
    teacherId: invite.teacherId,
    studentId: uid,
    status: "active",
    studentDisplayName: userData.displayName || invite.studentName,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Initialize student credits
  batch.set(db.doc(`studentCredits/${invite.teacherId}_${uid}`), {
    teacherId: invite.teacherId,
    studentId: uid,
    balance: 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return { success: true, role: "student" };
});
