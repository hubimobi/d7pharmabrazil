import { useState, useMemo } from "react";
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
import { Plus, Pencil, CheckCircle, Copy, Tag } from "lucide-react";
import { toast } from "sonner";

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

const STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA",
  "PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

const CITIES_BY_STATE: Record<string, string[]> = {
  SP: ["São Paulo","Campinas","Santos","Ribeirão Preto","São José dos Campos","Sorocaba","Osasco","Guarulhos","São Bernardo do Campo","Santo André","Bauru","Piracicaba","Jundiaí","Franca","Marília"],
  RJ: ["Rio de Janeiro","Niterói","Petrópolis","Volta Redonda","Campos dos Goytacazes","Nova Iguaçu","Duque de Caxias","São Gonçalo","Macaé","Angra dos Reis"],
  MG: ["Belo Horizonte","Uberlândia","Contagem","Juiz de Fora","Betim","Montes Claros","Uberaba","Governador Valadares","Ipatinga","Poços de Caldas"],
  RS: ["Porto Alegre","Caxias do Sul","Pelotas","Canoas","Santa Maria","Novo Hamburgo","Passo Fundo","São Leopoldo","Rio Grande","Gravataí"],
  PR: ["Curitiba","Londrina","Maringá","Ponta Grossa","Cascavel","Foz do Iguaçu","São José dos Pinhais","Colombo","Guarapuava","Paranaguá"],
  SC: ["Florianópolis","Joinville","Blumenau","Chapecó","Criciúma","Itajaí","Jaraguá do Sul","Lages","Balneário Camboriú","São José"],
  BA: ["Salvador","Feira de Santana","Vitória da Conquista","Camaçari","Itabuna","Lauro de Freitas","Ilhéus","Juazeiro","Teixeira de Freitas","Barreiras"],
  PE: ["Recife","Jaboatão dos Guararapes","Olinda","Caruaru","Petrolina","Paulista","Cabo de Santo Agostinho","Camaragibe","Garanhuns","Vitória de Santo Antão"],
  CE: ["Fortaleza","Caucaia","Juazeiro do Norte","Maracanaú","Sobral","Crato","Itapipoca","Maranguape","Iguatu","Quixadá"],
  GO: ["Goiânia","Aparecida de Goiânia","Anápolis","Rio Verde","Luziânia","Águas Lindas de Goiás","Valparaíso de Goiás","Trindade","Formosa","Itumbiara"],
  PA: ["Belém","Ananindeua","Santarém","Marabá","Castanhal","Parauapebas","Abaetetuba","Cametá","Marituba","Bragança"],
  MA: ["São Luís","Imperatriz","São José de Ribamar","Timon","Caxias","Codó","Paço do Lumiar","Açailândia","Bacabal","Santa Inês"],
  AM: ["Manaus","Parintins","Itacoatiara","Manacapuru","Coari","Tefé","Tabatinga","Maués","Iranduba","Humaitá"],
  ES: ["Vitória","Vila Velha","Serra","Cariacica","Cachoeiro de Itapemirim","Linhares","Colatina","Guarapari","São Mateus","Aracruz"],
  DF: ["Brasília","Ceilândia","Taguatinga","Samambaia","Plano Piloto","Águas Claras","Recanto das Emas","Gama","Guará","Santa Maria"],
  MT: ["Cuiabá","Várzea Grande","Rondonópolis","Sinop","Tangará da Serra","Cáceres","Sorriso","Lucas do Rio Verde","Primavera do Leste","Barra do Garças"],
  MS: ["Campo Grande","Dourados","Três Lagoas","Corumbá","Ponta Porã","Naviraí","Nova Andradina","Aquidauana","Sidrolândia","Maracaju"],
  PB: ["João Pessoa","Campina Grande","Santa Rita","Patos","Bayeux","Sousa","Cabedelo","Cajazeiras","Guarabira","Sapé"],
  RN: ["Natal","Mossoró","Parnamirim","São Gonçalo do Amarante","Macaíba","Ceará-Mirim","Caicó","Açu","Currais Novos","São José de Mipibu"],
  PI: ["Teresina","Parnaíba","Picos","Piripiri","Floriano","Campo Maior","Barras","União","Altos","José de Freitas"],
  AL: ["Maceió","Arapiraca","Rio Largo","Palmeira dos Índios","União dos Palmares","Penedo","São Miguel dos Campos","Santana do Ipanema","Delmiro Gouveia","Coruripe"],
  SE: ["Aracaju","Nossa Senhora do Socorro","Lagarto","Itabaiana","São Cristóvão","Estância","Tobias Barreto","Simão Dias","Itabaianinha","Capela"],
  RO: ["Porto Velho","Ji-Paraná","Ariquemes","Vilhena","Cacoal","Rolim de Moura","Jaru","Guajará-Mirim","Ouro Preto do Oeste","Buritis"],
  TO: ["Palmas","Araguaína","Gurupi","Porto Nacional","Paraíso do Tocantins","Colinas do Tocantins","Guaraí","Tocantinópolis","Dianópolis","Miracema do Tocantins"],
  AC: ["Rio Branco","Cruzeiro do Sul","Sena Madureira","Tarauacá","Feijó","Brasiléia","Senador Guiomard","Plácido de Castro","Xapuri","Epitaciolândia"],
  AP: ["Macapá","Santana","Laranjal do Jari","Oiapoque","Mazagão","Porto Grande","Tartarugalzinho","Pedra Branca do Amapari","Vitória do Jari","Calçoene"],
  RR: ["Boa Vista","Rorainópolis","Caracaraí","Alto Alegre","Pacaraima","Cantá","Bonfim","Uiramutã","São João da Baliza","Caroebe"],
};

