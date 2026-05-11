-- Create watchlist_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.watchlist_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    cover_url TEXT,
    status TEXT DEFAULT 'waiting',
    added_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Turn off RLS for all tables so your frontend can read/write data freely 
-- (Since your app uses a custom PIN login system instead of Supabase Auth)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.snaps DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_its DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.wheel_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_capsules DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist_items DISABLE ROW LEVEL SECURITY;

-- If you prefer keeping RLS enabled but want to allow all access, 
-- you can uncomment the following lines and run them instead of disabling RLS:

-- CREATE POLICY "Allow all access to profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow all access to snaps" ON public.snaps FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow all access to post_its" ON public.post_its FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow all access to events" ON public.events FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow all access to wheel_items" ON public.wheel_items FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow all access to time_capsules" ON public.time_capsules FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow all access to watchlist_items" ON public.watchlist_items FOR ALL USING (true) WITH CHECK (true);

-- Allow anyone to upload, update, and delete images in the 'snaps' storage bucket
CREATE POLICY "Public Access" ON storage.objects FOR ALL USING (bucket_id = 'snaps') WITH CHECK (bucket_id = 'snaps');
