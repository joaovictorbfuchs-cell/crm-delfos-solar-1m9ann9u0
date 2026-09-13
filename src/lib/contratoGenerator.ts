/**
 * Gerador de Contrato de Prestação de Serviços de Operação e Manutenção (O&M)
 * Modelo fiel ao anexo oficial Delfos Solar:
 * "CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE ACOMPANHAMENTO, ANÁLISE DE PERFORMANCE E MANUTENÇÃO DE GERADOR FOTOVOLTAICO"
 */

import { formatCurrency } from './formatters'

export type PlanoContratoOM = 'Essencial' | 'Prevenção' | 'Completo'

export interface ServicosAdicionaisValores {
  diagnostico: number
  manutencaoCorretiva: number
  inspecaoTermografica: number
  inspecaoTecnica: number
  limpezaPaineis: number
  testesInversor: number
  substituicaoInversor: number
  relatorioSeguradora: number
  configuracaoDatalogger: number
  gestaoRateio: number
  auditoriaFaturamento: number
  manutencaoAtivos: number
}

export const SERVICOS_ADICIONAIS_PADRAO: ServicosAdicionaisValores = {
  diagnostico: 350,
  manutencaoCorretiva: 450,
  inspecaoTermografica: 600,
  inspecaoTecnica: 350,
  limpezaPaineis: 450,
  testesInversor: 350,
  substituicaoInversor: 550,
  relatorioSeguradora: 850,
  configuracaoDatalogger: 250,
  gestaoRateio: 300,
  auditoriaFaturamento: 450,
  manutencaoAtivos: 350,
}

export interface DadosContratoOM {
  // Contratante
  nomeRazaoSocial: string
  cpfCnpj: string
  enderecoInstalacao: string
  municipio: string
  telefone: string
  email: string

  // Dados Técnicos do Sistema
  numeroModulos: number | string
  marcaInversores: string
  localInstalacao: string // Solo ou Telhado
  enderecoInstalacaoDiferente?: string

  // Plano e Valores
  planoSelecionado: PlanoContratoOM
  valorTotal: number
  valorMensal: number
  valorEscritoTotal?: string
  valorEscritoMensal?: string

  // Serviços Adicionais (Anexo II)
  servicosAdicionais: ServicosAdicionaisValores

  // Local, data e assinaturas
  cidadeAssinatura?: string
  dataPorExtenso: string
}

export const DADOS_FIXOS_CONTRATADA_CONTRATO = {
  razaoSocial: 'DELFOS ENGENHARIA LTDA',
  cnpj: '21.379.952/0001-38',
  endereco: 'Rua Espírito Santo, nº 275, Centro, Erechim/RS, CEP 99709-296',
  representanteNome: 'João Victor Bagetti Fuchs',
  representanteCargo: 'engenheiro eletricista',
  representanteCpf: '811.562.780-15',
  cidadeSede: 'Erechim',
  ufSede: 'RS',
}

/**
 * Converte número em valor por extenso em reais (PT-BR) de forma amigável e precisa.
 */
export function numeroParaExtensoEmReais(valor: number): string {
  if (isNaN(valor) || valor <= 0) return 'zero reais'

  const unidades = [
    '',
    'um',
    'dois',
    'três',
    'quatro',
    'cinco',
    'seis',
    'sete',
    'oito',
    'nove',
    'dez',
    'onze',
    'doze',
    'treze',
    'quatorze',
    'quinze',
    'dezesseis',
    'dezessete',
    'dezoito',
    'dezenove',
  ]
  const dezenas = [
    '',
    '',
    'vinte',
    'trinta',
    'quarenta',
    'cinquenta',
    'sessenta',
    'setenta',
    'oitenta',
    'noventa',
  ]
  const centenas = [
    '',
    'cento',
    'duzentos',
    'trezentos',
    'quatrocentos',
    'quinhentos',
    'seiscentos',
    'setecentos',
    'oitocentos',
    'novecentos',
  ]

  const converterCentena = (n: number): string => {
    if (n === 0) return ''
    if (n === 100) return 'cem'
    const c = Math.floor(n / 100)
    const resto = n % 100
    const partes: string[] = []

    if (c > 0) partes.push(centenas[c])

    if (resto > 0) {
      if (resto < 20) {
        partes.push(unidades[resto])
      } else {
        const d = Math.floor(resto / 10)
        const u = resto % 10
        partes.push(dezenas[d])
        if (u > 0) partes.push(unidades[u])
      }
    }
    return partes.join(' e ')
  }

  const inteiro = Math.floor(valor)
  const centavos = Math.round((valor - inteiro) * 100)

  const milhoes = Math.floor(inteiro / 1_000_000)
  const milhares = Math.floor((inteiro % 1_000_000) / 1000)
  const restoInteiro = inteiro % 1000

  const partesTexto: string[] = []

  if (milhoes > 0) {
    partesTexto.push(milhoes === 1 ? 'um milhão' : `${converterCentena(milhoes)} milhões`)
  }

  if (milhares > 0) {
    partesTexto.push(milhares === 1 ? 'mil' : `${converterCentena(milhares)} mil`)
  }

  if (restoInteiro > 0 || partesTexto.length === 0) {
    if (restoInteiro > 0) {
      partesTexto.push(converterCentena(restoInteiro))
    }
  }

  let textoReais = partesTexto.join(' e ')
  if (inteiro === 1) {
    textoReais += ' real'
  } else if (inteiro > 1) {
    textoReais += ' reais'
  }

  if (centavos > 0) {
    const textoCentavos = converterCentena(centavos)
    const labelCentavos = centavos === 1 ? 'centavo' : 'centavos'
    if (inteiro > 0) {
      return `${textoReais} e ${textoCentavos} ${labelCentavos}`
    }
    return `${textoCentavos} ${labelCentavos} de real`
  }

  return textoReais || 'zero reais'
}

/**
 * Retorna a data atual formatada por extenso em português.
 * Exemplo: "14 de setembro de 2026"
 */
export function formatarDataExtenso(date: Date = new Date()): string {
  const meses = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
  ]
  const dia = date.getDate()
  const mes = meses[date.getMonth()]
  const ano = date.getFullYear()
  return `${dia} de ${mes} de ${ano}`
}

/**
 * Normaliza os valores de merge fields para evitar campos em branco que quebrem o contrato.
 */
export function normalizarDadosContrato(dados: Partial<DadosContratoOM>): DadosContratoOM {
  const valorTotal = Number(dados.valorTotal ?? 0)
  const valorMensal = Number(dados.valorMensal ?? (valorTotal > 0 ? valorTotal / 12 : 0))

  return {
    nomeRazaoSocial: (dados.nomeRazaoSocial || '').trim() || 'Nome do Contratante',
    cpfCnpj: (dados.cpfCnpj || '').trim() || '000.000.000-00',
    enderecoInstalacao: (dados.enderecoInstalacao || '').trim() || 'Endereço da Instalação',
    municipio: (dados.municipio || '').trim() || 'Erechim/RS',
    telefone: (dados.telefone || '').trim() || '',
    email: (dados.email || '').trim() || '',
    numeroModulos: dados.numeroModulos || '0',
    marcaInversores: (dados.marcaInversores || '').trim() || 'Inversores Padrão Delfos',
    localInstalacao: (dados.localInstalacao || '').trim() || 'Telhado',
    enderecoInstalacaoDiferente: (dados.enderecoInstalacaoDiferente || '').trim(),
    planoSelecionado: dados.planoSelecionado || 'Essencial',
    valorTotal,
    valorMensal,
    valorEscritoTotal: dados.valorEscritoTotal || numeroParaExtensoEmReais(valorTotal),
    valorEscritoMensal: dados.valorEscritoMensal || numeroParaExtensoEmReais(valorMensal),
    servicosAdicionais: {
      ...SERVICOS_ADICIONAIS_PADRAO,
      ...(dados.servicosAdicionais || {}),
    },
    cidadeAssinatura: (dados.cidadeAssinatura || '').trim() || 'Erechim',
    dataPorExtenso: (dados.dataPorExtenso || '').trim() || formatarDataExtenso(),
  }
}

