import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  allowedDevOrigins: ['100.82.231.60', '192.168.29.106'],
};

export default nextConfig;
