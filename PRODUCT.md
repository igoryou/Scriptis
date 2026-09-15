# Scriptis

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js App Router, TypeScript e Tailwind CSS, conforme stack sugerida no briefing. Vercel como destino de deploy. A confirmação do usuário prioriza uma base gratuita, com Anthropic opcional.

## Users

Freelancers, corretores, consultores e agências que fazem prospecção manual e revisam/copiam mensagens também no celular.

## Product Purpose

Scripts que soam como você, não como um robô. Reduzir o atrito de escrever a primeira mensagem de prospecção e de formular prompts de IA.

## Positioning

Poucos dados do contato produzem três abordagens divididas como uma conversa, acompanhadas de um prompt reutilizável para gerar variações em qualquer IA.

## Operating Context

Preencher nome, nicho, canal, objetivo, tom, gancho opcional e relacionamento. Gerar, comparar três estilos, editar, copiar blocos individuais, favoritar e reabrir histórico. A pessoa decide quando e para quem enviar; não há envio automatizado.

## Capabilities and Constraints

- A base deve ser gratuita e operar sem credenciais: motor local de composição, identificado como sem IA. Não simular uma chamada de IA nem chamar esse motor de IA.
- Anthropic é integração opcional, apenas no servidor, com custo da API explicitado; não trocar para ela automaticamente.
- Histórico/favoritos locais sem conta; Supabase Auth e armazenamento por usuário opcionais para sincronização. Nunca chamar o histórico local de sincronizado.
- WhatsApp e Instagram DM: 2 a 4 mensagens numeradas por variante. E-mail: assunto e corpo. LinkedIn: abordagem curta adequada ao canal.
- Última mensagem sempre convida uma resposta fácil. Evitar linguagem decorada, exceto quando Formal for selecionado.
- Não inventar observações, nomes de indicantes, resultados ou promessas. Sem gancho, usar hipótese genérica claramente condicional.
- Prompt reaproveitável com campos para trocar nome e nicho, e demais escolhas explicitadas.
- Não inclui CRM, disparos automáticos, integração com WhatsApp Business API, análise de respostas, times ou onboarding guiado.
- Alvo de geração: menos de 15 segundos. A latência da API real deve ser medida antes de reivindicar esse aceite para Anthropic.

## Brand Commitments

Nome: Scriptis. Português brasileiro, natural, direto, sem jargão de vendedor. Slogan fornecido: “Scripts que soam como você, não como um robô.” Preferências existentes do usuário: modo escuro, bordas arredondadas, fontes modernas como Geist, transparência discreta e movimento reduzível.

## Evidence on Hand

Briefing e apresentação do produto fornecidos pelo usuário. Não há clientes, depoimentos, métricas ou provas comerciais fornecidos. Exemplos de contatos e mensagens devem ser identificados como exemplos.

## Product Principles

1. A primeira mensagem deve convidar conversa, não encenar intimidade.
2. O resultado é editável, e a pessoa controla seu envio.
3. Ensinar o prompt é parte do produto, não um conteúdo escondido.
4. Gratuidade básica sem dependência de APIs pagas.
5. Informar com clareza onde dados ficam salvos e qual motor compôs o texto.
