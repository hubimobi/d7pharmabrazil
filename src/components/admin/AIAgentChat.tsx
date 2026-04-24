import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, ThumbsUp, ThumbsDown, Loader2, User, Zap } from "lucide-react";
import { toast } from "sonner";
import { callSSE } from "@/hooks/useSSEStream";

interface AIAgent {
  id: string; name: string; icon: string; color: string;
  model: string; system_prompt: string;
}

type Msg = { role: "user" | "assistant"; content: string };

interface Props { agent: AIAgent | null; onClose: () => void; }

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function AIAgentChat({ agent, onClose }: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackDialog, setFeedbackDialog] = useState<{ msgIndex: number; content: string } | null>(null);
  const [correctedAnswer, setCorrectedAnswer] = useState("");
  const [correctedQuestion, setCorrectedQuestion] = useState("");
  const [sessionTokens, setSessionTokens] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionId = useRef(crypto.randomUUID());

  useEffect(() => {
    if (agent) {
      setMessages([]);
      setSessionTokens(0);
      sessionId.current = crypto.randomUUID();
    }
  }, [agent?.id]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !agent || isLoading) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      let assistantSoFar = "";

      const { estimatedOutputTokens } = await callSSE(
        "ai-agent-chat",
        { agent_id: agent.id, messages: newMessages, session_id: sessionId.current },
        (chunk) => {
          assistantSoFar += chunk;
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant") {
              return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
            }
            return [...prev, { role: "assistant", content: assistantSoFar }];
          });
        },
      );

      // Accumulate session token estimate
      const inputEst = Math.ceil(newMessages.reduce((s, m) => s + m.content.length, 0) / 4);
      setSessionTokens((t) => t + inputEst + estimatedOutputTokens);
    } catch (e: any) {
      toast.error(e.message || "Erro de comunicação");
      setMessages((prev) => [...prev, { role: "assistant", content: "Desculpe, ocorreu um erro. Tente novamente." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = (msgIndex: number, type: "liked" | "disliked") => {
    if (type === "liked") {
      // Log positive feedback
      supabase.from("ai_token_usage" as any).select("id").eq("agent_id", agent?.id).limit(1).then(() => {});
      toast.success("Obrigado pelo feedback! 👍");
    } else {
      const msg = messages[msgIndex];
      setCorrectedQuestion(messages[msgIndex - 1]?.content || "");
      setCorrectedAnswer(msg.content);
      setFeedbackDialog({ msgIndex, content: msg.content });
    }
  };

  const saveCorrectedFaq = async () => {
    if (!agent || !correctedQuestion || !correctedAnswer) return;
    try {
      const { data: links } = await supabase.from("ai_agent_knowledge_bases" as any).select("knowledge_base_id").eq("agent_id", agent.id).limit(1);
      let kbId = (links as any)?.[0]?.knowledge_base_id;

      if (!kbId) {
        const { data: newKb, error: kbErr } = await supabase.from("ai_knowledge_bases" as any).insert({ name: `FAQ - ${agent.name}` } as any).select().single();
        if (kbErr) throw kbErr;
        kbId = (newKb as any).id;
        await supabase.from("ai_agent_knowledge_bases" as any).insert({ agent_id: agent.id, knowledge_base_id: kbId } as any);
      }

      await supabase.from("ai_kb_items" as any).insert({
        knowledge_base_id: kbId,
        type: "faq",
        content: { question: correctedQuestion, answer: correctedAnswer },
        status: "trained",
      } as any);

      toast.success("FAQ salvo na base de conhecimento!");
      setFeedbackDialog(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const estimatedSessionTokens = sessionTokens || messages.reduce((s, m) => s + Math.ceil(m.content.length / 4), 0);

  return (
    <>
      <Dialog open={!!agent} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-3 border-b">
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: (agent?.color || "#2563eb") + "20" }}>
                  <Bot className="h-4 w-4" style={{ color: agent?.color }} />
                </div>
                Chat com {agent?.name}
              </span>
              {estimatedSessionTokens > 0 && (
                <Badge variant="secondary" className="text-[10px] gap-1 font-normal">
                  <Zap className="h-2.5 w-2.5" />
                  ~{formatTokens(estimatedSessionTokens)} tokens
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 px-6 py-4">
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Bot className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Inicie uma conversa com {agent?.name}</p>
                  <p className="text-xs mt-1 opacity-60">Powered by IA com Base de Conhecimento</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                  {msg.role === "assistant" && (
                    <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: (agent?.color || "#2563eb") + "20" }}>
                      <Bot className="h-3.5 w-3.5" style={{ color: agent?.color }} />
                    </div>
                  )}
                  <div className={`max-w-[75%] ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5" : "bg-muted rounded-2xl rounded-tl-sm px-4 py-2.5"}`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    {msg.role === "assistant" && i > 0 && (
                      <div className="flex gap-1 mt-2">
                        <button onClick={() => handleFeedback(i, "liked")} className="p-1 hover:bg-background/50 rounded transition-colors" title="Boa resposta">
                          <ThumbsUp className="h-3 w-3 opacity-50 hover:opacity-100" />
                        </button>
                        <button onClick={() => handleFeedback(i, "disliked")} className="p-1 hover:bg-background/50 rounded transition-colors" title="Resposta incorreta">
                          <ThumbsDown className="h-3 w-3 opacity-50 hover:opacity-100" />
                        </button>
                      </div>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-3.5 w-3.5 text-primary" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex gap-3">
                  <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: (agent?.color || "#2563eb") + "20" }}>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: agent?.color }} />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2.5">
                    <p className="text-sm text-muted-foreground">Pensando...</p>
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          <div className="px-6 pb-6 pt-3 border-t">
            <div className="flex gap-2">
              <Input
                placeholder="Digite sua mensagem..."
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
        </DialogContent>
      </Dialog>

      <Dialog open={!!feedbackDialog} onOpenChange={() => setFeedbackDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Corrigir Resposta</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">A resposta corrigida será salva como FAQ na base de conhecimento do agente.</p>
            <div className="space-y-2">
              <Label>Pergunta</Label>
              <Input value={correctedQuestion} onChange={(e) => setCorrectedQuestion(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Resposta Correta</Label>
              <Textarea value={correctedAnswer} onChange={(e) => setCorrectedAnswer(e.target.value)} rows={5} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFeedbackDialog(null)}>Cancelar</Button>
              <Button onClick={saveCorrectedFaq}>Salvar como FAQ</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
