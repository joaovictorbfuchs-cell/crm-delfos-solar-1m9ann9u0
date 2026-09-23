/**
 * Definições de tipo e valores padrão para o conteúdo editável da Proposta Técnico-Comercial.
 * Utilizado pelo gerador de PDF/HTML (propostaTecnicoComercialGenerator.ts), Word (propostaSolarDocxGenerator.ts)
 * e componentes de visualização da Etapa 4 do ModalOrcamentoSolar.
 */

export interface DiferencialInstitucional {
  id: string
  icone: string
  titulo: string
  descricao: string
}

export interface BlocoSubSecaoSeuSistema {
  visivel: boolean
  corDestaque?: string
  badge: string
  tagDireita: string
  titulo: string
  descricao: string
  checklist: string[]
}

export interface ConteudoCapa {
  badge: string
  titulo: string
  subtitulo: string
  rotuloPreparadaPara: string
  rotuloConsultor: string
  corDestaque: string
}

export interface ConteudoDadosCliente {
  rotuloDocumento: string
  rotuloCidade: string
  rotuloEndereco: string
}

export interface ConteudoSecaoApresentacao {
  visivel: boolean
  corDestaque: string
  badge: string
  tempoAtuacaoBadge: string
  titulo: string
  subtitulo: string
  textoDescritivo: string
  diferenciais: DiferencialInstitucional[]
}

export interface ConteudoSecaoSituacaoAtual {
  visivel: boolean
  corDestaque: string
  badge: string
  titulo: string
  subtitulo: string
  consumoTitulo: string
  consumoSubtitulo: string
  custoTitulo: string
  custoSubtitulo: string
  avisoInerciaTitulo: string
  avisoInerciaSubtitulo: string
}

export interface ConteudoSecaoSeuSistema {
  visivel: boolean
  corDestaque: string
  badge: string
  titulo: string
  subtitulo: string
  blocoMonitoramentoBarra: BlocoSubSecaoSeuSistema
  blocoComoFunciona: BlocoSubSecaoSeuSistema
  blocoMonitoramentoDetalhado: BlocoSubSecaoSeuSistema
}

export interface ConteudoSecaoProjecao25Anos {
  visivel: boolean
  corDestaque: string
  badge: string
  titulo: string
  subtitulo: string
  avisoLegal: string
}

export interface ConteudoSecaoInvestimento {
  visivel: boolean
  corDestaque: string
  titulo: string
  subtituloCondicoes: string
  prazoTextoComplementar: string
  avisoPostergacaoTitulo: string
  avisoPostergacaoSubtitulo: string
  avisoPostergacaoTexto: string
  avisoLegalRodape: string
}

export interface ConteudoProposta {
  capa: ConteudoCapa
  dadosCliente: ConteudoDadosCliente
  secaoApresentacao: ConteudoSecaoApresentacao
  secaoSituacaoAtual: ConteudoSecaoSituacaoAtual
  secaoSeuSistema: ConteudoSecaoSeuSistema
  secaoProjecao25Anos: ConteudoSecaoProjecao25Anos
  secaoInvestimento: ConteudoSecaoInvestimento
}

export const PALETA_CORES_DESTAQUE = [
  { valor: '#16A34A', nome: 'Verde Esmeralda (Padrão)' },
  { valor: '#0284C7', nome: 'Azul Conectado' },
  { valor: '#D97706', nome: 'Âmbar Solar' },
  { valor: '#7C3AED', nome: 'Roxo Moderno' },
  { valor: '#4F46E5', nome: 'Índigo Executivo' },
  { valor: '#0D9488', nome: 'Teal Elegante' },
] as const

/**
 * Retorna os defaults fiéis aos textos hardcoded atuais dos geradores da proposta Delfos Solar.
 */
