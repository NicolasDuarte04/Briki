import { Play } from 'lucide-react';
import { Card } from './ui/card';

export function DemoBlock() {
  return (
    <section id="demo" className="py-32 px-8" style={{ backgroundColor: 'var(--briki-surface-alt)' }}>
      <div className="max-w-5xl mx-auto">
        <Card
          className="rounded-[20px] border shadow-[0_10px_30px_rgba(15,23,42,0.06)] overflow-hidden"
          style={{
            borderColor: 'var(--briki-border)',
            backgroundColor: 'var(--briki-surface)',
          }}
        >
          <div className="relative aspect-video bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center group cursor-pointer">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"
              style={{ backgroundColor: 'var(--briki-primary)' }}
            >
              <Play className="w-8 h-8 text-white fill-white ml-1" />
            </div>
          </div>
          <div className="p-8 text-center">
            <p
              style={{
                fontSize: '1rem',
                lineHeight: '1.6',
                color: 'var(--briki-text-muted)',
              }}
            >
              2-min demo: from raw policy to proposal
            </p>
          </div>
        </Card>
      </div>
    </section>
  );
}
