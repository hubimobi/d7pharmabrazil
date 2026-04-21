import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
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
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import {
  MessageSquare, Smartphone, FileText, GitBranch, Users, BarChart3,
  Plus, RefreshCw, QrCode, Wifi, WifiOff, Trash2, Edit, Play, Pause,
  Send, Clock, AlertTriangle, CheckCircle, XCircle, Eye, Search,
  Zap, Settings2, Shuffle, Upload, Phone, Mail, UserPlus, Download, Inbox,
  ArrowRightLeft, Flag, Paperclip, Volume2, Link2, ChevronDown, ChevronRight, GripVertical,
  Bot, UserCheck, ArrowRight, ArrowUp, ArrowDown, Megaphone, Filter, Loader2,
  Folder, FolderPlus, FolderOpen, FolderInput,
  Tag, Briefcase, Stethoscope, Package, MapPin, CheckCheck, AlertCircle,
  Hourglass, TrendingUp
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConversationsTab from "@/components/admin/WhatsAppConversations";
import WhatsAppFlowEditor from "@/components/admin/WhatsAppFlowEditor";
import { Checkbox } from "@/components/ui/checkbox";
import { MessageComposer } from "@/components/admin/MessageComposer";

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
  folder_id?: string | null;
}
interface TemplateFolder {
  id: string; name: string; color: string; sort_order: number;
}
interface WhatsAppFunnel {
  id: string; name: string; type: string; trigger_event: string;
  active: boolean; created_at: string;
}
interface FunnelStep {
  id: string; funnel_id: string; step_order: number; delay_minutes: number;
  template_id: string | null; instance_id: string | null; active: boolean;
  step_type: string; config: any; label: string;
}

type StepType = "message_template" | "message_custom" | "pause" | "send_file" | "condition" | "transfer" | "end";

