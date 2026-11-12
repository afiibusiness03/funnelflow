/** @type {import('next').NextConfig} */
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : null
const csp = [
  "default-src 'self'", "base-uri 'self'", "object-src 'none'", "frame-ancestors 'none'",
  "form-action 'self' https://checkout.stripe.com https://billing.stripe.com",
  `script-src 'self' 'unsafe-inline' https://js.stripe.com ${process.env.NODE_ENV === 'development' ? "'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'", "img-src 'self' https: data: blob:", "font-src 'self' data:",
  `connect-src 'self' ${supabaseHost ? `https://${supabaseHost} wss://${supabaseHost}` : ''} https://api.stripe.com`,
  "frame-src https://js.stripe.com https://hooks.stripe.com",
].join('; ')
const nextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      ...(supabaseHost ? [{ protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/public/**' }] : []),
      { protocol: 'https', hostname: 'images.amazon.com' },
      { protocol: 'https', hostname: 'm.media-amazon.com' },
    ],
    dangerouslyAllowSVG: false,
  },
  async headers() {
    return [
      {source:'/:path*',headers:[
        {key:'X-Content-Type-Options',value:'nosniff'},
        {key:'X-Frame-Options',value:'DENY'},
        {key:'Content-Security-Policy',value:csp},
        {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
        {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'},
        {key:'Strict-Transport-Security',value:'max-age=63072000; includeSubDomains'},
      ]},
      {source:'/api/:path*',headers:[{key:'Cache-Control',value:'private, no-store'}]},
    ]
  },
}
export default nextConfig
