'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Pause, Play, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface RecapSlideshowProps {
  snaps: any[];
  monthName: string;
  onClose: () => void;
}

export default function RecapSlideshow({ snaps, monthName, onClose }: RecapSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [localSnaps, setLocalSnaps] = useState(snaps);
  const supabase = createClient();

  useEffect(() => {
    setLocalSnaps(snaps);
  }, [snaps]);

  const nextSlide = useCallback(() => {
    if (currentIndex < localSnaps.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
    } else {
      setIsFinished(true);
    }
  }, [currentIndex, localSnaps.length]);

  const prevSlide = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
    }
  }, [currentIndex]);

  useEffect(() => {
    if (isPaused || isFinished) return;

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          nextSlide();
          return 0;
        }
        return prev + 1;
      });
    }, 40); // 4 seconds total (40ms * 100)

    return () => clearInterval(interval);
  }, [isPaused, isFinished, isDeleting, nextSlide]);

  const handleDelete = async () => {
    const currentSnap = localSnaps[currentIndex];
    const { error } = await supabase.from('snaps').delete().eq('id', currentSnap.id);
    
    if (!error) {
      const newSnaps = localSnaps.filter((_, i) => i !== currentIndex);
      if (newSnaps.length === 0) {
        onClose();
      } else {
        setLocalSnaps(newSnaps);
        if (currentIndex >= newSnaps.length) {
          setCurrentIndex(newSnaps.length - 1);
        }
        setProgress(0);
        setIsDeleting(false);
      }
    }
  };

  const handleScreenTouch = (e: React.MouseEvent | React.TouchEvent) => {
    const x = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const screenWidth = window.innerWidth;

    if (x < screenWidth / 3) {
      prevSlide();
    } else {
      nextSlide();
    }
  };

  if (isFinished) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center p-8 text-center"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 20 }}
          className="flex flex-col items-center"
        >
          <Heart size={80} className="text-netflix-red fill-netflix-red mb-6 animate-pulse" />
          <h2 className="text-foreground text-3xl font-black mb-2 flex items-center justify-center gap-2">That was {monthName} <Heart size={28} className="text-netflix-red fill-netflix-red" /></h2>
          <p className="text-secondary-text text-lg mb-12">{localSnaps.length} memories together</p>
          
          <button
            onClick={onClose}
            className="px-10 py-4 border-2 border-white rounded-full text-foreground font-bold text-lg active:bg-white active:text-black transition-all"
          >
            Close
          </button>
        </motion.div>
      </motion.div>
    );
  }

  const currentSnap = snaps[currentIndex];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] bg-black touch-none select-none"
    >
      {/* Progress Bars */}
      <div className="absolute top-4 left-0 right-0 z-50 flex gap-1 px-2">
        {localSnaps.map((_, idx) => (
          <div key={idx} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
            {idx < currentIndex && <div className="h-full bg-white w-full" />}
            {idx === currentIndex && (
              <motion.div 
                className="h-full bg-white" 
                style={{ width: `${progress}%` }} 
              />
            )}
          </div>
        ))}
      </div>

      {/* Header Info */}
      <div className="absolute top-8 left-4 right-4 z-50 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20">
            <img src={currentSnap.profiles?.avatar_url || ''} className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col">
            <span className="text-foreground text-xs font-bold">{currentSnap.profiles?.name}</span>
            <span className="text-foreground/60 text-[10px]">
              {new Date(currentSnap.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-foreground/70 hover:text-foreground">
          <X size={24} />
        </button>
      </div>

      {/* Slide Image */}
      <div 
        className="relative w-full h-full"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
        onClick={handleScreenTouch}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={localSnaps[currentIndex].id}
            src={localSnaps[currentIndex].image_url}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full object-cover"
          />
        </AnimatePresence>

        {/* Delete Button */}
        <div className="absolute bottom-24 right-4 z-50">
          <button 
            onClick={(e) => { e.stopPropagation(); setIsDeleting(true); }}
            className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white/50 hover:text-netflix-red transition-colors"
          >
            <Trash2 size={24} />
          </button>
        </div>

        {/* Caption Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-8 pt-20 bg-gradient-to-t from-black via-black/40 to-transparent">
          {currentSnap.caption && (
            <motion.p 
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-foreground text-lg font-medium leading-relaxed drop-shadow-lg"
            >
              {currentSnap.caption}
            </motion.p>
          )}
        </div>
      </div>

      {/* Delete Confirmation Overlay */}
      <AnimatePresence>
        {isDeleting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[300] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
            onClick={(e) => { e.stopPropagation(); setIsDeleting(false); }}
          >
            <Trash2 size={64} className="text-netflix-red mb-6" />
            <h3 className="text-white text-2xl font-bold mb-2">Delete this memory?</h3>
            <p className="text-secondary-text mb-8">This action cannot be undone.</p>
            <div className="flex flex-col w-full gap-3">
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                className="w-full py-4 bg-netflix-red text-white font-bold rounded-xl active:scale-95 transition-all"
              >
                Yes, Delete
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setIsDeleting(false); }}
                className="w-full py-4 bg-white/10 text-white font-bold rounded-xl active:scale-95 transition-all"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pause/Play Indicator */}
      {(isPaused && !isDeleting) && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="p-4 bg-black/20 backdrop-blur-sm rounded-full">
            <Pause size={48} className="text-foreground/50" />
          </div>
        </div>
      )}
    </motion.div>
  );
}
