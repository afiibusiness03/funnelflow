
interface FollowUpEmailProps {
  tenantName:  string
  reviewUrl?:  string
  brandColor?: string
}

export default function FollowUpEmail({ tenantName, reviewUrl, brandColor = '#6366f1' }: FollowUpEmailProps) {
  return (
    <html>
      <head />
      <body style={{ backgroundColor: '#f8fafc', fontFamily: 'sans-serif' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto', padding: '32px 16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', padding: '32px', border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 8px' }}>
              How are you enjoying your purchase?
            </p>
            <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 24px' }}>
              We hope you love your product from {tenantName}. If you have a moment, we&apos;d love to hear what you think!
            </p>

            {reviewUrl && (
              <div style={{ textAlign: 'center' }}>
                <a
                  href={reviewUrl}
                  style={{ background: brandColor, color: '#ffffff', borderRadius: '8px', padding: '12px 24px', fontSize: '14px', fontWeight: '600', textDecoration: 'none', display: 'inline-block' }}
                >
                  ⭐ Leave a Review
                </a>
              </div>
            )}

            <hr style={{ borderColor: '#e2e8f0', margin: '24px 0' }} />
            <p style={{ color: '#94a3b8', fontSize: '12px', textAlign: 'center' }}>
              You&apos;re receiving this because you recently purchased from {tenantName}.
            </p>
          </div>
        </div>
      </body>
    </html>
  )
}
