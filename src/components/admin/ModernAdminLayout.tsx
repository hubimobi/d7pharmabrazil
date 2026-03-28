import { ReactNode, useEffect, useState, useMemo } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, Share2, Upload, Star, Plus, Phone, Database, CalendarDays,
  Send, Bell, Moon, Sun, Search, X, Mail, LogOut, User, Settings,
  LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { useAdminTheme, type AdminTheme } from "@/hooks/useAdminTheme";
import { cn } from "@/lib/utils";

interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

/** Navigation tabs for the CRM-style topbar */
const NAV_TABS = [
  { label: "Dashboard", path: "/admin" },
  { label: "Vendas", path: "/admin/vendas" },
  { label: "Catálogo", path: "/admin/produtos" },
  { label: "Marketing", path: "/admin/banner" },
  { label: "Financeiro", path: "/admin/comissoes" },
  { label: "Configurações", path: "/admin/configuracoes" },
  { label: "Relatórios", path: "/admin/relatorios" },
];

/** Quick-action sidebar icons */
const SIDEBAR_ICONS = [
  { icon: ArrowLeft, label: "Voltar à loja", action: "navigate", path: "/" },
  { icon: Share2, label: "Links", action: "navigate", path: "/admin/links" },
  { icon: Upload, label: "Integrações", action: "navigate", path: "/admin/integracoes" },
  { icon: Star, label: "Produtos", action: "navigate", path: "/admin/produtos" },
  { icon: Plus, label: "Novo Pedido", action: "navigate", path: "/admin/vendas" },
  { icon: Phone, label: "Recuperação", action: "navigate", path: "/admin/recuperacao" },
  { icon: Database, label: "Leads", action: "navigate", path: "/admin/leads" },
  { icon: CalendarDays, label: "Páginas", action: "navigate", path: "/admin/paginas" },
  { icon: Send, label: "PopUps", action: "navigate", path: "/admin/popups" },
  { icon: Bell, label: "Agentes IA", action: "navigate", path: "/admin/agentes-ia" },
];

export function ModernAdminLayout({ children }: { children: ReactNode }) {
  const { user, loading, isAdmin, isRepresentative, signOut } = useAuth();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useAdminTheme();

  const initials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : "AD";
  const userName = user?.email?.split("@")[0] || "Admin";

  /** Determine which tab is active based on current path */
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
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from("admin_notifications")
        .select("*")
        .eq("read", false)
        .order("created_at", { ascending: false })
        .limit(10);
      if (data) setNotifications(data as AdminNotification[]);
    };
    fetchNotifications();
  }, [isAdmin]);

  const markAsRead = async (id: string) => {
    await supabase.from("admin_notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f5f7]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin && !isRepresentative) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-4 bg-[#f4f5f7]">
        <div>
          <h2 className="text-xl font-bold mb-2">Acesso negado</h2>
          <p className="text-muted-foreground">Você não tem permissão para acessar esta área.</p>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.length;

  return (
    <div className="min-h-screen flex bg-[#f4f5f7]">
      {/* ===== ICON-ONLY SIDEBAR ===== */}
      <aside className="hidden md:flex flex-col w-14 bg-card border-r border-border fixed inset-y-0 left-0 z-20">
        {/* Top icons */}
        <div className="flex-1 flex flex-col items-center py-3 gap-1 overflow-y-auto">
          {SIDEBAR_ICONS.map((item, i) => {
            const Icon = item.icon;
            const isActive = item.path ? location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path)) : false;
            return (
              <button
                key={i}
                onClick={() => item.path && navigate(item.path)}
                title={item.label}
                className={cn(
                  "h-9 w-9 rounded-lg flex items-center justify-center transition-colors",
                  isActive
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>

        {/* Bottom toggle icons */}
        <div className="flex flex-col items-center gap-1 pb-3 border-t border-border pt-3">
          <button
            onClick={() => setTheme("dark")}
            title="Modo escuro"
            className={cn(
              "h-9 w-9 rounded-lg flex items-center justify-center transition-colors",
              theme === "dark" ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"
            )}
          >
            <Moon className="h-4 w-4" />
          </button>
          <button
            onClick={() => setTheme("light")}
            title="Modo claro"
            className={cn(
              "h-9 w-9 rounded-lg flex items-center justify-center transition-colors",
              theme === "light" ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"
            )}
          >
            <Sun className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* ===== MAIN AREA (offset by sidebar width) ===== */}
      <div className="flex-1 flex flex-col md:ml-14 min-w-0">
        {/* ===== TOPBAR ===== */}
        <header className="h-[60px] flex items-center px-4 md:px-6 bg-card border-b border-border shadow-[0_1px_3px_0_rgba(0,0,0,0.04)] sticky top-0 z-10">
          {/* Left: Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-[10px]">D7</span>
            </div>
            <span className="text-sm hidden sm:inline">
              <span className="text-muted-foreground">d7</span>
              <span className="font-bold text-foreground">pharma</span>
            </span>
          </div>

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
                      "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                      isActive
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Search */}
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground">
              <Search className="h-4 w-4" />
            </Button>

            {/* Compose/Mail */}
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground relative">
              <Mail className="h-4 w-4" />
            </Button>

            {/* Notifications */}
            {isAdmin && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground relative">
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-[#E8593C] text-white text-[9px] rounded-full h-4 min-w-[16px] px-0.5 flex items-center justify-center font-bold">
                        {unreadCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0 rounded-xl" align="end">
                  <div className="p-3 border-b flex items-center justify-between">
                    <span className="font-semibold text-sm">Notificações</span>
                    {unreadCount > 0 && (
                      <button
                        className="text-xs text-primary hover:underline"
                        onClick={() => notifications.forEach((n) => markAsRead(n.id))}
                      >
                        Marcar tudo como lido
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="p-6 text-sm text-muted-foreground text-center">
                      Nenhuma notificação
                    </div>
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
                            <p className="text-[10px] text-muted-foreground/60 mt-1">
                              {new Date(n.created_at).toLocaleString("pt-BR")}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 rounded-full"
                            onClick={() => markAsRead(n.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            )}

            {/* User avatar dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full ml-1">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex items-center gap-3 py-1">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{userName}</p>
                      <p className="text-xs text-muted-foreground">{isAdmin ? "Administrador" : "Representante"}</p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 cursor-pointer">
                  <User className="h-4 w-4" /> Perfil
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => navigate("/admin/configuracoes")}>
                  <Settings className="h-4 w-4" /> Configurações
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

        {/* ===== MAIN CONTENT ===== */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>

      {/* ===== MOBILE BOTTOM NAV ===== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-card border-t border-border flex items-center justify-around z-20">
        {NAV_TABS.slice(0, 5).map((tab) => {
          const isActive = activeTab === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                "flex flex-col items-center gap-0.5 text-[10px] transition-colors px-2",
                isActive ? "text-primary font-semibold" : "text-muted-foreground"
              )}
            >
              <span className={cn(
                "text-xs font-medium",
                isActive && "bg-foreground text-background px-2 py-0.5 rounded-full"
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
