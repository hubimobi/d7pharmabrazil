import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import {
  MessageSquare, Smartphone, FileText, GitBranch, Users, BarChart3,
  Plus, RefreshCw, QrCode, Wifi, WifiOff, Trash2, Edit, Play, Pause,
  Send, Clock, AlertTriangle, CheckCircle, XCircle, Eye, Search,
  Zap, Settings2, Shuffle, Upload, Phone, Mail, UserPlus, Download
} from "lucide-react";

// ==================== TYPES ====================
interface WhatsAppInstance {
  id: string; name: string; instance_name: string; api_url: string; api_key: string;
  status: string; qr_code: string | null; phone_number: string | null;
  daily_limit: number; messages_sent_today: number; active: boolean;
  last_message_at: string | null; created_at: string; funnel_roles?: string[];
}
interface WhatsAppTemplate {
  id: string; name: string; category: string; content: string;
  variables: any; active: boolean; created_at: string;
}
interface WhatsAppFunnel {
  id: string; name: string; type: string; trigger_event: string;
  active: boolean; created_at: string;
}
interface FunnelStep {
  id: string; funnel_id: string; step_order: number; delay_minutes: number;
  template_id: string | null; instance_id: string | null; active: boolean;
}
interface MessageLog {
  id: string; contact_phone: string; contact_name: string; instance_name: string | null;
  message_content: string; direction: string; status: string;
  funnel_name: string | null; error_message: string | null; created_at: string;
}
interface QueueItem {
  id: string; contact_phone: string; contact_name: string; message_content: string;
  status: string; scheduled_at: string; retry_count: number; error_message: string | null;
}

type FunnelRole = "all" | "recuperacao" | "recompra" | "upsell" | "novidades";
type DelayUnit = "s" | "m" | "h" | "d";

const FUNNEL_ROLE_OPTIONS: Array<{ value: FunnelRole; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "recuperacao", label: "Recuperação" },
  { value: "recompra", label: "Recompra" },
  { value: "upsell", label: "Upsell" },
  { value: "novidades", label: "Novidades" },
];

function normalizeFunnelRoles(roles?: string[] | null): FunnelRole[] {
  const validRoles = (roles || []).filter((role): role is FunnelRole =>
    FUNNEL_ROLE_OPTIONS.some((option) => option.value === role as FunnelRole)
  );

  if (validRoles.length === 0 || validRoles.includes("all")) return ["all"];
  return validRoles;
}

function toggleFunnelRole(roles: string[] | null | undefined, role: FunnelRole): FunnelRole[] {
  const current = normalizeFunnelRoles(roles);

  if (role === "all") return ["all"];

  const withoutAll = current.filter((item) => item !== "all");
  if (withoutAll.includes(role)) {
    const next = withoutAll.filter((item) => item !== role);
    return next.length ? next : ["all"];
  }

  return [...withoutAll, role];
}

function replaceTemplateVariables(text: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((result, [key, value]) => result.split(`{${key}}`).join(value), text);
}

function isWholeMultiple(value: number, divisor: number) {
  const ratio = value / divisor;
  return Math.abs(ratio - Math.round(ratio)) < 0.000001;
}

function getDelayUnit(mins: number): DelayUnit {
  if (mins > 0 && mins < 1) return "s";
  if (mins >= 1440 && isWholeMultiple(mins, 1440)) return "d";
  if (mins >= 60 && isWholeMultiple(mins, 60)) return "h";
  return "m";
}

function getDelayValue(mins: number, unit = getDelayUnit(mins)): string {
  if (unit === "d") return String(Math.round(mins / 1440));
  if (unit === "h") return String(Math.round(mins / 60));
  if (unit === "s") return String(Math.round(mins * 60));
  return String(Math.round(mins));
}

function toDelayMinutes(value: string, unit: DelayUnit): number {
  const normalized = value.replace(",", ".").trim();
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;

  if (unit === "d") return numeric * 1440;
  if (unit === "h") return numeric * 60;
  if (unit === "s") return numeric / 60;
  return numeric;
}

function formatDelay(mins: number) {
  if (mins < 1) return `${Math.round(mins * 60)} seg`;
  if (mins < 60) return `${Math.round(mins)} min`;
  if (mins < 1440) return `${Math.round(mins / 60)}h`;
  return `${Math.round(mins / 1440)}d`;
}

