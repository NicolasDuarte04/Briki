export function LandingSocialProof() {
  const logos = Array(6).fill(null);

  return (
    <section className="py-24 px-8" style={{ backgroundColor: 'var(--briki-surface-alt)' }}>
      <div className="max-w-6xl mx-auto text-center">
        <p
          className="mb-16"
          style={{
            fontSize: '1rem',
            lineHeight: '1.6',
            color: 'var(--briki-text-muted)',
          }}
        >
          Trusted by brokers in Bogotá & CDMX
        </p>
        <div className="flex items-center justify-center gap-8 flex-wrap">
          {logos.map((_, index) => (
            <div
              key={index}
              className="h-12 w-32 rounded-lg"
              style={{
                backgroundColor: 'var(--briki-border)',
                opacity: 0.4,
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

