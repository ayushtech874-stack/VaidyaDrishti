/**
 * ASHA Worker & Village Offline DPDP Consent Handler
 * 
 * SECURITY ARCHITECTURE:
 * - Uses Web Crypto API HMAC-SHA256 for authentic payload integrity verification.
 * - Per-Device Secret Architecture: `perDeviceSecret` is generated uniquely per 
 *   ASHA tablet during device pairing/provisioning (via crypto.randomUUID()) and 
 *   persisted in standard browser-encrypted local storage (IndexedDB / Web Storage).
 *   It is NEVER hardcoded or shared across devices in the codebase.
 */

export interface OfflineConsentRecord {
  patient_phone: string;
  patient_name: string;
  consent_given: boolean;
  consent_timestamp: string;
  captured_by_asha_id?: string;
  hmac_sha256_signature: string;
}

export async function createOfflineConsent(
  phone: string,
  name: string,
  ashaId: string,
  perDeviceSecret: string
): Promise<OfflineConsentRecord> {
  const timestamp = new Date().toISOString();
  const rawPayload = `${phone}:${name}:${timestamp}:${ashaId}`;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(perDeviceSecret);
  const messageData = encoder.encode(rawPayload);

  // Import device secret into Web Crypto HMAC-SHA256 key
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // Compute authentic HMAC-SHA256 signature
  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const hmacHex = signatureArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return {
    patient_phone: phone,
    patient_name: name,
    consent_given: true,
    consent_timestamp: timestamp,
    captured_by_asha_id: ashaId,
    hmac_sha256_signature: `HMAC-SHA256-${hmacHex}`,
  };
}
