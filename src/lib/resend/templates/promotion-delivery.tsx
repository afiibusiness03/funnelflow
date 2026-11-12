
interface PromotionDeliveryProps {
  tenantName:    string
  customerName?: string
  promotionType: string
  couponCode?:   string
  downloadUrl?:  string
  giftValue?:    number
  message?:      string
  brandColor?:   string
}

export default function PromotionDeliveryEmail({
  tenantName, customerName, promotionType,
  couponCode, downloadUrl, giftValue, message, brandColor = '#6366f1',
}: PromotionDeliveryProps) {
  return (
    <html>
      <head />
      <body style={{ backgroundColor: '#f8fafc', fontFamily: 'sans-serif' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto', padding: '32px 16px' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
              {tenantName}
            </p>
          </div>

          {/* Card */}
          <div style={{ background: '#ffffff', borderRadius: '12px', padding: '32px', border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: '24px', textAlign: 'center', margin: '0 0 8px' }}>🎉</p>
            <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b', textAlign: 'center', margin: '0 0 8px' }}>
              Your reward is here!
            </p>
            <p style={{ color: '#64748b', textAlign: 'center', fontSize: '14px', margin: '0 0 24px' }}>
              {message ?? `Thank you for your purchase, ${customerName ?? 'valued customer'}!`}
            </p>

            <hr style={{ borderColor: '#e2e8f0', margin: '0 0 24px' }} />

            {/* Coupon code */}
            {promotionType === 'coupon_code' && couponCode && (
              <div style={{ background: '#f1f5f9', borderRadius: '8px', padding: '16px', textAlign: 'center', marginBottom: '16px' }}>
                <p style={{ color: '#64748b', fontSize: '12px', margin: '0 0 8px' }}>Your discount code</p>
                <p style={{ fontSize: '28px', fontWeight: 'bold', letterSpacing: '4px', color: brandColor, margin: 0, fontFamily: 'monospace' }}>
                  {couponCode}
                </p>
              </div>
            )}

            {/* Digital download */}
            {promotionType === 'digital_download' && downloadUrl && (
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <a
                  href={downloadUrl}
                  style={{ background: brandColor, color: '#ffffff', borderRadius: '8px', padding: '12px 24px', fontSize: '14px', fontWeight: '600', textDecoration: 'none', display: 'inline-block' }}
                >
                  📥 Download Now
                </a>
              </div>
            )}

            {/* Gift card value */}
            {promotionType === 'gift_card' && giftValue && (
              <div style={{ background: '#f1f5f9', borderRadius: '8px', padding: '16px', textAlign: 'center', marginBottom: '16px' }}>
                <p style={{ color: '#64748b', fontSize: '12px', margin: '0 0 8px' }}>Your gift card value</p>
                <p style={{ fontSize: '32px', fontWeight: 'bold', color: brandColor, margin: 0 }}>
                  ${giftValue.toFixed(2)}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <p style={{ color: '#94a3b8', fontSize: '12px', textAlign: 'center', marginTop: '24px' }}>
            Powered by AmazinReview · If you didn&apos;t make this purchase, please ignore this email.
          </p>
        </div>
      </body>
    </html>
  )
}
