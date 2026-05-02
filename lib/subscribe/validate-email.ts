const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function isValidEmailFormat(raw: unknown): raw is string {
  if (typeof raw !== "string") return false;
  const v = raw.trim();
  if (v.length === 0 || v.length > 320) return false;
  return EMAIL_RE.test(v);
}

export function normalizeSubscriberEmail(raw: string): string {
  return raw.trim().toLowerCase();
}
