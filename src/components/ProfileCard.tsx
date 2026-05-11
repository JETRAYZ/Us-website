'use client';

import { motion } from 'framer-motion';
import { Profile } from '@/types/database';

interface ProfileCardProps {
  profile: Profile;
  onClick: (profile: Profile) => void;
  index: number;
}

export default function ProfileCard({ profile, onClick, index }: ProfileCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: index * 0.2, duration: 0.5 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="flex flex-col items-center cursor-pointer group"
      onClick={() => onClick(profile)}
    >
      <div className="relative">
        <div className="w-[120px] h-[120px] rounded-full overflow-hidden border-2 border-transparent transition-all duration-300 group-hover:shadow-[0_0_0_4px_#E50914] group-hover:border-white">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-netflix-card flex items-center justify-center text-secondary-text">
              ?
            </div>
          )}
        </div>
      </div>
      <span className="mt-3 text-foreground text-lg font-medium group-hover:text-netflix-red transition-colors">
        {profile.name}
      </span>
    </motion.div>
  );
}
