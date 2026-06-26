/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
  // Prevent pdf-lib and PGlite WASM from being bundled — load them as native Node modules
  serverExternalPackages: ['pdf-lib', '@electric-sql/pglite'],
}

export default nextConfig
