import { leadInputSchema, type LeadInput, type ScriptType } from "../domain";


const NICHE_KEYWORDS = [
  "clínica odontológica",
  "clínica médica",
  "clínica veterinária",
  "clínica estética",
  "clínica",
  "odontológica",
  "médica",
  "hospital",
  "laboratório",
  "imobiliária",
  "corretor de imóveis",
  "imóveis",
  "consultoria",
  "consultor",
  "assessoria",
  "e-commerce",
  "loja virtual",
  "shop",
  "marketplace",
  "agência de marketing",
  "agência de publicidade",
  "agência de design",
  "agência",
  "marketing",
  "publicidade",
  "design",
  "arquitetura",
  "arquiteto",
  "engenharia",
  "infoproduto",
  "curso online",
  "mentoria",
  "coaching",
  "advocacia",
  "escritório de advocacia",
  "jurídico",
  "contabilidade",
  "contador",
  "financeiro",
  "restaurante",
  "lanchonete",
  "café",
  "bar",
  "academia",
  "personal trainer",
  "pilates",
  "yoga",
  "salão de beleza",
  "barbearia",
  "estética",
  "beleza",
  "petshop",
  "veterinária",
  "pet",
  "escola",
  "faculdade",
  "universidade",
  "curso",
  "indústria",
  "fábrica",
  "manufatura",
  "logística",
  "transporte",
  "entrega",
  "seguro",
  "corretora de seguros",
  "benefícios",
  "TI",
  "tecnologia",
  "software",
  "startup",
  "saas",
];

const CHANNEL_KEYWORDS: Record<string, string> = {
  whatsapp: "WhatsApp",
  zap: "WhatsApp",
  "e-mail": "E-mail",
  email: "E-mail",
  mail: "E-mail",
  instagram: "Instagram DM",
  insta: "Instagram DM",
  dm: "Instagram DM",
  linkedin: "LinkedIn",
  linked: "LinkedIn",
};

const OBJECTIVE_KEYWORDS: Record<string, string> = {
  agendar: "Agendar reunião",
  reunião: "Agendar reunião",
  meeting: "Agendar reunião",
  vender: "Vender produto",
  venda: "Vender produto",
  fechar: "Vender produto",
  "follow-up": "Follow-up",
  followup: "Follow-up",
  follow: "Follow-up",
  reconectar: "Reconexão",
  reativar: "Reconexão",
  voltar: "Reconexão",
};

const TONE_KEYWORDS: Record<string, string> = {
  formal: "Formal",
  profissional: "Formal",
  casual: "Casual",
  informal: "Casual",
  amigável: "Casual",
  consultivo: "Consultivo",
  consultiva: "Consultivo",
  assessoria: "Consultivo",
};

const RELATIONSHIP_KEYWORDS: Record<string, string> = {
  frio: "Contato frio",
  "contato frio": "Contato frio",
  indicação: "Indicação",
  indicado: "Indicação",
  "já conversamos": "Já conversamos antes",
  "ja conversamos": "Já conversamos antes",
  conversamos: "Já conversamos antes",
  cliente: "Cliente atual",
  "cliente atual": "Cliente atual",
};

