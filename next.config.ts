import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["next-sanity"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
        pathname: "/**",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/besiktning",
        destination: "/analys",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
