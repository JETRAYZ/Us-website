import { NextResponse } from 'next/server';
import { sendPushNotification } from '@/lib/push';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { targetUserId, title, body: messageBody, url, icon } = body;

    if (!targetUserId || !title || !messageBody) {
      return NextResponse.json(
        { error: 'Missing targetUserId, title, or body' },
        { status: 400 }
      );
    }

    const result = await sendPushNotification(targetUserId, {
      title,
      body: messageBody,
      url: url || '/dashboard',
      icon: icon || '/icon.png',
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to trigger push' }, { status: 500 });
  }
}
