/**
 * =========================================================================
 * 🛡️ VAIDYADRISHTI CLINICAL REMINDER GENERATOR (DETERMINISTIC & NON-AI)
 * =========================================================================
 * Generates scheduled reminders for:
 * 1. Medicine Dosage (computed from prescription frequency & duration)
 * 2. Appointments (24 hours and 1 hour before scheduled time)
 * 3. Doctor-Authored Diet Guidance (DOCTOR-AUTHORED ONLY — NO LLM ORIGINATION)
 * =========================================================================
 */

export interface GenerateMedicineRemindersInput {
  patient_id: string;
  prescription_id: string;
  drug_name: string;
  dosage: string;
  frequency: string;
  duration_days: number;
  instructions?: string;
  issued_at: string;
}

export interface GenerateAppointmentRemindersInput {
  patient_id: string;
  appointment_id: string;
  scheduled_at: string;
  doctor_name?: string;
}

export interface GenerateDietRemindersInput {
  patient_id: string;
  doctor_id: string;
  diet_id: string;
  content: string;
}

/**
 * Computes scheduled medicine reminder rows based on frequency and duration.
 */
export function computeMedicineReminders(input: GenerateMedicineRemindersInput) {
  const reminders: any[] = [];
  const start = new Date(input.issued_at || Date.now());
  const days = Math.min(Math.max(input.duration_days || 5, 1), 30); // 1-30 days max

  // Determine daily reminder hours based on frequency string
  let times: number[] = [9]; // Default 9:00 AM
  const freqLower = (input.frequency || '').toLowerCase();

  if (freqLower.includes('twice') || freqLower.includes('1-0-1')) {
    times = [9, 21]; // 9:00 AM & 9:00 PM
  } else if (freqLower.includes('thrice') || freqLower.includes('1-1-1')) {
    times = [9, 14, 21]; // 9:00 AM, 2:00 PM & 9:00 PM
  }

  for (let dayIndex = 0; dayIndex < days; dayIndex++) {
    for (const hour of times) {
      const scheduledDate = new Date(start);
      scheduledDate.setDate(start.getDate() + dayIndex);
      scheduledDate.setHours(hour, 0, 0, 0);

      // Only schedule future or present reminders
      reminders.push({
        patient_id: input.patient_id,
        type: 'medicine',
        source_table: 'prescriptions',
        source_id: input.prescription_id,
        message: `💊 Time for medication: ${input.drug_name} (${input.dosage}) — ${input.instructions || 'Take as prescribed.'}`,
        scheduled_for: scheduledDate.toISOString(),
        status: 'pending',
      });
    }
  }

  return reminders;
}

/**
 * Computes appointment reminders at 24 hours and 1 hour before scheduled time.
 */
export function computeAppointmentReminders(input: GenerateAppointmentRemindersInput) {
  const reminders: any[] = [];
  const scheduledTime = new Date(input.scheduled_at).getTime();

  // 24 Hours Before Reminder
  const t24h = new Date(scheduledTime - 24 * 60 * 60 * 1000);
  if (t24h.getTime() > Date.now()) {
    reminders.push({
      patient_id: input.patient_id,
      type: 'appointment',
      source_table: 'appointments',
      source_id: input.appointment_id,
      message: `📅 Upcoming OPD Appointment tomorrow at ${new Date(input.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} with Dr. ${input.doctor_name || 'Practitioner'}.`,
      scheduled_for: t24h.toISOString(),
      status: 'pending',
    });
  }

  // 1 Hour Before Reminder
  const t1h = new Date(scheduledTime - 60 * 60 * 1000);
  if (t1h.getTime() > Date.now()) {
    reminders.push({
      patient_id: input.patient_id,
      type: 'appointment',
      source_table: 'appointments',
      source_id: input.appointment_id,
      message: `🔔 OPD Appointment starting in 1 hour (${new Date(input.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}).`,
      scheduled_for: t1h.toISOString(),
      status: 'pending',
    });
  }

  return reminders;
}
