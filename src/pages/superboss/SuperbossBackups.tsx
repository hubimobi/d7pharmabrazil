import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import TenantSelector from "@/components/superboss/TenantSelector";
import { useTenant } from "@/hooks/useTenant";

interface Backup {
  id: string;
  table_name: string;
  backup_type: string;
  created_at: string;
}

export default function SuperbossBackups() {
  const { tenantId } = useTenant();
  const [backups, setBackups] = useState<Backup[]>([]);

  useEffect(() => {
    if (!tenantId) return;
    supabase
      .from("tenant_config_backups")
      .select("id, table_name, backup_type, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (data) setBackups(data);
      });
  }, [tenantId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Backups</h2>
        <TenantSelector />
      </div>
      <Card>
        <CardHeader><CardTitle>Histórico de Backups</CardTitle></CardHeader>
        <CardContent>
          {backups.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum backup encontrado para este tenant.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2">Tabela</th>
                  <th className="pb-2">Tipo</th>
                  <th className="pb-2">Data</th>
                  <th className="pb-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((b) => (
                  <tr key={b.id} className="border-b last:border-0">
                    <td className="py-2 font-medium">{b.table_name}</td>
                    <td className="py-2">{b.backup_type}</td>
                    <td className="py-2">{new Date(b.created_at).toLocaleString("pt-BR")}</td>
                    <td className="py-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="sm" variant="outline" disabled>Restaurar</Button>
                        </TooltipTrigger>
                        <TooltipContent>Em breve</TooltipContent>
                      </Tooltip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
