import { ReactNode, useEffect, useState, useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { supabase } from "@/integrations/supabase/client";
import { Bell, X, ChevronRight, Sun, Moon, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
};

export function AdminLayout({ children }: { children: ReactNode }) {
  const { user, loading, isAdmin, isRepresentative } = useAuth();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const location = useLocation();
  const { theme, setTheme } = useAdminTheme();

  const themeOptions: { value: AdminTheme; label: string; icon: React.ReactNode }[] = [
    { value: "dark", label: "Escuro", icon: <Moon className="h-4 w-4" /> },
    { value: "light", label: "Claro", icon: <Sun className="h-4 w-4" /> },
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin && !isRepresentative) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-4">
        <div>
          <h2 className="text-xl font-bold mb-2">Acesso negado</h2>
          <p className="text-muted-foreground">Você não tem permissão para acessar esta área.</p>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.length;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center shadow-sm px-4 bg-background justify-between sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground">
                <span>D7 Pharma</span>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-foreground font-medium">{pageTitle}</span>
              </div>
              <span className="sm:hidden text-sm font-semibold text-foreground">{pageTitle}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="hidden md:block text-sm text-muted-foreground mr-2">
                {greeting}{user?.email ? `, ${user.email.split("@")[0]}` : ""}
              </span>

              <div className="flex items-center border border-border rounded-lg p-0.5 gap-0.5">
                {themeOptions.map((opt) => (
                  <Button
                    key={opt.value}
                    variant={theme === opt.value ? "default" : "ghost"}
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setTheme(opt.value)}
                    title={opt.label}
                  >
                    {opt.icon}
                  </Button>
                ))}
              </div>

              {isAdmin && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative h-9 w-9">
                      <Bell className="h-4 w-4" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
                          {unreadCount}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="end">
                    <div className="p-3 border-b font-semibold text-sm">Notificações</div>
                    {notifications.length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground text-center">
                        Nenhuma notificação
                      </div>
                    ) : (
                      <div className="max-h-64 overflow-auto">
                        {notifications.map((n) => (
                          <div key={n.id} className="p-3 border-b last:border-0 flex gap-2">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{n.title}</p>
                              <p className="text-xs text-muted-foreground mt-1">{n.message}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(n.created_at).toLocaleString("pt-BR")}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0"
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
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto bg-muted/30">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
