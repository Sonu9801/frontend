import withPWAInit from "@ducanh2912/next-pwa";
import path from "path";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: true,
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: path.resolve(__dirname, ".."),
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  allowedDevOrigins: [
    '192.168.1.3',
    '192.168.1.6',
    '10.19.107.83',
    'michigan-half-poly-projects.trycloudflare.com',
    'baskets-ranks-use-gets.trycloudflare.com',
    'necessary-doc-knights-dana.trycloudflare.com',
    'sig-after-vampire-sitting.trycloudflare.com',
    'wav-collapse-vista-hands.trycloudflare.com',
    'deepness-computer-batboy.ngrok-free.dev',
  ],
  async rewrites() {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiBase}/api/:path*`
      },
      {
        source: '/ws/:path*',
        destination: `${apiBase}/ws/:path*`
      },
      {
        source: '/uploads/:path*',
        destination: `${apiBase}/uploads/:path*`
      }
    ];
  },
};

export default withPWA(nextConfig);

// trigger restart
