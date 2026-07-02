import {
  Html, Head, Body, Container, Section, Text, Button, Hr, Img,
} from '@react-email/components'

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
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f8fafc', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '480px', margin: '0 auto', padding: '32px 16px' }}>
          {/* Header */}
          <Section style={{ textAlign: 'center', marginBottom: '24px' }}>
            <Text style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
              {tenantName}
            </Text>
          </Section>

          {/* Card */}
          <Section style={{ background: '#ffffff', borderRadius: '12px', padding: '32px', border: '1px solid #e2e8f0' }}>
            <Text style={{ fontSize: '24px', textAlign: 'center', margin: '0 0 8px' }}>🎉</Text>
            <Text style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b', textAlign: 'center', margin: '0 0 8px' }}>
              Your reward is here!
            </Text>
            <Text style={{ color: '#64748b', textAlign: 'center', fontSize: '14px', margin: '0 0 24px' }}>
              {message ?? `Thank you for your purchase, ${customerName ?? 'valued customer'}!`}
            </Text>

            <Hr style={{ borderColor: '#e2e8f0', margin: '0 0 24px' }} />

            {/* Coupon code */}
            {promotionType === 'coupon_code' && couponCode && (
              <Section style={{ background: '#f1f5f9', borderRadius: '8px', padding: '16px', textAlign: 'center', marginBottom: '16px' }}>
                <Text style={{ color: '#64748b', fontSize: '12px', margin: '0 0 8px' }}>Your discount code</Text>
                <Text style={{ fontSize: '28px', fontWeight: 'bold', letterSpacing: '4px', color: brandColor, margin: 0, fontFamily: 'monospace' }}>
                  {couponCode}
                </Text>
              </Section>
            )}

            {/* Digital download */}
            {promotionType === 'digital_download' && downloadUrl && (
              <Section style={{ textAlign: 'center', marginBottom: '16px' }}>
                <Button
                  href={downloadUrl}
                  style={{ background: brandColor, color: '#ffffff', borderRadius: '8px', padding: '12px 24px', fontSize: '14px', fontWeight: '600', textDecoration: 'none', display: 'inline-block' }}
                >
                  📥 Download Now
                </Button>
              </Section>
            )}

            {/* Gift card value */}
            {promotionType === 'gift_card' && giftValue && (
              <Section style={{ background: '#f1f5f9', borderRadius: '8px', padding: '16px', textAlign: 'center', marginBottom: '16px' }}>
                <Text style={{ color: '#64748b', fontSize: '12px', margin: '0 0 8px' }}>Your gift card value</Text>
                <Text style={{ fontSize: '32px', fontWeight: 'bold', color: brandColor, margin: 0 }}>
                  ${giftValue.toFixed(2)}
                </Text>
              </Section>
            )}
          </Section>

          {/* Footer */}
          <Text style={{ color: '#94a3b8', fontSize: '12px', textAlign: 'center', marginTop: '24px' }}>
            Powered by FunnelFlow · If you didn&apos;t make this purchase, please ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
