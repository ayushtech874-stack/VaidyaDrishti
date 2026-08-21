import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://apxnfifddrcrtctnfwun.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
  return createClient(url, key);
}

export interface ResolveDoctorInput {
  clinicId: string;
  problemCategory?: string;
}

export interface ResolveDoctorResult {
  clinicId: string;
  departmentId: string | null;
  doctorId: string;
  doctorName: string;
  facilityType: string;
  facilityName: string;
  resolutionSource: 'direct_clinic' | 'department_match' | 'general_triage_fallback';
}

const CATEGORY_MAP: Record<string, string[]> = {
  'heart/chest/breathing': ['cardio', 'chest', 'pulmo', 'cardiology'],
  'bones/joints/injury': ['ortho', 'bones', 'joints', 'orthopedics'],
  'fever/cold/general': ['general', 'medicine', 'fever', 'genmed'],
  'general medicine': ['general', 'medicine', 'genmed'],
  'pediatrics': ['pedia', 'child', 'pediatrics'],
};

/**
 * Shared facility & doctor resolution logic for WhatsApp webhook & Patient Dashboard.
 */
export async function resolveDoctorForFacility(input: ResolveDoctorInput): Promise<ResolveDoctorResult> {
  const { clinicId, problemCategory } = input;
  const supabaseAdmin = getAdminClient();

  // 1. Fetch Facility Details
  const { data: clinic, error: clinicErr } = await supabaseAdmin
    .from('clinics')
    .select('id, name, code')
    .eq('id', clinicId)
    .maybeSingle();

  if (clinicErr || !clinic) {
    throw new Error(`Consulting facility not found (ID: ${clinicId}).`);
  }

  // 2. Fetch Doctors associated with facility & their department info
  const { data: doctors, error: docErr } = await supabaseAdmin
    .from('doctors')
    .select('id, name, clinic_id, department_id, departments(id, name, code)')
    .eq('clinic_id', clinicId);

  if (docErr || !doctors || doctors.length === 0) {
    throw new Error(`No empaneled doctors available at ${clinic.name}.`);
  }

  const isHospital = (clinic.code || '').toUpperCase().includes('HOSP') || clinic.name.toLowerCase().includes('hospital');
  const facilityType = isHospital ? 'hospital' : 'clinic';

  // CASE A: Pure Private Clinic (Non-Hospital with single doctor)
  if (!isHospital && doctors.length === 1) {
    const doc = doctors[0];
    return {
      clinicId: clinic.id,
      departmentId: doc.department_id || null,
      doctorId: doc.id,
      doctorName: doc.name,
      facilityType,
      facilityName: clinic.name,
      resolutionSource: 'direct_clinic',
    };
  }

  // CASE B: Hospital with Department Routing
  if (problemCategory) {
    const catLower = problemCategory.toLowerCase().trim();
    const keywords = CATEGORY_MAP[catLower] || [catLower];

    const matchedDoctor = doctors.find((d: any) => {
      const deptName = (d.departments?.name || '').toLowerCase();
      const deptCode = (d.departments?.code || '').toLowerCase();
      return keywords.some((kw) => deptName.includes(kw) || deptCode.includes(kw) || kw.includes(deptName));
    });

    if (matchedDoctor) {
      return {
        clinicId: clinic.id,
        departmentId: matchedDoctor.department_id || null,
        doctorId: matchedDoctor.id,
        doctorName: matchedDoctor.name,
        facilityType,
        facilityName: clinic.name,
        resolutionSource: 'department_match',
      };
    }
  }

  // Fallback: General Triage Fallback for Hospital
  const fallbackDoc = doctors[0];
  return {
    clinicId: clinic.id,
    departmentId: fallbackDoc.department_id || null,
    doctorId: fallbackDoc.id,
    doctorName: fallbackDoc.name,
    facilityType,
    facilityName: clinic.name,
    resolutionSource: 'general_triage_fallback',
  };
}
