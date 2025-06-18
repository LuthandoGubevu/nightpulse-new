
import { NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase';
import { Timestamp, doc, setDoc } from 'firebase/firestore';
import type { HeartbeatEntry } from '@/types';

export async function POST(request: Request) {
  if (!firestore) {
    return NextResponse.json({ success: false, error: 'Firestore not initialized' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { clubId, lat, lng, deviceId } = body;

    if (!clubId || typeof lat !== 'number' || typeof lng !== 'number' || !deviceId) {
      return NextResponse.json({ success: false, error: 'Missing required fields: clubId, lat, lng, deviceId' }, { status: 400 });
    }

    const heartbeatData: Omit<HeartbeatEntry, 'lastSeen'> & { lastSeen: Timestamp } = {
      clubId,
      location: { lat, lng },
      lastSeen: Timestamp.now(),
    };

    const visitRef = doc(firestore, 'visits', deviceId);
    await setDoc(visitRef, heartbeatData, { merge: true }); // Use setDoc with merge to create or update

    return NextResponse.json({ success: true, message: 'Heartbeat recorded' });
  } catch (error: any) {
    console.error('Error processing heartbeat:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to process heartbeat' }, { status: 500 });
  }
}
