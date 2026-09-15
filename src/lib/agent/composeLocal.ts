import { leadInputSchema, type Generation, type LeadInput, type Objective, type Relationship, type ScriptType, type Channel } from "../domain";
import { buildPrompt } from "../agent/buildPrompt";

const invitationsByType: Record<ScriptType, Record<Objective, [string, string, string]>> = {
  abordagem_inicial: {
    "Agendar reunião": ["Faz sentido marcarmos uma conversa rápida?", "Você teria um momento nesta semana para conversarmos?", "Posso sugerir um horário para uma conversa curta?"],
    "Vender produto": ["Posso te apresentar o produto para você avaliar se faz sentido?", "Você prefere receber um resumo do produto por aqui?", "Tudo bem se eu enviar os detalhes do produto, sem compromisso?"],
    "Follow-up": ["Esse assunto faz sentido para você agora ou é melhor deixar para depois?", "Você prefere conversar sobre isso agora ou em outro momento?", "Posso saber se vale a pena seguir com esse assunto?"],
    "Reconexão": ["Podemos abrir espaço para uma conversa por aqui?", "Este é um bom momento para conversarmos?", "Faz sentido voltarmos a ter contato?"],
  },
  follow_up: {
    "Agendar reunião": ["Consegue um tempinho esta semana pra gente conversar?", "Faz sentido a gente alinhar isso numa call curta?", "Qual melhor dia pra uma conversa rápida?"],
    "Vender produto": ["Quer que eu mande um resumo do que conversamos?", "Prefere que a gente marque pra fechar os detalhes?", "Posso enviar a proposta pra você revisar com calma?"],
    "Follow-up": ["Alguma novidade sobre o que conversamos?", "Melhor a gente falar agora ou deixa pra semana que vem?", "Vale a pena a gente continuar essa conversa?"],
    "Reconexão": ["Tá livre pra um papo rápido nos próximos dias?", "Quer que a gente retome de onde parou?", "Faz sentido a gente se falar ainda esta semana?"],
  },
  tratamento_objeção: {
    "Agendar reunião": ["Quer que eu mostre como o retorno costuma superar o investimento?", "Podemos fazer um piloto menor pra você validar?", "Faz sentido a gente pelo menos estimar o custo de não resolver isso?"],
    "Vender produto": ["O que acha de começarmos com um formato de entrada?", "Posso te mandar a conta do ROI num caso real do seu segmento?", "Topa ver como seria um primeiro passo sem comprometer orçamento?"],
    "Follow-up": ["Além do preço, vale pensar no custo de manter como está.", "Tem como a gente dividir em etapas pra caber no seu momento?", "Quer que eu te mostre comparativo com o que você gasta hoje?"],
    "Reconexão": ["O investimento se paga quando [resultado]. Quer ver os números?", "Podemos ajustar o escopo pra ficar mais confortável agora.", "Faz sentido a gente calcular o retorno esperado junto?"],
  },
  fechamento_proximo_passo: {
    "Agendar reunião": ["Posso enviar o contrato pelo DocuSign pra assinatura digital?", "Qual melhor e-mail pra eu mandar o termo?", "Topa assinar hoje? Leva 2 minutos no celular."],
    "Vender produto": ["Bora fechar? Te mando o link de pagamento.", "Posso gerar o pedido agora e você aprova por e-mail?", "Quer que eu reserve sua vaga/estoque enquanto decide?"],
    "Follow-up": ["Alinhamos tudo. Posso mandar o contrato pra assinatura?", "Quer que eu reserve as datas combinadas?", "Fecho o pedido e te aviso quando estiver pronto?"],
    "Reconexão": ["Bora retomar? Te mando o termo atualizado.", "Quer que a gente formalize o retorno hoje?", "Posso enviar a proposta de continuidade pra assinatura?"],
  },
  reativacao: {
    "Agendar reunião": ["Posso sugerir um horário pra gente se falar?", "Qual dia funciona melhor pra um café virtual?", "Quer que eu mande opções de horário?"],
    "Vender produto": ["Posso te apresentar as novidades desde que paramos?", "Quer que eu mande um resumo do que mudou?", "Faz sentido a gente alinhar expectativas num call rápido?"],
    "Follow-up": ["Tava pensando em você esses dias. Bora se falar?", "Quer que a gente marque um papo sem compromisso?", "Me avisa se tem espaço na agenda pra gente se reconectar."],
    "Reconexão": ["Faz tempo! Quer marcar pra botar o papo em dia?", "Tô por aqui quando quiser conversar.", "Posso sugerir uns horários pra semana que vem?"],
  },
  nutricao_valor: {
    "Agendar reunião": ["Se quiser conversar sobre como aplicar isso no seu caso, tô à disposição.", "Faz sentido a gente trocar uma ideia sobre isso?", "Quer que eu mande mais detalhes da estratégia?"],
    "Vender produto": ["O case completo tá no link. Quer que eu te explique como adaptar pro seu caso?", "Se quiser testar a estratégia, posso te orientar nos primeiros passos.", "Faz sentido a gente ver como isso se aplica ao seu cenário?"],
    "Follow-up": ["Achei que poderia ser útil pra você. Quer receber mais insights assim?", "Se quiser, te mando o material completo por e-mail.", "Topa uma conversa rápida pra ver se faz sentido pro seu momento?"],
    "Reconexão": ["Lembrei de você vendo esse resultado. Quer que eu compartilhe mais?", "Se tiver curiosidade de como foi feito, me avisa.", "Faz sentido a gente trocar uma ideia sobre isso?"],
  },
  resposta_inbound: {
    "Agendar reunião": ["Tenho horários [dia/horário] ou [dia/horário]. Qual funciona?", "Posso sugerir [data] às [hora] ou [data] às [hora]?", "Qual melhor janela pra você: manhã ou tarde?"],
    "Vender produto": ["Quer que eu mande a proposta direto pro seu e-mail?", "Tenho um resumo executivo de 1 página. Te mando?", "Posso agendar 15 min pra alinhar o que você precisa?"],
    "Follow-up": ["Qual o maior desafio hoje pra gente focar na conversa?", "Quer que a gente marque pra essa ou semana que vem?", "Me avisa se prefere call ou troca de e-mail."],
    "Reconexão": ["Fico feliz que tenha vindo até nós! Quer agendar pra hoje?", "Tenho vaga [horário] ou [horário]. Qual prefere?", "Bora marcar rápido enquanto o interesse tá quente?"],
  },
};

