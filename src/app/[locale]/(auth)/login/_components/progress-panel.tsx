"use client";

import Image from "next/image";
import { useEffect, useState, type ReactNode, type ReactElement } from "react";

import { motion, useReducedMotion } from "framer-motion";
import {
  IconCloudUpload,
  IconFileSearch,
  IconArrowsShuffle,
  IconScale,
} from "@tabler/icons-react";

interface Step {
  title: string;
  description: string;
  icon: ReactNode;
}

const steps: Step[] = [
  {
    title: "Upload policy",
    description: "Drop PDFs or sync your drive in seconds.",
    icon: <IconCloudUpload className="h-5 w-5" aria-hidden="true" />,
  },
  {
    title: "Extract clauses",
    description: "Briki highlights every clause and open item automatically.",
    icon: <IconFileSearch className="h-5 w-5" aria-hidden="true" />,
  },
  {
    title: "Compare plans",
    description: "Line up competing plans and surface gaps instantly.",
    icon: <IconArrowsShuffle className="h-5 w-5" aria-hidden="true" />,
  },
];

export default function ProgressPanel(): ReactElement {
  const reduceMotion = useReducedMotion();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const shouldAnimate = isMounted && !reduceMotion;
  const animationProps = shouldAnimate
    ? { initial: "hidden" as const, animate: "visible" as const }
    : { initial: "visible" as const, animate: "visible" as const };
  const animationKey = shouldAnimate ? "motion" : "static";

  return (
    <section className="relative flex w-full items-stretch overflow-hidden pt-8 pb-12 text-white sm:pt-10 sm:pb-16 lg:basis-1/2 lg:pt-12 lg:pb-20">
      <div className="pointer-events-none absolute inset-0">
        <Image
          src="/brand/loginbackground.jpg"
          alt=""
          fill
          sizes="(min-width: 1024px) 58vw, 100vw"
          className="object-cover"
          priority
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-gradient-to-br from-black/30 via-black/20 to-transparent"
          aria-hidden="true"
        />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col justify-between gap-12 px-6 sm:px-10 lg:px-12">
        <div className="max-w-sm space-y-4">
          <motion.div
            key={animationKey}
            variants={{
              hidden: { opacity: 0, y: 40 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.21, 0.97, 0.36, 0.99] } },
            }}
            {...animationProps}
          >
          <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-sm font-medium text-white/90 backdrop-blur">
            Live preview
          </span>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            See Briki in flow
          </h2>
          <p className="text-base text-white/90">
            The right side keeps momentum high—upload, extract, and compare without hopping tools.
          </p>
          </motion.div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,_280px)_minmax(0,_1fr)] lg:items-center">
          <div className="flex flex-col gap-4">
            <motion.ul
              key={`${animationKey}-list`}
              variants={{
                hidden: {},
                visible: {
                  transition: {
                    staggerChildren: reduceMotion ? 0 : 0.18,
                  },
                },
              }}
              {...animationProps}
            >
            {steps.map((step, index) => (
              <motion.li
                key={step.title}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.5, delay: reduceMotion ? 0 : index * 0.12 },
                  },
                }}
              >
                <div className="group rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm transition hover:border-white/30">
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white">
                    {step.icon}
                  </span>
                  <div className="min-w-0 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-lg font-semibold leading-tight">{step.title}</h3>
                      <span className="text-sm text-white/85">{Math.round(((index + 1) / steps.length) * 100)}%</span>
                    </div>
                    <p className="text-sm text-white/90">
                      {step.description}
                    </p>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        initial={{ width: reduceMotion ? `${((index + 1) / steps.length) * 100}%` : "0%" }}
                        animate={{ width: `${((index + 1) / steps.length) * 100}%` }}
                        transition={{ duration: 0.6, delay: reduceMotion ? 0 : 0.2 + index * 0.1, ease: "easeOut" }}
                        style={{ height: '100%', borderRadius: '9999px', backgroundColor: 'white' }}
                      />
                    </div>
                  </div>
                </div>
                </div>
              </motion.li>
              ))}
            </motion.ul>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <motion.div
              key={`${animationKey}-cards`}
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
              }}
              {...animationProps}
            >
            <DemoCard
              title="Upload PDF"
              subtitle="Policy-ACME-v3.pdf"
              value="Uploaded 14s ago"
              icon={<IconCloudUpload className="h-5 w-5 text-sky-600" aria-hidden="true" />}
              accent="from-white/90 via-white/80 to-white/60"
            />
            <DemoCard
              title="Clause summary"
              subtitle="3 flagged variances"
              value="Review now"
              icon={<IconScale className="h-5 w-5 text-emerald-600" aria-hidden="true" />}
              accent="from-emerald-100/95 via-emerald-50/90 to-emerald-100/70"
            />
            <p className="col-span-full rounded-2xl border border-white/25 bg-white/10 p-4 text-sm text-white/85">
              No new messages yet. Connect your workspace to see real-time updates as teams collaborate.
            </p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

interface DemoCardProps {
  title: string;
  subtitle: string;
  value: string;
  icon: ReactNode;
  accent: string;
}

function DemoCard({ title, subtitle, value, icon, accent }: DemoCardProps): ReactElement {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/20 bg-white/80 p-4 text-slate-900 shadow-[0_12px_45px_-25px_rgba(15,23,42,0.6)] backdrop-blur">
      <div className={`absolute inset-0 bg-gradient-to-br ${accent} opacity-0 transition group-hover:opacity-100`} />
      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-inner">
            {icon}
          </span>
          <div className="leading-snug">
            <p className="text-sm font-medium text-slate-600">{subtitle}</p>
            <p className="text-lg font-semibold text-slate-900">{title}</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-600">{value}</span>
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Briki AI</span>
        </div>
        <div className="flex h-10 items-center justify-between rounded-xl bg-white/70 px-3 text-xs font-medium text-slate-600 shadow-inner">
          <span>Confidence</span>
          <span>98%</span>
        </div>
      </div>
    </div>
  );
}
