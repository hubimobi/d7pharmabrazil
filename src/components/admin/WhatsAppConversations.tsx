import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  Search, Send, MessageSquare, User, Phone, Tag, Archive,
  CheckCircle, XCircle, Clock, ExternalLink, X, Plus,
  Inbox, MailOpen, Hash, StickyNote, Info, Zap,
  CircleDot, Bold, Italic, Link2, Code, List,
  Paperclip, Smile, Mic, ChevronDown, ChevronRight,
  Users, FolderOpen, Star, Copy, Edit, Trash2,
  MessageCircle, AtSign, UserX, Filter, ArrowUpDown,
  Bot, MoreVertical, Megaphone, Mail, Globe, GitBranch,
  Loader2, Save, Megaphone as CampaignIcon, Check,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format, formatDistanceToNow, isToday, isYesterday, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

/* ───────── Types ───────── */
interface Conversation {
  id: string;
  tenant_id: string | null;
  contact_phone: string;
  contact_name: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  status: string;
  assigned_to: string | null;
  tags: string[];
  created_at: string;
  instance_id?: string;
}

interface Message {
  id: string;
  contact_phone: string;
  contact_name: string;
  instance_name: string | null;
  message_content: string;
  direction: string;
  status: string;
  error_message: string | null;
  created_at: string;
  conversation_id: string | null;
}

interface Template {
  id: string;
  name: string;
  content: string;
  active: boolean;
}

interface ContactProfile {
  id: string;
  phone: string;
  name: string;
  email: string | null;
  notes: string | null;
  source: string;
  ad_source: string | null;
  first_campaign_id: string | null;
  tags: string[];
  converted: boolean;
  created_at: string;
}

interface CampaignRecord {
  broadcast_name: string | null;
  campaign_id: string | null;
  status: string;
  scheduled_at: string;
}

/* ───────── Helpers ───────── */
function ensureBrazilCountryCode(phone: string): string {
  let clean = phone.replace(/\D/g, "");
  if (clean.startsWith("0")) clean = clean.substring(1);
  if (!clean.startsWith("55") && clean.length <= 11) clean = "55" + clean;
  return clean;
}

function parseSpintax(text: string): string {
  const regex = /\{([^{}]+)\}/;
  let result = text;
  let match;
  while ((match = regex.exec(result)) !== null) {
    const options = match[1].split("|");
    const chosen = options[Math.floor(Math.random() * options.length)];
    result = result.substring(0, match.index) + chosen + result.substring(match.index + match[0].length);
  }
  return result;
}

const AVATAR_COLORS = [
  "#1F93FF", "#2ECC71", "#E74C3C", "#9B59B6",
  "#F39C12", "#1ABC9C", "#E91E63", "#3F51B5",
  "#FF5722", "#607D8B",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

function formatDateLabel(date: Date): string {
  if (isToday(date)) return "Hoje";
  if (isYesterday(date)) return "Ontem";
  return format(date, "dd 'de' MMMM, yyyy", { locale: ptBR });
}

function relativeTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Ontem";
  return format(d, "dd/MM/yy");
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dotColor: string }> = {
  open: { label: "Aberta", color: "text-blue-600", dotColor: "bg-blue-500" },
  pending: { label: "Pendente", color: "text-amber-600", dotColor: "bg-amber-500" },
  closed: { label: "Resolvida", color: "text-emerald-600", dotColor: "bg-emerald-500" },
  archived: { label: "Arquivada", color: "text-slate-500", dotColor: "bg-slate-400" },
};

type FilterStatus = "all" | "open" | "unread" | "archived" | "mentions" | "unattended";
type InputMode = "reply" | "note";

const LABEL_COLORS: Record<string, string> = {
  urgente: "bg-red-500",
  vip: "bg-purple-500",
  novo: "bg-blue-500",
  lead: "bg-green-500",
  suporte: "bg-orange-500",
};

function getLabelColor(tag: string) {
  return LABEL_COLORS[tag.toLowerCase()] || "bg-slate-500";
}

