'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ActiveUser {
  userId: string;
  userName: string;
  userRole: 'admin' | 'partner';
}

export function useActiveUser() {
  const [user, setUser] = useState<ActiveUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('activeUser');
    if (!storedUser) {
      router.push('/');
    } else {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, [router]);

  return { user, loading };
}
