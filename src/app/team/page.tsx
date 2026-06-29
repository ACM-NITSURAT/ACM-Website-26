import type { Metadata } from 'next';
import TeamSection from '@/components/sections/TeamSection';

export const metadata: Metadata = {
  title: 'Team — ACM NIT SURAT',
  description:
    'Meet the team behind ACM Student Chapter at NIT Surat — developers, designers, problem setters, and more.',
};

export default function TeamPage() {
  return (
    <main
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        overflowX: 'hidden',
      }}
    >
      <TeamSection />
    </main>
  );
}
