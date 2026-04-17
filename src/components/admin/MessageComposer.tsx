import { useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Smile, Variable, Shuffle, SpellCheck, Sparkles, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const EMOJIS = [
  "😀","😂","😍","🥰","😎","🤩","🙏","👍","👋","🎉","🔥","💪",
  "❤️","💙","💚","💛","🧡","💜","✅","⭐","🏆","💰","🛒","📦",
  "🚚","💳","🎁","📱","💊","🩺","💉","🧪","🌿","🍃","✨","🌟",
  "⚡","🔔","📢","💬","📧","📞","🕐","🗓️","📊","📈","👨‍⚕️","👩‍⚕️",
];

const DEFAULT_VARIABLES: { label: string; value: string }[] = [
  { label: "Nome", value: "{Nome}" },
  { label: "Primeiro Nome", value: "{Primeiro_Nome}" },
  { label: "Telefone", value: "{Telefone}" },
  { label: "E-mail", value: "{Email}" },
  { label: "Produto", value: "{Produto}" },
  { label: "Preço", value: "{Preco}" },
  { label: "Link", value: "{Link}" },
  { label: "Cidade", value: "{Cidade}" },
  { label: "Cupom", value: "{Cupom}" },
  { label: "Desconto", value: "{Desconto}" },
  { label: "Empresa", value: "{Nome_da_Empresa}" },
  { label: "Atendente", value: "{Atendente}" },
];

interface MessageComposerProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  variables?: { label: string; value: string }[];
  showSpintax?: boolean;
  compact?: boolean;
}

