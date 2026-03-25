import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Image, Type, Link2, Save, Loader2, Eye } from "lucide-react";

export default function BannerPage() {
  const { data: settings, isLoading } = useStoreSettings();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    hero_title: "",
    hero_subtitle: "",
    hero_button_text: "",
    hero_button_link: "",
    hero_button2_text: "",
    hero_button2_link: "",
    hero_image_url: "",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        hero_title: settings.hero_title || "Suplementos de Alta Performance com Qualidade Farmacêutica",
        hero_subtitle: settings.hero_subtitle || "Resultados reais com segurança e controle rigoroso",
        hero_button_text: settings.hero_button_text || "Comprar Agora",
        hero_button_link: settings.hero_button_link || "/produtos",
        hero_button2_text: settings.hero_button2_text || "Saiba Mais",
        hero_button2_link: settings.hero_button2_link || "/#beneficios",
        hero_image_url: settings.hero_image_url || "",
      });
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: async (values: typeof form) => {
      if (!settings?.id) throw new Error("Settings not found");
      const { error } = await (supabase.from("store_settings" as any) as any)
        .update(values)
        .eq("id", settings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-settings"] });
      qc.invalidateQueries({ queryKey: ["store-settings-admin"] });
      toast.success("Banner atualizado com sucesso!");
    },
    onError: () => toast.error("Erro ao salvar banner."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Banner Principal</h1>
        <a href="/" target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="gap-2">
            <Eye className="h-4 w-4" /> Ver no Site
          </Button>
        </a>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Textos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Type className="h-5 w-5" /> Textos
              </CardTitle>
              <CardDescription>Título e subtítulo exibidos no banner da home.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Título Principal</Label>
                <Textarea
                  rows={3}
                  value={form.hero_title}
                  onChange={(e) => setForm({ ...form, hero_title: e.target.value })}
                  placeholder="Suplementos de Alta Performance..."
                  maxLength={200}
                />
                <p className="mt-1 text-xs text-muted-foreground">{form.hero_title.length}/200 caracteres</p>
              </div>
              <div>
                <Label>Subtítulo</Label>
                <Input
                  value={form.hero_subtitle}
                  onChange={(e) => setForm({ ...form, hero_subtitle: e.target.value })}
                  placeholder="Resultados reais com segurança..."
                  maxLength={150}
                />
              </div>
            </CardContent>
          </Card>

          {/* Imagem */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Image className="h-5 w-5" /> Imagem de Fundo
              </CardTitle>
              <CardDescription>URL da imagem de fundo do banner. Deixe em branco para usar a imagem padrão.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>URL da Imagem</Label>
                <Input
                  value={form.hero_image_url}
                  onChange={(e) => setForm({ ...form, hero_image_url: e.target.value })}
                  placeholder="https://... ou deixe vazio para padrão"
                />
              </div>
              {form.hero_image_url && (
                <div className="overflow-hidden rounded-lg border border-border">
                  <img
                    src={form.hero_image_url}
                    alt="Preview do banner"
                    className="h-40 w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Botões */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Link2 className="h-5 w-5" /> Botões de Ação
              </CardTitle>
              <CardDescription>Configure os botões de chamada para ação do banner.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-3 rounded-lg border border-border p-4">
                  <p className="text-sm font-semibold">Botão Principal</p>
                  <div>
                    <Label>Texto</Label>
                    <Input
                      value={form.hero_button_text}
                      onChange={(e) => setForm({ ...form, hero_button_text: e.target.value })}
                      placeholder="Comprar Agora"
                      maxLength={30}
                    />
                  </div>
                  <div>
                    <Label>Link</Label>
                    <Input
                      value={form.hero_button_link}
                      onChange={(e) => setForm({ ...form, hero_button_link: e.target.value })}
                      placeholder="/produtos"
                    />
                  </div>
                </div>
                <div className="space-y-3 rounded-lg border border-border p-4">
                  <p className="text-sm font-semibold">Botão Secundário</p>
                  <div>
                    <Label>Texto (vazio = ocultar)</Label>
                    <Input
                      value={form.hero_button2_text}
                      onChange={(e) => setForm({ ...form, hero_button2_text: e.target.value })}
                      placeholder="Saiba Mais"
                      maxLength={30}
                    />
                  </div>
                  <div>
                    <Label>Link</Label>
                    <Input
                      value={form.hero_button2_link}
                      onChange={(e) => setForm({ ...form, hero_button2_link: e.target.value })}
                      placeholder="/#beneficios"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Button type="submit" size="lg" className="gap-2" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {mutation.isPending ? "Salvando..." : "Salvar Banner"}
        </Button>
      </form>
    </div>
  );
}
