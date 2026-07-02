// Amazon SP-API — Order Verification
// Docs: https://developer-docs.amazon.com/sp-api/docs/orders-api-v0-reference

interface TokenResponse {
  access_token: string
  expires_in:   number
}

let cachedToken: { token: string; expiresAt: number } | null = null

// ─── Region Mapping ────────────────────────────────────────────────────────────
const EU_MARKETPLACES = new Set([
  'UK', 'DE', 'FR', 'IT', 'ES', 'IN', 'NL', 'PL', 'SE', 'TR', 'AE', 'SA', 'EG', 'BE',
])
const FE_MARKETPLACES = new Set(['JP', 'AU', 'SG'])

export function getSpApiEndpoint(marketplace: string): string {
  const mkt = marketplace.toUpperCase()
  if (EU_MARKETPLACES.has(mkt)) return 'https://sellingpartnerapi-eu.amazon.com'
  if (FE_MARKETPLACES.has(mkt))  return 'https://sellingpartnerapi-fe.amazon.com'
  return 'https://sellingpartnerapi-na.amazon.com' // Default: North America (US, CA, MX, BR)
}

// ─── Access Token ──────────────────────────────────────────────────────────────
async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.token
  }

  const res = await fetch('https://api.amazon.com/auth/o2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: process.env.AMAZON_REFRESH_TOKEN!,
      client_id:     process.env.AMAZON_CLIENT_ID!,
      client_secret: process.env.AMAZON_CLIENT_SECRET!,
    }),
  })

  if (!res.ok) throw new Error('Failed to get Amazon access token')

  const data: TokenResponse = await res.json()
  cachedToken = {
    token:     data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }

  return data.access_token
}

// ─── Order Verification ────────────────────────────────────────────────────────
export async function verifyAmazonOrderId(
  orderId:     string,
  marketplace: string = 'US',
): Promise<boolean> {
  // Amazon order IDs must match format: 123-1234567-1234567
  const amazonOrderRegex = /^\d{3}-\d{7}-\d{7}$/
  if (!amazonOrderRegex.test(orderId)) return false

  // If SP-API credentials are not configured, accept valid-format orders
  const hasSpApi =
    process.env.AMAZON_CLIENT_ID &&
    process.env.AMAZON_CLIENT_SECRET &&
    process.env.AMAZON_REFRESH_TOKEN

  if (!hasSpApi) {
    // No credentials → accept the order (seller manually reviews in Claims Center)
    return true
  }

  try {
    const token    = await getAccessToken()
    const endpoint = getSpApiEndpoint(marketplace)

    const res = await fetch(
      `${endpoint}/orders/v0/orders/${orderId}`,
      {
        headers: {
          'x-amz-access-token': token,
          'Content-Type':       'application/json',
        },
      }
    )

    if (!res.ok) return false

    const data   = await res.json()
    const status = data?.payload?.OrderStatus

    // Accept orders that have been shipped or are in progress
    const validStatuses = ['Shipped', 'Delivered', 'Unshipped', 'PartiallyShipped']
    return validStatuses.includes(status)
  } catch (error) {
    console.error('Amazon SP-API error:', error)
    // Fail open — don't block legitimate customers if API is temporarily down
    return true
  }
}
