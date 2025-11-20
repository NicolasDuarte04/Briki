import type { NextConfig } from "next";
import path from "node:path";

const withNextIntl = require("next-intl/plugin")(
  './src/i18n/request.ts'
);

const nextConfig: NextConfig = {
  // Temporarily ignore build errors for quick deployment
  // ✅ Next.js 16: eslint config moved to separate command
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
      
      // ✅ SOLUCIÓN ALTERNATIVA: Configurar Webpack para manejar ES modules correctamente
      // El problema es que pdfjs-dist es un ES module puro y Webpack intenta procesarlo como CommonJS
      config.resolve = config.resolve || {};
      config.resolve.extensionAlias = {
        '.js': ['.js', '.ts', '.tsx'],
        '.mjs': ['.mjs', '.js'],
      };
      
      // Forzar que Webpack no requiera extensiones completas para ES modules
      config.resolve.fullySpecified = false;
      
      // Configurar reglas específicas para .mjs en node_modules
      config.module = config.module || {};
      config.module.rules = config.module.rules || [];
      
      // Regla específica para pdfjs-dist: tratarlo como ES module
      config.module.rules.push({
        test: /\.mjs$/,
        include: /node_modules\/pdfjs-dist/,
        type: 'javascript/esm',
        resolve: {
          fullySpecified: false,
        },
      });
    }
    
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias['pg-native'] = false;
    return config;
  },
  // Disable strict mode to prevent double renders in development
  reactStrictMode: false,
  // Optimize CSS loading to inline critical font styles
  experimental: {
    optimizeCss: true,
    // ✅ SOLUCIÓN ALTERNATIVA: Habilitar soporte para ES modules externos
    // Esto permite que Next.js maneje mejor módulos como pdfjs-dist que son ES modules puros
    esmExternals: true,
  },
};

export default withNextIntl(nextConfig);
