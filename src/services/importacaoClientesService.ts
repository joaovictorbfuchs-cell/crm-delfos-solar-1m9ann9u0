import { ClienteStatus, TipoPessoa } from '@/types/crm'

export type ImportFonte = 'pipedrive' | 'conta_azul'

export interface CampoMapeado {
  key: string
  label: string
  required?: boolean
  description: string
  variacoes: string[]
}

export const CAMPOS_DESTINO_IMPORTACAO: CampoMapeado[] = [
  {
    key: 'nome',
    label: 'Nome / Razão Social',
    required: true,
    description: 'Nome completo da pessoa física ou Razão Social da empresa',
    variacoes: [
      'nome',
      'name',
      'cliente',
      'nome do cliente',
      'razao social',
      'razão social',
      'organization',
      'organização',
      'empresa',
      'title',
      'deal title',
      'person',
      'pessoa',
      'contact name',
      'nome contato',
    ],
  },
  {
    key: 'telefone',
    label: 'Telefone / WhatsApp',
    required: false,
    description: 'Telefone principal ou WhatsApp com DDD',
    variacoes: [
      'telefone',
      'phone',
      'whatsapp',
      'celular',
      'mobile',
      'fone',
      'tel',
      'telefone principal',
      'contato tel',
      'phone number',
    ],
  },
  {
    key: 'email',
    label: 'E-mail',
    required: false,
    description: 'E-mail de contato principal',
    variacoes: [
      'email',
      'e-mail',
      'correio eletronico',
      'correio eletrônico',
      'mail',
      'email principal',
      'contact email',
    ],
  },
  {
    key: 'cpf_cnpj',
    label: 'CPF / CNPJ',
    required: false,
    description: 'Documento fiscal (CPF 11 dígitos ou CNPJ 14 dígitos)',
    variacoes: [
      'cpf',
      'cnpj',
      'cpf/cnpj',
      'cpf_cnpj',
      'documento',
      'doc',
      'cnpj/cpf',
      'cadastro fiscal',
      'inscricao federal',
      'inscrição federal',
    ],
  },
  {
    key: 'cidade',
    label: 'Cidade',
    required: false,
    description: 'Município de residência ou sede',
    variacoes: [
      'cidade',
      'city',
      'municipio',
      'município',
      'localidade',
      'cidade/uf',
      'cidade - uf',
    ],
  },
  {
    key: 'estado',
    label: 'Estado (UF)',
    required: false,
    description: 'UF (sigla ex: RS, SC, PR)',
    variacoes: ['estado', 'uf', 'state', 'provincia', 'província', 'regiao', 'região'],
  },
  {
    key: 'status',
    label: 'Status / Etapa do Funil',
    required: false,
    description: 'Status comercial do lead ou cliente',
    variacoes: [
      'status',
      'estagio',
      'estágio',
      'stage',
      'etapa',
      'fase',
      'situacao',
      'situação',
      'pipeline stage',
      'status do negócio',
      'status cliente',
    ],
  },
  {
    key: 'data_ultimo_contato',
    label: 'Data do Último Contato / Atividade',
    required: false,
    description: 'Data do último contato, negociação ou atualização',
    variacoes: [
      'data do ultimo contato',
      'data do último contato',
      'ultimo contato',
      'último contato',
      'last activity date',
      'last contact',
      'data da ultima atividade',
      'data da última atividade',
      'ultima interacao',
      'última interação',
      'atualizado em',
      'updated at',
      'data abertura',
      'data cadastro',
    ],
  },
  {
    key: 'endereco',
    label: 'Endereço / Logradouro',
    required: false,
    description: 'Rua, avenida, bairro e número',
    variacoes: ['endereco', 'endereço', 'address', 'rua', 'logradouro', 'street'],
  },
  {
    key: 'valor_estimado',
    label: 'Valor do Negócio / Estimado',
    required: false,
    description: 'Valor monetário estimado do orçamento/proposta',
    variacoes: ['valor', 'value', 'valor estimado', 'deal value', 'montante', 'preço', 'preco'],
  },
]

/**
 * Normaliza string removendo acentos e caracteres especiais para comparação
 */
