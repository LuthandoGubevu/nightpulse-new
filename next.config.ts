import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: [
    'firebase-admin',
    'firebase-admin/app',
    'firebase-admin/firestore',
    'firebase-admin/auth',
    '@grpc/grpc-js',
    '@grpc/proto-loader',
    'google-gax',
    '@google-cloud/firestore',
    'protobufjs',
  ],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    // Netlify applies a strict Cross-Origin-Opener-Policy by default, which blocks
    // Firebase Auth's signInWithPopup from detecting when the popup window closes
    // (it needs window.closed access on a cross-origin popup). Relax it site-wide to
    // the popup-compatible variant, which still isolates the browsing context from
    // other cross-origin windows otherwise.
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
