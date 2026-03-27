import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Users, Plus, Loader2, Send, Bot, User, FileText, MessageSquare, ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

interface AIAgent {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface Meeting {
  id: string;
  title: string;
  agent_ids: string[];
  messages: { role: string; agent_id?: string; agent_name?: string; content: string }[];
  summary: string;
  user_id: string;
  created_at: string;
}

export default function AIMeetingRoom() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [activeMeeting, setActiveMeeting] = useState<Meeting | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: agents } = useQuery({
    queryKey: ["ai-agents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ai_agents" as any).select("*").order("created_at");
      if (error) throw error;
      return (data as unknown as AIAgent[]) || [];
    },
  });

  const { data: meetings, isLoading: loadingMeetings } = useQuery({
    queryKey: ["ai-meetings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ai_meetings" as any).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as Meeting[]) || [];
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMeeting?.messages]);

  const createMeeting = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Login necessário");
      const { data, error } = await supabase.from("ai_meetings" as any).insert({
        title: newTitle,
        agent_ids: selectedAgentIds,
        user_id: user.id,
        messages: [],
        summary: "",
      } as any).select().single();
      if (error) throw error;
      return data as unknown as Meeting;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["ai-meetings"] });
      setActiveMeeting(data);
      setShowCreate(false);
      setNewTitle("");
      setSelectedAgentIds([]);
      toast.success("Reunião criada!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleAgent = (id: string) => {
    setSelectedAgentIds((prev) => prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]);
  };

  const getAgentName = (id: string) => agents?.find((a) => a.id === id)?.name || "Agente";
  const getAgentColor = (id: string) => agents?.find((a) => a.id === id)?.color || "#2563eb";

  const sendMessage = async () => {
    if (!input.trim() || !activeMeeting || isLoading) return;
    const userMsg = { role: "user", content: input.trim() };
    const updatedMessages = [...(activeMeeting.messages || []), userMsg];
    setActiveMeeting({ ...activeMeeting, messages: updatedMessages });
    setInput("");
    setIsLoading(true);

    try {
      // Each agent responds in sequence
      for (const agentId of activeMeeting.agent_ids as string[]) {
        const agentName = getAgentName(agentId);
        const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-agent-chat`;
        const resp = await fetch(CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            agent_id: agentId,
            messages: updatedMessages.map((m) => ({
              role: m.role === "user" ? "user" : "assistant",
              content: m.agent_name ? `[${m.agent_name}]: ${m.content}` : m.content,
            })),
            session_id: activeMeeting.id,
            meeting_mode: true,
          }),
        });

        if (!resp.ok) throw new Error("Erro na resposta do agente " + agentName);

        // Read non-streaming for meeting (simpler)
        let fullContent = "";
        if (resp.body) {
          const reader = resp.body.getReader();
          const decoder = new TextDecoder();
          let buf = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            let idx: number;
            while ((idx = buf.indexOf("\n")) !== -1) {
              let line = buf.slice(0, idx);
              buf = buf.slice(idx + 1);
              if (line.endsWith("\r")) line = line.slice(0, -1);
              if (!line.startsWith("data: ")) continue;
              const json = line.slice(6).trim();
              if (json === "[DONE]") continue;
              try {
                const p = JSON.parse(json);
                const c = p.choices?.[0]?.delta?.content;
                if (c) fullContent += c;
              } catch {}
            }
          }
        }

        const agentMsg = { role: "assistant", agent_id: agentId, agent_name: agentName, content: fullContent };
        updatedMessages.push(agentMsg);
        setActiveMeeting((prev) => prev ? { ...prev, messages: [...updatedMessages] } : prev);
      }

      // Save to DB
      await supabase.from("ai_meetings" as any).update({ messages: updatedMessages } as any).eq("id", activeMeeting.id);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const generateSummary = async () => {
    if (!activeMeeting) return;
    setIsSummarizing(true);
    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-agent-chat`;
      const summaryMessages = [
        {
          role: "user",
          content: `Gere um resumo/ata desta reunião entre agentes de IA. Inclua os principais pontos discutidos, decisões e próximos passos.\n\nConversa:\n${(activeMeeting.messages || []).map((m) => `${m.agent_name || "Usuário"}: ${m.content}`).join("\n\n")}`,
        },
      ];
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          agent_id: (activeMeeting.agent_ids as string[])[0],
          messages: summaryMessages,
          session_id: activeMeeting.id,
          summary_mode: true,
        }),
      });

      let summary = "";
      if (resp.body) {
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = buf.indexOf("\n")) !== -1) {
            let line = buf.slice(0, idx);
            buf = buf.slice(idx + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6).trim();
            if (json === "[DONE]") continue;
            try {
              const p = JSON.parse(json);
              const c = p.choices?.[0]?.delta?.content;
              if (c) summary += c;
            } catch {}
          }
        }
      }

      await supabase.from("ai_meetings" as any).update({ summary } as any).eq("id", activeMeeting.id);
      setActiveMeeting((prev) => prev ? { ...prev, summary } : prev);
      qc.invalidateQueries({ queryKey: ["ai-meetings"] });
      toast.success("Resumo gerado!");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsSummarizing(false);
    }
  };

  if (activeMeeting) {
    return (
      <div className="flex flex-col h-[calc(100vh-220px)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setActiveMeeting(null)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            <h3 className="font-semibold">{activeMeeting.title}</h3>
            <div className="flex gap-1">
              {(activeMeeting.agent_ids as string[]).map((id) => (
                <Badge key={id} variant="secondary" className="text-[10px]" style={{ borderColor: getAgentColor(id) }}>
                  {getAgentName(id)}
                </Badge>
              ))}
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={generateSummary} disabled={isSummarizing || (activeMeeting.messages || []).length === 0}>
            {isSummarizing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <FileText className="h-3.5 w-3.5 mr-1" />}
            Gerar Resumo
          </Button>
        </div>

        {activeMeeting.summary && (
          <Card className="mb-4 border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><FileText className="h-4 w-4" /> Resumo da Reunião</h4>
              <p className="text-sm whitespace-pre-wrap">{activeMeeting.summary}</p>
            </CardContent>
          </Card>
        )}

        <ScrollArea className="flex-1 border rounded-lg p-4 mb-4">
          <div className="space-y-4">
            {(activeMeeting.messages || []).length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Inicie a reunião enviando uma mensagem</p>
              </div>
            )}
            {(activeMeeting.messages || []).map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                {msg.role !== "user" && (
                  <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: (msg.agent_id ? getAgentColor(msg.agent_id) : "#2563eb") + "20" }}>
                    <Bot className="h-3.5 w-3.5" style={{ color: msg.agent_id ? getAgentColor(msg.agent_id) : "#2563eb" }} />
                  </div>
                )}
                <div className={`max-w-[75%] ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5" : "bg-muted rounded-2xl rounded-tl-sm px-4 py-2.5"}`}>
                  {msg.agent_name && <p className="text-xs font-semibold mb-1" style={{ color: msg.agent_id ? getAgentColor(msg.agent_id) : undefined }}>{msg.agent_name}</p>}
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
                {msg.role === "user" && (
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                </div>
                <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2.5">
                  <p className="text-sm text-muted-foreground">Agentes respondendo...</p>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="flex gap-2">
          <Input
            placeholder="Envie uma mensagem para os agentes..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            disabled={isLoading}
          />
          <Button onClick={sendMessage} disabled={!input.trim() || isLoading} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Sala de Reunião</h3>
          <p className="text-sm text-muted-foreground">Converse com múltiplos agentes ao mesmo tempo e gere resumos automáticos</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nova Reunião
        </Button>
      </div>

      {loadingMeetings ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (meetings || []).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Nenhuma reunião criada</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {(meetings || []).map((m) => (
            <Card key={m.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveMeeting(m)}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{m.title}</h4>
                  <div className="flex gap-1 mt-1">
                    {(m.agent_ids as string[]).map((id) => (
                      <Badge key={id} variant="secondary" className="text-[10px]">{getAgentName(id)}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> {(m.messages || []).length}</span>
                  {m.summary && <Badge variant="outline" className="text-[10px]">Com resumo</Badge>}
                  <span>{new Date(m.created_at).toLocaleDateString("pt-BR")}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Reunião</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input placeholder="Ex: Planejamento de Vendas" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Selecione os Agentes (mínimo 2)</Label>
              <div className="grid grid-cols-2 gap-2">
                {(agents || []).map((a) => (
                  <label key={a.id} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${selectedAgentIds.includes(a.id) ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}>
                    <Checkbox checked={selectedAgentIds.includes(a.id)} onCheckedChange={() => toggleAgent(a.id)} />
                    <span className="text-sm">{a.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
              <Button onClick={() => createMeeting.mutate()} disabled={!newTitle || selectedAgentIds.length < 2 || createMeeting.isPending}>
                {createMeeting.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Criar Reunião
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
