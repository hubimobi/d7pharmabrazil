import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { X, RotateCcw } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Plus, Save, Trash2, Play, ArrowLeft, GripVertical,
  MessageSquare, GitBranch, Clock, Bot, UserCheck, Flag,
  Variable, HelpCircle, Edit, Copy, Link2, Unlink,
  ZoomIn, ZoomOut, Maximize2, ListChecks, Zap,
  FileText, Mic, Video, Image, ShoppingBag, Send,
  Calendar, Tag, ArrowRightLeft,
} from "lucide-react";

/* ───── Types ───── */
type NodeType = "start" | "message" | "condition" | "wait" | "input" | "ai_gen" | "transfer" | "set_variable" | "choice" | "action" | "end";

interface FlowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: Record<string, any>;
}

interface FlowEdge {
  id: string;
  from: string;
  to: string;
  fromHandle?: string;
  label?: string;
}

interface Flow {
  id: string;
  name: string;
  description: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  active: boolean;
  trigger_event: string;
  trigger_value: string;
  tenant_id: string | null;
  created_at: string;
  updated_at: string;
}

const NODE_TYPES: { type: NodeType; label: string; icon: any; color: string; bg: string }[] = [
  { type: "message", label: "Mensagem", icon: MessageSquare, color: "#3B82F6", bg: "bg-blue-50 border-blue-300" },
  { type: "choice", label: "Escolha", icon: ListChecks, color: "#0EA5E9", bg: "bg-sky-50 border-sky-300" },
  { type: "condition", label: "Condição", icon: GitBranch, color: "#F59E0B", bg: "bg-amber-50 border-amber-300" },
  { type: "wait", label: "Esperar", icon: Clock, color: "#8B5CF6", bg: "bg-purple-50 border-purple-300" },
  { type: "input", label: "Pergunta", icon: HelpCircle, color: "#10B981", bg: "bg-emerald-50 border-emerald-300" },
  { type: "action", label: "Ação", icon: Zap, color: "#F97316", bg: "bg-orange-50 border-orange-300" },
  { type: "ai_gen", label: "IA Gerar", icon: Bot, color: "#EC4899", bg: "bg-pink-50 border-pink-300" },
  { type: "transfer", label: "Transferir", icon: UserCheck, color: "#06B6D4", bg: "bg-cyan-50 border-cyan-300" },
  { type: "set_variable", label: "Variável", icon: Variable, color: "#6366F1", bg: "bg-indigo-50 border-indigo-300" },
  { type: "end", label: "Fim", icon: Flag, color: "#EF4444", bg: "bg-red-50 border-red-300" },
];

