import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useAppAdmin = () => {
  const { user } = useAuth();
  const [isAppAdmin, setIsAppAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        setIsAppAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'app_admin')
          .maybeSingle();

        if (error) throw error;
        setIsAppAdmin(!!data);
      } catch (error) {
        console.error('Error checking admin role:', error);
        setIsAppAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminRole();
  }, [user]);

  return { isAppAdmin, loading };
};
