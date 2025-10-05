import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import CommandPalette from "@/components/CommandPalette";
import I18nProvider from "@/components/I18nProvider";
import { Toaster } from "sonner";
import DevAxeClient from "@/components/DevAxeClient";
import AuthProvider from "@/components/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
  weight: ["400", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Briki 3.0",
  description: "Agentic workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body
        className="antialiased min-h-screen flex flex-col"
      >
        <AuthProvider>
          <I18nProvider>
            <main className="flex-1 flex flex-col min-h-0">
              {children}
            </main>
            <CommandPalette />
            <Toaster />
            <DevAxeClient />
          </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
