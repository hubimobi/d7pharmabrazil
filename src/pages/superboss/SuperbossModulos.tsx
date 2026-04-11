import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import TenantSelector from "@/components/superboss/TenantSelector";
import { useTenant } from "@/hooks/useTenant";

const MODULE_KEYS = [
  { key: "whatsapp", label: "WhatsApp" },
  { key: "ai", label: "IA / Agentes" },
  { key: "repurchase_funnel", label: "Funil de Recompra" },
  { key: "upsell", label: "Upsell" },
  { key: "analytics", label: "Analytics" },
  { key: "coupons", label: "Cupons" },
];

export default function SuperbossModulos() {
  const { tenantId } = useTenant();
  const [modules, setModules] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!tenantId) return;
    supabase
      .from("tenants")
      .select("allowed_modules")
      .eq("id", tenantId)
      .single()
      .then(({ data }) => {
        setModules((data?.allowed_modules as Record<string, boolean>) ?? {});
      });
  }, [tenantId]);

  const toggle = async (key: string, enabled: boolean) => {
    const updated = { ...modules, [key]: enabled };
    setModules(updated);
    const { error } = await supabase
      .from("tenants")
      .update({ allowed_modules: updated })
      .eq("id", tenantId);
    if (error) toast.error(error.message);
    else toast.success(`${key} ${enabled ? "ativado" : "desativado"}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Módulos por Loja</h2>
        <TenantSelector />
      </div>
      <Card>
        <CardHeader><CardTitle>Módulos Disponíveis</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {MODULE_KEYS.map((m) => (
            <div key={m.key} className="flex items-center justify-between py-2 border-b last:border-0">
              <span className="font-medium">{m.label}</span>
              <Switch checked={!!modules[m.key]} onCheckedChange={(v) => toggle(m.key, v)} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
