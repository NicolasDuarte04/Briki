import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Briki",
  description: "Sign in to your Briki workspace",
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div 
      className="relative flex min-h-screen flex-col bg-white text-slate-900"
      style={{ colorScheme: 'light' }}
    >
      <header className="absolute top-0 left-0 right-0 z-10 px-6 pt-6 sm:px-8 sm:pt-8 lg:px-16 lg:pt-10">
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-transparent px-2 py-1 text-sm font-semibold text-slate-600 transition hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          aria-label="Back to Briki homepage"
        >
          <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-sky-600">
            <Image
              src="/brand/briki-logo-2.png"
              alt="Briki"
              width={24}
              height={24}
              className="h-6 w-6"
              priority
            />
          </span>
          <span className="text-base font-semibold tracking-tight">Briki</span>
        </Link>
      </header>
      {children}
    </div>
  );
}
