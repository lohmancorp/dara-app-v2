-- Add user_token field to chat_jobs table to store user JWT for background processing
ALTER TABLE public.chat_jobs 
ADD COLUMN user_token TEXT;