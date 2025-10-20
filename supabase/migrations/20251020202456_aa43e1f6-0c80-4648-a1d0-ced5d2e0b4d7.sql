-- Add is_active column to mcp_services table to enable/disable connections globally
ALTER TABLE public.mcp_services 
ADD COLUMN is_active boolean NOT NULL DEFAULT true;