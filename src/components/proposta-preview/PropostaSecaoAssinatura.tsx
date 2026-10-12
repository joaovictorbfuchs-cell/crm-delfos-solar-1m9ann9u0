import React from 'react'
import type { PropostaSolarPDFInput } from '@/lib/propostaSolarGenerator'
import { FileSignature, ShieldCheck, CheckSquare } from 'lucide-react'

export interface PropostaSecaoAssinaturaProps {
  propostaData: PropostaSolarPDFInput
  onEdit?: () => void
}

/**
 * Seção individual do Preview: Bloco de Assinatura & Termo de Aceite
 * Identificável pelo recurso "Selecionar Elementos".
 */
export const PropostaSecaoAssinatura: React.FC<PropostaSecaoAssinaturaProps> = ({
  propostaData,
  onEdit,
}) => {
  const cliente = propostaData.cliente
  const empresa = propostaData.empresa
  const conteudo = propostaData.conteudo

  const nomeCliente = cliente?.nome || 'Cliente Selecionado'
  const docCliente = cliente?.cpfOuCnpj || 'Documento não informado'
  const responsavelTecnico = empresa?.responsavelTecnico || 'João Victor Bagetti Fuchs'
  const creaResponsavel = empresa?.crea || 'CREA-RS 240.718'
  const razaoSocialEmpresa = empresa?.razaoSocial || 'DELFOS ENGENHARIA LTDA'
  const cnpjEmpresa = empresa?.cnpj || '21.379.952/0001-38'

  const avisoLegal =
    conteudo?.secaoInvestimento?.avisoLegalRodape ||
    'De acordo com as condições técnicas e comerciais propostas'

  const hoje = new Date()
  const dataHojeStr = hoje.toLocaleDateString('pt-BR')

  return (
    <section
      id="preview-secao-bloco-assinatura"
      data-section="bloco-assinatura"
      data-section-title="Bloco de Assinatura e Termo de Aceite"
      className="relative bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs hover:border-emerald-500 hover:ring-1 hover:ring-emerald-500/30 transition-all p-5"
    >
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-200">
            <FileSignature className="w-4 h-4 text-indigo-700" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
              Termo de Aceite &amp; Assinaturas
            </h3>
            <p className="text-[11px] text-gray-500">
              Formalização da proposta técnico-comercial entre as partes
            </p>
          </div>
        </div>

        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-md transition-colors"
          >
            Editar Assinatura
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-5">
        {/* Assinatura da Empresa Contratada */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
              <span>Empresa Contratada</span>
              <span className="text-slate-400 font-medium">Erechim / RS, {dataHojeStr}</span>
            </div>

            {/* Linha de Assinatura */}
            <div className="mt-8 pt-2 border-t-2 border-slate-400 text-center">
              <div className="text-xs font-black text-slate-900 uppercase">
                {responsavelTecnico}
              </div>
              <div className="text-[11px] font-semibold text-emerald-800">
                Responsável Técnico — {creaResponsavel}
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-dashed border-slate-200 text-[10px] text-slate-500 space-y-0.5">
            <div>
              <strong>Razão Social:</strong> {razaoSocialEmpresa} (Delfos Solar)
            </div>
            <div>
              <strong>CNPJ:</strong> {cnpjEmpresa}
            </div>
          </div>
        </div>

        {/* Assinatura do Cliente / Contratante */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[10px] font-bold text-blue-800 uppercase tracking-wider">
              <span>Cliente / Contratante</span>
              <span className="text-slate-400 font-medium">Local e data: ___/___/______</span>
            </div>

            {/* Linha de Assinatura */}
            <div className="mt-8 pt-2 border-t-2 border-slate-400 text-center">
              <div className="text-xs font-black text-slate-900 uppercase">
                {nomeCliente}
              </div>
              <div className="text-[11px] font-semibold text-blue-800">
                {avisoLegal}
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-dashed border-slate-200 text-[10px] text-slate-500 space-y-0.5">
            <div>
              <strong>Nome / Razão Social:</strong> {nomeCliente}
            </div>
            <div>
              <strong>CPF / CNPJ:</strong> {docCliente}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Proposta registrada e protegida sob responsabilidade técnica Delfos Solar.</span>
        </span>
        <span className="flex items-center gap-1">
          <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
          <span>Válido como documento pré-contratual</span>
        </span>
      </div>
    </section>
  )
}

export default PropostaSecaoAssinatura
