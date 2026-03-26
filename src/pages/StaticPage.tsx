import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Loader2 } from "lucide-react";
import SEOHead from "@/components/SEOHead";

export default function StaticPage() {
  const location = useLocation();
  const slug = location.pathname.replace("/", "");

  const { data: page, isLoading } = useQuery({
    queryKey: ["static-page", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("static_pages")
        .select("*")
        .eq("slug", slug)
        .single();
      if (error) throw error;
      return data as { id: string; slug: string; title: string; content: string };
    },
    enabled: !!slug,
  });

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title={page?.title || "Carregando..."}
        description={page?.title || ""}
      />
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : page ? (
          <article>
            <h1 className="text-3xl font-bold mb-8">{page.title}</h1>
            <div
              className="prose prose-sm sm:prose max-w-none dark:prose-invert [&_table]:w-full [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:p-2 [&_th]:bg-muted [&_th]:font-semibold"
              dangerouslySetInnerHTML={{ __html: page.content }}
            />
          </article>
        ) : (
          <p className="text-center text-muted-foreground py-20">Página não encontrada.</p>
        )}
      </main>
      <Footer />
    </div>
  );
}
