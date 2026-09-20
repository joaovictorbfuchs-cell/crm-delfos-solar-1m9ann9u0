import React, { useMemo } from 'react'
import { Clock } from 'lucide-react'

export interface CardPaybackEstimadoProps {
  /** Payback em meses (calculado ou persistido no orçamento) */
  paybackMeses?: number | null
  /** Texto personalizado de payback (ex: '4 anos e 2 meses') */
  paybackTexto?: string | null
  /** Valor do investimento total (R$) para cálculo de payback se meses não fornecido */
  valorInvestimento?: number | null
  /** Economia mensal ou valor perdido por mês para estimar o payback se meses não fornecido */
  economiaMensal?: number | null
  /** Ano inicial de referência para quitação prevista (default: ano atual ou 2026) */
  anoInicial?: number | null
  /** Se deve renderizar em linha/formato mais compacto ou card completo */
  compacto?: boolean
  className?: string
}

export const CardPaybackEstimado: React.FC<CardPaybackEstimadoProps> = ({
  paybackMeses,
  paybackTexto,
  valorInvestimento,
  economiaMensal,
  anoInicial = 2026,
  compacto = false,
  className = '',
}) => {
  const infoPayback = useMemo(() => {
    let mesesTotais =
      paybackMeses !== undefined && paybackMeses !== null && paybackMeses > 0
        ? paybackMeses
        : valorInvestimento && valorInvestimento > 0 && economiaMensal && economiaMensal > 0
          ? Math.round((valorInvestimento / economiaMensal) * 10) / 10
          : 21

    if (paybackTexto && paybackTexto.trim()) {
      const matchAnos = paybackTexto.match(/(\d+(?:[.,]\d+)?)\s*(?:anos?|a)/i)
      const matchMeses = paybackTexto.match(/(\d+)\s*m[eê]s(?:es)?/i)
      if (matchAnos && matchAnos[1]) {
        const anos = parseFloat(matchAnos[1].replace(',', '.'))
        const mesesExtra = matchMeses && matchMeses[1] ? parseInt(matchMeses[1], 10) : 0
        mesesTotais = anos * 12 + mesesExtra
      } else if (matchMeses && matchMeses[1]) {
        mesesTotais = parseInt(matchMeses[1], 10)
      }
    }

    const anoBase = anoInicial || new Date().getFullYear()
    const anoCalendario = anoBase + Math.max(1, Math.ceil(mesesTotais / 12))
    const texto = `${Math.round(mesesTotais)} meses`

    return {
      texto,
      anos: Math.floor(mesesTotais / 12),
      meses: Math.round(mesesTotais % 12),
      anoCalendario,
      mesesTotais,
    }
  }, [paybackTexto, paybackMeses, valorInvestimento, economiaMensal, anoInicial])

  if (compacto) {
    return (
      <div
        className={`bg-gradient-to-br from-amber-50/80 to-amber-100/50 rounded-xl p-3 sm:p-3.5 border border-amber-400 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 relative overflow-hidden ${className}`}
        aria-label="Payback Estimado"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center shrink-0 shadow-2xs">
            <Clock className="w-4 h-4 text-amber-700" />
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2 whitespace-nowrap">
              <span className="text-[10px] font-extrabold uppercase tracking-wide text-amber-900 whitespace-nowrap">
                Payback do Sistema:
              </span>
              <span className="text-base sm:text-lg font-black text-amber-700 tracking-tight leading-tight whitespace-nowrap">
                {infoPayback.texto}
              </span>
            </div>
            <p className="text-[10.5px] text-amber-900/80 leading-snug">
              Tempo para que a economia na fatura pague 100% do investimento. Após o retorno, todo o
              ganho vira lucro líquido direto.
            </p>
          </div>
        </div>

        {infoPayback.anoCalendario && (
          <div className="bg-white border border-amber-300 rounded-lg px-2.5 py-1 text-center sm:text-right shrink-0 w-full sm:w-auto shadow-2xs whitespace-nowrap">
            <span className="text-[10px] font-bold text-amber-900 block whitespace-nowrap">
              Quitação prevista: ~{infoPayback.anoCalendario}
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={`bg-gradient-to-br from-amber-50/70 to-amber-100/40 rounded-2xl p-3.5 sm:p-4 border-2 border-amber-400/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative overflow-hidden ${className}`}
      aria-label="Payback Estimado"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center shrink-0 shadow-2xs">
          <Clock className="w-5 h-5 text-amber-700" />
        </div>
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-baseline gap-2 whitespace-nowrap">
            <span className="text-[11px] uppercase font-black text-amber-900 tracking-wide whitespace-nowrap">
              Payback do Sistema:
            </span>
            <span className="text-xl sm:text-2xl font-black text-amber-700 tracking-tight leading-tight whitespace-nowrap">
              {infoPayback.texto}
            </span>
          </div>
          <p className="text-xs text-amber-950/80 leading-snug max-w-xl">
            Tempo para que a economia na fatura pague 100% do investimento. Após esse prazo, toda a
            economia gerada passa a ser lucro líquido direto.
          </p>
        </div>
      </div>

      {infoPayback.anoCalendario && (
        <div className="bg-white border border-amber-300 rounded-xl px-3 py-1.5 text-center sm:text-right shrink-0 w-full sm:w-auto shadow-2xs whitespace-nowrap self-end sm:self-center">
          <span className="text-[11px] font-bold text-amber-900 block whitespace-nowrap">
            Quitação prevista: ~{infoPayback.anoCalendario}
          </span>
        </div>
      )}
    </div>
  )
}

export default CardPaybackEstimado
