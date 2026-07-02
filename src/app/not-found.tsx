import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-6xl font-bold text-slate-700 mb-4">404</p>
        <h2 className="text-white text-xl font-semibold mb-2">Page not found</h2>
        <p className="text-slate-400 text-sm mb-6">The page you're looking for doesn't exist.</p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}
