// ============================================================
// FunnelFlow — TypeScript Types (matches Supabase schema)
// ============================================================

export type Plan = 'starter' | 'growth' | 'pro' | 'agency'
export type PlanStatus = 'trialing' | 'active' | 'past_due' | 'canceled'
export type Platform = 'amazon' | 'ebay' | 'walmart' | 'etsy' | 'shopify' | 'woocommerce' | 'bigcommerce' | 'custom'
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'archived'
export type ClaimStatus = 'pending' | 'approved' | 'delivered' | 'rejected' | 'expired'
export type PromotionType = 'coupon_code' | 'digital_download' | 'gift_card' | 'physical_gift' | 'email_only' | 'loyalty_points'
export type Language = 'en' | 'ar' | 'fr' | 'de' | 'es' | 'it' | 'ja' | 'zh'
export type FunnelEventType =
  | 'qr_scan'
  | 'step_1_complete'
  | 'step_2_complete'
  | 'step_3_complete'
  | 'review_shown'
  | 'review_clicked'
  | 'review_skipped'
  | 'step_4_complete'
  | 'funnel_complete'
  | 'funnel_abandoned'

// ============================================================
// TENANT
// ============================================================
export interface Tenant {
  id: string
  name: string
  slug: string
  email: string
  logo_url: string | null
  brand_color: string
  custom_domain: string | null
  plan: Plan
  plan_status: PlanStatus
  trial_ends_at: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  max_products: number
  max_campaigns: number
  max_promotions: number
  whatsapp_enabled: boolean
  created_at: string
  updated_at: string
}

// ============================================================
// USER
// ============================================================
export interface User {
  id: string
  tenant_id: string
  email: string
  full_name: string | null
  role: 'owner' | 'admin' | 'member'
  avatar_url: string | null
  created_at: string
  updated_at: string
}

// ============================================================
// PLATFORM CONNECTION
// ============================================================
export interface PlatformConnection {
  id: string
  tenant_id: string
  platform: Platform
  marketplace: string | null
  shop_name: string | null
  seller_id: string | null
  is_active: boolean
  connected_at: string
  updated_at: string
  // access_token & refresh_token excluded from client types (server-only)
}

// ============================================================
// PRODUCT
// ============================================================
export interface Product {
  id: string
  tenant_id: string
  connection_id: string | null
  name: string
  asin: string | null
  sku: string | null
  platform: Platform
  marketplace: string
  product_url: string | null
  image_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// ============================================================
// PROMOTION
// ============================================================
export interface Promotion {
  id: string
  tenant_id: string
  name: string
  type: PromotionType
  coupon_code: string | null
  coupon_pool: string[] | null
  download_url: string | null
  download_expires_hours: number
  gift_card_value: number | null
  gift_card_currency: string
  requires_address: boolean
  auto_deliver: boolean
  delivery_message: string | null
  max_redemptions: number | null
  redemptions_count: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// ============================================================
// CAMPAIGN
// ============================================================
export interface Campaign {
  id: string
  tenant_id: string
  product_id: string
  promotion_id: string | null
  name: string
  status: CampaignStatus
  require_order_verify: boolean
  require_review: boolean
  smart_routing: boolean
  smart_routing_threshold: number
  custom_logo_url: string | null
  custom_color: string | null
  custom_thank_you_msg: string | null
  language: Language
  review_url: string | null
  total_scans: number
  total_completions: number
  total_reviews_requested: number
  qr_code_url: string | null
  qr_short_code: string
  created_at: string
  updated_at: string
  // Relations
  product?: Product
  promotion?: Promotion
}

// ============================================================
// FUNNEL SUBMISSION
// ============================================================
export interface ShippingAddress {
  line1: string
  line2?: string
  city: string
  state: string
  zip: string
  country: string
}

export interface FunnelSubmission {
  id: string
  campaign_id: string
  tenant_id: string
  customer_email: string
  customer_name: string | null
  customer_phone: string | null
  shipping_address: ShippingAddress | null
  order_id: string | null
  order_verified: boolean
  platform: string | null
  marketplace: string
  rating: number | null
  feedback_text: string | null
  review_requested: boolean
  review_clicked: boolean
  promotion_id: string | null
  claim_status: ClaimStatus
  claimed_at: string | null
  delivered_at: string | null
  delivery_method: 'email' | 'whatsapp' | 'sms' | 'manual' | null
  is_flagged: boolean
  flag_reason: string | null
  created_at: string
  updated_at: string
  // Relations
  campaign?: Campaign
  promotion?: Promotion
}

// ============================================================
// FUNNEL EVENT
// ============================================================
export interface FunnelEvent {
  id: string
  campaign_id: string
  tenant_id: string
  submission_id: string | null
  event_type: FunnelEventType
  step_number: number | null
  metadata: Record<string, unknown> | null
  created_at: string
}

// ============================================================
// EMAIL DELIVERY
// ============================================================
export interface EmailDelivery {
  id: string
  tenant_id: string
  submission_id: string | null
  recipient_email: string
  subject: string
  template: string
  resend_id: string | null
  status: 'queued' | 'sent' | 'delivered' | 'bounced' | 'failed'
  sent_at: string | null
  opened_at: string | null
  clicked_at: string | null
  created_at: string
}

// ============================================================
// PLAN (Reference)
// ============================================================
export interface PlanDetails {
  id: Plan
  name: string
  price_monthly: number     // in cents
  price_annual: number      // in cents per month
  max_products: number
  max_campaigns: number
  max_promotions: number
  stripe_price_id_monthly: string | null
  stripe_price_id_annual: string | null
  features: {
    all_platforms: boolean
    unlimited_reviews: boolean
    unlimited_leads: boolean
    custom_branding: boolean
    meta_pixel: boolean
    multi_language: boolean
    ab_testing?: boolean
    api_access?: boolean
    priority_support?: boolean
    white_label?: boolean
  }
}

// ============================================================
// API RESPONSE TYPES
// ============================================================
export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  per_page: number
  total_pages: number
}

// ============================================================
// FUNNEL (Public-facing, no auth)
// ============================================================
export interface PublicCampaign {
  id: string
  name: string
  language: Language
  require_order_verify: boolean
  smart_routing: boolean
  smart_routing_threshold: number
  custom_logo_url: string | null
  custom_color: string | null
  custom_thank_you_msg: string | null
  review_url: string | null
  promotion: Pick<Promotion, 'id' | 'type' | 'delivery_message' | 'requires_address' | 'auto_deliver'> | null
  product: Pick<Product, 'id' | 'name' | 'image_url' | 'platform' | 'marketplace'> | null
  tenant: Pick<Tenant, 'name' | 'logo_url' | 'brand_color'> | null
}

// ============================================================
// ANALYTICS (Dashboard)
// ============================================================
export interface CampaignAnalytics {
  campaign_id: string
  period_start: string
  period_end: string
  total_scans: number
  total_completions: number
  conversion_rate: number           // completions / scans
  total_reviews_requested: number
  review_request_rate: number       // reviews_requested / completions
  total_emails_collected: number
  avg_rating: number
  rating_distribution: Record<number, number>  // {1: 5, 2: 3, 3: 10, 4: 25, 5: 57}
  funnel_drop_off: {
    step_1: number
    step_2: number
    step_3: number
    step_4: number
  }
  claims_by_status: Record<ClaimStatus, number>
}

export interface DashboardStats {
  total_scans: number
  total_completions: number
  total_reviews_requested: number
  total_emails_collected: number
  active_campaigns: number
  pending_claims: number
  avg_conversion_rate: number
  scans_over_time: Array<{ date: string; scans: number; completions: number }>
}
