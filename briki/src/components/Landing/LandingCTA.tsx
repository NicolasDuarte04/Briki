'use client';

import { useState } from 'react';

export function LandingCTA() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    city: '',
    phone: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log('Form submitted:', formData);
  };

  return (
    <section id="pricing" className="py-32 px-6 sm:px-8 bg-[var(--briki-surface)]">
      <div className="max-w-4xl mx-auto text-center">
        <h2
          className="mb-16 text-headline font-bold text-[var(--briki-text)] text-balance font-smooth px-4"
        >
          Turn policies into proposals in minutes.
        </h2>
        
        <div className="mb-8">
          <h3 className="text-title-lg font-semibold text-[var(--briki-text)] mb-8">
            Contact us:
          </h3>
          
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name Field */}
              <div className="text-left">
                <label 
                  htmlFor="name" 
                  className="block text-sm font-medium text-[var(--briki-text)] mb-2"
                >
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-[var(--briki-border)] bg-[var(--briki-surface-alt)] text-[var(--briki-text)] outline-none focus:ring-2 focus:ring-[var(--briki-primary)] focus:border-transparent transition-all"
                  placeholder="John Doe"
                />
              </div>

              {/* Email Field */}
              <div className="text-left">
                <label 
                  htmlFor="email" 
                  className="block text-sm font-medium text-[var(--briki-text)] mb-2"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-[var(--briki-border)] bg-[var(--briki-surface-alt)] text-[var(--briki-text)] outline-none focus:ring-2 focus:ring-[var(--briki-primary)] focus:border-transparent transition-all"
                  placeholder="john@example.com"
                />
              </div>

              {/* Company Field */}
              <div className="text-left">
                <label 
                  htmlFor="company" 
                  className="block text-sm font-medium text-[var(--briki-text)] mb-2"
                >
                  Company
                </label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-[var(--briki-border)] bg-[var(--briki-surface-alt)] text-[var(--briki-text)] outline-none focus:ring-2 focus:ring-[var(--briki-primary)] focus:border-transparent transition-all"
                  placeholder="Acme Inc."
                />
              </div>

              {/* City Field */}
              <div className="text-left">
                <label 
                  htmlFor="city" 
                  className="block text-sm font-medium text-[var(--briki-text)] mb-2"
                >
                  City
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-[var(--briki-border)] bg-[var(--briki-surface-alt)] text-[var(--briki-text)] outline-none focus:ring-2 focus:ring-[var(--briki-primary)] focus:border-transparent transition-all"
                  placeholder="New York"
                />
              </div>

              {/* Phone Field */}
              <div className="text-left md:col-span-2">
                <label 
                  htmlFor="phone" 
                  className="block text-sm font-medium text-[var(--briki-text)] mb-2"
                >
                  Phone
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border border-[var(--briki-border)] bg-[var(--briki-surface-alt)] text-[var(--briki-text)] outline-none focus:ring-2 focus:ring-[var(--briki-primary)] focus:border-transparent transition-all"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="mt-8">
              <button
                type="submit"
                className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-[var(--briki-primary)] text-white font-semibold hover:opacity-90 transition-opacity shadow-md"
              >
                Submit
              </button>
            </div>
          </form>
        </div>
        
        <div className="mt-6">
          <a
            href="#"
            className="inline-block hover:opacity-70 transition-opacity text-body text-[var(--briki-text-muted)] underline font-medium font-smooth"
          >
            Book a demo
          </a>
        </div>
      </div>
    </section>
  );
}

