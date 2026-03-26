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
import { Plus, Pencil, CheckCircle, Copy, UserPlus, Key } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

interface DocForm {
  name: string;
  crm: string;
  specialty: string;
  city: string;
  state: string;
  representative_id: string;
  email: string;
  cpf: string;
  pix: string;
}

const emptyForm: DocForm = { name: "", crm: "", specialty: "", city: "", state: "", representative_id: "", email: "", cpf: "", pix: "" };

export default function DoctorsPage() {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<DocForm>(emptyForm);
  const [successCoupon, setSuccessCoupon] = useState<{ code: string; name: string; doctorId: string; email: string } | null>(null);
  const [createUserNow, setCreateUserNow] = useState(true);
  const [userPassword, setUserPassword] = useState("");
  const [creatingUser, setCreatingUser] = useState(false);
  const [userCreationDialog, setUserCreationDialog] = useState<{ doctorId: string; email: string; name: string } | null>(null);
  const { toast } = useToast();
  const { isAdmin, session } = useAuth();
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
      const repIdVal = isAdmin ? form.representative_id : repId!;
      const payload: any = {
        name: form.name,
        crm: form.crm || null,
        specialty: form.specialty || null,
        city: form.city || null,
        state: form.state || null,
        representative_id: repIdVal,
        email: form.email || null,
        cpf: form.cpf || null,
        pix: form.pix || null,
      };

      if (editId) {
        const { error } = await supabase.from("doctors").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        // Create prescriber
        const { data: inserted, error } = await supabase.from("doctors").insert(payload).select().single();
        if (error) throw error;

        // Auto-create coupon for prescriber
        if (inserted) {
          const repShort = repIdVal.slice(0, 4).toUpperCase();
          const docShort = inserted.id.slice(0, 4).toUpperCase();
          const couponCode = `DESCONTO10-${repShort}-${docShort}`;
          await supabase.from("coupons").insert({
            code: couponCode,
            description: `Cupom do Prescritor ${form.name}`,
            discount_type: "percent",
            discount_value: 10,
            active: true,
            doctor_id: inserted.id,
            representative_id: repIdVal,
          } as any);

          return couponCode;
        }

        // Create auth user for prescriber if email provided
        if (form.email) {
          // We'll create the user via edge function or admin API later
          // For now just set up the record
        }
      }
      return null;
    },
    onSuccess: (couponCode) => {
      qc.invalidateQueries({ queryKey: ["doctors"] });
      setOpen(false);
      if (couponCode && !editId) {
        setSuccessCoupon({ code: couponCode, name: form.name });
      } else {
        toast({ title: editId ? "Prescritor atualizado" : "Prescritor cadastrado!" });
      }
      setForm(emptyForm);
      setEditId(null);
    },
    onError: (err: any) => toast({ title: "Erro ao salvar", description: err?.message, variant: "destructive" }),
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
      email: (doc as any).email ?? "",
      cpf: (doc as any).cpf ?? "",
      pix: (doc as any).pix ?? "",
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Prescritores</h2>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditId(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Novo Prescritor</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? "Editar" : "Novo"} Prescritor</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="prescritor@email.com" />
                </div>
                <div className="space-y-2">
                  <Label>CPF</Label>
                  <Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} placeholder="000.000.000-00" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Chave Pix</Label>
                <Input value={form.pix} onChange={(e) => setForm({ ...form, pix: e.target.value })} placeholder="CPF, e-mail, telefone ou chave aleatória" />
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

      {/* Success coupon dialog */}
      <Dialog open={!!successCoupon} onOpenChange={(v) => { if (!v) setSuccessCoupon(null); }}>
        <DialogContent className="max-w-md text-center">
          <DialogHeader>
            <DialogTitle className="sr-only">Cupom criado</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <CheckCircle className="h-12 w-12 text-primary" />
            <h2 className="text-xl font-bold">Cadastro de Prescritor Criado!</h2>
            <p className="text-muted-foreground">
              O cupom de <span className="font-bold text-primary">10% de Desconto</span>
              <br />
              do prescritor <span className="font-semibold">{successCoupon?.name}</span> é:
            </p>
            <div className="flex items-center gap-2 rounded-lg border-2 border-primary bg-primary/5 px-6 py-3">
              <span className="text-xl font-mono font-bold text-primary">{successCoupon?.code}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  navigator.clipboard.writeText(successCoupon?.code || "");
                  toast({ title: "Cupom copiado!" });
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Em cada venda, o comprador ganha <span className="font-semibold">10% de desconto</span> e o Prescritor recebe <span className="font-semibold">20% de Cashback</span> sobre o valor dos produtos (sem o frete).
            </p>
            <Button onClick={() => setSuccessCoupon(null)} className="mt-2">Entendido</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
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
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : !doctors?.length ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum prescritor cadastrado</TableCell></TableRow>
              ) : (
                doctors.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.name}</TableCell>
                    <TableCell className="text-sm">{(doc as any).email ?? "—"}</TableCell>
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
