/**
 * Strictly normalizes phone numbers to standard E.164 format (+91XXXXXXXXXX)
 * @param phone Raw phone number string from input or Twilio webhook
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
