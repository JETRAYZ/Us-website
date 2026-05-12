'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning';
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  type = 'danger'
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-[320px] bg-netflix-card border border-foreground/10 rounded-3xl overflow-hidden shadow-2xl"
          >
            <div className="p-6 flex flex-col items-center text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                type === 'danger' ? 'bg-netflix-red/20 text-netflix-red' : 'bg-yellow-500/20 text-yellow-500'
              }`}>
                <AlertCircle size={32} />
              </div>
              
              <h3 className="text-foreground text-xl font-bold mb-2">{title}</h3>
              <p className="text-secondary-text text-sm leading-relaxed">
                {message}
              </p>
            </div>

            <div className="flex border-t border-white/5">
              <button
                onClick={onClose}
                className="flex-1 py-4 text-secondary-text font-bold text-sm hover:bg-white/5 active:bg-white/10 transition-colors border-r border-white/5"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`flex-1 py-4 font-black text-sm active:opacity-70 transition-all ${
                  type === 'danger' ? 'text-netflix-red' : 'text-yellow-500'
                }`}
              >
                {confirmText}
              </button>
            </div>

            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-1 text-secondary-text hover:text-foreground transition-colors"
            >
              <X size={18} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
