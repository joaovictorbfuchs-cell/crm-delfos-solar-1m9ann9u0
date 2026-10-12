import React from 'react'
import type { PropostaSolarPDFInput } from '@/lib/propostaSolarGenerator'
import type { PropostaTecnicoComercialDados } from '@/lib/propostaTecnicoComercialGenerator'
import { TrendingUp, Award, Calendar, AlertTriangle } from 'lucide-react'

export type PropostaSecaoDados = PropostaSolarPDFInput | PropostaTecnicoComercialDados | any

export interface PropostaSecaoProjecaoProps {
  propostaData: PropostaSecaoDados
  onEdit?: () => void
}

/**
 * Seção individual do Preview: Projeção de Economia & Payback (1 ano, 5 anos, 25 anos)
 * Identificável pelo recurso "Selecionar Elementos".
 */
export const PropostaSecaoProjecao: React.FC<PropostaSecaoProjecaoProps> = ({
  propostaData,
  onEdit,
}) => {
  const producaoAny = (propostaData as any)?.producao
  const financeiroAny = (propostaData as any)?.financeiro
  const projecaoAny = (propostaData as any)?.projecao
  const economiaAny = (propostaData as any)?.economia
  const calculosAny = (propostaData as any)?.calculos
  const conteudo = propostaData.conteudo

  const economiaMensal =
    producaoAny?.economiaMensalEstimada ||
    projecaoAny?.economia1Mes ||
    calculosAny?.economia1Mes ||
    0
  const paybackMeses =
    financeiroAny?.paybackMeses || economiaAny?.paybackMeses || calculosAny?.paybackMeses || 36
  const paybackAnos = (paybackMeses / 12).toFixed(1).replace('.', ',')

  const eco1Ano =
    projecaoAny?.economia1Ano ||
    financeiroAny?.economia1Ano ||
    calculosAny?.economia1Ano ||
    Math.round(economiaMensal * 12)
  const eco5Anos =
    projecaoAny?.economia5Anos ||
    financeiroAny?.economia5Anos ||
    calculosAny?.economia5Anos ||
    Math.round(economiaMensal * 60 * 1.08)
  const eco25Anos =
    projecaoAny?.economia25Anos ||
    financeiroAny?.economia25Anos ||
    calculosAny?.economia25Anos ||
    Math.round(economiaMensal * 300 * 1.25)

  const tituloSecao = conteudo?.secaoProjecao25Anos?.titulo || 'Projeção de Economia em 25 Anos'
  const subtituloSecao =
    conteudo?.secaoProjecao25Anos?.subtitulo ||
    'Retorno financeiro sólido e previsível gerado pelo seu próprio sistema.'

  const formatarMoeda = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <section
      id="preview-secao-projecao-economia"
      data-section="projecao-economia"
      data-section-title="Projeção de Economia e Payback"
      className="relative bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs hover:border-emerald-500 hover:ring-1 hover:ring-emerald-500/30 transition-all p-5"
    >
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200">
            <TrendingUp className="w-4 h-4 text-teal-700" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
              {tituloSecao}
            </h3>
            <p className="text-[11px] text-gray-500">{subtituloSecao}</p>
          </div>
        </div>

        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-md transition-colors"
          >
            Editar Projeção
          </button>
        )}
      </div>

      {/* Grid de 3 Cards de Marcos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-4">
        {/* 1 Ano */}
        <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl">
          <div className="flex items-center justify-between text-emerald-800 text-[10px] font-bold uppercase">
            <span>Curto Prazo</span>
            <Calendar className="w-3.5 h-3.5" />
          </div>
          <div className="text-xs font-bold text-emerald-900 mt-1">Economia em 1 Ano</div>
          <div className="text-xl font-black text-emerald-950 mt-1.5">{formatarMoeda(eco1Ano)}</div>
          <p className="text-[11px] text-emerald-800/80 mt-1">
            Redução direta nas 12 primeiras faturas
          </p>
        </div>

        {/* 5 Anos / Payback */}
        <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl">
          <div className="flex items-center justify-between text-amber-800 text-[10px] font-bold uppercase">
            <span>Médio Prazo</span>
            <Award className="w-3.5 h-3.5" />
          </div>
          <div className="text-xs font-bold text-amber-900 mt-1">Economia em 5 Anos</div>
          <div className="text-xl font-black text-amber-950 mt-1.5">{formatarMoeda(eco5Anos)}</div>
          <p className="text-[11px] text-amber-800/80 mt-1">
            Payback estimado em ≈ <strong className="text-amber-950">{paybackAnos} anos</strong>
          </p>
        </div>

        {/* 25 Anos / Vida Útil */}
        <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-xl">
          <div className="flex items-center justify-between text-blue-800 text-[10px] font-bold uppercase">
            <span>Longo Prazo</span>
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <div className="text-xs font-bold text-blue-900 mt-1">Economia em 25 Anos</div>
          <div className="text-xl font-black text-blue-950 mt-1.5">{formatarMoeda(eco25Anos)}</div>
          <p className="text-[11px] text-blue-800/80 mt-1">
            Patrimônio acumulado com reajuste tarifário
          </p>
        </div>
      </div>

      {/* Box de Custo de Postergação / Payback */}
      <div className="mt-3.5 p-3.5 bg-gradient-to-r from-amber-50 to-orange-50/40 border border-amber-200 rounded-xl flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <div className="text-xs font-bold text-amber-950">
            Não adie sua economia: retorno a cada mês de operação
          </div>
          <p className="text-[11px] text-amber-900 mt-0.5 leading-relaxed">
            A cada mês sem energia solar, cerca de{' '}
            <strong className="text-amber-950">{formatarMoeda(economiaMensal)}</strong> são
            desembolsados diretamente à concessionária sem qualquer retorno patrimonial.
          </p>
        </div>
      </div>
    </section>
  )
}

export default PropostaSecaoProjecao
