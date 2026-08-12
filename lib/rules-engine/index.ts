/**
 * Deterministic Red-Flag Rules Engine for VaidyaDrishti
 * 
 * DESIGN PRINCIPLE: Pure, auditable TypeScript code with zero LLM dependence.
 * PROTOCOL SOURCES:
 * - Manchester Triage System (MTS) - Emergency & Urgent categories
 * - WHO Integrated Management of Adolescent and Adult Illness (IMAI) Guidelines
 * - ICMR Triage Protocols for Primary Healthcare
 * 
 * MULTILINGUAL SUPPORT (Native Unicode Script + Romanized Transliterations):
 * - English, Hindi/Hinglish (chhati me dard / छाती में दर्द)
 * - Tamil (marbu vali / மார்பு வலி)
 * - Kannada (nenju novu / ನೆஞ்சு ನೋವು)
 * - Telugu (gunde noppi / గుండె నొప్పి)
 * - Marathi (chatit dukhne / छातीत दुखणे)
 * - Bengali (buke batha / বুকে ব্যথা)
 * - Punjabi (hikk vich dard / ਛਾਤੀ ਵਿੱਚ ਦਰਦ)
 */

export interface StructuredIntakeData {
  duration?: string;
  severity?: string;
  primary_symptoms?: string[];
  associated_symptoms?: string[];
  relevant_history?: string;
  extraction_confidence?: 'high' | 'medium' | 'low';
}

export interface TriageResult {
  urgency_level: 'low' | 'medium' | 'high';
  red_flags: string[];
}

