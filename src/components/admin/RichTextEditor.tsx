import { useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bold, Italic, Underline, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Table, Link, Code, AlignLeft, AlignCenter,
  Undo2, Redo2, Type, Minus
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const mode = useRef<"visual" | "html">("visual");
  const internalValue = useRef(value);
  const isInitialized = useRef(false);

  // Only set innerHTML on first mount or when value changes externally
  useEffect(() => {
    if (editorRef.current && !isInitialized.current) {
      editorRef.current.innerHTML = value;
      internalValue.current = value;
      isInitialized.current = true;
    }
  }, []);

  // Sync external value changes (e.g. from HTML tab)
  useEffect(() => {
    if (editorRef.current && value !== internalValue.current) {
      // Save selection
      const sel = window.getSelection();
      const hadFocus = document.activeElement === editorRef.current;
      
      editorRef.current.innerHTML = value;
      internalValue.current = value;

      // If editor was focused, move cursor to end
      if (hadFocus && sel) {
        const range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  }, [value]);

  const exec = useCallback((command: string, val?: string) => {
    document.execCommand(command, false, val);
    editorRef.current?.focus();
    setTimeout(() => {
      if (editorRef.current) {
        const html = editorRef.current.innerHTML;
        internalValue.current = html;
        onChange(html);
      }
    }, 0);
  }, [onChange]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      internalValue.current = html;
      onChange(html);
    }
  }, [onChange]);

  const insertTable = () => {
    const table = `<table style="border-collapse:collapse;width:100%;margin:12px 0">
      <thead><tr><th style="border:1px solid #ddd;padding:8px;background:#f5f5f5;text-align:left">Coluna 1</th><th style="border:1px solid #ddd;padding:8px;background:#f5f5f5;text-align:left">Coluna 2</th></tr></thead>
      <tbody><tr><td style="border:1px solid #ddd;padding:8px">—</td><td style="border:1px solid #ddd;padding:8px">—</td></tr>
      <tr><td style="border:1px solid #ddd;padding:8px">—</td><td style="border:1px solid #ddd;padding:8px">—</td></tr></tbody>
    </table>`;
    exec("insertHTML", table);
  };

  const insertLink = () => {
    const url = prompt("URL do link:", "https://");
    if (url) exec("createLink", url);
  };

  const insertHR = () => exec("insertHTML", "<hr style='margin:16px 0;border:none;border-top:1px solid #ddd'/>");

  const ToolBtn = ({ icon: Icon, cmd, val, title }: { icon: any; cmd?: string; val?: string; title: string; onClick?: () => void }) => (
    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title={title}
      onClick={() => cmd && exec(cmd, val)}>
      <Icon className="h-3.5 w-3.5" />
    </Button>
  );

  return (
    <div className="space-y-2">
      <Tabs defaultValue="visual" onValueChange={(v) => {
        mode.current = v as "visual" | "html";
        if (v === "visual" && editorRef.current) {
          editorRef.current.innerHTML = value;
          internalValue.current = value;
        }
      }}>
        <TabsList className="h-8">
          <TabsTrigger value="visual" className="text-xs px-3 h-6">Visual</TabsTrigger>
          <TabsTrigger value="html" className="text-xs px-3 h-6">HTML</TabsTrigger>
        </TabsList>

        <div className="flex flex-wrap items-center gap-0.5 rounded-t-md border border-b-0 bg-muted/50 p-1">
          <ToolBtn icon={Undo2} cmd="undo" title="Desfazer" />
          <ToolBtn icon={Redo2} cmd="redo" title="Refazer" />
          <Separator orientation="vertical" className="mx-1 h-5" />
          <ToolBtn icon={Bold} cmd="bold" title="Negrito" />
          <ToolBtn icon={Italic} cmd="italic" title="Itálico" />
          <ToolBtn icon={Underline} cmd="underline" title="Sublinhado" />
          <ToolBtn icon={Strikethrough} cmd="strikeThrough" title="Tachado" />
          <Separator orientation="vertical" className="mx-1 h-5" />
          <ToolBtn icon={Heading1} cmd="formatBlock" val="h2" title="Título Grande" />
          <ToolBtn icon={Heading2} cmd="formatBlock" val="h3" title="Título Médio" />
          <ToolBtn icon={Heading3} cmd="formatBlock" val="h4" title="Título Pequeno" />
          <ToolBtn icon={Type} cmd="formatBlock" val="p" title="Parágrafo" />
          <Separator orientation="vertical" className="mx-1 h-5" />
          <ToolBtn icon={List} cmd="insertUnorderedList" title="Lista" />
          <ToolBtn icon={ListOrdered} cmd="insertOrderedList" title="Lista Numerada" />
          <Separator orientation="vertical" className="mx-1 h-5" />
          <ToolBtn icon={AlignLeft} cmd="justifyLeft" title="Alinhar Esquerda" />
          <ToolBtn icon={AlignCenter} cmd="justifyCenter" title="Centralizar" />
          <Separator orientation="vertical" className="mx-1 h-5" />
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Tabela" onClick={insertTable}>
            <Table className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Link" onClick={insertLink}>
            <Link className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Linha Horizontal" onClick={insertHR}>
            <Minus className="h-3.5 w-3.5" />
          </Button>
        </div>

        <TabsContent value="visual" className="mt-0">
          <div
            ref={editorRef}
            contentEditable
            className="min-h-[200px] max-h-[400px] overflow-y-auto rounded-b-md border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring prose prose-sm max-w-none dark:prose-invert [&_table]:w-full [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:p-2 [&_th]:bg-muted [&_th]:font-semibold [&_hr]:my-4"
            onInput={handleInput}
            data-placeholder={placeholder}
            suppressContentEditableWarning
          />
        </TabsContent>

        <TabsContent value="html" className="mt-0">
          <textarea
            className="min-h-[200px] max-h-[400px] w-full rounded-b-md border p-3 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-ring bg-background resize-y"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="<h2>Título</h2><p>Descrição...</p>"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
