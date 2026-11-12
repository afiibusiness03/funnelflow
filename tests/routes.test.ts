import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { Resend } from 'resend'

const require = createRequire(import.meta.url)
const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const request = (body: unknown, url = 'https://test.invalid/api/test') => new Request(url, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
})

// Run the actual handlers with an isolated database/provider boundary. No env files or network.
function harness(options: { anonymous?: boolean; active?: boolean; rateError?: boolean; rateAllowed?: boolean; webhook?: any; syncError?: boolean } = {}) {
  const queries: any[] = [], sends: any[] = []
  const campaign = { id: A, tenant_id: A, promotion_id: A, require_order_verify: true,
    smart_routing: false, review_url: 'https://example.invalid/review',
    tenant: { plan_status: options.active === false ? 'canceled' : 'active' },
    promotion: { id: A, tenant_id: A, auto_deliver: false, is_active: true, coupon_code: 'SECRET-REWARD' } }
  const db = {
    auth: { getUser: async () => ({ data: { user: options.anonymous ? null : { id: A, user_metadata: {} } } }), exchangeCodeForSession: async () => ({ error: null }) },
    rpc: async (name: string, args: unknown) => {
      queries.push({ rpc: name, args })
      return name === 'consume_rate_limit' ? { data: options.rateAllowed !== false, error: options.rateError ? {} : null } : { data: A, error: null }
    },
    from(table: string) {
      const query: any = { table, op: 'read', filters: [] }
      const chain: any = {}
      for (const op of ['select','eq','in','is','limit','order','range','update','insert','delete']) chain[op] = (...args: any[]) => {
        if (['insert','update','delete'].includes(op)) { query.op = op; query.payload = args[0] }
        else query.filters.push([op,...args])
        return chain
      }
      function result() {
        queries.push(query)
        let data: any = null
        if (table === 'campaigns') data = campaign
        if (table === 'funnel_submissions' && query.op === 'insert') data = { id: B }
        if (table === 'products') data = [] // foreign selection is not owned
        return { data, error: null, count: 0 }
      }
      chain.single = async () => result()
      chain.then = (resolve: any, reject: any) => Promise.resolve(result()).then(resolve,reject)
      return chain
    },
  }
  const modules = new Map<string, any>()
  const stubs: Record<string, any> = {
    'server-only': {},
    '@/lib/supabase/server': { createClient: async () => db, createServiceClient: () => db },
    '@/lib/resend/client': { resend: new Resend('re_synthetic'), FROM: 'test@example.invalid' },
    '@/lib/resend/deliver-reward': { deliverReward: async (...args: any[]) => { sends.push(args); return true } },
    '@/lib/stripe/client': { stripe: { webhooks: { constructEvent: () => { if (!options.webhook) throw new Error('Bad signature'); return options.webhook } } } },
    '@/lib/stripe/sync': { syncSubscription: async () => { if (options.syncError) throw new Error('Synthetic database outage') }, syncInvoice: async () => {} },
  }
  function load(file: string): any {
    file = resolve(file)
    if (modules.has(file)) return modules.get(file)
    const exports = {}; modules.set(file,exports)
    const source = ts.transpileModule(readFileSync(file,'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
    runInNewContext(source, { exports, require: (name: string) => {
      if (name in stubs) return stubs[name]
      if (name === '@/lib/security/access') return {
        hasAccess: (tenant: any) => tenant.plan_status === 'active',
        requireAccount: async () => {
          if (options.anonymous) throw new (load('src/lib/security/http.ts').HttpError)(401,'Unauthorized')
          return { supabase: db, profile: { tenant_id: A, role: 'owner' } }
        },
      }
      if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`)
      if (name.startsWith('.')) return load(resolve(dirname(file),`${name}.ts`))
      return require(name)
    }, process: { env: { SUPABASE_SERVICE_ROLE_KEY: 'synthetic-only', RESEND_WEBHOOK_SECRET: 'whsec_c3ludGhldGlj', STRIPE_WEBHOOK_SECRET: 'synthetic' } },
      Buffer, URL, Date, console: { error() {} }, fetch() { throw new Error('Network is disabled in route tests') },
    }, { filename: file, timeout: 3000 })
    return exports
  }
  return { load, queries, sends }
}

test('submission ignores forged verification, tenant and promotion; never reveals the coupon', async () => {
  const h = harness()
  const response = await h.load('src/app/api/funnel/submit/route.ts').POST(request({ campaignId: A, customerEmail: 'BUYER@example.invalid', orderId: '123-1234567-1234567', orderVerified: true, tenantId: B, promotionId: B, rating: 5, feedbackText: 'Synthetic feedback only' }))
  assert.equal(response.status,200)
  const body = await response.json()
  assert.equal(body.coupon_code,null); assert.equal(body.promotionDelivered,false)
  const write = h.queries.find(q => q.table === 'funnel_submissions' && q.op === 'insert').payload
  assert.equal(write.order_verified,false); assert.equal(write.claim_status,'pending')
  assert.equal(write.tenant_id,A); assert.equal(write.promotion_id,A)
  assert.equal(write.customer_email,'buyer@example.invalid'); assert.equal(h.sends.length,0)
})

test('inactive accounts cannot accept public claims', async () => {
  const h = harness({ active: false })
  const response = await h.load('src/app/api/funnel/submit/route.ts').POST(request({ campaignId: A, customerEmail: 'buyer@example.invalid', orderId: '123', rating: 5, feedbackText: 'Synthetic feedback only' }))
  assert.equal(response.status,404); assert(!h.queries.some(q => q.op === 'insert'))
})

test('foreign campaign products/promotions are rejected before any privileged write', async () => {
  for (const body of [{product_ids:[B]},{promotion_id:B}]) {
    const h = harness()
    const response = await h.load('src/app/api/campaigns/[id]/route.ts').PATCH(request(body), { params: Promise.resolve({ id: A }) })
    assert.equal(response.status,400); assert(!h.queries.some(q => ['update','insert','delete'].includes(q.op)))
  }
})

test('protected APIs enforce authentication independently of middleware', async () => {
  for (const file of ['products','campaigns','claims','analytics/dashboard']) {
    const h = harness({ anonymous: true })
    const response = await h.load(`src/app/api/${file}/route.ts`).GET(new Request('https://test.invalid/api/test'))
    assert.equal(response.status,401); assert.equal(h.queries.length,0)
  }
})

test('rate limiter fails closed on unavailable storage and on exhausted buckets', async () => {
  for (const [options,status] of [[{rateError:true},503],[{rateAllowed:false},429]] as const) {
    const h = harness(options)
    const response = await h.load('src/app/api/funnel/verify-order/route.ts').POST(request({ campaignId:A, orderId:'123-1234567-1234567' }))
    assert.equal(response.status,status); assert(!h.queries.some(q => q.table))
  }
})

test('valid-looking order numbers do not count as verified purchases', async () => {
  const h = harness()
  const response = await h.load('src/app/api/funnel/verify-order/route.ts').POST(request({ campaignId:A, orderId:'123-1234567-1234567' }))
  assert.equal(response.status,200); assert.equal((await response.json()).verified,false)
})

test('unsigned Resend/Stripe webhooks cannot mutate deliveries or billing', async () => {
  for (const provider of ['resend','stripe']) {
    const h = harness()
    const response = await h.load(`src/app/api/webhooks/${provider}/route.ts`).POST(request({ type:'email.delivered', data:{email_id:'fake'} }))
    assert.equal(response.status,400); assert.equal(h.queries.length,0)
  }
})

test('Stripe processing failures return retryable status instead of acknowledging lost updates', async () => {
  const h = harness({ webhook: { type:'customer.subscription.updated',data:{object:{id:'sub_fake'}} }, syncError:true })
  const req = request({}); req.headers.set('stripe-signature','synthetic')
  const response = await h.load('src/app/api/webhooks/stripe/route.ts').POST(req)
  assert.equal(response.status,503)
})

test('legacy billing activation GET is navigation only, even with a forged session', async () => {
  const h = harness()
  const response = await h.load('src/app/api/billing/activate/route.ts').GET(new Request('https://test.invalid/api/billing/activate?session_id=old_session'))
  assert.equal(response.headers.get('location'),'https://test.invalid/billing/success'); assert.equal(h.queries.length,0)
})

test('claim pagination rejects oversized and invalid ranges before querying data', async () => {
  for (const query of ['per_page=1000000','page=-1','page=NaN','status=unknown']) {
    const h = harness()
    const response = await h.load('src/app/api/claims/route.ts').GET(new Request(`https://test.invalid/api/claims?${query}`))
    assert.equal(response.status,400); assert.equal(h.queries.length,0)
  }
})
