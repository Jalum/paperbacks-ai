'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { analytics } from '@/lib/analytics';
// import Header from '@/components/layout/Header'; // Removed, handled by root layout
import BookInfoForm from '@/components/editor/BookInfoForm';
import CoverUpload from '@/components/editor/CoverUpload';
import CoverPreview from '@/components/editor/CoverPreview';
import SpineControls from '@/components/editor/SpineControls';
import BackCoverControls from '@/components/editor/BackCoverControls';
import ProjectControls from '@/components/editor/ProjectControls';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function EditorPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Still loading
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    
    // Track editor page view
    analytics.trackPageView('editor', session.user?.email || undefined);
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="flex flex-col justify-center items-center min-h-[400px] space-y-4">
        <LoadingSpinner size="lg" />
        <div className="text-lg text-gray-600">Loading editor...</div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect to signin
  }

  return (
    // The div below used to be: <div className="flex flex-col min-h-screen">
    // Root layout now handles flex-col and min-h-screen for sticky footer.
    // The main tag in root layout provides container, mx-auto, px-4, py-8.
    // This page specific div will just manage the grid layout for its children.
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Left Column: Controls */}
      <div className="md:col-span-1 space-y-6">
        <ProjectControls />
        <BookInfoForm />
        <CoverUpload />
        <SpineControls />
      </div>

      {/* Center Column: Preview */}
      <div className="md:col-span-2">
        <CoverPreview />
      </div>

      {/* Right Column: Back Cover Controls */}
      <div className="md:col-span-1">
        <BackCoverControls />
      </div>
    </div>
    // Footer removed, handled by root layout
  );
} 