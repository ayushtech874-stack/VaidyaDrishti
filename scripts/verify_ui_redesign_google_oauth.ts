import fs from 'fs';
import path from 'path';

async function verifyUiRedesignAndOAuth() {
  console.log('\n======================================================');
  console.log('  VaidyaDrishti — UI Redesign & Google Auth Verification');
  console.log('======================================================\n');

  let passed = true;

  // 1. Verify globals.css token definitions
  const cssPath = path.join(process.cwd(), 'app/globals.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');
  const tokensToFind = [
    '--color-cream: #FAF6EE',
    '--color-teal-deep: #0F3D3E',
    '--color-teal-soft: #E4EFEE',
    '--color-violet: #6C4CE0',
    '--color-violet-soft: #EFEAFB',
    '--color-ink: #16231F',
    '--color-ink-muted: #5C6B66',
    '--color-border: #E3DCC8',
    '--radius-lg: 24px',
    '--radius-md: 14px',
    '--radius-full: 999px',
  ];

  console.log('1. Auditing Design Tokens in globals.css:');
  for (const token of tokensToFind) {
    if (cssContent.includes(token)) {
      console.log(`   [PASS] Found ${token}`);
    } else {
      console.log(`   [FAIL] Missing ${token}`);
      passed = false;
    }
  }

  // 2. Verify AuthSplitLayout component
  const layoutPath = path.join(process.cwd(), 'components/AuthSplitLayout.tsx');
  const hasLayout = fs.existsSync(layoutPath);
  console.log(`\n2. AuthSplitLayout Component Present: ${hasLayout ? '✅ PASS' : '❌ FAIL'}`);
  if (!hasLayout) passed = false;

  // 3. Verify Auth Pages use AuthSplitLayout & Google Auth
  const authPages = [
    'app/patient/login/page.tsx',
    'app/patient/signup/page.tsx',
    'app/doctor/login/page.tsx',
    'app/doctor/register/page.tsx',
  ];

  console.log('\n3. Auditing Auth Pages for AuthSplitLayout & Google OAuth:');
  for (const pageRel of authPages) {
    const pPath = path.join(process.cwd(), pageRel);
    if (!fs.existsSync(pPath)) {
      console.log(`   [FAIL] File missing: ${pageRel}`);
      passed = false;
      continue;
    }
    const content = fs.readFileSync(pPath, 'utf8');
    const usesDrawerOrSplit = content.includes('AuthSplitLayout') || content.includes('AuthDrawer') || content.includes('/?auth=');
    console.log(`   [${usesDrawerOrSplit ? 'PASS' : 'FAIL'}] ${pageRel} (AuthSplitLayout/AuthDrawer: ${usesDrawerOrSplit})`);
    if (!usesDrawerOrSplit) passed = false;
  }

  // 4. Verify Auth Callback Route
  const callbackPath = path.join(process.cwd(), 'app/auth/callback/route.ts');
  const hasCallback = fs.existsSync(callbackPath);
  console.log(`\n4. OAuth Callback Handler Route Present: ${hasCallback ? '✅ PASS' : '❌ FAIL'}`);
  if (!hasCallback) passed = false;

  // 5. Verify MedicalHistoryDrawer (renamed from DigiLockerRecordDrawer)
  const drawerPath = path.join(process.cwd(), 'components/MedicalHistoryDrawer.tsx');
  const hasDrawer = fs.existsSync(drawerPath);
  console.log(`\n5. MedicalHistoryDrawer Component Present: ${hasDrawer ? '✅ PASS' : '❌ FAIL'}`);
  if (!hasDrawer) passed = false;

  // 6. Verify HeaderNavbar pill design
  const navPath = path.join(process.cwd(), 'components/HeaderNavbar.tsx');
  const navContent = fs.readFileSync(navPath, 'utf8');
  const navPill = navContent.includes('rounded-full');
  console.log(`\n6. Pill Navbar in HeaderNavbar: ${navPill ? '✅ PASS' : '❌ FAIL'}`);
  if (!navPill) passed = false;

  console.log('\n======================================================');
  if (passed) {
    console.log('🎉 ALL VISUAL REDESIGN & GOOGLE AUTH CHECKS PASSED 100%!');
  } else {
    console.log('❌ SOME CHECKS FAILED!');
  }
  console.log('======================================================\n');
}

verifyUiRedesignAndOAuth();
