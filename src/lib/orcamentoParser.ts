/**
 * Parser heurístico para análise e extração de dados de orçamentos fotovoltaicos em PDF / texto
 * Padrões comuns no mercado solar brasileiro (módulos, inversores, acessórios, valores R$, etc.)
 */
import { FornecedorOrcamentoExtraido, FornecedorItemOrcamento, Fornecedor } from '@/types/crm'
import { extractTextFromPdf } from './documentExtractor'

/**
 * Validação de dígitos verificadores de CNPJ e formatação
 */
export function validarCNPJ(cnpjRaw: string): boolean {
  const cnpj = cnpjRaw.replace(/\D/g, '')
  if (cnpj.length !== 14) return false

  // Elimina CNPJs conhecidos inválidos com todos os números iguais
  if (/^(\d)\1{13}$/.test(cnpj)) return false

  // Validação do primeiro dígito verificador
  let tamanho = cnpj.length - 2
  let numeros = cnpj.substring(0, tamanho)
  const digitos = cnpj.substring(tamanho)
  let soma = 0
  let pos = tamanho - 7

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i), 10) * pos--
    if (pos < 2) pos = 9
  }

  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11)
  if (resultado !== parseInt(digitos.charAt(0), 10)) return false

  // Validação do segundo dígito verificador
  tamanho = tamanho + 1
  numeros = cnpj.substring(0, tamanho)
  soma = 0
  pos = tamanho - 7

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i), 10) * pos--
    if (pos < 2) pos = 9
  }

  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11)
  if (resultado !== parseInt(digitos.charAt(1), 10)) return false

  return true
}

/**
 * Aplica máscara de CNPJ xx.xxx.xxx/xxxx-xx
 */
export function formatarCNPJ(cnpjRaw: string): string {
  const digits = cnpjRaw.replace(/\D/g, '').slice(0, 14)
  if (!digits) return ''
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

/**
 * Extrai valor monetário em reais (R$ xx.xxx,xx ou xx.xxx,xx)
 */
export function extrairValorEmReais(texto: string): number {
  if (!texto) return 0
  // Padrão: 48.650,00 ou 48650,00 ou 48,650.00
  const match = texto.match(
    /R?\$?\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})|[0-9]+(?:,[0-9]{2})?)/i,
  )
  if (match) {
    let clean = match[1].replace(/\./g, '').replace(',', '.')
    const num = parseFloat(clean)
    return isNaN(num) ? 0 : num
  }
  return 0
}

/**
 * Analisa e extrai dados do PDF de orçamento fotovoltaico
 */