/**
 * Retorna os itens do Anexo I conforme o plano selecionado.
 */
export function getAnexoIPlanoConteudo(plano: PlanoContratoOM): {
  titulo: string
  subtitulo: string
  itens: { numero: number; titulo: string; descricao: string }[]
} {
  const essencialItens = [
    {
      numero: 1,
      titulo:
        'Aplicativo Premium com gestão energética, financeira e download automático de faturas',
      descricao:
        'Acesso à plataforma em tempo real, visualização de geração, consumo, economia mensal. Ferramenta de gestão financeira para acompanhar retorno do investimento. Integração automática com sistema da RGE para download e análise de faturas, facilitando acompanhamento de economia.',
    },
    {
      numero: 2,
      titulo: 'Monitoramento da geração em horários comerciais',
      descricao:
        'Acompanhamento do sistema em dias úteis (segunda a sexta-feira, das 08h00 às 17h30) com notificações automáticas de anomalias detectadas durante o período de operação (inversor desligado, perda de comunicação, queda abrupta de geração, funcionamento fora dos parâmetros previstos).',
    },
    {
      numero: 3,
      titulo: 'Relatório mensal de desempenho',
      descricao:
        'Análise detalhada mensal com indicadores de geração, eficiência, comparativo com mês anterior e economia gerada.',
    },
    {
      numero: 4,
      titulo: 'Suporte técnico especializado',
      descricao:
        'Atendimento por e-mail e telefone em dias úteis (segunda a sexta-feira, das 08h00 às 17h30) com resposta em até 4 horas para dúvidas técnicas, orientações e suporte operacional.',
    },
    {
      numero: 5,
      titulo: 'Intermediação com a RGE',
      descricao:
        'Suporte na comunicação com concessionária para questões técnicas, compensação de energia, regularização de documentação, análise de faturas, esclarecimento de dúvidas sobre tarifas e procedimentos administrativos.',
    },
    {
      numero: 6,
      titulo: 'Configuração e suporte remoto',
      descricao:
        'Acesso remoto ao sistema para configuração de parâmetros, atualização de firmware, diagnóstico de anomalias e orientações técnicas sem necessidade de deslocamento.',
    },
  ]

  if (plano === 'Essencial') {
    return {
      titulo: 'ANEXO I – PLANO ESSENCIAL',
      subtitulo: 'O Plano Essencial compreende os seguintes serviços:',
      itens: essencialItens,
    }
  }

  const prevencaoItens = [
    ...essencialItens,
    {
      numero: 7,
      titulo: 'Inspeção preventiva anual',
      descricao:
        '1 (uma) visita técnica anual para inspeção completa do sistema, incluindo verificação de inversor, conexões elétricas, string box, aterramento, estrutura de fixação e dispositivos de proteção. Objetivo: identificar desgaste, oxidação, aquecimento anormal e riscos de segurança antes que se tornem problemas. Inclui relatório técnico detalhado com recomendações.',
    },
    {
      numero: 8,
      titulo: 'Reaperto de conexões e grampos',
      descricao:
        'Verificação e reaperto de todas as conexões elétricas, terminais, grampos e parafusos que possam ter afrouxado por vibração, dilatação térmica ou envelhecimento. Previne perdas de eficiência e riscos de incêndio. Serviço essencial para manutenção da segurança e performance do sistema.',
    },
    {
      numero: 9,
      titulo: 'Verificação de desempenho (pontos quentes, sombreamento, falhas)',
      descricao:
        'Análise técnica detalhada para identificar módulos com funcionamento anormal, pontos quentes (termografia visual), sombreamento não previsto, falhas internas e degradação. Inclui recomendações de otimização e plano de ação para correções necessárias.',
    },
  ]

  if (plano === 'Prevenção') {
    return {
      titulo: 'ANEXO I – PLANO PREVENÇÃO',
      subtitulo: 'O Plano Prevenção compreende os seguintes serviços:',
      itens: prevencaoItens,
    }
  }

  // Plano Completo
  const completoItens = [
    ...essencialItens,
    {
      numero: 7,
      titulo: 'Inspeção preventiva anual',
      descricao:
        '1 (uma) visita técnica anual para inspeção completa do sistema, incluindo verificação de inversor, conexões elétricas, string box, aterramento, estrutura de fixação e dispositivos de proteção. Objetivo: identificar desgaste, oxidação, aquecimento anormal e riscos de segurança antes que se tornem problemas. Inclui relatório técnico detalhado com recomendações. Esta inspeção preventiva será realizada no mesmo momento do serviço de Limpeza das placas solares.',
    },
    {
      numero: 8,
      titulo: 'Reaperto de conexões e grampos',
      descricao:
        'Verificação e reaperto de todas as conexões elétricas, terminais, grampos e parafusos que possam ter afrouxado por vibração, dilatação térmica ou envelhecimento. Previne perdas de eficiência e riscos de incêndio. Serviço essencial para manutenção da segurança e performance do sistema.',
    },
    {
      numero: 9,
      titulo: 'Verificação de desempenho (pontos quentes, sombreamento, falhas)',
      descricao:
        'Análise técnica detalhada para identificar módulos com funcionamento anormal, pontos quentes (termografia visual), sombreamento não previsto, falhas internas e degradação. Inclui recomendações de otimização e plano de ação para correções necessárias.',
    },
    {
      numero: 10,
      titulo: 'Limpeza de placas solares 2x/ano',
      descricao:
        '2 (duas) limpezas anuais (semestral) com remoção profissional de poeira, folhas, sujeira, resíduos e contaminantes que reduzem geração. Limpeza realizada com equipamento apropriado e produtos específicos para máxima eficiência e preservação dos módulos. Cada limpeza pode recuperar até 25% de perda de geração causada por sujidade, garantindo máximo retorno do investimento ao longo do ano.',
    },
  ]

  return {
    titulo: 'ANEXO I – PLANO COMPLETO',
    subtitulo:
      'O Plano Completo compreende todos os serviços do Plano Essencial e Prevenção com funcionalidades premium, acrescidos do seguinte item:',
    itens: completoItens,
  }
}

/**
 * Retorna os 12 serviços adicionais do Anexo II com valores mesclados.
 */
