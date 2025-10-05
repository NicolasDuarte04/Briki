import { Sparkles, BarChart3, FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function LandingFeatures() {
  const features = [
    {
      icon: Sparkles,
      title: 'Smart extraction',
      bullets: ['OCR + clause parsing', 'Exclusions & limits surfaced'],
    },
    {
      icon: BarChart3,
      title: 'Fast comparisons',
      bullets: ['Side-by-side carriers', 'Gaps highlighted'],
    },
    {
      icon: FileText,
      title: 'Client-ready outputs',
      bullets: ['Proposal PDFs & email', 'Spanish/English'],
    },
  ];

  return (
    <section className="py-32 px-8" style={{ backgroundColor: 'var(--briki-surface)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
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
                    style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)' }}
                  >
                    <Icon className="w-6 h-6" style={{ color: 'var(--briki-primary)' }} />
                  </div>
                </div>
                <h2
                  className="mb-4"
                  style={{
                    fontSize: '1.5rem',
                    lineHeight: '1.25',
                    fontWeight: '600',
                    color: 'var(--briki-text)',
                  }}
                >
                  {feature.title}
                </h2>
                <ul className="space-y-2">
                  {feature.bullets.map((bullet, bulletIndex) => (
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

