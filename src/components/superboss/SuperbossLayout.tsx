import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Store, Puzzle, Copy, Database, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { to: "/superboss", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/superboss/lojas", label: "Lojas", icon: Store },
  { to: "/superboss/modulos", label: "Módulos", icon: Puzzle },
  { to: "/superboss/clonar", label: "Clonar", icon: Copy },
  { to: "/superboss/backups", label: "Backups", icon: Database },
];

export default function SuperbossLayout() {
  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-[hsl(245,60%,16%)] text-white flex flex-col">
        <div className="p-5 border-b border-white/10">
          <h1 className="text-lg font-bold tracking-tight">⚡ SUPERBOSS</h1>
          <p className="text-xs text-white/50 mt-1">Painel Multi-tenant</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-white/15 text-white"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                )
              }
            >
              <l.icon className="h-4 w-4" />
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10">
          <NavLink
            to="/admin"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Voltar ao Admin
          </NavLink>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
