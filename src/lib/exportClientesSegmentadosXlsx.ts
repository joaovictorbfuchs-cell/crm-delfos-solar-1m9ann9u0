import type { Cliente, ContatoAdicional } from '@/types/crm'
import { buildXlsxBuffer, downloadFileInBrowser, type XlsxSheet } from './xlsxBuilderClient'
import { formatCurrency } from './formatters'

export interface ClienteExportItem {
  id: string
  nome: string
  tipoPessoa: string
  documento: string
  telefone: string
  temTelefone: boolean
  whatsapp: string
  temWhatsApp: boolean
  temContatoVinculado: boolean
  totalContatosVinculados: number
  detalhesContatosVinculados: string
  etapaFunil: string
  cidade: string
  estado: string
  potenciaKwp: number
  valorEstimado: number
  produto: string
  origem: string
  email: string
  dataCadastro: string
}

export function prepararDadosExportacaoClientes(
  clientes: Cliente[],
  contatosAdicionais: ContatoAdicional[] = [],
  contatosUnicosVinculadosMap?: Map<string, number>,
): ClienteExportItem[] {
  // Mapear contatos adicionais por cliente_id
  const contatosAdicionaisMap = new Map<string, ContatoAdicional[]>()
  contatosAdicionais.forEach((ca) => {
    if (!ca.cliente) return
    const list = contatosAdicionaisMap.get(ca.cliente) || []
    list.push(ca)
    contatosAdicionaisMap.set(ca.cliente, list)
  })

  return clientes.map((c) => {
    const rawTel = (c.telefone || '').trim()
    const telDigits = rawTel.replace(/\D/g, '')
    const temTelefone = telDigits.length >= 8

    const rawWa = (c.whatsapp || '').trim()
    const waDigits = rawWa.replace(/\D/g, '')
    const temWhatsApp = waDigits.length >= 8

    // Contatos vinculados
    const adicionais = contatosAdicionaisMap.get(c.id) || []
    const countUnicos = contatosUnicosVinculadosMap?.get(c.id) || 0
    const hasNomeContato = Boolean(c.contato_principal?.trim() || c.contato?.trim())

    const totalVinculados = adicionais.length + countUnicos + (hasNomeContato ? 1 : 0)
    const temContatoVinculado = totalVinculados > 0

    const detalhesContatosParts: string[] = []
    if (c.contato_principal?.trim()) {
      detalhesContatosParts.push(`Principal: ${c.contato_principal.trim()}`)
    } else if (c.contato?.trim()) {
      detalhesContatosParts.push(`Contato: ${c.contato.trim()}`)
    }
    if (adicionais.length > 0) {
      const nomes = adicionais
        .map((a) => `${a.nome}${a.papel || a.cargo ? ` (${a.papel || a.cargo})` : ''}`)
        .join(', ')
      detalhesContatosParts.push(`Adicionais: ${nomes}`)
    }

    return {
      id: c.id,
      nome: c.nome || 'Sem nome',
      tipoPessoa: c.tipo_pessoa === 'juridica' || c.cnpj ? 'Pessoa Jurídica' : 'Pessoa Física',
      documento: c.cnpj || c.cpf || '',
      telefone: c.telefone || '',
      temTelefone,
      whatsapp: c.whatsapp || '',
      temWhatsApp,
      temContatoVinculado,
      totalContatosVinculados: totalVinculados,
      detalhesContatosVinculados:
        detalhesContatosParts.join(' | ') || (temContatoVinculado ? 'Vinculado' : 'Nenhum'),
      etapaFunil: c.status || 'Sem etapa',
      cidade: c.cidade || 'Não informada',
      estado: c.estado || 'RS',
      potenciaKwp: Number(c.potencia_kwp) || 0,
      valorEstimado: Number(c.valor_estimado) || 0,
      produto: c.produto || 'Energia Solar',
      origem: c.origem_lead || 'Não informada',
      email: c.email || '',
      dataCadastro: c.created ? c.created.slice(0, 10) : '',
    }
  })
}

