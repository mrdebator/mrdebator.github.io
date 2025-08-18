/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure Next.js to export a static site
  output: 'export',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
