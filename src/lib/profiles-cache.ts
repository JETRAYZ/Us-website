import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types/database';

let memoryProfiles: Profile[] | null = null;
let fetchPromise: Promise<Profile[]> | null = null;

/**
 * Get profiles with instant in-memory & localStorage caching.
 * Resolves in 0ms if already loaded once.
 */
export async function getCachedProfiles(forceRefresh = false): Promise<Profile[]> {
  if (!forceRefresh && memoryProfiles && memoryProfiles.length > 0) {
    return memoryProfiles;
  }

  // Check localStorage for instant cold start
  if (!forceRefresh && typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('cached_profiles');
      if (stored) {
        memoryProfiles = JSON.parse(stored);
        if (memoryProfiles && memoryProfiles.length > 0) {
          // Trigger background refresh
          refreshProfilesInBackground();
          return memoryProfiles;
        }
      }
    } catch (e) {}
  }

  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, role, avatar_url, mood_percent, music_url, updated_at')
        .order('role', { ascending: true });

      if (!error && data) {
        memoryProfiles = data as Profile[];
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('cached_profiles', JSON.stringify(data));
          } catch (e) {}
        }
        return data as Profile[];
      }
      return memoryProfiles || [];
    } catch (err) {
      console.error('[ProfilesCache] Fetch error:', err);
      return memoryProfiles || [];
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

async function refreshProfilesInBackground() {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, role, avatar_url, mood_percent, music_url, updated_at')
      .order('role', { ascending: true });

    if (!error && data) {
      memoryProfiles = data as Profile[];
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('cached_profiles', JSON.stringify(data));
        } catch (e) {}
      }
    }
  } catch (e) {}
}

export function updateCachedProfile(updatedProfile: Partial<Profile> & { id: string }) {
  if (memoryProfiles) {
    memoryProfiles = memoryProfiles.map((p) =>
      p.id === updatedProfile.id ? { ...p, ...updatedProfile } : p
    );
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('cached_profiles', JSON.stringify(memoryProfiles));
      } catch (e) {}
    }
  }
}
