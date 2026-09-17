import type {
  CalculosSolarResultado,
  TipoClienteSolar,
  TipoEstruturaSolar,
  OrientacaoTelhadoSolar,
} from '@/lib/energiaSolar'
import {
  gerarHTMLPropostaTecnicoComercial,
  type PropostaTecnicoComercialDados,
  DADOS_FIXOS_EMPRESA_DELFOS,
} from '@/lib/propostaTecnicoComercialGenerator'

export interface DadosEmpresaDelfosCompleto {
  razaoSocial: string
  nomeFantasia: string
  cnpj: string
  endereco: string
  telefone: string
  email: string
  site: string
  responsavelTecnico: string
  crea: string
}

export const DADOS_EMPRESA_DELFOS_SOLAR: DadosEmpresaDelfosCompleto = {
  razaoSocial: 'Delfos Engenharia Ltda',
  nomeFantasia: 'Delfos Solar',
  cnpj: '21.379.952/0001-38',
  endereco: 'Rua Espírito Santo 275, Centro, Erechim - RS',
  telefone: '(54) 99129-2121',
  email: 'contato@delfos.eng.br',
  site: 'www.delfos.eng.br',
  responsavelTecnico: 'João Victor Bagetti Fuchs',
  crea: 'CREA RS151894',
}

export interface PropostaSolarPDFInput {
  cliente: {
    nome: string
    cpfOuCnpj?: string
    endereco?: string
    municipio?: string
    email?: string
    telefone?: string
    tipoCliente?: TipoClienteSolar
  }
  representanteComercial?: string
  sistema: {
    potenciaKwp: number
    consumoKwhMes: number
    numeroPlacas: number
    potenciaPlacaWp: number
    marcaPlacas: string
    marcaInversor: string
    quantidadeInversores: number
    tipoEstrutura: TipoEstruturaSolar
    orientacaoTelhado: OrientacaoTelhadoSolar
    areaNecessariaM2: number
    codigoFiname?: string
    prazoEntregaDias?: number
    garantiaModulosAnos?: number
    garantiaModulosFabricacaoAnos?: number
    garantiaInversorAnos?: number
    garantiaInstalacaoTexto?: string
  }
  calculos: CalculosSolarResultado
  instalacoesSelecionadasIds?: string[]
  dataEmissao?: string
  validadeDias?: number // 5 dias prescritos
  observacoes?: string
}

export function formatarTipoEstrutura(tipo: TipoEstruturaSolar): string {
  switch (tipo) {
    case 'ceramico':
      return 'Telhado Cerâmico'
    case 'metalico':
      return 'Telhado Metálico'
    case 'laje':
      return 'Laje de Concreto'
    case 'fibrocimento':
      return 'Telhado Fibrocimento'
    case 'solo':
      return 'Estrutura de Solo'
    default:
      return tipo
  }
}

export function formatarOrientacao(orientacao: OrientacaoTelhadoSolar): string {
  switch (orientacao) {
    case 'norte':
      return 'Norte (Ideal)'
    case 'leste':
      return 'Leste'
    case 'oeste':
      return 'Oeste'
    case 'sul':
      return 'Sul'
    default:
      return orientacao
  }
}

/**
 * Converte a entrada PropostaSolarPDFInput para o formato PropostaTecnicoComercialDados
 * garantindo que toda saída solar utilize o MESMO NOVO TEMPLATE de 6 seções.
 */