export function getAnexoIIServicos(valores: ServicosAdicionaisValores) {
  return [
    {
      item: 1,
      servico: 'Diagnóstico Técnico',
      descricao: 'Análise completa do sistema, identificação de anomalias e recomendações',
      valor: formatCurrency(valores.diagnostico),
      horaAdicional: 'R$ 150,00',
      observacoes: '',
    },
    {
      item: 2,
      servico: 'Manutenção Corretiva',
      descricao: 'Execução de reparos e ajustes identificados em diagnóstico.',
      valor: formatCurrency(valores.manutencaoCorretiva),
      horaAdicional: 'R$ 150,00',
      observacoes:
        'Peças cobradas à parte com nota fiscal. Não será cobrado caso seja feita na visita do item anterior.',
    },
    {
      item: 3,
      servico: 'Inspeção Termográfica e Relatório',
      descricao: 'Detecção de pontos quentes em módulos e conexões, com relatório técnico',
      valor: formatCurrency(valores.inspecaoTermografica),
      horaAdicional: '-',
      observacoes: 'Realizado em dias de sol, entre 10hrs e 14hrs.',
    },
    {
      item: 4,
      servico: 'Inspeção Técnica',
      descricao: 'Inspeção visual completa de estrutura, conexões e equipamentos',
      valor: formatCurrency(valores.inspecaoTecnica),
      horaAdicional: 'R$ 150,00',
      observacoes: '',
    },
    {
      item: 5,
      servico: 'Limpeza de Painéis Solares',
      descricao: 'Limpeza profissional com remoção de poeira, sujeira e contaminantes',
      valor: formatCurrency(valores.limpezaPaineis),
      horaAdicional: '-',
      observacoes: '',
    },
    {
      item: 6,
      servico: 'Testes em Inversor para Garantia',
      descricao: 'Diagnóstico e testes de funcionamento para acionamento de garantia',
      valor: formatCurrency(valores.testesInversor),
      horaAdicional: 'R$ 150,00',
      observacoes: 'Mão de obra; peças cobertas por garantia do fabricante',
    },
    {
      item: 7,
      servico: 'Substituição de Inversor',
      descricao: 'Remoção e instalação de novo inversor',
      valor: formatCurrency(valores.substituicaoInversor),
      horaAdicional: 'R$ 150,00',
      observacoes: 'Peças cobradas à parte; requer desligamento da rede elétrica',
    },
    {
      item: 8,
      servico: 'Relatório Técnico Especializado (Seguradora)',
      descricao: 'Laudo técnico detalhado para fins de seguro ou perícia',
      valor: formatCurrency(valores.relatorioSeguradora),
      horaAdicional: '-',
      observacoes: 'Inclui fotos, análise e recomendações',
    },
    {
      item: 9,
      servico: 'Configuração de datalogger (monitoramento)',
      descricao:
        'Configuração de datalogger com plataforma de monitoramento. Contratante deve possuir WiFi de alta qualidade e fornecer login e senha. É obrigatório que o SSID (nome da rede) tenha apenas letras e números, sem espaços ou caracteres especiais.',
      valor: formatCurrency(valores.configuracaoDatalogger),
      horaAdicional: 'R$ 150,00',
      observacoes: 'NÃO inclui substituição de equipamento em caso de defeito',
    },
    {
      item: 10,
      servico: 'Gestão de Rateio e Beneficiárias',
      descricao: 'Anexo G • Otimização de Rateio de Injeção',
      valor: formatCurrency(valores.gestaoRateio),
      horaAdicional: '-',
      observacoes: '',
    },
    {
      item: 11,
      servico: 'Auditoria e Contestação de Faturamento',
      descricao:
        'Saneamento de Divergências de Consumo/Injeção • Recuperação de Créditos por Erro de Medição',
      valor: formatCurrency(valores.auditoriaFaturamento),
      horaAdicional: '-',
      observacoes: '',
    },
    {
      item: 12,
      servico: 'Manutenção de Ativos e Medição',
      descricao:
        'Reclamações de falta de energia e problemas no medidor • Gestão de Ocorrências e Disponibilidade de Rede • Suporte Técnico para Sistemas de Medição • Intermediação de Falhas e Manutenções de Conexão',
      valor: formatCurrency(valores.manutencaoAtivos),
      horaAdicional: '-',
      observacoes: '',
    },
  ]
}

/**
 * Gera o documento HTML A4 fiel para impressão e pré-visualização.
 */
