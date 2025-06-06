'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Still loading
    
    if (session) {
      router.push('/editor');
      return;
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (session) {
    return null; // Will redirect to editor
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="min-h-[600px] flex flex-col items-center justify-center text-center px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <span>✨</span>
              <span>AI-Powered Book Cover Design</span>
            </div>
          </div>
          
          <h1 className="text-6xl font-bold text-gray-900 mb-6">
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Paperbacks.AI
            </span>
          </h1>
          
          <p className="text-xl text-gray-700 mb-8 leading-relaxed max-w-3xl mx-auto">
            Create professional paperback book covers with AI assistance. Perfect spine calculations, 
            customizable layouts, and print-ready exports for KDP and other print-on-demand services.
          </p>
          
          <div className="space-y-4 mb-12">
            <Link
              href="/auth/signin"
              className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-10 rounded-xl text-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              Start Creating Free
            </Link>
            <p className="text-sm text-gray-600">
              ✅ 100 free credits to get started • No credit card required
            </p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Everything you need to create stunning book covers
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <div className="text-blue-600 text-5xl mb-4">🎨</div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">AI-Powered Design</h3>
              <p className="text-gray-700">Generate unique cover artwork with DALL-E integration. Just describe your vision and watch it come to life.</p>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <div className="text-green-600 text-5xl mb-4">📐</div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">Perfect Spine Calculations</h3>
              <p className="text-gray-700">Automatic spine width calculations based on page count and paper type, following KDP guidelines perfectly.</p>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <div className="text-purple-600 text-5xl mb-4">💾</div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">Print-Ready Exports</h3>
              <p className="text-gray-700">High-resolution 300 DPI PNG and PDF exports with proper bleed areas, ready for any print service.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            Why Choose Paperbacks.AI?
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="text-green-500 text-xl">✅</div>
                <div className="text-left">
                  <h4 className="font-semibold text-gray-900">Save Hours of Design Time</h4>
                  <p className="text-gray-600">Create professional covers in minutes, not hours</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="text-green-500 text-xl">✅</div>
                <div className="text-left">
                  <h4 className="font-semibold text-gray-900">Publisher-Ready Output</h4>
                  <p className="text-gray-600">Meets KDP and print-on-demand specifications</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="text-green-500 text-xl">✅</div>
                <div className="text-left">
                  <h4 className="font-semibold text-gray-900">No Design Experience Needed</h4>
                  <p className="text-gray-600">User-friendly interface guides you through every step</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="text-green-500 text-xl">✅</div>
                <div className="text-left">
                  <h4 className="font-semibold text-gray-900">Cloud-Based & Secure</h4>
                  <p className="text-gray-600">Access your projects anywhere, automatic saves</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="text-green-500 text-xl">✅</div>
                <div className="text-left">
                  <h4 className="font-semibold text-gray-900">Custom Typography</h4>
                  <p className="text-gray-600">20+ professional fonts and complete customization</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="text-green-500 text-xl">✅</div>
                <div className="text-left">
                  <h4 className="font-semibold text-gray-900">Pattern Library</h4>
                  <p className="text-gray-600">10+ background patterns and gradient options</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Create Your Perfect Book Cover?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join authors who are already creating stunning covers with Paperbacks.AI
          </p>
          <Link
            href="/auth/signin"
            className="inline-block bg-white text-blue-600 font-bold py-4 px-10 rounded-xl text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            Get Started Free Today
          </Link>
        </div>
      </div>
    </div>
  );
}
