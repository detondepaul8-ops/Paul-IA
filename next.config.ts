import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Moteur vidéo interne : ffmpeg-static doit rester un paquet externe
  // (binaire natif) et être embarqué dans les fonctions qui encodent.
  serverExternalPackages: ["ffmpeg-static"],
  outputFileTracingIncludes: {
    "/api/chat": ["./node_modules/ffmpeg-static/**"],
    "/api/autonomy-test": ["./node_modules/ffmpeg-static/**"],
  },
};

export default nextConfig;
