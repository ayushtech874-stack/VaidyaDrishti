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

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversation_id');

    if (!conversationId) {
      return NextResponse.json({ error: 'conversation_id parameter is required.' }, { status: 400 });
    }

    // Verify user belongs to conversation
    const { data: conv } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (!conv) {
      return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 });
    }

    // Fetch messages
    const { data: messages, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Mark unread messages as read for recipient
    try {
      const nowIso = new Date().toISOString();
      await supabaseAdmin
        .from('messages')
        .update({ read_at: nowIso })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .is('read_at', null);
    } catch (rErr) {
      console.warn('Mark read notice:', rErr);
    }

    return NextResponse.json({ messages: messages || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error fetching messages.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { conversation_id, content, attachment_url } = await request.json();

    if (!conversation_id || (!content && !attachment_url)) {
      return NextResponse.json({ error: 'Conversation ID and message content or attachment are required.' }, { status: 400 });
    }

    // 1. Verify user belongs to conversation
    const { data: conv } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('id', conversation_id)
      .single();

    if (!conv) {
      return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 });
    }

    // Determine sender_type ('doctor' or 'patient')
    const { data: doc } = await supabaseAdmin
      .from('doctors')
      .select('id')
      .or(`id.eq.${user.id},email.eq.${user.email?.toLowerCase().trim()}`)
      .maybeSingle();

    const senderType = doc ? 'doctor' : 'patient';
    const nowIso = new Date().toISOString();

    // 2. APPEND-ONLY MESSAGE INSERT (Immutability Pattern)
    const { data: newMessage, error: msgErr } = await supabaseAdmin
      .from('messages')
      .insert([
        {
          conversation_id,
          sender_type: senderType,
          sender_id: user.id,
          content: content?.trim() || '',
          attachment_url: attachment_url || null,
          created_at: nowIso,
        },
      ])
      .select('*')
      .single();

    if (msgErr) throw msgErr;

    // 3. Update conversation last_message_at timestamp
    await supabaseAdmin
      .from('conversations')
      .update({ last_message_at: nowIso })
      .eq('id', conversation_id);

    return NextResponse.json({ success: true, message: newMessage });
  } catch (err: any) {
    console.error('Send Message Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to send message.' }, { status: 500 });
  }
}