function converterInputParaTemplateComercial(
  dados: PropostaSolarPDFInput,
): PropostaTecnicoComercialDados {
  const {
    cliente,
    representanteComercial,
    sistema,
    calculos,
    dataEmissao,
    validadeDias,
    observacoes,
    instalacoesSelecionadasIds,
  } = dados

  const dataPropostaFormatada = dataEmissao
    ? new Date(dataEmissao).toLocaleDateString('pt-BR')
    : new Date().toLocaleDateString('pt-BR')

  const parcelamentos = calculos.parcelamentos

  return {
    cliente: {
      nome: cliente.nome,
      cpfOuCnpj: cliente.cpfOuCnpj,
      endereco: cliente.endereco,
      municipio: cliente.municipio,
      email: cliente.email,
      telefone: cliente.telefone,
      tipoCliente:
        cliente.tipoCliente === 'comercial'
          ? 'comercial'
          : cliente.tipoCliente === 'rural'
            ? 'rural'
            : cliente.tipoCliente === 'industrial'
              ? 'industrial'
              : 'residencial',
    },
    representante: {
      nome: representanteComercial || 'Equipe Comercial Delfos Solar',
      contato: '(54) 99129-2121',
    },
    dataProposta: dataPropostaFormatada,
    validadeDias: validadeDias || 5,
    empresa: {
      razaoSocial: DADOS_FIXOS_EMPRESA_DELFOS.razaoSocial,
      cnpj: DADOS_FIXOS_EMPRESA_DELFOS.cnpj,
      endereco: DADOS_FIXOS_EMPRESA_DELFOS.endereco,
      telefone: DADOS_FIXOS_EMPRESA_DELFOS.telefone,
      email: DADOS_FIXOS_EMPRESA_DELFOS.email,
      site: DADOS_FIXOS_EMPRESA_DELFOS.site,
      responsavelTecnico: DADOS_FIXOS_EMPRESA_DELFOS.responsavelTecnico,
      crea: DADOS_FIXOS_EMPRESA_DELFOS.crea,
    },
    sistema: {
      potenciaKwp: sistema.potenciaKwp,
      descricaoPaineis: `${sistema.marcaPlacas || 'Módulos Tier-1'} ${sistema.potenciaPlacaWp}W`,
      qtdPaineis: sistema.numeroPlacas,
      descricaoInversores: sistema.marcaInversor || 'Inversor Homologado',
      qtdInversores: sistema.quantidadeInversores || 1,
      estruturaFixacao: formatarTipoEstrutura(sistema.tipoEstrutura),
      codigoFiname: sistema.codigoFiname,
      areaNecessariaM2: sistema.areaNecessariaM2,
      potenciaPlacaWp: sistema.potenciaPlacaWp,
      potenciaInversorKw: Math.round(sistema.potenciaKwp * 0.8 * 10) / 10,
    },
    garantias: {
      paineisAnosFabricacao: sistema.garantiaModulosFabricacaoAnos || 15,
      paineisAnosDesempenho: sistema.garantiaModulosAnos || 30,
      paineisPercentualDesempenho: '84,80%',
      inversorAnosFabricacao: sistema.garantiaInversorAnos || 10,
      instalacaoAnos: 1,
      instalacaoTexto:
        sistema.garantiaInstalacaoTexto || '1 ano de garantia direta Delfos Engenharia',
    },
    instalacoesSelecionadasIds,
    producao: {
      anualKwh:
        sistema.consumoKwhMes && sistema.consumoKwhMes > 0
          ? Math.round(sistema.consumoKwhMes * 12)
          : calculos.geracaoAnualEstimadaKwh,
      mediaMensalKwh:
        sistema.consumoKwhMes && sistema.consumoKwhMes > 0
          ? sistema.consumoKwhMes
          : calculos.geracaoMediaMensalKwh,
      geracaoMensal: calculos.geracaoMensalDetalhada,
    },
    economia: {
      investimentoTotal: calculos.valorInvestimento,
      prazoEntregaDias: sistema.prazoEntregaDias || 30,
      paybackTexto: `${calculos.paybackAnos} anos e ${Math.round(calculos.paybackMeses % 12)} meses`,
      paybackMeses: calculos.paybackMeses,
    },
    parcelamento: {
      aVista: {
        valorTotal: parcelamentos.aVista.valorParcela,
        contaHoje: parcelamentos.aVista.contaSemSolar,
        contaComSolar: parcelamentos.aVista.contaComSolar,
        descontoReais: Math.max(0, calculos.valorInvestimento - parcelamentos.aVista.valorParcela),
      },
      cartao18x: {
        numeroParcelas: parcelamentos.cartao18x.numeroParcelas || 18,
        valorParcela: parcelamentos.cartao18x.valorParcela,
        contaHoje: parcelamentos.cartao18x.contaSemSolar,
        contaComSolar: parcelamentos.cartao18x.contaComSolar,
        semJuros: true,
      },
      financiamentoA: {
        nome: parcelamentos.financiamentoBanco1.titulo || 'Financiamento 60x',
        numeroParcelas: parcelamentos.financiamentoBanco1.numeroParcelas || 60,
        valorParcela: parcelamentos.financiamentoBanco1.valorParcela,
        contaHoje: parcelamentos.financiamentoBanco1.contaSemSolar,
        contaComSolar: parcelamentos.financiamentoBanco1.contaComSolar,
        entrada: 0,
      },
      financiamentoB: {
        nome: parcelamentos.financiamentoBanco2.titulo || 'Financiamento 120x',
        numeroParcelas: parcelamentos.financiamentoBanco2.numeroParcelas || 120,
        valorParcela: parcelamentos.financiamentoBanco2.valorParcela,
        contaHoje: parcelamentos.financiamentoBanco2.contaSemSolar,
        contaComSolar: parcelamentos.financiamentoBanco2.contaComSolar,
        entrada: 0,
      },
    },
    projecao: {
      gastoSemSolar1Ano: calculos.gastoSemSolar1Ano,
      gastoSemSolar5Anos: calculos.gastoSemSolar5Anos,
      gastoSemSolarPaybackAnos: calculos.gastoSemSolarPaybackAnos,
      anosPaybackArredondado: calculos.anosPaybackArredondado,
      gastoSemSolar25Anos: calculos.gastoSemSolar25Anos,
      economia1Ano: calculos.economia1Ano,
      economia5Anos: calculos.economia5Anos,
      economia25Anos: calculos.economia25Anos,
      economia1Mes: calculos.economia1Mes,
    },
    observacoes,
  }
}

/**
 * Gera o documento HTML oficial da proposta comercial solar com as 6 seções novas unificadas.
 * Redirecionado 100% para o novo template gerado por `gerarHTMLPropostaTecnicoComercial`.
 */
export function gerarHTMLPropostaSolar(dados: PropostaSolarPDFInput): string {
  const dadosConvertidos = converterInputParaTemplateComercial(dados)
  return gerarHTMLPropostaTecnicoComercial(dadosConvertidos)
}

/**
 * Abre a proposta de energia solar em uma nova aba do navegador no novo modelo com 6 seções.
 */
export function abrirPropostaSolarEmNovaAba(dados: PropostaSolarPDFInput): void {
  const html = gerarHTMLPropostaSolar(dados)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}

/**
 * Faz download do arquivo HTML estilizado da proposta solar (novo modelo com 6 seções).
 */
export function baixarPropostaSolarHTML(dados: PropostaSolarPDFInput): void {
  const html = gerarHTMLPropostaSolar(dados)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const safeName = (dados?.cliente?.nome || 'Cliente').replace(/[^a-zA-Z0-9]/g, '_')
  const a = document.createElement('a')
  a.href = url
  a.download = `Proposta_Solar_Delfos_${safeName}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
