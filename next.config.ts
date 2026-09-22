import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "mammoth", "@prisma/client", "pdfjs-dist"],
};

export default nextConfig;
