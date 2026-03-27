import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Plus, UserCog, Pencil, Shield } from "lucide-react";
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

// Access rules: which sections each role can see/edit
const MENU_SECTIONS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "orders", label: "Pedidos" },
  { key: "products", label: "Produtos" },
  { key: "customers", label: "Clientes" },
  { key: "coupons", label: "Cupons" },
  { key: "representatives", label: "Representantes" },
  { key: "doctors", label: "Prescritores" },
  { key: "commissions", label: "Comissões / Cashback" },
  { key: "reports", label: "Relatórios" },
  { key: "leads", label: "Leads" },
  { key: "links", label: "Links" },
  { key: "banners", label: "Banners" },
  { key: "pages", label: "Páginas" },
  { key: "popups", label: "Popups" },
  { key: "design", label: "Design / Cores" },
  { key: "checkout", label: "Checkout" },
  { key: "store", label: "Configurações da Loja" },
  { key: "integrations", label: "Integrações" },
  { key: "ai_agents", label: "Agentes IA" },
  { key: "users", label: "Usuários" },
];

// Default access rules
const DEFAULT_ACCESS: Record<string, Record<string, { view: boolean; edit: boolean }>> = {
  super_admin: Object.fromEntries(MENU_SECTIONS.map((s) => [s.key, { view: true, edit: true }])),
  admin: Object.fromEntries(MENU_SECTIONS.map((s) => [s.key, { view: true, edit: true }])),
  administrador: Object.fromEntries(MENU_SECTIONS.map((s) => [s.key, { view: true, edit: true }])),
  suporte: Object.fromEntries(MENU_SECTIONS.map((s) => [s.key, { view: true, edit: ["orders", "customers", "leads"].includes(s.key) }])),
  gestor: Object.fromEntries(MENU_SECTIONS.map((s) => [s.key, { view: !["users", "integrations"].includes(s.key), edit: ["orders", "products", "customers", "coupons", "representatives", "doctors", "leads", "banners"].includes(s.key) }])),
  financeiro: Object.fromEntries(MENU_SECTIONS.map((s) => [s.key, { view: ["dashboard", "orders", "commissions", "reports", "customers"].includes(s.key), edit: ["commissions"].includes(s.key) }])),
  representative: Object.fromEntries(MENU_SECTIONS.map((s) => [s.key, { view: ["dashboard", "doctors", "commissions", "links"].includes(s.key), edit: ["doctors", "links"].includes(s.key) }])),
  prescriber: Object.fromEntries(MENU_SECTIONS.map((s) => [s.key, { view: ["dashboard", "commissions"].includes(s.key), edit: false }])),
};

