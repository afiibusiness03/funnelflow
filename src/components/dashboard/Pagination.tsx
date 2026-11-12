import Link from 'next/link'
export default function Pagination({ page, total, pageSize, path }: { page: number; total: number; pageSize: number; path: string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (pages === 1 && page === 1) return null
  return <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-300">
    {page > 1 ? <Link href={`${path}?page=${page - 1}`} className="inline-flex min-h-11 items-center rounded-lg border border-slate-600 px-3 py-2">Previous</Link> : <span />}
    <span>Page {page} of {pages}</span>
    {page < pages ? <Link href={`${path}?page=${page + 1}`} className="inline-flex min-h-11 items-center rounded-lg border border-slate-600 px-3 py-2">Next</Link> : <span />}
  </nav>
}
