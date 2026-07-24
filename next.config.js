/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'images.amazon.com' },
      { protocol: 'https', hostname: '**.amazon.com' },
    ],
  },
  async headers() {
    return [
      {
        // Global security headers for all routes
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
      {
        // Public funnel pages — allow same-origin framing if needed
        source: '/f/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
      {
        // API routes & Dashboard — deny framing completely to prevent clickjacking
        source: '/api/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
      {
        source: '/dashboard/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ]
  },
  // Disable webpack persistent cache in dev to prevent stale-chunk errors (Next.js 14 bug)
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false
    }
    return config
  },
}

export default nextConfig
