import Link from 'next/link'
import { requireAccount } from '@/lib/security/access'
import { redirect } from 'next/navigation'

export default async function ConfirmBilling({ searchParams }: { searchParams: Promise<{ plan?: string; interval?: string; portal?: string }> }) {
  try { await requireAccount({write:true,billing:true}) } catch { redirect('/login') }
  const query=await searchParams
  const plan=['starter','growth','pro','agency'].includes(query.plan ?? '')?query.plan!:'starter'
  const interval=query.interval==='monthly'?'monthly':'annual'
  const portal=query.portal==='1'
  const action=portal?'/api/billing/portal':`/api/billing/checkout?plan=${plan}&interval=${interval}`
  return <main className="min-h-screen flex items-center justify-center p-6">
    <section className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-8 space-y-5">
      <h1 className="text-2xl font-bold">{portal?'Manage billing':'Continue to checkout'}</h1>
      <p className="text-slate-300">{portal?'Review your subscription and payment details securely with Stripe.':`You selected the ${plan} plan, billed ${interval === 'annual'?'annually':'monthly'}. Review the final price on Stripe before paying.`}</p>
      <form action={action} method="post"><button className="w-full rounded-lg bg-purple-600 py-3 font-semibold hover:bg-purple-700" type="submit">Continue to Stripe</button></form>
      <Link className="block text-center text-slate-400" href="/pricing">Back to plans</Link>
    </section>
  </main>
}
