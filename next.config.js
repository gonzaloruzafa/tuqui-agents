/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    'pdf-parse',
    'puppeteer',
    'puppeteer-extra',
    'puppeteer-extra-plugin-stealth',
    'puppeteer-core'
  ],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // No bundlear Puppeteer y sus dependencias en el servidor
      config.externals = [
        ...config.externals,
        'puppeteer',
        'puppeteer-extra',
        'puppeteer-extra-plugin-stealth'
      ]
    }
    return config
  }
}

module.exports = nextConfig
// Build trigger 1765589346
