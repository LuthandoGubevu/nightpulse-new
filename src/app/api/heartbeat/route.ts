
import { NextResponse } from 'next/server';
import { adminFirestore } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import { verifyUserIdToken } from '@/lib/serverAuth';

// A gap this long since the last ping is treated as a new visit rather than a
// continuation of the current one. Heuristic: while actively checked in,
// pings fire every 5 minutes, so any gap this large means the device was
// quiet for a while (left the geofence, closed the app, etc).
const SESSION_GAP_MS = 3 * 60 * 60 * 1000; // 3 hours

export async function POST(request: Request) {
  if (!adminFirestore) {
    return NextResponse.json({ success: false, error: 'Firestore admin not initialized' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { clubId, lat, lng, deviceId, idToken } = body;

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

    // idToken is optional — a missing or invalid token just means this
    // heartbeat is recorded without a linked account, never a failed heartbeat.
    let uid: string | null = null;
    if (idToken) {
      const authResult = await verifyUserIdToken(idToken);
      if (authResult.ok) {
        uid = authResult.uid;
      }
    }

    const now = Timestamp.now();
    const deviceRef = adminFirestore.collection('visits').doc(deviceId);
    const existingSnap = await deviceRef.get();
    const existing = existingSnap.data();

    const isNewSession =
      !existing ||
      !existing.currentSessionId ||
      existing.clubId !== clubId ||
      (existing.lastSeen instanceof Timestamp && now.toMillis() - existing.lastSeen.toMillis() > SESSION_GAP_MS);

    let sessionId: string | undefined = existing?.currentSessionId;

    if (isNewSession) {
      const sessionRef = adminFirestore.collection('visitSessions').doc();
      await sessionRef.set({ deviceId, uid, clubId, firstSeen: now, lastSeen: now });
      sessionId = sessionRef.id;
    } else if (sessionId) {
      await adminFirestore.collection('visitSessions').doc(sessionId).set(
        { lastSeen: now, uid: uid ?? existing?.uid ?? null },
        { merge: true }
      );
    }

    await deviceRef.set(
      {
        clubId,
        location: { lat, lng },
        lastSeen: now,
        currentSessionId: sessionId,
        uid: uid ?? existing?.uid ?? null,
      },
      { merge: true }
    );

    return NextResponse.json({ success: true, message: 'Heartbeat recorded' });
  } catch (error: any) {
    console.error('Error processing heartbeat:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to process heartbeat' }, { status: 500 });
  }
}
