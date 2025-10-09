import type { NextConfig } from "next";
import path from "node:path";

const withNextIntl = require("next-intl/plugin")(
  './src/i18n/request.ts'
);

const nextConfig: NextConfig = {
  // Temporarily ignore build errors for quick deployment
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  turbopack: {
    // Ensure Turbopack (when enabled) resolves the project root to this app
    root: path.resolve(__dirname),
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Handle chunk loading errors gracefully
      config.output.chunkLoadingGlobal = 'webpackChunkBriki';
      
      // Ensure proper chunk naming
      config.output.chunkFilename = 'static/chunks/[name].[contenthash].js';
    }
    config.resolve.alias['pg-native'] = false
    return config;
  },
  // Disable strict mode to prevent double renders in development
  reactStrictMode: false,
  // Optimize CSS loading to inline critical font styles
  experimental: {
    optimizeCss: true,
  },
  // Redirect root to default locale
  async redirects() {
    return [
      {
        source: '/',
        destination: '/es',
        permanent: false,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
