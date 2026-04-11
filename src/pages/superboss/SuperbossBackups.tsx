import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import TenantSelector from "@/components/superboss/TenantSelector";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";
import { Download, RotateCcw, Eye, Loader2 } from "lucide-react";

const SUPPORTED_TABLES = [
  "store_settings", "products", "hero_banners", "promo_banners",
  "static_pages", "coupons", "product_combos", "ai_agents",
  "ai_system_prompts", "ai_llm_config", "manufacturers",
  "product_groups", "product_faqs", "product_testimonials",
  "campaign_config", "ai_knowledge_bases", "ai_kb_items",
  "customer_tags", "repurchase_goals",
];

interface Backup {
  id: string;
  table_name: string;
  backup_type: string;
  created_at: string;
  notes: string | null;
  data: Record<string, unknown>;
}

export default function SuperbossBackups() {
  const { tenantId } = useTenant();
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTable, setSelectedTable] = useState("");
  const [notes, setNotes] = useState("");
  const [backingUp, setBackingUp] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const loadBackups = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data } = await supabase
      .from("tenant_config_backups")
      .select("id, table_name, backup_type, created_at, notes, data")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) setBackups(data as unknown as Backup[]);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { loadBackups(); }, [loadBackups]);

  // ── Backup Manual ──
  const handleBackupManual = async () => {
    if (!selectedTable) { toast.error("Selecione uma tabela"); return; }
    setBackingUp(true);
    try {
      const { data: rows, error } = await supabase
        .from(selectedTable as "products")
        .select("*")
        .eq("tenant_id" as "id", tenantId);

      if (error) { toast.error(error.message); return; }
      if (!rows?.length) { toast.error("Nenhum registro encontrado nesta tabela"); return; }

      const entries = rows.map((row: Record<string, unknown>) => ({
        tenant_id: tenantId,
        table_name: selectedTable,
        data: row as unknown as import("@/integrations/supabase/types").Json,
        backup_type: "manual",
        notes: notes || null,
      }));

      const { error: insertErr } = await supabase
        .from("tenant_config_backups")
        .insert(entries);

      if (insertErr) { toast.error(insertErr.message); return; }
      toast.success(`${rows.length} registro(s) salvos em backup`);
      setNotes("");
      await loadBackups();
    } finally {
      setBackingUp(false);
    }
  };

  // ── Restaurar ──
  const handleRestore = async (backupId: string) => {
    setRestoringId(backupId);
    try {
      const { data, error } = await supabase.functions.invoke("restore-backup", {
        body: { backup_id: backupId },
      });

      if (error) {
        toast.error(`Erro ao restaurar: ${error.message}`);
        return;
      }

      if (data?.error) {
        toast.error(`Erro: ${data.error}`);
        return;
      }

      toast.success(`Restaurado com sucesso (${data.action}) — ${data.table_name} #${data.record_id?.slice(0, 8)}`);
      await loadBackups();
    } finally {
      setRestoringId(null);
    }
  };

  const truncateJson = (obj: Record<string, unknown>, maxLen = 80) => {
    const str = JSON.stringify(obj);
    return str.length > maxLen ? str.slice(0, maxLen) + "…" : str;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Backups</h2>
        <TenantSelector />
      </div>

      {/* ── Backup Manual ── */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Download className="h-5 w-5" /> Backup Manual</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedTable} onValueChange={setSelectedTable}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Selecione a tabela" />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_TABLES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Notas (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleBackupManual} disabled={backingUp || !selectedTable}>
              {backingUp ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando…</> : "Criar Backup"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Histórico ── */}
      <Card>
        <CardHeader><CardTitle>Histórico de Backups</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : backups.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum backup encontrado para este tenant.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2">Tabela</th>
                    <th className="pb-2">Tipo</th>
                    <th className="pb-2">Data</th>
                    <th className="pb-2">Notas</th>
                    <th className="pb-2">Preview</th>
                    <th className="pb-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((b) => (
                    <tr key={b.id} className="border-b last:border-0">
                      <td className="py-2 font-medium">{b.table_name}</td>
                      <td className="py-2">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          b.backup_type === "manual" ? "bg-blue-100 text-blue-800" :
                          b.backup_type === "pre_restore" ? "bg-amber-100 text-amber-800" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {b.backup_type}
                        </span>
                      </td>
                      <td className="py-2">{new Date(b.created_at).toLocaleString("pt-BR")}</td>
                      <td className="py-2 text-muted-foreground max-w-[150px] truncate">{b.notes || "—"}</td>
                      <td className="py-2 max-w-[200px]">
                        <Dialog>
                          <DialogTrigger asChild>
                            <button className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer">
                              <Eye className="h-3 w-3" />
                              {truncateJson(b.data)}
                            </button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Backup — {b.table_name} ({b.backup_type})</DialogTitle>
                            </DialogHeader>
                            <pre className="bg-muted p-4 rounded text-xs overflow-x-auto whitespace-pre-wrap">
                              {JSON.stringify(b.data, null, 2)}
                            </pre>
                          </DialogContent>
                        </Dialog>
                      </td>
                      <td className="py-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={restoringId === b.id}
                              className="gap-1"
                            >
                              {restoringId === b.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <RotateCcw className="h-3 w-3" />
                              )}
                              Restaurar
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar restauração</AlertDialogTitle>
                              <AlertDialogDescription>
                                Isso vai sobrescrever o registro atual de <strong>{b.table_name}</strong> com
                                os dados deste backup. Um backup do estado atual será salvo automaticamente
                                antes da restauração (tipo <em>pre_restore</em>).
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRestore(b.id)}>
                                Restaurar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
