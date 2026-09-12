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
  DollarSign,
  FileCheck,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { formatCurrency, formatDate } from '@/lib/formatters'
import type { OMPlanoTipo, Cliente, ServicoAvulso } from '@/types/crm'
import { categorizarClienteOM } from '@/lib/omCategorizacao'
import { ModalRegistrarServicoAvulso } from '@/components/ModalRegistrarServicoAvulso'

export type SituacaoOM =
  | 'com_plano_ativo'
  | 'com_servico_avulso'
  | 'plano_vencido'
  | 'sem_plano'
  | 'anomalia_aberta'

export type AbaPrincipalOM = 'com_plano' | 'pos_vendas'

interface ListaOMProps {
  onOpenFichaOM: (clienteId: string) => void
  onOpenNovoContrato?: () => void
  activeSubTab?: AbaPrincipalOM
  onSubTabChange?: (tab: AbaPrincipalOM) => void
}

export const ListaOM: React.FC<ListaOMProps> = ({
  onOpenFichaOM,
  onOpenNovoContrato,
  activeSubTab: externalActiveSubTab,
  onSubTabChange,
}) => {
  const {
    clientes,
    contratosOM,
    sistemas,
    servicosAdicionaisOM,
    servicosAvulsos,
    anomaliasOM,
    openFichaCliente,
  } = useClientes()

  const [internalSubTab, setInternalSubTab] = useState<AbaPrincipalOM>('com_plano')
  const currentSubTab = externalActiveSubTab || internalSubTab

  const setSubTab = (tab: AbaPrincipalOM) => {
    if (onSubTabChange) onSubTabChange(tab)
    else setInternalSubTab(tab)
  }

  const [busca, setBusca] = useState('')
  const [filtroPlano, setFiltroPlano] = useState<string>('todos')
  const [filtroPosVendas, setFiltroPosVendas] = useState<
    'todos' | 'oportunidades' | 'servico_avulso'
  >('todos')
  const [ordenacao, setOrdenacao] = useState<'nome' | 'potencia' | 'valor' | 'proxima_visita'>(
    'nome',
  )

  // Estado para abrir modal de registrar serviço avulso diretamente da lista
  const [clienteParaServicoAvulso, setClienteParaServicoAvulso] = useState<Cliente | null>(null)

  // 1. Clientes com Plano de Manutenção
  // Clientes que têm contrato de O&M ativo, com dados do contrato, potência do sistema, valor mensal, próxima visita agendada e status do plano
  const clientesComPlano = useMemo(() => {
    return clientes
      .map((cliente) => {
        const sistema = sistemas.find((s) => s.cliente_id === cliente.id)
        const potencia = sistema?.potencia_total_kwp ?? cliente.potencia_kwp ?? 0

        const { categoria, contratoAtivo } = categorizarClienteOM(
          cliente.id,
          contratosOM,
          servicosAdicionaisOM,
          anomaliasOM,
          servicosAvulsos,
        )

        if (categoria !== 'plano_ativo' || !contratoAtivo) return null

        return {
          cliente,
          contrato: contratoAtivo,
          potenciaKwp: potencia,
          valorMensal: contratoAtivo.valor_mensal || 0,
          statusPlano: contratoAtivo.status,
          plano: contratoAtivo.plano,
          dataVencimento: contratoAtivo.data_vencimento,
          proximaVisitaData: contratoAtivo.proxima_atividade_data,
          proximaVisitaTitulo: contratoAtivo.proxima_atividade_titulo,
        }
      })
      .filter(Boolean) as {
      cliente: Cliente
      contrato: NonNullable<ReturnType<typeof categorizarClienteOM>['contratoAtivo']>
      potenciaKwp: number
      valorMensal: number
      statusPlano: string
      plano: OMPlanoTipo
      dataVencimento: string
      proximaVisitaData?: string
      proximaVisitaTitulo?: string
    }[]
  }, [clientes, contratosOM, sistemas, servicosAdicionaisOM, anomaliasOM, servicosAvulsos])

  // 2. Clientes Pós-Vendas
  // Todos os clientes que têm relacionamento com a Delfos mas não têm plano de manutenção.
  // Isso inclui clientes que instalaram energia solar e clientes que já fizeram serviços avulsos.
  // Dentro dessa lista, marque automaticamente como Oportunidade de O&M os clientes que instalaram solar mas ainda não contrataram manutenção.
  const clientesPosVendas = useMemo(() => {
    return clientes
      .map((cliente) => {
        const sistema = sistemas.find((s) => s.cliente_id === cliente.id)
        const potencia = sistema?.potencia_total_kwp ?? cliente.potencia_kwp ?? 0

        const { categoria, temServicoAvulsoHistorico, ultimoServicoAvulso } = categorizarClienteOM(
          cliente.id,
          contratosOM,
          servicosAdicionaisOM,
          anomaliasOM,
          servicosAvulsos,
        )

        // Se tem plano ativo, NÃO entra no Pós-Vendas
        if (categoria === 'plano_ativo') return null

        const avulsosDoCliente = servicosAvulsos.filter((s) => s.cliente_id === cliente.id)
        const adicionaisDoCliente = servicosAdicionaisOM.filter((s) => s.cliente_id === cliente.id)
        const totalServicosAvulsos = avulsosDoCliente.length + adicionaisDoCliente.length

        // Critério para instalou solar:
        // - Potência cadastrada no sistema ou cliente > 0
        // - Possui data de instalação
        // - Produto é Energia Solar ou status Fechado
        const instalouSolar =
          potencia > 0 ||
          Boolean(cliente.data_instalacao) ||
          cliente.status === 'Fechado' ||
          cliente.produto === 'Energia Solar'

        // É uma oportunidade de O&M automática se instalou solar mas não tem plano O&M contratado
        const isOportunidadeOM = instalouSolar

        // Próximo agendamento / último serviço avulso
        const proximoServicoAgendado = avulsosDoCliente.find((s) => s.status === 'agendado')
        const servicoMaisRecente = ultimoServicoAvulso || avulsosDoCliente[0]

        return {
          cliente,
          potenciaKwp: potencia,
          instalouSolar,
          isOportunidadeOM,
          temServicoAvulso: totalServicosAvulsos > 0,
          totalServicosAvulsos,
          ultimoServicoAvulso: servicoMaisRecente,
          proximoServicoAgendado,
          dataInstalacao: sistema?.data_instalacao || cliente.data_instalacao,
        }
      })
      .filter(Boolean) as {
      cliente: Cliente
      potenciaKwp: number
      instalouSolar: boolean
      isOportunidadeOM: boolean
      temServicoAvulso: boolean
      totalServicosAvulsos: number
      ultimoServicoAvulso?: ServicoAvulso
      proximoServicoAgendado?: ServicoAvulso
      dataInstalacao?: string
    }[]
  }, [clientes, contratosOM, sistemas, servicosAdicionaisOM, anomaliasOM, servicosAvulsos])

  // Contagens
  const countComPlano = clientesComPlano.length
  const countPosVendas = clientesPosVendas.length
  const countOportunidadesOM = clientesPosVendas.filter((p) => p.isOportunidadeOM).length
  const countComServicoAvulso = clientesPosVendas.filter((p) => p.temServicoAvulso).length

  // Filtragem da lista 1 (Com Plano)
  const itensPlanoFiltrados = useMemo(() => {
    return clientesComPlano
      .filter((item) => {
        const matchBusca =
          !busca.trim() ||
          item.cliente.nome.toLowerCase().includes(busca.toLowerCase()) ||
          (item.cliente.cidade || '').toLowerCase().includes(busca.toLowerCase())
        const matchPlano = filtroPlano === 'todos' || item.plano === filtroPlano
        return matchBusca && matchPlano
      })
      .sort((a, b) => {
        if (ordenacao === 'nome') return a.cliente.nome.localeCompare(b.cliente.nome)
        if (ordenacao === 'potencia') return b.potenciaKwp - a.potenciaKwp
        if (ordenacao === 'valor') return b.valorMensal - a.valorMensal
        if (ordenacao === 'proxima_visita') {
          const tA = a.proximaVisitaData ? new Date(a.proximaVisitaData).getTime() : 0
          const tB = b.proximaVisitaData ? new Date(b.proximaVisitaData).getTime() : 0
          return tA - tB
        }
        return 0
      })
  }, [clientesComPlano, busca, filtroPlano, ordenacao])

  // Filtragem da lista 2 (Pós-Vendas)
  const itensPosVendasFiltrados = useMemo(() => {
    return clientesPosVendas
      .filter((item) => {
        const matchBusca =
          !busca.trim() ||
          item.cliente.nome.toLowerCase().includes(busca.toLowerCase()) ||
          (item.cliente.cidade || '').toLowerCase().includes(busca.toLowerCase())

        if (filtroPosVendas === 'oportunidades') {
          return matchBusca && item.isOportunidadeOM
        }
        if (filtroPosVendas === 'servico_avulso') {
          return matchBusca && item.temServicoAvulso
        }
        return matchBusca
      })
      .sort((a, b) => {
        // No topo, quem é Oportunidade de O&M
        if (a.isOportunidadeOM !== b.isOportunidadeOM) {
          return a.isOportunidadeOM ? -1 : 1
        }
        if (ordenacao === 'nome') return a.cliente.nome.localeCompare(b.cliente.nome)
        if (ordenacao === 'potencia') return b.potenciaKwp - a.potenciaKwp
        return 0
      })
  }, [clientesPosVendas, busca, filtroPosVendas, ordenacao])

  const renderPlanoBadge = (plano: OMPlanoTipo) => {
    switch (plano) {
      case 'Completo':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
            Plano Completo
          </span>
        )
      case 'Prevenção':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            Plano Prevenção
          </span>
        )
      case 'Essencial':
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            Plano Essencial
          </span>
        )
    }
  }

  const renderStatusPlanoBadge = (status: string) => {
    if (status === 'Ativo') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Ativo
        </span>
      )
    }
    if (status === 'Vencendo em 30 dias') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3 h-3 text-amber-600" />
          Vencendo
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
        {status}
      </span>
    )
  }

  return (
    <div className="space-y-5">
      {/* ========================================================================= */}
      {/* SELETOR DAS 2 LISTAS PRINCIPAIS EXIGIDAS:                                  */}
      {/* 1. Clientes com Plano de Manutenção                                       */}
      {/* 2. Clientes Pós-Vendas                                                    */}
      {/* ========================================================================= */}
      <div className="bg-white p-2 rounded-2xl border border-gray-200/90 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="grid grid-cols-2 gap-2 flex-1 max-w-2xl">
          {/* Sub-aba 1: Clientes com Plano de Manutenção */}
          <button
            type="button"
            onClick={() => setSubTab('com_plano')}
            className={`flex items-center justify-center sm:justify-start gap-2.5 px-4 py-3 rounded-xl transition-all text-left ${
              currentSubTab === 'com_plano'
                ? 'bg-emerald-600 text-white shadow-md font-bold'
                : 'bg-gray-50/80 text-gray-700 hover:bg-emerald-50 hover:text-emerald-800'
            }`}
          >
            <div
              className={`p-1.5 rounded-lg shrink-0 ${
                currentSubTab === 'com_plano'
                  ? 'bg-white/20 text-white'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold truncate">
                1. Clientes com Plano de Manutenção
              </div>
              <div
                className={`text-[11px] truncate ${
                  currentSubTab === 'com_plano' ? 'text-emerald-100' : 'text-gray-500'
                }`}
              >
                {countComPlano} {countComPlano === 1 ? 'contrato ativo' : 'contratos ativos'}
              </div>
            </div>
          </button>

          {/* Sub-aba 2: Clientes Pós-Vendas */}
          <button
            type="button"
            onClick={() => setSubTab('pos_vendas')}
            className={`flex items-center justify-center sm:justify-start gap-2.5 px-4 py-3 rounded-xl transition-all text-left ${
              currentSubTab === 'pos_vendas'
                ? 'bg-slate-900 text-white shadow-md font-bold'
                : 'bg-gray-50/80 text-gray-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div
              className={`p-1.5 rounded-lg shrink-0 ${
                currentSubTab === 'pos_vendas'
                  ? 'bg-white/20 text-white'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold truncate">2. Clientes Pós-Vendas</div>
              <div
                className={`text-[11px] truncate ${
                  currentSubTab === 'pos_vendas' ? 'text-slate-300' : 'text-gray-500'
                }`}
              >
                {countPosVendas} clientes • {countOportunidadesOM} oportunidades O&M
              </div>
            </div>
          </button>
        </div>

        {/* Botão de Ação Rápida */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {currentSubTab === 'com_plano' ? (
            <button
              type="button"
              onClick={onOpenNovoContrato}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Contrato O&M</span>
            </button>
          ) : (
            <div className="text-xs text-slate-500 hidden sm:block pr-2">
              Clique em{' '}
              <strong className="text-emerald-700 font-semibold">Oferecer Serviço Avulso</strong> em
              qualquer cliente para registrar atendimentos técnicos.
            </div>
          )}
        </div>
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
            placeholder={
              currentSubTab === 'com_plano'
                ? 'Buscar por cliente com plano ou cidade...'
                : 'Buscar clientes pós-vendas por nome ou cidade...'
            }
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        {/* Filtros específicos da sub-aba ativa */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {currentSubTab === 'com_plano' ? (
            <>
              {/* Filtro Plano */}
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

              {/* Ordenar */}
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 font-medium hidden sm:inline">Ordenar:</span>
                <select
                  value={ordenacao}
                  onChange={(e) => setOrdenacao(e.target.value as any)}
                  className="px-2.5 py-2 rounded-lg border border-gray-300 bg-white font-medium text-gray-700 text-xs"
                >
                  <option value="nome">Nome do cliente (A-Z)</option>
                  <option value="potencia">Maior potência (kWp)</option>
                  <option value="valor">Maior valor mensal (R$)</option>
                  <option value="proxima_visita">Próxima visita agendada</option>
                </select>
              </div>
            </>
          ) : (
            <>
              {/* Filtro Pós-Vendas */}
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 font-medium hidden sm:inline">Filtrar por:</span>
                <select
                  value={filtroPosVendas}
                  onChange={(e) => setFiltroPosVendas(e.target.value as any)}
                  className="px-2.5 py-2 rounded-lg border border-gray-300 bg-white font-medium text-gray-700 text-xs"
                >
                  <option value="todos">Todos os Clientes Pós-Vendas ({countPosVendas})</option>
                  <option value="oportunidades">
                    ⭐ Oportunidades de O&M (Solar instalado) ({countOportunidadesOM})
                  </option>
                  <option value="servico_avulso">
                    Com serviço avulso realizado ({countComServicoAvulso})
                  </option>
                </select>
              </div>

              {/* Ordenar */}
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 font-medium hidden sm:inline">Ordenar:</span>
                <select
                  value={ordenacao}
                  onChange={(e) => setOrdenacao(e.target.value as any)}
                  className="px-2.5 py-2 rounded-lg border border-gray-300 bg-white font-medium text-gray-700 text-xs"
                >
                  <option value="nome">Nome do cliente (A-Z)</option>
                  <option value="potencia">Maior potência instalada (kWp)</option>
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LISTA 1: CLIENTES COM PLANO DE MANUTENÇÃO                                  */}
      {/* ========================================================================= */}
      {currentSubTab === 'com_plano' && (
        <div className="space-y-3">
          {itensPlanoFiltrados.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-gray-200">
              <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-gray-800">
                Nenhum cliente com plano O&M ativo encontrado
              </h4>
              <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                Tente ajustar a busca ou registre um novo contrato O&M para começar.
              </p>
              {onOpenNovoContrato && (
                <button
                  type="button"
                  onClick={onOpenNovoContrato}
                  className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700"
                >
                  <Plus className="w-4 h-4" />
                  Novo Contrato O&M
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Tabela Desktop */}
              <div className="hidden lg:block bg-white rounded-xl border border-gray-200/90 shadow-xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAF9] border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Cliente & Local</th>
                      <th className="py-3.5 px-4">Dados do Contrato</th>
                      <th className="py-3.5 px-4">Potência (kWp)</th>
                      <th className="py-3.5 px-4">Valor Mensal</th>
                      <th className="py-3.5 px-4">Próxima Visita Agendada</th>
                      <th className="py-3.5 px-4">Status do Plano</th>
                      <th className="py-3.5 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {itensPlanoFiltrados.map((item) => {
                      return (
                        <tr
                          key={item.cliente.id}
                          onClick={() => onOpenFichaOM(item.cliente.id)}
                          className="hover:bg-emerald-50/40 transition-colors cursor-pointer group"
                        >
                          {/* Cliente & Local */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                              {item.cliente.nome}
                            </div>
                            <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-gray-400" />
                              {item.cliente.cidade || 'Erechim/RS'}
                            </div>
                          </td>

                          {/* Dados do Contrato */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-1">
                              <div>{renderPlanoBadge(item.plano)}</div>
                              <span className="text-[11px] text-gray-500">
                                Vigência até {formatDate(item.dataVencimento)}
                              </span>
                            </div>
                          </td>

                          {/* Potência do Sistema */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-bold text-gray-800 flex items-center gap-1">
                              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                              <span>{item.potenciaKwp > 0 ? `${item.potenciaKwp} kWp` : '—'}</span>
                            </div>
                          </td>

                          {/* Valor Mensal */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-extrabold text-emerald-700 text-sm">
                              {formatCurrency(item.valorMensal)}
                              <span className="text-[11px] font-normal text-gray-400">/mês</span>
                            </div>
                          </td>

                          {/* Próxima Visita Agendada */}
                          <td className="py-3.5 px-4 max-w-[220px]">
                            {item.proximaVisitaData ? (
                              <div className="space-y-0.5">
                                <div className="text-xs font-semibold text-blue-700 flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                                  <span>{formatDate(item.proximaVisitaData)}</span>
                                </div>
                                <p
                                  className="text-[11px] text-gray-600 truncate"
                                  title={item.proximaVisitaTitulo}
                                >
                                  {item.proximaVisitaTitulo || 'Visita técnica preventiva'}
                                </p>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs italic">
                                Nenhuma visita agendada
                              </span>
                            )}
                          </td>

                          {/* Status do Plano */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {renderStatusPlanoBadge(item.statusPlano)}
                          </td>

                          {/* Ação */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 group-hover:text-emerald-900 group-hover:underline">
                              Gerenciar O&M
                              <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Cards Mobile */}
              <div className="lg:hidden space-y-3">
                {itensPlanoFiltrados.map((item) => (
                  <div
                    key={item.cliente.id}
                    onClick={() => onOpenFichaOM(item.cliente.id)}
                    className="bg-white rounded-xl border border-emerald-200/90 p-4 shadow-xs hover:border-emerald-400 transition-colors cursor-pointer space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm">{item.cliente.nome}</h4>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {item.cliente.cidade || 'Erechim/RS'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {renderPlanoBadge(item.plano)}
                        {renderStatusPlanoBadge(item.statusPlano)}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-100">
                      <div>
                        <span className="text-gray-400 block text-[11px]">Potência do Sistema</span>
                        <span className="font-bold text-gray-800 flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                          {item.potenciaKwp > 0 ? `${item.potenciaKwp} kWp` : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[11px]">Valor Mensal</span>
                        <span className="font-extrabold text-emerald-700">
                          {formatCurrency(item.valorMensal)}/mês
                        </span>
                      </div>
                    </div>

                    {item.proximaVisitaData && (
                      <div className="bg-blue-50/70 p-2.5 rounded-lg text-xs space-y-0.5">
                        <span className="text-[11px] font-bold text-blue-700 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Próxima Visita: {formatDate(item.proximaVisitaData)}
                        </span>
                        <p className="text-gray-700 text-[11px] truncate">
                          {item.proximaVisitaTitulo || 'Visita preventiva agendada'}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-xs">
                      <span className="text-gray-400 text-[11px]">
                        Vigência até {formatDate(item.dataVencimento)}
                      </span>
                      <span className="font-bold text-emerald-700 flex items-center gap-1">
                        Gerenciar O&M
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* LISTA 2: CLIENTES PÓS-VENDAS                                               */}
      {/* ========================================================================= */}
      {currentSubTab === 'pos_vendas' && (
        <div className="space-y-3">
          {/* Banner Explicativo da Lista Pós-Vendas */}
          <div className="rounded-xl bg-gradient-to-r from-amber-50 to-emerald-50 border border-amber-200/80 p-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 text-amber-800 rounded-lg shrink-0">
                <Sparkles className="w-5 h-5 text-amber-700" />
              </div>
              <div className="text-xs text-slate-700 leading-relaxed">
                <p className="font-bold text-slate-900 text-sm">
                  Base de Relacionamento Pós-Vendas (Clientes sem Plano O&M)
                </p>
                <p className="mt-0.5">
                  Reúne todos os clientes que já instalaram usinas solares ou contrataram serviços
                  avulsos da Delfos. Clientes com usina solar instalada são marcados automaticamente
                  como <strong className="text-amber-800 font-bold">Oportunidade de O&M</strong>{' '}
                  para oferta de planos preventivos ou limpezas periódicas.
                </p>
              </div>
            </div>
          </div>

          {itensPosVendasFiltrados.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-gray-200">
              <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-gray-800">
                Nenhum cliente pós-vendas encontrado
              </h4>
              <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                Tente ajustar os termos de busca ou o filtro de oportunidades.
              </p>
            </div>
          ) : (
            <>
              {/* Tabela Desktop */}
              <div className="hidden lg:block bg-white rounded-xl border border-gray-200/90 shadow-xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAF9] border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Cliente & Local</th>
                      <th className="py-3.5 px-4">Potência / Sistema</th>
                      <th className="py-3.5 px-4">Classificação Pós-Vendas</th>
                      <th className="py-3.5 px-4">Serviços Avulsos Realizados</th>
                      <th className="py-3.5 px-4">Último / Próximo Atendimento</th>
                      <th className="py-3.5 px-4 text-right">Ações Rápidas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {itensPosVendasFiltrados.map((item) => {
                      return (
                        <tr
                          key={item.cliente.id}
                          className="hover:bg-amber-50/30 transition-colors group"
                        >
                          {/* Cliente & Local */}
                          <td
                            className="py-3.5 px-4 cursor-pointer"
                            onClick={() => openFichaCliente(item.cliente.id)}
                          >
                            <div className="font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                              {item.cliente.nome}
                            </div>
                            <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-gray-400" />
                              {item.cliente.cidade || 'Erechim/RS'}
                              {item.cliente.telefone && ` • ${item.cliente.telefone}`}
                            </div>
                          </td>

                          {/* Potência / Sistema */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {item.potenciaKwp > 0 ? (
                              <div>
                                <span className="font-bold text-gray-900 flex items-center gap-1">
                                  <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                  {item.potenciaKwp} kWp instalado
                                </span>
                                {item.dataInstalacao && (
                                  <span className="text-[10px] text-gray-400 block">
                                    Instalação: {formatDate(item.dataInstalacao)}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 italic text-[11px]">
                                Sem usina cadastrada
                              </span>
                            )}
                          </td>

                          {/* Classificação: Badge automático "Oportunidade de O&M" */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {item.isOportunidadeOM ? (
                              <div className="flex flex-col gap-1 items-start">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                                  <Sparkles className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                                  ⭐ Oportunidade de O&M
                                </span>
                                <span className="text-[10px] text-amber-700 font-medium pl-1">
                                  Instalou solar sem plano O&M
                                </span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                <Wrench className="w-3 h-3 text-slate-500" />
                                Cliente de Serviço Avulso
                              </span>
                            )}
                          </td>

                          {/* Serviços Avulsos */}
                          <td className="py-3.5 px-4">
                            {item.totalServicosAvulsos > 0 ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  <Wrench className="w-3 h-3" />
                                  {item.totalServicosAvulsos}{' '}
                                  {item.totalServicosAvulsos === 1 ? 'serviço' : 'serviços'}
                                </span>
                                {item.ultimoServicoAvulso && (
                                  <p
                                    className="text-[11px] text-gray-500 truncate max-w-[200px]"
                                    title={item.ultimoServicoAvulso.observacoes_tecnicas}
                                  >
                                    Último:{' '}
                                    {item.ultimoServicoAvulso.tipo_servico.replace('_', ' ')} (
                                    {formatDate(item.ultimoServicoAvulso.data_servico)})
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs italic">
                                Nenhum serviço registrado
                              </span>
                            )}
                          </td>

                          {/* Último / Próximo Atendimento */}
                          <td className="py-3.5 px-4 max-w-[220px]">
                            {item.proximoServicoAgendado ? (
                              <div className="space-y-0.5">
                                <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Agendado: {formatDate(item.proximoServicoAgendado.data_servico)}
                                </span>
                                <p className="text-[11px] text-gray-600 truncate">
                                  {item.proximoServicoAgendado.tipo_servico.replace('_', ' ')}
                                </p>
                              </div>
                            ) : item.ultimoServicoAvulso ? (
                              <div className="space-y-0.5">
                                <span className="text-[11px] font-medium text-gray-600 block">
                                  Realizado em {formatDate(item.ultimoServicoAvulso.data_servico)}
                                </span>
                                <span className="text-[10px] text-emerald-600 font-bold block">
                                  Status: {item.ultimoServicoAvulso.status}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-amber-700 font-medium">
                                Pronto para contato O&M
                              </span>
                            )}
                          </td>

                          {/* Ações Rápidas */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setClienteParaServicoAvulso(item.cliente)
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-all hover:scale-[1.02]"
                                title="Oferecer serviço avulso (limpeza, visita, etc)"
                              >
                                <Wrench className="w-3.5 h-3.5 text-amber-700" />
                                <span>Oferecer Serviço</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openFichaCliente(item.cliente.id)
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-all hover:scale-[1.02]"
                                title="Abrir ficha do cliente"
                              >
                                <span>Ficha</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Cards Mobile */}
              <div className="lg:hidden space-y-3">
                {itensPosVendasFiltrados.map((item) => (
                  <div
                    key={item.cliente.id}
                    onClick={() => openFichaCliente(item.cliente.id)}
                    className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-xs hover:border-amber-300 transition-colors cursor-pointer space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm">{item.cliente.nome}</h4>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {item.cliente.cidade || 'Erechim/RS'}
                        </p>
                      </div>
                      {item.isOportunidadeOM && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                          <Sparkles className="w-3 h-3 text-amber-600" />
                          Oportunidade O&M
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-100">
                      <div>
                        <span className="text-gray-400 block text-[11px]">Sistema Solar</span>
                        <span className="font-bold text-gray-800 flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                          {item.potenciaKwp > 0 ? `${item.potenciaKwp} kWp` : 'Não possui'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[11px]">Serviços Avulsos</span>
                        <span className="font-bold text-gray-800">
                          {item.totalServicosAvulsos > 0
                            ? `${item.totalServicosAvulsos} registrado(s)`
                            : 'Nenhum'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setClienteParaServicoAvulso(item.cliente)
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-300 text-xs font-bold"
                      >
                        <Wrench className="w-3.5 h-3.5 text-amber-700" />
                        <span>Oferecer Serviço Avulso</span>
                      </button>

                      <span className="font-bold text-emerald-700 flex items-center gap-1 text-xs">
                        Ver Ficha
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Modal Registrar Serviço Avulso (acionado pela lista) */}
      {clienteParaServicoAvulso && (
        <ModalRegistrarServicoAvulso
          open={Boolean(clienteParaServicoAvulso)}
          onOpenChange={(open) => !open && setClienteParaServicoAvulso(null)}
          cliente={clienteParaServicoAvulso}
        />
      )}
    </div>
  )
}
export default ListaOM
