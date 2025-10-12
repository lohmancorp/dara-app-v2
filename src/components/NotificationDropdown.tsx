import { useEffect, useRef } from "react";
import { Bell, FileText, Activity, CheckCircle2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface Notification {
  id: string;
  type: "info" | "success" | "warning";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "success",
    title: "Research Complete",
    message: "Your market analysis report is ready to view",
    timestamp: "5 minutes ago",
    read: false,
  },
  {
    id: "2",
    type: "info",
    title: "New Template Available",
    message: "Check out the latest competitive analysis template",
    timestamp: "2 hours ago",
    read: false,
  },
  {
    id: "3",
    type: "warning",
    title: "Job In Progress",
    message: "Industry trends research is 75% complete",
    timestamp: "1 day ago",
    read: true,
  },
];

interface NotificationDropdownProps {
  onClose: () => void;
}

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "warning":
        return <Activity className="h-5 w-5 text-yellow-500" />;
      default:
        return <FileText className="h-5 w-5 text-primary" />;
    }
  };

  return (
    <div
      ref={dropdownRef}
      id="notification-dropdown"
      className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-popover border border-border rounded-lg shadow-lg z-50"
      role="menu"
    >
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Notifications</h3>
          <button className="text-xs text-primary hover:underline">Mark all read</button>
        </div>
      </div>

      <ScrollArea className="h-[320px]">
        {mockNotifications.length > 0 ? (
          <div className="divide-y divide-border">
            {mockNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-accent/50 transition-colors cursor-pointer ${
                  !notification.read ? "bg-accent/30" : ""
                }`}
                role="menuitem"
              >
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-0.5">{getIcon(notification.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm text-foreground">
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {notification.timestamp}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <Bell className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium text-foreground">No notifications</p>
            <p className="text-xs text-muted-foreground text-center mt-1">
              You're all caught up! Check back later for updates.
            </p>
          </div>
        )}
      </ScrollArea>

      <Separator />
      <div className="p-2">
        <button className="w-full py-2 text-sm text-primary hover:bg-accent rounded-md transition-colors">
          View all notifications
        </button>
      </div>
    </div>
  );
}
