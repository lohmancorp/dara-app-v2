-- Add preference fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_notifications boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS research_complete_notifications boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS weekly_summary_notifications boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS data_sharing boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS language_code text DEFAULT 'en',
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'UTC';