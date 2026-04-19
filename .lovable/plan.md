
Objetivo: resolver de vez o problema de conversas que não entram e auditar se os envios estão corretos, porque hoje há sinais de problema operacional na Evolution e também fragilidades de implementação.

1. Diagnóstico confirmado
- O webhook está recebendo eventos da Evolution, então a URL do webhook existe e está sendo chamada.
- Porém os logs mostram apenas `connection.update` com estado `connecting`, nunca `open`.
- Sem `MESSAGES_UPSERT`, nada entra em `whatsapp_conversations` nem `whatsapp_message_log`.
- Então existe sim algo além da UI: a integração com a Evolution precisa ser validada no nível de conexão real da instância e assinatura do webhook/eventos.

2. O que também encontrei no código
- A configuração da Evolution está sendo lida/salva em `store_settings` sem filtro por tenant em pontos críticos.
- O envio direto (`whatsapp-send`) escolhe instância conectada sem filtrar por tenant.
- A tela de conversas carrega mensagens por `contact_phone` apenas, sem filtrar por `instance_id`, o que pode misturar conversas de números/canais diferentes.
- A UI mostra status salvo no banco, mas não evidencia bem quando a instância está travada em `connecting`.
- O envio manual direto não reutiliza toda a lógica mais robusta do processador de fila.

3. Plano de correção
A. Validar e endurecer a integração Evolution
- Revisar o fluxo `create / qrcode / status / set_webhook`.
- Adicionar verificação explícita da configuração do webhook e dos eventos realmente ativos na Evolution.
- Exibir na UI o estado real retornado pela Evolution (`open`, `connecting`, `close`) em vez de só traduzir para um status simplificado.
- Adicionar alerta claro quando a instância ficar presa em `connecting` por mais de alguns minutos.

B. Corrigir escopo por tenant
- Ajustar leitura e gravação de `evolution_api_url` e `evolution_api_key` para usar o tenant atual.
- Ajustar `whatsapp-send` para selecionar apenas instâncias do tenant correto.
- Revisar pontos da página admin que usam `store_settings` sem `tenant_id`.

C. Corrigir leitura das conversas
- Ajustar `loadMessages` em `WhatsAppConversations` para filtrar por `contact_phone` + `instance_id` e, quando necessário, `tenant_id`.
- Revisar realtime para evitar anexar mensagem de outro canal só porque o telefone coincide.
- Garantir que Super Boss veja tudo sem misturar canais errados.

D. Auditar e corrigir envios
- Revisar `whatsapp-send` para:
  - respeitar tenant;
  - escolher instância correta;
  - registrar erros da Evolution com mais clareza;
  - padronizar `instance_name`;
  - opcionalmente enfileirar mais cenários no processador quando não houver instância apta.
- Revisar coerência entre envio direto e `whatsapp-process-queue`, porque hoje o processador está mais completo que o envio manual.

4. Arquivos a ajustar
- `src/pages/admin/IntegrationsPage.tsx`
- `src/pages/admin/WhatsAppPage.tsx`
- `src/components/admin/WhatsAppConversations.tsx`
- `supabase/functions/whatsapp-instance/index.ts`
- `supabase/functions/whatsapp-send/index.ts`
- possivelmente `supabase/functions/whatsapp-process-queue/index.ts`

5. Resultado esperado após implementação
- A tela vai mostrar claramente se o problema é webhook, conexão travada ou instância desconectada.
- Conversas passarão a aparecer corretamente por canal/instância.
- Super Boss poderá visualizar tudo sem confusão entre tenants/canais.
- Envios manuais e automáticos ficarão consistentes e com diagnóstico melhor quando falharem.

6. Detalhes técnicos importantes
- Hoje o principal bloqueio de entrada continua sendo: a Evolution não está chegando em `open`.
- Mas mesmo corrigindo isso, ainda vale corrigir o código, porque há riscos reais de:
  - usar credencial/configuração do tenant errado;
  - enviar por instância errada;
  - misturar histórico entre canais;
  - mascarar falhas reais da Evolution.
- Ou seja: o problema atual é uma combinação de operação da Evolution + pontos do código que precisam ficar mais seguros e previsíveis.
