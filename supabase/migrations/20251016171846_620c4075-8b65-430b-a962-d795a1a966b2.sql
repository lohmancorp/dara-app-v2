-- Allow all authenticated users to view profile names (for author attribution)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can view all profile names" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);