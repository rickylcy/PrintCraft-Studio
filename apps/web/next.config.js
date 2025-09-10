/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Let RSC/route handlers require the native package at runtime
    serverComponentsExternalPackages: ["@napi-rs/canvas"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Ensure Webpack treats it as external so it doesn't try to parse .node
      config.externals = config.externals || [];
      if (!config.externals.includes("@napi-rs/canvas")) {
        config.externals.push("@napi-rs/canvas");
      }
    }
    return config;
  },
};

module.exports = nextConfig;
