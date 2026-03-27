import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { format } from "date-fns";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "outline" },
  paid: { label: "Pago", variant: "default" },
  confirmed: { label: "Confirmado", variant: "default" },
  preparing: { label: "Preparando", variant: "secondary" },
  shipped: { label: "Enviado", variant: "secondary" },
  delivered: { label: "Entregue", variant: "default" },
  cancelled: { label: "Cancelado", variant: "destructive" },
  refunded: { label: "Reembolsado", variant: "destructive" },
  overdue: { label: "Vencido", variant: "destructive" },
};

const fmt = (v: number) => `R$ ${Number(v).toFixed(2).replace(".", ",")}`;

interface CouponOrdersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  couponCode: string;
}

export function CouponOrdersDialog({ open, onOpenChange, couponCode }: CouponOrdersDialogProps) {
  const [exporting, setExporting] = useState(false);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["coupon-orders", couponCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, customer_name, customer_email, customer_phone, total, status, created_at, items")
        .eq("coupon_code", couponCode)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open && !!couponCode,
  });

  const totalRevenue = orders?.filter(o => ["paid", "confirmed", "preparing", "shipped", "delivered"].includes(o.status)).reduce((s, o) => s + Number(o.total), 0) ?? 0;

  const exportPDF = async () => {
    if (!orders?.length) return;
    setExporting(true);

    // Build HTML for PDF
    const rows = orders.map(o => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px">${format(new Date(o.created_at), "dd/MM/yyyy HH:mm")}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px">${o.customer_name}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px">${o.customer_email || "—"}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px">${o.customer_phone || "—"}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px">${fmt(o.total)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px">${statusMap[o.status]?.label || o.status}</td>
      </tr>
    `).join("");

    const paidCount = orders.filter(o => ["paid", "confirmed", "preparing", "shipped", "delivered"].includes(o.status)).length;

    const html = `
      <html><head><meta charset="utf-8"><title>Vendas - Cupom ${couponCode}</title>
      <style>body{font-family:Arial,sans-serif;padding:24px;color:#1a1a2e}
      table{width:100%;border-collapse:collapse}
      th{padding:8px;text-align:left;background:#f3f4f6;border-bottom:2px solid #d1d5db;font-size:12px}
      h1{font-size:18px;margin:0 0 4px}p{margin:4px 0;font-size:13px;color:#6b7280}
      .stats{display:flex;gap:24px;margin:16px 0;padding:12px;background:#f9fafb;border-radius:8px}
      .stat{text-align:center}.stat-value{font-size:20px;font-weight:bold;color:#1a1a2e}.stat-label{font-size:11px;color:#6b7280}
      </style></head><body>
      <h1>Relatório de Vendas — Cupom ${couponCode}</h1>
      <p>Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}</p>
      <div class="stats">
        <div class="stat"><div class="stat-value">${orders.length}</div><div class="stat-label">Total Pedidos</div></div>
        <div class="stat"><div class="stat-value">${paidCount}</div><div class="stat-label">Pagos</div></div>
        <div class="stat"><div class="stat-value">${fmt(totalRevenue)}</div><div class="stat-label">Receita</div></div>
      </div>
      <table><thead><tr>
        <th>Data</th><th>Cliente</th><th>E-mail</th><th>Telefone</th><th>Total</th><th>Status</th>
      </tr></thead><tbody>${rows}</tbody></table>
      </body></html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
        setExporting(false);
      }, 500);
    } else {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Vendas do Cupom <span className="font-mono text-primary">{couponCode}</span></DialogTitle>
            <Button variant="outline" size="sm" onClick={exportPDF} disabled={exporting || !orders?.length} className="gap-2">
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              Exportar PDF
            </Button>
          </div>
        </DialogHeader>

        {/* Stats */}
        {orders && orders.length > 0 && (
          <div className="grid grid-cols-3 gap-4 my-2">
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold">{orders.length}</p>
              <p className="text-xs text-muted-foreground">Total Pedidos</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold text-green-600">
                {orders.filter(o => ["paid", "confirmed", "preparing", "shipped", "delivered"].includes(o.status)).length}
              </p>
              <p className="text-xs text-muted-foreground">Pagos</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold text-primary">{fmt(totalRevenue)}</p>
              <p className="text-xs text-muted-foreground">Receita Total</p>
            </div>
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="hidden md:table-cell">E-mail</TableHead>
              <TableHead className="hidden md:table-cell">Telefone</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : !orders?.length ? (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Nenhum pedido encontrado com este cupom</TableCell></TableRow>
            ) : (
              orders.map((o) => {
                const st = statusMap[o.status] || { label: o.status, variant: "outline" as const };
                return (
                  <TableRow key={o.id}>
                    <TableCell className="text-sm whitespace-nowrap">{format(new Date(o.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                    <TableCell className="text-sm font-medium">{o.customer_name}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{o.customer_email || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{o.customer_phone || "—"}</TableCell>
                    <TableCell className="text-sm font-semibold">{fmt(o.total)}</TableCell>
                    <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}
