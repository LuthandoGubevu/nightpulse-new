
import { adminAuth } from "@/lib/firebaseAdmin";

export const ADMIN_EMAIL = "lgubevu@gmail.com";

export type AdminVerificationResult =
  | { ok: true; uid: string }
  | { ok: false; error: string };

/**
 * Verifies a Firebase ID token server-side and confirms it belongs to the
 * admin account. Email/password signup alone doesn't prove mailbox
 * ownership, so email_verified is also required — Google sign-in satisfies
 * this automatically, and an email/password account can satisfy it by
 * clicking Firebase's verification email.
 */
export async function verifyAdminIdToken(idToken: unknown): Promise<AdminVerificationResult> {
  if (typeof idToken !== "string" || idToken.length === 0) {
    return { ok: false, error: "Missing authentication token." };
  }

  if (!adminAuth) {
    return { ok: false, error: "Server authentication is not configured." };
  }

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(idToken);
  } catch (error) {
    console.error("Failed to verify ID token:", error);
    return { ok: false, error: "Invalid or expired session. Please sign in again." };
  }

  if (decoded.email !== ADMIN_EMAIL || decoded.email_verified !== true) {
    return { ok: false, error: "Not authorized." };
  }

  return { ok: true, uid: decoded.uid };
}
