import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // There's a lockfile in the home dir too; pin the root or Turbopack picks the wrong one.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
