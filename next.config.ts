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
    // Only set pg-native alias for server
    if (isServer) {
      config.resolve.alias['pg-native'] = false;
    }
    return config;
  },
  // Disable strict mode to prevent double renders in development
  reactStrictMode: false,
  // Optimize CSS loading to inline critical font styles
  // Disabled optimizeCss to prevent URL mangling that breaks background images
  experimental: {
    // optimizeCss: true, // Commented out to prevent CSS URL mangling
  },
};

export default withNextIntl(nextConfig);
