import { useState } from "react";
import {
  LayoutDashboard, Users, Stethoscope, BarChart3, LogOut, Package,
  DollarSign, Store, Plug, ShoppingCart, Tag, ImageIcon, Megaphone,
  ShoppingBag, Contact, Mail, FileText, Palette, Settings2, Sparkles,
  UserCog, Link2, ChevronDown, ChevronRight, Wrench, RefreshCw, MessageSquare,
  Star, Crown,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useTenant } from "@/hooks/useTenant";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface MenuItem {
  title: string;
  url: string;
  icon: React.ElementType;
}

interface MenuSection {
  label?: string;
  items?: MenuItem[];
  groups?: { title: string; icon: React.ElementType; children: MenuItem[] }[];
}

const adminSections: MenuSection[] = [
  {
    items: [
      { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
    ],
  },
  {
    label: "VENDAS",
    groups: [
      {
        title: "Vendas",
        icon: ShoppingBag,
        children: [
          { title: "Pedidos", url: "/admin/vendas", icon: ShoppingBag },
          { title: "Clientes", url: "/admin/clientes", icon: Contact },
          { title: "Recuperação", url: "/admin/recuperacao", icon: ShoppingCart },
          { title: "Recompra (+LTV)", url: "/admin/recompra", icon: RefreshCw },
          { title: "Cupons", url: "/admin/cupons", icon: Tag },
          { title: "Checkout", url: "/admin/checkout", icon: Settings2 },
        ],
      },
    ],
  },
  {
    label: "CATÁLOGO",
    groups: [
      {
        title: "Catálogo",
        icon: Package,
        children: [
          { title: "Produtos", url: "/admin/produtos", icon: Package },
          { title: "Combos", url: "/admin/combos", icon: Package },
          { title: "Prescritores", url: "/admin/prescritores", icon: Stethoscope },
          { title: "Representantes", url: "/admin/representantes", icon: Users },
        ],
      },
    ],
  },
  {
    label: "MARKETING",
    groups: [
      {
        title: "Marketing",
        icon: Megaphone,
        children: [
          { title: "Banners", url: "/admin/banner", icon: ImageIcon },
          { title: "PopUps", url: "/admin/popups", icon: Megaphone },
          { title: "Feedbacks", url: "/admin/feedbacks", icon: Star },
          { title: "Leads", url: "/admin/leads", icon: Mail },
          { title: "Links", url: "/admin/links", icon: Link2 },
          { title: "Páginas", url: "/admin/paginas", icon: FileText },
        ],
      },
    ],
  },
  {
    label: "FINANCEIRO",
    items: [
      { title: "Cashback", url: "/admin/comissoes", icon: DollarSign },
      { title: "Relatórios", url: "/admin/relatorios", icon: BarChart3 },
    ],
  },
  {
    label: "SISTEMA",
    items: [
      { title: "WhatsApp", url: "/admin/whatsapp", icon: MessageSquare },
      { title: "Ferramentas", url: "/admin/ferramentas", icon: Wrench },
      { title: "Agentes de IA", url: "/admin/agentes-ia", icon: Sparkles },
      { title: "Usuários", url: "/admin/usuarios", icon: UserCog },
      { title: "Configurações", url: "/admin/configuracoes", icon: Store },
      { title: "Design", url: "/admin/design", icon: Palette },
      { title: "Integrações", url: "/admin/integracoes", icon: Plug },
    ],
  },
];

const repSections: MenuSection[] = [
  {
    items: [
      { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
    ],
  },
  {
    label: "GESTÃO",
    items: [
      { title: "Meus Prescritores", url: "/admin/prescritores", icon: Stethoscope },
      { title: "Cashback", url: "/admin/comissoes", icon: DollarSign },
      { title: "Relatórios", url: "/admin/relatorios", icon: BarChart3 },
    ],
  },
];

function CollapsibleGroup({
  title,
  icon: Icon,
  children,
  collapsed,
}: {
  title: string;
  icon: React.ElementType;
  children: MenuItem[];
  collapsed: boolean;
}) {
  const location = useLocation();
  const isChildActive = children.some((c) => location.pathname.startsWith(c.url));
  const [open, setOpen] = useState(isChildActive);

  if (collapsed) {
    return (
      <>
        {children.map((item) => {
          const active = location.pathname.startsWith(item.url);
          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild isActive={active}>
                <NavLink
                  to={item.url}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sm"
                  activeClassName="!bg-sidebar-primary/15 !text-sidebar-primary border-l-2 !border-sidebar-primary"
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
        <span className="flex items-center gap-2.5">
          <Icon className="h-4 w-4 shrink-0" />
          <span>{title}</span>
        </span>
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 opacity-60" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-4 mt-0.5 space-y-0.5">
        {children.map((item) => {
          const active = location.pathname.startsWith(item.url);
          return (
            <NavLink
              key={item.title}
              to={item.url}
              className={cn(
                "flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] transition-colors",
                "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
              activeClassName="!bg-sidebar-primary/15 !text-sidebar-primary font-medium"
            >
              <ChevronRight className="h-3 w-3 opacity-40 shrink-0" />
              <span>{item.title}</span>
            </NavLink>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { isAdmin, isSuperAdmin, signOut, user } = useAuth();
  const { isSuperboss } = useTenant();
  const { data: settings } = useStoreSettings();
  const sections = isAdmin ? adminSections : repSections;

  const initials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : "AD";

  const storeName = settings?.store_name || "Painel";
  const storeInitials = storeName.substring(0, 2).toUpperCase();

  return (
    <Sidebar collapsible="icon">
      {/* Logo / Branding */}
      <SidebarHeader className="px-4 py-4 border-b border-sidebar-border">
        {!collapsed ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
                <span className="text-sidebar-primary-foreground font-bold text-xs">{storeInitials}</span>
              </div>
              <span className="text-sm font-semibold text-sidebar-accent-foreground tracking-tight truncate">
                {storeName}
              </span>
            </div>
            {isSuperboss && (
              <Link
                to="/superboss"
                className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-colors text-xs font-semibold"
              >
                <Crown className="h-3.5 w-3.5" />
                Super Boss
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <span className="text-sidebar-primary-foreground font-bold text-xs">{storeInitials}</span>
            </div>
            {isSuperboss && (
              <Link to="/superboss" className="h-6 w-6 rounded bg-amber-500/10 flex items-center justify-center text-amber-600 hover:bg-amber-500/20 transition-colors">
                <Crown className="h-3 w-3" />
              </Link>
            )}
          </div>
        )}
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="px-3 py-3 overflow-y-auto">
        {sections.map((section, sIdx) => (
          <div key={sIdx} className={cn(sIdx > 0 && "mt-4")}>
            {section.label && !collapsed && (
              <p className="px-3 mb-2 text-[10px] font-semibold tracking-[0.15em] text-sidebar-foreground/40 uppercase">
                {section.label}
              </p>
            )}
            {section.label && collapsed && (
              <div className="h-px bg-sidebar-border mx-2 mb-2" />
            )}

            <SidebarMenu className="space-y-0.5">
              {/* Direct items */}
              {section.items?.map((item) => {
                const active =
                  item.url === "/admin"
                    ? location.pathname === "/admin"
                    : location.pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active}>
                      <NavLink
                        to={item.url}
                        end={item.url === "/admin"}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                          "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                        activeClassName="!bg-sidebar-primary/15 !text-sidebar-primary font-medium border-l-2 !border-sidebar-primary"
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {/* Collapsible groups */}
              {section.groups?.map((group) => (
                <CollapsibleGroup
                  key={group.title}
                  title={group.title}
                  icon={group.icon}
                  children={group.children}
                  collapsed={collapsed}
                />
              ))}
            </SidebarMenu>
          </div>
        ))}
      </SidebarContent>

      {/* User footer */}
      <SidebarFooter className="px-3 py-3 border-t border-sidebar-border">
        {!collapsed ? (
          <div className="flex items-center gap-3 px-2">
            <Avatar className="h-9 w-9 border border-sidebar-border shrink-0">
              <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-accent-foreground truncate">
                {user?.email?.split("@")[0] || "Admin"}
              </p>
              <p className="text-[10px] text-sidebar-foreground/50 truncate">{user?.email}</p>
            </div>
            <button
              onClick={signOut}
              className="p-1.5 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center p-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
