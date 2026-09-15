# Shared implementation contract

Project root D:/Scriptis. All product UI is Brazilian Portuguese. Free local composer, optional paid Anthropic server integration, optional Supabase accounts. Never label local output AI.

## Domain (owned by core implementer)

File `src/lib/domain.ts` exports:

- CHANNELS = ['WhatsApp','E-mail','Instagram DM','LinkedIn'] as const
- OBJECTIVES = ['Agendar reunião','Vender produto','Follow-up','Reconexão'] as const
- TONES = ['Formal','Casual','Consultivo'] as const
- RELATIONSHIPS = ['Contato frio','Indicação','Já conversamos antes','Cliente atual'] as const
- `LeadInput` {name:string; niche:string; channel:Channel; objective:Objective; tone:Tone; hook:string; relationship:Relationship}
- `Variant` {id:string; title:string; description:string; messages:string[]; subject?:string; favorite:boolean}
- `Generation` {id:string; createdAt:string; input:LeadInput; variants:Variant[]; prompt:string; provider:'local'|'anthropic'}
- `leadInputSchema` zod strict bounded input, `generationSchema` runtime validation for persisted content.
  `src/lib/generator.ts` exports `generateLocal(input:LeadInput, iteration?:number):Generation`.
  `src/lib/prompt.ts` exports `buildReusablePrompt(input:LeadInput):string` (uses {{nome}} / {{nicho}} placeholders).
  Exactly 3 variants. WhatsApp/IG 2–4 messages, final message ends in easy question. Email one body + subject. Account for all fields. No invented referrals/observations/social proof; a provided hook may be quoted with care, absence means conditional generic hypothesis. User edits may not end in question and remain persistable. Local composer never needs network/API.

## Backend (owned by integration implementer)

- GET /api/config -> {supabaseConfigured:boolean; anthropicConfigured:boolean; user: {id:string; email:string}|null}
- POST /api/generate body {input:LeadInput;provider:'local'|'anthropic';iteration?:number} -> {generation:Generation}; errors {error:string}. local route returns free result; client can call generateLocal directly for offline free use. Anthropic requires validated Supabase user and shared rate limit, fail closed; no silent downgrade or paid default. Server env only ANTHROPIC_API_KEY and ANTHROPIC_MODEL. Get server user from Supabase not client id.
- GET /api/history -> {generations:Generation[]}; auth required; bounded most recent 50. POST body {generation:Generation} -> {generation:Generation}, persist and read back exact value, scopes every query user. Preserve createdAt and edited/favorited variants when upsert. DELETE /api/history?id=<uuid> deletes only own record and verifies.
- POST /api/auth body {email:string} sends magic link same-origin trusted configured redirect; -> {message:string}. GET /auth/callback exchanges code, safe redirect '/'. POST /api/logout clears auth cookies.
- `src/lib/supabase/server.ts`, `src/proxy.ts`, migration SQL and `.env.example`. Use own files only; don't edit frontend/config/package.
- Local composer is browser-safe. Paid SDK and service variables stay server-side. Base app never requires auth.

## Frontend (owned by parent)

`src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css`, `src/components/**`, `src/lib/local-history.ts`, `src/app/login/page.tsx` etc. Local history versioned, Zod-validated, max 50. Guest and signed-in history separated; do not auto-upload local leads. Toast/error for persistence failure. Each message/subject editable and copyable; favorites and edits persist. History search/reopen/filter. Free generator works directly in browser; choose Anthropic explicitly if available and authenticated.

## Test boundaries

Core implementer owns tests/unit/domain.test.ts, generator.test.ts, prompt.test.ts. Integration implementer owns tests/unit/api*.test.ts, integration helpers and migration verification. Parent owns local-history unit tests, browser tests, global configs. TDD vertical slices: fail, implement, pass for each behavior. Record real test commands/results in final report. Do not commit: parent does reviewed commit.
