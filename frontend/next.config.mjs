// Next.js configuration for the frontend app. Enables React strict mode and
// allowlists Google's avatar image host so profile pictures returned by
// Google OAuth can be rendered through next/image.

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
};

export default nextConfig;
