import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["dev-vm", "localhost", "127.0.0.1", "colleague-youth-ice-acute.trycloudflare.com"],
};

export default nextConfig;
