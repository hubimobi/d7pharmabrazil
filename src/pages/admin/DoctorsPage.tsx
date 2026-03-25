import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DocForm {
  name: string;
  crm: string;
  specialty: string;
  city: string;
  state: string;
  representative_id: string;
}

const emptyForm: DocForm = { name: "", crm: "", specialty: "", city: "", state: "", representative_id: "" };

export default function DoctorsPage() {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<DocForm>(emptyForm);
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const qc = useQueryClient();

  const { data: reps } = useQuery({
    queryKey: ["representatives-list"],
    queryFn: async () => {
      const { data } = await supabase.from("representatives").select("id, name").eq("active", true);
      return data ?? [];
    },
    enabled: isAdmin,
  });

  const { data: repId } = useQuery({
    queryKey: ["my-rep-id"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_representative_id");
      return data as string | null;
    },
    enabled: !isAdmin,
  });

  const { data: doctors, isLoading } = useQuery({
    queryKey: ["doctors"],
    queryFn: async () => {
      const q = supabase.from("doctors").select("*, representatives(name)").order("created_at", { ascending: false });
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        representative_id: isAdmin ? form.representative_id : repId!,
      };
      if (editId) {
        const { error } = await supabase.from("doctors").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("doctors").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doctors"] });
      setOpen(false);
      setForm(emptyForm);
      setEditId(null);
      toast({ title: editId ? "Doutor atualizado" : "Doutor cadastrado" });
    },
    onError: () => toast({ title: "Erro ao salvar", variant: "destructive" }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("doctors").update({ active: !active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["doctors"] }),
  });

  const openEdit = (doc: NonNullable<typeof doctors>[number]) => {
    setEditId(doc.id);
    setForm({
      name: doc.name,
      crm: doc.crm ?? "",
      specialty: doc.specialty ?? "",
      city: doc.city ?? "",
      state: doc.state ?? "",
      representative_id: doc.representative_id,
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Doutores</h2>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditId(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Novo Doutor</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? "Editar" : "Novo"} Doutor</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CRM</Label>
                  <Input value={form.crm} onChange={(e) => setForm({ ...form, crm: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Especialidade</Label>
                  <Input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                </div>
              </div>
              {isAdmin && (
                <div className="space-y-2">
                  <Label>Representante</Label>
                  <Select value={form.representative_id} onValueChange={(v) => setForm({ ...form, representative_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {reps?.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={save.isPending}>
                {save.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CRM</TableHead>
                <TableHead>Especialidade</TableHead>
                <TableHead>Cidade/UF</TableHead>
                {isAdmin && <TableHead>Representante</TableHead>}
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : !doctors?.length ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum doutor cadastrado</TableCell></TableRow>
              ) : (
                doctors.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.name}</TableCell>
                    <TableCell>{doc.crm ?? "—"}</TableCell>
                    <TableCell>{doc.specialty ?? "—"}</TableCell>
                    <TableCell>{[doc.city, doc.state].filter(Boolean).join("/") || "—"}</TableCell>
                    {isAdmin && <TableCell>{(doc as any).representatives?.name ?? "—"}</TableCell>}
                    <TableCell>
                      <Badge
                        variant={doc.active ? "default" : "secondary"}
                        className="cursor-pointer"
                        onClick={() => toggleActive.mutate({ id: doc.id, active: doc.active })}
                      >
                        {doc.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(doc)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
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
