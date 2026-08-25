/**
 * =========================================================================
 * 🛡️ VAIDYADRISHTI PATIENT-FACING SEVERITY FORMATTER (DETERMINISTIC)
 * =========================================================================
 * Formats clinical urgency levels into softer, reassuring messages for patients.
 * 
 * "AI DRAFTS, DOCTOR DECIDES" RULE EXEMPTION SCOPE:
 * This helper ONLY changes patient-facing UI presentation. It does NOT touch
 * or alter the raw clinical urgency_level stored in the database or surfaced
 * in the doctor's OPD queue.
 * =========================================================================
 */

export interface PatientSeverityInfo {
  label: string;
  badgeColor: string;
  badgeBg: string;
  badgeBorder: string;
  icon: string;
}

export function formatPatientSeverity(
  urgencyLevel: string,
  t?: (key: string) => string
): PatientSeverityInfo {
  const level = (urgencyLevel || 'low').toLowerCase();

  switch (level) {
    case 'high':
      return {
        label: t ? t('severity.high') : 'Your case has been marked for prompt doctor review. Please stay close to your phone.',
        badgeColor: 'text-amber-800',
        badgeBg: 'bg-amber-50',
        badgeBorder: 'border-amber-300',
        icon: '⏳',
      };
    case 'medium':
      return {
        label: t ? t('severity.medium') : 'Your consultation request is in queue for review during standard OPD hours.',
        badgeColor: 'text-blue-800',
        badgeBg: 'bg-blue-50',
        badgeBorder: 'border-blue-300',
        icon: '📋',
      };
    case 'low':
    case 'routine':
    default:
      return {
        label: t ? t('severity.low') : 'Routine consultation registered. Your doctor will review your history shortly.',
        badgeColor: 'text-emerald-800',
        badgeBg: 'bg-emerald-50',
        badgeBorder: 'border-emerald-300',
        icon: '✅',
      };
  }
}
