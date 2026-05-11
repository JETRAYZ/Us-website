'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Utensils, X, RotateCcw, Settings, Check, Dices, PartyPopper, Pencil } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { WheelItem } from '@/types/database';
import WheelEditModal from './WheelEditModal';

export default function FoodWheel() {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<WheelItem[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<WheelItem | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0);
  const supabase = createClient();

  const activeItems = items.filter(i => i.is_active);

  useEffect(() => {
    fetchItems();

    const channel = supabase
      .channel('wheel-items-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wheel_items' }, () => {
        fetchItems();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  useEffect(() => {
    if (isOpen && activeItems.length > 0) {
      drawWheel();
    }
  }, [isOpen, items]);

  const fetchItems = async () => {
    const { data } = await supabase.from('wheel_items').select('*').order('created_at', { ascending: true });
    if (data) setItems(data);
  };

  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = canvas.width / 2 - 10;
    const sliceAngle = (2 * Math.PI) / activeItems.length;
    const colors = ['#E50914', '#b00710', '#1f1f1f', '#2a2a2a', '#333333', '#444444'];

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotationRef.current);

    activeItems.forEach((item, i) => {
      const angle = i * sliceAngle;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, angle, angle + sliceAngle);
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';

      // Text
      ctx.save();
      ctx.rotate(angle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = 'white';
      ctx.font = 'bold 12px Inter';
      ctx.fillText(item.name.substring(0, 12), radius - 15, 5);
      ctx.restore();
    });

    // Center hole
    ctx.beginPath();
    ctx.arc(0, 0, 40, 0, 2 * Math.PI);
    ctx.fillStyle = '#141414';
    ctx.fill();
    ctx.restore();
  };

  const spin = () => {
    if (isSpinning || activeItems.length < 2) return;
    setIsSpinning(true);
    setWinner(null);

    const spinDuration = 4000;
    const startRotation = rotationRef.current;
    const randomRotation = (Math.random() * 2 * Math.PI) + (Math.PI * 10); // 5+ rotations
    const targetRotation = startRotation + randomRotation;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / spinDuration, 1);
      
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      rotationRef.current = startRotation + (randomRotation * ease);
      
      drawWheel();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        // Calculate winner
        const normalizedRotation = rotationRef.current % (2 * Math.PI);
        const sliceAngle = (2 * Math.PI) / activeItems.length;
        // The pointer is at the top (3π/2 in standard canvas coords, or 0 if we adjust)
        // Adjust for pointer at top
        const pointerAngle = (3 * Math.PI) / 2;
        let resultAngle = (pointerAngle - normalizedRotation) % (2 * Math.PI);
        if (resultAngle < 0) resultAngle += 2 * Math.PI;
        
        const winningIndex = Math.floor(resultAngle / sliceAngle);
        setWinner(activeItems[winningIndex]);
      }
    };

    requestAnimationFrame(animate);
  };

  return (
    <>
      {/* FAB */}
      <motion.button
        onClick={() => setIsOpen(true)}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-6 right-6 w-16 h-16 bg-netflix-red rounded-full flex items-center justify-center text-white shadow-2xl z-[60] border-2 border-white/20"
      >
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Utensils size={28} />
        </motion.div>
      </motion.button>

      {/* Wheel Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[70] bg-background/95 flex flex-col items-center p-6"
          >
            <div className="w-full max-w-[430px] relative flex justify-center items-center mb-12">
              <h2 className="text-foreground text-xl font-bold flex items-center gap-2">What are we eating? <Utensils size={20} /></h2>
              <button onClick={() => setIsOpen(false)} className="absolute right-0 p-2 text-secondary-text hover:text-foreground">
                <X size={24} />
              </button>
            </div>

            <div className="relative flex flex-col items-center">
              {/* Pointer */}
              <div className="absolute top-[-15px] left-1/2 -translate-x-1/2 z-10 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-white drop-shadow-lg" />
              
              <canvas
                ref={canvasRef}
                width={300}
                height={300}
                className="rounded-full shadow-[0_0_50px_rgba(229,9,20,0.1)]"
              />

              <button
                onClick={spin}
                disabled={isSpinning || activeItems.length < 2}
                className="mt-12 w-64 py-4 bg-netflix-red text-white font-black text-lg rounded-2xl shadow-xl active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isSpinning ? <RotateCcw size={24} className="animate-spin" /> : <span className="flex items-center gap-2">SPIN <Dices size={24} /></span>}
              </button>

              <button
                onClick={() => setIsEditOpen(true)}
                className="mt-6 text-secondary-text text-sm font-medium flex items-center gap-2 hover:text-foreground transition-colors"
              >
                <Settings size={14} /> Edit Choices <Pencil size={14} />
              </button>
            </div>

            {/* Winner Reveal */}
            <AnimatePresence>
              {winner && !isSpinning && (
                <motion.div
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 100, opacity: 0 }}
                  className="absolute bottom-10 left-6 right-6 bg-netflix-red p-6 rounded-3xl shadow-2xl flex flex-col items-center text-center border-2 border-white/20"
                >
                  <PartyPopper size={36} className="text-white drop-shadow-md mb-2" />
                  <p className="text-foreground/80 text-xs font-bold uppercase tracking-widest">We&apos;re having...</p>
                  <h3 className="text-foreground text-3xl font-black mt-1 mb-6 drop-shadow-lg">{winner.name}</h3>
                  <div className="flex gap-3 w-full">
                    <button
                      onClick={() => setIsOpen(false)}
                      className="flex-1 py-3 bg-white text-netflix-red font-bold rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <Check size={18} /> Let&apos;s go!
                    </button>
                    <button
                      onClick={spin}
                      className="p-3 bg-black/20 text-foreground rounded-xl active:scale-95 transition-all"
                    >
                      <RotateCcw size={20} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <WheelEditModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        items={items}
        onUpdate={fetchItems}
      />
    </>
  );
}
