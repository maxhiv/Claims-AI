/** @type {import('next').NextConfig} */
const nextConfig = { 
  experimental: { appDir: true },
  // Allow all hosts for Replit proxy environment
  allowedHosts: '*',
  devServer: {
    allowedHosts: 'all'
  }
};
export default nextConfig;
