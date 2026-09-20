import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: false,
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      aws4: false,
      kerberos: false,
      "@mongodb-js/zstd": false,
      snappy: false
    };
    return config;
  }
};

export default nextConfig;
