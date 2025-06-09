'use client';

import React from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import CreditBalance from '@/components/ui/CreditBalance';

const Header: React.FC = () => {
  const { data: session, status } = useSession();

  return (
    <header className="bg-gray-800 text-white p-4 shadow-md">
      <div className="container mx-auto flex items-center justify-between">
        <Link href="/" className="text-xl font-semibold hover:text-gray-300">
          Paperbacks.AI
        </Link>
        
        <nav className="flex items-center space-x-4">
          {status === 'loading' ? (
            <div className="text-gray-300">Loading...</div>
          ) : session ? (
            <>
              <Link href="/editor" className="hover:text-gray-300">
                Editor
              </Link>
              <Link href="/credits" className="hover:text-gray-300">
                Buy Credits
              </Link>
              <Link href="/transactions" className="hover:text-gray-300">
                Transactions
              </Link>
              <CreditBalance />
              <div className="flex items-center space-x-3">
                {session.user?.image && (
                  <Image
                    src={session.user.image}
                    alt={session.user.name || 'User'}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <span className="text-sm">
                  {session.user?.name || session.user?.email}
                </span>
                <button
                  onClick={() => signOut()}
                  className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
                >
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={() => signIn()}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
            >
              Sign In
            </button>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header; 