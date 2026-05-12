'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function NotificationManager({ userId }: { userId: string }) {
  const [partnerName, setPartnerName] = useState('Partner');
  const partnerNameRef = useRef('Partner');
  const supabase = createClient();

  useEffect(() => {
    partnerNameRef.current = partnerName;
  }, [partnerName]);

  useEffect(() => {
    const fetchPartnerName = async () => {
      const { data } = await supabase.from('profiles').select('id, name');
      if (data) {
        const partner = data.find(p => p.id !== userId);
        if (partner) setPartnerName(partner.name);
      }
    };
    fetchPartnerName();

    const postItChannel = supabase
      .channel(`post-its-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post_its' }, (payload) => {
        if (payload.new.author_id !== userId) {
          sendNativeNotification(
            `New Message From ${partnerNameRef.current} 💌`, 
            payload.new.message
          );
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'post_its' }, (payload) => {
        if (payload.new.author_id === userId && payload.new.is_read === true) {
          sendNativeNotification(
            `${partnerNameRef.current} seen your message ✨`, 
            `ข้อความของคุณถูกเปิดอ่านแล้วจ้า`
          );
        }
      })
      .subscribe();

    const calendarChannel = supabase
      .channel(`calendar-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, (payload) => {
        if (payload.new.created_by !== userId) {
          sendNativeNotification(
            `New Event From ${partnerNameRef.current} 📅`, 
            payload.new.title
          );
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(postItChannel);
      supabase.removeChannel(calendarChannel);
    };
  }, [userId, supabase]);

  const sendNativeNotification = (title: string, body: string) => {
    const isMuted = localStorage.getItem('notifs_muted') === 'true';
    if (isMuted) return;

    if (typeof window !== 'undefined' && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Telegram-Animated-Emojis/main/Symbols/Heart.png',
      });
    }
  };

  return null;
}
