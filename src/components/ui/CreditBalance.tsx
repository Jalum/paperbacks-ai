'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export default function CreditBalance() {
  const { data: session } = useSession();
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }

    const fetchCredits = async () => {
      try {
        const response = await fetch('/api/user/credits');
        if (response.ok) {
          const data = await response.json();
          setCredits(data.credits);
        }
      } catch (error) {
        console.error('Failed to fetch credits:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCredits();
  }, [session]);

  if (!session || loading) {
    return null;
  }

  return (
    <div className="flex items-center space-x-1 bg-yellow-600 text-white px-2 py-1 rounded text-sm">
      <span>💰</span>
      <span>{credits !== null ? credits : '...'} credits</span>
    </div>
  );
}