function genId() {
  return `node_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
}

function getNodeMeta(type: string) {
  return NODE_TYPES.find(n => n.type === type) || NODE_TYPES[0];
}

const DAYS = [
  { value: "monday", label: "Segunda" },
  { value: "tuesday", label: "Terça" },
  { value: "wednesday", label: "Quarta" },
  { value: "thursday", label: "Quinta" },
  { value: "friday", label: "Sexta" },
  { value: "saturday", label: "Sábado" },
  { value: "sunday", label: "Domingo" },
];

const VAR_SOURCES: { value: string; label: string }[] = [
  { value: "custom", label: "Texto / Variável" },
  { value: "product", label: "Produto" },
  { value: "tag", label: "Tag" },
  { value: "representative", label: "Representante" },
  { value: "order_status", label: "Status da Compra" },
  { value: "recovery_stage", label: "Estágio Recuperação" },
  { value: "repurchase_stage", label: "Estágio Recompra" },
  { value: "coupon", label: "Cupom" },
  { value: "behavior_profile", label: "Perfil Comportamental" },
];

const ORDER_STATUSES = [
  { value: "pending", label: "Pendente" },
  { value: "paid", label: "Pago" },
  { value: "shipped", label: "Enviado" },
  { value: "delivered", label: "Entregue" },
  { value: "cancelled", label: "Cancelado" },
  { value: "refunded", label: "Reembolsado" },
];

const RECOVERY_STAGES = [
  { value: "novo", label: "Novo" },
  { value: "primeiro_contato", label: "1º Contato" },
  { value: "em_negociacao", label: "Em Negociação" },
  { value: "proposta", label: "Proposta" },
  { value: "perdido", label: "Perdido" },
  { value: "convertido", label: "Convertido" },
];

const REPURCHASE_STAGES = [
  { value: "ativo", label: "Ativo" },
  { value: "aviso_30", label: "Aviso 30 dias" },
  { value: "aviso_15", label: "Aviso 15 dias" },
  { value: "aviso_5", label: "Aviso 5 dias" },
  { value: "feedback", label: "Feedback" },
  { value: "recomprou", label: "Recomprou" },
];

const BEHAVIOR_PROFILES = [
  { value: "novo", label: "Novo" },
  { value: "recorrente", label: "Recorrente" },
  { value: "vip", label: "VIP" },
  { value: "inativo", label: "Inativo" },
  { value: "em_recuperacao", label: "Em Recuperação" },
];

/* ───── Flow List ───── */
function FlowList({ onEdit }: { onEdit: (flow: Flow | null) => void }) {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadFlows(); }, []);

  async function loadFlows() {
    setLoading(true);
    const { data } = await supabase.from("whatsapp_flows").select("*").order("created_at", { ascending: false });
    setFlows((data || []) as unknown as Flow[]);
    setLoading(false);
  }

  async function toggleActive(flow: Flow) {
    await supabase.from("whatsapp_flows").update({ active: !flow.active } as any).eq("id", flow.id);
    loadFlows();
  }

  async function deleteFlow(id: string) {
    if (!confirm("Excluir este fluxo?")) return;
    await supabase.from("whatsapp_flows").delete().eq("id", id);
    toast.success("Fluxo excluído");
    loadFlows();
  }

  async function duplicateFlow(flow: Flow) {
    const { error } = await supabase.from("whatsapp_flows").insert({
      name: `${flow.name} (cópia)`, description: flow.description,
      nodes: flow.nodes as any, edges: flow.edges as any,
      active: false, trigger_event: flow.trigger_event, trigger_value: flow.trigger_value,
      tenant_id: flow.tenant_id,
    } as any);
    if (error) toast.error(error.message);
    else { toast.success("Fluxo duplicado"); loadFlows(); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Fluxos Automatizados</h3>
        <Button onClick={() => onEdit(null)} size="sm"><Plus className="h-4 w-4 mr-1" /> Novo Fluxo</Button>
      </div>
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : flows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <GitBranch className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">Nenhum fluxo criado</p>
            <Button onClick={() => onEdit(null)} size="sm" className="mt-4"><Plus className="h-4 w-4 mr-1" /> Criar Primeiro Fluxo</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {flows.map(flow => (
            <Card key={flow.id} className={`cursor-pointer hover:shadow-md transition-shadow ${!flow.active ? "opacity-60" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0" onClick={() => onEdit(flow)}>
                    <h4 className="font-semibold truncate">{flow.name}</h4>
                    {flow.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{flow.description}</p>}
                  </div>
                  <Switch checked={flow.active} onCheckedChange={() => toggleActive(flow)} />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                  <Badge variant="outline" className="text-[10px]">{(flow.nodes as any[])?.length || 0} nós</Badge>
                  <Badge variant="outline" className="text-[10px]">{flow.trigger_event}</Badge>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onEdit(flow)}>
                    <Edit className="h-3 w-3 mr-1" /> Editar
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => duplicateFlow(flow)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => deleteFlow(flow.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───── Test Flow Simulator ───── */
function FlowTestPanel({ onClose, nodes, edges }: { onClose: () => void; nodes: FlowNode[]; edges: FlowEdge[] }) {
  const [messages, setMessages] = useState<{ from: "bot" | "user"; text: string }[]>([]);
  const [variables, setVariables] = useState<Record<string, string>>({ Nome: "João", Telefone: "11999999999", Produto: "Produto Exemplo" });
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [waitingInput, setWaitingInput] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [running, setRunning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  function replaceVars(text: string) {
    return text.replace(/\{(\w+)\}/g, (_, k) => variables[k] || `{${k}}`);
  }

  function getNext(nodeId: string, label?: string): FlowNode | null {
    const edge = label
      ? edges.find(e => e.from === nodeId && e.label === label)
      : edges.find(e => e.from === nodeId);
    if (!edge) return null;
    return nodes.find(n => n.id === edge.to) || null;
  }

  function startTest() {
    setMessages([]);
    setRunning(true);
    setWaitingInput(false);
    const startNode = nodes.find(n => n.type === "start");
    if (startNode) {
      const next = getNext(startNode.id);
      if (next) processNode(next, []);
      else { setMessages([{ from: "bot", text: "⚠️ Nenhum nó conectado ao início" }]); setRunning(false); }
    }
  }

  function processNode(node: FlowNode, msgSoFar: { from: "bot" | "user"; text: string }[]) {
    const addMsg = (m: { from: "bot" | "user"; text: string }) => {
      msgSoFar = [...msgSoFar, m];
      setMessages([...msgSoFar]);
    };

    switch (node.type) {
      case "message": {
        const ct = node.data.content_type || "text";
        if (ct === "template") addMsg({ from: "bot", text: `📋 [Template: ${node.data.template_id || "?"}]` });
        else if (ct === "file") addMsg({ from: "bot", text: `📎 [Arquivo: ${node.data.file_url || "?"}]` });
        else if (ct === "audio") addMsg({ from: "bot", text: `🎤 [Áudio: ${node.data.audio_url || "?"}]` });
        else if (ct === "video") addMsg({ from: "bot", text: `🎬 [Vídeo: ${node.data.video_url || "?"}]` });
        else if (ct === "catalog") addMsg({ from: "bot", text: `🛒 [Catálogo WhatsApp]` });
        else if (ct === "link") addMsg({ from: "bot", text: `🔗 ${node.data.link_url || "Link"}` });
        else addMsg({ from: "bot", text: replaceVars(node.data.content || "(vazio)") });
        const next = getNext(node.id);
        if (next) setTimeout(() => processNode(next, msgSoFar), 600);
        else setRunning(false);
        break;
      }
      case "choice": {
        addMsg({ from: "bot", text: replaceVars(node.data.question || "Escolha uma opção:") });
        const opts = (node.data.options || []) as { label: string; tag?: string }[];
        opts.forEach((o, i) => addMsg({ from: "bot", text: `${i + 1}. ${o.label}` }));
        setCurrentNodeId(node.id);
        setWaitingInput(true);
        break;
      }
      case "condition": {
        if (node.data.condition_type === "any_response") {
          addMsg({ from: "bot", text: "⏳ Aguardando qualquer resposta..." });
          setCurrentNodeId(node.id);
          setWaitingInput(true);
        } else {
          const kws = (node.data.options || []) as { label: string; keywords: string[] }[];
          addMsg({ from: "bot", text: `🔀 Condição: ${kws.map(k => k.label).join(" | ")}` });
          setCurrentNodeId(node.id);
          setWaitingInput(true);
        }
        break;
      }
      case "wait": {
        const u = node.data.delay_unit === "h" ? "hora(s)" : node.data.delay_unit === "d" ? "dia(s)" : "min";
        if (node.data.wait_type === "specific_date") {
          addMsg({ from: "bot", text: `⏰ Aguardando até ${node.data.specific_day || "?"} às ${node.data.specific_time || "?"}` });
        } else {
          addMsg({ from: "bot", text: `⏱ Esperando ${node.data.delay_value || 0} ${u}...` });
        }
        const next = getNext(node.id);
        if (next) setTimeout(() => processNode(next, msgSoFar), 800);
        else setRunning(false);
        break;
      }
      case "input": {
        addMsg({ from: "bot", text: replaceVars(node.data.question || "?") });
        setCurrentNodeId(node.id);
        setWaitingInput(true);
        break;
      }
      case "action": {
        const at = node.data.action_type || "";
        if (at === "add_tag") addMsg({ from: "bot", text: `🏷️ Tag adicionada: ${node.data.tag || "?"}` });
        else if (at === "remove_tag") addMsg({ from: "bot", text: `🏷️ Tag removida: ${node.data.tag || "?"}` });
        else if (at === "go_to_flow") addMsg({ from: "bot", text: `↗️ Ir para fluxo: ${node.data.flow_id || "?"}` });
        else if (at === "trigger_block") addMsg({ from: "bot", text: `⚡ Acionar bloco: ${node.data.block_id || "?"}` });
        else addMsg({ from: "bot", text: `⚡ Ação: ${at}` });
        const next = getNext(node.id);
        if (next) setTimeout(() => processNode(next, msgSoFar), 400);
        else setRunning(false);
        break;
      }
      case "ai_gen": {
        addMsg({ from: "bot", text: `🤖 [IA geraria resposta: "${(node.data.prompt || "").substring(0, 60)}..."]` });
        const next = getNext(node.id);
        if (next) setTimeout(() => processNode(next, msgSoFar), 600);
        else setRunning(false);
        break;
      }
      case "transfer": {
        addMsg({ from: "bot", text: `👤 Transferindo para: ${node.data.target}` });
        setRunning(false);
        break;
      }
      case "set_variable": {
        variables[node.data.variable || "var"] = replaceVars(node.data.value || "");
        addMsg({ from: "bot", text: `📝 ${node.data.variable} = ${variables[node.data.variable || "var"]}` });
        const next = getNext(node.id);
        if (next) setTimeout(() => processNode(next, msgSoFar), 300);
        else setRunning(false);
        break;
      }
      case "end": {
        addMsg({ from: "bot", text: "🏁 Fluxo encerrado" });
        setRunning(false);
        break;
      }
      default: {
        const next = getNext(node.id);
        if (next) processNode(next, msgSoFar);
        else setRunning(false);
      }
    }
  }

  function handleUserSend() {
    if (!userInput.trim() || !currentNodeId) return;
    const node = nodes.find(n => n.id === currentNodeId);
    if (!node) return;
    const newMsgs = [...messages, { from: "user" as const, text: userInput }];
    setMessages(newMsgs);
    setWaitingInput(false);

    if (node.type === "input") {
      variables[node.data.variable_name || "resposta"] = userInput;
      const next = getNext(node.id);
      if (next) setTimeout(() => processNode(next, newMsgs), 400);
      else setRunning(false);
    } else if (node.type === "choice") {
      const opts = (node.data.options || []) as { label: string; tag?: string }[];
      const idx = parseInt(userInput) - 1;
      const chosen = opts[idx];
      if (chosen) {
        if (chosen.tag) newMsgs.push({ from: "bot", text: `🏷️ Tag: ${chosen.tag}` });
        setMessages([...newMsgs]);
        const next = getNext(node.id, chosen.label);
        if (next) setTimeout(() => processNode(next, newMsgs), 400);
        else { const fallback = getNext(node.id); if (fallback) setTimeout(() => processNode(fallback, newMsgs), 400); else setRunning(false); }
      } else {
        newMsgs.push({ from: "bot", text: "⚠️ Opção inválida" });
        setMessages([...newMsgs]);
        setWaitingInput(true);
      }
    } else if (node.type === "condition") {
      if (node.data.condition_type === "any_response") {
        const next = getNext(node.id);
        if (next) setTimeout(() => processNode(next, newMsgs), 400);
        else setRunning(false);
      } else {
        const kws = (node.data.options || []) as { label: string; keywords: string[] }[];
        const lower = userInput.toLowerCase();
        const matched = kws.find(k => (k.keywords || []).some(w => lower.includes(w.toLowerCase())));
        if (matched) {
          const next = getNext(node.id, matched.label);
          if (next) setTimeout(() => processNode(next, newMsgs), 400);
          else setRunning(false);
        } else {
          const defaultEdge = edges.find(e => e.from === node.id && (e.label === "Default" || !e.label));
          if (defaultEdge) {
            const next = nodes.find(n => n.id === defaultEdge.to);
            if (next) setTimeout(() => processNode(next, newMsgs), 400);
            else setRunning(false);
          } else {
            newMsgs.push({ from: "bot", text: "⚠️ Nenhuma condição correspondeu" });
            setMessages([...newMsgs]);
            setRunning(false);
          }
        }
      }
    }
    setUserInput("");
  }

  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [messages]);

  return (
    <div className="w-[380px] flex-shrink-0 border-l bg-slate-900 flex flex-col">
      {/* Phone-style header with controls */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800 border-b border-slate-700">
        <p className="text-xs font-semibold text-white">Testar Fluxo</p>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-6 w-6 text-white hover:bg-slate-700"
            onClick={() => { setMessages([]); setRunning(false); setWaitingInput(false); setUserInput(""); }}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6 text-white hover:bg-slate-700" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Phone mockup */}
      <div className="flex-1 p-3 overflow-hidden flex items-center justify-center">
        <div className="w-full max-w-[320px] h-full bg-black rounded-[2rem] p-2 shadow-2xl flex flex-col">
          <div className="flex-1 bg-white rounded-[1.5rem] overflow-hidden flex flex-col">
            {/* WhatsApp header */}
            <div className="bg-[#075E54] text-white px-3 py-2 flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">T</div>
              <div className="flex-1">
                <p className="font-semibold text-xs">Teste de Fluxo</p>
                <p className="text-[9px] opacity-80">Simulador</p>
              </div>
            </div>

            {/* Variables */}
            <div className="bg-amber-50 border-b px-2 py-1">
              <div className="flex flex-wrap gap-1">
                {Object.entries(variables).map(([k, v]) => (
                  <Input key={k} className="h-5 text-[9px] w-auto inline-flex max-w-[120px] px-1" value={`${k}=${v}`}
                    onChange={e => { const [key, ...rest] = e.target.value.split("="); setVariables(prev => ({ ...prev, [key]: rest.join("=") })); }}
                  />
                ))}
              </div>
            </div>

            {/* Chat */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-1.5" style={{ backgroundColor: "#ECE5DD" }}>
              {messages.length === 0 && !running && (
                <p className="text-center text-[10px] text-slate-500 mt-4">Clique em Iniciar para começar</p>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] px-2 py-1 rounded-lg text-[11px] ${m.from === "user" ? "bg-[#DCF8C6] text-slate-800" : "bg-white text-slate-800 shadow-sm"}`}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="border-t bg-[#F0F0F0] p-1.5 flex gap-1">
              {!running ? (
                <Button onClick={startTest} size="sm" className="w-full bg-[#075E54] hover:bg-[#064E46] text-xs h-7">
                  <Play className="h-3 w-3 mr-1" /> Iniciar
                </Button>
              ) : waitingInput ? (
                <>
                  <Input value={userInput} onChange={e => setUserInput(e.target.value)} placeholder="Resposta..."
                    className="flex-1 h-7 text-[11px]" onKeyDown={e => e.key === "Enter" && handleUserSend()} />
                  <Button size="icon" className="h-7 w-7 bg-[#075E54]" onClick={handleUserSend}>
                    <Send className="h-3 w-3" />
                  </Button>
                </>
              ) : (
                <p className="text-[10px] text-muted-foreground text-center w-full py-1">Processando...</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───── Flow Canvas Editor ───── */
function FlowCanvas({ flow, onBack }: { flow: Flow | null; onBack: () => void }) {
  const [name, setName] = useState(flow?.name || "Novo Fluxo");
  const [description, setDescription] = useState(flow?.description || "");
  const [triggerEvent, setTriggerEvent] = useState(flow?.trigger_event || "manual");
  const [triggerValue, setTriggerValue] = useState(flow?.trigger_value || "");
  const [nodes, setNodes] = useState<FlowNode[]>(
    (flow?.nodes as unknown as FlowNode[]) || [{ id: "start_1", type: "start" as NodeType, position: { x: 80, y: 200 }, data: {} }]
  );
  const [edges, setEdges] = useState<FlowEdge[]>((flow?.edges as unknown as FlowEdge[]) || []);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState<{ nodeId: string; handle?: string; mouseX: number; mouseY: number } | null>(null);
  const [addNodeMenu, setAddNodeMenu] = useState<{ sourceId: string; sourceHandle?: string; x: number; y: number } | null>(null);
  const [testPanelOpen, setTestPanelOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [customerTags, setCustomerTags] = useState<string[]>([]);
  const [couponsList, setCouponsList] = useState<{ code: string }[]>([]);
  const [representatives, setRepresentatives] = useState<{ id: string; name: string }[]>([]);
  
  const [templates, setTemplates] = useState<any[]>([]);
  const [allFlows, setAllFlows] = useState<{ id: string; name: string }[]>([]);
  const [agents, setAgents] = useState<{ id: string; name: string; model: string }[]>([]);
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([]);
  const [productsList, setProductsList] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [doctorsCoupons, setDoctorsCoupons] = useState<{ doctor_id: string; doctor_name: string; coupon_code: string }[]>([]);
  const [llmConfig, setLlmConfig] = useState<{ provider: string; default_model: string } | null>(null);
  const [aiTestResult, setAiTestResult] = useState<string | null>(null);
  const [aiTesting, setAiTesting] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const selectedNodeObj = nodes.find(n => n.id === selectedNode);

  useEffect(() => {
    supabase.from("whatsapp_templates").select("id, name, content").then(({ data }) => setTemplates(data || []));
    supabase.from("whatsapp_flows").select("id, name").then(({ data }) => setAllFlows((data || []) as any));
    supabase.from("ai_agents").select("id, name, model").eq("active", true).then(({ data }) => setAgents((data || []) as any));
    supabase.from("profiles").select("id, full_name").then(({ data }) => setUsers((data || []) as any));
    supabase.from("products").select("id, name, slug").eq("active", true).order("name").then(({ data }) => setProductsList((data || []) as any));
    supabase.from("coupons").select("code, doctor_id, doctors(id, name)").not("doctor_id", "is", null).eq("active", true).then(({ data }) => {
      setDoctorsCoupons((data || []).map((c: any) => ({ doctor_id: c.doctor_id, doctor_name: c.doctors?.name || "—", coupon_code: c.code })));
    });
    supabase.from("ai_llm_config").select("provider, default_model").eq("active", true).limit(1).single().then(({ data }) => {
      if (data) setLlmConfig(data as any);
    });
    supabase.from("customer_tags").select("tag").then(({ data }) => {
      const tags = Array.from(new Set((data || []).map((r: any) => r.tag).filter(Boolean))) as string[];
      setCustomerTags(tags);
    });
    supabase.from("coupons").select("code").eq("active", true).order("code").then(({ data }) => {
      setCouponsList((data || []) as any);
    });
    supabase.from("representatives").select("id, name").eq("active", true).order("name").then(({ data }) => {
      setRepresentatives((data || []) as any);
    });
  }, []);

  function addNode(type: NodeType) {
    const centerX = 300 + Math.random() * 200 - pan.x / zoom;
    const centerY = 200 + Math.random() * 100 - pan.y / zoom;
    const newNode: FlowNode = {
      id: genId(), type,
      position: { x: Math.round(centerX), y: Math.round(centerY) },
      data: getDefaultData(type),
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedNode(newNode.id);
  }

  function getDefaultData(type: NodeType): Record<string, any> {
    switch (type) {
      case "message": return { content_type: "text", content: "" };
      case "condition": return { condition_type: "keywords", options: [{ label: "Sim", keywords: ["sim", "quero"] }, { label: "Não", keywords: ["não", "nao"] }] };
      case "wait": return { wait_type: "delay", delay_value: 5, delay_unit: "m" };
      case "input": return { question: "", variable_name: "resposta" };
      case "ai_gen": return { prompt: "", model: llmConfig?.default_model || "google/gemini-3-flash-preview", agent_id: "" };
      case "transfer": return { target: "human", target_user_id: "", target_agent_id: "" };
      case "set_variable": return { variable: "", variables: [] };
      case "choice": return { question: "Escolha uma opção:", options: [{ label: "Opção 1", tag: "" }, { label: "Opção 2", tag: "" }] };
      case "action": return { action_type: "add_tag", tag: "" };
      default: return {};
    }
  }

  function updateNodeData(nodeId: string, data: Record<string, any>) {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n));
  }

  function deleteNode(nodeId: string) {
    if (nodeId.startsWith("start")) return;
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setEdges(prev => prev.filter(e => e.from !== nodeId && e.to !== nodeId));
    if (selectedNode === nodeId) setSelectedNode(null);
  }

  function disconnectAll(nodeId: string) {
    setEdges(prev => prev.filter(e => e.from !== nodeId && e.to !== nodeId));
    toast.success("Conexões removidas");
  }

  function addEdge(from: string, to: string, label?: string) {
    if (from === to) return;
    if (edges.some(e => e.from === from && e.to === to && e.label === label)) return;
    setEdges(prev => [...prev, { id: `e_${Date.now()}_${Math.random().toString(36).substr(2, 3)}`, from, to, label }]);
  }

  function deleteEdge(edgeId: string) {
    setEdges(prev => prev.filter(e => e.id !== edgeId));
  }

  async function save() {
    if (!name.trim()) { toast.error("Nome obrigatório"); return; }
    setSaving(true);
    try {
      const payload = { name, description, nodes: nodes as any, edges: edges as any, trigger_event: triggerEvent, trigger_value: triggerValue };
      if (flow?.id) {
        const { error } = await supabase.from("whatsapp_flows").update(payload as any).eq("id", flow.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("whatsapp_flows").insert(payload as any);
        if (error) throw error;
      }
      toast.success("Fluxo salvo!");
      onBack();
    } catch (e: any) { toast.error(e.message); }
    setSaving(false);
  }

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    setDragging(nodeId);
    setDragStart({ x: e.clientX, y: e.clientY });
    setSelectedNode(nodeId);
  }, []);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains("flow-canvas-bg")) {
      // If menu open, close it on canvas click
      if (addNodeMenu) { setAddNodeMenu(null); return; }
      if (connecting) { setConnecting(null); return; }
      setPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      setSelectedNode(null);
    }
  }, [pan, connecting, addNodeMenu]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragging) {
      const dx = (e.clientX - dragStart.x) / zoom;
      const dy = (e.clientY - dragStart.y) / zoom;
      setDragStart({ x: e.clientX, y: e.clientY });
      setNodes(prev => prev.map(n => n.id === dragging ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } } : n));
    }
    if (panning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
    if (connecting) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        setConnecting(c => c ? { ...c, mouseX: e.clientX - rect.left, mouseY: e.clientY - rect.top } : c);
      }
    }
  }, [dragging, dragStart, panning, panStart, zoom, connecting]);

  const handleCanvasMouseUp = useCallback((e: React.MouseEvent) => {
    setDragging(null);
    setPanning(false);
    if (connecting) {
      // Check if released over an input handle
      const target = e.target as HTMLElement;
      const inputEl = target.closest("[data-input-node]") as HTMLElement | null;
      if (inputEl) {
        const targetId = inputEl.getAttribute("data-input-node");
        if (targetId && targetId !== connecting.nodeId) {
          addEdge(connecting.nodeId, targetId, connecting.handle);
        }
        setConnecting(null);
        return;
      }
      // Released on canvas background → open add menu
      if (target === canvasRef.current || target.classList.contains("flow-canvas-bg")) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          setAddNodeMenu({ sourceId: connecting.nodeId, sourceHandle: connecting.handle, x: e.clientX - rect.left, y: e.clientY - rect.top });
        }
      }
      setConnecting(null);
    }
  }, [connecting]);

  function handleOutputMouseDown(e: React.MouseEvent, nodeId: string, handleLabel?: string) {
    e.stopPropagation();
    if (e.button !== 0) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    setConnecting({
      nodeId, handle: handleLabel,
      mouseX: rect ? e.clientX - rect.left : 0,
      mouseY: rect ? e.clientY - rect.top : 0,
    });
  }

  function handleAddFromMenu(type: NodeType) {
    if (!addNodeMenu) return;
    // Position in canvas coords
    const x = (addNodeMenu.x - pan.x) / zoom;
    const y = (addNodeMenu.y - pan.y) / zoom - 30;
    const newNode: FlowNode = {
      id: genId(), type,
      position: { x: Math.round(x), y: Math.round(y) },
      data: getDefaultData(type),
    };
    setNodes(prev => [...prev, newNode]);
    addEdge(addNodeMenu.sourceId, newNode.id, addNodeMenu.sourceHandle);
    setSelectedNode(newNode.id);
    setAddNodeMenu(null);
  }

  // ESC to cancel
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setConnecting(null); setAddNodeMenu(null); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Wheel zoom: hold right mouse button + scroll
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      // Right-button held → zoom; otherwise allow normal scroll/pan
      if (e.buttons === 2 || e.ctrlKey) {
        e.preventDefault();
        const rect = el!.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom(prevZoom => {
          const newZoom = Math.min(2, Math.max(0.3, +(prevZoom + delta).toFixed(2)));
          if (newZoom === prevZoom) return prevZoom;
          // Zoom centered at mouse: adjust pan so the point under cursor stays put
          setPan(prevPan => {
            const ratio = newZoom / prevZoom;
            return {
              x: mx - (mx - prevPan.x) * ratio,
              y: my - (my - prevPan.y) * ratio,
            };
          });
          return newZoom;
        });
      }
    }
    function onContextMenu(e: MouseEvent) { e.preventDefault(); }
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("contextmenu", onContextMenu);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("contextmenu", onContextMenu);
    };
  }, []);

  function getOutputHandles(node: FlowNode): { label: string; index: number }[] {
    if (node.type === "condition") {
      if (node.data.condition_type === "any_response") {
        return [
          { label: "Qualquer resposta", index: 0 },
          { label: "Sem resposta", index: 1 },
        ];
      }
      const opts = (node.data.options || []) as { label: string }[];
      const handles = opts.map((o, i) => ({ label: o.label, index: i }));
      handles.push({ label: "Default", index: opts.length });
      return handles;
    }
    if (node.type === "choice") {
      return ((node.data.options || []) as { label: string }[]).map((o, i) => ({ label: o.label, index: i }));
    }
    return [];
  }

  function resolveLinkUrl(cfg: any): string {
    if (!cfg?.product_id) return "";
    const prod = productsList.find(p => p.id === cfg.product_id);
    if (!prod) return "";
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const params = new URLSearchParams();
    if (cfg.doctor_id) {
      const d = doctorsCoupons.find(x => x.doctor_id === cfg.doctor_id);
      if (d) params.set("cupom", d.coupon_code);
    }
    if (cfg.checkout_version && cfg.checkout_version !== "default") params.set("ck", cfg.checkout_version);
    const qs = params.toString();
    return `${base}/produto/${prod.slug}${qs ? `?${qs}` : ""}`;
  }

  function renderEdges() {
    return edges.map(edge => {
      const fromNode = nodes.find(n => n.id === edge.from);
      const toNode = nodes.find(n => n.id === edge.to);
      if (!fromNode || !toNode) return null;

      const handles = getOutputHandles(fromNode);
      // Header ~46, body ~36 → footer starts ~y=90. Each multi-handle row ~22px.
      let y1Offset = handles.length > 0 ? 100 : 100;
      if (handles.length > 0 && edge.label) {
        const hIdx = handles.findIndex(h => h.label === edge.label);
        if (hIdx >= 0) y1Offset = 100 + hIdx * 22;
      }

      const x1 = fromNode.position.x + 260;
      const y1 = fromNode.position.y + y1Offset;
      const x2 = toNode.position.x;
      const y2 = toNode.position.y + 32;
      const midX = (x1 + x2) / 2;

      return (
        <g key={edge.id}>
          <path d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
            fill="none" stroke="#94A3B8" strokeWidth="2" markerEnd="url(#arrowhead)"
            className="cursor-pointer hover:stroke-red-500 transition-colors" onClick={() => deleteEdge(edge.id)} />
          {edge.label && (
            <text x={midX} y={(y1 + y2) / 2 - 8} textAnchor="middle" className="text-[10px] fill-slate-500 font-medium">{edge.label}</text>
          )}
        </g>
      );
    });
  }

  function renderNodePreview(node: FlowNode) {
    switch (node.type) {
      case "message": {
        const ct = node.data.content_type || "text";
        const icons: Record<string, any> = { text: MessageSquare, template: FileText, file: Image, audio: Mic, video: Video, catalog: ShoppingBag, link: Link2 };
        const labels: Record<string, string> = { text: "Texto", template: "Template", file: "Arquivo", audio: "Áudio", video: "Vídeo", catalog: "Catálogo", link: "Link" };
        const I = icons[ct] || MessageSquare;
        if (ct === "template" && node.data.template_id) {
          const tpl = templates.find(t => t.id === node.data.template_id);
          return (
            <div className="space-y-1">
              <Badge variant="outline" className="text-[9px] h-4"><FileText className="h-2.5 w-2.5 mr-1" />{tpl?.name || "Template"}</Badge>
              {tpl?.content && <p className="text-[11px] text-slate-600 italic whitespace-pre-wrap break-words">{tpl.content}</p>}
            </div>
          );
        }
        if (ct === "link") {
          const cfg = node.data.link_config;
          const url = cfg?.product_id ? resolveLinkUrl(cfg) : node.data.link_url;
          const prod = cfg?.product_id ? productsList.find(p => p.id === cfg.product_id) : null;
          return (
            <div className="space-y-1">
              {prod && <Badge variant="outline" className="text-[9px] h-4"><ShoppingBag className="h-2.5 w-2.5 mr-1" />{prod.name}</Badge>}
              <p className="text-[10px] text-blue-600 break-all line-clamp-2">{url || "Configurar link..."}</p>
            </div>
          );
        }
        return (
          <div className="flex items-start gap-1.5 max-w-[460px]">
            <I className="h-3 w-3 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-600 whitespace-pre-wrap break-words">
              {ct === "text" ? (node.data.content || "Configurar...") : labels[ct] || ct}
            </p>
          </div>
        );
      }
      case "choice": {
        const opts = (node.data.options || []) as { label: string }[];
        return <div className="flex gap-1 flex-wrap">{opts.map((o, i) => <Badge key={i} variant="outline" className="text-[9px] h-4">{o.label}</Badge>)}</div>;
      }
      case "condition": {
        if (node.data.condition_type === "any_response") {
          return (
            <div className="flex gap-1 flex-wrap">
              <Badge variant="outline" className="text-[9px] h-4">Qualquer resposta</Badge>
              <Badge variant="outline" className="text-[9px] h-4 border-dashed">Sem resposta</Badge>
            </div>
          );
        }
        const opts = (node.data.options || []) as { label: string }[];
        return <div className="flex gap-1 flex-wrap">{opts.map((o, i) => <Badge key={i} variant="outline" className="text-[9px] h-4">{o.label}</Badge>)}<Badge variant="outline" className="text-[9px] h-4 border-dashed">Default</Badge></div>;
      }
      case "wait": {
        if (node.data.wait_type === "specific_date") return <p className="text-[11px] text-slate-600">📅 {DAYS.find(d => d.value === node.data.specific_day)?.label || "?"} {node.data.specific_time || ""}</p>;
        const units: Record<string, string> = { m: "min", h: "h", d: "dias" };
        return <p className="text-[11px] text-slate-600">⏱ {node.data.delay_value || 0} {units[node.data.delay_unit] || "min"}</p>;
      }
      case "input": return <p className="text-[11px] text-slate-600 line-clamp-1">{node.data.question || "Pergunta..."}</p>;
      case "action": {
        const labels: Record<string, string> = { add_tag: "➕ Tag", remove_tag: "➖ Tag", go_to_flow: "↗️ Ir p/ fluxo", trigger_block: "⚡ Acionar bloco", mark_converted: "✅ Convertido" };
        return <p className="text-[11px] text-slate-600">{labels[node.data.action_type] || "Ação"}: {node.data.tag || node.data.flow_id?.substring(0, 8) || node.data.block_id || ""}</p>;
      }
      case "ai_gen": {
        const agentName = node.data.agent_id ? agents.find(a => a.id === node.data.agent_id)?.name : null;
        return <p className="text-[11px] text-slate-600 line-clamp-1">🤖 {agentName ? `[${agentName}] ` : ""}{node.data.prompt || "Prompt..."}</p>;
      }
      case "transfer": {
        if (node.data.target === "human" && node.data.target_user_id) {
          const userName = users.find(u => u.id === node.data.target_user_id)?.full_name;
          return <p className="text-[11px] text-slate-600">👤 {userName || node.data.target_user_id.substring(0, 8)}</p>;
        }
        if (node.data.target === "ai_agent" && node.data.target_agent_id) {
          const agName = agents.find(a => a.id === node.data.target_agent_id)?.name;
          return <p className="text-[11px] text-slate-600">🤖 {agName || "Agente"}</p>;
        }
        return <p className="text-[11px] text-slate-600">→ {node.data.target === "human" ? "Atendente" : node.data.target === "ai_agent" ? "Agente IA" : "Fila"}</p>;
      }
      case "set_variable": {
        const vars = (node.data.variables || []) as Array<{ source_label: string }>;
        if (vars.length === 0) return <p className="text-[11px] text-slate-600">{node.data.variable || "var"} = {node.data.value || "..."}</p>;
        const concat = vars.map(v => v.source_label || "?").join(" + ");
        return <p className="text-[11px] text-slate-600 break-words"><span className="font-medium">{node.data.variable || "var"}</span> = {concat}</p>;
      }
      case "start": return <p className="text-[11px] text-slate-500">Ponto de entrada</p>;
      case "end": return <p className="text-[11px] text-slate-500">Encerra fluxo</p>;
      default: return null;
    }
  }

  function renderPropertiesPanel() {
    if (!selectedNodeObj || selectedNodeObj.type === "start") return null;
    const n = selectedNodeObj;
    const meta = getNodeMeta(n.type);
    const Icon = meta.icon;

    return (
      <div className="w-[300px] border-l bg-card overflow-y-auto">
        <div className="p-3 border-b flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
          <h4 className="text-sm font-semibold">{meta.label}</h4>
        </div>
        <ScrollArea className="h-[calc(100%-50px)]">
          <div className="p-3 space-y-3">
            {/* ── Message ── */}
            {n.type === "message" && (
              <>
                <div>
                  <Label className="text-xs">Tipo de conteúdo</Label>
                  <Select value={n.data.content_type || "text"} onValueChange={v => updateNodeData(n.id, { content_type: v })}>
                    <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">💬 Texto</SelectItem>
                      <SelectItem value="template">📋 Template</SelectItem>
                      <SelectItem value="file">📎 Arquivo/Imagem</SelectItem>
                      <SelectItem value="audio">🎤 Áudio</SelectItem>
                      <SelectItem value="video">🎬 Vídeo</SelectItem>
                      <SelectItem value="link">🔗 Link</SelectItem>
                      <SelectItem value="catalog">🛒 Catálogo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {n.data.content_type === "text" && (
                  <div>
                    <Label className="text-xs">Mensagem</Label>
                    <Textarea value={n.data.content || ""} onChange={e => updateNodeData(n.id, { content: e.target.value })}
                      placeholder="Use {Nome}, {Produto}..." rows={4} className="text-xs mt-1" />
                  </div>
                )}
                {n.data.content_type === "template" && (
                  <div>
                    <Label className="text-xs">Template</Label>
                    <Select value={n.data.template_id || ""} onValueChange={v => updateNodeData(n.id, { template_id: v })}>
                      <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                      <SelectContent>{templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                {n.data.content_type === "file" && (
                  <div>
                    <Label className="text-xs">URL do arquivo</Label>
                    <Input value={n.data.file_url || ""} onChange={e => updateNodeData(n.id, { file_url: e.target.value })}
                      placeholder="https://..." className="h-8 text-xs mt-1" />
                  </div>
                )}
                {n.data.content_type === "audio" && (
                  <div>
                    <Label className="text-xs">URL do áudio (pré-gravado)</Label>
                    <Input value={n.data.audio_url || ""} onChange={e => updateNodeData(n.id, { audio_url: e.target.value })}
                      placeholder="https://...mp3" className="h-8 text-xs mt-1" />
                    <p className="text-[10px] text-muted-foreground mt-1">Será enviado como se fosse gravado no momento</p>
                  </div>
                )}
                {n.data.content_type === "video" && (
                  <div>
                    <Label className="text-xs">URL do vídeo</Label>
                    <Input value={n.data.video_url || ""} onChange={e => updateNodeData(n.id, { video_url: e.target.value })}
                      placeholder="https://...mp4" className="h-8 text-xs mt-1" />
                  </div>
                )}
                {n.data.content_type === "link" && (
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs">Produto</Label>
                      <Select
                        value={n.data.link_config?.product_id || ""}
                        onValueChange={v => {
                          const cfg = { ...(n.data.link_config || {}), product_id: v };
                          updateNodeData(n.id, { link_config: cfg, link_url: resolveLinkUrl(cfg) });
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Selecionar produto..." /></SelectTrigger>
                        <SelectContent>
                          {productsList.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Prescritor (opcional — aplica cupom)</Label>
                      <Select
                        value={n.data.link_config?.doctor_id || "__none__"}
                        onValueChange={v => {
                          const cfg = { ...(n.data.link_config || {}), doctor_id: v === "__none__" ? "" : v };
                          updateNodeData(n.id, { link_config: cfg, link_url: resolveLinkUrl(cfg) });
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Nenhum</SelectItem>
                          {doctorsCoupons.map(d => <SelectItem key={d.doctor_id} value={d.doctor_id}>{d.doctor_name} ({d.coupon_code})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Versão do Checkout</Label>
                      <Select
                        value={n.data.link_config?.checkout_version || "default"}
                        onValueChange={v => {
                          const cfg = { ...(n.data.link_config || {}), checkout_version: v };
                          updateNodeData(n.id, { link_config: cfg, link_url: resolveLinkUrl(cfg) });
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Padrão</SelectItem>
                          <SelectItem value="1">V1</SelectItem>
                          <SelectItem value="2">V2</SelectItem>
                          <SelectItem value="3">V3</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {n.data.link_url && (
                      <div className="p-2 rounded border bg-slate-50 text-[10px] break-all text-blue-700">
                        🔗 {n.data.link_url}
                      </div>
                    )}
                  </div>
                )}
                {n.data.content_type === "catalog" && (
                  <p className="text-xs text-muted-foreground">Enviará o catálogo de produtos do WhatsApp Business.</p>
                )}
              </>
            )}

            {/* ── Choice ── */}
            {n.type === "choice" && (
              <>
                <div>
                  <Label className="text-xs">Pergunta / Texto</Label>
                  <Textarea value={n.data.question || ""} onChange={e => updateNodeData(n.id, { question: e.target.value })}
                    placeholder="Escolha uma opção:" rows={2} className="text-xs mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Opções</Label>
                  {((n.data.options || []) as { label: string; tag: string }[]).map((opt, i) => (
                    <div key={i} className="flex gap-1 mt-1.5 items-center">
                      <Input value={opt.label} className="h-7 text-xs flex-1"
                        onChange={e => {
                          const opts = [...(n.data.options || [])];
                          opts[i] = { ...opts[i], label: e.target.value };
                          updateNodeData(n.id, { options: opts });
                        }} placeholder={`Opção ${i + 1}`} />
                      <Input value={opt.tag || ""} className="h-7 text-xs w-20" placeholder="tag"
                        onChange={e => {
                          const opts = [...(n.data.options || [])];
                          opts[i] = { ...opts[i], tag: e.target.value };
                          updateNodeData(n.id, { options: opts });
                        }} />
                      <button onClick={() => {
                        const opts = [...(n.data.options || [])];
                        opts.splice(i, 1);
                        updateNodeData(n.id, { options: opts });
                      }} className="text-red-400 hover:text-red-600"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" className="h-6 text-[10px] mt-2 w-full" onClick={() => {
                    updateNodeData(n.id, { options: [...(n.data.options || []), { label: `Opção ${(n.data.options?.length || 0) + 1}`, tag: "" }] });
                  }}><Plus className="h-3 w-3 mr-1" /> Adicionar Opção</Button>
                </div>
                <p className="text-[10px] text-muted-foreground">Cada opção gera uma saída separada. Conecte cada uma ao próximo bloco.</p>
              </>
            )}

            {/* ── Condition ── */}
            {n.type === "condition" && (
              <>
                <div>
                  <Label className="text-xs">Tipo de condição</Label>
                  <Select value={n.data.condition_type || "keywords"} onValueChange={v => updateNodeData(n.id, { condition_type: v })}>
                    <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="keywords">Por palavras-chave</SelectItem>
                      <SelectItem value="any_response">Qualquer resposta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {n.data.condition_type !== "any_response" && (
                  <div>
                    <Label className="text-xs">Opções (palavras-chave)</Label>
                    {((n.data.options || []) as { label: string; keywords: string[] }[]).map((opt, i) => (
                      <div key={i} className="mt-2 p-2 rounded border bg-slate-50">
                        <Input value={opt.label} className="h-7 text-xs mb-1" placeholder="Nome da condição"
                          onChange={e => {
                            const opts = [...(n.data.options || [])];
                            opts[i] = { ...opts[i], label: e.target.value };
                            updateNodeData(n.id, { options: opts });
                          }} />
                        <Textarea value={(opt.keywords || []).join(", ")} rows={2} className="text-xs"
                          placeholder="sim, quero, aceito (separar por vírgula)"
                          onChange={e => {
                            const opts = [...(n.data.options || [])];
                            opts[i] = { ...opts[i], keywords: e.target.value.split(",").map(s => s.trim()).filter(Boolean) };
                            updateNodeData(n.id, { options: opts });
                          }} />
                        <button onClick={() => {
                          const opts = [...(n.data.options || [])];
                          opts.splice(i, 1);
                          updateNodeData(n.id, { options: opts });
                        }} className="text-red-400 hover:text-red-600 text-[10px] mt-1">Remover</button>
                      </div>
                    ))}
                    <Button size="sm" variant="outline" className="h-6 text-[10px] mt-2 w-full" onClick={() => {
                      updateNodeData(n.id, { options: [...(n.data.options || []), { label: "Nova condição", keywords: [] }] });
                    }}><Plus className="h-3 w-3 mr-1" /> Adicionar Condição</Button>
                    <p className="text-[10px] text-muted-foreground mt-1">Se a resposta contém uma das palavras, segue o caminho. "Default" para nenhuma correspondência.</p>
                  </div>
                )}
              </>
            )}

            {/* ── Wait ── */}
            {n.type === "wait" && (
              <>
                <div>
                  <Label className="text-xs">Tipo de espera</Label>
                  <Select value={n.data.wait_type || "delay"} onValueChange={v => updateNodeData(n.id, { wait_type: v })}>
                    <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="delay">Tempo fixo</SelectItem>
                      <SelectItem value="specific_date">Data/hora específica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {n.data.wait_type === "specific_date" ? (
                  <>
                    <div>
                      <Label className="text-xs">Dia da semana</Label>
                      <Select value={n.data.specific_day || "monday"} onValueChange={v => updateNodeData(n.id, { specific_day: v })}>
                        <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>{DAYS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Horário</Label>
                      <Input type="time" value={n.data.specific_time || "09:00"}
                        onChange={e => updateNodeData(n.id, { specific_time: e.target.value })} className="h-8 text-xs mt-1" />
                    </div>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label className="text-xs">Valor</Label>
                      <Input type="number" min={1} value={n.data.delay_value || 5}
                        onChange={e => updateNodeData(n.id, { delay_value: Number(e.target.value) })} className="h-8 text-xs mt-1" />
                    </div>
                    <div className="w-24">
                      <Label className="text-xs">Unidade</Label>
                      <Select value={n.data.delay_unit || "m"} onValueChange={v => updateNodeData(n.id, { delay_unit: v })}>
                        <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="m">Minutos</SelectItem>
                          <SelectItem value="h">Horas</SelectItem>
                          <SelectItem value="d">Dias</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── Input ── */}
            {n.type === "input" && (
              <>
                <div>
                  <Label className="text-xs">Pergunta</Label>
                  <Textarea value={n.data.question || ""} onChange={e => updateNodeData(n.id, { question: e.target.value })}
                    placeholder="Qual seu nome?" rows={3} className="text-xs mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Salvar em variável</Label>
                  <Input value={n.data.variable_name || ""} onChange={e => updateNodeData(n.id, { variable_name: e.target.value })}
                    placeholder="nome" className="h-8 text-xs mt-1" />
                </div>
              </>
            )}

            {/* ── Action ── */}
            {n.type === "action" && (
              <>
                <div>
                  <Label className="text-xs">Tipo de ação</Label>
                  <Select value={n.data.action_type || "add_tag"} onValueChange={v => updateNodeData(n.id, { action_type: v })}>
                    <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="add_tag">Adicionar Tag</SelectItem>
                      <SelectItem value="remove_tag">Remover Tag</SelectItem>
                      <SelectItem value="go_to_flow">Ir para outro Fluxo</SelectItem>
                      <SelectItem value="trigger_block">Acionar Bloco</SelectItem>
                      <SelectItem value="mark_converted">Marcar como Convertido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(n.data.action_type === "add_tag" || n.data.action_type === "remove_tag") && (
                  <div>
                    <Label className="text-xs">Tag</Label>
                    <Input value={n.data.tag || ""} onChange={e => updateNodeData(n.id, { tag: e.target.value })}
                      placeholder="lead_quente" className="h-8 text-xs mt-1" />
                  </div>
                )}
                {n.data.action_type === "go_to_flow" && (
                  <div>
                    <Label className="text-xs">Fluxo destino</Label>
                    <Select value={n.data.flow_id || ""} onValueChange={v => updateNodeData(n.id, { flow_id: v })}>
                      <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Selecionar fluxo..." /></SelectTrigger>
                      <SelectContent>{allFlows.filter(f => f.id !== flow?.id).map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                {n.data.action_type === "trigger_block" && (
                  <div>
                    <Label className="text-xs">ID do bloco</Label>
                    <Select value={n.data.block_id || ""} onValueChange={v => updateNodeData(n.id, { block_id: v })}>
                      <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Selecionar bloco..." /></SelectTrigger>
                      <SelectContent>{nodes.filter(nd => nd.id !== n.id && nd.type !== "start").map(nd => (
                        <SelectItem key={nd.id} value={nd.id}>{getNodeMeta(nd.type).label}: {nd.id.substring(0, 10)}</SelectItem>
                      ))}</SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            {/* ── AI Gen ── */}
            {n.type === "ai_gen" && (
              <>
                <div>
                  <Label className="text-xs">Agente IA (opcional)</Label>
                  <Select value={n.data.agent_id || "__default__"} onValueChange={v => {
                    const actualValue = v === "__default__" ? "" : v;
                    const agent = agents.find(a => a.id === actualValue);
                    updateNodeData(n.id, { agent_id: actualValue, model: agent?.model || n.data.model });
                  }}>
                    <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Usar configuração padrão" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__default__">Padrão ({llmConfig?.default_model || "Lovable AI"})</SelectItem>
                      {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.name} ({a.model})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Prompt</Label>
                  <Textarea value={n.data.prompt || ""} onChange={e => updateNodeData(n.id, { prompt: e.target.value })}
                    placeholder="Gere uma resposta personalizada baseada no contexto da conversa e dados do lead..." rows={4} className="text-xs mt-1" />
                  <p className="text-[10px] text-muted-foreground mt-1">Variáveis: {"{Nome}"}, {"{Telefone}"}, {"{mensagem_anterior}"}, {"{contexto_conversa}"}</p>
                </div>
                <div>
                  <Label className="text-xs">Modelo</Label>
                  <Select value={n.data.model || "google/gemini-3-flash-preview"} onValueChange={v => updateNodeData(n.id, { model: v })}>
                    <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google/gemini-3-flash-preview">Gemini 3 Flash</SelectItem>
                      <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                      <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                      <SelectItem value="openai/gpt-5-mini">GPT-5 Mini</SelectItem>
                      <SelectItem value="openai/gpt-5">GPT-5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="pt-2">
                  <Button variant="outline" size="sm" className="w-full text-xs" disabled={aiTesting || !n.data.prompt}
                    onClick={async () => {
                      setAiTesting(true);
                      setAiTestResult(null);
                      try {
                        const { data, error } = await supabase.functions.invoke("ai-agent-chat", {
                          body: {
                            message: n.data.prompt.replace("{Nome}", "João").replace("{mensagem_anterior}", "Olá, preciso de ajuda").replace("{contexto_conversa}", "Cliente interessado em produtos"),
                            agentId: n.data.agent_id || undefined,
                            model: n.data.model,
                          },
                        });
                        if (error) throw error;
                        setAiTestResult(data?.reply || data?.message || JSON.stringify(data));
                      } catch (e: any) {
                        setAiTestResult(`❌ Erro: ${e.message}`);
                      }
                      setAiTesting(false);
                    }}>
                    <Play className="h-3 w-3 mr-1" /> {aiTesting ? "Testando..." : "Testar Prompt"}
                  </Button>
                  {aiTestResult && (
                    <div className="mt-2 p-2 rounded border bg-slate-50 text-[11px] text-slate-700 max-h-32 overflow-y-auto whitespace-pre-wrap">
                      {aiTestResult}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── Transfer ── */}
            {n.type === "transfer" && (
              <>
                <div>
                  <Label className="text-xs">Transferir para</Label>
                  <Select value={n.data.target || "human"} onValueChange={v => updateNodeData(n.id, { target: v, target_user_id: "", target_agent_id: "" })}>
                    <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="human">Atendente Humano</SelectItem>
                      <SelectItem value="ai_agent">Agente IA</SelectItem>
                      <SelectItem value="queue">Fila de Espera</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {n.data.target === "human" && (
                  <div>
                    <Label className="text-xs">Atendente</Label>
                    <Select value={n.data.target_user_id || "__any__"} onValueChange={v => updateNodeData(n.id, { target_user_id: v === "__any__" ? "" : v })}>
                      <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Qualquer disponível" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__any__">Qualquer disponível</SelectItem>
                        {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || "Sem nome"}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {n.data.target === "ai_agent" && (
                  <div>
                    <Label className="text-xs">Agente IA</Label>
                    <Select value={n.data.target_agent_id || ""} onValueChange={v => updateNodeData(n.id, { target_agent_id: v })}>
                      <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Selecionar agente..." /></SelectTrigger>
                      <SelectContent>
                        {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            {/* ── Set Variable ── */}
            {n.type === "set_variable" && (
              <>
                <div>
                  <Label className="text-xs">Variável principal (opcional)</Label>
                  <Input value={n.data.variable || ""} onChange={e => updateNodeData(n.id, { variable: e.target.value })}
                    placeholder="ex: produto_interesse" className="h-8 text-xs mt-1" />
                  <p className="text-[10px] text-muted-foreground mt-1">Resultado final = concatenação dos valores abaixo.</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Fontes (concatenam)</Label>
                  {((n.data.variables || []) as Array<{ name: string; source_type: string; source_value: string; source_label: string }>).map((v, i) => {
                    const updateVar = (patch: any) => {
                      const arr = [...(n.data.variables || [])];
                      arr[i] = { ...arr[i], ...patch };
                      updateNodeData(n.id, { variables: arr });
                    };
                    const removeVar = () => {
                      const arr = [...(n.data.variables || [])];
                      arr.splice(i, 1);
                      updateNodeData(n.id, { variables: arr });
                    };
                    return (
                      <div key={i} className="p-2 rounded border bg-slate-50 space-y-1.5">
                        <div className="flex gap-1 items-center">
                          <Select value={v.source_type || "custom"} onValueChange={val => updateVar({ source_type: val, source_value: "", source_label: "" })}>
                            <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {VAR_SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <button onClick={removeVar} className="text-red-400 hover:text-red-600"><Trash2 className="h-3 w-3" /></button>
                        </div>
                        {v.source_type === "custom" && (
                          <Input value={v.source_value || ""} onChange={e => updateVar({ source_value: e.target.value, source_label: e.target.value })}
                            placeholder='texto ou {variavel}' className="h-7 text-xs" />
                        )}
                        {v.source_type === "product" && (
                          <Select value={v.source_value || ""} onValueChange={val => {
                            const p = productsList.find(x => x.id === val);
                            updateVar({ source_value: val, source_label: p?.name || "" });
                          }}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Selecionar produto..." /></SelectTrigger>
                            <SelectContent>{productsList.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                          </Select>
                        )}
                        {v.source_type === "tag" && (
                          <Select value={v.source_value || ""} onValueChange={val => updateVar({ source_value: val, source_label: val })}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Selecionar tag..." /></SelectTrigger>
                            <SelectContent>
                              {customerTags.length === 0 && <SelectItem value="__nenhuma__" disabled>Nenhuma tag cadastrada</SelectItem>}
                              {customerTags.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                        {v.source_type === "representative" && (
                          <Select value={v.source_value || ""} onValueChange={val => {
                            const r = representatives.find(x => x.id === val);
                            updateVar({ source_value: val, source_label: r?.name || "" });
                          }}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                            <SelectContent>{representatives.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                          </Select>
                        )}
                        {v.source_type === "order_status" && (
                          <Select value={v.source_value || ""} onValueChange={val => {
                            const o = ORDER_STATUSES.find(x => x.value === val);
                            updateVar({ source_value: val, source_label: o?.label || val });
                          }}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Selecionar status..." /></SelectTrigger>
                            <SelectContent>{ORDER_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                          </Select>
                        )}
                        {v.source_type === "recovery_stage" && (
                          <Select value={v.source_value || ""} onValueChange={val => {
                            const o = RECOVERY_STAGES.find(x => x.value === val);
                            updateVar({ source_value: val, source_label: o?.label || val });
                          }}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Selecionar estágio..." /></SelectTrigger>
                            <SelectContent>{RECOVERY_STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                          </Select>
                        )}
                        {v.source_type === "repurchase_stage" && (
                          <Select value={v.source_value || ""} onValueChange={val => {
                            const o = REPURCHASE_STAGES.find(x => x.value === val);
                            updateVar({ source_value: val, source_label: o?.label || val });
                          }}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Selecionar estágio..." /></SelectTrigger>
                            <SelectContent>{REPURCHASE_STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                          </Select>
                        )}
                        {v.source_type === "coupon" && (
                          <Select value={v.source_value || ""} onValueChange={val => updateVar({ source_value: val, source_label: val })}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Selecionar cupom..." /></SelectTrigger>
                            <SelectContent>
                              {couponsList.length === 0 && <SelectItem value="__none__" disabled>Nenhum cupom ativo</SelectItem>}
                              {couponsList.map(c => <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                        {v.source_type === "behavior_profile" && (
                          <Select value={v.source_value || ""} onValueChange={val => {
                            const o = BEHAVIOR_PROFILES.find(x => x.value === val);
                            updateVar({ source_value: val, source_label: o?.label || val });
                          }}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Selecionar perfil..." /></SelectTrigger>
                            <SelectContent>{BEHAVIOR_PROFILES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                          </Select>
                        )}
                      </div>
                    );
                  })}
                  <Button size="sm" variant="outline" className="h-7 text-xs w-full" onClick={() => {
                    updateNodeData(n.id, { variables: [...(n.data.variables || []), { name: "", source_type: "custom", source_value: "", source_label: "" }] });
                  }}><Plus className="h-3 w-3 mr-1" /> Adicionar Variável</Button>
                </div>
              </>
            )}

            {/* ── Actions ── */}
            <div className="pt-3 border-t space-y-2">
              <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => disconnectAll(n.id)}>
                <Unlink className="h-3 w-3 mr-1" /> Desvincular Tudo
              </Button>
              <Button variant="destructive" size="sm" className="w-full text-xs" onClick={() => setDeleteConfirmId(n.id)}>
                <Trash2 className="h-3 w-3 mr-1" /> Excluir Bloco
              </Button>
            </div>
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 border-b bg-card">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
        <div className="flex-1 flex items-center gap-2">
          <Input value={name} onChange={e => setName(e.target.value)} className="max-w-[250px] h-8 text-sm font-semibold" />
          <Select value={triggerEvent} onValueChange={setTriggerEvent}>
            <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="new_conversation">Nova Conversa</SelectItem>
              <SelectItem value="keyword">Palavra-chave</SelectItem>
              <SelectItem value="inbound_message">Msg Recebida</SelectItem>
            </SelectContent>
          </Select>
          {triggerEvent === "keyword" && (
            <Input value={triggerValue} onChange={e => setTriggerValue(e.target.value)} placeholder="oi, olá" className="max-w-[150px] h-8 text-xs" />
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.max(0.3, z - 0.1))}><ZoomOut className="h-3.5 w-3.5" /></Button>
          <span className="text-xs text-muted-foreground w-10 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.min(2, z + 0.1))}><ZoomIn className="h-3.5 w-3.5" /></Button>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}><Maximize2 className="h-3.5 w-3.5" /></Button>
        </div>
        <Button variant={testPanelOpen ? "default" : "outline"} size="sm" onClick={() => setTestPanelOpen(v => !v)}><Play className="h-4 w-4 mr-1" /> Testar</Button>
        <Button onClick={save} disabled={saving} size="sm"><Save className="h-4 w-4 mr-1" /> {saving ? "..." : "Salvar"}</Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Palette */}
        <div className="w-[180px] border-r bg-card p-3 space-y-1.5 overflow-y-auto">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Blocos</p>
          {NODE_TYPES.map(nt => {
            const Icon = nt.icon;
            return (
              <button key={nt.type} onClick={() => addNode(nt.type)}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md border text-xs font-medium hover:shadow-sm transition-all ${nt.bg}`}>
                <Icon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: nt.color }} />
                {nt.label}
              </button>
            );
          })}
          {connecting && (
            <div className="mt-4 p-2 rounded-md bg-blue-50 border border-blue-200 text-[10px] text-blue-700">
              🔗 Arraste até o destino ou solte no vazio para criar bloco
              <Button size="sm" variant="ghost" className="h-5 text-[10px] mt-1 w-full" onClick={() => setConnecting(null)}>Cancelar</Button>
            </div>
          )}
        </div>

        {/* Canvas */}
        <div ref={canvasRef} className="flex-1 relative overflow-hidden bg-slate-50 cursor-grab active:cursor-grabbing"
          onMouseDown={handleCanvasMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleCanvasMouseUp} onMouseLeave={handleCanvasMouseUp}>
          <div className="flow-canvas-bg absolute inset-0" style={{
            backgroundImage: "radial-gradient(circle, #CBD5E1 1px, transparent 1px)",
            backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }} />
          <svg className="absolute inset-0 pointer-events-none"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0" }}
            width="5000" height="5000">
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#94A3B8" />
              </marker>
            </defs>
            <g className="pointer-events-auto">{renderEdges()}</g>
          </svg>

          {/* Temporary drag-connect line (in screen coords, no transform) */}
          {connecting && (() => {
            const fromNode = nodes.find(n => n.id === connecting.nodeId);
            if (!fromNode) return null;
            const handles = getOutputHandles(fromNode);
            let yOff = 100;
            if (handles.length > 0 && connecting.handle) {
              const hi = handles.findIndex(h => h.label === connecting.handle);
              if (hi >= 0) yOff = 100 + hi * 22;
            }
            const sx = (fromNode.position.x + 260) * zoom + pan.x;
            const sy = (fromNode.position.y + yOff) * zoom + pan.y;
            return (
              <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%">
                <path d={`M ${sx} ${sy} L ${connecting.mouseX} ${connecting.mouseY}`}
                  stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="6 4" fill="none" />
                <circle cx={connecting.mouseX} cy={connecting.mouseY} r="4" fill="hsl(var(--primary))" />
              </svg>
            );
          })()}

          <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0" }} className="absolute">
            {nodes.map(node => {
              const meta = getNodeMeta(node.type);
              const Icon = meta.icon;
              const isSelected = selectedNode === node.id;
              const isStart = node.type === "start";
              const handles = getOutputHandles(node);
              const hasMultipleOutputs = handles.length > 0;

              return (
                <div key={node.id}
                  className={`absolute select-none transition-all`}
                  style={{
                    left: node.position.x,
                    top: node.position.y,
                    minWidth: 260,
                    maxWidth: node.type === "message" && (node.data.content_type || "text") === "text" ? 500 : 320,
                    width: "fit-content",
                  }}
                  onMouseDown={e => handleNodeMouseDown(e, node.id)}>
                  <div
                    className={`rounded-xl bg-white shadow-md overflow-hidden transition-all ${isSelected ? "ring-2 ring-offset-1 shadow-lg" : "hover:shadow-md"}`}
                    style={{
                      borderWidth: 2,
                      borderStyle: "solid",
                      borderColor: isSelected ? meta.color : meta.color + "40",
                      boxShadow: isSelected ? `0 8px 24px -8px ${meta.color}66` : undefined,
                    }}
                  >
                    {/* Header */}
                    <div
                      className="flex items-center gap-2 px-3 py-2"
                      style={{ background: `linear-gradient(135deg, ${meta.color}22, ${meta.color}10)` }}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: meta.color, color: "white" }}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] uppercase tracking-wider text-slate-500 leading-none mb-0.5">WhatsApp</p>
                        <p className="text-xs font-semibold leading-tight truncate" style={{ color: meta.color }}>
                          {isStart ? "Início" : meta.label}
                        </p>
                      </div>
                      <GripVertical className="h-3 w-3 text-slate-400 cursor-grab flex-shrink-0" />
                      {!isStart && (
                        <button
                          onClick={e => { e.stopPropagation(); setDeleteConfirmId(node.id); }}
                          className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    {/* Body */}
                    <div className="px-3 py-2.5 bg-white min-h-[36px]">
                      {renderNodePreview(node)}
                    </div>

                    {/* Multiple output handles (footer) */}
                    {hasMultipleOutputs && (
                      <div className="border-t border-slate-100 bg-slate-50/50 px-3 py-2 space-y-1.5">
                        {handles.map((h, i) => (
                          <div key={i} className="flex items-center justify-between gap-2 text-[10px] group">
                            <span className="text-slate-600 font-medium truncate">{h.label}</span>
                            <div
                              title="Arraste para conectar"
                              className={`w-3 h-3 rounded-full border-2 cursor-crosshair flex-shrink-0 transition-all ${
                                connecting?.nodeId === node.id && connecting?.handle === h.label
                                  ? "border-slate-700 bg-slate-700 scale-125 animate-pulse"
                                  : "border-slate-400 bg-white hover:border-slate-700 hover:scale-125"
                              }`}
                              onMouseDown={e => handleOutputMouseDown(e, node.id, h.label)}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Single output footer */}
                    {!hasMultipleOutputs && node.type !== "end" && !isStart && (
                      <div className="border-t border-slate-100 bg-slate-50/50 px-3 py-1.5 flex items-center justify-between text-[10px]">
                        <span className="text-slate-500">Próximo</span>
                        <div
                          title="Arraste para conectar"
                          className={`w-3 h-3 rounded-full border-2 cursor-crosshair transition-all ${
                            connecting?.nodeId === node.id
                              ? "border-slate-700 bg-slate-700 scale-125 animate-pulse"
                              : "border-slate-400 bg-white hover:border-slate-700 hover:scale-125"
                          }`}
                          onMouseDown={e => handleOutputMouseDown(e, node.id)}
                        />
                      </div>
                    )}
                    {isStart && (
                      <div className="border-t border-slate-100 bg-slate-50/50 px-3 py-1.5 flex items-center justify-between text-[10px]">
                        <span className="text-slate-500">Iniciar fluxo</span>
                        <div
                          title="Arraste para conectar"
                          className={`w-3 h-3 rounded-full border-2 cursor-crosshair transition-all ${
                            connecting?.nodeId === node.id
                              ? "border-slate-700 bg-slate-700 scale-125 animate-pulse"
                              : "border-slate-400 bg-white hover:border-slate-700 hover:scale-125"
                          }`}
                          onMouseDown={e => handleOutputMouseDown(e, node.id)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Input handle */}
                  {!isStart && (
                    <div
                      data-input-node={node.id}
                      title="Soltar aqui para conectar"
                      className="absolute -left-2 top-8 w-4 h-4 rounded-full border-2 border-slate-400 bg-white hover:border-slate-700 hover:scale-125 cursor-pointer transition-all"
                      onMouseDown={e => e.stopPropagation()}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Next Step Menu */}
          {addNodeMenu && (
            <div
              className="absolute z-40 w-[260px] bg-popover border rounded-lg shadow-2xl overflow-hidden"
              style={{ left: Math.min(addNodeMenu.x, (canvasRef.current?.clientWidth || 800) - 270), top: Math.min(addNodeMenu.y, (canvasRef.current?.clientHeight || 600) - 400) }}
              onMouseDown={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/40">
                <p className="text-xs font-semibold">Próxima etapa</p>
                <button onClick={() => setAddNodeMenu(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="max-h-[400px] overflow-y-auto p-2 space-y-2">
                <div>
                  <p className="text-[9px] font-semibold text-muted-foreground uppercase px-1 mb-1">Conteúdo</p>
                  {(["message", "input", "choice"] as NodeType[]).map(t => {
                    const m = NODE_TYPES.find(x => x.type === t)!;
                    const I = m.icon;
                    return (
                      <button key={t} onClick={() => handleAddFromMenu(t)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs font-medium hover:shadow-sm transition-all border ${m.bg}`}>
                        <I className="h-3.5 w-3.5" style={{ color: m.color }} /> {m.label}
                      </button>
                    );
                  })}
                </div>
                <div>
                  <p className="text-[9px] font-semibold text-muted-foreground uppercase px-1 mb-1">Lógica</p>
                  {(["condition", "wait", "ai_gen", "transfer", "action", "set_variable", "end"] as NodeType[]).map(t => {
                    const m = NODE_TYPES.find(x => x.type === t)!;
                    const I = m.icon;
                    return (
                      <button key={t} onClick={() => handleAddFromMenu(t)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs font-medium hover:shadow-sm transition-all border ${m.bg} mt-1`}>
                        <I className="h-3.5 w-3.5" style={{ color: m.color }} /> {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Properties */}
        {renderPropertiesPanel()}

        {/* Test Panel (lateral) */}
        {testPanelOpen && (
          <FlowTestPanel onClose={() => setTestPanelOpen(false)} nodes={nodes} edges={edges} />
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir bloco?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este bloco? Esta ação não pode ser desfeita e todas as conexões com ele serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteConfirmId) deleteNode(deleteConfirmId); setDeleteConfirmId(null); }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ───── Main Export ───── */
export default function WhatsAppFlowEditor() {
  const [editing, setEditing] = useState<Flow | null | undefined>(undefined);
  if (editing !== undefined) return <FlowCanvas flow={editing} onBack={() => setEditing(undefined)} />;
  return <FlowList onEdit={f => setEditing(f)} />;
}
