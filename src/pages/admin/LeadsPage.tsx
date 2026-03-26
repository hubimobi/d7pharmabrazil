import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold">Leads</h2>
          <p className="text-sm text-muted-foreground mt-1">Leads capturados pelo popup da loja</p>
        </div>
        {(leads?.length || 0) > 0 && (
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead className="hidden md:table-cell">WhatsApp</TableHead>
                <TableHead className="hidden md:table-cell">Fonte</TableHead>
                <TableHead className="hidden sm:table-cell">Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
                </TableRow>
              ) : !leads?.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum lead capturado ainda. Ative o popup para começar a coletar.
                  </TableCell>
                </TableRow>
              ) : (
                leads.map((lead: any) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.name || "—"}</TableCell>
                    <TableCell>{lead.email}</TableCell>
                    <TableCell className="hidden md:table-cell">{lead.phone || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{lead.source || "popup"}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {new Date(lead.created_at || "").toLocaleDateString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
