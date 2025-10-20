-- Add is_chat_default column to connections table
ALTER TABLE public.connections 
ADD COLUMN is_chat_default BOOLEAN DEFAULT false;

-- Create function to ensure only one connection is marked as chat default per user
CREATE OR REPLACE FUNCTION public.ensure_single_chat_default()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If this connection is being set as default
  IF NEW.is_chat_default = true THEN
    -- Unset any other connections marked as default for this user
    UPDATE public.connections
    SET is_chat_default = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_chat_default = true;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to enforce single default
DROP TRIGGER IF EXISTS ensure_single_chat_default_trigger ON public.connections;
CREATE TRIGGER ensure_single_chat_default_trigger
  BEFORE INSERT OR UPDATE ON public.connections
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_chat_default();

-- Add comment for clarity
COMMENT ON COLUMN public.connections.is_chat_default IS 'Marks this connection as the default LLM for chat functionality. Only one connection per user can be marked as default.';