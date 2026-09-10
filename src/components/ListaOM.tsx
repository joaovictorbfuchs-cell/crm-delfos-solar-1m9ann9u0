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
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { formatCurrency, formatDate } from '@/lib/formatters'
import type { OMPlanoTipo, OMStatusPlano } from '@/types/crm'

interface ListaOMProps {
  onOpenFichaOM: (clienteId: string) => void
  onOpenNovoContrato?: () => void
}

export const ListaOM: React.FC<ListaOMProps> = ({ onOpenFichaOM, onOpenNovoContrato }) => {
  const { clientes, contratosOM, sistemas, openFichaOM } = useClientes()

  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [filtroPlano, setFiltroPlano] = useState<string>('todos')
  const [ordenacao, setOrdenacao] = useState<'vencimento' | 'nome' | 'potencia'>('vencimento')

  // O usuário solicitou expressamente:
  // "Lista de O&M — listar APENAS clientes com plano de O&M ativo"
  // Cada item relaciona um cliente com seu contrato de O&M
  const itensOM = useMemo(() => {
    const list: Array<{
      contratoId: string
      clienteId: string
      nome: string
      cidade: string
      telefone: string
      potenciaKwp: number
      plano: OMPlanoTipo
      dataInicio: string
      dataVencimento: string
      status: OMStatusPlano
      proximaAtividadeTitulo: string
      proximaAtividadeData?: string
      diasRestantes: number
    }> = []

    for (const contrato of contratosOM) {
      const cliente = clientes.find((c) => c.id === contrato.cliente_id)
      if (!cliente) continue

      const sistema = sistemas.find((s) => s.cliente_id === cliente.id)
      const potencia = sistema?.potencia_total_kwp ?? cliente.potencia_kwp ?? 0

      const diasRestantes = contrato.data_vencimento
        ? Math.ceil(
            (new Date(contrato.data_vencimento).getTime() - new Date().getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 0

      list.push({
        contratoId: contrato.id,
        clienteId: cliente.id,
        nome: cliente.nome,
        cidade: cliente.cidade || 'Erechim/RS',
        telefone: cliente.telefone || '',
        potenciaKwp: potencia,
        plano: contrato.plano,
        dataInicio: contrato.data_inicio,
        dataVencimento: contrato.data_vencimento,
        status: contrato.status,
        proximaAtividadeTitulo: contrato.proxima_atividade_titulo || 'Acompanhamento preventivo',
        proximaAtividadeData: contrato.proxima_atividade_data,
        diasRestantes,
      })
    }

    return list
  }, [contratosOM, clientes, sistemas])

  // Filtragem e busca
  const itensFiltrados = useMemo(() => {
    return itensOM
      .filter((item) => {
        // Busca por nome ou cidade
        const matchBusca =
          !busca.trim() ||
          item.nome.toLowerCase().includes(busca.toLowerCase()) ||
          item.cidade.toLowerCase().includes(busca.toLowerCase())

        // Filtro Status
        const matchStatus = filtroStatus === 'todos' || item.status === filtroStatus

        // Filtro Plano
        const matchPlano = filtroPlano === 'todos' || item.plano === filtroPlano

        return matchBusca && matchStatus && matchPlano
      })
      .sort((a, b) => {
        if (ordenacao === 'vencimento') {
          return new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime()
        }
        if (ordenacao === 'nome') {
          return a.nome.localeCompare(b.nome)
        }
        if (ordenacao === 'potencia') {
          return b.potenciaKwp - a.potenciaKwp
        }
        return 0
      })
  }, [itensOM, busca, filtroStatus, filtroPlano, ordenacao])

  const renderStatusBadge = (status: OMStatusPlano) => {
    switch (status) {
      case 'Ativo':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Ativo
          </span>
        )
      case 'Vencendo em 30 dias':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Vencendo em 30 dias
          </span>
        )
      case 'Vencido':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Vencido
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            {status}
          </span>
        )
    }
  }

  const renderPlanoBadge = (plano: OMPlanoTipo) => {
    switch (plano) {
      case 'Completo':
        return (
          <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200">
            Completo
          </span>
        )
      case 'Prevenção':
        return (
          <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
            Prevenção
          </span>
        )
      case 'Essencial':
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            Essencial
          </span>
        )
    }
  }

  return (
    <div className="space-y-4">
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
          {/* Status */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 font-medium hidden sm:inline">Status:</span>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="px-2.5 py-2 rounded-lg border border-gray-300 bg-white font-medium text-gray-700 text-xs"
            >
              <option value="todos">Todos os Status</option>
              <option value="Ativo">Ativo</option>
              <option value="Vencendo em 30 dias">Vencendo em 30 dias</option>
              <option value="Vencido">Vencido</option>
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
              <option value="vencimento">Vencimento mais próximo</option>
              <option value="nome">Nome do cliente (A-Z)</option>
              <option value="potencia">Maior potência (kWp)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Resultados / Tabela Desktop */}
      {itensFiltrados.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-gray-200">
          <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-gray-800">Nenhum cliente O&M encontrado</h4>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
            Nenhum contrato corresponde aos filtros selecionados. Tente limpar os filtros de busca.
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
                  <th className="py-3.5 px-4">Plano Contratado</th>
                  <th className="py-3.5 px-4">Vigência (Início → Vencimento)</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Próxima Atividade</th>
                  <th className="py-3.5 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {itensFiltrados.map((item) => (
                  <tr
                    key={item.contratoId}
                    onClick={() => onOpenFichaOM(item.clienteId)}
                    className="hover:bg-emerald-50/50 transition-colors cursor-pointer group"
                  >
                    {/* Cliente & Cidade */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                        {item.nome}
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
                        <span>{item.potenciaKwp} kWp</span>
                      </div>
                    </td>

                    {/* Plano */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {renderPlanoBadge(item.plano)}
                    </td>

                    {/* Vigência */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-medium text-gray-700">
                        {formatDate(item.dataInicio)} → {formatDate(item.dataVencimento)}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        {item.diasRestantes < 0 ? (
                          <span className="text-rose-600 font-semibold">
                            Vencido há {Math.abs(item.diasRestantes)} dias
                          </span>
                        ) : item.diasRestantes <= 30 ? (
                          <span className="text-amber-600 font-semibold">
                            {item.diasRestantes} dias restantes
                          </span>
                        ) : (
                          <span>{item.diasRestantes} dias restantes</span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {renderStatusBadge(item.status)}
                    </td>

                    {/* Próxima Atividade */}
                    <td className="py-3.5 px-4 max-w-[240px]">
                      <div
                        className="font-semibold text-gray-800 truncate"
                        title={item.proximaAtividadeTitulo}
                      >
                        {item.proximaAtividadeTitulo}
                      </div>
                      {item.proximaAtividadeData && (
                        <div className="text-[11px] text-blue-600 font-medium flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(item.proximaAtividadeData)}</span>
                        </div>
                      )}
                    </td>

                    {/* Ação */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 group-hover:text-emerald-900 group-hover:underline">
                        Abrir Ficha O&M
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards no Mobile/Tablet */}
          <div className="lg:hidden space-y-3">
            {itensFiltrados.map((item) => (
              <div
                key={item.contratoId}
                onClick={() => onOpenFichaOM(item.clienteId)}
                className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-xs hover:border-emerald-400 transition-colors cursor-pointer space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{item.nome}</h4>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {item.cidade}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {renderStatusBadge(item.status)}
                    {renderPlanoBadge(item.plano)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-100">
                  <div>
                    <span className="text-gray-400 block text-[11px]">Potência</span>
                    <span className="font-bold text-gray-800 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                      {item.potenciaKwp} kWp
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[11px]">Vencimento</span>
                    <span className="font-bold text-gray-800">
                      {formatDate(item.dataVencimento)}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50 p-2.5 rounded-lg text-xs space-y-1">
                  <span className="text-[11px] font-bold text-gray-500 uppercase block">
                    Próxima Atividade:
                  </span>
                  <div className="font-medium text-gray-800 truncate">
                    {item.proximaAtividadeTitulo}
                  </div>
                  {item.proximaAtividadeData && (
                    <div className="text-[11px] text-blue-600 flex items-center gap-1 font-medium">
                      <Calendar className="w-3 h-3" />
                      {formatDate(item.proximaAtividadeData)}
                    </div>
                  )}
                </div>

                <div className="text-right pt-1">
                  <span className="text-xs font-bold text-emerald-700 flex items-center justify-end gap-1">
                    Ver Ficha de O&M completa →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
