'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export interface ActiveUser {
  userId: string;
  userName: string;
  userRole: 'admin' | 'partner';
}

export function useActiveUser() {
  const [user, setUser] = useState<ActiveUser | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
    const storedUser = localStorage.getItem('activeUser');
    if (!storedUser) {
      setUser(null);
      router.replace('/');
    } else {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
      } catch {
        router.replace('/');
      }
    }
  }, [router]);

  return { 
    user, 
    loading: !isMounted || !user 
  };
}
