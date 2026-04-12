import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/crm", destination: "/customers", permanent: true },
      { source: "/crm/:path*", destination: "/customers/:path*", permanent: true },
      { source: "/entities", destination: "/subsidiaries", permanent: true },
      { source: "/entities/:path*", destination: "/subsidiaries/:path*", permanent: true },
      { source: "/quotes", destination: "/estimates", permanent: true },
      { source: "/quotes/:path*", destination: "/estimates/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
