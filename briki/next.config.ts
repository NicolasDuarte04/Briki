import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
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
    return config;
  },
  // Disable strict mode to prevent double renders in development
  reactStrictMode: false,
  // Optimize CSS loading to inline critical font styles
  experimental: {
    optimizeCss: true,
  },
};

export default nextConfig;
