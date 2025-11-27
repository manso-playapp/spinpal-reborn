/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer, dev }) => {
    // Agregar regla para manejar handlebars
    config.module.rules.push({
      test: /\.handlebars$/,
      loader: 'handlebars-loader'
    });

    // Deshabilitar source maps en producción
    if (!dev) {
      config.devtool = false;
    }

    return config;
  },
  // Configuración para permitir recursos multimedia
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*'
          }
        ]
      }
    ];
  },
  images: {
    unoptimized: false,
    dangerouslyAllowSVG: true,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'mansoestudiocreativo.com',
      },
      {
        protocol: 'http',
        hostname: 'mansoestudiocreativo.com',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'fasswmjlipnfpgoslzwk.supabase.co',
      }
    ]
  },
  output: 'standalone'
};

module.exports = nextConfig;
