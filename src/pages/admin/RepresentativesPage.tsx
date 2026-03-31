import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Eye, Link2, Copy } from "lucide-react";
import { toast } from "sonner";

interface RepForm {
  name: string;
  email: string;
  phone: string;
  region: string;
  pix: string;
}

const emptyForm: RepForm = { name: "", email: "", phone: "", region: "", pix: "" };

export default function RepresentativesPage() {
  const [open, setOpen] = useState(false);
  const { canDelete } = useAuth();
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<RepForm>(emptyForm);
  const [deleteDialog, setDeleteDialog] = useState<{ id: string; name: string } | null>(null);
  const [transferRepId, setTransferRepId] = useState<string>("");
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: reps, isLoading } = useQuery({
    queryKey: ["representatives"],
    queryFn: async () => {
      const { data, error } = await supabase.from("representatives").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch current month commissions per representative
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const { data: monthCommissions } = useQuery({
    queryKey: ["rep-month-commissions", monthStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commissions")
        .select("representative_id, commission_value")
        .gte("created_at", monthStart)
        .lte("created_at", monthEnd);
      if (error) throw error;
      return data;
    },
  });

  const monthTotals = useMemo(() => {
    const map = new Map<string, number>();
    monthCommissions?.forEach((c) => {
      map.set(c.representative_id, (map.get(c.representative_id) ?? 0) + Number(c.commission_value));
    });
    return map;
  }, [monthCommissions]);

  const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

  const save = useMutation({
    mutationFn: async () => {
      if (editId) {
        const { error } = await supabase.from("representatives").update(form).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("representatives").insert(form as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["representatives"] });
      setOpen(false);
      setForm(emptyForm);
      setEditId(null);
      toast.success(editId ? "Representante atualizado" : "Representante criado");
    },
    onError: () => toast.error("Erro ao salvar"),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("representatives").update({ active: !active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["representatives"] });
      toast.success("Status atualizado.");
    },
  });

  const deleteRep = useMutation({
    mutationFn: async ({ repId, transferTo }: { repId: string; transferTo: string }) => {
      const { data: commissions } = await supabase
        .from("commissions")
        .select("*, doctors(name), orders(customer_name, created_at, total)")
        .eq("representative_id", repId);

      if (commissions?.length) {
        const rows = [["Pedido", "Prescritor", "Valor Produtos", "Taxa", "Cashback", "Status", "Data"].join(",")];
        commissions.forEach((c: any) => {
          rows.push([
            c.orders?.customer_name ?? "",
            c.doctors?.name ?? "",
            c.order_total,
            `${c.commission_rate}%`,
            c.commission_value,
            c.status,
            new Date(c.created_at).toLocaleDateString("pt-BR"),
          ].join(","));
        });
        const blob = new Blob([rows.join("\n")], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `relatorio-representante-${repId.slice(0, 8)}.csv`;
        a.click();
      }

      const { error: transferError } = await supabase
        .from("doctors")
        .update({ representative_id: transferTo })
        .eq("representative_id", repId);
      if (transferError) throw transferError;

      const { error } = await supabase.from("representatives").delete().eq("id", repId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["representatives"] });
      qc.invalidateQueries({ queryKey: ["doctors"] });
      setDeleteDialog(null);
      setTransferRepId("");
      toast.success("Representante excluído. Relatório baixado e prescritores transferidos.");
    },
    onError: (err: any) => toast.error(`Erro ao excluir: ${err?.message}`),
  });

  const openEdit = (rep: NonNullable<typeof reps>[number]) => {
    setEditId(rep.id);
    setForm({ name: rep.name, email: rep.email, phone: rep.phone ?? "", region: rep.region ?? "", pix: (rep as any).pix ?? "" });
    setOpen(true);
  };

  const otherReps = reps?.filter((r) => r.id !== deleteDialog?.id && r.active) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold">Representantes</h2>
          <p className="text-sm text-muted-foreground mt-1">Gerencie sua equipe de representantes</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditId(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Novo Representante</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? "Editar" : "Novo"} Representante</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Região</Label>
                  <Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Chave PIX</Label>
                <Input value={form.pix} onChange={(e) => setForm({ ...form, pix: e.target.value })} placeholder="CPF, email, telefone ou chave aleatória" />
              </div>
              <Button type="submit" className="w-full" disabled={save.isPending}>
                {save.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteDialog} onOpenChange={(v) => { if (!v) { setDeleteDialog(null); setTransferRepId(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Representante: {deleteDialog?.name}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>Ao excluir este representante:</p>
              <ul className="list-disc pl-5 text-sm space-y-1">
                <li>Um relatório CSV com todas as comissões será baixado automaticamente</li>
                <li>Todos os prescritores serão transferidos para o representante selecionado abaixo</li>
                <li>Esta ação não pode ser desfeita</li>
              </ul>
              <div className="pt-2">
                <Label className="text-foreground">Transferir prescritores para:</Label>
                <Select value={transferRepId} onValueChange={setTransferRepId}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione um representante..." /></SelectTrigger>
                  <SelectContent>
                    {otherReps.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={!transferRepId || deleteRep.isPending}
              onClick={() => deleteDialog && deleteRep.mutate({ repId: deleteDialog.id, transferTo: transferRepId })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteRep.isPending ? "Excluindo..." : "Excluir e Transferir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden lg:table-cell">Telefone</TableHead>
                <TableHead className="hidden lg:table-cell">PIX</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Comissão do Mês</TableHead>
                <TableHead className="w-36">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : !reps?.length ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum representante cadastrado</TableCell></TableRow>
              ) : (
                reps.map((rep) => (
                  <TableRow key={rep.id}>
                    <TableCell className="font-medium">{rep.name}</TableCell>
                    <TableCell className="hidden md:table-cell">{rep.email}</TableCell>
                    <TableCell className="hidden lg:table-cell">{rep.phone ?? "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell text-xs">{(rep as any).pix || "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={rep.active ? "default" : "secondary"}
                        className="cursor-pointer"
                        onClick={() => toggleActive.mutate({ id: rep.id, active: rep.active })}
                      >
                        {rep.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-emerald-600">
                      {fmt(monthTotals.get(rep.id) ?? 0)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" title="Ver Comissões" onClick={() => navigate(`/admin/representantes/${rep.id}/comissoes`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Copiar Link de Cadastro"
                          onClick={() => {
                            const url = `${window.location.origin}/cadastrar?rep=${(rep as any).short_code || rep.id.slice(0, 4).toUpperCase()}`;
                            navigator.clipboard.writeText(url);
                            toast.success("Link de cadastro copiado!");
                          }}
                        >
                          <Link2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(rep)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {canDelete && (
                          <Button variant="ghost" size="icon" onClick={() => setDeleteDialog({ id: rep.id, name: rep.name })}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
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
