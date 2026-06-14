import { cert, getApps, getApp, initializeApp, type App } from 'firebase-admin/app';

/**
 * Singleton Firebase Admin app instance.
 *
 * The private key is stored in an env variable with literal '\n' sequences;
 * we replace them here so the PEM block is valid at runtime.
 *
 * This module must only be imported in server-side code:
 * Route Handlers, Server Actions, middleware, or pages that use `getServerSideProps`.
 * It will throw if bundled into a client component.
 */
const app: App = getApps().length
  ? getApp()
  : initializeApp({
      credential: cert({
        projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
        privateKey:  process.env.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, '\n'),
      }),
    });

export default app;
