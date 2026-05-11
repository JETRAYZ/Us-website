import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ulhlgrvwdxtpmhajsidf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsaGxncnZ3ZHh0cG1oYWpzaWRmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQyMTM4MSwiZXhwIjoyMDkzOTk3MzgxfQ.Z9vszP7Rsbk3CzFSyUbJPm0Z9xDAf3BeUZ_vkMG4-TM';
const supabase = createClient(supabaseUrl, supabaseKey);

async function clear() {
  console.log('Cleaning up simulated April memories...');
  
  // Delete snaps from April 2026
  const { error } = await supabase
    .from('snaps')
    .delete()
    .gte('created_at', '2026-04-01T00:00:00Z')
    .lte('created_at', '2026-04-30T23:59:59Z');
  
  if (error) {
    console.error('Error clearing:', error);
  } else {
    console.log('Successfully cleared all April mock data!');
  }
}

clear();
