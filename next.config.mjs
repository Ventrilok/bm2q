/** @type {import('next').NextConfig} */
const nextConfig = {
  // Colyseus server runs separately on port 2567
  // No need for API rewrites since client connects directly via WebSocket
  devIndicators: false,
};

export default nextConfig;
