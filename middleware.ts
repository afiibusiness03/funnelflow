import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Auth-only pages: redirect logged-in users away from these
const AUTH_ROUTES = ['/login', '/register', '/forgot-password']

// Always public — accessible to anyone (logged-in or not, trial or not)
const OPEN_ROUTES  = ['/pricing', '/trial-expired', '/billing/success']

const isFunnelRoute   = (pathname: string) => pathname.startsWith('/f/')
const isApiRoute      = (pathname: string) => pathname.startsWith('/api/')
const isAuthRoute     = (pathname: string) => AUTH_ROUTES.some((r) => pathname.startsWith(r))
const isOpenRoute     = (pathname: string) => OPEN_ROUTES.some((r)  => pathname.startsWith(r))
const isProtectedRoute = (pathname: string) =>
  !isFunnelRoute(pathname) && !isApiRoute(pathname) && !isAuthRoute(pathname) && !isOpenRoute(pathname)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always allow public funnel routes (customers scanning QR codes)
  if (isFunnelRoute(pathname)) return NextResponse.next()

  // Always allow open routes (pricing, trial-expired) — no redirect needed
  if (isOpenRoute(pathname)) return NextResponse.next()

  // Refresh Supabase session on every request
  const { supabaseResponse, user } = await updateSession(request)

  // Not logged in → redirect to login (for protected routes only)
  if (!user && isProtectedRoute(pathname)) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Already logged in on auth pages (login/register) → go to dashboard
  if (user && isAuthRoute(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
