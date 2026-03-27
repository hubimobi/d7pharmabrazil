import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/hooks/useProducts";

interface ProductQAProps {
  product: Product;
  faqs?: { question: string; answer: string }[];
}

export default function ProductQA({ product, faqs }: ProductQAProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!question.trim() || loading) return;
    setLoading(true);
    setAnswer("");
    try {
      const { data, error } = await supabase.functions.invoke("product-qa", {
        body: {
          question: question.trim(),
          productName: product.name,
          productDescription: product.description,
          benefits: product.benefits,
          faqs: faqs?.map((f) => ({ q: f.question, a: f.answer })) ?? [],
        },
      });
      if (error) throw error;
      setAnswer(data?.answer || "Desculpe, não consegui responder no momento.");
    } catch {
      setAnswer("Erro ao processar sua pergunta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 rounded-xl bg-muted/50 p-4 md:p-5">
      <h2 className="text-lg font-bold text-foreground mb-1 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" /> Perguntas e Respostas
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Tire suas dúvidas sobre este produto com nossa IA especialista
      </p>

      <div className="flex gap-2">
        <Input
          placeholder="Digite sua pergunta sobre o produto..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAsk()}
          disabled={loading}
          className="flex-1"
        />
        <Button onClick={handleAsk} disabled={loading || !question.trim()} className="gap-1.5 shrink-0">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Perguntar
        </Button>
      </div>

      {answer && (
        <div className="mt-4 rounded-lg bg-background border border-border p-4 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
          <div className="flex items-center gap-1.5 text-xs text-primary font-medium mb-2">
            <Sparkles className="h-3.5 w-3.5" /> Resposta da IA
          </div>
          {answer}
        </div>
      )}
    </div>
  );
}
