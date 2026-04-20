import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { History, Loader2, Search, Eye } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AuditEntry {
  id: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  record_label: string | null;
  old_data: any;
  new_data: any;
  created_at: string;
}

const TABLE_LABELS: Record<string, string> = {
  products: "Produtos",
  product_combos: "Combos",
  hero_banners: "Banners",
  promo_banners: "Banners Promocionais",
  coupons: "Cupons",
  static_pages: "Páginas",
};

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  INSERT: { label: "Criou", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  UPDATE: { label: "Atualizou", color: "bg-blue-100 text-blue-700 border-blue-200" },
  DELETE: { label: "Excluiu", color: "bg-red-100 text-red-700 border-red-200" },
};

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tableFilter, setTableFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [selected, setSelected] = useState<AuditEntry | null>(null);

  useEffect(() => {
    load();
  }, [tableFilter, actionFilter]);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("audit_log" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (tableFilter !== "all") q = q.eq("table_name", tableFilter);
    if (actionFilter !== "all") q = q.eq("action", actionFilter);
    const { data, error } = await q;
    if (!error && data) setEntries(data as any);
    setLoading(false);
  };

  const filtered = entries.filter((e) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (e.user_name || "").toLowerCase().includes(s) ||
      (e.user_email || "").toLowerCase().includes(s) ||
      (e.record_label || "").toLowerCase().includes(s) ||
      (e.record_id || "").toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <History className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Histórico de Atividades</h1>
          <p className="text-sm text-muted-foreground">
            Registro de criações, edições e exclusões feitas no painel.
          </p>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por usuário ou registro..."
              className="pl-9"
            />
          </div>
          <Select value={tableFilter} onValueChange={setTableFilter}>
            <SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as áreas</SelectItem>
              {Object.entries(TABLE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-full md:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as ações</SelectItem>
              <SelectItem value="INSERT">Criação</SelectItem>
              <SelectItem value="UPDATE">Edição</SelectItem>
              <SelectItem value="DELETE">Exclusão</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={load}>Atualizar</Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            Nenhum registro encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Data</th>
                  <th className="px-4 py-3 text-left">Usuário</th>
                  <th className="px-4 py-3 text-left">Ação</th>
                  <th className="px-4 py-3 text-left">Área</th>
                  <th className="px-4 py-3 text-left">Registro</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => {
                  const a = ACTION_LABELS[e.action] ?? { label: e.action, color: "" };
                  return (
                    <tr key={e.id} className="border-t hover:bg-muted/20">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {format(new Date(e.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{e.user_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{e.user_email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={a.color}>{a.label}</Badge>
                      </td>
                      <td className="px-4 py-3">{TABLE_LABELS[e.table_name] || e.table_name}</td>
                      <td className="px-4 py-3 max-w-xs truncate">{e.record_label || e.record_id || "—"}</td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="ghost" onClick={() => setSelected(e)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Registro</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Quem:</span> {selected.user_name || selected.user_email}</div>
                <div><span className="text-muted-foreground">Quando:</span> {format(new Date(selected.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</div>
                <div><span className="text-muted-foreground">Ação:</span> {ACTION_LABELS[selected.action]?.label}</div>
                <div><span className="text-muted-foreground">Área:</span> {TABLE_LABELS[selected.table_name] || selected.table_name}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Registro:</span> {selected.record_label || selected.record_id}</div>
              </div>
              {selected.old_data && (
                <div>
                  <div className="font-medium mb-1">Dados anteriores</div>
                  <pre className="bg-muted/50 p-3 rounded-md text-xs overflow-x-auto max-h-60">
                    {JSON.stringify(selected.old_data, null, 2)}
                  </pre>
                </div>
              )}
              {selected.new_data && (
                <div>
                  <div className="font-medium mb-1">Dados novos</div>
                  <pre className="bg-muted/50 p-3 rounded-md text-xs overflow-x-auto max-h-60">
                    {JSON.stringify(selected.new_data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
