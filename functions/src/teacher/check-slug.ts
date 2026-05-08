import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";

const RESERVED_SLUGS = [
  "admin", "api", "app", "login", "register", "invite",
  "settings", "help", "dashboard", "home", "setup",
];

export const checkSlugAvailable = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }

  const slug = request.data?.slug;
  if (typeof slug !== "string" || slug.length < 3 || slug.length > 40) {
    throw new HttpsError("invalid-argument", "Slug must be 3-40 characters");
  }

  const normalized = slug.toLowerCase().trim();

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
    throw new HttpsError(
      "invalid-argument",
      "Slug must contain only lowercase letters, numbers, and hyphens"
    );
  }

  if (RESERVED_SLUGS.includes(normalized)) {
    return { available: false, reason: "reserved" };
  }

  const db = getFirestore();
  const snap = await db
    .collection("teacherProfiles")
    .where("slug", "==", normalized)
    .limit(1)
    .get();

  // Allow the teacher's own current slug
  const isOwnSlug =
    !snap.empty && snap.docs[0].id === request.auth.uid;

  return { available: snap.empty || isOwnSlug };
});
