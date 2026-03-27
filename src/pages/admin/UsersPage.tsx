import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, UserCog } from "lucide-react";
import { toast } from "sonner";

const ROLE_OPTIONS = [
  { value: "super_admin", label: "Super Admin" },
  { value: "suporte", label: "Suporte" },
  { value: "administrador", label: "Administrador" },
  { value: "admin", label: "Admin" },
  { value: "gestor", label: "Gestor" },
  { value: "financeiro", label: "Financeiro" },
  { value: "representative", label: "Representante" },
  { value: "prescriber", label: "Prescritor" },
];

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-red-500/10 text-red-700 border-red-200",
  suporte: "bg-purple-500/10 text-purple-700 border-purple-200",
  administrador: "bg-blue-500/10 text-blue-700 border-blue-200",
  admin: "bg-blue-500/10 text-blue-700 border-blue-200",
  gestor: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  financeiro: "bg-amber-500/10 text-amber-700 border-amber-200",
  representative: "bg-slate-500/10 text-slate-700 border-slate-200",
  prescriber: "bg-teal-500/10 text-teal-700 border-teal-200",
};

export default function UsersPage() {
  const { isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role: "admin" });

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("id, user_id, role");
      if (error) throw error;

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name");

      const profileMap: Record<string, string> = {};
      profiles?.forEach((p) => { profileMap[p.user_id] = p.full_name; });

      // Group roles by user
      const userMap: Record<string, { user_id: string; roles: string[]; name: string }> = {};
      roles?.forEach((r) => {
        if (!userMap[r.user_id]) {
          userMap[r.user_id] = { user_id: r.user_id, roles: [], name: profileMap[r.user_id] || "—" };
        }
        userMap[r.user_id].roles.push(r.role);
      });

      return Object.values(userMap);
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("create-tenant-user", {
        body: form,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Usuário criado com sucesso!");
      setCreateOpen(false);
      setForm({ email: "", password: "", full_name: "", role: "admin" });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">Usuários</h2>
          <p className="text-sm text-muted-foreground mt-1">Gerencie usuários e permissões do sistema</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>ID do Usuário</TableHead>
                <TableHead>Roles</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : !users?.length ? (
                <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado</TableCell></TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.user_id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <UserCog className="h-4 w-4 text-muted-foreground" />
                        {u.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">{u.user_id.substring(0, 8)}...</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {u.roles.map((r) => (
                          <Badge key={r} variant="outline" className={ROLE_COLORS[r] || ""}>
                            {ROLE_OPTIONS.find((o) => o.value === r)?.label || r}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome completo</Label>
              <Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <Label>Senha</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.filter((o) => isSuperAdmin || !["super_admin", "suporte"].includes(o.value)).map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.email || !form.password}>
              {createMutation.isPending ? "Criando..." : "Criar Usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
