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
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Leaderboard Admin</h1>
          <p className="text-zinc-400 mt-1">Manage global leaderboard ranks and sync platform data.</p>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/50 flex flex-col gap-4">
          <div>
            <h3 className="font-semibold text-white mb-1">Force Full Sync</h3>
            <p className="text-sm text-zinc-400">
              Manually triggers the background cron job to fetch latest stats for ALL students.
            </p>
          </div>
          <button
            onClick={handleSyncAll}
            disabled={isSyncingAll || isLoading}
            className="self-start px-4 py-2 rounded-md bg-zinc-100 text-zinc-950 text-sm font-medium hover:bg-white transition-colors disabled:opacity-50"
          >
            {isSyncingAll ? 'Syncing...' : 'Sync All Profiles'}
          </button>
        </div>

        <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/50 flex flex-col gap-4">
          <div>
            <h3 className="font-semibold text-white mb-1">Recalculate Ranks</h3>
            <p className="text-sm text-zinc-400">
              Recomputes Overall Rank, Branch Rank, and Year Rank based on current ACM scores.
            </p>
          </div>
          <button
            onClick={handleRecalculate}
            disabled={isRecalculating || isLoading}
            className="self-start px-4 py-2 rounded-md bg-zinc-800 text-zinc-100 border border-zinc-700 text-sm font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            {isRecalculating ? 'Recalculating...' : 'Recalculate Now'}
          </button>
        </div>
      </div>

      {/* Linked Students */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Linked Students ({students.length})</h2>
        
        {isLoading ? (
          <div className="text-zinc-500 py-8">Loading students...</div>
        ) : (
          <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-900/30">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/50">
                    <th className="p-4 text-xs font-medium text-zinc-400 uppercase tracking-wider">Rank</th>
                    <th className="p-4 text-xs font-medium text-zinc-400 uppercase tracking-wider">Student</th>
                    <th className="p-4 text-xs font-medium text-zinc-400 uppercase tracking-wider">Score</th>
                    <th className="p-4 text-xs font-medium text-zinc-400 uppercase tracking-wider">Last Sync</th>
                    <th className="p-4 text-xs font-medium text-zinc-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {students.map(student => (
                    <tr key={student.uid} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="p-4 text-sm font-semibold text-zinc-300">#{student.rank || '?'}</td>
                      <td className="p-4">
                        <div className="font-medium text-zinc-200">{student.displayName}</div>
                        <div className="text-xs text-zinc-500 mt-0.5">{student.rollNumber} • {student.branch}</div>
                        <div className="text-xs text-zinc-600 mt-1 flex gap-2">
                          {student.platforms.leetcode && <span>LC</span>}
                          {student.platforms.codeforces && <span>CF</span>}
                          {student.platforms.codechef && <span>CC</span>}
                          {student.platforms.github && <span>GH</span>}
                        </div>
                      </td>
                      <td className="p-4 text-sm font-medium text-[#00E5FF]">{student.score.toFixed(1)}</td>
                      <td className="p-4 text-sm text-zinc-500">
                        {student.lastSync ? new Date(student.lastSync).toLocaleString() : 'Never'}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleSyncUser(student.uid)}
                          disabled={syncingUid === student.uid}
                          className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors disabled:opacity-50"
                        >
                          {syncingUid === student.uid ? '...' : 'Sync'}
                        </button>
                        <button
                          onClick={() => handleUnlinkUser(student.uid)}
                          disabled={unlinkingUid === student.uid}
                          className="px-3 py-1.5 rounded bg-red-950/30 text-red-400 hover:bg-red-950/50 hover:text-red-300 border border-red-900/30 text-xs font-medium transition-colors disabled:opacity-50"
                        >
                          {unlinkingUid === student.uid ? '...' : 'Unlink'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {students.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-zinc-500">
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
