-- Add prompt_team and prompt_tags columns to prompt_templates table
ALTER TABLE public.prompt_templates
ADD COLUMN prompt_team text[] DEFAULT '{}',
ADD COLUMN prompt_tags text[] DEFAULT '{}';

-- Create index for better search performance on tags
CREATE INDEX idx_prompt_templates_tags ON public.prompt_templates USING GIN(prompt_tags);
CREATE INDEX idx_prompt_templates_team ON public.prompt_templates USING GIN(prompt_team);