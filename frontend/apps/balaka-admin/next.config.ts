import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["balaka-ui", "balaka-core"],
  compress: false, // Disable compression for better SSE streaming support
  async rewrites() {
    const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://localhost:8008';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/static/:path*',
        destination: `${backendUrl}/static/:path*`,
      },
    ];
  },
};

export default nextConfig;