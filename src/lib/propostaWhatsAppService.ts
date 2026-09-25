import { formatCurrency, formatWhatsAppPhone, cleanPhoneDigits } from '@/lib/formatters'
import type { Cliente, OrcamentoSolar } from '@/types/crm'
import { calcularOrcamentoSolar } from '@/lib/energiaSolar'
import type { PropostaSolarPDFInput } from '@/lib/propostaSolarGenerator'
import { DADOS_FIXOS_EMPRESA_DELFOS } from '@/lib/propostaTecnicoComercialGenerator'

export interface PropostaWhatsAppTemplate {
  id: string
  titulo: string
  descricao?: string
  conteudo: string
}

export interface PropostaWhatsAppPlaceholdersContext {
  nome_cliente?: string
  consultor?: string
  valor?: string
  tipo?: string
  cidade?: string
  empresa?: string
  potencia?: string
  economia_mensal?: string
}

/**
 * Templates padrão sugeridos para envio de propostas comerciais
 */
export const TEMPLATES_PROPOSTA_WHATSAPP: PropostaWhatsAppTemplate[] = [
  {
    id: 'proposta_pronta',
    titulo: 'Proposta pronta',
    descricao: 'Apresentação formal da proposta com PDF anexo',
    conteudo:
      'Olá, {nome_cliente}! Tudo bem?\n\nAqui é o {consultor} da {empresa}. Preparei sua proposta técnica de energia solar para o seu imóvel ({tipo}) em {cidade}.\n\nO investimento total é de {valor}, com economia estimada de {economia_mensal}/mês. O documento com o estudo detalhado e condições de pagamento está anexo.\n\nFico à total disposição para tirarmos qualquer dúvida!',
  },
  {
    id: 'followup',
    titulo: 'Follow-up',
    descricao: 'Acompanhamento do envio da proposta',
    conteudo:
      'Olá, {nome_cliente}! Como vai?\n\nPassando para saber se você conseguiu analisar a proposta de energia solar no valor de {valor} que enviamos para sua unidade em {cidade}.\n\nPodemos marcar uma rápida conversa para alinhar os detalhes e formas de pagamento?\n\nAbraço, {consultor} — {empresa}.',
  },
  {
    id: 'lembrete_expirando',
    titulo: 'Lembrete de proposta expirando',
    descricao: 'Alerta sobre a validade das condições comerciais',
    conteudo:
      'Olá, {nome_cliente}! Tudo bem?\n\nGostaria de avisar que as condições especiais da sua proposta de energia solar ({tipo} em {cidade}) com investimento de {valor} estão próximas da data de validade.\n\nCaso queira garantir os valores e a reserva dos equipamentos com a {empresa}, me avise para darmos o próximo passo!\n\nAtenciosamente, {consultor}.',
  },
  {
    id: 'comunicar_aprovacao',
    titulo: 'Comunicar aprovação',
    descricao: 'Celebração e próximos passos após aceite',
    conteudo:
      'Parabéns, {nome_cliente}! 🎉\n\nRecebemos a confirmação de aprovação da sua proposta de {potencia} ({tipo} em {cidade}) no valor de {valor}!\n\nEstamos muito felizes em ter você como parceiro da {empresa}. Nosso time técnico entrará em contato em breve para os próximos passos.\n\nConte sempre conosco!',
  },
]

/**
 * Validação de número de telefone para WhatsApp no padrão brasileiro
 */
export interface ValidacaoWhatsAppResult {
  valido: boolean
  numeroLimpo: string // Apenas dígitos
  numeroFormatado: string // Ex: (54) 99999-9999
  mensagemErro?: string
  temDdd: boolean
  isCelular: boolean
}

