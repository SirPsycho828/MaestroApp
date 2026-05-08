import { user } from "firebase-functions/v1/auth";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

export const onUserCreated = user().onCreate(async (userRecord) => {
  const db = getFirestore();
  const adminAuth = getAuth();

  // Check if this user was created via an invite
  const pendingSnap = await db
    .collection("pendingRegistrations")
    .doc(userRecord.uid)
    .get();

  const inviteToken = pendingSnap.exists
    ? pendingSnap.data()?.inviteToken
    : null;

  let role: "teacher" | "student" = "teacher";

  if (inviteToken) {
    // Validate invite
    const inviteQuery = await db
      .collection("invites")
      .where("token", "==", inviteToken)
      .where("status", "==", "pending")
      .limit(1)
      .get();

    if (!inviteQuery.empty) {
      role = "student";
      const inviteDoc = inviteQuery.docs[0];
      const inviteData = inviteDoc.data();

      // Mark invite as accepted
      await inviteDoc.ref.update({
        status: "accepted",
        acceptedBy: userRecord.uid,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Create teacher-student relationship
      await db.collection("teacherStudents").add({
        teacherId: inviteData.teacherId,
        studentId: userRecord.uid,
        status: "active",
        studentDisplayName: userRecord.displayName || inviteData.studentName,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Initialize student credits
      await db
        .doc(`studentCredits/${inviteData.teacherId}_${userRecord.uid}`)
        .set({
          teacherId: inviteData.teacherId,
          studentId: userRecord.uid,
          balance: 0,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

      // Clean up pending registration
      await pendingSnap.ref.delete();
    }
  }

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

  // If teacher, create initial teacher profile
  if (role === "teacher") {
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
  }
});