const SCRIPT_TYPE_KEYWORDS: Record<string, ScriptType> = {
  abordagem: "abordagem_inicial",
  "primeiro contato": "abordagem_inicial",
  "primeira mensagem": "abordagem_inicial",
  "primeira abordagem": "abordagem_inicial",
  "follow-up": "follow_up",
  followup: "follow_up",
  follow: "follow_up",
  "não respondeu": "follow_up",
  "nao respondeu": "follow_up",
  silêncio: "follow_up",
  silencio: "follow_up",
  objeção: "tratamento_objeção",
  objeçao: "tratamento_objeção",
  "está caro": "tratamento_objeção",
  "esta caro": "tratamento_objeção",
  caro: "tratamento_objeção",
  "não tenho tempo": "tratamento_objeção",
  "nao tenho tempo": "tratamento_objeção",
  "já tenho": "tratamento_objeção",
  "ja tenho": "tratamento_objeção",
  fechar: "fechamento_proximo_passo",
  fechamento: "fechamento_proximo_passo",
  contrato: "fechamento_proximo_passo",
  assinar: "fechamento_proximo_passo",
  proposta: "fechamento_proximo_passo",
  "próximo passo": "fechamento_proximo_passo",
  "proximo passo": "fechamento_proximo_passo",
  reativar: "reativacao",
  reativação: "reativacao",
  "cliente antigo": "reativacao",
  "ex-cliente": "reativacao",
  parou: "reativacao",
  nutrição: "nutricao_valor",
  nutricao: "nutricao_valor",
  "enviar case": "nutricao_valor",
  "mandar case": "nutricao_valor",
  "compartilhar": "nutricao_valor",
  inbound: "resposta_inbound",
  "lead inbound": "resposta_inbound",
  formulário: "resposta_inbound",
  formulario: "resposta_inbound",
  "preencheu": "resposta_inbound",
  site: "resposta_inbound",
  reagendar: "reativacao",
  "mudar data": "reativacao",
  "outro dia": "reativacao",
};

function extractName(text: string): string {
  // Tenta padrões comuns: "com X", "para X", "o X", "a X", "chama X", "nome X"
  const patterns = [
    /(?:com\s+(?:o|a|os|as)\s+)([A-Z][a-zà-ÿ]+(?:\s+[A-Z][a-zà-ÿ]+)?)/i,
    /(?:para\s+(?:o|a|os|as)\s+)([A-Z][a-zà-ÿ]+(?:\s+[A-Z][a-zà-ÿ]+)?)/i,
    /(?:chama[-se]?\s+)([A-Z][a-zà-ÿ]+(?:\s+[A-Z][a-zà-ÿ]+)?)/i,
    /(?:nome\s+(?:é|:)\s*)([A-Z][a-zà-ÿ]+(?:\s+[A-Z][a-zà-ÿ]+)?)/i,
    /(?:contato\s+(?:é|:)\s*)([A-Z][a-zà-ÿ]+(?:\s+[A-Z][a-zà-ÿ]+)?)/i,
    /\b([A-Z][a-zà-ÿ]+(?:\s+[A-Z][a-zà-ÿ]+)?)\b/,
  ];
  
  const stopWords = new Set(["Preciso", "Quero", "Vou", "Tenho", "Faço", "Fazer", "Quero", "Vamos", "Vamos", "Vou", "Tenho", "Acho", "Penso", "Acredito", "Gostaria", "Gostaríamos", "Precisamos", "Preciso", "Devo", "Deveria", "Poderia", "Podemos", "Vamos", "Olá", "Oi", "Tudo", "Bem", "Como", "Está", "Vai", "Vão", "Faz", "Fazer", "Feito", "Feita", "Bom", "Boa", "Dia", "Noite", "Tarde", "Manhã", "Agora", "Hoje", "Amanhã", "Depois", "Antes", "Durante", "Enquanto", "Desde", "Até", "Para", "Com", "Sem", "Sobre", "Entre", "Após", "Antes", "Contra", "Perante", "Trás", "Frente", "Lado", "Perto", "Longe", "Dentro", "Fora", "Cima", "Baixo", "Da", "Do", "De", "Dos", "Das", "Na", "No", "Nas", "Nos", "Pela", "Pelo", "Pelas", "Pelos", "Reativar", "Reativação", "Reativar", "Reativei", "Reativou", "Reativamos", "Reativaram", "Seguir", "Seguindo", "Seguiu", "Seguimos", "Seguiram", "Contatar", "Contatando", "Contatei", "Contatou", "Contatamos", "Contataram", "Abordar", "Abordando", "Abordei", "Abordou", "Abordamos", "Abordaram", "Falar", "Falando", "Falei", "Falou", "Falamos", "Falaram", "Conversar", "Conversando", "Conversei", "Conversou", "Conversamos", "Conversaram", "Marcar", "Marcando", "Marquei", "Marcou", "Marcamos", "Marcaram", "Agendar", "Agendando", "Agendei", "Agendou", "Agendamos", "Agendaram", "Enviar", "Enviando", "Enviei", "Enviou", "Enviamos", "Enviaram", "Compartilhar", "Compartilhando", "Compartilhei", "Compartilhou", "Compartilhamos", "Compartilharam", "Ligar", "Ligando", "Liguei", "Ligou", "Ligamos", "Ligaram", "Chamar", "Chamando", "Chamei", "Chamou", "Chamamos", "Chamaram", "Procurar", "Procurando", "Procurai", "Procurou", "Procuramos", "Procuraram", "Lead", "Inbound", "Outbound", "Prospect", "Lead", "Cliente", "Contato", "Pessoa", "Indivíduo", "Sujeito"]);
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].length >= 2 && match[1].length <= 40) {
      const name = match[1].trim();
      // Remove preposições do final se houver
      const cleanName = name.replace(/\s+(da|do|de|dos|das|na|no|nas|nos|pela|pelo|pelas|pelos)$/i, '').trim();
      if (!stopWords.has(cleanName) && cleanName.length >= 2) {
        return cleanName.charAt(0).toUpperCase() + cleanName.slice(1).toLowerCase();
      }
    }
  }
  
  // Fallback: procura por nomes próprios (capitalizados) que não sejam stop words
  const properNames = text.match(/\b[A-Z][a-zà-ÿ]+(?:\s+[A-Z][a-zà-ÿ]+)?\b/g);
  if (properNames && properNames.length > 0) {
    for (const name of properNames) {
      const cleanName = name.replace(/\s+(da|do|de|dos|das|na|no|nas|nos|pela|pelo|pelas|pelos)$/i, '').trim();
      if (!stopWords.has(cleanName) && cleanName.length >= 2) {
        return cleanName;
      }
    }
  }
  return "Contato";
}

