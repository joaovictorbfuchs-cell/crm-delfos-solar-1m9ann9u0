import React from 'react'
import type { PropostaSolarPDFInput } from '@/lib/propostaSolarGenerator'
import { Zap, Sun, ShieldCheck, Box, Maximize2 } from 'lucide-react'

export interface PropostaSecaoSistemaProps {
  propostaData: PropostaSolarPDFInput
  onEdit?: () => void
}

/**
 * Seção individual do Preview: Descrição do Sistema (Potência, Módulos/Placas, Inversores, Área, Garantias)
 * Identificável pelo recurso "Selecionar Elementos".
 */
export const PropostaSecaoSistema: React.FC<PropostaSecaoSistemaProps> = ({
  propostaData,
  onEdit,
}) => {
  const sistema = propostaData.sistema
  const producao = propostaData.producao
  const conteudo = propostaData.conteudo

  const potenciaKwp = sistema?.potenciaKwp || 0
  const mediaMensalKwh = producao?.mediaMensalKwh || 0
  const qtdPaineis = sistema?.qtdPaineis || 0
  const potenciaPlacaWp = sistema?.potenciaPlacaWp || 0
  const descPaineis = sistema?.descricaoPaineis || `${qtdPaineis}x Módulos Fotovoltaicos Tier-1`
  const qtdInversores = sistema?.qtdInversores || 1
  const descInversores = sistema?.descricaoInversores || 'Inversor Solar Homologado'
  const areaM2 = sistema?.areaNecessariaM2 || (qtdPaineis > 0 ? Number((qtdPaineis * 2.2).toFixed(1)) : 0)

  const garantiaModulos = sistema?.garantiaPaineisAnos || 25
  const garantiaInversor = sistema?.garantiaInversorAnos || 10
  const garantiaInstalacao = sistema?.garantiaInstalacaoAnos || 5

  const tituloSecao = conteudo?.secaoSeuSistema?.titulo || 'Seu Sistema Fotovoltaico'
  const subtituloSecao =
    conteudo?.secaoSeuSistema?.subtitulo ||
    'Equipamentos de alta tecnologia selecionados sob medida para o seu perfil de consumo.'

  return (
    <section
      id="preview-secao-descricao-sistema"
      data-section="descricao-sistema"
      data-section-title="Descrição do Sistema Fotovoltaico"
      className="relative bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs hover:border-emerald-500 hover:ring-1 hover:ring-emerald-500/30 transition-all p-5"
    >
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
            <Zap className="w-4 h-4 text-amber-600" />
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
            Editar Sistema
          </button>
        )}
      </div>

      {/* Grid de Cards com Equipamentos e Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4">
        {/* Potência Nominal */}
        <div className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-800 text-[10px] font-bold uppercase">
            <span>Potência Nominal</span>
            <Zap className="w-3.5 h-3.5" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-extrabold text-amber-950">
              {potenciaKwp.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-bold text-amber-800 ml-1">kWp</span>
          </div>
          <div className="text-[11px] text-amber-900/80 mt-1 font-medium">
            Geração estimada: ≈ {Math.round(mediaMensalKwh).toLocaleString('pt-BR')} kWh/mês
          </div>
        </div>

        {/* Módulos / Placas */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-700 text-[10px] font-bold uppercase">
            <span>Módulos Fotovoltaicos</span>
            <Sun className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-extrabold text-slate-900">
              {qtdPaineis}
            </span>
            <span className="text-xs font-bold text-slate-600 ml-1">
              unidades {potenciaPlacaWp ? `(${potenciaPlacaWp}W)` : ''}
            </span>
          </div>
          <div className="text-[11px] text-slate-600 mt-1 line-clamp-2" title={descPaineis}>
            {descPaineis}
          </div>
          <div className="text-[10px] font-semibold text-emerald-700 mt-2 pt-2 border-t border-slate-200">
            Garantia: {garantiaModulos} anos
          </div>
        </div>

        {/* Inversores */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-700 text-[10px] font-bold uppercase">
            <span>Inversor Solar</span>
            <Box className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-extrabold text-slate-900">
              {qtdInversores}
            </span>
            <span className="text-xs font-bold text-slate-600 ml-1">
              {qtdInversores > 1 ? 'unidades' : 'unidade'}
            </span>
          </div>
          <div className="text-[11px] text-slate-600 mt-1 line-clamp-2" title={descInversores}>
            {descInversores}
          </div>
          <div className="text-[10px] font-semibold text-teal-700 mt-2 pt-2 border-t border-slate-200">
            Garantia: {garantiaInversor} anos
          </div>
        </div>

        {/* Área & Instalação */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-700 text-[10px] font-bold uppercase">
            <span>Área &amp; Engenharia</span>
            <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-extrabold text-slate-900">
              {areaM2}
            </span>
            <span className="text-xs font-bold text-slate-600 ml-1">m² estimados</span>
          </div>
          <div className="text-[11px] text-slate-600 mt-1">
            Fixação estrutural com proteção contra intempéries
          </div>
          <div className="text-[10px] font-semibold text-blue-700 mt-2 pt-2 border-t border-slate-200 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            <span>Garantia de montagem: {garantiaInstalacao} anos</span>
          </div>
        </div>
      </div>
    </section>
  )
}

export default PropostaSecaoSistema
