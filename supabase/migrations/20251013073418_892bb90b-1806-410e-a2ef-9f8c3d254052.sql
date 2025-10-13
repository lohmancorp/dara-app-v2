-- Create job_templates table
CREATE TABLE public.job_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_name TEXT NOT NULL,
  job_description TEXT NOT NULL,
  job_connection TEXT NOT NULL,
  job_prompt TEXT NOT NULL,
  job_team TEXT[] DEFAULT '{}'::text[],
  job_tags TEXT[] DEFAULT '{}'::text[],
  research_type TEXT NOT NULL,
  research_depth TEXT NOT NULL,
  research_exactness TEXT NOT NULL,
  job_outcome TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.job_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for job_templates
CREATE POLICY "Users can view their own job templates" 
ON public.job_templates 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own job templates" 
ON public.job_templates 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own job templates" 
ON public.job_templates 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own job templates" 
ON public.job_templates 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_job_templates_updated_at
BEFORE UPDATE ON public.job_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();