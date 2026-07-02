import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Re-deliver a previously approved or failed claim
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Re-use the approve route logic
  const approveRes = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/claims/${params.id}/approve`,
    { method: 'POST', headers: { cookie: '' } }
  )
  const json = await approveRes.json()
  return NextResponse.json(json, { status: approveRes.status })
}
