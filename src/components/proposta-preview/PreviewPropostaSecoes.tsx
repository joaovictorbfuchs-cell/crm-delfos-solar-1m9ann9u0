import React, { useState } from 'react'
import type { PropostaSolarPDFInput } from '@/lib/propostaSolarGenerator'
import { PropostaSecaoHeader } from './PropostaSecaoHeader'
import { PropostaSecaoCliente } from './PropostaSecaoCliente'
import { PropostaSecaoSistema } from './PropostaSecaoSistema'
import { PropostaSecaoInvestimento } from './PropostaSecaoInvestimento'
import { PropostaSecaoProjecao } from './PropostaSecaoProjecao'
import { PropostaSecaoAssinatura } from './PropostaSecaoAssinatura'
import { Layers, MousePointerClick, Check } from 'lucide-react'

export interface PreviewPropostaSecoesProps {
  propostaData: PropostaSolarPDFInput
  onSelectSecao?: (secaoId: string) => void
}

/**
 * Componente container do Preview da Proposta Solar estruturado em seções individuais e editáveis.
 * Permite que cada parte seja selecionada e editada individualmente pelo Selecionar Elementos.
 */
export const PreviewPropostaSecoes: React.FC<PreviewPropostaSecoesProps> = ({
  propostaData,
  onSelectSecao,
}) => {
  const [secaoAtiva, setSecaoAtiva] = useState<string | null>(null)

  const handleSelect = (secaoId: string) => {
    setSecaoAtiva(secaoId)
    onSelectSecao?.(secaoId)
  }

  const secoes = [
    { id: 'cabecalho-logo', nome: 'Cabeçalho / Logo' },
    { id: 'dados-cliente', nome: 'Dados do Cliente' },
    { id: 'descricao-sistema', nome: 'Descrição do Sistema' },
    { id: 'investimento-condicoes', nome: 'Investimento e Condições' },
    { id: 'projecao-economia', nome: 'Projeção de Economia' },
    { id: 'bloco-assinatura', nome: 'Bloco de Assinatura' },
  ]

  return (
    <div
      id="container-preview-proposta-secoes"
      data-testid="preview-proposta-secoes"
      className="w-full space-y-4"
    >
      {/* Barra de atalho para Selecionar Elementos do Preview */}
      <div className="bg-white border border-emerald-200/80 rounded-xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2 text-slate-700 font-semibold">
          <Layers className="w-4 h-4 text-emerald-600" />
          <span>Seções Editáveis da Proposta:</span>
          <span className="text-[11px] font-normal text-slate-500 hidden sm:inline">
            Clique em qualquer seção ou use os botões abaixo
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {secoes.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                handleSelect(s.id)
                const el = document.getElementById(`preview-secao-${s.id}`)
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }
              }}
              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                secaoAtiva === s.id
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                  : 'bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border-slate-200 hover:border-emerald-300'
              }`}
            >
              {secaoAtiva === s.id ? (
                <Check className="w-3 h-3 text-white" />
              ) : (
                <MousePointerClick className="w-3 h-3 text-slate-400" />
              )}
              <span>{s.nome}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 1. Cabeçalho / Logo / Capa */}
      <div
        onClick={() => handleSelect('cabecalho-logo')}
        className={`cursor-pointer transition-all rounded-xl ${
          secaoAtiva === 'cabecalho-logo' ? 'ring-2 ring-emerald-500 ring-offset-2' : ''
        }`}
      >
        <PropostaSecaoHeader
          propostaData={propostaData}
          onEdit={() => handleSelect('cabecalho-logo')}
        />
      </div>

      {/* 2. Dados do Cliente e Consultor */}
      <div
        onClick={() => handleSelect('dados-cliente')}
        className={`cursor-pointer transition-all rounded-xl ${
          secaoAtiva === 'dados-cliente' ? 'ring-2 ring-emerald-500 ring-offset-2' : ''
        }`}
      >
        <PropostaSecaoCliente
          propostaData={propostaData}
          onEdit={() => handleSelect('dados-cliente')}
        />
      </div>

      {/* 3. Descrição do Sistema (Potência, Placas, Inversores, Área, Garantias) */}
      <div
        onClick={() => handleSelect('descricao-sistema')}
        className={`cursor-pointer transition-all rounded-xl ${
          secaoAtiva === 'descricao-sistema' ? 'ring-2 ring-emerald-500 ring-offset-2' : ''
        }`}
      >
        <PropostaSecaoSistema
          propostaData={propostaData}
          onEdit={() => handleSelect('descricao-sistema')}
        />
      </div>

      {/* 4. Investimento e Condições de Pagamento */}
      <div
        onClick={() => handleSelect('investimento-condicoes')}
        className={`cursor-pointer transition-all rounded-xl ${
          secaoAtiva === 'investimento-condicoes' ? 'ring-2 ring-emerald-500 ring-offset-2' : ''
        }`}
      >
        <PropostaSecaoInvestimento
          propostaData={propostaData}
          onEdit={() => handleSelect('investimento-condicoes')}
        />
      </div>

      {/* 5. Projeção de Economia & Payback */}
      <div
        onClick={() => handleSelect('projecao-economia')}
        className={`cursor-pointer transition-all rounded-xl ${
          secaoAtiva === 'projecao-economia' ? 'ring-2 ring-emerald-500 ring-offset-2' : ''
        }`}
      >
        <PropostaSecaoProjecao
          propostaData={propostaData}
          onEdit={() => handleSelect('projecao-economia')}
        />
      </div>

      {/* 6. Bloco de Assinatura e Termo de Aceite */}
      <div
        onClick={() => handleSelect('bloco-assinatura')}
        className={`cursor-pointer transition-all rounded-xl ${
          secaoAtiva === 'bloco-assinatura' ? 'ring-2 ring-emerald-500 ring-offset-2' : ''
        }`}
      >
        <PropostaSecaoAssinatura
          propostaData={propostaData}
          onEdit={() => handleSelect('bloco-assinatura')}
        />
      </div>
    </div>
  )
}

export default PreviewPropostaSecoes
