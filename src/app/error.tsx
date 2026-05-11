'use client';

import { useEffect } from 'react';
import { HeartCrack } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="app-container flex flex-col items-center justify-center bg-[#141414] p-6 text-center">
      <HeartCrack size={60} className="text-netflix-red mb-6" />
      <h2 className="text-white text-2xl font-bold mb-2">Something went wrong</h2>
      <p className="text-secondary-text text-sm mb-8 max-w-[280px]">
        We encountered an error while loading your private space.
      </p>
      
      <div className="flex flex-col gap-3 w-full max-w-[200px]">
        <button
          onClick={() => reset()}
          className="w-full py-3 bg-netflix-red text-white font-bold rounded-xl active:scale-95 transition-all"
        >
          Try Again
        </button>
        <button
          onClick={() => window.location.href = '/'}
          className="w-full py-3 border border-white/10 text-secondary-text font-bold rounded-xl active:bg-white/5 transition-all"
        >
          Go Home
        </button>
      </div>
    </div>
  );
}