const relationshipsText: Record<Relationship, [string, string]> = {
  "Contato frio": ["", "Ainda não nos conhecemos."],
  "Indicação": ["Seu contato chegou até mim por indicação.", "Cheguei ao seu contato por uma indicação."],
  "Já conversamos antes": ["Queria retomar nosso contato.", "Faz um tempo que quero voltar a conversar com você."],
  "Cliente atual": ["Queria conversar sobre um próximo passo no nosso trabalho.", "Como já trabalhamos juntos, pensei em abrir esta conversa."],
};

const stylesByType: Record<ScriptType, Array<{ title: string; description: string }>> = {
  abordagem_inicial: [
    { title: "Direto ao ponto", description: "Um contexto breve. Um próximo passo claro." },
    { title: "Pelo contexto", description: "Primeiro o que importa para o contato." },
    { title: "Com permissão", description: "Abra espaço antes de avançar na conversa." },
  ],
  follow_up: [
    { title: "Leve e direto", description: "Reengaja sem cobrar, vai direto ao ponto." },
    { title: "Novo valor", description: "Traz insight ou informação nova." },
    { title: "Sem pressão", description: "Dá espaço para o contato ditar o ritmo." },
  ],
  tratamento_objeção: [
    { title: "Valida + ROI", description: "Entende a objeção e mostra retorno." },
    { title: "Alternativa acessível", description: "Oferece formato menor ou piloto." },
    { title: "Custo da inação", description: "Mostra o que perde não resolvendo." },
  ],
  fechamento_proximo_passo: [
    { title: "CTA direto", description: "Facilita o sim com ação concreta." },
    { title: "Reserva + envio", description: "Reserva vaga/envia contrato na hora." },
    { title: "Próximo passo mínimo", description: "Menor ação possível para avançar." },
  ],
  reativacao: [
    { title: "Empático", description: "Reconecta sem culpa, com calor humano." },
    { title: "Novidade relevante", description: "Traz algo novo que justifica o contato." },
    { title: "Convite leve", description: "Abre porta sem cobrar resposta." },
  ],
  nutricao_valor: [
    { title: "Case real", description: "Compartilha resultado concreto de similar." },
    { title: "Insight de mercado", description: "Entrega dado/estratégia útil sem pedir nada." },
    { title: "Conteúdo útil", description: "Material aplicável ao dia a dia do contato." },
  ],
  resposta_inbound: [
    { title: "Rápida e qualificadora", description: "Agradece + 1 pergunta + 2 horários." },
    { title: "Material + call", description: "Envia resumo e propõe call curta." },
    { title: "Direto ao agendamento", description: "Foca 100% em fechar a agenda." },
  ],
};

