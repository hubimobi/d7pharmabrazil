import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, UserPlus, Clock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

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

type Step = "form" | "pending" | "create-user" | "done";

export default function PrescriberSignupPage() {
  const [searchParams] = useSearchParams();
  const repId = searchParams.get("rep");

  const [step, setStep] = useState<Step>("form");
  const [saving, setSaving] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [doctorResult, setDoctorResult] = useState<{ id: string; name: string; couponCode: string; email: string } | null>(null);

  // User creation
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userConfirm, setUserConfirm] = useState("");
  const [creatingUser, setCreatingUser] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    cpf: "",
    pix: "",
    crm: "",
    specialty: "",
    state: "",
    city: "",
    phone: "",
  });

  const availableCities = useMemo(() => {
    if (!form.state) return [];
    const list = CITIES_BY_STATE[form.state] ?? [];
    if (!citySearch) return list;
    const q = citySearch.toLowerCase();
    return list.filter((c) => c.toLowerCase().includes(q));
  }, [form.state, citySearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Nome e e-mail são obrigatórios");
      return;
    }

    setSaving(true);
    try {
      // Check if email already exists
      const { data: existing } = await supabase
        .from("doctors")
        .select("id")
        .eq("email", form.email)
        .maybeSingle();

      if (existing) {
        toast.error("Este e-mail já está cadastrado como prescritor.");
        setSaving(false);
        return;
      }

      // Look up representative by short_code (4-char friendly code)
      let representativeId: string | null = null;
      if (repId) {
        const { data: repByCode } = await (supabase
          .from("representatives")
          .select("id") as any)
          .eq("short_code", repId.toUpperCase())
          .eq("active", true)
          .maybeSingle();
        representativeId = repByCode?.id ?? null;

        // Fallback: try as UUID for backwards compatibility
        if (!representativeId) {
          const { data: repById } = await supabase
            .from("representatives")
            .select("id")
            .eq("id", repId)
            .eq("active", true)
            .maybeSingle();
          representativeId = repById?.id ?? null;
        }
      }
      if (!representativeId) {
        const { data: firstRep } = await supabase
          .from("representatives")
          .select("id")
          .eq("active", true)
          .limit(1)
          .single();
        representativeId = firstRep?.id ?? null;
      }

      if (!representativeId) {
        toast.error("Nenhum representante disponível. Contate o suporte.");
        setSaving(false);
        return;
      }

      const { data: inserted, error } = await supabase
        .from("doctors")
        .insert({
          name: form.name,
          email: form.email,
          cpf: form.cpf || null,
          pix: form.pix || null,
          crm: form.crm || null,
          specialty: form.specialty || null,
          state: form.state || null,
          city: form.city || null,
          representative_id: representativeId,
          approval_status: "pending",
          active: false,
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Generate coupon code
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
        active: false, // Inactive until approved
        doctor_id: inserted.id,
        representative_id: representativeId,
      } as any);

      setDoctorResult({ id: inserted.id, name: form.name, couponCode, email: form.email });
      setUserEmail(form.email);
      setStep("pending");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao cadastrar");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async () => {
    if (!userEmail || !userPassword) {
      toast.error("Preencha e-mail e senha");
      return;
    }
    if (userPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (userPassword !== userConfirm) {
      toast.error("As senhas não conferem");
      return;
    }

    setCreatingUser(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-prescriber-signup", {
        body: { email: userEmail, password: userPassword },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setStep("done");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao criar usuário");
    } finally {
      setCreatingUser(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center p-4 py-12">
        <Card className="w-full max-w-lg">
          {step === "form" && (
            <>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Cadastro de Prescritor</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Preencha seus dados para se cadastrar como prescritor parceiro
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome Completo *</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>E-mail *</Label>
                      <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Telefone</Label>
                      <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(00) 00000-0000" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>CPF</Label>
                      <Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} placeholder="000.000.000-00" />
                    </div>
                    <div className="space-y-2">
                      <Label>Chave Pix</Label>
                      <Input value={form.pix} onChange={(e) => setForm({ ...form, pix: e.target.value })} placeholder="CPF, e-mail ou chave" />
                    </div>
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
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Cidade</Label>
                      {form.state ? (
                        <div className="space-y-1">
                          <Input placeholder="Buscar..." value={citySearch} onChange={(e) => setCitySearch(e.target.value)} className="h-8 text-xs" />
                          <Select value={form.city} onValueChange={(v) => { setForm({ ...form, city: v }); setCitySearch(""); }}>
                            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent className="max-h-48">
                              {availableCities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                              {availableCities.length === 0 && <div className="px-2 py-1.5 text-xs text-muted-foreground">Nenhuma cidade</div>}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <Input disabled placeholder="Selecione o estado" />
                      )}
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={saving}>
                    {saving ? "Enviando..." : "Cadastrar"}
                  </Button>
                </form>
              </CardContent>
            </>
          )}

          {step === "pending" && doctorResult && (
            <CardContent className="py-8">
              <div className="flex flex-col items-center gap-5 text-center">
                <Clock className="h-14 w-14 text-amber-500" />
                <h2 className="text-xl font-bold">Cadastro Enviado!</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Seu cupom de <span className="font-bold text-primary">10% de desconto</span> será:
                </p>
                <div className="rounded-lg border-2 border-primary/30 bg-primary/5 px-6 py-3">
                  <span className="text-xl font-mono font-bold text-primary">{doctorResult.couponCode}</span>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  <p className="font-semibold mb-1">⏳ Aguardando aprovação</p>
                  <p>Seu cadastro está sendo validado. O cupom será ativado após a aprovação pelo seu representante ou administrador.</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Enquanto isso, crie seu usuário de acesso para acompanhar seus cashbacks:
                </p>
                <Button onClick={() => setStep("create-user")} className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Criar Usuário de Acesso
                </Button>
              </div>
            </CardContent>
          )}

          {step === "create-user" && (
            <CardContent className="py-8">
              <div className="flex flex-col items-center gap-5 text-center">
                <UserPlus className="h-12 w-12 text-primary" />
                <h2 className="text-xl font-bold">Criar Acesso ao Painel</h2>
                <p className="text-sm text-muted-foreground">
                  Crie uma senha para acessar o painel do prescritor
                </p>
                <div className="w-full max-w-sm space-y-4 text-left">
                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <Input value={userEmail} disabled className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label>Senha</Label>
                    <Input type="password" value={userPassword} onChange={(e) => setUserPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
                  </div>
                  <div className="space-y-2">
                    <Label>Confirmar Senha</Label>
                    <Input type="password" value={userConfirm} onChange={(e) => setUserConfirm(e.target.value)} />
                  </div>
                  <Button className="w-full" onClick={handleCreateUser} disabled={creatingUser}>
                    {creatingUser ? "Criando..." : "Criar Usuário"}
                  </Button>
                </div>
              </div>
            </CardContent>
          )}

          {step === "done" && (
            <CardContent className="py-8">
              <div className="flex flex-col items-center gap-5 text-center">
                <ShieldCheck className="h-14 w-14 text-green-500" />
                <h2 className="text-xl font-bold">Usuário Criado com Sucesso!</h2>
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                  <p className="font-semibold mb-1">✅ Cadastro enviado para validação</p>
                  <p>Seu representante ou administrador irá analisar seus dados. Assim que aprovado, seu cupom será ativado e você receberá cashback em cada venda.</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Você já pode fazer login no <a href="/prescritor" className="text-primary font-semibold underline">Painel do Prescritor</a> para acompanhar o status.
                </p>
                <Button asChild>
                  <a href="/prescritor">Ir para o Painel</a>
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      </main>
      <Footer />
    </div>
  );
}
