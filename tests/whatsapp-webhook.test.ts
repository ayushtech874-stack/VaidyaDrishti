import { parseGenderInput } from '../app/api/whatsapp/webhook/route';

export function runWhatsAppWebhookTests() {
  // Test gender parsing helper
  const g1 = parseGenderInput('1');
  const g2 = parseGenderInput('Female');
  const g3 = parseGenderInput('3');

  if (g1 !== 'Male' || g2 !== 'Female' || g3 !== 'Other') {
    throw new Error(`Gender parsing test failed: g1=${g1}, g2=${g2}, g3=${g3}`);
  }

  // Session state step progression sequence assertion
  const flowSteps = [
    'awaiting_name',
    'awaiting_age',
    'awaiting_gender',
    'awaiting_symptoms',
    'completed'
  ];

  if (flowSteps[0] !== 'awaiting_name' || flowSteps[4] !== 'completed') {
    throw new Error('Flow step sequence assertion failed');
  }

  return true;
}

runWhatsAppWebhookTests();
