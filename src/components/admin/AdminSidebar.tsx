import { LayoutDashboard, Users, Stethoscope, BarChart3, LogOut, Package, DollarSign } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const adminItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Produtos", url: "/admin/produtos", icon: Package },
  { title: "Representantes", url: "/admin/representantes", icon: Users },
  { title: "Doutores", url: "/admin/doutores", icon: Stethoscope },
  { title: "Comissões", url: "/admin/comissoes", icon: DollarSign },
  { title: "Relatórios", url: "/admin/relatorios", icon: BarChart3 },
];

const repItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Meus Doutores", url: "/admin/doutores", icon: Stethoscope },
  { title: "Comissões", url: "/admin/comissoes", icon: DollarSign },
  { title: "Relatórios", url: "/admin/relatorios", icon: BarChart3 },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { isAdmin, signOut, user } = useAuth();
  const items = isAdmin ? adminItems : repItems;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {!collapsed && "D7 Pharma"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/admin"}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {!collapsed && (
          <p className="text-xs text-muted-foreground px-2 truncate mb-1">
            {user?.email}
          </p>
        )}
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
          <LogOut className="h-4 w-4 mr-2" />
          {!collapsed && "Sair"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