function extractNiche(text: string): string {
  const lower = text.toLowerCase();
  for (const keyword of NICHE_KEYWORDS) {
    if (lower.includes(keyword)) {
      // Capitaliza primeira letra
      return keyword.charAt(0).toUpperCase() + keyword.slice(1);
    }
  }
  return "Negócio";
}

function extractChannel(text: string): LeadInput["channel"] {
  const lower = text.toLowerCase();
  for (const [keyword, channel] of Object.entries(CHANNEL_KEYWORDS)) {
    if (lower.includes(keyword)) {
      return channel as LeadInput["channel"];
    }
  }
  return "WhatsApp";
}

function extractObjective(text: string): LeadInput["objective"] {
  const lower = text.toLowerCase();
  for (const [keyword, objective] of Object.entries(OBJECTIVE_KEYWORDS)) {
    if (lower.includes(keyword)) {
      return objective as LeadInput["objective"];
    }
  }
  return "Agendar reunião";
}

function extractTone(text: string): LeadInput["tone"] {
  const lower = text.toLowerCase();
  for (const [keyword, tone] of Object.entries(TONE_KEYWORDS)) {
    if (lower.includes(keyword)) {
      return tone as LeadInput["tone"];
    }
  }
  return "Consultivo";
}

function extractRelationship(text: string): LeadInput["relationship"] {
  const lower = text.toLowerCase();
  for (const [keyword, relationship] of Object.entries(RELATIONSHIP_KEYWORDS)) {
    if (lower.includes(keyword)) {
      return relationship as LeadInput["relationship"];
    }
  }
  return "Contato frio";
}

