/** Syntax-only check: local-part @ domain with a dot. Not an MX / mailbox lookup. */
const EMAIL_SYNTAX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isEmailSyntax(value: string) {
  return EMAIL_SYNTAX.test(normalizeEmail(value));
}
