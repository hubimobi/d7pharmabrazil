import { ReactNode, useEffect, useState, useMemo } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Users, Stethoscope, BarChart3, LogOut, Package,
  DollarSign, Store, Plug, ShoppingCart, Tag, ImageIcon, Megaphone,
  ShoppingBag, Contact, Mail, FileText, Palette, Settings2, Sparkles,
  UserCog, Link2, ChevronDown, ChevronRight, Bell, Search, X, Moon, Sun,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAdminTheme } from "@/hooks/useAdminTheme";
import { cn } from "@/lib/utils";

/* ─── Types ─── */
interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

interface MenuItem {
  title: string;
  url: string;
  icon: React.ElementType;
}

interface MenuGroup {
  title: string;
  icon: React.ElementType;
  children: MenuItem[];
}

interface MenuSection {
  label?: string;
  items?: MenuItem[];
  groups?: MenuGroup[];
}

/* ─── Navigation data ─── */
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
      { title: "Agentes de IA", url: "/admin/agentes-ia", icon: Sparkles },
      { title: "Usuários", url: "/admin/usuarios", icon: UserCog },
      { title: "Configurações", url: "/admin/configuracoes", icon: Store },
      { title: "Design", url: "/admin/design", icon: Palette },
      { title: "Integrações", url: "/admin/integracoes", icon: Plug },
    ],
  },
];

const repSections: MenuSection[] = [
  { items: [{ title: "Dashboard", url: "/admin", icon: LayoutDashboard }] },
  {
    label: "GESTÃO",
    items: [
      { title: "Meus Prescritores", url: "/admin/prescritores", icon: Stethoscope },
      { title: "Cashback", url: "/admin/comissoes", icon: DollarSign },
      { title: "Relatórios", url: "/admin/relatorios", icon: BarChart3 },
    ],
  },
];

const NAV_TABS = [
  { label: "Dashboard", path: "/admin" },
  { label: "Vendas", path: "/admin/vendas" },
  { label: "Catálogo", path: "/admin/produtos" },
  { label: "Marketing", path: "/admin/banner" },
  { label: "Financeiro", path: "/admin/comissoes" },
  { label: "Configurações", path: "/admin/configuracoes" },
  { label: "Relatórios", path: "/admin/relatorios" },
];

