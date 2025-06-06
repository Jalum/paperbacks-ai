import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'oaidalleapiprodscus.blob.core.windows.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.blob.vercel-storage.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Increase body size limit for file uploads
  experimental: {
    serverComponentsExternalPackages: ['sharp'],
  },
  // API route configuration
  api: {
    bodyParser: {
      sizeLimit: '15mb', // Increase from default 1mb to handle larger images
    },
  },
};

export default nextConfig;