export default function DoctorsPage() {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<DocForm>(emptyForm);
  const [successCoupon, setSuccessCoupon] = useState<{ code: string; name: string; doctorId: string; email: string } | null>(null);
  const [linkedCoupon, setLinkedCoupon] = useState<string | null>(null);
  const [citySearch, setCitySearch] = useState("");
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
      const { data, error } = await supabase.from("doctors").select("*, representatives(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const availableCities = useMemo(() => {
    if (!form.state) return [];
    const list = CITIES_BY_STATE[form.state] ?? [];
    if (!citySearch) return list;
    const q = citySearch.toLowerCase();
    return list.filter((c) => c.toLowerCase().includes(q));
  }, [form.state, citySearch]);

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
        const { data: inserted, error } = await supabase.from("doctors").insert(payload).select().single();
        if (error) throw error;

        if (inserted) {
          const initials = form.name.split(/\s+/).filter(Boolean).map(w => w[0].toUpperCase()).join("");
          const randomDigit = Math.floor(Math.random() * 10);
          const { count } = await supabase.from("doctors").select("id", { count: "exact", head: true });
          const seq = count ?? 1;
          const couponCode = `${initials}${randomDigit}R${seq}`;
          await supabase.from("coupons").insert({
            code: couponCode,
            description: `Cupom do Prescritor ${form.name}`,
            discount_type: "percent",
            discount_value: 10,
            active: true,
            doctor_id: inserted.id,
            representative_id: repIdVal,
          } as any);

          return { couponCode, doctorId: inserted.id, email: form.email };
        }
      }
      return null;
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["doctors"] });
      setOpen(false);
      if (result?.couponCode && !editId) {
        setSuccessCoupon({ code: result.couponCode, name: form.name, doctorId: result.doctorId, email: result.email });
      } else {
        toast.success(editId ? "Prescritor atualizado" : "Prescritor cadastrado!");
      }
      setForm(emptyForm);
      setEditId(null);
      setLinkedCoupon(null);
      setCitySearch("");
    },
    onError: (err: any) => toast.error(`Erro ao salvar: ${err?.message}`),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("doctors").update({ active: !active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["doctors"] }),
  });

  const openEdit = async (doc: NonNullable<typeof doctors>[number]) => {
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
    setCitySearch("");
    // Fetch linked coupon
    const { data: coupon } = await supabase
      .from("coupons")
      .select("code")
      .eq("doctor_id", doc.id)
      .eq("active", true)
      .limit(1)
      .maybeSingle();
    setLinkedCoupon(coupon?.code ?? null);
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold">Prescritores</h2>
          <p className="text-sm text-muted-foreground mt-1">Cadastre e gerencie prescritores e cupons</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditId(null); setForm(emptyForm); setLinkedCoupon(null); setCitySearch(""); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Novo Prescritor</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? "Editar" : "Novo"} Prescritor</DialogTitle>
            </DialogHeader>

            {/* Linked coupon badge on edit */}
            {editId && linkedCoupon && (
              <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2">
                <Tag className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Cupom vinculado:</span>
                <span className="font-mono font-bold text-primary">{linkedCoupon}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 ml-auto"
                  onClick={() => {
                    navigator.clipboard.writeText(linkedCoupon);
                    toast.success("Cupom copiado!");
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            )}

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
                  <Label>Registro Profissional</Label>
                  <Input value={form.crm} onChange={(e) => setForm({ ...form, crm: e.target.value })} placeholder="CRM, CRN, CREFITO..." />
                </div>
                <div className="space-y-2">
                  <Label>Especialidade</Label>
                  <Input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select value={form.state} onValueChange={(v) => setForm({ ...form, state: v, city: "" })}>
                    <SelectTrigger><SelectValue placeholder="Selecione o estado" /></SelectTrigger>
                    <SelectContent>
                      {STATES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  {form.state ? (
                    <div className="space-y-1">
                      <Input
                        placeholder="Buscar cidade..."
                        value={citySearch}
                        onChange={(e) => setCitySearch(e.target.value)}
                        className="h-8 text-xs"
                      />
                      <Select value={form.city} onValueChange={(v) => { setForm({ ...form, city: v }); setCitySearch(""); }}>
                        <SelectTrigger><SelectValue placeholder="Selecione a cidade" /></SelectTrigger>
                        <SelectContent className="max-h-48">
                          {availableCities.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                          {availableCities.length === 0 && (
                            <div className="px-2 py-1.5 text-xs text-muted-foreground">Nenhuma cidade encontrada</div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <Input disabled placeholder="Selecione o estado primeiro" />
                  )}
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
                  toast.success("Cupom copiado!");
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
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">E-mail</TableHead>
                <TableHead className="hidden lg:table-cell">CRM</TableHead>
                <TableHead className="hidden lg:table-cell">Especialidade</TableHead>
                <TableHead className="hidden md:table-cell">Cidade/UF</TableHead>
                {isAdmin && <TableHead className="hidden lg:table-cell">Representante</TableHead>}
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
                    <TableCell className="hidden md:table-cell text-sm">{(doc as any).email ?? "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell">{doc.crm ?? "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell">{doc.specialty ?? "—"}</TableCell>
                    <TableCell className="hidden md:table-cell">{[doc.city, doc.state].filter(Boolean).join("/") || "—"}</TableCell>
                    {isAdmin && <TableCell className="hidden lg:table-cell">{(doc as any).representatives?.name ?? "—"}</TableCell>}
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
