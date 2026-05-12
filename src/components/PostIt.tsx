'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Send, StickyNote, CheckCircle2, History } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PostIt as PostItType } from '@/types/database';
import Toast from './Toast';
import BottomSheet from './BottomSheet';

interface PostItProps {
  userId: string;
}

export default function PostIt({ userId }: PostItProps) {
  const [unreadNote, setUnreadNote] = useState<PostItType | null>(null);
  const [partnerName, setPartnerName] = useState('Partner');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [toastMsg, setToastMsg] = useState('Note sent!');
  const [showToast, setShowToast] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyNotes, setHistoryNotes] = useState<any[]>([]);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    fetchUnreadNote();
    fetchPartnerInfo();

    const channel = supabase
      .channel('post-its-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_its' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          if (payload.new.author_id !== userId && !payload.new.is_read) {
            setUnreadNote(payload.new as PostItType);
          }
        } else if (payload.eventType === 'UPDATE') {
          if (payload.new.is_read) {
            setUnreadNote(prev => prev?.id === payload.new.id ? null : prev);
          }
          if (payload.new.author_id === userId && payload.new.is_read) {
            setToastMsg('Your partner read your note! 💌');
            setShowToast(true);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  const fetchHistory = async () => {
    const { data } = await supabase
      .from('post_its')
      .select('*, profiles(name)')
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) {
      setHistoryNotes(data);
    }
  };

  useEffect(() => {
    if (isHistoryOpen) fetchHistory();
  }, [isHistoryOpen]);

  const fetchUnreadNote = async () => {
    const { data } = await supabase
      .from('post_its')
      .select('*')
      .eq('is_read', false)
      .neq('author_id', userId)
      .order('created_at', { ascending: true })
      .limit(1);
    
    if (data && data.length > 0) {
      setUnreadNote(data[0]);
    }
  };

  const fetchPartnerInfo = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('name')
      .neq('id', userId)
      .single();
    if (data) setPartnerName(data.name);
  };

  const handleAcknowledgeAndReply = async () => {
    if (!unreadNote) return;
    setIsSending(true);

    const { error: ackError } = await supabase
      .from('post_its')
      .update({ is_read: true })
      .eq('id', unreadNote.id);
    
    if (!ackError) {
      if (replyMessage.trim()) {
        await supabase
          .from('post_its')
          .insert([{ author_id: userId, message: replyMessage.substring(0, 200), is_read: false }]);
        setToastMsg('Reply sent!');
        setShowToast(true);
      }
      setUnreadNote(null);
      setReplyMessage('');
    }
    setIsSending(false);
  };

  const handleSendNote = async () => {
    if (!message.trim()) return;
    setIsSending(true);
    
    const { error } = await supabase
      .from('post_its')
      .insert([{ author_id: userId, message: message.substring(0, 200), is_read: false }]);

    if (!error) {
      setMessage('');
      setToastMsg('Note sent!');
      setShowToast(true);
    }
    setIsSending(false);
  };

  return (
    <section className="px-4 mt-6 pb-12">
      {/* Compose UI (Always visible) */}
      <div className="bg-netflix-card rounded-2xl p-5 border border-white/5 shadow-xl relative z-10">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Heart className="text-netflix-red" size={20} />
            <h2 className="text-foreground font-semibold">Leave a note</h2>
            <Heart className="text-netflix-red" size={20} />
          </div>
          <button 
            onClick={() => setIsHistoryOpen(true)}
            className="text-secondary-text hover:text-foreground transition-colors p-2 active:scale-95"
          >
            <History size={20} />
          </button>
        </div>
        
        <div className="relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write something sweet..."
            maxLength={200}
            className="w-full h-28 bg-foreground/5 border border-foreground/10 rounded-xl p-4 text-foreground text-sm outline-none focus:border-netflix-red resize-none hide-scrollbar"
          />
          <div className="absolute bottom-3 right-3 text-[10px] text-secondary-text">
            {message.length}/200
          </div>
        </div>
        
        <button
          onClick={handleSendNote}
          disabled={isSending || !message.trim()}
          className="w-full mt-4 py-3 bg-netflix-red text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
        >
          {isSending ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <><Send size={16} /> Send Note</>
          )}
        </button>
      </div>

      {/* Received Note Modal Overlay */}
      <AnimatePresence>
        {unreadNote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm px-6"
          >
            <motion.div
              initial={{ scale: 0.8, y: 50, rotate: -5 }}
              animate={{ scale: 1, y: 0, rotate: -2 }}
              exit={{ scale: 0.8, y: 50, opacity: 0 }}
              className="bg-[#fef08a] w-full max-w-[340px] rounded-xl p-6 shadow-2xl relative border-t-8 border-[#facc15]"
            >
              <div className="absolute -top-4 -left-2 rotate-[-15deg]">
                 <StickyNote size={32} className="text-[#facc15] fill-[#facc15]" />
              </div>
              
              <p className="text-[#713f12] text-[10px] uppercase tracking-widest font-bold mb-2">
                {partnerName} left you a note:
              </p>
              
              <p className="text-[#1a1a1a] text-xl font-medium leading-relaxed mb-6">
                &ldquo;{unreadNote.message}&rdquo;
              </p>
              
              <div className="relative mb-4">
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder={`Reply to ${partnerName}... (optional)`}
                  maxLength={200}
                  className="w-full h-16 bg-[#713f12]/5 border border-[#713f12]/10 rounded-xl p-3 text-[#713f12] placeholder-[#713f12]/50 text-sm outline-none focus:border-[#713f12]/30 resize-none hide-scrollbar"
                />
              </div>
              
              <div className="flex justify-between items-end">
                <span className="text-[#713f12]/40 text-[10px] pb-1">
                  {new Date(unreadNote.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                
                <button
                  onClick={handleAcknowledgeAndReply}
                  disabled={isSending}
                  className="flex items-center gap-2 bg-netflix-red text-white px-5 py-2.5 rounded-full text-xs font-bold shadow-lg active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : replyMessage.trim() ? (
                    <><Send size={14} /> Send Reply</>
                  ) : (
                    <><CheckCircle2 size={14} /> Acknowledge</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Toast 
        message={toastMsg} 
        isVisible={showToast} 
        onClose={() => setShowToast(false)} 
      />

      <BottomSheet
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        title="Note History"
      >
        <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto hide-scrollbar pb-6">
          {historyNotes.length === 0 ? (
            <p className="text-center text-secondary-text text-sm py-8">No history yet.</p>
          ) : (
            historyNotes.map((note) => {
              const isMine = note.author_id === userId;
              return (
                <div 
                  key={note.id} 
                  className={`p-4 rounded-2xl border ${isMine ? 'bg-netflix-red/10 border-netflix-red/20 ml-8' : 'bg-foreground/5 border-foreground/10 mr-8'}`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-foreground/60 uppercase tracking-wider">
                      {isMine ? 'You' : (note.profiles?.name || partnerName)}
                    </span>
                    <span className="text-[10px] text-foreground/40">
                      {new Date(note.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-foreground text-sm leading-relaxed">&ldquo;{note.message}&rdquo;</p>
                  <div className="mt-2 flex justify-end">
                    <span className={`text-[10px] ${note.is_read ? 'text-green-500 font-bold' : 'text-foreground/30'}`}>
                      {note.is_read ? 'Read ✓' : 'Delivered'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </BottomSheet>
    </section>
  );
}

const Loader2 = ({ size, className }: { size: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/></svg>
);
