-- Add allow_custom_endpoint column to control if users can customize the endpoint
ALTER TABLE public.mcp_services 
ADD COLUMN allow_custom_endpoint boolean NOT NULL DEFAULT false;