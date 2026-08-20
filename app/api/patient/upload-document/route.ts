import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: Request) {
  try {
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!patient) {
      return NextResponse.json({ error: 'Patient profile not found. Please complete phone verification.' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    // 1. Client & Server File Validation
    if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
      return NextResponse.json(
        { error: 'Invalid file format. Only PDF, JPG, and PNG documents are allowed.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds maximum limit of 10MB.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const sanitizeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `patient_${patient.id}/${Date.now()}_${sanitizeFileName}`;

    // 2. Upload to Private Storage Bucket patient-documents
    const { error: uploadErr } = await supabaseAdmin.storage
      .from('patient-documents')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadErr) throw uploadErr;

    // 3. Log metadata in patient_documents table
    const { data: docRecord, error: dbErr } = await supabaseAdmin
      .from('patient_documents')
      .insert([
        {
          patient_id: patient.id,
          file_path: filePath,
          file_name: file.name,
          file_type: file.type,
          uploaded_at: new Date().toISOString(),
        },
      ])
      .select('*')
      .single();

    if (dbErr) throw dbErr;

    return NextResponse.json({
      success: true,
      message: 'Document uploaded successfully!',
      document: docRecord,
    });
  } catch (err: any) {
    console.error('Upload Document Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to upload document.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { doc_id } = await request.json();
    if (!doc_id) {
      return NextResponse.json({ error: 'Document ID required.' }, { status: 400 });
    }

    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!patient) {
      return NextResponse.json({ error: 'Patient profile not found.' }, { status: 404 });
    }

    // Verify ownership
    const { data: doc } = await supabaseAdmin
      .from('patient_documents')
      .select('*')
      .eq('id', doc_id)
      .eq('patient_id', patient.id)
      .single();

    if (!doc) {
      return NextResponse.json({ error: 'Document not found or access denied.' }, { status: 404 });
    }

    // Delete from storage and database
    await supabaseAdmin.storage.from('patient-documents').remove([doc.file_path]);
    await supabaseAdmin.from('patient_documents').delete().eq('id', doc_id);

    return NextResponse.json({ success: true, message: 'Document deleted successfully.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete document.' }, { status: 500 });
  }
}
