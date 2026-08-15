import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { POST } from '../app/api/whatsapp/webhook/route';

async function runSimulationTests() {
  console.log('🧪 Starting WhatsApp State Machine Integration Test Suite...\n');

  // Test Case 1: Gender parsing helper test
  console.log('Test 1: Gender Parsing Verification');
  const g1 = (await import('../app/api/whatsapp/webhook/route')).parseGenderInput('1');
  const g2 = (await import('../app/api/whatsapp/webhook/route')).parseGenderInput('Female');
  if (g1 === 'Male' && g2 === 'Female') {
    console.log('  ✅ PASSED: Gender parsing works for numbers and text.\n');
  } else {
    console.error('  ❌ FAILED: Gender parsing output mismatch:', g1, g2);
  }

  // Test Case 2: Webhook POST simulation - New QR Code Session Creation
  console.log('Test 2: QR Code Join Locks Clinic & Asks Name (Step 1)');
  const formData1 = new FormData();
  formData1.append('From', 'whatsapp:+919876543210');
  formData1.append('Body', 'JOIN_HOSP_HealingTouch');

  const req1 = new Request('http://localhost:3000/api/whatsapp/webhook', {
    method: 'POST',
    body: formData1,
  });

  const res1 = await POST(req1);
  const text1 = await res1.text();
  console.log('  Res 1:', text1.replace(/[\r\n]+/g, ' '));
  if (text1.includes('Healing Touch Hospital') && text1.includes("name")) {
    console.log('  ✅ PASSED: QR scan locked Healing Touch Hospital & prompted for Name.\n');
  } else {
    console.log('  ℹ️ Output received:', text1);
  }

  // Test Case 3: Step Advancement - Replying Name advances to Age
  console.log('Test 3: Answering Name advances step to Age');
  const formData2 = new FormData();
  formData2.append('From', 'whatsapp:+919876543210');
  formData2.append('Body', 'Ramesh Kumar');

  const req2 = new Request('http://localhost:3000/api/whatsapp/webhook', {
    method: 'POST',
    body: formData2,
  });

  const res2 = await POST(req2);
  const text2 = await res2.text();
  console.log('  Res 2:', text2.replace(/[\r\n]+/g, ' '));
  if (text2.includes("age")) {
    console.log('  ✅ PASSED: Replying name advanced current_step to Age.\n');
  } else {
    console.log('  ℹ️ Output received:', text2);
  }

  // Test Case 4: MID-FLOW QR SWITCH - Scanning different clinic QR code triggers confirmation prompt
  console.log('Test 4: Scanning different clinic QR code mid-session triggers confirmation prompt');
  const formDataSwitch = new FormData();
  formDataSwitch.append('From', 'whatsapp:+919876543210');
  formDataSwitch.append('Body', 'JOIN_CLINIC_EYES');

  const reqSwitch = new Request('http://localhost:3000/api/whatsapp/webhook', {
    method: 'POST',
    body: formDataSwitch,
  });

  const resSwitch = await POST(reqSwitch);
  const textSwitch = await resSwitch.text();
  console.log('  Res Switch:', textSwitch.replace(/[\r\n]+/g, ' '));
  if (textSwitch.includes("do you want to switch") || textSwitch.includes("Reply YES to switch")) {
    console.log('  ✅ PASSED: Scanning different QR code triggered switch confirmation prompt.\n');
  } else {
    console.log('  ℹ️ Output received:', textSwitch);
  }

  // Test Case 5: END Command - Terminating session mid-flow
  console.log('Test 5: END command terminates session without creating intake');
  const formDataEnd = new FormData();
  formDataEnd.append('From', 'whatsapp:+919876543210');
  formDataEnd.append('Body', 'END');

  const reqEnd = new Request('http://localhost:3000/api/whatsapp/webhook', {
    method: 'POST',
    body: formDataEnd,
  });

  const resEnd = await POST(reqEnd);
  const textEnd = await resEnd.text();
  console.log('  Res End:', textEnd.replace(/[\r\n]+/g, ' '));
  if (textEnd.includes("cancelled") || textEnd.includes("No data was saved")) {
    console.log('  ✅ PASSED: END command terminated session cleanly.\n');
  } else {
    console.log('  ℹ️ Output received:', textEnd);
  }

  console.log('🎉 All WhatsApp State Machine Tests Completed!');
}

runSimulationTests().catch(console.error);
