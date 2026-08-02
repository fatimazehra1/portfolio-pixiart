import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project. Without it, Next can infer the wrong
  // root from a stray lockfile higher up the tree (e.g. in the home directory).
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
