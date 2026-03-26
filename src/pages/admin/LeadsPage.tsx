import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Download, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function LeadsPage() {
  const { data: leads, isLoading } = useQuery({
    queryKey: ["popup-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("popup_leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const exportCSV = () => {
    if (!leads?.length) return;
    const rows = [
      ["Nome", "E-mail", "WhatsApp", "Fonte", "Data"],
      ...leads.map((l: any) => [
        l.name || "",
        l.email,
        l.phone || "",
        l.source || "",
        new Date(l.created_at || "").toLocaleDateString("pt-BR"),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads.csv";
    a.click();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mail className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Leads</h1>
        </div>
        {(leads?.length || 0) > 0 && (
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-6">
          {!leads?.length ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhum lead capturado ainda. Ative o popup para começar a coletar.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 font-medium">Nome</th>
                      <th className="text-left py-2 font-medium">E-mail</th>
                      <th className="text-left py-2 font-medium">WhatsApp</th>
                      <th className="text-left py-2 font-medium">Fonte</th>
                      <th className="text-left py-2 font-medium">Data</th>
                    </tr>
                </thead>
                <tbody>
                    {leads.map((lead: any) => (
                      <tr key={lead.id} className="border-b border-border/50">
                        <td className="py-2">{lead.name || "—"}</td>
                        <td className="py-2">{lead.email}</td>
                        <td className="py-2">{lead.phone || "—"}</td>
                        <td className="py-2 text-muted-foreground">{lead.source || "popup"}</td>
                        <td className="py-2 text-muted-foreground">
                          {new Date(lead.created_at || "").toLocaleDateString("pt-BR")}
                        </td>
                      </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
