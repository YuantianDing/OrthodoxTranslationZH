/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  staticPageGenerationTimeout: 300,
  output: 'export',
}
export default nextConfig
