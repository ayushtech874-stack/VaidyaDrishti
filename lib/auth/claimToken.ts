import crypto from 'crypto';

/**
 * =========================================================================
 * 🔒 SERVER-SIDE ONLY CLAIM TOKEN UTILITY (48-HOUR HMAC-SHA256 SIGNATURE)
 * =========================================================================
 * Uses process.env.CLAIM_TOKEN_SECRET exclusively.
 * NEVER imported in client-side code bundles.
 * =========================================================================
 */

function getClaimSecret(): string {
  const secret = process.env.CLAIM_TOKEN_SECRET;
  if (!secret) {
    throw new Error('CLAIM_TOKEN_SECRET environment variable is missing.');
  }
  return secret;
}

export interface ClaimTokenPayload {
  patientId: string;
  phone: string;
  exp: number; // Expiration timestamp (ms)
}

/**
 * Generates a 48-hour time-limited signed claim token.
 */
export function generateClaimToken(input: { patientId: string; phone: string }): string {
  const secret = getClaimSecret();
  const exp = Date.now() + 48 * 60 * 60 * 1000; // 48 Hours

  const payloadData: ClaimTokenPayload = {
    patientId: input.patientId,
    phone: input.phone,
    exp,
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payloadData)).toString('base64url');

  const signature = crypto
    .createHmac('sha256', secret)
    .update(payloadBase64)
    .digest('base64url');

  return `${payloadBase64}.${signature}`;
}

/**
 * Verifies a claim token's signature and expiration date.
 */
export function verifyClaimToken(token: string): { valid: boolean; payload?: ClaimTokenPayload; error?: string } {
  try {
    if (!token || !token.includes('.')) {
      return { valid: false, error: 'Malformed token structure.' };
    }

    const secret = getClaimSecret();
    const [payloadBase64, signature] = token.split('.');

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payloadBase64)
      .digest('base64url');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return { valid: false, error: 'Invalid token signature.' };
    }

    const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf8');
    const payload: ClaimTokenPayload = JSON.parse(payloadJson);

    if (Date.now() > payload.exp) {
      return { valid: false, error: 'Token has expired (48-hour limit).' };
    }

    return { valid: true, payload };
  } catch (err: any) {
    return { valid: false, error: err.message || 'Token verification failed.' };
  }
}
