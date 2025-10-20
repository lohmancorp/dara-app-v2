-- Add rate_limit_per_hour column to mcp_services table
ALTER TABLE public.mcp_services 
ADD COLUMN rate_limit_per_hour integer DEFAULT 3600;