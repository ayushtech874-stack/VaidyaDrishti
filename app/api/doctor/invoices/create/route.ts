import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const serverSupabase = await createServerClient();
    const {
      data: { user },
    } = await serverSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Doctor login required.' }, { status: 401 });
    }

    const body = await req.json();
    const { patient_id, clinic_id, amount, consultation_type, payment_status, notes } = body;

    if (!patient_id || !amount) {
      return NextResponse.json({ error: 'patient_id and amount are required.' }, { status: 400 });
    }

    // 1. Fetch Doctor record to confirm doctor ID
    const { data: doctor } = await supabaseAdmin
      .from('doctors')
      .select('id, clinic_id, name')
      .eq('id', user.id)
      .single();

    if (!doctor) {
      return NextResponse.json({ error: 'Only registered doctors can issue invoices.' }, { status: 403 });
    }

    const finalClinicId = clinic_id || doctor.clinic_id || '00000000-0000-0000-0000-000000000001';
    const invoiceNum = `INV-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 2. Insert Invoice Row
    const { data: invoice, error: invErr } = await supabaseAdmin
      .from('invoices')
      .insert([
        {
          patient_id,
          doctor_id: doctor.id, // Strictly scoped to issuing doctor
          clinic_id: finalClinicId,
          invoice_number: invoiceNum,
          amount: parseFloat(amount),
          currency: 'INR',
          consultation_type: consultation_type || 'teleconsultation',
          payment_status: payment_status || 'unpaid',
          notes: notes || null,
        },
      ])
      .select('*')
      .single();

    if (invErr || !invoice) {
      return NextResponse.json({ error: `Failed to issue invoice: ${invErr?.message}` }, { status: 500 });
    }

    // 3. Audit Log Entry
    await supabaseAdmin.from('audit_logs').insert([
      {
        doctor_id: doctor.id,
        patient_id,
        action: 'INVOICE_ISSUED',
        details: `Doctor ${doctor.name} issued invoice ${invoiceNum} (₹${amount}) to patient ${patient_id}.`,
      },
    ]);

    return NextResponse.json({
      success: true,
      message: `Invoice ${invoiceNum} issued successfully.`,
      invoice,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
