import { type LeadInput, type ScriptType } from "../domain";

/** Classifica o tipo de script com base no LeadInput estruturado. */
export function detectScriptType(input: LeadInput): ScriptType {
  // Se já foi definido explicitamente no parse, usa
  if (input.scriptType && input.scriptType !== "abordagem_inicial") {
    return input.scriptType;
  }
  
  // Inferência baseada em objetivo + relacionamento + contexto
  const { objective, relationship, objection, nextStep, context } = input;
  const lowerContext = context.toLowerCase();
  const lowerObjection = objection.toLowerCase();
  const lowerNextStep = nextStep.toLowerCase();
  
  // Objeção explícita
  if (objection && (lowerObjection.includes("caro") || lowerObjection.includes("preço") || lowerObjection.includes("tempo") || lowerObjection.includes("ocupado") || lowerObjection.includes("já tenho") || lowerObjection.includes("ja tenho") || lowerObjection.includes("concorrente"))) {
    return "tratamento_objeção";
  }
  
  // Reagendamento explícito
  if (lowerNextStep.includes("reagendar") || lowerNextStep.includes("mudar data") || lowerNextStep.includes("outro dia") || lowerContext.includes("reagendar") || lowerContext.includes("mudar data")) {
    return "reativacao"; // Trata como reativação/reativação de agenda
  }
  
  // Por objetivo principal
  switch (objective) {
    case "Follow-up":
      // Se é cliente antigo ou já conversaram, pode ser reativação
      if (relationship === "Cliente atual" || relationship === "Já conversamos antes") {
        return "follow_up";
      }
      return "follow_up";
      
    case "Vender produto":
      // Se já há relacionamento, é fechamento; senão abordagem
      if (relationship === "Cliente atual" || relationship === "Já conversamos antes" || relationship === "Indicação") {
        return "fechamento_proximo_passo";
      }
      return "abordagem_inicial";
      
    case "Reconexão":
      return "reativacao";
      
    case "Agendar reunião":
    default:
      // Se é lead inbound (contexto menciona formulário, site, preencheu)
      if (lowerContext.includes("formulário") || lowerContext.includes("formulario") || lowerContext.includes("site") || lowerContext.includes("preencheu") || lowerContext.includes("inbound") || lowerContext.includes("lead")) {
        return "resposta_inbound";
      }
      // Se menciona case, material, conteúdo
      if (lowerContext.includes("case") || lowerContext.includes("material") || lowerContext.includes("conteúdo") || lowerContext.includes("conteudo") || lowerContext.includes("enviar") || lowerContext.includes("mandar") || lowerContext.includes("compartilhar")) {
        return "nutricao_valor";
      }
      // Se é cliente atual ou já conversaram, é próximo passo
      if (relationship === "Cliente atual" || relationship === "Já conversamos antes") {
        return "fechamento_proximo_passo";
      }
      return "abordagem_inicial";
  }
}