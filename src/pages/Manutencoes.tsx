import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Loader2, Plus, FileCheck } from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { ListaOM, type AbaPrincipalOM } from '@/components/ListaOM'
import { calcularContagensOM } from '@/lib/omCategorizacao'
import { ModalNovoContratoOM } from '@/components/ModalNovoContratoOM'
import { ModalNovaPropostaOM } from '@/components/ModalNovaPropostaOM'

export default function Manutencoes() {
  const {
    clientes,
    contratosOM,
    sistemas,
    anomaliasOM,
    servicosAdicionaisOM,
    servicosAvulsos,
    isLoading,
    openFichaOM,
  } = useClientes()

  const location = useLocation()
  const [activeSubTab, setActiveSubTab] = useState<AbaPrincipalOM>('com_plano')
  const [isNovoContratoOpen, setIsNovoContratoOpen] = useState(false)
  const [isNovaPropostaOpen, setIsNovaPropostaOpen] = useState(false)

  // Quando acessado via rota direta /planos-om ou /planos-monitoramento, força a aba com_plano (Planos O&M)
  useEffect(() => {
    if (location.pathname === '/planos-om' || location.pathname === '/planos-monitoramento') {
      setActiveSubTab('com_plano')
    }
  }, [location.pathname])

  // Métricas do Módulo O&M unificadas com a categorização por cliente
  const contagens = React.useMemo(
    () =>
      calcularContagensOM(
        clientes,
        contratosOM,
        servicosAdicionaisOM,
        anomaliasOM,
        servicosAvulsos,
        sistemas,
      ),
    [clientes, contratosOM, servicosAdicionaisOM, anomaliasOM, servicosAvulsos, sistemas],
  )
  const contratosAtivos = contagens.planosAtivos

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-3 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#16A34A]" />
        <p className="text-sm">Carregando carteira de O&M e manutenções...</p>
      </div>
    )
  }

  return (
    <div className="space-y-3.5">
      {/* Barra de Ações Superior - Minimalista alinhada à direita */}
      <div className="flex items-center justify-end gap-2.5">
        <button
          type="button"
          onClick={() => setIsNovaPropostaOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-xl shadow-2xs transition-all cursor-pointer"
          title="Criar proposta O&M com PDF"
        >
          <FileCheck className="w-3.5 h-3.5 text-emerald-700" />
          <span>Nova Proposta O&M</span>
        </button>

        <button
          type="button"
          onClick={() => setIsNovoContratoOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] active:scale-[0.98] text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-md transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Novo Contrato O&M</span>
        </button>
      </div>

      {/* Conteúdo Principal: Base Completa O&M com sub-abas Planos O&M e Clientes Pós-Vendas */}
      <ListaOM
        onOpenFichaOM={(clienteId) => openFichaOM(clienteId)}
        onOpenNovoContrato={() => setIsNovoContratoOpen(true)}
        activeSubTab={activeSubTab}
        onSubTabChange={setActiveSubTab}
        metricCards={
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5 w-full sm:w-auto sm:min-w-[340px]">
            {/* Ativos */}
            <div
              onClick={() => setActiveSubTab('com_plano')}
              className="bg-emerald-50/70 rounded-xl p-2 sm:px-2.5 sm:py-2 border-2 border-emerald-500 flex flex-col justify-between cursor-pointer shadow-xs hover:bg-emerald-50 transition-colors select-none"
            >
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[11px] font-bold text-emerald-900 leading-tight">
                  Ativos ({contratosAtivos})
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              </div>
              <div className="text-sm sm:text-base font-extrabold text-emerald-700 mt-0.5">
                R$ 6.663,06
              </div>
              <span className="text-[9px] text-emerald-700 font-medium leading-tight">
                Receita recorrente
              </span>
            </div>

            {/* Próximos do término */}
            <div
              onClick={() => setActiveSubTab('com_plano')}
              className="bg-amber-50/70 rounded-xl p-2 sm:px-2.5 sm:py-2 border border-amber-200/90 flex flex-col justify-between cursor-pointer hover:border-amber-400 transition-colors select-none"
            >
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[11px] font-semibold text-amber-900 leading-tight">
                  Próximos do término (3)
                </span>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
              </div>
              <div className="text-sm sm:text-base font-extrabold text-amber-600 mt-0.5">
                R$ 1.252,90
              </div>
              <span className="text-[9px] text-amber-700 font-medium leading-tight">
                Em até 60 dias
              </span>
            </div>
          </div>
        }
      />

      {/* Modal Novo Contrato de O&M */}
      <ModalNovoContratoOM
        isOpen={isNovoContratoOpen}
        onClose={() => setIsNovoContratoOpen(false)}
      />

      {/* Modal Nova Proposta O&M */}
      <ModalNovaPropostaOM
        isOpen={isNovaPropostaOpen}
        onClose={() => setIsNovaPropostaOpen(false)}
      />
    </div>
  )
}
