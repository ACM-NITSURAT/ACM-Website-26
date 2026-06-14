import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import app from './app';

/**
 * Singleton Admin Firestore instance.
 *
 * Use this in server-only code (Route Handlers, Server Actions, etc.)
 * for privileged reads/writes that bypass Security Rules.
 */
const adminDb: Firestore = getFirestore(app);

export default adminDb;
