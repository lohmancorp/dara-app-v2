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
  const { open, setOpenMobile, isMobile, setOpen } = useSidebar();

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <div
        className={`flex items-center border-b border-sidebar-border ${
          open 
            ? "justify-between p-3 sm:p-4" 
            : "justify-center p-2"
        }`}
      >
        {open ? (
          <>
            <NavLink 
              to="/" 
              onClick={() => isMobile && setOpenMobile(false)}
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity min-w-0 flex-1"
            >
              <img 
                src={daraLogo} 
                alt="D.A.R.A. Logo" 
                className="h-[45px] w-[45px] sm:h-[50px] sm:w-[50px] lg:h-[55px] lg:w-[55px] rounded-lg object-cover flex-shrink-0"
              />
              <h2 className="text-base sm:text-lg font-semibold text-foreground truncate">D.A.R.A.</h2>
            </NavLink>
            <SidebarTrigger className="text-foreground hover:text-primary flex-shrink-0 hidden lg:flex" />
          </>
        ) : (
          <button
            onClick={() => setOpen(true)}
            className="p-1 hover:opacity-80 transition-opacity"
            aria-label="Expand sidebar"
          >
            <img 
              src={daraLogo} 
              alt="D.A.R.A. Logo" 
              className="h-[30px] w-[30px] rounded-lg object-cover"
            />
          </button>
        )}
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
