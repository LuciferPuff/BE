import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["next-sanity"],
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