/* ───────── Main Component ───────── */
export default function ConversationsTab() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [showDetails, setShowDetails] = useState(true);
  const [contactNote, setContactNote] = useState("");
  const [instances, setInstances] = useState<{ id: string; name: string; status: string }[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>("all");
  const [showCannedDropdown, setShowCannedDropdown] = useState(false);
  const [cannedFilter, setCannedFilter] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>("reply");
  const [listTab, setListTab] = useState<"mine" | "unassigned" | "all">("all");
  const [chatTab, setChatTab] = useState<"messages" | "dashboard">("messages");
  const [contactTab, setContactTab] = useState<"contact" | "copilot">("contact");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Lead CRM state
  const [contactProfile, setContactProfile] = useState<ContactProfile | null>(null);
  const [prevConversations, setPrevConversations] = useState<Conversation[]>([]);
  const [contactCampaigns, setContactCampaigns] = useState<CampaignRecord[]>([]);
  const [funnels, setFunnels] = useState<{ id: string; name: string }[]>([]);
  const [selectedFunnelToAdd, setSelectedFunnelToAdd] = useState("");
  const [addingToFunnel, setAddingToFunnel] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", email: "", notes: "", ad_source: "" });

  // Accordion states
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    conversations: true, folders: false, teams: false, channels: true, labels: false,
    convActions: true, contactAttrs: false, convInfo: true, prevConvs: false,
  });
  const toggleSection = (key: string) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  /* ── Data loading ── */
  useEffect(() => { loadConversations(); loadTemplates(); loadInstances(); loadFunnelsList(); }, []);
  useEffect(() => {
    if (selected) {
      loadMessages(selected);
      loadContactProfile(selected.contact_phone);
      loadPrevConversations(selected.contact_phone, selected.id);
      loadContactCampaigns(selected.contact_phone);
      setEditingContact(false);
    }
  }, [selected?.id]);
  useEffect(() => { loadConversations(); }, [filter, selectedInstanceId, listTab]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    const channel = supabase
      .channel("wa-conversations-chatwoot")
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_conversations" }, () => loadConversations())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "whatsapp_message_log" }, (payload) => {
        const newMsg = payload.new as any;
        // Show all messages for this contact regardless of which instance sent/received
        if (selected && newMsg.contact_phone === selected.contact_phone) {
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg as Message];
          });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selected?.contact_phone, selected?.instance_id]);

  async function loadInstances() {
    const { data } = await supabase.from("whatsapp_instances").select("id, name, status").eq("active", true).order("name");
    setInstances((data || []) as unknown as { id: string; name: string; status: string }[]);
  }

  async function loadConversations() {
    let query = supabase.from("whatsapp_conversations").select("*").order("last_message_at", { ascending: false }).limit(200);
    if (selectedInstanceId !== "all") query = query.eq("instance_id", selectedInstanceId);
    if (filter === "open") query = query.eq("status", "open");
    else if (filter === "archived") query = query.eq("status", "archived");
    else if (filter === "unread") query = query.gt("unread_count", 0);
    const { data } = await query;
    setConversations((data || []) as unknown as Conversation[]);
  }

  async function loadMessages(conv: Conversation) {
    // Load ALL messages for this phone number across all instances so history
    // is never lost when a contact writes from a different WhatsApp number.
    const q = supabase
      .from("whatsapp_message_log").select("*")
      .eq("contact_phone", conv.contact_phone)
      .order("created_at", { ascending: true }).limit(500);
    const { data } = await q;
    setMessages((data || []) as unknown as Message[]);
    if (conv.unread_count > 0) {
      await supabase.from("whatsapp_conversations").update({ unread_count: 0 } as any).eq("id", conv.id);
      setSelected({ ...conv, unread_count: 0 });
    }
  }

  async function loadTemplates() {
    const { data } = await supabase.from("whatsapp_templates").select("id, name, content, active").eq("active", true).order("name");
    setTemplates((data || []) as unknown as Template[]);
  }

  async function loadFunnelsList() {
    const { data } = await supabase.from("whatsapp_funnels").select("id, name").eq("active", true).order("name");
    setFunnels((data || []) as any);
  }

  async function loadContactProfile(phone: string) {
    const cleanPhone = phone.replace(/\D/g, "");
    const { data } = await supabase
      .from("whatsapp_contacts")
      .select("*")
      .eq("phone", cleanPhone)
      .maybeSingle();
    setContactProfile(data as ContactProfile | null);
    if (data) {
      setContactForm({
        name: data.name || "",
        email: data.email || "",
        notes: data.notes || "",
        ad_source: (data as any).ad_source || "",
      });
    } else {
      setContactForm({ name: "", email: "", notes: "", ad_source: "" });
    }
  }

  async function saveContactProfile() {
    if (!selected) return;
    setSavingContact(true);
    const cleanPhone = selected.contact_phone.replace(/\D/g, "");
    const payload: any = {
      phone: cleanPhone,
      name: contactForm.name || selected.contact_name || "",
      email: contactForm.email || null,
      notes: contactForm.notes || null,
      ad_source: contactForm.ad_source || null,
      source: contactProfile?.source || "whatsapp",
      tenant_id: selected.tenant_id,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("whatsapp_contacts")
      .upsert(payload, { onConflict: "tenant_id,phone" });
    if (!error) {
      toast.success("Contato atualizado");
      await loadContactProfile(cleanPhone);
      if (contactForm.name && contactForm.name !== selected.contact_name) {
        await supabase.from("whatsapp_conversations")
          .update({ contact_name: contactForm.name } as any)
          .eq("id", selected.id);
        setSelected({ ...selected, contact_name: contactForm.name });
        loadConversations();
      }
      setEditingContact(false);
    } else {
      toast.error("Erro ao salvar contato");
    }
    setSavingContact(false);
  }

  async function loadPrevConversations(phone: string, currentId: string) {
    const { data } = await supabase
      .from("whatsapp_conversations")
      .select("id, contact_name, last_message, last_message_at, status, instance_id")
      .eq("contact_phone", phone)
      .neq("id", currentId)
      .order("last_message_at", { ascending: false })
      .limit(10);
    setPrevConversations((data || []) as unknown as Conversation[]);
  }

  async function loadContactCampaigns(phone: string) {
    const cleanPhone = phone.replace(/\D/g, "");
    const { data } = await (supabase as any)
      .from("whatsapp_message_queue")
      .select("broadcast_name, campaign_id, status, scheduled_at")
      .eq("contact_phone", cleanPhone)
      .not("broadcast_name", "is", null)
      .order("scheduled_at", { ascending: false })
      .limit(30);
    const seen = new Set<string>();
    const unique = (data || []).filter((r: any) => {
      const key = r.campaign_id || r.broadcast_name;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    setContactCampaigns(unique as unknown as CampaignRecord[]);
  }

  async function addToFunnel() {
    if (!selectedFunnelToAdd || !selected) return;
    setAddingToFunnel(true);
    const { data: steps } = await supabase
      .from("whatsapp_funnel_steps")
      .select("*")
      .eq("funnel_id", selectedFunnelToAdd)
      .eq("active", true)
      .order("step_order")
      .limit(1);
    const firstStep = steps?.[0];
    if (!firstStep) { toast.error("Funil sem etapas ativas"); setAddingToFunnel(false); return; }
    const funnel = funnels.find(f => f.id === selectedFunnelToAdd);
    const messageContent = (firstStep.config as any)?.custom_message || firstStep.label || "Mensagem do funil";
    const { error } = await supabase.from("whatsapp_message_queue").insert({
      contact_phone: selected.contact_phone.replace(/\D/g, ""),
      contact_name: selected.contact_name,
      message_content: messageContent,
      funnel_id: selectedFunnelToAdd,
      step_id: firstStep.id,
      status: "pending",
      scheduled_at: new Date().toISOString(),
      broadcast_name: `[CONV] ${funnel?.name || "Funil"}`,
      instance_id: selected.instance_id || null,
      tenant_id: selected.tenant_id,
    });
    if (!error) {
      toast.success(`Lead adicionado ao funil "${funnel?.name}"`);
      setSelectedFunnelToAdd("");
      loadContactCampaigns(selected.contact_phone);
    } else {
      toast.error("Erro ao adicionar ao funil");
    }
    setAddingToFunnel(false);
  }

  /* ── Actions ── */
  async function handleSend() {
    if (!messageText.trim() || !selected) return;
    setSending(true);
    try {
      if (inputMode === "note") {
        // Save as internal note (just add to notes, don't send via WhatsApp)
        toast.success("Nota privada salva!");
        setMessageText("");
        textareaRef.current?.focus();
        setSending(false);
        return;
      }
      const phoneToSend = ensureBrazilCountryCode(selected.contact_phone);
      const res = await supabase.functions.invoke("whatsapp-send", {
        body: { phone: phoneToSend, message: messageText, contact_name: selected.contact_name },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(typeof res.data.error === "string" ? res.data.error : JSON.stringify(res.data.error));
      await supabase.from("whatsapp_conversations").update({
        last_message: messageText.substring(0, 200),
        last_message_at: new Date().toISOString(),
      } as any).eq("id", selected.id);
      setMessageText("");
      textareaRef.current?.focus();
      await loadMessages(selected);
      loadConversations();
      toast.success("Mensagem enviada!");
    } catch (e: any) {
      toast.error(`Erro ao enviar: ${e.message}`);
    }
    setSending(false);
  }

  function applyTemplate(tpl: Template) {
    let content = tpl.content;
    if (selected) {
      content = content.split("{nome}").join(selected.contact_name || "");
      content = content.split("{Nome}").join(selected.contact_name || "");
    }
    content = parseSpintax(content);
    setMessageText(content);
    setShowCannedDropdown(false);
    setCannedFilter("");
    textareaRef.current?.focus();
  }

  async function updateConvStatus(status: string) {
    if (!selected) return;
    await supabase.from("whatsapp_conversations").update({ status } as any).eq("id", selected.id);
    setSelected({ ...selected, status });
    loadConversations();
    toast.success(`Conversa ${status === "archived" ? "arquivada" : status === "closed" ? "resolvida" : "reaberta"}`);
  }

  async function addTag() {
    if (!newTag.trim() || !selected) return;
    const updatedTags = [...(selected.tags || []), newTag.trim()];
    await supabase.from("whatsapp_conversations").update({ tags: updatedTags } as any).eq("id", selected.id);
    setSelected({ ...selected, tags: updatedTags });
    setNewTag("");
    loadConversations();
  }

  async function removeTag(tag: string) {
    if (!selected) return;
    const updatedTags = (selected.tags || []).filter((t) => t !== tag);
    await supabase.from("whatsapp_conversations").update({ tags: updatedTags } as any).eq("id", selected.id);
    setSelected({ ...selected, tags: updatedTags });
    loadConversations();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setMessageText(val);
    if (val === "/") { setShowCannedDropdown(true); setCannedFilter(""); }
    else if (val.startsWith("/") && val.length > 1) { setShowCannedDropdown(true); setCannedFilter(val.slice(1).toLowerCase()); }
    else { setShowCannedDropdown(false); setCannedFilter(""); }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  }

  /* ── Computed ── */
  const filtered = conversations.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.contact_name.toLowerCase().includes(q) || c.contact_phone.includes(q);
  });

  const unreadTotal = conversations.filter(c => c.unread_count > 0).length;

  const filteredTemplates = useMemo(() => {
    if (!cannedFilter) return templates;
    return templates.filter(t => t.name.toLowerCase().includes(cannedFilter) || t.content.toLowerCase().includes(cannedFilter));
  }, [templates, cannedFilter]);

  const groupedMessages = useMemo(() => {
    const groups: { date: Date; messages: Message[] }[] = [];
    messages.forEach(msg => {
      const d = new Date(msg.created_at);
      const last = groups[groups.length - 1];
      if (last && isSameDay(last.date, d)) last.messages.push(msg);
      else groups.push({ date: d, messages: [msg] });
    });
    return groups;
  }, [messages]);

  // Collect unique tags from all conversations for sidebar
  const allTags = useMemo(() => {
    const tagMap = new Map<string, number>();
    conversations.forEach(c => (c.tags || []).forEach(t => tagMap.set(t, (tagMap.get(t) || 0) + 1)));
    return Array.from(tagMap.entries()).sort((a, b) => b[1] - a[1]);
  }, [conversations]);

  const statusCfg = selected ? (STATUS_CONFIG[selected.status] || STATUS_CONFIG.open) : STATUS_CONFIG.open;

  /* ─────────── SIDEBAR NAV ITEM ─────────── */
  const NavItem = ({ icon: Icon, label, count, active, onClick }: { icon: any; label: string; count?: number; active?: boolean; onClick?: () => void }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded text-[13px] transition-colors ${
        active ? "bg-[#1F93FF]/10 text-[#1F93FF] font-semibold" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1 text-left truncate">{label}</span>
      {count !== undefined && count > 0 && (
        <span className={`text-[11px] font-semibold min-w-[20px] text-center rounded-full px-1.5 py-0.5 ${
          active ? "bg-[#1F93FF] text-white" : "bg-slate-200 text-slate-600"
        }`}>{count}</span>
      )}
    </button>
  );

  /* ─────────── SECTION HEADER ─────────── */
  const SectionHeader = ({ label, sectionKey, children }: { label: string; sectionKey: string; children?: React.ReactNode }) => (
    <Collapsible open={openSections[sectionKey]} onOpenChange={() => toggleSection(sectionKey)}>
      <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider hover:text-slate-600 transition-colors">
        <span>{label}</span>
        <ChevronRight className={`h-3 w-3 transition-transform ${openSections[sectionKey] ? "rotate-90" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-[calc(100vh-220px)] min-h-[500px] rounded-lg overflow-hidden border bg-white dark:bg-slate-950">

        {/* ════════════════════════════════════════════════════
            COLUMN 0 — LEFT SIDEBAR (~220px) — Chatwoot Navigation
           ════════════════════════════════════════════════════ */}
        <div className="w-[220px] flex-shrink-0 border-r bg-white dark:bg-slate-950 flex flex-col">
          {/* Logo / Brand */}
          <div className="px-3 py-3 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-[#1F93FF] flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Conversas</span>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500">
                  <Edit className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Nova conversa</TooltipContent>
            </Tooltip>
          </div>

          {/* Search */}
          <div className="px-3 py-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              <input
                placeholder="Buscar conversas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-[13px] rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1F93FF]/30 focus:border-[#1F93FF]"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="py-1">
              {/* Conversations section */}
              <SectionHeader label="Conversas" sectionKey="conversations">
                <div className="px-1 pb-2 space-y-0.5">
                  <NavItem icon={Inbox} label="Todas as conversas" count={conversations.length} active={filter === "all"} onClick={() => setFilter("all")} />
                  <NavItem icon={AtSign} label="Menções" onClick={() => setFilter("mentions")} />
                  <NavItem icon={UserX} label="Não atendidas" count={unreadTotal} active={filter === "unread"} onClick={() => setFilter("unread")} />
                </div>
              </SectionHeader>

              {/* Folders */}
              <SectionHeader label="Pastas" sectionKey="folders">
                <div className="px-1 pb-2 space-y-0.5">
                  <NavItem icon={Star} label="Prioritárias" onClick={() => {}} />
                  <NavItem icon={FolderOpen} label="Inbox de Leads" onClick={() => {}} />
                </div>
              </SectionHeader>

              {/* Teams */}
              <SectionHeader label="Equipes" sectionKey="teams">
                <div className="px-1 pb-2 space-y-0.5">
                  <NavItem icon={Users} label="Vendas" onClick={() => {}} />
                  <NavItem icon={Users} label="Suporte" onClick={() => {}} />
                </div>
              </SectionHeader>

              {/* Channels */}
              <SectionHeader label="Canais" sectionKey="channels">
                <div className="px-1 pb-2 space-y-0.5">
                  {instances.map(inst => (
                    <NavItem
                      key={inst.id}
                      icon={Megaphone}
                      label={inst.name}
                      active={selectedInstanceId === inst.id}
                      onClick={() => setSelectedInstanceId(selectedInstanceId === inst.id ? "all" : inst.id)}
                    />
                  ))}
                  {instances.length === 0 && (
                    <p className="text-[11px] text-slate-400 px-3 py-1">Nenhum canal</p>
                  )}
                </div>
              </SectionHeader>

              {/* Labels */}
              <SectionHeader label="Labels" sectionKey="labels">
                <div className="px-1 pb-2 space-y-0.5">
                  {allTags.map(([tag, count]) => (
                    <button
                      key={tag}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded text-[13px] text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      <span className={`h-2.5 w-2.5 rounded-full ${getLabelColor(tag)}`} />
                      <span className="flex-1 text-left truncate">{tag}</span>
                      <span className="text-[11px] text-slate-400">{count}</span>
                    </button>
                  ))}
                  {allTags.length === 0 && (
                    <p className="text-[11px] text-slate-400 px-3 py-1">Nenhuma label</p>
                  )}
                </div>
              </SectionHeader>
            </div>
          </ScrollArea>

          {/* User footer */}
          <div className="px-3 py-2 border-t flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-[#1F93FF] flex items-center justify-center">
              <User className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-[12px] text-slate-600 dark:text-slate-400 truncate">Admin</span>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════
            COLUMN 1 — CONVERSATION LIST (~300px)
           ════════════════════════════════════════════════════ */}
        <div className="w-[300px] flex-shrink-0 border-r flex flex-col bg-white dark:bg-slate-950">
          {/* Tabs: Mine / Unassigned / All */}
          <div className="flex border-b">
            {(["mine", "unassigned", "all"] as const).map(tab => {
              const labels = { mine: "Minhas", unassigned: "Não atrib.", all: "Todas" };
              const counts = {
                mine: filtered.filter(c => c.assigned_to).length,
                unassigned: filtered.filter(c => !c.assigned_to).length,
                all: filtered.length,
              };
              return (
                <button
                  key={tab}
                  onClick={() => setListTab(tab)}
                  className={`flex-1 py-2.5 text-[12px] font-medium transition-colors relative ${
                    listTab === tab
                      ? "text-[#1F93FF]"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {labels[tab]} {counts[tab] > 0 && <span className="ml-0.5 text-[11px]">({counts[tab]})</span>}
                  {listTab === tab && <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#1F93FF] rounded-full" />}
                </button>
              );
            })}
          </div>

          {/* Sort / Filter bar */}
          <div className="px-3 py-1.5 flex items-center justify-between border-b">
            <span className="text-[11px] text-slate-500 font-medium">
              {filter === "all" ? "Todas" : filter === "open" ? "Abertas" : filter === "unread" ? "Não lidas" : "Arquivadas"}
            </span>
            <div className="flex items-center gap-1">
              <button className="h-6 w-6 rounded hover:bg-slate-100 flex items-center justify-center text-slate-400">
                <Filter className="h-3 w-3" />
              </button>
              <button className="h-6 w-6 rounded hover:bg-slate-100 flex items-center justify-center text-slate-400">
                <ArrowUpDown className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Conversation List */}
          <ScrollArea className="flex-1">
            {filtered.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-medium">Nenhuma conversa</p>
              </div>
            ) : (
              <div>
                {filtered.map(conv => {
                  const active = selected?.id === conv.id;
                  const avatarColor = getAvatarColor(conv.contact_name || conv.contact_phone);
                  const initials = getInitials(conv.contact_name || conv.contact_phone);
                  const inst = instances.find(i => i.id === (conv as any).instance_id);
                  return (
                    <button
                      key={conv.id}
                      onClick={() => setSelected(conv)}
                      className={`w-full text-left px-3 py-3 border-b border-slate-100 dark:border-slate-800 transition-colors ${
                        active
                          ? "bg-[#1F93FF]/5 border-l-[3px] border-l-[#1F93FF]"
                          : "hover:bg-slate-50 dark:hover:bg-slate-900 border-l-[3px] border-l-transparent"
                      }`}
                    >
                      {/* Instance badge */}
                      {inst && (
                        <div className="flex items-center gap-1 mb-1">
                          <svg viewBox="0 0 24 24" className="h-3 w-3 text-green-500 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.612.638l4.716-1.244A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.135 0-4.118-.663-5.75-1.794l-.404-.27-2.804.74.753-2.756-.296-.417A9.958 9.958 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/></svg>
                          <span className="text-[10px] text-slate-400 truncate">{inst.name}</span>
                        </div>
                      )}
                      <div className="flex items-start gap-2.5">
                        {/* Avatar */}
                        <div className="h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: avatarColor }}>
                          <span className="text-white text-xs font-semibold">{initials}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-[13px] truncate ${conv.unread_count > 0 ? "font-bold text-slate-900 dark:text-white" : "font-medium text-slate-700 dark:text-slate-300"}`}>
                              {conv.contact_name || conv.contact_phone}
                            </span>
                            <span className="text-[10px] text-slate-400 flex-shrink-0">
                              {relativeTime(conv.last_message_at)}
                            </span>
                          </div>
                          <p className={`text-[12px] truncate mt-0.5 ${conv.unread_count > 0 ? "text-slate-800 dark:text-slate-200 font-medium" : "text-slate-500"}`}>
                            {conv.last_message || "Sem mensagens"}
                          </p>
                          {/* Tags + unread badge */}
                          <div className="flex items-center gap-1 mt-1">
                            {(conv.tags || []).slice(0, 2).map(tag => (
                              <span key={tag} className={`text-[9px] px-1.5 py-0.5 rounded-full text-white font-medium ${getLabelColor(tag)}`}>
                                {tag}
                              </span>
                            ))}
                            <div className="flex-1" />
                            {conv.unread_count > 0 && (
                              <span className="h-[18px] min-w-[18px] rounded-full bg-[#1F93FF] text-[10px] text-white font-bold flex items-center justify-center px-1">
                                {conv.unread_count}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* ════════════════════════════════════════════════════
            COLUMN 2 — CHAT AREA (flex)
           ════════════════════════════════════════════════════ */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-900/50">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <div className="h-20 w-20 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="h-10 w-10 opacity-30" />
                </div>
                <p className="text-sm font-medium">Selecione uma conversa</p>
                <p className="text-xs mt-1">Escolha um contato para iniciar</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="px-4 py-2 border-b bg-white dark:bg-slate-950 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full flex items-center justify-center" style={{ backgroundColor: getAvatarColor(selected.contact_name || selected.contact_phone) }}>
                    <span className="text-white text-xs font-semibold">
                      {getInitials(selected.contact_name || selected.contact_phone)}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-[14px] text-slate-900 dark:text-white">
                      {selected.contact_name || selected.contact_phone}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <svg viewBox="0 0 24 24" className="h-3 w-3 text-green-500 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.612.638l4.716-1.244A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.135 0-4.118-.663-5.75-1.794l-.404-.27-2.804.74.753-2.756-.296-.417A9.958 9.958 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/></svg>
                      <span>WhatsApp</span>
                      {showDetails && (
                        <button onClick={() => setShowDetails(false)} className="text-[#1F93FF] hover:underline ml-2">
                          Fechar detalhes
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {selected.status === "open" || selected.status === "pending" ? (
                    <Button
                      size="sm"
                      className="h-8 px-4 text-[12px] font-semibold bg-[#1F93FF] hover:bg-[#1780E0] text-white rounded-lg gap-1.5"
                      onClick={() => updateConvStatus("closed")}
                    >
                      <CheckCircle className="h-3.5 w-3.5" /> Resolver
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-4 text-[12px] font-semibold rounded-lg gap-1.5"
                      onClick={() => updateConvStatus("open")}
                    >
                      <CircleDot className="h-3.5 w-3.5" /> Reabrir
                    </Button>
                  )}
                </div>
              </div>

              {/* Chat sub-tabs: Messages / Customer Dashboard */}
              <div className="flex border-b bg-white dark:bg-slate-950 px-4">
                {(["messages", "dashboard"] as const).map(tab => {
                  const labels = { messages: "Mensagens", dashboard: "Painel do Cliente" };
                  return (
                    <button
                      key={tab}
                      onClick={() => setChatTab(tab)}
                      className={`px-3 py-2 text-[12px] font-medium relative transition-colors ${
                        chatTab === tab ? "text-[#1F93FF]" : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {labels[tab]}
                      {chatTab === tab && <div className="absolute bottom-0 left-1 right-1 h-[2px] bg-[#1F93FF] rounded-full" />}
                    </button>
                  );
                })}
              </div>

              {chatTab === "messages" ? (
                <>
                  {/* Messages */}
                  <ScrollArea className="flex-1">
                    <div className="px-4 py-3">
                      {messages.length === 0 && (
                        <p className="text-center text-sm text-slate-400 py-12">Nenhuma mensagem</p>
                      )}
                      {groupedMessages.map((group, gi) => (
                        <div key={gi}>
                          <div className="flex items-center justify-center my-4">
                            <span className="text-[11px] font-medium text-slate-500 bg-white dark:bg-slate-800 border rounded-full px-3 py-1 shadow-sm">
                              {formatDateLabel(group.date)}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {group.messages.map(msg => {
                              const isOut = msg.direction === "outbound";
                              return (
                                <div key={msg.id} className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
                                  <div
                                    className={`relative max-w-[70%] rounded-2xl px-4 py-2.5 text-[13px] shadow-sm ${
                                      isOut
                                        ? "bg-[#1F93FF] text-white rounded-br-md"
                                        : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-md"
                                    }`}
                                  >
                                    <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.message_content}</p>
                                    <div className={`flex items-center gap-1.5 mt-1 ${isOut ? "justify-end" : ""}`}>
                                      <span className={`text-[10px] ${isOut ? "text-blue-200" : "text-slate-400"}`}>
                                        {format(new Date(msg.created_at), "HH:mm")}
                                      </span>
                                      {isOut && (
                                        msg.status === "sent" ? (
                                          <CheckCircle className="h-3 w-3 text-blue-200" />
                                        ) : msg.status === "error" ? (
                                          <Tooltip>
                                            <TooltipTrigger><XCircle className="h-3 w-3 text-red-300" /></TooltipTrigger>
                                            <TooltipContent className="text-xs max-w-[200px]">{msg.error_message || "Erro"}</TooltipContent>
                                          </Tooltip>
                                        ) : (
                                          <Clock className="h-3 w-3 text-blue-200" />
                                        )
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Input area with Reply / Private Note tabs */}
                  <div className={`border-t ${inputMode === "note" ? "bg-amber-50 dark:bg-amber-950/30" : "bg-white dark:bg-slate-950"}`}>
                    {/* Reply / Note tabs */}
                    <div className="flex border-b px-3">
                      <button
                        onClick={() => setInputMode("reply")}
                        className={`px-3 py-2 text-[12px] font-medium relative ${
                          inputMode === "reply" ? "text-[#1F93FF]" : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        Responder
                        {inputMode === "reply" && <div className="absolute bottom-0 left-1 right-1 h-[2px] bg-[#1F93FF] rounded-full" />}
                      </button>
                      <button
                        onClick={() => setInputMode("note")}
                        className={`px-3 py-2 text-[12px] font-medium relative ${
                          inputMode === "note" ? "text-amber-600" : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        Nota Privada
                        {inputMode === "note" && <div className="absolute bottom-0 left-1 right-1 h-[2px] bg-amber-500 rounded-full" />}
                      </button>
                    </div>

                    {/* Toolbar */}
                    <div className="flex items-center gap-0.5 px-3 py-1 border-b">
                      {[Bold, Italic, Link2, Code, List].map((Icon, i) => (
                        <button key={i} className="h-7 w-7 rounded hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500">
                          <Icon className="h-3.5 w-3.5" />
                        </button>
                      ))}
                      <Separator orientation="vertical" className="h-4 mx-1" />
                      <button className="h-7 w-7 rounded hover:bg-slate-100 flex items-center justify-center text-slate-500">
                        <Smile className="h-3.5 w-3.5" />
                      </button>
                      <button className="h-7 w-7 rounded hover:bg-slate-100 flex items-center justify-center text-slate-500">
                        <Paperclip className="h-3.5 w-3.5" />
                      </button>
                      <button className="h-7 w-7 rounded hover:bg-slate-100 flex items-center justify-center text-slate-500">
                        <Mic className="h-3.5 w-3.5" />
                      </button>
                      <div className="flex-1" />
                      <button className="h-7 px-2 rounded bg-purple-100 text-purple-700 hover:bg-purple-200 flex items-center justify-center gap-1 text-[11px] font-medium">
                        <Bot className="h-3 w-3" /> AI Assist
                      </button>
                    </div>

                    {/* Canned responses dropdown */}
                    <div className="relative">
                      {showCannedDropdown && filteredTemplates.length > 0 && (
                        <div className="absolute bottom-full left-3 right-3 mb-1 bg-white dark:bg-slate-800 border rounded-lg shadow-xl max-h-48 overflow-auto z-50">
                          <div className="p-1.5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1">Respostas Rápidas</p>
                            {filteredTemplates.map(tpl => (
                              <button
                                key={tpl.id}
                                onClick={() => applyTemplate(tpl)}
                                className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-700 text-xs transition-colors flex items-start gap-2"
                              >
                                <Zap className="h-3 w-3 text-amber-500 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0">
                                  <span className="font-medium block text-slate-800 dark:text-slate-200">{tpl.name}</span>
                                  <span className="text-slate-500 line-clamp-1">{tpl.content.substring(0, 80)}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Text input */}
                    <div className="px-3 py-2">
                      <textarea
                        ref={textareaRef}
                        value={messageText}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder={inputMode === "note" ? "Adicionar nota privada..." : "Mensagem... (/ para respostas rápidas)"}
                        className={`w-full min-h-[60px] max-h-[120px] resize-none text-[13px] bg-transparent focus:outline-none placeholder:text-slate-400 ${
                          inputMode === "note" ? "text-amber-900 dark:text-amber-200" : "text-slate-800 dark:text-slate-200"
                        }`}
                        rows={2}
                      />
                    </div>

                    {/* Bottom bar */}
                    <div className="flex items-center justify-between px-3 py-2 border-t">
                      <p className="text-[10px] text-slate-400">
                        Shift+Enter nova linha · <span className="font-medium">/</span> respostas rápidas
                      </p>
                      <Button
                        size="sm"
                        className={`h-8 px-4 text-[12px] font-semibold rounded-lg gap-1.5 ${
                          inputMode === "note"
                            ? "bg-amber-500 hover:bg-amber-600 text-white"
                            : "bg-[#1F93FF] hover:bg-[#1780E0] text-white"
                        }`}
                        onClick={handleSend}
                        disabled={!messageText.trim() || sending}
                      >
                        <Send className="h-3.5 w-3.5" />
                        {inputMode === "note" ? "Salvar Nota" : "Enviar"}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                /* Customer Dashboard Tab */
                <div className="flex-1 flex items-center justify-center text-slate-400">
                  <div className="text-center">
                    <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">Painel do Cliente</p>
                    <p className="text-xs mt-1">Histórico de pedidos e interações</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ════════════════════════════════════════════════════
            COLUMN 3 — CONTACT / DETAILS PANEL (~300px)
           ════════════════════════════════════════════════════ */}
        {selected && showDetails && (
          <div className="w-[300px] flex-shrink-0 border-l flex flex-col bg-white dark:bg-slate-950">
            {/* Tabs */}
            <div className="flex border-b">
              {(["contact", "copilot"] as const).map(tab => {
                const labels = { contact: "Lead", copilot: "Copilot" };
                return (
                  <button key={tab} onClick={() => setContactTab(tab)}
                    className={`flex-1 py-2.5 text-[12px] font-medium relative transition-colors ${contactTab === tab ? "text-[#1F93FF]" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    {labels[tab]}
                    {contactTab === tab && <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#1F93FF] rounded-full" />}
                  </button>
                );
              })}
            </div>

            {contactTab === "contact" ? (
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">

                  {/* ── Avatar + name ── */}
                  <div className="flex flex-col items-center text-center">
                    <div className="h-14 w-14 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: getAvatarColor(selected.contact_name || selected.contact_phone) }}>
                      <span className="text-white text-lg font-bold">{getInitials(selected.contact_name || selected.contact_phone)}</span>
                    </div>
                    <h4 className="font-semibold text-[14px] text-slate-900 dark:text-white leading-tight">
                      {contactForm.name || selected.contact_name || "Sem nome"}
                    </h4>
                    {contactProfile?.converted && (
                      <Badge className="mt-1 h-4 text-[9px] bg-green-100 text-green-700 border-green-200">
                        <Check className="h-2.5 w-2.5 mr-0.5" /> Convertido
                      </Badge>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={() => window.open(`https://wa.me/${selected.contact_phone.replace(/\D/g, "")}`, "_blank")} className="h-7 w-7 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500 hover:text-green-600 transition-colors">
                        <ExternalLink className="h-3 w-3" />
                      </button>
                      <button onClick={() => setEditingContact(e => !e)} className={`h-7 w-7 rounded-lg border flex items-center justify-center transition-colors ${editingContact ? "border-[#1F93FF] bg-[#1F93FF]/10 text-[#1F93FF]" : "border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-[#1F93FF]"}`}>
                        <Edit className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  <Separator />

                  {/* ── Dados do Lead ── */}
                  <Collapsible defaultOpen>
                    <CollapsibleTrigger className="w-full flex items-center justify-between py-1.5 text-[12px] font-semibold text-slate-700 dark:text-slate-300 hover:text-[#1F93FF] transition-colors">
                      <span>Dados do Lead</span>
                      <ChevronRight className={`h-3.5 w-3.5 transition-transform ${true ? "rotate-90" : ""}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="space-y-2 pb-2">
                        {/* Phone (read-only) */}
                        <div className="flex items-center gap-2 py-1 group">
                          <Phone className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                          <span className="text-[12px] text-slate-700 dark:text-slate-300 flex-1">{selected.contact_phone}</span>
                          <button onClick={() => copyToClipboard(selected.contact_phone)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 transition-opacity">
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>

                        {editingContact ? (
                          <div className="space-y-2">
                            <div>
                              <Label className="text-[10px] text-slate-500 mb-0.5 block">Nome</Label>
                              <Input value={contactForm.name} onChange={e => setContactForm(p => ({ ...p, name: e.target.value }))} className="h-7 text-[12px]" placeholder="Nome completo" />
                            </div>
                            <div>
                              <Label className="text-[10px] text-slate-500 mb-0.5 block">E-mail</Label>
                              <Input value={contactForm.email} onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))} className="h-7 text-[12px]" placeholder="email@exemplo.com" type="email" />
                            </div>
                            <div>
                              <Label className="text-[10px] text-slate-500 mb-0.5 block">Origem / Anúncio</Label>
                              <Input value={contactForm.ad_source} onChange={e => setContactForm(p => ({ ...p, ad_source: e.target.value }))} className="h-7 text-[12px]" placeholder="ex: Google Ads, Instagram" />
                            </div>
                            <div>
                              <Label className="text-[10px] text-slate-500 mb-0.5 block">Notas</Label>
                              <Textarea value={contactForm.notes} onChange={e => setContactForm(p => ({ ...p, notes: e.target.value }))} className="min-h-[56px] text-[12px] resize-none" placeholder="Observações sobre este lead..." rows={3} />
                            </div>
                            <div className="flex gap-1.5">
                              <Button size="sm" className="flex-1 h-7 text-[11px] gap-1 bg-[#1F93FF] hover:bg-[#1780E0] text-white" onClick={saveContactProfile} disabled={savingContact}>
                                {savingContact ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                Salvar
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setEditingContact(false)}>
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {contactProfile?.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                                <span className="text-[12px] text-slate-700 dark:text-slate-300 truncate">{contactProfile.email}</span>
                              </div>
                            )}
                            {(contactProfile as any)?.ad_source && (
                              <div className="flex items-center gap-2">
                                <Globe className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                                <span className="text-[12px] text-slate-700 dark:text-slate-300 truncate">{(contactProfile as any).ad_source}</span>
                              </div>
                            )}
                            {contactProfile?.notes && (
                              <div className="flex items-start gap-2 mt-1">
                                <StickyNote className="h-3.5 w-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">{contactProfile.notes}</p>
                              </div>
                            )}
                            {!contactProfile && (
                              <button onClick={() => setEditingContact(true)} className="text-[11px] text-[#1F93FF] hover:underline flex items-center gap-1 mt-1">
                                <Plus className="h-3 w-3" /> Adicionar dados do lead
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  <Separator />

                  {/* ── Adicionar ao Funil ── */}
                  <Collapsible defaultOpen>
                    <CollapsibleTrigger className="w-full flex items-center justify-between py-1.5 text-[12px] font-semibold text-slate-700 dark:text-slate-300 hover:text-[#1F93FF] transition-colors">
                      <span className="flex items-center gap-1.5"><GitBranch className="h-3.5 w-3.5" /> Adicionar ao Funil</span>
                      <ChevronRight className="h-3.5 w-3.5 rotate-90" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="pb-2 space-y-2">
                        <Select value={selectedFunnelToAdd} onValueChange={setSelectedFunnelToAdd}>
                          <SelectTrigger className="h-7 text-[12px]">
                            <SelectValue placeholder="Selecionar funil..." />
                          </SelectTrigger>
                          <SelectContent>
                            {funnels.map(f => (
                              <SelectItem key={f.id} value={f.id} className="text-[12px]">{f.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" className="w-full h-7 text-[11px] bg-[#1F93FF] hover:bg-[#1780E0] text-white gap-1" onClick={addToFunnel} disabled={!selectedFunnelToAdd || addingToFunnel}>
                          {addingToFunnel ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                          Enfileirar no Funil
                        </Button>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  <Separator />

                  {/* ── Labels ── */}
                  <Collapsible defaultOpen>
                    <CollapsibleTrigger className="w-full flex items-center justify-between py-1.5 text-[12px] font-semibold text-slate-700 dark:text-slate-300 hover:text-[#1F93FF] transition-colors">
                      <span className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> Labels</span>
                      <Plus className="h-3.5 w-3.5" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="space-y-2 pb-2">
                        <div className="flex flex-wrap gap-1">
                          {(selected.tags || []).map(tag => (
                            <Badge key={tag} className={`text-[10px] gap-1 pr-1 h-5 border-0 text-white ${getLabelColor(tag)}`}>
                              {tag}
                              <button onClick={() => removeTag(tag)} className="hover:text-red-200 ml-0.5"><X className="h-2.5 w-2.5" /></button>
                            </Badge>
                          ))}
                        </div>
                        <div className="flex gap-1">
                          <Input placeholder="Nova label..." value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === "Enter" && addTag()} className="h-7 text-[11px] border-slate-200" />
                          <Button size="sm" variant="outline" className="h-7 w-7 p-0 flex-shrink-0" onClick={addTag}><Plus className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  <Separator />

                  {/* ── Ações da Conversa ── */}
                  <Collapsible open={openSections.convActions} onOpenChange={() => toggleSection("convActions")}>
                    <CollapsibleTrigger className="w-full flex items-center justify-between py-1.5 text-[12px] font-semibold text-slate-700 dark:text-slate-300 hover:text-[#1F93FF] transition-colors">
                      <span>Ações da Conversa</span>
                      <ChevronRight className={`h-3.5 w-3.5 transition-transform ${openSections.convActions ? "rotate-90" : ""}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="space-y-2 pb-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-500">Status</span>
                          <span className={`text-[11px] font-medium ${statusCfg.color}`}>{statusCfg.label}</span>
                        </div>
                        <div className="flex gap-1">
                          {selected.status !== "archived" && (
                            <Button size="sm" variant="outline" className="h-7 text-[11px] flex-1 gap-1" onClick={() => updateConvStatus("archived")}>
                              <Archive className="h-3 w-3" /> Arquivar
                            </Button>
                          )}
                          {selected.status === "archived" && (
                            <Button size="sm" variant="outline" className="h-7 text-[11px] flex-1 gap-1" onClick={() => updateConvStatus("open")}>
                              <CircleDot className="h-3 w-3" /> Reabrir
                            </Button>
                          )}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  <Separator />

                  {/* ── Campanhas / Histórico de Origem ── */}
                  <Collapsible defaultOpen>
                    <CollapsibleTrigger className="w-full flex items-center justify-between py-1.5 text-[12px] font-semibold text-slate-700 dark:text-slate-300 hover:text-[#1F93FF] transition-colors">
                      <span className="flex items-center gap-1.5"><Megaphone className="h-3.5 w-3.5" /> Campanhas</span>
                      <ChevronRight className="h-3.5 w-3.5 rotate-90" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="pb-2 space-y-1.5">
                        {contactCampaigns.length === 0 ? (
                          <p className="text-[11px] text-slate-400">Nenhuma campanha registrada</p>
                        ) : contactCampaigns.map((c, i) => (
                          <div key={i} className="flex items-start gap-2 py-1 px-1.5 rounded bg-slate-50 dark:bg-slate-900">
                            <Megaphone className="h-3 w-3 text-slate-400 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate">{c.broadcast_name}</p>
                              <p className="text-[10px] text-slate-400">{format(new Date(c.scheduled_at), "dd/MM/yy HH:mm")}</p>
                            </div>
                            <Badge variant="outline" className={`text-[9px] h-4 flex-shrink-0 ${c.status === "sent" ? "border-green-300 text-green-600" : c.status === "error" ? "border-red-300 text-red-600" : "border-slate-300 text-slate-500"}`}>
                              {c.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  <Separator />

                  {/* ── Informações ── */}
                  <Collapsible open={openSections.convInfo} onOpenChange={() => toggleSection("convInfo")}>
                    <CollapsibleTrigger className="w-full flex items-center justify-between py-1.5 text-[12px] font-semibold text-slate-700 dark:text-slate-300 hover:text-[#1F93FF] transition-colors">
                      <span>Informações</span>
                      <ChevronRight className={`h-3.5 w-3.5 transition-transform ${openSections.convInfo ? "rotate-90" : ""}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="space-y-1.5 pb-2 text-[12px]">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Criada em</span>
                          <span className="text-slate-700 dark:text-slate-300 font-medium">{format(new Date(selected.created_at), "dd/MM/yy HH:mm")}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Última msg</span>
                          <span className="text-slate-700 dark:text-slate-300 font-medium">{formatDistanceToNow(new Date(selected.last_message_at), { addSuffix: true, locale: ptBR })}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Total msgs</span>
                          <span className="text-slate-700 dark:text-slate-300 font-medium">{messages.length}</span>
                        </div>
                        {contactProfile && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Origem</span>
                            <span className="text-slate-700 dark:text-slate-300 font-medium capitalize">{contactProfile.source}</span>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  <Separator />

                  {/* ── Conversas Anteriores ── */}
                  <Collapsible open={openSections.prevConvs} onOpenChange={() => toggleSection("prevConvs")}>
                    <CollapsibleTrigger className="w-full flex items-center justify-between py-1.5 text-[12px] font-semibold text-slate-700 dark:text-slate-300 hover:text-[#1F93FF] transition-colors">
                      <span>Conversas Anteriores {prevConversations.length > 0 && `(${prevConversations.length})`}</span>
                      <ChevronRight className={`h-3.5 w-3.5 transition-transform ${openSections.prevConvs ? "rotate-90" : ""}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="pb-2 space-y-1.5">
                        {prevConversations.length === 0 ? (
                          <p className="text-[11px] text-slate-400">Nenhuma conversa anterior</p>
                        ) : prevConversations.map(c => {
                          const inst = instances.find(i => i.id === c.instance_id);
                          return (
                            <button key={c.id} onClick={() => setSelected(c)}
                              className="w-full text-left flex items-start gap-2 py-1.5 px-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                            >
                              <MessageCircle className="h-3.5 w-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] text-slate-700 dark:text-slate-300 truncate">{c.last_message || "Sem mensagens"}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[10px] text-slate-400">{relativeTime(c.last_message_at)}</span>
                                  {inst && <span className="text-[10px] text-slate-400">· {inst.name}</span>}
                                  <Badge variant="outline" className={`text-[9px] h-3.5 ml-auto ${STATUS_CONFIG[c.status]?.color}`}>{STATUS_CONFIG[c.status]?.label || c.status}</Badge>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                </div>
              </ScrollArea>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400">
                <div className="text-center px-6">
                  <Bot className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-[13px] font-medium">AI Copilot</p>
                  <p className="text-[11px] mt-1">Respostas sugeridas com base no contexto da conversa</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
