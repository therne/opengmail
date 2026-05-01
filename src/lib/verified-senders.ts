export const VERIFIED_SENDER_EMAILS = new Set([
  "io-online@google.com",
  "team@anthropic.com",
  "team@claude.ai",
  "team@claude.com",
  "team@mail.claude.com",
  "no-reply@email.claude.com",
  "no-reply@anthropic.com",
  "no-reply@claude.ai",
  "no-reply@claude.com",
  "noreply@email.claude.com",
  "noreply@anthropic.com",
  "noreply@claude.ai",
  "noreply@claude.com",
]);

export const VERIFIED_SENDER_DOMAINS = new Set([
  "anthropic.com",
  "claude.ai",
  "claude.com",
  "email.claude.com",
  "mail.claude.com",
]);

export function isVerifiedSender(email?: string) {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  const domain = normalized.split("@")[1];
  return (
    VERIFIED_SENDER_EMAILS.has(normalized) ||
    (domain ? VERIFIED_SENDER_DOMAINS.has(domain) : false)
  );
}
