import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Parsing libraries run on the server only.
  serverExternalPackages: ["mailparser", "unpdf", "mammoth", "xlsx"],
};

export default nextConfig;
