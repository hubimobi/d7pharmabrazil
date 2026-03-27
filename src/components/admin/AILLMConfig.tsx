import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Cpu, Loader2, CheckCircle, AlertCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface LLMConfig {
  id: string;
  provider: string;
  api_key_name: string;
  default_model: string;
  active: boolean;
  created_at: string;
}

const PROVIDERS = [
  { value: "lovable", label: "Lovable AI (Padrão)", models: [
    { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash" },
    { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    { value: "openai/gpt-5", label: "GPT-5" },
    { value: "openai/gpt-5-mini", label: "GPT-5 Mini" },
  ]},
  { value: "xai", label: "xAI (Grok)", models: [
    { value: "grok-3", label: "Grok 3" },
    { value: "grok-3-fast", label: "Grok 3 Fast" },
    { value: "grok-3-mini", label: "Grok 3 Mini" },
    { value: "grok-3-mini-fast", label: "Grok 3 Mini Fast" },
    { value: "grok-2", label: "Grok 2" },
  ]},
  { value: "openai", label: "OpenAI", models: [
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  ]},
  { value: "anthropic", label: "Anthropic (Claude)", models: [
    { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
    { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku" },
  ]},
];

export default function AILLMConfig() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ provider: "lovable", api_key_name: "", default_model: "", active: false });

  const { data: configs, isLoading } = useQuery({
    queryKey: ["ai-llm-config"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ai_llm_config" as any).select("*").order("created_at");
      if (error) throw error;
      return (data as unknown as LLMConfig[]) || [];
    },
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const existing = configs?.find((c) => c.provider === form.provider);
      if (existing) {
        const { error } = await supabase.from("ai_llm_config" as any).update({
          api_key_name: form.api_key_name,
          default_model: form.default_model,
          active: form.active,
        } as any).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ai_llm_config" as any).insert({
          provider: form.provider,
          api_key_name: form.api_key_name,
          default_model: form.default_model,
          active: form.active,
        } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-llm-config"] });
      toast.success("Configuração salva!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const selectedProvider = PROVIDERS.find((p) => p.value === form.provider);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Configuração de LLM</h3>
        <p className="text-sm text-muted-foreground">Configure o provedor de IA utilizado pelos agentes. O Lovable AI é o padrão (já configurado).</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {PROVIDERS.map((prov) => {
          const config = configs?.find((c) => c.provider === prov.value);
          const isActive = prov.value === "lovable" ? !configs?.some((c) => c.active && c.provider !== "lovable") : config?.active;
          return (
            <Card
              key={prov.value}
              className={`cursor-pointer transition-all ${isActive ? "border-primary shadow-sm" : "border-border hover:border-border/80"}`}
              onClick={() => setForm({
                provider: prov.value,
                api_key_name: config?.api_key_name || "",
                default_model: config?.default_model || prov.models[0]?.value || "",
                active: config?.active || false,
              })}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    {prov.value === "lovable" ? <Sparkles className="h-5 w-5 text-primary" /> : <Cpu className="h-5 w-5 text-primary" />}
                  </div>
                  {isActive ? <CheckCircle className="h-5 w-5 text-green-500" /> : <div className="h-5 w-5 rounded-full border-2 border-muted" />}
                </div>
                <h4 className="font-medium">{prov.label}</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {prov.value === "lovable" ? "Sem necessidade de API Key" : config?.active ? "Configurado e ativo" : "Requer API Key"}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configurar {selectedProvider?.label}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {form.provider !== "lovable" && (
            <div className="space-y-2">
              <Label>Nome do Secret (API Key)</Label>
              <Input
                placeholder={form.provider === "xai" ? "XAI_API_KEY" : form.provider === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY"}
                value={form.api_key_name}
                onChange={(e) => setForm({ ...form, api_key_name: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Configure o secret no painel do Lovable Cloud antes de ativar.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Modelo Padrão</Label>
            <Select value={form.default_model} onValueChange={(v) => setForm({ ...form, default_model: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {selectedProvider?.models.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {form.provider !== "lovable" && (
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div>
                <p className="text-sm font-medium">Ativar este provedor</p>
                <p className="text-xs text-muted-foreground">Desativa o Lovable AI como padrão</p>
              </div>
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
              {saveMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
