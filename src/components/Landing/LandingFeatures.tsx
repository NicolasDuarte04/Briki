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
    <section className="py-32 px-6 sm:px-8 bg-[var(--briki-surface)]">
      <div className="max-w-6xl mx-auto">
        <h2
          className="text-center mb-16 text-headline font-bold text-[var(--briki-text)] font-smooth"
        >
          Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className="p-8 rounded-[20px] border border-[var(--briki-border)] bg-[var(--briki-surface)] shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
              >
                <div className="mb-6">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center bg-[var(--briki-primary)]/10"
                  >
                    <Icon className="w-6 h-6 text-[var(--briki-primary)]" />
                  </div>
                </div>
                <h3
                  className="mb-4 text-xl sm:text-2xl font-semibold text-[var(--briki-text)] tracking-tight font-smooth"
                >
                  {feature.title}
                </h3>
                <ul className="space-y-2">
                  {feature.bullets.map((bullet, bulletIndex) => (
                    <li
                      key={bulletIndex}
                      className="text-body text-[var(--briki-text-muted)] font-smooth"
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

