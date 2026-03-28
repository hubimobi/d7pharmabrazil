import { ReactNode, useEffect, useState, useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { supabase } from "@/integrations/supabase/client";
import {
  Bell, X, ChevronRight, Sun, Moon, Palette, Search, Settings,
  User, LogOut, DollarSign, Download, LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAdminTheme, type AdminTheme } from "@/hooks/useAdminTheme";

interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

const routeTitleMap: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/vendas": "Vendas",
  "/admin/clientes": "Clientes",
  "/admin/produtos": "Produtos",
  "/admin/representantes": "Representantes",
  "/admin/prescritores": "Prescritores",
  "/admin/comissoes": "Cashback",
  "/admin/recuperacao": "Recuperação",
  "/admin/cupons": "Cupons",
  "/admin/relatorios": "Relatórios",
  "/admin/banner": "Banner",
  "/admin/popups": "PopUps & Barra",
  "/admin/leads": "Leads",
  "/admin/paginas": "Páginas",
  "/admin/configuracoes": "Configurações",
  "/admin/integracoes": "Integrações",
  "/admin/design": "Design",
  "/admin/agentes-ia": "Agentes de IA",
  "/admin/usuarios": "Usuários",
  "/admin/checkout": "Checkout",
  "/admin/links": "Links",
};

export function AdminLayout({ children }: { children: ReactNode }) {
  const { user, loading, isAdmin, isRepresentative, signOut } = useAuth();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const location = useLocation();
  const { theme, setTheme } = useAdminTheme();

  const themeOptions: { value: AdminTheme; label: string; icon: React.ReactNode }[] = [
    { value: "light", label: "Claro", icon: <Sun className="h-4 w-4" /> },
    { value: "dark", label: "Escuro", icon: <Moon className="h-4 w-4" /> },
    { value: "company", label: "Empresa", icon: <Palette className="h-4 w-4" /> },
  ];

  const pageTitle = useMemo(() => {
    return routeTitleMap[location.pathname] || "Painel";
  }, [location.pathname]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  }, []);

  const initials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : "AD";

  const userName = user?.email?.split("@")[0] || "Admin";

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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin && !isRepresentative) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-4 bg-background">
        <div>
          <h2 className="text-xl font-bold font-display mb-2">Acesso negado</h2>
          <p className="text-muted-foreground">Você não tem permissão para acessar esta área.</p>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.length;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Topbar */}
          <header className="h-[60px] flex items-center px-4 md:px-6 bg-card border-b border-border shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] justify-between sticky top-0 z-10">
            <div className="flex items-center gap-3 flex-1">
              <SidebarTrigger className="shrink-0" />

              {/* Breadcrumb */}
              <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground">
                <span>Painel</span>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-foreground font-medium">{pageTitle}</span>
              </div>
              <span className="sm:hidden text-sm font-semibold text-foreground">{pageTitle}</span>

              {/* Search */}
              <div className="hidden lg:flex items-center ml-4 flex-1 max-w-xs">
                <div className="relative w-full">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Pesquisar..."
                    className="pl-9 h-9 bg-muted/50 border-0 text-sm focus-visible:ring-1"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Greeting */}
              <span className="hidden xl:block text-sm text-muted-foreground mr-3">
                {greeting}, <span className="font-medium text-foreground">{userName}</span>
              </span>

              {/* Theme toggle */}
              <div className="hidden md:flex items-center border border-border rounded-full p-0.5 gap-0.5 mr-1">
                {themeOptions.map((opt) => (
                  <Button
                    key={opt.value}
                    variant={theme === opt.value ? "default" : "ghost"}
                    size="icon"
                    className="h-7 w-7 rounded-full"
                    onClick={() => setTheme(opt.value)}
                    title={opt.label}
                  >
                    {opt.icon}
                  </Button>
                ))}
              </div>

              {/* Notifications */}
              {isAdmin && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full">
                      <Bell className="h-4 w-4" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[10px] rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center font-medium">
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

              {/* Theme Customizer Drawer */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full md:hidden">
                    <Settings className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72">
                  <SheetHeader>
                    <SheetTitle>Personalizar Tema</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-3">
                    {themeOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setTheme(opt.value)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                          theme === opt.value
                            ? "border-primary bg-primary/5 text-foreground"
                            : "border-border hover:bg-muted/50 text-muted-foreground"
                        }`}
                      >
                        {opt.icon}
                        <span className="text-sm font-medium">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>

              {/* User dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full ml-1">
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
                  <DropdownMenuItem className="gap-2 cursor-pointer">
                    <Settings className="h-4 w-4" /> Configurações
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 cursor-pointer">
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

          {/* Main content */}
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
