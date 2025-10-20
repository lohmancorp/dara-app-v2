-- Add tags column to mcp_services table
ALTER TABLE public.mcp_services 
ADD COLUMN tags text[] DEFAULT '{}'::text[];