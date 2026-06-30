'use client';

import { useState, useEffect } from 'react';
import { useAuth, auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

interface AdminStudent {
  uid: string;
  displayName: string;
  rollNumber: string;
  branch: string;
  currentYear: number;
  score: number;
  rank: number;
  lastSync: string | null;
  platforms: {
    leetcode: string | null;
    codeforces: string | null;
    codechef: string | null;
    github: string | null;
  };
}

export default function LeaderboardAdminPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [syncingUid, setSyncingUid] = useState<string | null>(null);
  const [unlinkingUid, setUnlinkingUid] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || (role !== 'core' && role !== 'adviser'))) {
      router.replace('/');
    }
  }, [user, role, loading, router]);

  const loadStudents = async () => {
    if (!auth.currentUser) return;
    try {
      setIsLoading(true);
      const token = await auth.currentUser.getIdToken();
      const res = await fetch('/api/admin/leaderboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setStudents(data.students);
      } else {
        alert('Failed to load students: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Error loading students');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && (role === 'core' || role === 'adviser')) {
      loadStudents();
    }
  }, [user, role]);

  const handleSyncAll = async () => {
    if (!auth.currentUser) return;
    if (!confirm('Are you sure you want to run a full sync? This fetches stats for ALL students from all platforms and may take several minutes.')) return;
    try {
      setIsSyncingAll(true);
      const token = await auth.currentUser.getIdToken();
      const res = await fetch('/api/leaderboard/sync', { 
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        alert(`Full Sync Complete!\nSynced: ${data.summary.synced}\nSkipped: ${data.summary.skipped}\nErrors: ${data.summary.errors}`);
        loadStudents();
      } else {
        alert('Sync failed: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Error running full sync');
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleRecalculate = async () => {
    if (!auth.currentUser) return;
    if (!confirm('Are you sure you want to recalculate all overall ranks and scores?')) return;
    try {
      setIsRecalculating(true);
      const token = await auth.currentUser.getIdToken();
      const res = await fetch('/api/leaderboard/recalculate', { 
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        alert('Ranks recalculated successfully!');
        loadStudents();
      } else {
        alert('Recalculate failed: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Error recalculating ranks');
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleSyncUser = async (uid: string) => {
    if (!auth.currentUser) return;
    try {
      setSyncingUid(uid);
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`/api/admin/leaderboard/${uid}/sync`, { 
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        alert(`Synced User successfully. Status: ${data.status}`);
        loadStudents();
      } else {
        alert('Sync failed: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Error syncing user');
    } finally {
      setSyncingUid(null);
    }
  };

  const handleUnlinkUser = async (uid: string) => {
    if (!auth.currentUser) return;
    if (!confirm('DANGER! Are you sure you want to unlink all platforms and delete this student from the leaderboard?')) return;
    try {
      setUnlinkingUid(uid);
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`/api/admin/leaderboard/${uid}/unlink`, { 
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        alert('Unlinked successfully!');
        setStudents(prev => prev.filter(s => s.uid !== uid));
      } else {
        alert('Unlink failed: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Error unlinking user');
    } finally {
      setUnlinkingUid(null);
    }
  };

  if (loading || !user) {
    return null;
  }

  return (
    <div className="p-8 pb-32 max-w-7xl mx-auto space-y-12">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/5 pb-8">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight" style={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}>
            Leaderboard <span className="text-indigo-400">Admin</span>
          </h1>
          <p className="text-zinc-500 font-mono text-sm tracking-widest uppercase mt-3">
            Manage global ranks & trigger manual syncs
          </p>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl border border-white/5 bg-[#12121a] flex flex-col gap-5 transition-colors hover:border-white/10">
          <div>
            <h3 className="text-lg font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}>Force Full Sync</h3>
            <p className="text-xs text-zinc-500 leading-relaxed font-mono">
              Manually triggers the background cron job to fetch latest stats for ALL students.
              This bypasses normal caching intervals.
            </p>
          </div>
          <button
            onClick={handleSyncAll}
            disabled={isSyncingAll || isLoading}
            className="self-start px-6 py-3 rounded-xl bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-widest transition-colors hover:bg-indigo-500 disabled:opacity-50 font-mono flex items-center gap-2 mt-auto"
          >
            {isSyncingAll ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" /><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" /></svg>
                Syncing...
              </>
            ) : 'Sync All Profiles'}
          </button>
        </div>

        <div className="p-6 rounded-2xl border border-white/5 bg-[#12121a] flex flex-col gap-5 transition-colors hover:border-white/10">
          <div>
            <h3 className="text-lg font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}>Recalculate Ranks</h3>
            <p className="text-xs text-zinc-500 leading-relaxed font-mono">
              Recomputes Overall Rank, Branch Rank, and Year Rank based on current total ACM scores.
            </p>
          </div>
          <button
            onClick={handleRecalculate}
            disabled={isRecalculating || isLoading}
            className="self-start px-6 py-3 rounded-xl bg-black/60 text-zinc-300 border border-white/10 text-[10px] font-bold uppercase tracking-widest transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50 font-mono mt-auto"
          >
            {isRecalculating ? 'Recalculating...' : 'Recalculate Now'}
          </button>
        </div>
      </div>

      {/* Linked Students */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}>
          Linked Students <span className="text-zinc-500 font-normal">({students.length})</span>
        </h2>
        
        {isLoading ? (
          <div className="text-zinc-500 py-12 text-center font-mono text-sm uppercase tracking-widest flex items-center justify-center gap-3">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" /><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" /></svg>
            Loading students...
          </div>
        ) : (
          <div className="rounded-2xl border border-white/5 overflow-hidden bg-[#12121a]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-black/40">
                    <th className="p-5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Rank</th>
                    <th className="p-5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Student</th>
                    <th className="p-5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Score</th>
                    <th className="p-5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Last Sync</th>
                    <th className="p-5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {students.map(student => (
                    <tr key={student.uid} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="p-5 text-sm font-bold text-indigo-400 font-mono">
                        #{student.rank || '?'}
                      </td>
                      <td className="p-5">
                        <div className="font-semibold text-white" style={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}>{student.displayName}</div>
                        <div className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider font-mono">
                          {student.rollNumber} <span className="text-white/20 mx-1">•</span> {student.branch}
                        </div>
                        <div className="text-[10px] mt-2 flex gap-1.5 font-bold tracking-widest font-mono uppercase">
                          {student.platforms.leetcode && <span className="bg-[#ffa116]/10 text-[#ffa116] border border-[#ffa116]/20 px-1.5 py-0.5 rounded">LC</span>}
                          {student.platforms.codeforces && <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded">CF</span>}
                          {student.platforms.codechef && <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded">CC</span>}
                          {student.platforms.github && <span className="bg-white/10 text-zinc-300 border border-white/20 px-1.5 py-0.5 rounded">GH</span>}
                        </div>
                      </td>
                      <td className="p-5 text-base font-black text-cyan-400" style={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}>
                        {student.score.toFixed(1)}
                      </td>
                      <td className="p-5 text-xs text-zinc-500 font-mono">
                        {student.lastSync ? new Date(student.lastSync).toLocaleString() : 'Never'}
                      </td>
                      <td className="p-5 text-right space-x-2">
                        <button
                          onClick={() => handleSyncUser(student.uid)}
                          disabled={syncingUid === student.uid}
                          className="px-4 py-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50 font-mono"
                        >
                          {syncingUid === student.uid ? 'Syncing...' : 'Sync'}
                        </button>
                        <button
                          onClick={() => handleUnlinkUser(student.uid)}
                          disabled={unlinkingUid === student.uid}
                          className="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 border border-red-500/20 text-[10px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50 font-mono"
                        >
                          {unlinkingUid === student.uid ? '...' : 'Unlink'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {students.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-zinc-500 text-sm font-mono uppercase tracking-widest">
                        No students have linked their profiles yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
