'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Package, ExternalLink, Pencil, CheckCircle, XCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils/helpers'

const PLATFORM_LABELS: Record<string, string> = {
  amazon: 'Amazon', ebay: 'eBay', walmart: 'Walmart',
  etsy: 'Etsy', shopify: 'Shopify', woocommerce: 'WooCommerce',
  bigcommerce: 'BigCommerce', custom: 'Custom',
}

const PLATFORM_COLORS: Record<string, string> = {
  amazon: 'bg-orange-500/20 text-orange-400',
  ebay: 'bg-blue-500/20 text-blue-400',
  walmart: 'bg-blue-600/20 text-blue-300',
  etsy: 'bg-orange-600/20 text-orange-300',
  shopify: 'bg-green-500/20 text-green-400',
  woocommerce: 'bg-purple-500/20 text-purple-400',
  bigcommerce: 'bg-cyan-500/20 text-cyan-400',
  custom: 'bg-slate-500/20 text-slate-400',
}

type Product = {
  id: string; name: string; platform: string; marketplace: string
  asin?: string | null; product_url?: string | null; image_url?: string | null
  is_active: boolean; created_at: string
}

export default function ProductList({ products: initial }: { products: Product[] }) {
  const [products, setProducts] = useState(initial)
  const [toggling, setToggling] = useState<string | null>(null)

  const toggleActive = async (id: string, currentActive: boolean) => {
    setToggling(id)
    await fetch(`/api/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !currentActive }),
    })
    setProducts(prev => prev.map(p => p.id === id ? { ...p, is_active: !currentActive } : p))
    setToggling(null)
  }

  return (
    <>
      {products.map((product) => (
        <div
          key={product.id}
          className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 hover:border-slate-600 transition-all"
        >
          <div className="flex items-start gap-3 mb-4">
            {/* Product image */}
            <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {product.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <Package className="w-6 h-6 text-slate-500" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-white font-medium text-sm truncate leading-tight">{product.name}</h3>
              {product.asin && (
                <p className="text-slate-500 text-xs mt-0.5">ASIN: {product.asin}</p>
              )}
            </div>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLATFORM_COLORS[product.platform] ?? 'bg-slate-700 text-slate-400'}`}>
              {PLATFORM_LABELS[product.platform] ?? product.platform}
            </span>
            {product.marketplace && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">
                {product.marketplace}
              </span>
            )}
            <span className="flex items-center gap-1 text-xs">
              {product.is_active
                ? <><CheckCircle className="w-3 h-3 text-green-400" /><span className="text-green-400">Active</span></>
                : <><XCircle    className="w-3 h-3 text-slate-500" /><span className="text-slate-500">Inactive</span></>
              }
            </span>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-700">
            <span className="text-slate-500 text-xs">Added {formatDate(product.created_at)}</span>
            <div className="flex items-center gap-1.5">
              {product.product_url && (
                <a
                  href={product.product_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition"
                  title="View product"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}

              {/* Active / Inactive toggle */}
              <button
                onClick={() => toggleActive(product.id, product.is_active)}
                disabled={toggling === product.id}
                title={product.is_active ? 'Deactivate' : 'Activate'}
                className="p-1.5 rounded-lg hover:bg-slate-700 transition disabled:opacity-50"
              >
                {product.is_active
                  ? <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                  : <XCircle    className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" />
                }
              </button>

              {/* Edit */}
              <Link
                href={`/dashboard/products/${product.id}`}
                className="p-1.5 text-slate-400 hover:text-purple-400 rounded-lg hover:bg-slate-700 transition"
                title="Edit product"
              >
                <Pencil className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      ))}
    </>
  )
}
