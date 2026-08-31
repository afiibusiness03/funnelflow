-- Add public_landing_enabled toggle column to site_settings table
ALTER TABLE site_settings 
ADD COLUMN IF NOT EXISTS public_landing_enabled BOOLEAN DEFAULT true;

-- Ensure default row exists with public_landing_enabled = true
INSERT INTO site_settings (id, public_landing_enabled)
VALUES ('00000000-0000-0000-0000-000000000000', true)
ON CONFLICT (id) DO UPDATE SET public_landing_enabled = EXCLUDED.public_landing_enabled;

-- Create waitlist_requests table for storing visitor email access requests when platform is in private mode
CREATE TABLE IF NOT EXISTS waitlist_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE waitlist_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public insert to waitlist_requests" ON waitlist_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated read to waitlist_requests" ON waitlist_requests FOR SELECT USING (auth.role() = 'authenticated');
