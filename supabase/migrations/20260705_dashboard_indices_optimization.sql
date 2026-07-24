-- Compound index to optimize dashboard analytics events count (scans, completions) in 30 days
CREATE INDEX IF NOT EXISTS idx_events_tenant_type_created ON funnel_events(tenant_id, event_type, created_at DESC);

-- Compound index to optimize dashboard recent submissions ordering by date
CREATE INDEX IF NOT EXISTS idx_submissions_tenant_created ON funnel_submissions(tenant_id, created_at DESC);
