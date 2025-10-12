'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Image from 'next/image';
import Link from 'next/link';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { signOut } from '@/app/[locale]/(auth)/actions';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

export function LandingNavigation() {
  const [isDetached, setIsDetached] = useState(false);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const locale = useLocale();
  const router = useRouter();
  const { user, status, ready } = useAuth();

  // Close dropdown and clear profile name when user signs out
  useEffect(() => {
    if (ready && status === 'unauthenticated') {
      setDropdownOpen(false);
      setProfileName(null);
    }
  }, [status, ready]);

  useEffect(() => {
    // Only fetch profile data once auth provider is ready
    if (!ready) {
      return;
    }

    const supabase = createBrowserSupabase();

    const deriveMetadataName = () => {
      if (!user?.user_metadata) {
        return null;
      }

      const metadata = user.user_metadata as {
        full_name?: unknown;
        name?: unknown;
      };

      const raw =
        (typeof metadata.full_name === 'string' && metadata.full_name) ||
        (typeof metadata.name === 'string' && metadata.name) ||
        null;

      return raw?.trim() ? raw.trim() : null;
    };

    const resolveProfileName = async () => {
      if (!user) {
        setProfileName(null);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile name:', profileError);
      }

      const dbName =
        typeof profileData?.display_name === 'string'
          ? profileData.display_name.trim()
          : null;

      setProfileName(
        dbName && dbName.length > 0 ? dbName : deriveMetadataName()
      );
    };

    resolveProfileName();
  }, [user, ready]);

  useEffect(() => {
    const scrollContainer = document.querySelector('.landing-scroll');
    if (!scrollContainer) {
      return;
    }

    const handleScroll = () => {
      const heroHeight = scrollContainer.clientHeight * 0.9;
      setIsDetached(scrollContainer.scrollTop > heroHeight);
      
      // Calculate scroll progress
      const scrollTop = scrollContainer.scrollTop;
      const scrollHeight = scrollContainer.scrollHeight - scrollContainer.clientHeight;
      const progress = (scrollTop / scrollHeight) * 100;
      setScrollProgress(Math.min(progress, 100));
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial state on mount

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const navLinks = [
    { label: 'Features', href: '#how' },
    { label: 'Demo', href: '#demo' },
    { label: 'Pricing', href: '#pricing' },
  ];

  const getUserInitials = () => {
    const trimmedName = profileName?.trim();
    if (trimmedName) {
      return trimmedName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  const getUserDisplay = () => {
    const trimmedName = profileName?.trim();
    return trimmedName && trimmedName.length > 0 ? trimmedName : user?.email || 'User';
  };

  const handleSignOut = async () => {
    // Close dropdown immediately to prevent layout shift
    setDropdownOpen(false);
    // Clear profile name immediately for clean UI transition
    setProfileName(null);
    
    try {
      await signOut();
      // The redirect will happen in the server action
    } catch (error) {
      console.error('Sign out error:', error);
      // Force a page reload as fallback
      window.location.href = '/';
    }
  };

  const AuthButton = ({ detached }: { detached: boolean }) => {
    // Neutral loading state: reserve space but show nothing until auth is resolved
    if (!ready || status === 'loading') {
      return (
        <div 
          className="rounded-full h-8 px-4 min-w-[80px]"
          aria-live="polite"
          aria-busy="true"
          role="status"
          aria-label="Loading authentication status"
        >
          {/* Intentionally empty: neutral state prevents UI flash */}
        </div>
      );
    }

    // Authenticated: show avatar and dropdown menu
    if (status === 'authenticated' && user) {
      return (
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={detached
                ? "rounded-full h-8 px-3 text-sm gap-2 hover:bg-gray-100 text-[var(--briki-text)]"
                : "rounded-full h-8 px-3 text-sm bg-white/8 text-slate-50 hover:bg-white/15 border border-white/15 gap-2"
              }
              aria-label={`User menu for ${getUserDisplay()}`}
            >
              <Avatar className="w-5 h-5">
                <AvatarFallback className={detached ? "text-xs bg-gray-200" : "text-xs bg-white/20"}>
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <span className="max-w-[120px] truncate">
                {getUserDisplay()}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem asChild>
              <Link href={`/${locale}/profile`} className="w-full cursor-pointer">
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/${locale}/workspace/cases`} className="w-full cursor-pointer">
                Cases
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/${locale}/workspace/clients`} className="w-full cursor-pointer">
                Clients
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                handleSignOut();
              }}
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    // Unauthenticated: show CTA button
    return (
      <Link href="/login">
        <Button
          className={detached
            ? "rounded-full px-4 py-1 h-8 text-sm bg-[var(--briki-primary)] text-white hover:opacity-90"
            : "rounded-full px-4 py-1 h-8 text-sm bg-white/10 text-slate-50 hover:bg-white/20 border border-white/20"
          }
        >
          Start
        </Button>
      </Link>
    );
  };

  if (isDetached) {
    return (
      <>
        {/* Scroll Progress Bar (decorative) */}
        <div className="fixed top-0 left-0 right-0 h-1 bg-transparent z-[100] pointer-events-none" aria-hidden="true">
          <div 
            className="h-full origin-left bg-gradient-to-r from-sky-500 to-cyan-500"
            style={{
              transform: `scaleX(${scrollProgress / 100})`,
              willChange: 'transform'
            }}
          />
        </div>
        <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300" aria-label="Primary">
        <div className="bg-white rounded-full px-6 py-2.5 shadow-[0_4px_16px_rgba(15,23,42,0.1)] flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <Image 
              src="/brand/briki-logo-2.png" 
              alt="Briki logo" 
              width={24} 
              height={24} 
              priority
              sizes="24px"
            />
            <span className="text-sm font-semibold text-[var(--briki-text)] font-smooth">Briki</span>
          </Link>
          <div className="flex items-center gap-6">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm hover:opacity-70 transition-opacity text-[var(--briki-text-muted)] font-medium font-smooth"
              >
                {link.label}
              </a>
            ))}
          </div>
          <AuthButton detached={true} />
        </div>
      </nav>
      </>
    );
  }

  return (
    <>
      {/* Scroll Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-transparent z-[100] pointer-events-none">
        <div 
          className="h-full origin-left bg-gradient-to-r from-sky-500 to-cyan-500"
          style={{
            transform: `scaleX(${scrollProgress / 100})`,
            willChange: 'transform'
          }}
        />
      </div>
      <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300" aria-label="Primary">
      <div className="max-w-screen-2xl mx-auto px-6 sm:px-8">
        <div className="rounded-2xl bg-white/5 backdrop-blur-md px-6 py-3 flex items-center justify-between mt-6 border border-white/10">
          <Link href="/" className="flex items-center gap-2">
              <Image 
              src="/brand/briki-logo-2.png" 
              alt="Briki logo" 
              width={24} 
              height={24} 
              className="opacity-90"
                priority
                sizes="24px"
            />
            <span className="text-sm text-slate-50 font-medium font-smooth">Briki</span>
          </Link>
          <div className="flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-slate-100/85 hover:text-slate-50 transition-colors font-medium font-smooth"
              >
                {link.label}
              </a>
            ))}
            <AuthButton detached={false} />
          </div>
        </div>
      </div>
    </nav>
    </>
  );
}
