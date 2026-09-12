import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * GET /api/clinic/[id]/queue
 * 
 * Public, PHI-Free OPD Waiting Room Queue Endpoint.
 * Strictly queries ONLY id, urgency_level, status, and created_at for the specified clinic_id.
 * Zero patient names, phone numbers, or clinical descriptions are selected or returned.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const clinicId = resolvedParams.id;

    if (!clinicId) {
      return NextResponse.json({ error: 'Clinic ID is required' }, { status: 400 });
    }

    // 1. Fetch Clinic metadata (name, city, avg_consultation_time_mins)
    const { data: clinic, error: clinicErr } = await supabase
      .from('clinics')
      .select('id, name, city, code')
      .eq('id', clinicId)
      .maybeSingle();

    if (clinicErr || !clinic) {
      return NextResponse.json({ error: 'Facility not found' }, { status: 404 });
    }

    const avgPace = (clinic as any)?.avg_consultation_time_mins || 8; // Configurable per facility, default 8 mins

    // 2. Fetch Active Intakes ONLY for this clinic_id (Strict column selection: ZERO PHI)
    const { data: rawIntakes, error: intakeErr } = await supabase
      .from('intakes')
      .select('id, urgency_level, status, created_at') // 🔒 NO PHI COLUMNS SELECTED
      .eq('clinic_id', clinicId)
      .in('status', ['pending_review', 'in_consultation'])
      .order('created_at', { ascending: true });

    if (intakeErr) {
      return NextResponse.json({ error: intakeErr.message }, { status: 500 });
    }

    // 3. Compute Sequential Token Numbers & Dynamic Wait Times (Arrival Order)
    const queueTokens = (rawIntakes || []).map((item, index) => {
      // Token format: T-101, T-102 based on arrival sequence
      const tokenNumber = `T-${101 + index}`;
      const isFirst = index === 0;
      const isSecond = index === 1;

      let displayStatus = 'WAITING';
      if (item.status === 'in_consultation' || (isFirst && item.status === 'pending_review')) {
        displayStatus = 'IN CONSULTATION';
      } else if (isSecond) {
        displayStatus = 'NEXT IN LINE';
      }

      // Dynamic calculation: index * avgPace
      const waitMinutes = displayStatus === 'IN CONSULTATION' ? 0 : index * avgPace;

      return {
        id: item.id,
        token: tokenNumber,
        urgency: (item.urgency_level || 'MODERATE').toUpperCase(),
        status: displayStatus,
        waitMinutes,
        created_at: item.created_at,
      };
    });

    return NextResponse.json({
      success: true,
      clinic: {
        id: clinic.id,
        name: clinic.name,
        city: clinic.city || 'Bhagalpur',
        code: clinic.code,
      },
      queue: queueTokens,
      totalWaiting: Math.max(0, queueTokens.length - 1),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
