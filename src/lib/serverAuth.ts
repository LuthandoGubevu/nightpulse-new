
import { adminAuth } from "@/lib/firebaseAdmin";
import { isAdminEmail } from "@/lib/adminEmails";

export type AdminVerificationResult =
  | { ok: true; uid: string }
  | { ok: false; error: string };

export type UserVerificationResult =
  | { ok: true; uid: string }
  | { ok: false; error: string };

async function decodeIdToken(idToken: unknown) {
  if (typeof idToken !== "string" || idToken.length === 0) {
    return { ok: false as const, error: "Missing authentication token." };
  }

  if (!adminAuth) {
    return { ok: false as const, error: "Server authentication is not configured." };
  }

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    return { ok: true as const, decoded };
  } catch (error) {
    console.error("Failed to verify ID token:", error);
    return { ok: false as const, error: "Invalid or expired session. Please sign in again." };
  }
}

/**
 * Verifies a Firebase ID token server-side and confirms it belongs to the
 * admin account. Email/password signup alone doesn't prove mailbox
 * ownership, so email_verified is also required — Google sign-in satisfies
 * this automatically, and an email/password account can satisfy it by
 * clicking Firebase's verification email.
 */
export async function verifyAdminIdToken(idToken: unknown): Promise<AdminVerificationResult> {
  const result = await decodeIdToken(idToken);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  if (!isAdminEmail(result.decoded.email) || result.decoded.email_verified !== true) {
    return { ok: false, error: "Not authorized." };
  }

  return { ok: true, uid: result.decoded.uid };
}

/**
 * Verifies a Firebase ID token server-side for any authenticated user — no
 * admin-email or email_verified requirement. Used for mutations any signed-in
 * user is allowed to perform, like casting a safety-rating vote.
 */
export async function verifyUserIdToken(idToken: unknown): Promise<UserVerificationResult> {
  const result = await decodeIdToken(idToken);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return { ok: true, uid: result.decoded.uid };
}
