// functions/src/scheduling/book-lesson.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { localToUtc } from "../utils/timezone";

export const bookLesson = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }

  const { teacherId, lessonTypeId, locationId, date, startTime } = request.data ?? {};

  if (!teacherId || !lessonTypeId || !date || !startTime) {
    throw new HttpsError(
      "invalid-argument",
      "teacherId, lessonTypeId, date, and startTime are required"
    );
  }

  const db = getFirestore();
  const uid = request.auth.uid;

  // Get teacher's timezone from availability
  const anyAvail = await db
    .collection("availability")
    .where("teacherId", "==", teacherId)
    .limit(1)
    .get();

  if (anyAvail.empty) {
    throw new HttpsError("failed-precondition", "Teacher has no availability configured");
  }
  const timezone: string = anyAvail.docs[0].data().timezone;

  return db.runTransaction(async (transaction) => {
    // 1. Read lesson type
    const ltRef = db.doc(`lessonTypes/${lessonTypeId}`);
    const ltSnap = await transaction.get(ltRef);
    if (!ltSnap.exists) throw new HttpsError("not-found", "Lesson type not found");
    const lt = ltSnap.data()!;

    if (lt.teacherId !== teacherId) {
      throw new HttpsError("permission-denied", "Lesson type does not belong to this teacher");
    }
    if (!lt.active) {
      throw new HttpsError("failed-precondition", "This lesson type is no longer available");
    }

    // 2. Compute UTC scheduledAt
    const scheduledAtUtc = localToUtc(date, startTime, timezone);
    const scheduledAtTs = Timestamp.fromDate(scheduledAtUtc);
    const endAtUtc = new Date(scheduledAtUtc.getTime() + lt.durationMinutes * 60000);

    // 3. Check for double-booking — get all scheduled lessons for this teacher on this day
    const dayStartUtc = localToUtc(date, "00:00", timezone);
    const dayEndUtc = localToUtc(date, "23:59", timezone);

    const existingSnap = await transaction.get(
      db
        .collection("lessons")
        .where("teacherId", "==", teacherId)
        .where("status", "==", "scheduled")
        .where("scheduledAt", ">=", Timestamp.fromDate(dayStartUtc))
        .where("scheduledAt", "<=", Timestamp.fromDate(dayEndUtc))
    );

    for (const doc of existingSnap.docs) {
      const existing = doc.data();
      const exStart = existing.scheduledAt.toDate().getTime();
      const exEnd = exStart + existing.durationMinutes * 60000;

      if (scheduledAtUtc.getTime() < exEnd && endAtUtc.getTime() > exStart) {
        throw new HttpsError("already-exists", "This time slot is no longer available");
      }
    }

    // 4. Check student credits
    const creditRef = db.doc(`studentCredits/${teacherId}_${uid}`);
    const creditSnap = await transaction.get(creditRef);

    if (!creditSnap.exists) {
      throw new HttpsError("not-found", "No credit balance found with this teacher");
    }

    const balance = creditSnap.data()!.balance as number;
    const cost = lt.creditCost as number;

    if (balance < cost) {
      throw new HttpsError(
        "failed-precondition",
        `Insufficient credits. You have ${balance}, need ${cost}.`
      );
    }

    // 5. Deduct credits
    transaction.update(creditRef, {
      balance: balance - cost,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // 6. Create lesson doc
    const lessonRef = db.collection("lessons").doc();
    transaction.set(lessonRef, {
      teacherId,
      studentId: uid,
      lessonTypeId,
      locationId: locationId || null,
      status: "scheduled",
      scheduledAt: scheduledAtTs,
      durationMinutes: lt.durationMinutes,
      creditDeducted: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // 7. Create transaction record
    transaction.set(db.collection("transactions").doc(), {
      teacherId,
      studentId: uid,
      type: "credit_deduction",
      credits: -cost,
      lessonId: lessonRef.id,
      description: `Booked: ${lt.name}`,
      createdAt: FieldValue.serverTimestamp(),
    });

    return { success: true, lessonId: lessonRef.id };
  });
});
