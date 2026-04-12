
Objetivo: corrigir de vez a entrada das mensagens em Conversas, sem depender de reconectar manualmente toda hora.

Diagnóstico provável
- O painel conseguiu configurar o webhook com sucesso, mas o frontend continua recebendo `[]` em `whatsapp_message_log` e `whatsapp_conversations`.
- No código atual, a função `whatsapp-instance` cria a instância sem preencher `tenant_id`.
- O webhook `whatsapp-evolution-webhook` usa o `tenant_id` da instância para gravar conversa/log. Se a instância estiver sem `tenant_id`, as mensagens podem ser gravadas sem vínculo do tenant e depois ficam invisíveis no painel por causa do isolamento multi-loja.
- O `whatsapp-send` atual também não está recriando/atualizando `whatsapp_conversations`, então nem as mensagens enviadas pelo painel garantem aparecer no chat.
- O webhook externo também precisa ficar explicitamente configurado como endpoint público no `config.toml`, para eliminar qualquer risco de bloqueio por JWT.
- Além disso, o parser do webhook está frágil: ele assume poucos formatos de payload da Evolution. Se a instância vier em outro campo, o vínculo com a instância falha.

Plano de implementação

1. Corrigir a base da integração
- Atualizar `supabase/functions/whatsapp-instance/index.ts` para salvar `tenant_id` ao criar a instância.
- Na mesma função, ao consultar/reconfigurar status, persistir também metadados úteis da instância conectada se vierem da API.

2. Fortalecer o webhook de entrada
- Ajustar `supabase/functions/whatsapp-evolution-webhook/index.ts` para:
  - aceitar mais variações de payload/evento da Evolution;
  - localizar a instância por mais de um campo possível;
  - rejeitar/registrar claramente quando não conseguir mapear a instância;
  - sempre gravar `tenant_id`, `instance_id` e, quando possível, `conversation_id`.
- Adicionar logs melhores para eventos ignorados, payload inválido e falha de vínculo com instância.

3. Garantir que o painel mostre também mensagens enviadas
- Atualizar `supabase/functions/whatsapp-send/index.ts` para também fazer upsert em `whatsapp_conversations`.
- Corrigir o log para usar os identificadores corretos da instância e salvar o mesmo `tenant_id` da instância usada no disparo.

4. Ajustar configuração do webhook externo
- Atualizar `supabase/config.toml` para declarar `whatsapp-evolution-webhook` como função pública de webhook, sem depender de configuração implícita.
- Isso evita o cenário em que a Evolution chama a URL, mas a função não processa por proteção indevida.

5. Fazer reparo de dados já criados
- Criar uma migração para backfill seguro:
  - preencher `tenant_id` ausente em `whatsapp_instances` existentes;
  - preencher `tenant_id`/`instance_id` ausentes em `whatsapp_message_log` e `whatsapp_conversations` quando for possível deduzir pela instância;
  - manter sem sobrescrever dados válidos.
- Revisar as policies das tabelas de WhatsApp para confirmar que usuários autenticados do tenant conseguem ler conversas/logs corretamente.

6. Melhorar a tela de conversas
- Ajustar `src/components/admin/WhatsAppConversations.tsx` para carregar mensagens por `contact_phone + instance_id`, evitando misturar conversas de números iguais em instâncias diferentes.
- Adicionar estados de diagnóstico na UI, por exemplo:
  - “Webhook sem eventos ainda”
  - “Instância sem tenant vinculado”
  - “Nenhuma mensagem recebida desta instância”
- Se couber no escopo, mostrar “último evento recebido” na aba de instâncias.

Validação após implementação
- Testar uma instância já conectada.
- Enviar uma mensagem real do celular para esse número e confirmar:
  - criação/atualização em `whatsapp_message_log`;
  - criação/atualização em `whatsapp_conversations`;
  - exibição imediata na aba Conversas.
- Enviar resposta pelo painel e confirmar que a conversa continua no mesmo thread.
- Testar reconexão + botão Webhook + nova mensagem real após reconectar.
- Validar com mais de uma instância para garantir que o filtro por WhatsApp continue consistente.

Detalhes técnicos
- Arquivos principais: `supabase/functions/whatsapp-instance/index.ts`, `supabase/functions/whatsapp-evolution-webhook/index.ts`, `supabase/functions/whatsapp-send/index.ts`, `supabase/config.toml`, `src/components/admin/WhatsAppConversations.tsx`, nova migration SQL.
- Causa mais forte encontrada: dependência de `tenant_id` da instância para gravar conversas, mas a criação da instância hoje não preenche esse campo.
- Resultado esperado: assim que uma mensagem chegar no número conectado, ela entra no banco com tenant/instância corretos e passa a aparecer no menu Conversas sem intervenção manual.
