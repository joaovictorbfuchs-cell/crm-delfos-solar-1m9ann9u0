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
    if (paybackTexto && paybackTexto.trim()) {
      // Extrair ano estimado se possível ou derivar
      const anoBase = anoInicial || new Date().getFullYear()
      let anoCalendario: number | null = null
      const matchAnos = paybackTexto.match(/(\d+)\s*(?:anos?|a)/i)
      if (matchAnos && matchAnos[1]) {
        anoCalendario = anoBase + parseInt(matchAnos[1], 10)
      } else {
        anoCalendario = anoBase + 2
      }
      return {
        texto: paybackTexto,
        anos: null,
        meses: null,
        anoCalendario,
      }
    }

    const mesesTotais =
      paybackMeses !== undefined && paybackMeses !== null && paybackMeses > 0
        ? paybackMeses
        : valorInvestimento && valorInvestimento > 0 && economiaMensal && economiaMensal > 0
          ? Math.round((valorInvestimento / economiaMensal) * 10) / 10
          : 21

    const anos = Math.floor(mesesTotais / 12)
    const meses = Math.round(mesesTotais % 12)
    const anoBase = anoInicial || new Date().getFullYear()
    const anoCalendario = anoBase + Math.max(1, Math.ceil(mesesTotais / 12))

    let texto = `${anos} anos`
    if (anos === 1) texto = '1 ano'
    if (anos === 0) texto = `${meses} meses`
    else if (meses > 0) {
      texto = `${anos} ${anos === 1 ? 'ano' : 'anos'} e ${meses} ${meses === 1 ? 'mês' : 'meses'}`
    }

    return {
      texto,
      anos,
      meses,
      anoCalendario,
      mesesTotais,
    }
  }, [paybackTexto, paybackMeses, valorInvestimento, economiaMensal, anoInicial])

  if (compacto) {
    return (
      <div
        className={`bg-white rounded-2xl p-4 sm:p-5 border-2 border-amber-400/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative overflow-hidden ${className}`}
        aria-label="Payback Estimado"
      >
        <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-amber-400/10 rounded-full pointer-events-none" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center shrink-0 shadow-2xs">
            <Clock className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200">
                Tempo de Retorno do Investimento
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Retorno Garantido
              </span>
            </div>
            <h4 className="text-xs sm:text-sm font-bold text-gray-800 mt-0.5">Payback Estimado</h4>
            <p className="text-[11px] text-gray-600 leading-snug">
              Após o retorno, 100% da economia torna-se lucro líquido direto e patrimônio próprio.
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-300 rounded-xl px-4 py-2 text-center sm:text-right shrink-0 w-full sm:w-auto shadow-2xs">
          <span className="text-[9px] uppercase font-bold text-amber-800 block">
            Payback do Sistema
          </span>
          <div className="text-xl sm:text-2xl font-black text-amber-700 tracking-tight leading-tight">
            {infoPayback.texto}
          </div>
          {infoPayback.anoCalendario && (
            <span className="text-[10px] font-semibold text-amber-900 block">
              Quitação prevista: ~{infoPayback.anoCalendario}
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`bg-white rounded-2xl p-5 sm:p-6 border-2 border-amber-400/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden ${className}`}
      aria-label="Payback Estimado"
    >
      <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-amber-400/10 rounded-full pointer-events-none" />
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center shrink-0 shadow-2xs">
          <Clock className="w-6 h-6 text-amber-700" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200">
              Tempo de Retorno do Investimento
            </span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              Retorno Garantido
            </span>
          </div>
          <h4 className="text-sm font-bold text-gray-800">Payback Estimado</h4>
          <p className="text-xs text-gray-600 max-w-xl leading-relaxed">
            Tempo necessário para que a economia na conta de energia pague 100% do investimento no
            sistema solar. Após esse prazo, toda a economia gerada passa a ser lucro líquido direto.
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-300 rounded-xl p-3.5 sm:p-4 text-center sm:text-right shrink-0 w-full sm:w-auto shadow-2xs">
        <span className="text-[10px] uppercase font-bold text-amber-800 block">
          Payback do Sistema
        </span>
        <div className="text-2xl sm:text-3xl font-black text-amber-700 tracking-tight my-0.5">
          {infoPayback.texto}
        </div>
        {infoPayback.anoCalendario && (
          <span className="text-[11px] font-semibold text-amber-900 block">
            Quitação prevista: ~{infoPayback.anoCalendario}
          </span>
        )}
      </div>
    </div>
  )
}

export default CardPaybackEstimado
