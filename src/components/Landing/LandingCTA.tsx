'use client';

import { useState, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';

export function LandingCTA() {
  const t = useTranslations('landing.contactForm');
  const locale = useLocale();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    city: '',
    phone: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const firstInputRef = useRef<HTMLInputElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error on input change
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset states
    setError(null);
    setSubmitSuccess(false);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          company: formData.company.trim(),
          city: formData.city.trim(),
          phone: formData.phone?.trim() || undefined,
          locale,
          message: t('meta.requestMessage'),
          honeypot: '', // Anti-spam field
        }),
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        // Success
        setSubmitSuccess(true);
        setFormData({
          name: '',
          email: '',
          company: '',
          city: '',
          phone: '',
        });
        
        // Focus first input after short delay
        setTimeout(() => {
          firstInputRef.current?.focus();
        }, 2000);

        // Auto-hide success message after 5s
        setTimeout(() => {
          setSubmitSuccess(false);
        }, 5000);
      } else {
        // Handle API errors
        let errorMessage = t('errors.generic');
        
        if (data.error === 'validation_error') {
          errorMessage = t('errors.validation');
        } else if (data.error === 'spam_detected') {
          errorMessage = t('errors.spam');
        }
        
        setError(errorMessage);
        
        // Focus submit button for retry
        setTimeout(() => {
          submitButtonRef.current?.focus();
        }, 100);
      }
    } catch (err) {
      // Network or unexpected errors
      setError(t('errors.generic'));
      
      setTimeout(() => {
        submitButtonRef.current?.focus();
      }, 100);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="pricing" className="py-32 px-6 sm:px-8 bg-[var(--briki-surface)]">
      <div className="max-w-4xl mx-auto text-center">
        <h2
          className="mb-16 text-headline font-bold text-[var(--briki-text)] text-balance font-smooth px-4"
        >
          {t('hero')}
        </h2>
        
        <div className="mb-8">
          <h3 className="text-title-lg font-semibold text-[var(--briki-text)] mb-8">
            {t('title')}
          </h3>
          
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto" aria-busy={isSubmitting}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name Field */}
              <div className="text-left">
                <label 
                  htmlFor="name" 
                  className="block text-sm font-medium text-[var(--briki-text)] mb-2"
                >
                  {t('fields.name.label')}
                </label>
                <input
                  ref={firstInputRef}
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 rounded-lg border border-[var(--briki-border)] bg-[var(--briki-surface-alt)] text-[var(--briki-text)] outline-none focus:ring-2 focus:ring-[var(--briki-primary)] focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder={t('fields.name.placeholder')}
                />
              </div>

              {/* Email Field */}
              <div className="text-left">
                <label 
                  htmlFor="email" 
                  className="block text-sm font-medium text-[var(--briki-text)] mb-2"
                >
                  {t('fields.email.label')}
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 rounded-lg border border-[var(--briki-border)] bg-[var(--briki-surface-alt)] text-[var(--briki-text)] outline-none focus:ring-2 focus:ring-[var(--briki-primary)] focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder={t('fields.email.placeholder')}
                />
              </div>

              {/* Company Field */}
              <div className="text-left">
                <label 
                  htmlFor="company" 
                  className="block text-sm font-medium text-[var(--briki-text)] mb-2"
                >
                  {t('fields.company.label')}
                </label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 rounded-lg border border-[var(--briki-border)] bg-[var(--briki-surface-alt)] text-[var(--briki-text)] outline-none focus:ring-2 focus:ring-[var(--briki-primary)] focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder={t('fields.company.placeholder')}
                />
              </div>

              {/* City Field */}
              <div className="text-left">
                <label 
                  htmlFor="city" 
                  className="block text-sm font-medium text-[var(--briki-text)] mb-2"
                >
                  {t('fields.city.label')}
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 rounded-lg border border-[var(--briki-border)] bg-[var(--briki-surface-alt)] text-[var(--briki-text)] outline-none focus:ring-2 focus:ring-[var(--briki-primary)] focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder={t('fields.city.placeholder')}
                />
              </div>

              {/* Phone Field */}
              <div className="text-left md:col-span-2">
                <label 
                  htmlFor="phone" 
                  className="block text-sm font-medium text-[var(--briki-text)] mb-2"
                >
                  {t('fields.phone.label')}
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 rounded-lg border border-[var(--briki-border)] bg-[var(--briki-surface-alt)] text-[var(--briki-text)] outline-none focus:ring-2 focus:ring-[var(--briki-primary)] focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder={t('fields.phone.placeholder')}
                />
              </div>
            </div>

            {/* Feedback Messages */}
            <div id="form-feedback" className="mt-6 min-h-[2rem]" aria-live="polite" aria-atomic="true">
              {submitSuccess && (
                <div 
                  role="status"
                  className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 font-medium"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>{t('success.message')}</span>
                </div>
              )}
              
              {error && (
                <div 
                  role="alert"
                  className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400 font-medium"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="mt-4">
              <button
                ref={submitButtonRef}
                type="submit"
                disabled={isSubmitting}
                aria-describedby="form-feedback"
                className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-[var(--briki-primary)] text-white font-semibold hover:opacity-90 transition-opacity shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{t('submitting')}</span>
                  </>
                ) : (
                  t('submit')
                )}
              </button>
            </div>

            {/* Visually hidden live region for screen readers */}
            <div className="sr-only" aria-live="polite" aria-atomic="true">
              {isSubmitting && t('aria.submitting')}
            </div>
          </form>
        </div>
        
        <div className="mt-6">
          <a
            href="#"
            className="inline-block hover:opacity-70 transition-opacity text-body text-[var(--briki-text-muted)] underline font-medium font-smooth"
          >
            {t('demoLink')}
          </a>
        </div>
      </div>
    </section>
  );
}

