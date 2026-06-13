/**
 * Re-exports the real Firestore Timestamp from the Firebase client SDK.
 * All schema files import Timestamp from here, keeping the import path stable.
 */
export { Timestamp } from 'firebase/firestore';