export function normalizarChave(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * Auto-detecta mapeamento entre cabeçalhos da planilha e campos de destino
 */
export function autoDetectarMapeamento(
  headers: string[],
  _fonte: ImportFonte,
): Record<string, string> {
  const mapeamento: Record<string, string> = {}
  const headersNormalizados = headers.map((h) => ({
    original: h,
    normalizado: normalizarChave(h),
  }))

  for (const campo of CAMPOS_DESTINO_IMPORTACAO) {
    // 1. Match exato com as variações
    let matchedHeader = headersNormalizados.find((h) =>
      campo.variacoes.some((v) => normalizarChave(v) === h.normalizado),
    )

    // 2. Match parcial / substrings se não achou exato
    if (!matchedHeader) {
      matchedHeader = headersNormalizados.find((h) =>
        campo.variacoes.some(
          (v) =>
            h.normalizado.includes(normalizarChave(v)) ||
            normalizarChave(v).includes(h.normalizado),
        ),
      )
    }

    if (matchedHeader) {
      mapeamento[campo.key] = matchedHeader.original
    }
  }

  return mapeamento
}

/**
 * Mapeia status do Pipedrive / Conta Azul para o status da coleção clientes do CRM
 */
export function mapearStatusCRM(valor: string | undefined): ClienteStatus {
  if (!valor) return 'Novo Lead'
  const norm = normalizarChave(valor)

  if (
    norm.includes('fechad') ||
    norm.includes('ganho') ||
    norm.includes('won') ||
    norm.includes('vendido') ||
    norm.includes('ativo')
  ) {
    return 'Fechado'
  }
  if (
    norm.includes('negoci') ||
    norm.includes('proposta enviada') ||
    norm.includes('em negociacao')
  ) {
    return 'Negociação'
  }
  if (
    norm.includes('orcament') ||
    norm.includes('orçamento') ||
    norm.includes('proposta') ||
    norm.includes('cotacao')
  ) {
    return 'Orçamento'
  }
  if (
    norm.includes('levant') ||
    norm.includes('visita') ||
    norm.includes('qualificad') ||
    norm.includes('em analise')
  ) {
    return 'Levantamento'
  }
  if (
    norm.includes('futuro') ||
    norm.includes('perdido') ||
    norm.includes('lost') ||
    norm.includes('reativ') ||
    norm.includes('em espera')
  ) {
    return 'Contato Futuro'
  }

  return 'Novo Lead'
}

/**
 * Limpa números de documento
 */
export function limparDocumento(doc: string | undefined): string {
  if (!doc) return ''
  return doc.replace(/\D/g, '')
}

/**
 * Formata CPF ou CNPJ conforme comprimento
 */
export function formatarDocumento(doc: string): string {
  const digits = doc.replace(/\D/g, '')
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }
  return doc
}

/**
 * Detecta se é pessoa física ou jurídica pelo documento ou razão social
 */
export function detectarTipoPessoa(doc: string | undefined, nome: string): TipoPessoa {
  const digits = limparDocumento(doc)
  if (digits.length === 14) return 'juridica'
  if (digits.length === 11) return 'fisica'

  const normNome = normalizarChave(nome)
  if (
    normNome.includes('ltda') ||
    normNome.includes('me ') ||
    normNome.includes('eireli') ||
    normNome.includes('sa ') ||
    normNome.includes('s a ') ||
    normNome.includes('s/a') ||
    normNome.includes('industria') ||
    normNome.includes('comercio') ||
    normNome.includes('solar')
  ) {
    return 'juridica'
  }
  return 'fisica'
}

export interface ClienteImportadoNormalizado {
  idTemp: string
  nome: string
  telefone: string
  whatsapp: string
  email: string
  cpf: string
  cnpj: string
  tipo_pessoa: TipoPessoa
  cidade: string
  estado: string
  endereco: string
  status: ClienteStatus
  data_ultimo_contato: string
  valor_estimado: number
  origem_lead: 'Outro' | 'Indicação' | 'WhatsApp'
  produto: 'Energia Solar'
  como_conheceu: string
  observacoes: string
  // Flag de duplicidade
  isDuplicado?: boolean
  duplicadoPor?: 'cpf' | 'cnpj' | 'email'
  clienteExistenteId?: string
  clienteExistenteNome?: string
}

/**
 * Converte linha crua mapeada para o modelo ClienteImportadoNormalizado
 */
export function normalizarLinhaParaCliente(
  row: Record<string, string>,
  mapeamento: Record<string, string>,
  fonte: ImportFonte,
  index: number,
): ClienteImportadoNormalizado {
  const getValor = (key: string): string => {
    const colHeader = mapeamento[key]
    if (!colHeader) return ''
    return (row[colHeader] || '').trim()
  }

  const nome = getValor('nome') || `Cliente Importado ${index + 1}`
  const rawTel = getValor('telefone')
  const email = getValor('email').toLowerCase()
  const rawDoc = getValor('cpf_cnpj')
  const cleanDoc = limparDocumento(rawDoc)

  let cpf = ''
  let cnpj = ''
  if (cleanDoc.length === 11) {
    cpf = formatarDocumento(cleanDoc)
  } else if (cleanDoc.length === 14) {
    cnpj = formatarDocumento(cleanDoc)
  }

  const tipo_pessoa = detectarTipoPessoa(rawDoc, nome)
  const cidade = getValor('cidade') || 'Erechim'
  const estado = (getValor('estado') || 'RS').toUpperCase().slice(0, 2)
  const status = mapearStatusCRM(getValor('status'))
  const dataUltimo = getValor('data_ultimo_contato')
  const endereco = getValor('endereco')

  const rawValor = getValor('valor_estimado')
    .replace(/[^\d.,]/g, '')
    .replace(',', '.')
  const valorEstimado = parseFloat(rawValor) || (status === 'Fechado' ? 32000 : 25000)

  const observacoes = [
    `Importado de: ${fonte === 'pipedrive' ? 'Pipedrive CRM' : 'Conta Azul'} em ${new Date().toLocaleDateString('pt-BR')}`,
    dataUltimo ? `Último contato registrado: ${dataUltimo}` : '',
    rawDoc && !cpf && !cnpj ? `Documento original: ${rawDoc}` : '',
  ]
    .filter(Boolean)
    .join('. ')

  return {
    idTemp: `import_${fonte}_${index}_${Date.now()}`,
    nome,
    telefone: rawTel,
    whatsapp: rawTel,
    email,
    cpf,
    cnpj,
    tipo_pessoa,
    cidade,
    estado,
    endereco,
    status,
    data_ultimo_contato: dataUltimo,
    valor_estimado: valorEstimado,
    origem_lead: 'Outro',
    produto: 'Energia Solar',
    como_conheceu: fonte === 'pipedrive' ? 'Pipedrive' : 'Conta Azul',
    observacoes,
  }
}
