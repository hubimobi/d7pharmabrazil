import { supabase } from "@/integrations/supabase/client";

// ── Visitor & Session IDs ──────────────────────────────────────
function getOrCreateId(key: string, storage: Storage): string {
  let id = storage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    storage.setItem(key, id);
  }
  return id;
}

export function getVisitorId(): string {
  return getOrCreateId("d7_visitor_id", localStorage);
}

export function getSessionId(): string {
  return getOrCreateId("d7_session_id", sessionStorage);
}

// ── UTM helpers ────────────────────────────────────────────────
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

export function captureUTMs() {
  const params = new URLSearchParams(window.location.search);
  for (const key of UTM_KEYS) {
    const val = params.get(key);
    if (val) sessionStorage.setItem(`d7_${key}`, val);
  }
  // Also capture link ref code
  const ref = params.get("ref") || params.get("link_ref");
  if (ref) sessionStorage.setItem("d7_link_ref_code", ref);
}

function getUTMs(): Record<string, string | null> {
  return {
    utm_source: sessionStorage.getItem("d7_utm_source"),
    utm_medium: sessionStorage.getItem("d7_utm_medium"),
    utm_campaign: sessionStorage.getItem("d7_utm_campaign"),
    utm_content: sessionStorage.getItem("d7_utm_content"),
    utm_term: sessionStorage.getItem("d7_utm_term"),
    link_ref_code: sessionStorage.getItem("d7_link_ref_code"),
  };
}

// ── Core dispatch ──────────────────────────────────────────────
declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
    hj?: (...args: any[]) => void;
  }
}

interface TrackPayload {
  eventName: string;
  fbEvent?: string;
  fbParams?: Record<string, any>;
  ga4Event?: string;
  ga4Params?: Record<string, any>;
  eventData?: Record<string, any>;
}

function dispatch(payload: TrackPayload) {
  const { eventName, fbEvent, fbParams, ga4Event, ga4Params, eventData } = payload;
  const utms = getUTMs();

  // Meta Pixel
  if (fbEvent && window.fbq) {
    try { window.fbq("track", fbEvent, fbParams || {}); } catch {}
  }

  // GA4 / GTM
  if (ga4Event) {
    if (window.gtag) {
      try { window.gtag("event", ga4Event, ga4Params || {}); } catch {}
    }
    if (window.dataLayer) {
      try { window.dataLayer.push({ event: ga4Event, ...(ga4Params || {}) }); } catch {}
    }
  }

  // Internal DB (fire & forget, non-blocking)
  const postPurchase = sessionStorage.getItem("d7_has_purchased") === "true";
  supabase
    .from("visitor_events" as any)
    .insert({
      visitor_id: getVisitorId(),
      session_id: getSessionId(),
      event_name: eventName,
      event_data: { ...(eventData || {}), post_purchase: postPurchase },
      page_url: window.location.href,
      referrer: document.referrer || null,
      utm_source: utms.utm_source,
      utm_medium: utms.utm_medium,
      utm_campaign: utms.utm_campaign,
      utm_content: utms.utm_content,
      utm_term: utms.utm_term,
      link_ref_code: utms.link_ref_code,
    } as any)
    .then(() => {});
}

// ── Public tracking functions ──────────────────────────────────

export function trackPageView(url?: string) {
  dispatch({
    eventName: "page_view",
    ga4Event: "page_view",
    ga4Params: { page_location: url || window.location.href },
    eventData: { url: url || window.location.href },
  });
}

export function trackViewContent(product: { id: string; name: string; price: number; slug?: string }) {
  dispatch({
    eventName: "view_content",
    fbEvent: "ViewContent",
    fbParams: { content_ids: [product.id], content_name: product.name, content_type: "product", value: product.price, currency: "BRL" },
    ga4Event: "view_item",
    ga4Params: { currency: "BRL", value: product.price, items: [{ item_id: product.id, item_name: product.name, price: product.price }] },
    eventData: { product_id: product.id, product_name: product.name, price: product.price },
  });
}

export function trackAddToCart(product: { id: string; name: string; price: number }, quantity: number) {
  const value = product.price * quantity;
  dispatch({
    eventName: "add_to_cart",
    fbEvent: "AddToCart",
    fbParams: { content_ids: [product.id], content_name: product.name, content_type: "product", value, currency: "BRL" },
    ga4Event: "add_to_cart",
    ga4Params: { currency: "BRL", value, items: [{ item_id: product.id, item_name: product.name, price: product.price, quantity }] },
    eventData: { product_id: product.id, product_name: product.name, price: product.price, quantity },
  });
}

export function trackInitiateCheckout(items: Array<{ id: string; name: string; price: number; quantity: number }>, total: number) {
  dispatch({
    eventName: "initiate_checkout",
    fbEvent: "InitiateCheckout",
    fbParams: { content_ids: items.map((i) => i.id), num_items: items.length, value: total, currency: "BRL" },
    ga4Event: "begin_checkout",
    ga4Params: { currency: "BRL", value: total, items: items.map((i) => ({ item_id: i.id, item_name: i.name, price: i.price, quantity: i.quantity })) },
    eventData: { items_count: items.length, total },
  });
}

export function trackAddPaymentInfo(method: string) {
  dispatch({
    eventName: "add_payment_info",
    fbEvent: "AddPaymentInfo",
    fbParams: { payment_method: method },
    ga4Event: "add_payment_info",
    ga4Params: { payment_type: method },
    eventData: { payment_method: method },
  });
}

export function trackPurchase(order: { id: string; total: number; items: Array<{ id?: string; name: string; price: number; quantity: number }> }) {
  // Deduplicate
  const key = `d7_purchase_${order.id}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");
  sessionStorage.setItem("d7_has_purchased", "true");

  dispatch({
    eventName: "purchase",
    fbEvent: "Purchase",
    fbParams: { content_ids: order.items.map((i) => i.id || i.name), value: order.total, currency: "BRL", content_type: "product" },
    ga4Event: "purchase",
    ga4Params: {
      transaction_id: order.id,
      currency: "BRL",
      value: order.total,
      items: order.items.map((i) => ({ item_id: i.id || i.name, item_name: i.name, price: i.price, quantity: i.quantity })),
    },
    eventData: { order_id: order.id, total: order.total, items: order.items },
  });
}

export function trackCustomEvent(name: string, data?: Record<string, any>) {
  dispatch({
    eventName: name,
    ga4Event: name,
    ga4Params: data,
    eventData: data,
  });
}

// ── Hotjar Identify ────────────────────────────────────────────
export function identifyHotjar() {
  const visitorId = getVisitorId();
  const utms = getUTMs();
  if (window.hj) {
    try {
      window.hj("identify", visitorId, {
        utm_source: utms.utm_source || "",
        utm_campaign: utms.utm_campaign || "",
        has_purchased: sessionStorage.getItem("d7_has_purchased") === "true",
      });
    } catch {}
  }
}
