'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

/**
 * MarketingLink - Clean white text CTA for marketing contexts
 * 
 * Inspired by Cursor's approach: uses clean white text
 * to create visual hierarchy on the dark background.
 * 
 * Design principles:
 * - White text with subtle transparency
 * - Subtle arrow icon for direction
 * - Medium weight typography (not bold)
 * - Hover: full opacity + underline
 * - Only for marketing CTAs, NOT product buttons
 * 
 * Usage:
 * - "Learn more" links
 * - Feature card CTAs
 * - Secondary marketing actions
 * 
 * Do NOT use for:
 * - Product primary buttons (keep blue)
 * - Status chips
 * - Navigation active states
 */

interface MarketingLinkProps {
  href: string;
  children: React.ReactNode;
  showArrow?: boolean;
  className?: string;
  external?: boolean;
}

export function MarketingLink({ 
  href, 
  children, 
  showArrow = true,
  className = '',
  external = false,
}: MarketingLinkProps) {
  const baseStyles = "inline-flex items-center gap-1.5 group transition-all duration-200";
  const textStyles = "text-white/75 group-hover:text-white group-active:text-white";
  const underlineStyles = "group-hover:underline decoration-1 underline-offset-4";
  
  const content = (
    <>
      <span className={`font-medium ${underlineStyles}`}>
        {children}
      </span>
      {showArrow && (
        <ArrowRight 
          size={14} 
          className="transition-transform duration-200 group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      )}
    </>
  );

  if (external) {
    return (
      <a
        href={href}
        className={`${baseStyles} ${textStyles} ${className}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        {content}
      </a>
    );
  }

  return (
    <Link
      href={href}
      className={`${baseStyles} ${textStyles} ${className}`}
    >
      {content}
    </Link>
  );
}

