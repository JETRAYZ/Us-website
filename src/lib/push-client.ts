// Client-side Web Push helper

const DEFAULT_VAPID_PUBLIC_KEY = 'BBl6n2SWc0rVraZz8R8J1jNNvCBP7FIkmlwjDjgeyGjEbjU-ATGNrxNS_1VMQ_qxo3VEOYAwPCgxNoeBudLew2w';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    return reg;
  } catch (err) {
    console.error('Service Worker registration failed:', err);
    return null;
  }
}

export async function subscribeToPush(userId: string): Promise<{ success: boolean; error?: string }> {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Window not defined' };
  }

  if (!('serviceWorker' in navigator)) {
    return { success: false, error: 'เบราว์เซอร์นี้ไม่รองรับ Service Worker' };
  }

  if (!('PushManager' in window)) {
    return { success: false, error: 'เบราว์เซอร์นี้ไม่รองรับ PushManager' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: `Notification permission: ${permission} (กรุณาอนุญาตการแจ้งเตือนในเบราว์เซอร์)` };
    }

    const reg = await registerServiceWorker();
    if (!reg) return { success: false, error: 'ไม่สามารถลงทะเบียน Service Worker ได้' };

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY;

    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    }

    // Send subscription to server
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        subscription: subscription.toJSON(),
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      return { success: false, error: data.error || 'Failed to save subscription on server.' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Failed to subscribe to push:', err);
    return { success: false, error: err.message || 'Push subscription error' };
  }
}

export async function sendPushTrigger({
  targetUserId,
  title,
  body,
  url,
  icon,
}: {
  targetUserId: string;
  title: string;
  body: string;
  url?: string;
  icon?: string;
}) {
  try {
    const res = await fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId, title, body, url, icon }),
    });
    return await res.json();
  } catch (err: any) {
    console.error('Failed to trigger push notification:', err);
    return { success: false, error: err.message };
  }
}