const STEP_TYPE_OPTIONS: Array<{ value: StepType; label: string; icon: any; color: string; description: string }> = [
  { value: "message_template", label: "Mensagem Template", icon: FileText, color: "bg-blue-500/10 text-blue-600 border-blue-200", description: "Envia um template existente" },
  { value: "message_custom", label: "Mensagem Livre", icon: MessageSquare, color: "bg-green-500/10 text-green-600 border-green-200", description: "Envia mensagem personalizada" },
  { value: "pause", label: "Pausa", icon: Clock, color: "bg-amber-500/10 text-amber-600 border-amber-200", description: "Aguarda um tempo antes de continuar" },
  { value: "send_file", label: "Enviar Arquivo/Link", icon: Paperclip, color: "bg-purple-500/10 text-purple-600 border-purple-200", description: "Envia arquivo, áudio ou link rastreável" },
  { value: "condition", label: "Condicional", icon: ArrowRightLeft, color: "bg-orange-500/10 text-orange-600 border-orange-200", description: "Avalia condição e direciona fluxo" },
  { value: "transfer", label: "Transferir", icon: UserCheck, color: "bg-cyan-500/10 text-cyan-600 border-cyan-200", description: "Transfere para agente IA, representante ou usuário" },
  { value: "end", label: "Finalizar", icon: Flag, color: "bg-red-500/10 text-red-600 border-red-200", description: "Encerra o funil" },
];
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
  const [form, setForm] = useState<{ name: string; funnel_roles: FunnelRole[] }>({
    name: "",
    funnel_roles: ["all"],
  });
  const [loading, setLoading] = useState(false);
  const [qrDialog, setQrDialog] = useState<{
    open: boolean;
    qr: string | null;
    id: string;
    pollStatus: "waiting" | "connecting" | "connected";
    pollStartedAt: number;
  }>({ open: false, qr: null, id: "", pollStatus: "waiting", pollStartedAt: 0 });
  const [refreshingQr, setRefreshingQr] = useState(false);
  const [evoConfig, setEvoConfig] = useState<{ url: string; key: string } | null>(null);

  useEffect(() => { (async () => { await loadInstances(); await loadEvoConfig(); await refreshAllStatuses(); })(); }, []);

  // Poll connection status while QR dialog is open
  useEffect(() => {
    if (!qrDialog.open || !qrDialog.id) return;
    if (qrDialog.pollStatus === "connected") return;

    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const res = await supabase.functions.invoke("whatsapp-instance", {
          body: { action: "status", instance_id: qrDialog.id },
        });
        if (cancelled) return;
        const rawState: string = res.data?.raw_state || res.data?.state || "";
        const status: string = res.data?.status || "";
        const isConnected = rawState === "open" || status === "connected";
        const isPairing = rawState === "connecting" && (status === "connecting" || status === "pairing");

        if (isConnected) {
          setQrDialog((prev) => ({ ...prev, pollStatus: "connected" }));
          toast.success("WhatsApp conectado com sucesso!");
          loadInstances();
          setTimeout(() => {
            setQrDialog({ open: false, qr: null, id: "", pollStatus: "waiting", pollStartedAt: 0 });
          }, 2000);
        } else if (isPairing) {
          setQrDialog((prev) => (prev.pollStatus === "waiting" ? { ...prev, pollStatus: "connecting" } : prev));
        }
      } catch {
        // silent — keep polling
      }
    }, 3000);

    return () => { cancelled = true; clearInterval(interval); };
  }, [qrDialog.open, qrDialog.id, qrDialog.pollStatus]);

  async function refreshQr() {
    if (!qrDialog.id) return;
    setRefreshingQr(true);
    try {
      const res = await supabase.functions.invoke("whatsapp-instance", {
        body: { action: "qrcode", instance_id: qrDialog.id },
      });
      if (res.data?.qrcode) {
        setQrDialog((prev) => ({ ...prev, qr: res.data.qrcode, pollStatus: "waiting", pollStartedAt: Date.now() }));
        toast.success("Novo QR Code gerado");
      } else {
        toast.error(res.data?.error || "Não foi possível gerar novo QR");
      }
    } catch (e: any) {
      toast.error(e.message);
    }
    setRefreshingQr(false);
  }

  async function refreshAllStatuses() {
    const { data } = await supabase.from("whatsapp_instances").select("id, status, active").eq("active", true);
    const list = (data || []) as Array<{ id: string; status: string }>;
    // Only refresh those not yet "connected" — avoid hammering Evolution for healthy ones
    const targets = list.filter((i) => i.status !== "connected");
    if (targets.length === 0) return;
    await Promise.all(
      targets.map((i) =>
        supabase.functions.invoke("whatsapp-instance", { body: { action: "status", instance_id: i.id } }).catch(() => null)
      )
    );
    await loadInstances();
  }

  async function loadEvoConfig() {
    const { data } = await supabase.from("store_settings").select("evolution_api_url, evolution_api_key").limit(1).single();
    if (data) {
      setEvoConfig({ url: (data as any).evolution_api_url || "", key: (data as any).evolution_api_key || "" });
    }
  }

  async function loadInstances() {
    const { data } = await supabase.from("whatsapp_instances").select("*").order("created_at", { ascending: false });
    setInstances((data || []) as unknown as WhatsAppInstance[]);
  }

  async function createInstance() {
    if (!form.name) { toast.error("Preencha o nome"); return; }
    if (!evoConfig?.url || !evoConfig?.key) {
      toast.error("Configure a Evolution API em Integrações primeiro!");
      return;
    }
    setLoading(true);
    try {
      const res = await supabase.functions.invoke("whatsapp-instance", {
        body: {
          action: "create",
          name: form.name,
          api_url: evoConfig.url,
          api_key: evoConfig.key,
          funnel_roles: normalizeFunnelRoles(form.funnel_roles),
        },
      });
      if (res.error) {
        const body = typeof res.error === "object" && "context" in res.error ? await (res.error as any).context?.json?.().catch(() => null) : null;
        const msg = body?.error || res.data?.error || res.error?.message || "Erro ao criar instância";
        if (body?.retryable || res.data?.retryable) { toast.warning(msg); } else { toast.error(msg); }
        setLoading(false); return;
      }
      toast.success("Instância criada!");
      if (res.data?.qrcode) {
        setQrDialog({ open: true, qr: res.data.qrcode, id: res.data.instance?.id, pollStatus: "waiting", pollStartedAt: Date.now() });
      }
      setForm({ name: "", funnel_roles: ["all"] });
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
      if (res.error || res.data?.error) {
        const msg = res.data?.error || "Erro ao obter QR Code";
        if (res.data?.retryable) { toast.warning(msg); } else { toast.error(msg); }
        return;
      }
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
      if (res.error || res.data?.error) {
        const msg = res.data?.error || "Erro ao verificar status";
        if (res.data?.retryable) {
          toast.warning(`${msg}. Status salvo: ${inst.status}`);
        } else {
          toast.error(msg);
        }
        return;
      }
      const status = res.data?.status || "desconhecido";
      const rawState = res.data?.raw_state;
      if (status === "unknown") {
        toast.warning(`Evolution API indisponível. Status salvo: ${inst.status}`);
      } else if (rawState === "connecting") {
        toast.warning(`Estado real Evolution: connecting (aguardando QR/pareamento). Escaneie o QR Code agora.`);
      } else if (rawState === "open") {
        toast.success(`✅ Conectada (state=open) — pronta para receber mensagens`);
      } else {
        toast.info(`Status: ${status} (raw=${rawState || "?"})`);
      }
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
      connecting: { label: "Conectando…", variant: "secondary" },
      qr_ready: { label: "Aguardando QR", variant: "secondary" },
    };
    const info = map[s] || { label: s, variant: "outline" as const };
    return <Badge variant={info.variant}>{info.label}</Badge>;
  };

  // Detect instances stuck in "connecting" or "qr_ready" — webhook diagnoses pareamento incompleto
  const stuckInstances = instances.filter(i => i.active && (i.status === "connecting" || i.status === "qr_ready"));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">WhatsApps Conectados</h3>
        <Button onClick={() => setShowAdd(true)} size="sm"><Plus className="h-4 w-4 mr-1" /> Nova Instância</Button>
      </div>

      {stuckInstances.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 text-sm">
              <p className="font-semibold text-amber-900 dark:text-amber-200">
                {stuckInstances.length === 1 ? "1 instância" : `${stuckInstances.length} instâncias`} aguardando pareamento
              </p>
              <p className="text-amber-800 dark:text-amber-300 text-xs mt-1">
                {stuckInstances.map(i => i.name).join(", ")} — não terminou o pareamento via QR Code.
                Sem isso, a Evolution API não envia eventos de mensagens e nenhuma conversa entra. Clique em <strong>QR Code</strong> e escaneie em até 60 segundos com o WhatsApp do celular (Aparelhos conectados → Conectar aparelho).
              </p>
            </div>
          </CardContent>
        </Card>
      )}

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
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => getQR(inst)}><QrCode className="h-3.5 w-3.5 mr-1" /> QR Code</Button>
                  <Button size="sm" variant="outline" onClick={() => checkStatus(inst)}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Status</Button>
                  <Button size="sm" variant="outline" onClick={async () => {
                    try {
                      const res = await supabase.functions.invoke("whatsapp-instance", {
                        body: { action: "set_webhook", instance_id: inst.id },
                      });
                      if (res.error || res.data?.error) {
                        const msg = res.data?.error || "Falha ao configurar webhook";
                        if (res.data?.retryable) toast.warning(msg); else toast.error(msg);
                      } else if (res.data?.webhook_configured) {
                        toast.success("Webhook configurado com sucesso!");
                      } else {
                        toast.error("Falha ao configurar webhook");
                      }
                    } catch (e: any) { toast.error(e.message); }
                  }}><Zap className="h-3.5 w-3.5 mr-1" /> Webhook</Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteInstance(inst.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Instância WhatsApp</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: WhatsApp Vendas 1" /></div>
            {(!evoConfig?.url || !evoConfig?.key) && (
              <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
                ⚠️ Configure a Evolution API em <strong>Integrações</strong> antes de criar instâncias.
              </div>
            )}
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
  const [folders, setFolders] = useState<TemplateFolder[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<WhatsAppTemplate | null>(null);
  const [form, setForm] = useState({ name: "", category: "geral", content: "", folder_id: "none" as string });
  const [preview, setPreview] = useState("");
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [editingFolder, setEditingFolder] = useState<TemplateFolder | null>(null);
  const [folderForm, setFolderForm] = useState({ name: "", color: "#10b981" });
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [moveDialog, setMoveDialog] = useState<WhatsAppTemplate | null>(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const [{ data: t }, { data: f }] = await Promise.all([
      supabase.from("whatsapp_templates").select("*").order("created_at", { ascending: false }),
      supabase.from("whatsapp_template_folders").select("*").order("sort_order").order("name"),
    ]);
    setTemplates((t || []) as unknown as WhatsAppTemplate[]);
    setFolders((f || []) as unknown as TemplateFolder[]);
  }

  function generatePreview(content: string) {
    let text = content;
    text = text.replace(/\{Nome\}/g, "João").replace(/\{Produto\}/g, "Creatina 300g")
      .replace(/\{Link\}/g, "https://loja.com/checkout").replace(/\{Cidade\}/g, "São Paulo")
      .replace(/\{Nome_da_Empresa\}/g, "D7 Pharma").replace(/\{Atendente\}/g, "Equipe");
    setPreview(parseSpintax(text));
  }

  function openEditor(tpl?: WhatsAppTemplate, folderIdHint?: string | null) {
    if (tpl) {
      setEditing(tpl);
      setForm({ name: tpl.name, category: tpl.category, content: tpl.content, folder_id: tpl.folder_id || "none" });
      generatePreview(tpl.content);
    } else {
      setEditing(null);
      setForm({ name: "", category: "geral", content: "", folder_id: folderIdHint || "none" });
      setPreview("");
    }
    setShowEditor(true);
  }

  async function saveTemplate() {
    if (!form.name || !form.content) { toast.error("Preencha nome e conteúdo"); return; }
    const payload: any = {
      name: form.name,
      category: form.category,
      content: form.content,
      folder_id: form.folder_id === "none" ? null : form.folder_id,
    };
    if (editing) {
      await supabase.from("whatsapp_templates").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("whatsapp_templates").insert(payload);
    }
    toast.success("Template salvo!");
    setShowEditor(false);
    loadAll();
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Excluir template?")) return;
    await supabase.from("whatsapp_templates").delete().eq("id", id);
    toast.success("Template excluído");
    loadAll();
  }

  async function moveTemplate(tpl: WhatsAppTemplate, folderId: string | null) {
    await supabase.from("whatsapp_templates").update({ folder_id: folderId } as any).eq("id", tpl.id);
    toast.success(folderId ? "Movido para pasta" : "Movido para Avulsas");
    setMoveDialog(null);
    loadAll();
  }

  function openFolderDialog(folder?: TemplateFolder) {
    if (folder) {
      setEditingFolder(folder);
      setFolderForm({ name: folder.name, color: folder.color });
    } else {
      setEditingFolder(null);
      setFolderForm({ name: "", color: "#10b981" });
    }
    setShowFolderDialog(true);
  }

  async function saveFolder() {
    if (!folderForm.name.trim()) { toast.error("Informe o nome da pasta"); return; }
    if (editingFolder) {
      await supabase.from("whatsapp_template_folders").update(folderForm).eq("id", editingFolder.id);
    } else {
      await supabase.from("whatsapp_template_folders").insert({ ...folderForm, sort_order: folders.length });
    }
    toast.success("Pasta salva!");
    setShowFolderDialog(false);
    loadAll();
  }

  async function deleteFolder(folder: TemplateFolder) {
    const count = templates.filter((t) => t.folder_id === folder.id).length;
    if (!confirm(`Excluir pasta "${folder.name}"?${count > 0 ? `\n${count} template(s) virarão Avulsos.` : ""}`)) return;
    await supabase.from("whatsapp_template_folders").delete().eq("id", folder.id);
    toast.success("Pasta excluída");
    loadAll();
  }

  function toggleFolder(id: string) {
    setCollapsedFolders((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const categories: Record<string, string> = {
    geral: "Geral", recuperacao: "Recuperação", recompra: "Recompra",
    upsell: "Upsell", novidades: "Novidades", feedback: "Feedback",
  };

  const orphanTemplates = templates.filter((t) => !t.folder_id);

  function renderTemplateCard(tpl: WhatsAppTemplate) {
    return (
      <Card key={tpl.id}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">{tpl.name}</span>
                <Badge variant="outline" className="text-[10px]">{categories[tpl.category] || tpl.category}</Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2" style={{ fontFamily: "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', system-ui, sans-serif" }}>{tpl.content}</p>
            </div>
            <div className="flex gap-1 ml-2">
              <Button size="icon" variant="ghost" className="h-8 w-8" title="Mover para pasta" onClick={() => setMoveDialog(tpl)}><FolderInput className="h-3.5 w-3.5" /></Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditor(tpl)}><Edit className="h-3.5 w-3.5" /></Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteTemplate(tpl.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Templates de Mensagem</h3>
        <div className="flex gap-2">
          <Button onClick={() => openFolderDialog()} size="sm" variant="outline"><FolderPlus className="h-4 w-4 mr-1" /> Nova Pasta</Button>
          <Button onClick={() => openEditor()} size="sm"><Plus className="h-4 w-4 mr-1" /> Novo Template</Button>
        </div>
      </div>

      {templates.length === 0 && folders.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>Nenhum template ou pasta criada</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {folders.map((folder) => {
            const folderTemplates = templates.filter((t) => t.folder_id === folder.id);
            const collapsed = collapsedFolders[folder.id];
            return (
              <div key={folder.id} className="border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-muted/40">
                  <button
                    type="button"
                    onClick={() => toggleFolder(folder.id)}
                    className="flex items-center gap-2 flex-1 text-left hover:opacity-80 transition-opacity"
                  >
                    {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {collapsed ? <Folder className="h-4 w-4" style={{ color: folder.color }} /> : <FolderOpen className="h-4 w-4" style={{ color: folder.color }} />}
                    <span className="font-medium text-sm">{folder.name}</span>
                    <Badge variant="secondary" className="text-[10px]">{folderTemplates.length}</Badge>
                  </button>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" title="Adicionar template" onClick={() => openEditor(undefined, folder.id)}><Plus className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openFolderDialog(folder)}><Edit className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteFolder(folder)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                {!collapsed && (
                  <div className="p-3 grid gap-2">
                    {folderTemplates.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-3">Pasta vazia</p>
                    ) : folderTemplates.map(renderTemplateCard)}
                  </div>
                )}
              </div>
            );
          })}

          {orphanTemplates.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/40">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">Avulsas</span>
                <Badge variant="secondary" className="text-[10px]">{orphanTemplates.length}</Badge>
              </div>
              <div className="p-3 grid gap-2">
                {orphanTemplates.map(renderTemplateCard)}
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Editar Template" : "Novo Template"}</DialogTitle></DialogHeader>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Recuperação - Lembrete 1" /></div>
              <div>
                <Label>Pasta</Label>
                <Select value={form.folder_id} onValueChange={(v) => setForm({ ...form, folder_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Avulsa (sem pasta)</SelectItem>
                    {folders.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
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
                <MessageComposer
                  value={form.content}
                  onChange={(v) => { setForm({ ...form, content: v }); generatePreview(v); }}
                  placeholder={`{Oi|Olá|E aí} {Nome}, {tudo bem|como vai}?\n\nVi que você deixou {Produto} no carrinho...\n{Link}`}
                  rows={8}
                  className="min-h-[180px] font-mono text-xs"
                />
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
                  <p className="text-sm whitespace-pre-wrap" style={{ fontFamily: "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', system-ui, sans-serif" }}>{preview || "Digite uma mensagem para ver o preview..."}</p>
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

      <Dialog open={showFolderDialog} onOpenChange={setShowFolderDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingFolder ? "Editar Pasta" : "Nova Pasta"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome da pasta</Label>
              <Input value={folderForm.name} onChange={(e) => setFolderForm({ ...folderForm, name: e.target.value })} placeholder="Ex: Recuperação de Carrinho" />
            </div>
            <div>
              <Label>Cor</Label>
              <div className="flex gap-2 items-center">
                <Input type="color" value={folderForm.color} onChange={(e) => setFolderForm({ ...folderForm, color: e.target.value })} className="w-16 h-10 p-1" />
                <Input value={folderForm.color} onChange={(e) => setFolderForm({ ...folderForm, color: e.target.value })} className="flex-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFolderDialog(false)}>Cancelar</Button>
            <Button onClick={saveFolder}>Salvar Pasta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!moveDialog} onOpenChange={(o) => !o && setMoveDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Mover template</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => moveDialog && moveTemplate(moveDialog, null)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded border hover:bg-muted/50 text-left"
            >
              <FileText className="h-4 w-4" /> Avulsas (sem pasta)
            </button>
            {folders.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => moveDialog && moveTemplate(moveDialog, f.id)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded border hover:bg-muted/50 text-left"
              >
                <Folder className="h-4 w-4" style={{ color: f.color }} /> {f.name}
              </button>
            ))}
          </div>
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
  const [realExecuting, setRealExecuting] = useState(false);
  const [testInstanceId, setTestInstanceId] = useState<string>("auto");
  const [testMessages, setTestMessages] = useState<Array<{ id: string; offsetLabel: string; templateName: string; instanceLabel: string; message: string }>>([]);
  const [testPreview, setTestPreview] = useState<Array<{ id: string; offsetLabel: string; configuredLabel: string; templateName: string; instanceLabel: string; message: string; offsetSeconds: number }>>([]);
  const [testForm, setTestForm] = useState({ nome: "Cliente Teste", telefone: "5511999999999", produto: "Produto Exemplo", link: "https://loja.com/checkout", cidade: "São Paulo" });
  const [testContactSource, setTestContactSource] = useState<"manual" | "lead" | "client">("manual");
  const [contactSearch, setContactSearch] = useState("");
  const [contactResults, setContactResults] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [representatives, setReps] = useState<any[]>([]);
  const simulationTimersRef = useRef<number[]>([]);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  useEffect(() => { loadAll(); }, []);
  useEffect(() => {
    setDelayDrafts((current) => {
      const next: Record<string, { value: string; unit: DelayUnit }> = {};
      for (const step of steps) { if (current[step.id]) next[step.id] = current[step.id]; }
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
    const [{ data: f }, { data: t }, { data: i }, { data: s }, { data: ag }, { data: rp }] = await Promise.all([
      supabase.from("whatsapp_funnels").select("*").order("created_at", { ascending: false }),
      supabase.from("whatsapp_templates").select("*").eq("active", true),
      supabase.from("whatsapp_instances").select("*").eq("active", true),
      supabase.from("whatsapp_funnel_steps").select("*").order("step_order"),
      supabase.from("ai_agents").select("id, name").eq("active", true),
      supabase.from("representatives").select("id, name").eq("active", true),
    ]);
    setFunnels((f || []) as unknown as WhatsAppFunnel[]);
    setTemplates((t || []) as unknown as WhatsAppTemplate[]);
    setInstances((i || []) as unknown as WhatsAppInstance[]);
    setSteps((s || []) as unknown as FunnelStep[]);
    setAgents(ag || []);
    setReps(rp || []);
  }

  const funnelTypes: Record<string, string> = { recuperacao: "🛒 Recuperação", recompra: "🔁 Recompra", upsell: "📦 Upsell", novidades: "🆕 Novidades" };
  const triggerEvents: Record<string, string> = { carrinho_abandonado: "Carrinho Abandonado", compra_confirmada: "Compra Confirmada", entrega_confirmada: "Entrega Confirmada", recompra_aviso: "Aviso de Recompra", campanha_manual: "Campanha Manual" };

  function openEditor(funnel?: WhatsAppFunnel) {
    if (funnel) { setEditing(funnel); setForm({ name: funnel.name, type: funnel.type, trigger_event: funnel.trigger_event }); }
    else { setEditing(null); setForm({ name: "", type: "recuperacao", trigger_event: "carrinho_abandonado" }); }
    setShowEditor(true);
  }
  async function saveFunnel() {
    if (!form.name) { toast.error("Preencha o nome"); return; }
    if (editing) await supabase.from("whatsapp_funnels").update(form).eq("id", editing.id);
    else await supabase.from("whatsapp_funnels").insert(form);
    toast.success("Funil salvo!"); setShowEditor(false); loadAll();
  }
  async function toggleFunnel(f: WhatsAppFunnel) { await supabase.from("whatsapp_funnels").update({ active: !f.active }).eq("id", f.id); loadAll(); }
  async function deleteFunnel(id: string) { if (!confirm("Excluir funil e todas as etapas?")) return; await supabase.from("whatsapp_funnels").delete().eq("id", id); toast.success("Funil excluído"); loadAll(); }

  async function addStep(funnelId: string, stepType: StepType = "message_template") {
    const funnelSteps = steps.filter((s) => s.funnel_id === funnelId);
    const nextOrder = funnelSteps.length + 1;
    const defaultConfigs: Record<StepType, any> = {
      message_template: {}, message_custom: { content: "" },
      pause: { delay_value: 15, delay_unit: "m" },
      send_file: { file_type: "link", url: "", caption: "", use_shortener: false },
      condition: { condition_type: "replied", expected: true, yes_step_order: 0, no_step_order: 0, wait_for_reply: false, wait_timeout_value: 0, wait_timeout_unit: "h", wait_timeout_date: "" },
      transfer: { transfer_to: "ai_agent", target_id: "" },
      end: { mark_as: "closed" },
    };
    await supabase.from("whatsapp_funnel_steps").insert({
      funnel_id: funnelId, step_order: nextOrder, delay_minutes: 0,
      step_type: stepType, config: defaultConfigs[stepType],
      label: STEP_TYPE_OPTIONS.find(o => o.value === stepType)?.label || "",
    } as any);
    loadAll();
  }
  async function updateStep(stepId: string, updates: Partial<FunnelStep>) { await supabase.from("whatsapp_funnel_steps").update(updates as any).eq("id", stepId); loadAll(); }
  async function updateStepConfig(stepId: string, configUpdates: any) {
    const step = steps.find(s => s.id === stepId);
    if (!step) return;
    await supabase.from("whatsapp_funnel_steps").update({ config: { ...(step.config || {}), ...configUpdates } } as any).eq("id", stepId);
    loadAll();
  }
  async function deleteStep(stepId: string) {
    if (!confirm("Excluir esta etapa?")) return;
    await supabase.from("whatsapp_funnel_steps").delete().eq("id", stepId);
    loadAll();
  }

  async function moveStep(funnelId: string, stepId: string, direction: "up" | "down") {
    const funnelSteps = steps.filter(s => s.funnel_id === funnelId).sort((a, b) => a.step_order - b.step_order);
    const idx = funnelSteps.findIndex(s => s.id === stepId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= funnelSteps.length) return;
    const current = funnelSteps[idx];
    const swap = funnelSteps[swapIdx];
    await Promise.all([
      supabase.from("whatsapp_funnel_steps").update({ step_order: swap.step_order } as any).eq("id", current.id),
      supabase.from("whatsapp_funnel_steps").update({ step_order: current.step_order } as any).eq("id", swap.id),
    ]);
    loadAll();
  }

  function getEligibleInstances(funnelType: string) {
    return instances.filter((inst) => { const roles = normalizeFunnelRoles(inst.funnel_roles); return roles.includes("all") || roles.includes(funnelType as FunnelRole); });
  }
  function getDelayDraft(step: FunnelStep) { return delayDrafts[step.id] || { value: getDelayValue(step.delay_minutes), unit: getDelayUnit(step.delay_minutes) }; }
  async function saveDelayDraft(step: FunnelStep, nextDraft?: { value: string; unit: DelayUnit }) {
    const draft = nextDraft || getDelayDraft(step);
    const delayMinutes = toDelayMinutes(draft.value, draft.unit);
    setDelayDrafts((c) => ({ ...c, [step.id]: { value: getDelayValue(delayMinutes, draft.unit), unit: draft.unit } }));
    await updateStep(step.id, { delay_minutes: delayMinutes });
  }
  function stopSimulation() { simulationTimersRef.current.forEach((t) => window.clearTimeout(t)); simulationTimersRef.current = []; setTestRunning(false); }

  function buildTestSequence(funnel: WhatsAppFunnel, accelerated: boolean) {
    const funnelSteps = steps.filter((s) => s.funnel_id === funnel.id && s.active).sort((a, b) => a.step_order - b.step_order);
    const variables = { Nome: testForm.nome, Produto: testForm.produto, Link: testForm.link, Cidade: testForm.cidade, Nome_da_Empresa: "D7 Pharma", Atendente: "Atendente" };
    let cumSec = 0;
    return funnelSteps.filter(s => s.step_type === "message_template" || s.step_type === "message_custom").map((step, index) => {
      const template = templates.find((t) => t.id === step.template_id);
      const eligible = getEligibleInstances(funnel.type);
      cumSec += Math.round(Number(step.delay_minutes || 0) * 60);
      const offsetSeconds = accelerated ? index * 10 : cumSec;
      const content = step.step_type === "message_custom" ? (step.config?.content || "") : (template?.content || "");
      const message = parseSpintax(replaceTemplateVariables(content, variables));
      const selInst = instances.find((i) => i.id === step.instance_id);
      const instLabel = selInst?.name || (eligible[0]?.name ? `Auto (${eligible[0].name})` : "Auto");
      return { id: step.id, configuredLabel: formatDelay(Number(step.delay_minutes || 0)), offsetLabel: accelerated ? formatOffset(offsetSeconds) : formatOffset(cumSec), templateName: step.step_type === "message_custom" ? "Msg Livre" : (template?.name || "Sem template"), instanceLabel: instLabel, message: message || "Sem conteúdo.", offsetSeconds };
    });
  }

  async function searchContacts(query: string, source: "lead" | "client") {
    setContactSearch(query);
    if (query.length < 2) { setContactResults([]); return; }
    if (source === "lead") {
      const { data } = await supabase.from("popup_leads").select("name, email, phone").or(`name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`).limit(10);
      setContactResults(data || []);
    } else {
      const { data } = await supabase.from("orders").select("customer_name, customer_phone, customer_email").or(`customer_name.ilike.%${query}%,customer_phone.ilike.%${query}%`).limit(10);
      const unique = new Map();
      (data || []).forEach((o: any) => { if (o.customer_phone) unique.set(o.customer_phone, { name: o.customer_name, phone: o.customer_phone, email: o.customer_email }); });
      setContactResults(Array.from(unique.values()));
    }
  }

  function selectContact(c: any) {
    setTestForm(prev => ({
      ...prev,
      nome: c.name || c.customer_name || prev.nome,
      telefone: c.phone || c.customer_phone || prev.telefone,
    }));
    setContactResults([]);
    setContactSearch("");
  }

  function openTestModal(funnel: WhatsAppFunnel) { setTestFunnel(funnel); setShowTestDialog(true); }
  function runTestSimulation() {
    if (!testFunnel) return;
    stopSimulation();
    const seq = buildTestSequence(testFunnel, testAccelerated);
    setTestPreview(seq); setTestMessages([]);
    if (seq.length === 0) { toast.error("Adicione pelo menos uma etapa de mensagem ativa."); return; }
    if (!testAccelerated && (seq[seq.length - 1]?.offsetSeconds || 0) > 120) {
      setTestMessages(seq.map(({ id, offsetLabel, templateName, instanceLabel, message }) => ({ id, offsetLabel, templateName, instanceLabel, message })));
      toast.info("Ative o modo acelerado para executar automaticamente."); return;
    }
    setTestRunning(true);
    seq.forEach((item) => { simulationTimersRef.current.push(window.setTimeout(() => { setTestMessages((c) => [...c, { id: item.id, offsetLabel: item.offsetLabel, templateName: item.templateName, instanceLabel: item.instanceLabel, message: item.message }]); }, item.offsetSeconds * 1000)); });
    simulationTimersRef.current.push(window.setTimeout(() => setTestRunning(false), (seq[seq.length - 1]?.offsetSeconds || 0) * 1000 + 300));
  }

  async function runRealExecution() {
    if (!testFunnel) return;
    if (!testForm.telefone || testForm.telefone.length < 10) {
      toast.error("Preencha um telefone válido para executar."); return;
    }
    setRealExecuting(true);
    try {
      const payload: any = {
        evento: testFunnel.trigger_event,
        nome: testForm.nome,
        telefone: testForm.telefone,
        produto: testForm.produto,
        link: testForm.link,
        cidade: testForm.cidade,
        funnel_id: testFunnel.id,
        force: true,
        ...(testInstanceId !== "auto" ? { instance_id: testInstanceId } : {}),
      };
      const res = await supabase.functions.invoke("whatsapp-webhook", { body: payload });
      if (res.error) throw res.error;
      const data = res.data as any;
      toast.success(`Funil executado! ${data?.queued || 0} mensagem(ns) na fila.`);
    } catch (err: any) {
      toast.error("Erro ao executar funil: " + (err.message || "Erro desconhecido"));
    } finally {
      setRealExecuting(false);
    }
  }

  function getStepTypeInfo(type: string) { return STEP_TYPE_OPTIONS.find(o => o.value === type) || STEP_TYPE_OPTIONS[0]; }

  function renderStepSummary(step: FunnelStep) {
    const config = step.config || {};
    switch (step.step_type) {
      case "message_template": { const tpl = templates.find(t => t.id === step.template_id); return tpl ? `Template: "${tpl.name}"` : "Selecione um template"; }
      case "message_custom": return config.content ? `"${String(config.content).substring(0, 60)}${String(config.content).length > 60 ? "..." : ""}"` : "Mensagem vazia";
      case "pause": { const units: Record<string, string> = { m: "minutos", h: "horas", d: "dias" }; return `Aguardar ${config.delay_value || 0} ${units[config.delay_unit] || "minutos"}`; }
      case "send_file": { const types: Record<string, string> = { file: "📄 Arquivo", audio: "🎵 Áudio", link: "🔗 Link" }; return `${types[config.file_type] || "Arquivo"}: ${config.url ? String(config.url).substring(0, 40) : "Não configurado"}`; }
      case "condition": { const conds: Record<string, string> = { replied: "Respondeu", tag_added: "Tag adicionada", clicked_link: "Clicou no link", accessed_link: "Acessou link" }; const waitInfo = config.wait_for_reply ? (config.wait_timeout_value > 0 ? ` (aguarda ${config.wait_timeout_value}${config.wait_timeout_unit})` : config.wait_timeout_date ? ` (até ${config.wait_timeout_date})` : " (aguarda indefinidamente)") : ""; return `${conds[config.condition_type] || "Condição"}?${waitInfo}`; }
      case "transfer": { const targets: Record<string, string> = { ai_agent: "🤖 Agente IA", representative: "👤 Representante", user: "👨‍💼 Usuário" }; return targets[config.transfer_to] || "Transferir"; }
      case "end": return `Finalizar (${config.mark_as || "closed"})`;
      default: return "";
    }
  }

  function renderStepEditor(step: FunnelStep, funnel: WhatsAppFunnel) {
    const config = step.config || {};
    const funnelSteps = steps.filter(s => s.funnel_id === funnel.id).sort((a, b) => a.step_order - b.step_order);
    switch (step.step_type) {
      case "message_template":
        return (<div className="grid grid-cols-2 gap-3">
          <div><Label className="text-[10px]">Template</Label>
            <Select value={step.template_id || ""} onValueChange={(v) => updateStep(step.id, { template_id: v || null })}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select></div>
          <div><Label className="text-[10px]">WhatsApp</Label>
            <Select value={step.instance_id || "auto"} onValueChange={(v) => updateStep(step.id, { instance_id: v === "auto" ? null : v })}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="auto">🔄 Automático</SelectItem>{getEligibleInstances(funnel.type).map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent></Select></div>
        </div>);
      case "message_custom":
        return (<div className="space-y-2">
          <Textarea value={config.content || ""} onChange={(e) => updateStepConfig(step.id, { content: e.target.value })} placeholder="Olá {Nome}, tudo bem? ..." className="min-h-[80px] text-xs font-mono" />
          <div className="flex flex-wrap gap-1">{["{Nome}", "{Produto}", "{Link}", "{Cidade}"].map((v) => (<Badge key={v} variant="secondary" className="cursor-pointer text-[10px]" onClick={() => updateStepConfig(step.id, { content: (config.content || "") + v })}>{v}</Badge>))}</div>
          <div><Label className="text-[10px]">WhatsApp</Label>
            <Select value={step.instance_id || "auto"} onValueChange={(v) => updateStep(step.id, { instance_id: v === "auto" ? null : v })}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="auto">🔄 Automático</SelectItem>{getEligibleInstances(funnel.type).map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent></Select></div>
        </div>);
      case "pause":
        return (<div className="flex items-center gap-2">
          <div><Label className="text-[10px]">Valor</Label><Input type="number" min={0} value={config.delay_value || 0} className="h-8 text-xs w-20" onChange={(e) => updateStepConfig(step.id, { delay_value: Number(e.target.value) })} /></div>
          <div><Label className="text-[10px]">Unidade</Label>
            <Select value={config.delay_unit || "m"} onValueChange={(v) => updateStepConfig(step.id, { delay_unit: v })}><SelectTrigger className="h-8 text-xs w-24"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="m">Minutos</SelectItem><SelectItem value="h">Horas</SelectItem><SelectItem value="d">Dias</SelectItem></SelectContent></Select></div>
        </div>);
      case "send_file":
        return (<div className="space-y-2">
          <div><Label className="text-[10px]">Tipo</Label>
            <Select value={config.file_type || "link"} onValueChange={(v) => updateStepConfig(step.id, { file_type: v })}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="file">📄 Arquivo</SelectItem><SelectItem value="audio">🎵 Áudio</SelectItem><SelectItem value="link">🔗 Link</SelectItem></SelectContent></Select></div>
          <div><Label className="text-[10px]">URL</Label><Input value={config.url || ""} className="h-8 text-xs" placeholder="https://..." onChange={(e) => updateStepConfig(step.id, { url: e.target.value })} /></div>
          {config.file_type !== "audio" && <div><Label className="text-[10px]">Legenda</Label><Input value={config.caption || ""} className="h-8 text-xs" placeholder="Descrição..." onChange={(e) => updateStepConfig(step.id, { caption: e.target.value })} /></div>}
          {config.file_type === "link" && <div className="flex items-center gap-2"><Switch checked={config.use_shortener || false} onCheckedChange={(v) => updateStepConfig(step.id, { use_shortener: v })} /><Label className="text-xs">Encurtador com rastreamento</Label></div>}
        </div>);
      case "condition":
        return (<div className="space-y-3">
          <div><Label className="text-[10px]">Tipo de condição</Label>
            <Select value={config.condition_type || "replied"} onValueChange={(v) => updateStepConfig(step.id, { condition_type: v })}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="replied">Respondeu à mensagem</SelectItem><SelectItem value="tag_added">Tag adicionada</SelectItem><SelectItem value="clicked_link">Clicou no link</SelectItem><SelectItem value="accessed_link">Acessou o link</SelectItem></SelectContent></Select></div>
          {config.condition_type === "tag_added" && <div><Label className="text-[10px]">Nome da Tag</Label><Input value={config.tag_name || ""} className="h-8 text-xs" placeholder="ex: comprador" onChange={(e) => updateStepConfig(step.id, { tag_name: e.target.value })} /></div>}

          {(config.condition_type === "replied") && (
            <div className="border border-amber-200 rounded-md p-2 bg-amber-50/50 space-y-2">
              <div className="flex items-center gap-2">
                <Switch checked={config.wait_for_reply || false} onCheckedChange={(v) => updateStepConfig(step.id, { wait_for_reply: v, wait_timeout_value: v ? (config.wait_timeout_value || 0) : 0, wait_timeout_unit: config.wait_timeout_unit || "h", wait_timeout_date: "" })} />
                <Label className="text-[10px] font-medium text-amber-700">⏸️ Pausar até responder</Label>
              </div>
              {config.wait_for_reply && (
                <div className="space-y-2 pl-1">
                  <div><Label className="text-[10px] text-muted-foreground">Limite de espera (opcional — vazio = aguarda indefinidamente)</Label></div>
                  <div className="flex items-center gap-2">
                    <Select value={config.wait_timeout_type || "duration"} onValueChange={(v) => updateStepConfig(step.id, { wait_timeout_type: v, wait_timeout_value: 0, wait_timeout_date: "" })}>
                      <SelectTrigger className="h-7 text-xs w-[130px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="duration">Tempo relativo</SelectItem>
                        <SelectItem value="date">Data específica</SelectItem>
                        <SelectItem value="none">Sem limite</SelectItem>
                      </SelectContent>
                    </Select>
                    {(config.wait_timeout_type || "duration") === "duration" && (
                      <div className="flex items-center gap-1 flex-1">
                        <Input type="number" min={0} value={config.wait_timeout_value || ""} className="h-7 text-xs w-16" placeholder="0" onChange={(e) => updateStepConfig(step.id, { wait_timeout_value: Number(e.target.value) })} />
                        <Select value={config.wait_timeout_unit || "h"} onValueChange={(v) => updateStepConfig(step.id, { wait_timeout_unit: v })}>
                          <SelectTrigger className="h-7 text-xs w-[90px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="m">Minutos</SelectItem>
                            <SelectItem value="h">Horas</SelectItem>
                            <SelectItem value="d">Dias</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {(config.wait_timeout_type) === "date" && (
                      <Input type="datetime-local" value={config.wait_timeout_date || ""} className="h-7 text-xs flex-1" onChange={(e) => updateStepConfig(step.id, { wait_timeout_date: e.target.value })} />
                    )}
                  </div>
                  <p className="text-[9px] text-muted-foreground">Se o tempo expirar sem resposta, segue pelo caminho "NÃO".</p>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-[10px] text-green-600">✅ Se SIM → Etapa</Label>
              <Select value={String(config.yes_step_order || 0)} onValueChange={(v) => updateStepConfig(step.id, { yes_step_order: Number(v) })}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="0">Próxima etapa</SelectItem>{funnelSteps.map(s => <SelectItem key={s.id} value={String(s.step_order)}>Etapa {s.step_order}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-[10px] text-red-600">❌ Se NÃO → Etapa</Label>
              <Select value={String(config.no_step_order || 0)} onValueChange={(v) => updateStepConfig(step.id, { no_step_order: Number(v) })}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="0">Próxima etapa</SelectItem>{funnelSteps.map(s => <SelectItem key={s.id} value={String(s.step_order)}>Etapa {s.step_order}</SelectItem>)}</SelectContent></Select></div>
          </div>
        </div>);
      case "transfer":
        return (<div className="space-y-2">
          <div><Label className="text-[10px]">Transferir para</Label>
            <Select value={config.transfer_to || "ai_agent"} onValueChange={(v) => updateStepConfig(step.id, { transfer_to: v, target_id: "" })}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ai_agent">🤖 Agente de IA</SelectItem><SelectItem value="representative">👤 Representante</SelectItem><SelectItem value="user">👨‍💼 Usuário</SelectItem></SelectContent></Select></div>
          {config.transfer_to === "ai_agent" && agents.length > 0 && (
            <div><Label className="text-[10px]">Selecionar Agente</Label>
              <Select value={config.target_id || ""} onValueChange={(v) => updateStepConfig(step.id, { target_id: v })}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{agents.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select></div>
          )}
          {config.transfer_to === "representative" && representatives.length > 0 && (
            <div><Label className="text-[10px]">Selecionar Representante</Label>
              <Select value={config.target_id || ""} onValueChange={(v) => updateStepConfig(step.id, { target_id: v })}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{representatives.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent></Select></div>
          )}
        </div>);
      case "end":
        return (<div><Label className="text-[10px]">Marcar conversa como</Label>
          <Select value={config.mark_as || "closed"} onValueChange={(v) => updateStepConfig(step.id, { mark_as: v })}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="closed">Fechada</SelectItem><SelectItem value="archived">Arquivada</SelectItem><SelectItem value="resolved">Resolvida</SelectItem></SelectContent></Select></div>);
      default: return null;
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Funis de Automação</h3>
        <Button onClick={() => openEditor()} size="sm"><Plus className="h-4 w-4 mr-1" /> Novo Funil</Button>
      </div>
      {funnels.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><GitBranch className="h-12 w-12 mx-auto mb-3 opacity-40" /><p>Nenhum funil criado</p></CardContent></Card>
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
                      <div><h4 className="font-semibold">{f.name}</h4><p className="text-xs text-muted-foreground">Gatilho: {triggerEvents[f.trigger_event] || f.trigger_event} • {funnelSteps.length} etapas</p></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => openTestModal(f)}><Play className="h-3.5 w-3.5 mr-1" /> Testar</Button>
                      <Button size="sm" variant={f.active ? "default" : "outline"} onClick={() => toggleFunnel(f)}>{f.active ? <><Pause className="h-3.5 w-3.5 mr-1" /> Pausar</> : <><Play className="h-3.5 w-3.5 mr-1" /> Ativar</>}</Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowSteps(isOpen ? null : f.id)}><Settings2 className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => openEditor(f)}><Edit className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteFunnel(f.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  {isOpen && (
                    <div className="mt-4 space-y-2 border-t pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium">Etapas do Funil</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5 mr-1" /> Nova Etapa <ChevronDown className="h-3 w-3 ml-1" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            {STEP_TYPE_OPTIONS.map((opt) => (
                              <DropdownMenuItem key={opt.value} onClick={() => addStep(f.id, opt.value)} className="flex items-center gap-2">
                                <opt.icon className="h-4 w-4" />
                                <div><p className="text-sm font-medium">{opt.label}</p><p className="text-[10px] text-muted-foreground">{opt.description}</p></div>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      {funnelSteps.map((step, idx) => {
                        const info = getStepTypeInfo(step.step_type);
                        const isExpanded = expandedStep === step.id;
                        return (
                          <div key={step.id} className="relative">
                            {idx > 0 && <div className="absolute left-5 -top-2 w-0.5 h-2 bg-border" />}
                            {idx < funnelSteps.length - 1 && <div className="absolute left-5 -bottom-2 w-0.5 h-2 bg-border" />}
                            <div className={`border rounded-lg transition-all ${info.color} ${isExpanded ? "ring-2 ring-primary/20" : ""}`}>
                              <button onClick={() => setExpandedStep(isExpanded ? null : step.id)} className="w-full flex items-center gap-3 p-3 text-left">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background border font-bold text-sm shrink-0">{idx + 1}</div>
                                <info.icon className="h-4 w-4 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2"><span className="text-sm font-medium">{info.label}</span>{!step.active && <Badge variant="outline" className="text-[9px]">Inativo</Badge>}</div>
                                  <p className="text-xs text-muted-foreground truncate">{renderStepSummary(step)}</p>
                                </div>
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <Button size="icon" variant="ghost" className="h-7 w-7" disabled={idx === 0}
                                    onClick={(e) => { e.stopPropagation(); moveStep(f.id, step.id, "up"); }}
                                    title="Mover para cima">
                                    <ArrowUp className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7" disabled={idx === funnelSteps.length - 1}
                                    onClick={(e) => { e.stopPropagation(); moveStep(f.id, step.id, "down"); }}
                                    title="Mover para baixo">
                                    <ArrowDown className="h-3.5 w-3.5" />
                                  </Button>
                                  <Switch checked={step.active} onCheckedChange={(v) => updateStep(step.id, { active: v })} onClick={(e) => e.stopPropagation()} />
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); deleteStep(step.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                                  <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                </div>
                              </button>
                              {isExpanded && (
                                <div className="px-3 pb-3 pt-0 border-t bg-background/50 rounded-b-lg"><div className="pt-3 space-y-3">{renderStepEditor(step, f)}</div></div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {funnelSteps.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Adicione etapas usando o botão acima</p>}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar Funil" : "Novo Funil"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Recuperação de Carrinho" /></div>
            <div><Label>Tipo</Label><Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(funnelTypes).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Evento Gatilho</Label><Select value={form.trigger_event} onValueChange={(v) => setForm({ ...form, trigger_event: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(triggerEvents).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowEditor(false)}>Cancelar</Button><Button onClick={saveFunnel}>Salvar Funil</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== TEST DIALOG - WhatsApp Phone Mockup ===== */}
      <Dialog open={showTestDialog} onOpenChange={(open) => { setShowTestDialog(open); if (!open) stopSimulation(); }}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader><DialogTitle>Teste de Funil {testFunnel ? `• ${testFunnel.name}` : ""}</DialogTitle></DialogHeader>
          <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
            {/* Left panel - config + schedule */}
            <ScrollArea className="h-[70vh]">
              <div className="space-y-4 pr-3">
                {/* Contact source selector */}
                <div className="space-y-3 rounded-xl border p-4">
                  <Label className="text-sm font-semibold">Destinatário do teste</Label>
                  <div className="flex gap-1">
                    {([["manual", "Digitar"], ["lead", "Leads"], ["client", "Clientes"]] as const).map(([val, label]) => (
                      <Button key={val} size="sm" variant={testContactSource === val ? "default" : "outline"} className="flex-1 text-xs"
                        onClick={() => { setTestContactSource(val); setContactResults([]); setContactSearch(""); }}>
                        {label}
                      </Button>
                    ))}
                  </div>

                  {testContactSource !== "manual" && (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input value={contactSearch} onChange={(e) => searchContacts(e.target.value, testContactSource)} placeholder="Buscar por nome ou telefone..." className="pl-8 h-8 text-xs" />
                      </div>
                      {contactResults.length > 0 && (
                        <div className="border rounded-md max-h-[150px] overflow-y-auto">
                          {contactResults.map((c, i) => (
                            <button key={i} onClick={() => selectContact(c)} className="w-full text-left px-3 py-2 hover:bg-muted text-xs border-b last:border-0 transition-colors">
                              <p className="font-medium">{c.name || c.customer_name || "Sem nome"}</p>
                              <p className="text-muted-foreground">{c.phone || c.customer_phone} {c.email || c.customer_email ? `• ${c.email || c.customer_email}` : ""}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-[10px]">Nome</Label><Input value={testForm.nome} className="h-8 text-xs" onChange={(e) => setTestForm((c) => ({ ...c, nome: e.target.value }))} /></div>
                    <div><Label className="text-[10px]">Telefone</Label><Input value={testForm.telefone} className="h-8 text-xs" onChange={(e) => setTestForm((c) => ({ ...c, telefone: e.target.value }))} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-[10px]">Produto</Label><Input value={testForm.produto} className="h-8 text-xs" onChange={(e) => setTestForm((c) => ({ ...c, produto: e.target.value }))} /></div>
                    <div><Label className="text-[10px]">Cidade</Label><Input value={testForm.cidade} className="h-8 text-xs" onChange={(e) => setTestForm((c) => ({ ...c, cidade: e.target.value }))} /></div>
                  </div>
                  <div><Label className="text-[10px]">Link</Label><Input value={testForm.link} className="h-8 text-xs" onChange={(e) => setTestForm((c) => ({ ...c, link: e.target.value }))} /></div>
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                    <div><p className="text-xs font-medium">Modo acelerado</p><p className="text-[10px] text-muted-foreground">Uma etapa a cada 10s.</p></div>
                    <Switch checked={testAccelerated} onCheckedChange={setTestAccelerated} />
                  </div>
                  <div>
                    <Label className="text-[10px]">Enviar por (instância WhatsApp)</Label>
                    <Select value={testInstanceId} onValueChange={setTestInstanceId}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">🔄 Automático (definido nas etapas)</SelectItem>
                        {instances.filter(i => i.active).map(i => (
                          <SelectItem key={i.id} value={i.id}>
                            {i.status === "connected" ? "🟢" : "🔴"} {i.name} {i.phone_number ? `(${i.phone_number})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={runTestSimulation} variant="outline" className="flex-1 h-9" size="sm" disabled={testRunning || realExecuting}><Play className="h-4 w-4 mr-1" /> Testar</Button>
                    <Button onClick={runRealExecution} className="flex-1 h-9" size="sm" disabled={testRunning || realExecuting}>
                      {realExecuting ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Enviando...</> : <><Send className="h-4 w-4 mr-1" /> Executar</>}
                    </Button>
                    <Button variant="outline" size="sm" className="h-9" onClick={stopSimulation} disabled={!testRunning && testMessages.length === 0}><Pause className="h-4 w-4" /></Button>
                  </div>
                </div>

                {/* Schedule - now with ScrollArea */}
                <div className="rounded-xl border p-4">
                  <p className="text-sm font-medium mb-3">📋 Cronograma</p>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2 pr-2">
                      {testPreview.length === 0 ? <p className="text-xs text-muted-foreground">Nenhuma etapa de mensagem ativa.</p> : testPreview.map((item, index) => (
                        <div key={item.id} className="rounded-lg bg-muted/50 p-2.5 text-xs">
                          <div className="flex items-center justify-between gap-2"><span className="font-medium">Etapa {index + 1} • {item.templateName}</span><Badge variant="outline" className="text-[9px]">{item.offsetLabel}</Badge></div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Atraso: {item.configuredLabel} • {item.instanceLabel}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </ScrollArea>

            {/* Right panel - WhatsApp Phone Mockup */}
            <div className="flex justify-center">
              <div className="w-[360px] h-[640px] bg-background rounded-[2.5rem] border-[3px] border-foreground/20 shadow-xl overflow-hidden flex flex-col">
                {/* Phone status bar */}
                <div className="bg-[#075e54] text-white px-4 py-2 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <Users className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{testForm.nome}</p>
                    <p className="text-[10px] opacity-80">{testForm.telefone}</p>
                  </div>
                  <Phone className="h-4 w-4 opacity-60" />
                </div>

                {/* Chat area */}
                <div className="flex-1 bg-[#e5ddd5] dark:bg-[#0b141a] overflow-hidden relative">
                  <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='0.3'%3E%3Cpath d='m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
                  <ScrollArea className="h-full">
                    <div className="p-3 space-y-2 relative z-10">
                      {testMessages.length === 0 ? (
                        <div className="flex h-[420px] items-center justify-center text-center">
                          <div className="bg-white/80 dark:bg-white/10 rounded-lg px-4 py-2 shadow-sm">
                            <p className="text-xs text-muted-foreground">Clique em <strong>Executar</strong> para simular o envio</p>
                          </div>
                        </div>
                      ) : testMessages.map((item) => (
                        <div key={`${item.id}-${item.offsetLabel}`} className="flex justify-end">
                          <div className="max-w-[85%] rounded-lg rounded-tr-none bg-[#dcf8c6] dark:bg-[#005c4b] p-2 shadow-sm">
                            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">{item.message}</p>
                            <div className="flex items-center justify-end gap-1 mt-0.5">
                              <span className="text-[10px] text-muted-foreground">{item.offsetLabel}</span>
                              <CheckCircle className="h-3 w-3 text-blue-400" />
                            </div>
                          </div>
                        </div>
                      ))}
                      {testRunning && (
                        <div className="flex justify-end">
                          <div className="bg-[#dcf8c6] dark:bg-[#005c4b] rounded-lg px-4 py-2 shadow-sm">
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                              <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                              <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>

                {/* Input bar */}
                <div className="bg-[#f0f0f0] dark:bg-[#1f2c33] px-3 py-2 flex items-center gap-2 border-t">
                  <div className="flex-1 bg-white dark:bg-[#2a3942] rounded-full px-4 py-2">
                    <p className="text-xs text-muted-foreground">Simulação — sem envio real</p>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-[#075e54] flex items-center justify-center">
                    <Send className="h-4 w-4 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== SENDING CONFIG TAB ====================
function SendingConfigTab() {
  const [config, setConfig] = useState({
    messages_per_batch: 10,
    batch_interval_seconds: 30,
    batch_interval_variance: 15,
    daily_global_limit: 500,
    validate_numbers: true,
    warmup_mode: false,
    warmup_daily_increase: 20,
  });
  const [configId, setConfigId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const { tenantId } = useTenant();

  useEffect(() => { if (tenantId) loadConfig(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tenantId]);

  async function loadConfig() {
    setLoading(true);
    const { data } = await supabase.from("whatsapp_sending_config").select("*").eq("tenant_id", tenantId).maybeSingle();
    if (data) {
      setConfigId(data.id);
      setConfig({
        messages_per_batch: data.messages_per_batch,
        batch_interval_seconds: data.batch_interval_seconds,
        batch_interval_variance: data.batch_interval_variance,
        daily_global_limit: data.daily_global_limit,
        validate_numbers: data.validate_numbers,
        warmup_mode: data.warmup_mode,
        warmup_daily_increase: data.warmup_daily_increase,
      });
    }
    setLoading(false);
  }

  async function saveConfig() {
    setSaving(true);
    if (!tenantId) { toast.error("Tenant não resolvido"); setSaving(false); return; }

    if (configId) {
      const { error } = await supabase.from("whatsapp_sending_config").update({ ...config }).eq("id", configId);
      if (error) { toast.error("Erro ao salvar: " + error.message); setSaving(false); return; }
    } else {
      const { data, error } = await supabase.from("whatsapp_sending_config").insert({ ...config, tenant_id: tenantId }).select("id").single();
      if (error) { toast.error("Erro ao salvar: " + error.message); setSaving(false); return; }
      if (data) setConfigId(data.id);
    }
    toast.success("Configurações de envio salvas");
    setSaving(false);
  }

  // Speed indicator
  const msgsPerMinute = config.batch_interval_seconds > 0 ? (60 / config.batch_interval_seconds) : 60;
  const speedColor = msgsPerMinute <= 1 ? "text-green-600" : msgsPerMinute <= 2 ? "text-amber-600" : "text-red-600";
  const speedLabel = msgsPerMinute <= 1 ? "🟢 Seguro" : msgsPerMinute <= 2 ? "🟡 Moderado" : "🔴 Agressivo";

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2"><Settings2 className="h-5 w-5" /> Configurações de Envio</h3>
        <p className="text-xs text-muted-foreground">Configure a velocidade e limites para evitar bloqueios do Meta</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">Velocidade de Envio</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <Label className="text-sm">Mensagens por lote</Label>
                <Badge variant="outline">{config.messages_per_batch}</Badge>
              </div>
              <Slider value={[config.messages_per_batch]} onValueChange={([v]) => setConfig(c => ({ ...c, messages_per_batch: v }))} min={5} max={50} step={5} />
              <p className="text-xs text-muted-foreground mt-1">Quantas mensagens processar por execução da fila</p>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <Label className="text-sm">Intervalo entre envios (segundos)</Label>
                <Badge variant="outline">{config.batch_interval_seconds}s</Badge>
              </div>
              <Slider value={[config.batch_interval_seconds]} onValueChange={([v]) => setConfig(c => ({ ...c, batch_interval_seconds: v }))} min={10} max={120} step={5} />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <Label className="text-sm">Variação aleatória (±segundos)</Label>
                <Badge variant="outline">±{config.batch_interval_variance}s</Badge>
              </div>
              <Slider value={[config.batch_interval_variance]} onValueChange={([v]) => setConfig(c => ({ ...c, batch_interval_variance: v }))} min={0} max={60} step={5} />
              <p className="text-xs text-muted-foreground mt-1">Simula comportamento humano para evitar detecção</p>
            </div>

            <Separator />

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <p className="text-sm font-medium">Velocidade estimada</p>
                <p className="text-xs text-muted-foreground">~{msgsPerMinute.toFixed(1)} msg/min</p>
              </div>
              <Badge className={`${speedColor} border`} variant="outline">{speedLabel}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Limites e Segurança</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <Label className="text-sm">Limite diário global</Label>
                <Badge variant="outline">{config.daily_global_limit}</Badge>
              </div>
              <Slider value={[config.daily_global_limit]} onValueChange={([v]) => setConfig(c => ({ ...c, daily_global_limit: v }))} min={50} max={2000} step={50} />
              <p className="text-xs text-muted-foreground mt-1">Total de mensagens/dia somando todas as instâncias</p>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Validar números antes de enviar</Label>
                <p className="text-xs text-muted-foreground">Verifica se o número existe no WhatsApp</p>
              </div>
              <Switch checked={config.validate_numbers} onCheckedChange={(v) => setConfig(c => ({ ...c, validate_numbers: v }))} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Modo Aquecimento</Label>
                <p className="text-xs text-muted-foreground">Aumenta limite diário progressivamente</p>
              </div>
              <Switch checked={config.warmup_mode} onCheckedChange={(v) => setConfig(c => ({ ...c, warmup_mode: v }))} />
            </div>

            {config.warmup_mode && (
              <div>
                <div className="flex justify-between mb-2">
                  <Label className="text-sm">Incremento diário</Label>
                  <Badge variant="outline">+{config.warmup_daily_increase}/dia</Badge>
                </div>
                <Slider value={[config.warmup_daily_increase]} onValueChange={([v]) => setConfig(c => ({ ...c, warmup_daily_increase: v }))} min={5} max={100} step={5} />
                <p className="text-xs text-muted-foreground mt-1">Quantas mensagens a mais por dia no aquecimento</p>
              </div>
            )}

            <Button onClick={saveConfig} disabled={saving} className="w-full">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Salvando...</> : "Salvar Configurações"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ==================== BROADCAST TAB ====================
type BroadcastMode = "funnel" | "flow";

const FILTER_OPTIONS = [
  { value: "all", label: "Todos os contatos", icon: Users },
  { value: "tag", label: "Por Tag", icon: Tag },
  { value: "representative", label: "Por Representante", icon: Briefcase },
  { value: "prescriber", label: "Por Prescritor", icon: Stethoscope },
  { value: "product", label: "Por Produto (comprou)", icon: Package },
  { value: "state", label: "Por Estado/Cidade", icon: MapPin },
] as const;

function BroadcastTab() {
  const { tenantId } = useTenant();
  const [mode, setMode] = useState<BroadcastMode>("funnel");
  const [funnels, setFunnels] = useState<WhatsAppFunnel[]>([]);
  const [flows, setFlows] = useState<Array<{ id: string; name: string; description: string }>>([]);
  const [selectedFunnel, setSelectedFunnel] = useState<string>("");
  const [selectedFlow, setSelectedFlow] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterValue, setFilterValue] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [representatives, setReps] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [estimatedCount, setEstimatedCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [broadcastInterval, setBroadcastInterval] = useState(30000); // default 30s
  const [campaignName, setCampaignName] = useState("");
  const [instances, setInstances] = useState<any[]>([]);

  // Advanced settings
  const [selectedInstances, setSelectedInstances] = useState<string[]>([]);
  const [workingHoursLimit, setWorkingHoursLimit] = useState(true);
  const [workingRange, setWorkingRange] = useState({ start: "08:00", end: "18:00" });
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);

  useEffect(() => { loadData(); }, []);
  useEffect(() => { estimateAudience(); }, [filterType, filterValue]);

  async function loadData() {
    const [{ data: f }, { data: fl }, { data: rp }, { data: d }, { data: p }, { data: t }, { data: i }] = await Promise.all([
      supabase.from("whatsapp_funnels").select("*").eq("active", true).order("name"),
      supabase.from("whatsapp_flows").select("id, name, description").eq("active", true).order("name"),
      supabase.from("representatives").select("id, name").eq("active", true),
      supabase.from("doctors").select("id, name").eq("active", true),
      supabase.from("products").select("id, name").eq("active", true),
      supabase.from("customer_tags").select("tag"),
      supabase.from("whatsapp_instances").select("*").eq("active", true).eq("status", "connected"),
    ]);
    setFunnels((f || []) as unknown as WhatsAppFunnel[]);
    setFlows((fl || []) as any);
    setReps(rp || []);
    setDoctors(d || []);
    setProducts(p || []);
    setInstances(i || []);
    const uniqueTags = [...new Set((t || []).map((x: any) => x.tag))];
    setTags(uniqueTags);

    const { data: orders } = await supabase.from("orders").select("shipping_address").not("shipping_address", "is", null).limit(500);
    const stateSet = new Set<string>();
    (orders || []).forEach((o: any) => {
      const addr = o.shipping_address;
      if (addr?.state) stateSet.add(addr.state);
    });
    setStates(Array.from(stateSet).sort());

    const { data: sc } = await supabase.from("whatsapp_sending_config").select("batch_interval_seconds").limit(1).maybeSingle();
    if (sc?.batch_interval_seconds) {
      setBroadcastInterval(sc.batch_interval_seconds * 1000);
    }
  }

  async function estimateAudience() {
    if (filterType === "all") {
      const { count } = await supabase.from("whatsapp_contacts").select("*", { count: "exact", head: true });
      setEstimatedCount(count || 0);
    } else if (filterType === "tag" && filterValue) {
      const { data: tagged } = await supabase.from("customer_tags").select("customer_email").eq("tag", filterValue);
      setEstimatedCount(tagged?.length || 0);
    } else if (filterType === "representative" && filterValue) {
      const { data: docs } = await supabase.from("doctors").select("id").eq("representative_id", filterValue);
      const docIds = (docs || []).map((d: any) => d.id);
      if (docIds.length) {
        const { count } = await supabase.from("orders").select("*", { count: "exact", head: true }).in("doctor_id", docIds);
        setEstimatedCount(count || 0);
      } else setEstimatedCount(0);
    } else if (filterType === "product" && filterValue) {
      const { count } = await supabase.from("orders").select("*", { count: "exact", head: true }).contains("items", JSON.stringify([{ id: filterValue }]));
      setEstimatedCount(count || 0);
    } else if (filterType === "state" && filterValue) {
      const { count } = await supabase.from("orders").select("*", { count: "exact", head: true }).contains("shipping_address", JSON.stringify({ state: filterValue }));
      setEstimatedCount(count || 0);
    } else {
      setEstimatedCount(null);
    }
  }

  async function gatherContacts(): Promise<{ phone: string; name: string }[]> {
    let contactPhones: { phone: string; name: string }[] = [];
    if (filterType === "all") {
      const { data: allContacts } = await supabase.from("whatsapp_contacts").select("phone, name");
      contactPhones = (allContacts || []).map(c => ({ phone: c.phone, name: c.name || c.phone }));
    } else if (filterType === "tag" && filterValue) {
      const { data: tagged } = await supabase.from("customer_tags").select("customer_email").eq("tag", filterValue);
      const emails = (tagged || []).map(t => t.customer_email);
      if (emails.length > 0) {
        const { data: orders } = await supabase.from("orders").select("customer_phone, customer_name, customer_email").in("customer_email", emails).not("customer_phone", "is", null);
        const phoneMap = new Map<string, string>();
        (orders || []).forEach(o => { if (o.customer_phone) phoneMap.set(o.customer_phone, o.customer_name); });
        contactPhones = Array.from(phoneMap.entries()).map(([phone, name]) => ({ phone, name }));
      }
    } else if (filterType === "representative" && filterValue) {
      const { data: docs } = await supabase.from("doctors").select("id").eq("representative_id", filterValue);
      const docIds = (docs || []).map(d => d.id);
      if (docIds.length > 0) {
        const { data: orders } = await supabase.from("orders").select("customer_phone, customer_name").in("doctor_id", docIds).not("customer_phone", "is", null);
        const phoneMap = new Map<string, string>();
        (orders || []).forEach(o => { if (o.customer_phone) phoneMap.set(o.customer_phone, o.customer_name); });
        contactPhones = Array.from(phoneMap.entries()).map(([phone, name]) => ({ phone, name }));
      }
    } else if (filterType === "state" && filterValue) {
      const { data: orders } = await supabase.from("orders").select("customer_phone, customer_name, shipping_address").not("customer_phone", "is", null).limit(1000);
      const phoneMap = new Map<string, string>();
      (orders || []).forEach((o: any) => {
        if (o.customer_phone && o.shipping_address?.state === filterValue) phoneMap.set(o.customer_phone, o.customer_name);
      });
      contactPhones = Array.from(phoneMap.entries()).map(([phone, name]) => ({ phone, name }));
    }
    return contactPhones;
  }

  async function startBroadcast() {
    const isFlow = mode === "flow";
    const targetId = isFlow ? selectedFlow : selectedFunnel;
    if (!targetId) { toast.error(`Selecione um ${isFlow ? "flow" : "funil"}`); return; }
    if (estimatedCount === 0) { toast.error("Nenhum contato encontrado com os filtros selecionados"); return; }
    if (!confirm(`Confirma disparar para ~${estimatedCount || "?"} contatos?`)) return;
    setLoading(true);
    try {
      const contactPhones = await gatherContacts();
      if (contactPhones.length === 0) {
        toast.error("Nenhum contato com telefone encontrado");
        setLoading(false);
        return;
      }

      // 1. Criar Registro da Campanha (Fase 2)
      const targetName = isFlow
        ? flows.find(f => f.id === targetId)?.name || "Flow"
        : funnels.find(f => f.id === targetId)?.name || "Funil";
      const broadcastName = campaignName.trim() || `${isFlow ? "Flow" : "Funil"}: ${targetName}`;

      const { data: campaign, error: campaignErr } = await supabase
        .from("whatsapp_campaigns")
        .insert({
          tenant_id: tenantId,
          name: broadcastName,
          status: "running",
          flow_id: isFlow ? targetId : null,
          funnel_id: isFlow ? null : targetId,
          total_contacts: contactPhones.length,
          instance_ids: selectedInstances.length > 0 ? selectedInstances : null,
          working_hours: workingHoursLimit ? workingRange : null,
          working_days: workingHoursLimit ? workingDays : null,
          scheduled_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (campaignErr || !campaign) {
        toast.error("Erro ao criar registro de campanha.");
        console.error(campaignErr);
        setLoading(false);
        return;
      }

      const campaignId = campaign.id;

      // Tenant resolvido via useTenant() (suporta super_admin e troca de tenant)

      let messageContent = "";
      let stepId: string | null = null;
      let templateId: string | null = null;
      let firstStepFunnelId: string | null = null;
      let flowIdField: string | null = null;

      if (!isFlow) {
        const { data: steps } = await supabase
          .from("whatsapp_funnel_steps")
          .select("*")
          .eq("funnel_id", targetId)
          .eq("active", true)
          .order("step_order");
        if (!steps || steps.length === 0) {
          toast.error("Funil sem etapas ativas");
          setLoading(false);
          return;
        }
        const firstStep = steps[0];
        if (firstStep.step_type === "message_template" && firstStep.template_id) {
          const { data: tpl } = await supabase.from("whatsapp_templates").select("content").eq("id", firstStep.template_id).single();
          messageContent = tpl?.content || "";
        } else if (firstStep.step_type === "message_custom" && (firstStep.config as any)?.custom_message) {
          messageContent = (firstStep.config as any).custom_message;
        } else {
          messageContent = firstStep.label || "Mensagem do funil";
        }
        stepId = firstStep.id;
        templateId = firstStep.template_id || null;
        firstStepFunnelId = targetId;
      } else {
        // Flow: enfileira um evento de start; whatsapp-process-queue / runner cuida do disparo
        const flow = flows.find(f => f.id === targetId);
        messageContent = `[FLOW] ${flow?.name || ""}`;
        flowIdField = targetId;
      }

      const queueItems = contactPhones.map((c, idx) => ({
        contact_phone: c.phone.replace(/\D/g, ""),
        contact_name: c.name,
        message_content: messageContent,
        funnel_id: firstStepFunnelId,
        flow_id: flowIdField,
        step_id: stepId,
        template_id: templateId,
        status: "pending",
        scheduled_at: new Date(Date.now() + idx * broadcastInterval).toISOString(),
        broadcast_id: campaignId, // Usamos o ID da campanha como broadcast_id também para compatibilidade
        broadcast_name: broadcastName,
        campaign_id: campaignId,
        tenant_id: tenantId,
      }));

      let enqueued = 0;
      for (let i = 0; i < queueItems.length; i += 50) {
        const batch = queueItems.slice(i, i + 50);
        const { error } = await supabase.from("whatsapp_message_queue").insert(batch as any);
        if (!error) enqueued += batch.length;
      }
      toast.success(`Campanha "${broadcastName}" criada: ${enqueued} mensagens enfileiradas`);
      setCampaignName("");
    } catch (e: any) {
      toast.error(`Erro ao criar transmissão: ${e.message}`);
    }
    setLoading(false);
  }

  const FilterIcon = FILTER_OPTIONS.find(o => o.value === filterType)?.icon || Users;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2"><Megaphone className="h-5 w-5" /> Transmissão em Massa</h3>
          <p className="text-xs text-muted-foreground">Dispare um Funil clássico ou um Flow visual para uma audiência filtrada</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left - Config */}
        <Card>
          <CardContent className="p-6 space-y-5">
            <div>
              <Label className="font-semibold mb-2 block">1. Tipo de automação</Label>
              <Tabs value={mode} onValueChange={(v) => setMode(v as BroadcastMode)}>
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="funnel" className="gap-2"><GitBranch className="h-4 w-4" /> Funil clássico</TabsTrigger>
                  <TabsTrigger value="flow" className="gap-2"><Zap className="h-4 w-4" /> Flow visual</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div>
              <Label className="font-semibold">2. Selecione {mode === "flow" ? "o Flow" : "o Funil"}</Label>
              {mode === "funnel" ? (
                <Select value={selectedFunnel} onValueChange={setSelectedFunnel}>
                  <SelectTrigger className="mt-2"><SelectValue placeholder="Escolha um funil ativo..." /></SelectTrigger>
                  <SelectContent>
                    {funnels.map(f => (
                      <SelectItem key={f.id} value={f.id}>
                        <span className="flex items-center gap-2">
                          <GitBranch className="h-4 w-4 text-muted-foreground" /> {f.name} <span className="text-muted-foreground">({f.type})</span>
                        </span>
                      </SelectItem>
                    ))}
                    {funnels.length === 0 && <div className="px-2 py-3 text-xs text-muted-foreground">Nenhum funil ativo</div>}
                  </SelectContent>
                </Select>
              ) : (
                <Select value={selectedFlow} onValueChange={setSelectedFlow}>
                  <SelectTrigger className="mt-2"><SelectValue placeholder="Escolha um flow ativo..." /></SelectTrigger>
                  <SelectContent>
                    {flows.map(f => (
                      <SelectItem key={f.id} value={f.id}>
                        <span className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-muted-foreground" /> {f.name}
                        </span>
                      </SelectItem>
                    ))}
                    {flows.length === 0 && <div className="px-2 py-3 text-xs text-muted-foreground">Nenhum flow ativo</div>}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <Label className="font-semibold">3. Nome da campanha (opcional)</Label>
              <Input
                value={campaignName}
                onChange={e => setCampaignName(e.target.value)}
                placeholder="Ex: Black Friday — Clientes SP"
                className="mt-2"
              />
            </div>

            <Separator />

            <div>
              <Label className="font-semibold flex items-center gap-2 mb-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                4. Números participantes
              </Label>
              <div className="flex flex-wrap gap-2">
                {instances.map(inst => (
                  <Button 
                    key={inst.id}
                    variant={selectedInstances.includes(inst.id) ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-[11px] gap-1.5"
                    onClick={() => {
                      setSelectedInstances(prev => 
                        prev.includes(inst.id) ? prev.filter(i => i !== inst.id) : [...prev, inst.id]
                      );
                    }}
                  >
                    <Smartphone className="h-3.5 w-3.5" /> {inst.instance_name}
                  </Button>
                ))}
                {instances.length === 0 && <p className="text-[10px] text-muted-foreground italic">Nenhuma instância online para seleção específica.</p>}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                Se nenhum for selecionado, o sistema usará **todos** os números disponíveis para rodízio automático.
              </p>
            </div>

            <Separator />

            <div>
              <Label className="font-semibold">5. Filtrar Audiência</Label>
              <Select value={filterType} onValueChange={(v) => { setFilterType(v); setFilterValue(""); }}>
                <SelectTrigger className="mt-2">
                  <SelectValue>
                    <span className="flex items-center gap-2">
                      <FilterIcon className="h-4 w-4 text-muted-foreground" />
                      {FILTER_OPTIONS.find(o => o.value === filterType)?.label}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {FILTER_OPTIONS.map(opt => {
                    const Icon = opt.icon;
                    return (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" /> {opt.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              {filterType === "tag" && (
                <Select value={filterValue} onValueChange={setFilterValue}>
                  <SelectTrigger className="mt-2"><SelectValue placeholder="Selecione a tag..." /></SelectTrigger>
                  <SelectContent>{tags.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              )}
              {filterType === "representative" && (
                <Select value={filterValue} onValueChange={setFilterValue}>
                  <SelectTrigger className="mt-2"><SelectValue placeholder="Selecione o representante..." /></SelectTrigger>
                  <SelectContent>{representatives.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                </Select>
              )}
              {filterType === "prescriber" && (
                <Select value={filterValue} onValueChange={setFilterValue}>
                  <SelectTrigger className="mt-2"><SelectValue placeholder="Selecione o prescritor..." /></SelectTrigger>
                  <SelectContent>{doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              )}
              {filterType === "product" && (
                <Select value={filterValue} onValueChange={setFilterValue}>
                  <SelectTrigger className="mt-2"><SelectValue placeholder="Selecione o produto..." /></SelectTrigger>
                  <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              )}
              {filterType === "state" && (
                <Select value={filterValue} onValueChange={setFilterValue}>
                  <SelectTrigger className="mt-2"><SelectValue placeholder="Selecione o estado..." /></SelectTrigger>
                  <SelectContent>{states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right - Summary */}
        <Card>
          <CardContent className="p-6 space-y-5">
            <div>
              <Label className="font-semibold">Resumo da Transmissão</Label>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
                  <div className="flex items-center gap-3">
                    <Users className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{estimatedCount !== null ? estimatedCount : "—"}</p>
                      <p className="text-xs text-muted-foreground">contatos estimados</p>
                    </div>
                  </div>
                  <Badge variant={estimatedCount && estimatedCount > 0 ? "default" : "secondary"}>
                    <FilterIcon className="h-3 w-3 mr-1" />
                    {FILTER_OPTIONS.find(o => o.value === filterType)?.label}
                  </Badge>
                </div>

                {(mode === "funnel" ? selectedFunnel : selectedFlow) && (
                  <div className="rounded-lg border p-3">
                    <p className="text-sm font-medium flex items-center gap-2">
                      {mode === "flow" ? <Zap className="h-4 w-4" /> : <GitBranch className="h-4 w-4" />}
                      {mode === "flow" ? "Flow selecionado:" : "Funil selecionado:"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {mode === "flow"
                        ? flows.find(f => f.id === selectedFlow)?.name
                        : funnels.find(f => f.id === selectedFunnel)?.name || "—"}
                    </p>
                  </div>
                )}

                <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 flex gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">O disparo enfileira todos os contatos respeitando o limite diário de cada instância e o intervalo configurado ({Math.round(broadcastInterval/1000)}s entre envios).</p>
                </div>

                <Separator />

                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-semibold">Horário Comercial</Label>
                      <p className="text-[10px] text-muted-foreground">Pausa envios fora da janela ou finais de semana.</p>
                    </div>
                    <Switch checked={workingHoursLimit} onCheckedChange={setWorkingHoursLimit} />
                  </div>

                  {workingHoursLimit && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-1">
                      <div className="flex items-center gap-2">
                        <Input type="time" value={workingRange.start} onChange={e => setWorkingRange(p => ({...p, start: e.target.value}))} className="h-8 text-xs" />
                        <span className="text-xs text-muted-foreground">até</span>
                        <Input type="time" value={workingRange.end} onChange={e => setWorkingRange(p => ({...p, end: e.target.value}))} className="h-8 text-xs" />
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"].map((day, idx) => (
                          <button
                            key={idx}
                            className={`h-7 px-2 rounded flex items-center justify-center text-[10px] font-bold border transition-colors ${
                              workingDays.includes(idx) ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-transparent"
                            }`}
                            onClick={() => {
                              setWorkingDays(prev => prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx]);
                            }}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Button
              onClick={startBroadcast}
              disabled={loading || (mode === "funnel" ? !selectedFunnel : !selectedFlow) || estimatedCount === 0}
              className="w-full"
              size="lg"
            >
              <Megaphone className="h-4 w-4 mr-2" />
              {loading ? "Iniciando..." : `Disparar Transmissão${estimatedCount ? ` (${estimatedCount})` : ""}`}
            </Button>
          </CardContent>
        </Card>
      </div>
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
                    if (lines.length < 2) { toast.error("CSV vazio"); return; }
                    const header = lines[0].toLowerCase();
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

      <div className="grid md:grid-cols-[300px_1fr] gap-4 min-h-[500px]">
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
interface QueueRow {
  id: string;
  contact_phone: string;
  contact_name: string;
  message_content: string;
  status: string;
  scheduled_at: string;
  sent_at: string | null;
  retry_count: number;
  error_message: string | null;
  broadcast_id: string | null;
  broadcast_name: string | null;
  funnel_id: string | null;
  flow_id: string | null;
  instance_id: string | null;
  campaign_id?: string | null;
}

interface CampaignGroup {
  key: string;
  id: string | null;
  name: string;
  type: "funnel" | "flow" | "single";
  status?: string;
  error_reason?: string | null;
  total: number;
  sent: number;
  delivered: number;
  read: number;
  pending: number;
  failed: number;
  cancelled: number;
  firstScheduled: string;
  lastSent: string | null;
  items: QueueRow[];
}

function StatusKPI({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number | string; tone: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function CampaignCard({
  group, onCancelGroup, onRetryFailed, onCancelOne, onRetryOne, onToggleStatus,
}: {
  group: CampaignGroup;
  onCancelGroup: (g: CampaignGroup) => void;
  onRetryFailed: (g: CampaignGroup) => void;
  onCancelOne: (id: string) => void;
  onRetryOne: (id: string) => void;
  onToggleStatus: (g: CampaignGroup) => void;
}) {
  const [open, setOpen] = useState(false);
  const total = group.total;
  const progress = total > 0 ? Math.round((group.sent / total) * 100) : 0;
  const TypeIcon = group.type === "flow" ? Zap : group.type === "funnel" ? GitBranch : Send;

  let etaMinutes: number | null = null;
  if (group.pending > 0 && group.sent >= 2 && group.lastSent && group.firstScheduled) {
    const elapsed = (new Date(group.lastSent).getTime() - new Date(group.firstScheduled).getTime()) / 60000;
    const rate = group.sent / Math.max(elapsed, 1);
    if (rate > 0) etaMinutes = Math.ceil(group.pending / rate);
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="p-4 flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <TypeIcon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-sm truncate">{group.name}</h4>
              <Badge variant="outline" className="text-xs">
                {group.type === "flow" ? "Flow" : group.type === "funnel" ? "Funil" : "Avulso"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Iniciado em {new Date(group.firstScheduled).toLocaleString("pt-BR")}
              {etaMinutes !== null && <> · ETA: ~{etaMinutes} min</>}
            </p>

            {group.status === "paused" && group.error_reason && (
              <div className="mt-2 p-2 rounded bg-red-50 border border-red-100 flex items-start gap-2 animate-pulse">
                <AlertCircle className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-red-700 leading-tight">
                  <span className="font-bold">PAUSA DE SEGURANÇA:</span> {group.error_reason}
                </p>
              </div>
            )}

            <div className="mt-3 space-y-2">
              <Progress value={progress} className="h-2" />
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{group.sent} de {total} enviadas ({progress}%)</span>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {group.sent > 0 && <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 gap-1 shrink-0"><Send className="h-3 w-3" /> {group.sent}</Badge>}
                  {group.delivered > 0 && <Badge variant="secondary" className="bg-green-500/10 text-green-700 gap-1 shrink-0"><CheckCheck className="h-3 w-3" /> {group.delivered}</Badge>}
                  {group.read > 0 && <Badge variant="secondary" className="bg-purple-500/10 text-purple-700 gap-1 shrink-0"><Eye className="h-3 w-3" /> {group.read}</Badge>}
                  {group.pending > 0 && <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 gap-1 shrink-0"><Clock className="h-3 w-3" /> {group.pending}</Badge>}
                  {group.failed > 0 && <Badge variant="secondary" className="bg-red-500/10 text-red-700 gap-1 shrink-0"><AlertCircle className="h-3 w-3" /> {group.failed}</Badge>}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 shrink-0">
            <div className="flex items-center gap-1 mb-1">
              {group.status === "paused" ? (
                <Button size="sm" variant="outline" className="h-7 text-xs bg-amber-50" onClick={() => onToggleStatus(group)}>
                  <Play className="h-3 w-3 mr-1" /> Retomar
                </Button>
              ) : group.pending > 0 ? (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onToggleStatus(group)}>
                  <Pause className="h-3 w-3 mr-1" /> Pausar
                </Button>
              ) : null}
            </div>
            {group.failed > 0 && (
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onRetryFailed(group)}>
                <RefreshCw className="h-3 w-3 mr-1" /> Reenviar falhas
              </Button>
            )}
            {group.pending > 0 && (
              <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => onCancelGroup(group)}>
                <XCircle className="h-3 w-3 mr-1" /> Cancelar restantes
              </Button>
            )}
          </div>
        </div>

        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <button className="w-full px-4 py-2 border-t flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:bg-muted/50 transition-colors">
              {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              {open ? "Ocultar" : "Ver"} detalhes ({total} {total === 1 ? "envio" : "envios"})
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t bg-muted/20 max-h-80 overflow-y-auto">
              {group.items.map((item) => {
                const statusMeta = item.status === "sent"
                  ? { icon: CheckCheck, color: "text-green-600", label: "Enviada" }
                  : item.status === "failed"
                    ? { icon: AlertCircle, color: "text-red-600", label: `Falhou (${item.retry_count}x)` }
                    : item.status === "cancelled"
                      ? { icon: XCircle, color: "text-muted-foreground", label: "Cancelada" }
                      : item.status === "processing"
                        ? { icon: Send, color: "text-blue-600", label: "Enviando" }
                        : { icon: Clock, color: "text-amber-600", label: "Pendente" };
                const StatusIcon = statusMeta.icon;
                return (
                  <div key={item.id} className="px-4 py-2.5 flex items-center gap-3 border-b last:border-b-0 text-xs">
                    <StatusIcon className={`h-4 w-4 shrink-0 ${statusMeta.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{item.contact_name || item.contact_phone}</span>
                        <span className="text-muted-foreground">{item.contact_phone}</span>
                      </div>
                      <p className="text-muted-foreground truncate mt-0.5">
                        {statusMeta.label} · {item.sent_at ? `enviada ${new Date(item.sent_at).toLocaleString("pt-BR")}` : `agendada ${new Date(item.scheduled_at).toLocaleString("pt-BR")}`}
                      </p>
                      {item.error_message && (
                        <p className="text-destructive truncate mt-0.5">{item.error_message}</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {item.status === "failed" && (
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onRetryOne(item.id)}>
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {(item.status === "pending" || item.status === "failed") && (
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => onCancelOne(item.id)}>
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

function QueueTab() {
  const [items, setItems] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [search, setSearch] = useState("");
  const [sentToday, setSentToday] = useState(0);
  const [campaigns, setCampaigns] = useState<any[]>([]);

  useEffect(() => {
    loadQueue();
    const channel = supabase
      .channel("queue-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_message_queue" }, () => {
        loadQueue();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadQueue() {
    const [{ data: queueData }, { data: campaignData }] = await Promise.all([
      supabase.from("whatsapp_message_queue").select("*").order("scheduled_at", { ascending: false }).limit(1000),
      supabase.from("whatsapp_campaigns").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    
    setItems((queueData || []) as any);
    setCampaigns(campaignData || []);

    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from("whatsapp_message_queue")
      .select("*", { count: "exact", head: true })
      .eq("status", "sent")
      .gte("sent_at", startOfDay.toISOString());
    setSentToday(count || 0);
  }

  async function processQueue() {
    setLoading(true);
    try {
      const res = await supabase.functions.invoke("whatsapp-process-queue");
      const d = res.data || {};
      if (d.diagnostic) toast.info(d.diagnostic);
      else toast.success(`Processado: ${d.processed || 0} mensagens`);
      if (d.postponed > 0) {
        toast.warning(`${d.postponed} adiada(s): ${d.connected_instances === 0 ? "nenhuma instância conectada" : "limite diário atingido"}`);
      }
      loadQueue();
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  }

  async function cancelOne(id: string) {
    await supabase.from("whatsapp_message_queue").update({ status: "cancelled" }).eq("id", id);
    loadQueue();
  }
  async function retryOne(id: string) {
    await supabase.from("whatsapp_message_queue").update({ status: "pending", retry_count: 0, scheduled_at: new Date().toISOString() }).eq("id", id);
    loadQueue();
  }
  async function cancelGroup(g: CampaignGroup) {
    if (!confirm(`Cancelar ${g.pending} mensagens pendentes da campanha "${g.name}"?`)) return;
    const ids = g.items.filter(i => i.status === "pending").map(i => i.id);
    if (ids.length === 0) return;
    await supabase.from("whatsapp_message_queue").update({ status: "cancelled" }).in("id", ids);
    toast.success(`${ids.length} mensagens canceladas`);
    loadQueue();
  }
  async function retryFailed(g: CampaignGroup) {
    const ids = g.items.filter(i => i.status === "failed").map(i => i.id);
    if (ids.length === 0) return;
    await supabase.from("whatsapp_message_queue").update({ status: "pending", retry_count: 0, scheduled_at: new Date().toISOString() }).in("id", ids);
    toast.success(`${ids.length} mensagens reenviadas`);
    loadQueue();
  }
  async function toggleStatus(g: CampaignGroup) {
    if (!g.id) return;
    const newStatus = g.status === "paused" ? "running" : "paused";
    const { error } = await supabase
      .from("whatsapp_campaigns")
      .update({ status: newStatus })
      .eq("id", g.key);
    
    if (error) toast.error("Erro ao alterar status: " + error.message);
    else {
      toast.success(newStatus === "paused" ? "Campanha pausada" : "Campanha retomada");
      loadQueue();
    }
  }

  const filtered = items.filter(i => {
    if (statusFilter === "active" && !["pending", "processing", "failed"].includes(i.status)) return false;
    if (statusFilter !== "all" && statusFilter !== "active" && i.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(`${i.contact_name} ${i.contact_phone} ${i.broadcast_name || ""}`.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const groupsMap = new Map<string, CampaignGroup>();
  for (const item of filtered) {
    const key = item.broadcast_id || `single:${item.id}`;
    let g = groupsMap.get(key);
    if (!g) {
      const type: CampaignGroup["type"] = item.flow_id ? "flow" : item.funnel_id ? "funnel" : "single";
      const dbCampaign = campaigns.find(c => c.id === item.campaign_id || c.id === item.broadcast_id);
      
      g = {
        key, id: item.broadcast_id,
        name: dbCampaign?.name || item.broadcast_name || (item.flow_id ? "Flow direto" : item.funnel_id ? "Funil direto" : "Envio avulso"),
        type,
        status: dbCampaign?.status,
        error_reason: dbCampaign?.error_reason,
        total: 0, sent: 0, delivered: dbCampaign?.delivered_count || 0, read: dbCampaign?.read_count || 0,
        pending: 0, failed: 0, cancelled: 0,
        firstScheduled: item.scheduled_at, lastSent: null, items: [],
      };
      groupsMap.set(key, g);
    }
    g.items.push(item);
    g.total += 1;
    if (item.status === "sent") g.sent += 1;
    else if (item.status === "pending" || item.status === "processing") g.pending += 1;
    else if (item.status === "failed") g.failed += 1;
    else if (item.status === "cancelled") g.cancelled += 1;
    if (item.scheduled_at < g.firstScheduled) g.firstScheduled = item.scheduled_at;
    if (item.sent_at && (!g.lastSent || item.sent_at > g.lastSent)) g.lastSent = item.sent_at;
  }
  const groups = Array.from(groupsMap.values()).sort((a, b) => (b.firstScheduled.localeCompare(a.firstScheduled)));

  const kpiPending = items.filter(i => i.status === "pending").length;
  const kpiProcessing = items.filter(i => i.status === "processing").length;
  const kpiFailed = items.filter(i => i.status === "failed").length;
  const nextItem = items.filter(i => i.status === "pending").sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))[0];
  const nextLabel = nextItem ? new Date(nextItem.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2"><Send className="h-5 w-5" /> Fila de Transmissão</h3>
          <p className="text-xs text-muted-foreground">Acompanhe campanhas em tempo real</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={loadQueue} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
          </Button>
          <Button onClick={processQueue} size="sm" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Zap className="h-4 w-4 mr-1" />}
            Processar agora
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatusKPI icon={Hourglass} label="Pendentes" value={kpiPending} tone="bg-amber-500/15 text-amber-600" />
        <StatusKPI icon={Send} label="Enviando" value={kpiProcessing} tone="bg-blue-500/15 text-blue-600" />
        <StatusKPI icon={CheckCheck} label="Enviadas hoje" value={sentToday} tone="bg-green-500/15 text-green-600" />
        <StatusKPI icon={AlertCircle} label="Falhas" value={kpiFailed} tone="bg-red-500/15 text-red-600" />
        <StatusKPI icon={Clock} label="Próximo envio" value={nextLabel} tone="bg-primary/15 text-primary" />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active"><span className="flex items-center gap-2"><Filter className="h-4 w-4 text-muted-foreground" /> Ativas (pend./falha)</span></SelectItem>
            <SelectItem value="all"><span className="flex items-center gap-2"><Inbox className="h-4 w-4 text-muted-foreground" /> Todas</span></SelectItem>
            <SelectItem value="pending"><span className="flex items-center gap-2"><Clock className="h-4 w-4 text-amber-600" /> Pendentes</span></SelectItem>
            <SelectItem value="sent"><span className="flex items-center gap-2"><CheckCheck className="h-4 w-4 text-green-600" /> Enviadas</span></SelectItem>
            <SelectItem value="failed"><span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-red-600" /> Falhas</span></SelectItem>
            <SelectItem value="cancelled"><span className="flex items-center gap-2"><XCircle className="h-4 w-4 text-muted-foreground" /> Canceladas</span></SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por contato, telefone ou campanha…"
            className="pl-9"
          />
        </div>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Send className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhuma transmissão encontrada com esses filtros</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {groups.map(g => (
            <CampaignCard
              key={g.key}
              group={g}
              onCancelGroup={cancelGroup}
              onRetryFailed={retryFailed}
              onCancelOne={cancelOne}
              onRetryOne={retryOne}
              onToggleStatus={toggleStatus}
            />
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
          <MessageSquare className="h-6 w-6 text-primary" /> WhatsApp Automação
        </h1>
        <p className="text-sm text-muted-foreground">Envio automatizado via Evolution API com rotação e spintax</p>
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="dashboard" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Dashboard</TabsTrigger>
          <TabsTrigger value="conversations" className="gap-1.5"><Inbox className="h-3.5 w-3.5" /> Conversas</TabsTrigger>
          <TabsTrigger value="instances" className="gap-1.5"><Smartphone className="h-3.5 w-3.5" /> WhatsApps</TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Templates</TabsTrigger>
          <TabsTrigger value="funnels" className="gap-1.5"><GitBranch className="h-3.5 w-3.5" /> Funis</TabsTrigger>
          <TabsTrigger value="broadcast" className="gap-1.5"><Megaphone className="h-3.5 w-3.5" /> Transmissão</TabsTrigger>
          <TabsTrigger value="flows" className="gap-1.5"><Zap className="h-3.5 w-3.5" /> Flows</TabsTrigger>
          <TabsTrigger value="contacts" className="gap-1.5"><Users className="h-3.5 w-3.5" /> Contatos</TabsTrigger>
          <TabsTrigger value="queue" className="gap-1.5"><Clock className="h-3.5 w-3.5" /> Fila</TabsTrigger>
          <TabsTrigger value="sending-config" className="gap-1.5"><Settings2 className="h-3.5 w-3.5" /> Envio</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><DashboardTab /></TabsContent>
        <TabsContent value="conversations"><ConversationsTab /></TabsContent>
        <TabsContent value="instances"><InstancesTab /></TabsContent>
        <TabsContent value="templates"><TemplatesTab /></TabsContent>
        <TabsContent value="funnels"><FunnelsTab /></TabsContent>
        <TabsContent value="broadcast"><BroadcastTab /></TabsContent>
        <TabsContent value="flows"><WhatsAppFlowEditor /></TabsContent>
        <TabsContent value="contacts"><ContactsTab /></TabsContent>
        <TabsContent value="queue"><QueueTab /></TabsContent>
        <TabsContent value="sending-config"><SendingConfigTab /></TabsContent>
      </Tabs>
    </div>
  );
}
