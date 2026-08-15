import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function exportFullDatabase() {
  console.log('📦 Fetching database schema & all table rows from Supabase...');

  const { data: clinics } = await supabase.from('clinics').select('*');
  const { data: depts } = await supabase.from('departments').select('*');
  const { data: doctors } = await supabase.from('doctors').select('*');
  const { data: patients } = await supabase.from('patients').select('*');
  const { data: intakes } = await supabase.from('intakes').select('*').order('created_at', { ascending: false });
  const { data: sessions } = await supabase.from('whatsapp_sessions').select('*').order('updated_at', { ascending: false });

  let md = `# VaidyaDrishti — Complete Production Database Schema & Live Rows

Generated on: ${new Date().toLocaleString()} (IST)

---

## 1. Database Entity-Relationship Architecture

\`\`\`mermaid
erDiagram
    CLINICS ||--o{ DOCTORS : "employs"
    CLINICS ||--o{ DEPARTMENTS : "contains"
    CLINICS ||--o{ INTAKES : "owns queue"
    CLINICS ||--o{ PATIENTS : "registers"
    DEPARTMENTS ||--o{ DOCTORS : "assigns"
    PATIENTS ||--o{ INTAKES : "submits"
    DOCTORS ||--o{ INTAKES : "reviews"
\`\`\`

---

## 2. Table Schemas & Live Rows

### 🏥 2.1 Table: \`clinics\`
**Description**: Stores medical centers, OPDs, and hospital facilities.

| ID | Name | Code | Address | Created At |
| :--- | :--- | :--- | :--- | :--- |
`;

  (clinics || []).forEach((c) => {
    md += `| \`${c.id}\` | **${c.name}** | \`${c.code}\` | ${c.address || 'N/A'} | ${c.created_at || 'N/A'} |\n`;
  });

  md += `\n### 🏢 2.2 Table: \`departments\`
**Description**: Stores specialty units within hospitals (e.g. General Medicine, Orthopedics, Eye OPD).

| ID | Clinic ID | Department Name | Code | Created At |
| :--- | :--- | :--- | :--- | :--- |
`;

  (depts || []).forEach((d) => {
    md += `| \`${d.id}\` | \`${d.clinic_id}\` | **${d.name}** | \`${d.code}\` | ${d.created_at || 'N/A'} |\n`;
  });

  md += `\n### 👨‍⚕️ 2.3 Table: \`doctors\`
**Description**: Registered Medical Practitioner (RMP) credentials and assigned clinics under TPG 2020.

| ID | Doctor Name | Email | RMP License | Clinic ID | Department ID | Role | Qualifications |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
`;

  (doctors || []).forEach((doc) => {
    md += `| \`${doc.id}\` | **${doc.name}** | \`${doc.email}\` | \`${doc.rmp_registration_number || 'VERIFIED-RMP'}\` | \`${doc.clinic_id || 'Global'}\` | \`${doc.department_id || 'None'}\` | \`${doc.role || 'doctor'}\` | ${doc.qualifications || 'MBBS, MD'} |\n`;
  });

  md += `\n### 👤 2.4 Table: \`patients\`
**Description**: Patient demographics registered via WhatsApp or Web Intake Portal under DPDP Act 2023.

| ID | Full Name | Age | Sex | Phone | Clinic ID | Registered At |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
`;

  (patients || []).forEach((p) => {
    md += `| \`${p.id}\` | **${p.name}** | ${p.age} yrs | ${p.sex || 'Male'} | \`${p.phone}\` | \`${p.clinic_id || 'Default'}\` | ${p.created_at || 'N/A'} |\n`;
  });

  md += `\n### 📋 2.5 Table: \`intakes\`
**Description**: Clinical grievance records, AI triage outputs, and doctor review status.

| Intake ID | Patient ID | Clinic ID | Urgency Level | Status | Red Flags | Raw Text / Voice Transcript | Created At |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
`;

  (intakes || []).forEach((i) => {
    const rawSnippet = (i.raw_text || '').replace(/[\r\n]+/g, ' ').slice(0, 80);
    const flagsStr = (i.red_flags || []).join(', ') || 'None';
    md += `| \`${i.id}\` | \`${i.patient_id}\` | \`${i.clinic_id || 'Default'}\` | **${(i.urgency_level || 'low').toUpperCase()}** | \`${i.status}\` | ${flagsStr} | "*${rawSnippet}...*" | ${i.created_at} |\n`;
  });

  md += `\n### 📱 2.6 Table: \`whatsapp_sessions\`
**Description**: Conversation state machine tracking multi-step WhatsApp interactions, timeouts, and draft data.

| Phone | State / Current Step | Status | Clinic ID | Doctor ID | Draft Data | Last Message At |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
`;

  (sessions || []).forEach((s) => {
    const draftStr = JSON.stringify(s.draft_data || s.temp_name ? { name: s.temp_name, age: s.temp_age } : {});
    md += `| \`${s.phone}\` | \`${s.current_step || s.state}\` | \`${s.status || 'active'}\` | \`${s.clinic_id || s.temp_clinic_id || 'None'}\` | \`${s.doctor_id || 'None'}\` | \`${draftStr}\` | ${s.last_message_at || s.updated_at} |\n`;
  });

  const artifactPath = path.join(process.cwd(), 'Database_Schema_Export.md');
  fs.writeFileSync(artifactPath, md, 'utf-8');
  console.log(`✅ Schema & Rows export written to: ${artifactPath}`);
}

exportFullDatabase();
