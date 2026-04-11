import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Template {
  id: string;
  name: string;
  slug: string;
}

export default function SuperbossClonar() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [cloningTenantId, setCloningTenantId] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    supabase
      .from("tenants")
      .select("id, name, slug")
      .eq("is_template", true)
      .then(({ data }) => {
        if (data) setTemplates(data);
      });
  }, []);

  // Polling with proper cleanup
  useEffect(() => {
    if (!cloningTenantId) return;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("tenants")
        .select("cloning_status")
        .eq("id", cloningTenantId)
        .single();
      const s = data?.cloning_status ?? "";
      setStatus(s);
      if (s === "done" || s === "done_with_errors" || s === "error") {
        clearInterval(interval);
        setPolling(false);
        setCloningTenantId(null);
        toast.success(s === "done" ? "Clonagem concluída!" : `Clonagem finalizada: ${s}`);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [cloningTenantId]);

  const handleClone = async () => {
    if (!templateId || !newName || !newSlug) {
      toast.error("Preencha todos os campos");
      return;
    }
    setPolling(true);
    setStatus("iniciando...");
    const { data, error } = await supabase.functions.invoke("clone-tenant", {
      body: { template_tenant_id: templateId, new_name: newName, new_slug: newSlug },
    });
    if (error) {
      toast.error(error.message);
      setPolling(false);
      return;
    }
    setCloningTenantId(data?.tenant_id ?? null);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Clonar Loja</h2>
      <Card>
        <CardHeader><CardTitle>Nova loja a partir de template</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Template</label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger><SelectValue placeholder="Selecionar template" /></SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name} ({t.slug})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input placeholder="Nome da nova loja" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Input
            placeholder="Slug (ex: minha-loja)"
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
          />
          <Button onClick={handleClone} disabled={polling} className="w-full">
            {polling ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Clonando... ({status})</> : "Clonar Loja"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
