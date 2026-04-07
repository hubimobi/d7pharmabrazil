import { useState, useEffect, useRef, useCallback } from "react";

const formatCPF = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};
import TrustMicroTexts from "@/components/checkout/TrustMicroTexts";
import { useSavedCustomer } from "@/hooks/useSavedCustomer";
const formatPhone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Trash2, Minus, Plus, Tag, ArrowLeft, CreditCard, CheckCircle, Truck, Shield, Clock, Users, Eye, Package, Star, ChevronRight, Lock, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/hooks/useCart";
import WhatsAppButton from "@/components/WhatsAppButton";
import { ShippingOption } from "@/components/checkout/ShippingCalculator";
import { useAutoShipping } from "@/hooks/useAutoShipping";
import CreditCardForm, { CreditCardData, getInstallmentOptions } from "@/components/checkout/CreditCardForm";
import PixPaymentResult from "@/components/checkout/PixPaymentResult";
import { toast } from "sonner";
import CartRecommendations from "@/components/checkout/CartRecommendations";
import CheckoutUrgency from "@/components/checkout/CheckoutUrgency";
import ComboUpsell from "@/components/checkout/ComboUpsell";
import CartItemTestimonial from "@/components/checkout/CartItemTestimonial";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { getActiveRef } from "@/pages/LinkRedirectPage";
import { motion, AnimatePresence } from "framer-motion";

interface PaymentResult {
  payment_id: string;
  status: string;
  invoice_url: string;
  pix?: { encodedImage: string; payload: string; expirationDate?: string } | null;
  order_id?: string;
}

const STEPS = [
  { num: 1, label: "Identificação" },
  { num: 2, label: "Entrega" },
  { num: 3, label: "Pagamento" },
  { num: 4, label: "Confirmação" },
];

