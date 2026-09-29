/**
 * Exportador de Planilha da Central de Atendimento (CRM Delfos Solar)
 *
 * Gera arquivo .xlsx com:
 * 1. Base completa de todos os contatos/registros da Central de Atendimento.
 * 2. Aba "Repetidos" (duplicados por telefone/WhatsApp ou nome+telefone).
 * 3. Aba "Erros de digitação" (telefones malformados, fora do padrão DDD + 8/9 dígitos).
 * 4. Aba "Dados de teste" (nomes ou telefones de teste óbvios).
 * 5. Aba "Sem telefone" (contatos sem telefone/WhatsApp preenchido).
 *
 * Regra do CRM Delfos Solar: O WhatsApp é o número autoritativo do cliente.
 * Toda a geração ocorre 100% no cliente (browser).
 */

import type { Cliente, ContatoAdicional, OutroContato, WhatsAppConversa } from '@/types/crm'
import { cleanPhoneDigits, formatWhatsAppPhone } from '@/lib/formatters'
import { buildXlsxBuffer, downloadFileInBrowser, type XlsxSheet } from './xlsxBuilderClient'

export interface ItemCentralAtendimentoExport {
  id: string
  origem: 'cliente' | 'contato_adicional' | 'outro_contato' | 'conversa_whatsapp'
  origemDescricao: string
  nome: string
  telefone: string
  whatsapp: string
  email: string
  cidade: string
  estado: string
  endereco: string
  tipoNegocio: string
  etapaFunil: string
  potenciaKwp: number | string
  valorEstimado: number | string
  atendente: string
  statusConversa: string
  dataCriacao: string
  dataAtualizacao: string
  // Análise de qualidade do registro
  situacao: string
  categoriasProblema: string[]
  detalhesProblema: string
}

export interface AnaliseCentralAtendimentoResult {
  baseCompleta: ItemCentralAtendimentoExport[]
  repetidos: ItemCentralAtendimentoExport[]
  errosDigitacao: ItemCentralAtendimentoExport[]
  dadosTeste: ItemCentralAtendimentoExport[]
  semTelefone: ItemCentralAtendimentoExport[]
}

// DDDs válidos no Brasil (11 a 99)
const DDDS_VALIDOS = new Set([
  '11',
  '12',
  '13',
  '14',
  '15',
  '16',
  '17',
  '18',
  '19', // SP
  '21',
  '22',
  '24', // RJ
  '27',
  '28', // ES
  '31',
  '32',
  '33',
  '34',
  '35',
  '37',
  '38', // MG
  '41',
  '42',
  '43',
  '44',
  '45',
  '46', // PR
  '47',
  '48',
  '49', // SC
  '51',
  '53',
  '54',
  '55', // RS
  '61',
  '62',
  '64', // DF / GO
  '63', // TO
  '65',
  '66', // MT
  '67', // MS
  '68', // AC
  '69', // RO
  '71',
  '73',
  '74',
  '75',
  '77', // BA
  '79', // SE
  '81',
  '87', // PE
  '82', // AL
  '83', // PB
  '84', // RN
  '85',
  '88', // CE
  '86',
  '89', // PI
  '91',
  '93',
  '94', // PA
  '92',
  '97', // AM
  '95', // RR
  '96', // AP
  '98',
  '99', // MA
])

/**
 * Normaliza um número para formato de DDD + número (10 ou 11 dígitos no padrão BR).
 * Remove DDI 55 se presente.
 */
export function normalizarDigitosTelefoneBr(raw?: string | null): string {
  if (!raw) return ''
  let digits = cleanPhoneDigits(raw)
  // Se começar com 55 e tiver 12 ou 13 dígitos, remove o DDI 55
  if (digits.length >= 12 && digits.startsWith('55')) {
    digits = digits.slice(2)
  }
  return digits
}

/**
 * Remove acentuação e caracteres especiais para comparação
 */
