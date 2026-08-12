import { checkUrgency } from './index';

interface TestCase {
  name: string;
  data: {
    duration?: string;
    severity?: string;
    primary_symptoms?: string[];
    associated_symptoms?: string[];
    relevant_history?: string;
  };
  age?: number;
  rawText?: string;
  expectedUrgency: 'low' | 'medium' | 'high';
}

const testCases: TestCase[] = [
  {
    name: 'Test 1: HIGH - Chest pain + Breathlessness',
    data: {
      duration: '2 hours',
      severity: 'severe',
      primary_symptoms: ['chest pain', 'breathlessness'],
      associated_symptoms: ['sweating'],
    },
    rawText: 'Severe chest pain and shortness of breath since 2 hours',
    expectedUrgency: 'high',
  },
  {
    name: 'Test 2: HIGH - Stroke Signs (Slurred speech + One-sided weakness)',
    data: {
      duration: '1 hour',
      severity: 'acute',
      primary_symptoms: ['slurred speech', 'right arm weakness'],
    },
    rawText: 'His face is drooping and speech is slurred, right arm paralysed',
    expectedUrgency: 'high',
  },
  {
    name: 'Test 3: HIGH - Suicidal Ideation mentioned in text',
    data: {
      primary_symptoms: ['depression', 'insomnia'],
    },
    rawText: 'I feel hopeless and I want to end my life',
    expectedUrgency: 'high',
  },
  {
    name: 'Test 4: MEDIUM - Fever for 4 days',
    data: {
      duration: '4 days',
      severity: 'moderate',
      primary_symptoms: ['fever', 'body ache'],
    },
    rawText: 'High fever for 4 days and body pain',
    expectedUrgency: 'medium',
  },
  {
    name: 'Test 5: MEDIUM - Infant with fever (Age 0.5 yrs)',
    data: {
      duration: '1 day',
      primary_symptoms: ['fever', 'crying'],
    },
    age: 0,
    rawText: 'Baby is 6 months old crying continuously with fever',
    expectedUrgency: 'medium',
  },
  {
    name: 'Test 6: MEDIUM - Symptoms in Pregnant Patient',
    data: {
      duration: '12 hours',
      primary_symptoms: ['nausea', 'dizziness'],
      relevant_history: '2nd trimester pregnant',
    },
    rawText: 'I am 5 months pregnant and feeling very dizzy and nauseous',
    expectedUrgency: 'medium',
  },
  {
    name: 'Test 7: LOW - Mild Skin Rash 1 Day',
    data: {
      duration: '1 day',
      severity: 'mild',
      primary_symptoms: ['skin rash', 'itching'],
    },
    rawText: 'Mild itchy red rash on forearm since yesterday',
    expectedUrgency: 'low',
  },
  {
    name: 'Test 8: LOW - Cold and Runny Nose',
    data: {
      duration: '2 days',
      severity: 'mild',
      primary_symptoms: ['runny nose', 'sneezing'],
    },
    rawText: 'Sneezing and runny nose for 2 days',
    expectedUrgency: 'low',
  },
  {
    name: 'Test 9: Edge Case - Raw text contains "chhati me dard" (Hinglish chest pain) missed by LLM primary array',
    data: {
      duration: '3 hours',
      primary_symptoms: ['chest discomfort'],
    },
    rawText: 'Bohot chhati me dard ho raha hai aur saans phool rahi hai',
    expectedUrgency: 'high',
  },
  {
    name: 'Test 10: Edge Case - Geriatric Patient (Age 72) with Fever',
    data: {
      duration: '1 day',
      primary_symptoms: ['fever', 'fatigue'],
    },
    age: 72,
    rawText: 'Grandfather is 72 years old feeling weak with fever',
    expectedUrgency: 'medium',
  },
  {
    name: 'Test 11: Edge Case - Non-cardiac Chest Burning (Chhati me jalan / Acidity)',
    data: {
      duration: '2 hours',
      primary_symptoms: ['heartburn', 'acidity'],
    },
    rawText: 'Chhati me jalan ho rahi hai khana khane ke baad, acidity lag rahi hai',
    expectedUrgency: 'low',
  },
  {
    name: 'Test 12: Multilingual - Tamil Chest Pain + Breathlessness ("marbu vali" & "suwasa kashtam")',
    data: {
      primary_symptoms: ['marbu vali'],
    },
    rawText: 'Enakku marbu vali irukku matrum suwasa kashtam',
    expectedUrgency: 'high',
  },
  {
    name: 'Test 13: Multilingual - Kannada Romanized ("nenju novu" & "usirata thondare")',
    data: {
      primary_symptoms: ['nenju novu'],
    },
    rawText: 'Nanage nenju novu ide mathu usirata thondare ide',
    expectedUrgency: 'high',
  },
  {
    name: 'Test 14: Native Unicode Script - Tamil ("மார்பு வலி" & "மூச்சுத் திணறல்")',
    data: {
      primary_symptoms: ['மார்பு வலி'],
    },
    rawText: 'எனக்கு மார்பு வலி இருக்கு மற்றும் மூச்சுத் திணறல்',
    expectedUrgency: 'high',
  },
  {
    name: 'Test 15: Native Unicode Script - Kannada ("ಎದೆ ನೋವು" & "ಉಸಿರಾಟದ ತೊಂದರೆ")',
    data: {
      primary_symptoms: ['ಎದೆ ನೋವು'],
    },
    rawText: 'ನನಗೆ ಎದೆ ನೋವು ಇದೆ ಮತ್ತು ಉಸಿರಾಟದ ತೊಂದರೆ ಇದೆ',
    expectedUrgency: 'high',
  },
  {
    name: 'Test 16: Native Unicode Script - Devanagari Hindi ("छाती में दर्द" & "सांस लेने में तकलीफ")',
    data: {
      primary_symptoms: ['छाती में दर्द'],
    },
    rawText: 'मुझे बहुत तेज छाती में दर्द हो रहा है और सांस लेने में तकलीफ हो रही है',
    expectedUrgency: 'high',
  },
];

console.log('--- RUNNING DETERMINISTIC RULES ENGINE TEST SUITE ---\n');

let passed = 0;
let failed = 0;

testCases.forEach((tc) => {
  const result = checkUrgency(tc.data, tc.age, tc.rawText);
  const isMatch = result.urgency_level === tc.expectedUrgency;

  if (isMatch) {
    passed++;
    console.log(`✅ [PASS] ${tc.name}`);
    console.log(`   Urgency: ${result.urgency_level} | Red Flags: [${result.red_flags.join('; ')}]`);
  } else {
    failed++;
    console.log(`❌ [FAIL] ${tc.name}`);
    console.log(`   Expected: ${tc.expectedUrgency} | Got: ${result.urgency_level}`);
    console.log(`   Red Flags: [${result.red_flags.join('; ')}]`);
  }
  console.log('----------------------------------------------------');
});

console.log(`\nTEST SUMMARY: ${passed}/${testCases.length} Passed (${failed} Failed).`);

if (failed > 0) {
  process.exit(1);
}
