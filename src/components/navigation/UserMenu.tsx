'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth, logout } from '@/lib/firebase';
import styles from './UserMenu.module.css';

export default function UserMenu() {
  const { user, role, loading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [isOpen]);

  if (loading) {
    return <div className={styles.placeholder} />;
  }

  if (!user) {
    return (
      <Link href="/login" className={styles.loginBtn}>
        Sign In
      </Link>
    );
  }

  const initials = (user.displayName ?? user.email ?? '?')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = async () => {
    await logout();
    setIsOpen(false);
    router.push('/login');
  };

  return (
    <div className={styles.container} ref={menuRef}>
      <button 
        className={styles.avatarBtn} 
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label="User menu"
      >
        {user.photoURL ? (
          <Image 
            src={user.photoURL} 
            alt={user.displayName ?? 'Profile'} 
            width={36} 
            height={36} 
            className={styles.avatarImg}
          />
        ) : (
          <div className={styles.avatarFallback}>{initials}</div>
        )}
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.userInfo}>
            <p className={styles.userName}>{user.displayName || 'Student'}</p>
            <p className={styles.userEmail}>{user.email}</p>
            {role && <span className={styles.userRole}>{role}</span>}
          </div>
          
          <div className={styles.divider} />
          
          <Link href="/profile" className={styles.menuItem} onClick={() => setIsOpen(false)}>
            My Profile
          </Link>
          <Link href="/leaderboard/link-profiles" className={styles.menuItem} onClick={() => setIsOpen(false)}>
            Link Coding Profiles
          </Link>
          {role === 'admin' && (
            <Link href="/admin" className={styles.menuItem} onClick={() => setIsOpen(false)}>
              Admin Dashboard
            </Link>
          )}
          
          <div className={styles.divider} />
          
          <button onClick={handleLogout} className={styles.logoutBtn}>
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
