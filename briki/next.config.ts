import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    // Ensure Turbopack (when enabled) resolves the project root to this app
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
