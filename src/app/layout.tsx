import type { Metadata } from "next";
import { Geist_Mono, Inter, DM_Sans, Newsreader } from "next/font/google";
import "./globals.css";
import LoadingProvider from "@/components/LoadingProvider";
import AuthProvider from "@/components/AuthProvider";
import { ThemeProvider } from "@/lib/theme";
import { Analytics } from "@vercel/analytics/next";
import ChunkLoadErrorBoundary from "@/components/ErrorBoundary";

const siteConfig = {
  name: "Briki",
  title: "Briki - Insurance AI Agent",
  description: "Briki te ayuda a entender, comparar y gestionar tus seguros de manera simple e inteligente. Obtén asesoría personalizada, compara pólizas y toma decisiones informadas con inteligencia artificial.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://briki.com",
  ogImage: "/brand/briki-og-image.png", // 1200x630px recommended
  twitterHandle: "@BrikiApp",
  keywords: [
    "seguros",
    "insurance",
    "pólizas",
    "comparador de seguros",
    "asesoría de seguros",
    "inteligencia artificial",
    "fintech",
    "insurtech",
    "seguros de vida",
    "seguros de salud",
    "seguros de auto",
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  
  // Basic metadata
  title: {
    default: siteConfig.title,
    template: "%s | Briki",
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: [{ name: "Briki Team" }],
  creator: "Briki",
  publisher: "Briki",
  
  // Viewport - handled separately in viewport export
  // See: https://nextjs.org/docs/app/api-reference/functions/generate-viewport
  
  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  
  // Icons
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
  
  // Manifest
  manifest: "/site.webmanifest",
  
  // Open Graph
  openGraph: {
    type: "website",
    locale: "es_MX",
    alternateLocale: ["en_US", "es_ES"],
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: "Briki - Tu Compañero de Seguros Inteligente",
        type: "image/png",
      },
    ],
  },
  
  // Twitter
  twitter: {
    card: "summary_large_image",
    site: siteConfig.twitterHandle,
    creator: siteConfig.twitterHandle,
    title: siteConfig.title,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
  },
  
  // Verification (add your verification codes when available)
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    // yandex: "yandex-verification-code",
    // bing: "bing-verification-code",
  },
  
  // Additional metadata
  category: "technology",
  alternates: {
    canonical: siteConfig.url,
    languages: {
      "es-MX": `${siteConfig.url}/es`,
      "en-US": `${siteConfig.url}/en`,
    },
  },
  
  // App-specific
  applicationName: siteConfig.name,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: siteConfig.name,
  },
  formatDetection: {
    telephone: false,
    date: false,
    email: false,
    address: false,
  },
  
  // Other
  other: {
    "theme-color": "#ffffff",
    "color-scheme": "light dark",
  },
};

// Viewport configuration (separate from metadata in Next.js 14+)
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
  weight: ["400", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  weight: ["400", "500", "600", "700"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 🔍 DEBUG: Verificar qué tipo de children estamos recibiendo
  console.log('🔍 [RootLayout] Renderizando con children:', {
    childrenType: typeof children,
    childrenIsArray: Array.isArray(children),
    childrenConstructor: children?.constructor?.name,
    childrenKeys: children && typeof children === 'object' ? Object.keys(children) : 'N/A',
    isValidElement: children && typeof children === 'object' && 'type' in children,
  });

  return (
    <html lang="es" className={`${inter.variable} ${geistMono.variable} ${dmSans.variable} ${newsreader.variable}`} suppressHydrationWarning>
      <head>
        {/* Preload hero background images to improve LCP */}
        {/* Removed invalid preload to avoid 404 during dev */}
        {/* JSON-LD Structured Data for better SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Briki",
              url: siteConfig.url,
              logo: `${siteConfig.url}/brand/briki-logo-2.png`,
              description: siteConfig.description,
              sameAs: [
                // Add your social media URLs here
                // "https://twitter.com/BrikiApp",
                // "https://www.facebook.com/BrikiApp",
                // "https://www.linkedin.com/company/briki",
              ],
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "Customer Service",
                availableLanguage: ["Spanish", "English"],
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Briki",
              url: siteConfig.url,
              description: siteConfig.description,
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: `${siteConfig.url}/search?q={search_term_string}`,
                },
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
        {/* Adobe PDF Embed API Script */}
        <script
          type="text/javascript"
          src="https://documentcloud.adobe.com/view-sdk/viewer.js"
        />
      </head>
      <body className="antialiased min-h-screen flex flex-col">
        <ChunkLoadErrorBoundary>
          <ThemeProvider>
            <LoadingProvider>
              <AuthProvider>
                {children}
              </AuthProvider>
            </LoadingProvider>
          </ThemeProvider>
        </ChunkLoadErrorBoundary>
        <Analytics />
      </body>
    </html>
  );
}
