import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the project root so a stray package-lock.json in a parent folder is ignored.
  turbopack: { root: path.join(__dirname) },
  // Parsing libraries run on the server only.
  serverExternalPackages: ["mailparser", "unpdf", "mammoth", "xlsx", "jszip"],
  // Hosted deployments (e.g. Vercel) must ship the corpus and the knowledge base with the server code.
  outputFileTracingIncludes: { "/*": ["./data/**/*", "./corpus/**/*"], "/**": ["./data/**/*", "./corpus/**/*"] },
  outputFileTracingExcludes: { "/*": ["./data/updates/**/*", "./data/eval/results/**/*"], "/**": ["./data/updates/**/*", "./data/eval/results/**/*"] },
};

export default nextConfig;
