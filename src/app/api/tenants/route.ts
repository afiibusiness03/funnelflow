import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateSlug } from '@/lib/utils/helpers'

export async function POST(request: Request) {
  try {
    const { name, userId, email, fullName } = await request.json()

    if (!name || !userId || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // 1. Create tenant with 14-day free trial
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name,
        slug:           generateSlug(name),
        email,
        plan:           'starter',
        plan_status:    'trialing',
        trial_ends_at:  trialEndsAt,  // expires in 14 days
        max_campaigns:  2,            // free trial limit
        max_promotions: 2,            // free trial limit
      })
      .select()
      .single()

    if (tenantError) {
      console.error('Tenant creation error:', tenantError)
      return NextResponse.json({ error: 'Failed to create tenant' }, { status: 500 })
    }

    // 2. Create user record linked to tenant
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        tenant_id: tenant.id,
        email,
        full_name: fullName,
        role: 'owner',
      })

    if (userError) {
      console.error('User creation error:', userError)
      // Rollback tenant
      await supabase.from('tenants').delete().eq('id', tenant.id)
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    return NextResponse.json({ tenant }, { status: 201 })
  } catch (error) {
    console.error('Register API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
