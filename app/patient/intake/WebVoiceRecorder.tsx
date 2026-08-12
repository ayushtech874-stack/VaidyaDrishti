'use client';

import { useState, useRef, useEffect } from 'react';

interface WebVoiceRecorderProps {
  onTranscriptionComplete: (text: string, audioBlob?: Blob) => void;
}

export default function WebVoiceRecorder({ onTranscriptionComplete }: WebVoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check for SpeechRecognition in browser for live visual feedback
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'hi-IN';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          setLiveTranscript(transcript);
        }
      };

      recognitionRef.current = recognition;
    }
  }, []);

  async function startRecording() {
    try {
      setLiveTranscript('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        // Send audio to Groq Whisper Large v3 ASR (same engine as WhatsApp)
        await transcribeWithGroqWhisper(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);

      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {
          // ignore if unavailable
        }
      }
    } catch (err) {
      alert('Microphone access denied or not supported by browser.');
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }

      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
  }

  async function transcribeWithGroqWhisper(blob: Blob) {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('file', blob, 'recording.webm');

      const res = await fetch('/api/transcribe-voice', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      const whisperText = data.text || data.transcribed_text || liveTranscript.trim() || '[Voice recording attached - Sent to doctor for review]';
      onTranscriptionComplete(whisperText, blob);
    } catch (err) {
      console.warn('Groq Whisper fallback to local audio attachment:', err);
      const fallbackText = liveTranscript.trim() || '[Voice recording attached - Sent to doctor for review]';
      onTranscriptionComplete(fallbackText, blob);
    } finally {
      setIsTranscribing(false);
    }
  }

  return (
    <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
          🎙️ Speak Your Symptoms (Voice Recording)
        </span>
        {isRecording && (
          <span className="text-xs font-bold text-red-600 animate-pulse flex items-center gap-1">
            🔴 Recording Audio...
          </span>
        )}
        {isTranscribing && (
          <span className="text-xs font-bold text-purple-700 animate-pulse flex items-center gap-1">
            ⏳ Processing Groq Whisper ASR...
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {!isRecording ? (
          <button
            type="button"
            onClick={startRecording}
            disabled={isTranscribing}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition shadow-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            🎤 Start Voice Recording
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition shadow-sm flex items-center gap-1.5 animate-pulse"
          >
            ⏹️ Stop & Transcribe with Groq Whisper
          </button>
        )}

        {isRecording && liveTranscript && (
          <span className="text-xs text-purple-800 font-semibold italic bg-purple-100 px-2.5 py-1 rounded-md">
            Live Preview: "{liveTranscript}"
          </span>
        )}
      </div>

      {audioUrl && (
        <div className="space-y-1 mt-2">
          <span className="text-xs text-purple-900 font-semibold block">
            ✅ Voice note recorded and attached for doctor:
          </span>
          <audio controls src={audioUrl} className="w-full h-8">
            Your browser does not support the audio element.
          </audio>
        </div>
      )}
    </div>
  );
}
