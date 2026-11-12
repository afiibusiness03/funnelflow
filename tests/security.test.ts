import { test } from 'node:test'
import assert from 'node:assert/strict'
import { z } from 'zod'
import { readJson, safeRedirect, safeUrl, escapeHtml, checkOrigin } from '../src/lib/security/http'
import { createEventToken, verifyEventToken } from '../src/lib/security/event-token'

test('redirects remain same-origin, including userinfo and backslash attacks', () => {
  for(const target of ['@evil.invalid/','//evil.invalid/','/\\evil.invalid/','https://evil.invalid/']) {
    assert.equal(safeRedirect(target,'https://site.invalid').href,'https://site.invalid/dashboard')
  }
  assert.equal(safeRedirect('/reset-password','https://site.invalid').pathname,'/reset-password')
})
test('URLs reject executable schemes, credentials and excessive length', () => {
  for(const url of ['javascript:alert(1)','data:text/html,test','http://example.invalid/','https://user:pass@example.invalid/','https://example.invalid/'+ 'x'.repeat(2048)])assert.equal(safeUrl.safeParse(url).success,false)
  assert.equal(safeUrl.safeParse('https://example.invalid/review').success,true)
})
test('HTML text is escaped without trusting customer markup', () => {
  assert.equal(escapeHtml('<img src="x" onerror=\'x\'>&'),'&lt;img src=&quot;x&quot; onerror=&#39;x&#39;&gt;&amp;')
})
test('JSON enforces MIME, actual streamed size and schema', async () => {
  const url='https://site.invalid/api/test'
  const schema=z.object({name:z.string().max(5)})
  await assert.rejects(readJson(new Request(url,{method:'POST',body:'{"name":"ok"}'}),schema),{status:415})
  await assert.rejects(readJson(new Request(url,{method:'POST',headers:{'content-type':'application/json'},body:'{"name":"too long"}'}),schema),{status:400})
  await assert.rejects(readJson(new Request(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'x'.repeat(100)})}),schema,30),{status:413})
  assert.deepEqual(await readJson(new Request(url,{method:'POST',headers:{'content-type':'application/json'},body:'{"name":"ok","admin":true}'}),schema),{name:'ok'})
})
test('cross-site writes are rejected', () => {
  assert.throws(()=>checkOrigin(new Request('https://site.invalid/api/test',{headers:{origin:'https://evil.invalid'}})),{status:403})
  assert.doesNotThrow(()=>checkOrigin(new Request('https://site.invalid/api/test',{headers:{origin:'https://site.invalid'}})))
})
test('event tokens are campaign-bound, tamper-resistant and expire', () => {
  const old=process.env.SUPABASE_SERVICE_ROLE_KEY
  process.env.SUPABASE_SERVICE_ROLE_KEY='synthetic-test-key-only'
  try {
    const token=createEventToken('campaign-a')
    assert.ok(verifyEventToken(token,'campaign-a'))
    assert.equal(verifyEventToken(token,'campaign-b'),null)
    assert.equal(verifyEventToken(token+'x','campaign-a'),null)
    const realNow=Date.now
    try {Date.now=()=>realNow()+16*60000;assert.equal(verifyEventToken(token,'campaign-a'),null)}finally{Date.now=realNow}
  }finally{if(old===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=old}
})
