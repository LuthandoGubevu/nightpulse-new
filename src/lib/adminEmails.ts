
// Plain, isomorphic list of admin emails — safe to import from both client
// components (AppShell, admin layout) and server-only code (serverAuth.ts).
// Do not add server-only imports to this file.
export const ADMIN_EMAILS = ["lgubevu@gmail.com", "kwezi.nyakaza@gmail.com"];

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email);
}
