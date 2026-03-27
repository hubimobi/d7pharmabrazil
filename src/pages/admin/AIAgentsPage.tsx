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
import {
  Bot, UserPlus, ShoppingBag, RotateCcw, Heart, TrendingUp,
  Headphones, Calculator, ClipboardList, Stethoscope, Pencil,
  Power, Loader2, Sparkles,
} from "lucide-react";
import { toast } from "sonner";

const ICON_MAP: Record<string, React.ElementType> = {
  Bot, UserPlus, ShoppingBag, RotateCcw, Heart, TrendingUp,
  Headphones, Calculator, ClipboardList, Stethoscope,
};

const AVAILABLE_MODELS = [
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (Rápido)" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (Balanceado)" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (Avançado)" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini (Rápido)" },
  { value: "openai/gpt-5", label: "GPT-5 (Avançado)" },
];

const CHANNELS = [
  { id: "admin", label: "Painel Interno" },
  { id: "whatsapp", label: "WhatsApp (GHL)" },
  { id: "webchat", label: "Webchat do Site" },
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
  created_at: string;
  updated_at: string;
}

export default function AIAgentsPage() {
  const [editAgent, setEditAgent] = useState<AIAgent | null>(null);
  const [form, setForm] = useState({
    name: "", slug: "", description: "", system_prompt: "",
    model: "google/gemini-3-flash-preview", temperature: 0.7,
    active: false, channels: [] as string[], icon: "Bot", color: "#2563eb",
  });
  const qc = useQueryClient();

  const { data: agents, isLoading } = useQuery({
    queryKey: ["ai-agents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_agents" as any)
        .select("*")
        .order("created_at");
      if (error) throw error;
      return (data as unknown as AIAgent[]) || [];
    },
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("ai_agents" as any)
        .update({ active } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-agents"] });
      toast.success("Status atualizado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!editAgent) return;
      const { error } = await supabase
        .from("ai_agents" as any)
        .update({
          name: form.name,
          description: form.description,
          system_prompt: form.system_prompt,
          model: form.model,
          temperature: form.temperature,
          active: form.active,
          channels: form.channels,
          icon: form.icon,
          color: form.color,
        } as any)
        .eq("id", editAgent.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-agents"] });
      toast.success("Agente salvo com sucesso!");
      setEditAgent(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (agent: AIAgent) => {
    setEditAgent(agent);
    setForm({
      name: agent.name,
      slug: agent.slug,
      description: agent.description,
      system_prompt: agent.system_prompt,
      model: agent.model,
      temperature: agent.temperature,
      active: agent.active,
      channels: (agent.channels as string[]) || [],
      icon: agent.icon,
      color: agent.color,
    });
  };

  const toggleChannel = (ch: string) => {
    setForm((prev) => ({
      ...prev,
      channels: prev.channels.includes(ch)
        ? prev.channels.filter((c) => c !== ch)
        : [...prev.channels, ch],
    }));
  };

  const getIcon = (iconName: string) => ICON_MAP[iconName] || Bot;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Agentes de IA</h2>
            <p className="text-sm text-muted-foreground">Configure as skills e comportamento de cada agente</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(agents || []).map((agent) => {
            const IconComp = getIcon(agent.icon);
            return (
              <Card
                key={agent.id}
                className={`relative overflow-hidden border transition-all hover:shadow-md ${agent.active ? "border-border" : "border-border/30 opacity-60"}`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="h-12 w-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: agent.color + "20" }}
                    >
                      <IconComp className="h-6 w-6" style={{ color: agent.color }} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={agent.active}
                        onCheckedChange={(v) => toggleMut.mutate({ id: agent.id, active: v })}
                      />
                    </div>
                  </div>

                  <h3 className="font-semibold text-foreground mb-1">{agent.name}</h3>
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{agent.description}</p>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {((agent.channels as string[]) || []).map((ch) => (
                      <Badge key={ch} variant="secondary" className="text-[10px]">
                        {ch === "admin" ? "Painel" : ch === "whatsapp" ? "WhatsApp" : ch === "webchat" ? "Webchat" : ch}
                      </Badge>
                    ))}
                    {(!agent.channels || (agent.channels as string[]).length === 0) && (
                      <span className="text-[10px] text-muted-foreground italic">Nenhum canal</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge variant={agent.active ? "default" : "secondary"} className="text-[10px]">
                      {agent.active ? "Ativo" : "Inativo"}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(agent)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

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
            {/* Basic info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input value={form.slug} disabled className="opacity-60" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            {/* System Prompt */}
            <div className="space-y-2">
              <Label>Prompt do Sistema (Skill)</Label>
              <Textarea
                value={form.system_prompt}
                onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
                rows={6}
                placeholder="Defina o comportamento, personalidade e regras do agente..."
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Este texto define como o agente se comporta. Seja detalhado sobre o tom, regras e limites.
              </p>
            </div>

            {/* Model + Temperature */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Modelo de IA</Label>
                <Select value={form.model} onValueChange={(v) => setForm({ ...form, model: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_MODELS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Temperatura ({form.temperature})</Label>
                <Input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={form.temperature}
                  onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })}
                  className="h-9"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Preciso</span>
                  <span>Criativo</span>
                </div>
              </div>
            </div>

            {/* Channels */}
            <div className="space-y-3">
              <Label>Canais de Atuação</Label>
              <div className="grid grid-cols-3 gap-3">
                {CHANNELS.map((ch) => (
                  <label
                    key={ch.id}
                    className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                      form.channels.includes(ch.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <Checkbox
                      checked={form.channels.includes(ch.id)}
                      onCheckedChange={() => toggleChannel(ch.id)}
                    />
                    <span className="text-sm">{ch.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Icon + Color */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ícone</Label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(ICON_MAP).map(([name, Icon]) => (
                    <button
                      key={name}
                      onClick={() => setForm({ ...form, icon: name })}
                      className={`h-9 w-9 rounded-lg flex items-center justify-center border transition-colors ${
                        form.icon === name ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cor do Agente</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="h-9 w-14 rounded border border-border cursor-pointer"
                  />
                  <Input
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="flex-1 font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
              <div>
                <p className="text-sm font-medium">Status do Agente</p>
                <p className="text-xs text-muted-foreground">
                  {form.active ? "Agente está ativo e operacional" : "Agente desativado"}
                </p>
              </div>
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
            </div>

            {/* Save */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditAgent(null)}>Cancelar</Button>
              <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
                {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Salvar Agente
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
