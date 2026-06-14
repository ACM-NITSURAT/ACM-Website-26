import { getFirestore, type Firestore } from 'firebase/firestore';
import app from './app';

/**
 * Singleton Firestore client instance.
 */
const db: Firestore = getFirestore(app);

export default db;
