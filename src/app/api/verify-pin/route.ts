import { createServiceRoleClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { profileId, pin } = await req.json();

    if (!profileId || !pin) {
      return NextResponse.json({ error: 'Missing profileId or pin' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, name, role, pin_hash')
      .eq('id', profileId)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const isMatch = await bcrypt.compare(pin, profile.pin_hash);

    if (!isMatch) {
      return NextResponse.json({ success: false, error: 'Incorrect PIN' });
    }

    // Success
    return NextResponse.json({
      success: true,
      user: {
        userId: profile.id,
        userName: profile.name,
        userRole: profile.role,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
