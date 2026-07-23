import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: false, // TEMPORARILY ENABLED for mobile PWA install testing
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig = {
  reactStrictMode: true,
  devIndicators: {
    buildActivity: false,
    appIsrStatus: false,
  },
  turbopack: {},
  typescript: {
    ignoreBuildErrors: true,
  },
  allowedDevOrigins: ['michigan-half-poly-projects.trycloudflare.com', 'baskets-ranks-use-gets.trycloudflare.com', 'necessary-doc-knights-dana.trycloudflare.com', 'sig-after-vampire-sitting.trycloudflare.com', 'wav-collapse-vista-hands.trycloudflare.com', '192.168.1.6', '10.19.107.83', 'deepness-computer-batboy.ngrok-free.dev'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.foxenterprises.co.in'}/api/:path*`
      },
      {
        source: '/ws/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.foxenterprises.co.in'}/ws/:path*`
      }
    ];
  },
};

export default withPWA(nextConfig);

// trigger restart
