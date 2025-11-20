import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import brikiLogo from 'figma:asset/452b00b73abde39fe8972bb259849a447bd2e084.png';

export function Navigation() {
  const [isDetached, setIsDetached] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const heroHeight = window.innerHeight * 0.9;
      setIsDetached(window.scrollY > heroHeight);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial state on mount

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Features', href: '#how' },
    { label: 'Demo', href: '#demo' },
    { label: 'Pricing', href: '#pricing' },
  ];

  if (isDetached) {
    return (
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300">
        <div className="bg-white rounded-full px-6 py-2.5 shadow-[0_4px_16px_rgba(15,23,42,0.1)] flex items-center gap-6">
          <div className="flex items-center gap-2">
            <img src={typeof brikiLogo === 'string' ? brikiLogo : (brikiLogo as any).src} alt="" aria-hidden="true" className="w-6 h-6" />
            <span className="text-sm" style={{ color: 'var(--briki-text)', fontWeight: '500' }}>briki</span>
          </div>
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
          <Button
            className="rounded-full px-4 py-1 h-8 text-sm"
            style={{ backgroundColor: 'var(--briki-primary)' }}
          >
            Start
          </Button>
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300">
      <div className="max-w-screen-2xl mx-auto px-8">
        <div className="rounded-2xl bg-white/5 backdrop-blur-md px-6 py-3 flex items-center justify-between mt-6 border border-white/10">
          <div className="flex items-center gap-2">
            <img src={typeof brikiLogo === 'string' ? brikiLogo : (brikiLogo as any).src} alt="" aria-hidden="true" className="w-6 h-6 opacity-90" />
            <span className="text-sm text-white" style={{ fontWeight: '500' }}>briki</span>
          </div>
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
            <Button
              className="rounded-full px-4 py-1 h-8 text-sm bg-white/10 text-white hover:bg-white/20 border border-white/20"
            >
              Start
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
