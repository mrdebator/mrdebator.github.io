/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure Next.js to export a static site
  output: 'export',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
