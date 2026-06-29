import { HttpsError } from "firebase-functions/v2/https";

const ALLOWED_HOSTS = [
  "tunefolio-dev.web.app",
  "tunefolio-dev.firebaseapp.com",
];

/**
 * Validates that a baseUrl is from a trusted origin to prevent open redirect attacks.
 * Allows localhost in any environment for emulator/dev testing.
 */
export function validateBaseUrl(baseUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new HttpsError("invalid-argument", "Invalid baseUrl");
  }

  if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
    return parsed.origin;
  }

  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    throw new HttpsError("invalid-argument", "Invalid baseUrl");
  }

  if (parsed.protocol !== "https:") {
    throw new HttpsError("invalid-argument", "Invalid baseUrl");
  }

  return parsed.origin;
}