export default function UsersPage() {
  const { isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<{ user_id: string; name: string; roles: string[] } | null>(null);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role: "admin", representative_id: "" });
  const [editForm, setEditForm] = useState({ full_name: "", role: "", representative_id: "" });
  const [accessRules, setAccessRules] = useState<Record<string, Record<string, { view: boolean; edit: boolean }>>>(DEFAULT_ACCESS);
  const [selectedAccessRole, setSelectedAccessRole] = useState("gestor");

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: roles, error } = await supabase.from("user_roles").select("id, user_id, role");
      if (error) throw error;
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name");
      const profileMap: Record<string, string> = {};
      profiles?.forEach((p) => { profileMap[p.user_id] = p.full_name; });
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

  const { data: representatives } = useQuery({
    queryKey: ["representatives-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("representatives").select("id, name").eq("active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("create-tenant-user", {
        body: { ...form, representative_id: form.role === "prescriber" ? form.representative_id : undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Usuário criado com sucesso!");
      setCreateOpen(false);
      setForm({ email: "", password: "", full_name: "", role: "admin", representative_id: "" });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editUser) return;
      const { data, error } = await supabase.functions.invoke("create-tenant-user", {
        body: {
          action: "update",
          user_id: editUser.user_id,
          full_name: editForm.full_name,
          role: editForm.role,
          representative_id: editForm.role === "prescriber" ? editForm.representative_id : undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Usuário atualizado!");
      setEditUser(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openEdit = (u: { user_id: string; name: string; roles: string[] }) => {
    setEditUser(u);
    setEditForm({ full_name: u.name, role: u.roles[0] || "admin", representative_id: "" });
  };

  const currentAccess = accessRules[selectedAccessRole] || DEFAULT_ACCESS[selectedAccessRole] || {};

  const toggleAccess = (section: string, field: "view" | "edit") => {
    setAccessRules((prev) => {
      const roleCopy = { ...(prev[selectedAccessRole] || DEFAULT_ACCESS[selectedAccessRole] || {}) };
      const sectionCopy = { ...(roleCopy[section] || { view: false, edit: false }) };
      sectionCopy[field] = !sectionCopy[field];
      if (field === "edit" && sectionCopy.edit) sectionCopy.view = true;
      if (field === "view" && !sectionCopy.view) sectionCopy.edit = false;
      roleCopy[section] = sectionCopy;
      return { ...prev, [selectedAccessRole]: roleCopy };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">Usuários</h2>
          <p className="text-sm text-muted-foreground mt-1">Gerencie usuários e permissões do sistema</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Novo Usuário
        </Button>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users" className="gap-1.5"><UserCog className="h-4 w-4" /> Usuários</TabsTrigger>
          <TabsTrigger value="access" className="gap-1.5"><Shield className="h-4 w-4" /> Regras de Acesso</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead className="w-20">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : !users?.length ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado</TableCell></TableRow>
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
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(u)}>
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
        </TabsContent>

        <TabsContent value="access">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Regras de Acesso por Perfil</CardTitle>
              <CardDescription>Defina quais seções cada perfil pode visualizar e editar no painel administrativo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Label>Perfil:</Label>
                <Select value={selectedAccessRole} onValueChange={setSelectedAccessRole}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedAccessRole === "super_admin" ? (
                <div className="rounded-lg border border-success/30 bg-success/5 p-4 text-center">
                  <p className="text-sm font-medium text-success">🔓 Super Admin tem acesso total a todas as seções</p>
                </div>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Seção</TableHead>
                        <TableHead className="w-28 text-center">Visualizar</TableHead>
                        <TableHead className="w-28 text-center">Editar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {MENU_SECTIONS.map((s) => {
                        const access = currentAccess[s.key] || { view: false, edit: false };
                        return (
                          <TableRow key={s.key}>
                            <TableCell className="font-medium text-sm">{s.label}</TableCell>
                            <TableCell className="text-center">
                              <Switch
                                checked={access.view}
                                onCheckedChange={() => toggleAccess(s.key, "view")}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Switch
                                checked={access.edit}
                                onCheckedChange={() => toggleAccess(s.key, "edit")}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                * As regras de acesso são aplicadas em tempo real no painel administrativo. Super Admin sempre tem acesso total.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Usuário</DialogTitle></DialogHeader>
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
            {form.role === "prescriber" && (
              <div>
                <Label>Representante Vinculado *</Label>
                <Select value={form.representative_id} onValueChange={(v) => setForm((f) => ({ ...f, representative_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione um representante" /></SelectTrigger>
                  <SelectContent>
                    {representatives?.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !form.email || !form.password || (form.role === "prescriber" && !form.representative_id)}
            >
              {createMutation.isPending ? "Criando..." : "Criar Usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Usuário</DialogTitle></DialogHeader>
          {editUser && (
            <div className="space-y-4">
              <div>
                <Label>Nome completo</Label>
                <Input value={editForm.full_name} onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">ID: {editUser.user_id}</Label>
              </div>
              <div>
                <Label>Role</Label>
                <Select value={editForm.role} onValueChange={(v) => setEditForm((f) => ({ ...f, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.filter((o) => isSuperAdmin || !["super_admin", "suporte"].includes(o.value)).map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {editForm.role === "prescriber" && (
                <div>
                  <Label>Representante Vinculado *</Label>
                  <Select value={editForm.representative_id} onValueChange={(v) => setEditForm((f) => ({ ...f, representative_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione um representante" /></SelectTrigger>
                    <SelectContent>
                      {representatives?.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancelar</Button>
            <Button
              onClick={() => editMutation.mutate()}
              disabled={editMutation.isPending || (editForm.role === "prescriber" && !editForm.representative_id)}
            >
              {editMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