function extractScriptType(text: string, parsed: Partial<LeadInput>): ScriptType {
  const lower = text.toLowerCase();
  
  // Prioridade: palavras-chave mais específicas primeiro
  const orderedKeys = Object.keys(SCRIPT_TYPE_KEYWORDS).sort((a, b) => b.length - a.length);
  
  for (const keyword of orderedKeys) {
    if (lower.includes(keyword)) {
      return SCRIPT_TYPE_KEYWORDS[keyword];
    }
  }
  
  // Fallback baseado no objetivo
  switch (parsed.objective) {
    case "Follow-up":
      return "follow_up";
    case "Vender produto":
      return "fechamento_proximo_passo";
    case "Reconexão":
      return "reativacao";
    default:
      return "abordagem_inicial";
  }
}

function extractHook(text: string): string {
  // Procura por padrões como "gancho:", "ponto:", "observou:", "disse que", "falou que"
  const patterns = [
    /gancho[:\s]+([^.!?]+)/i,
    /ponto[:\s]+([^.!?]+)/i,
    /observou[:\s]+([^.!?]+)/i,
    /disse que\s+([^.!?]+)/i,
    /falou que\s+([^.!?]+)/i,
    /comentou que\s+([^.!?]+)/i,
    /mencionou que\s+([^.!?]+)/i,
    /pediu\s+([^.!?]+)/i,
    /quis\s+([^.!?]+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim().slice(0, 600);
    }
  }
  return "";
}

function extractObjection(text: string): string {
  const lower = text.toLowerCase();
  const objectionPatterns = [
    /objecão[:\s]+([^.!?]+)/i,
    /objecao[:\s]+([^.!?]+)/i,
    /disse que\s+([^.!?]+)/i,
    /falou que\s+([^.!?]+)/i,
    /argumentou que\s+([^.!?]+)/i,
  ];
  
  for (const pattern of objectionPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim().slice(0, 500);
    }
  }
  
  // Palavras-chave de objeção comuns
  const objectionKeywords = ["caro", "preço", "valor", "tempo", "ocupado", "não tenho", "nao tenho", "já tenho", "ja tenho", "concorrente", "outro fornecedor"];
  for (const keyword of objectionKeywords) {
    if (lower.includes(keyword)) {
      // Tenta extrair a frase ao redor
      const idx = lower.indexOf(keyword);
      const start = Math.max(0, idx - 50);
      const end = Math.min(text.length, idx + keyword.length + 50);
      return text.slice(start, end).trim().slice(0, 500);
    }
  }
  return "";
}

function extractNextStep(text: string): string {
  const patterns = [
    /próxim[oa]\s+(?:passo|etapa)[:\s]+([^.!?]+)/i,
    /proxim[oa]\s+(?:passo|etapa)[:\s]+([^.!?]+)/i,
    /agendar\s+([^.!?]+)/i,
    /marcar\s+([^.!?]+)/i,
    /reagendar\s+([^.!?]+)/i,
    /quer(?:o|emos)\s+([^.!?]+)/i,
    /vou\s+([^.!?]+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim().slice(0, 300);
    }
  }
  return "";
}

function extractContext(text: string): string {
  // Retorna o texto original truncado como contexto bruto
  return text.slice(0, 1000);
}

/** Parseia linguagem natural para LeadInput estruturado (determinístico, sem IA). */
export async function parseSituation(raw: string): Promise<LeadInput> {
  const name = extractName(raw);
  const niche = extractNiche(raw);
  const channel = extractChannel(raw);
  const objective = extractObjective(raw);
  const tone = extractTone(raw);
  const relationship = extractRelationship(raw);
  const hook = extractHook(raw);
  const partial = { name, niche, channel, objective, tone, relationship, hook };
  const scriptType = extractScriptType(raw, partial);
  const objection = extractObjection(raw);
  const nextStep = extractNextStep(raw);
  const context = extractContext(raw);
  
  const input: LeadInput = {
    name,
    niche,
    channel,
    objective,
    tone,
    relationship,
    hook,
    scriptType,
    objection,
    nextStep,
    context,
  };
  
  // Validação final via Zod
  return leadInputSchema.parse(input);
}