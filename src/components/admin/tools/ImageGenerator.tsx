import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, Download, ImageIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ImageGenerator() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("product");
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);

  const styles: Record<string, string> = {
    product: "Foto profissional de produto para e-commerce, fundo branco limpo, iluminação de estúdio, alta resolução, sem texto",
    social: "Imagem vibrante para redes sociais, cores vivas, composição moderna, estilo lifestyle",
    banner: "Banner promocional para site, layout horizontal, visual atraente, estilo comercial premium",
    testimonial: "Selfie realista de pessoa brasileira, ambiente cotidiano, iluminação natural, estilo casual autêntico, não parecer banco de imagem",
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) { toast.error("Descreva a imagem"); return; }
    setLoading(true);
    try {
      const fullPrompt = `${styles[style]}. ${prompt}`;
      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: { prompt: fullPrompt },
      });
      if (error) throw error;
      if (data?.imageUrl) {
        setImages((prev) => [data.imageUrl, ...prev]);
        toast.success("Imagem gerada!");
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar imagem");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-white border border-gray-200 rounded-2xl">
        <h2 className="text-lg font-semibold mb-2">🎨 Criador de Imagens com IA</h2>
        <p className="text-sm text-gray-500 mb-6">
          Gere imagens para produtos, anúncios e prova social.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="md:col-span-3">
            <label className="text-sm font-medium mb-1 block">Descreva a imagem</label>
            <Textarea
              placeholder="Ex: Frasco de vitamina D sobre uma mesa de madeira com luz natural entrando pela janela..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Estilo</label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="product">Produto</SelectItem>
                  <SelectItem value="social">Social Media</SelectItem>
                  <SelectItem value="banner">Banner</SelectItem>
                  <SelectItem value="testimonial">Testemunho</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerate} disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ImageIcon className="h-4 w-4 mr-2" />}
              Gerar
            </Button>
          </div>
        </div>
      </Card>

      {images.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {images.map((url, i) => (
            <Card key={i} className="overflow-hidden rounded-2xl border border-gray-200">
              <img src={url} alt={`Imagem gerada ${i + 1}`} className="w-full aspect-square object-cover" />
              <div className="p-3 flex justify-end">
                <Button size="sm" variant="outline" asChild>
                  <a href={url} download target="_blank" rel="noopener noreferrer">
                    <Download className="h-3 w-3 mr-1" /> Baixar
                  </a>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {images.length === 0 && !loading && (
        <Card className="p-12 text-center bg-white border border-dashed border-gray-300 rounded-2xl">
          <ImageIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400">As imagens geradas aparecerão aqui</p>
        </Card>
      )}
    </div>
  );
}
