/**
 * Definições de tipo, textos e valores padrão para o conteúdo editável da Proposta O&M.
 * Segue a estrutura fiel das 8 seções do documento de referência oficial da Delfos Solar:
 * 1. Dados Gerais e Identificação Técnica
 * 2. Cenários de Exposição Financeira
 * 3. Qual Plano Elimina Cada Cenário
 * 4. Modalidades de Planos de O&M
 * 5. Padrões Técnicos e Credibilidade
 * 6. Níveis de Serviço (SLA) & Compromissos
 * 7. Condições Contratuais & Vigência
 * 8. Aceite Comercial e Contratação
 */

export interface ConteudoOMSecao1 {
  titulo: string
  subtitulo: string
  badgeEmissao: string
  // Textos complementares abaixo dos dois quadros
  cardAnualDestaquePrefixo: string
  cardAnualDestaqueSufixo: string
  citacaoDestaque: string
}

export interface ConteudoOMSecao2 {
  titulo: string
  subtitulo: string
  tituloCardAtivo: string
  subtituloCardAtivo: string
  tituloCardPerda15: string
  subtituloCardPerda15: string
  tituloCardPerda20: string
  subtituloCardPerda20: string
  tituloCardFalha30: string
  subtituloCardFalha30: string
  avisoRiscoOculto: string
}

export interface LinhaCenarioRisco {
  id: string
  cenario: string
  planoSelo: string
  cobertura: string
}

export interface ConteudoOMSecao3 {
  titulo: string
  colunaCenario: string
  colunaCobertura: string
  linhas: LinhaCenarioRisco[]
}

export interface ConteudoOMSecao4 {
  titulo: string
  seloRecomendado: string
  // Benefícios padrão de cada plano
  beneficiosEssencial: string[]
  beneficiosInspecao: string[]
  beneficiosCompleto: string[]
  botaoTextoSelecionado: string
  botaoTextoSelecionar: string
}

export interface ConteudoOMSecao5Item {
  id: string
  icone: string
  titulo: string
  descricao: string
}

export interface ConteudoOMSecao5 {
  titulo: string
  itens: ConteudoOMSecao5Item[]
}

export interface ConteudoOMSecao6Item {
  id: string
  icone: string
  titulo: string
  descricao: string
}

export interface ConteudoOMSecao6 {
  titulo: string
  itens: ConteudoOMSecao6Item[]
}

export interface ConteudoOMSecao7Item {
  id: string
  titulo: string
  descricao: string
}

export interface ConteudoOMSecao7 {
  titulo: string
  itens: ConteudoOMSecao7Item[]
}

export interface ConteudoOMSecao8Passo {
  numero: number
  titulo: string
  descricao: string
}

export interface ConteudoOMSecao8 {
  titulo: string
  passos: ConteudoOMSecao8Passo[]
  textoTermoAceite: string
  termoAutorizacao: string
  responsavelDelfosCargo: string
  cnpjDelfos: string
}

export interface ConteudoOMRodape {
  empresaNome: string
  cnpj: string
  telefone: string
  site: string
  endereco: string
  validadeDias: number
  textoValidade: string
}

export interface ConteudoPropostaOM {
  corPrimaria: string
  corSecundaria: string
  secao1: ConteudoOMSecao1
  secao2: ConteudoOMSecao2
  secao3: ConteudoOMSecao3
  secao4: ConteudoOMSecao4
  secao5: ConteudoOMSecao5
  secao6: ConteudoOMSecao6
  secao7: ConteudoOMSecao7
  secao8: ConteudoOMSecao8
  rodape: ConteudoOMRodape
}

/**
 * Retorna os textos e dados padrão 100% fiéis ao documento de referência oficial do usuário.
 */
