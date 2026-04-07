import { useState, useEffect, useRef, useCallback } from "react";

const formatCPF = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};

const formatPhone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Trash2, Minus, Plus, ArrowLeft, CreditCard, CheckCircle, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/hooks/useCart";
import { Shield, ShieldCheck } from "lucide-react";
import TrustMicroTexts from "@/components/checkout/TrustMicroTexts";
import WhatsAppButton from "@/components/WhatsAppButton";
import { ShippingOption } from "@/components/checkout/ShippingCalculator";
import { useAutoShipping } from "@/hooks/useAutoShipping";
import CreditCardForm, { CreditCardData, getInstallmentOptions } from "@/components/checkout/CreditCardForm";
import PixPaymentResult from "@/components/checkout/PixPaymentResult";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSavedCustomer } from "@/hooks/useSavedCustomer";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useQuery } from "@tanstack/react-query";
import { getActiveRef } from "@/pages/LinkRedirectPage";

interface PaymentResult {
  payment_id: string;
  status: string;
  invoice_url: string;
  pix?: { encodedImage: string; payload: string; expirationDate?: string } | null;
  order_id?: string;
}

const CheckoutPageV3 = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { savedCustomer, saveCustomer } = useSavedCustomer();
  const { items, updateQuantity, removeItem, total, discount, coupon, applyCoupon, clearCart, freeShipping, comboFreeShipping, comboDiscount, comboProductIds, comboQuantity, setComboQuantity, removeCombo, duplicateCombo } = useCart();
  const { data: storeSettings } = useStoreSettings();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { shippingOptions, shippingLoading, selectedShipping, setSelectedShipping, calculateShipping } = useAutoShipping();
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [cardData, setCardData] = useState<CreditCardData>({ holderName: "", number: "", expiryMonth: "", expiryYear: "", ccv: "" });
  const [installments, setInstallments] = useState(1);
  const [cepLoading, setCepLoading] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [doctorSearch, setDoctorSearch] = useState("");
  const [showDoctorResults, setShowDoctorResults] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", cpf: "", email: "", phone: "",
    cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "",
    doctor: "", paymentMethod: "pix" as "pix" | "card" | "boleto",
  });
  const abandonmentSaved = useRef(false);

  // Auto-fill from saved customer data
  useEffect(() => {
    if (savedCustomer) {
      setForm((prev) => ({
        ...prev,
        name: savedCustomer.name || prev.name,
        cpf: savedCustomer.cpf || prev.cpf,
        email: savedCustomer.email || prev.email,
        phone: savedCustomer.phone || prev.phone,
        cep: savedCustomer.cep || prev.cep,
        street: savedCustomer.street || prev.street,
        number: savedCustomer.number || prev.number,
        complement: savedCustomer.complement || prev.complement,
        neighborhood: savedCustomer.neighborhood || prev.neighborhood,
        city: savedCustomer.city || prev.city,
        state: savedCustomer.state || prev.state,
      }));
    }
  }, [savedCustomer]);

  // Auto-apply coupon from URL param (?cupom=XXX)
  const couponAppliedRef = useRef(false);
  useEffect(() => {
    const cupomParam = searchParams.get("cupom") || searchParams.get("Cupom") || searchParams.get("CUPOM");
    if (cupomParam && items.length > 0 && !coupon && !couponAppliedRef.current) {
      couponAppliedRef.current = true;
      setCouponInput(cupomParam.toUpperCase());
      applyCoupon(cupomParam);
    }
  }, [searchParams, items, coupon, applyCoupon]);

  // Auto-fill doctor from smart link ref
  useEffect(() => {
    const ref = getActiveRef();
    if (ref?.doctorId && ref?.doctorName && !selectedDoctorId) {
      setSelectedDoctorId(ref.doctorId);
      setForm((prev) => ({ ...prev, doctor: ref.doctorName! }));
    }
  }, []);

  const { data: doctors } = useQuery({
    queryKey: ["active-doctors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("doctors_public" as any).select("id, name, specialty, city, state").eq("active", true).order("name");
      if (error) throw error;
      return data as unknown as { id: string; name: string; specialty: string | null; city: string | null; state: string | null }[];
    },
  });

  const filteredDoctors = (doctors ?? []).filter((d) => {
    const search = doctorSearch.toLowerCase();
    return d.name.toLowerCase().includes(search) || (d.city && d.city.toLowerCase().includes(search)) || (d.state && d.state.toLowerCase().includes(search));
  });

  // Resolve doctor_id: link > manual > coupon
  const resolveDoctorId = useCallback(() => {
    const ref = getActiveRef();
    if (ref?.doctorId) return ref.doctorId;
    if (selectedDoctorId && selectedDoctorId !== "sem-prescritor") return selectedDoctorId;
    return null;
  }, [selectedDoctorId]);

  const fetchAddress = useCallback(async (cep: string) => {
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm((prev) => ({
          ...prev,
          street: data.logradouro || prev.street,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.localidade || prev.city,
          state: data.uf || prev.state,
        }));
      }
    } catch {}
    setCepLoading(false);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  // Abandonment tracking
  const saveAbandonment = useRef(() => {});
  useEffect(() => {
    saveAbandonment.current = () => {
      if (abandonmentSaved.current || items.length === 0) return;
      if (!form.name && !form.phone && !form.email) return;
      abandonmentSaved.current = true;
      const cartItems = items.map((i) => ({ product_id: i.product.id, name: i.product.name, quantity: i.quantity, price: i.product.price }));
      const itemsTotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
      const dbPayload: any = { customer_name: form.name || form.email || form.phone || "Visitante", customer_email: form.email || null, customer_phone: form.phone || null, items: cartItems, cart_total: itemsTotal, shipping_cep: form.cep?.replace(/\D/g, "") || null };
      const dbUrl = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/abandoned_carts`;
      const dbHeaders = { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json", Prefer: "return=minimal" };
      fetch(dbUrl, { method: "POST", headers: dbHeaders, body: JSON.stringify(dbPayload), keepalive: true }).catch(() => {});
    };
  }, [form.name, form.phone, form.email, form.cep, items, total]);

  useEffect(() => {
    const handleBeforeUnload = () => saveAbandonment.current();
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => { window.removeEventListener("beforeunload", handleBeforeUnload); saveAbandonment.current(); };
  }, []);

  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const freeShippingMinValue = Number(storeSettings?.free_shipping_min_value) || 499;
  const finalValueForShipping = Math.max(0, subtotal - discount - comboDiscount);
  const qualifiesForFreeShipping = storeSettings?.free_shipping_enabled && finalValueForShipping >= freeShippingMinValue;
  const shipping = freeShipping || comboFreeShipping || qualifiesForFreeShipping ? 0 : (selectedShipping?.price ?? 0);
  const finalTotal = total + shipping;
  const pixTotal = finalTotal * 0.95;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const paymentTotal = form.paymentMethod === "pix" ? pixTotal : finalTotal;
    if (paymentTotal < 5) { toast.error("O valor mínimo para pagamento é R$ 5,00."); return; }
    if (!form.name.trim()) { toast.error("Preencha seu nome."); return; }
    if (!form.email.trim() || !form.email.includes("@")) { toast.error("Preencha um e-mail válido."); return; }
    if (form.cpf.replace(/\D/g, "").length !== 11) { toast.error("CPF inválido. Deve ter 11 dígitos."); return; }
    if (!form.phone.trim()) { toast.error("Preencha seu telefone."); return; }
    const prescriberRequired = (storeSettings as any)?.checkout_prescriber_required !== false;
    if (prescriberRequired && !form.doctor && !selectedDoctorId) {
      toast.error("Selecione um Prescritor ou marque 'Não Sei'.");
      return;
    }
    // Require shipping selection unless free shipping
    const hasFreeShipping = freeShipping || comboFreeShipping || qualifiesForFreeShipping;
    if (!hasFreeShipping && !selectedShipping) { toast.error("Selecione uma opção de frete antes de finalizar."); return; }
    setIsSubmitting(true);
    try {
      const orderItems = items.map((i) => ({ product_id: i.product.id, name: i.product.name, price: i.product.price, quantity: i.quantity }));
      let paymentValue = form.paymentMethod === "pix" ? pixTotal : finalTotal;
      if (form.paymentMethod === "card" && installments > (storeSettings?.max_installments ?? 3)) {
        const opts = getInstallmentOptions(finalTotal, storeSettings?.max_installments ?? 3, (storeSettings as any)?.max_total_installments ?? 12);
        const selected = opts.find((o) => o.n === installments);
        if (selected) paymentValue = Number(selected.totalWithInterest.toFixed(2));
      }
      const payload: any = {
        customer_name: form.name, customer_email: form.email, customer_cpf: form.cpf, customer_phone: form.phone,
        billing_type: form.paymentMethod === "pix" ? "PIX" : form.paymentMethod === "boleto" ? "BOLETO" : "CREDIT_CARD",
        value: paymentValue, items: orderItems, doctor_id: resolveDoctorId(),
        shipping_address: { street: form.street, number: form.number, complement: form.complement, neighborhood: form.neighborhood, city: form.city, state: form.state, cep: form.cep },
        coupon_code: coupon || null,
      };
      if (form.paymentMethod === "card") {
        payload.credit_card = cardData;
        payload.credit_card_holder_info = { name: cardData.holderName || form.name, email: form.email, cpfCnpj: form.cpf, postalCode: form.cep, addressNumber: form.number, phone: form.phone };
        if (installments > 1) payload.installment_count = installments;
      }
      const { data, error } = await supabase.functions.invoke("create-payment", { body: payload });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPaymentResult(data);

      // Save customer data for One-Click Buy
      saveCustomer({
        name: form.name, cpf: form.cpf, email: form.email, phone: form.phone,
        cep: form.cep, street: form.street, number: form.number, complement: form.complement,
        neighborhood: form.neighborhood, city: form.city, state: form.state,
      });

      // GHL sync
      supabase.functions.invoke("ghl-sync", { body: { customer_name: form.name, customer_email: form.email, customer_phone: form.phone, order_id: data.order_id, order_total: paymentValue, items: orderItems, tags: [form.paymentMethod === "pix" ? "pagou-pix" : "pagou-cartao"] } }).catch(() => {});
      // Link attribution
      const ref = getActiveRef();
      if (ref && data.order_id) {
        supabase.from("link_conversions").insert({ short_link_id: ref.linkId, order_id: data.order_id, order_total: paymentValue }).then(() => {});
        supabase.rpc("increment_link_conversions", { link_id: ref.linkId }).then(() => {});
        // GA4 purchase attributed
        if (typeof window !== "undefined" && (window as any).gtag) {
          (window as any).gtag("event", "purchase_attributed", {
            link_code: ref.code,
            link_id: ref.linkId,
            order_id: data.order_id,
            order_total: paymentValue,
          });
        }
      }

      if (form.paymentMethod === "card" && (data.status === "CONFIRMED" || data.status === "RECEIVED")) {
        toast.success("Pagamento aprovado! 🎉"); clearCart();
        if (data.order_id) navigate(`/pedido-confirmado/${data.order_id}`);
      } else if (form.paymentMethod === "pix") {
        toast.success("Cobrança Pix gerada! Escaneie o QR Code.");
      } else if (form.paymentMethod === "boleto") {
        toast.success("Boleto gerado!"); clearCart();
        if (data.invoice_url) window.open(data.invoice_url, "_blank");
        if (data.order_id) navigate(`/pedido-confirmado/${data.order_id}`);
      } else {
        toast.error("Pagamento não aprovado. Verifique os dados do cartão.");
      }
    } catch (err: any) {
      console.error("Payment error:", err);
      toast.error(err?.message || "Erro ao processar pagamento.");
    } finally { setIsSubmitting(false); }
  };

  // Payment result screen
  if (paymentResult?.pix) {
    return (
      <div className="min-h-screen bg-background">
        
        <main className="container max-w-lg py-12">
          <PixPaymentResult encodedImage={paymentResult.pix.encodedImage} payload={paymentResult.pix.payload} expirationDate={paymentResult.pix.expirationDate} total={pixTotal} paymentId={paymentResult.payment_id} orderId={paymentResult.order_id} onConfirmed={() => clearCart()} />
        </main>
        
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-bold">Seu carrinho está vazio</h1>
          <p className="mt-2 text-muted-foreground">Adicione produtos para continuar</p>
          <Link to="/produtos"><Button className="mt-6">Ver Produtos</Button></Link>
        </div>
        
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden pb-6">
      
      <main className="container max-w-3xl px-3 sm:px-4 py-4 sm:py-8">
        <Link to="/produtos" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>

        <h1 className="text-xl font-bold text-foreground mb-6">Finalizar Compra</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Products */}
          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Produtos</h2>
            <div className="divide-y divide-border">
              {/* Combo group */}
              {comboProductIds.length > 0 && items.some((i) => comboProductIds.includes(i.product.id)) && (
                <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-3 mb-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-primary uppercase tracking-wide">🔥 Combo</span>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => setComboQuantity(comboQuantity - 1)} disabled={comboQuantity <= 1} className="rounded border border-border p-1 hover:bg-muted disabled:opacity-30"><Minus className="h-3.5 w-3.5" /></button>
                        <span className="w-6 text-center text-sm font-semibold">{comboQuantity}</span>
                        <button type="button" onClick={() => setComboQuantity(comboQuantity + 1)} className="rounded border border-border p-1 hover:bg-muted"><Plus className="h-3.5 w-3.5" /></button>
                      </div>
                      <button type="button" onClick={removeCombo} className="rounded p-1.5 text-destructive hover:bg-destructive/10" title="Remover Combo"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                  {items.filter((i) => comboProductIds.includes(i.product.id)).map((item) => (
                    <div key={item.product.id} className="flex items-center gap-3 py-2 border-t border-primary/10 first:border-t-0">
                      <img src={item.product.image} alt={item.product.name} className="h-12 w-12 rounded object-contain bg-muted/30" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.product.name}</p>
                        <p className="text-sm font-bold text-primary">R$ {item.product.price.toFixed(2).replace(".", ",")}</p>
                      </div>
                      <span className="text-sm text-muted-foreground">×{item.quantity}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Non-combo items */}
              {items.filter((i) => !comboProductIds.includes(i.product.id)).map((item) => (
                <div key={item.product.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <img src={item.product.image} alt={item.product.name} className="h-12 w-12 rounded object-contain bg-muted/30" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.product.name}</p>
                    <p className="text-sm font-bold text-primary">R$ {item.product.price.toFixed(2).replace(".", ",")}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="rounded p-1 hover:bg-muted"><Minus className="h-3.5 w-3.5" /></button>
                    <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                    <button type="button" onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="rounded p-1 hover:bg-muted"><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                  <button type="button" onClick={() => removeItem(item.product.id)} className="rounded p-1 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
            {/* Coupon */}
            <div className="mt-3 pt-3 border-t border-border flex gap-2">
              <Input placeholder="Cupom" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} className="h-9 text-sm" />
              <Button type="button" variant="outline" size="sm" onClick={() => applyCoupon(couponInput)}>{coupon ? "Reaplicar" : "Aplicar"}</Button>
            </div>
          </section>

          {/* Customer data */}
          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Seus Dados</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label className="text-xs">Nome Completo *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-9 text-sm" /></div>
              <div><Label className="text-xs">CPF *</Label><Input required value={form.cpf} onChange={(e) => setForm({ ...form, cpf: formatCPF(e.target.value) })} placeholder="000.000.000-00" inputMode="numeric" className="h-9 text-sm" /></div>
              <div><Label className="text-xs">Email *</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-9 text-sm" /></div>
              <div><Label className="text-xs">Telefone *</Label><Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })} placeholder="(00) 00000-0000" inputMode="tel" className="h-9 text-sm" /></div>
            </div>
            {/* Prescriber field */}
            {(storeSettings as any)?.checkout_prescriber_required !== false && (
              <div className="mt-3 pt-3 border-t border-border">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Prescritor / Médico</Label>
                <div className="relative">
                  <Input
                    placeholder="Buscar por nome, cidade ou estado..."
                    value={form.doctor || doctorSearch}
                    onChange={(e) => { setDoctorSearch(e.target.value); setForm({ ...form, doctor: "" }); setSelectedDoctorId(null); setShowDoctorResults(true); }}
                    disabled={selectedDoctorId === "sem-prescritor"}
                    className="h-9 text-sm"
                  />
                  {showDoctorResults && doctorSearch && (
                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-card shadow-lg max-h-48 overflow-y-auto">
                      {filteredDoctors.map((d) => (
                        <button key={d.id} type="button" className="w-full px-4 py-2 text-left text-sm hover:bg-muted"
                          onClick={() => { setForm({ ...form, doctor: d.name }); setSelectedDoctorId(d.id); setDoctorSearch(""); setShowDoctorResults(false); }}>
                          <span className="font-medium">{d.name}</span>
                          {d.specialty && <span className="text-muted-foreground"> — {d.specialty}</span>}
                          {d.city && <span className="text-muted-foreground text-xs"> ({d.city}/{d.state})</span>}
                        </button>
                      ))}
                      {filteredDoctors.length === 0 && <p className="px-4 py-3 text-sm text-muted-foreground">Nenhum prescritor encontrado.</p>}
                    </div>
                  )}
                </div>
                <Button type="button" variant={selectedDoctorId === "sem-prescritor" ? "default" : "outline"} size="sm" className="mt-2"
                  onClick={() => {
                    if (selectedDoctorId === "sem-prescritor") { setSelectedDoctorId(null); setForm({ ...form, doctor: "" }); setDoctorSearch(""); }
                    else { setSelectedDoctorId("sem-prescritor"); setForm({ ...form, doctor: "Não sei meu prescritor" }); setDoctorSearch(""); setShowDoctorResults(false); }
                  }}>
                  {selectedDoctorId === "sem-prescritor" ? "✓ Marcado: Não Sei" : "Não Sei"}
                </Button>
              </div>
            )}
          </section>

          {/* Address + Shipping */}
          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Endereço de Entrega</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">CEP *</Label>
                <div className="relative">
                  <Input required value={form.cep} placeholder="00000-000" inputMode="numeric" className="h-9 text-sm" onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "").slice(0, 8);
                    const formatted = raw.length > 5 ? `${raw.slice(0, 5)}-${raw.slice(5)}` : raw;
                    setForm({ ...form, cep: formatted });
                    if (raw.length === 8) {
                      fetchAddress(raw);
                      calculateShipping(raw, items.map((i) => ({ price: i.product.price, quantity: i.quantity, weight: i.product.weight, height: i.product.height, width: i.product.width, length: i.product.length })));
                    }
                  }} />
                  {cepLoading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground animate-pulse">Buscando...</span>}
                </div>
              </div>
              <div><Label className="text-xs">Rua *</Label><Input required value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} className="h-9 text-sm" /></div>
              <div><Label className="text-xs">Número *</Label><Input required value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} className="h-9 text-sm" /></div>
              <div><Label className="text-xs">Complemento</Label><Input value={form.complement} onChange={(e) => setForm({ ...form, complement: e.target.value })} className="h-9 text-sm" /></div>
              <div><Label className="text-xs">Bairro *</Label><Input required value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} className="h-9 text-sm" /></div>
              <div><Label className="text-xs">Cidade *</Label><Input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} readOnly={!!form.city} className={`h-9 text-sm ${form.city ? "bg-muted" : ""}`} /></div>
              <div><Label className="text-xs">Estado *</Label><Input required value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} readOnly={!!form.state} className={`h-9 text-sm ${form.state ? "bg-muted" : ""}`} /></div>
            </div>
            {/* Auto Shipping Options */}
            {shippingLoading && (
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
                <Loader2 className="h-4 w-4 animate-spin" /> Calculando frete...
              </div>
            )}
            {!shippingLoading && shippingOptions.length > 0 && (
              <div className="mt-3 space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Opções de Envio</Label>
                <span className="block text-xs font-medium text-primary">📦 Postagem de Envio em até 24h</span>
                <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1 -mr-1">
                  {shippingOptions.map((opt) => (
                    <button key={opt.id} type="button"
                      className={`flex w-full items-center gap-3 rounded-lg border-2 p-2.5 text-left transition ${selectedShipping?.id === opt.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                      onClick={() => setSelectedShipping(opt)}>
                      {opt.logo && <img src={opt.logo} alt={opt.company} className="h-7 w-7 rounded object-contain shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{opt.company} — {opt.name}</p>
                        <p className="text-xs text-muted-foreground">até {opt.delivery_time} dias úteis</p>
                      </div>
                      <span className="text-sm font-bold text-primary shrink-0">{opt.price === 0 ? "Grátis" : `R$ ${opt.price.toFixed(2).replace(".", ",")}`}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Payment */}
          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Pagamento</h2>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button type="button" className={`rounded-lg border-2 p-3 text-center text-sm font-medium transition ${form.paymentMethod === "pix" ? "border-primary bg-primary/5" : "border-border"}`} onClick={() => setForm({ ...form, paymentMethod: "pix" })}>
                💰 Pix<br /><span className="text-xs text-success">5% off</span>
              </button>
              <button type="button" className={`rounded-lg border-2 p-3 text-center text-sm font-medium transition ${form.paymentMethod === "card" ? "border-primary bg-primary/5" : "border-border"}`} onClick={() => setForm({ ...form, paymentMethod: "card" })}>
                <CreditCard className="mx-auto mb-1 h-4 w-4" />Cartão
              </button>
              {(storeSettings as any)?.checkout_boleto_enabled && (
                <button type="button" className={`col-span-2 rounded-lg border-2 p-3 text-center text-sm font-medium transition ${form.paymentMethod === "boleto" ? "border-primary bg-primary/5" : "border-border"}`} onClick={() => setForm({ ...form, paymentMethod: "boleto" as any })}>
                  🏦 Boleto
                </button>
              )}
            </div>
            {form.paymentMethod === "card" && (
              <CreditCardForm card={cardData} onChange={setCardData} installments={installments} onInstallmentsChange={setInstallments} total={finalTotal} interestFreeLimit={storeSettings?.max_installments ?? 3} maxTotalInstallments={(storeSettings as any)?.max_total_installments ?? 12} />
            )}
          </section>

          {/* Summary */}
          <section className="rounded-lg border border-border bg-card p-4">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>R$ {subtotal.toFixed(2).replace(".", ",")}</span></div>
              {discount > 0 && <div className="flex justify-between text-success"><span>Desconto{coupon ? ` (${coupon})` : ""}</span><span>-R$ {discount.toFixed(2).replace(".", ",")}</span></div>}
              {comboDiscount > 0 && !coupon && <div className="flex justify-between text-success"><span>Desconto Combo</span><span>-R$ {comboDiscount.toFixed(2).replace(".", ",")}</span></div>}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frete</span>
                <span className={shipping === 0 && (qualifiesForFreeShipping || freeShipping || comboFreeShipping || selectedShipping) ? "font-semibold text-success" : ""}>
                  {qualifiesForFreeShipping || freeShipping || comboFreeShipping ? "Grátis" : selectedShipping ? (shipping === 0 ? "Grátis" : `R$ ${shipping.toFixed(2).replace(".", ",")}`) : "—"}
                </span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between text-base font-bold">
                <span>Total</span>
                <span className="text-primary">R$ {(form.paymentMethod === "pix" ? pixTotal : finalTotal).toFixed(2).replace(".", ",")}</span>
              </div>
              {form.paymentMethod === "pix" && (
                <p className="text-xs text-success text-center">Economize 5% pagando com Pix!</p>
              )}
            </div>
          </section>

          {/* Submit */}
          <Button type="submit" className="w-full bg-success hover:bg-success/90 text-success-foreground gap-2 text-xs sm:text-sm" size="lg" disabled={isSubmitting}>
            <Lock className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {isSubmitting ? "Processando..." : form.paymentMethod === "pix" ? `Pix — R$ ${pixTotal.toFixed(2).replace(".", ",")}` : form.paymentMethod === "boleto" ? `Boleto — R$ ${finalTotal.toFixed(2).replace(".", ",")}` : `Pagar R$ ${finalTotal.toFixed(2).replace(".", ",")}`}
            </span>
          </Button>

          <TrustMicroTexts />
        </form>
      </main>
      
      {!storeSettings?.hide_chat_on_checkout && <WhatsAppButton />}
    </div>
  );
};

export default CheckoutPageV3;