export function getConteudoPropostaDefaults(): ConteudoProposta {
  return {
    capa: {
      badge: 'PROPOSTA TÉCNICO-COMERCIAL',
      titulo: 'Energia que\ngera retorno',
      subtitulo: 'Sistema fotovoltaico projetado exclusivamente para você',
      rotuloPreparadaPara: 'PREPARADA PARA:',
      rotuloConsultor: 'Consultor:',
      corDestaque: '#16A34A',
    },
    dadosCliente: {
      rotuloDocumento: 'CPF/CNPJ:',
      rotuloCidade: 'Município/UF:',
      rotuloEndereco: 'Endereço da Usina:',
    },
    secaoApresentacao: {
      visivel: true,
      corDestaque: '#16A34A',
      badge: 'INSTITUCIONAL',
      tempoAtuacaoBadge: 'DESDE 2014',
      titulo: 'A Delfos Solar',
      subtitulo: 'Energia que gera retorno',
      textoDescritivo:
        'A Delfos Solar é uma empresa de engenharia especializada no desenvolvimento, homologação e implantação de soluções de energia fotovoltaica de alto rendimento. Nossa missão é transformar contas de energia em ativos estratégicos de rentabilidade, segurança financeira e valorização patrimonial para clientes residenciais, comerciais, industriais e do agronegócio.',
      diferenciais: [
        {
          id: 'dif-1',
          icone: '📅',
          titulo: '12 Anos de Atuação',
          descricao: '12 anos de atuação no mercado de energia com solidez e pioneirismo.',
        },
        {
          id: 'dif-2',
          icone: '⚡',
          titulo: '+2.500 Projetos',
          descricao: '+2.500 projetos entregues e homologados com excelência técnica.',
        },
        {
          id: 'dif-3',
          icone: '📐',
          titulo: 'Engenharia Própria',
          descricao: 'Engenharia própria — projetos turnkey, do projeto à homologação.',
        },
        {
          id: 'dif-4',
          icone: '🛡️',
          titulo: 'Pós-Venda Ativo',
          descricao: 'Pós-venda estruturado — monitoramento, manutenção e suporte técnico.',
        },
        {
          id: 'dif-5',
          icone: '📍',
          titulo: 'Atuação Regional',
          descricao: 'Atuação regional — presente nos 3 estados do Sul do Brasil.',
        },
      ],
    },
    secaoSituacaoAtual: {
      visivel: true,
      corDestaque: '#16A34A',
      badge: 'Situação Atual',
      titulo: 'Situação Atual',
      subtitulo:
        'Panorama do seu padrão de consumo energético e despesas recorrentes pagas à concessionária sem qualquer retorno patrimonial, além da projeção de gastos futuros sem a tecnologia solar.',
      consumoTitulo: 'Consumo de Energia',
      consumoSubtitulo: 'Volume consumido da concessionária',
      custoTitulo: 'Custos com Concessionária',
      custoSubtitulo: 'Desembolso financeiro sem retorno',
      avisoInerciaTitulo: 'Gastos Acumulados Sem Solar: 1, {periodo} e 25 Anos',
      avisoInerciaSubtitulo:
        'Total faturado pela concessionária ao longo do tempo considerando o reajuste tarifário histórico da rede elétrica',
    },
    secaoSeuSistema: {
      visivel: true,
      corDestaque: '#16A34A',
      badge: 'Seu Sistema Fotovoltaico',
      titulo: 'Conheça sua usina solar',
      subtitulo:
        'Engenharia de precisão planejada sob medida para você. Todos os dados técnicos consolidados em uma apresentação clara, moderna e transparente — sem letras miúdas.',
      blocoMonitoramentoBarra: {
        visivel: true,
        corDestaque: '#16A34A',
        badge: 'Monitoramento pelo Smartphone',
        tagDireita: 'APLICATIVO MOBILE',
        titulo: 'Monitoramento pelo Smartphone',
        descricao:
          'Acompanhe geração diária em tempo real, curva solar em kWh, economia mensal acumulada e alertas de desempenho.',
        checklist: ['iOS & Android Inclusos'],
      },
      blocoComoFunciona: {
        visivel: true,
        corDestaque: '#16A34A',
        badge: 'Engenharia On-Grid',
        tagDireita: 'Conexão à Rede Concessionária',
        titulo: 'Como Funciona o Sistema Solar (On-Grid)',
        descricao:
          'Módulos fotovoltaicos de alta eficiência convertem a radiação solar em energia elétrica contínua. O inversor inteligente sincroniza e transforma essa energia em corrente alternada para o consumo imediato do seu imóvel. O excedente produzido é injetado na concessionária, gerando créditos energéticos abatidos no seu medidor bidirecional.',
        checklist: ['Homologação Completa e ART de Engenharia Inclusas', 'Turnkey Delfos Solar'],
      },
      blocoMonitoramentoDetalhado: {
        visivel: true,
        corDestaque: '#16A34A',
        badge: 'Telemetria em Tempo Real',
        tagDireita: 'App Mobile Incluso',
        titulo: 'Monitoramento',
        descricao:
          'Acompanhe a geração de energia em tempo real na palma da mão. Gráficos diários e mensais em kWh, economia acumulada em reais, status de funcionamento do inversor e alertas inteligentes via aplicativo para smartphone (iOS e Android).',
        checklist: ['Suporte Técnico e Acesso Vitalício', 'iOS & Android'],
      },
    },
    secaoProjecao25Anos: {
      visivel: true,
      corDestaque: '#16A34A',
      badge: 'Curva de Retorno e Payback',
      titulo: 'Sua economia ao longo do tempo',
      subtitulo:
        'Veja o quanto você vai economizar ao longo da vida útil do sistema solar em comparação com o dinheiro pago à concessionária.',
      avisoLegal:
        '* Projeção baseada na degradação linear de fábrica dos módulos e histórico de reajustes tarifários da rede elétrica.',
    },
    secaoInvestimento: {
      visivel: true,
      corDestaque: '#16A34A',
      titulo: 'Investimento Total',
      subtituloCondicoes: 'Condições de pagamento',
      prazoTextoComplementar: 'Engenharia, homologação na concessionária e instalação turnkey',
      avisoPostergacaoTitulo: 'Custo de Postergação',
      avisoPostergacaoSubtitulo: 'Cada mês sem energia solar custa dinheiro',
      avisoPostergacaoTexto:
        'Adiar a decisão significa continuar pagando a conta cheia para a concessionária sem construir patrimônio.',
      avisoLegalRodape: 'De acordo com as especificações e valores da proposta',
    },
  }
}

