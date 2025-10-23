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
    
    // Ignore problematic modules in client-side builds
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'ssh2': false,
      'bcrypt': false,
      'aws-sdk': false,
      'mock-aws-s3': false,
      'nock': false,
      'fs': false,
      'path': false,
      'os': false,
      'crypto': false,
      'stream': false,
      'util': false,
      'url': false,
      'querystring': false,
      'http': false,
      'https': false,
      'zlib': false,
      'net': false,
      'tls': false,
      'child_process': false,
      'dns': false,
      'pg': false,
      'pg-native': false,
    };

    // Ignore problematic files
    config.module.rules.push({
      test: /\.html$/,
      use: 'ignore-loader'
    });

    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['ssh2']
  }
}

module.exports = nextConfig
