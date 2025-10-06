import { Upload, Search, Send } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function LandingHowItWorks() {
  const steps = [
    {
      icon: Upload,
      title: 'Upload',
      bullets: ['Policy PDF or WhatsApp chat', 'Spanish/English'],
    },
    {
      icon: Search,
      title: 'Analyze',
      bullets: ['Extract clauses & exclusions', 'Compare carriers'],
    },
    {
      icon: Send,
      title: 'Propose',
      bullets: ['Client-ready proposal', 'Share by email/WhatsApp'],
    },
  ];

  return (
    <section id="how" className="py-32 px-8" style={{ backgroundColor: 'var(--briki-surface)' }}>
      <div className="max-w-6xl mx-auto">
        <h2 className="sr-only">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Card
                key={index}
                className="p-8 rounded-[20px] border shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
                style={{
                  borderColor: 'var(--briki-border)',
                  backgroundColor: 'var(--briki-surface)',
                }}
              >
                <div className="mb-6">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: 'var(--briki-surface-alt)' }}
                  >
                    <Icon className="w-6 h-6" style={{ color: 'var(--briki-text)' }} />
                  </div>
                </div>
                <h3
                  className="mb-4"
                  style={{
                    fontSize: '1.5rem',
                    lineHeight: '1.25',
                    fontWeight: '600',
                    color: 'var(--briki-text)',
                  }}
                >
                  {step.title}
                </h3>
                <ul className="space-y-2">
                  {step.bullets.map((bullet, bulletIndex) => (
                    <li
                      key={bulletIndex}
                      style={{
                        fontSize: '1rem',
                        lineHeight: '1.6',
                        color: 'var(--briki-text-muted)',
                      }}
                    >
                      • {bullet}
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