export function normalizarNome(nome?: string | null): string {
  if (!nome) return ''
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * Identifica se um registro tem sinais óbvios de dados de teste
 */
export function isRegistroTeste(nome: string, telefone: string, whatsapp: string): boolean {
  const normNome = normalizarNome(nome)
  const palavrasTeste = [
    'teste',
    'test',
    'exemplo',
    'asdf',
    'qwerty',
    'fake',
    'mock',
    'seed',
    'lead teste',
    'cliente teste',
    'usuario teste',
    'nao usar',
    'desconsiderar',
  ]

  for (const p of palavrasTeste) {
    if (
      normNome === p ||
      normNome.startsWith(`${p} `) ||
      normNome.endsWith(` ${p}`) ||
      normNome.includes(` ${p} `)
    ) {
      return true
    }
  }

  // Se o nome contiver apenas números (ex.: "123", "12345")
  if (/^\d+$/.test(normNome) && normNome.length > 0) {
    return true
  }

  // Telefones de teste óbvios (ex.: 00000000, 111111111, 12345678, 999999999)
  const checkFone = (f: string) => {
    const d = normalizarDigitosTelefoneBr(f)
    if (!d) return false
    // Todos os dígitos iguais (ex.: 00000000000, 99999999999, 1111111111)
    if (/^(\d)\1+$/.test(d)) return true
    // Sequências óbvias
    if (d.includes('123456') || d.includes('987654') || d === '1234567890' || d === '12345678901') {
      return true
    }
    // Telefones genéricos de template
    if (d === '54999990000' || d === '54999999999' || d === '54000000000') {
      return true
    }
    return false
  }

  if (checkFone(whatsapp) || checkFone(telefone)) {
    return true
  }

  return false
}

/**
 * Avalia se o telefone/WhatsApp tem erro de digitação/formatação no padrão brasileiro.
 * Regra de ouro da Delfos Solar: O WhatsApp é autoritativo. Telefone divergente do WhatsApp
 * NÃO é erro de digitação (é apenas um número alternativo).
 */
export function avaliarErroDigitacao(
  telefone: string,
  whatsapp: string,
  nome: string,
): { isErro: boolean; motivo: string } {
  // Número autoritativo: WhatsApp tem precedência, senão telefone
  const numAutoritativo = whatsapp || telefone
  const digits = normalizarDigitosTelefoneBr(numAutoritativo)

  if (!digits) {
    // Se não tem número nenhum, cai na categoria "Sem telefone", não necessariamente em "Erro de digitação"
    return { isErro: false, motivo: '' }
  }

  // Padrão brasileiro: celular (11 dígitos, ex.: DDD + 9xxxx-xxxx) ou fixo (10 dígitos, ex.: DDD + [2-5]xxx-xxxx)
  if (digits.length < 10) {
    return {
      isErro: true,
      motivo: `Telefone com dígitos insuficientes (${digits.length} dígitos: "${digits}")`,
    }
  }

  if (digits.length > 11) {
    return {
      isErro: true,
      motivo: `Telefone com excesso de dígitos (${digits.length} dígitos: "${digits}")`,
    }
  }

  // Validar DDD
  const ddd = digits.slice(0, 2)
  if (!DDDS_VALIDOS.has(ddd)) {
    return {
      isErro: true,
      motivo: `DDD ${ddd} inválido no padrão nacional`,
    }
  }

  // Se tiver 11 dígitos, o 9º dígito (terceiro caractere) para celulares no Brasil deve ser 9
  if (digits.length === 11 && digits[2] !== '9') {
    return {
      isErro: true,
      motivo: `Celular de 11 dígitos com 3º dígito "${digits[2]}" (esperado "9")`,
    }
  }

  // Nome claramente malformado (1 ou 2 caracteres, ou símbolos sem sentido)
  const normNome = normalizarNome(nome)
  if (normNome.length > 0 && normNome.length <= 2 && !/^\d+$/.test(normNome)) {
    return {
      isErro: true,
      motivo: `Nome excessivamente curto ou incompleto ("${nome}")`,
    }
  }

  return { isErro: false, motivo: '' }
}

/**
 * Constrói a lista unificada de registros da Central de Atendimento e classifica em categorias
 */
export function analisarBaseCentralAtendimento(params: {
  clientes: Cliente[]
  contatosAdicionais: ContatoAdicional[]
  outrosContatos: OutroContato[]
  conversasWhatsApp: WhatsAppConversa[]
}): AnaliseCentralAtendimentoResult {
  const { clientes, contatosAdicionais, outrosContatos, conversasWhatsApp } = params

  // Mapa de clientes para lookup rápido
  const clientesMap = new Map<string, Cliente>()
  clientes.forEach((c) => {
    if (c?.id) clientesMap.set(c.id, c)
  })

  // Lista consolidada
  const baseCompleta: ItemCentralAtendimentoExport[] = []

  // 1. Clientes da Base Viva
  clientes.forEach((cli) => {
    if (!cli) return
    const telWpp = cli.whatsapp || ''
    const telFixo = cli.telefone || ''

    baseCompleta.push({
      id: cli.id,
      origem: 'cliente',
      origemDescricao: 'Cliente / Lead',
      nome: cli.nome || cli.razao_social || 'Sem nome cadastrado',
      telefone: telFixo,
      whatsapp: telWpp || telFixo, // Regra Delfos: WhatsApp autoritativo
      email: cli.email || '',
      cidade: cli.cidade || '',
      estado: cli.estado || '',
      endereco: [cli.endereco, cli.numero, cli.bairro].filter(Boolean).join(', '),
      tipoNegocio: cli.tipo_negocio || cli.tipo_venda || cli.produto || 'Energia Solar',
      etapaFunil: cli.status || 'Novo Lead',
      potenciaKwp: cli.potencia_kwp || '',
      valorEstimado: cli.valor_estimado || cli.valor_final || '',
      atendente: cli.responsavel_nome || '',
      statusConversa: '',
      dataCriacao: cli.created ? cli.created.slice(0, 10) : '',
      dataAtualizacao: cli.updated ? cli.updated.slice(0, 10) : '',
      situacao: 'OK',
      categoriasProblema: [],
      detalhesProblema: '',
    })
  })

  // 2. Contatos Adicionais (vinculados a clientes)
  contatosAdicionais.forEach((ca) => {
    if (!ca) return
    const cliPai = ca.cliente ? clientesMap.get(ca.cliente) : undefined
    const tel = ca.telefone || ''
    const wpp = ca.is_whatsapp ? ca.telefone || '' : ''

    baseCompleta.push({
      id: ca.id,
      origem: 'contato_adicional',
      origemDescricao: cliPai ? `Contato Adicional (${cliPai.nome})` : 'Contato Adicional',
      nome: ca.nome || 'Contato Adicional sem nome',
      telefone: tel,
      whatsapp: wpp || tel,
      email: ca.email || '',
      cidade: cliPai?.cidade || '',
      estado: cliPai?.estado || '',
      endereco: cliPai?.endereco || '',
      tipoNegocio: cliPai?.tipo_negocio || cliPai?.tipo_venda || 'Energia Solar',
      etapaFunil: cliPai?.status || 'Contato Adicional',
      potenciaKwp: cliPai?.potencia_kwp || '',
      valorEstimado: '',
      atendente: '',
      statusConversa: '',
      dataCriacao: ca.created ? ca.created.slice(0, 10) : '',
      dataAtualizacao: ca.updated ? ca.updated.slice(0, 10) : '',
      situacao: 'OK',
      categoriasProblema: [],
      detalhesProblema: '',
    })
  })

  // 3. Outros Contatos (fornecedores, instaladores, parceiros registrados na Central)
  outrosContatos.forEach((oc) => {
    if (!oc) return
    const tel = oc.telefone || ''
    baseCompleta.push({
      id: oc.id,
      origem: 'outro_contato',
      origemDescricao: `Outro Contato (${oc.tipo_contato || 'Geral'})`,
      nome: oc.nome || 'Outro Contato sem nome',
      telefone: tel,
      whatsapp: tel,
      email: '',
      cidade: '',
      estado: '',
      endereco: '',
      tipoNegocio: oc.tipo_contato || 'Parceiro/Fornecedor',
      etapaFunil: oc.tipo_contato || 'Outro',
      potenciaKwp: '',
      valorEstimado: '',
      atendente: '',
      statusConversa: '',
      dataCriacao: oc.created ? oc.created.slice(0, 10) : '',
      dataAtualizacao: oc.updated ? oc.updated.slice(0, 10) : '',
      situacao: 'OK',
      categoriasProblema: [],
      detalhesProblema: oc.observacao || '',
    })
  })

  // 4. Conversas de WhatsApp avulsas / ativas (que não foram vinculadas a cliente)
  conversasWhatsApp.forEach((cw) => {
    if (!cw) return
    // Se a conversa já está vinculada a um cliente existente, ela já foi representada pelo cliente
    if (cw.cliente_id && clientesMap.has(cw.cliente_id)) {
      // Anota o status da conversa no cliente vinculado se aplicável
      const cliItem = baseCompleta.find(
        (item) => item.origem === 'cliente' && item.id === cw.cliente_id,
      )
      if (cliItem) {
        cliItem.statusConversa = cw.status || 'em_atendimento'
        if (cw.atendente && !cliItem.atendente) cliItem.atendente = cw.atendente
      }
      return
    }

    // Conversa não vinculada (lead novo de WhatsApp ou número avulso)
    const numero = cw.numero || ''
    baseCompleta.push({
      id: cw.id,
      origem: 'conversa_whatsapp',
      origemDescricao: 'WhatsApp (Fila de Novos / Não vinculado)',
      nome: `WhatsApp ${formatWhatsAppPhone(numero)}`,
      telefone: numero,
      whatsapp: numero,
      email: '',
      cidade: '',
      estado: '',
      endereco: '',
      tipoNegocio: 'Energia Solar',
      etapaFunil: cw.status === 'novo' ? 'Fila de Novos' : cw.status || 'Atendimento',
      potenciaKwp: '',
      valorEstimado: '',
      atendente: cw.atendente || 'Sem atendente',
      statusConversa: cw.status || 'novo',
      dataCriacao: cw.created ? cw.created.slice(0, 10) : '',
      dataAtualizacao: cw.updated ? cw.updated.slice(0, 10) : '',
      situacao: 'OK',
      categoriasProblema: [],
      detalhesProblema: cw.ultima_mensagem_preview || '',
    })
  })

  // -----------------------------------------------------------------
  // Análise e Classificação: Repetidos, Erros de digitação, Testes, Sem fone
  // -----------------------------------------------------------------

  // 1. Detectar duplicados por WhatsApp/Telefone e por Nome+Telefone
  const foneCountMap = new Map<string, number>()
  const nomeFoneCountMap = new Map<string, number>()

  baseCompleta.forEach((item) => {
    const foneDigits = normalizarDigitosTelefoneBr(item.whatsapp || item.telefone)
    if (foneDigits && foneDigits.length >= 8 && !foneDigits.startsWith('00000000')) {
      foneCountMap.set(foneDigits, (foneCountMap.get(foneDigits) || 0) + 1)
    }

    const normNome = normalizarNome(item.nome)
    if (normNome && foneDigits && foneDigits.length >= 8) {
      const key = `${normNome}|${foneDigits}`
      nomeFoneCountMap.set(key, (nomeFoneCountMap.get(key) || 0) + 1)
    }
  })

  const repetidos: ItemCentralAtendimentoExport[] = []
  const errosDigitacao: ItemCentralAtendimentoExport[] = []
  const dadosTeste: ItemCentralAtendimentoExport[] = []
  const semTelefone: ItemCentralAtendimentoExport[] = []

  baseCompleta.forEach((item) => {
    const foneDigits = normalizarDigitosTelefoneBr(item.whatsapp || item.telefone)
    const normNome = normalizarNome(item.nome)
    const categorias: string[] = []
    const detalhes: string[] = []

    // 1. Dados de Teste
    if (isRegistroTeste(item.nome, item.telefone, item.whatsapp)) {
      categorias.push('Dados de teste')
      detalhes.push('Nome ou telefone com padrão característico de teste')
      dadosTeste.push(item)
    }

    // 2. Sem telefone
    if (!foneDigits || foneDigits.length === 0 || foneDigits.startsWith('00000000')) {
      categorias.push('Sem telefone')
      detalhes.push('Nenhum número de telefone ou WhatsApp informado')
      semTelefone.push(item)
    } else {
      // 3. Erros de digitação / formatação (apenas quando tem telefone preenchido)
      const avaliacaoErro = avaliarErroDigitacao(item.telefone, item.whatsapp, item.nome)
      if (avaliacaoErro.isErro) {
        categorias.push('Erro de digitação')
        detalhes.push(avaliacaoErro.motivo)
        errosDigitacao.push(item)
      }

      // 4. Repetidos (duplicados por telefone ou nome + telefone)
      const foneCount = foneCountMap.get(foneDigits) || 0
      const keyNomeFone = `${normNome}|${foneDigits}`
      const nomeFoneCount = nomeFoneCountMap.get(keyNomeFone) || 0

      if (foneCount > 1 || nomeFoneCount > 1) {
        categorias.push('Repetido')
        detalhes.push(`Telefone compartilhado com ${foneCount - 1} outro(s) registro(s)`)
        repetidos.push(item)
      }
    }

    item.categoriasProblema = categorias
    if (categorias.length === 0) {
      item.situacao = 'OK'
      item.detalhesProblema = item.detalhesProblema || 'Cadastro regular'
    } else {
      item.situacao = categorias.join('; ')
      item.detalhesProblema = detalhes.join(' | ')
    }
  })

  return {
    baseCompleta,
    repetidos,
    errosDigitacao,
    dadosTeste,
    semTelefone,
  }
}

/**
 * Converte a lista de itens para matriz de linhas e larguras de colunas da aba Excel
 */
function converterItensParaAbaXlsx(
  nomeAba: string,
  itens: ItemCentralAtendimentoExport[],
): XlsxSheet {
  const cabecalhos = [
    'Situação',
    'Nome Completo / Contato',
    'WhatsApp (Autoritativo)',
    'Telefone Secundário',
    'E-mail',
    'Cidade',
    'UF',
    'Endereço',
    'Origem no CRM',
    'Tipo de Negócio',
    'Etapa do Funil / Status',
    'Potência (kWp)',
    'Valor Estimado (R$)',
    'Atendente Responsável',
    'Data de Cadastro',
    'Diagnóstico / Detalhes',
  ]

  const colWidths = [
    22, // Situação
    34, // Nome
    22, // WhatsApp
    20, // Telefone
    28, // E-mail
    20, // Cidade
    8, // UF
    32, // Endereço
    26, // Origem
    20, // Tipo negócio
    22, // Etapa
    15, // Potência
    18, // Valor
    24, // Atendente
    16, // Data cadastro
    40, // Diagnóstico
  ]

  const rows: (string | number | boolean | null | undefined)[][] = [cabecalhos]

  itens.forEach((item) => {
    rows.push([
      item.situacao,
      item.nome,
      item.whatsapp ? formatWhatsAppPhone(item.whatsapp) : '',
      item.telefone ? formatWhatsAppPhone(item.telefone) : '',
      item.email,
      item.cidade,
      item.estado,
      item.endereco,
      item.origemDescricao,
      item.tipoNegocio,
      item.etapaFunil,
      typeof item.potenciaKwp === 'number' ? item.potenciaKwp : item.potenciaKwp || '',
      typeof item.valorEstimado === 'number' ? item.valorEstimado : item.valorEstimado || '',
      item.atendente,
      item.dataCriacao,
      item.detalhesProblema,
    ])
  })

  return {
    name: nomeAba,
    rows,
    colWidths,
  }
}

/**
 * Gera a planilha .xlsx completa com abas separadas e dispara o download no navegador
 */
export function exportarPlanilhaCentralAtendimento(params: {
  clientes: Cliente[]
  contatosAdicionais: ContatoAdicional[]
  outrosContatos: OutroContato[]
  conversasWhatsApp: WhatsAppConversa[]
}): {
  totalExportados: number
  totalRepetidos: number
  totalErrosDigitacao: number
  totalDadosTeste: number
  totalSemTelefone: number
  nomeArquivo: string
} {
  const analise = analisarBaseCentralAtendimento(params)

  const sheets: XlsxSheet[] = [
    converterItensParaAbaXlsx('Base Completa', analise.baseCompleta),
    converterItensParaAbaXlsx('Repetidos', analise.repetidos),
    converterItensParaAbaXlsx('Erros de digitação', analise.errosDigitacao),
    converterItensParaAbaXlsx('Dados de teste', analise.dadosTeste),
    converterItensParaAbaXlsx('Sem telefone', analise.semTelefone),
  ]

  const buffer = buildXlsxBuffer(sheets)
  const dataHoje = new Date().toISOString().slice(0, 10)
  const nomeArquivo = `central-atendimento-${dataHoje}.xlsx`

  downloadFileInBrowser(buffer, nomeArquivo)

  return {
    totalExportados: analise.baseCompleta.length,
    totalRepetidos: analise.repetidos.length,
    totalErrosDigitacao: analise.errosDigitacao.length,
    totalDadosTeste: analise.dadosTeste.length,
    totalSemTelefone: analise.semTelefone.length,
    nomeArquivo,
  }
}
