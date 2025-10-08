import { useTranslations } from 'next-intl';
import { Handshake, Lock } from 'lucide-react';
import { TrustBadge } from './TrustBadge';

export function LandingSocialProof() {
  const t = useTranslations('landing.socialProof');

  return (
    <section className="py-24 px-6 sm:px-8 bg-[var(--briki-surface-alt)]">
      <div className="max-w-6xl mx-auto text-center">
        <h2 className="sr-only">Social Proof and Trust Badges</h2>
        <p
          className="mb-12 text-body text-[var(--briki-text-muted)] font-medium font-smooth"
        >
          {t('tagline')}
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap max-w-5xl mx-auto min-h-[56px]">
          <TrustBadge
            icon="/brand/gsea-logo.png"
            label={t('badges.gsea')}
          />
          <TrustBadge
            icon={<Handshake className="w-7 h-7" />}
            label={t('badges.oracle')}
          />
          <TrustBadge
            icon={<Lock className="w-7 h-7" />}
            label={t('badges.encrypted')}
          />
          <TrustBadge
            icon="/brand/supabase-logo.svg"
            label={t('badges.supabase')}
          />
          <TrustBadge
            icon="/brand/Vercel/icon/light/vercel-icon-light.svg"
            label={t('badges.vercel')}
          />
          <TrustBadge
            icon="/brand/openai-logo.svg"
            label={t('badges.openai')}
          />
        </div>
      </div>
    </section>
  );
}

