import React, { useState } from 'react'
import {
  ShieldCheck,
  Loader2,
  CheckCircle2,
  Clock,
  Calendar,
  AlertTriangle,
  Plus,
  Wrench,
  Layers,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { ListaOM, type AbaPrincipalOM } from '@/components/ListaOM'
import { calcularContagensOM } from '@/lib/omCategorizacao'
import { ModalNovoContratoOM } from '@/components/ModalNovoContratoOM'
import { ManutencoesList } from '@/components/ManutencoesList'
import { NovaManutencaoModal } from '@/components/NovaManutencaoModal'
import { ModalNovaPropostaOM } from '@/components/ModalNovaPropostaOM'
import { FileCheck } from 'lucide-react'

export default function Manutencoes() {
  const {
    clientes,
    contratosOM,
    sistemas,
    anomaliasOM,
    manutencoes,
    servicosAdicionaisOM,
    servicosAvulsos,
    isLoading,
    openFichaOM,
  } = useClientes()

  const [viewMode, setViewMode] = useState<'om' | 'os_avulsa'>('om')
  const [activeSubTab, setActiveSubTab] = useState<AbaPrincipalOM>('com_plano')
  const [isNovoContratoOpen, setIsNovoContratoOpen] = useState(false)
  const [isNovaManutencaoOpen, setIsNovaManutencaoOpen] = useState(false)
  const [isNovaPropostaOpen, setIsNovaPropostaOpen] = useState(false)

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
  const posVendasTotal = contagens.posVendas
  const oportunidadesOM = contagens.oportunidadesOM
  const servicosAvulsosTotal = contagens.totalServicosAvulsosOcorrencias

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-3 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#16A34A]" />
        <p className="text-sm">Carregando carteira de O&M e manutenções...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Header com Seletor de Modo: Carteira O&M vs Ordens de Serviço Avulsas */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                Gestão de O&M (Operação e Manutenção)
              </h2>
              <p className="text-xs text-gray-500">
                Acompanhamento contratual, monitoramento, anomalias e serviços técnicos para
                clientes com plano
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
              onClick={() => setViewMode('os_avulsa')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'os_avulsa'
                  ? 'bg-white text-emerald-800 shadow-xs font-bold'
                  : 'hover:text-gray-900'
              }`}
            >
              O.S. Avulsas ({manutencoes.length})
            </button>
          </div>

          {viewMode === 'om' ? (
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
          ) : (
            <button
              onClick={() => setIsNovaManutencaoOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl shadow-xs transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              Nova O.S. Avulsa
            </button>
          )}
        </div>
      </div>

      {/* Cards de Métricas de O&M */}
      {viewMode === 'om' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Card 1: Planos Ativos (Lista 1) */}
          <div
            onClick={() => setActiveSubTab('com_plano')}
            className={`rounded-xl p-4 border transition-all cursor-pointer flex items-center justify-between ${
              activeSubTab === 'com_plano'
                ? 'bg-emerald-50/80 border-emerald-400 shadow-sm ring-2 ring-emerald-500/20'
                : 'bg-white border-emerald-200 shadow-xs hover:border-emerald-300'
            }`}
          >
            <div>
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                1. Planos O&M Ativos
              </span>
              <div className="text-2xl font-extrabold text-emerald-600 mt-0.5">
                {contratosAtivos}
              </div>
              <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
                Contratos vigentes
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Clientes Pós-Vendas (Lista 2) */}
          <div
            onClick={() => setActiveSubTab('pos_vendas')}
            className={`rounded-xl p-4 border transition-all cursor-pointer flex items-center justify-between ${
              activeSubTab === 'pos_vendas'
                ? 'bg-slate-50 border-slate-400 shadow-sm ring-2 ring-slate-500/20'
                : 'bg-white border-slate-200 shadow-xs hover:border-slate-300'
            }`}
          >
            <div>
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                2. Clientes Pós-Vendas
              </span>
              <div className="text-2xl font-extrabold text-slate-900 mt-0.5">{posVendasTotal}</div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                Sem plano contratado
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Oportunidades de O&M (Solar instalado sem plano) */}
          <div
            onClick={() => setActiveSubTab('pos_vendas')}
            className="bg-white rounded-xl p-4 border border-amber-200 shadow-xs flex items-center justify-between hover:border-amber-300 transition-colors cursor-pointer"
          >
            <div>
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                Oportunidades O&M
              </span>
              <div className="text-2xl font-extrabold text-amber-600 mt-0.5">{oportunidadesOM}</div>
              <div className="text-[11px] text-amber-700 font-medium mt-0.5">
                Solar sem manutenção
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          {/* Card 4: Serviços Avulsos Realizados */}
          <div
            onClick={() => setActiveSubTab('pos_vendas')}
            className="bg-white rounded-xl p-4 border border-blue-200 shadow-xs flex items-center justify-between hover:border-blue-300 transition-colors cursor-pointer"
          >
            <div>
              <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">
                Serviços Avulsos
              </span>
              <div className="text-2xl font-extrabold text-blue-600 mt-0.5">
                {servicosAvulsosTotal}
              </div>
              <div className="text-[11px] text-blue-600 font-medium mt-0.5">
                Limpezas, reparos e visitas
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Wrench className="w-5 h-5" />
            </div>
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
        <div className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-xs">
          <ManutencoesList onOpenNovaManutencao={() => setIsNovaManutencaoOpen(true)} />
        </div>
      )}

      {/* Modal Novo Contrato de O&M */}
      <ModalNovoContratoOM
        isOpen={isNovoContratoOpen}
        onClose={() => setIsNovoContratoOpen(false)}
      />

      {/* Modal O.S. Avulsa */}
      <NovaManutencaoModal
        isOpen={isNovaManutencaoOpen}
        onClose={() => setIsNovaManutencaoOpen(false)}
      />

      {/* Modal Nova Proposta O&M */}
      <ModalNovaPropostaOM
        isOpen={isNovaPropostaOpen}
        onClose={() => setIsNovaPropostaOpen(false)}
      />
    </div>
  )
}
