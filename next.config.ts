import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    // Uploads grandes (até 100 MB) passam pelo route handler
    // /api/obras/[id]/ficheiros — Server Actions ficam com limite conservador
    // para reduzir superfície de DoS em payloads JSON.
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
