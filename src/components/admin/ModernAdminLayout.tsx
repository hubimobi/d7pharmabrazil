import { ReactNode, useEffect, useState, useMemo } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, List, Grid3X3, Send, CircleDollarSign, TrendingUp,
  Cpu, Users, Settings, Calendar, ArrowRight, ChevronRight,
  Bell, Sun, Moon, Globe, Search, LogOut, X, LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminTheme } from "@/hooks/useAdminTheme";
import TrialExpiredOverlay from "./TrialExpiredOverlay";
import TrialBadge from "./TrialBadge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

const NAV_SECTIONS = [
  {
    label: null,
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/admin" },
    ],
  },
  {
    label: "VENDAS",
    items: [
      { label: "Vendas", icon: List, path: "/admin/vendas", hasChevron: true },
    ],
  },
  {
    label: "CATÁLOGO",
    items: [
      { label: "Catálogo", icon: Grid3X3, path: "/admin/produtos", hasChevron: true },
    ],
  },
  {
    label: "MARKETING",
    items: [
      { label: "Marketing", icon: Send, path: "/admin/banner", hasChevron: true },
    ],
  },
  {
    label: "FINANCEIRO",
    items: [
      { label: "Cashback", icon: CircleDollarSign, path: "/admin/comissoes" },
      { label: "Relatórios", icon: TrendingUp, path: "/admin/relatorios" },
    ],
  },
  {
    label: "SISTEMA",
    items: [
      { label: "Agentes de IA", icon: Cpu, path: "/admin/agentes-ia" },
      { label: "Usuários", icon: Users, path: "/admin/usuarios" },
      { label: "Configurações", icon: Settings, path: "/admin/configuracoes" },
      { label: "Design", icon: Calendar, path: "/admin/design" },
      { label: "Integrações", icon: ArrowRight, path: "/admin/integracoes" },
    ],
  },
];

const routeTitleMap: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/vendas": "Vendas",
  "/admin/clientes": "Clientes",
  "/admin/produtos": "Catálogo",
  "/admin/representantes": "Representantes",
  "/admin/prescritores": "Prescritores",
  "/admin/comissoes": "Cashback",
  "/admin/recuperacao": "Recuperação",
  "/admin/cupons": "Cupons",
  "/admin/relatorios": "Relatórios",
  "/admin/banner": "Marketing",
  "/admin/popups": "PopUps",
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

