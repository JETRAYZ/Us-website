'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { Event } from '@/types/database';

interface CountdownBannerProps {
  activeUser: { userId: string; userName: string; userRole: string };
}

export default function CountdownBanner({ activeUser }: CountdownBannerProps) {
  const [nextEvent, setNextEvent] = useState<Event | null>(null);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchProfiles();
    fetchNextEvent();

    // Fallback for real-time (instant UI updates across components)
    const handleLocalEventUpdate = () => fetchNextEvent();
    window.addEventListener('calendar_updated', handleLocalEventUpdate);

    const channel = supabase
      .channel('events-countdown')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        fetchNextEvent();
      })
      .subscribe();

    const timer = setInterval(updateDays, 60000);

    return () => {
      window.removeEventListener('calendar_updated', handleLocalEventUpdate);
      supabase.removeChannel(channel);
      clearInterval(timer);
    };
  }, [supabase]);

  const fetchProfiles = async () => {
    const { data } = await supabase.from('profiles').select('id, name');
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

  if (isLoading) return <div className="mx-4 h-24 bg-netflix-card rounded-2xl animate-pulse" />;

  return (
    <motion.section
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="mx-4 mt-2"
    >
      <div className="relative overflow-hidden bg-gradient-to-r from-netflix-red to-[#b00710] rounded-2xl p-4 shadow-lg">
        {/* Watermark Number */}
        <AnimatePresence mode="wait">
          {daysLeft !== null && (
            <motion.div
              key={daysLeft}
              initial={{ opacity: 0, scale: 1.2 }}
              animate={{ opacity: 0.2, scale: 1 }}
              className="absolute right-[-10px] top-[-10px] text-foreground font-black text-8xl pointer-events-none select-none"
            >
              {daysLeft}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative z-10 flex flex-col gap-1">
          <span className="text-foreground/70 text-[10px] font-black tracking-[0.3em] uppercase">
            {nextEvent ? 'NEXT UP' : 'NO PLANS'}
          </span>
          
          <h2 className="text-foreground font-bold text-lg leading-tight pr-16">
            {nextEvent ? (
              <>
                {daysLeft === 0 ? `Today is the day! ${nextEvent.title}` :
                 daysLeft === 1 ? `Tomorrow is ${nextEvent.title}` :
                 `${daysLeft} Days until ${nextEvent.title}`}
                {profiles.find(p => p.id === nextEvent.created_by) && (
                  <span className="text-secondary-text text-xs font-medium block mt-1">
                    Created by {profiles.find(p => p.id === nextEvent.created_by)?.name}
                  </span>
                )}
              </>
            ) : (
              "No upcoming plans — add something!"
            )}
          </h2>


        </div>
      </div>
    </motion.section>
  );
}
