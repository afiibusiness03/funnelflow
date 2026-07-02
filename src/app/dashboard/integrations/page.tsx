'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/helpers'
import { CheckCircle, XCircle, ExternalLink, Loader2, AlertTriangle } from 'lucide-react'

type Connection = {
  id: string; platform: string; marketplace: string | null
  shop_name: string | null; is_active: boolean; connected_at: string
}

const PLATFORMS = [
  {
    id: 'amazon', name: 'Amazon', logo: '🛒',
    color: 'bg-orange-500/20 border-orange-500/30',
    description: 'Connect your Amazon Seller account to verify orders automatically.',
    setupUrl: 'https://sellercentral.amazon.com/apps/authorize',
    marketplaces: ['US', 'UK', 'CA', 'DE', 'FR', 'IT', 'ES', 'JP', 'AU', 'MX', 'IN', 'AE'],
  },
  {
    id: 'shopify', name: 'Shopify', logo: '🛍️',
    color: 'bg-green-500/20 border-green-500/30',
    description: 'Connect your Shopify store for automatic order sync.',
    setupUrl: null,
    marketplaces: [],
  },
  {
    id: 'ebay', name: 'eBay', logo: '🏷️',
    color: 'bg-blue-500/20 border-blue-500/30',
    description: 'Connect your eBay seller account to verify orders.',
    setupUrl: null,
    marketplaces: ['US', 'UK', 'DE', 'AU', 'CA'],
  },
  {
    id: 'walmart', name: 'Walmart', logo: '🏪',
    color: 'bg-blue-600/20 border-blue-600/30',
    description: 'Connect your Walmart Marketplace seller account.',
    setupUrl: null,
    marketplaces: ['US'],
  },
  {
    id: 'etsy', name: 'Etsy', logo: '🎨',
    color: 'bg-orange-600/20 border-orange-600/30',
    description: 'Connect your Etsy shop to verify purchases.',
    setupUrl: null,
    marketplaces: [],
  },
  {
    id: 'woocommerce', name: 'WooCommerce', logo: '🌐',
    color: 'bg-purple-500/20 border-purple-500/30',
    description: 'Connect via API key from your WordPress WooCommerce store.',
    setupUrl: null,
    marketplaces: [],
  },
]

export default function IntegrationsPage() {
  const supabase = createClient()
  const [connections, setConnections]     = useState<Connection[]>([])
  const [loading, setLoading]             = useState(true)
  const [connecting, setConnecting]       = useState<string | null>(null)
  const [showManual, setShowManual]       = useState<string | null>(null)
  const [manualMarket, setManualMarket]   = useState('US')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userData } = await supabase
        .from('users').select('tenant_id').eq('id', user.id).single()
      if (!userData) return

      const { data } = await supabase
        .from('platform_connections')
        .select('id, platform, marketplace, shop_name, is_active, connected_at')
        .eq('tenant_id', userData.tenant_id)

      setConnections(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const getConnection = (platformId: string) =>
    connections.find(c => c.platform === platformId)

  const handleDisconnect = async (connectionId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('platform_connections').update({ is_active: false }).eq('id', connectionId)
    setConnections(prev => prev.map(c => c.id === connectionId ? { ...c, is_active: false } : c))
  }

  const handleManualConnect = async (platformId: string) => {
    setConnecting(platformId)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setConnecting(null); return }

    const { data: userData } = await supabase
      .from('users').select('tenant_id').eq('id', user.id).single()
    if (!userData) { setConnecting(null); return }

    const { data } = await supabase
      .from('platform_connections')
      .upsert({
        tenant_id:   userData.tenant_id,
        platform:    platformId,
        marketplace: manualMarket || null,
        is_active:   true,
      }, { onConflict: 'tenant_id,platform,marketplace' })
      .select()

    if (data?.[0]) {
      setConnections(prev => {
        const exists = prev.findIndex(c => c.id === data[0].id)
        if (exists >= 0) { const n = [...prev]; n[exists] = data[0]; return n }
        return [...prev, data[0]]
      })
    }

    setConnecting(null)
    setShowManual(null)
  }

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Info banner */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-5 py-3.5 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-blue-300 text-sm font-medium">About integrations</p>
          <p className="text-blue-400/80 text-xs mt-0.5">
            Connecting a platform allows FunnelFlow to verify customer order IDs automatically.
            Without a connection, order verification still works — customers just need a valid order ID format.
          </p>
        </div>
      </div>

      {/* Platform cards */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {PLATFORMS.map((platform) => {
            const conn      = getConnection(platform.id)
            const connected = conn?.is_active ?? false
            const isManualOpen = showManual === platform.id

            return (
              <div
                key={platform.id}
                className={cn(
                  'border rounded-xl p-5 transition-all',
                  connected ? `${platform.color}` : 'bg-slate-800/50 border-slate-700/50'
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl leading-none">{platform.logo}</span>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-white font-medium text-sm">{platform.name}</h3>
                        {connected
                          ? <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
                              <CheckCircle className="w-3 h-3" /> Connected
                            </span>
                          : <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-700 px-2 py-0.5 rounded-full">
                              <XCircle className="w-3 h-3" /> Not connected
                            </span>
                        }
                      </div>
                      <p className="text-slate-400 text-xs">{platform.description}</p>
                      {connected && conn?.marketplace && (
                        <p className="text-slate-500 text-xs mt-1">Marketplace: {conn.marketplace}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {connected ? (
                      <button
                        onClick={() => conn && handleDisconnect(conn.id)}
                        className="text-xs text-slate-400 hover:text-red-400 border border-slate-600 hover:border-red-500/50 px-3 py-1.5 rounded-lg transition"
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowManual(isManualOpen ? null : platform.id)}
                        className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg transition"
                      >
                        Connect
                      </button>
                    )}

                    {platform.setupUrl && (
                      <a
                        href={platform.setupUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-white transition p-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Manual connect form */}
                {isManualOpen && !connected && (
                  <div className="mt-4 pt-4 border-t border-slate-700 space-y-3">
                    {platform.marketplaces.length > 0 && (
                      <div>
                        <label className="block text-xs text-slate-400 mb-1.5">Marketplace</label>
                        <select
                          value={manualMarket}
                          onChange={(e) => setManualMarket(e.target.value)}
                          className="w-full max-w-xs px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          {platform.marketplaces.map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleManualConnect(platform.id)}
                        disabled={connecting === platform.id}
                        className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-xs font-medium px-4 py-2 rounded-lg transition"
                      >
                        {connecting === platform.id && <Loader2 className="w-3 h-3 animate-spin" />}
                        {connecting === platform.id ? 'Connecting…' : 'Confirm Connection'}
                      </button>
                      <button
                        onClick={() => setShowManual(null)}
                        className="text-slate-400 hover:text-white text-xs px-3 py-2 transition"
                      >
                        Cancel
                      </button>
                    </div>

                    <p className="text-slate-500 text-xs">
                      Full OAuth integration coming soon. For now, connecting enables order format validation.
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