export function gerarHTMLContratoOM(dadosInput: Partial<DadosContratoOM>): string {
  const dados = normalizarDadosContrato(dadosInput)
  const anexoI = getAnexoIPlanoConteudo(dados.planoSelecionado)
  const anexoIIItens = getAnexoIIServicos(dados.servicosAdicionais)

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>CONTRATO DE PRESTAÇÃO DE SERVIÇOS O&M — ${dados.nomeRazaoSocial}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 20mm 18mm 20mm 18mm;
    }
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 30px;
      background-color: #f3f4f6;
      font-family: 'Times New Roman', Times, Georgia, serif;
      color: #111827;
      line-height: 1.6;
      font-size: 11.5pt;
      -webkit-font-smoothing: antialiased;
    }
    .page-a4 {
      background: #ffffff;
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto 30px auto;
      padding: 24mm 22mm;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
      position: relative;
    }
    .header-institucional {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #16a34a;
      padding-bottom: 12px;
      margin-bottom: 24px;
    }
    .logo-marca {
      font-size: 14pt;
      font-weight: bold;
      color: #15803d;
      letter-spacing: 0.5px;
    }
    .sub-marca {
      font-size: 8.5pt;
      color: #4b5563;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .titulo-principal {
      text-align: center;
      font-size: 13pt;
      font-weight: bold;
      letter-spacing: 0.5px;
      margin-top: 10px;
      margin-bottom: 6px;
      text-transform: uppercase;
    }
    .subtitulo-doc {
      text-align: center;
      font-size: 11pt;
      font-weight: bold;
      color: #374151;
      margin-bottom: 24px;
    }
    p {
      text-align: justify;
      text-justify: inter-word;
      margin-top: 0;
      margin-bottom: 14px;
      line-height: 1.65;
    }
    strong {
      font-weight: bold;
      color: #000;
    }
    .secao-titulo {
      font-size: 11.5pt;
      font-weight: bold;
      text-transform: uppercase;
      margin-top: 20px;
      margin-bottom: 8px;
      color: #111827;
    }
    .clausula-titulo {
      font-size: 11pt;
      font-weight: bold;
      text-transform: uppercase;
      margin-top: 18px;
      margin-bottom: 6px;
      color: #111827;
    }
    .lista-letras, .lista-numeros {
      margin-top: 4px;
      margin-bottom: 14px;
      padding-left: 24px;
      text-align: justify;
    }
    .lista-letras li, .lista-numeros li {
      margin-bottom: 6px;
      line-height: 1.6;
    }
    .bloco-dados-tecnicos {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-left: 4px solid #16a34a;
      padding: 12px 16px;
      margin: 16px 0;
      border-radius: 4px;
      font-size: 10.5pt;
    }
    .bloco-dados-tecnicos div {
      margin-bottom: 4px;
    }
    .assinaturas-container {
      margin-top: 40px;
      display: flex;
      justify-content: space-between;
      gap: 30px;
      page-break-inside: avoid;
    }
    .assinatura-box {
      flex: 1;
      text-align: center;
      font-size: 10pt;
    }
    .linha-assinatura {
      border-top: 1px solid #111827;
      margin-bottom: 8px;
      width: 100%;
    }
    .quebra-pagina {
      page-break-before: always;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px dashed #d1d5db;
    }
    table.tabela-servicos {
      width: 100%;
      border-collapse: collapse;
      margin-top: 14px;
      margin-bottom: 16px;
      font-size: 9.5pt;
      page-break-inside: auto;
    }
    table.tabela-servicos th {
      background: #f3f4f6;
      border: 1px solid #9ca3af;
      padding: 8px 6px;
      text-align: left;
      font-weight: bold;
      color: #111827;
    }
    table.tabela-servicos td {
      border: 1px solid #d1d5db;
      padding: 7px 6px;
      vertical-align: top;
      line-height: 1.45;
    }
    table.tabela-servicos tr:nth-child(even) {
      background: #fbfbfb;
    }
    .action-bar {
      position: fixed;
      top: 16px;
      right: 16px;
      display: flex;
      gap: 10px;
      z-index: 9999;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 18px;
      border-radius: 8px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      transition: all 0.15s ease-in-out;
    }
    .btn-print {
      background-color: #16a34a;
      color: #ffffff;
    }
    .btn-print:hover {
      background-color: #15803d;
    }
    .btn-close {
      background-color: #ffffff;
      color: #374151;
      border: 1px solid #d1d5db;
    }
    .btn-close:hover {
      background-color: #f9fafb;
    }
    @media print {
      body {
        background: transparent !important;
        padding: 0 !important;
      }
      .page-a4 {
        width: 100% !important;
        min-height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
      }
      .quebra-pagina {
        border-top: none !important;
        margin-top: 0 !important;
        padding-top: 0 !important;
      }
      .action-bar {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="action-bar">
    <button class="btn btn-close" onclick="window.close()">Fechar</button>
    <button class="btn btn-print" onclick="window.print()">Imprimir / Salvar como PDF</button>
  </div>

  <div class="page-a4">
    <!-- Header visual -->
    <div class="header-institucional">
      <div>
        <div class="logo-marca">DELFOS ENGENHARIA</div>
        <div class="sub-marca">Operação, Manutenção & Eficiência Energética Solar</div>
      </div>
      <div style="text-align: right; font-size: 9pt; color: #4b5563;">
        <div>CNPJ: 21.379.952/0001-38</div>
        <div>Erechim/RS</div>
      </div>
    </div>

    <!-- Título do Documento -->
    <div class="titulo-principal">
      CONTRATO DE PRESTAÇÃO DE SERVIÇOS
    </div>
    <div class="subtitulo-doc">
      Acompanhamento, Análise de Performance e Manutenção de Gerador Fotovoltaico
    </div>

    <!-- Preâmbulo -->
    <p>
      Pelo presente instrumento particular, de um lado, <strong>DELFOS ENGENHARIA LTDA</strong>, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº <strong>21.379.952/0001-38</strong>, com sede na Rua Espírito Santo, nº 275, Centro, Erechim/RS, CEP 99709-296, neste ato representada por seu sócio administrador e responsável técnico <strong>João Victor Bagetti Fuchs</strong>, engenheiro eletricista, portador do CPF nº <strong>811.562.780-15</strong>, doravante denominada <strong>CONTRATADA</strong>; e, de outro lado, <strong>${dados.nomeRazaoSocial}</strong>, portador do CPF/CNPJ nº <strong>${dados.cpfCnpj}</strong>, domiciliado no endereço <strong>${dados.enderecoInstalacao}</strong>, <strong>${dados.municipio}</strong> com contato no telefone <strong>${dados.telefone || 'não informado'}</strong> e e-mail <strong>${dados.email || 'não informado'}</strong>, doravante denominado <strong>CONTRATANTE</strong>, têm entre si, justo e contratado, o presente Contrato de Prestação de Serviços de Monitoramento.
    </p>

    <!-- Dados Técnicos -->
    <div class="bloco-dados-tecnicos">
      <div style="font-weight: bold; margin-bottom: 8px; text-transform: uppercase; color: #166534;">
        DADOS TÉCNICOS DO SISTEMA FOTOVOLTAICO:
      </div>
      <div><strong>Número total de módulos fotovoltaicos:</strong> ${dados.numeroModulos} painéis</div>
      <div><strong>Fabricante e potência dos inversores:</strong> ${dados.marcaInversores}</div>
      <div><strong>Local de instalação:</strong> ${dados.localInstalacao}</div>
      <div><strong>Endereço da instalação:</strong> ${dados.enderecoInstalacaoDiferente || dados.enderecoInstalacao}</div>
    </div>

    <!-- Plano Contratado -->
    <p style="margin-top: 16px;">
      <strong>PLANO CONTRATADO: ${dados.planoSelecionado}</strong>
    </p>

    <p>
      Fica desde logo definido que o presente contrato é composto e integrado, para todos os fins e efeitos de direito, pelos seguintes documentos:
    </p>
    <ol class="lista-letras" style="list-style-type: lower-alpha;">
      <li>O corpo principal, contendo as Cláusulas 1ª a 13ª;</li>
      <li>O Anexo I — Detalhamento de Serviços e Tabela de Valores;</li>
      <li>O Anexo II — Tabela de Serviços Adicionais.</li>
    </ol>

    <p>
      A <strong>CONTRATANTE</strong> declara ter recebido, lido e concordado integralmente com o teor de todos os documentos acima referidos, que passam a fazer parte inseparável deste instrumento contratual.
    </p>

    <!-- Cláusula 1 -->
    <div class="clausula-titulo">CLÁUSULA 1ª – OBJETO</div>
    <p>
      O objeto do presente contrato é a prestação, pela <strong>CONTRATADA</strong> ao <strong>CONTRATANTE</strong>, de serviços de acompanhamento, análise de performance e manutenção preventiva de gerador fotovoltaico, conforme as especificações técnicas e operacionais descritas no Anexo I, bem como a realização de eventuais serviços adicionais previstos no Anexo II, quando solicitados pelo <strong>CONTRATANTE</strong>.
    </p>

    <!-- Cláusula 2 -->
    <div class="clausula-titulo">CLÁUSULA 2ª – PRAZO E VIGÊNCIA</div>
    <p>
      2.1 O presente contrato terá vigência de 12 (doze) meses, contados a partir da data de sua assinatura.
    </p>
    <p>
      2.2 Ao término do prazo inicial, o contrato será automaticamente renovado por períodos sucessivos de 12 (doze) meses, salvo manifestação em contrário de qualquer das partes, comunicada por escrito com antecedência mínima de 30 (trinta) dias do término da vigência em curso.
    </p>

    <!-- Cláusula 3 -->
    <div class="clausula-titulo">CLÁUSULA 3ª – OBRIGAÇÕES DA CONTRATADA</div>
    <p>
      3.1 A <strong>CONTRATADA</strong> obriga-se a executar os serviços descritos no Anexo I, observando as diretrizes técnicas e os prazos ali estabelecidos.
    </p>
    <p>
      3.2 A <strong>CONTRATADA</strong> se compromete a atuar em dias úteis e horário comercial (segunda a sexta-feira, das 08h00 às 17h30), salvo disposição em contrário expressamente acordada entre as partes.
    </p>
    <p>
      3.3 Para manutenções e inspeções, o prazo máximo de atuação será de até 2 (dois) dias úteis, contados a partir da notificação de anomalia ou solicitação de serviço, desde que não haja necessidade de peças especiais ou condições excepcionais que justifiquem prazo superior, hipótese em que a <strong>CONTRATADA</strong> comunicará o novo prazo ao <strong>CONTRATANTE</strong>.
    </p>

    <!-- Cláusula 4 -->
    <div class="clausula-titulo">CLÁUSULA 4ª – OBRIGAÇÕES DO CONTRATANTE</div>
    <p>4.1 O <strong>CONTRATANTE</strong> obriga-se a:</p>
    <ol class="lista-numeros">
      <li>Permitir o acesso irrestrito da <strong>CONTRATADA</strong> ao local de instalação do sistema fotovoltaico, para fins de monitoramento, inspeção, manutenção e reparo, em dias úteis e horário comercial, mediante agendamento prévio.</li>
      <li>Fornecer à <strong>CONTRATADA</strong> todas as informações técnicas necessárias à execução dos serviços, incluindo manuais, diagramas elétricos, dados de garantia e histórico de manutenções anteriores.</li>
      <li>Manter o ambiente da instalação em condições adequadas de segurança e limpeza.</li>
      <li>Pagar pontualmente os valores devidos na forma da Cláusula 5ª.</li>
      <li>Disponibilizar um ponto de acesso WiFi de alta qualidade de sinal próximo aos inversores, essencial para garantir o monitoramento remoto contínuo do sistema. O nome da rede (SSID) deve conter apenas letras ou números, sem espaços ou caracteres especiais. O <strong>CONTRATANTE</strong> deverá fornecer login e senha de acesso à <strong>CONTRATADA</strong>.</li>
      <li>Comunicar imediatamente à <strong>CONTRATADA</strong> qualquer alteração nas condições de funcionamento do sistema ou ocorrência de eventos que possam afetar seu desempenho.</li>
      <li>Informar as credenciais de acesso aos portais de monitoramento dos inversores.</li>
      <li>Conceder acesso ao portal da concessionária/cooperativa de energia local para a contratada, a fim desta obter as informações para elaboração dos relatórios mensais.</li>
    </ol>

    <!-- Cláusula 5 -->
    <div class="clausula-titulo">CLÁUSULA 5ª – VALOR E CONDIÇÕES DE PAGAMENTO</div>
    <p>
      5.1. Pelos serviços prestados, a <strong>CONTRATANTE</strong> pagará à <strong>CONTRATADA</strong> o valor total de <strong>${formatCurrency(dados.valorTotal)}</strong> (<em>${dados.valorEscritoTotal}</em>), dividido em 12 (doze) parcelas mensais, iguais e sucessivas, no valor unitário de <strong>${formatCurrency(dados.valorMensal)}</strong> (<em>${dados.valorEscritoMensal}</em>) cada, conforme plano contratado.
    </p>
    <p>
      5.2 O pagamento será efetuado até o 10º (décimo) dia de cada mês, mediante boleto bancário ou PIX a ser emitido pela <strong>CONTRATADA</strong>.
    </p>
    <p>
      5.3 Em caso de atraso no pagamento, incidirá multa de 2% (dois por cento) sobre o valor devido, além de juros de mora de 1% (um por cento) ao mês, e atualização monetária pelo índice IGP-M (e, na impossibilidade de sua apuração, pelo IPCA), calculados pro rata die.
    </p>

    <!-- Cláusula 6 -->
    <div class="clausula-titulo">CLÁUSULA 6ª – REAJUSTE ANUAL</div>
    <p>
      6.1 O valor dos serviços será reajustado anualmente, na data de aniversário do contrato, pelo índice IGP-M (ou, na falta deste, pelo IPCA), com base na variação acumulada nos últimos 12 meses.
    </p>
    <p>
      6.2 Caso o sistema seja ampliado (aumento de módulos, inversores ou potência instalada), a <strong>CONTRATADA</strong> poderá solicitar reajuste proporcional do valor dos serviços, mediante apresentação de documentação técnica comprovando a ampliação. O novo valor entrará em vigor no mês subsequente à aprovação do reajuste pelo <strong>CONTRATANTE</strong>.
    </p>

    <!-- Cláusula 7 -->
    <div class="clausula-titulo">CLÁUSULA 7ª – GARANTIA DOS SERVIÇOS</div>
    <p>
      7.1 A <strong>CONTRATADA</strong> garante o trabalho realizado pelo prazo de 6 (seis) meses, contados da data de execução do serviço, excetuando-se defeitos decorrentes de uso inadequado, acidentes, intervenções de terceiros não autorizados ou condições climáticas extremas.
    </p>
    <p>
      7.2 Os materiais empregados nos serviços serão cobertos pela garantia do respectivo fabricante, não assumindo a <strong>CONTRATADA</strong> qualquer responsabilidade adicional além daquelas previstas na garantia original.
    </p>

    <!-- Cláusula 8 -->
    <div class="clausula-titulo">CLÁUSULA 8ª – CONFIDENCIALIDADE E PROTEÇÃO DE DADOS</div>
    <p>
      8.1 As partes se comprometem a manter sigilo absoluto sobre todas as informações técnicas, comerciais e operacionais a que tiverem acesso em virtude deste contrato, incluindo dados de geração, parâmetros de inversores, dados cadastrais e financeiros do <strong>CONTRATANTE</strong>, durante e após a vigência contratual.
    </p>
    <p>
      8.2 As partes se obrigam a cumprir integralmente as disposições da Lei nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais – LGPD), em especial quanto ao tratamento de dados pessoais eventualmente coletados, armazenados ou processados no âmbito da execução dos serviços, responsabilizando-se cada parte por suas respectivas obrigações como controladora ou operadora de dados.
    </p>

    <!-- Cláusula 9 -->
    <div class="clausula-titulo">CLÁUSULA 9ª – DEFINIÇÃO DE ANOMALIA E PROTOCOLO OPERACIONAL DE DIAGNÓSTICA</div>
    <p>
      9.1 Para os fins deste contrato, considera-se anomalia qualquer falha de equipamento detectada automaticamente pelo sistema de monitoramento (inversor desligado, perda de comunicação, queda abrupta de geração, funcionamento fora dos parâmetros previstos, etc.), bem como qualquer notificação feita pelo <strong>CONTRATANTE</strong>.
    </p>
    <p>9.2 O protocolo operacional de diagnóstico integrado seguirá as seguintes etapas:</p>
    <ol class="lista-numeros">
      <li><strong>Detecção:</strong> O sistema de monitoramento detecta a anomalia automaticamente ou mediante comunicação do <strong>CONTRATANTE</strong>.</li>
      <li><strong>Solicitação de Informações:</strong> A <strong>CONTRATADA</strong> solicita ao <strong>CONTRATANTE</strong> o envio de fotos e/ou vídeos do equipamento afetado, bem como informações complementares (histórico de funcionamento, mensagens de erro, comportamento observado) para análise técnica preliminar.</li>
      <li><strong>Triagem Remota:</strong> A <strong>CONTRATADA</strong> realiza análise técnica remota com base nas informações, fotos e vídeos fornecidos, buscando identificar a causa provável da anomalia e tentar resolvê-la remotamente através de orientações técnicas, reconfiguração de parâmetros ou outras soluções que não exijam presença física.</li>
      <li><strong>Diagnóstico In Loco:</strong> Caso a triagem remota não seja suficiente para resolver a anomalia, a <strong>CONTRATADA</strong> agendará visita técnica in loco. O tempo despendido nesta visita será cobrado conforme a Tabela de Serviços Adicionais (Anexo II), sendo faturado por hora ou fração de hora conforme o item correspondente.</li>
      <li><strong>Execução e Faturamento:</strong> Realizado o serviço conforme necessário, a <strong>CONTRATADA</strong> fornecerá relatório de conclusão contendo descrição do serviço realizado, peças utilizadas (se houver), tempo despendido e recomendações. O faturamento seguirá a Tabela de Serviços Adicionais (Anexo II), sendo o valor cobrado conforme o serviço efetivamente prestado.</li>
    </ol>

    <!-- Cláusula 10 -->
    <div class="clausula-titulo">CLÁUSULA 10ª – RESCISÃO CONTRATUAL</div>
    <p>
      10.1 Rescisão por conveniência: Qualquer das partes poderá rescindir o presente contrato, a qualquer tempo, mediante comunicação escrita com aviso prévio de 30 (trinta) dias.
    </p>
    <p>
      10.1.1 Caso a rescisão seja motivada pelo <strong>CONTRATANTE</strong>, este deverá pagar multa equivalente a 50% (cinquenta por cento) dos valores mensais remanescentes até o final do período contratado. Todos os valores em aberto (mensalidades vencidas, serviços adicionais realizados e multa rescisória) deverão ser quitados integralmente no prazo de 10 (dez) dias após a data de rescisão.
    </p>
    <p>
      10.2 Rescisão por inadimplemento: A <strong>CONTRATADA</strong> poderá rescindir o contrato independentemente de aviso prévio, no caso de atraso no pagamento superior a 30 (trinta) dias. Nesta hipótese, o <strong>CONTRATANTE</strong> permanecerá obrigado ao pagamento das mensalidades vencidas e dos serviços adicionais eventualmente prestados.
    </p>

    <!-- Cláusula 11 -->
    <div class="clausula-titulo">CLÁUSULA 11ª – FORÇA MAIOR E SEGURO</div>
    <p>
      11.1 Nenhuma das partes será responsável por perdas ou atrasos no cumprimento de suas obrigações decorrentes de eventos de força maior ou caso fortuito, assim entendidos aqueles imprevisíveis ou, se previsíveis, inevitáveis, tais como guerras, greves, catástrofes naturais, tempestades com granizo, queda de raios, incêndios de grandes proporções, interrupções no fornecimento de energia elétrica pela concessionária, atos de autoridades públicas que impeçam a execução dos serviços, e outros eventos equivalentes, desde que devidamente comprovados.
    </p>
    <p>
      11.2 O <strong>CONTRATANTE</strong> declara-se ciente da necessidade de manter seguro patrimonial adequado que cubra os riscos mencionados, bem como seguro de responsabilidade civil para danos a terceiros eventualmente causados pelo sistema. A <strong>CONTRATADA</strong> recomenda fortemente que o <strong>CONTRATANTE</strong> contrate seguro específico para a instalação fotovoltaica, com cobertura abrangente para eventos climáticos (granizo, tempestades, raios), furto e roubo, de modo a proteger adequadamente seu investimento e garantir a continuidade operacional do sistema em caso de sinistro.
    </p>

    <!-- Cláusula 12 -->
    <div class="clausula-titulo">CLÁUSULA 12ª – RESPONSABILIDADE CIVIL</div>
    <p>
      12.1 A <strong>CONTRATADA</strong> responderá exclusivamente por danos diretos comprovadamente causados ao <strong>CONTRATANTE</strong> em decorrência de negligência grave na execução dos serviços objeto deste contrato, desde que o <strong>CONTRATANTE</strong> tenha cumprido integralmente suas obrigações contratuais.
    </p>
    <p>12.2 Ficam expressamente excluídos da responsabilidade da <strong>CONTRATADA</strong>:</p>
    <ol class="lista-numeros">
      <li>Danos indiretos, lucros cessantes, perda de receita de energia, danos morais ou qualquer outro dano não-material;</li>
      <li>Força maior ou caso fortuito, conforme definido na Cláusula 11ª;</li>
      <li>Negligência, imperícia ou imprudência do <strong>CONTRATANTE</strong> ou de terceiros (incluindo, mas não se limitando a, outras empresas de manutenção, instaladores, concessionárias ou prestadores de serviços);</li>
      <li>Desgaste natural, uso inadequado, adulteração, modificação não autorizada ou falta de manutenção do sistema pelo <strong>CONTRATANTE</strong>;</li>
      <li>Eventos climáticos extremos, condições ambientais fora dos parâmetros normais de operação, ou falhas de equipamentos de fabricação de terceiros;</li>
      <li>Qualquer dano decorrente do não cumprimento das obrigações do <strong>CONTRATANTE</strong> (incluindo, mas não se limitando a, falta de WiFi adequado, falta de acesso ao local, falta de informações técnicas);</li>
      <li>Danos causados por falta de seguro patrimonial ou de responsabilidade civil do <strong>CONTRATANTE</strong>.</li>
    </ol>
    <p>
      12.3 Os serviços prestados são de natureza preventiva e de monitoramento, não sendo a <strong>CONTRATADA</strong> responsável por falhas de equipamentos de terceiros (fabricantes de módulos, inversores, string boxes, etc.), cuja responsabilidade permanece exclusivamente com os respectivos fabricantes e suas garantias.
    </p>

    <!-- Cláusula 13 -->
    <div class="clausula-titulo">CLÁUSULA 13ª – FORO</div>
    <p>
      As partes elegem o foro da Comarca de <strong>Erechim/RS</strong> como o único competente para dirimir quaisquer controvérsias oriundas do presente contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
    </p>

    <p style="margin-top: 24px;">
      E, por estarem justas e contratadas, as partes assinam o presente instrumento em 2 (duas) vias de igual teor e forma, na presença das testemunhas abaixo.
    </p>

    <!-- Assinaturas -->
    <div class="assinaturas-container">
      <div class="assinatura-box">
        <div class="linha-assinatura"></div>
        <strong>${dados.nomeRazaoSocial}</strong><br />
        CPF/CNPJ: ${dados.cpfCnpj}<br />
        CONTRATANTE
      </div>

      <div class="assinatura-box">
        <div class="linha-assinatura"></div>
        <strong>DELFOS ENGENHARIA LTDA</strong><br />
        CNPJ: 21.379.952/0001-38<br />
        CONTRATADA
      </div>
    </div>

    <div style="margin-top: 28px; text-align: left; font-size: 11pt;">
      ${dados.cidadeAssinatura}/RS, ${dados.dataPorExtenso}.
    </div>

    <!-- ANEXO I (RENDERIZA APENAS O PLANO SELECIONADO) -->
    <div class="quebra-pagina">
      <div class="titulo-principal" style="color: #166534; font-size: 12.5pt;">
        ${anexoI.titulo}
      </div>
      <p style="font-weight: bold; margin-top: 12px; margin-bottom: 14px; text-align: center;">
        ${anexoI.subtitulo}
      </p>

      <ol class="lista-numeros">
        ${anexoI.itens
          .map(
            (item) => `
          <li style="margin-bottom: 10px;">
            <strong>${item.titulo}</strong> — ${item.descricao}
          </li>`,
          )
          .join('')}
      </ol>
    </div>

    <!-- ANEXO II (TABELA INTEGRADA DE SERVIÇOS ADICIONAIS) -->
    <div class="quebra-pagina">
      <div class="titulo-principal" style="color: #166534; font-size: 12.5pt;">
        ANEXO II – TABELA INTEGRADA DE SERVIÇOS ADICIONAIS
      </div>
      <p style="margin-top: 10px; font-size: 10.5pt; text-align: justify;">
        Os serviços abaixo serão cobrados adicionalmente ao valor do plano contratado, mediante solicitação expressa do <strong>CONTRATANTE</strong> e aprovação do respectivo orçamento. Os valores unitários serão reajustados anualmente pelo mesmo índice previsto na Cláusula 6ª do contrato principal (IGP-M ou IPCA).
      </p>

      <div style="font-weight: bold; margin-top: 16px; margin-bottom: 6px; font-size: 11pt;">
        1. Tabela de Serviços
      </div>

      <table class="tabela-servicos">
        <thead>
          <tr>
            <th style="width: 5%; text-align: center;">Item</th>
            <th style="width: 25%;">Serviço</th>
            <th style="width: 35%;">Descrição Detalhada</th>
            <th style="width: 14%; text-align: right;">Valor (R$)</th>
            <th style="width: 11%; text-align: center;">Hora Adic.</th>
            <th style="width: 10%;">Observações</th>
          </tr>
        </thead>
        <tbody>
          ${anexoIIItens
            .map(
              (it) => `
            <tr>
              <td style="text-align: center; font-weight: bold;">${it.item}</td>
              <td style="font-weight: bold;">${it.servico}</td>
              <td>${it.descricao}</td>
              <td style="text-align: right; font-weight: bold; color: #166534;">${it.valor}</td>
              <td style="text-align: center;">${it.horaAdicional}</td>
              <td style="font-size: 8.5pt; color: #4b5563;">${it.observacoes || '-'}</td>
            </tr>`,
            )
            .join('')}
        </tbody>
      </table>

      <div style="margin-top: 20px; font-size: 9.5pt; color: #4b5563; text-align: justify;">
        * Hora adicional padrão fixada em R$ 150,00 quando indicada na tabela acima. Deslocamentos e peças não inclusos no escopo preventivo ordinário serão previamente orçados e submetidos à aprovação formal do CONTRATANTE.
      </div>
    </div>
  </div>
</body>
</html>`
}

/**
 * Abre o contrato renderizado em nova aba para impressão / visualização.
 */
export function abrirContratoImpressao(
  dadosInput: Partial<DadosContratoOM>,
  autoPrint = false,
): void {
  const html = gerarHTMLContratoOM(dadosInput)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank')
  if (win && autoPrint) {
    win.addEventListener('load', () => {
      setTimeout(() => {
        try {
          win.print()
        } catch {
          /* intentionally ignored */
        }
      }, 300)
    })
  }
}

/**
 * Remove acentos e caracteres não suportados por WinAnsi / Standard-14 do PDF nativo
 */
function escapePdf(text: string): string {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

/**
 * Quebra texto em linhas ajustadas para não estourar a largura da página PDF
 */
function splitTextIntoLines(text: string, maxCharsPerLine = 84): string[] {
  const words = (text || '').split(/\s+/)
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    if (!currentLine) {
      currentLine = word
    } else if ((currentLine + ' ' + word).length <= maxCharsPerLine) {
      currentLine += ' ' + word
    } else {
      lines.push(currentLine)
      currentLine = word
    }
  }
  if (currentLine) {
    lines.push(currentLine)
  }
  return lines
}

/**
 * Gera PDF binário nativo padrão A4 multi-página compatível com qualquer visualizador.
 */
export function gerarPDFBinarioContrato(dadosInput: Partial<DadosContratoOM>): Uint8Array {
  const dados = normalizarDadosContrato(dadosInput)
  const anexoI = getAnexoIPlanoConteudo(dados.planoSelecionado)
  const anexoIIItens = getAnexoIIServicos(dados.servicosAdicionais)

  const pageWidth = 595
  const pageHeight = 842
  const marginX = 46
  const bottomMargin = 50

  interface PageStream {
    content: string
  }

  const pages: PageStream[] = []
  let currentStream = 'q\n'
  let currentY = pageHeight - 55

  const startNewPage = () => {
    currentStream += 'Q\n'
    pages.push({ content: currentStream })
    currentStream = 'q\n'
    currentY = pageHeight - 55

    // Cabeçalho institucional discreto no topo de páginas seguintes
    currentStream += '0.086 0.639 0.290 rg\n'
    currentStream += `${marginX} ${currentY} 8 8 re f\n`
    currentStream += '0.2 0.2 0.2 rg\nBT\n/F2 8 Tf\n'
    currentStream += `${marginX + 14} ${currentY + 1} Td\n`
    currentStream += `(${escapePdf('DELFOS ENGENHARIA LTDA • CONTRATO O&M')}) Tj\nET\n`
    currentY -= 30
  }

  const ensureSpace = (neededHeight: number) => {
    if (currentY - neededHeight < bottomMargin) {
      startNewPage()
    }
  }

  const writeHeading = (text: string, size = 12, bold = true) => {
    ensureSpace(32)
    currentStream += '0 0 0 rg\nBT\n'
    currentStream += `${bold ? '/F2' : '/F1'} ${size} Tf\n`
    currentStream += `${marginX} ${currentY} Td\n`
    currentStream += `(${escapePdf(text)}) Tj\nET\n`
    currentY -= size + 10
  }

  const writeParagraph = (rotulo: string, texto: string, fontSize = 9.5, maxChars = 84) => {
    const full = rotulo ? `${rotulo} ${texto}` : texto
    const lines = splitTextIntoLines(full, maxChars)
    ensureSpace(lines.length * (fontSize + 4) + 8)

    for (let i = 0; i < lines.length; i++) {
      const isFirst = i === 0 && rotulo.length > 0
      currentStream += '0.1 0.1 0.1 rg\nBT\n'
      currentStream += `${isFirst ? '/F2' : '/F1'} ${fontSize} Tf\n`
      currentStream += `${marginX} ${currentY} Td\n`
      currentStream += `(${escapePdf(lines[i])}) Tj\nET\n`
      currentY -= fontSize + 4.5
    }
    currentY -= 6
  }

  // PÁGINA 1: Top header
  currentStream += '0.086 0.639 0.290 rg\n'
  currentStream += `${marginX} ${currentY} 12 12 re f\n`
  currentStream += '0.1 0.1 0.1 rg\nBT\n/F2 11 Tf\n'
  currentStream += `${marginX + 18} ${currentY + 2} Td\n`
  currentStream += `(${escapePdf('DELFOS ENGENHARIA LTDA — CRM SOLAR')}) Tj\nET\n`
  currentY -= 32

  // Título
  writeHeading('CONTRATO DE PRESTACAO DE SERVICOS', 13, true)
  writeHeading(
    'Acompanhamento, Analise de Performance e Manutencao de Gerador Fotovoltaico',
    10,
    true,
  )

  // Preâmbulo
  writeParagraph(
    'CONTRATADA:',
    'DELFOS ENGENHARIA LTDA, CNPJ 21.379.952/0001-38, Rua Espirito Santo, no 275, Centro, Erechim/RS, CEP 99709-296, rep. por Joao Victor Bagetti Fuchs, engenheiro eletricista, CPF 811.562.780-15.',
  )

  writeParagraph(
    'CONTRATANTE:',
    `${dados.nomeRazaoSocial}, CPF/CNPJ: ${dados.cpfCnpj}, domiciliado na ${dados.enderecoInstalacao}, ${dados.municipio}, tel: ${dados.telefone || '-'}, e-mail: ${dados.email || '-'}.`,
  )

  // Dados Técnicos
  writeHeading('DADOS TECNICOS DO SISTEMA FOTOVOLTAICO:', 10.5, true)
  writeParagraph(
    '',
    `Total de modulos: ${dados.numeroModulos} paineis | Inversores: ${dados.marcaInversores} | Instalacao: ${dados.localInstalacao} | Endereco da instalacao: ${dados.enderecoInstalacaoDiferente || dados.enderecoInstalacao}`,
  )

  writeParagraph(
    'PLANO CONTRATADO:',
    `${dados.planoSelecionado} — Integrado pelo corpo principal (Clausulas 1a a 13a), Anexo I (Servicos) e Anexo II (Servicos Adicionais).`,
  )

  // Cláusulas 1 a 5
  writeHeading('CLAUSULA 1a - OBJETO', 10, true)
  writeParagraph(
    '',
    'Acompanhamento, analise de performance e manutencao preventiva de gerador fotovoltaico conforme Anexo I, e servicos adicionais do Anexo II quando solicitados.',
  )

  writeHeading('CLAUSULA 2a - PRAZO E VIGENCIA', 10, true)
  writeParagraph(
    '',
    'Vigencia de 12 (doze) meses a partir da assinatura, renovavel automaticamente por iguais periodos, salvo aviso previo de 30 dias.',
  )

  writeHeading('CLAUSULA 3a - OBRIGACOES DA CONTRATADA', 10, true)
  writeParagraph(
    '',
    'Executar os servicos do Anexo I em dias uteis das 08h as 17h30. Prazo de atuacao de ate 2 dias uteis contados da notificacao.',
  )

  writeHeading('CLAUSULA 4a - OBRIGACOES DO CONTRATANTE', 10, true)
  writeParagraph(
    '',
    'Garantir acesso irrestrito ao local da instalacao, manter conexao WiFi estavel de alta qualidade proxima aos inversores com SSID sem espacos, e fornecer credenciais de acesso.',
  )

  writeHeading('CLAUSULA 5a - VALOR E CONDICOES DE PAGAMENTO', 10, true)
  writeParagraph(
    '',
    `Valor total de ${formatCurrency(dados.valorTotal)} (${dados.valorEscritoTotal}), dividido em 12 parcelas mensais de ${formatCurrency(dados.valorMensal)} (${dados.valorEscritoMensal}) venciveis ate o 10o dia de cada mes. Multa de 2% e juros de 1% a.m. em caso de mora.`,
  )

  writeHeading('CLAUSULA 6a - REAJUSTE ANUAL', 10, true)
  writeParagraph(
    '',
    'Reajuste no aniversario pelo IGP-M ou IPCA acumulado. Possibilidade de reajuste proporcional em caso de ampliacao do gerador.',
  )

  writeHeading('CLAUSULA 7a - GARANTIA DOS SERVICOS', 10, true)
  writeParagraph(
    '',
    'Garantia de 6 meses da execucao. Equipamentos cobertos pela garantia do respectivo fabricante.',
  )

  writeHeading('CLAUSULA 8a - CONFIDENCIALIDADE E LGPD', 10, true)
  writeParagraph(
    '',
    'Sigilo sobre telemetria e dados cadastrais; cumprimento rigoroso da Lei Geral de Protecao de Dados Pessoais (LGPD).',
  )

  writeHeading('CLAUSULA 9a - DEFINICAO DE ANOMALIA E PROTOCOLO', 10, true)
  writeParagraph(
    '',
    'Protocolo em 5 etapas: Deteccao, Solicitacao de Informacoes, Triagem Remota, Diagnostico In Loco e Execucao/Faturamento conforme Anexo II.',
  )

  writeHeading('CLAUSULA 10a - RESCISAO CONTRATUAL', 10, true)
  writeParagraph(
    '',
    'Aviso previo de 30 dias. Em rescisao por conveniencia do Contratante, multa de 50% das parcelas vincendas. Rescisao por inadimplemento acima de 30 dias de atraso.',
  )

  writeHeading('CLAUSULA 11a e 12a - FORCA MAIOR E RESPONSABILIDADE', 10, true)
  writeParagraph(
    '',
    'Exclusao de perdas por forca maior e eventos climaticos extremos. Recomendacao formal de contratacao de seguro fotovoltaico patrimonial.',
  )

  writeHeading('CLAUSULA 13a - FORO', 10, true)
  writeParagraph(
    '',
    'Fica eleito o foro da Comarca de Erechim/RS para dirimir controversias deste contrato.',
  )

  // Bloco de Assinaturas
  ensureSpace(90)
  currentY -= 15
  currentStream += '0 0 0 RG\n0.8 w\n'
  const ass1X = marginX
  const ass1W = 210
  const ass2X = 330
  const ass2W = 210

  currentStream += `${ass1X} ${currentY} m ${ass1X + ass1W} ${currentY} l S\n`
  currentStream += `${ass2X} ${currentY} m ${ass2X + ass2W} ${currentY} l S\n`

  currentY -= 14
  currentStream += 'BT\n/F2 9.5 Tf\n'
  currentStream += `${ass1X + 10} ${currentY} Td\n`
  currentStream += `(${escapePdf(dados.nomeRazaoSocial)}) Tj\nET\n`

  currentStream += 'BT\n/F2 9.5 Tf\n'
  currentStream += `${ass2X + 10} ${currentY} Td\n`
  currentStream += `(${escapePdf('DELFOS ENGENHARIA LTDA')}) Tj\nET\n`

  currentY -= 12
  currentStream += 'BT\n/F1 8.5 Tf\n'
  currentStream += `${ass1X + 10} ${currentY} Td\n`
  currentStream += `(${escapePdf(`CPF/CNPJ: ${dados.cpfCnpj} - CONTRATANTE`)}) Tj\nET\n`

  currentStream += 'BT\n/F1 8.5 Tf\n'
  currentStream += `${ass2X + 10} ${currentY} Td\n`
  currentStream += `(${escapePdf('CNPJ: 21.379.952/0001-38 - CONTRATADA')}) Tj\nET\n`

  currentY -= 20
  currentStream += 'BT\n/F1 9 Tf\n'
  currentStream += `${marginX} ${currentY} Td\n`
  currentStream += `(${escapePdf(`${dados.cidadeAssinatura}/RS, ${dados.dataPorExtenso}.`)}) Tj\nET\n`

  // ==========================================
  // PÁGINA DO ANEXO I (Apenas plano selecionado)
  // ==========================================
  startNewPage()
  writeHeading(`${anexoI.titulo}`, 12, true)
  writeParagraph('', anexoI.subtitulo, 10)

  anexoI.itens.forEach((it) => {
    writeParagraph(`${it.numero}. ${it.titulo}:`, it.descricao, 9)
  })

  // ==========================================
  // PÁGINA DO ANEXO II (Tabela Serviços Adicionais)
  // ==========================================
  startNewPage()
  writeHeading('ANEXO II - TABELA INTEGRADA DE SERVICOS ADICIONAIS', 12, true)
  writeParagraph(
    '',
    'Servicos cobrados adicionalmente ao valor do plano mediante solicitacao previa e aprovacao formal de orcamento.',
    9.5,
  )

  anexoIIItens.forEach((it) => {
    const obsStr = it.observacoes ? ` (${it.observacoes})` : ''
    writeParagraph(
      `[${it.item}] ${it.servico} — ${it.valor}`,
      `${it.descricao}. Hora adicional: ${it.horaAdicional}${obsStr}`,
      8.5,
    )
  })

  // Fecha o stream da última página
  currentStream += 'Q\n'
  pages.push({ content: currentStream })

  // Montagem do PDF nativo multi-página
  const objects: string[] = []
  const totalPages = pages.length

  // Obj 1: Catalog
  objects.push('1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n')

  // Obj 2: Pages
  const pageRefs: string[] = []
  for (let i = 0; i < totalPages; i++) {
    const pageObjNum = 3 + i * 2
    pageRefs.push(`${pageObjNum} 0 R`)
  }
  objects.push(
    `2 0 obj\n<</Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${totalPages}>>\nendobj\n`,
  )

  for (let i = 0; i < totalPages; i++) {
    const pageObjNum = 3 + i * 2
    const contentObjNum = pageObjNum + 1
    const pStream = pages[i].content

    // Page Obj
    objects.push(
      `${pageObjNum} 0 obj\n<</Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${contentObjNum} 0 R /Resources <</Font <</F1 ${3 + totalPages * 2} 0 R /F2 ${4 + totalPages * 2} 0 R>>>>>>\nendobj\n`,
    )
    // Content Stream Obj
    objects.push(
      `${contentObjNum} 0 obj\n<</Length ${pStream.length}>>\nstream\n${pStream}\nendstream\nendobj\n`,
    )
  }

  // Fontes: F1 (Times-Roman) e F2 (Times-Bold)
  const font1ObjNum = 3 + totalPages * 2
  const font2ObjNum = 4 + totalPages * 2
  objects.push(
    `${font1ObjNum} 0 obj\n<</Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding>>\nendobj\n`,
  )
  objects.push(
    `${font2ObjNum} 0 obj\n<</Type /Font /Subtype /Type1 /BaseFont /Times-Bold /Encoding /WinAnsiEncoding>>\nendobj\n`,
  )

  let pdf = '%PDF-1.4\n%âãÏÓ\n'
  const offsets: number[] = [0]

  for (let i = 0; i < objects.length; i++) {
    offsets.push(pdf.length)
    pdf += objects[i]
  }

  const xrefOffset = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'

  for (let i = 1; i <= objects.length; i++) {
    const offStr = String(offsets[i]).padStart(10, '0')
    pdf += `${offStr} 00000 n \n`
  }

  pdf += `trailer\n<</Size ${objects.length + 1} /Root 1 0 R>>\n`
  pdf += `startxref\n${xrefOffset}\n%%EOF\n`

  const encoder = new TextEncoder()
  return encoder.encode(pdf)
}

/**
 * Realiza o download direto do arquivo PDF oficial do Contrato no navegador
 */
export function baixarContratoPDF(dadosInput: Partial<DadosContratoOM>): void {
  const dados = normalizarDadosContrato(dadosInput)
  const bytes = gerarPDFBinarioContrato(dados)
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const safeName = dados.nomeRazaoSocial.replace(/[^a-zA-Z0-9]/g, '_')
  const a = document.createElement('a')
  a.href = url
  a.download = `Contrato_OM_Delfos_${dados.planoSelecionado}_${safeName}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
