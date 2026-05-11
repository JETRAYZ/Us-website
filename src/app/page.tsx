'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types/database';
import ProfileCard from '@/components/ProfileCard';
import PinModal from '@/components/PinModal';
import { Lock } from 'lucide-react';

export default function ProfileLockScreen() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const res = await fetch('/api/profiles');
      const data = await res.json();

      if (data.error) throw new Error(data.error);
      if (data.profiles) setProfiles(data.profiles);
    } catch (err) {
      console.error('Error fetching profiles:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileClick = (profile: Profile) => {
    setSelectedProfile(profile);
    setIsModalOpen(true);
  };

  const handleLoginSuccess = (userData: any) => {
    localStorage.setItem('activeUser', JSON.stringify(userData));
    // Also set a cookie for server-side auth if needed
    document.cookie = `userId=${userData.userId}; path=/; max-age=86400`;

    if (userData.userRole === 'admin') {
      localStorage.setItem('theme', 'sweet-pink');
      document.documentElement.setAttribute('data-theme', 'sweet-pink');
    } else {
      localStorage.setItem('theme', 'classic');
      document.documentElement.setAttribute('data-theme', 'classic');
    }

    router.push('/dashboard');
  };

  return (
    <main className="app-container flex flex-col items-center justify-center p-6">
      <header className="absolute top-12 flex flex-col items-center">
        <h1 className="text-netflix-red text-2xl font-bold tracking-tighter flex items-center gap-2">US <Lock size={20} strokeWidth={3} /></h1>
      </header>

      <div className="w-full max-w-sm text-center">
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-foreground text-3xl font-bold mb-12"
        >
          Who&apos;s watching?
        </motion.h2>

        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="w-10 h-10 border-4 border-netflix-red border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex justify-center gap-8 md:gap-12 flex-wrap">
            {profiles.map((profile, index) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                index={index}
                onClick={handleProfileClick}
              />
            ))}
          </div>
        )}
      </div>

      <footer className="absolute bottom-12">
        <p className="text-secondary-text text-sm font-light tracking-wide uppercase">
          Private access only
        </p>
      </footer>

      <PinModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        profile={selectedProfile}
        onSuccess={handleLoginSuccess}
      />
    </main>
  );
}
