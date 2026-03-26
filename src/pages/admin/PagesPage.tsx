import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, FileText } from "lucide-react";
import { toast } from "sonner";
import RichTextEditor from "@/components/admin/RichTextEditor";

interface StaticPage {
  id: string;
  slug: string;
  title: string;
  content: string;
}

const PAGE_LABELS: Record<string, string> = {
  "politica-de-privacidade": "Política de Privacidade",
  "termos-de-uso": "Termos de Uso",
  "trocas-e-devolucoes": "Trocas e Devoluções",
  "quem-somos": "Quem Somos",
};

export default function PagesPage() {
  const qc = useQueryClient();
  const [localPages, setLocalPages] = useState<StaticPage[]>([]);

  const { data: pages, isLoading } = useQuery({
    queryKey: ["static-pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("static_pages")
        .select("*")
        .order("slug");
      if (error) throw error;
      return data as StaticPage[];
    },
  });

  useEffect(() => {
    if (pages) setLocalPages(pages);
  }, [pages]);

  const saveMut = useMutation({
    mutationFn: async (page: StaticPage) => {
      const { error } = await supabase
        .from("static_pages")
        .update({ title: page.title, content: page.content, updated_at: new Date().toISOString() })
        .eq("id", page.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["static-pages"] });
      toast.success("Página salva com sucesso!");
    },
    onError: () => toast.error("Erro ao salvar página."),
  });

  const updatePage = (slug: string, field: "title" | "content", value: string) => {
    setLocalPages((prev) =>
      prev.map((p) => (p.slug === slug ? { ...p, [field]: value } : p))
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const orderedSlugs = ["politica-de-privacidade", "termos-de-uso", "trocas-e-devolucoes", "quem-somos"];
  const orderedPages = orderedSlugs
    .map((slug) => localPages.find((p) => p.slug === slug))
    .filter(Boolean) as StaticPage[];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Páginas</h1>
      </div>

      <Tabs defaultValue={orderedSlugs[0]} className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          {orderedPages.map((page) => (
            <TabsTrigger key={page.slug} value={page.slug} className="text-xs sm:text-sm">
              {PAGE_LABELS[page.slug] || page.title}
            </TabsTrigger>
          ))}
        </TabsList>

        {orderedPages.map((page) => (
          <TabsContent key={page.slug} value={page.slug}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{PAGE_LABELS[page.slug]}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Título da Página</Label>
                  <Input
                    value={page.title}
                    onChange={(e) => updatePage(page.slug, "title", e.target.value)}
                    placeholder="Título"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Conteúdo</Label>
                  <RichTextEditor
                    value={page.content}
                    onChange={(val) => updatePage(page.slug, "content", val)}
                    placeholder="Escreva o conteúdo da página..."
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={() => saveMut.mutate(page)}
                    disabled={saveMut.isPending}
                  >
                    {saveMut.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Salvar Página
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  URL pública: <code className="bg-muted px-1 rounded">/{page.slug}</code>
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
