/**
 * Definições de tipo, textos e valores padrão para o conteúdo editável da Proposta O&M.
 * Segue a estrutura de sete seções aprovada para a proposta O&M:
 * 1. Dados do Cliente e da Usina
 * 2. Cenários Financeiros
 * 3. Modalidades de Planos
 * 4. Escopo Técnico das Visitas
 * 5. Credibilidade
 * 6. Condições
 * 7. Aceite
 * Campos legados de uma versão anterior são mantidos para não apagar propostas antigas.
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
  textoRiscoGarantia: string
  textoEvidenciaSujidade: string
  fonteEvidenciaSujidade: string
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

export interface ConteudoOMEscopoTecnicoItem {
  id: string
  texto: string
}

export interface ConteudoOMEscopoTecnico {
  titulo: string
  subtitulo: string
  itens: ConteudoOMEscopoTecnicoItem[]
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
  textoCliqueAceite: string
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
  secaoEscopoTecnico: ConteudoOMEscopoTecnico
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
      titulo: 'Preparado para',
      subtitulo: 'Dados do Cliente e da Usina',
      badgeEmissao: 'Documento Oficial',
      cardAnualDestaquePrefixo: 'Sua usina gera cerca de',
      cardAnualDestaqueSufixo: 'em energia bruta estimada ao ano',
      citacaoDestaque:
        '“O Plano Completo custa menos de 4% do valor que sua usina produz. Uma única falha de 30 dias custa mais que o dobro do plano anual inteiro.”',
    },
    secao2: {
      titulo: 'Cenários de Exposição Financeira',
      subtitulo:
        'Estimativas da energia que pode deixar de ser gerada; os resultados variam conforme as condições da usina',
      tituloCardAtivo: 'Geração mensal estimada',
      subtituloCardAtivo: 'Valor bruto da energia, não representa lucro',
      tituloCardPerda15: 'Referência de perda de 15% por sujidade',
      subtituloCardPerda15: 'Referência variável por localização, não é previsão para esta usina',
      tituloCardPerda20: 'Perda anual estimada de 20% por sujidade',
      subtituloCardPerda20: 'Estimativa: geração mensal × tarifa × 12 × 20%; varia por usina',
      tituloCardFalha30: 'Perda estimada em 30 dias sem geração',
      subtituloCardFalha30: 'Estimativa: geração mensal × tarifa; falha não detectada a tempo',
      avisoRiscoOculto: '',
      textoRiscoGarantia:
        'A manutenção adequada e documentada pode ser relevante para demonstrar o atendimento às condições de garantia dos fabricantes. Consulte sempre os termos aplicáveis ao equipamento instalado.',
      textoEvidenciaSujidade:
        'Estudo publicado em 2021 estimou perdas por sujidade de até 22,25% em Betim e 56,86% em Congonhas. São resultados observados em locais e condições específicas; não são previsão para esta usina e variam conforme local, período de deposição, chuva e operação.',
      fonteEvidenciaSujidade:
        'Fonte: SciELO (2021), Operação e manutenção de sistemas fotovoltaicos conectados à rede: inspeção termográfica e limpeza de módulos FV.',
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
        'Monitoramento diário da geração com tratamento de alertas em dias úteis',
        'Relatório mensal analítico',
        'Suporte técnico e gestão junto à concessionária',
      ],
      beneficiosInspecao: [
        'Tudo incluso no Plano Essencial',
        '1x Inspeção preventiva anual completa in loco',
        '1x Limpeza técnica de placas anual ({numeroModulos} módulos)',
        'Reaperto geral de conexões',
      ],
      beneficiosCompleto: [
        'Tudo incluso no Plano Inspeção',
        '2x Limpezas de placas ao ano — preventiva a cada 6 meses',
        'Verificação semestral de anomalias térmicas e elétricas com drone e câmera termográfica',
        'Suporte técnico VIP prioritário',
      ],
      botaoTextoSelecionado: 'Plano Selecionado ✓',
      botaoTextoSelecionar: 'Selecionar',
    },
    secaoEscopoTecnico: {
      titulo: 'Escopo Técnico das Visitas',
      subtitulo: 'Atividades preventivas incluídas no plano contratado',
      itens: [
        { id: 'escopo-1', texto: 'Limpeza dos módulos com equipamento profissional' },
        { id: 'escopo-2', texto: 'Inspeção visual de cabos, conectores e string boxes' },
        { id: 'escopo-3', texto: 'Reaperto das conexões elétricas' },
        { id: 'escopo-4', texto: 'Revisão do aterramento (NBR 5419)' },
        {
          id: 'escopo-5',
          texto:
            'Inspeção termográfica com drone para identificação de pontos quentes e defeitos não detectáveis a olho nu',
        },
        { id: 'escopo-6', texto: 'Revisão e reaperto das estruturas de fixação' },
        { id: 'escopo-7', texto: 'Análise de sombreamento (vegetação e obstáculos)' },
        { id: 'escopo-8', texto: 'Relatório fotográfico de cada visita técnica' },
      ],
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
            'Equipamentos e instrumentos calibrados, incluindo drone e câmera para inspeção termográfica.',
        },
        {
          id: 'padr-3',
          icone: 'Droplets',
          titulo: 'Garantias Preservadas',
          descricao:
            'Contrato de manutenção documentado auxilia na comprovação das condições de manutenção previstas pelos fabricantes.',
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
          titulo: 'Vigência',
          descricao:
            '12 meses renováveis, com atendimento contínuo, preventivo e emissão de laudos periódicos.',
        },
        {
          id: 'cond-2',
          titulo: 'Condições de Pagamento',
          descricao: 'Pagamento via boleto bancário ou PIX corporativo, com vencimento programado.',
        },
        {
          id: 'cond-3',
          titulo: 'Serviços Adicionais Sob Demanda',
          descricao:
            'Serviços fora do escopo — como corretivas, substituição de componentes, limpezas adicionais e inspeções especiais — dependem de escopo e orçamento aprovados previamente pelo cliente.',
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
        'Declaro que li e estou de acordo com o plano selecionado, seus valores, condições e escopo, e autorizo a equipe Delfos a preparar o contrato de prestação de serviços de O&M.',
      termoAutorizacao:
        'autorizando a equipe Delfos a preparar o contrato de prestação de serviços de O&M para a usina.',
      textoCliqueAceite: 'Clique no botão para registrar o aceite preliminar.',
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

  const arraysIguais = (valor: unknown, referencia: string[]) =>
    Array.isArray(valor) &&
    valor.length === referencia.length &&
    referencia.every((item, index) => valor[index] === item)

  const beneficiosLegados = {
    essencial: [
      'Monitoramento comercial 24/7 contínuo de geração',
      'Relatório mensal analítico de desempenho energético',
      'Suporte técnico e gestão de ocorrências junto à concessionária',
    ],
    inspecao: [
      'Tudo incluso no Plano Essencial',
      '1x Inspeção preventiva anual completa in loco',
      '1x Limpeza técnica de placas anual',
      'Reaperto geral de conexões elétricas e mecânicas',
    ],
    completo: [
      'Tudo incluso no Plano Inspeção',
      '2x Limpezas de placas ao ano (desempenho máximo sustentado)',
      'Verificação semestral de anomalias térmicas e elétricas',
      'Suporte técnico VIP prioritário com canal direto de engenharia',
    ],
  }
  const itensCondicaoLegados = [
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
  ]

  const secao1Salva = salvo.secao1 || {}
  const secao2Salva = salvo.secao2 || {}
  const secao4Salva = salvo.secao4 || {}
  const secao5Salva = salvo.secao5 || {}
  const secao7Salva = salvo.secao7 || {}

  return {
    corPrimaria: salvo.corPrimaria || padrao.corPrimaria,
    corSecundaria: salvo.corSecundaria || padrao.corSecundaria,
    secao1: {
      ...padrao.secao1,
      ...secao1Salva,
      titulo:
        secao1Salva.titulo === 'Dados Gerais e Identificação Técnica'
          ? padrao.secao1.titulo
          : secao1Salva.titulo || padrao.secao1.titulo,
      subtitulo:
        secao1Salva.subtitulo === 'Proposta Comercial O&M • Delfos Engenharia Solar'
          ? padrao.secao1.subtitulo
          : secao1Salva.subtitulo || padrao.secao1.subtitulo,
    },
    secao2: {
      ...padrao.secao2,
      ...secao2Salva,
      tituloCardAtivo:
        secao2Salva.tituloCardAtivo === 'Ativo Protegido'
          ? padrao.secao2.tituloCardAtivo
          : secao2Salva.tituloCardAtivo || padrao.secao2.tituloCardAtivo,
      subtituloCardAtivo:
        secao2Salva.subtituloCardAtivo === 'Geração Plena Preservada'
          ? padrao.secao2.subtituloCardAtivo
          : secao2Salva.subtituloCardAtivo || padrao.secao2.subtituloCardAtivo,
      tituloCardPerda15: ['Perda 15% ao ano', 'Perda de 15% por sujidade'].includes(
        secao2Salva.tituloCardPerda15,
      )
        ? padrao.secao2.tituloCardPerda15
        : secao2Salva.tituloCardPerda15 || padrao.secao2.tituloCardPerda15,
      subtituloCardPerda15: secao2Salva.subtituloCardPerda15 || padrao.secao2.subtituloCardPerda15,
      tituloCardPerda20: [
        'Perda 20% ao ano',
        'Sujidade acumulada',
        'Valor estimado de 20 dias de geração',
      ].includes(secao2Salva.tituloCardPerda20)
        ? padrao.secao2.tituloCardPerda20
        : secao2Salva.tituloCardPerda20 || padrao.secao2.tituloCardPerda20,
      subtituloCardPerda20: [
        'Operação Sem Prevenção',
        '20% de geração perdida por ano',
        'Cálculo: geração mensal × tarifa ÷ 30 × 20; varia por usina',
      ].includes(secao2Salva.subtituloCardPerda20)
        ? padrao.secao2.subtituloCardPerda20
        : secao2Salva.subtituloCardPerda20 || padrao.secao2.subtituloCardPerda20,
      tituloCardFalha30: [
        'Prejuízo 30 dias',
        'Falha não detectada',
        'Valor estimado de 30 dias de geração',
        'Perda não detectada em 30 dias',
      ].includes(secao2Salva.tituloCardFalha30)
        ? padrao.secao2.tituloCardFalha30
        : secao2Salva.tituloCardFalha30 || padrao.secao2.tituloCardFalha30,
      subtituloCardFalha30: [
        'Falha Grave Sem Alerta',
        '30 dias sem funcionamento da usina',
        'Cálculo: geração mensal × tarifa; varia por usina',
        'Estimativa desta usina: geração mensal × tarifa ÷ 30 × 20',
      ].includes(secao2Salva.subtituloCardFalha30)
        ? padrao.secao2.subtituloCardFalha30
        : secao2Salva.subtituloCardFalha30 || padrao.secao2.subtituloCardFalha30,
      textoRiscoGarantia:
        secao2Salva.textoRiscoGarantia ===
        'Sujidade não representa apenas perda de geração. Conforme as condições de cada fabricante, a manutenção adequada e documentada pode ser relevante para a cobertura de garantia dos módulos.'
          ? padrao.secao2.textoRiscoGarantia
          : secao2Salva.textoRiscoGarantia || padrao.secao2.textoRiscoGarantia,
      textoEvidenciaSujidade:
        secao2Salva.textoEvidenciaSujidade ===
        'Em uma usina do IFMG Betim, um estudo estimou perdas de geração por sujidade de até 22,25%. Os resultados variam conforme o período de deposição e a ocorrência de chuvas.'
          ? padrao.secao2.textoEvidenciaSujidade
          : secao2Salva.textoEvidenciaSujidade || padrao.secao2.textoEvidenciaSujidade,
      fonteEvidenciaSujidade:
        secao2Salva.fonteEvidenciaSujidade ===
        'Fonte: SciELO — Operação e manutenção de sistemas fotovoltaicos conectados à rede: inspeção termográfica e limpeza de módulos FV (2021).'
          ? padrao.secao2.fonteEvidenciaSujidade
          : secao2Salva.fonteEvidenciaSujidade || padrao.secao2.fonteEvidenciaSujidade,
    },
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
      ...secao4Salva,
      beneficiosEssencial: arraysIguais(
        secao4Salva.beneficiosEssencial,
        beneficiosLegados.essencial,
      )
        ? padrao.secao4.beneficiosEssencial
        : Array.isArray(secao4Salva.beneficiosEssencial)
          ? secao4Salva.beneficiosEssencial
          : padrao.secao4.beneficiosEssencial,
      beneficiosInspecao: arraysIguais(secao4Salva.beneficiosInspecao, beneficiosLegados.inspecao)
        ? padrao.secao4.beneficiosInspecao
        : Array.isArray(secao4Salva.beneficiosInspecao)
          ? secao4Salva.beneficiosInspecao
          : padrao.secao4.beneficiosInspecao,
      beneficiosCompleto: arraysIguais(secao4Salva.beneficiosCompleto, beneficiosLegados.completo)
        ? padrao.secao4.beneficiosCompleto
        : Array.isArray(secao4Salva.beneficiosCompleto)
          ? secao4Salva.beneficiosCompleto
          : padrao.secao4.beneficiosCompleto,
    },
    secao5: {
      ...padrao.secao5,
      ...secao5Salva,
      itens: arraysIguais(
        secao5Salva.itens?.map((item: ConteudoOMSecao5Item) => `${item.titulo}|${item.descricao}`),
        [
          'Segurança Normativa|Técnicos certificados nas normas regulamentadoras NR-10 (Segurança Elétrica) e NR-35 (Trabalho em Altura).',
          'Precisão Metrológica|Instrumentos e equipamentos de medição aferidos e calibrados segundo os padrões metrológicos vigentes.',
          'Química e Água Tratada|Produtos homologados e água desmineralizada/filtrada, preservando integralmente a garantia dos módulos.',
        ],
      )
        ? padrao.secao5.itens
        : secao5Salva.itens && Array.isArray(secao5Salva.itens) && secao5Salva.itens.length > 0
          ? secao5Salva.itens
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
      ...secao7Salva,
      itens: arraysIguais(
        secao7Salva.itens?.map(
          (item: ConteudoOMSecao7Item) => `${item.id}|${item.titulo}|${item.descricao}`,
        ),
        itensCondicaoLegados.map((item) => `${item.id}|${item.titulo}|${item.descricao}`),
      )
        ? padrao.secao7.itens
        : secao7Salva.itens && Array.isArray(secao7Salva.itens) && secao7Salva.itens.length > 0
          ? secao7Salva.itens
          : padrao.secao7.itens,
    },
    secaoEscopoTecnico: {
      ...padrao.secaoEscopoTecnico,
      ...(salvo.secaoEscopoTecnico || {}),
      itens:
        salvo.secaoEscopoTecnico?.itens &&
        Array.isArray(salvo.secaoEscopoTecnico.itens) &&
        salvo.secaoEscopoTecnico.itens.length > 0
          ? salvo.secaoEscopoTecnico.itens
          : padrao.secaoEscopoTecnico.itens,
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
