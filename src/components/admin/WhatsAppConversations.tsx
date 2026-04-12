import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Search, Send, MessageSquare, User, Phone, Tag, Archive,
  CheckCircle, XCircle, Clock, FileText, ExternalLink, X, Plus,
  ChevronRight, Inbox, MailOpen,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

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

type FilterStatus = "all" | "open" | "unread" | "archived";

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
  const [instances, setInstances] = useState<{ id: string; name: string; status: string }[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>("all");
  const [diagnosticInfo, setDiagnosticInfo] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadConversations();
    loadTemplates();
    loadInstances();
  }, []);

  useEffect(() => {
    if (selected) loadMessages(selected);
  }, [selected?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("wa-conversations")
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_conversations" }, () => {
        loadConversations();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function loadConversations() {
    let query = supabase
      .from("whatsapp_conversations")
      .select("*")
      .order("last_message_at", { ascending: false })
      .limit(200);

    if (filter === "open") query = query.eq("status", "open");
    else if (filter === "archived") query = query.eq("status", "archived");
    else if (filter === "unread") query = query.gt("unread_count", 0);

    const { data } = await query;
    setConversations((data || []) as unknown as Conversation[]);
  }

  useEffect(() => { loadConversations(); }, [filter]);

  async function loadMessages(conv: Conversation) {
    const { data } = await supabase
      .from("whatsapp_message_log")
      .select("*")
      .eq("contact_phone", conv.contact_phone)
      .order("created_at", { ascending: true })
      .limit(500);
    setMessages((data || []) as unknown as Message[]);

    // Mark as read
    if (conv.unread_count > 0) {
      await supabase
        .from("whatsapp_conversations")
        .update({ unread_count: 0 } as any)
        .eq("id", conv.id);
      setSelected({ ...conv, unread_count: 0 });
    }
  }

  async function loadTemplates() {
    const { data } = await supabase
      .from("whatsapp_templates")
      .select("id, name, content, active")
      .eq("active", true)
      .order("name");
    setTemplates((data || []) as unknown as Template[]);
  }

  async function handleSend() {
    if (!messageText.trim() || !selected) return;
    setSending(true);
    try {
      const res = await supabase.functions.invoke("whatsapp-send", {
        body: {
          phone: selected.contact_phone,
          message: messageText,
          contact_name: selected.contact_name,
        },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(typeof res.data.error === "string" ? res.data.error : JSON.stringify(res.data.error));

      // Update conversation
      await supabase
        .from("whatsapp_conversations")
        .update({
          last_message: messageText.substring(0, 200),
          last_message_at: new Date().toISOString(),
        } as any)
        .eq("id", selected.id);

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
    textareaRef.current?.focus();
  }

  async function updateConvStatus(status: string) {
    if (!selected) return;
    await supabase.from("whatsapp_conversations").update({ status } as any).eq("id", selected.id);
    setSelected({ ...selected, status });
    loadConversations();
    toast.success(`Conversa ${status === "archived" ? "arquivada" : status === "closed" ? "fechada" : "reaberta"}`);
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

  const filtered = conversations.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.contact_name.toLowerCase().includes(q) || c.contact_phone.includes(q);
  });

  const filterButtons: { value: FilterStatus; label: string; icon: typeof Inbox }[] = [
    { value: "all", label: "Todas", icon: Inbox },
    { value: "open", label: "Abertas", icon: MessageSquare },
    { value: "unread", label: "Não lidas", icon: MailOpen },
    { value: "archived", label: "Arquivadas", icon: Archive },
  ];

  return (
    <div className="flex h-[calc(100vh-220px)] min-h-[500px] border rounded-lg overflow-hidden bg-background">
      {/* Column 1 — Conversation List */}
      <div className="w-80 flex-shrink-0 border-r flex flex-col">
        <div className="p-3 border-b space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar contato..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <div className="flex gap-1">
            {filterButtons.map((f) => (
              <Button
                key={f.value}
                size="sm"
                variant={filter === f.value ? "default" : "ghost"}
                className="h-7 text-[11px] px-2 flex-1"
                onClick={() => setFilter(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>

        <ScrollArea className="flex-1">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>Nenhuma conversa</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelected(conv)}
                  className={`w-full text-left px-3 py-3 hover:bg-muted/50 transition-colors ${
                    selected?.id === conv.id ? "bg-muted" : ""
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate">
                          {conv.contact_name || conv.contact_phone}
                        </span>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">
                          {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false, locale: ptBR })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-muted-foreground truncate pr-2">
                          {conv.last_message || "Sem mensagens"}
                        </p>
                        {conv.unread_count > 0 && (
                          <Badge className="h-5 min-w-[20px] text-[10px] px-1.5 bg-primary">
                            {conv.unread_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Column 2 — Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Selecione uma conversa</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="px-4 py-3 border-b flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{selected.contact_name || selected.contact_phone}</h4>
                  <p className="text-[11px] text-muted-foreground">{selected.contact_phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant={selected.status === "open" ? "default" : "secondary"} className="text-[10px]">
                  {selected.status === "open" ? "Aberta" : selected.status === "archived" ? "Arquivada" : "Fechada"}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => setShowDetails(!showDetails)}
                >
                  <ChevronRight className={`h-4 w-4 transition-transform ${showDetails ? "" : "rotate-180"}`} />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-4 py-3">
              <div className="space-y-2 max-w-2xl mx-auto">
                {messages.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">Nenhuma mensagem nesta conversa</p>
                )}
                {messages.map((msg) => {
                  const isOutbound = msg.direction === "outbound";
                  return (
                    <div key={msg.id} className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                          isOutbound
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted rounded-bl-sm"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.message_content}</p>
                        <div className={`flex items-center gap-1 mt-1 ${isOutbound ? "justify-end" : ""}`}>
                          <span className={`text-[10px] ${isOutbound ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                            {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                          </span>
                          {isOutbound && (
                            msg.status === "sent" ? (
                              <CheckCircle className="h-3 w-3 text-primary-foreground/70" />
                            ) : msg.status === "error" ? (
                              <XCircle className="h-3 w-3 text-destructive" />
                            ) : (
                              <Clock className="h-3 w-3 text-primary-foreground/70" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="border-t p-3">
              <div className="flex items-end gap-2 max-w-2xl mx-auto">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-9 w-9 p-0 flex-shrink-0" title="Respostas rápidas">
                      <FileText className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-2" align="start" side="top">
                    <p className="text-xs font-medium mb-2 px-1">Respostas Rápidas</p>
                    {templates.length === 0 ? (
                      <p className="text-xs text-muted-foreground px-1 py-2">Nenhum template ativo</p>
                    ) : (
                      <ScrollArea className="max-h-48">
                        <div className="space-y-1">
                          {templates.map((tpl) => (
                            <button
                              key={tpl.id}
                              onClick={() => applyTemplate(tpl)}
                              className="w-full text-left px-2 py-1.5 rounded hover:bg-muted text-xs transition-colors"
                            >
                              <span className="font-medium">{tpl.name}</span>
                              <p className="text-muted-foreground line-clamp-1 mt-0.5">{tpl.content.substring(0, 60)}...</p>
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </PopoverContent>
                </Popover>

                <Textarea
                  ref={textareaRef}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite sua mensagem... (Enter para enviar)"
                  className="min-h-[40px] max-h-[120px] resize-none text-sm"
                  rows={1}
                />

                <Button
                  size="sm"
                  className="h-9 w-9 p-0 flex-shrink-0"
                  onClick={handleSend}
                  disabled={!messageText.trim() || sending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Column 3 — Contact Details */}
      {selected && showDetails && (
        <div className="w-72 flex-shrink-0 border-l flex flex-col bg-muted/10">
          <div className="p-4 border-b">
            <div className="flex flex-col items-center text-center">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <User className="h-7 w-7 text-primary" />
              </div>
              <h4 className="font-semibold text-sm">{selected.contact_name || "Sem nome"}</h4>
              <p className="text-xs text-muted-foreground">{selected.contact_phone}</p>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {/* Actions */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase">Ações</p>
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-[11px]"
                    onClick={() => window.open(`https://wa.me/${selected.contact_phone.replace(/\D/g, "")}`, "_blank")}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" /> WhatsApp
                  </Button>
                  {selected.status === "open" ? (
                    <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={() => updateConvStatus("closed")}>
                      <XCircle className="h-3 w-3 mr-1" /> Fechar
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={() => updateConvStatus("open")}>
                      <MessageSquare className="h-3 w-3 mr-1" /> Reabrir
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant={selected.status === "archived" ? "default" : "outline"}
                    className="h-8 text-[11px] col-span-2"
                    onClick={() => updateConvStatus(selected.status === "archived" ? "open" : "archived")}
                  >
                    <Archive className="h-3 w-3 mr-1" />
                    {selected.status === "archived" ? "Desarquivar" : "Arquivar"}
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Tags */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {(selected.tags || []).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px] gap-1 pr-1">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-1">
                  <Input
                    placeholder="Nova tag"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addTag()}
                    className="h-7 text-xs"
                  />
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={addTag}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Stats */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase">Histórico</p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total de msgs</span>
                    <span className="font-medium">{messages.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Primeira interação</span>
                    <span className="font-medium">
                      {format(new Date(selected.created_at), "dd/MM/yy", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Última msg</span>
                    <span className="font-medium">
                      {formatDistanceToNow(new Date(selected.last_message_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
