import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ulhlgrvwdxtpmhajsidf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsaGxncnZ3ZHh0cG1oYWpzaWRmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQyMTM4MSwiZXhwIjoyMDkzOTk3MzgxfQ.Z9vszP7Rsbk3CzFSyUbJPm0Z9xDAf3BeUZ_vkMG4-TM';
const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('Seeding April memories...');
  
  const { data: profiles } = await supabase.from('profiles').select('id');
  if (!profiles || profiles.length === 0) {
    console.error('No profiles found');
    return;
  }
  
  const user1 = profiles[0].id;
  const user2 = profiles[1]?.id || user1;

  const memories = [
    {
      user_id: user1,
      image_url: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=1000',
      caption: 'Our first date in April! ❤️',
      created_at: '2026-04-05T12:00:00Z'
    },
    {
      user_id: user2,
      image_url: 'https://images.unsplash.com/photo-1522673607200-164883e7559f?q=80&w=1000',
      caption: 'The sunset was so beautiful today 🌅',
      created_at: '2026-04-12T18:30:00Z'
    },
    {
      user_id: user1,
      image_url: 'https://images.unsplash.com/photo-1516589174184-c685265e4873?q=80&w=1000',
      caption: 'Dinner at our favorite place 🍕',
      created_at: '2026-04-20T20:00:00Z'
    },
    {
      user_id: user2,
      image_url: 'https://images.unsplash.com/photo-1494972308805-463bc619d34e?q=80&w=1000',
      caption: 'Just us being happy 💑',
      created_at: '2026-04-28T15:00:00Z'
    }
  ];

  const { error } = await supabase.from('snaps').insert(memories);
  
  if (error) {
    console.error('Error seeding:', error);
  } else {
    console.log('Successfully seeded 4 memories for April!');
  }
}

seed();
