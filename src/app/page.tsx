import CinemaLoader from "@/components/loading/CinemaLoader";
import HeroSection from "@/components/sections/HeroSection";

export default function Home() {
  return (
    <CinemaLoader>
      <HeroSection />
      {/* Spacer for scroll testing — will be replaced by real sections */}
      <div style={{ height: '100vh', background: '#0a0a0a' }} />
    </CinemaLoader>
  );
}
