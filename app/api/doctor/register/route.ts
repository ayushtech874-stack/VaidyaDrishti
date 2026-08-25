import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      email,
      password,
      phone,
      rmp_registration_number,
      qualifications,
      specialty,
      short_bio,
      clinic_id,
      new_clinic_name,
      new_clinic_address,
      new_clinic_city,
      new_clinic_state,
      license_doc_base64,
      license_doc_filename,
    } = body;

    if (!name || !email || !password || !phone || !rmp_registration_number) {
      return NextResponse.json({ error: 'Missing required registration fields' }, { status: 400 });
    }

    let finalClinicId = clinic_id;
    let createdClinicId: string | null = null;

    // 1. If registering a brand-new clinic sub-flow
    if (new_clinic_name && new_clinic_city) {
      const clinicCode = `CLINIC_${Date.now()}`;
      const { data: newClinic, error: cErr } = await supabase
        .from('clinics')
        .insert([
          {
            name: new_clinic_name,
            code: clinicCode,
            address: new_clinic_address || '',
            city: new_clinic_city,
            state: new_clinic_state || 'Bihar',
            is_verified: false, // SAFEGUARD: Defaults to unverified / dark
            is_live: false,     // SAFEGUARD: Defaults to unverified / dark
          },
        ])
        .select('*')
        .single();

      if (cErr || !newClinic) {
        return NextResponse.json({ error: `Failed to create clinic: ${cErr?.message}` }, { status: 500 });
      }

      finalClinicId = newClinic.id;
      createdClinicId = newClinic.id;
    }

    if (!finalClinicId) {
      return NextResponse.json({ error: 'Please select an existing facility or register a new clinic' }, { status: 400 });
    }

    // 2. Create Supabase Auth User Account
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'doctor', name },
    });

    if (authErr || !authData.user) {
      // Clean up newly created clinic if auth fails
      if (createdClinicId) {
        await supabase.from('clinics').delete().eq('id', createdClinicId);
      }
      return NextResponse.json({ error: `Auth creation failed: ${authErr?.message}` }, { status: 400 });
    }

    const authUserId = authData.user.id;

    // 3. Upload License Document if provided to doctor-verification-docs bucket
    let documentPath: string | null = null;
    if (license_doc_base64 && license_doc_filename) {
      const buffer = Buffer.from(license_doc_base64.split(',')[1] || license_doc_base64, 'base64');
      const filePath = `license-proofs/${authUserId}_${license_doc_filename}`;
      const { error: uploadErr } = await supabase.storage
        .from('doctor-verification-docs')
        .upload(filePath, buffer, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (!uploadErr) {
        documentPath = filePath;
      }
    }

    // 4. CRITICAL HARD REQUIREMENT: Insert doctors row where doctors.id = auth.users.id
    const { data: doctorRow, error: dErr } = await supabase
      .from('doctors')
      .insert([
        {
          id: authUserId, // STRICT EQUALITY: doctors.id = auth.users.id
          name,
          email,
          rmp_registration_number,
          qualifications: qualifications || specialty || 'RMP Medical Practitioner',
          short_bio: short_bio || null,
          clinic_id: finalClinicId,
          registration_status: 'pending', // Pending admin approval
          role: 'doctor',
        },
      ])
      .select('*')
      .single();

    if (dErr || !doctorRow) {
      // Rollback Auth user & created clinic
      await supabase.auth.admin.deleteUser(authUserId);
      if (createdClinicId) {
        await supabase.from('clinics').delete().eq('id', createdClinicId);
      }
      return NextResponse.json({ error: `Doctor record insertion failed: ${dErr?.message}` }, { status: 500 });
    }

    // 5. Audit Log Entry
    await supabase.from('audit_logs').insert([
      {
        doctor_id: authUserId,
        action: 'DOCTOR_SELF_REGISTRATION_SUBMITTED',
        details: `Doctor ${name} (${email}) self-registered. Clinic: ${finalClinicId}. Status: pending. Document: ${documentPath || 'None'}`,
      },
    ]);

    return NextResponse.json({
      success: true,
      message: 'Registration submitted successfully and is pending admin approval.',
      doctorId: authUserId,
      registrationStatus: 'pending',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
