import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["postgres"],
  async rewrites() {
    return [{ source: "/embed/:id.svg", destination: "/embed/:id" }];
  },
};

export default nextConfig;
