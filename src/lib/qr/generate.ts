import QRCode from 'qrcode'

interface QROptions {
  shortCode: string
  color?: string   // brand color hex
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://funnelflow.com'

// Generate QR as SVG string (for storing / displaying)
export async function generateQRSvg({ shortCode, color = '#000000' }: QROptions): Promise<string> {
  const url = `${APP_URL}/f/${shortCode}`

  const svg = await QRCode.toString(url, {
    type: 'svg',
    color: {
      dark: color,
      light: '#FFFFFF',
    },
    width: 300,
    margin: 2,
    errorCorrectionLevel: 'H', // High — survives printing damage
  })

  return svg
}

// Generate QR as PNG Buffer (for download)
export async function generateQRPng({ shortCode, color = '#000000' }: QROptions): Promise<Buffer> {
  const url = `${APP_URL}/f/${shortCode}`

  const buffer = await QRCode.toBuffer(url, {
    type: 'png',
    color: {
      dark: color,
      light: '#FFFFFF',
    },
    width: 600,
    margin: 2,
    errorCorrectionLevel: 'H',
  })

  return buffer
}

// Get the funnel URL for a short code
export function getFunnelUrl(shortCode: string): string {
  return `${APP_URL}/f/${shortCode}`
}