function formatOffset(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

// ==================== SPINTAX PREVIEW ====================
function parseSpintax(text: string): string {
  const regex = /\{([^{}]+)\}/;
  let result = text;
  let match;
  while ((match = regex.exec(result)) !== null) {
    const options = match[1].split("|");
    const chosen = options[Math.floor(Math.random() * options.length)];
    result = result.substring(0, match.index) + chosen + result.substring(match.index + match[0].length);
  }
  return result;
}

// ==================== DASHBOARD TAB ====================
function DashboardTab() {
  const [stats, setStats] = useState({ sent: 0, errors: 0, pending: 0, instances: 0 });
  const [recentLogs, setRecentLogs] = useState<MessageLog[]>([]);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    const [
      { count: sent },
      { count: errors },
      { count: pending },
      { count: instances },
      { data: logs },
    ] = await Promise.all([
      supabase.from("whatsapp_message_log").select("*", { count: "exact", head: true }).eq("status", "sent"),
      supabase.from("whatsapp_message_log").select("*", { count: "exact", head: true }).eq("status", "error"),
      supabase.from("whatsapp_message_queue").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("whatsapp_instances").select("*", { count: "exact", head: true }).eq("status", "connected"),
      supabase.from("whatsapp_message_log").select("*").order("created_at", { ascending: false }).limit(20),
    ]);
    setStats({ sent: sent || 0, errors: errors || 0, pending: pending || 0, instances: instances || 0 });
    setRecentLogs((logs || []) as unknown as MessageLog[]);
  }

  const cards = [
    { label: "Mensagens Enviadas", value: stats.sent, icon: Send, color: "text-green-600" },
    { label: "Erros", value: stats.errors, icon: AlertTriangle, color: "text-red-500" },
    { label: "Na Fila", value: stats.pending, icon: Clock, color: "text-amber-500" },
    { label: "WhatsApps Ativos", value: stats.instances, icon: Smartphone, color: "text-blue-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <c.icon className={`h-8 w-8 ${c.color}`} />
              <div>
                <p className="text-2xl font-bold">{c.value}</p>
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Últimas Mensagens
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma mensagem enviada ainda</p>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {recentLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                    <div className={`mt-1 ${log.status === "sent" ? "text-green-500" : "text-red-500"}`}>
                      {log.status === "sent" ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{log.contact_name || log.contact_phone}</span>
                        <span className="text-xs text-muted-foreground">{log.contact_phone}</span>
                        {log.funnel_name && <Badge variant="outline" className="text-[10px]">{log.funnel_name}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{log.message_content}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(log.created_at).toLocaleString("pt-BR")} • via {log.instance_name || "—"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== INSTANCES TAB ====================
function InstancesTab() {
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<{ name: string; api_url: string; api_key: string; funnel_roles: FunnelRole[] }>({
    name: "",
    api_url: "",
    api_key: "",
    funnel_roles: ["all"],
  });
  const [loading, setLoading] = useState(false);
  const [qrDialog, setQrDialog] = useState<{ open: boolean; qr: string | null; id: string }>({ open: false, qr: null, id: "" });

  useEffect(() => { loadInstances(); }, []);

  async function loadInstances() {
    const { data } = await supabase.from("whatsapp_instances").select("*").order("created_at", { ascending: false });
    setInstances((data || []) as unknown as WhatsAppInstance[]);
  }

  async function createInstance() {
    if (!form.name || !form.api_url || !form.api_key) { toast.error("Preencha todos os campos"); return; }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("whatsapp-instance", {
        body: {
          action: "create",
          name: form.name,
          api_url: form.api_url,
          api_key: form.api_key,
          funnel_roles: normalizeFunnelRoles(form.funnel_roles),
        },
      });
      if (res.error) throw new Error(res.error.message);
      toast.success("Instância criada!");
      if (res.data?.qrcode) {
        setQrDialog({ open: true, qr: res.data.qrcode, id: res.data.instance?.id });
      }
      setForm({ name: "", api_url: "", api_key: "", funnel_roles: ["all"] });
      setShowAdd(false);
      loadInstances();
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  }

  async function updateInstanceRoles(inst: WhatsAppInstance, role: FunnelRole) {
    const nextRoles = toggleFunnelRole(inst.funnel_roles, role);
    await supabase.from("whatsapp_instances").update({ funnel_roles: nextRoles } as any).eq("id", inst.id);
    loadInstances();
  }

  async function getQR(inst: WhatsAppInstance) {
    try {
      const res = await supabase.functions.invoke("whatsapp-instance", {
        body: { action: "qrcode", instance_id: inst.id },
      });
      if (res.data?.qrcode) {
        setQrDialog({ open: true, qr: res.data.qrcode, id: inst.id });
      } else {
        toast.info("Nenhum QR Code disponível. Verifique o status.");
      }
      loadInstances();
    } catch (e: any) { toast.error(e.message); }
  }

  async function checkStatus(inst: WhatsAppInstance) {
    try {
      const res = await supabase.functions.invoke("whatsapp-instance", {
        body: { action: "status", instance_id: inst.id },
      });
      toast.success(`Status: ${res.data?.status || "desconhecido"}`);
      loadInstances();
    } catch (e: any) { toast.error(e.message); }
  }

  async function deleteInstance(id: string) {
    if (!confirm("Excluir esta instância?")) return;
    await supabase.from("whatsapp_instances").delete().eq("id", id);
    toast.success("Instância removida");
    loadInstances();
  }

  async function toggleActive(inst: WhatsAppInstance) {
    await supabase.from("whatsapp_instances").update({ active: !inst.active }).eq("id", inst.id);
    loadInstances();
  }

  const statusBadge = (s: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      connected: { label: "Conectado", variant: "default" },
      disconnected: { label: "Desconectado", variant: "destructive" },
      qr_ready: { label: "Aguardando QR", variant: "secondary" },
    };
    const info = map[s] || { label: s, variant: "outline" as const };
    return <Badge variant={info.variant}>{info.label}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">WhatsApps Conectados</h3>
        <Button onClick={() => setShowAdd(true)} size="sm"><Plus className="h-4 w-4 mr-1" /> Nova Instância</Button>
      </div>

      {instances.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Smartphone className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>Nenhuma instância cadastrada</p>
          <p className="text-xs mt-1">Adicione sua primeira conexão WhatsApp</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {instances.map((inst) => (
            <Card key={inst.id} className={!inst.active ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold">{inst.name}</h4>
                    <p className="text-xs text-muted-foreground">{inst.phone_number || inst.instance_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(inst.status)}
                    <Switch checked={inst.active} onCheckedChange={() => toggleActive(inst)} />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                  <span>{inst.messages_sent_today}/{inst.daily_limit} msgs hoje</span>
                  {inst.last_message_at && (
                    <span>• Último envio: {new Date(inst.last_message_at).toLocaleString("pt-BR")}</span>
                  )}
                </div>
                <div className="mb-3 space-y-1">
                  <p className="text-[10px] font-medium text-muted-foreground">Usar em:</p>
                  <div className="flex flex-wrap gap-1">
                    {FUNNEL_ROLE_OPTIONS.map((role) => {
                      const selected = normalizeFunnelRoles(inst.funnel_roles).includes(role.value);
                      return (
                        <Button
                          key={role.value}
                          type="button"
                          size="sm"
                          variant={selected ? "default" : "outline"}
                          className="h-7 rounded-full px-2 text-[10px]"
                          onClick={() => updateInstanceRoles(inst, role.value)}
                        >
                          {role.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => getQR(inst)}><QrCode className="h-3.5 w-3.5 mr-1" /> QR Code</Button>
                  <Button size="sm" variant="outline" onClick={() => checkStatus(inst)}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Status</Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteInstance(inst.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Instance Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Instância WhatsApp</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: WhatsApp Vendas 1" /></div>
            <div><Label>URL da Evolution API</Label><Input value={form.api_url} onChange={(e) => setForm({ ...form, api_url: e.target.value })} placeholder="https://sua-evolution-api.com" /></div>
            <div><Label>API Key</Label><Input value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} placeholder="Chave da sua Evolution API" type="password" /></div>
            <div className="space-y-2">
              <Label>Função deste WhatsApp</Label>
              <div className="flex flex-wrap gap-2">
                {FUNNEL_ROLE_OPTIONS.map((role) => {
                  const selected = normalizeFunnelRoles(form.funnel_roles).includes(role.value);
                  return (
                    <Button
                      key={role.value}
                      type="button"
                      size="sm"
                      variant={selected ? "default" : "outline"}
                      className="rounded-full"
                      onClick={() => setForm((current) => ({
                        ...current,
                        funnel_roles: toggleFunnelRole(current.funnel_roles, role.value),
                      }))}
                    >
                      {role.label}
                    </Button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">Você pode deixar este número para todos os funis ou limitar por tipo.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button onClick={createInstance} disabled={loading}>{loading ? "Criando..." : "Criar e Conectar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={qrDialog.open} onOpenChange={(o) => setQrDialog({ ...qrDialog, open: o })}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Escanear QR Code</DialogTitle></DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {qrDialog.qr ? (
              <img src={qrDialog.qr.startsWith("data:") ? qrDialog.qr : `data:image/png;base64,${qrDialog.qr}`} alt="QR Code" className="w-64 h-64 rounded-lg border" />
            ) : (
              <p className="text-muted-foreground">Nenhum QR Code disponível</p>
            )}
            <p className="text-xs text-muted-foreground text-center">Abra o WhatsApp no celular → Dispositivos Conectados → Conectar Dispositivo</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== TEMPLATES TAB ====================
function TemplatesTab() {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<WhatsAppTemplate | null>(null);
  const [form, setForm] = useState({ name: "", category: "geral", content: "" });
  const [preview, setPreview] = useState("");
  const templateTextareaRef = useRef<HTMLTextAreaElement>(null);
  const cursorPosRef = useRef<number | null>(null);

  function insertAtCursor(text: string) {
    const textarea = templateTextareaRef.current;
    const pos = cursorPosRef.current ?? form.content.length;
    const before = form.content.substring(0, pos);
    const after = form.content.substring(pos);
    const newContent = before + text + after;
    setForm({ ...form, content: newContent });
    generatePreview(newContent);
    // Restore cursor after render
    setTimeout(() => {
      if (textarea) {
        const newPos = pos + text.length;
        textarea.focus();
        textarea.setSelectionRange(newPos, newPos);
        cursorPosRef.current = newPos;
      }
    }, 0);
  }

  useEffect(() => { loadTemplates(); }, []);

  async function loadTemplates() {
    const { data } = await supabase.from("whatsapp_templates").select("*").order("created_at", { ascending: false });
    setTemplates((data || []) as unknown as WhatsAppTemplate[]);
  }

  function generatePreview(content: string) {
    let text = content;
    text = text.replace(/\{Nome\}/g, "João").replace(/\{Produto\}/g, "Creatina 300g")
      .replace(/\{Link\}/g, "https://loja.com/checkout").replace(/\{Cidade\}/g, "São Paulo")
      .replace(/\{Nome_da_Empresa\}/g, "D7 Pharma").replace(/\{Atendente\}/g, "Ana");
    setPreview(parseSpintax(text));
  }

  function openEditor(tpl?: WhatsAppTemplate) {
    if (tpl) {
      setEditing(tpl);
      setForm({ name: tpl.name, category: tpl.category, content: tpl.content });
      generatePreview(tpl.content);
    } else {
      setEditing(null);
      setForm({ name: "", category: "geral", content: "" });
      setPreview("");
    }
    setShowEditor(true);
  }

  async function saveTemplate() {
    if (!form.name || !form.content) { toast.error("Preencha nome e conteúdo"); return; }
    const payload = { name: form.name, category: form.category, content: form.content };
    if (editing) {
      await supabase.from("whatsapp_templates").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("whatsapp_templates").insert(payload);
    }
    toast.success("Template salvo!");
    setShowEditor(false);
    loadTemplates();
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Excluir template?")) return;
    await supabase.from("whatsapp_templates").delete().eq("id", id);
    toast.success("Template excluído");
    loadTemplates();
  }

  const categories: Record<string, string> = {
    geral: "Geral", recuperacao: "Recuperação", recompra: "Recompra",
    upsell: "Upsell", novidades: "Novidades", feedback: "Feedback",
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Templates de Mensagem</h3>
        <Button onClick={() => openEditor()} size="sm"><Plus className="h-4 w-4 mr-1" /> Novo Template</Button>
      </div>

      {templates.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>Nenhum template criado</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {templates.map((tpl) => (
            <Card key={tpl.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{tpl.name}</span>
                      <Badge variant="outline" className="text-[10px]">{categories[tpl.category] || tpl.category}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{tpl.content}</p>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditor(tpl)}><Edit className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteTemplate(tpl.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Template Editor */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Editar Template" : "Novo Template"}</DialogTitle></DialogHeader>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Recuperação - Lembrete 1" /></div>
              <div>
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(categories).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Mensagem (Spintax)</Label>
                <Textarea ref={templateTextareaRef} value={form.content}
                  onChange={(e) => { setForm({ ...form, content: e.target.value }); generatePreview(e.target.value); cursorPosRef.current = e.target.selectionStart; }}
                  onSelect={(e) => { cursorPosRef.current = (e.target as HTMLTextAreaElement).selectionStart; }}
                  onBlur={(e) => { cursorPosRef.current = e.target.selectionStart; }}
                  placeholder={`{Oi|Olá|E aí} {Nome}, {tudo bem|como vai}?\n\nVi que você deixou {Produto} no carrinho...\n{Link}`}
                  className="min-h-[180px] font-mono text-xs" />
              </div>
              <div className="flex flex-wrap gap-1">
                {["{Nome}", "{Produto}", "{Link}", "{Cidade}", "{Nome_da_Empresa}", "{Atendente}"].map((v) => (
                  <Badge key={v} variant="secondary" className="cursor-pointer text-[10px]"
                    onClick={() => insertAtCursor(v)}>
                    {v}
                  </Badge>
                ))}
                <Popover>
                  <PopoverTrigger asChild>
                    <Badge variant="outline" className="cursor-pointer text-[10px]">😀 Emoji</Badge>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-2" align="start">
                    <div className="grid grid-cols-8 gap-1 max-h-[200px] overflow-y-auto">
                      {["😀","😂","😍","🥰","😎","🤩","🙏","👍","👋","🎉","🔥","💪","❤️","💙","💚","💛","🧡","💜","✅","⭐","🏆","💰","🛒","📦","🚚","💳","🎁","📱","💊","🩺","💉","🧪","🌿","🍃","✨","🌟","⚡","🔔","📢","💬","📧","📞","🕐","🗓️","📊","📈","👨‍⚕️","👩‍⚕️"].map((emoji) => (
                        <button key={emoji} type="button" className="text-lg hover:bg-muted rounded p-1 transition-colors"
                          onClick={() => insertAtCursor(emoji)}>
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Eye className="h-3.5 w-3.5" /> Preview
                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => generatePreview(form.content)}>
                  <Shuffle className="h-3 w-3 mr-1" /> Outra variação
                </Button>
              </Label>
              <div className="bg-[#e5ddd5] rounded-lg p-4 min-h-[250px]">
                <div className="bg-white rounded-lg p-3 shadow-sm max-w-[280px] ml-auto">
                  <p className="text-sm whitespace-pre-wrap">{preview || "Digite uma mensagem para ver o preview..."}</p>
                  <p className="text-[10px] text-muted-foreground text-right mt-1">10:30 ✓✓</p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditor(false)}>Cancelar</Button>
            <Button onClick={saveTemplate}>Salvar Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== FUNNELS TAB ====================
function FunnelsTab() {
  const [funnels, setFunnels] = useState<WhatsAppFunnel[]>([]);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [steps, setSteps] = useState<FunnelStep[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<WhatsAppFunnel | null>(null);
  const [form, setForm] = useState({ name: "", type: "recuperacao", trigger_event: "carrinho_abandonado" });
  const [showSteps, setShowSteps] = useState<string | null>(null);
  const [delayDrafts, setDelayDrafts] = useState<Record<string, { value: string; unit: DelayUnit }>>({});
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testFunnel, setTestFunnel] = useState<WhatsAppFunnel | null>(null);
  const [testAccelerated, setTestAccelerated] = useState(true);
  const [testRunning, setTestRunning] = useState(false);
  const [testMessages, setTestMessages] = useState<Array<{ id: string; offsetLabel: string; templateName: string; instanceLabel: string; message: string }>>([]);
  const [testPreview, setTestPreview] = useState<Array<{ id: string; offsetLabel: string; configuredLabel: string; templateName: string; instanceLabel: string; message: string; offsetSeconds: number }>>([]);
  const [testForm, setTestForm] = useState({
    nome: "Cliente Teste",
    telefone: "5511999999999",
    produto: "Produto Exemplo",
    link: "https://loja.com/checkout",
    cidade: "São Paulo",
  });
  const simulationTimersRef = useRef<number[]>([]);

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    setDelayDrafts((current) => {
      const next: Record<string, { value: string; unit: DelayUnit }> = {};
      for (const step of steps) {
        if (current[step.id]) {
          next[step.id] = current[step.id];
        }
      }
      return next;
    });
  }, [steps]);

  useEffect(() => {
    if (!showTestDialog || !testFunnel) return;
    stopSimulation();
    setTestPreview(buildTestSequence(testFunnel, testAccelerated));
    setTestMessages([]);
  }, [showTestDialog, testFunnel, testAccelerated, steps, templates, instances, testForm.nome, testForm.telefone, testForm.produto, testForm.link, testForm.cidade]);

  async function loadAll() {
    const [{ data: f }, { data: t }, { data: i }, { data: s }] = await Promise.all([
      supabase.from("whatsapp_funnels").select("*").order("created_at", { ascending: false }),
      supabase.from("whatsapp_templates").select("*").eq("active", true),
      supabase.from("whatsapp_instances").select("*").eq("active", true),
      supabase.from("whatsapp_funnel_steps").select("*").order("step_order"),
    ]);
    setFunnels((f || []) as unknown as WhatsAppFunnel[]);
    setTemplates((t || []) as unknown as WhatsAppTemplate[]);
    setInstances((i || []) as unknown as WhatsAppInstance[]);
    setSteps((s || []) as unknown as FunnelStep[]);
  }

  const funnelTypes: Record<string, string> = {
    recuperacao: "🛒 Recuperação", recompra: "🔁 Recompra", upsell: "📦 Upsell", novidades: "🆕 Novidades",
  };
  const triggerEvents: Record<string, string> = {
    carrinho_abandonado: "Carrinho Abandonado", compra_confirmada: "Compra Confirmada",
    entrega_confirmada: "Entrega Confirmada", recompra_aviso: "Aviso de Recompra",
    campanha_manual: "Campanha Manual",
  };

  function openEditor(funnel?: WhatsAppFunnel) {
    if (funnel) {
      setEditing(funnel);
      setForm({ name: funnel.name, type: funnel.type, trigger_event: funnel.trigger_event });
    } else {
      setEditing(null);
      setForm({ name: "", type: "recuperacao", trigger_event: "carrinho_abandonado" });
    }
    setShowEditor(true);
  }

  async function saveFunnel() {
    if (!form.name) { toast.error("Preencha o nome"); return; }
    if (editing) {
      await supabase.from("whatsapp_funnels").update(form).eq("id", editing.id);
    } else {
      await supabase.from("whatsapp_funnels").insert(form);
    }
    toast.success("Funil salvo!");
    setShowEditor(false);
    loadAll();
  }

  async function toggleFunnel(f: WhatsAppFunnel) {
    await supabase.from("whatsapp_funnels").update({ active: !f.active }).eq("id", f.id);
    loadAll();
  }

  async function deleteFunnel(id: string) {
    if (!confirm("Excluir funil e todas as etapas?")) return;
    await supabase.from("whatsapp_funnels").delete().eq("id", id);
    toast.success("Funil excluído");
    loadAll();
  }

  async function addStep(funnelId: string) {
    const funnelSteps = steps.filter((s) => s.funnel_id === funnelId);
    const nextOrder = funnelSteps.length + 1;
    await supabase.from("whatsapp_funnel_steps").insert({ funnel_id: funnelId, step_order: nextOrder, delay_minutes: 15 });
    loadAll();
  }

  async function updateStep(stepId: string, updates: Partial<FunnelStep>) {
    await supabase.from("whatsapp_funnel_steps").update(updates).eq("id", stepId);
    loadAll();
  }

  async function deleteStep(stepId: string) {
    await supabase.from("whatsapp_funnel_steps").delete().eq("id", stepId);
    loadAll();
  }

  function getEligibleInstances(funnelType: string) {
    return instances.filter((instance) => {
      const roles = normalizeFunnelRoles(instance.funnel_roles);
      return roles.includes("all") || roles.includes(funnelType as FunnelRole);
    });
  }

  function getDelayDraft(step: FunnelStep) {
    return delayDrafts[step.id] || {
      value: getDelayValue(step.delay_minutes),
      unit: getDelayUnit(step.delay_minutes),
    };
  }

  async function saveDelayDraft(step: FunnelStep, nextDraft?: { value: string; unit: DelayUnit }) {
    const draft = nextDraft || getDelayDraft(step);
    const delayMinutes = toDelayMinutes(draft.value, draft.unit);
    setDelayDrafts((current) => ({
      ...current,
      [step.id]: { value: getDelayValue(delayMinutes, draft.unit), unit: draft.unit },
    }));
    await updateStep(step.id, { delay_minutes: delayMinutes });
  }

  function stopSimulation() {
    simulationTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    simulationTimersRef.current = [];
    setTestRunning(false);
  }

  function buildTestSequence(funnel: WhatsAppFunnel, accelerated: boolean) {
    const funnelSteps = steps
      .filter((step) => step.funnel_id === funnel.id && step.active)
      .sort((a, b) => a.step_order - b.step_order);
    const variables = {
      Nome: testForm.nome,
      Produto: testForm.produto,
      Link: testForm.link,
      Cidade: testForm.cidade,
      Nome_da_Empresa: "D7 Pharma",
      Atendente: "Atendente",
    };

    let cumulativeConfiguredSeconds = 0;

    return funnelSteps.map((step, index) => {
      const template = templates.find((item) => item.id === step.template_id);
      const eligibleInstances = getEligibleInstances(funnel.type);
      cumulativeConfiguredSeconds += Math.round(Number(step.delay_minutes || 0) * 60);
      const offsetSeconds = accelerated ? index * 10 : cumulativeConfiguredSeconds;
      const message = parseSpintax(replaceTemplateVariables(template?.content || "", variables));
      const selectedInstance = instances.find((instance) => instance.id === step.instance_id);
      const instanceLabel = selectedInstance?.name || (eligibleInstances[0]?.name ? `Auto (${eligibleInstances[0].name})` : `Auto (${funnelTypes[funnel.type] || funnel.type})`);

      return {
        id: step.id,
        configuredLabel: formatDelay(Number(step.delay_minutes || 0)),
        offsetLabel: accelerated ? formatOffset(offsetSeconds) : formatOffset(cumulativeConfiguredSeconds),
        templateName: template?.name || "Sem template",
        instanceLabel,
        message: message || "Etapa sem template configurado.",
        offsetSeconds,
      };
    });
  }

  function openTestModal(funnel: WhatsAppFunnel) {
    setTestFunnel(funnel);
    setShowTestDialog(true);
  }

  function runTestSimulation() {
    if (!testFunnel) return;

    stopSimulation();
    const sequence = buildTestSequence(testFunnel, testAccelerated);
    setTestPreview(sequence);
    setTestMessages([]);

    if (sequence.length === 0) {
      toast.error("Adicione pelo menos uma etapa ativa para testar o funil.");
      return;
    }

    const totalConfiguredSeconds = sequence[sequence.length - 1]?.offsetSeconds || 0;
    if (!testAccelerated && totalConfiguredSeconds > 120) {
      setTestMessages(sequence.map(({ id, offsetLabel, templateName, instanceLabel, message }) => ({ id, offsetLabel, templateName, instanceLabel, message })));
      toast.info("Cronograma exibido no tempo configurado. Ative o modo acelerado para executar automaticamente de 10 em 10 segundos.");
      return;
    }

    setTestRunning(true);
    sequence.forEach((item) => {
      const timer = window.setTimeout(() => {
        setTestMessages((current) => [...current, {
          id: item.id,
          offsetLabel: item.offsetLabel,
          templateName: item.templateName,
          instanceLabel: item.instanceLabel,
          message: item.message,
        }]);
      }, item.offsetSeconds * 1000);
      simulationTimersRef.current.push(timer);
    });

    const finalTimer = window.setTimeout(() => setTestRunning(false), (sequence[sequence.length - 1]?.offsetSeconds || 0) * 1000 + 300);
    simulationTimersRef.current.push(finalTimer);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Funis de Automação</h3>
        <Button onClick={() => openEditor()} size="sm"><Plus className="h-4 w-4 mr-1" /> Novo Funil</Button>
      </div>

      {funnels.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <GitBranch className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>Nenhum funil criado</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {funnels.map((f) => {
            const funnelSteps = steps.filter((s) => s.funnel_id === f.id).sort((a, b) => a.step_order - b.step_order);
            const isOpen = showSteps === f.id;
            return (
              <Card key={f.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{funnelTypes[f.type]?.split(" ")[0]}</span>
                      <div>
                        <h4 className="font-semibold">{f.name}</h4>
                        <p className="text-xs text-muted-foreground">Gatilho: {triggerEvents[f.trigger_event] || f.trigger_event} • {funnelSteps.length} etapas</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => openTestModal(f)}>
                        <Play className="h-3.5 w-3.5 mr-1" /> Testar
                      </Button>
                      <Button size="sm" variant={f.active ? "default" : "outline"} onClick={() => toggleFunnel(f)}>
                        {f.active ? <><Pause className="h-3.5 w-3.5 mr-1" /> Pausar</> : <><Play className="h-3.5 w-3.5 mr-1" /> Ativar</>}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowSteps(isOpen ? null : f.id)}>
                        <Settings2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEditor(f)}><Edit className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteFunnel(f.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="mt-4 space-y-3 border-t pt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Etapas do Funil</span>
                        <Button size="sm" variant="outline" onClick={() => addStep(f.id)}><Plus className="h-3.5 w-3.5 mr-1" /> Etapa</Button>
                      </div>
                      {funnelSteps.map((step, idx) => (
                        <div key={step.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">
                            {idx + 1}
                          </div>
                          <div className="flex-1 grid grid-cols-3 gap-2">
                            <div>
                              <Label className="text-[10px]">Atraso</Label>
                              <div className="flex gap-1">
                                <Input type="number" min={0} step={1}
                                  value={getDelayDraft(step).value}
                                  className="h-8 text-xs w-16"
                                  onChange={(e) => setDelayDrafts((current) => ({
                                    ...current,
                                    [step.id]: { ...getDelayDraft(step), value: e.target.value },
                                  }))}
                                  onBlur={() => saveDelayDraft(step)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      saveDelayDraft(step);
                                    }
                                  }}
                                />
                                <Select
                                  value={getDelayDraft(step).unit}
                                  onValueChange={(value: DelayUnit) => {
                                    const nextDraft = { ...getDelayDraft(step), unit: value };
                                    setDelayDrafts((current) => ({ ...current, [step.id]: nextDraft }));
                                    saveDelayDraft(step, nextDraft);
                                  }}
                                >
                                  <SelectTrigger className="h-8 w-[84px] text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="s">Seg</SelectItem>
                                    <SelectItem value="m">Min</SelectItem>
                                    <SelectItem value="h">Horas</SelectItem>
                                    <SelectItem value="d">Dias</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div>
                              <Label className="text-[10px]">Template</Label>
                              <Select value={step.template_id || ""} onValueChange={(v) => updateStep(step.id, { template_id: v || null })}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                                <SelectContent>{templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-[10px]">WhatsApp</Label>
                              <Select value={step.instance_id || "auto"} onValueChange={(v) => updateStep(step.id, { instance_id: v === "auto" ? null : v })}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="auto">🔄 Automático do tipo do funil</SelectItem>
                                  {getEligibleInstances(f.type).map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive shrink-0" onClick={() => deleteStep(step.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                      {funnelSteps.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Adicione etapas ao funil</p>}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Funnel Editor */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar Funil" : "Novo Funil"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Recuperação de Carrinho" /></div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(funnelTypes).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Evento Gatilho</Label>
              <Select value={form.trigger_event} onValueChange={(v) => setForm({ ...form, trigger_event: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(triggerEvents).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditor(false)}>Cancelar</Button>
            <Button onClick={saveFunnel}>Salvar Funil</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTestDialog} onOpenChange={(open) => {
        setShowTestDialog(open);
        if (!open) stopSimulation();
      }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Teste de Funil {testFunnel ? `• ${testFunnel.name}` : ""}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
            <div className="space-y-4">
              <div className="space-y-3 rounded-xl border p-4">
                <div>
                  <Label>Nome</Label>
                  <Input value={testForm.nome} onChange={(e) => setTestForm((current) => ({ ...current, nome: e.target.value }))} />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input value={testForm.telefone} onChange={(e) => setTestForm((current) => ({ ...current, telefone: e.target.value }))} />
                </div>
                <div>
                  <Label>Produto</Label>
                  <Input value={testForm.produto} onChange={(e) => setTestForm((current) => ({ ...current, produto: e.target.value }))} />
                </div>
                <div>
                  <Label>Link</Label>
                  <Input value={testForm.link} onChange={(e) => setTestForm((current) => ({ ...current, link: e.target.value }))} />
                </div>
                <div>
                  <Label>Cidade</Label>
                  <Input value={testForm.cidade} onChange={(e) => setTestForm((current) => ({ ...current, cidade: e.target.value }))} />
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">Modo acelerado</p>
                    <p className="text-xs text-muted-foreground">Executa uma etapa a cada 10 segundos sem disparo real.</p>
                  </div>
                  <Switch checked={testAccelerated} onCheckedChange={setTestAccelerated} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={runTestSimulation} className="flex-1 min-w-[140px]">
                    <Play className="h-4 w-4 mr-1" /> Executar teste
                  </Button>
                  <Button variant="outline" onClick={stopSimulation} disabled={!testRunning && testMessages.length === 0}>
                    <Pause className="h-4 w-4 mr-1" /> Parar
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <p className="text-sm font-medium mb-3">Cronograma</p>
                <div className="space-y-2">
                  {testPreview.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma etapa ativa para simular.</p>
                  ) : testPreview.map((item, index) => (
                    <div key={item.id} className="rounded-lg bg-muted/50 p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">Etapa {index + 1} • {item.templateName}</span>
                        <Badge variant="outline">{item.offsetLabel}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Atraso configurado: {item.configuredLabel} • Instância: {item.instanceLabel}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">Interface de Teste</p>
                  <p className="text-xs text-muted-foreground">Simulação local sem enviar mensagens no WhatsApp.</p>
                </div>
                {testRunning && <Badge>Executando</Badge>}
              </div>
              <ScrollArea className="h-[520px] rounded-xl bg-muted/40 p-4">
                <div className="space-y-3">
                  {testMessages.length === 0 ? (
                    <div className="flex h-[440px] items-center justify-center text-center text-sm text-muted-foreground">
                      Clique em <strong className="mx-1">Executar teste</strong> para simular a sequência.
                    </div>
                  ) : testMessages.map((item) => (
                    <div key={`${item.id}-${item.offsetLabel}`} className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl bg-background p-3 shadow-sm">
                        <div className="mb-2 flex items-center gap-2">
                          <Badge variant="secondary">{item.offsetLabel}</Badge>
                          <span className="text-[11px] text-muted-foreground">{item.templateName} • {item.instanceLabel}</span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm">{item.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== CONTACTS TAB ====================
function ContactsTab() {
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importSource, setImportSource] = useState<string | null>(null);
  const [csvText, setCsvText] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const [{ data: logData }, { data: contactData }] = await Promise.all([
      supabase.from("whatsapp_message_log").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("whatsapp_contacts").select("*").order("created_at", { ascending: false }),
    ]);
    setLogs((logData || []) as unknown as MessageLog[]);
    setContacts(contactData || []);
  }

  // Merge DB contacts with log contacts
  const allContacts = (() => {
    const map = new Map<string, { phone: string; name: string; lastMessage: string; source: string }>();
    contacts.forEach((c) => map.set(c.phone, { phone: c.phone, name: c.name, lastMessage: c.updated_at, source: c.source }));
    logs.forEach((l) => {
      if (!map.has(l.contact_phone)) {
        map.set(l.contact_phone, { phone: l.contact_phone, name: l.contact_name, lastMessage: l.created_at, source: "mensagem" });
      }
    });
    return Array.from(map.values());
  })();

  const filtered = allContacts.filter((c) =>
    c.phone.includes(search) || c.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedLogs = logs.filter((l) => l.contact_phone === selectedPhone).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  function normalizePhone(raw: string): string {
    const digits = raw.replace(/\D/g, "");
    if (digits.length >= 10 && !digits.startsWith("55")) return `55${digits}`;
    return digits;
  }

  async function importContacts(items: { phone: string; name: string; source: string }[]) {
    if (items.length === 0) { toast.error("Nenhum contato para importar"); return; }
    setImporting(true);
    let imported = 0;
    for (const item of items) {
      const phone = normalizePhone(item.phone);
      if (phone.length < 10) continue;
      const { error } = await supabase.from("whatsapp_contacts").upsert(
        { phone, name: item.name || phone, source: item.source },
        { onConflict: "phone" }
      );
      if (!error) imported++;
    }
    toast.success(`${imported} contato(s) importado(s) com sucesso!`);
    setImporting(false);
    setShowImport(false);
    setImportSource(null);
    setCsvText("");
    loadAll();
  }

  function handleCSVImport() {
    const lines = csvText.trim().split("\n").filter(Boolean);
    const items = lines.map((line) => {
      const parts = line.split(/[;,\t]/).map((s) => s.trim().replace(/^["']|["']$/g, ""));
      return { phone: parts[0] || "", name: parts[1] || "", source: "csv" };
    }).filter((i) => i.phone);
    importContacts(items);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCsvText(ev.target?.result as string || "");
    };
    reader.readAsText(file);
  }

  async function handleManualAdd() {
    if (!manualPhone) { toast.error("Informe o telefone"); return; }
    await importContacts([{ phone: manualPhone, name: manualName, source: "manual" }]);
    setManualName("");
    setManualPhone("");
  }

  async function deleteContact(phone: string) {
    await supabase.from("whatsapp_contacts").delete().eq("phone", phone);
    toast.success("Contato removido");
    loadAll();
  }

  const sourceLabels: Record<string, string> = {
    csv: "CSV", manual: "Manual", whatsapp_group: "Grupo WhatsApp",
    google_contacts: "Google", whatsapp_device: "Dispositivo", mensagem: "Mensagem",
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Contatos</h3>
          <Badge variant="secondary">{allContacts.length}</Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { setShowImport(true); setImportSource(null); }}>
            <Upload className="h-4 w-4 mr-1" /> Importar Contatos
          </Button>
          <Button size="sm" onClick={() => { setShowImport(true); setImportSource("manual"); }}>
            <UserPlus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </div>
      </div>

      {/* Import Dialog */}
      <Dialog open={showImport} onOpenChange={(v) => { setShowImport(v); if (!v) setImportSource(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {importSource === "manual" ? "Adicionar Contato" : importSource ? `Importar via ${sourceLabels[importSource] || importSource}` : "Importar Contatos"}
            </DialogTitle>
          </DialogHeader>

          {!importSource && (
            <div className="grid grid-cols-2 gap-3 py-2">
              <button onClick={() => setImportSource("whatsapp_group")}
                className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition text-center">
                <Users className="h-8 w-8 text-primary" />
                <span className="text-sm font-medium">Grupo do WhatsApp</span>
                <span className="text-xs text-muted-foreground">Importar membros de um grupo</span>
              </button>
              <button onClick={() => setImportSource("google_contacts")}
                className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition text-center">
                <Mail className="h-8 w-8 text-primary" />
                <span className="text-sm font-medium">Contatos do Google</span>
                <span className="text-xs text-muted-foreground">Exportar do Google e importar CSV</span>
              </button>
              <button onClick={() => setImportSource("csv")}
                className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition text-center">
                <FileText className="h-8 w-8 text-primary" />
                <span className="text-sm font-medium">Lista em CSV</span>
                <span className="text-xs text-muted-foreground">Telefone e nome separados por vírgula</span>
              </button>
              <button onClick={() => setImportSource("whatsapp_device")}
                className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition text-center">
                <Smartphone className="h-8 w-8 text-primary" />
                <span className="text-sm font-medium">Seu WhatsApp</span>
                <span className="text-xs text-muted-foreground">Sincronizar contatos via instância</span>
              </button>
            </div>
          )}

          {importSource === "manual" && (
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="Nome do contato" /></div>
              <div><Label>Telefone *</Label><Input value={manualPhone} onChange={(e) => setManualPhone(e.target.value)} placeholder="5511999999999" inputMode="tel" /></div>
              <Button className="w-full" onClick={handleManualAdd} disabled={importing}>
                {importing ? "Salvando..." : "Adicionar Contato"}
              </Button>
            </div>
          )}

          {importSource === "csv" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Cole a lista ou envie um arquivo CSV. Formato: <code className="text-xs bg-muted px-1 rounded">telefone,nome</code> (um por linha).</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-1" /> Enviar Arquivo
                </Button>
                <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
              </div>
              <Textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} rows={8} placeholder={"5511999999999,João Silva\n5521888888888,Maria Santos"} />
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">{csvText.trim().split("\n").filter(Boolean).length} linha(s)</span>
                <Button onClick={handleCSVImport} disabled={importing || !csvText.trim()}>
                  {importing ? "Importando..." : "Importar"}
                </Button>
              </div>
            </div>
          )}

          {importSource === "google_contacts" && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border p-4 space-y-2">
                <p className="text-sm font-medium">Como exportar do Google Contacts:</p>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Acesse <a href="https://contacts.google.com" target="_blank" rel="noopener" className="text-primary underline">contacts.google.com</a></li>
                  <li>Selecione os contatos desejados</li>
                  <li>Clique em <strong>Exportar</strong> → <strong>CSV do Google</strong></li>
                  <li>Envie o arquivo aqui</li>
                </ol>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-1" /> Enviar CSV do Google
                </Button>
                <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    const text = ev.target?.result as string || "";
                    const lines = text.split("\n").filter(Boolean);
                    const header = lines[0]?.toLowerCase() || "";
                    const nameIdx = header.split(",").findIndex((h) => h.includes("name") || h.includes("nome"));
                    const phoneIdx = header.split(",").findIndex((h) => h.includes("phone") || h.includes("telefone") || h.includes("mobile"));
                    if (phoneIdx < 0) { toast.error("Coluna de telefone não encontrada no CSV"); return; }
                    const items = lines.slice(1).map((line) => {
                      const cols = line.split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""));
                      return { phone: cols[phoneIdx] || "", name: cols[nameIdx >= 0 ? nameIdx : 0] || "", source: "google_contacts" };
                    }).filter((i) => i.phone.replace(/\D/g, "").length >= 8);
                    importContacts(items);
                  };
                  reader.readAsText(file);
                }} />
              </div>
              <Textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} rows={6} placeholder="Ou cole os dados aqui: telefone,nome (um por linha)" />
              {csvText.trim() && (
                <Button onClick={() => {
                  const lines = csvText.trim().split("\n").filter(Boolean);
                  const items = lines.map((line) => {
                    const parts = line.split(/[;,\t]/).map((s) => s.trim().replace(/^["']|["']$/g, ""));
                    return { phone: parts[0] || "", name: parts[1] || "", source: "google_contacts" };
                  }).filter((i) => i.phone);
                  importContacts(items);
                }} disabled={importing}>
                  {importing ? "Importando..." : "Importar"}
                </Button>
              )}
            </div>
          )}

          {importSource === "whatsapp_group" && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border p-4 space-y-2">
                <p className="text-sm font-medium">Como importar de um grupo:</p>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Abra o grupo no WhatsApp Web</li>
                  <li>Clique no nome do grupo → ver participantes</li>
                  <li>Copie a lista de participantes (número e nome)</li>
                  <li>Cole abaixo no formato: <code className="bg-muted px-1 rounded text-xs">telefone,nome</code></li>
                </ol>
              </div>
              <Textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} rows={8} placeholder={"5511999999999,Membro 1\n5521888888888,Membro 2"} />
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">{csvText.trim().split("\n").filter(Boolean).length} contato(s)</span>
                <Button onClick={() => {
                  const lines = csvText.trim().split("\n").filter(Boolean);
                  const items = lines.map((line) => {
                    const parts = line.split(/[;,\t]/).map((s) => s.trim().replace(/^["']|["']$/g, ""));
                    return { phone: parts[0] || "", name: parts[1] || "", source: "whatsapp_group" };
                  }).filter((i) => i.phone);
                  importContacts(items);
                }} disabled={importing || !csvText.trim()}>
                  {importing ? "Importando..." : "Importar"}
                </Button>
              </div>
            </div>
          )}

          {importSource === "whatsapp_device" && (
            <div className="space-y-3">
              <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4">
                <p className="text-sm text-foreground">Esta funcionalidade sincroniza os contatos da sua instância do WhatsApp conectada via Evolution API.</p>
                <p className="text-xs text-muted-foreground mt-2">Certifique-se de que sua instância está ativa e conectada na aba "Instâncias".</p>
              </div>
              <Button className="w-full" disabled>
                <Smartphone className="h-4 w-4 mr-1" /> Sincronizar Contatos (em breve)
              </Button>
              <Separator />
              <p className="text-xs text-muted-foreground">Enquanto isso, exporte seus contatos pelo WhatsApp e importe via CSV:</p>
              <Button variant="outline" size="sm" onClick={() => setImportSource("csv")}>
                <FileText className="h-4 w-4 mr-1" /> Importar via CSV
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Contact list + Chat */}
      <div className="grid md:grid-cols-[300px_1fr] gap-4 min-h-[500px]">
        {/* Contact List */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar contato..." className="pl-9" />
          </div>
          <ScrollArea className="h-[450px]">
            <div className="space-y-1">
              {filtered.map((c) => (
                <div key={c.phone} className={`flex items-center gap-2 p-3 rounded-lg transition-colors cursor-pointer ${selectedPhone === c.phone ? "bg-primary/10 border border-primary/20" : "hover:bg-muted"}`}>
                  <button onClick={() => setSelectedPhone(c.phone)} className="flex-1 text-left min-w-0">
                    <p className="font-medium text-sm truncate">{c.name || c.phone}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">{c.phone}</p>
                      <Badge variant="outline" className="text-[9px] px-1 py-0">{sourceLabels[c.source] || c.source}</Badge>
                    </div>
                  </button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100" onClick={() => deleteContact(c.phone)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))}
              {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhum contato encontrado</p>}
            </div>
          </ScrollArea>
        </div>

        {/* Chat Timeline */}
        <Card>
          <CardContent className="p-4">
            {selectedPhone ? (
              <div>
                <div className="flex items-center gap-2 mb-4 pb-3 border-b">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{selectedLogs[0]?.contact_name || allContacts.find(c => c.phone === selectedPhone)?.name || selectedPhone}</p>
                    <p className="text-xs text-muted-foreground">{selectedPhone}</p>
                  </div>
                </div>
                <ScrollArea className="h-[400px]">
                  {selectedLogs.length > 0 ? (
                    <div className="space-y-3 rounded-lg bg-muted/40 p-4">
                      {selectedLogs.map((log) => (
                        <div key={log.id} className={`flex ${log.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[80%] rounded-lg p-3 shadow-sm ${log.direction === "outbound" ? "bg-primary/10" : "bg-card"}`}>
                            <p className="text-sm whitespace-pre-wrap">{log.message_content}</p>
                            <div className="flex items-center justify-end gap-1 mt-1">
                              <span className="text-[10px] text-muted-foreground">{new Date(log.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                              {log.status === "sent" ? <CheckCircle className="h-3 w-3 text-primary" /> : <XCircle className="h-3 w-3 text-destructive" />}
                            </div>
                            {log.error_message && <p className="text-[10px] text-destructive mt-1">{log.error_message}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[350px] text-muted-foreground">
                      <MessageSquare className="h-10 w-10 mb-2 opacity-30" />
                      <p className="text-sm">Nenhuma mensagem com este contato</p>
                    </div>
                  )}
                </ScrollArea>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[450px] text-muted-foreground">
                <MessageSquare className="h-12 w-12 mb-3 opacity-40" />
                <p>Selecione um contato para ver o histórico</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ==================== QUEUE TAB ====================
function QueueTab() {
  const [queue, setQueue] = useState<QueueItem[]>([]);

  useEffect(() => { loadQueue(); }, []);

  async function loadQueue() {
    const { data } = await supabase.from("whatsapp_message_queue").select("*").in("status", ["pending", "failed"]).order("scheduled_at").limit(100);
    setQueue((data || []) as unknown as QueueItem[]);
  }

  async function cancelMessage(id: string) {
    await supabase.from("whatsapp_message_queue").update({ status: "cancelled" }).eq("id", id);
    loadQueue();
  }

  async function retryMessage(id: string) {
    await supabase.from("whatsapp_message_queue").update({ status: "pending", retry_count: 0, scheduled_at: new Date().toISOString() }).eq("id", id);
    loadQueue();
  }

  async function processQueue() {
    try {
      const res = await supabase.functions.invoke("whatsapp-process-queue");
      toast.success(`Processado: ${res.data?.processed || 0} mensagens`);
      loadQueue();
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Fila de Envio ({queue.length})</h3>
        <Button onClick={processQueue} size="sm"><Zap className="h-4 w-4 mr-1" /> Processar Fila</Button>
      </div>

      {queue.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Clock className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>Fila vazia</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {queue.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`${item.status === "failed" ? "text-red-500" : "text-amber-500"}`}>
                  {item.status === "failed" ? <XCircle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{item.contact_name || item.contact_phone}</span>
                    <Badge variant={item.status === "failed" ? "destructive" : "secondary"} className="text-[10px]">
                      {item.status === "failed" ? `Falhou (${item.retry_count}x)` : "Pendente"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{item.message_content}</p>
                  <p className="text-[10px] text-muted-foreground">Agendado: {new Date(item.scheduled_at).toLocaleString("pt-BR")}</p>
                  {item.error_message && <p className="text-[10px] text-red-500 line-clamp-1">{item.error_message}</p>}
                </div>
                <div className="flex gap-1">
                  {item.status === "failed" && (
                    <Button size="sm" variant="outline" onClick={() => retryMessage(item.id)}><RefreshCw className="h-3.5 w-3.5" /></Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => cancelMessage(item.id)}><XCircle className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== MAIN PAGE ====================
export default function WhatsAppPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-green-600" /> WhatsApp Automação
        </h1>
        <p className="text-sm text-muted-foreground">Envio automatizado via Evolution API com rotação e spintax</p>
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="dashboard" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Dashboard</TabsTrigger>
          <TabsTrigger value="instances" className="gap-1.5"><Smartphone className="h-3.5 w-3.5" /> WhatsApps</TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Templates</TabsTrigger>
          <TabsTrigger value="funnels" className="gap-1.5"><GitBranch className="h-3.5 w-3.5" /> Funis</TabsTrigger>
          <TabsTrigger value="contacts" className="gap-1.5"><Users className="h-3.5 w-3.5" /> Contatos</TabsTrigger>
          <TabsTrigger value="queue" className="gap-1.5"><Clock className="h-3.5 w-3.5" /> Fila</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><DashboardTab /></TabsContent>
        <TabsContent value="instances"><InstancesTab /></TabsContent>
        <TabsContent value="templates"><TemplatesTab /></TabsContent>
        <TabsContent value="funnels"><FunnelsTab /></TabsContent>
        <TabsContent value="contacts"><ContactsTab /></TabsContent>
        <TabsContent value="queue"><QueueTab /></TabsContent>
      </Tabs>
    </div>
  );
}
