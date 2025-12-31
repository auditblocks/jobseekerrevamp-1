import { 
  LayoutDashboard, 
  Users, 
  UserSearch, 
  BarChart3, 
  Settings, 
  Globe,
  CreditCard,
  Bell,
  FileText,
  ArrowLeft,
  Sliders,
  Activity
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const mainItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Recruiters", url: "/admin/recruiters", icon: UserSearch },
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
  { title: "User Activity", url: "/admin/user-activity", icon: Activity },
];

const managementItems = [
  { title: "Domains", url: "/admin/domains", icon: Globe },
  { title: "Subscriptions", url: "/admin/subscriptions", icon: CreditCard },
  { title: "Notifications", url: "/admin/notifications", icon: Bell },
  { title: "Requests", url: "/admin/requests", icon: FileText },
  { title: "Dashboard Config", url: "/admin/dashboard-config", icon: Sliders },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { profile } = useAuth();

  const isActive = (path: string) => {
    if (path === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="p-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center">
              <span className="text-accent-foreground font-bold text-sm">SA</span>
            </div>
            <div>
              <p className="font-semibold text-sm">Admin Panel</p>
              <p className="text-xs text-muted-foreground">{profile?.email}</p>
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Overview</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <NavLink to={item.url} end={item.url === "/admin"}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <NavLink to={item.url}>
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

      <SidebarFooter className="p-4">
        <Button variant="ghost" size="sm" asChild className="w-full justify-start">
          <NavLink to="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {!collapsed && "Back to App"}
          </NavLink>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
