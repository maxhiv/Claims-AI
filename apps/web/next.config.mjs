/** @type {import('next').NextConfig} */
const nextConfig = { 
  // Allow all hosts for Replit proxy environment
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Allow all hosts for development
      config.devServer = {
        ...config.devServer,
        allowedHosts: 'all'
      };
    }
    return config;
  }
};
export default nextConfig;
