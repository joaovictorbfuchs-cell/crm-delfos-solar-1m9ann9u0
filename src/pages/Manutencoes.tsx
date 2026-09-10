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
import { ListaOM } from '@/components/ListaOM'
import { ModalNovoContratoOM } from '@/components/ModalNovoContratoOM'
import { ManutencoesList } from '@/components/ManutencoesList'
import { NovaManutencaoModal } from '@/components/NovaManutencaoModal'

export default function Manutencoes() {
  const {
    clientes,
    contratosOM,
    anomaliasOM,
    manutencoes,
    servicosAdicionaisOM,
    isLoading,
    openFichaOM,
  } = useClientes()

  const [viewMode, setViewMode] = useState<'om' | 'os_avulsa'>('om')
  const [isNovoContratoOpen, setIsNovoContratoOpen] = useState(false)
  const [isNovaManutencaoOpen, setIsNovaManutencaoOpen] = useState(false)

  // Métricas do Módulo O&M
  const totalClientes = clientes.length
  const contratosAtivos = contratosOM.filter((c) => c.status === 'Ativo').length
  const clientesSemPlano = clientes.filter(
    (cl) => !contratosOM.some((ct) => ct.cliente_id === cl.id),
  ).length
  const servicosAvulsosEmAndamento = servicosAdicionaisOM.filter(
    (s) => s.status === 'em execução' || s.status === 'pendente',
  ).length
  const anomaliasAbertas = anomaliasOM.filter(
    (a) => a.status !== 'Resolvido' && a.status !== 'Cancelado',
  ).length

  // Receita mensal recorrente gerada pela carteira O&M
  const mrrTotal = contratosOM.reduce((acc, c) => acc + (c.valor_mensal || 0), 0)

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
            <button
              onClick={() => setIsNovoContratoOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl shadow-xs transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              Novo Contrato O&M
            </button>
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
          {/* Card Planos Ativos */}
          <div className="bg-white rounded-xl p-4 border border-emerald-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Planos O&M Ativos
              </span>
              <div className="text-2xl font-extrabold text-emerald-600 mt-0.5">
                {contratosAtivos}
              </div>
              <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
                Contratos vigentes
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          {/* Card Sem Plano (Oportunidades) */}
          <div className="bg-white rounded-xl p-4 border border-amber-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                Sem Plano (Oportunidades)
              </span>
              <div className="text-2xl font-extrabold text-amber-600 mt-0.5">
                {clientesSemPlano}
              </div>
              <div className="text-[11px] text-amber-600/90 font-medium mt-0.5">
                Prospecção aberta
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          {/* Card Serviços Avulsos em Andamento */}
          <div className="bg-white rounded-xl p-4 border border-blue-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                Serviços Avulsos
              </span>
              <div className="text-2xl font-extrabold text-blue-600 mt-0.5">
                {servicosAvulsosEmAndamento}
              </div>
              <div className="text-[11px] text-blue-500 font-medium mt-0.5">
                Em andamento / pendentes
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Wrench className="w-5 h-5" />
            </div>
          </div>

          {/* Card Anomalias Abertas */}
          <div className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Anomalias Abertas
              </span>
              <div className="text-2xl font-extrabold text-purple-600 mt-0.5">
                {anomaliasAbertas}
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5">Em triagem / campo</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo Principal de acordo com a aba selecionada */}
      {viewMode === 'om' ? (
        <ListaOM
          onOpenFichaOM={(clienteId) => openFichaOM(clienteId)}
          onOpenNovoContrato={() => setIsNovoContratoOpen(true)}
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
    </div>
  )
}
