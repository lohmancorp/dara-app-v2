-- Add unique constraint to vote_feedback to ensure one feedback per user per template
ALTER TABLE public.vote_feedback
ADD CONSTRAINT vote_feedback_user_template_unique UNIQUE (user_id, template_id, template_type);