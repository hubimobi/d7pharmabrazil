import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bot, UserPlus, ShoppingBag, RotateCcw, Heart, TrendingUp,
  Headphones, Calculator, ClipboardList, Stethoscope, Pencil,
  Loader2, Sparkles, MessageCircle, Database, Users, Cpu,
} from "lucide-react";
import { toast } from "sonner";
import AIKnowledgeBase from "@/components/admin/AIKnowledgeBase";
import AIAgentChat from "@/components/admin/AIAgentChat";
import AIMeetingRoom from "@/components/admin/AIMeetingRoom";
import AILLMConfig from "@/components/admin/AILLMConfig";

const ICON_MAP: Record<string, React.ElementType> = {
  Bot, UserPlus, ShoppingBag, RotateCcw, Heart, TrendingUp,
  Headphones, Calculator, ClipboardList, Stethoscope,
};

const LOVABLE_MODELS = [
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (Rápido)" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (Balanceado)" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (Avançado)" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini (Rápido)" },
  { value: "openai/gpt-5", label: "GPT-5 (Avançado)" },
];

const EXTERNAL_MODELS: Record<string, { value: string; label: string }[]> = {
  xai: [
    { value: "grok-3", label: "Grok 3" },
    { value: "grok-3-fast", label: "Grok 3 Fast" },
    { value: "grok-3-mini", label: "Grok 3 Mini" },
    { value: "grok-3-mini-fast", label: "Grok 3 Mini Fast" },
    { value: "grok-2", label: "Grok 2" },
  ],
  openai: [
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  ],
  anthropic: [
    { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
    { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku" },
  ],
};

const CHANNELS = [
  { id: "admin", label: "Painel Interno" },
  { id: "whatsapp", label: "WhatsApp (GHL)" },
  { id: "webchat", label: "Webchat do Site" },
];

const ADMIN_PANELS = [
  { id: "vendas", label: "Vendas" },
  { id: "clientes", label: "Clientes" },
  { id: "produtos", label: "Produtos" },
  { id: "prescritores", label: "Prescritores" },
  { id: "comissoes", label: "Comissões" },
  { id: "relatorios", label: "Relatórios" },
  { id: "estoque", label: "Estoque" },
  { id: "cupons", label: "Cupons" },
];

interface AIAgent {
  id: string;
  name: string;
  slug: string;
  description: string;
  system_prompt: string;
  model: string;
  temperature: number;
  active: boolean;
  channels: string[];
  icon: string;
  color: string;
  allowed_panels: string[];
  llm_override: string | null;
  created_at: string;
  updated_at: string;
}

export default function AIAgentsPage() {
  const [editAgent, setEditAgent] = useState<AIAgent | null>(null);
  const [chatAgent, setChatAgent] = useState<AIAgent | null>(null);
  const [form, setForm] = useState({
    name: "", slug: "", description: "", system_prompt: "",
    model: "google/gemini-3-flash-preview", temperature: 0.7,
    active: false, channels: [] as string[], icon: "Bot", color: "#2563eb",
    allowed_panels: [] as string[], llm_override: "" as string,
  });
  const qc = useQueryClient();

  const { data: agents, isLoading } = useQuery({
    queryKey: ["ai-agents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ai_agents" as any).select("*").order("created_at");
      if (error) throw error;
      return (data as unknown as AIAgent[]) || [];
    },
  });

  // Fetch knowledge bases for linking
  const { data: knowledgeBases } = useQuery({
    queryKey: ["ai-knowledge-bases"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ai_knowledge_bases" as any).select("*").order("name");
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  // Fetch active LLM configs to determine available models
  const { data: llmConfigs } = useQuery({
    queryKey: ["ai-llm-config"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ai_llm_config" as any).select("*").order("created_at");
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  // Build available models from active LLM config
  const availableModels = (() => {
    const activeExternal = (llmConfigs || []).find((c: any) => c.active && c.provider !== "lovable");
    if (activeExternal) {
      const providerModels = EXTERNAL_MODELS[activeExternal.provider] || [];
      // Put the configured default model first
      const sorted = [...providerModels].sort((a, b) => 
        a.value === activeExternal.default_model ? -1 : b.value === activeExternal.default_model ? 1 : 0
      );
      return sorted;
    }
    return LOVABLE_MODELS;
  })();

  const defaultModel = (() => {
    const activeExternal = (llmConfigs || []).find((c: any) => c.active && c.provider !== "lovable");
    if (activeExternal?.default_model) return activeExternal.default_model;
    return "google/gemini-3-flash-preview";
  })();

  const [agentKbIds, setAgentKbIds] = useState<string[]>([]);

  const toggleMut = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("ai_agents" as any).update({ active } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ai-agents"] }); toast.success("Status atualizado!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!editAgent) return;
      const { error } = await supabase.from("ai_agents" as any).update({
        name: form.name, description: form.description, system_prompt: form.system_prompt,
        model: form.model, temperature: form.temperature, active: form.active,
        channels: form.channels, icon: form.icon, color: form.color,
        allowed_panels: form.allowed_panels, llm_override: form.llm_override || null,
      } as any).eq("id", editAgent.id);
      if (error) throw error;

      // Update KB links
      await supabase.from("ai_agent_knowledge_bases" as any).delete().eq("agent_id", editAgent.id);
      if (agentKbIds.length > 0) {
        await supabase.from("ai_agent_knowledge_bases" as any).insert(
          agentKbIds.map((kbId) => ({ agent_id: editAgent.id, knowledge_base_id: kbId })) as any
        );
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ai-agents"] }); toast.success("Agente salvo!"); setEditAgent(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = async (agent: AIAgent) => {
    setEditAgent(agent);
    setForm({
      name: agent.name, slug: agent.slug, description: agent.description,
      system_prompt: agent.system_prompt, model: agent.model, temperature: agent.temperature,
      active: agent.active, channels: (agent.channels as string[]) || [],
      icon: agent.icon, color: agent.color,
      allowed_panels: (agent.allowed_panels as string[]) || [],
      llm_override: agent.llm_override || "",
    });
    // Load KB links
    const { data } = await supabase.from("ai_agent_knowledge_bases" as any).select("knowledge_base_id").eq("agent_id", agent.id);
    setAgentKbIds((data as any[])?.map((d) => d.knowledge_base_id) || []);
  };

  const toggleChannel = (ch: string) => setForm((p) => ({ ...p, channels: p.channels.includes(ch) ? p.channels.filter((c) => c !== ch) : [...p.channels, ch] }));
  const togglePanel = (p: string) => setForm((prev) => ({ ...prev, allowed_panels: prev.allowed_panels.includes(p) ? prev.allowed_panels.filter((x) => x !== p) : [...prev.allowed_panels, p] }));
  const toggleKb = (id: string) => setAgentKbIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const getIcon = (iconName: string) => ICON_MAP[iconName] || Bot;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Agentes de IA</h2>
          <p className="text-sm text-muted-foreground">Configure agentes, bases de conhecimento e sala de reunião</p>
        </div>
      </div>

      <Tabs defaultValue="agents">
        <TabsList>
          <TabsTrigger value="agents" className="flex items-center gap-1.5"><Bot className="h-3.5 w-3.5" /> Agentes</TabsTrigger>
          <TabsTrigger value="knowledge" className="flex items-center gap-1.5"><Database className="h-3.5 w-3.5" /> Base de Conhecimento</TabsTrigger>
          <TabsTrigger value="meeting" className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Sala de Reunião</TabsTrigger>
          <TabsTrigger value="llm" className="flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5" /> Configuração LLM</TabsTrigger>
        </TabsList>

        <TabsContent value="agents">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(agents || []).map((agent) => {
                const IconComp = getIcon(agent.icon);
                return (
                  <Card key={agent.id} className={`relative overflow-hidden border transition-all hover:shadow-md ${agent.active ? "border-border" : "border-border/30 opacity-60"}`}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="h-12 w-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: agent.color + "20" }}>
                          <IconComp className="h-6 w-6" style={{ color: agent.color }} />
                        </div>
                        <Switch checked={agent.active} onCheckedChange={(v) => toggleMut.mutate({ id: agent.id, active: v })} />
                      </div>
                      <h3 className="font-semibold text-foreground mb-1">{agent.name}</h3>
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{agent.description}</p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {((agent.channels as string[]) || []).map((ch) => (
                          <Badge key={ch} variant="secondary" className="text-[10px]">
                            {ch === "admin" ? "Painel" : ch === "whatsapp" ? "WhatsApp" : "Webchat"}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge variant={agent.active ? "default" : "secondary"} className="text-[10px]">{agent.active ? "Ativo" : "Inativo"}</Badge>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setChatAgent(agent)}>
                            <MessageCircle className="h-3.5 w-3.5 mr-1" /> Chat
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(agent)}>
                            <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="knowledge"><AIKnowledgeBase /></TabsContent>
        <TabsContent value="meeting"><AIMeetingRoom /></TabsContent>
        <TabsContent value="llm"><AILLMConfig /></TabsContent>
      </Tabs>

      {/* Chat */}
      <AIAgentChat agent={chatAgent} onClose={() => setChatAgent(null)} />

      {/* Edit Dialog */}
      <Dialog open={!!editAgent} onOpenChange={() => setEditAgent(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {(() => { const I = getIcon(form.icon); return <I className="h-5 w-5" style={{ color: form.color }} />; })()}
              Editar Agente — {form.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Slug</Label><Input value={form.slug} disabled className="opacity-60" /></div>
            </div>

            <div className="space-y-2"><Label>Descrição</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>

            <div className="space-y-2">
              <Label>Prompt do Sistema (Skill)</Label>
              <Textarea value={form.system_prompt} onChange={(e) => setForm({ ...form, system_prompt: e.target.value })} rows={6} placeholder="Defina o comportamento do agente..." className="font-mono text-sm" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Modelo de IA</Label>
                <Select value={form.model} onValueChange={(v) => setForm({ ...form, model: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{AVAILABLE_MODELS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Temperatura ({form.temperature})</Label>
                <Input type="range" min="0" max="1" step="0.1" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })} className="h-9" />
              </div>
            </div>

            {/* Channels */}
            <div className="space-y-3">
              <Label>Canais de Atuação</Label>
              <div className="grid grid-cols-3 gap-3">
                {CHANNELS.map((ch) => (
                  <label key={ch.id} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${form.channels.includes(ch.id) ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}>
                    <Checkbox checked={form.channels.includes(ch.id)} onCheckedChange={() => toggleChannel(ch.id)} />
                    <span className="text-sm">{ch.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Allowed Panels (when admin channel is selected) */}
            {form.channels.includes("admin") && (
              <div className="space-y-3">
                <Label>Painéis Permitidos (Painel Interno)</Label>
                <div className="grid grid-cols-4 gap-2">
                  {ADMIN_PANELS.map((p) => (
                    <label key={p.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-sm transition-colors ${form.allowed_panels.includes(p.id) ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}>
                      <Checkbox checked={form.allowed_panels.includes(p.id)} onCheckedChange={() => togglePanel(p.id)} />
                      {p.label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Knowledge Bases */}
            {(knowledgeBases || []).length > 0 && (
              <div className="space-y-3">
                <Label>Bases de Conhecimento Vinculadas</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(knowledgeBases || []).map((kb: any) => (
                    <label key={kb.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-sm transition-colors ${agentKbIds.includes(kb.id) ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}>
                      <Checkbox checked={agentKbIds.includes(kb.id)} onCheckedChange={() => toggleKb(kb.id)} />
                      <Database className="h-3.5 w-3.5" /> {kb.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Icon + Color */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ícone</Label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(ICON_MAP).map(([name, Icon]) => (
                    <button key={name} onClick={() => setForm({ ...form, icon: name })} className={`h-9 w-9 rounded-lg flex items-center justify-center border transition-colors ${form.icon === name ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}>
                      <Icon className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cor do Agente</Label>
                <div className="flex items-center gap-3">
                  <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-9 w-14 rounded border border-border cursor-pointer" />
                  <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="flex-1 font-mono text-sm" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
              <div><p className="text-sm font-medium">Status do Agente</p><p className="text-xs text-muted-foreground">{form.active ? "Ativo e operacional" : "Desativado"}</p></div>
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditAgent(null)}>Cancelar</Button>
              <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
                {saveMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Salvar Agente
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
