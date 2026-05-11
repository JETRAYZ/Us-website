'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, LockOpen, Plus, Trash2, Clock, Box } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { TimeCapsule as TimeCapsuleType } from '@/types/database';
import AddCapsuleModal from './AddCapsuleModal';

interface TimeCapsuleProps {
  userId: string;
}

export default function TimeCapsule({ userId }: TimeCapsuleProps) {
  const [capsules, setCapsules] = useState<TimeCapsuleType[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const supabase = createClient();

  useEffect(() => {
    fetchCapsules();

    const channel = supabase
      .channel('capsules-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'time_capsules' }, () => {
        fetchCapsules();
      })
      .subscribe();

    const timer = setInterval(() => setNow(new Date()), 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(timer);
    };
  }, [supabase]);

  const fetchCapsules = async () => {
    const { data } = await supabase
      .from('time_capsules')
      .select('*, profiles(name)')
      .order('unlock_date', { ascending: true });
    if (data) setCapsules(data as any);
  };

  const getAuthorName = (capsule: any) => {
    return capsule.profiles?.name || 'Unknown';
  };

  const getTimeRemaining = (unlockDate: string) => {
    const target = new Date(unlockDate);
    const diff = target.getTime() - now.getTime();
    
    if (diff <= 0) return null;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `Opens in ${days}d ${hours}h`;
    if (hours > 0) return `Opens in ${hours}h ${minutes}m`;
    return `Opening soon!`;
  };

  const handleDelete = async (capsule: TimeCapsuleType) => {
    const { error } = await supabase.from('time_capsules').delete().eq('id', capsule.id);
    if (!error) {
      if (capsule.image_url) {
        const path = capsule.image_url.split('/time-capsules/')[1];
        if (path) await supabase.storage.from('time-capsules').remove([path]);
      }
      fetchCapsules();
    }
  };

  return (
    <section className="w-full">
      <div className="flex items-center justify-between px-4 pt-6 pb-3">
        <h2 className="text-foreground font-bold text-lg flex items-center gap-2">Time Capsules <Box size={20} /></h2>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="w-8 h-8 rounded-full bg-netflix-red flex items-center justify-center text-white active:scale-90 transition-all shadow-lg"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="flex flex-col gap-4 px-4 pb-4">
        {capsules.length > 0 ? (
          capsules.map((capsule) => {
            const isUnlocked = new Date(capsule.unlock_date).getTime() <= now.getTime();
            const timeRemaining = getTimeRemaining(capsule.unlock_date);
            const isUrgent = timeRemaining?.includes('soon') || (timeRemaining?.includes('h') && !timeRemaining?.includes('d'));

            return (
              <motion.div
                key={capsule.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative rounded-2xl p-4 overflow-hidden border border-foreground/5 shadow-xl transition-all ${
                  isUnlocked 
                    ? 'bg-gradient-to-br from-netflix-card to-netflix-red/10' 
                    : 'bg-netflix-card/80 backdrop-blur-sm'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <div className="flex items-center gap-2">
                    {isUnlocked ? (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#2ecc71]/20 rounded-full">
                        <LockOpen size={12} className="text-[#2ecc71]" />
                        <span className="text-[10px] font-black text-[#2ecc71] uppercase">Open</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-netflix-red/20 rounded-full">
                        <Lock size={12} className="text-netflix-red" />
                        <span className="text-[10px] font-black text-netflix-red uppercase">Sealed</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-secondary-text font-bold uppercase tracking-wider">
                    From {getAuthorName(capsule)}
                  </span>
                </div>

                {/* Content Area */}
                <div className="relative rounded-xl overflow-hidden mb-3">
                  {!isUnlocked && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/10 backdrop-blur-md">
                       <Lock size={24} className="text-foreground/40 mb-2" />
                       <span className="text-foreground/60 text-[10px] font-black uppercase tracking-widest">Unlocks in...</span>
                    </div>
                  )}

                  <div className={isUnlocked ? "" : "blur-sm"}>
                    {capsule.image_url && (
                      <img src={capsule.image_url} className="w-full h-40 object-cover rounded-xl" />
                    )}
                    {capsule.content_text && (
                      <p className={`text-foreground text-sm leading-relaxed ${capsule.image_url ? 'mt-3' : 'py-2 px-1'}`}>
                        {capsule.content_text}
                      </p>
                    )}
                  </div>

                  {isUnlocked && (
                     <motion.div 
                        initial={{ x: '-100%' }}
                        animate={{ x: '200%' }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent w-1/2 rotate-12"
                     />
                  )}
                </div>

                {/* Footer Info */}
                <div className="flex justify-between items-end relative z-10">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-secondary-text">
                      {isUnlocked ? 'Opened on' : 'Unlocks'} {new Date(capsule.unlock_date).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {!isUnlocked && (
                    <div className={`flex items-center gap-1.5 font-bold text-xs ${isUrgent ? 'text-netflix-red animate-pulse' : 'text-secondary-text'}`}>
                      <Clock size={12} />
                      {timeRemaining}
                    </div>
                  )}

                  {capsule.author_id === userId && (
                    <button 
                      onClick={() => handleDelete(capsule)}
                      className="p-1.5 text-secondary-text/30 hover:text-netflix-red transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="w-full py-12 flex flex-col items-center justify-center text-secondary-text/40 italic">
            <p className="text-sm flex items-center justify-center gap-2">No capsules yet — seal a memory! <Box size={16} /></p>
          </div>
        )}
      </div>

      <AddCapsuleModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        userId={userId}
        onAdded={fetchCapsules}
      />
    </section>
  );
}
