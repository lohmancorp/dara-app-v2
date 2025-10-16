import { Home, MessageSquare, Library, FileText, Activity, Link2 } from "lucide-react";
import { NavLink } from "react-router-dom";
import daraLogo from "@/assets/dara-logo.png";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Research", url: "/chat", icon: MessageSquare },
  { title: "Library", url: "/library", icon: Library },
  { title: "Templates", url: "/templates", icon: FileText },
  { title: "Jobs", url: "/active-jobs", icon: Activity },
  { title: "Connections", url: "/connections", icon: Link2 },
];

export function AppSidebar() {
  const { open, setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <div
        className={`flex items-center gap-2 p-4 border-b border-sidebar-border ${open ? "justify-between" : "justify-center"}`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <NavLink to="/" className="cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0">
            <img 
              src={daraLogo} 
              alt="D.A.R.A. Logo" 
              className={`rounded-lg object-cover ${open ? "h-[55px] w-[55px]" : "h-[32px] w-[32px]"}`}
            />
          </NavLink>
          {open && (
            <NavLink 
              to="/" 
              className="text-lg font-semibold text-foreground no-underline hover:opacity-80 transition-opacity truncate"
            >
              D.A.R.A.
            </NavLink>
          )}
        </div>
        {open && <SidebarTrigger className="text-foreground hover:text-primary flex-shrink-0 hidden md:block" />}
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      onClick={() => setOpenMobile(false)}
                      className={({ isActive }) =>
                        isActive
                          ? `bg-sidebar-accent text-primary font-medium ${open ? "border-l-4 border-primary" : ""}`
                          : "text-foreground dark:text-white hover:bg-sidebar-accent hover:text-foreground dark:hover:text-primary"
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
