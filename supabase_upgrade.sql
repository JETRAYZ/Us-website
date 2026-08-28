-- =========================================================================
-- 🚀 US Space — Complete Feature & Push Notification Database Migration
-- =========================================================================
-- Run this in: Supabase Dashboard → SQL Editor → New query → Paste & Run
-- =========================================================================

-- 1. Web Push Subscriptions Table (Device endpoints for background push notifications)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    subscription JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "allow_all_push_subscriptions" ON public.push_subscriptions FOR ALL USING (true) WITH CHECK (true);

-- 2. Post-It Photo Attachments
ALTER TABLE public.post_its ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 3. Watchlist Categories, Ratings & Reviews
ALTER TABLE public.watchlist_items ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'movie';
ALTER TABLE public.watchlist_items ADD COLUMN IF NOT EXISTS rating INT DEFAULT 0;
ALTER TABLE public.watchlist_items ADD COLUMN IF NOT EXISTS review TEXT;

-- 4. App Settings / Anniversary D-Day Counter Table
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_app_settings" ON public.app_settings;
CREATE POLICY "allow_all_app_settings" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);

-- Set initial default anniversary date (Changeable in the app UI anytime)
INSERT INTO public.app_settings (key, value) 
VALUES ('anniversary', '{"start_date": "2024-01-01", "title": "Our Journey"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 5. Verification Query
SELECT 'Push Subscriptions' as feature, count(*) FROM public.push_subscriptions
UNION ALL
SELECT 'App Settings' as feature, count(*) FROM public.app_settings;
