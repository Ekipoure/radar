/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    TZ: 'Asia/Tehran',
  },
  webpack: (config, { isServer }) => {
    // Handle SSH2 native modules
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'ssh2': 'commonjs ssh2'
      });
    }
    
    // Ignore SSH2 native binaries in client-side builds
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'ssh2': false,
    };

    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['ssh2']
  }
}

module.exports = nextConfig
