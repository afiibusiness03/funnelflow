import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateQRSvg, generateQRPng } from '@/lib/qr/generate'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') ?? 'svg'   // svg | png
  const color  = searchParams.get('color')  ?? '#000000'

  const { data: campaign } = await supabase
    .from('campaigns').select('qr_short_code').eq('id', params.id).single()

  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (format === 'png') {
    const buffer = await generateQRPng({ shortCode: campaign.qr_short_code, color })
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="qr-${campaign.qr_short_code}.png"`,
      },
    })
  }

  const svg = await generateQRSvg({ shortCode: campaign.qr_short_code, color })
  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Content-Disposition': `attachment; filename="qr-${campaign.qr_short_code}.svg"`,
    },
  })
}
