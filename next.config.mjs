/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Enable type checking in production builds
    // Set to true only if you want to ignore errors during build
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
