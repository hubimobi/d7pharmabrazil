import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trash2, Minus, Plus, Tag, ArrowLeft, CreditCard, CheckCircle, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/hooks/useCart";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import ShippingCalculator, { ShippingOption } from "@/components/checkout/ShippingCalculator";
import CreditCardForm, { CreditCardData, getInstallmentOptions } from "@/components/checkout/CreditCardForm";
import PixPaymentResult from "@/components/checkout/PixPaymentResult";
import { toast } from "sonner";
import CartRecommendations from "@/components/checkout/CartRecommendations";
import CheckoutUrgency from "@/components/checkout/CheckoutUrgency";
import ComboUpsell from "@/components/checkout/ComboUpsell";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { Progress } from "@/components/ui/progress";

interface PaymentResult {
  payment_id: string;
  status: string;
  invoice_url: string;
  pix?: { encodedImage: string; payload: string; expirationDate?: string } | null;
  order_id?: string;
}

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { items, updateQuantity, removeItem, total, discount, coupon, applyCoupon, clearCart, freeShipping } = useCart();
  const { data: storeSettings } = useStoreSettings();
  const [step, setStep] = useState(1);
  const [couponInput, setCouponInput] = useState("");
  const [doctorSearch, setDoctorSearch] = useState("");
  const [showDoctorResults, setShowDoctorResults] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [cardData, setCardData] = useState<CreditCardData>({
    holderName: "", number: "", expiryMonth: "", expiryYear: "", ccv: "",
  });
  const [installments, setInstallments] = useState(1);
  const [form, setForm] = useState({
    name: "", cpf: "", email: "", phone: "",
    cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "",
    doctor: "", paymentMethod: "pix" as "pix" | "card",
  });
  const abandonmentSaved = useRef(false);

  // Scroll to top when checkout page mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  // Track cart abandonment: save to DB + sync to GHL when user leaves without completing
  useEffect(() => {
    const saveAbandonment = () => {
      if (abandonmentSaved.current || items.length === 0) return;
      if (!form.name && !form.phone && !form.email) return;

      abandonmentSaved.current = true;

      const cartItems = items.map((i) => ({
        product_id: i.product.id,
        name: i.product.name,
        quantity: i.quantity,
        price: i.product.price,
      }));

      const itemsTotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

      const dbPayload: any = {
        customer_name: form.name,
        customer_email: form.email || null,
        customer_phone: form.phone || null,
        items: cartItems,
        cart_total: itemsTotal,
        shipping_cep: form.cep?.replace(/\D/g, "") || null,
      };

      // Save to abandoned_carts table
      const dbUrl = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/abandoned_carts`;
      const dbHeaders = {
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      };
      fetch(dbUrl, { method: "POST", headers: dbHeaders, body: JSON.stringify(dbPayload), keepalive: true }).catch(() => {});

      // Sync to GHL with abandonment tags (non-blocking)
      if (form.email || form.phone) {
        const ghlPayload = {
          customer_name: form.name || "Visitante",
          customer_email: form.email || "",
          customer_phone: form.phone,
          order_total: total,
          items: cartItems,
          tags: [
            "carrinho-abandonado",
            "checkout-incompleto",
            ...cartItems.map((i) => `abandonou-${i.name.toLowerCase().replace(/\s+/g, "-").slice(0, 30)}`),
          ],
        };
        const ghlUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ghl-sync`;
        fetch(ghlUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify(ghlPayload),
          keepalive: true,
        }).catch(() => {});
      }
    };

    window.addEventListener("beforeunload", saveAbandonment);
    return () => {
      window.removeEventListener("beforeunload", saveAbandonment);
    };
  }, [form.name, form.phone, form.email, items, total]);

  const { data: doctors } = useQuery({
    queryKey: ["active-doctors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctors")
        .select("id, name, specialty, city, state")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const filteredDoctors = (doctors ?? []).filter((d) => {
    const search = doctorSearch.toLowerCase();
    return (
      d.name.toLowerCase().includes(search) ||
      (d.city && d.city.toLowerCase().includes(search)) ||
      (d.state && d.state.toLowerCase().includes(search))
    );
  });

  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const freeShippingMinValue = Number(storeSettings?.free_shipping_min_value) || 499;
  const qualifiesForFreeShipping = storeSettings?.free_shipping_enabled && subtotal >= freeShippingMinValue;
  const shipping = freeShipping || qualifiesForFreeShipping ? 0 : (selectedShipping?.price ?? 0);
  const finalTotal = total + shipping;
  const pixTotal = finalTotal * 0.95;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.doctor && !selectedDoctorId) {
      toast.error("Selecione um Prescritor ou marque 'Não Sei'.");
      return;
    }

    setIsSubmitting(true);
    try {
      const orderItems = items.map((i) => ({
        product_id: i.product.id,
        name: i.product.name,
        price: i.product.price,
        quantity: i.quantity,
      }));

      // For card with installments > 3, use total with interest
      let paymentValue = form.paymentMethod === "pix" ? pixTotal : finalTotal;
      if (form.paymentMethod === "card" && installments > 3) {
        const opts = getInstallmentOptions(finalTotal);
        const selected = opts.find((o) => o.n === installments);
        if (selected) paymentValue = Number(selected.totalWithInterest.toFixed(2));
      }

      const payload: any = {
        customer_name: form.name,
        customer_email: form.email,
        customer_cpf: form.cpf,
        customer_phone: form.phone,
        billing_type: form.paymentMethod === "pix" ? "PIX" : "CREDIT_CARD",
        value: paymentValue,
        items: orderItems,
        doctor_id: selectedDoctorId === "sem-prescritor" ? null : selectedDoctorId,
        shipping_address: {
          street: form.street,
          number: form.number,
          complement: form.complement,
          neighborhood: form.neighborhood,
          city: form.city,
          state: form.state,
          cep: form.cep,
        },
        coupon_code: coupon || null,
      };

      if (form.paymentMethod === "card") {
        payload.credit_card = cardData;
        payload.credit_card_holder_info = {
          name: cardData.holderName || form.name,
          email: form.email,
          cpfCnpj: form.cpf,
          postalCode: form.cep,
          addressNumber: form.number,
          phone: form.phone,
        };
        if (installments > 1) {
          payload.installment_count = installments;
        }
      }

      const { data, error } = await supabase.functions.invoke("create-payment", {
        body: payload,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setPaymentResult(data);

      // Sync to GoHighLevel (non-blocking)
      const ghlPayload = {
        customer_name: form.name,
        customer_email: form.email,
        customer_phone: form.phone,
        order_id: data.order_id,
        order_total: form.paymentMethod === "pix" ? pixTotal : finalTotal,
        items: items.map((i) => ({ name: i.product.name, quantity: i.quantity, price: i.product.price })),
        tags: form.paymentMethod === "pix" ? ["pagou-pix"] : ["pagou-cartao"],
      };
      supabase.functions.invoke("ghl-sync", { body: ghlPayload }).catch((err) =>
        console.error("GHL sync error (non-fatal):", err)
      );

      if (form.paymentMethod === "card" && (data.status === "CONFIRMED" || data.status === "RECEIVED")) {
        toast.success("Pagamento aprovado! 🎉");
        clearCart();
        if (data.order_id) {
          navigate(`/pedido-confirmado/${data.order_id}`);
        } else {
          setStep(3);
        }
      } else if (form.paymentMethod === "pix") {
        toast.success("Cobrança Pix gerada! Escaneie o QR Code.");
        setPaymentResult(data);
        setStep(3);
      } else {
        toast.error("Pagamento não aprovado. Verifique os dados do cartão.");
      }
    } catch (err: any) {
      console.error("Payment error:", err);
      toast.error(err?.message || "Erro ao processar pagamento. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 3: Payment result
  if (step === 3 && paymentResult) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="container max-w-lg py-12">
          {paymentResult.pix ? (
            <PixPaymentResult
              encodedImage={paymentResult.pix.encodedImage}
              payload={paymentResult.pix.payload}
              expirationDate={paymentResult.pix.expirationDate}
              total={pixTotal}
              paymentId={paymentResult.payment_id}
              orderId={paymentResult.order_id}
              onConfirmed={() => clearCart()}
            />
          ) : (
            <div className="flex flex-col items-center space-y-4 rounded-lg border border-border bg-card p-6 text-center">
              <CheckCircle className="h-12 w-12 text-success" />
              <h2 className="text-xl font-bold">Pagamento Aprovado!</h2>
              <p className="text-muted-foreground">
                Seu pedido foi confirmado. Você receberá um email com os detalhes.
              </p>
              <p className="text-sm text-muted-foreground">
                Pedido: <span className="font-mono">{paymentResult.order_id?.slice(0, 8)}</span>
              </p>
              <Link to="/produtos">
                <Button>Continuar Comprando</Button>
              </Link>
            </div>
          )}
        </main>
        <Footer />
        <WhatsAppButton />
      </div>
    );
  }

  if (items.length === 0 && step !== 3) {
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

        {/* Motivational step indicator */}
        <div className="mt-6 space-y-2">
          <div className="flex items-center gap-4">
            {[1, 2].map((s) => (
              <div key={s} className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{s}</div>
            ))}
          </div>
          {items.length > 0 && (
            <p className="text-sm text-primary font-medium">
              ✨ Você está a {step === 1 ? "2 passos" : "1 passo"} de{" "}
              {items[0]?.product?.benefits?.[0]
                ? items[0].product.benefits[0].toLowerCase()
                : "melhorar sua performance"}
            </p>
          )}
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

                {/* Free shipping progress bar */}
                {storeSettings?.free_shipping_enabled && (() => {
                  const minValue = freeShippingMinValue;
                  const subtotalValue = subtotal;
                  const remaining = Math.max(0, minValue - subtotalValue);
                  const progress = Math.min(100, (subtotalValue / minValue) * 100);
                  return (
                    <div className="rounded-lg border border-success/20 bg-success/5 p-3">
                      {remaining > 0 ? (
                        <>
                          <div className="flex items-center gap-2 mb-2">
                            <Truck className="h-4 w-4 text-success flex-shrink-0" />
                            <p className="text-sm font-medium text-foreground">
                              Faltam <span className="font-bold text-success">R$ {remaining.toFixed(2).replace(".", ",")}</span> para <strong>frete grátis!</strong>
                            </p>
                          </div>
                          <Progress value={progress} className="h-2 [&>div]:bg-success" />
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-success flex-shrink-0" />
                          <p className="text-sm font-bold text-success">🎉 Parabéns! Você ganhou frete grátis!</p>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="flex gap-2">
                  <Input placeholder="Cupom de desconto" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} className="max-w-xs" />
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => applyCoupon(couponInput)}>
                    <Tag className="h-4 w-4" /> Aplicar
                  </Button>
                </div>

                <ShippingCalculator
                  cep={form.cep}
                  onCepChange={(cep) => setForm({ ...form, cep })}
                  items={items.map((i) => ({ price: i.product.price, quantity: i.quantity, weight: i.product.weight, height: i.product.height, width: i.product.width, length: i.product.length }))}
                  selectedOption={selectedShipping}
                  onSelectOption={setSelectedShipping}
                />

                <ComboUpsell />

                <CartRecommendations cartItems={items} />

                <Button className="w-full" size="lg" onClick={() => setStep(2)}>Continuar para Dados</Button>
              </div>
            )}

            {step === 2 && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="text-lg font-semibold">Dados Pessoais</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label>Nome Completo *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div><Label>CPF *</Label><Input required value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} placeholder="000.000.000-00" /></div>
                  <div><Label>Email *</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                  <div><Label>Telefone *</Label><Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(00) 00000-0000" /></div>
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

                <h2 className="text-lg font-semibold">Prescritor ou Médico Responsável</h2>
                <div className="relative">
                  <Input
                    placeholder="Buscar por nome, cidade ou estado..."
                    value={form.doctor || doctorSearch}
                    onChange={(e) => {
                      setDoctorSearch(e.target.value);
                      setForm({ ...form, doctor: "" });
                      setSelectedDoctorId(null);
                      setShowDoctorResults(true);
                    }}
                    disabled={selectedDoctorId === "sem-prescritor"}
                  />
                  {showDoctorResults && doctorSearch && (
                    <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-card shadow-lg max-h-48 overflow-y-auto">
                      {filteredDoctors.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          className="w-full px-4 py-2 text-left text-sm hover:bg-muted"
                          onClick={() => {
                            setForm({ ...form, doctor: d.name });
                            setSelectedDoctorId(d.id);
                            setDoctorSearch("");
                            setShowDoctorResults(false);
                          }}
                        >
                          <span className="font-medium">{d.name}</span>
                          {d.specialty && <span className="text-muted-foreground"> — {d.specialty}</span>}
                          {(d.city || d.state) && (
                            <span className="text-muted-foreground text-xs ml-2">
                              ({[d.city, d.state].filter(Boolean).join("/")})
                            </span>
                          )}
                        </button>
                      ))}
                      {filteredDoctors.length === 0 && (
                        <p className="px-4 py-3 text-sm text-muted-foreground">
                          Nenhum prescritor encontrado. Use "Não Sei" abaixo.
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <Button
                    type="button"
                    variant={selectedDoctorId === "sem-prescritor" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (selectedDoctorId === "sem-prescritor") {
                        setSelectedDoctorId(null);
                        setForm({ ...form, doctor: "" });
                        setDoctorSearch("");
                      } else {
                        setSelectedDoctorId("sem-prescritor");
                        setForm({ ...form, doctor: "Sem Prescritor" });
                        setDoctorSearch("");
                        setShowDoctorResults(false);
                      }
                    }}
                  >
                    {selectedDoctorId === "sem-prescritor" ? "✓ Sem Prescritor" : "Não Sei / Sem Prescritor"}
                  </Button>
                  <span className="text-xs text-muted-foreground">Selecione se não possui prescritor</span>
                </div>

                <h2 className="text-lg font-semibold">Pagamento</h2>
                <div className="flex gap-3">
                  <button
                    type="button"
                    className={`flex-1 rounded-lg border-2 p-4 text-center text-sm font-medium transition ${form.paymentMethod === "pix" ? "border-primary bg-primary/5" : "border-border"}`}
                    onClick={() => setForm({ ...form, paymentMethod: "pix" })}
                  >
                    💰 Pix<br /><span className="text-xs text-success">5% de desconto</span>
                  </button>
                  <button
                    type="button"
                    className={`flex-1 rounded-lg border-2 p-4 text-center text-sm font-medium transition ${form.paymentMethod === "card" ? "border-primary bg-primary/5" : "border-border"}`}
                    onClick={() => setForm({ ...form, paymentMethod: "card" })}
                  >
                    <CreditCard className="mx-auto mb-1 h-5 w-5" />Cartão<br /><span className="text-xs text-muted-foreground">até 3x sem juros</span>
                  </button>
                </div>

                {form.paymentMethod === "card" && (
                  <CreditCardForm
                    card={cardData}
                    onChange={setCardData}
                    installments={installments}
                    onInstallmentsChange={setInstallments}
                    total={finalTotal}
                  />
                )}

                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>Voltar</Button>
                  <Button type="submit" className="flex-1" size="lg" disabled={isSubmitting}>
                    {isSubmitting ? "Processando pagamento..." : form.paymentMethod === "pix" ? `Gerar Pix — R$ ${pixTotal.toFixed(2).replace(".", ",")}` : `Pagar R$ ${finalTotal.toFixed(2).replace(".", ",")}`}
                  </Button>
                </div>
              </form>
            )}
          </div>

          {step <= 2 && (
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
                    <span className={shipping === 0 ? "font-semibold text-success" : ""}>
                      {shipping === 0 ? "Grátis" : `R$ ${shipping.toFixed(2).replace(".", ",")}`}
                    </span>
                  </div>
                  {selectedShipping && (
                    <p className="text-xs text-muted-foreground">
                      {selectedShipping.company} — {selectedShipping.name} ({selectedShipping.delivery_time} dias)
                    </p>
                  )}
                </div>
                <div className="border-t border-border pt-2">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">R$ {finalTotal.toFixed(2).replace(".", ",")}</span>
                  </div>
                  {form.paymentMethod === "pix" && (
                    <p className="text-xs text-success">No Pix: R$ {pixTotal.toFixed(2).replace(".", ",")}</p>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <CheckoutUrgency
                  reviewsCount={items.reduce((sum, i) => sum + (i.product.reviews || 0), 0)}
                  firstBenefit={items[0]?.product?.benefits?.[0]}
                />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Fixed mobile bottom bar */}
      {step <= 2 && (
        <div className="fixed bottom-0 inset-x-0 z-40 flex gap-2 border-t border-border bg-card p-3 shadow-lg md:hidden">
          {step === 1 ? (
            <Button className="flex-1 text-sm" size="lg" onClick={() => setStep(2)}>
              Finalizar Pedido →
            </Button>
          ) : (
            <>
              <Button variant="outline" size="lg" onClick={() => setStep(1)} className="text-sm">
                Voltar
              </Button>
              <Button
                className="flex-1 gap-2 bg-success hover:bg-success/90 text-success-foreground text-sm"
                size="lg"
                disabled={isSubmitting}
                onClick={() => {
                  const formEl = document.querySelector("form");
                  if (formEl) formEl.requestSubmit();
                }}
              >
                {form.paymentMethod === "pix" ? `💰 Pagar via PIX` : `Finalizar Pedido`}
              </Button>
            </>
          )}
        </div>
      )}
      {step <= 2 && <div className="h-20 md:hidden" />}

      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default CheckoutPage;
