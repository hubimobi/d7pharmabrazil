

# Revisao Completa: Interface de Conversas Estilo Chatwoot

## Problemas atuais vs Chatwoot real (screenshot)

A implementacao atual tem uma estrutura basica de 3 colunas mas falta a maioria dos elementos visuais e funcionais do Chatwoot:

### O que falta

**Sidebar esquerda (atual: icones simples)**
- Falta: secoes Conversations (All/Mentions/Unattended), Folders, Priority Conversations, Leads Inbox, Teams (Sales, Support L1), Channels (lista de instancias com icone), Labels com contadores, perfil do usuario no rodape

**Lista de conversas (atual: lista simples)**
- Falta: tabs "Minhas N" / "Nao atribuidas N" / "Todas N" com contadores
- Falta: icones de canal (WhatsApp icon) antes do nome da instancia acima de cada conversa
- Falta: botoes de sort/filter no header
- Falta: labels coloridas inline (vermelho/azul) como no screenshot

**Area de chat (atual: bolhas basicas)**
- Falta: tabs "Messages" / "Customer Dashboard" no topo
- Falta: eventos do sistema inline (e.g. "Mathew M self-assigned this conversation", "set priority to high")
- Falta: tabs "Reply" / "Private Note" no input com toggle visual
- Falta: toolbar rica (Bold, Italic, link, quote, code, list)
- Falta: botao "AI Assist" destacado
- Falta: icones de acao no input (emoji, attachment, audio, signature)
- Falta: botao "Resolve" grande no header superior direito (azul, nao ghost)
- Falta: "Close details" link clicavel ao lado do nome do canal

**Painel de contato (atual: info basica)**
- Falta: tabs "Contact" / "Copilot"
- Falta: titulo/empresa abaixo do nome
- Falta: icones de copiar ao lado de email/telefone
- Falta: localizacao com bandeira
- Falta: social links (Facebook, Twitter, LinkedIn)
- Falta: 4 action icons (chat, edit, merge, delete)
- Falta: secoes expansiveis com "+" : Conversation Actions, Conversation participants, Macros, Contact Attributes, Conversation Information, Previous Conversations

## Plano de implementacao

### Arquivo modificado
- `src/components/admin/WhatsAppConversations.tsx` — reescrita completa (~1000 linhas)

### Mudancas estruturais

**1. Sidebar esquerda expandida (~200px em vez de 56px)**
- Header com nome da loja + dropdown
- Campo de busca global
- Icone de compose (nova conversa)
- Secao "Conversations" expansivel: All Conversations, Mentions, Unattended
- Secao "Folders": Priority Conversations, Leads Inbox
- Secao "Teams": Sales, Support L1
- Secao "Channels": lista de instancias WhatsApp ativas com icone verde/vermelho
- Secao "Labels": tags existentes com contadores
- Rodape: avatar + nome do usuario logado

**2. Lista de conversas redesenhada**
- Tabs: "Minhas N" / "Nao atribuidas N" / "Todas N" com badges de contagem
- Icone de canal WhatsApp + nome da instancia acima de cada item
- Labels coloridas (badges com cores) inline
- Icones de sort e filter no header

**3. Chat area profissional**
- Header: avatar + nome + icone de alerta + canal + "Fechar detalhes" link + botao "Resolve" azul grande no canto direito
- Tabs "Mensagens" / "Painel do Cliente" abaixo do header
- Mensagens com eventos do sistema entre as bolhas (atribuicao, mudanca de prioridade, etc.)
- Input area com tabs "Responder" / "Nota Privada" (nota privada com fundo amarelo)
- Toolbar rica: B, I, link, quote, emoji, attach, code, list
- Icones de acao: emoji, attach, audio, download, AI Assist
- Botao "Enviar (Enter)" azul alinhado a direita
- Hint text: "Shift + enter for new line. Start with '/' to select a Canned Response."

**4. Painel de contato expandido**
- Tabs "Contato" / "Copilot"
- Avatar grande + nome + icones de info/edit
- Email com icone de copiar
- Telefone com icone de copiar
- Empresa e localizacao
- 4 botoes de acao: conversa, editar, mesclar, excluir
- Secoes acordeon com "+": Acoes da Conversa, Participantes, Macros, Atributos do Contato, Informacoes da Conversa, Conversas Anteriores

### Dados (sem mudancas no banco)
- Usa `whatsapp_conversations`, `whatsapp_message_log`, `whatsapp_templates`, `whatsapp_instances`
- Realtime mantido

### Paleta Chatwoot
- Sidebar: `bg-white` com bordas sutis (light mode, como no screenshot)
- Accent: `#1F93FF` (azul Chatwoot)
- Active tab: underline azul
- Resolve button: `bg-blue-500 text-white`
- Private Note bg: `bg-amber-50`
- Outbound bubble: `bg-blue-500 text-white` (ou `bg-emerald-100`)
- Inbound bubble: `bg-white border`
- System events: texto centralizado cinza

