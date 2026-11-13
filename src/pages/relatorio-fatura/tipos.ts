/** Tipos compartilhados das seções do relatório de fatura. */
export interface GdCalculada {
  injetada: number
  compensadosMesAtual: number
  saldoGeradoNaoUsado: number
  saldoAtualInstalacao: number
  participacao: number
  retidoPercent: number
  kwhEnviados: number
  detalheFluxo: string
}

export interface ConsumoHistoricoItem {
  mes: string
  consumo_kwh: number
  dias_ciclo?: number
  isMax?: boolean
  isMin?: boolean
}
