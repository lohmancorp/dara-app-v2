-- Update RLS policies to allow all authenticated users to view all templates
-- while keeping create, update, and delete restricted to owners

-- Drop existing restrictive SELECT policies
DROP POLICY IF EXISTS "Users can view their own job templates" ON public.job_templates;
DROP POLICY IF EXISTS "Users can view their own prompt templates" ON public.prompt_templates;

-- Create new SELECT policies that allow all authenticated users to view all templates
CREATE POLICY "Authenticated users can view all job templates"
ON public.job_templates
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view all prompt templates"
ON public.prompt_templates
FOR SELECT
TO authenticated
USING (true);