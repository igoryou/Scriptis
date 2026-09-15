# Scriptis — Registro de Integrações

## Supabase

Tabela `scriptis_history` com RLS (Row Level Security). Cada linha guarda um objeto `Generation` completo em `content` (jsonb). A coluna `created_at` corresponde ao `createdAt` do objeto. O `user_id` vem da sessão autenticada (`auth.uid()`).

### Operações
- GET /api/history → SELECT por `user_id` ordenado por `created_at` desc, limitado a 50.
- POST /api/history → UPSERT em `(user_id, created_at)` com o JSON validado por `generationSchema`.
- DELETE /api/history?id= → DELETE onde `user_id` e `content->>id` coincidem.

### Migração
`supabase/migrations/202609140001_integrations.sql`

### Variáveis necessárias
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=   # origem exata (ex.: https://scriptis.vercel.app)
```

### Autenticação
- Magic link: POST /api/auth {email} → Supabase `signInWithOtp` com `emailRedirectTo` = `${NEXT_PUBLIC_SITE_URL}/auth/callback`.
- Callback: GET /auth/callback?code= → `exchangeCodeForSession`, redireciona para `/` (ou `next`).
- Logout: POST /api/logout → `signOut`.

## Anthropic (opcional)

Apenas rota `/api/generate` com `provider: 'anthropic'` e usuário autenticado usa a SDK.
Nunca expõe a chave no cliente. A chamada tem deadline de 12 s e validação estrita de 3 variantes + regras de canal.
Variáveis:
```
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
```

## Comportamento

- Base gratuita: `generateLocal` (síncrono, sem rede) sempre disponível.
- Anthropic só aparece no formulário se `anthropicConfigured && user`.
- Histórico local (`localStorage`) separado do histórico da conta.
- Dados locais nunca são enviados automaticamente para a conta.
- Limite local: 50 registros mais recentes.
- Limite servidor: 50 registros por usuário.

## Testes de backend

Arquivos `tests/unit/api-*.test.ts` cobrem:
- `api-config.test.ts`: flags de configuração sem expor segredos.
- `api-http.test.ts`: deadline, limite de corpo, validação de JSON.
- `api-generate.test.ts`: geração local explícita, validação de entrada, iteração.
- `api-migration.test.ts`: SQL garante RLS e escopo por usuário.