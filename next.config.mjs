import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: resolve(__dirname),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
  env: {
    GOOGLE_CLOUD_VISION_API_KEY: process.env.GOOGLE_CLOUD_VISION_API_KEY,
  },
};

export default nextConfig;
