# Scriptis — Replan: Agente de IA Universal para Scripts

## Visão Atualizada
Scriptis vira um **agente de conversação universal**: você descreve a situação em linguagem natural, o agente entende o contexto, propõe o script certo (abordagem, follow-up, objeção, fechamento, reagendamento, etc.) e entrega o prompt elaborado para reutilizar em qualquer IA.

## Mudanças Principais

### 1. Entrada Central — Estilo Agente de IA
- Um único campo de texto grande no centro da tela ("Descreva a situação…")
- Aceita linguagem natural: "Preciso fazer follow-up com a Carla da clínica, ela pediu para ligar terça mas não atendeu"
- O agente extrai: nome, nicho, canal, objetivo, tom, relacionamento, gancho, **momento da conversa**, **objeção**, **próximo passo desejado**
- Sugere campos faltantes só se necessário (progressive disclosure)

### 2. Tipos de Script (não apenas "abordagem inicial")
| Tipo | Quando usar | Estrutura típica |
|------|-------------|------------------|
| Abordagem inicial | Primeiro contato | 2–4 mensagens + pergunta final |
| Follow-up | Após silêncio/resposta vaga | 1–3 mensagens, reengaja sem pressão |
| Tratamento de objeção | "Está caro", "Não tenho tempo", "Já tenho fornecedor" | Valida + reposiciona + pergunta |
| Fechamento/Próximo passo | Agendar, enviar proposta, fechar | Direto, com CTA claro |
| Reagendamento | Cliente pediu para mudar | Empático + opções concretas |
| Reconexão | Cliente antigo, indicação fria | Contexto + valor + convite leve |
| Nutrição/Valor | Enviar conteúdo, case, insight | Curto + link/anexo + pergunta |
| Resposta a lead inbound | Lead veio de anúncio/form | Rápido + qualifica + agenda |

### 3. Modelo de Geração Híbrido
- **Gratuito/Local** (padrão): regras determinísticas + templates parametrizados, funciona offline, sem custo
- **Llama (Ollama local)**: roda na máquina do usuário via `http://localhost:11434`, modelo `llama3.1:8b` ou `llama3.2:3b` — gratuito, privado, sem chave
- **Anthropic (Claude)**: opcional, pago, nuvem — para quem quer qualidade máxima
- **OpenAI-compatible**: qualquer endpoint compatível (LM Studio, vLLM, Together, Groq, etc.)
- Seleção visível no rodapé do painel lateral: "Motor: Local · Llama (local) · Claude · OpenAI-compatível"

### 4. Prompt Elaborado (Prompt Engineering Automático)
- O agente **sempre** gera o prompt reutilizável completo
- Inclui: system prompt, few-shot examples, chain-of-thought, output schema JSON, guardrails factuais
- Usuário copia e roda em qualquer IA (ChatGPT, Claude, Gemini, Llama local, etc.)
- Prompt versionado: v1, v2… conforme o usuário refina

### 5. Design Modernizado (Inspiração: AI Agent Landing)
- **Tema**: Dark mode nativo, verde-sálvia (#6fc78b) como accent, grafite/carvão de fundo
- **Tipografia**: Geist Variable (UI) + Geist Mono Variable (código/prompt)
- **Layout**: Sidebar colapsável (280px → 64px), painel central fluido, área de resultado expansível
- **Componentes**: 
  - Input "agente" com auto-resize, placeholder animado, ícone de microfone (futuro voice)
  - Cards de script com abas de variante, numeração de mensagens, copy por bloco
  - Prompt em `<pre>` com syntax highlight, botão "Copiar prompt", badge de versão
  - Toast não-intrusivo, loading skeleton com barras verdes
  - Empty state ilustrado (SVG), onboarding em 1 passo
- **Motion**: 160–220ms ease-out, respects `prefers-reduced-motion`
- **Acessibilidade**: foco visível, ARIA labels, skip link, contraste ≥4.5:1

### 6. Histórico Unificado
- Uma lista cronológica (conta ou localStorage)
- Cada entrada: situação original (resumida), tipo detectado, 3 variantes, prompt, favoritos
- Busca semântica por texto livre (futuro: embeddings locais)
- Filtro por tipo, canal, favorito, motor usado

### 7. Arquitetura de Código (Vertical Slices TDD)
```
src/lib/
  agent/
    parseSituation.ts      # NL → LeadInput estruturado (Zod)
    detectScriptType.ts    # Classifica em um dos 8 tipos
    buildPrompt.ts         # Gera prompt elaborado v1/v2/v3
    composeLocal.ts        # Motor gratuito determinístico
    composeLlama.ts        # Cliente Ollama (fetch + streaming)
    composeAnthropic.ts    # Cliente Anthropic (SDK)
    composeOpenAI.ts       # Cliente OpenAI-compatível
    index.ts               # Orquestrador: parse → detect → compose → prompt
  domain.ts                # Tipos unificados (LeadInput, ScriptType, Variant, Generation, PromptVersion)
  local-history.ts         # Atualizado para novo schema
  backend/                 # Rotas Next.js (config, generate, history, auth, models)
src/components/
  AgentInput.tsx           # Campo central estilo chat/agente
  ScriptCard.tsx           # Variante com mensagens numeradas
  PromptDisplay.tsx        # Prompt elaborado com syntax highlight
  ModelSelector.tsx        # Dropdown no sidebar
  HistoryList.tsx          # Lista unificada
  Workspace.tsx            # Orquestra tudo (substitui o atual)
src/app/
  page.tsx                 # Entry point
  api/generate/route.ts    # Unifica local/llama/anthropic/openai
  api/models/route.ts      # Lista modelos disponíveis (Ollama tags, etc.)
```

## Critérios de Aceite Atualizados
- [ ] Usuário descreve situação em linguagem natural → agente propõe script adequado ao momento
- [ ] 8 tipos de script cobertos com estrutura apropriada cada
- [ ] 3 variantes por geração, mensagens sequenciais numeradas, pergunta final
- [ ] Prompt elaborado (system + few-shot + schema + guardrails) copiável
- [ ] Motor Local (gratuito) + Llama (Ollama local) + Anthropic + OpenAI-compatível
- [ ] Seleção de motor visível e persistida
- [ ] Histórico unificado (conta + local) com busca e filtros
- [ ] Design dark, sálvia, Geist, cantos suaves, motion reduzível
- [ ] Funciona em mobile (empilha sidebar, input central full-width)
- [ ] Build passa: `npm run check` (test + typecheck + lint + build)

## Próximos Passos (ordem de execução)
1. Atualizar `domain.ts` com novos tipos (ScriptType, SituationInput, PromptVersion, ModelConfig)
2. Implementar `parseSituation`, `detectScriptType`, `buildPrompt` com testes TDD
3. Implementar motores: `composeLocal` (evolução do atual), `composeLlama`, `composeOpenAI`, manter `composeAnthropic`
4. Orquestrador `agent/index.ts` + rota `/api/generate` unificada + `/api/models`
5. UI: `AgentInput`, `ScriptCard`, `PromptDisplay`, `ModelSelector`, `HistoryList`, novo `Workspace`
6. CSS modernizado (já alinhado, ajustar para novo layout)
7. Testes E2E Playwright: fluxo completo agente → script → prompt → histórico
8. Build, commit, push GitHub, deploy Vercel (preview)