function matchPattern(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

export function checkUrgency(
  data: StructuredIntakeData,
  patientAge?: number | null,
  rawText?: string
): TriageResult {
  const redFlags: string[] = [];

  const allSymptomsText = [
    ...(data.primary_symptoms || []),
    ...(data.associated_symptoms || []),
    data.duration || '',
    data.severity || '',
    data.relevant_history || '',
    rawText || '',
  ]
    .join(' ')
    .toLowerCase();

  // =========================================================================
  // 1. MULTILINGUAL KEYWORD PATTERNS (NATIVE UNICODE + ROMANIZED TRANSCRIPTS)
  // =========================================================================

  // Chest Pain patterns (English, Hindi, Tamil, Kannada, Telugu, Marathi, Bengali, Punjabi in Devanagari & Native Scripts)
  const hasChestPain = matchPattern(allSymptomsText, [
    /chest\s*pain/i, /chhati\s*me\s*dard/i, /angina/i, /chest\s*pressure/i, /chest\s*heaviness/i,
    /छाती\s*में\s*दर्द/i, /छाती\s*दर्द/i,
    /marbu\s*vali/i, /மார்பு\s*வலி/i,
    /nenju\s*novu/i, /ನೆஞ்சு\s*ನೋವು/i, /ಎದೆ\s*ನೋವು/i,
    /gunde\s*noppi/i, /గుండె\s*నొప్పి/i,
    /chatit\s*dukhne/i, /छातीत\s*दुखणे/i,
    /buke\s*batha/i, /বুকে\s*ব্যথা/i,
    /hikk\s*vich\s*dard/i, /ਛਾਤੀ\s*ਵਿੱਚ\s*ਦਰਦ/i
  ]);

  // Breathlessness patterns
  const hasBreathlessness = matchPattern(allSymptomsText, [
    /breathless/i, /shortness\s*of\s*breath/i, /saans\s*phool/i, /difficulty\s*breathing/i, /dyspnea/i,
    /सांस\s*फूल/i, /सांस\s*लेने\s*में\s*तकलीफ/i,
    /suwasa\s*kashtam/i, /சுவாச\s*கஷ்டம்/i, /மூச்சு\s*த்திணறல்/i, /மூச்சுத்\s*திணறல்/i, /மூச்சு/i,
    /usirata\s*thondare/i, /ಉಸಿರಾಟದ\s*ತೊಂದರೆ/i,
    /gali\s*aadamata/i, /గాలి\s*ఆడకపోవడం/i,
    /shwas\s*ghenyas\s*tras/i, /श्वास\s*घेण्यास\s*त्रास/i,
    /shwas\s*kosto/i, /শ্বাসকষ্ট/i,
    /saah\s*lain\s*vich\s*takleef/i, /ਸਾਹ\s*ਲੈਣ\s*ਵਿੱਚ\s*ਤਕਲੀਫ਼/i
  ]);

  // Bleeding patterns
  const hasSevereBleeding = matchPattern(allSymptomsText, [
    /severe\s*bleeding/i, /uncontrolled\s*bleeding/i, /vomiting\s*blood/i, /hematemesis/i, /khun\s*nikal/i, /heavy\s*bleeding/i,
    /खून\s*निकल/i, /रक्तस्राव/i, /இரத்த\s*ப்போக்கு/i, /ರಕ್ತಸ್ರಾವ/i, /రక్తస్రావం/i, /রক্তপাত/i
  ]);

  // Unconscious patterns
  const hasUnconscious = matchPattern(allSymptomsText, [
    /unconscious/i, /fainted/i, /fainting/i, /passed\s*out/i, /behosh/i, /confusion/i, /altered\s*mental/i, /disoriented/i,
    /बेहोश/i, /மயக்கம்/i, /ಅರಿವು\s*ತಪ್ಪಿದೆ/i, /స్పృహ\s*తప్పడం/i, /बेहोष/i, /অজ্ঞান/i
  ]);

  // Abdominal Pain patterns
  const hasAbdominalPain = matchPattern(allSymptomsText, [
    /abdominal\s*pain/i, /stomach\s*pain/i, /pet\s*dard/i, /belly\s*pain/i,
    /पेट\s*दर्द/i, /வயிறு\s*வலி/i, /ಹೊಟ್ಟೆ\s*ನೋವು/i, /కడుపు\s*నొప్పి/i, /पोटात\s*दुखणे/i, /পেটে\s*ব্যথা/i
  ]);

  // Fever patterns
  const hasFever = matchPattern(allSymptomsText, [
    /fever/i, /bukhar/i, /high\s*temp/i, /pyrexia/i,
    /बुखार/i, /காய்ச்சல்/i, /ಜ್ವರ/i, /జ్వరం/i, /ताप/i, /জ্বর/i
  ]);

  // =========================================================================
  // 2. HIGH URGENCY TRIGGERS (Manchester Triage System Red)
  // =========================================================================

  // Rule H1: Chest Pain + Breathlessness
  if (hasChestPain && hasBreathlessness) {
    redFlags.push('HIGH: Chest pain combined with breathlessness (MTS Red Flag - Possible ACS/PE)');
  } else if (hasChestPain && matchPattern(allSymptomsText, [/severe/i, /unbearable/i, /left\s*arm/i, /jaw\s*pain/i, /sweating/i, /तेज/i, /असहनीय/i])) {
    redFlags.push('HIGH: Severe chest pain with radiation or diaphoresis (MTS Red Flag)');
  }

  // Rule H2: Severe / Uncontrolled Bleeding
  if (hasSevereBleeding) {
    redFlags.push('HIGH: Severe or uncontrolled bleeding reported (WHO IMAI Emergency Flag)');
  }

  // Rule H3: Loss of Consciousness or Altered State
  if (hasUnconscious) {
    redFlags.push('HIGH: Altered consciousness, syncope, or acute confusion (MTS Red Flag)');
  }

  // Rule H4: Stroke Symptoms
  if (matchPattern(allSymptomsText, [/facial\s*droop/i, /face\s*droop/i, /slurred\s*speech/i, /one\s*sided\s*weakness/i, /paralysis/i, /arm\s*weakness/i, /paralysed/i, /पैरालिसिस/i, /लकवा/i])) {
    redFlags.push('HIGH: Acute neurological deficit / Stroke signs (FAST protocol)');
  }

  // Rule H5: Severe Respiratory Distress at Rest
  if (hasBreathlessness && matchPattern(allSymptomsText, [/at\s*rest/i, /gasping/i, /unable\s*to\s*speak/i, /severe/i, /blue\s*lips/i, /cyanosis/i])) {
    redFlags.push('HIGH: Severe respiratory distress at rest (WHO IMAI Red Flag)');
  }

  // Rule H6: Severe Abdominal Pain + Fever
  if (hasAbdominalPain && hasFever && matchPattern(allSymptomsText, [/severe/i, /unbearable/i, /high/i, /acute/i, /तेज/i, /असहनीय/i])) {
    redFlags.push('HIGH: Severe abdominal pain accompanied by fever (MTS Acute Abdomen)');
  }

  // Rule H7: Suicidal Ideation
  if (matchPattern(allSymptomsText, [/suicid/i, /self\s*harm/i, /want\s*to\s*die/i, /end\s*my\s*life/i, /kill\s*myself/i, /आत्महत्या/i])) {
    redFlags.push('HIGH: Expressed suicidal ideation or self-harm (MTS Psychiatric Emergency)');
  }

  if (redFlags.some((flag) => flag.startsWith('HIGH'))) {
    return {
      urgency_level: 'high',
      red_flags: redFlags,
    };
  }

  // =========================================================================
  // 3. MEDIUM URGENCY TRIGGERS (Manchester Triage System Yellow)
  // =========================================================================

  const durationText = (data.duration || '').toLowerCase();
  const feverDurationMatch = durationText.match(/(\d+)\s*(day|d)|(\d+)\s*din/i);
  let feverDays = 0;
  if (feverDurationMatch) {
    feverDays = parseInt(feverDurationMatch[1] || feverDurationMatch[3] || '0', 10);
  }

  if (hasFever && (feverDays >= 3 || matchPattern(durationText, [/4\s*day/i, /5\s*day/i, /week/i, /several\s*days/i, /3\+?\s*day/i, /दिन/i]))) {
    redFlags.push('MEDIUM: Prolonged fever (> 3 days) (WHO IMAI Urgent Category)');
  }

  if (matchPattern(allSymptomsText, [/persistent\s*vomiting/i, /continuous\s*vomiting/i, /vomiting\s*repeatedly/i, /severe\s*diarrhea/i, /dast/i, /ultiy/i, /loose\s*motion/i, /उल्टी/i, /दस्त/i])) {
    redFlags.push('MEDIUM: Persistent vomiting or severe diarrhea (Risk of dehydration)');
  }

  if (matchPattern(allSymptomsText, [/moderate\s*pain/i, /uncontrolled\s*pain/i, /pain\s*not\s*reducing/i, /dawa\s*se\0faram\s*nahi/i])) {
    redFlags.push('MEDIUM: Moderate pain uncontrolled by basic measures');
  }

  if (matchPattern(allSymptomsText, [/pregnant/i, /pregnancy/i, /garbhavati/i, /trimester/i, /गर्भवती/i, /गर्भावस्था/i])) {
    redFlags.push('MEDIUM: Symptoms presenting in a pregnant patient (MTS Obstetric Safety)');
  }

  if (patientAge !== undefined && patientAge !== null) {
    if (patientAge <= 1 && (hasFever || matchPattern(allSymptomsText, [/crying/i, /poor\s*feeding/i, /lethargic/i]))) {
      redFlags.push(`MEDIUM: Pediatric presentation (Age ${patientAge} yr) with fever/systemic symptoms`);
    } else if (patientAge >= 65 && (hasFever || hasBreathlessness || matchPattern(allSymptomsText, [/weakness/i, /fall/i]))) {
      redFlags.push(`MEDIUM: Geriatric presentation (Age ${patientAge} yrs) with systemic symptoms`);
    }
  }

  if (redFlags.length > 0) {
    return {
      urgency_level: 'medium',
      red_flags: redFlags,
    };
  }

  return {
    urgency_level: 'low',
    red_flags: [],
  };
}