export function ModernAdminLayout({ children }: { children: ReactNode }) {
  const { user, loading, isAdmin, isRepresentative, signOut } = useAuth();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useAdminTheme();

  const initials = user?.email ? user.email.substring(0, 2).toUpperCase() : "AD";
  const userName = user?.email?.split("@")[0] || "Admin";
  const userEmail = user?.email || "";
  const truncatedEmail = userEmail.length > 24 ? userEmail.substring(0, 24) + "..." : userEmail;

  const pageTitle = useMemo(() => routeTitleMap[location.pathname] || "Painel", [location.pathname]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  }, []);

  const isActivePath = (path: string) => {
    if (path === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(path);
  };

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
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#eef0f8" }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: "#2563eb" }} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin && !isRepresentative) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-4" style={{ background: "#eef0f8" }}>
        <div>
          <h2 className="text-xl font-bold mb-2" style={{ color: "#111827" }}>Acesso negado</h2>
          <p style={{ color: "#9ca3af" }}>Você não tem permissão para acessar esta área.</p>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.length;

  const glassStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.82)",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
    border: "1px solid rgba(0,0,0,0.07)",
  };

  return (
    <div className="admin-panel min-h-screen flex" style={{ background: "#eef0f8", fontFamily: "'Inter', system-ui, sans-serif", WebkitFontSmoothing: "antialiased" }}>
      {/* ===== SIDEBAR ===== */}
      <aside
        className="hidden md:flex flex-col fixed inset-y-0 left-0 z-30"
        style={{ ...glassStyle, width: 220, borderRadius: 0, borderRight: "1px solid rgba(0,0,0,0.07)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5" style={{ padding: "18px 20px", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
          <div
            className="flex items-center justify-center font-bold text-white"
            style={{
              width: 32, height: 32, borderRadius: 9,
              background: "#2563eb",
              boxShadow: "0 2px 8px rgba(37,99,235,0.35)",
              fontSize: 12,
            }}
          >
            D7
          </div>
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.02em", color: "#111827" }}>
            D7 Pharma
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto" style={{ padding: "14px 12px" }}>
          {NAV_SECTIONS.map((section, si) => (
            <div key={si}>
              {section.label && (
                <div style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: "0.08em",
                  textTransform: "uppercase" as const, color: "#9ca3af",
                  padding: "14px 8px 6px",
                }}>
                  {section.label}
                </div>
              )}
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActivePath(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className="w-full flex items-center gap-2.5 transition-all"
                    style={{
                      padding: "9px 10px",
                      borderRadius: 12,
                      fontSize: 13.5,
                      color: active ? "#2563eb" : "#4b5563",
                      background: active ? "rgba(37,99,235,0.1)" : "transparent",
                      fontWeight: active ? 500 : 400,
                    }}
                    onMouseEnter={(e) => {
                      if (!active) e.currentTarget.style.background = "rgba(0,0,0,0.04)";
                    }}
                    onMouseLeave={(e) => {
                      if (!active) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <Icon style={{ width: 16, height: 16, opacity: active ? 1 : 0.75 }} />
                    <span className="flex-1 text-left">{item.label}</span>
                    {(item as any).hasChevron && (
                      <ChevronRight style={{ width: 14, height: 14, opacity: 0.4 }} />
                    )}
                    {active && item.path !== "/admin" && (
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#2563eb" }} />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="flex items-center gap-2.5" style={{ borderTop: "1px solid rgba(0,0,0,0.07)", padding: "14px 16px" }}>
          <div
            className="flex items-center justify-center text-white shrink-0"
            style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "#2563eb", fontSize: 11, fontWeight: 700,
            }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "#111827" }} className="truncate">{userName}</div>
            <div style={{ fontSize: 11, color: "#9ca3af" }} className="truncate">{truncatedEmail}</div>
          </div>
          <button
            onClick={signOut}
            className="shrink-0 flex items-center justify-center transition-colors"
            style={{ width: 28, height: 28, borderRadius: "50%", color: "#9ca3af" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,0,0,0.05)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            title="Sair"
          >
            <LogOut style={{ width: 15, height: 15 }} />
          </button>
        </div>
      </aside>

      {/* ===== MAIN AREA ===== */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-[220px]">
        {/* ===== TOPBAR ===== */}
        <header
          className="sticky top-0 z-20 flex items-center"
          style={{
            ...glassStyle,
            height: 58,
            padding: "0 28px",
            boxShadow: "0 2px 16px rgba(0,0,0,0.04)",
            borderTop: "none",
            borderLeft: "none",
            borderRight: "none",
          }}
        >
          {/* Left: Breadcrumb */}
          <div className="flex items-center gap-2 shrink-0">
            <LayoutGrid style={{ width: 14, height: 14, color: "#4b5563" }} />
            <span style={{ fontSize: 13, color: "#4b5563" }}>Painel</span>
            <span style={{ fontSize: 13, color: "#9ca3af" }}>›</span>
            <span style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>{pageTitle}</span>
          </div>

          {/* Center: Search */}
          <div className="flex-1 flex justify-center mx-4">
            <div className="relative w-full" style={{ maxWidth: 380 }}>
              <Search
                className="absolute top-1/2 -translate-y-1/2"
                style={{ left: 11, width: 14, height: 14, color: "#9ca3af" }}
              />
              <input
                type="text"
                placeholder="Pesquisar..."
                className="w-full outline-none transition-all"
                style={{
                  height: 36,
                  borderRadius: 10,
                  paddingLeft: 34,
                  paddingRight: 12,
                  fontSize: 13,
                  color: "#111827",
                  background: searchFocused ? "rgba(255,255,255,0.9)" : "rgba(240,241,248,0.7)",
                  border: `1px solid ${searchFocused ? "#93c5fd" : "rgba(0,0,0,0.07)"}`,
                  boxShadow: searchFocused ? "0 0 0 3px rgba(37,99,235,0.08)" : "none",
                }}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="hidden xl:block mr-2" style={{ fontSize: 13 }}>
              <span style={{ color: "#4b5563" }}>{greeting}, </span>
              <span style={{ fontWeight: 600, color: "#111827" }}>{userName}</span>
            </span>

            {/* Theme toggles */}
            {[
              { icon: Sun, action: () => setTheme("light"), active: theme === "light" },
              { icon: Moon, action: () => setTheme("dark"), active: theme === "dark" },
              { icon: Globe, action: () => {}, active: false },
            ].map((btn, i) => {
              const BtnIcon = btn.icon;
              return (
                <button
                  key={i}
                  onClick={btn.action}
                  className="flex items-center justify-center transition-all"
                  style={{
                    width: 36, height: 36, borderRadius: "50%",
                    border: "1px solid rgba(0,0,0,0.07)",
                    background: btn.active ? "rgba(37,99,235,0.1)" : "rgba(240,241,248,0.7)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.9)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = btn.active ? "rgba(37,99,235,0.1)" : "rgba(240,241,248,0.7)"; }}
                >
                  <BtnIcon style={{ width: 16, height: 16, color: btn.active ? "#2563eb" : "#4b5563" }} />
                </button>
              );
            })}

            {/* Notifications */}
            {isAdmin && (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="relative flex items-center justify-center transition-all"
                    style={{
                      width: 36, height: 36, borderRadius: "50%",
                      border: "1px solid rgba(0,0,0,0.07)",
                      background: "rgba(240,241,248,0.7)",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.9)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(240,241,248,0.7)"; }}
                  >
                    <Bell style={{ width: 16, height: 16, color: "#4b5563" }} />
                    {unreadCount > 0 && (
                      <span
                        className="absolute flex items-center justify-center text-white font-bold"
                        style={{
                          top: -1, right: -1, width: 7, height: 7,
                          borderRadius: "50%", background: "#e85c4a",
                          border: "1.5px solid rgba(255,255,255,0.9)",
                        }}
                      />
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" style={{ borderRadius: 18 }} align="end">
                  <div className="p-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>Notificações</span>
                    {unreadCount > 0 && (
                      <button
                        style={{ fontSize: 12, color: "#2563eb" }}
                        onClick={() => notifications.forEach((n) => markAsRead(n.id))}
                      >
                        Marcar tudo como lido
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center" style={{ fontSize: 13, color: "#9ca3af" }}>
                      Nenhuma notificação
                    </div>
                  ) : (
                    <div className="max-h-72 overflow-auto">
                      {notifications.map((n) => (
                        <div key={n.id} className="p-3 flex gap-3 transition-colors hover:bg-[rgba(0,0,0,0.02)]" style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                          <div className="shrink-0 flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(37,99,235,0.1)" }}>
                            <Bell style={{ width: 14, height: 14, color: "#2563eb" }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{n.title}</p>
                            <p className="line-clamp-2" style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{n.message}</p>
                            <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 4 }}>
                              {new Date(n.created_at).toLocaleString("pt-BR")}
                            </p>
                          </div>
                          <button
                            onClick={() => markAsRead(n.id)}
                            className="shrink-0 flex items-center justify-center transition-colors"
                            style={{ width: 24, height: 24, borderRadius: "50%", color: "#9ca3af" }}
                          >
                            <X style={{ width: 12, height: 12 }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            )}

            {/* Avatar */}
            <button
              className="flex items-center justify-center text-white shrink-0"
              style={{
                width: 34, height: 34, borderRadius: "50%",
                background: "#2563eb", fontSize: 12, fontWeight: 700,
                border: "2px solid rgba(255,255,255,0.8)",
                boxShadow: "0 2px 8px rgba(37,99,235,0.25)",
                marginLeft: 4,
              }}
            >
              {initials}
            </button>
          </div>
        </header>

        {/* ===== MAIN CONTENT ===== */}
        <main
          className="flex-1 overflow-auto"
          style={{ padding: "28px 32px 40px" }}
        >
          {children}
        </main>
      </div>

      {/* ===== MOBILE BOTTOM NAV ===== */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around z-30"
        style={{ ...glassStyle, height: 56, borderTop: "1px solid rgba(0,0,0,0.07)" }}
      >
        {[
          { label: "Home", icon: LayoutDashboard, path: "/admin" },
          { label: "Vendas", icon: List, path: "/admin/vendas" },
          { label: "Catálogo", icon: Grid3X3, path: "/admin/produtos" },
          { label: "Config", icon: Settings, path: "/admin/configuracoes" },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = isActivePath(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center gap-0.5"
              style={{ color: active ? "#2563eb" : "#9ca3af", fontSize: 10 }}
            >
              <Icon style={{ width: 20, height: 20 }} />
              <span style={{ fontWeight: active ? 600 : 400 }}>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
