import { Client } from 'pg';
import dotenv from 'dotenv';
import dns from 'dns/promises';

dotenv.config({ path: '.env.local' });

async function findPgPooler() {
  const ref = 'apxnfifddrcrtctnfwun';
  const regions = [
    'ap-south-1',
    'ap-southeast-1',
    'us-east-1',
    'us-west-1',
    'eu-central-1',
    'eu-west-1',
    'sa-east-1'
  ];

  for (const reg of regions) {
    const host = `aws-0-${reg}.pooler.supabase.com`;
    try {
      await dns.lookup(host);
      console.log(`Resolved pooler host: ${host}`);
    } catch {
      // not found
    }
  }
}

findPgPooler();
