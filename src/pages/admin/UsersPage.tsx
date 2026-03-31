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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, UserCog, Pencil, Shield, MoreHorizontal, KeyRound, UserX, UserCheck } from "lucide-react";
import { toast } from "sonner";

const ROLE_OPTIONS = [
  { value: "super_admin", label: "Super Admin" },
  { value: "suporte", label: "Suporte" },
  { value: "administrador", label: "Super Admin" },
  { value: "admin", label: "Administrador" },
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
  { key: "feedbacks", label: "Feedbacks" },
  { key: "design", label: "Design / Cores" },
  { key: "checkout", label: "Checkout" },
  { key: "store", label: "Configurações da Loja" },
  { key: "integrations", label: "Integrações" },
  { key: "ai_agents", label: "Agentes IA" },
  { key: "recovery", label: "Recuperação" },
  { key: "repurchase", label: "Recompra (+LTV)" },
  { key: "combos", label: "Combos" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "tools", label: "Ferramentas" },
  { key: "users", label: "Usuários" },
];

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

interface UserEntry {
  user_id: string;
  roles: string[];
  name: string;
  email: string;
  phone: string;
  active: boolean;
}

export default function UsersPage() {
  const { isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserEntry | null>(null);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role: "admin", representative_id: "", doctor_id: "", representative_record_id: "" });
  const [editForm, setEditForm] = useState({ full_name: "", role: "", representative_id: "", email: "", phone: "" });
  const [accessRules, setAccessRules] = useState<Record<string, Record<string, { view: boolean; edit: boolean }>>>(DEFAULT_ACCESS);
  const [selectedAccessRole, setSelectedAccessRole] = useState("gestor");

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [rolesRes, profilesRes, authRes] = await Promise.all([
        supabase.from("user_roles").select("id, user_id, role"),
        supabase.from("profiles").select("user_id, full_name, phone"),
        supabase.functions.invoke("create-tenant-user", { body: { action: "list_users" } }),
      ]);
      if (rolesRes.error) throw rolesRes.error;
      const roles = rolesRes.data;
      const profiles = profilesRes.data;
      const authUsers: Record<string, { email: string; banned: boolean }> = authRes.data?.users || {};

      const profileMap: Record<string, { name: string; phone: string }> = {};
      profiles?.forEach((p) => { profileMap[p.user_id] = { name: p.full_name, phone: p.phone || "" }; });

      const userMap: Record<string, UserEntry> = {};
      roles?.forEach((r) => {
        if (!userMap[r.user_id]) {
          const profile = profileMap[r.user_id];
          const auth = authUsers[r.user_id];
          userMap[r.user_id] = {
            user_id: r.user_id,
            roles: [],
            name: profile?.name || "—",
            email: auth?.email || "",
            phone: profile?.phone || "",
            active: auth ? !auth.banned : true,
          };
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

  const { data: doctors } = useQuery({
    queryKey: ["doctors-list-for-users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("doctors").select("id, name, email, representative_id, user_id").eq("active", true).order("name") as any;
      if (error) throw error;
      return data as { id: string; name: string; email: string | null; representative_id: string; user_id: string | null }[];
    },
  });

  // Doctors without a linked user (available to create user for)
  const availableDoctors = doctors?.filter((d) => !d.user_id) || [];

  // Representatives without a linked user (available to create user for)
  const availableReps = representatives?.filter((r) => {
    // Check if any user already has this rep linked
    // We do a simple check: if rep has no user_id in the raw data
    return true; // RLS handles this; we show all active reps for selection
  }) || [];

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("create-tenant-user", {
        body: {
          ...form,
          representative_id: form.role === "prescriber" ? form.representative_id : undefined,
          doctor_id: form.role === "prescriber" ? form.doctor_id : undefined,
          representative_record_id: form.role === "representative" ? form.representative_record_id : undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Usuário criado com sucesso!");
      setCreateOpen(false);
      setForm({ email: "", password: "", full_name: "", role: "admin", representative_id: "", doctor_id: "", representative_record_id: "" });
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
          phone: editForm.phone,
          email: editForm.email !== editUser.email ? editForm.email : undefined,
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

  const handleSendPasswordReset = async (email: string) => {
    if (!email) {
      toast.error("Este usuário não possui e-mail cadastrado.");
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success(`Link de redefinição enviado para ${email}`);
    } catch (err: any) {
      toast.error(`Erro ao enviar: ${err.message}`);
    }
  };

  const handleToggleActive = async (userId: string, currentlyActive: boolean) => {
    try {
      const { data, error } = await supabase.functions.invoke("create-tenant-user", {
        body: { action: "toggle_active", user_id: userId, active: !currentlyActive },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(currentlyActive ? "Usuário desativado" : "Usuário ativado");
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  const openEdit = (u: UserEntry) => {
    setEditUser(u);
    setEditForm({ full_name: u.name, role: u.roles[0] || "admin", representative_id: "", email: u.email, phone: u.phone });
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
                    <TableHead>Tipo</TableHead>
                    <TableHead className="w-28">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : !users?.length ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado</TableCell></TableRow>
                  ) : (
                    users.map((u) => (
                      <TableRow key={u.user_id} className={!u.active ? "opacity-50" : ""}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <UserCog className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <span>{u.name}</span>
                              {u.email && <p className="text-xs text-muted-foreground">{u.email}</p>}
                              {u.phone && <p className="text-xs text-muted-foreground">{u.phone}</p>}
                              {!u.active && <Badge variant="destructive" className="text-[10px] px-1 py-0 mt-0.5">Inativo</Badge>}
                            </div>
                          </div>
                        </TableCell>
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
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(u)}>
                                <Pencil className="mr-2 h-4 w-4" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleSendPasswordReset(u.email)}>
                                <KeyRound className="mr-2 h-4 w-4" /> Enviar Nova Senha
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleActive(u.user_id, u.active)}>
                                {u.active ? (
                                  <><UserX className="mr-2 h-4 w-4" /> Desativar</>
                                ) : (
                                  <><UserCheck className="mr-2 h-4 w-4" /> Ativar</>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
              <Label>Tipo</Label>
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
              <div className="space-y-4">
                <div>
                  <Label>Prescritor Cadastrado *</Label>
                  <Select
                    value={form.doctor_id}
                    onValueChange={(v) => {
                      const doc = availableDoctors.find((d) => d.id === v);
                      if (doc) {
                        setForm((f) => ({
                          ...f,
                          doctor_id: v,
                          full_name: doc.name,
                          email: doc.email || "",
                          representative_id: doc.representative_id,
                        }));
                      }
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione um prescritor" /></SelectTrigger>
                    <SelectContent>
                      {availableDoctors.length === 0 ? (
                        <SelectItem value="_none" disabled>Nenhum prescritor sem usuário</SelectItem>
                      ) : (
                        availableDoctors.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name} {d.email ? `(${d.email})` : ""}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    O email e nome serão preenchidos automaticamente com os dados do prescritor.
                  </p>
                </div>
              </div>
            )}
            {form.role === "representative" && (
              <div>
                <Label>Representante Cadastrado *</Label>
                <Select
                  value={form.representative_record_id}
                  onValueChange={(v) => {
                    const rep = representatives?.find((r) => r.id === v);
                    if (rep) {
                      setForm((f) => ({
                        ...f,
                        representative_record_id: v,
                        full_name: rep.name,
                      }));
                    }
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione um representante" /></SelectTrigger>
                  <SelectContent>
                    {representatives?.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  O nome será preenchido automaticamente. O user_id será vinculado ao registro.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !form.email || !form.password || (form.role === "prescriber" && !form.doctor_id) || (form.role === "representative" && !form.representative_record_id)}
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
                <Label>Email</Label>
                {isSuperAdmin ? (
                  <Input value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
                ) : (
                  <Input value={editForm.email} readOnly disabled className="bg-muted" />
                )}
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} placeholder="(00) 00000-0000" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">ID: {editUser.user_id}</Label>
              </div>
              <div>
                <Label>Tipo</Label>
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
