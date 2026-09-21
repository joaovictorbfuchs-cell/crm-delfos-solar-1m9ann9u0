import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { ShieldCheck, Loader2, Plus, FileCheck } from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { ListaOM, type AbaPrincipalOM } from '@/components/ListaOM'
import { calcularContagensOM } from '@/lib/omCategorizacao'
import { ModalNovoContratoOM } from '@/components/ModalNovoContratoOM'
import { GestaoOrdensServico } from '@/components/GestaoOrdensServico'
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
  const [viewMode, setViewMode] = useState<'om' | 'ordens_servico'>('om')
  const [activeSubTab, setActiveSubTab] = useState<AbaPrincipalOM>('com_plano')
  const [isNovoContratoOpen, setIsNovoContratoOpen] = useState(false)
  const [isNovaPropostaOpen, setIsNovaPropostaOpen] = useState(false)

  // Quando acessado via rota direta /planos-om ou /planos-monitoramento, força a aba com_plano (Planos O&M)
  useEffect(() => {
    if (location.pathname === '/planos-om' || location.pathname === '/planos-monitoramento') {
      setViewMode('om')
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
  const totalClientes = contagens.totalClientes
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
    <div className="space-y-4">
      {/* Top Header com Seletor de Modo: Carteira O&M vs Ordens de Serviço Avulsas */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                {location.pathname === '/planos-om' || location.pathname === '/planos-monitoramento'
                  ? 'Planos de Monitoramento & O&M'
                  : 'Gestão de O&M (Operação e Manutenção)'}
              </h2>
              <p className="text-xs text-gray-500">
                Planos ativos, manutenções preventivas e ordens de serviço
              </p>
            </div>
          </div>
        </div>

        {/* Alternador de Visualização & Botão de Criação */}
        <div className="flex items-center gap-2 flex-wrap self-stretch sm:self-auto">
          <div className="bg-gray-100 p-1 rounded-xl flex items-center text-xs font-semibold text-gray-600">
            <button
              type="button"
              onClick={() => setViewMode('om')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'om'
                  ? 'bg-white text-emerald-800 shadow-xs font-bold'
                  : 'hover:text-gray-900'
              }`}
            >
              Base Completa O&M ({totalClientes})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('ordens_servico')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'ordens_servico'
                  ? 'bg-white text-emerald-800 shadow-xs font-bold'
                  : 'hover:text-gray-900'
              }`}
            >
              Ordens de Serviço (Campo)
            </button>
          </div>

          {viewMode === 'om' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsNovaPropostaOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-xl shadow-2xs transition-all hover:scale-[1.02]"
                title="Criar proposta O&M com PDF"
              >
                <FileCheck className="w-4 h-4 text-emerald-700" />
                <span>Nova Proposta O&M</span>
              </button>

              <button
                onClick={() => setIsNovoContratoOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl shadow-xs transition-all hover:scale-[1.02]"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Contrato O&M</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Cards de Métricas de Contratos O&M */}
      {viewMode === 'om' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl bg-white p-2.5 sm:p-3 rounded-2xl border border-gray-200/90 shadow-2xs">
          {/* Ativos */}
          <div
            onClick={() => setActiveSubTab('com_plano')}
            className="bg-emerald-50/70 rounded-xl p-2.5 border-2 border-emerald-500 flex flex-col justify-between cursor-pointer shadow-xs hover:bg-emerald-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-900">
                Ativos ({contratosAtivos})
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div className="text-base font-extrabold text-emerald-700 mt-0.5">R$ 6.663,06</div>
            <span className="text-[9px] text-emerald-700 font-medium mt-0.5">
              Receita recorrente mensal
            </span>
          </div>

          {/* Próximos do término */}
          <div
            onClick={() => setActiveSubTab('com_plano')}
            className="bg-amber-50/70 rounded-xl p-2.5 border border-amber-200/90 flex flex-col justify-between cursor-pointer hover:border-amber-400 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-amber-900">
                Próximos do término (3)
              </span>
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            </div>
            <div className="text-base font-extrabold text-amber-600 mt-0.5">R$ 1.252,90</div>
            <span className="text-[9px] text-amber-700 font-medium mt-0.5">
              Renovação em até 60 dias
            </span>
          </div>
        </div>
      )}

      {/* Conteúdo Principal de acordo com a aba selecionada */}
      {viewMode === 'om' ? (
        <ListaOM
          onOpenFichaOM={(clienteId) => openFichaOM(clienteId)}
          onOpenNovoContrato={() => setIsNovoContratoOpen(true)}
          activeSubTab={activeSubTab}
          onSubTabChange={setActiveSubTab}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs">
          <GestaoOrdensServico />
        </div>
      )}

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
