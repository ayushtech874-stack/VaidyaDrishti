import { NextResponse } from 'next/server';
import { resolveDoctorForFacility } from '@/lib/routing/doctorResolver';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get('clinic_id');
    const category = searchParams.get('category') || undefined;

    if (!clinicId) {
      return NextResponse.json({ error: 'clinic_id parameter is required.' }, { status: 400 });
    }

    const doctorResult = await resolveDoctorForFacility({ clinicId, problemCategory: category });

    return NextResponse.json({ success: true, doctor: doctorResult });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to resolve doctor.' }, { status: 500 });
  }
}
