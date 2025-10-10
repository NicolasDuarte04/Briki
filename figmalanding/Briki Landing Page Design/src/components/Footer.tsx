export function Footer() {
  const footerColumns = [
    {
      title: 'Product',
      links: ['Features', 'Pricing', 'Demo'],
    },
    {
      title: 'Company',
      links: ['About', 'Careers', 'Contact'],
    },
    {
      title: 'Legal',
      links: ['Privacy', 'Terms'],
    },
    {
      title: 'Contact',
      links: ['contact@brikiapp.com', 'LinkedIn'],
    },
  ];

  return (
    <footer className="py-24 px-8 border-t" style={{ borderColor: 'var(--briki-border)', backgroundColor: 'var(--briki-surface)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-16">
          {footerColumns.map((column, index) => (
            <div key={index}>
              <h4
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
              </h4>
              <ul className="space-y-4">
                {column.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <a
                      href="#"
                      className="hover:opacity-70 transition-opacity"
                      style={{
                        fontSize: '0.875rem',
                        color: 'var(--briki-text-muted)',
                      }}
                    >
                      {link}
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