/* ─── Collapsible sidebar group ─── */
function SidebarGroup({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: MenuItem[] }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isChildActive = children.some((c) => location.pathname.startsWith(c.url));
  const [open, setOpen] = useState(isChildActive);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm text-[#c8cdd5] hover:bg-white/[0.06] hover:text-white transition-colors">
        <span className="flex items-center gap-2.5">
          <Icon className="h-4 w-4 shrink-0 opacity-70" />
          <span>{title}</span>
        </span>
        {open ? <ChevronDown className="h-3.5 w-3.5 opacity-50" /> : <ChevronRight className="h-3.5 w-3.5 opacity-50" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-4 mt-0.5 space-y-0.5">
        {children.map((item) => {
          const active = location.pathname === item.url || (item.url !== "/admin" && location.pathname.startsWith(item.url));
          return (
            <button
              key={item.title}
              onClick={() => navigate(item.url)}
              className={cn(
                "flex items-center gap-2.5 w-full px-3 py-1.5 rounded-lg text-[13px] transition-colors",
                active
                  ? "bg-white/[0.12] text-white font-medium"
                  : "text-[#8b95a5] hover:bg-white/[0.06] hover:text-[#c8cdd5]"
              )}
            >
              <ChevronRight className="h-3 w-3 opacity-40 shrink-0" />
              <span>{item.title}</span>
            </button>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}

/* ─── Main layout ─── */
export function ModernAdminLayout({ children }: { children: ReactNode }) {
  const { user, loading, isAdmin, isRepresentative, signOut } = useAuth();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useAdminTheme();

  const sections = isAdmin ? adminSections : repSections;

  const initials = user?.email ? user.email.substring(0, 2).toUpperCase() : "AD";
  const userName = user?.email?.split("@")[0] || "Admin";

  const activeTab = useMemo(() => {
    if (location.pathname === "/admin") return "/admin";
    const match = NAV_TABS.slice(1).find((tab) => location.pathname.startsWith(tab.path));
    if (!match) {
      if (["/admin/clientes", "/admin/recuperacao", "/admin/cupons", "/admin/checkout"].some(p => location.pathname.startsWith(p))) return "/admin/vendas";
      if (["/admin/prescritores", "/admin/representantes"].some(p => location.pathname.startsWith(p))) return "/admin/produtos";
      if (["/admin/popups", "/admin/leads", "/admin/links", "/admin/paginas"].some(p => location.pathname.startsWith(p))) return "/admin/banner";
      if (["/admin/design", "/admin/integracoes", "/admin/usuarios", "/admin/agentes-ia"].some(p => location.pathname.startsWith(p))) return "/admin/configuracoes";
    }
    return match?.path || "/admin";
  }, [location.pathname]);

  useEffect(() => {
    if (!isAdmin) return;
    supabase
      .from("admin_notifications")
      .select("*")
      .eq("read", false)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => { if (data) setNotifications(data as AdminNotification[]); });
  }, [isAdmin]);

  const markAsRead = async (id: string) => {
    await supabase.from("admin_notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f2f5]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin && !isRepresentative) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-4 bg-[#f0f2f5]">
        <div>
          <h2 className="text-xl font-bold mb-2">Acesso negado</h2>
          <p className="text-muted-foreground">Você não tem permissão para acessar esta área.</p>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.length;

  return (
    <div className="min-h-screen flex bg-[#f0f2f5]">
      {/* ══════ SIDEBAR ══════ */}
      <aside
        className={cn(
          "hidden md:flex flex-col fixed inset-y-0 left-0 z-30 transition-all duration-300",
          sidebarOpen ? "w-[240px]" : "w-16"
        )}
        style={{ background: "linear-gradient(180deg, #0d1b2a 0%, #1b2838 100%)" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/[0.08]">
          <div className="h-8 w-8 rounded-lg bg-white/[0.12] flex items-center justify-center shrink-0 backdrop-blur-sm">
            <span className="text-white font-bold text-[10px]">D7</span>
          </div>
          {sidebarOpen && (
            <span className="text-sm">
              <span className="text-white/50">d7</span>
              <span className="font-bold text-white">pharma</span>
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto no-scrollbar space-y-1">
          {sections.map((section, sIdx) => (
            <div key={sIdx} className={cn(sIdx > 0 && "mt-3")}>
              {section.label && sidebarOpen && (
                <p className="px-3 mb-2 text-[10px] font-semibold tracking-[0.15em] text-white/25 uppercase">
                  {section.label}
                </p>
              )}
              {section.label && !sidebarOpen && (
                <div className="h-px bg-white/[0.08] mx-2 mb-2" />
              )}

              {/* Direct items */}
              {section.items?.map((item) => {
                const active = item.url === "/admin" ? location.pathname === "/admin" : location.pathname.startsWith(item.url);
                return (
                  <button
                    key={item.title}
                    onClick={() => navigate(item.url)}
                    className={cn(
                      "flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition-colors",
                      active
                        ? "bg-white/[0.12] text-white font-medium shadow-sm"
                        : "text-[#8b95a5] hover:bg-white/[0.06] hover:text-[#c8cdd5]"
                    )}
                    title={item.title}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {sidebarOpen && <span>{item.title}</span>}
                  </button>
                );
              })}

              {/* Groups */}
              {sidebarOpen && section.groups?.map((group) => (
                <SidebarGroup key={group.title} title={group.title} icon={group.icon} children={group.children} />
              ))}
              {!sidebarOpen && section.groups?.map((group) => (
                group.children.map((item) => {
                  const active = location.pathname.startsWith(item.url);
                  return (
                    <button
                      key={item.title}
                      onClick={() => navigate(item.url)}
                      title={item.title}
                      className={cn(
                        "flex items-center justify-center w-full p-2 rounded-lg transition-colors",
                        active ? "bg-white/[0.12] text-white" : "text-[#8b95a5] hover:bg-white/[0.06]"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                    </button>
                  );
                })
              ))}
            </div>
          ))}
        </nav>

        {/* Bottom controls */}
        <div className="px-2 py-3 border-t border-white/[0.08] space-y-1">
          <button
            onClick={() => navigate("/")}
            title="Voltar à loja"
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-[#8b95a5] hover:bg-white/[0.06] hover:text-[#c8cdd5] transition-colors"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            {sidebarOpen && <span>Voltar à loja</span>}
          </button>

          <div className="flex items-center justify-center gap-1 py-1">
            <button
              onClick={() => setTheme("dark")}
              className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                theme === "dark" ? "bg-white/[0.15] text-white" : "text-[#8b95a5] hover:bg-white/[0.06]"
              )}
            >
              <Moon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setTheme("light")}
              className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                theme === "light" ? "bg-white/[0.15] text-white" : "text-[#8b95a5] hover:bg-white/[0.06]"
              )}
            >
              <Sun className="h-4 w-4" />
            </button>
            {sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(false)}
                className="ml-auto h-8 w-8 rounded-lg flex items-center justify-center text-[#8b95a5] hover:bg-white/[0.06] transition-colors"
                title="Recolher menu"
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
              </button>
            )}
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-[#8b95a5] hover:bg-white/[0.06] transition-colors"
                title="Expandir menu"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* User */}
          {sidebarOpen && (
            <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-white/[0.04]">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-white/[0.12] text-white text-xs font-medium">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{userName}</p>
                <p className="text-[10px] text-white/40 truncate">{isAdmin ? "Admin" : "Representante"}</p>
              </div>
              <button onClick={signOut} className="p-1.5 rounded-md text-[#8b95a5] hover:text-white hover:bg-white/[0.06] transition-colors">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ══════ MAIN AREA ══════ */}
      <div className={cn("flex-1 flex flex-col min-w-0 transition-all duration-300", sidebarOpen ? "md:ml-[240px]" : "md:ml-16")}>
        {/* ── TOPBAR ── */}
        <header className="h-[56px] flex items-center px-4 md:px-6 bg-white/80 backdrop-blur-xl border-b border-black/[0.06] shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] sticky top-0 z-10">
          {/* Center: Navigation tabs */}
          <nav className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar">
              {NAV_TABS.map((tab) => {
                const isActive = activeTab === tab.path;
                return (
                  <button
                    key={tab.path}
                    onClick={() => navigate(tab.path)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                      isActive
                        ? "bg-[#1a1a2e] text-white shadow-sm"
                        : "text-[#6b7280] hover:text-[#1a1a2e] hover:bg-black/[0.04]"
                    )}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-[#6b7280] hover:text-[#1a1a2e] hover:bg-black/[0.04]">
              <Search className="h-4 w-4" />
            </Button>

            {isAdmin && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-[#6b7280] hover:text-[#1a1a2e] hover:bg-black/[0.04] relative">
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-[#E8593C] text-white text-[9px] rounded-full h-4 min-w-[16px] px-0.5 flex items-center justify-center font-bold">
                        {unreadCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0 rounded-xl border-black/[0.08] shadow-xl" align="end">
                  <div className="p-3 border-b flex items-center justify-between">
                    <span className="font-semibold text-sm">Notificações</span>
                    {unreadCount > 0 && (
                      <button className="text-xs text-primary hover:underline" onClick={() => notifications.forEach((n) => markAsRead(n.id))}>
                        Marcar tudo como lido
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="p-6 text-sm text-muted-foreground text-center">Nenhuma notificação</div>
                  ) : (
                    <div className="max-h-72 overflow-auto">
                      {notifications.map((n) => (
                        <div key={n.id} className="p-3 border-b last:border-0 flex gap-3 hover:bg-muted/50 transition-colors">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            <Bell className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-tight">{n.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                            <p className="text-[10px] text-muted-foreground/60 mt-1">{new Date(n.created_at).toLocaleString("pt-BR")}</p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 rounded-full" onClick={() => markAsRead(n.id)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full ml-1">
                  <Avatar className="h-8 w-8 ring-2 ring-black/[0.06]">
                    <AvatarFallback className="bg-[#1a1a2e] text-white text-xs font-medium">{initials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex items-center gap-3 py-1">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-[#1a1a2e] text-white text-sm font-medium">{initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{userName}</p>
                      <p className="text-xs text-muted-foreground">{isAdmin ? "Administrador" : "Representante"}</p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => navigate("/admin/configuracoes")}>
                  <Settings2 className="h-4 w-4" /> Configurações
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => navigate("/admin")}>
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 cursor-pointer text-destructive" onClick={signOut}>
                  <LogOut className="h-4 w-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* ── CONTENT ── */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
      </div>

      {/* ══════ MOBILE BOTTOM NAV ══════ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-white/90 backdrop-blur-xl border-t border-black/[0.06] flex items-center justify-around z-20">
        {NAV_TABS.slice(0, 5).map((tab) => {
          const isActive = activeTab === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                "flex flex-col items-center gap-0.5 text-[10px] transition-colors px-2",
                isActive ? "text-[#1a1a2e] font-semibold" : "text-[#6b7280]"
              )}
            >
              <span className={cn(
                "text-xs font-medium",
                isActive && "bg-[#1a1a2e] text-white px-2 py-0.5 rounded-full"
              )}>
                {tab.label.slice(0, 6)}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
