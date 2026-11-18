import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { readApiResponse } from '../src/lib/utils/api-response'

const require = createRequire(import.meta.url)

test('HTML error pages, login redirects and malformed JSON never become successful claim actions', async () => {
  for (const status of [200, 404, 500, 504]) {
    await assert.rejects(readApiResponse(new Response('<!DOCTYPE html><html>error</html>', { status, headers: { 'content-type': 'text/html' } })), new RegExp(`HTTP ${status}`))
  }
  const redirected = new Response('{}', { headers: { 'content-type': 'application/json' } })
  Object.defineProperty(redirected, 'redirected', { value: true })
  await assert.rejects(readApiResponse(redirected), /sign in again/)
  for (const body of ['{broken', 'null', '[]']) {
    await assert.rejects(readApiResponse(new Response(body, { headers: { 'content-type': 'application/json' } })), /unexpected response/)
  }
  await assert.rejects(readApiResponse(Response.json({ error: 'Email delivery is not configured' }, { status: 503 })), /Email delivery is not configured/)
  assert.equal((await readApiResponse(Response.json({ success: true, delivered: true }))).delivered, true)
})

// Actual delivery/client code; only the database, provider and environment are synthetic.
function deliveryHarness(options: { missingKey?: boolean; sendError?: boolean; finishError?: boolean; alreadySent?: boolean } = {}) {
  const sends: any[] = [], rpcs: string[] = []
  const db = { rpc: async (name: string) => {
    rpcs.push(name)
    if (name === 'reserve_reward') return { data: { reserved: true, sent: !!options.alreadySent, reserved_at: new Date().toISOString(), payload: {
      type: 'coupon_code', coupon_code: 'SYNTHETIC', customer_email: 'test@example.invalid', title: 'Test seller',
    } }, error: null }
    return { error: options.finishError ? { message: 'Synthetic failure' } : null }
  } }
  class FakeResend {
    emails = { send: async (...args: any[]) => {
      sends.push(args)
      return options.sendError ? { data: null, error: { message: 'Synthetic provider failure' } } : { data: { id: 'synthetic-email' }, error: null }
    } }
  }
  const modules = new Map<string, any>()
  function load(file: string): any {
    file = resolve(file)
    if (modules.has(file)) return modules.get(file)
    const exports = {}; modules.set(file, exports)
    const source = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
    runInNewContext(source, { exports, require: (name: string) => {
      if (name === 'server-only') return {}
      if (name === 'resend') return { Resend: FakeResend }
      if (name === '@/lib/supabase/server') return { createServiceClient: () => db }
      if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`)
      if (name.startsWith('.')) return load(resolve(dirname(file), `${name}.ts`))
      return require(name)
    }, process: { env: options.missingKey ? {} : { RESEND_API_KEY: 're_synthetic' } }, Date, URL, Buffer, console: { error() {} } }, { filename: file, timeout: 3000 })
    return exports
  }
  return { load, sends, rpcs }
}

test('missing email configuration loads safely and returns a controlled JSON 503 on delivery', async () => {
  const h = deliveryHarness({ missingKey: true })
  const delivery = h.load('src/lib/resend/deliver-reward.ts')
  try {
    await delivery.deliverReward('submission', 'tenant', false)
    assert.fail('Delivery must fail without configuration')
  } catch (error) {
    const response = h.load('src/lib/security/http.ts').apiError(error)
    assert.equal(response.status, 503)
    assert.match((await response.json()).error, /RESEND_API_KEY/)
  }
  assert.equal(h.sends.length, 0)
  assert(!h.rpcs.includes('finish_reward'))
})

test('failed sends never mark a reward delivered and successful sends preserve the idempotency key', async () => {
  const failed = deliveryHarness({ sendError: true })
  await assert.rejects(failed.load('src/lib/resend/deliver-reward.ts').deliverReward('submission', 'tenant', false), /Email delivery failed/)
  assert(!failed.rpcs.includes('finish_reward'))
  const success = deliveryHarness()
  assert.equal(await success.load('src/lib/resend/deliver-reward.ts').deliverReward('submission', 'tenant', false), true)
  assert.equal(success.sends[0][1].idempotencyKey, 'reward/submission')
  assert(success.rpcs.includes('finish_reward'))
})

test('unconfirmed sends retry with the same provider key, while already-sent reservations do not send again', async () => {
  const h = deliveryHarness({ finishError: true })
  const delivery = h.load('src/lib/resend/deliver-reward.ts')
  for (let attempt = 0; attempt < 2; attempt++) await assert.rejects(delivery.deliverReward('submission', 'tenant', false), /confirmation pending/)
  assert.equal(h.sends[0][1].idempotencyKey, h.sends[1][1].idempotencyKey)
  const sent = deliveryHarness({ alreadySent: true })
  assert.equal(await sent.load('src/lib/resend/deliver-reward.ts').deliverReward('submission', 'tenant', false), true)
  assert.equal(sent.sends.length, 0)
})
