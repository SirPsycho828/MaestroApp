import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

export const completeLesson = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in");
  if (request.auth.token.role !== "teacher") {
    throw new HttpsError("permission-denied", "Only teachers can complete lessons");
  }

  const { lessonId, notes } = request.data ?? {};
  if (!lessonId) throw new HttpsError("invalid-argument", "lessonId is required");

  const db = getFirestore();
  const uid = request.auth.uid;
  const lessonRef = db.doc(`lessons/${lessonId}`);
  const lessonSnap = await lessonRef.get();

  if (!lessonSnap.exists) throw new HttpsError("not-found", "Lesson not found");
  const lesson = lessonSnap.data()!;

  if (lesson.teacherId !== uid) throw new HttpsError("permission-denied", "Not your lesson");
  if (lesson.status !== "scheduled") {
    throw new HttpsError("failed-precondition", "Only scheduled lessons can be completed");
  }

  await lessonRef.update({
    status: "completed",
    ...(notes ? { notes } : {}),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { success: true };
});