function formatMessagesForChannel(messages: string[], channel: Channel): string[] {
  if (channel === "E-mail") {
    return [messages.join("\n\n")];
  }
  if (channel === "LinkedIn") {
    return [messages.join(" ")];
  }
  return messages;
}

/** Composição local gratuita, determinística, sem rede. Suporta todos os 7 tipos de script. */
export function composeLocal(raw: LeadInput, iteration = 0): Generation {
  const input = leadInputSchema.parse(raw);
  if (!Number.isSafeInteger(iteration) || iteration < 0) throw new RangeError("Iteração inválida.");
  
  const alternate = iteration % 2;
  const formal = input.tone === "Formal";
  const consultative = input.tone === "Consultivo";
  const relation = relationshipsText[input.relationship][alternate];
  
  const greeting = formal
    ? `Olá, ${input.name}.`
    : alternate
      ? `Olá, ${input.name}!`
      : `Oi, ${input.name}!`;
  const greetingSuffix = formal
    ? "Espero que esteja bem."
    : consultative
      ? "Tudo bem por aí?"
      : "Tudo bem?";
  
  const styles = stylesByType[input.scriptType] || stylesByType.abordagem_inicial;
  const invitations = invitationsByType[input.scriptType]?.[input.objective] || invitationsByType.abordagem_inicial[input.objective];
  
  // Contextos específicos por tipo de script
  let contexts: string[];
  
  switch (input.scriptType) {
    case "abordagem_inicial":
      contexts = input.hook
        ? [
            `Pensando em ${input.niche}, queria conversar sobre este ponto: “${input.hook}”.`,
            `No contexto de ${input.niche}, o ponto “${input.hook}” pode render uma boa conversa, se for uma prioridade para você.`,
            `Queria entender se “${input.hook}” faz sentido no seu momento em ${input.niche}, antes de avançar.`,
          ]
        : [
            `Quero ${formal ? "trocar algumas ideias" : "trocar uma ideia"} sobre ${input.niche}, se fizer sentido para o seu momento.`,
            `Em ${input.niche}, cada negócio tem suas próprias prioridades. Se for útil, podemos conversar sobre as suas.`,
            `Antes de falar sobre ${input.niche}, prefiro entender se esse assunto faz sentido para você agora.`,
          ];
      break;
      
    case "follow_up":
      contexts = input.hook
        ? [
            `Lembrei do que conversamos sobre “${input.hook}” e queria saber se teve evolução.`,
            `Sobre o ponto “${input.hook}”: fez sentido prosseguir ou melhor deixar para outro momento?`,
            `Vi algo sobre “${input.hook}” que pode ser útil pro seu cenário em ${input.niche}.`,
          ]
        : [
            `Passei só pra saber se teve um tempinho pra olhar o que enviei sobre ${input.niche}. Sem pressa.`,
            `Lembrei de ${input.niche} esses dias e pensei que poderia ser útil retomar.`,
            `Se não for prioridade agora, sem problema — me avisa que não insisto.`,
          ];
      break;
      
    case "tratamento_objeção":
      const objectionText = input.objection || "o investimento";
      contexts = [
        `${input.name}, entendo perfeitamente. ${objectionText.charAt(0).toUpperCase() + objectionText.slice(1)} é sempre uma decisão de prioridade.`,
        `Faz total sentido a preocupação. O que vejo em ${input.niche} é que o retorno costuma compensar quando olhamos o cenário completo.`,
        `Não precisa resolver tudo de uma vez. Tem como a gente começar menor e ir validando o resultado.`,
      ];
      break;
      
    case "fechamento_proximo_passo":
      contexts = [
        `Alinhamos os pontos principais. O próximo passo é formalizar para começarmos.`,
        `Tudo certo pro seu cenário em ${input.niche}. Vamos para a parte prática?`,
        `O contrato/proposta está pronto. Só falta sua confirmação para avançarmos.`,
      ];
      break;
      
    case "reativacao":
      contexts = input.hook
        ? [
            `Faz um tempo! Lembrei de você por causa de “${input.hook}” e quis saber como estão as coisas.`,
            `Pensei em ${input.niche} esses dias vendo [novidade] e lembrei do nosso trabalho.`,
            `Queria retomar nosso contato — muita coisa mudou desde que conversamos.`,
          ]
        : [
            `Oi, ${input.name}! Faz um tempo. Tudo bem por aí em ${input.niche}?`,
            `Lembrei do nosso trabalho juntos e quis saber como as coisas andam.`,
            `Faz um tempinho que não nos falamos. Como está ${input.niche}?`,
          ];
      break;
      
    case "nutricao_valor":
      contexts = input.hook
        ? [
            `Vi algo sobre “${input.hook}” que achei relevante para ${input.niche}.`,
            `Compartilhando um insight sobre “${input.hook}” que pode ajudar no seu dia a dia.`,
            `Esse ponto “${input.hook}” conecta com uma estratégia que tem funcionado bem.`,
          ]
        : [
            `Case rápido: [cliente similar em ${input.niche}] aumentou [métrica] em [X]% com [estratégia].`,
            `Dado da semana: [estatística relevante para ${input.niche}]. A maioria que aplica [ação] vê [resultado].`,
            `Conteúdo útil: [estratégia/tática] que tem dado resultado para ${input.niche} no momento atual.`,
          ];
      break;
      
    case "resposta_inbound":
      contexts = [
        `Obrigado por preencher o formulário — resposta em minutos! 🚀`,
        `Recebi seu interesse em ${input.niche}. Qual o maior desafio hoje pra gente focar?`,
        `Chegou sua solicitação. Tenho horários [opção A] ou [opção B]. Qual funciona?`,
      ];
      break;
      
    default:
      contexts = [`Quero conversar sobre ${input.niche}, se fizer sentido.`];
  }
  
  if (consultative) {
    contexts = contexts.map(c => c + " A ideia é entender seu contexto, sem partir de solução pronta.");
  }
  if (alternate) {
    contexts = contexts.map(() => `${formal ? "Gostaria de" : "Queria"} abrir uma conversa sobre ${input.niche}. ${input.hook ? `O ponto de partida é “${input.hook}”. ` : ""}Se for relevante, podemos explorar juntos.`);
  }
  
  const variants = styles.map((style, index) => {
    const opening = [greeting, relation || greetingSuffix].filter(Boolean).join(" ");
    const context = contexts[index % contexts.length];
    
    let invitation = invitations[(index + iteration) % invitations.length];
    if (formal) {
      invitation = invitation
        .replace("te apresentar", "apresentar a você")
        .replace("Tudo bem se eu enviar", "Posso enviar")
        .replace("te mandar", "lhe enviar")
        .replace("te mostrar", "lhe mostrar")
        .replace("por aqui", "por este canal");
    }
    
    const parts = [opening, context, invitation].filter(Boolean);
    const messages = formatMessagesForChannel(parts, input.channel);
    
    return {
      ...style,
      id: crypto.randomUUID(),
      messages,
      favorite: false,
      version: 1,
      ...(input.channel === "E-mail" ? { subject: [
        `Conversa sobre ${input.niche}`,
        `${input.name}, faz sentido conversarmos?`,
        `Próximos passos para ${input.niche}`,
      ][index] } : {}),
    };
  });
  
  const promptVersions = buildPrompt(input).map((pv) => ({ ...pv, engine: "local" as const }));
  
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    situationRaw: input.context || `${input.scriptType}: ${input.name} — ${input.niche} (${input.channel})`,
    input,
    variants,
    promptVersions,
    engine: "local",
  };
}