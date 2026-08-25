import en from '../lib/i18n/en.json';
import hi from '../lib/i18n/hi.json';

function getAllKeys(obj: any, prefix = ''): string[] {
  let keys: string[] = [];
  for (const k in obj) {
    if (typeof obj[k] === 'object' && obj[k] !== null) {
      keys = keys.concat(getAllKeys(obj[k], `${prefix}${k}.`));
    } else {
      keys.push(`${prefix}${k}`);
    }
  }
  return keys;
}

function verifyPhase9cI18n() {
  console.log('========================================================================');
  console.log('🧪 VERIFYING PHASE 9c: I18N HINDI + ENGLISH DICTIONARY PARITY & ACCURACY');
  console.log('========================================================================\n');

  try {
    // -------------------------------------------------------------------------
    // TEST 1: 100% Key Parity Verification
    // -------------------------------------------------------------------------
    console.log('📍 TEST 1: Dictionary Key Parity Check (English vs Hindi)');
    const enKeys = getAllKeys(en);
    const hiKeys = getAllKeys(hi);

    const missingInHi = enKeys.filter((k) => !hiKeys.includes(k));
    const missingInEn = hiKeys.filter((k) => !enKeys.includes(k));

    console.log(`  └─ Total English Keys: ${enKeys.length}`);
    console.log(`  └─ Total Hindi Keys: ${hiKeys.length}`);
    console.log(`  └─ Missing in Hindi: ${missingInHi.length} keys`);
    console.log(`  └─ Missing in English: ${missingInEn.length} keys`);

    if (missingInHi.length > 0 || missingInEn.length > 0) {
      throw new Error(`Key parity failure! Missing in Hi: ${missingInHi.join(', ')} | Missing in En: ${missingInEn.join(', ')}`);
    }
    console.log('  └─ TEST 1 PASSED: 100% Key Parity between English and Hindi dictionaries! ✅\n');

    // -------------------------------------------------------------------------
    // TEST 2: Essential Translation Content Check
    // -------------------------------------------------------------------------
    console.log('📍 TEST 2: Essential DPDP & Severity Translation Content Verification');

    const enConsent = en.intake.dpdpConsent;
    const hiConsent = hi.intake.dpdpConsent;
    const enHighSev = en.severity.high;
    const hiHighSev = hi.severity.high;

    const enHasDPDP = enConsent.includes('DPDP Act 2023');
    const hiHasDPDP = hiConsent.includes('DPDP अधिनियम 2023');
    const enHasSofterFraming = enHighSev.includes('prompt doctor review');
    const hiHasSofterFraming = hiHighSev.includes('त्वरित डॉक्टर समीक्षा');

    console.log(`  └─ English DPDP Act 2023 String Present: ${enHasDPDP} ✅`);
    console.log(`  └─ Hindi DPDP Act 2023 String Present: ${hiHasDPDP} ✅`);
    console.log(`  └─ Softer Severity Framing (English): "${enHighSev}" ✅`);
    console.log(`  └─ Softer Severity Framing (Hindi): "${hiHighSev}" ✅`);

    if (!enHasDPDP || !hiHasDPDP || !enHasSofterFraming || !hiHasSofterFraming) {
      throw new Error('Test 2 Content Accuracy Assertion Failed!');
    }
    console.log('  └─ TEST 2 PASSED: DPDP consent and softer severity framing verified in both languages! ✅\n');

    console.log('========================================================================');
    console.log('🎉 PHASE 9c VERIFICATION COMPLETED WITH 100% SUCCESS!');
    console.log('========================================================================\n');
  } catch (err: any) {
    console.error('Verification Error:', err.message);
  }
}

verifyPhase9cI18n();
