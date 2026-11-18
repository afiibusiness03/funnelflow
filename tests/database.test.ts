import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`

test('PostgreSQL migrations enforce tenant isolation, privilege boundaries, quotas, rewards and aggregates', async t => {
  const db=new PGlite()
  try {
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT (auth.jwt()->>'sub')::uuid $$;
      CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT auth.jwt()->>'role' $$;
      GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
      CREATE FUNCTION uuid_generate_v4() RETURNS uuid LANGUAGE sql AS $$ SELECT gen_random_uuid() $$;
      CREATE FUNCTION gen_random_bytes(n integer) RETURNS bytea LANGUAGE sql AS $$ SELECT decode(repeat('ab',n),'hex') $$;
    `)
    for(const file of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort()) {
      let sql=await readFile(`supabase/migrations/${file}`,'utf8')
      // Only extension bootstrap is adapted for the embedded engine. RLS/functions/triggers run unchanged.
      sql=sql.replace(/CREATE EXTENSION IF NOT EXISTS[^;]+;/g,'')
      await db.exec(sql)
    }
    await db.exec(`
      INSERT INTO auth.users VALUES('${id(1)}'),('${id(2)}'),('${id(3)}');
      INSERT INTO tenants(id,name,slug,email,plan_status) VALUES('${id(10)}','A','a','a@example.invalid','active'),('${id(20)}','B','b','b@example.invalid','active');
      UPDATE tenants SET max_products=10,max_campaigns=10,max_promotions=10;
      INSERT INTO users(id,tenant_id,email,role) VALUES('${id(1)}','${id(10)}','a@example.invalid','owner'),('${id(2)}','${id(20)}','b@example.invalid','owner'),('${id(3)}','${id(10)}','member@example.invalid','member');
      INSERT INTO products(id,tenant_id,name) VALUES('${id(11)}','${id(10)}','A product'),('${id(21)}','${id(20)}','B product');
      INSERT INTO promotions(id,tenant_id,name,type,coupon_code,max_redemptions) VALUES('${id(12)}','${id(10)}','A promo','coupon_code','SYNTHETIC',1),('${id(22)}','${id(20)}','B promo','coupon_code','OTHER',1);
      INSERT INTO campaigns(id,tenant_id,name,product_id,promotion_id,status,qr_short_code) VALUES('${id(13)}','${id(10)}','A campaign','${id(11)}','${id(12)}','active','test-a'),('${id(23)}','${id(20)}','B campaign','${id(21)}','${id(22)}','active','test-b');
      INSERT INTO campaign_products(campaign_id,product_id) VALUES('${id(13)}','${id(11)}'),('${id(23)}','${id(21)}');
      INSERT INTO waitlist_requests(email) VALUES('private@example.invalid');
    `)
    async function asRole(role:string,user:number|undefined,fn:()=>Promise<void>,admin=false) {
      await db.exec('BEGIN')
      try {
        await db.exec(`SET LOCAL ROLE ${role}`)
        await db.query(`SELECT set_config('request.jwt.claims',$1,true)`,[JSON.stringify({role,...(user?{sub:id(user),email:`user${user}@example.invalid`}:{}),app_metadata:{platform_admin:admin}})])
        await fn()
      } finally { await db.exec('ROLLBACK') }
    }
    await t.test('anonymous cannot enumerate campaigns or modify junctions/claims', async()=>{
      for(const sql of ['SELECT * FROM campaigns','SELECT * FROM campaign_products',`INSERT INTO funnel_events(campaign_id,tenant_id,event_type) VALUES('${id(13)}','${id(10)}','qr_scan')`])
        await asRole('anon',undefined,async()=>{await assert.rejects(db.exec(sql))})
    })
    await t.test('tenant A cannot read tenant B, including active campaigns', async()=>{
      await asRole('authenticated',1,async()=>{const r=await db.query('SELECT id FROM campaigns');assert.deepEqual(r.rows,[{id:id(13)}])})
    })
    await t.test('billing columns, roles and integration tokens cannot be changed/read by members', async()=>{
      for(const sql of [`UPDATE tenants SET plan='agency' WHERE id='${id(10)}'`,`UPDATE users SET role='owner' WHERE id='${id(3)}'`,'SELECT access_token FROM platform_connections'])
        await asRole('authenticated',3,async()=>{await assert.rejects(db.exec(sql))})
    })
    await t.test('normal users cannot read the waitlist; platform admins can',async()=>{
      await asRole('authenticated',1,async()=>{assert.equal((await db.query('SELECT * FROM waitlist_requests')).rows.length,0)})
      await asRole('authenticated',1,async()=>{assert.equal((await db.query('SELECT * FROM waitlist_requests')).rows.length,1)},true)
    })
    await t.test('members cannot modify products, owners can',async()=>{
      await asRole('authenticated',3,async()=>{assert.equal((await db.query(`UPDATE products SET name='changed' WHERE id='${id(11)}' RETURNING id`)).rows.length,0)})
      await asRole('authenticated',1,async()=>{assert.equal((await db.query(`UPDATE products SET name='changed' WHERE id='${id(11)}' RETURNING id`)).rows.length,1)})
    })
    await t.test('service role cannot create cross-tenant links',async()=>{
      for(const sql of [`UPDATE campaigns SET promotion_id='${id(22)}' WHERE id='${id(13)}'`,`INSERT INTO campaign_products VALUES('${id(13)}','${id(21)}',now())`])
        await asRole('service_role',undefined,async()=>{await assert.rejects(db.exec(sql))})
    })
    await t.test('owners cannot bypass quotas through direct database inserts',async()=>{
      await db.exec(`UPDATE tenants SET max_products=1 WHERE id='${id(10)}'`)
      await asRole('authenticated',1,async()=>{await assert.rejects(db.exec(`INSERT INTO products(tenant_id,name) VALUES('${id(10)}','Too many')`))})
    })
    await t.test('owners cannot edit server-maintained counters or write executable URLs', async()=>{
      for (const sql of [`UPDATE promotions SET redemptions_count=0 WHERE id='${id(12)}'`, `UPDATE campaigns SET total_scans=100 WHERE id='${id(13)}'`, `UPDATE products SET review_url='javascript:alert(1)' WHERE id='${id(11)}'`])
        await asRole('authenticated',1,async()=>{await assert.rejects(db.exec(sql))})
      await asRole('anon',undefined,async()=>{await assert.rejects(db.exec(`SELECT consume_rate_limit('forged',100,60)`))})
    })
    await t.test('rate limits are stored centrally and denied after the limit',async()=>{
      await asRole('service_role',undefined,async()=>{
        assert.equal((await db.query<{allowed:boolean}>(`SELECT consume_rate_limit('synthetic',2,60) allowed`)).rows[0].allowed,true)
        assert.equal((await db.query<{allowed:boolean}>(`SELECT consume_rate_limit('synthetic',2,60) allowed`)).rows[0].allowed,true)
        assert.equal((await db.query<{allowed:boolean}>(`SELECT consume_rate_limit('synthetic',2,60) allowed`)).rows[0].allowed,false)
      })
    })
    await db.exec(`INSERT INTO funnel_submissions(id,campaign_id,tenant_id,customer_email,promotion_id,rating) VALUES('${id(30)}','${id(13)}','${id(10)}','buyer@example.invalid','${id(12)}',5),('${id(31)}','${id(13)}','${id(10)}','other@example.invalid','${id(12)}',4)`)
    await t.test('duplicate email normalization prevents claim reuse',async()=>{
      await asRole('service_role',undefined,async()=>{await assert.rejects(db.exec(`INSERT INTO funnel_submissions(campaign_id,tenant_id,customer_email) VALUES('${id(13)}','${id(10)}','BUYER@example.invalid')`))})
    })
    await t.test('automatic rewards reserve without order approval and preserve unverified status',async()=>{
      await asRole('service_role',undefined,async()=>{
        await db.query(`SELECT reserve_reward('${id(30)}','${id(10)}',false)`)
        await db.query(`SELECT reserve_reward('${id(30)}','${id(10)}',false)`)
        const claim=(await db.query<{claim_status:string;order_verified:boolean}>(`SELECT claim_status,order_verified FROM funnel_submissions WHERE id='${id(30)}'`)).rows[0]
        assert.equal(claim.claim_status,'approved')
        assert.equal(claim.order_verified,false)
        assert.equal((await db.query<{redemptions_count:number}>(`SELECT redemptions_count FROM promotions WHERE id='${id(12)}'`)).rows[0].redemptions_count,1)
      })
    })
    await t.test('automatic delivery still rejects flagged, manual, foreign-tenant and unavailable claims',async()=>{
      for (const change of [
        `UPDATE funnel_submissions SET is_flagged=true WHERE id='${id(30)}'`,
        `UPDATE promotions SET auto_deliver=false WHERE id='${id(12)}'`,
        `UPDATE promotions SET is_active=false WHERE id='${id(12)}'`,
        `UPDATE promotions SET type='physical_gift' WHERE id='${id(12)}'`,
        `UPDATE campaigns SET status='paused' WHERE id='${id(13)}'`,
      ]) {
        await asRole('service_role',undefined,async()=>{
          await db.exec(change)
          await assert.rejects(db.query(`SELECT reserve_reward('${id(30)}','${id(10)}',false)`))
        })
      }
      await asRole('service_role',undefined,async()=>{await assert.rejects(db.query(`SELECT reserve_reward('${id(30)}','${id(20)}',false)`))})
    })
    await t.test('approved claims saved during an email pause can reserve and deliver later without a stale reservation',async()=>{
      await asRole('service_role',undefined,async()=>{
        await db.exec(`INSERT INTO funnel_submissions(id,campaign_id,tenant_id,customer_email,promotion_id,claim_status,rating) VALUES('${id(65)}','${id(13)}','${id(10)}','paused@example.invalid','${id(12)}','approved',1)`)
        assert.equal((await db.query(`SELECT * FROM reward_deliveries WHERE submission_id='${id(65)}'`)).rows.length,0)
        await db.query(`SELECT reserve_reward('${id(65)}','${id(10)}',true)`)
        await db.query(`SELECT finish_reward('${id(65)}','${id(10)}','paused-test-email')`)
        assert.equal((await db.query<{claim_status:string}>(`SELECT claim_status FROM funnel_submissions WHERE id='${id(65)}'`)).rows[0].claim_status,'delivered')
      })
    })
    await t.test('manual approval reserves once; cap rejects a second claim',async()=>{
      await db.query(`SELECT reserve_reward('${id(30)}','${id(10)}',true)`)
      await db.query(`SELECT reserve_reward('${id(30)}','${id(10)}',true)`)
      assert.equal((await db.query<{redemptions_count:number}>(`SELECT redemptions_count FROM promotions WHERE id='${id(12)}'`)).rows[0].redemptions_count,1)
      await assert.rejects(db.query(`SELECT reserve_reward('${id(31)}','${id(10)}',true)`))
      await db.query(`SELECT finish_reward('${id(30)}','${id(10)}','test-email')`)
      await db.query(`SELECT finish_reward('${id(30)}','${id(10)}','test-email')`)
      assert.equal((await db.query('SELECT * FROM email_deliveries')).rows.length,1)
    })
    await t.test('reward retries preserve original content and cannot become manual deliveries',async()=>{
      await db.exec(`UPDATE promotions SET coupon_code='CHANGED' WHERE id='${id(12)}'`)
      const {rows}=await db.query<{payload:any}>(`SELECT payload FROM reward_deliveries WHERE submission_id='${id(30)}'`)
      assert.equal(rows[0].payload.coupon_code,'SYNTHETIC')
      await assert.rejects(db.query(`SELECT finish_manual_reward('${id(30)}','${id(10)}')`))
    })
    await t.test('manual rewards reserve once and require explicit fulfillment without a fake email',async()=>{
      await asRole('service_role',undefined,async()=>{
        await db.exec(`INSERT INTO promotions(id,tenant_id,name,type,max_redemptions) VALUES('${id(40)}','${id(10)}','Gift','physical_gift',1)`)
        await db.exec(`UPDATE campaigns SET promotion_id='${id(40)}' WHERE id='${id(13)}'`)
        await db.exec(`INSERT INTO funnel_submissions(id,campaign_id,tenant_id,customer_email,promotion_id) VALUES('${id(41)}','${id(13)}','${id(10)}','manual@example.invalid','${id(40)}')`)
        await db.query(`SELECT reserve_reward('${id(41)}','${id(10)}',true)`)
        assert.equal((await db.query<{claim_status:string}>(`SELECT claim_status FROM funnel_submissions WHERE id='${id(41)}'`)).rows[0].claim_status,'approved')
        await db.query(`SELECT finish_manual_reward('${id(41)}','${id(10)}')`)
        await db.query(`SELECT finish_manual_reward('${id(41)}','${id(10)}')`)
        assert.equal((await db.query('SELECT * FROM email_deliveries')).rows.length,1)
        assert.equal((await db.query<{delivery_method:string}>(`SELECT delivery_method FROM funnel_submissions WHERE id='${id(41)}'`)).rows[0].delivery_method,'manual')
      })
    })
    await t.test('historical delivered claims cannot send a second reward after migration',async()=>{
      await asRole('service_role',undefined,async()=>{
        await db.exec(`INSERT INTO funnel_submissions(id,campaign_id,tenant_id,customer_email,promotion_id,claim_status) VALUES('${id(50)}','${id(13)}','${id(10)}','historic@example.invalid','${id(12)}','delivered')`)
        const result=(await db.query<{r:any}>(`SELECT reserve_reward('${id(50)}','${id(10)}',true) r`)).rows[0].r
        assert.equal(result.sent,true)
        assert.equal((await db.query(`SELECT * FROM reward_deliveries WHERE submission_id='${id(50)}'`)).rows.length,0)
      })
    })
    await t.test('historical claims remain fulfillable after campaign reward changes',async()=>{
      await asRole('service_role',undefined,async()=>{
        await db.exec(`UPDATE campaigns SET promotion_id=null WHERE id='${id(13)}'`)
        await db.exec(`UPDATE funnel_submissions SET claim_status='rejected' WHERE id='${id(31)}'`)
        assert.equal((await db.query<{claim_status:string}>(`SELECT claim_status FROM funnel_submissions WHERE id='${id(31)}'`)).rows[0].claim_status,'rejected')
      })
    })
    await t.test('new account creation is bound to the authenticated user and idempotent',async()=>{
      await db.exec(`INSERT INTO auth.users VALUES('${id(4)}')`)
      await asRole('authenticated',4,async()=>{
        const first=(await db.query<{id:string}>(`SELECT create_tenant_account('New business','New owner') id`)).rows[0].id
        const second=(await db.query<{id:string}>(`SELECT create_tenant_account('Other business','Other owner') id`)).rows[0].id
        assert.equal(first,second)
        const user=(await db.query<{id:string;email:string;role:string}>(`SELECT id,email,role FROM users`)).rows[0]
        assert.deepEqual(user,{id:id(4),email:'user4@example.invalid',role:'owner'})
      })
    })
    await t.test('aggregate stats are real and scoped to the authenticated tenant',async()=>{
      await asRole('authenticated',1,async()=>{
        const metrics=(await db.query<{m:any}>('SELECT dashboard_metrics() m')).rows[0].m
        assert.equal(metrics.totalEmails,2);assert.equal(metrics.completions30,2);assert.equal(metrics.ratings['5'],1)
      })
      await asRole('authenticated',2,async()=>{assert.equal((await db.query<{m:any}>('SELECT dashboard_metrics() m')).rows[0].m.totalEmails,0)})
    })
  }finally{await db.close()}
})
