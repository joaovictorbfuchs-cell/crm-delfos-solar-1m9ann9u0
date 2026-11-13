/**
 * Construção das linhas do quadro "Demonstrativo do Ciclo" do relatório de fatura.
 * Uma linha por parcela (itens_faturados), tributos consolidados, total faturado
 * e total a pagar. Itens de crédito (valor negativo) viram abatimento em verde;
 * itens fora do padrão (financiamento, parcelamento, aluguel...) ganham destaque
 * âmbar com badge "Parcela atípica".
 */
import { safeArr, safeObj, num, safeStr } from './safeGuards'

export interface LinhaParcela {
  nome: string
  descricao: string
  kwh: number | null
  valor: number
  isCredito: boolean
  isFioB: boolean
  isAtipica: boolean
  isBandeira: boolean
  origemFioB: 'fatura' | 'estimativa' | null
}

export interface LinhaImposto {
  sigla: string
  rotulo: string
  valor: number
}

const rotulosImposto: Record<string, string> = {
  icms: 'ICMS — Imposto sobre Circulação de Mercadorias',
  pis: 'PIS/PASEP — Programa de Integração Social',
  cofins: 'COFINS — Contribuição para o Financiamento da Seguridade',
}

const normalizar = (s: unknown): string =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

/** Classifica o item como crédito (abatimento) a partir do valor e do nome. */
export const isItemCredito = (valor: number, nome: string): boolean =>
  valor < 0 || /cred|bonus|desconto|abatimento|ajuste saldo/.test(normalizar(nome))

/** Detecta parcela atípica: qualquer nome fora do conjunto padrão de uma fatura. */
export const isItemAtipica = (nome: string): boolean => {
  const n = normalizar(nome)
  if (
    /tusd|consumo(?!.*cred)|energia.*injetad|energia ativa|iluminacao publica|bandeira|fio b|cred/.test(
      n,
    )
  )
    return false
  if (/bonus|ajuste saldo/.test(n)) return false
  if (/financiamento|parcelamento|aluguel|locacao|seguro|outros servicos|servico/.test(n))
    return true
  return true // qualquer item não reconhecido é tratado como atípico
}

export interface DemonstrativoCiclo {
  parcelas: LinhaParcela[]
  impostos: LinhaImposto[]
  totalTributos: number
  totalFaturado: number
  totalPagar: number
  temBandeira: boolean
  bandeiraCor: string
  bandeiraAdicional: number
}

export function construirDemonstrativo(dados: unknown): DemonstrativoCiclo {
  const d = safeObj(dados)
  const itens = safeArr(d.itens_faturados)
  const totais = safeObj(d.totais)
  const impostosRaw = safeObj(d.impostos)
  const impostosAtuais = safeObj(impostosRaw.impostos_atuais)
  const fioB = safeObj(d.fio_b)
  const bandeira = safeObj(totais.bandeira_tarifaria)

  // Formato antigo: impostos.impostos_atuais.x_total_rs; formato novo (v0.0.1689): direto em impostos
  const valorIcms = num(impostosAtuais.icms_total_rs) || num(impostosRaw.icms_total_rs)
  const valorPis = num(impostosAtuais.pis_total_rs) || num(impostosRaw.pis_total_rs)
  const valorCofins = num(impostosAtuais.cofins_total_rs) || num(impostosRaw.cofins_total_rs)

  const parcelas: LinhaParcela[] = itens.map((itRaw) => {
    const it = safeObj(itRaw)
    const valor = num(it.valor_total_rs)
    const nome = safeStr(it.item, 'Item sem descrição')
    const isFioB = it.fio_b === true || /fio b/.test(normalizar(nome))
    return {
      nome,
      descricao: safeStr(it.descricao) || montarDescricaoItem(it, isFioB),
      kwh:
        it.quantidade_kwh !== null && it.quantidade_kwh !== undefined
          ? num(it.quantidade_kwh)
          : null,
      valor,
      isCredito: isItemCredito(valor, nome),
      isFioB,
      isAtipica: isItemAtipica(nome) && !isFioB,
      isBandeira: /bandeira/.test(normalizar(nome)),
      origemFioB: isFioB ? (fioB.origem === 'fatura' ? 'fatura' : 'estimativa') : null,
    }
  })

  const totalFaturado =
    num(totais.total_distribuidora_rs) ||
    num(totais.total_a_pagar_rs) ||
    parcelas.reduce((acc, p) => acc + p.valor, 0)
  const totalPagar = num(totais.total_a_pagar_rs) || totalFaturado

  return {
    parcelas,
    impostos: [
      { sigla: 'ICMS', rotulo: rotulosImposto.icms, valor: valorIcms },
      { sigla: 'PIS', rotulo: rotulosImposto.pis, valor: valorPis },
      { sigla: 'COFINS', rotulo: rotulosImposto.cofins, valor: valorCofins },
    ].filter((t) => t.valor > 0),
    totalTributos: valorIcms + valorPis + valorCofins,
    totalFaturado,
    totalPagar,
    temBandeira: !!bandeira.cor || num(bandeira.valor_adicional_rs) > 0,
    bandeiraCor: safeStr(bandeira.cor, 'Não informada'),
    bandeiraAdicional: num(bandeira.valor_adicional_rs),
  }
}

/** Descrição explicativa para itens sem descrição própria (usada no destaque atípico). */
function montarDescricaoItem(it: Record<string, any>, isFioB: boolean): string {
  if (isFioB) {
    return 'Custo de Uso do Sistema de Distribuição (Fio B) incidente sobre a energia injetada e compensada — transição prevista na Lei 14.300/2022.'
  }
  const alq = num(it.icms?.aliquota)
  if (alq > 0) {
    return `Parcela faturada pela distribuidora neste ciclo (alíquota de ICMS de ${alq.toLocaleString('pt-BR')}%).`
  }
  return 'Parcela faturada pela distribuidora neste ciclo.'
}
