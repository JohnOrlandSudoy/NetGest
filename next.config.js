/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable telemetry to fix the EPERM error
  tracing: false,
  telemetry: {
    telemetryDisabled: true,
  },
  // Silence certain build warnings
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000, // 1 hour
    pagesBufferLength: 5,
  },
  // Set runtime configuration
  reactStrictMode: false,
  // Suppress all client-side console errors in production
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
  },
  // Optimize package imports for better performance
  experimental: {
    // Disable CSS optimization to avoid critters dependency issues
    optimizeCss: false,
    optimizePackageImports: [
      'react-icons',
      'chart.js',
      'lodash',
      'date-fns',
      'react-table'
    ],
  },
  // Increase webpack performance
  webpack: (config, { isServer }) => {
    // Only log warnings/errors in terminal
    config.infrastructureLogging = { level: "error" };
    
    // Add fallbacks for node modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
      child_process: false,
    };
    
    return config;
  },
  // Add custom headers to suppress error reporting
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [{ key: "X-Error-Visible", value: "false" }],
      },
    ];
  },
  // Add serverExternalPackages to avoid bundling issues
  serverExternalPackages: [
    'sharp',
    'canvas',
    'jsdom',
    'puppeteer',
    'puppeteer-core',
    '@aws-sdk/client-s3',
    'critters'
  ],
};

module.exports = nextConfig;
