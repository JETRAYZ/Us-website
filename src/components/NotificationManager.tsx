'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function NotificationManager({ userId }: { userId: string }) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const supabase = createClient();

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }

    // Check for today's and tomorrow's events on mount
    const checkUpcomingEvents = async () => {
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);

      const todayStr = today.toISOString().split('T')[0];
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      // Fetch events for today and tomorrow
      const { data } = await supabase
        .from('events')
        .select('*')
        .or(`event_date.eq.${todayStr},event_date.eq.${tomorrowStr}`);
      
      if (data && data.length > 0) {
        data.forEach(event => {
          if (event.event_date === todayStr) {
            sendNotification('วันนี้มีนัดจ้า! ✨', `เจอกันน้า วันนี้มี: ${event.title}`);
          } else if (event.event_date === tomorrowStr) {
            sendNotification('พรุ่งนี้มีนัดนะ! 📅', `อย่าลืมนะ! พรุ่งนี้มี: ${event.title}`);
          }
        });
      }
    };

    checkUpcomingEvents();

    // Listener for real-time events to trigger notifications
    const postItChannel = supabase
      .channel('post-its-notify')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post_its' }, (payload) => {
        if (payload.new.author_id !== userId) {
          sendNotification('มีโน้ตใหม่จากแฟนจ้า! 💌', payload.new.message);
        }
      })
      .subscribe();

    const calendarChannel = supabase
      .channel('calendar-notify')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, (payload) => {
        if (payload.new.created_by !== userId) {
          sendNotification('มีนัดใหม่ถูกเพิ่มจ้า! 📅', payload.new.title);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(postItChannel);
      supabase.removeChannel(calendarChannel);
    };
  }, [userId, supabase]);

  const sendNotification = (title: string, body: string) => {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Telegram-Animated-Emojis/main/Symbols/Heart.png',
      });
    }
  };

  return null; // This is a logic-only component
}
