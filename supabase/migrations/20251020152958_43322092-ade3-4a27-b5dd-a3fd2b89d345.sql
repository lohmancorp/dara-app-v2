-- Enable realtime for chat_jobs table so clients can subscribe to job completion events
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_jobs;