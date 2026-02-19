import type { ReactElement } from "react";
import type { Metadata } from "next";
import Link from "next/link";

import LoginForm from "../_components/LoginForm";
import RightPanel from "../_components/RightPanel";

export const metadata: Metadata = {
  title: "Sign in • Briki",
  description: "Access your Briki workspace and keep policies moving forward.",
};

export default function LoginPage(): ReactElement {
  return (
    <div className="flex min-h-screen w-full bg-background lg:h-screen">
      <div className="flex w-full flex-col lg:flex-row">
        {/* Left Panel - Form */}
        <section className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-16">
          <div className="mx-auto w-full max-w-[440px]">
            <div className="space-y-8">
              {/* Back Button */}
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                <span className="text-sm font-medium">Back</span>
              </Link>

              {/* Heading */}
              <div className="space-y-3">
                <h1 className="text-[44px] font-semibold leading-tight tracking-tight text-slate-900 dark:text-slate-100">
                  Welcome back
                </h1>
                <p className="text-base text-slate-600 dark:text-slate-400">
                  Sign in to keep your policy workflows organized and in sync.
                </p>
              </div>

              {/* Login Form */}
              <LoginForm />
            </div>
          </div>
        </section>

        {/* Right Panel - Slideshow */}
        <RightPanel />
      </div>
    </div>
  );
}