export function validarNumeroWhatsApp(phone: string | undefined | null): ValidacaoWhatsAppResult {
  if (!phone) {
    return {
      valido: false,
      numeroLimpo: '',
      numeroFormatado: '',
      mensagemErro: 'Número não informado',
      temDdd: false,
      isCelular: false,
    }
  }

  let digits = cleanPhoneDigits(phone)

  // Remove DDI 55 se presente no início para números com 12 ou 13 dígitos
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2)
  }

  // Se tem apenas 8 ou 9 dígitos, falta DDD regional (pode assumir 54 ou avisar)
  const temDdd = digits.length >= 10
  const isCelular = digits.length === 11 || (digits.length === 9 && digits.startsWith('9'))

  if (digits.length < 10) {
    return {
      valido: false,
      numeroLimpo: digits,
      numeroFormatado: formatWhatsAppPhone(digits),
      mensagemErro: 'Número incompleto: informe com DDD (mínimo 10 ou 11 dígitos)',
      temDdd: false,
      isCelular,
    }
  }

  if (digits.length > 11) {
    return {
      valido: false,
      numeroLimpo: digits,
      numeroFormatado: formatWhatsAppPhone(digits),
      mensagemErro: 'Número com dígitos em excesso para o padrão Brasil',
      temDdd: true,
      isCelular: false,
    }
  }

  // DDDs válidos no Brasil: de 11 a 99
  const ddd = parseInt(digits.slice(0, 2), 10)
  if (ddd < 11 || ddd > 99) {
    return {
      valido: false,
      numeroLimpo: digits,
      numeroFormatado: formatWhatsAppPhone(digits),
      mensagemErro: 'DDD brasileiro inválido',
      temDdd: false,
      isCelular,
    }
  }

  return {
    valido: true,
    numeroLimpo: digits,
    numeroFormatado: formatWhatsAppPhone(digits),
    temDdd: true,
    isCelular,
  }
}

/**
 * Substitui placeholders tanto no formato `{chave}` quanto `{{chave}}`
 */
export function aplicarPlaceholdersProposta(
  texto: string,
  contexto: PropostaWhatsAppPlaceholdersContext,
): string {
  if (!texto) return ''

  let resultado = texto

  const replacements: Record<string, string> = {
    nome_cliente: contexto.nome_cliente || 'Cliente',
    consultor: contexto.consultor || 'Delfos Solar',
    valor: contexto.valor || '—',
    tipo: contexto.tipo || 'Residencial',
    cidade: contexto.cidade || 'Erechim / RS',
    empresa: contexto.empresa || 'Delfos Solar',
    potencia: contexto.potencia || '—',
    economia_mensal: contexto.economia_mensal || '—',
  }

  Object.entries(replacements).forEach(([key, val]) => {
    // Substitui {chave}
    const singleBraceRegex = new RegExp(`\\{${key}\\}`, 'gi')
    resultado = resultado.replace(singleBraceRegex, val)

    // Substitui {{chave}}
    const doubleBraceRegex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi')
    resultado = resultado.replace(doubleBraceRegex, val)
  })

  return resultado
}

/**
 * Constrói o contexto com todos os dados da proposta e do cliente para interpolação
 */
export function extrairContextoProposta(
  orcamento: OrcamentoSolar,
  cliente?: Cliente | null,
  autorPadrao?: string,
): PropostaWhatsAppPlaceholdersContext {
  const nome = cliente?.nome || cliente?.razao_social || 'Cliente'
  const primeiroNome = nome.split(' ')[0]
  const consultor =
    orcamento.autor || autorPadrao || DADOS_FIXOS_EMPRESA_DELFOS.responsavelTecnico || 'João Victor'

  const valorNum = Number(orcamento.valor_investimento) || 0
  const valorFormatado = valorNum > 0 ? formatCurrency(valorNum) : 'sob consulta'

  const potenciaNum = Number(orcamento.potencia_kwp) || 0
  const potenciaFormatada = potenciaNum > 0 ? `${potenciaNum.toFixed(2)} kWp` : 'energia solar'

  const ecoNum = Number(orcamento.economia_1_mes) || 0
  const ecoFormatada = ecoNum > 0 ? formatCurrency(ecoNum) : 'expressiva'

  const tipoRaw = orcamento.tipo_cliente || cliente?.tipo_cliente || 'residencial'
  const tipoFormatado =
    tipoRaw === 'comercial'
      ? 'Comercial'
      : tipoRaw === 'industrial'
        ? 'Industrial'
        : tipoRaw === 'rural'
          ? 'Rural'
          : 'Residencial'

  const cidade = cliente?.cidade || 'Erechim / RS'
  const empresa = 'Delfos Solar'

  return {
    nome_cliente: primeiroNome,
    consultor,
    valor: valorFormatado,
    tipo: tipoFormatado,
    cidade,
    empresa,
    potencia: potenciaFormatada,
    economia_mensal: ecoFormatada,
  }
}

