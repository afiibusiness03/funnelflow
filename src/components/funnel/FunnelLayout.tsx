interface FunnelLayoutProps {
  children:    React.ReactNode
  brandColor?: string
  logoUrl?:    string | null
  tenantName?: string
  step?:       number
  totalSteps?: number
}

export default function FunnelLayout({
  children, brandColor = '#6366f1', logoUrl, tenantName, step, totalSteps = 4,
}: FunnelLayoutProps) {
  const progress = step ? Math.round((step / totalSteps) * 100) : 0

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-start py-8 px-4">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="flex items-center justify-center mb-6">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={tenantName ?? ''} className="h-8 object-contain" />
          ) : tenantName ? (
            <span className="font-semibold text-slate-700">{tenantName}</span>
          ) : null}
        </div>

        {/* Progress bar */}
        {step && (
          <div className="mb-6">
            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, backgroundColor: brandColor }}
              />
            </div>
            <p className="text-slate-400 text-xs text-right mt-1">Step {step} of {totalSteps}</p>
          </div>
        )}

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          {children}
        </div>

        {/* Footer */}
        <p className="text-center text-slate-400 text-xs mt-6">
          Powered by{' '}
          <a href="https://funnelflow.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-600">
            FunnelFlow
          </a>
        </p>
      </div>
    </div>
  )
}
