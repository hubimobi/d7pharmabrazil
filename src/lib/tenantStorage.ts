/**
 * Helpers para uploads no Supabase Storage isolados por tenant.
 *
 * Convenção de path: `{tenantId}/{...resto}`.
 * As políticas RLS em `storage.objects` exigem que o primeiro segmento do path
 * seja o UUID do tenant ao qual o usuário pertence (ou super_admin).
 */
export function tenantPath(tenantId: string, path: string): string {
  const clean = path.replace(/^\/+/, "");
  // Se já começa com o tenantId, retorna como está (idempotente)
  if (clean.startsWith(`${tenantId}/`)) return clean;
  return `${tenantId}/${clean}`;
}
