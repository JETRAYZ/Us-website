'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { registerServiceWorker, subscribeToPush } from '@/lib/push-client';
import { getCachedProfiles } from '@/lib/profiles-cache';

export default function NotificationManager({ userId }: { userId: string }) {
  const [partnerName, setPartnerName] = useState('Partner');
  const partnerNameRef = useRef('Partner');
  const supabase = createClient();

  useEffect(() => {
    partnerNameRef.current = partnerName;
  }, [partnerName]);

  useEffect(() => {
    // 1. Register Service Worker on mount
    registerServiceWorker();

    // 2. If permission is already granted, ensure push subscription is active on server
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      subscribeToPush(userId).catch(console.error);
    }

    const fetchPartnerName = async () => {
      const data = await getCachedProfiles();
      if (data) {
        const partner = data.find(p => p.id !== userId);
        if (partner) setPartnerName(partner.name);
      }
    };
    fetchPartnerName();

    // Fallback foreground toast/audio if tab is open
    const postItChannel = supabase
      .channel(`post-its-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post_its' }, (payload) => {
        if (payload.new.author_id !== userId) {
          showForegroundNotification(
            `New Message From ${partnerNameRef.current} 💌`,
            payload.new.message
          );
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'post_its' }, (payload) => {
        if (payload.new.author_id === userId && payload.new.is_read === true) {
          showForegroundNotification(
            `${partnerNameRef.current} read your note ✨`,
            `ข้อความของคุณถูกเปิดอ่านแล้วจ้า`
          );
        }
      })
      .subscribe();

    const calendarChannel = supabase
      .channel(`calendar-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, (payload) => {
        if (payload.new.created_by !== userId) {
          showForegroundNotification(
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

  const showForegroundNotification = (title: string, body: string) => {
    const isMuted = localStorage.getItem('notifs_muted') === 'true';
    if (isMuted) return;

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, {
            body,
            icon: '/icon.png',
            badge: '/icon.png',
            data: { url: '/dashboard' },
          });
        }).catch(() => {
          new Notification(title, { body, icon: '/icon.png' });
        });
      } catch (e) {
        // Ignore fallback errors
      }
    }
  };

  return null;
}
