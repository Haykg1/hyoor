import createNextIntlPlugin from 'next-intl/plugin';

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@repo/shared'],
  output: 'standalone',
  experimental: {
    // Keep visited pages in the client router cache longer so browser back/forward
    // restores them (and their scroll position) instantly instead of refetching
    // and briefly painting at the top.
    staleTimes: {
      dynamic: 180,
      static: 300,
    },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'img.rocket.new' },
      { protocol: 'https', hostname: '*.amazonaws.com' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '*.localhost' },
      { protocol: 'http', hostname: 'localhost.localstack.cloud' },
      { protocol: 'http', hostname: '*.localhost.localstack.cloud' },
    ],
  },
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl(nextConfig);
