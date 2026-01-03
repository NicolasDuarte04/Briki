'use client';

import { useState } from 'react';
import { useSafeTranslations } from '@/hooks/useSafeTranslations';

/**
 * LandingContact - Clean contact section component
 * 
 * Premium, centered contact block with email and optional form.
 * Matches the landing page design system - Cursor-grade quality.
 */
export function LandingContact() {
  const { t } = useSafeTranslations('contact');
  const [formStatus, setFormStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Get form data
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const message = formData.get('message') as string;

    // Simple mailto fallback (can be replaced with actual backend later)
    const mailtoLink = `mailto:contact@brikiapp.com?subject=Contact from ${encodeURIComponent(name)}&body=${encodeURIComponent(message)}%0D%0A%0D%0AFrom: ${encodeURIComponent(email)}`;
    
    try {
      window.location.href = mailtoLink;
      setFormStatus('success');
      
      // Reset form after a delay
      setTimeout(() => {
        (e.target as HTMLFormElement).reset();
        setFormStatus('idle');
      }, 3000);
    } catch (error) {
      console.error('Contact form error:', error);
      setFormStatus('error');
      setTimeout(() => setFormStatus('idle'), 3000);
    }
  };

  return (
    <section
      className="relative w-full min-h-screen flex items-center justify-center py-20 px-6 sm:px-8"
      style={{ backgroundColor: 'rgba(21, 26, 30, 1)' }}
    >
      <div className="w-full max-w-[600px]">
        {/* Header - Reduced typography, matching landing tone */}
        <div className="text-center mb-10">
          <h1
            className="mb-3"
            style={{
              fontSize: 'clamp(28px, 4vw, 33px)',
              fontWeight: '500',
              color: 'rgba(255, 255, 255, 0.85)',
              lineHeight: '1.2',
              letterSpacing: '-0.02em',
            }}
          >
            {t('title')}
          </h1>
          <p
            style={{
              fontSize: '16px',
              lineHeight: '1.5',
              color: 'rgba(248, 250, 252, 0.6)',
              fontWeight: '400',
              maxWidth: '480px',
              margin: '0 auto',
            }}
          >
            {t('subtitle')}
          </p>
        </div>

        {/* Email contact - Primary method, elegant card */}
        <a
          href="mailto:contact@brikiapp.com"
          className="block rounded-md border p-5 mb-6 text-center transition-all duration-200"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            borderColor: 'rgba(255, 255, 255, 0.08)',
            textDecoration: 'none',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
          }}
        >
          <p
            className="mb-2"
            style={{
              fontSize: '12px',
              fontWeight: '500',
              color: 'rgba(255, 255, 255, 0.5)',
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
            }}
          >
            {t('email.label')}
          </p>
          <span
            className="inline-flex items-center gap-2 transition-all duration-200"
            style={{
              fontSize: '17px',
              fontWeight: '500',
              color: 'rgba(255, 255, 255, 0.9)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'rgba(255, 255, 255, 1)';
              e.currentTarget.style.textDecoration = 'underline';
              e.currentTarget.style.textUnderlineOffset = '3px';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
              e.currentTarget.style.textDecoration = 'none';
            }}
          >
            {t('email.value')}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ opacity: 0.7 }}
            >
              <path d="M7 17L17 7" />
              <path d="M7 7h10v10" />
            </svg>
          </span>
        </a>

        {/* Contact form - Secondary path, refined surface */}
        <form
          onSubmit={handleSubmit}
          className="rounded-md border p-6"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            borderColor: 'rgba(255, 255, 255, 0.08)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          }}
        >
          {/* Name field */}
          <div className="mb-5">
            <label
              htmlFor="name"
              className="block mb-2"
              style={{
                fontSize: '13px',
                fontWeight: '500',
                color: 'rgba(255, 255, 255, 0.7)',
              }}
            >
              {t('form.name')}
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              className="w-full px-3 py-2.5 rounded-md border transition-all duration-200 outline-none"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                borderColor: 'rgba(255, 255, 255, 0.08)',
                color: 'rgba(255, 255, 255, 0.95)',
                fontSize: '14px',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                e.currentTarget.style.boxShadow = '0 0 0 1px rgba(255, 255, 255, 0.08)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Email field */}
          <div className="mb-5">
            <label
              htmlFor="email"
              className="block mb-2"
              style={{
                fontSize: '13px',
                fontWeight: '500',
                color: 'rgba(255, 255, 255, 0.7)',
              }}
            >
              {t('form.email')}
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              className="w-full px-3 py-2.5 rounded-md border transition-all duration-200 outline-none"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                borderColor: 'rgba(255, 255, 255, 0.08)',
                color: 'rgba(255, 255, 255, 0.95)',
                fontSize: '14px',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                e.currentTarget.style.boxShadow = '0 0 0 1px rgba(255, 255, 255, 0.08)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Message field */}
          <div className="mb-5">
            <label
              htmlFor="message"
              className="block mb-2"
              style={{
                fontSize: '13px',
                fontWeight: '500',
                color: 'rgba(255, 255, 255, 0.7)',
              }}
            >
              {t('form.message')}
            </label>
            <textarea
              id="message"
              name="message"
              required
              rows={4}
              className="w-full px-3 py-2.5 rounded-md border transition-all duration-200 resize-none outline-none"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                borderColor: 'rgba(255, 255, 255, 0.08)',
                color: 'rgba(255, 255, 255, 0.95)',
                fontSize: '14px',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                e.currentTarget.style.boxShadow = '0 0 0 1px rgba(255, 255, 255, 0.08)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Submit button - Matches Briki primary CTA style */}
          <button
            type="submit"
            disabled={formStatus === 'success'}
            className="w-full rounded-full px-6 py-2.5 text-sm font-semibold transition-all duration-200"
            style={{
              backgroundColor: formStatus === 'success' ? 'rgba(34, 197, 94, 0.95)' : 'rgba(255, 255, 255, 1)',
              color: '#050505',
              border: 'none',
              cursor: formStatus === 'success' ? 'default' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (formStatus !== 'success') {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
              }
            }}
            onMouseLeave={(e) => {
              if (formStatus !== 'success') {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 1)';
              }
            }}
          >
            {formStatus === 'success' ? t('form.success', {}, '¡Enviado!') : t('form.submit', {}, 'Enviar')}
          </button>

          {/* Error message */}
          {formStatus === 'error' && (
            <p
              className="mt-4 text-center"
              style={{
                fontSize: '14px',
                color: 'rgba(239, 68, 68, 0.9)',
              }}
            >
              {t('form.error', {}, 'Error. Intenta de nuevo.')}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}

