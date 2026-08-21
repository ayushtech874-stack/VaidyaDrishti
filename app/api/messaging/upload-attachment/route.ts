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

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const conversationId = formData.get('conversation_id') as string | null;

    if (!file || !conversationId) {
      return NextResponse.json({ error: 'File and conversation_id are required.' }, { status: 400 });
    }

    // Validate file type and size
    if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
      return NextResponse.json({ error: 'Invalid file type. Only PDF, JPG, and PNG files are allowed.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const sanitizeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `conv_${conversationId}/${Date.now()}_${sanitizeFileName}`;

    // Upload to private bucket message-attachments
    const { error: uploadErr } = await supabaseAdmin.storage
      .from('message-attachments')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadErr) throw uploadErr;

    return NextResponse.json({
      success: true,
      attachment_url: filePath,
      file_name: file.name,
    });
  } catch (err: any) {
    console.error('Upload Message Attachment Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to upload attachment.' }, { status: 500 });
  }
}