const CheckoutPageV2 = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isOneClick = searchParams.get("oneclick") === "1";
  const { savedCustomer, saveCustomer } = useSavedCustomer();
  const { items, updateQuantity, removeItem, total, discount, coupon, applyCoupon, clearCart, freeShipping, comboFreeShipping, comboDiscount, comboProductIds, comboQuantity, setComboQuantity, removeCombo, duplicateCombo } = useCart();
  const { data: storeSettings } = useStoreSettings();
  const [step, setStep] = useState(1);
  const [couponInput, setCouponInput] = useState("");
  const [doctorSearch, setDoctorSearch] = useState("");
  const [showDoctorResults, setShowDoctorResults] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { shippingOptions, shippingLoading, selectedShipping, setSelectedShipping, calculateShipping } = useAutoShipping();
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [cardData, setCardData] = useState<CreditCardData>({
    holderName: "", number: "", expiryMonth: "", expiryYear: "", ccv: "",
  });
  const [installments, setInstallments] = useState(1);
  const [form, setForm] = useState({
    name: "", cpf: "", email: "", phone: "",
    cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "",
    doctor: "", paymentMethod: "pix" as "pix" | "card" | "boleto",
  });
  const abandonmentSaved = useRef(false);
  const [cepLoading, setCepLoading] = useState(false);

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
      if (isOneClick) goToStep(3);
    }
  }, [savedCustomer, isOneClick]);

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

  // Timer
  const [timerSeconds, setTimerSeconds] = useState(14 * 60 + 32);
  useEffect(() => {
    const interval = setInterval(() => setTimerSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(interval);
  }, []);
  const timerMin = String(Math.floor(timerSeconds / 60)).padStart(2, "0");
  const timerSec = String(timerSeconds % 60).padStart(2, "0");

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
    } catch { /* ignore */ }
    setCepLoading(false);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  // Abandonment tracking (same as original)
  const saveAbandonment = useRef(() => {});
  useEffect(() => {
    saveAbandonment.current = () => {
      if (abandonmentSaved.current || items.length === 0) return;
      if (!form.name && !form.phone && !form.email) return;
      abandonmentSaved.current = true;
      const cartItems = items.map((i) => ({ product_id: i.product.id, name: i.product.name, quantity: i.quantity, price: i.product.price }));
      const itemsTotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
      const dbPayload: any = {
        customer_name: form.name || form.email || form.phone || "Visitante",
        customer_email: form.email || null,
        customer_phone: form.phone || null,
        items: cartItems, cart_total: itemsTotal,
        shipping_cep: form.cep?.replace(/\D/g, "") || null,
      };
      const dbUrl = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/abandoned_carts`;
      const dbHeaders = { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json", Prefer: "return=minimal" };
      fetch(dbUrl, { method: "POST", headers: dbHeaders, body: JSON.stringify(dbPayload), keepalive: true }).catch(() => {});
      if (form.email || form.phone) {
        const ghlPayload = {
          customer_name: form.name || "Visitante", customer_email: form.email || "", customer_phone: form.phone,
          order_total: total, items: cartItems,
          tags: ["carrinho-abandonado", "checkout-incompleto", ...cartItems.map((i) => `abandonou-${i.name.toLowerCase().replace(/\s+/g, "-").slice(0, 30)}`)],
        };
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ghl-sync`, {
          method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: JSON.stringify(ghlPayload), keepalive: true,
        }).catch(() => {});
      }
    };
  }, [form.name, form.phone, form.email, form.cep, items, total]);

  useEffect(() => {
    const handleBeforeUnload = () => saveAbandonment.current();
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => { window.removeEventListener("beforeunload", handleBeforeUnload); saveAbandonment.current(); };
  }, []);

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

  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const freeShippingMinValue = Number(storeSettings?.free_shipping_min_value) || 499;
  const finalValueForShipping = Math.max(0, subtotal - discount - comboDiscount);
  const qualifiesForFreeShipping = storeSettings?.free_shipping_enabled && finalValueForShipping >= freeShippingMinValue;
  const shipping = freeShipping || comboFreeShipping || qualifiesForFreeShipping ? 0 : (selectedShipping?.price ?? 0);
  const finalTotal = total + shipping;
  const pixTotal = finalTotal * 0.95;

  const goToStep = (n: number) => {
    setStep(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const validateStep1 = () => {
    if (!form.name.trim()) { toast.error("Preencha seu nome."); return false; }
    if (!form.email.trim() || !form.email.includes("@")) { toast.error("Preencha um e-mail válido."); return false; }
    if (!form.phone.trim()) { toast.error("Preencha seu telefone."); return false; }
    if (form.cpf.replace(/\D/g, "").length !== 11) { toast.error("CPF inválido. Deve ter 11 dígitos."); return false; }
    return true;
  };

  const validateStep2 = () => {
    if (!form.cep || form.cep.replace(/\D/g, "").length !== 8) { toast.error("Preencha o CEP."); return false; }
    if (!form.street.trim()) { toast.error("Preencha a rua."); return false; }
    if (!form.number.trim()) { toast.error("Preencha o número."); return false; }
    if (!form.neighborhood.trim()) { toast.error("Preencha o bairro."); return false; }
    if (!form.city.trim()) { toast.error("Preencha a cidade."); return false; }
    const prescriberRequired = (storeSettings as any)?.checkout_prescriber_required !== false;
    if (prescriberRequired && !form.doctor && !selectedDoctorId) { toast.error("Selecione um Prescritor ou marque 'Não Sei'."); return false; }
    // Require shipping selection unless free shipping
    const hasFreeShipping = freeShipping || comboFreeShipping || qualifiesForFreeShipping;
    if (!hasFreeShipping && !selectedShipping) { toast.error("Selecione uma opção de frete."); return false; }
    return true;
  };

  const handleSubmit = async () => {
    const paymentTotal = form.paymentMethod === "pix" ? pixTotal : finalTotal;
    if (paymentTotal < 5) { toast.error("O valor mínimo para pagamento é R$ 5,00."); return; }
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
        value: paymentValue, items: orderItems,
        doctor_id: selectedDoctorId === "sem-prescritor" ? null : selectedDoctorId,
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
      supabase.functions.invoke("ghl-sync", {
        body: { customer_name: form.name, customer_email: form.email, customer_phone: form.phone, order_id: data.order_id, order_total: form.paymentMethod === "pix" ? pixTotal : finalTotal, items: items.map((i) => ({ name: i.product.name, quantity: i.quantity, price: i.product.price })), tags: form.paymentMethod === "pix" ? ["pagou-pix"] : ["pagou-cartao"] },
      }).catch(() => {});
      // Link attribution
      const ref = getActiveRef();
      if (ref && data.order_id) {
        supabase.from("link_conversions").insert({ short_link_id: ref.linkId, order_id: data.order_id, order_total: form.paymentMethod === "pix" ? pixTotal : finalTotal }).then(() => {});
        supabase.rpc("increment_link_conversions", { link_id: ref.linkId }).then(() => {});
      }
      if (form.paymentMethod === "card" && (data.status === "CONFIRMED" || data.status === "RECEIVED")) {
        toast.success("Pagamento aprovado! 🎉"); clearCart();
        if (data.order_id) navigate(`/pedido-confirmado/${data.order_id}`);
        else goToStep(5);
      } else if (form.paymentMethod === "pix") {
        toast.success("Cobrança Pix gerada! Escaneie o QR Code.");
        goToStep(5);
      } else if (form.paymentMethod === "boleto") {
        toast.success("Boleto gerado com sucesso!"); clearCart();
        if (data.invoice_url) window.open(data.invoice_url, "_blank");
        if (data.order_id) navigate(`/pedido-confirmado/${data.order_id}`);
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

  // Step 5: Payment result (pix QR etc)
  if (step === 5 && paymentResult) {
    return (
      <div className="min-h-screen bg-muted/30">
        
        <main className="container max-w-lg py-12">
          {paymentResult.pix ? (
            <PixPaymentResult encodedImage={paymentResult.pix.encodedImage} payload={paymentResult.pix.payload} expirationDate={paymentResult.pix.expirationDate} total={pixTotal} paymentId={paymentResult.payment_id} orderId={paymentResult.order_id} onConfirmed={() => clearCart()} />
          ) : (
            <div className="flex flex-col items-center space-y-4 rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
              <CheckCircle className="h-14 w-14 text-success" />
              <h2 className="text-2xl font-bold">Pagamento Aprovado!</h2>
              <p className="text-muted-foreground">Seu pedido foi confirmado. Você receberá um email com os detalhes.</p>
              <Link to="/produtos"><Button>Continuar Comprando</Button></Link>
            </div>
          )}
        </main>
        
        <WhatsAppButton />
      </div>
    );
  }

  if (items.length === 0 && step < 5) {
    return (
      <div className="min-h-screen">
        
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-bold">Seu carrinho está vazio</h1>
          <p className="mt-2 text-muted-foreground">Adicione produtos para continuar</p>
          <Link to="/produtos"><Button className="mt-6">Ver Produtos</Button></Link>
        </div>
        
      </div>
    );
  }

  const freeShipRemaining = Math.max(0, freeShippingMinValue - subtotal);
  const freeShipProgress = Math.min(100, (subtotal / freeShippingMinValue) * 100);

  return (
    <div className="min-h-screen bg-muted/30 overflow-x-hidden pb-24 md:pb-0">
      

      {/* Urgency Bar */}
      <div className="bg-gradient-to-r from-[hsl(var(--primary)/0.95)] to-[hsl(var(--primary))] py-2 px-3 sm:px-4">
        <div className="container flex items-center justify-center gap-2 sm:gap-6 flex-wrap text-[10px] sm:text-sm">
          <span className="flex items-center gap-1 text-primary-foreground/80">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
            <strong className="text-primary-foreground/90">Alta demanda</strong>
          </span>
          <span className="text-primary-foreground/40 hidden sm:inline">|</span>
          <span className="flex items-center gap-1 text-primary-foreground/80">
            <Users className="h-3 w-3 shrink-0" />
            <strong className="text-primary-foreground/90">7 pessoas</strong>&nbsp;vendo
          </span>
          <span className="text-primary-foreground/40 hidden sm:inline">|</span>
          <span className="flex items-center gap-1 text-primary-foreground/80">
            <Clock className="h-3 w-3 shrink-0" />
            <span className="hidden sm:inline">Oferta expira em&nbsp;</span>
            <span className="rounded-md bg-primary-foreground/10 px-1.5 py-0.5 font-bold text-primary-foreground tracking-wider">{timerMin}:{timerSec}</span>
          </span>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="border-b border-border bg-card py-3 px-4">
        <div className="container max-w-3xl">
          <div className="flex items-center">
            {STEPS.map((s, i) => (
              <div key={s.num} className="flex items-center flex-1">
                <div className="flex items-center gap-2">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    step > s.num ? "bg-success text-success-foreground" :
                    step === s.num ? "bg-primary text-primary-foreground" :
                    "border-2 border-muted-foreground/30 text-muted-foreground"
                  }`}>
                    {step > s.num ? "✓" : s.num}
                  </div>
                  <span className={`text-xs font-medium hidden sm:inline ${
                    step > s.num ? "text-success" :
                    step === s.num ? "text-primary font-semibold" :
                    "text-muted-foreground"
                  }`}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 transition-all ${step > s.num ? "bg-success" : "bg-border"}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <main className="container px-3 sm:px-4 py-6 md:py-8 max-w-full overflow-hidden">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start max-w-6xl mx-auto">

          {/* LEFT: Form Area */}
          <div>
            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              <AnimatePresence mode="wait">
                {/* STEP 1: Identificação */}
                {step === 1 && (
                  <motion.div key="s1" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="p-5 sm:p-7">
                    <h2 className="flex items-center gap-2.5 text-lg font-bold text-foreground mb-5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                      Identificação
                    </h2>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nome Completo</Label>
                        <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Seu nome completo" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">CPF</Label>
                        <Input required value={form.cpf} onChange={(e) => setForm({ ...form, cpf: formatCPF(e.target.value) })} placeholder="000.000.000-00" inputMode="numeric" />
                      </div>
                    </div>

                    <div className="mt-3 space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">E-mail</Label>
                      <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="seu@email.com" />
                      <p className="text-xs text-muted-foreground">✉️ Enviaremos a confirmação do pedido aqui</p>
                    </div>

                    <div className="mt-3 space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">WhatsApp</Label>
                      <Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })} placeholder="(00) 00000-0000" inputMode="tel" />
                      <p className="text-xs text-muted-foreground">📱 Atualizações do pedido via WhatsApp</p>
                    </div>

                    {/* Payment methods preview */}
                    <div className="mt-5 rounded-lg border border-border bg-muted/50 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Formas de pagamento aceitas</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="rounded-md bg-success px-2.5 py-0.5 text-[11px] font-bold text-success-foreground">⚡ PIX −5%</span>
                        <span className="rounded-md border border-border bg-card px-2 py-0.5 text-[10px] font-bold text-muted-foreground">💳 Cartão até {(storeSettings as any)?.max_total_installments || 12}x</span>
                        {(storeSettings as any)?.checkout_boleto_enabled && (
                          <span className="rounded-md border border-border bg-card px-2 py-0.5 text-[10px] font-bold text-muted-foreground">📄 Boleto</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP 2: Entrega */}
                {step === 2 && (
                  <motion.div key="s2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="p-5 sm:p-7">
                    <h2 className="flex items-center gap-2.5 text-lg font-bold text-foreground mb-5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
                      Endereço de Entrega
                    </h2>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">CEP</Label>
                      <div className="relative max-w-[200px]">
                        <Input
                          required value={form.cep} placeholder="00000-000" inputMode="numeric"
                          className="text-lg font-semibold tracking-wider"
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, "").slice(0, 8);
                            const formatted = raw.length > 5 ? `${raw.slice(0, 5)}-${raw.slice(5)}` : raw;
                            setForm({ ...form, cep: formatted });
                            if (raw.length === 8) {
                              fetchAddress(raw);
                              calculateShipping(raw, items.map((i) => ({ price: i.product.price, quantity: i.quantity, weight: i.product.weight, height: i.product.height, width: i.product.width, length: i.product.length })));
                            }
                          }}
                        />
                        {cepLoading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground animate-pulse">Buscando...</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">🔍 Endereço preenchido automaticamente</p>
                    </div>

                    {form.street && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rua</Label>
                          <Input required value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
                        </div>
                        <div className="grid gap-3 grid-cols-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Número</Label>
                            <Input required value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} autoFocus />
                          </div>
                          <div className="col-span-2 space-y-1.5">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Complemento</Label>
                            <Input value={form.complement} onChange={(e) => setForm({ ...form, complement: e.target.value })} placeholder="Apto, bloco... (opcional)" />
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bairro</Label>
                            <Input required value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cidade</Label>
                            <Input required value={form.city} readOnly={!!form.city} className={form.city ? "bg-muted" : ""} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                          </div>
                        </div>
                        <div className="max-w-[120px] space-y-1.5">
                          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estado</Label>
                          <Input required value={form.state} readOnly={!!form.state} className={form.state ? "bg-muted uppercase" : "uppercase"} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                        </div>
                      </motion.div>
                    )}

                    {/* Shipping Options (auto-calculated from CEP) */}
                    {shippingLoading && (
                      <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
                        <Loader2 className="h-4 w-4 animate-spin" /> Calculando frete...
                      </div>
                    )}
                    {!shippingLoading && shippingOptions.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Opções de Envio</Label>
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

                    {/* Prescritor */}
                    {(storeSettings as any)?.checkout_prescriber_required !== false && (
                      <div className="mt-5">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Prescritor / Médico</Label>
                        <div className="relative">
                          <Input
                            placeholder="Buscar por nome, cidade ou estado..."
                            value={form.doctor || doctorSearch}
                            onChange={(e) => { setDoctorSearch(e.target.value); setForm({ ...form, doctor: "" }); setSelectedDoctorId(null); setShowDoctorResults(true); }}
                            disabled={selectedDoctorId === "sem-prescritor"}
                          />
                          {showDoctorResults && doctorSearch && (
                            <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-card shadow-lg max-h-48 overflow-y-auto">
                              {filteredDoctors.map((d) => (
                                <button key={d.id} type="button" className="w-full px-4 py-2 text-left text-sm hover:bg-muted"
                                  onClick={() => { setForm({ ...form, doctor: d.name }); setSelectedDoctorId(d.id); setDoctorSearch(""); setShowDoctorResults(false); }}>
                                  <span className="font-medium">{d.name}</span>
                                  {d.specialty && <span className="text-muted-foreground"> — {d.specialty}</span>}
                                  {(d.city || d.state) && <span className="text-muted-foreground text-xs ml-2">({[d.city, d.state].filter(Boolean).join("/")})</span>}
                                </button>
                              ))}
                              {filteredDoctors.length === 0 && <p className="px-4 py-3 text-sm text-muted-foreground">Nenhum prescritor encontrado.</p>}
                            </div>
                          )}
                        </div>
                        <Button type="button" variant={selectedDoctorId === "sem-prescritor" ? "default" : "outline"} size="sm" className="mt-2"
                          onClick={() => {
                            if (selectedDoctorId === "sem-prescritor") { setSelectedDoctorId(null); setForm({ ...form, doctor: "" }); }
                            else { setSelectedDoctorId("sem-prescritor"); setForm({ ...form, doctor: "Sem Prescritor" }); setShowDoctorResults(false); }
                          }}>
                          {selectedDoctorId === "sem-prescritor" ? "✓ Sem Prescritor" : "Não Sei / Sem Prescritor"}
                        </Button>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* STEP 3: Pagamento */}
                {step === 3 && (
                  <motion.div key="s3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="p-5 sm:p-7">
                    <h2 className="flex items-center gap-2.5 text-lg font-bold text-foreground mb-5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
                      Pagamento
                    </h2>

                    {/* PIX Highlight */}
                    <button type="button" onClick={() => setForm({ ...form, paymentMethod: "pix" })}
                      className={`w-full rounded-xl p-3 sm:p-4 flex items-center gap-3 text-left transition-all shadow-md ${
                        form.paymentMethod === "pix"
                          ? "bg-gradient-to-r from-success to-[hsl(170,50%,45%)] ring-2 ring-success/50"
                          : "bg-gradient-to-r from-success/80 to-[hsl(170,50%,45%)]/80 opacity-80 hover:opacity-100"
                      }`}>
                      <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-white/20 text-xl sm:text-2xl shrink-0">⚡</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-sm sm:text-base">Pagar com Pix</p>
                        <p className="text-white/80 text-[10px] sm:text-xs truncate">Aprovação imediata · Sem taxa extra</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-white/60 text-[10px] sm:text-xs line-through">R$ {finalTotal.toFixed(2).replace(".", ",")}</p>
                        <p className="font-extrabold text-white text-base sm:text-xl leading-tight">R$ {pixTotal.toFixed(2).replace(".", ",")}</p>
                        <span className="inline-block rounded bg-white/25 px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-white">−5%</span>
                      </div>
                    </button>

                    {/* Card */}
                    <div className="mt-3 space-y-3">
                      <button type="button" onClick={() => setForm({ ...form, paymentMethod: "card" })}
                        className={`w-full rounded-xl border-2 p-4 flex items-center gap-3 text-left transition-all ${
                          form.paymentMethod === "card" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                        }`}>
                        <div className={`flex h-4 w-4 items-center justify-center rounded-full border-2 shrink-0 ${form.paymentMethod === "card" ? "border-primary" : "border-muted-foreground/40"}`}>
                          {form.paymentMethod === "card" && <div className="h-2 w-2 rounded-full bg-primary" />}
                        </div>
                        <div className="flex h-8 w-10 items-center justify-center rounded-md bg-primary text-white text-sm shrink-0">💳</div>
                        <div className="flex-1">
                          <p className="font-bold text-sm">Cartão de Crédito / Débito</p>
                          <p className="text-xs text-muted-foreground">Em até {(storeSettings as any)?.max_total_installments || 12}x · Aprovação na hora</p>
                        </div>
                        <div className="flex gap-1">
                          {["VISA", "MASTER", "ELO"].map((b) => (
                            <span key={b} className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">{b}</span>
                          ))}
                        </div>
                      </button>

                      {form.paymentMethod === "card" && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="px-1">
                          <CreditCardForm card={cardData} onChange={setCardData} installments={installments} onInstallmentsChange={setInstallments} total={finalTotal} interestFreeLimit={storeSettings?.max_installments ?? 3} maxTotalInstallments={(storeSettings as any)?.max_total_installments ?? 12} />
                        </motion.div>
                      )}

                      {/* Boleto */}
                      {(storeSettings as any)?.checkout_boleto_enabled && (
                        <button type="button" onClick={() => setForm({ ...form, paymentMethod: "boleto" as any })}
                          className={`w-full rounded-xl border-2 p-4 flex items-center gap-3 text-left transition-all ${
                            form.paymentMethod === "boleto" ? "border-muted-foreground/50 bg-muted/50" : "border-border hover:border-muted-foreground/30"
                          }`}>
                          <div className={`flex h-4 w-4 items-center justify-center rounded-full border-2 shrink-0 ${form.paymentMethod === "boleto" ? "border-muted-foreground" : "border-muted-foreground/40"}`}>
                            {form.paymentMethod === "boleto" && <div className="h-2 w-2 rounded-full bg-muted-foreground" />}
                          </div>
                          <div className="flex h-8 w-10 items-center justify-center rounded-md bg-muted text-sm shrink-0">📄</div>
                          <div className="flex-1">
                            <p className="font-bold text-sm">Boleto Bancário</p>
                            <p className="text-xs text-muted-foreground">Vencimento em 3 dias · Compensação em 1-3 dias úteis</p>
                          </div>
                        </button>
                      )}
                    </div>

                    {/* Trust */}
                    <div className="mt-5 flex items-center justify-center gap-4 flex-wrap rounded-lg border border-border bg-muted/50 p-3">
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium"><Shield className="h-3.5 w-3.5 text-success" /> SSL 256-bit</span>
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium"><ShieldCheck className="h-3.5 w-3.5 text-success" /> Antifraude</span>
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium"><CreditCard className="h-3.5 w-3.5 text-muted-foreground" /> Gateway Seguro</span>
                    </div>
                  </motion.div>
                )}

                {/* STEP 4: Confirmação */}
                {step === 4 && (
                  <motion.div key="s4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="p-5 sm:p-7 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success text-success-foreground mx-auto mb-4 text-3xl">✓</div>
                    <h2 className="text-2xl font-extrabold text-foreground mb-2">Pedido Confirmado! 🎉</h2>
                    <p className="text-muted-foreground mb-6">Você receberá a confirmação no e-mail e WhatsApp cadastrado em instantes.</p>
                    <Link to="/produtos"><Button>Continuar Comprando</Button></Link>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* CTA Buttons */}
              {step <= 3 && (
                <div className="border-t border-border p-5 sm:p-7">
                  {step === 1 && (
                    <>
                      <Button className="w-full gap-2 text-base" size="lg" onClick={() => { if (validateStep1()) { saveAbandonment.current(); abandonmentSaved.current = false; goToStep(2); } }}>
                        Continuar para Entrega <ChevronRight className="h-4 w-4" />
                      </Button>
                      <p className="text-center text-xs text-muted-foreground mt-2.5">🔒 Dados protegidos com criptografia SSL</p>
                    </>
                  )}
                  {step === 2 && (
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => goToStep(1)}>Voltar</Button>
                      <Button className="flex-1 gap-2 text-base" size="lg" onClick={() => validateStep2() && goToStep(3)}>
                        Continuar para Pagamento <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  {step === 3 && (
                    <>
                      <div className="flex gap-3">
                        <Button variant="outline" onClick={() => goToStep(2)}>Voltar</Button>
                        <Button
                          className="flex-1 gap-2 bg-success hover:bg-success/90 text-success-foreground text-base"
                          size="lg" disabled={isSubmitting} onClick={handleSubmit}>
                          {isSubmitting ? "Processando..." : (
                            <>
                              <Lock className="h-4 w-4" />
                              {form.paymentMethod === "pix"
                                ? `Pagar via Pix R$ ${pixTotal.toFixed(2).replace(".", ",")}`
                                : form.paymentMethod === "boleto"
                                ? `Gerar Boleto R$ ${finalTotal.toFixed(2).replace(".", ",")}`
                                : `Pagar R$ ${finalTotal.toFixed(2).replace(".", ",")}`}
                            </>
                          )}
                        </Button>
                      </div>
                      <TrustMicroTexts />
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Combo Upsell below form */}
            {step <= 2 && (storeSettings as any)?.checkout_show_combo !== false && (
              <div className="mt-4">
                <ComboUpsell />
              </div>
            )}
          </div>

          {/* RIGHT: Sidebar */}
          {step <= 3 && (
            {/* Mobile order summary */}
            <div className="lg:hidden rounded-lg border border-border bg-card p-4 mb-4">
              <h3 className="text-sm font-semibold mb-2">Resumo do Pedido</h3>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>R$ {subtotal.toFixed(2).replace(".", ",")}</span></div>
                {discount > 0 && (
                  <div className="flex justify-between text-success"><span>Desconto ({coupon})</span><span>-R$ {discount.toFixed(2).replace(".", ",")}</span></div>
                )}
                {comboDiscount > 0 && !coupon && (
                  <div className="flex justify-between text-success"><span>Desconto Combo</span><span>-R$ {comboDiscount.toFixed(2).replace(".", ",")}</span></div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Frete</span>
                  <span className={shipping === 0 && (qualifiesForFreeShipping || freeShipping || comboFreeShipping || selectedShipping) ? "font-semibold text-success" : ""}>
                    {qualifiesForFreeShipping || freeShipping || comboFreeShipping ? "Grátis" : selectedShipping ? (shipping === 0 ? "Grátis" : `R$ ${shipping.toFixed(2).replace(".", ",")}`) : "—"}
                  </span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-primary">R$ {finalTotal.toFixed(2).replace(".", ",")}</span>
                </div>
                {form.paymentMethod === "pix" && (
                  <div className="rounded-lg bg-success/10 border border-success/30 p-2 text-center mt-1">
                    <p className="text-xs font-medium text-success">🎉 No Pix: R$ {pixTotal.toFixed(2).replace(".", ",")} (5% OFF)</p>
                  </div>
                )}
              </div>
            </div>
            {/* Desktop sidebar */}
            <div className="hidden lg:block lg:sticky lg:top-4">
              <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                {/* Header */}
                <div className="bg-primary p-4">
                  <h3 className="font-bold text-primary-foreground text-sm">Resumo do Pedido</h3>
                  <p className="text-primary-foreground/60 text-xs">D7 Pharma do Brasil</p>
                </div>

                {/* Combo group in sidebar */}
                {comboProductIds.length > 0 && items.some((i) => comboProductIds.includes(i.product.id)) && (
                  <div className="border-b border-primary/20 bg-primary/5 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-primary uppercase tracking-wide">🔥 Combo</span>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setComboQuantity(comboQuantity - 1)} disabled={comboQuantity <= 1} className="flex h-6 w-6 items-center justify-center rounded-md border border-border text-xs hover:border-primary disabled:opacity-30"><Minus className="h-3 w-3" /></button>
                          <span className="text-sm font-semibold w-5 text-center">{comboQuantity}</span>
                          <button onClick={() => setComboQuantity(comboQuantity + 1)} className="flex h-6 w-6 items-center justify-center rounded-md border border-border text-xs hover:border-primary"><Plus className="h-3 w-3" /></button>
                        </div>
                        <button onClick={removeCombo} className="rounded p-1 text-destructive hover:bg-destructive/10" title="Remover Combo"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                    {items.filter((i) => comboProductIds.includes(i.product.id)).map((item) => (
                      <div key={item.product.id} className="flex items-center gap-3 py-2 border-t border-primary/10 first:border-t-0">
                        <img src={item.product.image} alt={item.product.name} className="h-10 w-10 rounded-lg object-contain bg-muted p-1 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{item.product.name}</p>
                          <span className="text-xs text-muted-foreground">×{item.quantity}</span>
                        </div>
                        <p className="text-sm font-bold text-foreground shrink-0">R$ {(item.product.price * item.quantity).toFixed(2).replace(".", ",")}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Non-combo products in sidebar */}
                {items.filter((i) => !comboProductIds.includes(i.product.id)).map((item) => (
                  <div key={item.product.id} className="flex items-center gap-3 border-b border-border p-4">
                    <img src={item.product.image} alt={item.product.name} className="h-14 w-14 rounded-lg object-contain bg-muted p-1 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{item.product.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="flex h-6 w-6 items-center justify-center rounded-md border border-border text-xs hover:border-primary"><Minus className="h-3 w-3" /></button>
                        <span className="text-sm font-semibold w-5 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="flex h-6 w-6 items-center justify-center rounded-md border border-border text-xs hover:border-primary"><Plus className="h-3 w-3" /></button>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-foreground">R$ {(item.product.price * item.quantity).toFixed(2).replace(".", ",")}</p>
                      <button onClick={() => removeItem(item.product.id)} className="text-xs text-destructive hover:underline mt-1">Remover</button>
                    </div>
                  </div>
                ))}

                {/* Upsell bump */}
                {(storeSettings as any)?.checkout_show_recommendations !== false && (
                  <div className="px-4 py-3">
                    <CartRecommendations cartItems={items} showOnlyUpsell />
                  </div>
                )}

                {/* Free shipping progress */}
                {storeSettings?.free_shipping_enabled && freeShipRemaining > 0 && (
                  <div className="mx-4 mb-3 rounded-lg bg-success/10 p-2.5">
                    <p className="text-xs font-semibold text-success mb-1.5">
                      Faltam <strong>R$ {freeShipRemaining.toFixed(2).replace(".", ",")}</strong> para frete grátis 📦
                    </p>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-success to-[hsl(170,50%,45%)] transition-all" style={{ width: `${freeShipProgress}%` }} />
                    </div>
                  </div>
                )}
                {storeSettings?.free_shipping_enabled && freeShipRemaining <= 0 && (
                  <div className="mx-4 mb-3 rounded-lg bg-success/10 p-2.5">
                    <p className="text-xs font-bold text-success">🎉 Frete grátis conquistado!</p>
                  </div>
                )}

                {/* Coupon */}
                <div className="flex gap-2 px-4 py-3 border-t border-border">
                  <Input placeholder="Cupom de desconto" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} className="text-sm h-9" />
                  <Button variant="secondary" size="sm" className="shrink-0 h-9" onClick={() => applyCoupon(couponInput)}>
                    <Tag className="h-3.5 w-3.5 mr-1" /> Aplicar
                  </Button>
                </div>

                {/* Summary */}
                <div className="px-4 py-3 space-y-1.5">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Subtotal</span>
                    <span>R$ {subtotal.toFixed(2).replace(".", ",")}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-success">
                      <span>Desconto ({coupon})</span>
                      <span>-R$ {discount.toFixed(2).replace(".", ",")}</span>
                    </div>
                  )}
                  {comboDiscount > 0 && !coupon && (
                    <div className="flex justify-between text-sm text-success">
                      <span>Desconto Combo</span>
                      <span>-R$ {comboDiscount.toFixed(2).replace(".", ",")}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Frete</span>
                    <span className={shipping === 0 && (qualifiesForFreeShipping || freeShipping || comboFreeShipping || selectedShipping) ? "font-semibold text-success" : "text-muted-foreground"}>
                      {qualifiesForFreeShipping || freeShipping || comboFreeShipping ? "Grátis" : selectedShipping ? (shipping === 0 ? "Grátis" : `R$ ${shipping.toFixed(2).replace(".", ",")}`) : "A calcular"}
                    </span>
                  </div>
                  {selectedShipping && (
                    <p className="text-xs text-muted-foreground">{selectedShipping.company} — {selectedShipping.name} ({selectedShipping.delivery_time} dias)</p>
                  )}

                  {/* Pix discount row */}
                  <div className="flex justify-between items-center rounded-lg bg-success/10 px-3 py-2 mt-1">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-success">⚡ Desconto Pix (5%)</span>
                    <span className="text-sm font-bold text-success">− R$ {(finalTotal * 0.05).toFixed(2).replace(".", ",")}</span>
                  </div>

                  <div className="flex justify-between items-center border-t-2 border-border pt-3 mt-2">
                    <span className="font-bold text-base">Total</span>
                    <span className="font-extrabold text-lg text-primary">R$ {pixTotal.toFixed(2).replace(".", ",")}</span>
                  </div>
                  <p className="text-right text-[11px] text-success font-semibold">no Pix · aprovação imediata</p>
                </div>

                {/* Testimonial */}
                {(storeSettings as any)?.checkout_show_testimonials !== false && items[0] && (
                  <div className="mx-4 mb-3 rounded-lg border-l-4 border-warning bg-muted/50 p-3">
                    <div className="flex gap-0.5 mb-1">
                      {[1,2,3,4,5].map((s) => <Star key={s} className="h-3 w-3 fill-warning text-warning" />)}
                    </div>
                    <CartItemTestimonial productId={items[0].product.id} customerState={form.state || undefined} />
                  </div>
                )}

                {/* Social proof */}
                {(storeSettings as any)?.checkout_show_urgency !== false && (
                  <div className="border-t border-border px-4 py-3 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" /> Alta demanda — poucas unidades
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-warning" /> 7 pessoas visualizando agora
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-success" /> +183 clientes compraram este mês
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Package className="h-3 w-3 text-success" /> Envio em até 24h úteis
                    </div>
                  </div>
                )}

                {/* Trust logos */}
                <div className="flex items-center justify-center gap-2 flex-wrap border-t border-border px-4 py-3">
                  <span className="rounded border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">🔒 SSL</span>
                  {["VISA", "MASTER", "ELO", "PIX"].map((b) => (
                    <span key={b} className="rounded border border-border bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">{b}</span>
                  ))}
                </div>

                {/* Guarantees */}
                <div className="border-t border-border px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Na D7 Pharma você tem:</p>
                  <div className="space-y-1.5">
                    {["Garantia de Entrega Rápida", "Suporte Humanizado 24/7", "Segurança e Transparência"].map((g) => (
                      <div key={g} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-success shrink-0" /> {g}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Fixed mobile bottom bar */}
      {step <= 3 && (
        <div className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card p-3 shadow-lg md:hidden">
          {step === 1 && (
            <Button className="w-full text-sm" size="lg" onClick={() => validateStep1() && goToStep(2)}>
              Continuar para Entrega →
            </Button>
          )}
          {step === 2 && (
            <div className="flex gap-2">
              <Button variant="outline" size="lg" onClick={() => goToStep(1)} className="text-sm">Voltar</Button>
              <Button className="flex-1 text-sm" size="lg" onClick={() => validateStep2() && goToStep(3)}>
                Pagamento →
              </Button>
            </div>
          )}
          {step === 3 && (
            <div className="flex gap-2">
              <Button variant="outline" size="lg" onClick={() => goToStep(2)} className="text-sm">Voltar</Button>
              <Button className="flex-1 gap-2 bg-success hover:bg-success/90 text-success-foreground text-sm" size="lg" disabled={isSubmitting} onClick={handleSubmit}>
                {isSubmitting ? "Processando..." : form.paymentMethod === "pix" ? `💰 Pix R$ ${pixTotal.toFixed(2).replace(".", ",")}` : "Finalizar Pedido"}
              </Button>
            </div>
          )}
        </div>
      )}
      {step <= 3 && <div className="h-20 md:hidden" />}

      
      {!storeSettings?.hide_chat_on_checkout && <WhatsAppButton />}
    </div>
  );
};

export default CheckoutPageV2;
