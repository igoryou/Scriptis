# Scriptis

**Scripts que soam como você, não como um robô.**

Uma ferramenta de prospecção manual: informe o contexto do contato, receba três abordagens editáveis e leve um prompt reutilizável para a IA que preferir.

## Base gratuita — sem chave e sem IA

- Motor de composição local, síncrono, executado no navegador. Não é uma resposta simulada de IA: são regras e textos combináveis, com variedade limitada.
- WhatsApp e Instagram DM: três variantes, cada uma dividida em mensagens numeradas. E-mail: assunto e corpo. LinkedIn: mensagem única.
- Nome, nicho, canal, objetivo, tom, relacionamento e gancho opcional orientam a composição.
- Edição, cópia individual, cópia completa e prompt reutilizável.
- Favoritos, busca e histórico dos últimos 50 registros no navegador, preservando edições.
- Interface responsiva em português, modo escuro, fontes Geist hospedadas no projeto e suporte a movimento reduzido.
- Nada é enviado automaticamente. Revise os textos e acrescente os detalhes reais da sua oferta.

A composição funciona sem rede depois de a aplicação carregar. Não é um PWA com abertura offline garantida. O histórico local não é uma conta nem um backup; limpar os dados do site o apaga. Pessoas que usam o mesmo perfil de navegador podem acessar esses dados.

## Rodar localmente

Requisitos: Node.js 22 ou superior e npm.

```bash
npm ci
npm run dev
```

Abra **http://127.0.0.1:3000**. Nenhuma variável de ambiente é necessária para a base gratuita.

```bash
npm run check       # testes unitários/Postgres local + TypeScript + ESLint + build
npm run test:e2e    # testes reais de navegador e auditoria automatizada de acessibilidade
npm run build
npm start          # executar o build de produção
```

Os testes de navegador usam Edge no Windows e Chromium no Linux/macOS. Fora do Windows, instale o navegador de testes com `npx playwright install chromium`. A variável `PLAYWRIGHT_CHANNEL` permite escolher outro canal instalado.

## Anthropic opcional

A base **não troca automaticamente** para IA quando você configura uma chave. Claude só aparece como escolha no formulário quando a integração está configurada e há uma conta autenticada. A API da Anthropic é paga pelo proprietário da chave.

1. Configure Supabase conforme [docs/integrations.md](docs/integrations.md), incluindo a migração de banco.
2. Copie `.env.example` para `.env.local` e preencha as variáveis de Supabase e a URL exata do site.
3. Defina `ANTHROPIC_API_KEY` e `ANTHROPIC_MODEL` no servidor. Use um ID de modelo disponível na sua conta, compatível com tool use.
4. Reinicie a aplicação. Entre com seu e-mail e selecione **Claude · usa API paga** no formulário.

Nunca adicione `NEXT_PUBLIC_` à chave da Anthropic. Não coloque chaves no formulário nem no Git. O cliente recebe apenas indicadores de disponibilidade, nunca segredos.

Ao selecionar Claude, o contexto do contato é enviado à Anthropic. Há validação da resposta, autenticação e cota compartilhada de 30 tentativas por usuário/dia UTC. Tentativas com falha também consomem a cota, para limitar abuso. A cota não é um teto financeiro global: configure um limite de gastos na conta Anthropic antes de abrir cadastros públicos.

## Conta e sincronização opcionais

Supabase Auth usa link por e-mail. O histórico da conta é separado do histórico local e **não importa contatos automaticamente**. As tabelas usam RLS, consultas filtradas pelo usuário confirmado no servidor e uma função SQL atômica de cota. Nenhuma chave `service_role` é necessária.

O histórico sincronizado lista os 50 registros mais recentes; registros anteriores permanecem no banco até serem excluídos. Um registro agrupa o contato e as três variantes em JSON para manter o MVP simples. Consulte a migração em `supabase/migrations/`.

## Deploy na Vercel

1. Importe o repositório como projeto **Next.js** (detecção automática).
2. Use Node.js 22. Build padrão: `npm run build`.
3. Sem variáveis, a base gratuita já funciona.
4. Para contas e Claude, configure as variáveis indicadas em `.env.example` e ajuste `NEXT_PUBLIC_SITE_URL` para o domínio HTTPS do deploy. Autorize esse mesmo callback no Supabase.

Não há `vercel.json` nem configuração manual de funções. As rotas de API declaram duração máxima de 15 segundos; o servidor cancela solicitações após 12 segundos. A latência real de Claude deve ser medida com a sua chave e modelo — não é garantida por esses limites.

## Verificação e limites conhecidos

- Geração, regras do formulário, prompt, histórico e fronteiras de API têm testes automatizados.
- RLS e cota são executados contra PostgreSQL embutido (PGlite), não apenas comparados como texto SQL.
- Playwright cobre geração, edição, clipboard, favoritos, reabertura, formato de e-mail, login sem configuração e layouts de 390, 768, 1024 e 1440 px. Axe verifica regras WCAG automatizáveis; isso não substitui auditoria manual completa.
- O modo gratuito e as rotas sem configuração foram executados de verdade. Entrega de magic links, persistência no Supabase hospedado e geração real com Claude exigem credenciais e ainda precisam ser validadas no ambiente de destino.
- O motor local não inventa uma oferta, preço ou promessa. Sem esses dados, o texto é um ponto de partida, não uma proposta comercial completa.
- Não inclui CRM, disparos automáticos, WhatsApp Business API, colaboração em times ou análise de respostas.

## Estrutura

```text
src/app/              páginas e rotas HTTP Next.js
src/components/       espaço de criação, marca e login
src/lib/              domínio, composição gratuita, prompt e histórico local
src/lib/backend/      validação, limites, integração Anthropic e handlers
src/lib/supabase/     cliente SSR com cookies por solicitação
supabase/migrations/  histórico, RLS e cota atômica
tests/unit/           testes de domínio, API e PostgreSQL embutido
tests/e2e/            testes reais de navegador
```
