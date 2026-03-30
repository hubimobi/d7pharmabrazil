import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, FileText, MessageSquare, Image, Video, HelpCircle, Megaphone, RotateCcw } from "lucide-react";
import { toast } from "sonner";

const TOOL_ICONS: Record<string, React.ElementType> = {
  generate_testimonials: MessageSquare,
  generate_ad_copy: Megaphone,
  generate_image: Image,
  product_qa: HelpCircle,
  video_script: Video,
};

const TOOL_DESCRIPTIONS: Record<string, string> = {
  generate_testimonials: "Prompt usado para gerar testemunhos realistas com personas brasileiras",
  generate_ad_copy: "Prompt para criação de copies de anúncios (Facebook, Google, TikTok)",
  generate_image: "Prompt base para geração de imagens com IA",
  product_qa: "Prompt para o assistente de perguntas sobre produtos",
  video_script: "Prompt para geração de roteiros de vídeo",
};

interface SystemPrompt {
  id: string;
  tool_key: string;
  tool_label: string;
  system_prompt: string;
  user_prompt_template: string;
  temperature: number;
  created_at: string;
  updated_at: string;
}

export default function AISystemPrompts() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ system_prompt: "", user_prompt_template: "", temperature: 0.8 });

  const { data: prompts, isLoading } = useQuery({
    queryKey: ["ai-system-prompts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ai_system_prompts" as any).select("*").order("tool_key");
      if (error) throw error;
      return (data as unknown as SystemPrompt[]) || [];
    },
  });

  const saveMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ai_system_prompts" as any).update({
        system_prompt: editForm.system_prompt,
        user_prompt_template: editForm.user_prompt_template,
        temperature: editForm.temperature,
      } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-system-prompts"] });
      toast.success("Prompt atualizado!");
      setEditingId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const startEdit = (p: SystemPrompt) => {
    setEditingId(p.id);
    setEditForm({
      system_prompt: p.system_prompt,
      user_prompt_template: p.user_prompt_template,
      temperature: p.temperature,
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Prompts do Sistema</h3>
        <p className="text-sm text-muted-foreground">
          Personalize os prompts usados em cada ferramenta de IA. Todas as ferramentas utilizam o LLM ativo configurado na aba "Configuração LLM".
        </p>
      </div>

      <div className="space-y-4">
        {(prompts || []).map((p) => {
          const IconComp = TOOL_ICONS[p.tool_key] || FileText;
          const isEditing = editingId === p.id;

          return (
            <Card key={p.id} className="overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <IconComp className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{p.tool_label}</h4>
                      <p className="text-xs text-muted-foreground">{TOOL_DESCRIPTIONS[p.tool_key] || p.tool_key}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">Temp: {p.temperature}</Badge>
                    {!isEditing && (
                      <Button variant="outline" size="sm" onClick={() => startEdit(p)}>
                        Editar
                      </Button>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Prompt do Sistema (System)</Label>
                      <Textarea
                        value={editForm.system_prompt}
                        onChange={(e) => setEditForm({ ...editForm, system_prompt: e.target.value })}
                        rows={8}
                        className="font-mono text-sm"
                        placeholder="Instruções para o comportamento da IA..."
                      />
                      <p className="text-xs text-muted-foreground">Define o comportamento e regras da IA para esta ferramenta.</p>
                    </div>

                    <div className="space-y-2">
                      <Label>Template do Prompt do Usuário</Label>
                      <Textarea
                        value={editForm.user_prompt_template}
                        onChange={(e) => setEditForm({ ...editForm, user_prompt_template: e.target.value })}
                        rows={4}
                        className="font-mono text-sm"
                        placeholder="Use {variavel} para variáveis dinâmicas..."
                      />
                      <p className="text-xs text-muted-foreground">
                        Variáveis disponíveis: {"{productName}"}, {"{productDescription}"}, {"{benefits}"}, {"{quantity}"}, {"{platform}"}, {"{objective}"}, {"{prompt}"}, {"{question}"}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Temperatura ({editForm.temperature})</Label>
                      <Input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={editForm.temperature}
                        onChange={(e) => setEditForm({ ...editForm, temperature: parseFloat(e.target.value) })}
                        className="h-9"
                      />
                      <p className="text-xs text-muted-foreground">0 = mais preciso, 1 = mais criativo</p>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={() => saveMut.mutate(p.id)} disabled={saveMut.isPending}>
                        {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Salvar
                      </Button>
                      <Button variant="ghost" onClick={() => setEditingId(null)}>Cancelar</Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    <div className="bg-muted/30 rounded-lg p-3 border">
                      <p className="text-xs font-medium text-muted-foreground mb-1">System Prompt</p>
                      <p className="text-sm text-foreground whitespace-pre-wrap line-clamp-4">{p.system_prompt}</p>
                    </div>
                    <div className="bg-muted/20 rounded-lg p-3 border">
                      <p className="text-xs font-medium text-muted-foreground mb-1">User Template</p>
                      <p className="text-xs text-foreground font-mono whitespace-pre-wrap line-clamp-2">{p.user_prompt_template}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