export function getConteudoPropostaOMDefaults(): ConteudoPropostaOM {
  return {
    corPrimaria: '#16A34A',
    corSecundaria: '#166534',
    secao1: {
      titulo: 'Dados Gerais e Identificação Técnica',
      subtitulo: 'Proposta Comercial O&M • Delfos Engenharia Solar',
      badgeEmissao: 'Documento Oficial',
      cardAnualDestaquePrefixo: 'Sua usina gera cerca de',
      cardAnualDestaqueSufixo: 'em energia bruta estimada ao ano',
      citacaoDestaque:
        '“O Plano Completo custa menos de 4% do valor que sua usina produz. Uma única falha de 30 dias custa mais que o dobro do plano anual inteiro.”',
    },
    secao2: {
      titulo: 'Cenários de Exposição Financeira',
      subtitulo: 'Impacto real na receita da usina sem operação e manutenção especializada',
      tituloCardAtivo: 'Ativo Protegido',
      subtituloCardAtivo: 'Geração Plena Preservada',
      tituloCardPerda15: 'Perda 15% ao ano',
      subtituloCardPerda15: 'Impacto de Sujidade',
      tituloCardPerda20: 'Perda 20% ao ano',
      subtituloCardPerda20: 'Operação Sem Prevenção',
      tituloCardFalha30: 'Prejuízo 30 dias',
      subtituloCardFalha30: 'Falha Grave Sem Alerta',
      avisoRiscoOculto:
        'Atenção ao risco oculto: 20 dias de falha ou inversor desarmado sem alerta imediato causam prejuízos severos. Um plano de O&M se paga integralmente ao evitar apenas alguns dias pontuais de perda de geração ao longo do ano.',
    },
    secao3: {
      titulo: 'Qual Plano Elimina Cada Cenário',
      colunaCenario: 'Cenário de Risco Identificado',
      colunaCobertura: 'Cobertura & Solução O&M Delfos',
      linhas: [
        {
          id: 'linha-1',
          cenario: 'Falha sem alerta',
          planoSelo: 'TODOS OS PLANOS',
          cobertura: 'Monitoramento comercial ativo 24/7 com tratativa ágil.',
        },
        {
          id: 'linha-2',
          cenario: 'Sujidade (perda de 15%)',
          planoSelo: 'INSPEÇÃO E COMPLETO',
          cobertura:
            'Limpezas periódicas homologadas com água tratada e produtos específicos para módulos.',
        },
        {
          id: 'linha-3',
          cenario: 'Perda de 20% sem prevenção',
          planoSelo: 'PLANO COMPLETO',
          cobertura:
            'Verificação semestral rigorosa de anomalias térmicas, elétricas e reaperto de conexões.',
        },
      ],
    },
    secao4: {
      titulo: 'Modalidades de Planos de O&M',
      seloRecomendado: 'RECOMENDADO DELFOS',
      beneficiosEssencial: [
        'Monitoramento comercial 24/7 contínuo de geração',
        'Relatório mensal analítico de desempenho energético',
        'Suporte técnico e gestão de ocorrências junto à concessionária',
      ],
      beneficiosInspecao: [
        'Tudo incluso no Plano Essencial',
        '1x Inspeção preventiva anual completa in loco',
        '1x Limpeza técnica de placas anual',
        'Reaperto geral de conexões elétricas e mecânicas',
      ],
      beneficiosCompleto: [
        'Tudo incluso no Plano Inspeção',
        '2x Limpezas de placas ao ano (desempenho máximo sustentado)',
        'Verificação semestral de anomalias térmicas e elétricas',
        'Suporte técnico VIP prioritário com canal direto de engenharia',
      ],
      botaoTextoSelecionado: 'Plano Selecionado ✓',
      botaoTextoSelecionar: 'Selecionar',
    },
    secao5: {
      titulo: 'Padrões Técnicos e Credibilidade',
      itens: [
        {
          id: 'padr-1',
          icone: 'ShieldCheck',
          titulo: 'Segurança Normativa',
          descricao:
            'Técnicos certificados nas normas regulamentadoras NR-10 (Segurança Elétrica) e NR-35 (Trabalho em Altura).',
        },
        {
          id: 'padr-2',
          icone: 'Gauge',
          titulo: 'Precisão Metrológica',
          descricao:
            'Instrumentos e equipamentos de medição aferidos e calibrados segundo os padrões metrológicos vigentes.',
        },
        {
          id: 'padr-3',
          icone: 'Droplets',
          titulo: 'Química e Água Tratada',
          descricao:
            'Produtos homologados e água desmineralizada/filtrada, preservando integralmente a garantia dos módulos.',
        },
      ],
    },
    secao6: {
      titulo: 'Níveis de Serviço (SLA) & Compromissos',
      itens: [
        {
          id: 'sla-1',
          icone: 'Clock',
          titulo: 'Tratativa de Ocorrências',
          descricao: 'Alerta de falha ou anomalia tratado tecnicamente em até 24 horas úteis.',
        },
        {
          id: 'sla-2',
          icone: 'CalendarCheck',
          titulo: 'Agendamento Transparente',
          descricao:
            'Visitas preventivas e limpezas agendadas com aviso prévio e confirmação formal.',
        },
        {
          id: 'sla-3',
          icone: 'FileBarChart',
          titulo: 'Prestação de Contas',
          descricao:
            'Relatório mensal analítico de geração e status entregue até o 5º dia útil de cada mês.',
        },
      ],
    },
    secao7: {
      titulo: 'Condições Contratuais & Vigência',
      itens: [
        {
          id: 'cond-1',
          titulo: 'Escolha Flexível',
          descricao:
            'O cliente escolhe livremente a modalidade de plano ideal após a avaliação dos cenários de retorno e conveniência apresentados.',
        },
        {
          id: 'cond-2',
          titulo: 'Vigência Contratual',
          descricao:
            '12 (doze) meses renováveis automaticamente por iguais períodos, garantindo atendimento contínuo, preventivo e laudos periódicos regulares.',
        },
        {
          id: 'cond-3',
          titulo: 'Condições de Pagamento',
          descricao:
            'Mensalidades faturadas com vencimento no dia acordado via boleto bancário corporativo ou PIX empresarial Delfos.',
        },
        {
          id: 'cond-4',
          titulo: 'Reajuste',
          descricao:
            'Anual com base na variação acumulada do índice oficial pactuado em contrato (IPCA/IBGE ou IGP-M/FGV).',
        },
      ],
    },
    secao8: {
      titulo: 'Aceite Comercial e Contratação',
      passos: [
        {
          numero: 1,
          titulo: 'Escolha a modalidade',
          descricao: 'Escolha a modalidade ideal acima conforme os objetivos da sua usina.',
        },
        {
          numero: 2,
          titulo: 'Receba a minuta contratual',
          descricao: 'Receba a minuta contratual via e-mail para assinatura eletrônica ágil.',
        },
        {
          numero: 3,
          titulo: 'Primeira vistoria agendada',
          descricao: 'Primeira vistoria agendada e início imediato do monitoramento 24/7.',
        },
      ],
      textoTermoAceite:
        'Declaramos ciência e concordância com os valores, condições e escopo do plano selecionado, autorizando a Delfos Engenharia Solar a formalizar o contrato de prestação de serviços de O&M.',
      termoAutorizacao:
        'autorizando a Delfos Engenharia Solar a formalizar o contrato de prestação de serviços de O&M para a usina.',
      responsavelDelfosCargo: 'Diretoria de Operações & Manutenção',
      cnpjDelfos: '21.379.952/0001-38',
    },
    rodape: {
      empresaNome: 'Delfos Engenharia Solar',
      cnpj: '21.379.952/0001-38',
      telefone: '(54) 99129-2121',
      site: 'www.delfos.eng.br',
      endereco: 'Rua Espírito Santo, 275 – Centro, Erechim/RS',
      validadeDias: 5,
      textoValidade: 'Proposta válida por 5 dias.',
    },
  }
}

