import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Search, Send, MessageSquare, User, Phone, Tag, Archive,
  CheckCircle, XCircle, Clock, FileText, ExternalLink, X, Plus,
  ChevronRight, Inbox, MailOpen, Hash, StickyNote, Info, Zap,
  CircleDot, PanelRightClose, PanelRightOpen,
} from "lucide-react";
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

/* ───────── Helpers ───────── */
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
  "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500",
  "bg-violet-500", "bg-cyan-500", "bg-pink-500", "bg-teal-500",
  "bg-orange-500", "bg-indigo-500",
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
  open: { label: "Aberta", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", dotColor: "bg-blue-500" },
  pending: { label: "Pendente", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", dotColor: "bg-amber-500" },
  closed: { label: "Resolvida", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", dotColor: "bg-emerald-500" },
  archived: { label: "Arquivada", color: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400", dotColor: "bg-slate-400" },
};

type FilterStatus = "all" | "open" | "unread" | "archived";

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
  const [diagnosticInfo, setDiagnosticInfo] = useState("");
  const [showCannedDropdown, setShowCannedDropdown] = useState(false);
  const [cannedFilter, setCannedFilter] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* ── Data loading ── */
  useEffect(() => {
    loadConversations();
    loadTemplates();
    loadInstances();
  }, []);

  useEffect(() => {
    if (selected) loadMessages(selected);
  }, [selected?.id]);

  useEffect(() => { loadConversations(); }, [filter, selectedInstanceId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("wa-conversations-chatwoot")
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_conversations" }, () => {
        loadConversations();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "whatsapp_message_log" }, (payload) => {
        const newMsg = payload.new as any;
        if (selected && newMsg.contact_phone === selected.contact_phone) {
          setMessages(prev => [...prev, newMsg as Message]);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selected?.contact_phone]);

  async function loadInstances() {
    const { data } = await supabase.from("whatsapp_instances").select("id, name, status").eq("active", true).order("name");
    const inst = (data || []) as unknown as { id: string; name: string; status: string }[];
    setInstances(inst);
    if (inst.length === 0) setDiagnosticInfo("Nenhuma instância WhatsApp cadastrada.");
    else if (inst.every(i => i.status !== "connected")) setDiagnosticInfo("Nenhuma instância conectada.");
    else setDiagnosticInfo("");
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
    const { data } = await supabase
      .from("whatsapp_message_log")
      .select("*")
      .eq("contact_phone", conv.contact_phone)
      .order("created_at", { ascending: true })
      .limit(500);
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

  /* ── Actions ── */
  async function handleSend() {
    if (!messageText.trim() || !selected) return;
    setSending(true);
    try {
      const res = await supabase.functions.invoke("whatsapp-send", {
        body: { phone: selected.contact_phone, message: messageText, contact_name: selected.contact_name },
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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setMessageText(val);
    if (val === "/") {
      setShowCannedDropdown(true);
      setCannedFilter("");
    } else if (val.startsWith("/") && val.length > 1) {
      setShowCannedDropdown(true);
      setCannedFilter(val.slice(1).toLowerCase());
    } else {
      setShowCannedDropdown(false);
      setCannedFilter("");
    }
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

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { date: Date; messages: Message[] }[] = [];
    messages.forEach(msg => {
      const d = new Date(msg.created_at);
      const last = groups[groups.length - 1];
      if (last && isSameDay(last.date, d)) {
        last.messages.push(msg);
      } else {
        groups.push({ date: d, messages: [msg] });
      }
    });
    return groups;
  }, [messages]);

  const sidebarFilters: { value: FilterStatus; icon: typeof Inbox; label: string; count?: number }[] = [
    { value: "all", icon: Inbox, label: "Todas", count: conversations.length },
    { value: "open", icon: MessageSquare, label: "Abertas" },
    { value: "unread", icon: MailOpen, label: "Não lidas", count: unreadTotal || undefined },
    { value: "archived", icon: Archive, label: "Arquivadas" },
  ];

  const statusCfg = selected ? (STATUS_CONFIG[selected.status] || STATUS_CONFIG.open) : STATUS_CONFIG.open;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-[calc(100vh-220px)] min-h-[500px] rounded-lg overflow-hidden border bg-background">

        {/* ═══ Column 0 — Mini Sidebar (56px) ═══ */}
        <div className="w-14 flex-shrink-0 bg-slate-900 dark:bg-slate-950 flex flex-col items-center py-3 gap-1">
          {sidebarFilters.map(f => {
            const Icon = f.icon;
            const active = filter === f.value;
            return (
              <Tooltip key={f.value}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setFilter(f.value)}
                    className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                      active ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                    {f.count && f.count > 0 && f.value === "unread" && (
                      <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] rounded-full bg-red-500 text-[9px] text-white font-bold flex items-center justify-center px-1">
                        {f.count}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">{f.label}</TooltipContent>
              </Tooltip>
            );
          })}

          <Separator className="my-2 w-6 bg-slate-700" />

          {/* Label/tag icon */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                <Hash className="h-[18px] w-[18px]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">Labels</TooltipContent>
          </Tooltip>
        </div>

        {/* ═══ Column 1 — Conversation List (300px) ═══ */}
        <div className="w-[300px] flex-shrink-0 border-r flex flex-col bg-background">
          {/* Header */}
          <div className="px-3 pt-3 pb-2 border-b space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Conversas</h3>
              <Badge variant="secondary" className="text-[10px] h-5">{filtered.length}</Badge>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar nome ou número..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            {instances.length > 1 && (
              <select
                value={selectedInstanceId}
                onChange={(e) => setSelectedInstanceId(e.target.value)}
                className="w-full h-7 text-[11px] border rounded px-2 bg-background"
              >
                <option value="all">Todas instâncias</option>
                {instances.map(inst => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name} {inst.status === "connected" ? "🟢" : "🔴"}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* List */}
          <ScrollArea className="flex-1">
            {filtered.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-medium">Nenhuma conversa</p>
                {diagnosticInfo && <p className="text-[11px] mt-1 px-4">{diagnosticInfo}</p>}
              </div>
            ) : (
              <div>
                {filtered.map(conv => {
                  const active = selected?.id === conv.id;
                  const avatarColor = getAvatarColor(conv.contact_name || conv.contact_phone);
                  const initials = getInitials(conv.contact_name || conv.contact_phone);
                  const convStatus = STATUS_CONFIG[conv.status] || STATUS_CONFIG.open;
                  return (
                    <button
                      key={conv.id}
                      onClick={() => setSelected(conv)}
                      className={`w-full text-left px-3 py-2.5 border-b border-border/40 transition-colors ${
                        active
                          ? "bg-blue-50 dark:bg-blue-950/30 border-l-2 border-l-blue-500"
                          : "hover:bg-muted/50 border-l-2 border-l-transparent"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {/* Avatar */}
                        <div className={`h-9 w-9 rounded-full ${avatarColor} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          <span className="text-white text-xs font-semibold">{initials}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-sm truncate ${conv.unread_count > 0 ? "font-bold" : "font-medium"}`}>
                              {conv.contact_name || conv.contact_phone}
                            </span>
                            <span className="text-[10px] text-muted-foreground flex-shrink-0">
                              {relativeTime(conv.last_message_at)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-0.5 gap-1">
                            <p className={`text-[11px] truncate pr-1 ${conv.unread_count > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                              {conv.last_message || "Sem mensagens"}
                            </p>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {conv.unread_count > 0 && (
                                <span className="h-[18px] min-w-[18px] rounded-full bg-blue-500 text-[9px] text-white font-bold flex items-center justify-center px-1">
                                  {conv.unread_count}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Tags preview */}
                          {conv.tags && conv.tags.length > 0 && (
                            <div className="flex gap-1 mt-1 overflow-hidden">
                              {conv.tags.slice(0, 2).map(tag => (
                                <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground truncate max-w-[80px]">
                                  {tag}
                                </span>
                              ))}
                              {conv.tags.length > 2 && (
                                <span className="text-[9px] text-muted-foreground">+{conv.tags.length - 2}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* ═══ Column 2 — Chat Area ═══ */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-900/30">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="h-10 w-10 opacity-30" />
                </div>
                <p className="text-sm font-medium">Selecione uma conversa</p>
                <p className="text-xs mt-1 text-muted-foreground">Escolha um contato ao lado para iniciar</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="px-4 py-2.5 border-b bg-background flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-full ${getAvatarColor(selected.contact_name || selected.contact_phone)} flex items-center justify-center`}>
                    <span className="text-white text-xs font-semibold">
                      {getInitials(selected.contact_name || selected.contact_phone)}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm">{selected.contact_name || selected.contact_phone}</h4>
                      <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusCfg.color}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dotColor}`} />
                        {statusCfg.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {selected.contact_phone}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {selected.status === "open" ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-8 px-2 text-xs gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => updateConvStatus("closed")}>
                          <CheckCircle className="h-3.5 w-3.5" /> Resolver
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="text-xs">Marcar como resolvida</TooltipContent>
                    </Tooltip>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-8 px-2 text-xs gap-1" onClick={() => updateConvStatus("open")}>
                          <CircleDot className="h-3.5 w-3.5" /> Reabrir
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="text-xs">Reabrir conversa</TooltipContent>
                    </Tooltip>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => updateConvStatus(selected.status === "archived" ? "open" : "archived")}>
                        <Archive className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">{selected.status === "archived" ? "Desarquivar" : "Arquivar"}</TooltipContent>
                  </Tooltip>
                  <Separator orientation="vertical" className="h-5 mx-1" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setShowDetails(!showDetails)}>
                        {showDetails ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">{showDetails ? "Ocultar detalhes" : "Mostrar detalhes"}</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* Messages with date separators */}
              <ScrollArea className="flex-1">
                <div className="px-4 py-3 max-w-2xl mx-auto">
                  {messages.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-12">Nenhuma mensagem nesta conversa</p>
                  )}
                  {groupedMessages.map((group, gi) => (
                    <div key={gi}>
                      {/* Date separator */}
                      <div className="flex items-center justify-center my-3">
                        <span className="text-[10px] font-medium text-muted-foreground bg-background border rounded-full px-3 py-1 shadow-sm">
                          {formatDateLabel(group.date)}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {group.messages.map(msg => {
                          const isOut = msg.direction === "outbound";
                          return (
                            <div key={msg.id} className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
                              <div
                                className={`relative max-w-[75%] rounded-xl px-3 py-2 text-sm shadow-sm ${
                                  isOut
                                    ? "bg-emerald-100 dark:bg-emerald-900/40 text-foreground rounded-br-sm"
                                    : "bg-background border rounded-bl-sm"
                                }`}
                              >
                                <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.message_content}</p>
                                <div className={`flex items-center gap-1 mt-1 ${isOut ? "justify-end" : ""}`}>
                                  <span className="text-[10px] text-muted-foreground">
                                    {format(new Date(msg.created_at), "HH:mm")}
                                  </span>
                                  {isOut && (
                                    msg.status === "sent" ? (
                                      <CheckCircle className="h-3 w-3 text-blue-500" />
                                    ) : msg.status === "error" ? (
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <XCircle className="h-3 w-3 text-destructive" />
                                        </TooltipTrigger>
                                        <TooltipContent className="text-xs max-w-[200px]">{msg.error_message || "Erro ao enviar"}</TooltipContent>
                                      </Tooltip>
                                    ) : (
                                      <Clock className="h-3 w-3 text-muted-foreground" />
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

              {/* Input area */}
              <div className="border-t bg-background p-3 relative">
                {/* Canned responses dropdown */}
                {showCannedDropdown && filteredTemplates.length > 0 && (
                  <div className="absolute bottom-full left-3 right-3 mb-1 bg-popover border rounded-lg shadow-lg max-h-48 overflow-auto z-50">
                    <div className="p-1.5">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase px-2 py-1">Respostas rápidas</p>
                      {filteredTemplates.map(tpl => (
                        <button
                          key={tpl.id}
                          onClick={() => applyTemplate(tpl)}
                          className="w-full text-left px-2 py-1.5 rounded hover:bg-muted text-xs transition-colors flex items-start gap-2"
                        >
                          <Zap className="h-3 w-3 text-amber-500 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <span className="font-medium block">{tpl.name}</span>
                            <span className="text-muted-foreground line-clamp-1">{tpl.content.substring(0, 80)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-end gap-2 max-w-2xl mx-auto">
                  <Textarea
                    ref={textareaRef}
                    value={messageText}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder='Mensagem... (/ para respostas rápidas)'
                    className="min-h-[40px] max-h-[120px] resize-none text-sm bg-muted/30 border-muted"
                    rows={1}
                  />
                  <Button
                    className="h-10 w-10 p-0 flex-shrink-0 rounded-full bg-blue-600 hover:bg-blue-700"
                    onClick={handleSend}
                    disabled={!messageText.trim() || sending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 text-center">
                  Enter para enviar · Shift+Enter para nova linha · <span className="font-medium">/</span> para respostas rápidas
                </p>
              </div>
            </>
          )}
        </div>

        {/* ═══ Column 3 — Contact Panel (280px) ═══ */}
        {selected && showDetails && (
          <div className="w-[280px] flex-shrink-0 border-l flex flex-col bg-background">
            {/* Contact header */}
            <div className="p-4 border-b">
              <div className="flex flex-col items-center text-center">
                <div className={`h-16 w-16 rounded-full ${getAvatarColor(selected.contact_name || selected.contact_phone)} flex items-center justify-center mb-2`}>
                  <span className="text-white text-lg font-bold">
                    {getInitials(selected.contact_name || selected.contact_phone)}
                  </span>
                </div>
                <h4 className="font-semibold text-sm">{selected.contact_name || "Sem nome"}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">{selected.contact_phone}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 h-7 text-[11px] gap-1"
                  onClick={() => window.open(`https://wa.me/${selected.contact_phone.replace(/\D/g, "")}`, "_blank")}
                >
                  <ExternalLink className="h-3 w-3" /> Abrir no WhatsApp
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">

                {/* Info section */}
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                    <Info className="h-3 w-3" /> Informações
                  </p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Primeira interação</span>
                      <span className="font-medium">{format(new Date(selected.created_at), "dd/MM/yy")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total de msgs</span>
                      <span className="font-medium">{messages.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Última msg</span>
                      <span className="font-medium">
                        {formatDistanceToNow(new Date(selected.last_message_at), { addSuffix: true, locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusCfg.color}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dotColor}`} />
                        {statusCfg.label}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Tags / Labels */}
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                    <Tag className="h-3 w-3" /> Labels
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {(selected.tags || []).map(tag => (
                      <Badge key={tag} variant="secondary" className="text-[10px] gap-1 pr-1 h-5">
                        {tag}
                        <button onClick={() => removeTag(tag)} className="hover:text-destructive ml-0.5">
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    ))}
                    {(!selected.tags || selected.tags.length === 0) && (
                      <span className="text-[11px] text-muted-foreground">Nenhuma label</span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Input
                      placeholder="Adicionar label..."
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addTag()}
                      className="h-7 text-[11px]"
                    />
                    <Button size="sm" variant="outline" className="h-7 w-7 p-0 flex-shrink-0" onClick={addTag}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Notes */}
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                    <StickyNote className="h-3 w-3" /> Notas internas
                  </p>
                  <Textarea
                    value={contactNote}
                    onChange={(e) => setContactNote(e.target.value)}
                    placeholder="Anotações sobre este contato..."
                    className="min-h-[60px] text-[11px] resize-none"
                    rows={3}
                  />
                </div>

                <Separator />

                {/* Quick actions */}
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase">Ações</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {selected.status === "open" ? (
                      <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => updateConvStatus("closed")}>
                        <CheckCircle className="h-3 w-3" /> Resolver
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => updateConvStatus("open")}>
                        <CircleDot className="h-3 w-3" /> Reabrir
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={selected.status === "archived" ? "default" : "outline"}
                      className="h-7 text-[10px] gap-1"
                      onClick={() => updateConvStatus(selected.status === "archived" ? "open" : "archived")}
                    >
                      <Archive className="h-3 w-3" />
                      {selected.status === "archived" ? "Desarq." : "Arquivar"}
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
