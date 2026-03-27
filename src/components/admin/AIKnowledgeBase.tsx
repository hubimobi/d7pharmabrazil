import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Database, Plus, Globe, HelpCircle, FileText, Table2,
  Loader2, Trash2, ExternalLink, CheckCircle, AlertCircle, Clock,
} from "lucide-react";
import { toast } from "sonner";

interface KnowledgeBase {
  id: string;
  name: string;
  created_at: string;
  items_count?: number;
}

interface KBItem {
  id: string;
  knowledge_base_id: string;
  type: string;
  content: any;
  status: string;
  created_at: string;
}

export default function AIKnowledgeBase() {
  const [selectedKb, setSelectedKb] = useState<KnowledgeBase | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [addItemType, setAddItemType] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState({ url: "", question: "", answer: "", text: "", tableData: "" });
  const qc = useQueryClient();

  const { data: bases, isLoading } = useQuery({
    queryKey: ["ai-knowledge-bases"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ai_knowledge_bases" as any).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as KnowledgeBase[]) || [];
    },
  });

  const { data: items } = useQuery({
    queryKey: ["ai-kb-items", selectedKb?.id],
    enabled: !!selectedKb,
    queryFn: async () => {
      const { data, error } = await supabase.from("ai_kb_items" as any).select("*").eq("knowledge_base_id", selectedKb!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as KBItem[]) || [];
    },
  });

  const createKb = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("ai_knowledge_bases" as any).insert({ name: newName } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-knowledge-bases"] });
      setShowCreate(false);
      setNewName("");
      toast.success("Base criada!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteKb = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ai_knowledge_bases" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-knowledge-bases"] });
      setSelectedKb(null);
      toast.success("Base excluída!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addItem = useMutation({
    mutationFn: async () => {
      if (!selectedKb || !addItemType) return;
      let content: any = {};
      let status = "trained";

      if (addItemType === "url") {
        content = { url: itemForm.url };
        status = "pending";
        // Trigger crawl
        supabase.functions.invoke("ai-kb-crawl", { body: { url: itemForm.url, item_id: null, knowledge_base_id: selectedKb.id } }).catch(console.error);
      } else if (addItemType === "faq") {
        content = { question: itemForm.question, answer: itemForm.answer };
      } else if (addItemType === "text") {
        content = { text: itemForm.text };
      } else if (addItemType === "table") {
        content = { data: itemForm.tableData };
      }

      const { error } = await supabase.from("ai_kb_items" as any).insert({
        knowledge_base_id: selectedKb.id,
        type: addItemType,
        content,
        status,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-kb-items"] });
      setAddItemType(null);
      setItemForm({ url: "", question: "", answer: "", text: "", tableData: "" });
      toast.success("Item adicionado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ai_kb_items" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-kb-items"] });
      toast.success("Item removido!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const statusIcon = (s: string) => {
    if (s === "trained") return <CheckCircle className="h-3.5 w-3.5 text-green-500" />;
    if (s === "error") return <AlertCircle className="h-3.5 w-3.5 text-red-500" />;
    return <Clock className="h-3.5 w-3.5 text-yellow-500" />;
  };

  const typeLabel: Record<string, string> = { url: "Web Crawler", faq: "FAQ", text: "Texto", table: "Tabela" };

  if (selectedKb) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setSelectedKb(null)}>← Voltar</Button>
            <h3 className="text-lg font-semibold">{selectedKb.name}</h3>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setAddItemType("url")}><Globe className="h-3.5 w-3.5 mr-1" /> URL</Button>
            <Button size="sm" variant="outline" onClick={() => setAddItemType("faq")}><HelpCircle className="h-3.5 w-3.5 mr-1" /> FAQ</Button>
            <Button size="sm" variant="outline" onClick={() => setAddItemType("text")}><FileText className="h-3.5 w-3.5 mr-1" /> Texto</Button>
            <Button size="sm" variant="outline" onClick={() => setAddItemType("table")}><Table2 className="h-3.5 w-3.5 mr-1" /> Tabela</Button>
          </div>
        </div>

        {(items || []).length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum item nesta base. Adicione URLs, FAQs, textos ou tabelas.</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {(items || []).map((item) => (
              <Card key={item.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {statusIcon(item.status)}
                    <Badge variant="secondary" className="text-[10px]">{typeLabel[item.type] || item.type}</Badge>
                    <span className="text-sm truncate">
                      {item.type === "url" && item.content?.url}
                      {item.type === "faq" && item.content?.question}
                      {item.type === "text" && (item.content?.text || "").substring(0, 80)}
                      {item.type === "table" && "Tabela de dados"}
                    </span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => deleteItem.mutate(item.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Add Item Dialog */}
        <Dialog open={!!addItemType} onOpenChange={() => setAddItemType(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar {addItemType && typeLabel[addItemType]}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              {addItemType === "url" && (
                <div className="space-y-2">
                  <Label>URL do Site</Label>
                  <Input placeholder="https://exemplo.com" value={itemForm.url} onChange={(e) => setItemForm({ ...itemForm, url: e.target.value })} />
                  <p className="text-xs text-muted-foreground">O conteúdo será extraído automaticamente</p>
                </div>
              )}
              {addItemType === "faq" && (
                <>
                  <div className="space-y-2">
                    <Label>Pergunta</Label>
                    <Input placeholder="Qual é o prazo de entrega?" value={itemForm.question} onChange={(e) => setItemForm({ ...itemForm, question: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Resposta</Label>
                    <Textarea placeholder="O prazo é de..." value={itemForm.answer} onChange={(e) => setItemForm({ ...itemForm, answer: e.target.value })} rows={4} />
                  </div>
                </>
              )}
              {addItemType === "text" && (
                <div className="space-y-2">
                  <Label>Texto</Label>
                  <Textarea placeholder="Cole aqui o conteúdo..." value={itemForm.text} onChange={(e) => setItemForm({ ...itemForm, text: e.target.value })} rows={8} />
                </div>
              )}
              {addItemType === "table" && (
                <div className="space-y-2">
                  <Label>Dados da Tabela (CSV)</Label>
                  <Textarea placeholder="nome,valor&#10;Item 1,R$ 100&#10;Item 2,R$ 200" value={itemForm.tableData} onChange={(e) => setItemForm({ ...itemForm, tableData: e.target.value })} rows={8} className="font-mono text-sm" />
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAddItemType(null)}>Cancelar</Button>
                <Button onClick={() => addItem.mutate()} disabled={addItem.isPending}>
                  {addItem.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Adicionar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Bases de Conhecimento</h3>
          <p className="text-sm text-muted-foreground">Crie bases com URLs, FAQs, textos e tabelas para treinar seus agentes</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nova Base
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (bases || []).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Database className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Nenhuma base de conhecimento criada</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(bases || []).map((kb) => (
            <Card key={kb.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedKb(kb)}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Database className="h-5 w-5 text-primary" />
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); deleteKb.mutate(kb.id); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <h4 className="font-medium mt-3">{kb.name}</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Criada em {new Date(kb.created_at).toLocaleDateString("pt-BR")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Base de Conhecimento</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input placeholder="Ex: Produtos, Suporte, FAQ Geral" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
              <Button onClick={() => createKb.mutate()} disabled={!newName || createKb.isPending}>
                {createKb.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Criar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
