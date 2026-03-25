import { useState } from "react";
import { Link } from "react-router-dom";
import { Trash2, Minus, Plus, Tag, ArrowLeft, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/hooks/useCart";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { toast } from "sonner";

const DOCTORS = [
  "Dr. Ricardo Mendes",
  "Dra. Mariana Costa",
  "Dr. Felipe Santos",
  "Dra. Camila Oliveira",
  "Dr. André Souza",
];

const CheckoutPage = () => {
  const { items, updateQuantity, removeItem, total, discount, coupon, applyCoupon } = useCart();
  const [step, setStep] = useState(1);
  const [couponInput, setCouponInput] = useState("");
  const [doctorSearch, setDoctorSearch] = useState("");
  const [showDoctorResults, setShowDoctorResults] = useState(false);
  const [form, setForm] = useState({
    name: "", cpf: "", email: "", phone: "",
    cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "",
    doctor: "", paymentMethod: "pix" as "pix" | "card",
  });

  const filteredDoctors = DOCTORS.filter((d) => d.toLowerCase().includes(doctorSearch.toLowerCase()));
  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const shipping = subtotal >= 199 ? 0 : 19.90;
  const finalTotal = total + shipping;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.doctor) {
      toast.error("O nome do Doutor é obrigatório!");
      return;
    }
    toast.success("Pedido realizado com sucesso! 🎉");
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-bold">Seu carrinho está vazio</h1>
          <p className="mt-2 text-muted-foreground">Adicione produtos para continuar</p>
          <Link to="/produtos"><Button className="mt-6">Ver Produtos</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container py-8 md:py-12">
        <Link to="/produtos" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Continuar Comprando
        </Link>

        <h1 className="text-2xl font-bold text-foreground">Checkout</h1>

        <div className="mt-6 flex gap-4">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>1</div>
          <div className={`h-0.5 flex-1 self-center ${step >= 2 ? "bg-primary" : "bg-border"}`} />
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>2</div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Carrinho</h2>
                {items.map((item) => (
                  <div key={item.product.id} className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
                    <img src={item.product.image} alt={item.product.name} className="h-16 w-16 rounded object-contain" />
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold">{item.product.name}</h3>
                      <p className="text-sm font-bold text-primary">R$ {item.product.price.toFixed(2).replace(".", ",")}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="rounded p-1 hover:bg-muted"><Minus className="h-4 w-4" /></button>
                      <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="rounded p-1 hover:bg-muted"><Plus className="h-4 w-4" /></button>
                    </div>
                    <button onClick={() => removeItem(item.product.id)} className="rounded p-1 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}

                <div className="flex gap-2">
                  <Input placeholder="Cupom de desconto" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} className="max-w-xs" />
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => applyCoupon(couponInput)}>
                    <Tag className="h-4 w-4" /> Aplicar
                  </Button>
                </div>

                <Button className="w-full" size="lg" onClick={() => setStep(2)}>Continuar para Dados</Button>
              </div>
            )}

            {step === 2 && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="text-lg font-semibold">Dados Pessoais</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label>Nome Completo *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div><Label>CPF *</Label><Input required value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} /></div>
                  <div><Label>Email *</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                  <div><Label>Telefone *</Label><Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                </div>

                <h2 className="text-lg font-semibold">Endereço</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label>CEP *</Label><Input required value={form.cep} onChange={(e) => setForm({ ...form, cep: e.target.value })} /></div>
                  <div><Label>Rua *</Label><Input required value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} /></div>
                  <div><Label>Número *</Label><Input required value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} /></div>
                  <div><Label>Complemento</Label><Input value={form.complement} onChange={(e) => setForm({ ...form, complement: e.target.value })} /></div>
                  <div><Label>Bairro *</Label><Input required value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} /></div>
                  <div><Label>Cidade *</Label><Input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                  <div><Label>Estado *</Label><Input required value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
                </div>

                <h2 className="text-lg font-semibold">Doutor Responsável *</h2>
                <div className="relative">
                  <Input
                    required
                    placeholder="Buscar nome do Doutor..."
                    value={form.doctor || doctorSearch}
                    onChange={(e) => {
                      setDoctorSearch(e.target.value);
                      setForm({ ...form, doctor: "" });
                      setShowDoctorResults(true);
                    }}
                  />
                  {showDoctorResults && doctorSearch && (
                    <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-card shadow-lg">
                      {filteredDoctors.map((d) => (
                        <button
                          key={d}
                          type="button"
                          className="w-full px-4 py-2 text-left text-sm hover:bg-muted"
                          onClick={() => { setForm({ ...form, doctor: d }); setDoctorSearch(""); setShowDoctorResults(false); }}
                        >
                          {d}
                        </button>
                      ))}
                      {filteredDoctors.length === 0 && (
                        <button
                          type="button"
                          className="w-full px-4 py-2 text-left text-sm text-secondary hover:bg-muted"
                          onClick={() => { setForm({ ...form, doctor: doctorSearch }); setShowDoctorResults(false); toast.info("Novo doutor cadastrado!"); }}
                        >
                          + Cadastrar "{doctorSearch}" como novo Doutor
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <h2 className="text-lg font-semibold">Pagamento</h2>
                <div className="flex gap-3">
                  <button
                    type="button"
                    className={`flex-1 rounded-lg border-2 p-4 text-center text-sm font-medium transition ${form.paymentMethod === "pix" ? "border-primary bg-trust-light" : "border-border"}`}
                    onClick={() => setForm({ ...form, paymentMethod: "pix" })}
                  >
                    💰 Pix<br /><span className="text-xs text-success">5% de desconto</span>
                  </button>
                  <button
                    type="button"
                    className={`flex-1 rounded-lg border-2 p-4 text-center text-sm font-medium transition ${form.paymentMethod === "card" ? "border-primary bg-trust-light" : "border-border"}`}
                    onClick={() => setForm({ ...form, paymentMethod: "card" })}
                  >
                    <CreditCard className="mx-auto mb-1 h-5 w-5" />Cartão<br /><span className="text-xs text-muted-foreground">até 3x sem juros</span>
                  </button>
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>Voltar</Button>
                  <Button type="submit" className="flex-1" size="lg">Finalizar Pedido</Button>
                </div>
              </form>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="text-base font-semibold">Resumo do Pedido</h3>
            <div className="mt-4 space-y-2 text-sm">
              {items.map((item) => (
                <div key={item.product.id} className="flex justify-between">
                  <span className="text-muted-foreground">{item.product.name} x{item.quantity}</span>
                  <span>R$ {(item.product.price * item.quantity).toFixed(2).replace(".", ",")}</span>
                </div>
              ))}
              <div className="border-t border-border pt-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>R$ {subtotal.toFixed(2).replace(".", ",")}</span></div>
                {discount > 0 && (
                  <div className="flex justify-between text-success"><span>Desconto ({coupon})</span><span>-R$ {discount.toFixed(2).replace(".", ",")}</span></div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Frete</span>
                  <span className={shipping === 0 ? "font-semibold text-success" : ""}>{shipping === 0 ? "Grátis" : `R$ ${shipping.toFixed(2).replace(".", ",")}`}</span>
                </div>
              </div>
              <div className="border-t border-border pt-2">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">R$ {finalTotal.toFixed(2).replace(".", ",")}</span>
                </div>
                {form.paymentMethod === "pix" && (
                  <p className="text-xs text-success">No Pix: R$ {(finalTotal * 0.95).toFixed(2).replace(".", ",")}</p>
                )}
              </div>
            </div>
            <div className="mt-4 space-y-1 text-[10px] text-muted-foreground">
              <p>🔒 Pagamento 100% seguro</p>
              <p>🚚 Frete grátis acima de R$199</p>
              <p>✅ Garantia de 30 dias</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default CheckoutPage;
