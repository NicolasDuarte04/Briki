'use client';

import { useTranslations } from 'next-intl';

/**
 * LandingFooter - Minimal footer section
 * 
 * Mirrors Cursor's footer with organized link columns and social links.
 * Muted typography, low contrast, cohesive with overall design.
 */
export function LandingFooter() {
  const t = useTranslations('landing.siteFooter');
  
  const footerSections = [
    {
      title: t('sections.product.title'),
      links: [
        { label: t('sections.product.features'), href: '#features' },
        { label: t('sections.product.workspace'), href: '#workspace' },
        { label: t('sections.product.aiAssistant'), href: '#ai-assistant' },
      ],
    },
    {
      title: t('sections.resources.title'),
      links: [
        { label: t('sections.resources.docs'), href: '#docs' },
        { label: t('sections.resources.changelog'), href: '#changelog' },
        { label: t('sections.resources.status'), href: '#status' },
      ],
    },
    {
      title: t('sections.company.title'),
      links: [
        { label: t('sections.company.about'), href: '#about' },
        { label: t('sections.company.careers'), href: '#careers' },
        { label: t('sections.company.contact'), href: '#contact' },
      ],
    },
    {
      title: t('sections.legal.title'),
      links: [
        { label: t('sections.legal.terms'), href: '#terms' },
        { label: t('sections.legal.privacy'), href: '#privacy' },
      ],
    },
    {
      title: t('sections.connect.title'),
      links: [
        { label: t('sections.connect.linkedin'), href: '#linkedin' },
        { label: t('sections.connect.x'), href: '#x' },
        { label: t('sections.connect.youtube'), href: '#youtube' },
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
            {t('copyright')}
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
              aria-label={t('sections.connect.linkedin')}
            >
              {t('sections.connect.linkedin')}
            </a>
            <a
              href="#x"
              className="transition-colors duration-200 hover:text-briki-accent-warm"
              style={{
                fontSize: '13px',
                color: 'rgba(248, 250, 252, 0.4)',
                fontWeight: '400',
              }}
              aria-label={t('sections.connect.x')}
            >
              {t('sections.connect.x')}
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
              {t('sections.connect.youtube')}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
