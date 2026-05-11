import { createServiceRoleClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function GET() {
  return await handleSeed();
}

export async function POST() {
  return await handleSeed();
}

async function handleSeed() {
  const supabase = createServiceRoleClient();

  // Check if profiles exist
  const { data: existingProfiles, error: fetchError } = await supabase
    .from('profiles')
    .select('id')
    .limit(1);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (existingProfiles && existingProfiles.length > 0) {
    return NextResponse.json({ message: 'Profiles already exist. Seeding skipped.' });
  }

  const salt = await bcrypt.genSalt(10);
  const adminPinHash = await bcrypt.hash('1234', salt);
  const partnerPinHash = await bcrypt.hash('5678', salt);

  const { error: insertError } = await supabase.from('profiles').insert([
    {
      name: 'Your Name',
      role: 'admin',
      pin_hash: adminPinHash,
      mood_percent: 100,
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    },
    {
      name: 'Partner Name',
      role: 'partner',
      pin_hash: partnerPinHash,
      mood_percent: 100,
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
    },
  ]);

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Seed default wheel items
  const { data: existingWheelItems } = await supabase.from('wheel_items').select('id').limit(1);
  if (!existingWheelItems || existingWheelItems.length === 0) {
    const defaultFood = [
      'Jollibee', 'McDonald\'s', 'Pizza', 'Korean BBQ', 
      'Ramen', 'Shawarma', 'Sushi', 'Sisig', 
      'Pasta', 'Lechon'
    ];
    await supabase.from('wheel_items').insert(
      defaultFood.map(name => ({ name, is_active: true }))
    );
  }

  return NextResponse.json({ success: true, message: 'Seed complete' });
}
