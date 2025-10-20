-- Add job_id column to chat_messages table to track which messages are associated with background jobs
ALTER TABLE public.chat_messages
ADD COLUMN job_id UUID REFERENCES public.chat_jobs(id) ON DELETE SET NULL;