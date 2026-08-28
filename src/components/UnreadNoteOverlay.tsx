'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StickyNote, Send, CheckCircle2, Heart } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PostIt as PostItType } from '@/types/database';
import { sendPushTrigger } from '@/lib/push-client';
import { getCachedProfiles } from '@/lib/profiles-cache';

interface UnreadNoteOverlayProps {
  userId: string;
}

export default function UnreadNoteOverlay({ userId }: UnreadNoteOverlayProps) {
  const [unreadNote, setUnreadNote] = useState<PostItType | null>(null);
  const [partnerName, setPartnerName] = useState('Partner');
  const [myName, setMyName] = useState('Partner');
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    fetchProfiles();
    fetchUnreadNote();

    const channel = supabase
      .channel('unread-note-global-overlay')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_its' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          if (payload.new.author_id !== userId && !payload.new.is_read) {
            setUnreadNote(payload.new as PostItType);
          }
        } else if (payload.eventType === 'UPDATE') {
          if (payload.new.is_read) {
            setUnreadNote(prev => (prev?.id === payload.new.id ? null : prev));
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  const fetchProfiles = async () => {
    const data = await getCachedProfiles();
    if (data) {
      const partner = data.find(p => p.id !== userId);
      const me = data.find(p => p.id === userId);
      if (partner) {
        setPartnerName(partner.name);
        setPartnerId(partner.id);
      }
      if (me) setMyName(me.name);
    }
  };

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

  const handleAcknowledgeAndReply = async () => {
    if (!unreadNote) return;
    setIsSending(true);

    // 1. Mark current note as read
    await supabase
      .from('post_its')
      .update({ is_read: true })
      .eq('id', unreadNote.id);

    // 2. Trigger read notification to author
    sendPushTrigger({
      targetUserId: unreadNote.author_id,
      title: `${myName} เปิดอ่านโน้ตแล้ว 💌`,
      body: 'หวานใจของคุณเปิดอ่านข้อความเรียบร้อยแล้วจ้า ✨',
    });

    // 3. If there is a reply, insert reply note and trigger push
    if (replyMessage.trim()) {
      await supabase.from('post_its').insert([{
        author_id: userId,
        message: replyMessage.trim().substring(0, 200),
        is_read: false,
      }]);

      if (partnerId) {
        sendPushTrigger({
          targetUserId: partnerId,
          title: `มีข้อความตอบกลับจาก ${myName} 💌`,
          body: replyMessage.trim().substring(0, 80),
        });
      }
    }

    setUnreadNote(null);
    setReplyMessage('');
    setIsSending(false);
  };

  if (!unreadNote) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md px-6"
      >
        <motion.div
          initial={{ scale: 0.8, y: 50, rotate: -3 }}
          animate={{ scale: 1, y: 0, rotate: -1 }}
          exit={{ scale: 0.8, y: 50, opacity: 0 }}
          className="bg-[#fef08a] w-full max-w-[340px] rounded-2xl p-6 shadow-2xl relative border-t-8 border-[#facc15]"
        >
          {/* Top Sticky Note Pin */}
          <div className="absolute -top-4 -left-2 rotate-[-15deg]">
            <StickyNote size={32} className="text-[#facc15] fill-[#facc15]" />
          </div>

          <div className="flex items-center justify-between mb-2">
            <p className="text-[#713f12] text-[11px] uppercase tracking-widest font-black flex items-center gap-1.5">
              <Heart size={12} className="text-netflix-red fill-netflix-red" />
              {partnerName} left you a note:
            </p>
            <span className="text-[#713f12]/50 text-[10px] font-bold">
              {new Date(unreadNote.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Photo Attachment if available */}
          {unreadNote.image_url && (
            <div className="w-full max-h-48 rounded-xl overflow-hidden mb-3 shadow-md border border-[#713f12]/20">
              <img src={unreadNote.image_url} alt="Note Attachment" className="w-full h-full object-cover" />
            </div>
          )}

          {/* Message Text */}
          <p className="text-[#1a1a1a] text-lg font-bold leading-relaxed mb-4 whitespace-pre-wrap">
            &ldquo;{unreadNote.message}&rdquo;
          </p>

          {/* Quick Reply Box */}
          <div className="relative mb-4">
            <textarea
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              placeholder={`Reply to ${partnerName}... (optional)`}
              maxLength={200}
              className="w-full h-16 bg-[#713f12]/5 border border-[#713f12]/15 rounded-xl p-3 text-[#713f12] placeholder-[#713f12]/50 text-sm outline-none focus:border-[#713f12]/40 resize-none hide-scrollbar font-medium"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end items-center gap-2">
            <button
              onClick={handleAcknowledgeAndReply}
              disabled={isSending}
              className="flex items-center gap-2 bg-netflix-red text-white px-5 py-2.5 rounded-full text-xs font-black shadow-lg shadow-netflix-red/30 active:scale-95 transition-all disabled:opacity-50"
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
    </AnimatePresence>
  );
}
