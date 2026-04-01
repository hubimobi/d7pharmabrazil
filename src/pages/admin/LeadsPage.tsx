import { useState, useRef, useMemo } from "react";
import ProductComboSelect from "@/components/admin/ProductComboSelect";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Download, Upload, Search, Edit, Trash2, UserPlus, FileText, X, FolderOpen, CheckSquare, TrendingUp
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

type LeadTag = "frio" | "morno" | "quente" | "produto_vinculado" | "funil";

const TAG_OPTIONS: Array<{ value: LeadTag; label: string; color: string }> = [
  { value: "frio", label: "Frio", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  { value: "morno", label: "Morno", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" },
  { value: "quente", label: "Quente", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  { value: "produto_vinculado", label: "Produto Vinculado", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  { value: "funil", label: "Funil", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
];

function getTagStyle(tag: string) {
  return TAG_OPTIONS.find((t) => t.value === tag)?.color || "bg-muted text-muted-foreground";
}
function getTagLabel(tag: string) {
  return TAG_OPTIONS.find((t) => t.value === tag)?.label || tag;
}

const BRAZILIAN_STATES = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
  "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"
];

const LEAD_FIELDS = [
  { value: "ignore", label: "Ignorar" },
  { value: "name", label: "Nome" },
  { value: "email", label: "E-mail" },
  { value: "phone", label: "Telefone" },
  { value: "city", label: "Cidade" },
  { value: "state", label: "Estado" },
];

export default function LeadsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterTag, setFilterTag] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [showImport, setShowImport] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingLead, setEditingLead] = useState<any>(null);
  const [showAddLead, setShowAddLead] = useState(false);
  const [showBatches, setShowBatches] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showUpsellDialog, setShowUpsellDialog] = useState(false);
  const [upsellProductId, setUpsellProductId] = useState<string>("none");
  // CSV import state
  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importProductId, setImportProductId] = useState<string>("none");
  const [importTags, setImportTags] = useState<LeadTag[]>([]);
  const [importStep, setImportStep] = useState<"upload" | "mapping">("upload");
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [csvPreview, setCsvPreview] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<number, string>>({});
  const [allCsvRows, setAllCsvRows] = useState<string[][]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [addForm, setAddForm] = useState({
    name: "", email: "", phone: "", city: "", state: "", tags: [] as LeadTag[], product_id: "none",
  });

  const { data: leads, isLoading } = useQuery({
    queryKey: ["popup-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("popup_leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: products } = useQuery({
    queryKey: ["products-for-leads"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, name").eq("active", true).order("name");
      return (data || []) as Array<{ id: string; name: string }>;
    },
  });

  // Batch tracking
  const batches = useMemo(() => {
    if (!leads) return [];
    const batchMap: Record<string, { source: string; count: number; date: string }> = {};
    leads.forEach((l: any) => {
      if (l.source?.startsWith("csv_import_")) {
        if (!batchMap[l.source]) {
          batchMap[l.source] = { source: l.source, count: 0, date: l.created_at };
        }
        batchMap[l.source].count++;
      }
    });
    return Object.values(batchMap).sort((a, b) => b.date.localeCompare(a.date));
  }, [leads]);

  const filtered = (leads || []).filter((lead) => {
    const matchSearch = !search || [lead.name, lead.email, lead.phone, lead.city, lead.state, lead.product_name]
      .filter(Boolean).some((field) => String(field).toLowerCase().includes(search.toLowerCase()));
    const tags: string[] = Array.isArray(lead.tags) ? lead.tags : [];
    const matchTag = filterTag === "all" || tags.includes(filterTag);
    const matchSource = filterSource === "all" || lead.source === filterSource;
    return matchSearch && matchTag && matchSource;
  });

  const tagCounts = (leads || []).reduce<Record<string, number>>((acc, lead) => {
    const tags: string[] = Array.isArray(lead.tags) ? lead.tags : [];
    tags.forEach((tag) => { acc[tag] = (acc[tag] || 0) + 1; });
    return acc;
  }, {});

  function toggleTag(list: LeadTag[], tag: LeadTag): LeadTag[] {
    return list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag];
  }

  async function deleteLead(id: string) {
    if (!confirm("Excluir este lead?")) return;
    await supabase.from("popup_leads").delete().eq("id", id);
    toast.success("Lead removido");
    queryClient.invalidateQueries({ queryKey: ["popup-leads"] });
  }

  function openEdit(lead: any) {
    setEditingLead({ ...lead, tags: Array.isArray(lead.tags) ? lead.tags : [], product_id: lead.product_id || "none" });
    setShowEdit(true);
  }

  async function saveEdit() {
    if (!editingLead) return;
    const productName = editingLead.product_id && editingLead.product_id !== "none"
      ? products?.find((p) => p.id === editingLead.product_id)?.name || "" : null;
    const tags = editingLead.tags || [];
    const finalTags = editingLead.product_id && editingLead.product_id !== "none" && !tags.includes("produto_vinculado")
      ? [...tags, "produto_vinculado"] : tags;
    await supabase.from("popup_leads").update({
      name: editingLead.name, phone: editingLead.phone, city: editingLead.city, state: editingLead.state,
      tags: finalTags, product_id: editingLead.product_id === "none" ? null : editingLead.product_id, product_name: productName,
    } as any).eq("id", editingLead.id);
    toast.success("Lead atualizado");
    setShowEdit(false);
    queryClient.invalidateQueries({ queryKey: ["popup-leads"] });
  }

  async function addLead() {
    if (!addForm.email) { toast.error("E-mail é obrigatório"); return; }
    const productName = addForm.product_id !== "none" ? products?.find((p) => p.id === addForm.product_id)?.name || "" : null;
    const tags = [...addForm.tags];
    if (addForm.product_id !== "none" && !tags.includes("produto_vinculado")) tags.push("produto_vinculado");
    await supabase.from("popup_leads").insert({
      email: addForm.email, name: addForm.name || null, phone: addForm.phone || null,
      source: "manual", city: addForm.city || null, state: addForm.state || null, tags,
      product_id: addForm.product_id === "none" ? null : addForm.product_id, product_name: productName,
    } as any);
    toast.success("Lead adicionado");
    setShowAddLead(false);
    setAddForm({ name: "", email: "", phone: "", city: "", state: "", tags: [], product_id: "none" });
    queryClient.invalidateQueries({ queryKey: ["popup-leads"] });
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCsvText(ev.target?.result as string || "");
    reader.readAsText(file);
  }

  function proceedToMapping() {
    const lines = csvText.trim().split("\n").filter(Boolean);
    if (lines.length === 0) { toast.error("Nenhum dado para importar"); return; }

    const parseLine = (line: string) => line.split(/[;,\t]/).map((s) => s.trim().replace(/^["']|["']$/g, ""));
    const header = lines[0].toLowerCase();
    const hasHeader = header.includes("email") || header.includes("nome") || header.includes("name");

    const headerCols = parseLine(lines[0]);
    const dataLines = hasHeader ? lines.slice(1) : lines;
    const dataRows = dataLines.map(parseLine);

    setCsvColumns(hasHeader ? headerCols : headerCols.map((_, i) => `Coluna ${i + 1}`));
    setCsvPreview(dataRows.slice(0, 3));
    setAllCsvRows(dataRows);

    // Auto-detect mapping
    const mapping: Record<number, string> = {};
    headerCols.forEach((col, i) => {
      const c = col.toLowerCase();
      if (c.includes("email")) mapping[i] = "email";
      else if (c.includes("nome") || c.includes("name")) mapping[i] = "name";
      else if (c.includes("phone") || c.includes("telefone") || c.includes("whatsapp") || c.includes("celular")) mapping[i] = "phone";
      else if (c.includes("cidade") || c.includes("city")) mapping[i] = "city";
      else if (c.includes("estado") || c.includes("state") || c.includes("uf")) mapping[i] = "state";
      else mapping[i] = "ignore";
    });
    setColumnMapping(mapping);
    setImportStep("mapping");
  }

  async function handleCSVImport() {
    const hasEmail = Object.values(columnMapping).includes("email");
    if (!hasEmail) { toast.error("Mapeie ao menos a coluna de E-mail"); return; }
    setImporting(true);

    const batchId = `csv_import_${Date.now()}`;
    const productName = importProductId !== "none" ? products?.find((p) => p.id === importProductId)?.name || "" : null;
    const baseTags: LeadTag[] = [...importTags];
    if (importProductId !== "none" && !baseTags.includes("produto_vinculado")) baseTags.push("produto_vinculado");

    // Build field index map
    const fieldIdx: Record<string, number> = {};
    Object.entries(columnMapping).forEach(([idx, field]) => {
      if (field !== "ignore") fieldIdx[field] = Number(idx);
    });

    let imported = 0;
    for (const parts of allCsvRows) {
      const email = fieldIdx.email !== undefined ? parts[fieldIdx.email] || "" : "";
      if (!email || !email.includes("@")) continue;

      const payload: Record<string, unknown> = {
        email,
        name: fieldIdx.name !== undefined ? parts[fieldIdx.name] || null : null,
        phone: fieldIdx.phone !== undefined ? parts[fieldIdx.phone] || null : null,
        city: fieldIdx.city !== undefined ? parts[fieldIdx.city] || null : null,
        state: fieldIdx.state !== undefined ? parts[fieldIdx.state] || null : null,
        source: batchId,
        tags: baseTags,
        product_id: importProductId === "none" ? null : importProductId,
        product_name: productName,
      };

      const { error } = await supabase.from("popup_leads").insert(payload as any);
      if (!error) imported++;
    }

    toast.success(`${imported} lead(s) importado(s) com sucesso!`);
    setImporting(false);
    resetImport();
    queryClient.invalidateQueries({ queryKey: ["popup-leads"] });
  }

  function resetImport() {
    setShowImport(false);
    setImportStep("upload");
    setCsvText("");
    setCsvColumns([]);
    setCsvPreview([]);
    setColumnMapping({});
    setAllCsvRows([]);
    setImportProductId("none");
    setImportTags([]);
  }

  async function deleteBatch(source: string) {
    if (!confirm(`Excluir todos os leads desta importação?`)) return;
    await supabase.from("popup_leads").delete().eq("source", source);
    toast.success("Lote excluído");
    queryClient.invalidateQueries({ queryKey: ["popup-leads"] });
  }

  function exportBatch(source: string) {
    const batchLeads = (leads || []).filter((l: any) => l.source === source);
    if (!batchLeads.length) return;
    const rows = [
      ["Nome", "E-mail", "WhatsApp", "Cidade", "Estado", "Tags", "Produto", "Data"],
      ...batchLeads.map((l: any) => [
        l.name || "", l.email, l.phone || "", l.city || "", l.state || "",
        (Array.isArray(l.tags) ? l.tags.map(getTagLabel).join("; ") : ""),
        l.product_name || "", new Date(l.created_at || "").toLocaleDateString("pt-BR"),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `leads_${source}.csv`; a.click();
  }

  const exportCSV = () => {
    if (!filtered?.length) return;
    const rows = [
      ["Nome", "E-mail", "WhatsApp", "Cidade", "Estado", "Tags", "Produto", "Fonte", "Data"],
      ...filtered.map((l: any) => [
        l.name || "", l.email, l.phone || "", l.city || "", l.state || "",
        (Array.isArray(l.tags) ? l.tags.map(getTagLabel).join("; ") : ""),
        l.product_name || "", l.source || "", new Date(l.created_at || "").toLocaleDateString("pt-BR"),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "leads.csv"; a.click();
  };

  const allFilteredSelected = filtered.length > 0 && filtered.every((l: any) => selectedIds.has(l.id));

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((l: any) => l.id)));
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function bulkDelete() {
    if (!selectedIds.size) return;
    if (!confirm(`Excluir ${selectedIds.size} lead(s) selecionado(s)?`)) return;
    const ids = Array.from(selectedIds);
    for (let i = 0; i < ids.length; i += 50) {
      await supabase.from("popup_leads").delete().in("id", ids.slice(i, i + 50));
    }
    toast.success(`${ids.length} lead(s) excluído(s)`);
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: ["popup-leads"] });
  }

  function bulkExport() {
    const selected = filtered.filter((l: any) => selectedIds.has(l.id));
    if (!selected.length) return;
    const rows = [
      ["Nome", "E-mail", "WhatsApp", "Cidade", "Estado", "Tags", "Produto", "Fonte", "Data"],
      ...selected.map((l: any) => [
        l.name || "", l.email, l.phone || "", l.city || "", l.state || "",
        (Array.isArray(l.tags) ? l.tags.map(getTagLabel).join("; ") : ""),
        l.product_name || "", l.source || "", new Date(l.created_at || "").toLocaleDateString("pt-BR"),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "leads_selecionados.csv"; a.click();
  }

  async function bulkSendToUpsell() {
    if (!upsellProductId || upsellProductId === "none") { toast.error("Selecione um produto para o fluxo"); return; }
    const ids = Array.from(selectedIds);
    const productName = products?.find((p) => p.id === upsellProductId)?.name || "";
    for (let i = 0; i < ids.length; i += 50) {
      await supabase.from("popup_leads").update({
        product_id: upsellProductId,
        product_name: productName,
        tags: supabase.rpc ? undefined : undefined, // we update tags individually below
      } as any).in("id", ids.slice(i, i + 50));
    }
    // Add "funil" tag to each
    const leadsToUpdate = (leads || []).filter((l: any) => selectedIds.has(l.id));
    for (const lead of leadsToUpdate) {
      const currentTags: string[] = Array.isArray(lead.tags) ? lead.tags : [];
      const newTags = [...new Set([...currentTags, "funil", "produto_vinculado"])];
      await supabase.from("popup_leads").update({ tags: newTags, product_id: upsellProductId, product_name: productName } as any).eq("id", lead.id);
    }
    toast.success(`${ids.length} lead(s) enviado(s) para fluxo de UpSell: ${productName}`);
    setSelectedIds(new Set());
    setShowUpsellDialog(false);
    setUpsellProductId("none");
    queryClient.invalidateQueries({ queryKey: ["popup-leads"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold">Leads</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {filtered.length} lead(s) {filterTag !== "all" ? `• filtro: ${getTagLabel(filterTag)}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
            <Upload className="h-4 w-4 mr-1" /> Importar CSV
          </Button>
          {batches.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowBatches(true)}>
              <FolderOpen className="h-4 w-4 mr-1" /> Importações ({batches.length})
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowAddLead(true)}>
            <UserPlus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
          {filtered.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-1" /> Exportar
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, e-mail, cidade..." className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant={filterTag === "all" ? "default" : "outline"} className="h-7 rounded-full text-xs" onClick={() => setFilterTag("all")}>
            Todos ({leads?.length || 0})
          </Button>
          {TAG_OPTIONS.map((tag) => (
            <Button key={tag.value} size="sm" variant={filterTag === tag.value ? "default" : "outline"}
              className="h-7 rounded-full text-xs" onClick={() => setFilterTag(filterTag === tag.value ? "all" : tag.value)}>
              {tag.label} ({tagCounts[tag.value] || 0})
            </Button>
          ))}
        </div>
        {filterSource !== "all" && (
          <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => setFilterSource("all")}>
            <X className="h-3 w-3 mr-1" /> Filtro fonte: {filterSource.replace("csv_import_", "Lote ")}
          </Button>
        )}
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50 flex-wrap">
          <span className="text-sm font-medium">{selectedIds.size} selecionado(s)</span>
          <Button size="sm" variant="destructive" onClick={bulkDelete}>
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowUpsellDialog(true)}>
            <TrendingUp className="h-3.5 w-3.5 mr-1" /> Enviar para UpSell
          </Button>
          <Button size="sm" variant="outline" onClick={bulkExport}>
            <Download className="h-3.5 w-3.5 mr-1" /> Exportar Selecionados
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
            <X className="h-3.5 w-3.5 mr-1" /> Limpar seleção
          </Button>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={allFilteredSelected && filtered.length > 0} onCheckedChange={toggleSelectAll} />
                </TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead className="hidden md:table-cell">WhatsApp</TableHead>
                <TableHead className="hidden lg:table-cell">Cidade/UF</TableHead>
                <TableHead className="hidden md:table-cell">Tags</TableHead>
                <TableHead className="hidden lg:table-cell">Produto</TableHead>
                <TableHead className="hidden sm:table-cell">Fonte</TableHead>
                <TableHead className="hidden sm:table-cell">Data</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : !filtered.length ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  {search || filterTag !== "all" ? "Nenhum lead encontrado com os filtros aplicados." : "Nenhum lead capturado ainda."}
                </TableCell></TableRow>
              ) : (
                filtered.map((lead: any) => {
                  const tags: string[] = Array.isArray(lead.tags) ? lead.tags : [];
                  return (
                    <TableRow key={lead.id} data-state={selectedIds.has(lead.id) ? "selected" : undefined}>
                      <TableCell>
                        <Checkbox checked={selectedIds.has(lead.id)} onCheckedChange={() => toggleSelect(lead.id)} />
                      </TableCell>
                      <TableCell className="font-medium">{lead.name || "—"}</TableCell>
                      <TableCell className="text-sm">{lead.email}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{lead.phone || "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {[lead.city, lead.state].filter(Boolean).join(", ") || "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {tags.length > 0 ? tags.map((tag) => (
                            <span key={tag} className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${getTagStyle(tag)}`}>
                              {getTagLabel(tag)}
                            </span>
                          )) : <span className="text-muted-foreground text-xs">—</span>}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{lead.product_name || "—"}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{lead.source || "popup"}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {new Date(lead.created_at || "").toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(lead)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteLead(lead.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Import CSV Dialog */}
      <Dialog open={showImport} onOpenChange={(open) => { if (!open) resetImport(); else setShowImport(true); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {importStep === "upload" ? "Importar Leads via CSV" : "Mapear Colunas"}
            </DialogTitle>
          </DialogHeader>

          {importStep === "upload" && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 space-y-2">
                <p className="text-sm font-medium">Formato esperado:</p>
                <p className="text-xs text-muted-foreground">
                  O CSV deve conter pelo menos uma coluna de <code className="bg-muted px-1 rounded">email</code>. Colunas opcionais: nome, telefone, cidade, estado.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Vincular a Produto / Combo (opcional)</Label>
                <ProductComboSelect
                  value={importProductId}
                  onValueChange={setImportProductId}
                  placeholder="Nenhum produto"
                  allowNone
                  noneLabel="Nenhum produto"
                />
              </div>

              <div className="space-y-2">
                <Label>Tags para todos os importados</Label>
                <div className="flex flex-wrap gap-1.5">
                  {TAG_OPTIONS.map((tag) => (
                    <Button key={tag.value} type="button" size="sm"
                      variant={importTags.includes(tag.value) ? "default" : "outline"}
                      className="h-7 rounded-full text-xs"
                      onClick={() => setImportTags((current) => toggleTag(current, tag.value))}>
                      {tag.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-1" /> Enviar Arquivo
                </Button>
                <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
              </div>
              <Textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} rows={8}
                placeholder={"email,nome,telefone,cidade,estado\njoao@email.com,João Silva,5511999999999,São Paulo,SP"} />
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">{csvText.trim().split("\n").filter(Boolean).length} linha(s)</span>
                <Button onClick={proceedToMapping} disabled={!csvText.trim()}>
                  Próximo: Mapear Colunas
                </Button>
              </div>
            </div>
          )}

          {importStep === "mapping" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Associe cada coluna do CSV ao campo correspondente. Pelo menos uma deve ser "E-mail".</p>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {csvColumns.map((col, i) => (
                        <TableHead key={i} className="min-w-[140px]">
                          <div className="space-y-1">
                            <span className="text-xs font-semibold">{col}</span>
                            <Select value={columnMapping[i] || "ignore"} onValueChange={(v) => setColumnMapping((prev) => ({ ...prev, [i]: v }))}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {LEAD_FIELDS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvPreview.map((row, ri) => (
                      <TableRow key={ri}>
                        {row.map((cell, ci) => (
                          <TableCell key={ci} className="text-xs py-1.5 max-w-[160px] truncate">{cell || "—"}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <p className="text-xs text-muted-foreground">Preview das primeiras {csvPreview.length} linha(s) de {allCsvRows.length} total.</p>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setImportStep("upload")}>Voltar</Button>
                <Button onClick={handleCSVImport} disabled={importing}>
                  {importing ? "Importando..." : `Importar ${allCsvRows.length} Lead(s)`}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Batches Dialog */}
      <Dialog open={showBatches} onOpenChange={setShowBatches}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Importações CSV</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {batches.map((batch) => (
              <div key={batch.source} className="flex items-center justify-between border rounded-lg p-3">
                <div>
                  <p className="text-sm font-medium">{batch.count} lead(s)</p>
                  <p className="text-xs text-muted-foreground">{new Date(batch.date).toLocaleDateString("pt-BR")} — {batch.source.replace("csv_import_", "Lote ")}</p>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => { setFilterSource(batch.source); setShowBatches(false); }}>
                    <Search className="h-3.5 w-3.5 mr-1" /> Filtrar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => exportBatch(batch.source)}>
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteBatch(batch.source)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            {batches.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhuma importação CSV registrada.</p>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Lead Dialog */}
      <Dialog open={showAddLead} onOpenChange={setShowAddLead}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar Lead</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nome</Label><Input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} /></div>
              <div><Label>E-mail *</Label><Input value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} type="email" /></div>
            </div>
            <div><Label>WhatsApp</Label><Input value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Cidade</Label><Input value={addForm.city} onChange={(e) => setAddForm({ ...addForm, city: e.target.value })} /></div>
              <div>
                <Label>Estado</Label>
                <Select value={addForm.state || "none"} onValueChange={(v) => setAddForm({ ...addForm, state: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {BRAZILIAN_STATES.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-1.5">
                {TAG_OPTIONS.map((tag) => (
                  <Button key={tag.value} type="button" size="sm"
                    variant={addForm.tags.includes(tag.value) ? "default" : "outline"}
                    className="h-7 rounded-full text-xs"
                    onClick={() => setAddForm({ ...addForm, tags: toggleTag(addForm.tags, tag.value) })}>
                    {tag.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Produto Vinculado</Label>
              <Select value={addForm.product_id} onValueChange={(v) => setAddForm({ ...addForm, product_id: v })}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {products?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddLead(false)}>Cancelar</Button>
            <Button onClick={addLead}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Lead Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Lead</DialogTitle></DialogHeader>
          {editingLead && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Nome</Label><Input value={editingLead.name || ""} onChange={(e) => setEditingLead({ ...editingLead, name: e.target.value })} /></div>
                <div><Label>E-mail</Label><Input value={editingLead.email} disabled className="bg-muted" /></div>
              </div>
              <div><Label>WhatsApp</Label><Input value={editingLead.phone || ""} onChange={(e) => setEditingLead({ ...editingLead, phone: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Cidade</Label><Input value={editingLead.city || ""} onChange={(e) => setEditingLead({ ...editingLead, city: e.target.value })} /></div>
                <div>
                  <Label>Estado</Label>
                  <Select value={editingLead.state || "none"} onValueChange={(v) => setEditingLead({ ...editingLead, state: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {BRAZILIAN_STATES.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-1.5">
                  {TAG_OPTIONS.map((tag) => (
                    <Button key={tag.value} type="button" size="sm"
                      variant={editingLead.tags?.includes(tag.value) ? "default" : "outline"}
                      className="h-7 rounded-full text-xs"
                      onClick={() => setEditingLead({ ...editingLead, tags: toggleTag(editingLead.tags || [], tag.value) })}>
                      {tag.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Produto Vinculado</Label>
                <Select value={editingLead.product_id || "none"} onValueChange={(v) => setEditingLead({ ...editingLead, product_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {products?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>Cancelar</Button>
            <Button onClick={saveEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* UpSell Flow Dialog */}
      <Dialog open={showUpsellDialog} onOpenChange={setShowUpsellDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Enviar para Fluxo de UpSell</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {selectedIds.size} lead(s) selecionado(s) serão vinculados ao produto e marcados com a tag "Funil".
            </p>
            <div className="space-y-2">
              <Label>Produto / Combo do Fluxo de UpSell</Label>
              <ProductComboSelect
                value={upsellProductId}
                onValueChange={setUpsellProductId}
                placeholder="Selecione um produto"
                allowNone
                noneLabel="Selecione..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpsellDialog(false)}>Cancelar</Button>
            <Button onClick={bulkSendToUpsell} disabled={upsellProductId === "none"}>
              <TrendingUp className="h-4 w-4 mr-1" /> Enviar para UpSell
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
