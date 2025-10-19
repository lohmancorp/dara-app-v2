-- Fix search_path for get_next_job_sequence function
CREATE OR REPLACE FUNCTION public.get_next_job_sequence(p_session_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sequence INTEGER;
BEGIN
  SELECT COALESCE(MAX(job_sequence), 0) + 1
  INTO v_sequence
  FROM public.chat_jobs
  WHERE chat_session_id = p_session_id;
  
  RETURN v_sequence;
END;
$$;