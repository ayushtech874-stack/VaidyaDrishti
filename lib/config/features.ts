/**
 * Feature Flags Configuration for VaidyaDrishti Platform
 * 
 * Controls runtime availability of features such as WhatsApp Business API integration,
 * Tele-consultations, and external APIs.
 */

export const features = {
  /**
   * WhatsApp Business API Integration
   * Default: false (gated until Meta Business Verification sign-off)
   */
  isWhatsAppEnabled: process.env.NEXT_PUBLIC_ENABLE_WHATSAPP === 'true',
};
