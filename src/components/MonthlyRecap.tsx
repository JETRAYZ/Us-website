'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Film, Play, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Snap } from '@/types/database';
import RecapSlideshow from './RecapSlideshow';

export default function MonthlyRecap() {
  const [snaps, setSnaps] = useState<Snap[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [prevMonthName, setPrevMonthName] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [availableMonths, setAvailableMonths] = useState<Date[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Generate last 12 months
    const months = [];
    const now = new Date();
    for (let i = 1; i <= 12; i++) {
      months.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
    }
    setAvailableMonths(months);
  }, []);

  useEffect(() => {
    fetchMonthSnaps();
  }, [selectedDate]);

  const fetchMonthSnaps = async () => {
    setIsLoading(true);
    const firstDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).toISOString();
    const lastDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59).toISOString();
    
    setPrevMonthName(selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));

    const { data } = await supabase
      .from('snaps')
      .select('*, profiles(name, avatar_url)')
      .gte('created_at', firstDay)
      .lte('created_at', lastDay)
      .order('created_at', { ascending: true });

    if (data) setSnaps(data as any);
    setIsLoading(false);
  };

  const now = new Date();
  const lastDayOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
  const isLocked = now < lastDayOfMonth;

  return (
    <section className="px-4 mt-6">
        {/* Simplified Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-foreground font-bold text-lg flex items-center gap-2">Monthly Recap <Film size={20} /></h2>
          <div className="px-3 py-1 bg-netflix-red/20 rounded-full border border-netflix-red/30">
             <span className="text-netflix-red text-[10px] font-black uppercase tracking-widest">{selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
          </div>
        </div>

      <button
        onClick={() => !isLocked && snaps.length > 0 && setIsOpen(true)}
        disabled={isLoading || snaps.length === 0 || isLocked}
        className={`w-full mt-4 relative overflow-hidden rounded-2xl p-6 flex flex-col items-center justify-center gap-2 shadow-2xl transition-all active:scale-[0.98] ${
          snaps.length > 0 && !isLocked
            ? 'bg-gradient-to-br from-netflix-red to-netflix-red/80 border border-white/20' 
            : 'bg-netflix-card border border-white/5 opacity-50'
        }`}
      >
        {isLocked ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-1">
              <Film size={24} className="text-white/40" />
            </div>
            <span className="text-foreground/40 font-bold text-sm uppercase tracking-widest italic">
              Locked until {lastDayOfMonth.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        ) : (
          <>
            <Film size={36} className="text-white mb-2" />
            <div className="flex items-center gap-2">
              <span className="text-foreground font-black text-xl tracking-tight">Relive {selectedDate.toLocaleDateString('en-US', { month: 'long' })}</span>
              <Play size={20} className="fill-white text-foreground" />
            </div>
            <p className="text-foreground/70 text-xs font-bold uppercase tracking-widest">
              {snaps.length > 0 ? `${snaps.length} memories captured` : `No memories from ${prevMonthName} yet`}
            </p>
          </>
        )}

        {snaps.length > 0 && !isLocked && (
          <motion.div 
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent w-1/2 rotate-12 pointer-events-none"
          />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <RecapSlideshow 
            snaps={snaps} 
            monthName={prevMonthName} 
            onClose={() => {
              setIsOpen(false);
              fetchMonthSnaps(); // Refresh just in case things were deleted
            }} 
          />
        )}
      </AnimatePresence>
    </section>
  );
}
