"use client";

import { useEffect, useState, type ReactElement } from "react";

interface Slide {
  id: number;
  headline: string;
  subcopy: string;
  content: ReactElement;
}

const slides: Slide[] = [
  {
    id: 1,
    headline: "Upload policy",
    subcopy: "Drop PDFs or sync your drive in seconds.",
    content: (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100">
            <svg 
              className="h-5 w-5 text-sky-600" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-slate-900">Policy-ACME-v3.pdf</div>
            <div className="text-xs text-slate-500">2.4 MB</div>
          </div>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-3/4 rounded-full bg-sky-500" />
        </div>
        <div className="text-xs text-slate-500">Processing...</div>
      </div>
    ),
  },
  {
    id: 2,
    headline: "Clause summary",
    subcopy: "Briki highlights every clause automatically.",
    content: (
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3">
          <span className="text-sm font-medium text-slate-700">Coverage</span>
          <span className="text-sm font-semibold text-emerald-700">Complete</span>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
          <span className="text-sm font-medium text-slate-700">Confidence</span>
          <span className="text-lg font-bold text-slate-900">98%</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2">
          <svg 
            className="h-4 w-4 text-amber-600" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-xs font-medium text-amber-900">3 items need review</span>
        </div>
      </div>
    ),
  },
  {
    id: 3,
    headline: "Compare plans",
    subcopy: "Line up competing plans and surface gaps instantly.",
    content: (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2 rounded-xl bg-slate-50 p-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Plan A</div>
            <div className="h-8 w-full rounded bg-white/60" />
            <div className="h-8 w-full rounded bg-white/60" />
            <div className="h-8 w-full rounded bg-white/60" />
          </div>
          <div className="space-y-2 rounded-xl bg-slate-50 p-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Plan B</div>
            <div className="h-8 w-full rounded bg-white/60" />
            <div className="h-8 w-full rounded bg-white/60" />
            <div className="h-8 w-full rounded bg-white/60" />
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 pt-2">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="text-xs font-medium text-slate-600">2 matches</span>
          <div className="mx-1 h-3 w-px bg-slate-300" />
          <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          <span className="text-xs font-medium text-slate-600">1 gap</span>
        </div>
      </div>
    ),
  },
];

export default function RightPanel(): ReactElement {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    // Check for prefers-reduced-motion
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  useEffect(() => {
    // Don't auto-advance slides if user prefers reduced motion
    if (prefersReducedMotion || !isMounted) {
      return;
    }

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 7000); // 7 second interval

    return () => {
      clearInterval(interval);
    };
  }, [prefersReducedMotion, isMounted]);

  const slide = slides[currentSlide];

  return (
    <section 
      className="relative hidden w-full items-center justify-center overflow-hidden lg:flex lg:w-1/2"
      style={{
        backgroundImage: "url('/brand/loginbackground.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Gradient overlay */}
      <div 
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-sky-600/20 to-transparent"
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md space-y-8 px-8">
        {/* Slide indicators */}
        <div className="flex justify-center gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => !prefersReducedMotion && setCurrentSlide(index)}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                index === currentSlide 
                  ? "w-8 bg-white" 
                  : "w-1.5 bg-white/40 hover:bg-white/60"
              }`}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === currentSlide ? "true" : "false"}
            />
          ))}
        </div>

        {/* Slide content with cross-fade */}
        <div className="relative min-h-[400px]">
          {slides.map((slideItem, index) => (
            <div
              key={slideItem.id}
              className="absolute inset-0 transition-opacity duration-700 ease-in-out"
              style={{
                opacity: index === currentSlide ? 1 : 0,
                transform: index === currentSlide ? "translateY(0)" : "translateY(20px)",
                transition: prefersReducedMotion 
                  ? "none" 
                  : "opacity 700ms ease-in-out, transform 700ms ease-in-out",
                pointerEvents: index === currentSlide ? "auto" : "none",
              }}
              aria-hidden={index !== currentSlide}
            >
              <div className="space-y-6 text-center">
                <div className="space-y-3">
                  <h2 className="text-3xl font-semibold tracking-tight text-white">
                    {slideItem.headline}
                  </h2>
                  <p className="text-base text-white/90">
                    {slideItem.subcopy}
                  </p>
                </div>

                <div className="mx-auto w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl shadow-sky-900/20">
                  {slideItem.content}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}