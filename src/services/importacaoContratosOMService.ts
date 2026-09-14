/**
 * Serviço de importação, detecção, parsing e reconciliação de Contratos O&M.
 * Compatível com exportações da Conta Azul Pro (.xlsx, .csv), planilhas genéricas,
 * documentos PDF e Word (.docx), bem como entrada manual via área de transferência.
 */

import { Cliente, ContratoOM, OMPlanoTipo, OMStatusPlano } from '@/types/crm'
import {
  limparNomeClienteParaMatching,
  casarClienteComBase,
  normalizarStringParaComparacao,
} from './importacaoAcessosService'

export interface ColunasDetectadasContratos {
  cliente: string
  numeroContrato?: string
  dataInicio?: string
  proximoVencimento?: string
  dataTermino?: string
  valorMensal?: string
  situacao?: string
  plano?: string
}

export type DecisaoContratoLinha = 'vincular' | 'criar_cliente' | 'ignorar'

export interface ItemImportacaoContrato {
  idTemp: string
  // Dados brutos extraídos do documento / planilha
  nomeClienteOriginal: string
  numeroContrato: string
  dataInicio: string // YYYY-MM-DD
  proximoVencimento: string // YYYY-MM-DD
  dataTermino: string // YYYY-MM-DD
  valorMensal: number
  situacaoOriginal: string // Ativo, Encerrado, Vencido, etc.
  planoSugerido: OMPlanoTipo

  // Reconciliação / Matching com o CRM
  clienteIdentificadoId: string | null
  clienteIdentificadoNome: string | null
  confiancaMatch: 'alta' | 'media' | 'baixa' | 'nenhuma'
  motivoMatch: string
  scoreMatch: number

  // Decisão e Ações do Usuário
  decisao: DecisaoContratoLinha
  clienteSelecionadoId: string | null
  clienteSelecionadoNome: string | null
  dadosNovoCliente?: {
    nome: string
    telefone?: string
    email?: string
    cidade?: string
  }

  // Deduplicação com contratos já existentes
  contratoExistenteId?: string
  jaCadastradoNoCRM?: boolean

  // Campos editáveis
  editadoManualmente?: boolean
  erroValidacao?: string
}

export interface RelatorioImportacaoContratos {
  totalLidas: number
  vinculadosExistentes: number
  clientesNovosCriados: number
  ignorados: number
  duplicadosDeduplicados: number
  falhas: { linha: number; identificador: string; erro: string }[]
}

/**
 * Normaliza e formata datas para o formato ISO YYYY-MM-DD
 */
export function normalizarDataContrato(valor: unknown): string {
  if (!valor) return ''
  const str = String(valor).trim()
  if (!str) return ''

  // Formato DD/MM/YYYY ou DD/MM/YY
  const matchPt = str.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/)
  if (matchPt) {
    const dia = matchPt[1].padStart(2, '0')
    const mes = matchPt[2].padStart(2, '0')
    let ano = matchPt[3]
    if (ano.length === 2) {
      ano = parseInt(ano, 10) > 50 ? `19${ano}` : `20${ano}`
    }
    return `${ano}-${mes}-${dia}`
  }

  // Formato ISO YYYY-MM-DD
  const matchIso = str.match(/^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})/)
  if (matchIso) {
    const ano = matchIso[1]
    const mes = matchIso[2].padStart(2, '0')
    const dia = matchIso[3].padStart(2, '0')
    return `${ano}-${mes}-${dia}`
  }

  // Tentativa com Date nativo
  const d = new Date(str)
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0]
  }

  return ''
}

/**
 * Converte strings monetárias brasileiras (ex: "R$ 450,00", "1.250,50", "300") em número
 */
export function extrairValorMoeda(valor: unknown): number {
  if (typeof valor === 'number') return isNaN(valor) ? 0 : valor
  if (!valor) return 0
  const str = String(valor)
    .replace(/[^\d,.-]/g, '')
    .trim()
  if (!str) return 0

  // Se tem vírgula como separador decimal
  if (str.includes(',')) {
    const limpo = str.replace(/\./g, '').replace(',', '.')
    const num = parseFloat(limpo)
    return isNaN(num) ? 0 : num
  }

  const num = parseFloat(str)
  return isNaN(num) ? 0 : num
}

