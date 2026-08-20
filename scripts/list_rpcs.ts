import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function listRpcs() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
      },
    });

    const openapi = await res.json();
    console.log('Available PostgREST paths:');
    const paths = Object.keys(openapi.paths || {}).filter(p => p.startsWith('/rpc/'));
    console.log(paths);
  } catch (e: any) {
    console.error('Error fetching OpenAPI schema:', e.message);
  }
}

listRpcs();
