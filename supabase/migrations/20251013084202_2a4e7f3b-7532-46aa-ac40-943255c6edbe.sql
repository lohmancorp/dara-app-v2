-- Add DELETE policy to profiles table for GDPR compliance
CREATE POLICY "Users can delete their own profile"
ON profiles
FOR DELETE
USING (auth.uid() = id);