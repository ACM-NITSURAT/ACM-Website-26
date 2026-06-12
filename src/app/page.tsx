import CinemaLoader from "@/components/loading/CinemaLoader";

export default function Home() {
  return (
    <CinemaLoader>
      <div className="flex flex-col flex-1 items-center justify-center min-h-[200vh] bg-zinc-950 font-sans">
        <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-start pt-[30vh] px-16">
          <h1 className="text-4xl font-semibold text-white tracking-tight mb-4">
            ACM NIT SURAT
          </h1>
          <p className="text-lg text-zinc-400 text-center max-w-md">
            Welcome to the ACM Student Chapter at SVNIT, Surat.
          </p>
          
          <div className="mt-64 text-zinc-500">
            Scroll down to see the navbar condensation and cinematic backdrop effect.
          </div>
        </main>
      </div>
    </CinemaLoader>
  );
}
