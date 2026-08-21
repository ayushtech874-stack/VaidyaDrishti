import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  try {
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    // Check if user is a doctor or patient
    const { data: doc } = await supabaseAdmin
      .from('doctors')
      .select('id, name')
      .or(`id.eq.${user.id},email.eq.${user.email?.toLowerCase().trim()}`)
      .maybeSingle();

    const { data: pat } = await supabaseAdmin
      .from('patients')
      .select('id, name')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!doc && !pat) {
      return NextResponse.json({ error: 'User profile not found.' }, { status: 404 });
    }

    let query = supabaseAdmin
      .from('conversations')
      .select(`
        id,
        doctor_id,
        patient_id,
        created_at,
        last_message_at,
        doctors (
          id,
          name,
          rmp_registration_number,
          qualifications
        ),
        patients (
          id,
          name,
          phone
        )
      `)
      .order('last_message_at', { ascending: false });

    if (doc) {
      query = query.eq('doctor_id', doc.id);
    } else if (pat) {
      query = query.eq('patient_id', pat.id);
    }

    const { data: conversations, error } = await query;
    if (error) throw error;

    return NextResponse.json({ conversations: conversations || [], user_type: doc ? 'doctor' : 'patient' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error fetching conversations.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { target_doctor_id, target_patient_id } = await request.json();

    // Resolve doctor and patient IDs
    let doctorId = target_doctor_id;
    let patientId = target_patient_id;

    const { data: doc } = await supabaseAdmin
      .from('doctors')
      .select('id')
      .or(`id.eq.${user.id},email.eq.${user.email?.toLowerCase().trim()}`)
      .maybeSingle();

    const { data: pat } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (doc) doctorId = doc.id;
    if (pat) patientId = pat.id;

    if (!doctorId || !patientId) {
      return NextResponse.json({ error: 'Both doctor_id and patient_id are required to open a conversation.' }, { status: 400 });
    }

    // =========================================================================
    // 🛡️ CRITICAL RELATIONSHIP BOUNDARY CHECK (NO SPAM / COLD MESSAGING)
    // Verify at least one intakes row exists linking patient_id and doctor_id/clinic
    // =========================================================================
    const { data: matchingDoctor } = await supabaseAdmin.from('doctors').select('clinic_id').eq('id', doctorId).single();
    
    const { data: relationshipIntakes } = await supabaseAdmin
      .from('intakes')
      .select('id')
      .eq('patient_id', patientId)
      .or(`doctor_id.eq.${doctorId}${matchingDoctor?.clinic_id ? `,clinic_id.eq.${matchingDoctor.clinic_id}` : ''}`)
      .limit(1);

    if (!relationshipIntakes || relationshipIntakes.length === 0) {
      return NextResponse.json(
        {
          error:
            'Messaging Restricted: You may only open a conversation with a practitioner after completing an initial OPD triage consultation.',
        },
        { status: 403 }
      );
    }

    // 2. Fetch or create single unique conversation thread
    const { data: existingConv } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('patient_id', patientId)
      .maybeSingle();

    if (existingConv) {
      return NextResponse.json({ success: true, conversation: existingConv });
    }

    const { data: newConv, error: createErr } = await supabaseAdmin
      .from('conversations')
      .insert([
        {
          doctor_id: doctorId,
          patient_id: patientId,
          created_at: new Date().toISOString(),
          last_message_at: new Date().toISOString(),
        },
      ])
      .select('*')
      .single();

    if (createErr) throw createErr;

    return NextResponse.json({ success: true, conversation: newConv });
  } catch (err: any) {
    console.error('Create Conversation Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create conversation.' }, { status: 500 });
  }
}
