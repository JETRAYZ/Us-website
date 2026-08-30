'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { registerServiceWorker, subscribeToPush } from '@/lib/push-client';
import { getCachedProfiles } from '@/lib/profiles-cache';

export default function NotificationManager({ userId }: { userId: string }) {
  const [partnerName, setPartnerName] = useState('Partner');
  const partnerNameRef = useRef('Partner');
  const [supabase] = useState(() => createClient());

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

    // Direct Realtime listener for Post-Its
    const postItChannel = supabase
      .channel(`post-its-notify-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post_its' }, (payload) => {
        if (payload.new && payload.new.author_id !== userId) {
          sendNativeNotification(
            `New Message From ${partnerNameRef.current} 💌`,
            payload.new.message || 'แนบรูปภาพมาให้ดูจ้า 📸'
          );
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'post_its' }, (payload) => {
        if (payload.new && payload.new.author_id === userId && payload.new.is_read === true) {
          sendNativeNotification(
            `${partnerNameRef.current} read your note ✨`,
            'ข้อความของคุณถูกเปิดอ่านแล้วจ้า'
          );
        }
      })
      .subscribe();

    // Direct Realtime listener for Calendar Events
    const calendarChannel = supabase
      .channel(`calendar-notify-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, (payload) => {
        if (payload.new && payload.new.created_by !== userId) {
          sendNativeNotification(
            `New Event From ${partnerNameRef.current} 📅`,
            payload.new.title || 'นัดหมายใหม่'
          );
        }
      })
      .subscribe();

    // Direct Realtime listener for Music Vibe updates
    const profileChannel = supabase
      .channel(`profile-notify-${userId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
        if (payload.new && payload.new.id !== userId && payload.new.music_url && payload.new.music_url !== payload.old?.music_url) {
          let songTitle = 'เพลงใหม่';
          try {
            const parsed = JSON.parse(payload.new.music_url);
            if (parsed.trackName) {
              songTitle = `"${parsed.trackName} - ${parsed.artistName}"`;
            }
          } catch (e) {}

          sendNativeNotification(
            `🎵 ${partnerNameRef.current} แชร์เพลงใหม่!`,
            `${songTitle} แวะมาฟังด้วยกันนะ ✨`
          );
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(postItChannel);
      supabase.removeChannel(calendarChannel);
      supabase.removeChannel(profileChannel);
    };
  }, [userId, supabase]);

  const sendNativeNotification = (title: string, body: string) => {
    const isMuted = typeof window !== 'undefined' && localStorage.getItem('notifs_muted') === 'true';
    if (isMuted) return;

    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return;

    // Prefer Service Worker notification (works even when app is in background)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => {
          reg.showNotification(title, {
            body,
            icon: '/icon.png',
            badge: '/icon.png',
            data: { url: '/dashboard' },
          });
        })
        .catch(() => {
          // Fallback to in-page notification if SW not ready
          try { new Notification(title, { body, icon: '/icon.png' }); } catch (_) {}
        });
    } else {
      try { new Notification(title, { body, icon: '/icon.png' }); } catch (_) {}
    }
  };

  return null;
}
