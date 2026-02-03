/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Descomenta las siguientes líneas para ocultar el indicador "N" de Next.js en desarrollo
  devIndicators: {
    buildActivity: true, // Cambia a true para mostrar el indicador
    buildActivityPosition: 'bottom-right',
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '192.168.1.66',
          },
        ],
      },
    ]
  }
}

module.exports = nextConfig