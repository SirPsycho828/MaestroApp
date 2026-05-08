// functions/src/scheduling/cancel-lesson.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

export const cancelLesson = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }

  const { lessonId } = request.data ?? {};
  if (!lessonId) {
    throw new HttpsError("invalid-argument", "lessonId is required");
  }

  const db = getFirestore();
  const uid = request.auth.uid;
  const role = request.auth.token.role as string;

  return db.runTransaction(async (transaction) => {
    // 1. Read lesson
    const lessonRef = db.doc(`lessons/${lessonId}`);
    const lessonSnap = await transaction.get(lessonRef);

    if (!lessonSnap.exists) throw new HttpsError("not-found", "Lesson not found");
    const lesson = lessonSnap.data()!;

    // 2. Verify access
    if (role === "teacher" && lesson.teacherId !== uid) {
      throw new HttpsError("permission-denied", "Not your lesson");
    }
    if (role === "student" && lesson.studentId !== uid) {
      throw new HttpsError("permission-denied", "Not your lesson");
    }

    if (lesson.status !== "scheduled") {
      throw new HttpsError("failed-precondition", "Only scheduled lessons can be cancelled");
    }

    // 3. Determine credit return
    const cancelledBy = role as "teacher" | "student";
    let returnCredit = false;

    if (cancelledBy === "teacher") {
      returnCredit = true;
    } else {
      // Student: check cancellation window
      const profileSnap = await transaction.get(
        db.doc(`teacherProfiles/${lesson.teacherId}`)
      );
      const windowHours = profileSnap.data()?.cancellationWindowHours ?? 24;
      const lessonTime = lesson.scheduledAt.toDate().getTime();
      const hoursUntil = (lessonTime - Date.now()) / 3600000;
      returnCredit = hoursUntil >= windowHours;
    }

    // 4. Update lesson status
    const newStatus =
      cancelledBy === "teacher" ? "cancelled_by_teacher" : "cancelled_by_student";

    transaction.update(lessonRef, {
      status: newStatus,
      cancelledAt: FieldValue.serverTimestamp(),
      cancelledBy,
      ...(returnCredit && lesson.creditDeducted
        ? { creditReturnedAt: FieldValue.serverTimestamp() }
        : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // 5. Return credit if applicable
    if (returnCredit && lesson.creditDeducted) {
      const ltSnap = await transaction.get(db.doc(`lessonTypes/${lesson.lessonTypeId}`));
      const creditCost = ltSnap.exists ? (ltSnap.data()!.creditCost as number) : 1;

      const creditRef = db.doc(
        `studentCredits/${lesson.teacherId}_${lesson.studentId}`
      );
      const creditSnap = await transaction.get(creditRef);

      if (creditSnap.exists) {
        transaction.update(creditRef, {
          balance: (creditSnap.data()!.balance || 0) + creditCost,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      transaction.set(db.collection("transactions").doc(), {
        teacherId: lesson.teacherId,
        studentId: lesson.studentId,
        type: "credit_return",
        credits: creditCost,
        lessonId,
        description: `Cancelled: credit returned`,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    return { success: true, creditReturned: returnCredit };
  });
});