export function MessageComposer({
  value,
  onChange,
  placeholder,
  rows = 4,
  className,
  variables = DEFAULT_VARIABLES,
  showSpintax = true,
  compact = false,
}: MessageComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cursorPosRef = useRef<number | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [varOpen, setVarOpen] = useState(false);
  const [spelling, setSpelling] = useState(false);

  const [improveOpen, setImproveOpen] = useState(false);
  const [tone, setTone] = useState("amigavel");
  const [goal, setGoal] = useState("vender");
  const [size, setSize] = useState("medio");
  const [generating, setGenerating] = useState(false);
  const [variations, setVariations] = useState<string[]>([]);

  function insertAtCursor(text: string) {
    const ta = textareaRef.current;
    const pos = cursorPosRef.current ?? value.length;
    const before = value.substring(0, pos);
    const after = value.substring(pos);
    const next = before + text + after;
    onChange(next);
    setTimeout(() => {
      if (ta) {
        const newPos = pos + text.length;
        ta.focus();
        ta.setSelectionRange(newPos, newPos);
        cursorPosRef.current = newPos;
      }
    }, 0);
  }

  async function handleSpellCheck() {
    if (!value.trim()) {
      toast({ title: "Sem texto", description: "Digite uma mensagem antes de corrigir.", variant: "destructive" });
      return;
    }
    setSpelling(true);
    try {
      const { data, error } = await supabase.functions.invoke("improve-message-copy", {
        body: { text: value, mode: "spell" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const corrected = (data?.improved_text || "").trim();
      if (!corrected) throw new Error("Resposta vazia da IA");
      onChange(corrected);
      toast({ title: "Texto corrigido", description: "Ortografia e gramática revisadas." });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao corrigir";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setSpelling(false);
    }
  }

  async function handleGenerateVariations() {
    if (!value.trim()) {
      toast({ title: "Sem texto", description: "Digite uma mensagem base antes de melhorar.", variant: "destructive" });
      return;
    }
    setGenerating(true);
    setVariations([]);
    try {
      const { data, error } = await supabase.functions.invoke("improve-message-copy", {
        body: { text: value, mode: "improve", tone, goal, size },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const v = Array.isArray(data?.variations) ? data.variations : [];
      if (!v.length) throw new Error("Nenhuma variação retornada");
      setVariations(v);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao gerar variações";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }

  function applyVariation(v: string) {
    onChange(v);
    setImproveOpen(false);
    setVariations([]);
    toast({ title: "Aplicado", description: "Variação inserida no editor." });
  }

  const emojiFontStack =
    "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', system-ui, sans-serif";

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1 items-center">
        <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
          <PopoverTrigger asChild>
            <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs gap-1">
              <Smile className="h-3.5 w-3.5" /> Emoji
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[280px] p-2" align="start">
            <div
              className="grid grid-cols-8 gap-1 max-h-[220px] overflow-y-auto"
              style={{ fontFamily: emojiFontStack }}
            >
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="text-lg hover:bg-muted rounded p-1 transition-colors"
                  onClick={() => {
                    insertAtCursor(emoji);
                    setEmojiOpen(false);
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Popover open={varOpen} onOpenChange={setVarOpen}>
          <PopoverTrigger asChild>
            <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs gap-1">
              <Variable className="h-3.5 w-3.5" /> Variável
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[260px] p-2" align="start">
            <div className="grid grid-cols-2 gap-1">
              {variables.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  className="text-left text-xs px-2 py-1.5 rounded hover:bg-muted transition-colors"
                  onClick={() => {
                    insertAtCursor(v.value);
                    setVarOpen(false);
                  }}
                >
                  <div className="font-medium">{v.label}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">{v.value}</div>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {showSpintax && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs gap-1"
            onClick={() => insertAtCursor("{opção1|opção2|opção3}")}
            title="Insere variações aleatórias"
          >
            <Shuffle className="h-3.5 w-3.5" /> Spintax
          </Button>
        )}

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs gap-1"
          onClick={handleSpellCheck}
          disabled={spelling}
          title="Corrige ortografia e gramática preservando variáveis e emojis"
        >
          {spelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SpellCheck className="h-3.5 w-3.5" />}
          Corrigir
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs gap-1 border-primary/40 text-primary hover:bg-primary/10"
          onClick={() => {
            setVariations([]);
            setImproveOpen(true);
          }}
          title="Gera variações otimizadas para conversão"
        >
          <Sparkles className="h-3.5 w-3.5" /> Melhorar
        </Button>

        {!compact && (
          <span className="text-[10px] text-muted-foreground ml-auto">
            Use <code className="font-mono">{"{var}"}</code> ou <code className="font-mono">{"{a|b|c}"}</code>
          </span>
        )}
      </div>

      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          cursorPosRef.current = e.target.selectionStart;
        }}
        onSelect={(e) => {
          cursorPosRef.current = (e.target as HTMLTextAreaElement).selectionStart;
        }}
        onBlur={(e) => {
          cursorPosRef.current = e.target.selectionStart;
        }}
        placeholder={placeholder}
        rows={rows}
        className={className}
        style={{ fontFamily: emojiFontStack }}
      />

      <Dialog open={improveOpen} onOpenChange={setImproveOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Melhorar copy da mensagem
            </DialogTitle>
            <DialogDescription>
              A IA gera 3 variações otimizadas para conversão preservando suas variáveis e emojis.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label className="text-xs">Texto original</Label>
              <Textarea
                value={value}
                readOnly
                rows={3}
                className="resize-none bg-muted/40"
                style={{ fontFamily: emojiFontStack }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Tom</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="amigavel">Amigável</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                    <SelectItem value="profissional">Profissional</SelectItem>
                    <SelectItem value="empolgado">Empolgado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Objetivo</Label>
                <Select value={goal} onValueChange={setGoal}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vender">Vender</SelectItem>
                    <SelectItem value="agendar">Agendar</SelectItem>
                    <SelectItem value="recuperar">Recuperar carrinho</SelectItem>
                    <SelectItem value="avisar">Avisar / Informar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Tamanho</Label>
                <Select value={size} onValueChange={setSize}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="curto">Curto</SelectItem>
                    <SelectItem value="medio">Médio</SelectItem>
                    <SelectItem value="longo">Longo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleGenerateVariations}
              disabled={generating}
              className="w-full gap-2"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generating ? "Gerando variações..." : "Gerar variações"}
            </Button>

            {variations.length > 0 && (
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {variations.map((v, i) => (
                  <div
                    key={i}
                    className="border rounded-md p-3 space-y-2 bg-card hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">
                        Variação {i + 1}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 text-xs"
                        onClick={() => applyVariation(v)}
                      >
                        <Check className="h-3.5 w-3.5" /> Usar esta
                      </Button>
                    </div>
                    <p
                      className="text-sm whitespace-pre-wrap"
                      style={{ fontFamily: emojiFontStack }}
                    >
                      {v}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setImproveOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { DEFAULT_VARIABLES };
