import 'server-only'
import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'

// Public marketing content only. Never put session or tenant data in shared caches.
export const getPublicSiteSettings = unstable_cache(async () => {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await db.from('site_settings').select('*').eq('id', '00000000-0000-0000-0000-000000000000').single()
  if (error && error.code !== 'PGRST116') throw new Error('Site settings unavailable')
  return data
}, ['public-site-settings-v1'], { revalidate: 60 })
