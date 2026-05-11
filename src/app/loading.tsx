import { Lock } from 'lucide-react';

export default function Loading() {
  return (
    <div className="app-container flex flex-col items-center justify-center bg-[#141414]">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-netflix-red text-4xl font-bold tracking-tighter animate-pulse flex items-center gap-2">US <Lock size={28} strokeWidth={3} /></h1>
        <p className="text-secondary-text text-xs tracking-[0.2em] font-medium uppercase">
          Loading your space...
        </p>
      </div>
    </div>
  );
}
