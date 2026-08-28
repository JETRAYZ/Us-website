import { createServiceRoleClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, role, avatar_url, mood_percent, music_url, updated_at')
      .order('role', { ascending: true });

    if (error) {
      console.error('[/api/profiles] Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ profiles: data ?? [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[/api/profiles] Caught exception:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
