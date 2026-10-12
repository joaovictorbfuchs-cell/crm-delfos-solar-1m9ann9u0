import React from 'react'
import type { PropostaSolarPDFInput } from '@/lib/propostaSolarGenerator'
import type { PropostaTecnicoComercialDados } from '@/lib/propostaTecnicoComercialGenerator'
import { logoOficialPngAsset } from '@/lib/propostaIlustracoesAssets'

export type PropostaSecaoDados = PropostaSolarPDFInput | PropostaTecnicoComercialDados | any

export interface PropostaSecaoHeaderProps {
  propostaData: PropostaSecaoDados
  onEdit?: () => void
}

/**
 * Seção individual do Preview: Cabeçalho & Logo / Capa
 * Identificável pelo recurso "Selecionar Elementos".
 */
export const PropostaSecaoHeader: React.FC<PropostaSecaoHeaderProps> = ({
  propostaData,
  onEdit,
}) => {
  const conteudo = propostaData.conteudo
  const capaBadge = conteudo?.capa?.badge || 'PROPOSTA TÉCNICO-COMERCIAL'
  const corDestaque = conteudo?.capa?.corDestaque || '#F59E0B'
  const titulo = conteudo?.capa?.titulo || 'ENERGIA SOLAR FOTOVOLTAICA'
  const subtitulo =
    conteudo?.capa?.subtitulo ||
    'Redução de até 95% na sua fatura de energia com engenharia de excelência e tecnologia de ponta.'

  return (
    <section
      id="preview-secao-cabecalho-logo"
      data-section="cabecalho-logo"
      data-section-title="Cabeçalho e Logo Delfos Solar"
      className="relative bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs hover:border-emerald-500 hover:ring-1 hover:ring-emerald-500/30 transition-all p-5"
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200/80 p-1.5 flex items-center justify-center shrink-0 shadow-xs">
            <img
              src={logoOficialPngAsset}
              alt="Delfos Solar"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black tracking-tight text-slate-900">
                DELFOS SOLAR
              </span>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full text-amber-950 uppercase"
                style={{ backgroundColor: corDestaque }}
              >
                {capaBadge}
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium">
              Engenharia &amp; Soluções Fotovoltaicas • Erechim / RS
            </p>
          </div>
        </div>

        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-md transition-colors self-end sm:self-center"
          >
            Editar Cabeçalho
          </button>
        )}
      </div>

      <div className="pt-4">
        <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-tight">{titulo}</h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
          {subtitulo}
        </p>
      </div>
    </section>
  )
}

export default PropostaSecaoHeader
