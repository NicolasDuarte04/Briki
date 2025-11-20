'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { signOut } from '@/app/[locale]/(auth)/actions';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function ProfileNav() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    
    setIsSigningOut(true);
    try {
      await signOut();
      // The redirect will happen in the server action
    } catch (error) {
      console.error('Sign out error:', error);
      // Force a page reload as fallback
      setIsSigningOut(false);
      window.location.href = '/';
    }
  };

  return (
    <nav className="border-b border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image 
              src="/brand/briki-logo-2.png" 
              alt="" 
              aria-hidden="true"
              width={24} 
              height={24} 
            />
            <span className="text-lg font-semibold">Briki</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <Link 
              href="/" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Home
            </Link>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleSignOut}
              disabled={isSigningOut}
            >
              {isSigningOut ? 'Signing out...' : 'Sign out'}
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
