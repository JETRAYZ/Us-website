import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage (wildcard covers any project ID)
      { protocol: 'https', hostname: '**.supabase.co' },
      // iTunes / Apple Music artwork
      { protocol: 'https', hostname: '**.mzstatic.com' },
    ],
  },
  experimental: {
    // lucide-react is already in the default optimized list — only add framer-motion
    optimizePackageImports: ['framer-motion'],
  },
};

export default nextConfig;

