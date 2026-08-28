'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Film, Play, ChevronLeft, ChevronRight, Calendar, Sparkles, Image as ImageIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Snap } from '@/types/database';
import RecapSlideshow from './RecapSlideshow';

export default function MonthlyRecap() {
  const [snaps, setSnaps] = useState<Snap[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [availableMonths, setAvailableMonths] = useState<Date[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    // Generate Current Month + Past 12 Months
    const months: Date[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      months.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
    }
    setAvailableMonths(months);
  }, []);

  useEffect(() => {
    fetchMonthSnaps();
  }, [selectedDate]);

  const fetchMonthSnaps = async () => {
    setIsLoading(true);
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1).toISOString();
    const lastDay = new Date(year, month + 1, 0, 23, 59, 59, 999).toISOString();

    const { data } = await supabase
      .from('snaps')
      .select('*, profiles(name, avatar_url)')
      .gte('created_at', firstDay)
      .lte('created_at', lastDay)
      .order('created_at', { ascending: true });

    if (data) setSnaps(data as any);
    else setSnaps([]);
    setIsLoading(false);
  };

  const monthFormatted = selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const monthShort = selectedDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  const changeMonthIndex = (direction: number) => {
    const currentIndex = availableMonths.findIndex(
      (m) => m.getFullYear() === selectedDate.getFullYear() && m.getMonth() === selectedDate.getMonth()
    );
    if (currentIndex === -1) return;
    const nextIndex = currentIndex - direction; // direction: -1 is older, +1 is newer
    if (nextIndex >= 0 && nextIndex < availableMonths.length) {
      setSelectedDate(availableMonths[nextIndex]);
    }
  };

  const currentMonthIndex = availableMonths.findIndex(
    (m) => m.getFullYear() === selectedDate.getFullYear() && m.getMonth() === selectedDate.getMonth()
  );

  const canGoNewer = currentMonthIndex > 0;
  const canGoOlder = currentMonthIndex < availableMonths.length - 1;

  return (
    <section className="px-4 mt-6">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-foreground font-bold text-lg flex items-center gap-2">
          Monthly Recap <Film size={20} className="text-netflix-red" />
        </h2>
        
        {/* Month Stepper Buttons */}
        <div className="flex items-center gap-1 bg-black/40 border border-white/5 rounded-full p-1">
          <button
            onClick={() => changeMonthIndex(-1)}
            disabled={!canGoOlder}
            className="w-7 h-7 flex items-center justify-center rounded-full text-secondary-text hover:text-white disabled:opacity-30 disabled:pointer-events-none active:scale-90 transition-all"
            title="Previous Month"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-[11px] font-bold text-foreground px-2 whitespace-nowrap">
            {monthShort}
          </span>
          <button
            onClick={() => changeMonthIndex(1)}
            disabled={!canGoNewer}
            className="w-7 h-7 flex items-center justify-center rounded-full text-secondary-text hover:text-white disabled:opacity-30 disabled:pointer-events-none active:scale-90 transition-all"
            title="Next Month"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Month Selector Horizontal Scroll Pills */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-3 snap-x">
        {availableMonths.map((m) => {
          const isSelected =
            m.getFullYear() === selectedDate.getFullYear() &&
            m.getMonth() === selectedDate.getMonth();
          const isCurrent =
            m.getFullYear() === new Date().getFullYear() &&
            m.getMonth() === new Date().getMonth();

          return (
            <button
              key={m.toISOString()}
              onClick={() => setSelectedDate(m)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap snap-start transition-all border flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-netflix-red text-white border-netflix-red shadow-lg shadow-netflix-red/30 scale-105'
                  : 'bg-black/30 border-white/5 text-secondary-text hover:text-white'
              }`}
            >
              {isCurrent && <Sparkles size={11} className={isSelected ? 'text-yellow-300' : 'text-netflix-red'} />}
              <span>{m.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}</span>
            </button>
          );
        })}
      </div>

      {/* Main Interactive Recap Banner Card */}
      <div
        className={`w-full relative overflow-hidden rounded-3xl p-6 flex flex-col items-center justify-center gap-3 shadow-2xl transition-all border ${
          snaps.length > 0
            ? 'bg-gradient-to-br from-netflix-red via-[#9e050e] to-[#600208] border-white/20'
            : 'bg-netflix-card border-white/5'
        }`}
      >
        {isLoading ? (
          <div className="py-8 flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-3 border-netflix-red border-t-transparent rounded-full animate-spin" />
            <span className="text-secondary-text text-xs">Loading memories...</span>
          </div>
        ) : snaps.length > 0 ? (
          <>
            {/* Thumbnail Preview Mosaic if snaps exist */}
            <div className="flex items-center justify-center gap-2 mb-1">
              {snaps.slice(0, 3).map((snap, i) => (
                <div
                  key={snap.id}
                  className={`w-14 h-18 rounded-xl overflow-hidden border-2 border-white/30 shadow-lg -rotate-${
                    i === 0 ? '6' : i === 1 ? '0' : '6'
                  } transform ${i === 1 ? 'scale-110 z-10' : 'opacity-80'}`}
                >
                  <img src={snap.image_url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>

            <div className="text-center relative z-10">
              <h3 className="text-white font-black text-2xl tracking-tight leading-tight flex items-center justify-center gap-2">
                <span>Relive {monthFormatted}</span>
                <Play size={20} className="fill-white text-white" />
              </h3>
              <p className="text-white/80 text-xs font-bold uppercase tracking-widest mt-1">
                {snaps.length} memory{snaps.length > 1 ? 's' : ''} captured together 📸
              </p>
            </div>

            <button
              onClick={() => setIsOpen(true)}
              className="mt-2 px-6 py-3 bg-white text-black font-bold text-sm rounded-full shadow-2xl active:scale-95 hover:bg-white/95 transition-all flex items-center gap-2"
            >
              <Play size={16} className="fill-black" />
              Watch Story Recap
            </button>

            {/* Shimmer overlay */}
            <motion.div
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent w-1/2 rotate-12 pointer-events-none"
            />
          </>
        ) : (
          <div className="py-6 flex flex-col items-center gap-2 text-center">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-1 text-secondary-text">
              <ImageIcon size={24} />
            </div>
            <h4 className="text-foreground font-bold text-base">No Memories in {monthFormatted}</h4>
            <p className="text-secondary-text text-xs max-w-xs">
              ยังไม่มีรูปภาพที่บันทึกไว้ในเดือนนี้ ลองกดเลือกดูเดือนอื่นๆ ด้านบนได้เลยครับ
            </p>
          </div>
        )}
      </div>

      {/* Story Mode Slideshow Overlay */}
      <AnimatePresence>
        {isOpen && (
          <RecapSlideshow
            snaps={snaps}
            monthName={monthFormatted}
            onClose={() => {
              setIsOpen(false);
              fetchMonthSnaps();
            }}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
