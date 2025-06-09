'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Still loading
    
    if (session) {
      // User is authenticated, redirect to editor
      router.push('/editor');
    } else if (status === 'unauthenticated') {
      // User is not authenticated, redirect to sign in
      router.push('/auth/signin');
    }
  }, [session, status, router]);

  // Show loading state while checking authentication
  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="text-lg">Loading...</div>
    </div>
  );
}
