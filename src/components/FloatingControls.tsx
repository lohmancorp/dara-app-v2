import { Bell, User } from "lucide-react";
import { useState } from "react";
import { NotificationDropdown } from "./NotificationDropdown";
import { ProfileDropdown } from "./ProfileDropdown";

export function FloatingControls() {
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div className="fixed top-6 right-6 z-50 flex items-center gap-3">
      <div className="relative">
        <button
          onClick={() => {
            setNotificationOpen(!notificationOpen);
            setProfileOpen(false);
          }}
          className="h-11 w-11 rounded-full bg-card border border-border shadow-lg hover:shadow-xl transition-all flex items-center justify-center text-foreground hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-expanded={notificationOpen}
          aria-controls="notification-dropdown"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium">
            3
          </span>
        </button>
        {notificationOpen && (
          <NotificationDropdown onClose={() => setNotificationOpen(false)} />
        )}
      </div>

      <div className="relative">
        <button
          onClick={() => {
            setProfileOpen(!profileOpen);
            setNotificationOpen(false);
          }}
          className="h-11 w-11 rounded-full bg-gradient-to-br from-primary to-accent border-2 border-border shadow-lg hover:shadow-xl transition-all flex items-center justify-center text-white focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-expanded={profileOpen}
          aria-controls="profile-dropdown"
          aria-label="Profile menu"
        >
          <User className="h-5 w-5" />
        </button>
        {profileOpen && <ProfileDropdown onClose={() => setProfileOpen(false)} />}
      </div>
    </div>
  );
}
