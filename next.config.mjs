/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  webpack: (config, { isServer }) => {
    config.module.rules.push({
      test: /\.mjs$/,
      type: "javascript/auto"
    });

    if (!isServer) {
      config.resolve.mainFields = ["browser", "module", "main"];
    }

    return config;
  }
};
export default nextConfig;
