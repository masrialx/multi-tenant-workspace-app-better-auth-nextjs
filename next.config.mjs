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
  // Enable standalone output for Docker deployments
  // This creates a minimal server.js file for production
  output: process.env.DOCKER_BUILD === 'true' ? 'standalone' : undefined,
  // Experimental features
  experimental: {
    outputFileTracingRoot: process.env.DOCKER_BUILD === 'true' ? require('path').join(__dirname) : undefined,
  },
}

export default nextConfig
