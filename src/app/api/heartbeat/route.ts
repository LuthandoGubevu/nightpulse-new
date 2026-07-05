
import { NextResponse } from 'next/server';
import { adminFirestore } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  if (!adminFirestore) {
    return NextResponse.json({ success: false, error: 'Firestore admin not initialized' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { clubId, lat, lng, deviceId } = body;

    if (!clubId || typeof lat !== 'number' || typeof lng !== 'number' || !deviceId) {
      return NextResponse.json({ success: false, error: 'Missing required fields: clubId, lat, lng, deviceId' }, { status: 400 });
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json({ success: false, error: 'Invalid coordinates' }, { status: 400 });
    }

    const clubSnap = await adminFirestore.collection('clubs').doc(clubId).get();
    if (!clubSnap.exists) {
      return NextResponse.json({ success: false, error: 'Club not found' }, { status: 404 });
    }

    await adminFirestore.collection('visits').doc(deviceId).set(
      {
        clubId,
        location: { lat, lng },
        lastSeen: Timestamp.now(),
      },
      { merge: true }
    );

    return NextResponse.json({ success: true, message: 'Heartbeat recorded' });
  } catch (error: any) {
    console.error('Error processing heartbeat:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to process heartbeat' }, { status: 500 });
  }
}