function criarAbaXlsx(nomeAba: string, itens: ClienteExportItem[]): XlsxSheet {
  const colWidths = [
    32, // Nome
    18, // Tipo Pessoa
    20, // CPF/CNPJ
    18, // Telefone
    14, // Tem Telefone?
    18, // WhatsApp
    14, // Tem WhatsApp?
    18, // Tem Contato Vinc.?
    35, // Detalhes dos Contatos
    20, // Etapa do Funil
    20, // Cidade
    10, // UF
    14, // Potência (kWp)
    18, // Valor Estimado (R$)
    20, // Produto
    16, // Origem
    26, // Email
    14, // Data Cadastro
  ]

  const cabecalho = [
    'Nome do Cliente',
    'Tipo Pessoa',
    'CPF / CNPJ',
    'Telefone',
    'Tem Telefone?',
    'WhatsApp',
    'Tem WhatsApp?',
    'Contato Vinculado?',
    'Detalhes dos Contatos',
    'Etapa do Funil',
    'Cidade',
    'UF',
    'Potência (kWp)',
    'Valor Estimado (R$)',
    'Produto',
    'Origem Lead',
    'Email',
    'Data de Cadastro',
  ]

  const rows: (string | number)[][] = [cabecalho]

  itens.forEach((it) => {
    rows.push([
      it.nome,
      it.tipoPessoa,
      it.documento,
      it.telefone,
      it.temTelefone ? 'Sim' : 'Não',
      it.whatsapp,
      it.temWhatsApp ? 'Sim' : 'Não',
      it.temContatoVinculado ? 'Sim' : 'Não',
      it.detalhesContatosVinculados,
      it.etapaFunil,
      it.cidade,
      it.estado,
      it.potenciaKwp,
      formatCurrency(it.valorEstimado),
      it.produto,
      it.origem,
      it.email,
      it.dataCadastro,
    ])
  })

  return {
    name: nomeAba,
    rows,
    colWidths,
  }
}

/**
 * Gera e exporta um arquivo .xlsx completo segmentando clientes em abas:
 * 1. Todos os Selecionados / Filtrados
 * 2. Com Telefone
 * 3. Sem Telefone
 * 4. Com WhatsApp
 * 5. Sem WhatsApp
 * 6. Com Contato Vinculado
 * 7. Sem Contato Vinculado
 */
export function exportarClientesSegmentadosXlsx(params: {
  clientes: Cliente[]
  contatosAdicionais?: ContatoAdicional[]
  contatosUnicosVinculadosMap?: Map<string, number>
  nomePrefixo?: string
}): {
  totalExportados: number
  nomeArquivo: string
  resumo: {
    total: number
    comTelefone: number
    semTelefone: number
    comWhatsApp: number
    semWhatsApp: number
    comContato: number
    semContato: number
  }
} {
  const dados = prepararDadosExportacaoClientes(
    params.clientes,
    params.contatosAdicionais || [],
    params.contatosUnicosVinculadosMap,
  )

  const comTelefone = dados.filter((d) => d.temTelefone)
  const semTelefone = dados.filter((d) => !d.temTelefone)
  const comWhatsApp = dados.filter((d) => d.temWhatsApp)
  const semWhatsApp = dados.filter((d) => !d.temWhatsApp)
  const comContato = dados.filter((d) => d.temContatoVinculado)
  const semContato = dados.filter((d) => !d.temContatoVinculado)

  const sheets: XlsxSheet[] = [
    criarAbaXlsx('Todos Clientes', dados),
    criarAbaXlsx('Com Telefone', comTelefone),
    criarAbaXlsx('Sem Telefone', semTelefone),
    criarAbaXlsx('Com WhatsApp', comWhatsApp),
    criarAbaXlsx('Sem WhatsApp', semWhatsApp),
    criarAbaXlsx('Com Contato Vinculado', comContato),
    criarAbaXlsx('Sem Contato Vinculado', semContato),
  ]

  const buffer = buildXlsxBuffer(sheets)
  const dataHoje = new Date().toISOString().slice(0, 10)
  const prefixo = params.nomePrefixo || 'clientes-segmentados'
  const nomeArquivo = `${prefixo}-${dataHoje}.xlsx`

  downloadFileInBrowser(buffer, nomeArquivo)

  return {
    totalExportados: dados.length,
    nomeArquivo,
    resumo: {
      total: dados.length,
      comTelefone: comTelefone.length,
      semTelefone: semTelefone.length,
      comWhatsApp: comWhatsApp.length,
      semWhatsApp: semWhatsApp.length,
      comContato: comContato.length,
      semContato: semContato.length,
    },
  }
}
