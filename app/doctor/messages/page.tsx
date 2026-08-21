'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function DoctorMessagesPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConv, setActiveConv] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newText, setNewText] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [isLoadingConvs, setIsLoadingConvs] = useState(true);
  const [isLoadingMsgs, setIsLoadingMsgs] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // 1. Load doctor's conversations
  useEffect(() => {
    async function loadConversations() {
      setIsLoadingConvs(true);
      try {
        const res = await fetch('/api/messaging/conversations');
        const data = await res.json();
        if (res.ok && data.conversations) {
          setConversations(data.conversations);
          if (data.conversations.length > 0) {
            setActiveConv(data.conversations[0]);
          }
        }
      } catch (err) {
        console.error('Error loading conversations:', err);
      } finally {
        setIsLoadingConvs(false);
      }
    }
    loadConversations();
  }, []);

  // 2. Load messages for active conversation & subscribe to Realtime updates
  useEffect(() => {
    if (!activeConv?.id) return;

    async function loadMessages() {
      setIsLoadingMsgs(true);
      try {
        const res = await fetch(`/api/messaging/messages?conversation_id=${activeConv.id}`);
        const data = await res.json();
        if (res.ok && data.messages) {
          setMessages(data.messages);
        }
      } catch (err) {
        console.error('Error loading messages:', err);
      } finally {
        setIsLoadingMsgs(false);
      }
    }

    loadMessages();

    // Realtime Live Subscription for incoming messages
    const channel = supabase
      .channel(`conv_${activeConv.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConv.id}`,
        },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConv?.id, supabase]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending a message
  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if ((!newText.trim() && !attachmentFile) || !activeConv?.id) return;

    setIsSending(true);
    setErrorMsg('');

    try {
      let attachmentUrl = '';
      if (attachmentFile) {
        const formData = new FormData();
        formData.append('file', attachmentFile);
        formData.append('conversation_id', activeConv.id);

        const upRes = await fetch('/api/messaging/upload-attachment', {
          method: 'POST',
          body: formData,
        });
        const upData = await upRes.json();
        if (!upRes.ok) throw new Error(upData.error || 'Failed to upload attachment.');
        attachmentUrl = upData.attachment_url;
      }

      const res = await fetch('/api/messaging/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: activeConv.id,
          content: newText,
          attachment_url: attachmentUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send message.');

      setMessages((prev) => [...prev, data.message]);
      setNewText('');
      setAttachmentFile(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error sending message.');
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-cream)] text-[var(--color-ink)] flex flex-col">
      {/* Header */}
      <header className="bg-[var(--color-navy)] text-white py-4 px-6 shadow-md border-b border-[var(--color-border-on-navy)]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/doctor/dashboard"
              className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-3 py-1.5 rounded-lg border border-white/20 transition"
            >
              ← Back to OPD Queue
            </Link>
            <h1 className="text-xl font-extrabold text-white">💬 RMP Doctor Tele-Consultation Messaging</h1>
          </div>
          <span className="text-xs bg-[var(--color-blue)] text-white px-3 py-1 rounded-full font-bold">
            Realtime Clinical Thread Active
          </span>
        </div>
      </header>

      {/* Main Messaging Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
        {/* Left Panel: Conversations List */}
        <div className="card-surface p-4 flex flex-col space-y-3 h-[calc(100vh-140px)]">
          <h2 className="text-sm font-extrabold text-[var(--color-navy)] uppercase tracking-wider border-b border-[var(--color-border)] pb-2 flex items-center justify-between">
            <span>Conversations ({conversations.length})</span>
          </h2>

          {isLoadingConvs ? (
            <p className="text-xs text-[var(--color-ink-muted)] italic text-center py-6">Loading conversations...</p>
          ) : conversations.length === 0 ? (
            <p className="text-xs text-[var(--color-ink-muted)] italic text-center py-6">
              No active patient message threads. Conversations are created when a patient initiates contact following an OPD intake.
            </p>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 divide-y divide-[var(--color-border)]">
              {conversations.map((conv) => {
                const isSelected = activeConv?.id === conv.id;
                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConv(conv)}
                    className={`w-full text-left p-3 rounded-xl transition flex flex-col space-y-1 ${
                      isSelected
                        ? 'bg-[var(--color-navy)] text-white shadow-sm'
                        : 'hover:bg-[var(--color-blue-soft)] text-[var(--color-ink)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs truncate">
                        👤 {conv.patients?.name || 'Patient'}
                      </span>
                      <span className={`text-[10px] ${isSelected ? 'text-[var(--color-blue-soft)]' : 'text-[var(--color-ink-muted)]'}`}>
                        {new Date(conv.last_message_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <span className={`text-[11px] font-data ${isSelected ? 'text-[var(--color-blue-soft)]' : 'text-[var(--color-ink-muted)]'}`}>
                      {conv.patients?.phone}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Panel: Chat Thread */}
        <div className="md:col-span-2 card-surface p-4 flex flex-col h-[calc(100vh-140px)] justify-between">
          {activeConv ? (
            <>
              {/* Thread Header */}
              <div className="border-b border-[var(--color-border)] pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-[var(--color-navy)]">
                    Patient: {activeConv.patients?.name || 'Patient'}
                  </h2>
                  <p className="text-xs text-[var(--color-ink-muted)] font-data">
                    Phone: {activeConv.patients?.phone}
                  </p>
                </div>

                <Link
                  href={`/doctor/dashboard`}
                  className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1"
                >
                  📋 View Patient OPD History
                </Link>
              </div>

              {/* Messages Feed */}
              <div className="flex-1 overflow-y-auto my-4 space-y-3 pr-2">
                {isLoadingMsgs ? (
                  <p className="text-xs text-[var(--color-ink-muted)] italic text-center py-6">Loading messages...</p>
                ) : messages.length === 0 ? (
                  <p className="text-xs text-[var(--color-ink-muted)] italic text-center py-6">
                    No messages in this thread yet. Send a message to start clinical consultation.
                  </p>
                ) : (
                  messages.map((msg) => {
                    const isDoctor = msg.sender_type === 'doctor';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isDoctor ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl p-3 text-xs space-y-1 ${
                            isDoctor
                              ? 'bg-[var(--color-navy)] text-white rounded-br-none'
                              : 'bg-[var(--color-cream)] text-[var(--color-ink)] border border-[var(--color-border)] rounded-bl-none'
                          }`}
                        >
                          <span className={`text-[10px] font-bold block ${isDoctor ? 'text-[var(--color-blue-soft)]' : 'text-[var(--color-navy)]'}`}>
                            {isDoctor ? '👨‍⚕️ You (Doctor)' : `👤 ${activeConv.patients?.name || 'Patient'}`}
                          </span>
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                          {msg.attachment_url && (
                            <div className="pt-1">
                              <span className="inline-block text-[10px] font-bold underline text-[var(--color-blue)] bg-white p-1 rounded">
                                📎 Attachment: {msg.attachment_url.split('_').pop()}
                              </span>
                            </div>
                          )}
                          <span className={`text-[9px] block text-right ${isDoctor ? 'text-[var(--color-blue-soft)]' : 'text-[var(--color-ink-muted)]'}`}>
                            {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Box */}
              <form onSubmit={handleSendMessage} className="pt-3 border-t border-[var(--color-border)] space-y-2">
                {errorMsg && (
                  <div className="bg-red-50 border border-red-200 text-red-800 p-2 rounded-xl text-xs font-semibold">
                    {errorMsg}
                  </div>
                )}

                {attachmentFile && (
                  <div className="bg-[var(--color-blue-soft)] p-2 rounded-xl border border-[var(--color-blue)]/20 text-xs flex items-center justify-between">
                    <span>📎 Selected Attachment: <strong>{attachmentFile.name}</strong></span>
                    <button
                      type="button"
                      onClick={() => setAttachmentFile(null)}
                      className="text-red-600 font-bold hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <label className="btn-secondary text-xs py-3 px-3 cursor-pointer shrink-0">
                    📎
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                    />
                  </label>

                  <input
                    type="text"
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    placeholder="Type clinical consultation message..."
                    className="flex-1 bg-[var(--color-cream)] border border-[var(--color-border)] rounded-xl p-3 text-xs focus:outline-none focus:border-[var(--color-blue)]"
                  />

                  <button
                    type="submit"
                    disabled={isSending || (!newText.trim() && !attachmentFile)}
                    className="btn-primary py-3 px-5 text-xs font-bold shrink-0 disabled:opacity-50"
                  >
                    {isSending ? 'Sending...' : 'Send Message →'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-2 text-[var(--color-ink-muted)]">
              <span className="text-4xl">💬</span>
              <p className="text-sm font-bold text-[var(--color-navy)]">Select a conversation thread on the left</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
