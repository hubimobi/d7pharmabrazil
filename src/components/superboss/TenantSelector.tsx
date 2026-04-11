import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

export default function TenantSelector() {
  const { tenantId, switchTenant } = useTenant();
  const [tenants, setTenants] = useState<Tenant[]>([]);

  useEffect(() => {
    supabase
      .from("tenants")
      .select("id, name, slug")
      .order("name")
      .then(({ data }) => {
        if (data) setTenants(data);
      });
  }, []);

  return (
    <Select value={tenantId} onValueChange={(val) => switchTenant(val)}>
      <SelectTrigger className="w-[260px]">
        <SelectValue placeholder="Selecionar loja" />
      </SelectTrigger>
      <SelectContent>
        {tenants.map((t) => (
          <SelectItem key={t.id} value={t.id}>
            {t.name} ({t.slug})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
