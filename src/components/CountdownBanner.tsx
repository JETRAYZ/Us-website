'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Calendar as CalendarIcon, ChevronRight, Sparkles, Edit2, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Event } from '@/types/database';
import { getCachedProfiles } from '@/lib/profiles-cache';
import BottomSheet from './BottomSheet';

interface CountdownBannerProps {
  activeUser: { userId: string; userName: string; userRole: string };
}

export default function CountdownBanner({ activeUser }: CountdownBannerProps) {
  const [nextEvent, setNextEvent] = useState<Event | null>(null);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'event' | 'dday'>('dday');
  
  // Anniversary Date State (Default: 2024-01-01)
  const [startDate, setStartDate] = useState('2024-01-01');
  const [daysTogether, setDaysTogether] = useState(0);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [tempDate, setTempDate] = useState('2024-01-01');
  const [isSavingDate, setIsSavingDate] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    fetchProfiles();
    fetchNextEvent();
    loadAnniversaryDate();

    // Fallback for real-time (instant UI updates across components)
    const handleLocalEventUpdate = () => fetchNextEvent();
    window.addEventListener('calendar_updated', handleLocalEventUpdate);

    const channel = supabase
      .channel('events-countdown')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        fetchNextEvent();
      })
      .subscribe();

    const timer = setInterval(() => {
      updateDays();
      calculateDaysTogether(startDate);
    }, 60000);

    return () => {
      window.removeEventListener('calendar_updated', handleLocalEventUpdate);
      supabase.removeChannel(channel);
      clearInterval(timer);
    };
  }, [supabase, startDate]);

  const loadAnniversaryDate = async () => {
    // 1. Try local storage first
    try {
      const local = localStorage.getItem('anniversary_date');
      if (local) {
        setStartDate(local);
        setTempDate(local);
        calculateDaysTogether(local);
      } else {
        calculateDaysTogether(startDate);
      }
    } catch (e) {}

    // 2. Fetch from Supabase app_settings if available
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'anniversary')
        .single();
      
      if (data && data.value && data.value.start_date) {
        setStartDate(data.value.start_date);
        setTempDate(data.value.start_date);
        calculateDaysTogether(data.value.start_date);
        localStorage.setItem('anniversary_date', data.value.start_date);
      }
    } catch (e) {
      // Table may not exist yet, fallback to local state
    }
  };

  const calculateDaysTogether = (dateStr: string) => {
    try {
      const start = new Date(dateStr);
      start.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffTime = today.getTime() - start.getTime();
      const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1);
      setDaysTogether(diffDays);
    } catch (e) {
      setDaysTogether(0);
    }
  };

  const handleSaveAnniversary = async () => {
    setIsSavingDate(true);
    try {
      setStartDate(tempDate);
      calculateDaysTogether(tempDate);
      localStorage.setItem('anniversary_date', tempDate);

      // Attempt to save to Supabase
      await supabase.from('app_settings').upsert({
        key: 'anniversary',
        value: { start_date: tempDate, updated_by: activeUser.userId },
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      // Ignore if table not created
    } finally {
      setIsSavingDate(false);
      setIsEditModalOpen(false);
    }
  };

  const fetchProfiles = async () => {
    const data = await getCachedProfiles();
    if (data) setProfiles(data);
  };

  const fetchNextEvent = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('events')
      .select('*')
      .in('type', ['date', 'important'])
      .gte('event_date', today)
      .order('event_date', { ascending: true })
      .limit(5);

    if (data && data.length > 0) {
      const closestDate = data[0].event_date;
      const eventsOnClosestDate = data.filter(e => e.event_date === closestDate);
      const myEvent = eventsOnClosestDate.find(e => e.created_by === activeUser.userId);
      const eventToShow = myEvent || eventsOnClosestDate[0];

      setNextEvent(eventToShow);
      calculateDays(eventToShow.event_date);
    } else {
      setNextEvent(null);
    }
    setIsLoading(false);
  };

  const calculateDays = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(dateStr);
    eventDate.setHours(0, 0, 0, 0);
    const diff = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    setDaysLeft(diff);
  };

  const updateDays = () => {
    if (nextEvent) calculateDays(nextEvent.event_date);
  };

  const scrollToCalendar = () => {
    const el = document.getElementById('calendar-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (isLoading) return <div className="mx-4 h-28 bg-netflix-card rounded-2xl animate-pulse" />;

  const years = Math.floor(daysTogether / 365);
  const remainingDays = daysTogether % 365;
  const months = Math.floor(remainingDays / 30);
  const days = remainingDays % 30;

  return (
    <>
      <motion.section
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mx-4 mt-2"
      >
        <div className="relative overflow-hidden bg-gradient-to-br from-netflix-red via-[#b00710] to-[#70040a] rounded-3xl p-5 shadow-2xl border border-white/10">
          {/* Header Switcher */}
          <div className="flex justify-between items-center mb-3 relative z-10">
            <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
              <button
                onClick={() => setViewMode('dday')}
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full transition-all flex items-center gap-1 ${
                  viewMode === 'dday' ? 'bg-netflix-red text-white shadow-sm' : 'text-white/60 hover:text-white'
                }`}
              >
                <Heart size={12} className="fill-current" /> D-Day
              </button>
              <button
                onClick={() => setViewMode('event')}
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full transition-all flex items-center gap-1 ${
                  viewMode === 'event' ? 'bg-netflix-red text-white shadow-sm' : 'text-white/60 hover:text-white'
                }`}
              >
                <CalendarIcon size={12} /> Next Up
              </button>
            </div>

            {viewMode === 'dday' ? (
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="p-2 bg-black/20 hover:bg-black/40 rounded-full text-white/80 transition-colors"
                title="Edit Anniversary Date"
              >
                <Edit2 size={14} />
              </button>
            ) : (
              <button
                onClick={scrollToCalendar}
                className="flex items-center gap-1 text-[11px] font-bold text-white/80 hover:text-white bg-black/20 px-2.5 py-1 rounded-full"
              >
                Calendar <ChevronRight size={12} />
              </button>
            )}
          </div>

          {/* Watermark Large Number */}
          <AnimatePresence mode="wait">
            <motion.div
              key={viewMode === 'dday' ? daysTogether : (daysLeft ?? '0')}
              initial={{ opacity: 0, scale: 1.2 }}
              animate={{ opacity: 0.18, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute right-[-10px] top-[-5px] text-white font-black text-8xl pointer-events-none select-none tracking-tighter"
            >
              {viewMode === 'dday' ? daysTogether : (daysLeft ?? '0')}
            </motion.div>
          </AnimatePresence>

          {/* Main Card Content */}
          <AnimatePresence mode="wait">
            {viewMode === 'dday' ? (
              <motion.div
                key="dday-view"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="relative z-10 flex flex-col gap-1 cursor-pointer"
                onClick={() => setIsEditModalOpen(true)}
              >
                <div className="flex items-center gap-1.5 text-white/80 text-[10px] font-black tracking-[0.25em] uppercase">
                  <span>TOGETHER FOR</span>
                  <Sparkles size={12} className="text-yellow-300 animate-pulse" />
                </div>
                
                <h2 className="text-white font-black text-2xl tracking-tight leading-none my-1 flex items-baseline gap-2">
                  <span>Day {daysTogether}</span>
                  <span className="text-sm font-semibold text-white/80">days</span>
                </h2>

                <p className="text-white/80 text-xs font-medium">
                  {years > 0 ? `${years} Year${years > 1 ? 's' : ''} ` : ''}
                  {months > 0 ? `${months} Month${months > 1 ? 's' : ''} ` : ''}
                  {days} Day{days !== 1 ? 's' : ''} together ❤️
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="event-view"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onClick={scrollToCalendar}
                className="relative z-10 flex flex-col gap-1 cursor-pointer group"
              >
                <span className="text-white/80 text-[10px] font-black tracking-[0.25em] uppercase">
                  {nextEvent ? 'UPCOMING EVENT' : 'NO UPCOMING PLANS'}
                </span>
                
                <h2 className="text-white font-bold text-lg leading-tight pr-14 group-hover:underline">
                  {nextEvent ? (
                    <>
                      {daysLeft === 0 ? `Today! ${nextEvent.title}` :
                       daysLeft === 1 ? `Tomorrow is ${nextEvent.title}` :
                       `${daysLeft} Days until ${nextEvent.title}`}
                    </>
                  ) : (
                    "No upcoming events — Tap to add one!"
                  )}
                </h2>

                {nextEvent && profiles.find(p => p.id === nextEvent.created_by) && (
                  <p className="text-white/70 text-xs font-medium">
                    Added by {profiles.find(p => p.id === nextEvent.created_by)?.name} • Tap to view calendar
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.section>

      {/* Edit Anniversary Modal */}
      <BottomSheet
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Set Our First Day 💕"
      >
        <div className="flex flex-col gap-5 py-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-netflix-red/10 border-2 border-netflix-red/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <Heart size={32} className="text-netflix-red fill-netflix-red animate-pulse" />
            </div>
            <h3 className="text-foreground font-bold text-base">When did our journey begin?</h3>
            <p className="text-secondary-text text-xs mt-1">
              วันที่พวกเราเริ่มตกลงคบกัน
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-secondary-text uppercase tracking-wider">
              Start Date
            </label>
            <input
              type="date"
              value={tempDate}
              onChange={(e) => setTempDate(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3.5 text-foreground outline-none focus:border-netflix-red text-center font-bold text-lg"
            />
          </div>

          <button
            onClick={handleSaveAnniversary}
            disabled={isSavingDate || !tempDate}
            className="w-full py-4 bg-netflix-red text-white font-bold rounded-2xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl"
          >
            {isSavingDate ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <><Check size={18} /> Save Our Date</>
            )}
          </button>
        </div>
      </BottomSheet>
    </>
  );
}
