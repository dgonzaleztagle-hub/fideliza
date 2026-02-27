import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Powered-By',
            value: 'HojaCero',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
