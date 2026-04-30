import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Default 1MB breaks forms that upload photos (see actions.ts MAX_IMAGE_SIZE).
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        pathname: "/**",
      },
    ],
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
