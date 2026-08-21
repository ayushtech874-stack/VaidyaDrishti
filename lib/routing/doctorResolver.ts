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

  // 2. Fetch Doctors associated with facility
  const { data: doctors, error: docErr } = await supabaseAdmin
    .from('doctors')
    .select('id, name, clinic_id, department_id')
    .eq('clinic_id', clinicId);

  if (docErr || !doctors || doctors.length === 0) {
    throw new Error(`No empaneled doctors available at ${clinic.name}.`);
  }

  const isHospital = clinic.code?.toUpperCase().includes('HOSP') || doctors.length > 1;
  const facilityType = isHospital ? 'hospital' : 'clinic';

  // CASE A: Clinic (Private Practice / Single Facility)
  if (!isHospital || doctors.length === 1) {
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

  // CASE B: Hospital with multiple departments / categories
  if (problemCategory) {
    const categoryLower = problemCategory.toLowerCase().trim();

    // Try matching doctor by department category or name
    const matchedDoctor = doctors.find((d: any) => {
      const deptName = (d.name || '').toLowerCase();
      return deptName.includes(categoryLower);
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

  // Fallback: Use first empaneled doctor
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
