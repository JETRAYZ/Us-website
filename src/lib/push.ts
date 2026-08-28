import webpush from 'web-push';
import { createServiceRoleClient } from '@/lib/supabase/server';

const DEFAULT_VAPID_PUBLIC_KEY = 'BBl6n2SWc0rVraZz8R8J1jNNvCBP7FIkmlwjDjgeyGjEbjU-ATGNrxNS_1VMQ_qxo3VEOYAwPCgxNoeBudLew2w';
const DEFAULT_VAPID_PRIVATE_KEY = 'd9klvZYce9jQLha676kGACb4HE_XSRRdp8LM38UiA4I';

const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY;
const vapidPrivate = process.env.VAPID_PRIVATE_KEY || DEFAULT_VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@us-space.app';

// Configure Web Push with VAPID keys
try {
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
} catch (e) {
  console.error('[WebPush] VAPID configuration error:', e);
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

/**
 * Send Web Push notification to all active devices of a target user.
 */
export async function sendPushNotification(targetUserId: string, payload: PushPayload) {
  try {
    const supabase = createServiceRoleClient();

    // Query all push subscriptions for this user
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, subscription')
      .eq('user_id', targetUserId);

    if (error) {
      console.error('[WebPush] Error fetching subscriptions:', error);
      return { success: false, error: error.message };
    }

    if (!subscriptions || subscriptions.length === 0) {
      return { success: false, count: 0, error: 'ยังไม่พบ Device Token ของผู้ใช้ในฐานข้อมูล (กรุณากดเปิดกระดิ่งแจ้งเตือนอีกครั้ง)' };
    }

    const payloadString = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || '/dashboard',
      icon: payload.icon || '/icon.png',
    });

    const deadSubscriptionIds: string[] = [];

    const sendPromises = subscriptions.map(async (subRecord) => {
      try {
        const sub = subRecord.subscription as webpush.PushSubscription;
        await webpush.sendNotification(sub, payloadString, {
          TTL: 86400, // 24 hours
          urgency: 'high',
        });
      } catch (err: any) {
        // 404 or 410 means the subscription is no longer valid on Apple/Google servers
        if (err.statusCode === 404 || err.statusCode === 410) {
          deadSubscriptionIds.push(subRecord.id);
        } else {
          console.error('[WebPush] Error sending notification to subscription:', subRecord.id, err);
        }
      }
    });

    await Promise.allSettled(sendPromises);

    // Clean up dead subscriptions
    if (deadSubscriptionIds.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('id', deadSubscriptionIds);
    }

    return { success: true, count: subscriptions.length - deadSubscriptionIds.length };
  } catch (err: any) {
    console.error('[WebPush] Fatal send error:', err);
    return { success: false, error: err.message || 'Failed to send push' };
  }
}
