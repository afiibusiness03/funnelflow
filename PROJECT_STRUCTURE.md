# FunnelFlow — Project Structure

## Tech Stack
- **Frontend/Backend:** Next.js 14 (App Router)
- **Database:** Supabase (PostgreSQL + RLS)
- **Auth:** Supabase Auth
- **Email:** Resend
- **Payments:** Stripe
- **QR Code:** qrcode + qrcode.react
- **Analytics:** PostHog
- **Error Tracking:** Sentry
- **Styling:** Tailwind CSS + shadcn/ui
- **Deployment:** Vercel + Cloudflare

---

## Directory Structure

```
funnelflow/
│
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql       ✅ DONE
│   └── seed.sql
│
├── src/
│   ├── types/
│   │   └── database.ts                  ✅ DONE
│   │
│   ├── app/
│   │   │
│   │   ├── (auth)/                      ← Login/Register pages (no sidebar)
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── forgot-password/page.tsx
│   │   │
│   │   ├── (dashboard)/                 ← Protected seller dashboard
│   │   │   ├── layout.tsx               ← Sidebar + header
│   │   │   ├── page.tsx                 ← Dashboard home / stats
│   │   │   ├── campaigns/
│   │   │   │   ├── page.tsx             ← List all campaigns
│   │   │   │   ├── new/page.tsx         ← Campaign builder wizard
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx         ← Campaign details + QR
│   │   │   │       └── analytics/page.tsx
│   │   │   ├── products/
│   │   │   │   ├── page.tsx
│   │   │   │   └── new/page.tsx
│   │   │   ├── promotions/
│   │   │   │   ├── page.tsx
│   │   │   │   └── new/page.tsx
│   │   │   ├── claims/
│   │   │   │   └── page.tsx             ← Claim center
│   │   │   ├── integrations/
│   │   │   │   └── page.tsx             ← Connect Amazon, Shopify, etc.
│   │   │   ├── analytics/
│   │   │   │   └── page.tsx             ← Full analytics dashboard
│   │   │   └── settings/
│   │   │       ├── page.tsx             ← General settings
│   │   │       ├── billing/page.tsx     ← Stripe subscription
│   │   │       └── team/page.tsx        ← Team members
│   │   │
│   │   ├── f/                           ← PUBLIC funnel (no auth)
│   │   │   └── [code]/
│   │   │       ├── page.tsx             ← Step 1: Order verify
│   │   │       ├── feedback/page.tsx    ← Step 2-3: Feedback
│   │   │       ├── review/page.tsx      ← Step 4: Review request
│   │   │       └── complete/page.tsx    ← Step 5: Thank you
│   │   │
│   │   └── api/
│   │       ├── auth/
│   │       │   └── callback/route.ts    ← Supabase OAuth callback
│   │       ├── campaigns/
│   │       │   ├── route.ts             ← GET/POST campaigns
│   │       │   └── [id]/
│   │       │       ├── route.ts         ← GET/PUT/DELETE campaign
│   │       │       └── qr/route.ts      ← Generate QR code
│   │       ├── funnel/
│   │       │   ├── [code]/route.ts      ← GET campaign by short code
│   │       │   ├── verify-order/route.ts ← Verify Amazon order ID
│   │       │   ├── submit/route.ts      ← Submit funnel (POST)
│   │       │   └── event/route.ts       ← Track funnel events
│   │       ├── claims/
│   │       │   ├── route.ts             ← GET all claims
│   │       │   └── [id]/
│   │       │       ├── approve/route.ts
│   │       │       ├── reject/route.ts
│   │       │       └── deliver/route.ts
│   │       ├── webhooks/
│   │       │   ├── stripe/route.ts      ← Stripe webhook
│   │       │   └── resend/route.ts      ← Resend email events
│   │       └── analytics/
│   │           └── dashboard/route.ts
│   │
│   ├── components/
│   │   ├── ui/                          ← shadcn/ui components
│   │   ├── dashboard/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── StatsCard.tsx
│   │   │   └── Charts.tsx
│   │   ├── campaigns/
│   │   │   ├── CampaignCard.tsx
│   │   │   ├── CampaignWizard.tsx
│   │   │   └── QRCodeDisplay.tsx
│   │   ├── funnel/                      ← Public funnel components
│   │   │   ├── FunnelLayout.tsx
│   │   │   ├── StepOrderVerify.tsx
│   │   │   ├── StepFeedback.tsx
│   │   │   ├── StepReviewRequest.tsx
│   │   │   └── StepComplete.tsx
│   │   └── claims/
│   │       ├── ClaimsTable.tsx
│   │       └── ClaimActions.tsx
│   │
│   └── lib/
│       ├── supabase/
│       │   ├── client.ts                ← Browser client
│       │   ├── server.ts                ← Server client
│       │   └── middleware.ts            ← Auth middleware
│       ├── stripe/
│       │   ├── client.ts
│       │   └── webhooks.ts
│       ├── resend/
│       │   ├── client.ts
│       │   └── templates/
│       │       ├── promotion-delivery.tsx
│       │       └── follow-up.tsx
│       ├── qr/
│       │   └── generate.ts              ← QR code generation
│       ├── amazon/
│       │   └── verify-order.ts          ← Amazon SP-API order check
│       └── utils/
│           ├── fraud-detection.ts
│           └── helpers.ts
│
├── middleware.ts                        ← Auth + custom domain routing
├── .env.local
└── package.json
```

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Resend
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=https://funnelflow.com
NEXT_PUBLIC_FUNNEL_URL=https://funnelflow.com/f

# Amazon SP-API (Phase 1)
AMAZON_CLIENT_ID=
AMAZON_CLIENT_SECRET=

# WhatsApp/Twilio (Phase 2 - leave empty)
# TWILIO_ACCOUNT_SID=
# TWILIO_AUTH_TOKEN=
# TWILIO_WHATSAPP_NUMBER=

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=

# Sentry
SENTRY_DSN=
```

---

## Build Order (What to build first)

### Week 1-2
1. ✅ Database Schema
2. ✅ TypeScript Types
3. ⬜ Supabase setup + Auth
4. ⬜ Multi-tenant middleware
5. ⬜ Auth pages (Login/Register)
6. ⬜ Dashboard layout (shell)

### Week 3-4
7. ⬜ Products CRUD
8. ⬜ Promotions CRUD
9. ⬜ Campaign Builder wizard
10. ⬜ QR Code generation

### Week 5-6
11. ⬜ Public Funnel (all steps)
12. ⬜ Order verification (Amazon)
13. ⬜ Email delivery (Resend)
14. ⬜ Fraud detection

### Week 7-8
15. ⬜ Claim Center
16. ⬜ Analytics Dashboard
17. ⬜ Stripe payments
18. ⬜ Polish + Testing
