-- Add secondary_connections column to job_templates table
ALTER TABLE public.job_templates 
ADD COLUMN secondary_connections text[] DEFAULT '{}';

-- Add comment for clarity
COMMENT ON COLUMN public.job_templates.job_connection IS 'Primary connection ID';
COMMENT ON COLUMN public.job_templates.secondary_connections IS 'Array of secondary connection IDs for linked data sources';