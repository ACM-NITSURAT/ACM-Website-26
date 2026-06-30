'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, auth } from '@/lib/firebase';
import styles from './page.module.css';
import FlashingGrid from '@/components/sections/FlashingGrid';

interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  rollNumber: string;
  gender: 'male' | 'female' | 'other';
  role: string;
  branch: string | null;
  currentYear: number | null;
  graduationBatch: number | null;
  leaderboardSlug: string | null;
  leetcodeUsername: string | null;
  codeforcesHandle: string | null;
  codechefUsername: string | null;
  githubUsername: string | null;
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [dbUser, setDbUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  // Forms state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');

  // Platform usernames state
  const [leetcode, setLeetcode] = useState('');
  const [codeforces, setCodeforces] = useState('');
  const [codechef, setCodechef] = useState('');
  const [github, setGithub] = useState('');

  // Individual linking status/loading
  const [linkingPlatform, setLinkingPlatform] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  const loadProfile = async () => {
    if (!auth.currentUser) return;
    try {
      setIsLoading(true);
      const token = await auth.currentUser.getIdToken();
      const res = await fetch('/api/leaderboard/link-profiles', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.user) {
        const u = data.user as UserData;
        setDbUser(u);
        setFirstName(u.firstName || '');
        setLastName(u.lastName || '');
        setGender(u.gender || 'male');
        setLeetcode(u.leetcodeUsername || '');
        setCodeforces(u.codeforcesHandle || '');
        setCodechef(u.codechefUsername || '');
        setGithub(u.githubUsername || '');
      }
    } catch (err) {
      console.error('Failed to load profile data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      setIsSavingDetails(true);
      const token = await auth.currentUser.getIdToken();
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ firstName, lastName, gender }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Details updated successfully!');
        loadProfile();
      } else {
        alert('Failed to update: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Error updating profile');
    } finally {
      setIsSavingDetails(false);
    }
  };

  const handleLinkPlatform = async (platform: 'leetcode' | 'codeforces' | 'codechef' | 'github', action: 'link' | 'unlink') => {
    if (!auth.currentUser) return;

    const value = {
      leetcode: leetcode,
      codeforces: codeforces,
      codechef: codechef,
      github: github,
    }[platform];

    const username = action === 'link' ? value.trim() : null;

    if (action === 'link' && !username) {
      alert(`Please enter a valid ${platform} username.`);
      return;
    }

    try {
      setLinkingPlatform(platform);
      const token = await auth.currentUser.getIdToken();
      
      const payload: Record<string, string | null> = { idToken: token };
      if (platform === 'leetcode') payload.leetcodeUsername = username;
      if (platform === 'codeforces') payload.codeforcesHandle = username;
      if (platform === 'codechef') payload.codechefUsername = username;
      if (platform === 'github') payload.githubUsername = username;

      const res = await fetch('/api/leaderboard/link-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        alert(`${platform} profile updated successfully! Stats sync triggered.`);
        loadProfile();
      } else {
        alert(`Failed to update ${platform}: ` + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Error linking account');
    } finally {
      setLinkingPlatform(null);
    }
  };

  if (authLoading || isLoading || !user || !dbUser) {
    return (
      <div className={styles.loadingContainer}>
        <span>Loading Profile...</span>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      {/* Background Atmosphere */}
      <div className={styles.bgAtmosphere} aria-hidden="true">
        <div className={styles.bgGrid} />
        <FlashingGrid />
        <div className={styles.bgGlow1} />
        <div className={styles.bgGlow2} />
      </div>

      <div className={styles.inner}>
        <div className={styles.headerBlock}>
          <h1 className={styles.heading}>Account Settings</h1>
          <p className={styles.metaText}>MANAGE YOUR PROFILE DETAILS AND LINK CODING ACCOUNTS.</p>
        </div>

        <div className={styles.layout}>
          {/* Left Column: Personal Details & Readonly info */}
          <div className={styles.formPanel}>
            <h2 className={styles.formTitle}>
              <span className={styles.formTitleIndicator} />
              PERSONAL DETAILS
            </h2>
            <form onSubmit={handleSaveDetails} className={styles.form}>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>First Name</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={styles.consoleInput}
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Last Name</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={styles.consoleInput}
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className={`${styles.consoleInput} ${styles.consoleSelect}`}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSavingDetails}
                className={styles.submitBtn}
              >
                <div className={styles.submitBtnScanline} />
                {isSavingDetails ? 'SAVING...' : 'SAVE DETAILS'}
              </button>
            </form>

            {/* Read-only details */}
            <div className="space-y-4 pt-4 border-t border-zinc-800/40">
              <h3 className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mb-4">SVNIT Student Info</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className={styles.inputGroup}>
                  <span className={styles.inputLabel}>Roll Number</span>
                  <div className={styles.readonlyValue}>{dbUser.rollNumber || '—'}</div>
                </div>
                <div className={styles.inputGroup}>
                  <span className={styles.inputLabel}>Branch</span>
                  <div className={styles.readonlyValue}>{dbUser.branch || '—'}</div>
                </div>
                <div className={styles.inputGroup}>
                  <span className={styles.inputLabel}>Graduation Year</span>
                  <div className={styles.readonlyValue}>{dbUser.graduationBatch || '—'}</div>
                </div>
                <div className={styles.inputGroup}>
                  <span className={styles.inputLabel}>Email Address</span>
                  <div className={styles.readonlyValue}>{dbUser.email}</div>
                </div>
              </div>
            </div>

            {/* Direct Link to public profile dashboard */}
            {dbUser.leaderboardSlug && (
              <div className="pt-4 border-t border-zinc-800/40">
                <Link
                  href={`/leaderboard/student/${dbUser.leaderboardSlug}`}
                  className={styles.viewProfileBtn}
                >
                  View My Public Dashboard
                </Link>
              </div>
            )}
          </div>

          {/* Right Column: Platform Linking */}
          <div className={styles.formPanel}>
            <h2 className={styles.formTitle}>
              <span className={styles.formTitleIndicator} />
              CODING PLATFORM CONNECTIONS
            </h2>
            <div className="flex flex-col gap-4">
              
              {/* LeetCode */}
              <div className={`${styles.platformItem} ${dbUser.leetcodeUsername ? styles.platformItemLinked : ''}`}>
                <div className={styles.platformHeader}>
                  <span className={styles.platformName}>LeetCode</span>
                  <span className={`${styles.platformStatus} ${dbUser.leetcodeUsername ? styles.statusLinked : styles.statusUnlinked}`}>
                    {dbUser.leetcodeUsername ? 'Linked' : 'Not Connected'}
                  </span>
                </div>
                <div className={styles.platformInputWrapper}>
                  <input
                    type="text"
                    placeholder="LeetCode Username"
                    value={leetcode}
                    onChange={(e) => setLeetcode(e.target.value)}
                    disabled={!!dbUser.leetcodeUsername || linkingPlatform === 'leetcode'}
                    className={styles.consoleInput}
                  />
                  {dbUser.leetcodeUsername ? (
                    <button
                      onClick={() => handleLinkPlatform('leetcode', 'unlink')}
                      disabled={linkingPlatform === 'leetcode'}
                      className={`${styles.actionBtn} ${styles.dangerBtn}`}
                    >
                      {linkingPlatform === 'leetcode' ? 'Unlinking...' : 'Unlink'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleLinkPlatform('leetcode', 'link')}
                      disabled={linkingPlatform === 'leetcode'}
                      className={`${styles.actionBtn} ${styles.primaryBtn}`}
                    >
                      {linkingPlatform === 'leetcode' ? 'Linking...' : 'Link'}
                    </button>
                  )}
                </div>
              </div>

              {/* Codeforces */}
              <div className={`${styles.platformItem} ${dbUser.codeforcesHandle ? styles.platformItemLinked : ''}`}>
                <div className={styles.platformHeader}>
                  <span className={styles.platformName}>Codeforces</span>
                  <span className={`${styles.platformStatus} ${dbUser.codeforcesHandle ? styles.statusLinked : styles.statusUnlinked}`}>
                    {dbUser.codeforcesHandle ? 'Linked' : 'Not Connected'}
                  </span>
                </div>
                <div className={styles.platformInputWrapper}>
                  <input
                    type="text"
                    placeholder="Codeforces Handle"
                    value={codeforces}
                    onChange={(e) => setCodeforces(e.target.value)}
                    disabled={!!dbUser.codeforcesHandle || linkingPlatform === 'codeforces'}
                    className={styles.consoleInput}
                  />
                  {dbUser.codeforcesHandle ? (
                    <button
                      onClick={() => handleLinkPlatform('codeforces', 'unlink')}
                      disabled={linkingPlatform === 'codeforces'}
                      className={`${styles.actionBtn} ${styles.dangerBtn}`}
                    >
                      {linkingPlatform === 'codeforces' ? 'Unlinking...' : 'Unlink'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleLinkPlatform('codeforces', 'link')}
                      disabled={linkingPlatform === 'codeforces'}
                      className={`${styles.actionBtn} ${styles.primaryBtn}`}
                    >
                      {linkingPlatform === 'codeforces' ? 'Linking...' : 'Link'}
                    </button>
                  )}
                </div>
              </div>

              {/* CodeChef */}
              <div className={`${styles.platformItem} ${dbUser.codechefUsername ? styles.platformItemLinked : ''}`}>
                <div className={styles.platformHeader}>
                  <span className={styles.platformName}>CodeChef</span>
                  <span className={`${styles.platformStatus} ${dbUser.codechefUsername ? styles.statusLinked : styles.statusUnlinked}`}>
                    {dbUser.codechefUsername ? 'Linked' : 'Not Connected'}
                  </span>
                </div>
                <div className={styles.platformInputWrapper}>
                  <input
                    type="text"
                    placeholder="CodeChef Username"
                    value={codechef}
                    onChange={(e) => setCodechef(e.target.value)}
                    disabled={!!dbUser.codechefUsername || linkingPlatform === 'codechef'}
                    className={styles.consoleInput}
                  />
                  {dbUser.codechefUsername ? (
                    <button
                      onClick={() => handleLinkPlatform('codechef', 'unlink')}
                      disabled={linkingPlatform === 'codechef'}
                      className={`${styles.actionBtn} ${styles.dangerBtn}`}
                    >
                      {linkingPlatform === 'codechef' ? 'Unlinking...' : 'Unlink'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleLinkPlatform('codechef', 'link')}
                      disabled={linkingPlatform === 'codechef'}
                      className={`${styles.actionBtn} ${styles.primaryBtn}`}
                    >
                      {linkingPlatform === 'codechef' ? 'Linking...' : 'Link'}
                    </button>
                  )}
                </div>
              </div>

              {/* GitHub */}
              <div className={`${styles.platformItem} ${dbUser.githubUsername ? styles.platformItemLinked : ''}`}>
                <div className={styles.platformHeader}>
                  <span className={styles.platformName}>GitHub</span>
                  <span className={`${styles.platformStatus} ${dbUser.githubUsername ? styles.statusLinked : styles.statusUnlinked}`}>
                    {dbUser.githubUsername ? 'Linked' : 'Not Connected'}
                  </span>
                </div>
                <div className={styles.platformInputWrapper}>
                  <input
                    type="text"
                    placeholder="GitHub Username"
                    value={github}
                    onChange={(e) => setGithub(e.target.value)}
                    disabled={!!dbUser.githubUsername || linkingPlatform === 'github'}
                    className={styles.consoleInput}
                  />
                  {dbUser.githubUsername ? (
                    <button
                      onClick={() => handleLinkPlatform('github', 'unlink')}
                      disabled={linkingPlatform === 'github'}
                      className={`${styles.actionBtn} ${styles.dangerBtn}`}
                    >
                      {linkingPlatform === 'github' ? 'Unlinking...' : 'Unlink'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleLinkPlatform('github', 'link')}
                      disabled={linkingPlatform === 'github'}
                      className={`${styles.actionBtn} ${styles.primaryBtn}`}
                    >
                      {linkingPlatform === 'github' ? 'Linking...' : 'Link'}
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