/**
 * Mescla recursivamente um ConteudoPropostaOM salvo (do PocketBase) com os defaults,
 * garantindo resiliência total a propriedades faltantes.
 */
export function normalizarConteudoPropostaOM(
  salvo?: Partial<ConteudoPropostaOM> | Record<string, any> | null,
): ConteudoPropostaOM {
  const padrao = getConteudoPropostaOMDefaults()
  if (!salvo) return padrao

  return {
    corPrimaria: salvo.corPrimaria || padrao.corPrimaria,
    corSecundaria: salvo.corSecundaria || padrao.corSecundaria,
    secao1: { ...padrao.secao1, ...(salvo.secao1 || {}) },
    secao2: { ...padrao.secao2, ...(salvo.secao2 || {}) },
    secao3: {
      ...padrao.secao3,
      ...(salvo.secao3 || {}),
      linhas:
        salvo.secao3?.linhas && Array.isArray(salvo.secao3.linhas) && salvo.secao3.linhas.length > 0
          ? salvo.secao3.linhas
          : padrao.secao3.linhas,
    },
    secao4: {
      ...padrao.secao4,
      ...(salvo.secao4 || {}),
      beneficiosEssencial:
        salvo.secao4?.beneficiosEssencial && Array.isArray(salvo.secao4.beneficiosEssencial)
          ? salvo.secao4.beneficiosEssencial
          : padrao.secao4.beneficiosEssencial,
      beneficiosInspecao:
        salvo.secao4?.beneficiosInspecao && Array.isArray(salvo.secao4.beneficiosInspecao)
          ? salvo.secao4.beneficiosInspecao
          : padrao.secao4.beneficiosInspecao,
      beneficiosCompleto:
        salvo.secao4?.beneficiosCompleto && Array.isArray(salvo.secao4.beneficiosCompleto)
          ? salvo.secao4.beneficiosCompleto
          : padrao.secao4.beneficiosCompleto,
    },
    secao5: {
      ...padrao.secao5,
      ...(salvo.secao5 || {}),
      itens:
        salvo.secao5?.itens && Array.isArray(salvo.secao5.itens) && salvo.secao5.itens.length > 0
          ? salvo.secao5.itens
          : padrao.secao5.itens,
    },
    secao6: {
      ...padrao.secao6,
      ...(salvo.secao6 || {}),
      itens:
        salvo.secao6?.itens && Array.isArray(salvo.secao6.itens) && salvo.secao6.itens.length > 0
          ? salvo.secao6.itens
          : padrao.secao6.itens,
    },
    secao7: {
      ...padrao.secao7,
      ...(salvo.secao7 || {}),
      itens:
        salvo.secao7?.itens && Array.isArray(salvo.secao7.itens) && salvo.secao7.itens.length > 0
          ? salvo.secao7.itens
          : padrao.secao7.itens,
    },
    secao8: {
      ...padrao.secao8,
      ...(salvo.secao8 || {}),
      passos:
        salvo.secao8?.passos && Array.isArray(salvo.secao8.passos) && salvo.secao8.passos.length > 0
          ? salvo.secao8.passos
          : padrao.secao8.passos,
    },
    rodape: { ...padrao.rodape, ...(salvo.rodape || {}) },
  }
}
