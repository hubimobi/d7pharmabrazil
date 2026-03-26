import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Store, Save, Loader2, Image, Globe, Instagram } from "lucide-react";
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

        {/* Logo e Favicon */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Image className="h-5 w-5" /> Logo e Favicon</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>URL da Logo</Label>
              <Input placeholder="https://exemplo.com/logo.png" value={form.logo_url || ""} onChange={(e) => update("logo_url", e.target.value)} />
              {form.logo_url && (
                <div className="mt-2 p-2 border border-border rounded bg-muted/30">
                  <img src={form.logo_url} alt="Logo preview" className="h-12 object-contain" />
                </div>
              )}
            </div>
            <div>
              <Label>URL do Favicon</Label>
              <Input placeholder="https://exemplo.com/favicon.png" value={form.favicon_url || ""} onChange={(e) => update("favicon_url", e.target.value)} />
              {form.favicon_url && (
                <div className="mt-2 p-2 border border-border rounded bg-muted/30 flex items-center gap-2">
                  <img src={form.favicon_url} alt="Favicon preview" className="h-8 w-8 object-contain" />
                  <span className="text-xs text-muted-foreground">Preview</span>
                </div>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">A logo aparece no cabeçalho do site. O favicon é o ícone que aparece na aba do navegador.</p>
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
          <h2 className="text-lg font-semibold flex items-center gap-2"><Instagram className="h-5 w-5" /> Redes Sociais</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="flex items-center gap-2">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C16.67.014 16.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                Instagram
              </Label>
              <Input placeholder="https://instagram.com/d7pharma" value={form.instagram || ""} onChange={(e) => update("instagram", e.target.value)} />
            </div>
            <div>
              <Label className="flex items-center gap-2">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                Facebook
              </Label>
              <Input placeholder="https://facebook.com/d7pharma" value={form.facebook || ""} onChange={(e) => update("facebook", e.target.value)} />
            </div>
            <div>
              <Label className="flex items-center gap-2">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61.01 3.91.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
                TikTok
              </Label>
              <Input placeholder="https://tiktok.com/@d7pharma" value={form.tiktok || ""} onChange={(e) => update("tiktok", e.target.value)} />
            </div>
            <div>
              <Label className="flex items-center gap-2">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                YouTube
              </Label>
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
