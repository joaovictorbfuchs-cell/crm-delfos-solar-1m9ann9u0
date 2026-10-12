import React from 'react'
import type { PropostaSolarPDFInput } from '@/lib/propostaSolarGenerator'
import type { PropostaTecnicoComercialDados } from '@/lib/propostaTecnicoComercialGenerator'
import { User, MapPin, Briefcase, Phone, Mail } from 'lucide-react'

export type PropostaSecaoDados = PropostaSolarPDFInput | PropostaTecnicoComercialDados | any

export interface PropostaSecaoClienteProps {
  propostaData: PropostaSecaoDados
  onEdit?: () => void
}

/**
 * Seção individual do Preview: Dados do Cliente & Consultor
 * Identificável pelo recurso "Selecionar Elementos".
 */
export const PropostaSecaoCliente: React.FC<PropostaSecaoClienteProps> = ({
  propostaData,
  onEdit,
}) => {
  const cliente = propostaData.cliente
  const consultor = (propostaData as any)?.consultor
  const conteudo = propostaData.conteudo
  const rotuloPrep =
    conteudo?.capa?.rotuloPreparadaPara || 'Proposta preparada exclusivamente para:'
  const rotuloConsultor = conteudo?.capa?.rotuloConsultor || 'Consultor Técnico Delfos:'

  const nomeCliente = cliente?.nome || 'Cliente Selecionado'
  const municipioOuCidade = (cliente as any)?.municipio || (cliente as any)?.cidade || 'Erechim'
  const cidadeCliente = (cliente as any)?.cidade || (cliente as any)?.municipio || 'Erechim'
  const estadoCliente = (cliente as any)?.estado || 'RS'
  const enderecoCliente = cliente?.endereco
  const tipoCliente =
    (cliente as any)?.tipo ||
    (cliente as any)?.tipoImovel ||
    (cliente as any)?.tipoCliente ||
    'Residencial'

  return (
    <section
      id="preview-secao-dados-cliente"
      data-section="dados-cliente"
      data-section-title="Dados do Cliente e Consultor"
      className="relative bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs hover:border-emerald-500 hover:ring-1 hover:ring-emerald-500/30 transition-all p-5"
    >
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
            <User className="w-4 h-4 text-emerald-700" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
              Dados do Cliente
            </h3>
            <p className="text-[11px] text-gray-500">{rotuloPrep}</p>
          </div>
        </div>

        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-md transition-colors"
          >
            Editar Dados
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
        {/* Bloco Cliente */}
        <div className="bg-slate-50 border-l-4 border-amber-500 rounded-r-lg p-3.5 space-y-1">
          <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
            Destinatário / Titular da Usina
          </div>
          <div className="text-sm sm:text-base font-extrabold text-slate-900">{nomeCliente}</div>
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              {enderecoCliente ? `${enderecoCliente} • ` : ''}
              {municipioOuCidade.includes('/')
                ? municipioOuCidade
                : `${cidadeCliente} / ${estadoCliente}`}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Enquadramento: <strong className="text-slate-700">{tipoCliente}</strong>
            {cliente?.cpfOuCnpj ? ` • Doc: ${cliente.cpfOuCnpj}` : ''}
          </div>
        </div>

        {/* Bloco Consultor */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              <Briefcase className="w-3.5 h-3.5 text-slate-500" />
              <span>{rotuloConsultor}</span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-slate-900 mt-1">
              {consultor?.nome ||
                (propostaData as any)?.representanteComercial ||
                (propostaData as any)?.representante?.nome ||
                'Equipe Delfos Engenharia'}
            </div>
            {(consultor?.telefone || (propostaData as any)?.representante?.contato) && (
              <div className="flex items-center gap-1 text-xs text-slate-600 mt-0.5">
                <Phone className="w-3 h-3 text-slate-400" />
                <span>{consultor?.telefone || (propostaData as any)?.representante?.contato}</span>
              </div>
            )}
            {consultor?.email && (
              <div className="flex items-center gap-1 text-xs text-slate-600 mt-0.5">
                <Mail className="w-3 h-3 text-slate-400" />
                <span>{consultor.email}</span>
              </div>
            )}
          </div>
          <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-200 mt-2">
            Validade: {propostaData.validadeDias || 10} dias a partir da emissão
          </div>
        </div>
      </div>
    </section>
  )
}

export default PropostaSecaoCliente
