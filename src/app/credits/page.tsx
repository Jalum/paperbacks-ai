'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import CreditBalance from '@/components/ui/CreditBalance';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Button from '@/components/ui/Button';

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  priceCents: number;
  description: string | null;
  popular: boolean;
}

export default function CreditsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    fetchCreditPackages();
  }, []);

  const fetchCreditPackages = async () => {
    try {
      const response = await fetch('/api/credit-packages');
      if (response.ok) {
        const data = await response.json();
        setPackages(data);
      }
    } catch (error) {
      console.error('Failed to fetch credit packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (packageId: string) => {
    setPurchasing(packageId);
    try {
      const response = await fetch('/api/stripe/checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ creditPackageId: packageId }),
      });

      if (response.ok) {
        const { checkoutUrl } = await response.json();
        // Redirect to Stripe Checkout
        window.location.href = checkoutUrl;
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      alert('Failed to process purchase. Please try again.');
    } finally {
      setPurchasing(null);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Purchase Credits
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Get more credits to continue creating amazing book covers
          </p>
          {session && <CreditBalance />}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`relative bg-white rounded-lg shadow-lg p-6 ${
                pkg.popular ? 'ring-2 ring-indigo-600' : ''
              }`}
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}
              
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {pkg.name}
                </h3>
                
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">
                    ${(pkg.priceCents / 100).toFixed(2)}
                  </span>
                </div>
                
                <div className="text-3xl font-bold text-indigo-600 mb-2">
                  {pkg.credits} Credits
                </div>
                
                <p className="text-sm text-gray-500 mb-1">
                  ${((pkg.priceCents / 100) / pkg.credits).toFixed(3)} per credit
                </p>
                
                {pkg.description && (
                  <p className="text-gray-600 text-sm mb-6">
                    {pkg.description}
                  </p>
                )}
                
                <Button
                  onClick={() => handlePurchase(pkg.id)}
                  disabled={purchasing === pkg.id}
                  variant={pkg.popular ? 'primary' : 'secondary'}
                  className="w-full"
                >
                  {purchasing === pkg.id ? (
                    <span className="flex items-center justify-center">
                      <LoadingSpinner size="sm" />
                      <span className="ml-2">Processing...</span>
                    </span>
                  ) : (
                    'Purchase'
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center text-gray-600">
          <p className="mb-2">
            <strong>What are credits used for?</strong>
          </p>
          <ul className="space-y-1">
            <li>PNG Export: 3 credits</li>
            <li>PDF Export: 5 credits</li>
            <li>AI Image Generation: 10 credits</li>
          </ul>
        </div>
      </div>
    </div>
  );
}