/**
 * Constrói o objeto PropostaSolarPDFInput a partir de um OrcamentoSolar do banco e do Cliente,
 * permitindo gerar o PDF de envio diretamente mesmo se a proposta estiver na listagem geral.
 */
export function construirPropostaSolarPDFInput(
  orc: OrcamentoSolar,
  cliente?: Cliente | null,
  representantePadrao?: string,
): PropostaSolarPDFInput {
  const nomeCliente = cliente?.nome || 'Cliente'
  const tipoCli = (orc.tipo_cliente || cliente?.tipo_cliente || 'residencial') as any
  const potenciaKwp = Number(orc.potencia_kwp) || 0
  const consumoKwhMes =
    Number(orc.consumo_kwh_mes) || (potenciaKwp > 0 ? Math.round(potenciaKwp * 115) : 350)
  const tarifaKwh = Number(orc.tarifa_kwh) || 1.1979
  const valorInvestimento =
    Number(orc.valor_investimento) || (potenciaKwp > 0 ? Math.round(potenciaKwp * 3800) : 0)

  // Recalcular ou reaproveitar cálculos
  const calculos = calcularOrcamentoSolar({
    consumoKwhMes,
    tarifaKwh,
    potenciaKwp,
    tipoCliente: tipoCli,
    valorInvestimentoInformado: valorInvestimento,
    geracaoSimuladaKwhAno: Number(orc.geracao_simulada_kwh_ano) || undefined,
    fatorSimultaneidade:
      orc.fator_simultaneidade !== undefined ? Number(orc.fator_simultaneidade) : undefined,
    fioBKwh: orc.fio_b !== undefined ? Number(orc.fio_b) : undefined,
    enquadramento: (orc.enquadramento as any) || 'GD_II',
  })

  return {
    cliente: {
      nome: nomeCliente,
      cpfOuCnpj: cliente?.cpf || cliente?.cnpj || '',
      endereco: [cliente?.endereco, cliente?.numero, cliente?.bairro].filter(Boolean).join(', '),
      municipio: cliente?.cidade || 'Erechim / RS',
      email: cliente?.email || '',
      telefone: cliente?.whatsapp || cliente?.telefone || '',
      tipoCliente: tipoCli,
    },
    representanteComercial:
      orc.autor ||
      representantePadrao ||
      DADOS_FIXOS_EMPRESA_DELFOS.responsavelTecnico ||
      'João Victor',
    sistema: {
      potenciaKwp,
      consumoKwhMes,
      numeroPlacas: Number(orc.numero_placas) || Math.round((potenciaKwp * 1000) / 585) || 10,
      potenciaPlacaWp: Number(orc.potencia_placa_wp) || 585,
      marcaPlacas: orc.marca_painel || 'Módulos Tier-1',
      marcaInversor: orc.marca_inversor || 'Inversor Homologado',
      quantidadeInversores: Number(orc.quantidade_inversores) || 1,
      tipoEstrutura: (orc.tipo_estrutura as any) || 'ceramico',
      orientacaoTelhado: (orc.orientacao_telhado as any) || 'norte',
      areaNecessariaM2: Number(orc.area_necessaria_m2) || Math.round(potenciaKwp * 5.5) || 20,
      codigoFiname: orc.codigo_finame || undefined,
      garantiaModulosAnos: Number(orc.garantia_modulos_degradacao_anos) || 30,
      garantiaModulosFabricacaoAnos: Number(orc.garantia_modulos_fabricacao_anos) || 15,
      garantiaInversorAnos: Number(orc.garantia_inversor_anos) || 10,
      garantiaInstalacaoTexto: '12 meses',
    },
    calculos,
    dataEmissao: orc.data_orcamento || orc.created || new Date().toISOString(),
    validadeDias: Number(orc.validade_dias) || 5,
    observacoes: orc.observacoes || undefined,
  }
}
