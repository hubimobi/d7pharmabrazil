import { useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Smile, Variable, Shuffle } from "lucide-react";

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
    </div>
  );
}

export { DEFAULT_VARIABLES };
