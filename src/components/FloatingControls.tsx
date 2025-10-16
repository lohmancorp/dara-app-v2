import { Bell, User, Settings2 } from "lucide-react";
import { useState, useEffect } from "react";
import { NotificationDropdown } from "./NotificationDropdown";
import { ProfileDropdown } from "./ProfileDropdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface FloatingControlsProps {
  actionButton?: React.ReactNode;
  onAdvancedClick?: () => void;
  advancedPressed?: boolean;
}

export function FloatingControls({ actionButton, onAdvancedClick, advancedPressed }: FloatingControlsProps) {
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchAvatarUrl = async () => {
      if (!user?.id) return;

      const { data } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .single();

      if (data?.avatar_url) {
        setAvatarUrl(data.avatar_url);
      }
    };

    fetchAvatarUrl();

    // Set up realtime subscription to listen for profile changes
    const channel = supabase
      .channel('profile-avatar-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user?.id}`,
        },
        (payload) => {
          if (payload.new && 'avatar_url' in payload.new) {
            setAvatarUrl((payload.new as any).avatar_url);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleAdvancedClick = () => {
    onAdvancedClick?.();
  };

  return (
    <div className="fixed top-6 left-0 right-0 z-50 pointer-events-none">
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-end gap-3 pointer-events-auto">
          {actionButton && <div>{actionButton}</div>}

          {onAdvancedClick && (
            <button
              onClick={handleAdvancedClick}
              className="h-11 w-11 rounded-full bg-accent text-accent-foreground border-2 border-border shadow-lg hover:shadow-xl transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              aria-label="Advanced settings"
              aria-pressed={advancedPressed}
            >
              <Settings2 className="h-5 w-5" />
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => {
                setNotificationOpen(!notificationOpen);
                setProfileOpen(false);
              }}
              className="h-11 w-11 rounded-full bg-accent text-accent-foreground border-2 border-border shadow-lg hover:shadow-xl transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              aria-expanded={notificationOpen}
              aria-controls="notification-dropdown"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium">
                3
              </span>
            </button>
            {notificationOpen && <NotificationDropdown onClose={() => setNotificationOpen(false)} />}
          </div>

          <div className="relative">
            <button
              onClick={() => {
                setProfileOpen(!profileOpen);
                setNotificationOpen(false);
              }}
              className="h-11 w-11 rounded-full bg-gradient-to-br from-primary to-accent border-2 border-border shadow-lg hover:shadow-xl transition-all flex items-center justify-center text-white focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 overflow-hidden"
              aria-expanded={profileOpen}
              aria-controls="profile-dropdown"
              aria-label="Profile menu"
            >
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt="User avatar" 
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-5 w-5" />
              )}
            </button>
            {profileOpen && <ProfileDropdown onClose={() => setProfileOpen(false)} />}
          </div>
        </div>
      </div>
    </div>
  );
}
