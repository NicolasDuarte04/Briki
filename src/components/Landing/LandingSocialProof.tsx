'use client';

import { useTranslations } from 'next-intl';

/**
 * LandingSocialProof - Infrastructure credibility section
 * 
 * Shows trusted infrastructure/stack logos (not client logos).
 * Matches hero aesthetic: subtle cards, monochrome styling, clean spacing.
 */
export function LandingSocialProof() {
  const t = useTranslations('landing.socialProofSection');
  
  const logos = [
    {
      name: 'OpenAI',
      src: '/brand/openai-logo.svg',
      altKey: 'openai' as const,
    },
    {
      name: 'Supabase',
      src: '/brand/supabase-logo.svg',
      altKey: 'supabase' as const,
    },
    {
      name: 'Vercel',
      src: '/brand/Vercel/logotype/dark/vercel-logotype-dark.svg',
      altKey: 'vercel' as const,
    },
    {
      name: 'PostgreSQL',
      // Simple SVG placeholder - monochrome elephant logo
      src: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 432.071 445.383"%3E%3Cg fill="%23fff" opacity="0.7"%3E%3Cpath d="M323.205 324.227c2.833-23.601 1.984-27.062 19.563-23.239l4.463.392c13.517.615 31.199-2.174 41.587-7 22.362-10.376 35.622-27.7 13.572-23.148-50.297 10.376-53.755-6.655-53.755-6.655 53.111-78.803 75.313-178.836 56.149-203.322-52.27-66.747-142.752-35.098-144.262-34.476l-.486.066c-9.938-2.062-21.06-3.292-33.554-3.496-22.761-.374-40.032 5.967-53.133 15.904 0 0-161.408-66.498-153.899 83.628 1.597 31.936 45.777 241.655 98.47 178.31 19.259-23.163 37.871-42.748 37.871-42.748 9.242 6.14 20.307 9.272 31.912 8.147l.897-.765c-.281 2.876-.157 5.689.359 9.019-13.572 15.167-9.584 17.83-36.723 23.416-27.457 5.659-11.326 15.734-.797 18.367 12.768 3.193 42.305 7.716 62.268-20.224l-.795 3.188c5.325 4.26 4.965 30.619 5.72 49.452.756 18.834 2.017 36.409 5.856 46.771 3.839 10.36 8.369 37.05 44.036 29.406 29.809-6.388 52.6-15.582 54.677-101.107"%3E%3C/path%3E%3Cpath d="M402.395 271.23c-50.302 10.376-53.76-6.655-53.76-6.655 53.111-78.808 75.313-178.843 56.153-203.326-52.27-66.746-142.752-35.098-144.262-34.476l-.486.066c-9.938-2.062-21.06-3.292-33.56-3.496-22.761-.373-40.026 5.967-53.127 15.902 0 0-161.411-66.495-153.904 83.63 1.597 31.938 45.776 241.657 98.471 178.312 19.26-23.163 37.869-42.748 37.869-42.748 9.243 6.14 20.308 9.272 31.908 8.147l.901-.765c-.28 2.876-.152 5.689.361 9.019-13.575 15.167-9.586 17.83-36.723 23.416-27.459 5.659-11.328 15.734-.796 18.367 12.768 3.193 42.307 7.716 62.266-20.224l-.796 3.188c5.319 4.26 9.054 27.711 8.428 48.969-.626 21.259-1.044 35.854 3.147 47.254 4.191 11.4 8.368 37.05 44.042 29.406 29.809-6.388 45.256-22.942 47.405-50.555 1.525-19.631 4.976-16.729 5.194-34.28l2.768-8.309c3.192-26.611 0.507-35.196 18.872-31.203l4.463.392c13.517.615 31.208-2.174 41.591-7 22.358-10.376 35.618-27.7 13.573-23.148z"%3E%3C/path%3E%3C/g%3E%3C/svg%3E',
      altKey: 'postgresql' as const,
    },
    {
      name: 'Stripe',
      // Simple SVG placeholder - Stripe wordmark
      src: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 25"%3E%3Cpath fill="%23fff" opacity="0.7" d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.65 7.6zM40 8.95c-.95 0-1.54.34-1.97.81l.02 6.12c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.87 0-2.15-1.04-3.84-2.54-3.84zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88V.88zm-4.32 9.35v9.79H19.8V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86zm-8.55 4.72c0 2.43 2.6 1.68 3.12 1.46v3.36c-.55.3-1.54.54-2.89.54a4.15 4.15 0 0 1-4.27-4.24l.01-13.17 4.02-.86v3.54h3.14V9.1h-3.13v5.85zm-4.91.7c0 2.97-2.31 4.66-5.73 4.66a11.2 11.2 0 0 1-4.46-.93v-3.93c1.38.75 3.1 1.31 4.46 1.31.92 0 1.53-.24 1.53-1C6.26 13.77 0 14.51 0 9.95 0 7.04 2.28 5.3 5.62 5.3c1.36 0 2.72.2 4.09.75v3.88a9.23 9.23 0 0 0-4.1-1.06c-.86 0-1.44.25-1.44.93 0 1.85 6.29.97 6.29 5.88z"%3E%3C/path%3E%3C/svg%3E',
      altKey: 'stripe' as const,
    },
    {
      name: 'Next.js',
      // Simple SVG placeholder - Next.js wordmark
      src: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 36"%3E%3Cpath fill="%23fff" opacity="0.7" d="M48.942 32.632h-6.652v-30.42h17.19v5.414h-10.538v7.556h9.99v5.414h-9.99v12.036zm26.557 0h-6.652v-30.42h6.652v30.42zm25.642 0h-6.652v-24.978l-9.99 24.978h-6.652v-30.42h6.652v24.978l9.99-24.978h6.652v30.42zm25.642 0h-6.652v-24.978l-9.99 24.978h-6.652v-30.42h6.652v24.978l9.99-24.978h6.652v30.42zm25.642 0h-17.19v-30.42h17.19v5.414h-10.538v7.556h9.99v5.414h-9.99v7.622h10.538v5.414z"%3E%3C/path%3E%3Cpath fill="%23fff" opacity="0.7" d="M9.018 2.212h12.036l-23.058 31.576h-12.036l23.058-31.576z"%3E%3C/path%3E%3Cpath fill="%23fff" opacity="0.7" d="M28.98 2.212h6.652l-23.058 31.576h-6.652l23.058-31.576z"%3E%3C/path%3E%3C/svg%3E',
      altKey: 'nextjs' as const,
    },
  ];

  return (
    <section
      className="relative w-full py-16 px-6 sm:px-8"
      style={{ backgroundColor: 'rgba(21, 26, 30, 1)' }}
      aria-labelledby="social-proof-heading"
    >
      <div className="w-full max-w-[1200px] mx-auto">
        {/* Centered copy */}
        <p
          id="social-proof-heading"
          className="text-center mb-12"
          style={{
            fontSize: '14px',
            lineHeight: '1.5',
            color: 'rgba(248, 250, 252, 0.5)',
            fontWeight: '400',
            letterSpacing: '0.01em',
          }}
        >
          {t('heading')}
        </p>

        {/* Logo grid */}
        <div className="flex flex-wrap items-center justify-center gap-6">
          {logos.map((logo) => (
            <div
              key={logo.name}
              className="flex items-center justify-center rounded-[12px] border transition-opacity duration-200 hover:opacity-100"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderColor: 'rgba(255, 255, 255, 0.08)',
                padding: '20px 32px',
                minWidth: '160px',
                height: '80px',
                opacity: 0.85,
              }}
            >
              <img
                src={logo.src}
                alt={t(`logos.${logo.altKey}`)}
                style={{
                  height: '24px',
                  width: 'auto',
                  maxWidth: '120px',
                  objectFit: 'contain',
                  filter: 'grayscale(100%) brightness(1.2)',
                  background: 'unset',
                  backgroundColor: 'unset',
                  backgroundImage: 'none',
                  color: 'rgba(255, 255, 255, 0)',
                  backgroundClip: 'unset',
                  WebkitBackgroundClip: 'unset',
                }}
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
