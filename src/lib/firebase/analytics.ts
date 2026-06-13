import { type Analytics } from 'firebase/analytics';

/**
 * Lazily initialises Firebase Analytics.
 *
 * Analytics requires a browser environment (it reads `window`), so it cannot
 * run during SSR or static generation. Call this only inside a `useEffect` or
 * any other client-only code path.
 *
 * @example
 * useEffect(() => { getAnalyticsInstance(); }, []);
 */
export async function getAnalyticsInstance(): Promise<Analytics | null> {
  if (typeof window === 'undefined') return null;

  const { getAnalytics } = await import('firebase/analytics');
  const { default: app } = await import('./app');

  return getAnalytics(app);
}
