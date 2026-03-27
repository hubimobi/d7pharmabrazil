import { LayoutDashboard, Users, Stethoscope, BarChart3, LogOut, Package, DollarSign, Store, Plug, ShoppingCart, Tag, ImageIcon, Megaphone, ShoppingBag, Contact, Mail, FileText } from "lucide-react";
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
  SidebarHeader,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface MenuSection {
  label: string;
  items: { title: string; url: string; icon: React.ElementType }[];
}

const adminSections: MenuSection[] = [
  {
    label: "Menu",
    items: [
      { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
    ],
  },
  {
    label: "Vendas",
    items: [
      { title: "Vendas", url: "/admin/vendas", icon: ShoppingBag },
      { title: "Clientes", url: "/admin/clientes", icon: Contact },
      { title: "Recuperação", url: "/admin/recuperacao", icon: ShoppingCart },
      { title: "Cupons", url: "/admin/cupons", icon: Tag },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { title: "Produtos", url: "/admin/produtos", icon: Package },
      { title: "Prescritores", url: "/admin/prescritores", icon: Stethoscope },
      { title: "Representantes", url: "/admin/representantes", icon: Users },
    ],
  },
  {
    label: "Marketing",
    items: [
      { title: "Banner", url: "/admin/banner", icon: ImageIcon },
      { title: "PopUps & Barra", url: "/admin/popups", icon: Megaphone },
      { title: "Leads", url: "/admin/leads", icon: Mail },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { title: "Cashback", url: "/admin/comissoes", icon: DollarSign },
      { title: "Relatórios", url: "/admin/relatorios", icon: BarChart3 },
    ],
  },
  {
    label: "Sistema",
    items: [
      { title: "Páginas", url: "/admin/paginas", icon: FileText },
      { title: "Configurações", url: "/admin/configuracoes", icon: Store },
      { title: "Integrações", url: "/admin/integracoes", icon: Plug },
    ],
  },
];

const repSections: MenuSection[] = [
  {
    label: "Menu",
    items: [
      { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
    ],
  },
  {
    label: "Gestão",
    items: [
      { title: "Meus Prescritores", url: "/admin/prescritores", icon: Stethoscope },
      { title: "Cashback", url: "/admin/comissoes", icon: DollarSign },
      { title: "Relatórios", url: "/admin/relatorios", icon: BarChart3 },
    ],
  },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { isAdmin, signOut, user } = useAuth();
  const sections = isAdmin ? adminSections : repSections;

  const initials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : "AD";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-5">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <span className="text-sidebar-primary-foreground font-bold text-sm">D7</span>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-sidebar-accent-foreground">D7 Pharma</h2>
              <p className="text-2xs text-sidebar-foreground">Painel Administrativo</p>
            </div>
          </div>
        ) : (
          <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center mx-auto">
            <span className="text-sidebar-primary-foreground font-bold text-xs">D7</span>
          </div>
        )}
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent className="px-2">
        {sections.map((section, idx) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel className="text-2xs uppercase tracking-widest text-sidebar-foreground/50 font-medium px-3 mb-1">
              {!collapsed && section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const active = item.url === "/admin"
                    ? location.pathname === "/admin"
                    : location.pathname.startsWith(item.url);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={active}>
                        <NavLink
                          to={item.url}
                          end={item.url === "/admin"}
                          className="rounded-lg transition-colors text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          activeClassName="!bg-sidebar-primary !text-sidebar-primary-foreground font-medium"
                        >
                          <item.icon className="mr-2 h-4 w-4 shrink-0" />
                          {!collapsed && <span className="text-sm">{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter className="px-3 py-4">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 border border-sidebar-border">
              <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-sidebar-accent-foreground truncate">{user?.email}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-sidebar-foreground hover:text-sidebar-accent-foreground shrink-0" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="icon" className="w-full text-sidebar-foreground hover:text-sidebar-accent-foreground" onClick={signOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
