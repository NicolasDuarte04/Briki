export function LandingFooter() {
  const footerColumns = [
    {
      title: 'Product',
      links: [
        { label: 'Features', href: '#how' },
        { label: 'Pricing', href: '#pricing' },
        { label: 'Demo', href: '#demo' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About', href: '#' },
        { label: 'Careers', href: '#' },
        { label: 'Contact', href: '#' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy', href: '#' },
        { label: 'Terms', href: '#' },
      ],
    },
    {
      title: 'Contact',
      links: [
        { label: 'contact@brikiapp.com', href: 'mailto:contact@brikiapp.com' },
        { label: 'LinkedIn', href: '#' },
      ],
    },
  ];

  return (
    <footer className="py-24 px-8 border-t" style={{ borderColor: 'var(--briki-border)', backgroundColor: 'var(--briki-surface)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-16">
          {footerColumns.map((column, index) => (
            <div key={index}>
              <div
                className="mb-6"
                style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: 'var(--briki-text)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {column.title}
              </div>
              <ul className="space-y-4">
                {column.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <a
                      href={link.href}
                      className="hover:opacity-70 transition-opacity"
                      style={{
                        fontSize: '0.875rem',
                        color: 'var(--briki-text-muted)',
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
        <div className="mt-16 pt-8 border-t text-center" style={{ borderColor: 'var(--briki-border)' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--briki-text-muted)' }}>
            © 2025 Briki. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

