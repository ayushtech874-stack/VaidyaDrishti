/**
 * =========================================================================
 * 🛡️ VAIDYADRISHTI CLINICAL COMPLIANCE BOUNDARY — TPG 2020 DRUG BLOCKLIST
 * =========================================================================
 * HARD COMPLIANCE RULE: Under Telemedicine Practice Guidelines (TPG 2020),
 * Schedule X drugs, Narcotics, and Psychotropic substances CANNOT be prescribed
 * via telemedicine consultations.
 * 
 * THIS BLOCKLIST IS DETERMINISTIC KEYWORD MATCHING CODE. DO NOT ALTER OR WEAKEN
 * THIS CHECK IN FUTURE EDITS OR REPLACE IT WITH LLM JUDGMENT CALLS.
 * 
 * DISCLAIMER: This seeded list contains standard Schedule X, Narcotic, and
 * Psychotropic substance keywords. It MUST be reviewed by an empaneled doctor
 * or licensed pharmacist for comprehensive clinical coverage.
 * =========================================================================
 */

export const SCHEDULE_X_NARCOTIC_BLOCKLIST = [
  // Schedule X Controlled Substances (TPG 2020 Prohibited List)
  'amphetamine',
  'amobarbital',
  'buprenorphine',
  'cocaine',
  'codeine',
  'dexamphetamine',
  'diazepam',
  'fentanyl',
  'ketamine',
  'methadone',
  'methylphenidate',
  'midazolam',
  'morphine',
  'nitrazepam',
  'opium',
  'oxycodone',
  'pentobarbital',
  'pethidine',
  'phenobarbital',
  'secobarbital',
  
  // Psychotropic & Potent Sedative / Anxiolytic Benzodiazepines
  'alprazolam',
  'clobazam',
  'clonazepam',
  'etizolam',
  'lorazepam',
  'modafinil',
  'tramadol',
  'zolpidem',
  
  // General Category Keywords
  'narcotic',
  'psychotropic',
  'schedule x',
  'schedule-x',
];

export interface DrugBlocklistCheckResult {
  blocked: boolean;
  matchedKeyword?: string;
  message?: string;
}

/**
 * Checks a medication name (case-insensitive) against the maintained
 * Schedule X & Controlled Substance Blocklist.
 */
export function checkDrugBlocklist(drugName: string): DrugBlocklistCheckResult {
  if (!drugName) return { blocked: false };

  const normalized = drugName.toLowerCase().trim();

  for (const keyword of SCHEDULE_X_NARCOTIC_BLOCKLIST) {
    // Regex word boundary or substring match for safety
    if (normalized.includes(keyword)) {
      return {
        blocked: true,
        matchedKeyword: keyword,
        message: 'This medication cannot be prescribed via telemedicine under TPG 2020 — an in-person consultation is required.',
      };
    }
  }

  return { blocked: false };
}
