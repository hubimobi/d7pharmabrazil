import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Cpu, Loader2, CheckCircle, Sparkles, BarChart3, Zap, TrendingUp, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LLMConfig {
  id: string;
  provider: string;
  api_key_name: string;
  default_model: string;
  active: boolean;
  is_default: boolean;
  created_at: string;
}

interface TokenUsageRow {
  id: string;
  agent_id: string | null;
  agent_name: string;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  function_name: string;
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

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function AILLMConfig() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();
  const [form, setForm] = useState({ provider: "lovable", api_key_name: "", default_model: "", active: false });

  const { data: configs, isLoading } = useQuery({
    queryKey: ["ai-llm-config"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ai_llm_config" as any).select("*").order("created_at");
      if (error) throw error;
      return (data as unknown as LLMConfig[]) || [];
    },
  });

  // Token usage data
  const now = new Date();
  const monthStart = startOfMonth(now).toISOString();
  const monthEnd = endOfMonth(now).toISOString();

  const { data: monthlyUsage } = useQuery({
    queryKey: ["ai-token-usage-month", monthStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_token_usage" as any)
        .select("*")
        .gte("created_at", monthStart)
        .lte("created_at", monthEnd)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as TokenUsageRow[]) || [];
    },
  });

  const { data: totalUsage } = useQuery({
    queryKey: ["ai-token-usage-total"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_token_usage" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data as unknown as TokenUsageRow[]) || [];
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
          tenant_id: tenantId,
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

  // Calculate stats
  const monthlyStats = {
    totalTokens: (monthlyUsage || []).reduce((s, r) => s + r.total_tokens, 0),
    inputTokens: (monthlyUsage || []).reduce((s, r) => s + r.input_tokens, 0),
    outputTokens: (monthlyUsage || []).reduce((s, r) => s + r.output_tokens, 0),
    requests: (monthlyUsage || []).length,
  };

  const totalStats = {
    totalTokens: (totalUsage || []).reduce((s, r) => s + r.total_tokens, 0),
    inputTokens: (totalUsage || []).reduce((s, r) => s + r.input_tokens, 0),
    outputTokens: (totalUsage || []).reduce((s, r) => s + r.output_tokens, 0),
    requests: (totalUsage || []).length,
  };

  // Group monthly by agent/function
  const byAgent = (monthlyUsage || []).reduce((acc, row) => {
    const key = row.agent_name || row.function_name;
    if (!acc[key]) acc[key] = { tokens: 0, requests: 0, provider: row.provider, model: row.model };
    acc[key].tokens += row.total_tokens;
    acc[key].requests += 1;
    return acc;
  }, {} as Record<string, { tokens: number; requests: number; provider: string; model: string }>);

  const sortedAgents = Object.entries(byAgent).sort((a, b) => b[1].tokens - a[1].tokens);

  // Group by provider
  const byProvider = (monthlyUsage || []).reduce((acc, row) => {
    if (!acc[row.provider]) acc[row.provider] = { tokens: 0, requests: 0 };
    acc[row.provider].tokens += row.total_tokens;
    acc[row.provider].requests += 1;
    return acc;
  }, {} as Record<string, { tokens: number; requests: number }>);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Configuração de LLM</h3>
        <p className="text-sm text-muted-foreground">Configure o provedor de IA utilizado pelos agentes. O Lovable AI é o padrão (já configurado).</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {PROVIDERS.map((prov) => {
          const config = configs?.find((c) => c.provider === prov.value);
          // Lovable is always available as fallback; "active" reflects DB row when present
          const isActive = prov.value === "lovable" ? true : !!config?.active;
          const isDefault = !!config?.is_default || (prov.value === "lovable" && !configs?.some((c) => c.is_default));
          return (
            <Card
              key={prov.value}
              className={`cursor-pointer transition-all ${isActive ? "border-primary shadow-sm" : "border-border hover:border-border/80"}`}
              onClick={() => setForm({
                provider: prov.value,
                api_key_name: config?.api_key_name || "",
                default_model: config?.default_model || prov.models[0]?.value || "",
                active: config?.active || prov.value === "lovable",
              })}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    {prov.value === "lovable" ? <Sparkles className="h-5 w-5 text-primary" /> : <Cpu className="h-5 w-5 text-primary" />}
                  </div>
                  <div className="flex items-center gap-1">
                    {isDefault && <Badge className="text-[10px]">Padrão</Badge>}
                    {isActive ? <CheckCircle className="h-5 w-5 text-green-500" /> : <div className="h-5 w-5 rounded-full border-2 border-muted" />}
                  </div>
                </div>
                <h4 className="font-medium">{prov.label}</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {prov.value === "lovable" ? "Sempre disponível como fallback" : config?.active ? "Configurado e ativo" : "Requer API Key"}
                </p>
                {isActive && !isDefault && config && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={(e) => { e.stopPropagation(); setDefaultMut.mutate(config.id); }}
                    disabled={setDefaultMut.isPending}
                  >
                    Tornar padrão
                  </Button>
                )}
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
                <p className="text-xs text-muted-foreground">Você pode ativar vários provedores. Use "Tornar padrão" no card para escolher qual será usado por padrão.</p>
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

      {/* Token Usage Dashboard */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Histórico de Consumo de Tokens</h3>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Tokens no Mês</p>
              </div>
              <p className="text-2xl font-bold text-primary">{formatTokens(monthlyStats.totalTokens)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {format(now, "MMMM yyyy", { locale: ptBR })} • {monthlyStats.requests} requisições
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Total Geral</p>
              </div>
              <p className="text-2xl font-bold">{formatTokens(totalStats.totalTokens)}</p>
              <p className="text-xs text-muted-foreground mt-1">{totalStats.requests} requisições totais</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-blue-500" />
                <p className="text-xs text-muted-foreground">Input (Mês)</p>
              </div>
              <p className="text-2xl font-bold text-blue-600">{formatTokens(monthlyStats.inputTokens)}</p>
              <p className="text-xs text-muted-foreground mt-1">tokens de entrada</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-green-500" />
                <p className="text-xs text-muted-foreground">Output (Mês)</p>
              </div>
              <p className="text-2xl font-bold text-green-600">{formatTokens(monthlyStats.outputTokens)}</p>
              <p className="text-xs text-muted-foreground mt-1">tokens de saída</p>
            </CardContent>
          </Card>
        </div>

        {/* Usage by Provider */}
        {Object.keys(byProvider).length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Consumo por Provedor (Mês)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(byProvider).map(([provider, stats]) => {
                  const pct = monthlyStats.totalTokens > 0 ? (stats.tokens / monthlyStats.totalTokens) * 100 : 0;
                  const provLabel = provider === "lovable" ? "Lovable AI" : provider === "xai" ? "xAI (Grok)" : provider === "openai" ? "OpenAI" : provider;
                  return (
                    <div key={provider}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{provLabel}</span>
                        <span className="text-sm text-muted-foreground">{formatTokens(stats.tokens)} • {stats.requests} req</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Usage by Agent/Function */}
        {sortedAgents.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Consumo por Agente / Ferramenta (Mês)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sortedAgents.map(([name, stats]) => {
                  const pct = monthlyStats.totalTokens > 0 ? (stats.tokens / monthlyStats.totalTokens) * 100 : 0;
                  return (
                    <div key={name}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{name}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{stats.model}</Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">{formatTokens(stats.tokens)} • {stats.requests} req</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500 transition-all"
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Requests */}
        {(monthlyUsage || []).length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Últimas Requisições</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 font-medium">Agente / Função</th>
                      <th className="text-left py-2 font-medium">Provedor</th>
                      <th className="text-left py-2 font-medium">Modelo</th>
                      <th className="text-right py-2 font-medium">Input</th>
                      <th className="text-right py-2 font-medium">Output</th>
                      <th className="text-right py-2 font-medium">Total</th>
                      <th className="text-right py-2 font-medium">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(monthlyUsage || []).slice(0, 20).map((row) => (
                      <tr key={row.id} className="border-b border-border/50">
                        <td className="py-2">{row.agent_name || row.function_name}</td>
                        <td className="py-2">
                          <Badge variant="outline" className="text-[10px]">
                            {row.provider === "lovable" ? "Lovable" : row.provider === "xai" ? "xAI" : row.provider}
                          </Badge>
                        </td>
                        <td className="py-2 text-muted-foreground text-xs">{row.model}</td>
                        <td className="py-2 text-right text-blue-600">{formatTokens(row.input_tokens)}</td>
                        <td className="py-2 text-right text-green-600">{formatTokens(row.output_tokens)}</td>
                        <td className="py-2 text-right font-medium">{formatTokens(row.total_tokens)}</td>
                        <td className="py-2 text-right text-muted-foreground text-xs">
                          {format(new Date(row.created_at), "dd/MM HH:mm")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {(monthlyUsage || []).length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum uso de tokens registrado ainda.</p>
              <p className="text-xs mt-1">O consumo será registrado automaticamente a cada requisição de IA.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
