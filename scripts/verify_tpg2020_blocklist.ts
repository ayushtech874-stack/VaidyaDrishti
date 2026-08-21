import { checkDrugBlocklist, SCHEDULE_X_NARCOTIC_BLOCKLIST } from '../lib/compliance/drugBlocklist';

function auditTpg2020Blocklist() {
  console.log('========================================================================');
  console.log('🛡️ TPG 2020 CLINICAL DRUG BLOCKLIST AUDIT & CLINICAL SIGN-OFF REPORT');
  console.log('========================================================================\n');

  console.log(`Total Maintained Seeded Blocklist Keywords: ${SCHEDULE_X_NARCOTIC_BLOCKLIST.length}`);
  console.log('Maintained Keywords List:');
  console.log(SCHEDULE_X_NARCOTIC_BLOCKLIST.map((k) => ` - "${k}"`).join('\n'));

  console.log('\n--- Running Category Test Prescriptions ---');

  const testCases = [
    { category: 'Schedule X Narcotics', drug: 'Morphine Sulfate 10mg', expectedBlocked: true },
    { category: 'Schedule X Narcotics', drug: 'Fentanyl Transdermal 25mcg', expectedBlocked: true },
    { category: 'Psychotropic Sedative', drug: 'Alprazolam 0.5mg', expectedBlocked: true },
    { category: 'Psychotropic Anxiolytic', drug: 'Diazepam 5mg', expectedBlocked: true },
    { category: 'Psychotropic Hypnotic', drug: 'Zolpidem 10mg', expectedBlocked: true },
    { category: 'Potent Synthetic Opioid', drug: 'Tramadol 50mg', expectedBlocked: true },
    { category: 'Stimulant / Psychotropic', drug: 'Methylphenidate 10mg', expectedBlocked: true },
    { category: 'General Unrestricted OTC', drug: 'Paracetamol 500mg', expectedBlocked: false },
    { category: 'General Antibiotic', drug: 'Amoxicillin 500mg', expectedBlocked: false },
    { category: 'General Antacid', drug: 'Pantoprazole 40mg', expectedBlocked: false },
  ];

  let passCount = 0;

  for (const tc of testCases) {
    const res = checkDrugBlocklist(tc.drug);
    const pass = res.blocked === tc.expectedBlocked;
    if (pass) passCount++;

    console.log(
      `[${pass ? '✅ PASS' : '❌ FAIL'}] ${tc.category.padEnd(26)} | Drug: "${tc.drug.padEnd(26)}" | Blocked: ${res.blocked} ${res.matchedKeyword ? `(Matched: ${res.matchedKeyword})` : ''}`
    );
  }

  console.log('\n========================================================================');
  console.log(`AUDIT RESULTS: ${passCount} / ${testCases.length} Test Cases Passed.`);
  console.log('------------------------------------------------------------------------');
  console.log('📢 CLINICAL REVIEW FORM FOR PILOT RMP DOCTOR / PHARMACIST:');
  console.log('   "I have reviewed the above Schedule X, Narcotic, and Psychotropic drug');
  console.log('   keyword blocklist for Telemedicine Practice Guidelines (TPG 2020)');
  console.log('   compliance on VaidyaDrishti."');
  console.log('========================================================================\n');
}

auditTpg2020Blocklist();
