
Objetivo: fazer o WhatsApp voltar a funcionar de ponta a ponta: executar funis, mostrar fila real, enviar transmissões e preencher Conversas com filtros funcionando.

O que eu confirmei no projeto
- Existem mensagens na fila no banco: hoje há 16 registros pendentes em `whatsapp_message_queue`.
- A fila aparece vazia no painel porque a policy dessa tabela ainda usa `is_admin()` (role exato `admin`). Isso bloqueia contas como `super_admin` e `administrador`.
- A aba Transmissão ainda não dispara nada de verdade: o botão `startBroadcast()` só mostra toast de sucesso e não enfileira contatos.
- Conversas está vazia porque também não há nenhuma mensagem gravada em `whatsapp_message_log` e nenhuma linha em `whatsapp_conversations`.
- O processador da fila não está enviando porque não existe nenhuma instância conectada no banco: as 3 estão com `status = 'qr_ready'` e `connected_instances = 0`.
- Os logs recentes do webhook mostram apenas `connection.update`; não apareceu `messages.upsert`, então as mensagens recebidas não estão entrando no banco.
- Há um risco adicional de visibilidade por tenant: existe usuário com role `administrador` sem vínculo em `tenant_users`, então tabelas com policy `tenant_id = current_tenant_id()` podem voltar vazias para esse perfil.

Plano de implementação
1. Corrigir acesso/RLS do módulo WhatsApp
- Atualizar as policies de `whatsapp_message_queue` e `whatsapp_contacts` para usar `has_any_role(...)` no mesmo padrão já aplicado a templates/funis.
- Revisar as policies de `whatsapp_instances`, `whatsapp_message_log` e `whatsapp_conversations` para garantir acesso consistente para papéis administrativos.
- Fazer backfill seguro de `tenant_users` para usuários administrativos que hoje têm role mas não têm tenant associado.

2. Consertar a entrada de mensagens em Conversas
- Reforçar `whatsapp-evolution-webhook` para aceitar variações reais do payload da Evolution e registrar melhor qual evento chegou.
- Garantir resolução correta da instância e gravação consistente em `whatsapp_message_log` e `whatsapp_conversations`.
- Melhorar atualização de status/conexão em `whatsapp-instance` e persistir corretamente quando a instância estiver aberta.

3. Consertar o disparo da fila
- Melhorar `whatsapp-process-queue` para retornar diagnóstico útil: quantas estavam aptas, quantas foram adiadas, quantas falharam por falta de instância conectada.
- Não deixar “sumir” da UI: se a mensagem for reagendada por falta de instância, isso deve aparecer claramente no painel.
- Opcionalmente disparar processamento imediato logo após um teste real / disparo manual, sem depender só do botão “Processar Fila”.

4. Implementar a Transmissão de verdade
- Substituir o placeholder da aba Transmissão por um fluxo real de seleção de audiência + enfileiramento em lote.
- Criar lógica backend para montar a lista de contatos e inserir na fila com o funil escolhido.
- Exibir resumo real: contatos encontrados, enfileirados, ignorados por falta de telefone, etc.

5. Melhorar a tela de Conversas
- Corrigir carregamento e filtros por instância/status para refletir o que existe no banco.
- Exibir estados vazios corretos: “sem mensagens recebidas”, “sem instância conectada”, “sem acesso por tenant”.
- Ajustar envio manual para atualizar a conversa e log só quando o backend realmente confirmar.

6. Validar ponta a ponta
- Testar: conectar instância -> receber mensagem -> aparecer em Conversas.
- Testar: executar funil real -> entrar na fila -> processar -> gravar log -> aparecer na conversa.
- Testar: transmissão em massa -> enfileirar -> processar -> acompanhar status na fila.
- Testar com usuário `super_admin` e com usuário `administrador`.

Arquivos que devem ser mexidos
- `supabase/functions/whatsapp-evolution-webhook/index.ts`
- `supabase/functions/whatsapp-process-queue/index.ts`
- `supabase/functions/whatsapp-instance/index.ts`
- `supabase/functions/whatsapp-webhook/index.ts`
- `src/pages/admin/WhatsAppPage.tsx`
- `src/components/admin/WhatsAppConversations.tsx`
- nova migration SQL para RLS/backfill de tenant e, se necessário, apoio ao disparo em massa

Detalhes técnicos
- Diagnóstico principal: não é um único bug; hoje existem 4 falhas combinadas:
  1) fila já é criada, mas a UI pode não enxergar por RLS;
  2) transmissão em massa não foi implementada de verdade;
  3) nenhuma instância está marcada como conectada, então o processador não envia;
  4) o webhook de entrada não está registrando `messages.upsert`, por isso Conversas fica zerado.
- Estado atual confirmado no banco:
  - `queue_pending = 16`
  - `logs_total = 0`
  - `conversations_total = 0`
  - `connected_instances = 0`
- Resultado esperado após a correção:
  - a fila aparece no painel para perfis administrativos corretos;
  - transmissões realmente criam itens na fila;
  - mensagens recebidas entram em `whatsapp_message_log` e `whatsapp_conversations`;
  - os filtros de Conversas passam a funcionar com dados reais;
  - o sistema deixa claro quando o bloqueio é “sem instância conectada” em vez de parecer que “não fez nada”.
