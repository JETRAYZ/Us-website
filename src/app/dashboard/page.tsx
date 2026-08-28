'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { useActiveUser } from '@/hooks/useActiveUser';
import Navbar from '@/components/Navbar';
import LocketSnap from '@/components/LocketSnap';
import MoodMusic from '@/components/MoodMusic';
import PostIt from '@/components/PostIt';
import CountdownBanner from '@/components/CountdownBanner';
import NotificationManager from '@/components/NotificationManager';
import { LogOut, Heart, Sparkles, Camera, MessageSquareHeart, Compass } from 'lucide-react';

// Heavy components loaded lazily — not in the initial bundle
const Calendar = dynamic(() => import('@/components/Calendar'), { ssr: false });
const Watchlist = dynamic(() => import('@/components/Watchlist'), { ssr: false });
const TimeCapsule = dynamic(() => import('@/components/TimeCapsule'), { ssr: false });
const MonthlyRecap = dynamic(() => import('@/components/MonthlyRecap'), { ssr: false });
const FoodWheel = dynamic(() => import('@/components/FoodWheel'), { ssr: false });

type DashboardTab = 'memories' | 'plans' | 'vibes';

export default function DashboardPage() {
  const { user, loading } = useActiveUser();
  const [activeTab, setActiveTab] = useState<DashboardTab>('memories');

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

  const tabs: { id: DashboardTab; label: string; icon: any }[] = [
    { id: 'memories', label: 'Memories', icon: Camera },
    { id: 'plans', label: 'Notes & Plans', icon: MessageSquareHeart },
    { id: 'vibes', label: 'Fun & Vibes', icon: Compass },
  ];

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="app-container pt-14 flex flex-col gap-2 relative pb-16"
    >
      <Navbar activeUser={user} />
      <NotificationManager userId={user.userId} />

      {/* D-Day & Next Event Banner (Always visible) */}
      <CountdownBanner activeUser={user} />

      {/* Category Quick Filter Tabs */}
      <div className="px-4 mt-2 mb-1">
        <div className="flex gap-1.5 p-1 bg-black/40 backdrop-blur-md rounded-2xl border border-white/5 overflow-x-auto hide-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center justify-center gap-1.5 relative ${
                  isActive ? 'text-white' : 'text-secondary-text hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabBadge"
                    className="absolute inset-0 bg-netflix-red rounded-xl shadow-md shadow-netflix-red/30"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5 text-[11px]">
                  <Icon size={13} />
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content Sections (Keep Alive: Preserves snaps, inputs, and prevents re-fetching) */}
      <div className="flex flex-col gap-2">
        {/* MEMORIES TAB */}
        <div className={activeTab === 'memories' ? 'flex flex-col gap-2' : 'hidden'}>
          <LocketSnap userId={user.userId} />
          <TimeCapsule userId={user.userId} />
          <MonthlyRecap />
        </div>

        {/* PLANS & NOTES TAB */}
        <div className={activeTab === 'plans' ? 'flex flex-col gap-2' : 'hidden'}>
          <PostIt userId={user.userId} />
          <Calendar userId={user.userId} />
          <Watchlist userId={user.userId} />
        </div>

        {/* VIBES & FUN TAB */}
        <div className={activeTab === 'vibes' ? 'flex flex-col gap-2' : 'hidden'}>
          <MoodMusic activeUser={user} />
        </div>
      </div>

      {/* Food Wheel Floating Button (Always available) */}
      <FoodWheel />

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
    </motion.main>
  );
}
