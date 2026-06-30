/**
 * /leaderboard/link-profiles — Link Your Coding Profiles
 *
 * Authenticated users can enter their coding platform usernames.
 * Each username is validated in real-time against the platform API.
 * Shows a preview (rating, rank) when valid.
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/firebase';
import { auth } from '@/lib/firebase/auth';
import { PLATFORMS, SEARCH_DEBOUNCE_MS, type Platform, ALL_PLATFORMS } from '@/config/leaderboard';
import type { ValidationResult } from '@/server/leaderboard/adapters/types';
import styles from './page.module.css';

interface PlatformField {
  username: string;
  status: 'idle' | 'validating' | 'valid' | 'invalid' | 'saving';
  validation: ValidationResult | null;
  dirty: boolean;
}

const initialField: PlatformField = {
  username: '',
  status: 'idle',
  validation: null,
  dirty: false,
};

export default function LinkProfilesPage() {
  const { user } = useAuth();
  const [fields, setFields] = useState<Record<Platform, PlatformField>>({
    leetcode: { ...initialField },
    codeforces: { ...initialField },
    codechef: { ...initialField },
    github: { ...initialField },
  });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const timers = useRef<Record<string, NodeJS.Timeout>>({});

  // Load existing usernames from user doc
  useEffect(() => {
    if (!user) return;

    const loadUserData = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;

        const res = await fetch('/api/onboarding', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          const userData = data.user;

          setFields({
            leetcode: { ...initialField, username: userData?.leetcodeUsername ?? '' },
            codeforces: { ...initialField, username: userData?.codeforcesHandle ?? '' },
            codechef: { ...initialField, username: userData?.codechefUsername ?? '' },
            github: { ...initialField, username: userData?.githubUsername ?? '' },
          });
        }
      } catch {
        // Non-critical — user starts with empty fields
      }
    };

    loadUserData();
  }, [user]);

  // Validate a platform username
  const validateUsername = useCallback(async (platform: Platform, username: string) => {
    if (!username.trim()) {
      setFields((prev) => ({
        ...prev,
        [platform]: { ...prev[platform], status: 'idle', validation: null },
      }));
      return;
    }

    setFields((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], status: 'validating' },
    }));

    try {
      const res = await fetch('/api/leaderboard/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, username: username.trim() }),
      });

      const result: ValidationResult = await res.json();

      setFields((prev) => ({
        ...prev,
        [platform]: {
          ...prev[platform],
          status: result.valid ? 'valid' : 'invalid',
          validation: result,
        },
      }));
    } catch {
      setFields((prev) => ({
        ...prev,
        [platform]: {
          ...prev[platform],
          status: 'invalid',
          validation: { valid: false, error: 'Network error — try again' },
        },
      }));
    }
  }, []);

  // Handle username change with debounced validation
  const handleChange = (platform: Platform, value: string) => {
    setFields((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], username: value, dirty: true },
    }));

    // Clear previous timer
    if (timers.current[platform]) {
      clearTimeout(timers.current[platform]);
    }

    // Debounce validation
    timers.current[platform] = setTimeout(() => {
      validateUsername(platform, value);
    }, SEARCH_DEBOUNCE_MS + 200); // Slightly longer than search debounce
  };

  // Save all profiles
  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/leaderboard/link-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken: token,
          leetcodeUsername: fields.leetcode.username.trim() || null,
          codeforcesHandle: fields.codeforces.username.trim() || null,
          codechefUsername: fields.codechef.username.trim() || null,
          githubUsername: fields.github.username.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      setSaveMessage({ type: 'success', text: 'Profiles saved! Stats will sync shortly.' });

      // Reset dirty flags
      setFields((prev) => {
        const updated = { ...prev };
        for (const p of ALL_PLATFORMS) {
          updated[p] = { ...updated[p], dirty: false };
        }
        return updated;
      });
    } catch (err) {
      setSaveMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save profiles',
      });
    } finally {
      setSaving(false);
    }
  };

  // Manual refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/leaderboard/sync/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Refresh failed');

      setSaveMessage({ type: 'success', text: 'Stats refreshed successfully!' });
    } catch (err) {
      setSaveMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Refresh failed',
      });
    } finally {
      setRefreshing(false);
    }
  };

  if (!user) {
    return (
      <div className={styles.authGate}>
        <h2>Sign in to link your profiles</h2>
        <p>You need to be logged in with your SVNIT email to connect your coding platforms.</p>
      </div>
    );
  }

  const hasDirtyFields = Object.values(fields).some((f) => f.dirty);
  const hasInvalid = Object.values(fields).some((f) => f.status === 'invalid');
  const hasAnyLinked = Object.values(fields).some((f) => f.username.trim());

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>Link Your Coding Profiles</h2>
        <p className={styles.description}>
          Connect your accounts to appear on the leaderboard. Usernames are validated in real-time.
        </p>
      </div>

      <div className={styles.platformGrid}>
        {ALL_PLATFORMS.map((platform) => {
          const field = fields[platform];
          const meta = PLATFORMS[platform];

          return (
            <div
              key={platform}
              className={styles.platformCard}
              style={{ '--platform-color': meta.color } as React.CSSProperties}
            >
              <div className={styles.cardHeader}>
                <span className={styles.platformDot} style={{ background: meta.color }} />
                <span className={styles.platformName}>{meta.displayName}</span>
                {field.status === 'valid' && <span className={styles.checkmark}>✓</span>}
                {field.status === 'invalid' && <span className={styles.crossmark}>✗</span>}
              </div>

              <input
                type="text"
                value={field.username}
                onChange={(e) => handleChange(platform, e.target.value)}
                placeholder={`Your ${meta.displayName} username`}
                className={`${styles.input} ${
                  field.status === 'valid' ? styles.inputValid :
                  field.status === 'invalid' ? styles.inputInvalid : ''
                }`}
              />

              {field.status === 'validating' && (
                <div className={styles.validatingMsg}>Checking...</div>
              )}

              {field.status === 'valid' && field.validation?.preview && (
                <div className={styles.preview}>
                  {field.validation.preview.displayName && (
                    <span className={styles.previewName}>
                      {field.validation.preview.displayName}
                    </span>
                  )}
                  {field.validation.preview.rating && (
                    <span className={styles.previewRating}>
                      Rating: {field.validation.preview.rating}
                    </span>
                  )}
                  {field.validation.preview.rank && (
                    <span className={styles.previewRank}>{field.validation.preview.rank}</span>
                  )}
                  {field.validation.preview.extra && (
                    <span className={styles.previewExtra}>{field.validation.preview.extra}</span>
                  )}
                </div>
              )}

              {field.status === 'invalid' && field.validation?.error && (
                <div className={styles.errorMsg}>{field.validation.error}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={saving || (!hasDirtyFields && !hasInvalid)}
        >
          {saving ? 'Saving...' : 'Save Profiles'}
        </button>

        {hasAnyLinked && (
          <button
            className={styles.refreshBtn}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing...' : '↻ Refresh Stats'}
          </button>
        )}
      </div>

      {/* Status message */}
      {saveMessage && (
        <div className={`${styles.message} ${styles[saveMessage.type]}`}>
          {saveMessage.text}
        </div>
      )}
    </div>
  );
}
