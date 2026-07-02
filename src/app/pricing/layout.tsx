import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pricing — FunnelFlow',
  description: "Simple, transparent pricing. Start free, upgrade when you're ready.",
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children
}
