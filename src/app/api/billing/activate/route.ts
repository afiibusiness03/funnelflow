import { NextResponse } from 'next/server'
// A browser redirect is not authoritative proof of the current subscription state.
// Signed Stripe webhooks synchronize billing; legacy success URLs only navigate.
export async function GET(request: Request) {
  return NextResponse.redirect(new URL('/billing/success',request.url))
}
