import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Store, Check } from "lucide-react";
import SEOHead from "@/components/SEOHead";

const PLANS = [
  { id: "trial", name: "Trial 14 dias", price: "Grátis", desc: "Teste tudo sem compromisso" },
  { id: "basic", name: "Básico", price: "R$ 97/mês", desc: "Até 50 produtos, 1 usuário" },
  { id: "pro", name: "Pro", price: "R$ 297/mês", desc: "Produtos ilimitados, 5 usuários, IA inclusa" },
] as const;

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

export default function CreateStorePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [provisioning, setProvisioning] = useState(false);
  const [provisionMsg, setProvisionMsg] = useState("Criando sua loja...");
  const [form, setForm] = useState({
    store_name: "",
    store_slug: "",
    owner_name: "",
    owner_email: "",
    owner_password: "",
    plan: "trial" as "trial" | "basic" | "pro",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (k: keyof typeof form, v: string) => {
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (k === "store_name" && !f.store_slug) next.store_slug = slugify(v);
      return next;
    });
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setErrors({});
    try {
      const { data, error } = await supabase.functions.invoke("signup-tenant", {
        body: form,
      });
      if (error) throw error;
      if (data?.error) {
        if (data.error === "validation_error") setErrors(data.fields ?? {});
        else if (data.error === "slug_taken") setErrors({ store_slug: "Já existe uma loja com esse identificador" });
        else if (data.error === "email_taken") setErrors({ owner_email: "Esse e-mail já tem cadastro" });
        else toast.error(data.error);
        return;
      }
      // Auto-login
      const { error: loginErr } = await supabase.auth.signInWithPassword({
        email: form.owner_email, password: form.owner_password,
      });
      if (loginErr) {
        toast.success("Loja criada! Faça login para continuar.");
        navigate("/login");
      } else {
        toast.success("Loja criada com sucesso!");
        navigate("/admin");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  };

  const canNext1 = form.store_name.trim().length >= 2 && /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/.test(form.store_slug);
  const canNext2 = form.owner_name.trim().length >= 2 &&
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.owner_email) &&
    form.owner_password.length >= 8;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
      <SEOHead title="Crie sua loja" description="Crie sua loja online em minutos. Trial grátis de 14 dias." />
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Store className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Crie sua loja</CardTitle>
          <CardDescription>
            Etapa {step} de 3 — {step === 1 ? "Sobre a loja" : step === 2 ? "Sobre você" : "Escolha seu plano"}
          </CardDescription>
          <div className="flex gap-2 justify-center mt-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`h-1.5 w-12 rounded-full transition ${s <= step ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 1 && (
            <>
              <div>
                <Label htmlFor="store_name">Nome da loja *</Label>
                <Input id="store_name" value={form.store_name} onChange={(e) => update("store_name", e.target.value)} placeholder="Minha Farmácia" maxLength={60} />
                {errors.store_name && <p className="text-sm text-destructive mt-1">{errors.store_name}</p>}
              </div>
              <div>
                <Label htmlFor="store_slug">Identificador (URL) *</Label>
                <div className="flex items-center gap-1">
                  <Input id="store_slug" value={form.store_slug} onChange={(e) => update("store_slug", slugify(e.target.value))} placeholder="minha-farmacia" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Sua loja ficará em <strong>{form.store_slug || "minha-loja"}.lovable.app</strong></p>
                {errors.store_slug && <p className="text-sm text-destructive mt-1">{errors.store_slug}</p>}
              </div>
              <Button className="w-full" disabled={!canNext1} onClick={() => setStep(2)}>Continuar</Button>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <Label htmlFor="owner_name">Seu nome *</Label>
                <Input id="owner_name" value={form.owner_name} onChange={(e) => update("owner_name", e.target.value)} />
                {errors.owner_name && <p className="text-sm text-destructive mt-1">{errors.owner_name}</p>}
              </div>
              <div>
                <Label htmlFor="owner_email">E-mail *</Label>
                <Input id="owner_email" type="email" value={form.owner_email} onChange={(e) => update("owner_email", e.target.value)} />
                {errors.owner_email && <p className="text-sm text-destructive mt-1">{errors.owner_email}</p>}
              </div>
              <div>
                <Label htmlFor="owner_password">Senha (mín. 8 caracteres) *</Label>
                <Input id="owner_password" type="password" value={form.owner_password} onChange={(e) => update("owner_password", e.target.value)} />
                {errors.owner_password && <p className="text-sm text-destructive mt-1">{errors.owner_password}</p>}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Voltar</Button>
                <Button className="flex-1" disabled={!canNext2} onClick={() => setStep(3)}>Continuar</Button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="grid gap-3">
                {PLANS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => update("plan", p.id)}
                    className={`text-left p-4 border-2 rounded-lg transition ${form.plan === p.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          {p.name}
                          {form.plan === p.id && <Check className="w-4 h-4 text-primary" />}
                        </div>
                        <div className="text-sm text-muted-foreground">{p.desc}</div>
                      </div>
                      <div className="text-lg font-bold text-primary">{p.price}</div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(2)} disabled={loading}>Voltar</Button>
                <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Criando...</> : "Criar minha loja"}
                </Button>
              </div>
            </>
          )}

          <p className="text-center text-sm text-muted-foreground pt-4 border-t">
            Já tem uma loja? <Link to="/login" className="text-primary hover:underline">Fazer login</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
