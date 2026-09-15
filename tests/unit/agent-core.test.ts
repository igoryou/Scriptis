import assert from "node:assert/strict";
import test from "node:test";

const situations = [
  {
    raw: "Preciso fazer a primeira abordagem no WhatsApp para a Carla, que é dona de uma clínica odontológica. Quero agendar uma reunião.",
    expected: {
      name: "Carla",
      niche: "Clínica odontológica",
      channel: "WhatsApp",
      objective: "Agendar reunião",
      scriptType: "abordagem_inicial",
    },
  },
  {
    raw: "Follow-up com o João da imobiliária. Ele viu minha proposta mas não respondeu. Canal: E-mail. Tom consultivo.",
    expected: {
      name: "João",
      niche: "Imobiliária",
      channel: "E-mail",
      tone: "Consultivo",
      objective: "Follow-up",
      scriptType: "follow_up",
    },
  },
  {
    raw: "A Maria da consultoria disse que está caro. Preciso tratar a objeção de preço no WhatsApp. Relacionamento: já conversamos antes.",
    expected: {
      name: "Maria",
      niche: "consultoria",
      channel: "WhatsApp",
      objection: "está caro",
      scriptType: "tratamento_objeção",
      relationship: "Já conversamos antes",
    },
  },
  {
    raw: "Fechamento com o Pedro do e-commerce. Ele tem interesse, quero agendar a assinatura do contrato. LinkedIn, tom formal.",
    expected: {
      name: "Pedro",
      niche: "e-commerce",
      channel: "LinkedIn",
      tone: "Formal",
      objective: "Agendar reunião",
      scriptType: "fechamento_proximo_passo",
    },
  },
  {
    raw: "Reativar o Carlos da agência de marketing. Ele era cliente, parou de responder. Instagram DM, tom casual.",
    expected: {
      name: "Carlos",
      niche: "agência de marketing",
      channel: "Instagram DM",
      tone: "Casual",
      scriptType: "reativacao",
    },
  },
  {
    raw: "Enviar um case de sucesso para a Ana da arquitetura. Nutrição de valor, WhatsApp, sem pedido direto.",
    expected: {
      name: "Ana",
      niche: "arquitetura",
      channel: "WhatsApp",
      scriptType: "nutricao_valor",
    },
  },
  {
    raw: "Lead inbound: Rafael preencheu o formulário do site querendo consultoria. Resposta rápida no WhatsApp.",
    expected: {
      name: "Rafael",
      niche: "consultoria",
      channel: "WhatsApp",
      scriptType: "resposta_inbound",
    },
  },
  {
    raw: "O Ricardo da clínica pediu para reagendar nossa reunião de terça para quinta. WhatsApp, tom casual.",
    expected: {
      name: "Ricardo",
      niche: "clínica",
      channel: "WhatsApp",
      tone: "Casual",
      nextStep: "nossa reunião de terça para quinta",
      scriptType: "reativacao",
    },
  },
];

test("parseSituation extrai campos estruturados de linguagem natural variada", async () => {
  const { parseSituation } = await import("../../src/lib/agent/parseSituation");
  
  for (const { raw, expected } of situations) {
    const result = await parseSituation(raw);
    
    for (const key of Object.keys(expected) as Array<keyof typeof expected>) {
      if (key === 'niche') {
        assert.equal(result[key].toLowerCase(), expected[key].toLowerCase(), `Campo ${key} para "${raw}"`);
      } else {
        assert.equal(result[key], expected[key], `Campo ${key} para "${raw}"`);
      }
    }
    
    // Campos obrigatórios sempre presentes
    assert.ok(result.name, "Nome extraído");
    assert.ok(result.niche, "Nicho extraído");
    assert.ok(result.channel, "Canal extraído ou padrão");
    assert.ok(result.objective, "Objetivo extraído ou padrão");
    assert.ok(result.tone, "Tom extraído ou padrão");
    assert.ok(result.relationship, "Relacionamento extraído ou padrão");
    assert.ok(result.scriptType, "Tipo de script detectado");
    assert.ok(typeof result.hook === "string", "Hook string");
    assert.ok(typeof result.objection === "string", "Objeção string");
    assert.ok(typeof result.nextStep === "string", "Próximo passo string");
    assert.ok(typeof result.context === "string", "Contexto string");
  }
});

