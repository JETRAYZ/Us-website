'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Delete } from 'lucide-react';
import { Profile } from '@/types/database';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null;
  onSuccess: (userData: any) => void;
}

export default function PinModal({ isOpen, onClose, profile, onSuccess }: PinModalProps) {
  const [pin, setPin] = useState<string[]>([]);
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (pin.length === 4) {
      handleVerify();
    }
  }, [pin]);

  const handleVerify = async () => {
    if (!profile) return;
    setIsLoading(true);
    setIsError(false);

    try {
      const res = await fetch('/api/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: profile.id, pin: pin.join('') }),
      });

      const data = await res.json();

      if (data.success) {
        onSuccess(data.user);
      } else {
        setIsError(true);
        setPin([]);
      }
    } catch (err) {
      setIsError(true);
      setPin([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNumberClick = (num: string) => {
    if (pin.length < 4) {
      setPin([...pin, num]);
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-md px-6"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-[360px] bg-netflix-card/90 p-8 rounded-3xl border border-white/10 shadow-2xl"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-secondary-text hover:text-foreground"
          >
            <X size={24} />
          </button>

          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 rounded-full overflow-hidden mb-4 border-2 border-netflix-red">
              <img src={profile?.avatar_url || ''} alt={profile?.name} className="w-full h-full object-cover" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Enter your PIN</h2>
            <p className="text-secondary-text text-sm">To access {profile?.name}&apos;s space</p>
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-6 mb-10">
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                animate={isError ? { x: [0, -10, 10, -10, 10, 0] } : {}}
                transition={{ duration: 0.4 }}
                className={`w-4 h-4 rounded-full border-2 transition-colors duration-200 ${
                  pin[i] ? 'bg-netflix-red border-netflix-red' : 'border-white/20'
                } ${isError ? 'bg-red-500 border-red-500' : ''}`}
              />
            ))}
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleNumberClick(num.toString())}
                className="h-16 flex items-center justify-center text-2xl font-semibold text-foreground bg-white/5 rounded-full active:bg-white/10 transition-colors"
              >
                {num}
              </button>
            ))}
            <div className="flex items-center justify-center" />
            <button
              onClick={() => handleNumberClick('0')}
              className="h-16 flex items-center justify-center text-2xl font-semibold text-foreground bg-white/5 rounded-full active:bg-white/10 transition-colors"
            >
              0
            </button>
            <button
              onClick={handleDelete}
              className="h-16 flex items-center justify-center text-foreground bg-white/5 rounded-full active:bg-white/10 transition-colors"
            >
              <Delete size={24} />
            </button>
          </div>

          {isError && (
            <p className="text-netflix-red text-center mt-6 font-medium animate-pulse">
              Incorrect PIN. Please try again.
            </p>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
