-- Create template_votes table for thumbs up/down voting
CREATE TABLE public.template_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  template_id UUID NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('prompt', 'job')),
  vote SMALLINT NOT NULL CHECK (vote IN (1, -1)),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, template_id, template_type)
);

-- Enable Row Level Security
ALTER TABLE public.template_votes ENABLE ROW LEVEL SECURITY;

-- Users can view all votes (for score calculation)
CREATE POLICY "Anyone can view votes"
ON public.template_votes
FOR SELECT
USING (true);

-- Users can insert their own votes
CREATE POLICY "Users can insert their own votes"
ON public.template_votes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own votes
CREATE POLICY "Users can update their own votes"
ON public.template_votes
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own votes
CREATE POLICY "Users can delete their own votes"
ON public.template_votes
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_template_votes_updated_at
BEFORE UPDATE ON public.template_votes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_template_votes_template ON public.template_votes(template_id, template_type);
CREATE INDEX idx_template_votes_user ON public.template_votes(user_id);