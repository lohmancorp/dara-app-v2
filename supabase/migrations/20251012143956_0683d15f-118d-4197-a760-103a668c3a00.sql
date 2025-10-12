-- Create prompt_templates table
CREATE TABLE public.prompt_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt_name TEXT NOT NULL,
  prompt_description TEXT NOT NULL CHECK (length(prompt_description) <= 255),
  prompt_outcome TEXT NOT NULL,
  prompt TEXT NOT NULL,
  system_outcome TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  prompt_model TEXT NOT NULL,
  total_tokens INTEGER DEFAULT 0,
  total_prompt_cost DECIMAL(10, 6) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, prompt_name)
);

-- Enable Row Level Security
ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own prompt templates" 
ON public.prompt_templates 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own prompt templates" 
ON public.prompt_templates 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own prompt templates" 
ON public.prompt_templates 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own prompt templates" 
ON public.prompt_templates 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_prompt_templates_updated_at
BEFORE UPDATE ON public.prompt_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();