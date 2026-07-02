import { Html, Head, Body, Container, Section, Text, Button, Hr } from '@react-email/components'

interface FollowUpEmailProps {
  tenantName:  string
  reviewUrl?:  string
  brandColor?: string
}

export default function FollowUpEmail({ tenantName, reviewUrl, brandColor = '#6366f1' }: FollowUpEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f8fafc', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '480px', margin: '0 auto', padding: '32px 16px' }}>
          <Section style={{ background: '#ffffff', borderRadius: '12px', padding: '32px', border: '1px solid #e2e8f0' }}>
            <Text style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 8px' }}>
              How are you enjoying your purchase?
            </Text>
            <Text style={{ color: '#64748b', fontSize: '14px', margin: '0 0 24px' }}>
              We hope you love your product from {tenantName}. If you have a moment, we&apos;d love to hear what you think!
            </Text>

            {reviewUrl && (
              <Section style={{ textAlign: 'center' }}>
                <Button
                  href={reviewUrl}
                  style={{ background: brandColor, color: '#ffffff', borderRadius: '8px', padding: '12px 24px', fontSize: '14px', fontWeight: '600', textDecoration: 'none', display: 'inline-block' }}
                >
                  ⭐ Leave a Review
                </Button>
              </Section>
            )}

            <Hr style={{ borderColor: '#e2e8f0', margin: '24px 0' }} />
            <Text style={{ color: '#94a3b8', fontSize: '12px', textAlign: 'center' }}>
              You&apos;re receiving this because you recently purchased from {tenantName}.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
