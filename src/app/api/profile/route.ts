import { NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase-admin/auth';
import adminDb from '@/lib/firebase-admin/firestore';
import type { User } from '@/schema/user';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }
    const tokenStr = authHeader.split('Bearer ')[1];
    const decoded = await verifyIdToken(tokenStr);
    const uid = decoded.uid;

    const body = await request.json();
    const { firstName, lastName, gender } = body;

    if (!firstName || !lastName || !gender) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const validGenders: User['gender'][] = ['male', 'female', 'other'];
    if (!validGenders.includes(gender)) {
      return NextResponse.json({ error: 'Invalid gender value' }, { status: 400 });
    }

    // Update user document
    await adminDb.doc(`users/${uid}`).update({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      gender,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[POST /api/profile]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unauthorized' },
      { status: 401 },
    );
  }
}
