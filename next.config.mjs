/** @type {import('next').NextConfig} */
const nextConfig = {
  // Colyseus server runs separately on port 2567
  // No need for API rewrites since client connects directly via WebSocket
  devIndicators: false,
  // The app never uses next/image: disable the on-the-fly image optimizer
  // (/_next/image), which is an attack surface (SVG/AVIF RCE advisories).
  images: { unoptimized: true },
};

export default nextConfig;
