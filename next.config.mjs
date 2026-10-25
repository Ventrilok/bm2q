/** @type {import('next').NextConfig} */
const nextConfig = {
  // The game server shares this process and port (see server.ts).
  devIndicators: false,
  poweredByHeader: false,
  // The app never uses next/image: disable the on-the-fly image optimizer
  // (/_next/image), which is an attack surface (SVG/AVIF RCE advisories).
  images: { unoptimized: true },
};

export default nextConfig;
