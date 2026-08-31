-- Migration to add per-product review_url to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS review_url TEXT;

-- Reload Supabase PostgREST schema cache
NOTIFY pgrst, 'reload schema';
