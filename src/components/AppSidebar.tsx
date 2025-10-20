import { Home, MessageSquare, Library, FileText, Activity, Cable, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";
import daraLogo from "@/assets/dara-logo.png";
import { useAppAdmin } from "@/hooks/useAppAdmin";

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
  { title: "Jobs", url: "/jobs", icon: Activity },
  { title: "Connections", url: "/connections", icon: Cable },
];

export function AppSidebar() {
  const { open, setOpenMobile } = useSidebar();
  const { isAppAdmin, loading } = useAppAdmin();

  return (
    <Sidebar collapsible="icon" className="border-r-0 flex flex-col">
      <div
        className={`flex items-center p-4 border-b border-sidebar-border ${open ? "justify-between" : "justify-center"}`}
      >
        {open && (
          <div className="flex items-center gap-2">
            <img 
              src={daraLogo} 
              alt="D.A.R.A. Logo" 
              className="h-[55px] w-[55px] rounded-lg object-cover"
            />
            <h2 className="text-lg font-semibold text-foreground">D.A.R.A.</h2>
          </div>
        )}
        <SidebarTrigger className="text-foreground hover:text-primary hidden md:flex" />
      </div>

      <SidebarContent className="flex flex-col flex-1">
        <SidebarGroup className="flex-1">
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

        {!loading && isAppAdmin && (
          <SidebarGroup className="mt-auto border-t border-sidebar-border pt-4">
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/admin"
                      onClick={() => setOpenMobile(false)}
                      className={({ isActive }) =>
                        isActive
                          ? `bg-sidebar-accent text-primary font-medium ${open ? "border-l-4 border-primary" : ""}`
                          : "text-foreground dark:text-white hover:bg-sidebar-accent hover:text-foreground dark:hover:text-primary"
                      }
                    >
                      <Settings className="h-4 w-4" />
                      <span>Admin</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
