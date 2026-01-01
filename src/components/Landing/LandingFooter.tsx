'use client';

/**
 * LandingFooter - Minimal footer section
 * 
 * Mirrors Cursor's footer with organized link columns and social links.
 * Muted typography, low contrast, cohesive with overall design.
 */
export function LandingFooter() {
  const footerSections = [
    {
      title: 'Product',
      links: [
        { label: 'Features', href: '#features' },
        { label: 'Workspace', href: '#workspace' },
        { label: 'AI Assistant', href: '#ai-assistant' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'Docs', href: '#docs' },
        { label: 'Changelog', href: '#changelog' },
        { label: 'Status', href: '#status' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About', href: '#about' },
        { label: 'Careers', href: '#careers' },
        { label: 'Contact', href: '#contact' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Terms', href: '#terms' },
        { label: 'Privacy', href: '#privacy' },
      ],
    },
    {
      title: 'Connect',
      links: [
        { label: 'LinkedIn', href: '#linkedin' },
        { label: 'X', href: '#x' },
        { label: 'YouTube', href: '#youtube' },
      ],
    },
  ];

  return (
    <footer
      className="relative w-full py-16 px-6 sm:px-8 border-t"
      style={{
        backgroundColor: 'rgba(21, 26, 30, 1)',
        borderColor: 'rgba(255, 255, 255, 0.08)',
      }}
      aria-labelledby="footer-heading"
    >
      <div className="w-full max-w-[1200px] mx-auto">
        {/* Footer grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {footerSections.map((section, index) => (
            <div key={index}>
              <h3
                className="mb-4"
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'rgba(255, 255, 255, 0.85)',
                  letterSpacing: '0.01em',
                }}
              >
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <a
                      href={link.href}
                      className="transition-colors duration-200 hover:text-briki-accent-warm"
                      style={{
                        fontSize: '14px',
                        color: 'rgba(248, 250, 252, 0.5)',
                        fontWeight: '400',
                      }}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          className="pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4"
          style={{
            borderColor: 'rgba(255, 255, 255, 0.06)',
          }}
        >
          <p
            style={{
              fontSize: '13px',
              color: 'rgba(248, 250, 252, 0.4)',
              fontWeight: '400',
            }}
          >
            © 2025 Briki. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a
              href="#linkedin"
              className="transition-colors duration-200 hover:text-briki-accent-warm"
              style={{
                fontSize: '13px',
                color: 'rgba(248, 250, 252, 0.4)',
                fontWeight: '400',
              }}
              aria-label="LinkedIn"
            >
              LinkedIn
            </a>
            <a
              href="#x"
              className="transition-colors duration-200 hover:text-briki-accent-warm"
              style={{
                fontSize: '13px',
                color: 'rgba(248, 250, 252, 0.4)',
                fontWeight: '400',
              }}
              aria-label="X (Twitter)"
            >
              X
            </a>
            <a
              href="#youtube"
              className="transition-colors duration-200 hover:text-briki-accent-warm"
              style={{
                fontSize: '13px',
                color: 'rgba(248, 250, 252, 0.4)',
                fontWeight: '400',
              }}
              aria-label="YouTube"
            >
              YouTube
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
