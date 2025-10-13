import { useEffect, useRef, useState } from "react";
import { User, Settings, Moon, Sun, Monitor, ChevronRight, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";

interface ProfileDropdownProps {
  onClose: () => void;
}

export function ProfileDropdown({ onClose }: ProfileDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, signOut } = useAuth();
  const [theme, setTheme] = useState<"light" | "dark" | "system">(
    () => (localStorage.getItem("theme") as "light" | "dark" | "system") || "system"
  );
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  const getUserName = () => {
    return user?.user_metadata?.full_name || "User";
  };

  const getUserEmail = () => {
    return user?.email || "user@example.com";
  };

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

  const applyTheme = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);

    const root = document.documentElement;
    if (newTheme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
      root.setAttribute("data-theme", systemTheme);
      root.classList.toggle("dark", systemTheme === "dark");
    } else {
      root.setAttribute("data-theme", newTheme);
      root.classList.toggle("dark", newTheme === "dark");
    }
  };

  const themeOptions = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ] as const;

  const CurrentThemeIcon =
    themeOptions.find((opt) => opt.value === theme)?.icon || Monitor;

  return (
    <div
      ref={dropdownRef}
      id="profile-dropdown"
      className="absolute top-full right-0 mt-2 w-56 bg-popover border border-border rounded-lg shadow-lg z-50"
      role="menu"
    >
      <div className="p-2">
        <div className="px-3 py-2 mb-1">
          <p className="text-sm font-medium text-foreground">{getUserName()}</p>
          <p className="text-xs text-muted-foreground">{getUserEmail()}</p>
        </div>

        <Separator className="my-2" />

        <Link
          to="/profile"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-accent rounded-md transition-colors [&:hover]:dark:text-foreground [&:hover]:light:text-white [&:hover_svg]:light:text-white"
          role="menuitem"
          aria-label="Go to profile page"
        >
          <User className="h-4 w-4" />
          Profile
        </Link>

        <Link
          to="/settings"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-accent rounded-md transition-colors [&:hover]:dark:text-foreground [&:hover]:light:text-white [&:hover_svg]:light:text-white"
          role="menuitem"
          aria-label="Go to settings page"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>

        <Separator className="my-2" />

        <div className="relative">
          <button
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className="w-full flex items-center justify-between gap-3 px-3 py-2 text-sm text-foreground hover:bg-accent rounded-md transition-colors [&:hover]:dark:text-foreground [&:hover]:light:text-white [&:hover_svg]:light:text-white"
            role="menuitem"
            aria-expanded={showThemeMenu}
            aria-label="Change appearance theme"
          >
            <div className="flex items-center gap-3">
              <CurrentThemeIcon className="h-4 w-4" />
              <span>Appearance</span>
            </div>
            <ChevronRight
              className={`h-4 w-4 transition-transform ${
                showThemeMenu ? "rotate-90" : ""
              }`}
            />
          </button>

          {showThemeMenu && (
            <div className="mt-1 ml-2 pl-2 border-l-2 border-border space-y-1">
              {themeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => applyTheme(option.value)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                    theme === option.value
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground hover:bg-accent [&:hover]:dark:text-foreground [&:hover]:light:text-white [&:hover_svg]:light:text-white"
                  }`}
                  role="menuitem"
                  aria-label={`Switch to ${option.label} theme`}
                  aria-current={theme === option.value ? "true" : undefined}
                >
                  <option.icon className="h-4 w-4" />
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <Separator className="my-2" />

        <button
          onClick={() => {
            signOut();
            onClose();
          }}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-accent rounded-md transition-colors [&:hover]:dark:text-foreground [&:hover]:light:text-white [&:hover_svg]:light:text-white"
          role="menuitem"
          aria-label="Log out"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </div>
    </div>
  );
}
