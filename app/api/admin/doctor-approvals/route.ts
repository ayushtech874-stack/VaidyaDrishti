// ==============================================================================
// 🛡️ HARD ADMIN-PATIENT-DATA ISOLATION GUARANTEE
// This route must never return patient-identifiable data — admin access is
// strictly limited to facility/doctor management and aggregate metrics only.
// ==============================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    const { data: pendingDoctors, error } = await supabase
      .from('doctors')
      .select('*, clinics(id, name, city, state, is_verified, is_live)')
      .eq('registration_status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Attach signed URLs for uploaded license proofs if bucket files exist
    const enrichedDoctors = await Promise.all(
      (pendingDoctors || []).map(async (doc) => {
        const filePath = `license-proofs/${doc.id}_rmp_license.pdf`;
        const { data: signedData } = await supabase.storage
          .from('doctor-verification-docs')
          .createSignedUrl(filePath, 3600);

        return {
          ...doc,
          licenseDocUrl: signedData?.signedUrl || null,
        };
      })
    );

    return NextResponse.json({ success: true, pendingDoctors: enrichedDoctors });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { doctor_id, action, rejection_reason } = body;

    if (!doctor_id || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid parameters for doctor approval action' }, { status: 400 });
    }

    // Fetch doctor record & associated clinic
    const { data: doctor, error: fetchErr } = await supabase
      .from('doctors')
      .select('id, name, email, clinic_id, clinics(id, name, is_verified, is_live)')
      .eq('id', doctor_id)
      .single();

    if (fetchErr || !doctor) {
      return NextResponse.json({ error: 'Doctor application not found' }, { status: 404 });
    }

    if (action === 'approve') {
      // 1. Set doctor registration_status = approved
      const { error: dErr } = await supabase
        .from('doctors')
        .update({ registration_status: 'approved', rejection_reason: null })
        .eq('id', doctor_id);

      if (dErr) {
        return NextResponse.json({ error: `Failed to approve doctor: ${dErr.message}` }, { status: 500 });
      }

      // 2. UNIFIED SAFEGUARD: If doctor's associated clinic is unverified, activate clinic simultaneously
      if (doctor.clinic_id) {
        await supabase
          .from('clinics')
          .update({ is_verified: true, is_live: true })
          .eq('id', doctor.clinic_id);
      }

      // 3. Audit Log
      await supabase.from('audit_logs').insert([
        {
          doctor_id,
          action: 'DOCTOR_REGISTRATION_APPROVED',
          details: `Admin approved doctor ${doctor.name} (${doctor.email}) and activated associated clinic ${doctor.clinic_id}`,
        },
      ]);

      return NextResponse.json({
        success: true,
        message: `Doctor ${doctor.name} approved successfully and associated clinic activated.`,
      });
    } else {
      // Reject action
      const reason = rejection_reason || 'Application rejected by administration.';
      const { error: dErr } = await supabase
        .from('doctors')
        .update({ registration_status: 'rejected', rejection_reason: reason })
        .eq('id', doctor_id);

      if (dErr) {
        return NextResponse.json({ error: `Failed to reject doctor: ${dErr.message}` }, { status: 500 });
      }

      // Note: Clinic remains is_live = false / dark if it was a new clinic

      // Audit Log
      await supabase.from('audit_logs').insert([
        {
          doctor_id,
          action: 'DOCTOR_REGISTRATION_REJECTED',
          details: `Admin rejected doctor ${doctor.name} (${doctor.email}). Reason: ${reason}`,
        },
      ]);

      return NextResponse.json({
        success: true,
        message: `Doctor ${doctor.name} rejected successfully.`,
      });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
