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
    <footer className="py-24 px-6 sm:px-8 border-t border-[var(--briki-border)] bg-[var(--briki-surface)]">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 md:gap-16">
          {footerColumns.map((column, index) => (
            <div key={index}>
              <div
                className="mb-6 text-sm font-semibold text-[var(--briki-text)] uppercase tracking-wider font-smooth"
              >
                {column.title}
              </div>
              <ul className="space-y-4">
                {column.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <a
                      href={link.href}
                      className="hover:opacity-70 transition-opacity text-sm text-[var(--briki-text-muted)] font-regular font-smooth"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-16 pt-8 border-t border-[var(--briki-border)] text-center">
          <p className="text-sm text-[var(--briki-text-muted)] font-regular font-smooth">
            © 2025 Briki. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

