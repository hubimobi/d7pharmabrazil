import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Store, Save, Loader2 } from "lucide-react";
import type { StoreSettings } from "@/hooks/useStoreSettings";

export default function StoreSettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Partial<StoreSettings> | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["store-settings-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_settings" as any)
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data as unknown as StoreSettings;
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: Partial<StoreSettings>) => {
      const { error } = await (supabase.from("store_settings" as any) as any)
        .update(values)
        .eq("id", settings!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configurações salvas com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["store-settings"] });
      queryClient.invalidateQueries({ queryKey: ["store-settings-admin"] });
    },
    onError: () => toast.error("Erro ao salvar configurações."),
  });

  // Initialize form when settings load
  if (settings && !form) {
    setForm({ ...settings });
  }

  if (isLoading || !form) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const update = (field: keyof StoreSettings, value: string) =>
    setForm((prev) => prev ? { ...prev, [field]: value } : prev);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const { id, ...values } = form as StoreSettings;
    mutation.mutate(values);
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Store className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Configurações da Loja</h1>
      </div>

      <form onSubmit={handleSave} className="max-w-2xl space-y-6">
        {/* Dados da Loja */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Dados da Loja</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Nome da Loja</Label>
              <Input value={form.store_name || ""} onChange={(e) => update("store_name", e.target.value)} />
            </div>
            <div>
              <Label>CNPJ</Label>
              <Input placeholder="00.000.000/0000-00" value={form.cnpj || ""} onChange={(e) => update("cnpj", e.target.value)} />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={form.email || ""} onChange={(e) => update("email", e.target.value)} />
            </div>
            <div>
              <Label>WhatsApp</Label>
              <Input placeholder="(11) 99999-9999" value={form.whatsapp || ""} onChange={(e) => update("whatsapp", e.target.value)} />
            </div>
          </div>
        </div>

        {/* Endereço */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Endereço</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>CEP</Label>
              <Input value={form.address_cep || ""} onChange={(e) => update("address_cep", e.target.value)} />
            </div>
            <div>
              <Label>Rua</Label>
              <Input value={form.address_street || ""} onChange={(e) => update("address_street", e.target.value)} />
            </div>
            <div>
              <Label>Número</Label>
              <Input value={form.address_number || ""} onChange={(e) => update("address_number", e.target.value)} />
            </div>
            <div>
              <Label>Complemento</Label>
              <Input value={form.address_complement || ""} onChange={(e) => update("address_complement", e.target.value)} />
            </div>
            <div>
              <Label>Bairro</Label>
              <Input value={form.address_neighborhood || ""} onChange={(e) => update("address_neighborhood", e.target.value)} />
            </div>
            <div>
              <Label>Cidade</Label>
              <Input value={form.address_city || ""} onChange={(e) => update("address_city", e.target.value)} />
            </div>
            <div>
              <Label>Estado</Label>
              <Input value={form.address_state || ""} onChange={(e) => update("address_state", e.target.value)} />
            </div>
          </div>
        </div>

        {/* Redes Sociais */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Redes Sociais</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Instagram</Label>
              <Input placeholder="https://instagram.com/d7pharma" value={form.instagram || ""} onChange={(e) => update("instagram", e.target.value)} />
            </div>
            <div>
              <Label>Facebook</Label>
              <Input placeholder="https://facebook.com/d7pharma" value={form.facebook || ""} onChange={(e) => update("facebook", e.target.value)} />
            </div>
            <div>
              <Label>TikTok</Label>
              <Input placeholder="https://tiktok.com/@d7pharma" value={form.tiktok || ""} onChange={(e) => update("tiktok", e.target.value)} />
            </div>
            <div>
              <Label>YouTube</Label>
              <Input placeholder="https://youtube.com/@d7pharma" value={form.youtube || ""} onChange={(e) => update("youtube", e.target.value)} />
            </div>
          </div>
        </div>

        <Button type="submit" size="lg" disabled={mutation.isPending} className="gap-2">
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar Configurações
        </Button>
      </form>
    </div>
  );
}
