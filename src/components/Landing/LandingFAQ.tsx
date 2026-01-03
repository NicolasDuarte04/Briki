'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export function LandingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: 'How does Briki integrate with my existing workflow?',
      answer: 'Briki works alongside your current tools. Import from WhatsApp, upload PDFs, or connect to carrier portals. Everything stays in one place.'
    },
    {
      question: 'What languages does Briki support?',
      answer: 'Briki fully supports Spanish and English for policy analysis, proposals, and all communications.'
    },
    {
      question: 'How secure is my client data?',
      answer: 'All data is encrypted at rest and in transit. We maintain SOC 2 compliance and provide granular role-based access controls.'
    },
    {
      question: 'Can I try Briki before committing?',
      answer: 'Yes! Start with our free trial or book a personalized demo to see how Briki fits your workflow.'
    },
    {
      question: 'What kind of support do you provide?',
      answer: 'All plans include email support. Pro and Enterprise plans get priority support and dedicated onboarding assistance.'
    }
  ];

  return (
    <section 
      className="relative py-24 px-6 sm:px-8"
      aria-labelledby="faq-heading"
    >
      <div className="max-w-[800px] mx-auto">
        {/* Section heading */}
        <h2 
          id="faq-heading"
          className="text-center text-white text-4xl font-semibold mb-16"
        >
          Frequently Asked Questions
        </h2>
        
        {/* FAQ accordion */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="rounded-2xl bg-[#1a1a1a] border border-white/10 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                aria-expanded={openIndex === index}
              >
                <span className="text-lg font-semibold text-white pr-4">
                  {faq.question}
                </span>
                <ChevronDown 
                  className={`w-5 h-5 text-white/60 shrink-0 transition-transform ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              
              {openIndex === index && (
                <div className="px-6 pb-5 text-white/70">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}



