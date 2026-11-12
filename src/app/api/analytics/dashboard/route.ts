import { NextResponse } from 'next/server'
import { requireAccount } from '@/lib/security/access'
import { getMetrics } from '@/lib/analytics/metrics'
import { apiError } from '@/lib/security/http'
export async function GET() {
  try {await requireAccount(); return NextResponse.json({data:await getMetrics()})}
  catch(error){return apiError(error)}
}