/**
 * Mescla recursivamente um ConteudoProposta salvo (parcial ou vindo do PocketBase)
 * garantindo que campos novos adicionados no futuro recebam os defaults sem quebrar.
 */
export function normalizarConteudoProposta(
  salvo?: Partial<ConteudoProposta> | null,
): ConteudoProposta {
  const padrao = getConteudoPropostaDefaults()
  if (!salvo) return padrao

  return {
    capa: { ...padrao.capa, ...(salvo.capa || {}) },
    dadosCliente: { ...padrao.dadosCliente, ...(salvo.dadosCliente || {}) },
    secaoApresentacao: {
      ...padrao.secaoApresentacao,
      ...(salvo.secaoApresentacao || {}),
      diferenciais:
        salvo.secaoApresentacao?.diferenciais && salvo.secaoApresentacao.diferenciais.length > 0
          ? salvo.secaoApresentacao.diferenciais
          : padrao.secaoApresentacao.diferenciais,
    },
    secaoSituacaoAtual: {
      ...padrao.secaoSituacaoAtual,
      ...(salvo.secaoSituacaoAtual || {}),
    },
    secaoSeuSistema: {
      ...padrao.secaoSeuSistema,
      ...(salvo.secaoSeuSistema || {}),
      blocoMonitoramentoBarra: {
        ...padrao.secaoSeuSistema.blocoMonitoramentoBarra,
        ...(salvo.secaoSeuSistema?.blocoMonitoramentoBarra || {}),
        checklist:
          salvo.secaoSeuSistema?.blocoMonitoramentoBarra?.checklist ??
          padrao.secaoSeuSistema.blocoMonitoramentoBarra.checklist,
      },
      blocoComoFunciona: {
        ...padrao.secaoSeuSistema.blocoComoFunciona,
        ...(salvo.secaoSeuSistema?.blocoComoFunciona || {}),
        checklist:
          salvo.secaoSeuSistema?.blocoComoFunciona?.checklist ??
          padrao.secaoSeuSistema.blocoComoFunciona.checklist,
      },
      blocoMonitoramentoDetalhado: {
        ...padrao.secaoSeuSistema.blocoMonitoramentoDetalhado,
        ...(salvo.secaoSeuSistema?.blocoMonitoramentoDetalhado || {}),
        checklist:
          salvo.secaoSeuSistema?.blocoMonitoramentoDetalhado?.checklist ??
          padrao.secaoSeuSistema.blocoMonitoramentoDetalhado.checklist,
      },
    },
    secaoProjecao25Anos: {
      ...padrao.secaoProjecao25Anos,
      ...(salvo.secaoProjecao25Anos || {}),
    },
    secaoInvestimento: {
      ...padrao.secaoInvestimento,
      ...(salvo.secaoInvestimento || {}),
    },
  }
}
