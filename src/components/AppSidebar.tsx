import { Home, MessageSquare, Library, FileText, Activity, Link2 } from "lucide-react";
import { NavLink } from "react-router-dom";

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
  { title: "Ask Question", url: "/chat", icon: MessageSquare },
  { title: "Library", url: "/library", icon: Library },
  { title: "Templates", url: "/templates", icon: FileText },
  { title: "Active Jobs", url: "/active-jobs", icon: Activity },
  { title: "Connections", url: "/connections", icon: Link2 },
];

export function AppSidebar() {
  const { open, setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <div className={`flex items-center p-4 border-b border-sidebar-border ${open ? 'justify-between' : 'justify-center'}`}>
        {open && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-white text-sm font-bold">DA</span>
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              D.A.R.A.
            </h2>
          </div>
        )}
        <SidebarTrigger className="text-foreground hover:text-primary hidden md:flex" />
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
                          ? `bg-sidebar-accent text-primary font-medium ${open ? 'border-l-4 border-primary' : ''}`
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
