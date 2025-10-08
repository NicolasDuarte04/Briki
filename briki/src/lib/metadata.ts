import { Metadata } from 'next';

const siteConfig = {
  name: "Briki",
  title: "Briki - Tu Compañero de Seguros Inteligente",
  description: "Briki te ayuda a entender, comparar y gestionar tus seguros de manera simple e inteligente.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://briki.com",
  ogImage: "/brand/briki-og-image.png",
  twitterHandle: "@BrikiApp",
};

/**
 * Generate metadata for dynamic pages
 * Use this helper in page.tsx or layout.tsx files to create consistent metadata
 */
export function generatePageMetadata({
  title,
  description,
  image,
  path = '',
  noIndex = false,
  locale = 'es',
}: {
  title: string;
  description?: string;
  image?: string;
  path?: string;
  noIndex?: boolean;
  locale?: 'es' | 'en';
}): Metadata {
  const pageUrl = `${siteConfig.url}${path}`;
  const pageImage = image || siteConfig.ogImage;
  const pageDescription = description || siteConfig.description;

  return {
    title,
    description: pageDescription,
    alternates: {
      canonical: pageUrl,
      languages: {
        'es-MX': `${siteConfig.url}/es${path.replace('/es', '').replace('/en', '')}`,
        'en-US': `${siteConfig.url}/en${path.replace('/es', '').replace('/en', '')}`,
      },
    },
    openGraph: {
      title,
      description: pageDescription,
      url: pageUrl,
      siteName: siteConfig.name,
      images: [
        {
          url: pageImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: locale === 'es' ? 'es_MX' : 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: pageDescription,
      images: [pageImage],
      site: siteConfig.twitterHandle,
      creator: siteConfig.twitterHandle,
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
        }
      : {
          index: true,
          follow: true,
        },
  };
}

/**
 * Generate metadata for article/blog posts
 */
export function generateArticleMetadata({
  title,
  description,
  image,
  path = '',
  publishedTime,
  modifiedTime,
  author,
  tags,
  locale = 'es',
}: {
  title: string;
  description: string;
  image?: string;
  path?: string;
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  tags?: string[];
  locale?: 'es' | 'en';
}): Metadata {
  const pageUrl = `${siteConfig.url}${path}`;
  const pageImage = image || siteConfig.ogImage;

  return {
    title,
    description,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: siteConfig.name,
      images: [
        {
          url: pageImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: locale === 'es' ? 'es_MX' : 'en_US',
      type: 'article',
      publishedTime,
      modifiedTime,
      authors: author ? [author] : undefined,
      tags,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [pageImage],
      site: siteConfig.twitterHandle,
      creator: siteConfig.twitterHandle,
    },
  };
}

/**
 * Get site configuration
 */
export function getSiteConfig() {
  return siteConfig;
}
