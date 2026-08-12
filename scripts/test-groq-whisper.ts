import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function testModels() {
  const models = ['whisper-large-v3-turbo', 'whisper-large-v3', 'distil-whisper-large-v3-en'];

  console.log('Testing Groq Whisper model availability...');

  for (const model of models) {
    try {
      console.log(`Testing model: ${model}...`);
      // Create a 1-second dummy audio buffer (WAV header + 0s audio)
      const header = Buffer.from([
        0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45,
        0x66, 0x6d, 0x74, 0x20, 0x10, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
        0x44, 0xac, 0x00, 0x00, 0x88, 0x58, 0x01, 0x00, 0x02, 0x00, 0x10, 0x00,
        0x64, 0x61, 0x74, 0x61, 0x00, 0x00, 0x00, 0x00
      ]);

      const file = new File([new Uint8Array(header)], 'test.wav', { type: 'audio/wav' });

      const res = await groq.audio.transcriptions.create({
        file,
        model,
        response_format: 'json',
      });
      console.log(`✅ Success for model [${model}]:`, res.text);
      break;
    } catch (err: any) {
      console.error(`❌ Model [${model}] failed:`, err?.message || err);
    }
  }
}

testModels();