test("parseSituation usa defaults sensíveis quando informação falta", async () => {
  const { parseSituation } = await import("../../src/lib/agent/parseSituation");
  
  const result = await parseSituation("Quero falar com alguém sobre vendas");
  
  assert.ok(result.name.length > 0, "Nome não vazio");
  assert.ok(result.niche.length > 0, "Nicho não vazio");
  assert.equal(result.channel, "WhatsApp", "Canal padrão WhatsApp");
  assert.equal(result.tone, "Consultivo", "Tom padrão Consultivo");
  assert.equal(result.relationship, "Contato frio", "Relacionamento padrão");
});

test("detectScriptType classifica corretamente cada situação", async () => {
  const { detectScriptType } = await import("../../src/lib/agent/detectScriptType");
  
  for (const { raw, expected } of situations) {
    const parsed = await (await import("../../src/lib/agent/parseSituation")).parseSituation(raw);
    const scriptType = detectScriptType(parsed);
    assert.equal(scriptType, expected.scriptType, `Tipo para "${raw}"`);
  }
});

test("buildPrompt gera prompt elaborado com system prompt, few-shot, schema e guardrails", async () => {
  const { buildPrompt } = await import("../../src/lib/agent/buildPrompt");
  const { parseSituation } = await import("../../src/lib/agent/parseSituation");
  
  const raw = "Follow-up com a Carla da clínica odontológica no WhatsApp. Ela não respondeu minha proposta.";
  const parsed = await parseSituation(raw);
  const promptVersions = buildPrompt(parsed);
  
  assert.ok(Array.isArray(promptVersions), "Retorna array de versões");
  assert.ok(promptVersions.length >= 1, "Pelo menos uma versão");
  assert.ok(promptVersions.length <= 5, "Máximo 5 versões");
  
  const v1 = promptVersions[0];
  assert.equal(v1.version, 1, "Versão 1");
  assert.ok(v1.systemPrompt.length >= 50, "System prompt substancial");
  assert.ok(Array.isArray(v1.fewShotExamples), "Few-shot é array");
  assert.ok(v1.fewShotExamples.length >= 1 && v1.fewShotExamples.length <= 3, "1-3 exemplos");
  assert.ok(v1.outputSchema.length >= 100, "Output schema JSON substancial");
  assert.ok(Array.isArray(v1.guardrails), "Guardrails é array");
  assert.ok(v1.guardrails.length >= 3, "Pelo menos 3 guardrails");
  assert.ok(v1.fullPrompt.length >= 200, "Prompt completo substancial");
  assert.equal(v1.engine, "local", "Engine local por padrão");
  assert.ok(v1.createdAt, "Timestamp ISO");
  
  // Verifica placeholders no prompt
  assert.ok(v1.fullPrompt.includes("{{nome}}"), "Placeholder {{nome}}");
  assert.ok(v1.fullPrompt.includes("{{nicho}}"), "Placeholder {{nicho}}");
  
  // Verifica que o few-shot usa a estrutura correta
  for (const ex of v1.fewShotExamples) {
    assert.ok(typeof ex.input === "string" && ex.input.length > 0, "Exemplo input");
    assert.ok(typeof ex.output === "string" && ex.output.length > 0, "Exemplo output");
  }
});

test("buildPrompt varia por tipo de script e canal", async () => {
  const { buildPrompt } = await import("../../src/lib/agent/buildPrompt");
  const { parseSituation } = await import("../../src/lib/agent/parseSituation");
  
  const emailResult = await parseSituation("E-mail para João da imobiliária, follow-up, tom formal");
  const whatsappResult = await parseSituation("WhatsApp para Maria da consultoria, objeção preço");
  
  const emailPrompts = buildPrompt(emailResult);
  const whatsappPrompts = buildPrompt(whatsappResult);
  
  // E-mail deve mencionar assunto e corpo único
  assert.ok(emailPrompts[0].fullPrompt.includes("assunto") || emailPrompts[0].fullPrompt.includes("Assunto"), "Prompt de e-mail menciona assunto");
  
  // WhatsApp deve mencionar mensagens numeradas
  assert.ok(whatsappPrompts[0].fullPrompt.includes("mensagem") || whatsappPrompts[0].fullPrompt.includes("Mensagem"), "Prompt de WhatsApp menciona mensagens");
});