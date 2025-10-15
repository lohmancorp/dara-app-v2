-- Create table for vote feedback
CREATE TABLE public.vote_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vote_id UUID NOT NULL,
  user_id UUID NOT NULL,
  template_id UUID NOT NULL,
  template_type TEXT NOT NULL,
  feedback TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.vote_feedback ENABLE ROW LEVEL SECURITY;

-- Create policies for vote feedback
CREATE POLICY "Users can view feedback for templates"
ON public.vote_feedback
FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own feedback"
ON public.vote_feedback
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback"
ON public.vote_feedback
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own feedback"
ON public.vote_feedback
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_vote_feedback_updated_at
BEFORE UPDATE ON public.vote_feedback
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_vote_feedback_template ON public.vote_feedback(template_id, template_type);
CREATE INDEX idx_vote_feedback_user ON public.vote_feedback(user_id);