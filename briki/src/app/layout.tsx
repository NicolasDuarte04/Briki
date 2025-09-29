import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import CommandPalette from "@/components/CommandPalette";
import I18nProvider from "@/components/I18nProvider";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <I18nProvider>
          <div className="flex-1 flex flex-col min-h-0">
            {children}
          </div>
          <CommandPalette />
          <Toaster />
        </I18nProvider>
      </body>
    </html>
  );
}
