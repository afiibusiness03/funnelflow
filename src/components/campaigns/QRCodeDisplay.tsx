'use client'

import { useState } from 'react'
import { Download, Copy, Check, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils/helpers'

interface QRCodeDisplayProps {
  campaignId:   string
  shortCode:    string
  qrCodeUrl:    string | null
  brandColor?:  string
  funnelUrl:    string
}

export default function QRCodeDisplay({
  campaignId, shortCode, qrCodeUrl, brandColor = '#6366f1', funnelUrl
}: QRCodeDisplayProps) {
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const copyLink = async () => {
    await navigator.clipboard.writeText(funnelUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadQR = async (format: 'svg' | 'png') => {
    setDownloading(true)
    try {
      const color = encodeURIComponent(brandColor)
      const res = await fetch(`/api/campaigns/${campaignId}/qr?format=${format}&color=${color}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `qr-${shortCode}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
      <h3 className="text-white font-semibold mb-4">Your QR Code</h3>

      {/* QR Preview */}
      <div className="flex justify-center mb-5">
        <div className="w-48 h-48 bg-white rounded-xl p-3 flex items-center justify-center">
          {qrCodeUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrCodeUrl} alt="QR Code" className="w-full h-full" />
          ) : (
            <div className="w-full h-full bg-slate-100 rounded-lg animate-pulse" />
          )}
        </div>
      </div>

      {/* Funnel URL */}
      <div className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 flex items-center gap-2 mb-4">
        <span className="text-slate-400 text-xs flex-1 truncate font-mono">{funnelUrl}</span>
        <button onClick={copyLink} className="text-slate-400 hover:text-white transition flex-shrink-0">
          {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
        </button>
        <a href={funnelUrl} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition flex-shrink-0">
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Download buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => downloadQR('svg')}
          disabled={downloading}
          className={cn(
            'flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 text-sm transition',
            downloading && 'opacity-50 cursor-not-allowed'
          )}
        >
          <Download className="w-3.5 h-3.5" /> SVG
        </button>
        <button
          onClick={() => downloadQR('png')}
          disabled={downloading}
          className={cn(
            'flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 text-sm transition',
            downloading && 'opacity-50 cursor-not-allowed'
          )}
        >
          <Download className="w-3.5 h-3.5" /> PNG
        </button>
      </div>

      <p className="text-slate-500 text-xs mt-3 text-center">
        Print at minimum 2cm × 2cm for reliable scanning
      </p>
    </div>
  )
}
