'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Send, StickyNote, CheckCircle2, History, Camera, X, Image as ImageIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PostIt as PostItType } from '@/types/database';
import { sendPushTrigger } from '@/lib/push-client';
import { getCachedProfiles } from '@/lib/profiles-cache';
import Toast from './Toast';
import BottomSheet from './BottomSheet';

interface PostItProps {
  userId: string;
}

export default function PostIt({ userId }: PostItProps) {
  const [unreadNote, setUnreadNote] = useState<PostItType | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState('Partner');
  const [myName, setMyName] = useState('Partner');
  const [message, setMessage] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [toastMsg, setToastMsg] = useState('Note sent!');
  const [showToast, setShowToast] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyNotes, setHistoryNotes] = useState<any[]>([]);
  const [supabase] = useState(() => createClient());

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchUnreadNote();
    fetchProfilesInfo();

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
      .limit(30);
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

  const fetchProfilesInfo = async () => {
    const data = await getCachedProfiles();
    if (data) {
      const partner = data.find(p => p.id !== userId);
      const me = data.find(p => p.id === userId);
      if (partner) {
        setPartnerId(partner.id);
        setPartnerName(partner.name);
      }
      if (me) setMyName(me.name);
    }
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const max = 800;
          if (width > height) {
            if (width > max) {
              height *= max / width;
              width = max;
            }
          } else {
            if (height > max) {
              width *= max / height;
              height = max;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject('No canvas context');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = () => reject('Image load error');
        if (e.target?.result) img.src = e.target.result as string;
      };
      reader.onerror = () => reject('File read error');
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressImage(file);
      setImagePreview(base64);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAcknowledgeAndReply = async () => {
    if (!unreadNote) return;
    setIsSending(true);

    const { error: ackError } = await supabase
      .from('post_its')
      .update({ is_read: true })
      .eq('id', unreadNote.id);
    
    if (!ackError) {
      // Trigger Web Push to note author that note was read
      if (unreadNote.author_id) {
        sendPushTrigger({
          targetUserId: unreadNote.author_id,
          title: `${myName} อ่านโน้ตแล้วนะ ✨`,
          body: 'โน้ตที่คุณเขียนถูกเปิดอ่านเรียบร้อยจ้า 💌',
        });
      }

      if (replyMessage.trim()) {
        await supabase
          .from('post_its')
          .insert([{ author_id: userId, message: replyMessage.substring(0, 200), is_read: false }]);
        
        if (partnerId) {
          sendPushTrigger({
            targetUserId: partnerId,
            title: `มีข้อความตอบกลับจาก ${myName} 💌`,
            body: replyMessage.substring(0, 80),
          });
        }

        setToastMsg('Reply sent!');
        setShowToast(true);
      }
      setUnreadNote(null);
      setReplyMessage('');
    }
    setIsSending(false);
  };

  const handleSendNote = async () => {
    if (!message.trim() && !imagePreview) return;
    setIsSending(true);
    
    const { error } = await supabase
      .from('post_its')
      .insert([{
        author_id: userId,
        message: message.substring(0, 200) || '(ส่งรูปภาพ 📸)',
        image_url: imagePreview,
        is_read: false,
      }]);

    if (!error) {
      // Trigger real Web Push notification to partner
      if (partnerId) {
        sendPushTrigger({
          targetUserId: partnerId,
          title: `มีโน้ตใหม่จาก ${myName} 💌`,
          body: message.trim() ? message.substring(0, 80) : 'แนบรูปภาพมาให้ดูจ้า 📸',
        });
      }

      setMessage('');
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setToastMsg('Note sent!');
      setShowToast(true);
    }
    setIsSending(false);
  };

  return (
    <section className="px-4 mt-6 pb-6">
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
            title="Note History"
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
            className="w-full h-24 bg-foreground/5 border border-foreground/10 rounded-xl p-4 text-foreground text-sm outline-none focus:border-netflix-red resize-none hide-scrollbar"
          />
          <div className="absolute bottom-3 right-3 text-[10px] text-secondary-text">
            {message.length}/200
          </div>
        </div>

        {/* Image Preview if attached */}
        {imagePreview && (
          <div className="relative mt-3 w-24 h-24 rounded-xl overflow-hidden border border-white/20 group">
            <img src={imagePreview} alt="Attached" className="w-full h-full object-cover" />
            <button
              onClick={() => {
                setImagePreview(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="absolute top-1 right-1 p-1 bg-black/70 rounded-full text-white hover:bg-black"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 mt-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`p-3 rounded-xl border flex items-center justify-center transition-all ${
              imagePreview ? 'bg-netflix-red/20 border-netflix-red text-netflix-red' : 'bg-foreground/5 border-foreground/10 text-secondary-text hover:text-foreground'
            }`}
            title="Attach photo"
          >
            <Camera size={18} />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            className="hidden"
          />

          <button
            onClick={handleSendNote}
            disabled={isSending || (!message.trim() && !imagePreview)}
            className="flex-1 py-3 bg-netflix-red text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-netflix-red/20"
          >
            {isSending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <><Send size={16} /> Send Note</>
            )}
          </button>
        </div>
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
              
              {unreadNote.image_url && (
                <div className="w-full max-h-48 rounded-lg overflow-hidden mb-3 shadow-md border border-[#713f12]/20">
                  <img src={unreadNote.image_url} alt="Note Attachment" className="w-full h-full object-cover" />
                </div>
              )}

              <p className="text-[#1a1a1a] text-lg font-medium leading-relaxed mb-4">
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
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
                  
                  {note.image_url && (
                    <div className="w-full max-h-40 rounded-xl overflow-hidden mb-2 shadow-md">
                      <img src={note.image_url} alt="Note Photo" className="w-full h-full object-cover" />
                    </div>
                  )}

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
