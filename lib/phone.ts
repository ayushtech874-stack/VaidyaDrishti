/**
 * E.164 Phone Normalization Helper for VaidyaDrishti
 * Converts raw phone inputs into standard +91XXXXXXXXXX format
 */
export function normalizePhone(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }
  return `+${digits}`;
}