export async function extrairOrcamentoFotovoltaicoPDF(
  file: File,
  fornecedoresCadastrados: Fornecedor[] = [],
): Promise<FornecedorOrcamentoExtraido> {
  const rawText = await extractTextFromPdf(file)
  const lines = rawText
    .split(/[\r\n]+/)
    .map((l) => l.trim())
    .filter(Boolean)

  let nomeFornecedor = ''
  let fornecedorId: string | undefined = undefined
  let numeroRevisao = ''
  let valorTotal = 0

  const modulos: FornecedorItemOrcamento[] = []
  const inversores: FornecedorItemOrcamento[] = []
  const acessorios: FornecedorItemOrcamento[] = []

  // 1. Tentar detectar nome de fornecedor conhecido
  for (const forn of fornecedoresCadastrados) {
    if (forn.nome_empresa && rawText.toLowerCase().includes(forn.nome_empresa.toLowerCase())) {
      nomeFornecedor = forn.nome_empresa
      fornecedorId = forn.id
      break
    }
  }

  // Se não achou na lista cadastrada, procurar por marcas/distribuidores ou padrões comuns
  if (!nomeFornecedor) {
    const fornecedorRegexes = [
      /(?:Distribuidora|Fornecedor|Empresa|Distribuidor|Razão Social)[:\s]+([^\n\r,.;]{3,50})/i,
      /([A-Z0-9À-Úa-z\s]{3,40}(?:Distribuidora|Solar|Distribuição|Energia|Fotovoltaico|Comercial|Elétrica))/i,
    ]
    for (const rx of fornecedorRegexes) {
      const m = rawText.match(rx)
      if (m && m[1] && m[1].trim().length > 3) {
        nomeFornecedor = m[1].trim()
        break
      }
    }
  }

  if (!nomeFornecedor) {
    // Tentar primeira linha com nome razoável
    if (lines[0] && lines[0].length < 60 && !lines[0].toLowerCase().includes('orçamento')) {
      nomeFornecedor = lines[0]
    } else {
      nomeFornecedor = file.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ')
    }
  }

  // 2. Extrair número de revisão / cotação
  const revisaoRegexes = [
    /(?:Revisão|Rev\.?|Revisão Nº|Nº Revisão|Proposta Nº|Cotação Nº|Orçamento Nº)[:\s]*([A-Z0-9\-_./]{2,25})/i,
    /(?:ST|EL|COT|ORC|PROP)[-_/0-9A-Z]+/i,
    /REV[\s\-_0-9A-Z]+/i,
  ]
  for (const rx of revisaoRegexes) {
    const m = rawText.match(rx)
    if (m) {
      numeroRevisao = m[1] ? m[1].trim() : m[0].trim()
      break
    }
  }
  if (!numeroRevisao) {
    numeroRevisao = 'REV-01'
  }

  // 3. Extrair valor total
  const totalRegexes = [
    /(?:TOTAL GERAL|VALOR TOTAL|TOTAL DO ORÇAMENTO|TOTAL PROPOSTA|INVESTIMENTO TOTAL|TOTAL LÍQUIDO|TOTAL)[:\s]*R?\$?\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2}))/i,
    /R\$\s*([0-9]{1,3}(?:\.[0-9]{3})+(?:,[0-9]{2}))/g,
  ]

  const mTotal = rawText.match(totalRegexes[0])
  if (mTotal && mTotal[1]) {
    valorTotal = extrairValorEmReais(mTotal[1])
  } else {
    // Pegar o maior valor encontrado em reais
    const allMatches = Array.from(
      rawText.matchAll(/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})+(?:,[0-9]{2}))/g),
    )
    let maxVal = 0
    for (const m of allMatches) {
      const val = extrairValorEmReais(m[1])
      if (val > maxVal) maxVal = val
    }
    valorTotal = maxVal
  }

  // 4. Analisar linhas de texto para identificar módulos, inversores e acessórios
  // Padrões de linha: "52x Módulo...", "1 Inversor...", "qtd: 20 conector MC4"
  for (const line of lines) {
    const lLower = line.toLowerCase()

    // Extrair quantidade se houver no início ou formato "X un", "X pç", "Qtd: X"
    let qtd = 1
    const qtdMatch =
      line.match(/^(\d+)\s*(?:x|un|pç|unidades?|-|\*|\.)?\s+/i) ||
      line.match(/(?:qtd|quantidade|quant\.?)[:\s]*(\d+)/i) ||
      line.match(/\b(\d+)\s*(?:unidades?|peças?|pçs?|módulos?|placas?)\b/i)

    if (qtdMatch) {
      const parsedQtd = parseInt(qtdMatch[1], 10)
      if (!isNaN(parsedQtd) && parsedQtd > 0 && parsedQtd < 5000) {
        qtd = parsedQtd
      }
    }

    // Classificação: MÓDULOS SOLARES
    if (
      lLower.includes('módulo') ||
      lLower.includes('modulo') ||
      lLower.includes('painel') ||
      lLower.includes('placa solar') ||
      (lLower.includes('fotovoltaico') &&
        (lLower.includes('wp') ||
          lLower.includes('550w') ||
          lLower.includes('canadian') ||
          lLower.includes('ja solar') ||
          lLower.includes('longi') ||
          lLower.includes('trina') ||
          lLower.includes('risen') ||
          lLower.includes('osda') ||
          lLower.includes('jinko')))
    ) {
      // Ignorar se for conector ou cabo
      if (
        !lLower.includes('cabo') &&
        !lLower.includes('conector') &&
        !lLower.includes('estrutura')
      ) {
        const desc = line.replace(/^\d+\s*(?:x|un|pç|-|\*)\s*/i, '').trim()
        if (
          desc.length > 5 &&
          !modulos.some((m) => m.descricao.toLowerCase() === desc.toLowerCase())
        ) {
          modulos.push({
            descricao: desc,
            quantidade: qtd > 1 ? qtd : qtdMatch ? qtd : 1,
          })
        }
      }
    }

    // Classificação: INVERSORES
    else if (
      lLower.includes('inversor') ||
      lLower.includes('microinversor') ||
      lLower.includes('growatt') ||
      lLower.includes('deye') ||
      lLower.includes('huawei') ||
      lLower.includes('solis') ||
      lLower.includes('sungrow') ||
      lLower.includes('fronius') ||
      lLower.includes('goodwe') ||
      lLower.includes('hoymiles') ||
      lLower.includes('invers.')
    ) {
      if (!lLower.includes('cabo') && !lLower.includes('conector') && !lLower.includes('dongle')) {
        const desc = line.replace(/^\d+\s*(?:x|un|pç|-|\*)\s*/i, '').trim()
        if (
          desc.length > 5 &&
          !inversores.some((inv) => inv.descricao.toLowerCase() === desc.toLowerCase())
        ) {
          inversores.push({
            descricao: desc,
            quantidade: qtd,
          })
        }
      }
    }

    // Classificação: ACESSÓRIOS E COMPONENTES
    else if (
      lLower.includes('string box') ||
      lLower.includes('stringbox') ||
      lLower.includes('cabo solar') ||
      lLower.includes('conector mc4') ||
      lLower.includes('mc4') ||
      lLower.includes('dps') ||
      lLower.includes('disjuntor') ||
      lLower.includes('estrutura') ||
      lLower.includes('trilho') ||
      lLower.includes('gancho') ||
      lLower.includes('grampo') ||
      lLower.includes('terminal') ||
      lLower.includes('aterramento') ||
      lLower.includes('smart meter') ||
      lLower.includes('dongle') ||
      lLower.includes('fusível') ||
      lLower.includes('fusivel')
    ) {
      const desc = line.replace(/^\d+\s*(?:x|un|pç|-|\*)\s*/i, '').trim()
      if (
        desc.length > 5 &&
        !acessorios.some((ac) => ac.descricao.toLowerCase() === desc.toLowerCase())
      ) {
        acessorios.push({
          descricao: desc,
          quantidade: qtd,
        })
      }
    }
  }

  // Fallbacks graciosos caso o texto não tenha linhas bem recortadas
  // mas contenha termos solares no corpo inteiro
  if (modulos.length === 0) {
    const rxMod = /(?:Módulo|Painel|Placa)\s+[^,\n.]{5,50}(?:550W|Wp|Mono|Half-cell|Solar)[^,\n.]*/i
    const m = rawText.match(rxMod)
    if (m) {
      modulos.push({ descricao: m[0].trim(), quantidade: 1 })
    }
  }

  if (inversores.length === 0) {
    const rxInv =
      /(?:Inversor|Microinversor)\s+[^,\n.]{5,50}(?:Growatt|Deye|Huawei|Solis|Sungrow|Fronius|kW|LV)[^,\n.]*/i
    const m = rawText.match(rxInv)
    if (m) {
      inversores.push({ descricao: m[0].trim(), quantidade: 1 })
    }
  }

  return {
    nome_fornecedor: nomeFornecedor || 'Fornecedor Solar',
    fornecedor_id: fornecedorId,
    numero_revisao: numeroRevisao || 'REV-01',
    data: new Date().toISOString(),
    valor_total: valorTotal || 0,
    modulos,
    inversores,
    acessorios,
    observacoes: `Extraído automaticamente de ${file.name}. Verifique as informações na tabela antes de salvar.`,
  }
}
