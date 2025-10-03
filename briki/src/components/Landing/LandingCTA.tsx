import Link from 'next/link';

export function LandingCTA() {
  return (
    <section id="pricing" className="py-32 px-8" style={{ backgroundColor: 'var(--briki-surface)' }}>
      <div className="max-w-4xl mx-auto text-center">
        <h2
          className="mb-16"
          style={{
            fontSize: '2.25rem',
            lineHeight: '1.2',
            fontWeight: '600',
            color: 'var(--briki-text)',
          }}
        >
          Turn policies into proposals in minutes.
        </h2>
        
        <div className="mb-6">
          <div 
            className="rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(15,23,42,0.08)] max-w-2xl mx-auto"
            style={{ backgroundColor: '#F8FAFC' }}
          >
            <div className="px-8 py-6">
              <input
                type="text"
                placeholder="Describe your client or drop a policy PDF..."
                aria-label="Describe your client or drop a policy PDF"
                className="w-full bg-transparent outline-none"
                style={{
                  fontSize: '1.125rem',
                  lineHeight: '1.6',
                  color: 'var(--briki-text)',
                }}
              />
            </div>
          </div>
        </div>
        
        <Link
          href="#"
          className="inline-block hover:opacity-70 transition-opacity"
          style={{
            fontSize: '1rem',
            color: 'var(--briki-text-muted)',
            textDecoration: 'underline',
          }}
        >
          Book a demo
        </Link>
      </div>
    </section>
  );
}