/**
 * Mapeia situação do Conta Azul Pro para o status do CRM
 */
export function normalizarSituacaoContrato(
  situacaoTexto: string,
  dataTermino?: string,
): OMStatusPlano {
  const norm = normalizarStringParaComparacao(situacaoTexto)

  if (norm.includes('cancel') || norm.includes('inativo') || norm.includes('suspenso')) {
    return 'Cancelado'
  }
  if (norm.includes('encerrad') || norm.includes('finalizad')) {
    return 'Encerrado'
  }
  if (norm.includes('vencid') || norm.includes('atras')) {
    return 'Vencido'
  }

  // Se tem data de término, checar se já expirou
  if (dataTermino) {
    const dTermino = new Date(dataTermino)
    if (!isNaN(dTermino.getTime())) {
      const hoje = new Date()
      const diffDias = Math.ceil((dTermino.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDias < 0) return 'Vencido'
      if (diffDias <= 30) return 'Vencendo em 30 dias'
    }
  }

  return 'Ativo'
}

/**
 * Dedução do plano O&M baseado em valor ou descrição
 */
export function deduzirPlanoOM(valorMensal: number, textoPlano?: string): OMPlanoTipo {
  if (textoPlano) {
    const norm = normalizarStringParaComparacao(textoPlano)
    if (norm.includes('complet')) return 'Completo'
    if (norm.includes('prevenc') || norm.includes('manutencao')) return 'Prevenção'
    if (norm.includes('essenc') || norm.includes('basico') || norm.includes('monitor'))
      return 'Essencial'
  }

  if (valorMensal >= 1000) return 'Completo'
  if (valorMensal >= 350) return 'Prevenção'
  return 'Essencial'
}

/**
 * Detecta automaticamente colunas típicas da exportação da Conta Azul Pro
 * Exemplos de colunas da Conta Azul:
 * - "Cliente", "Razão Social", "Nome do Cliente", "Pessoa"
 * - "Número do Contrato", "Nº Contrato", "Contrato", "Código"
 * - "Data de Início", "Início", "Data Inicial", "Vigência Inicial"
 * - "Próximo Vencimento", "Vencimento", "Próx. Vencimento"
 * - "Data de Término", "Término", "Fim", "Data Final", "Vigência Final"
 * - "Valor Mensal", "Valor", "Valor Recorrente", "Preço Mensal", "Mensalidade"
 * - "Situação", "Status", "Status do Contrato", "Estado"
 */
export function detectarCabecalhoContratos(headers: string[]): ColunasDetectadasContratos | null {
  if (!headers || headers.length === 0) return null

  let colCliente = ''
  let colNumero = ''
  let colInicio = ''
  let colVencimento = ''
  let colTermino = ''
  let colValor = ''
  let colSituacao = ''
  let colPlano = ''

  for (const h of headers) {
    const norm = normalizarStringParaComparacao(h)

    // Cliente
    if (!colCliente) {
      if (
        norm === 'cliente' ||
        norm === 'nome do cliente' ||
        norm === 'razao social' ||
        norm === 'nome' ||
        norm === 'cliente razao social' ||
        norm.includes('cliente')
      ) {
        colCliente = h
        continue
      }
    }

    // Número do Contrato
    if (!colNumero) {
      if (
        norm.includes('numero') ||
        norm.includes('contrato') ||
        norm.includes('codigo') ||
        norm === 'n contrato' ||
        norm === 'num contrato'
      ) {
        colNumero = h
        continue
      }
    }

    // Data de Início
    if (!colInicio) {
      if (
        norm.includes('inicio') ||
        norm.includes('inicial') ||
        norm.includes('data de inicio') ||
        norm === 'vigencia inicial'
      ) {
        colInicio = h
        continue
      }
    }

    // Próximo Vencimento
    if (!colVencimento) {
      if (
        norm.includes('proximo vencimento') ||
        norm.includes('prox vencimento') ||
        norm === 'vencimento' ||
        norm.includes('venc')
      ) {
        colVencimento = h
        continue
      }
    }

    // Data de Término
    if (!colTermino) {
      if (
        norm.includes('termino') ||
        norm.includes('fim') ||
        norm.includes('final') ||
        norm === 'data de termino' ||
        norm === 'vigencia final'
      ) {
        colTermino = h
        continue
      }
    }

    // Valor Mensal
    if (!colValor) {
      if (
        norm.includes('valor mensal') ||
        norm.includes('mensalidade') ||
        norm.includes('valor recorrente') ||
        norm.includes('recorrente') ||
        norm === 'valor' ||
        norm === 'preco'
      ) {
        colValor = h
        continue
      }
    }

    // Situação
    if (!colSituacao) {
      if (
        norm === 'situacao' ||
        norm === 'status' ||
        norm.includes('situacao') ||
        norm.includes('status')
      ) {
        colSituacao = h
        continue
      }
    }

    // Plano / Serviço
    if (!colPlano) {
      if (
        norm.includes('plano') ||
        norm.includes('servico') ||
        norm.includes('descricao') ||
        norm.includes('objeto')
      ) {
        colPlano = h
        continue
      }
    }
  }

  // Cliente é indispensável
  if (!colCliente) {
    // Tenta primeiro cabeçalho se nenhum foi achado
    const possivel = headers.find((h) => normalizarStringParaComparacao(h).length > 2)
    if (possivel) {
      colCliente = possivel
    } else {
      return null
    }
  }

  return {
    cliente: colCliente,
    numeroContrato: colNumero || undefined,
    dataInicio: colInicio || undefined,
    proximoVencimento: colVencimento || undefined,
    dataTermino: colTermino || undefined,
    valorMensal: colValor || undefined,
    situacao: colSituacao || undefined,
    plano: colPlano || undefined,
  }
}

/**
 * Converte linhas de matriz/tabela em itens de revisão e vinculação de Contratos O&M
 */
export function construirItensImportacaoContratos(
  rows: Record<string, string>[],
  cols: ColunasDetectadasContratos,
  clientesBase: Cliente[],
  contratosOMBase: ContratoOM[],
): ItemImportacaoContrato[] {
  const itens: ItemImportacaoContrato[] = []

  // Mapa para deduplicação rápida por número de contrato
  const contratosPorNumeroMap = new Map<string, ContratoOM>()
  for (const c of contratosOMBase) {
    if (c.numero_contrato && c.numero_contrato.trim()) {
      contratosPorNumeroMap.set(c.numero_contrato.trim().toLowerCase(), c)
    }
  }

  let indexSeq = 1

  for (const r of rows) {
    const rawNomeCliente = (r[cols.cliente] || '').trim()
    if (!rawNomeCliente) continue

    const rawNumero = cols.numeroContrato ? (r[cols.numeroContrato] || '').trim() : ''
    const rawInicio = cols.dataInicio ? (r[cols.dataInicio] || '').trim() : ''
    const rawVencimento = cols.proximoVencimento ? (r[cols.proximoVencimento] || '').trim() : ''
    const rawTermino = cols.dataTermino ? (r[cols.dataTermino] || '').trim() : ''
    const rawValor = cols.valorMensal ? (r[cols.valorMensal] || '').trim() : ''
    const rawSituacao = cols.situacao ? (r[cols.situacao] || '').trim() : ''
    const rawPlano = cols.plano ? (r[cols.plano] || '').trim() : ''

    const dataInicioNorm =
      normalizarDataContrato(rawInicio) || new Date().toISOString().split('T')[0]
    let dataTerminoNorm = normalizarDataContrato(rawTermino)
    if (!dataTerminoNorm && dataInicioNorm) {
      // Padrão de 1 ano
      const d = new Date(dataInicioNorm)
      if (!isNaN(d.getTime())) {
        d.setFullYear(d.getFullYear() + 1)
        dataTerminoNorm = d.toISOString().split('T')[0]
      }
    }
    const proxVencimentoNorm = normalizarDataContrato(rawVencimento) || ''
    const valorMensalNum = extrairValorMoeda(rawValor) || 250
    const situacaoFinal = rawSituacao || 'Ativo'
    const planoDeduzido = deduzirPlanoOM(valorMensalNum, rawPlano)

    // 1. Fuzzy matching do cliente com a base do CRM
    const match = casarClienteComBase(rawNomeCliente, clientesBase)

    // 2. Checar se já existe contrato com esse mesmo número
    let contratoExistente: ContratoOM | undefined
    if (rawNumero) {
      contratoExistente = contratosPorNumeroMap.get(rawNumero.toLowerCase())
    }

    const confianca = match.confianca
    const clienteId = match.clienteId
    const clienteNome = match.clienteNome

    // Decisão inicial:
    // - Se achou cliente (alta/média): 'vincular'
    // - Se não achou cliente: 'criar_cliente'
    let decisao: DecisaoContratoLinha = 'criar_cliente'
    if (clienteId && (confianca === 'alta' || confianca === 'media')) {
      decisao = 'vincular'
    }

    itens.push({
      idTemp: `contrato_imp_${indexSeq++}_${Date.now()}`,
      nomeClienteOriginal: rawNomeCliente,
      numeroContrato: rawNumero || `CT-${String(indexSeq).padStart(4, '0')}`,
      dataInicio: dataInicioNorm,
      proximoVencimento: proxVencimentoNorm,
      dataTermino: dataTerminoNorm,
      valorMensal: valorMensalNum,
      situacaoOriginal: situacaoFinal,
      planoSugerido: planoDeduzido,

      clienteIdentificadoId: clienteId,
      clienteIdentificadoNome: clienteNome,
      confiancaMatch: confianca,
      motivoMatch: match.motivoMatch,
      scoreMatch: match.scoreSimilaridade,

      decisao,
      clienteSelecionadoId: clienteId,
      clienteSelecionadoNome: clienteNome,
      dadosNovoCliente: {
        nome: rawNomeCliente,
      },

      contratoExistenteId: contratoExistente?.id,
      jaCadastradoNoCRM: Boolean(contratoExistente),
    })
  }

  return itens
}

/**
 * Heurística de leitura de texto para PDFs, DOCX ou texto colado manualmente.
 * Extrai linhas ou blocos que contenham contratos O&M da Conta Azul ou modelos similares.
 */
export function extrairContratosDeTextoLivre(
  texto: string,
  clientesBase: Cliente[],
  contratosOMBase: ContratoOM[],
): ItemImportacaoContrato[] {
  if (!texto || texto.trim().length === 0) return []

  const linhas = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  // Estratégia 1: Detectar se é uma tabela colada com separador TAB ou ; ou ,
  const primeiraComSeparador = linhas.find(
    (l) => l.includes('\t') || (l.match(/;/g) || []).length >= 2,
  )

  if (primeiraComSeparador) {
    const delimiter = primeiraComSeparador.includes('\t') ? '\t' : ';'
    const matriz = linhas.map((l) => l.split(delimiter).map((c) => c.trim()))
    if (matriz.length >= 2) {
      const headers = matriz[0]
      const cols = detectarCabecalhoContratos(headers)
      if (cols) {
        const rowsObj: Record<string, string>[] = []
        for (let i = 1; i < matriz.length; i++) {
          const rowVals = matriz[i]
          const obj: Record<string, string> = {}
          headers.forEach((h, idx) => {
            obj[h] = rowVals[idx] || ''
          })
          rowsObj.push(obj)
        }
        return construirItensImportacaoContratos(rowsObj, cols, clientesBase, contratosOMBase)
      }
    }
  }

  // Estratégia 2: Regex e heurísticas linha a linha para textos corridos de PDF/DOCX
  // Padrões procurados:
  // "Contrato 2024-001 - Marcelo Becker - R$ 250,00 - Início 01/05/2024 - Término 01/05/2025"
  // "Cliente: Maria Santos | Contrato: CT-992 | Valor: 450,00 | Situação: Ativo"
  const itens: ItemImportacaoContrato[] = []
  let indexSeq = 1

  // Mapa de deduplicação
  const contratosPorNumeroMap = new Map<string, ContratoOM>()
  for (const c of contratosOMBase) {
    if (c.numero_contrato && c.numero_contrato.trim()) {
      contratosPorNumeroMap.set(c.numero_contrato.trim().toLowerCase(), c)
    }
  }

  for (const linha of linhas) {
    // Linha precisa ter pelo menos um nome de cliente e um valor ou data
    const matchValor = linha.match(
      /R\$\s*([\d.,]+)|(?:valor|mensalidade|preço|preco)[\s:]*([\d.,]+)/i,
    )
    const matchData = linha.match(/(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})/g)
    const matchContratoNum = linha.match(
      /(?:contrato|nº|ct|número|numero)[\s:#-]*([a-zA-Z0-9/.-]+)/i,
    )
    // Se a linha tem indício de dados contratuais
    if (matchValor || (matchData && matchData.length >= 1) || matchContratoNum) {
      // Extrair nome tentando remover as partes numéricas/datas/valores
      let nomePossivel = linha
      if (matchValor) nomePossivel = nomePossivel.replace(matchValor[0], '')
      if (matchContratoNum) nomePossivel = nomePossivel.replace(matchContratoNum[0], '')
      if (matchData) {
        matchData.forEach((d) => {
          nomePossivel = nomePossivel.replace(d, '')
        })
      }
      nomePossivel = nomePossivel
        .replace(/[-|–—:;,]/g, ' ')
        .replace(
          /\b(cliente|inicio|término|termino|vencimento|valor|ativo|contrato|mensal)\b/gi,
          ' ',
        )
        .replace(/\s+/g, ' ')
        .trim()

      if (nomePossivel.length >= 3) {
        const valorNum = matchValor ? extrairValorMoeda(matchValor[1] || matchValor[2]) : 250
        const dataInicioNorm =
          matchData && matchData[0]
            ? normalizarDataContrato(matchData[0])
            : new Date().toISOString().split('T')[0]
        const dataTerminoNorm =
          matchData && matchData[1] ? normalizarDataContrato(matchData[1]) : ''
        const numContrato = matchContratoNum
          ? matchContratoNum[1]
          : `CT-${String(indexSeq).padStart(4, '0')}`

        const match = casarClienteComBase(nomePossivel, clientesBase)
        const contratoExistente = contratosPorNumeroMap.get(numContrato.toLowerCase())

        const confianca = match.confianca
        const clienteId = match.clienteId
        const clienteNome = match.clienteNome

        let decisao: DecisaoContratoLinha = 'criar_cliente'
        if (clienteId && (confianca === 'alta' || confianca === 'media')) {
          decisao = 'vincular'
        }

        itens.push({
          idTemp: `contrato_txt_${indexSeq++}_${Date.now()}`,
          nomeClienteOriginal: nomePossivel,
          numeroContrato: numContrato,
          dataInicio: dataInicioNorm,
          proximoVencimento: '',
          dataTermino: dataTerminoNorm,
          valorMensal: valorNum,
          situacaoOriginal: 'Ativo',
          planoSugerido: deduzirPlanoOM(valorNum),

          clienteIdentificadoId: clienteId,
          clienteIdentificadoNome: clienteNome,
          confiancaMatch: confianca,
          motivoMatch: match.motivoMatch,
          scoreMatch: match.scoreSimilaridade,

          decisao,
          clienteSelecionadoId: clienteId,
          clienteSelecionadoNome: clienteNome,
          dadosNovoCliente: {
            nome: nomePossivel,
          },

          contratoExistenteId: contratoExistente?.id,
          jaCadastradoNoCRM: Boolean(contratoExistente),
        })
      }
    }
  }

  return itens
}

/**
 * 3 Contratos de Exemplo para Demonstração:
 * - 2 clientes identificados no CRM (Marcelo Becker e Maria Santos)
 * - 1 cliente não encontrado ("Indústria Metalúrgica Alto Uruguai"), permitindo demonstrar:
 *   vincular manualmente, criar novo cliente ou ignorar.
 */
export function gerarContratosExemploDemonstracao(
  clientesBase: Cliente[],
  contratosOMBase: ContratoOM[],
): ItemImportacaoContrato[] {
  // Encontrar Marcelo Becker e Maria Santos na base atual do CRM se existirem
  const cliMarcelo = clientesBase.find((c) =>
    normalizarStringParaComparacao(c.nome).includes('marcelo becker'),
  )
  const cliMaria = clientesBase.find((c) =>
    normalizarStringParaComparacao(c.nome).includes('maria santos'),
  )

  const hoje = new Date()
  const hojeIso = hoje.toISOString().split('T')[0]

  const proxVenc = new Date(hoje)
  proxVenc.setDate(proxVenc.getDate() + 15)
  const proxVencIso = proxVenc.toISOString().split('T')[0]

  const dataFim = new Date(hoje)
  dataFim.setFullYear(dataFim.getFullYear() + 1)
  const dataFimIso = dataFim.toISOString().split('T')[0]

  const itens: ItemImportacaoContrato[] = [
    {
      idTemp: 'demo_contrato_1',
      nomeClienteOriginal: 'Marcelo Becker Agropecuaria LTDA',
      numeroContrato: 'CT-2024-0089',
      dataInicio: hojeIso,
      proximoVencimento: proxVencIso,
      dataTermino: dataFimIso,
      valorMensal: 350,
      situacaoOriginal: 'Ativo',
      planoSugerido: 'Prevenção',

      clienteIdentificadoId: cliMarcelo ? cliMarcelo.id : '9ozpqdm9sgwmdzr',
      clienteIdentificadoNome: cliMarcelo ? cliMarcelo.nome : 'Marcelo Becker',
      confiancaMatch: 'alta',
      motivoMatch: 'Nome idêntico com sufixo jurídico normalizado',
      scoreMatch: 0.96,

      decisao: 'vincular',
      clienteSelecionadoId: cliMarcelo ? cliMarcelo.id : '9ozpqdm9sgwmdzr',
      clienteSelecionadoNome: cliMarcelo ? cliMarcelo.nome : 'Marcelo Becker',
      jaCadastradoNoCRM: false,
    },
    {
      idTemp: 'demo_contrato_2',
      nomeClienteOriginal: 'Mercado Santos & Filhos (Maria Santos)',
      numeroContrato: 'CT-2024-0104',
      dataInicio: hojeIso,
      proximoVencimento: proxVencIso,
      dataTermino: dataFimIso,
      valorMensal: 450,
      situacaoOriginal: 'Ativo',
      planoSugerido: 'Prevenção',

      clienteIdentificadoId: cliMaria ? cliMaria.id : 'pp4572amhvqgm81',
      clienteIdentificadoNome: cliMaria ? cliMaria.nome : 'Maria Santos',
      confiancaMatch: 'alta',
      motivoMatch: 'Nome fantasia e razão social correspondentes no CRM',
      scoreMatch: 0.94,

      decisao: 'vincular',
      clienteSelecionadoId: cliMaria ? cliMaria.id : 'pp4572amhvqgm81',
      clienteSelecionadoNome: cliMaria ? cliMaria.nome : 'Maria Santos',
      jaCadastradoNoCRM: false,
    },
    {
      idTemp: 'demo_contrato_3',
      nomeClienteOriginal: 'Indústria Metalúrgica Alto Uruguai S/A',
      numeroContrato: 'CT-2024-0230',
      dataInicio: hojeIso,
      proximoVencimento: proxVencIso,
      dataTermino: dataFimIso,
      valorMensal: 1250,
      situacaoOriginal: 'Ativo',
      planoSugerido: 'Completo',

      clienteIdentificadoId: null,
      clienteIdentificadoNome: null,
      confiancaMatch: 'nenhuma',
      motivoMatch: 'Nenhum cliente similar encontrado no cadastro do CRM',
      scoreMatch: 0,

      decisao: 'criar_cliente',
      clienteSelecionadoId: null,
      clienteSelecionadoNome: null,
      dadosNovoCliente: {
        nome: 'Indústria Metalúrgica Alto Uruguai S/A',
        cidade: 'Erechim/RS',
      },
      jaCadastradoNoCRM: false,
    },
  ]

  return itens
}
