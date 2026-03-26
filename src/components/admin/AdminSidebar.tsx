import { LayoutDashboard, Users, Stethoscope, BarChart3, LogOut, Package, DollarSign, Store, Plug, ShoppingCart, Tag, ImageIcon, Megaphone, ShoppingBag, Contact, Mail } from "lucide-react";
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
  { title: "Vendas", url: "/admin/vendas", icon: ShoppingBag },
  { title: "Clientes", url: "/admin/clientes", icon: Contact },
  { title: "Produtos", url: "/admin/produtos", icon: Package },
  { title: "Representantes", url: "/admin/representantes", icon: Users },
  { title: "Prescritores", url: "/admin/prescritores", icon: Stethoscope },
  { title: "Cashback", url: "/admin/comissoes", icon: DollarSign },
  { title: "Recuperação", url: "/admin/recuperacao", icon: ShoppingCart },
  { title: "Cupons", url: "/admin/cupons", icon: Tag },
  { title: "Relatórios", url: "/admin/relatorios", icon: BarChart3 },
  { title: "Banner", url: "/admin/banner", icon: ImageIcon },
  { title: "PopUps & Barra", url: "/admin/popups", icon: Megaphone },
  { title: "Leads", url: "/admin/leads", icon: Mail },
  { title: "Configurações", url: "/admin/configuracoes", icon: Store },
  { title: "Integrações", url: "/admin/integracoes", icon: Plug },
];

const repItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Meus Prescritores", url: "/admin/prescritores", icon: Stethoscope },
  { title: "Cashback", url: "/admin/comissoes", icon: DollarSign },
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
