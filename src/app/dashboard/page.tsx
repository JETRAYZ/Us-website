'use client';

import { motion } from 'framer-motion';
import { useActiveUser } from '@/hooks/useActiveUser';
import Navbar from '@/components/Navbar';
import LocketSnap from '@/components/LocketSnap';
import MoodMusic from '@/components/MoodMusic';
import PostIt from '@/components/PostIt';

import CountdownBanner from '@/components/CountdownBanner';
import Calendar from '@/components/Calendar';
import FoodWheel from '@/components/FoodWheel';
import Watchlist from '@/components/Watchlist';
import TimeCapsule from '@/components/TimeCapsule';
import MonthlyRecap from '@/components/MonthlyRecap';
import NotificationManager from '@/components/NotificationManager';
import { LogOut, Heart } from 'lucide-react';

export default function DashboardPage() {
  const { user, loading } = useActiveUser();

  if (loading || !user) {
    return (
      <div className="app-container flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-netflix-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleLogout = () => {
    localStorage.removeItem('activeUser');
    document.cookie = 'userId=; path=/; max-age=0';
    window.location.href = '/';
  };

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="app-container pt-14 flex flex-col gap-2 relative pb-12"
    >
      <Navbar activeUser={user} />
      <NotificationManager userId={user.userId} />
      
      <CountdownBanner activeUser={user} />
      
      <LocketSnap userId={user.userId} />
      
      <MoodMusic activeUser={user} />
      
      <PostIt userId={user.userId} />

      <Calendar userId={user.userId} />

      <Watchlist userId={user.userId} />

      <TimeCapsule userId={user.userId} />

      <MonthlyRecap />

      {/* Footer */}
      <footer className="mt-12 py-10 border-t border-white/5 flex flex-col items-center gap-4">
        <div className="flex flex-col items-center gap-1">
          <p className="text-secondary-text text-[10px] font-black tracking-[0.2em] uppercase flex items-center justify-center gap-1.5">
            Made with <Heart size={10} className="text-netflix-red fill-netflix-red" />
          </p>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#2ecc71] animate-pulse" />
            <span className="text-secondary-text text-[10px] font-medium">
              {user.userName} is logged in
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-[10px] text-netflix-red font-bold uppercase tracking-widest hover:underline"
          >
            <LogOut size={12} /> Switch Profile
          </button>
        </div>
      </footer>

      <FoodWheel />
    </motion.main>
  );
}

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="p-8 rounded-2xl bg-netflix-card/30 border border-white/5 flex flex-col items-center justify-center gap-2">
      <span className="text-[#b3b3b3] text-[10px] font-black tracking-[0.3em] uppercase">
        {title}
      </span>
      <span className="text-secondary-text/30 text-[10px] font-medium italic">
        COMING SOON
      </span>
    </div>
  );
}
