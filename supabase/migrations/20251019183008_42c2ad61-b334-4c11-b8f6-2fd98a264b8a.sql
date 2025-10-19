-- Create table for tracking async chat/research jobs
CREATE TABLE IF NOT EXISTS public.chat_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  query TEXT NOT NULL,
  filters JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error TEXT,
  result JSONB,
  total_tickets INTEGER,
  progress INTEGER DEFAULT 0,
  progress_message TEXT
);

-- Enable RLS
ALTER TABLE public.chat_jobs ENABLE ROW LEVEL SECURITY;

-- Users can view their own jobs
CREATE POLICY "Users can view their own jobs"
  ON public.chat_jobs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own jobs
CREATE POLICY "Users can create their own jobs"
  ON public.chat_jobs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own jobs
CREATE POLICY "Users can update their own jobs"
  ON public.chat_jobs
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_chat_jobs_user_status ON public.chat_jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_chat_jobs_created_at ON public.chat_jobs(created_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_chat_jobs_updated_at
  BEFORE UPDATE ON public.chat_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();