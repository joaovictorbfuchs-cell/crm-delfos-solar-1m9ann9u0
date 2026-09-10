import React, { useState, useMemo } from 'react'
import {
  ShieldCheck,
  Zap,
  Calendar,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  ChevronRight,
  User,
  Plus,
  Wrench,
  Layers,
  ArrowUpDown,
  Building,
  Sparkles,
  Phone,
  MapPin,
  RefreshCw,
  FolderKanban,
  Check,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { formatCurrency, formatDate } from '@/lib/formatters'
import type { OMPlanoTipo } from '@/types/crm'
import { categorizarClienteOM, calcularContagensOM } from '@/lib/omCategorizacao'

export type SituacaoOM =
  | 'com_plano_ativo'
  | 'com_servico_avulso'
  | 'plano_vencido'
  | 'sem_plano'
  | 'anomalia_aberta'

interface ClienteOMItem {
  clienteId: string
  nome: string
  cidade: string
  telefone: string
  potenciaKwp: number
  situacao: SituacaoOM
  plano?: OMPlanoTipo
  contratoId?: string
  dataInicio?: string
  dataVencimento?: string
  diasRestantes?: number
  servicoAvulsoTitulo?: string
  anomaliaTitulo?: string
  temAnomaliaAberta?: boolean
  proximaAtividadeTitulo?: string
  proximaAtividadeData?: string
}

interface ListaOMProps {
  onOpenFichaOM: (clienteId: string) => void
  onOpenNovoContrato?: () => void
}

export const ListaOM: React.FC<ListaOMProps> = ({ onOpenFichaOM, onOpenNovoContrato }) => {
  const { clientes, contratosOM, sistemas, servicosAdicionaisOM, anomaliasOM } = useClientes()

  const [busca, setBusca] = useState('')
  const [filtroSituacao, setFiltroSituacao] = useState<string>('todos')
  const [filtroPlano, setFiltroPlano] = useState<string>('todos')
  const [ordenacao, setOrdenacao] = useState<'status' | 'nome' | 'potencia' | 'vencimento'>(
    'status',
  )

  // Mapear TODOS os clientes da base para o módulo de O&M usando a mesma categorização unificada
  const itensOM = useMemo(() => {
    const list: ClienteOMItem[] = []

    for (const cliente of clientes) {
      const sistema = sistemas.find((s) => s.cliente_id === cliente.id)
      const potencia = sistema?.potencia_total_kwp ?? cliente.potencia_kwp ?? 0

      // Categorização unificada
      const {
        categoria,
        contratoAtivo,
        contratoVencido,
        temAnomaliaAberta,
        temServicoAvulsoEmAndamento,
      } = categorizarClienteOM(cliente.id, contratosOM, servicosAdicionaisOM, anomaliasOM)

      // Tradução para SituacaoOM da lista
      let situacao: SituacaoOM = 'sem_plano'
      if (categoria === 'plano_ativo') situacao = 'com_plano_ativo'
      else if (categoria === 'plano_vencido') situacao = 'plano_vencido'
      else if (categoria === 'anomalia_aberta') situacao = 'anomalia_aberta'
      else if (categoria === 'servico_avulso') situacao = 'com_servico_avulso'
      else situacao = 'sem_plano'

      // Contrato relevante (ativo prioritário, ou vencido)
      const contrato = contratoAtivo || contratoVencido

      let diasRestantes: number | undefined
      if (contrato?.data_vencimento) {
        diasRestantes = Math.ceil(
          (new Date(contrato.data_vencimento).getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24),
        )
      }

      // Serviços avulsos em andamento / pendentes
      const servicoAvulsoEmAndamento = servicosAdicionaisOM.find(
        (s) =>
          s.cliente_id === cliente.id && (s.status === 'em execução' || s.status === 'pendente'),
      )

      // Anomalia aberta
      const anomaliaAberta = anomaliasOM.find(
        (a) => a.cliente_id === cliente.id && a.status !== 'Resolvido' && a.status !== 'Cancelado',
      )

      list.push({
        clienteId: cliente.id,
        nome: cliente.nome,
        cidade: cliente.cidade || 'Erechim/RS',
        telefone: cliente.telefone || '',
        potenciaKwp: potencia,
        situacao,
        plano: contrato?.plano,
        contratoId: contrato?.id,
        dataInicio: contrato?.data_inicio,
        dataVencimento: contrato?.data_vencimento,
        diasRestantes,
        servicoAvulsoTitulo: servicoAvulsoEmAndamento?.descricao || undefined,
        anomaliaTitulo: anomaliaAberta?.titulo || undefined,
        temAnomaliaAberta,
        proximaAtividadeTitulo:
          contrato?.proxima_atividade_titulo ||
          (servicoAvulsoEmAndamento ? `O.S. ${servicoAvulsoEmAndamento.status}` : undefined) ||
          (anomaliaAberta ? `Anomalia: ${anomaliaAberta.titulo}` : undefined),
        proximaAtividadeData:
          contrato?.proxima_atividade_data ||
          servicoAvulsoEmAndamento?.data ||
          anomaliaAberta?.data_abertura,
      })
    }

    return list
  }, [clientes, contratosOM, sistemas, servicosAdicionaisOM, anomaliasOM])

  // Contadores para o resumo de filtros rápidos (alinhados com a mesma função e os cards do topo)
  const contagens = useMemo(() => {
    return {
      todos: itensOM.length,
      com_plano_ativo: itensOM.filter((i) => i.situacao === 'com_plano_ativo').length,
      sem_plano: itensOM.filter((i) => i.situacao === 'sem_plano').length,
      com_servico_avulso: itensOM.filter((i) => i.situacao === 'com_servico_avulso').length,
      anomalia_aberta: itensOM.filter((i) => i.situacao === 'anomalia_aberta').length,
      plano_vencido: itensOM.filter((i) => i.situacao === 'plano_vencido').length,
    }
  }, [itensOM])

  // Filtragem e ordenação
  const itensFiltrados = useMemo(() => {
    return itensOM
      .filter((item) => {
        // Busca textual
        const matchBusca =
          !busca.trim() ||
          item.nome.toLowerCase().includes(busca.toLowerCase()) ||
          item.cidade.toLowerCase().includes(busca.toLowerCase())

        // Filtro Situação
        const matchSituacao = filtroSituacao === 'todos' || item.situacao === filtroSituacao

        // Filtro Plano
        const matchPlano = filtroPlano === 'todos' || (item.plano && item.plano === filtroPlano)

        return matchBusca && matchSituacao && matchPlano
      })
      .sort((a, b) => {
        if (ordenacao === 'status') {
          // Prioridade visual: Ativos / Anomalias / Serviços avulsos / Sem plano / Vencidos
          const prioridade: Record<SituacaoOM, number> = {
            anomalia_aberta: 1,
            com_servico_avulso: 2,
            com_plano_ativo: 3,
            plano_vencido: 4,
            sem_plano: 5,
          }
          return prioridade[a.situacao] - prioridade[b.situacao]
        }
        if (ordenacao === 'nome') {
          return a.nome.localeCompare(b.nome)
        }
        if (ordenacao === 'potencia') {
          return b.potenciaKwp - a.potenciaKwp
        }
        if (ordenacao === 'vencimento') {
          const dateA = a.dataVencimento ? new Date(a.dataVencimento).getTime() : 0
          const dateB = b.dataVencimento ? new Date(b.dataVencimento).getTime() : 0
          return dateB - dateA
        }
        return 0
      })
  }, [itensOM, busca, filtroSituacao, filtroPlano, ordenacao])

  // Badge da Situação Visual
  const renderSituacaoBadge = (situacao: SituacaoOM, temAnomaliaAberta?: boolean) => {
    switch (situacao) {
      case 'com_plano_ativo':
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Com plano O&M ativo
            </span>
            {temAnomaliaAberta && (
              <span
                title="Cliente com anomalia aberta registrada"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800 border border-purple-200"
              >
                <AlertTriangle className="w-3 h-3 text-purple-600" />
                Anomalia aberta
              </span>
            )}
          </div>
        )
      case 'sem_plano':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            Sem plano (Oportunidade)
          </span>
        )
      case 'com_servico_avulso':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <Wrench className="w-3.5 h-3.5 text-blue-600" />
            Com serviço avulso em andamento
          </span>
        )
      case 'anomalia_aberta':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
            <AlertTriangle className="w-3.5 h-3.5 text-purple-600" />
            Anomalia aberta
          </span>
        )
      case 'plano_vencido':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            Plano vencido
          </span>
        )
    }
  }

  const renderPlanoBadge = (plano?: OMPlanoTipo) => {
    if (!plano) {
      return <span className="text-gray-400 text-xs italic">Nenhum plano</span>
    }
    switch (plano) {
      case 'Completo':
        return (
          <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
            Completo
          </span>
        )
      case 'Prevenção':
        return (
          <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            Prevenção
          </span>
        )
      case 'Essencial':
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            Essencial
          </span>
        )
    }
  }

  return (
    <div className="space-y-4">
      {/* Botões Rápidos de Filtragem por Situação */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setFiltroSituacao('todos')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${
            filtroSituacao === 'todos'
              ? 'bg-gray-900 text-white border-gray-900 shadow-xs'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
        >
          Todos ({contagens.todos})
        </button>

        <button
          type="button"
          onClick={() => setFiltroSituacao('com_plano_ativo')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap flex items-center gap-1.5 ${
            filtroSituacao === 'com_plano_ativo'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Com plano ativo ({contagens.com_plano_ativo})
        </button>

        <button
          type="button"
          onClick={() => setFiltroSituacao('sem_plano')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap flex items-center gap-1.5 ${
            filtroSituacao === 'sem_plano'
              ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
              : 'bg-white text-amber-800 border-amber-300 hover:bg-amber-50'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          Sem plano (Oportunidades) ({contagens.sem_plano})
        </button>

        <button
          type="button"
          onClick={() => setFiltroSituacao('com_servico_avulso')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap flex items-center gap-1.5 ${
            filtroSituacao === 'com_servico_avulso'
              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
              : 'bg-white text-blue-800 border-blue-200 hover:bg-blue-50'
          }`}
        >
          <Wrench className="w-3.5 h-3.5 text-blue-500" />
          Serviços avulsos ({contagens.com_servico_avulso})
        </button>

        <button
          type="button"
          onClick={() => setFiltroSituacao('anomalia_aberta')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap flex items-center gap-1.5 ${
            filtroSituacao === 'anomalia_aberta'
              ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
              : 'bg-white text-purple-800 border-purple-200 hover:bg-purple-50'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-purple-500" />
          Anomalias abertas ({contagens.anomalia_aberta})
        </button>

        {contagens.plano_vencido > 0 && (
          <button
            type="button"
            onClick={() => setFiltroSituacao('plano_vencido')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap flex items-center gap-1.5 ${
              filtroSituacao === 'plano_vencido'
                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                : 'bg-white text-rose-800 border-rose-200 hover:bg-rose-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            Plano vencido ({contagens.plano_vencido})
          </button>
        )}
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Campo Busca */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome do cliente ou cidade..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        {/* Seletores de Filtro */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Status O&M */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 font-medium hidden sm:inline">Situação:</span>
            <select
              value={filtroSituacao}
              onChange={(e) => setFiltroSituacao(e.target.value)}
              className="px-2.5 py-2 rounded-lg border border-gray-300 bg-white font-medium text-gray-700 text-xs"
            >
              <option value="todos">Todas as Situações</option>
              <option value="com_plano_ativo">Com plano O&M ativo</option>
              <option value="sem_plano">Sem plano (Oportunidade)</option>
              <option value="com_servico_avulso">Serviço avulso em andamento</option>
              <option value="anomalia_aberta">Anomalia aberta</option>
              <option value="plano_vencido">Plano vencido</option>
            </select>
          </div>

          {/* Plano */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 font-medium hidden sm:inline">Plano:</span>
            <select
              value={filtroPlano}
              onChange={(e) => setFiltroPlano(e.target.value)}
              className="px-2.5 py-2 rounded-lg border border-gray-300 bg-white font-medium text-gray-700 text-xs"
            >
              <option value="todos">Todos os Planos</option>
              <option value="Essencial">Essencial</option>
              <option value="Prevenção">Prevenção</option>
              <option value="Completo">Completo</option>
            </select>
          </div>

          {/* Ordenação */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 font-medium hidden sm:inline">Ordenar:</span>
            <select
              value={ordenacao}
              onChange={(e) => setOrdenacao(e.target.value as any)}
              className="px-2.5 py-2 rounded-lg border border-gray-300 bg-white font-medium text-gray-700 text-xs"
            >
              <option value="status">Prioridade de Situação</option>
              <option value="nome">Nome do cliente (A-Z)</option>
              <option value="potencia">Maior potência (kWp)</option>
              <option value="vencimento">Vencimento de contrato</option>
            </select>
          </div>
        </div>
      </div>

      {/* Resultados / Tabela Desktop */}
      {itensFiltrados.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-gray-200">
          <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-gray-800">Nenhum cliente encontrado</h4>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
            Nenhum cliente corresponde aos filtros selecionados. Tente limpar os filtros de busca.
          </p>
        </div>
      ) : (
        <>
          {/* Tabela no Desktop */}
          <div className="hidden lg:block bg-white rounded-xl border border-gray-200/90 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAF9] border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Cliente & Local</th>
                  <th className="py-3.5 px-4">Potência</th>
                  <th className="py-3.5 px-4">Situação O&M</th>
                  <th className="py-3.5 px-4">Plano Contratado</th>
                  <th className="py-3.5 px-4">Atividade / Detalhes</th>
                  <th className="py-3.5 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {itensFiltrados.map((item) => {
                  const isOportunidade = item.situacao === 'sem_plano'

                  return (
                    <tr
                      key={item.clienteId}
                      onClick={() => onOpenFichaOM(item.clienteId)}
                      className={`transition-colors cursor-pointer group ${
                        isOportunidade
                          ? 'bg-amber-50/25 hover:bg-amber-50/60'
                          : 'hover:bg-emerald-50/40'
                      }`}
                    >
                      {/* Cliente & Cidade */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          {isOportunidade && (
                            <span
                              title="Oportunidade de Prospecção O&M"
                              className="w-2 h-2 rounded-full bg-amber-500 shrink-0"
                            />
                          )}
                          <div className="font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                            {item.nome}
                          </div>
                        </div>
                        <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          {item.cidade}
                        </div>
                      </td>

                      {/* Potência */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-gray-800 flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span>{item.potenciaKwp > 0 ? `${item.potenciaKwp} kWp` : '—'}</span>
                        </div>
                      </td>

                      {/* Situação O&M */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderSituacaoBadge(item.situacao, item.temAnomaliaAberta)}
                      </td>

                      {/* Plano */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderPlanoBadge(item.plano)}
                        {item.dataVencimento && (
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            Até {formatDate(item.dataVencimento)}
                          </div>
                        )}
                      </td>

                      {/* Atividade / Detalhes */}
                      <td className="py-3.5 px-4 max-w-[260px]">
                        {item.situacao === 'sem_plano' ? (
                          <div className="text-[11px] text-amber-800 font-medium flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Prospecção aberta: Ofertar Plano ou Limpeza</span>
                          </div>
                        ) : item.situacao === 'anomalia_aberta' ? (
                          <div className="text-gray-800 truncate" title={item.anomaliaTitulo}>
                            <span className="font-semibold text-purple-700 block text-[11px]">
                              Anomalia em aberto:
                            </span>
                            <span className="text-[11px] text-gray-600 truncate block">
                              {item.anomaliaTitulo || 'Em atendimento técnico'}
                            </span>
                          </div>
                        ) : item.servicoAvulsoTitulo ? (
                          <div className="text-gray-800 truncate" title={item.servicoAvulsoTitulo}>
                            <span className="font-semibold text-blue-700 block text-[11px]">
                              Serviço em execução:
                            </span>
                            <span className="text-[11px] text-gray-600 truncate block">
                              {item.servicoAvulsoTitulo}
                            </span>
                          </div>
                        ) : item.proximaAtividadeTitulo ? (
                          <div
                            className="font-medium text-gray-800 truncate"
                            title={item.proximaAtividadeTitulo}
                          >
                            <span className="truncate block">{item.proximaAtividadeTitulo}</span>
                            {item.proximaAtividadeData && (
                              <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1 mt-0.5">
                                <Calendar className="w-3 h-3" />
                                {formatDate(item.proximaAtividadeData)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs italic">Nenhum agendamento</span>
                        )}
                      </td>

                      {/* Ação */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 group-hover:text-emerald-900 group-hover:underline">
                          Abrir Ficha Completa
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Cards no Mobile/Tablet */}
          <div className="lg:hidden space-y-3">
            {itensFiltrados.map((item) => {
              const isOportunidade = item.situacao === 'sem_plano'

              return (
                <div
                  key={item.clienteId}
                  onClick={() => onOpenFichaOM(item.clienteId)}
                  className={`bg-white rounded-xl border p-4 shadow-xs transition-colors cursor-pointer space-y-3 ${
                    isOportunidade
                      ? 'border-amber-300 bg-amber-50/20 hover:border-amber-400'
                      : 'border-gray-200/90 hover:border-emerald-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-gray-900 text-sm">{item.nome}</h4>
                      </div>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {item.cidade}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {renderSituacaoBadge(item.situacao, item.temAnomaliaAberta)}
                      {item.plano && renderPlanoBadge(item.plano)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-100">
                    <div>
                      <span className="text-gray-400 block text-[11px]">Potência</span>
                      <span className="font-bold text-gray-800 flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                        {item.potenciaKwp > 0 ? `${item.potenciaKwp} kWp` : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[11px]">Situação</span>
                      <span className="font-bold text-gray-800">
                        {item.plano ? `Plano ${item.plano}` : 'Sem plano contratado'}
                      </span>
                    </div>
                  </div>

                  {item.situacao === 'sem_plano' ? (
                    <div className="bg-amber-100/70 p-2.5 rounded-lg text-xs flex items-center gap-1.5 text-amber-900 font-semibold">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Oportunidade: Oferecer Plano O&M ou Limpeza Avulsa</span>
                    </div>
                  ) : item.situacao === 'anomalia_aberta' ? (
                    <div className="bg-purple-50 p-2.5 rounded-lg text-xs space-y-0.5">
                      <span className="text-[11px] font-bold text-purple-700 uppercase block">
                        Anomalia em aberto:
                      </span>
                      <div className="font-medium text-gray-800">
                        {item.anomaliaTitulo || 'Em atendimento'}
                      </div>
                    </div>
                  ) : item.servicoAvulsoTitulo ? (
                    <div className="bg-blue-50 p-2.5 rounded-lg text-xs space-y-0.5">
                      <span className="text-[11px] font-bold text-blue-700 uppercase block">
                        Serviço em execução:
                      </span>
                      <div className="font-medium text-gray-800">{item.servicoAvulsoTitulo}</div>
                    </div>
                  ) : item.proximaAtividadeTitulo ? (
                    <div className="bg-gray-50 p-2.5 rounded-lg text-xs space-y-1">
                      <span className="text-[11px] font-bold text-gray-500 uppercase block">
                        Próxima Atividade:
                      </span>
                      <div className="font-medium text-gray-800 truncate">
                        {item.proximaAtividadeTitulo}
                      </div>
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-xs">
                    <span className="text-gray-400 text-[11px]">
                      Clique para ver ficha completa
                    </span>
                    <span className="font-bold text-emerald-700 flex items-center gap-1">
                      Abrir Ficha
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
