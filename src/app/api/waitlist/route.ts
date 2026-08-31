import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { resend, FROM } from '@/lib/resend/client'

export async function POST(request: Request) {
  try {
    const { email, notes } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // 1. Insert into waitlist_requests table
    const { error: dbError } = await supabase
      .from('waitlist_requests')
      .insert({ email, notes: notes || 'Private Beta Access Request' })

    if (dbError) {
      console.error('Waitlist insert error:', dbError)
    }

    // 2. Send email notification to Admin
    try {
      await resend.emails.send({
        from: FROM,
        to: 'afiibusiness03@gmail.com',
        subject: `📩 New Private Access / Waitlist Request: ${email}`,
        html: `
          <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:16px">
            <h2 style="color:#6366f1;margin-top:0">New Access Request! 🔑</h2>
            <p>A user submitted their email to request access while the platform is in Private Mode.</p>
            <p><strong>Email:</strong> ${email}</p>
            ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
            <p style="color:#64748b;font-size:12px">Time: ${new Date().toLocaleString()}</p>
          </div>
        `,
      }).catch(err => console.error('Waitlist admin notify email error:', err))
    } catch (e) {
      console.error('Failed to notify admin of waitlist entry:', e)
    }

    return NextResponse.json({ success: true, message: 'Your request has been received!' })
  } catch (err) {
    console.error('Waitlist API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
