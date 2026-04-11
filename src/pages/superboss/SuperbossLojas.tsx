import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus } from "lucide-react";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  created_at: string;
}

export default function SuperbossLojas() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", plan: "basic", status: "active" });

  const load = async () => {
    const { data } = await supabase
      .from("tenants")
      .select("id, name, slug, plan, status, created_at")
      .order("name");
    if (data) setTenants(data);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.name || !form.slug) { toast.error("Nome e slug obrigatórios"); return; }
    const { error } = await supabase.from("tenants").insert({
      name: form.name,
      slug: form.slug,
      plan: form.plan,
      status: form.status,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Loja criada!");
    setOpen(false);
    setForm({ name: "", slug: "", plan: "basic", status: "active" });
    load();
  };

  const toggleStatus = async (t: Tenant) => {
    const newStatus = t.status === "active" ? "suspended" : "active";
    const { error } = await supabase.from("tenants").update({ status: newStatus }).eq("id", t.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Loja ${newStatus === "active" ? "ativada" : "suspensa"}`);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Gerenciar Lojas</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nova Loja</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar Loja</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <Input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input placeholder="Slug (ex: loja1)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} />
              <Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
              <Button className="w-full" onClick={handleCreate}>Criar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Todas as Lojas</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2">Nome</th>
                  <th className="pb-2">Slug</th>
                  <th className="pb-2">Plano</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Criado em</th>
                  <th className="pb-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="py-2 font-medium">{t.name}</td>
                    <td className="py-2">{t.slug}</td>
                    <td className="py-2 capitalize">{t.plan}</td>
                    <td className="py-2">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${t.status === "active" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-2">{new Date(t.created_at).toLocaleDateString("pt-BR")}</td>
                    <td className="py-2">
                      <Button size="sm" variant="outline" onClick={() => toggleStatus(t)}>
                        {t.status === "active" ? "Suspender" : "Ativar"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
