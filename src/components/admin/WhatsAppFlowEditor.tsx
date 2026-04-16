import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Plus, Save, Trash2, Play, Pause, ArrowLeft, GripVertical,
  MessageSquare, GitBranch, Clock, Bot, UserCheck, Flag,
  Zap, Variable, HelpCircle, ChevronRight, Edit, Copy,
  MousePointer, ZoomIn, ZoomOut, Maximize2,
} from "lucide-react";

/* ───── Types ───── */
interface FlowNode {
  id: string;
  type: "start" | "message" | "condition" | "wait" | "input" | "ai_gen" | "transfer" | "set_variable" | "end";
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

const NODE_TYPES = [
  { type: "message" as const, label: "Mensagem", icon: MessageSquare, color: "#3B82F6", bg: "bg-blue-50 border-blue-300" },
  { type: "condition" as const, label: "Condição", icon: GitBranch, color: "#F59E0B", bg: "bg-amber-50 border-amber-300" },
  { type: "wait" as const, label: "Esperar", icon: Clock, color: "#8B5CF6", bg: "bg-purple-50 border-purple-300" },
  { type: "input" as const, label: "Pergunta", icon: HelpCircle, color: "#10B981", bg: "bg-emerald-50 border-emerald-300" },
  { type: "ai_gen" as const, label: "IA Gerar", icon: Bot, color: "#EC4899", bg: "bg-pink-50 border-pink-300" },
  { type: "transfer" as const, label: "Transferir", icon: UserCheck, color: "#06B6D4", bg: "bg-cyan-50 border-cyan-300" },
  { type: "set_variable" as const, label: "Variável", icon: Variable, color: "#6366F1", bg: "bg-indigo-50 border-indigo-300" },
  { type: "end" as const, label: "Fim", icon: Flag, color: "#EF4444", bg: "bg-red-50 border-red-300" },
];

function genId() {
  return `node_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
}

function getNodeMeta(type: string) {
  return NODE_TYPES.find(n => n.type === type) || NODE_TYPES[0];
}

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
      name: `${flow.name} (cópia)`,
      description: flow.description,
      nodes: flow.nodes as any,
      edges: flow.edges as any,
      active: false,
      trigger_event: flow.trigger_event,
      trigger_value: flow.trigger_value,
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
            <p className="text-xs text-muted-foreground mt-1">Crie fluxos visuais com ramificações, condições e IA</p>
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

/* ───── Flow Canvas Editor ───── */
function FlowCanvas({ flow, onBack }: { flow: Flow | null; onBack: () => void }) {
  const [name, setName] = useState(flow?.name || "Novo Fluxo");
  const [description, setDescription] = useState(flow?.description || "");
  const [triggerEvent, setTriggerEvent] = useState(flow?.trigger_event || "manual");
  const [triggerValue, setTriggerValue] = useState(flow?.trigger_value || "");
  const [nodes, setNodes] = useState<FlowNode[]>(
    (flow?.nodes as unknown as FlowNode[]) || [{ id: "start_1", type: "start", position: { x: 80, y: 200 }, data: {} }]
  );
  const [edges, setEdges] = useState<FlowEdge[]>((flow?.edges as unknown as FlowEdge[]) || []);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const selectedNodeObj = nodes.find(n => n.id === selectedNode);

  function addNode(type: FlowNode["type"]) {
    const centerX = 300 + Math.random() * 200 - pan.x / zoom;
    const centerY = 200 + Math.random() * 100 - pan.y / zoom;
    const newNode: FlowNode = {
      id: genId(),
      type,
      position: { x: Math.round(centerX), y: Math.round(centerY) },
      data: getDefaultData(type),
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedNode(newNode.id);
  }

  function getDefaultData(type: FlowNode["type"]): Record<string, any> {
    switch (type) {
      case "message": return { content: "" };
      case "condition": return { variable: "", options: ["Sim", "Não"] };
      case "wait": return { delay_minutes: 5 };
      case "input": return { question: "", variable_name: "resposta" };
      case "ai_gen": return { prompt: "", model: "gpt-5-mini" };
      case "transfer": return { target: "human" };
      case "set_variable": return { variable: "", value: "" };
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

  function addEdge(from: string, to: string, label?: string) {
    if (from === to) return;
    if (edges.some(e => e.from === from && e.to === to)) return;
    setEdges(prev => [...prev, { id: `e_${Date.now()}`, from, to, label }]);
  }

  function deleteEdge(edgeId: string) {
    setEdges(prev => prev.filter(e => e.id !== edgeId));
  }

  async function save() {
    if (!name.trim()) { toast.error("Nome obrigatório"); return; }
    setSaving(true);
    try {
      const payload = {
        name,
        description,
        nodes: nodes as any,
        edges: edges as any,
        trigger_event: triggerEvent,
        trigger_value: triggerValue,
      };
      if (flow?.id) {
        const { error } = await supabase.from("whatsapp_flows").update(payload as any).eq("id", flow.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("whatsapp_flows").insert(payload as any);
        if (error) throw error;
      }
      toast.success("Fluxo salvo!");
      onBack();
    } catch (e: any) {
      toast.error(e.message);
    }
    setSaving(false);
  }

  // Mouse handlers for dragging nodes
  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    setDragging(nodeId);
    setDragStart({ x: e.clientX, y: e.clientY });
    setSelectedNode(nodeId);
  }, []);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains("flow-canvas-bg")) {
      setPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      setSelectedNode(null);
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragging) {
      const dx = (e.clientX - dragStart.x) / zoom;
      const dy = (e.clientY - dragStart.y) / zoom;
      setDragStart({ x: e.clientX, y: e.clientY });
      setNodes(prev => prev.map(n =>
        n.id === dragging ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } } : n
      ));
    }
    if (panning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  }, [dragging, dragStart, panning, panStart, zoom]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
    setPanning(false);
  }, []);

  // Handle clicking on a node's output handle to start connection
  function handleOutputClick(nodeId: string, handleLabel?: string) {
    if (connecting) {
      if (connecting !== nodeId) {
        addEdge(connecting, nodeId, handleLabel);
      }
      setConnecting(null);
    } else {
      setConnecting(nodeId);
    }
  }

  // Render SVG edges
  function renderEdges() {
    return edges.map(edge => {
      const fromNode = nodes.find(n => n.id === edge.from);
      const toNode = nodes.find(n => n.id === edge.to);
      if (!fromNode || !toNode) return null;
      const x1 = fromNode.position.x + 120;
      const y1 = fromNode.position.y + 30;
      const x2 = toNode.position.x;
      const y2 = toNode.position.y + 30;
      const midX = (x1 + x2) / 2;

      return (
        <g key={edge.id}>
          <path
            d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
            fill="none"
            stroke="#94A3B8"
            strokeWidth="2"
            markerEnd="url(#arrowhead)"
            className="cursor-pointer hover:stroke-blue-500 transition-colors"
            onClick={() => deleteEdge(edge.id)}
          />
          {edge.label && (
            <text x={midX} y={(y1 + y2) / 2 - 8} textAnchor="middle" className="text-[10px] fill-muted-foreground font-medium">
              {edge.label}
            </text>
          )}
        </g>
      );
    });
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 border-b bg-card">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
        <div className="flex-1 flex items-center gap-2">
          <Input value={name} onChange={e => setName(e.target.value)} className="max-w-[250px] h-8 text-sm font-semibold" />
          <Select value={triggerEvent} onValueChange={setTriggerEvent}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="new_conversation">Nova Conversa</SelectItem>
              <SelectItem value="keyword">Palavra-chave</SelectItem>
              <SelectItem value="inbound_message">Msg Recebida</SelectItem>
            </SelectContent>
          </Select>
          {triggerEvent === "keyword" && (
            <Input value={triggerValue} onChange={e => setTriggerValue(e.target.value)} placeholder="Ex: oi, olá" className="max-w-[150px] h-8 text-xs" />
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.max(0.3, z - 0.1))}>
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground w-10 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.min(2, z + 0.1))}>
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
        <Button onClick={save} disabled={saving} size="sm">
          <Save className="h-4 w-4 mr-1" /> {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Node palette */}
        <div className="w-[180px] border-r bg-card p-3 space-y-1.5 overflow-y-auto">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Blocos</p>
          {NODE_TYPES.map(nt => {
            const Icon = nt.icon;
            return (
              <button
                key={nt.type}
                onClick={() => addNode(nt.type)}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md border text-xs font-medium hover:shadow-sm transition-all ${nt.bg}`}
              >
                <Icon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: nt.color }} />
                {nt.label}
              </button>
            );
          })}
          {connecting && (
            <div className="mt-4 p-2 rounded-md bg-blue-50 border border-blue-200 text-[10px] text-blue-700">
              🔗 Clique em um nó de destino para conectar
              <Button size="sm" variant="ghost" className="h-5 text-[10px] mt-1 w-full" onClick={() => setConnecting(null)}>Cancelar</Button>
            </div>
          )}
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          className="flex-1 relative overflow-hidden bg-slate-50 cursor-grab active:cursor-grabbing"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Grid dots background */}
          <div
            className="flow-canvas-bg absolute inset-0"
            style={{
              backgroundImage: "radial-gradient(circle, #CBD5E1 1px, transparent 1px)",
              backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
              backgroundPosition: `${pan.x}px ${pan.y}px`,
            }}
          />

          {/* SVG edges */}
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0" }}
            width="5000" height="5000"
          >
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#94A3B8" />
              </marker>
            </defs>
            <g className="pointer-events-auto">{renderEdges()}</g>
          </svg>

          {/* Nodes */}
          <div
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0" }}
            className="absolute"
          >
            {nodes.map(node => {
              const meta = getNodeMeta(node.type);
              const Icon = meta.icon;
              const isSelected = selectedNode === node.id;
              const isStart = node.type === "start";
              const hasOutgoing = edges.some(e => e.from === node.id);

              return (
                <div
                  key={node.id}
                  className={`absolute select-none ${isSelected ? "ring-2 ring-blue-500" : ""}`}
                  style={{ left: node.position.x, top: node.position.y, width: 240 }}
                  onMouseDown={e => handleNodeMouseDown(e, node.id)}
                >
                  {/* Node card */}
                  <div className={`rounded-lg border-2 bg-white shadow-sm overflow-hidden ${isSelected ? "border-blue-400" : "border-slate-200"}`}>
                    {/* Header */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5" style={{ backgroundColor: meta.color + "15" }}>
                      <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab" />
                      <Icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
                      <span className="text-xs font-semibold flex-1" style={{ color: meta.color }}>
                        {isStart ? "Início" : meta.label}
                      </span>
                      {!isStart && (
                        <button onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                          className="text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    {/* Body preview */}
                    <div className="px-3 py-2 min-h-[28px]">
                      {node.type === "message" && (
                        <p className="text-[11px] text-slate-600 line-clamp-2">{node.data.content || "Clique para configurar..."}</p>
                      )}
                      {node.type === "condition" && (
                        <div className="flex gap-1 flex-wrap">
                          {(node.data.options || []).map((opt: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-[9px] h-4">{opt}</Badge>
                          ))}
                        </div>
                      )}
                      {node.type === "wait" && (
                        <p className="text-[11px] text-slate-600">⏱ {node.data.delay_minutes} min</p>
                      )}
                      {node.type === "input" && (
                        <p className="text-[11px] text-slate-600 line-clamp-1">{node.data.question || "Pergunta..."}</p>
                      )}
                      {node.type === "ai_gen" && (
                        <p className="text-[11px] text-slate-600 line-clamp-1">🤖 {node.data.prompt || "Prompt..."}</p>
                      )}
                      {node.type === "transfer" && (
                        <p className="text-[11px] text-slate-600">→ {node.data.target}</p>
                      )}
                      {node.type === "set_variable" && (
                        <p className="text-[11px] text-slate-600">{node.data.variable || "var"} = {node.data.value || "..."}</p>
                      )}
                      {node.type === "start" && (
                        <p className="text-[11px] text-slate-500">Ponto de entrada</p>
                      )}
                      {node.type === "end" && (
                        <p className="text-[11px] text-slate-500">Encerra fluxo</p>
                      )}
                    </div>
                  </div>

                  {/* Input handle (left) */}
                  {!isStart && (
                    <div
                      className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-slate-300 bg-white hover:border-blue-500 cursor-pointer transition-colors"
                      onClick={e => { e.stopPropagation(); handleOutputClick(node.id); }}
                    />
                  )}

                  {/* Output handle(s) */}
                  {node.type === "condition" ? (
                    (node.data.options || []).map((opt: string, i: number) => (
                      <div
                        key={i}
                        className={`absolute -right-2 w-4 h-4 rounded-full border-2 bg-white hover:border-blue-500 cursor-pointer transition-colors ${connecting === node.id ? "border-blue-500 animate-pulse" : "border-slate-300"}`}
                        style={{ top: `${30 + i * 20}px` }}
                        onClick={e => { e.stopPropagation(); setConnecting(node.id); }}
                        title={opt}
                      />
                    ))
                  ) : node.type !== "end" ? (
                    <div
                      className={`absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 bg-white hover:border-blue-500 cursor-pointer transition-colors ${connecting === node.id ? "border-blue-500 animate-pulse" : "border-slate-300"}`}
                      onClick={e => { e.stopPropagation(); setConnecting(node.id); }}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* Properties panel */}
        {selectedNodeObj && selectedNodeObj.type !== "start" && (
          <div className="w-[280px] border-l bg-card overflow-y-auto">
            <div className="p-3 border-b">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                {(() => { const m = getNodeMeta(selectedNodeObj.type); const I = m.icon; return <I className="h-3.5 w-3.5" style={{ color: m.color }} />; })()}
                {getNodeMeta(selectedNodeObj.type).label}
              </h4>
            </div>
            <div className="p-3 space-y-3">
              {selectedNodeObj.type === "message" && (
                <div>
                  <Label className="text-xs">Conteúdo da mensagem</Label>
                  <Textarea
                    value={selectedNodeObj.data.content || ""}
                    onChange={e => updateNodeData(selectedNodeObj.id, { content: e.target.value })}
                    placeholder="Digite a mensagem... Use {variavel} para variáveis"
                    rows={5}
                    className="text-xs mt-1"
                  />
                </div>
              )}
              {selectedNodeObj.type === "condition" && (
                <>
                  <div>
                    <Label className="text-xs">Variável</Label>
                    <Input
                      value={selectedNodeObj.data.variable || ""}
                      onChange={e => updateNodeData(selectedNodeObj.id, { variable: e.target.value })}
                      placeholder="Ex: resposta, status"
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Opções (uma por linha)</Label>
                    <Textarea
                      value={(selectedNodeObj.data.options || []).join("\n")}
                      onChange={e => updateNodeData(selectedNodeObj.id, { options: e.target.value.split("\n").filter(Boolean) })}
                      rows={4}
                      className="text-xs mt-1"
                    />
                  </div>
                </>
              )}
              {selectedNodeObj.type === "wait" && (
                <div>
                  <Label className="text-xs">Tempo de espera (minutos)</Label>
                  <Input
                    type="number"
                    value={selectedNodeObj.data.delay_minutes || 0}
                    onChange={e => updateNodeData(selectedNodeObj.id, { delay_minutes: Number(e.target.value) })}
                    className="h-8 text-xs mt-1"
                  />
                </div>
              )}
              {selectedNodeObj.type === "input" && (
                <>
                  <div>
                    <Label className="text-xs">Pergunta</Label>
                    <Textarea
                      value={selectedNodeObj.data.question || ""}
                      onChange={e => updateNodeData(selectedNodeObj.id, { question: e.target.value })}
                      placeholder="Ex: Qual seu nome?"
                      rows={3}
                      className="text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Salvar resposta em</Label>
                    <Input
                      value={selectedNodeObj.data.variable_name || ""}
                      onChange={e => updateNodeData(selectedNodeObj.id, { variable_name: e.target.value })}
                      placeholder="nome_variavel"
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                </>
              )}
              {selectedNodeObj.type === "ai_gen" && (
                <>
                  <div>
                    <Label className="text-xs">Prompt para IA</Label>
                    <Textarea
                      value={selectedNodeObj.data.prompt || ""}
                      onChange={e => updateNodeData(selectedNodeObj.id, { prompt: e.target.value })}
                      placeholder="Gere uma resposta personalizada para..."
                      rows={4}
                      className="text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Modelo</Label>
                    <Select value={selectedNodeObj.data.model || "gpt-5-mini"} onValueChange={v => updateNodeData(selectedNodeObj.id, { model: v })}>
                      <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-5-mini">GPT-5 Mini</SelectItem>
                        <SelectItem value="gpt-5">GPT-5</SelectItem>
                        <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              {selectedNodeObj.type === "transfer" && (
                <div>
                  <Label className="text-xs">Transferir para</Label>
                  <Select value={selectedNodeObj.data.target || "human"} onValueChange={v => updateNodeData(selectedNodeObj.id, { target: v })}>
                    <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="human">Atendente Humano</SelectItem>
                      <SelectItem value="ai_agent">Agente IA</SelectItem>
                      <SelectItem value="queue">Fila de Espera</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {selectedNodeObj.type === "set_variable" && (
                <>
                  <div>
                    <Label className="text-xs">Nome da variável</Label>
                    <Input
                      value={selectedNodeObj.data.variable || ""}
                      onChange={e => updateNodeData(selectedNodeObj.id, { variable: e.target.value })}
                      placeholder="minha_variavel"
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Valor</Label>
                    <Input
                      value={selectedNodeObj.data.value || ""}
                      onChange={e => updateNodeData(selectedNodeObj.id, { value: e.target.value })}
                      placeholder="valor ou {outra_variavel}"
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                </>
              )}

              <div className="pt-2 border-t">
                <Button variant="destructive" size="sm" className="w-full text-xs" onClick={() => deleteNode(selectedNodeObj.id)}>
                  <Trash2 className="h-3 w-3 mr-1" /> Excluir Bloco
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───── Main Export ───── */
export default function WhatsAppFlowEditor() {
  const [editing, setEditing] = useState<Flow | null | undefined>(undefined);

  if (editing !== undefined) {
    return <FlowCanvas flow={editing} onBack={() => setEditing(undefined)} />;
  }

  return <FlowList onEdit={(f) => setEditing(f)} />;
}
