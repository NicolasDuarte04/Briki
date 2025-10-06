'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { createBrowserSupabase } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export function LandingNavigation() {
  const [isDetached, setIsDetached] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    checkUser();

    const scrollContainer = document.querySelector('.landing-scroll');
    if (!scrollContainer) return;

    const handleScroll = () => {
      const heroHeight = scrollContainer.clientHeight * 0.9;
      setIsDetached(scrollContainer.scrollTop > heroHeight);
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial state on mount

    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Features', href: '#how' },
    { label: 'Demo', href: '#demo' },
    { label: 'Pricing', href: '#pricing' },
  ];

  const AuthButton = ({ detached }: { detached: boolean }) => {
    if (user) {
      return (
        <Link href="/login">
          <Button
            className={detached
              ? "rounded-full px-4 py-1 h-8 text-sm"
              : "rounded-full px-4 py-1 h-8 text-sm bg-white/10 text-white hover:bg-white/20 border border-white/20"
            }
            style={detached ? { backgroundColor: 'var(--briki-primary)' } : {}}
          >
            Start
          </Button>
        </Link>
      );
    }

    return (
      <Link href="/login">
        <Button
          className={detached
            ? "rounded-full px-4 py-1 h-8 text-sm"
            : "rounded-full px-4 py-1 h-8 text-sm bg-white/10 text-white hover:bg-white/20 border border-white/20"
          }
          style={detached ? { backgroundColor: 'var(--briki-primary)' } : {}}
        >
          Start
        </Button>
      </Link>
    );
  };

  if (isDetached) {
    return (
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300">
        <div className="bg-white rounded-full px-6 py-2.5 shadow-[0_4px_16px_rgba(15,23,42,0.1)] flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <Image 
              src="/brand/briki-logo-2.png" 
              alt="" 
              aria-hidden="true"
              width={24} 
              height={24} 
            />
            <span className="text-sm" style={{ color: 'var(--briki-text)', fontWeight: '500' }}>Briki</span>
          </Link>
          <div className="flex items-center gap-6">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm hover:opacity-70 transition-opacity"
                style={{ color: 'var(--briki-text-muted)', fontSize: '0.875rem' }}
              >
                {link.label}
              </a>
            ))}
          </div>
          <AuthButton detached={true} />
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300">
      <div className="max-w-screen-2xl mx-auto px-8">
        <div className="rounded-2xl bg-white/5 backdrop-blur-md px-6 py-3 flex items-center justify-between mt-6 border border-white/10">
          <Link href="/" className="flex items-center gap-2">
            <Image 
              src="/brand/briki-logo-2.png" 
              alt="" 
              aria-hidden="true"
              width={24} 
              height={24} 
              className="opacity-90"
            />
            <span className="text-sm text-white" style={{ fontWeight: '500' }}>Briki</span>
          </Link>
          <div className="flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-white/80 hover:text-white transition-colors"
                style={{ fontSize: '0.875rem' }}
              >
                {link.label}
              </a>
            ))}
            <AuthButton detached={false} />
          </div>
        </div>
      </div>
    </nav>
  );
}

