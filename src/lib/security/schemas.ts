import { z } from 'zod'
import { optionalUrl, uuid } from './http'

const text = z.string().trim().min(1).max(200)
export const productSchema = z.object({
  name: text, platform: z.enum(['amazon','ebay','walmart','etsy','shopify','woocommerce','bigcommerce','custom']).optional(),
  marketplace: z.string().trim().max(8).optional(), asin: z.string().trim().max(32).nullable().optional(), sku: z.string().trim().max(100).nullable().optional(),
  product_url: optionalUrl, review_url: optionalUrl, image_url: optionalUrl, is_active: z.boolean().optional(),
})
export const campaignSchema = z.object({
  name: text, product_id: uuid.optional(), product_ids: z.array(uuid).min(1).max(50).optional(), promotion_id: z.preprocess(v => v === '' ? null : v, uuid.nullable().optional()),
  status: z.enum(['draft','active','paused','archived']).optional(), require_order_verify: z.boolean().optional(),
  smart_routing: z.boolean().optional(), smart_routing_threshold: z.number().int().min(1).max(5).optional(),
  language: z.enum(['en','ar','fr','de','es','it','ja','zh']).optional(), review_url: optionalUrl,
  custom_logo_url: optionalUrl, custom_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  custom_thank_you_msg: z.string().max(2000).nullable().optional(),
})
export const promotionSchema = z.object({
  name: text, type: z.enum(['coupon_code','digital_download','gift_card','physical_gift','email_only','loyalty_points']).optional(),
  coupon_code: z.string().max(200).nullable().optional(), discount_type: z.enum(['percentage','fixed_value']).nullable().optional(),
  discount_value: z.number().min(0).max(100000).nullable().optional(), discount_currency: z.string().max(8).nullable().optional(),
  download_url: optionalUrl, download_expires_hours: z.number().int().min(1).max(8760).optional(),
  gift_card_value: z.number().min(0).max(100000).nullable().optional(), gift_card_currency: z.string().max(8).optional(),
  delivery_message: z.string().max(4000).nullable().optional(), auto_deliver: z.boolean().optional(), requires_address: z.boolean().optional(),
  max_redemptions: z.number().int().min(0).max(10000000).nullable().optional(), is_active: z.boolean().optional(),
})
