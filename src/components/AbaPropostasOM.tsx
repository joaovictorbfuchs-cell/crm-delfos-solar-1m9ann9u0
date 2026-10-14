import React, { useState, useMemo } from 'react'
import {
  FileCheck,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Trash2,
  Calendar,
  MapPin,
  User,
  Zap,
  RotateCcw,
  Eye,
  X,
  ChevronDown,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { ModalNovaPropostaOM } from '@/components/ModalNovaPropostaOM'
import { BotaoBaixarPropostaOMPDF } from '@/components/BotaoBaixarPropostaOMPDF'
import { formatCurrency, formatDateShort } from '@/lib/formatters'
import { calcularPropostaOM, type PropostaPDFInput } from '@/lib/propostaOMGenerator'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { PropostaOM, Cliente } from '@/types/crm'

export interface AbaPropostasOMProps {
  filtroStatusExterno?: string
  onNovoOrcamentoSolar?: () => void
  onNovaPropostaOM?: () => void
}

export const AbaPropostasOM: React.FC<AbaPropostasOMProps> = ({
  filtroStatusExterno = 'todos',
}) => {
  const { propostasOM, clientes, sistemas, usuarios, removePropostaOM, isLoading, refreshData } =
    useClientes()

  // Estados de busca e filtros
  const [busca, setBusca] = useState('')
  const [filtroPlano, setFiltroPlano] = useState<string>('todos')
  const [filtroConsultor, setFiltroConsultor] = useState<string>('todos')
  const [dataInicio, setDataInicio] = useState<string>('')
  const [dataFim, setDataFim] = useState<string>('')
  const [painelFiltrosAberto, setPainelFiltrosAberto] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Modais de Nova / Visualizar Proposta
  const [isNovaPropostaOpen, setIsNovaPropostaOpen] = useState(false)
  const [propostaParaVisualizar, setPropostaParaVisualizar] = useState<PropostaOM | null>(null)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshData()
    } finally {
      setIsRefreshing(false)
    }
  }

  // Lista de consultores encontrados nas propostas O&M
  const listaConsultores = useMemo(() => {
    const setNomes = new Set<string>()
    usuarios.forEach((u) => {
      if (u.name) setNomes.add(u.name.trim())
    })
    propostasOM.forEach((p) => {
      if (p.autor && p.autor.trim()) setNomes.add(p.autor.trim())
    })
    return Array.from(setNomes).sort((a, b) => a.localeCompare(b))
  }, [usuarios, propostasOM])

  const handleLimparFiltros = () => {
    setBusca('')
    setFiltroPlano('todos')
    setFiltroConsultor('todos')
    setDataInicio('')
    setDataFim('')
  }

  const totalFiltrosAtivos = useMemo(() => {
    let count = 0
    if (busca.trim()) count++
    if (filtroStatusExterno !== 'todos') count++
    if (filtroPlano !== 'todos') count++
    if (filtroConsultor !== 'todos') count++
    if (dataInicio) count++
    if (dataFim) count++
    return count
  }, [busca, filtroStatusExterno, filtroPlano, filtroConsultor, dataInicio, dataFim])

  // Filtragem e ordenação (mais recentes primeiro)
  const propostasFiltradas = useMemo(() => {
    const list = propostasOM.filter((prop) => {
      const cliente = prop.expand?.cliente_id || clientes.find((c) => c.id === prop.cliente_id)
      const nomeCliente = (cliente?.nome || '').toLowerCase()
      const cidade = (cliente?.cidade || '').toLowerCase()
      const autor = (prop.autor || '').toLowerCase()
      const b = busca.toLowerCase().trim()

      const matchBusca =
        !b ||
        nomeCliente.includes(b) ||
        cidade.includes(b) ||
        autor.includes(b) ||
        prop.id.toLowerCase().includes(b)

      const matchPlano =
        filtroPlano === 'todos' ||
        (prop.plano_escolhido || '').toLowerCase() === filtroPlano.toLowerCase()

      const matchConsultor =
        filtroConsultor === 'todos' || autor.includes(filtroConsultor.toLowerCase().trim())

      // Filtro de status O&M (da barra de filtro superior)
      let matchStatus = true
      if (filtroStatusExterno !== 'todos') {
        const sTarget = filtroStatusExterno.toLowerCase().trim()
        const stProp = (prop.status || 'Proposta Enviada').toLowerCase().trim()
        if (sTarget === 'proposta enviada' || sTarget === 'enviada') {
          matchStatus = stProp === 'proposta enviada' || stProp === 'enviada'
        } else if (sTarget === 'aprovada' || sTarget === 'aprovado') {
          matchStatus = stProp === 'aprovada' || stProp === 'aprovado'
        } else if (sTarget === 'rejeitada' || sTarget === 'recusada' || sTarget === 'rejeitado') {
          matchStatus = stProp === 'rejeitada' || stProp === 'recusada' || stProp === 'rejeitado'
        } else if (sTarget === 'em elaboração' || sTarget === 'em elaboracao') {
          matchStatus = stProp === 'em elaboração' || stProp === 'em elaboracao'
        } else {
          matchStatus = stProp === sTarget
        }
      }

      let matchData = true
      const rawData = prop.data_proposta || prop.created
      if (rawData) {
        const d = new Date(rawData)
        if (dataInicio) {
          const dtI = new Date(`${dataInicio}T00:00:00`)
          if (d < dtI) matchData = false
        }
        if (dataFim) {
          const dtF = new Date(`${dataFim}T23:59:59`)
          if (d > dtF) matchData = false
        }
      }

      return matchBusca && matchPlano && matchConsultor && matchStatus && matchData
    })

    return list.sort((a, b) => {
      const timeA = new Date(a.data_proposta || a.created || 0).getTime()
      const timeB = new Date(b.data_proposta || b.created || 0).getTime()
      return timeB - timeA
    })
  }, [
    propostasOM,
    clientes,
    busca,
    filtroPlano,
    filtroConsultor,
    filtroStatusExterno,
    dataInicio,
    dataFim,
  ])

  const handleExcluir = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm('Tem certeza de que deseja excluir esta proposta de O&M?')) return
    try {
      await removePropostaOM(id)
    } catch (err) {
      console.error('Erro ao excluir proposta O&M:', err)
      alert('Não foi possível excluir a proposta O&M.')
    }
  }

  const handleAbrirVisualizacao = (prop: PropostaOM) => {
    setPropostaParaVisualizar(prop)
    setIsNovaPropostaOpen(true)
  }

  const handleNovaProposta = () => {
    setPropostaParaVisualizar(null)
    setIsNovaPropostaOpen(true)
  }

  // Constrói objeto PropostaPDFInput para download direto a partir da lista
  const montarPDFData = (prop: PropostaOM, cliente?: Cliente | null): PropostaPDFInput => {
    const cpfOuCnpj = cliente?.cnpj || cliente?.cpf || ''
    const municipio = cliente?.cidade || 'Erechim/RS'
    const endereco = [cliente?.endereco, cliente?.numero, cliente?.bairro]
      .filter(Boolean)
      .join(', ')

    const sistema = sistemas.find((s) => s.cliente_id === prop.cliente_id)
    const geracaoMensalKwh = prop.geracao_mensal_kwh || sistema?.geracao_media_mensal_kwh || 1000
    const valorKwh = prop.valor_kwh || 0.92
    const distanciaKm = prop.distancia_km ?? 15
    const valorKm = prop.valor_km ?? 2.5
    const numeroModulos = prop.numero_modulos || sistema?.quantidade_modulos || 20
    const valorPorPlaca = prop.valor_por_placa ?? 9

    let valoresNegociados: Record<string, number | null> = {
      Essencial: prop.valor_plano_essencial || null,
      Inspeção: prop.valor_plano_inspecao || null,
      Completo: prop.valor_plano_completo || null,
    }

    if (prop.valores_negociados_json) {
      try {
        const parsed =
          typeof prop.valores_negociados_json === 'string'
            ? JSON.parse(prop.valores_negociados_json)
            : prop.valores_negociados_json
        valoresNegociados = { ...valoresNegociados, ...parsed }
      } catch {
        /* ignore */
      }
    }

    const calculos = calcularPropostaOM({
      geracaoMensalKwh,
      valorKwh,
      distanciaKm,
      valorKm,
      numeroModulos,
      valorPorPlaca,
      valoresNegociados,
    })

    return {
      cliente: {
        nome: cliente?.nome_fantasia
          ? `${cliente.nome} (${cliente.nome_fantasia})`
          : cliente?.nome || 'Cliente',
        cpfOuCnpj,
        endereco,
        municipio,
        email: cliente?.email || '',
        telefone: cliente?.telefone || '',
      },
      tecnico: {
        potenciaKwp: prop.potencia_kwp,
        geracaoMediaKwh: geracaoMensalKwh,
        marcaInversores: prop.marca_inversores || 'Inversores homologados',
        tipoInstalacao: prop.tipo_instalacao || 'Telhado cerâmico',
        numeroModulos,
      },
      parametros: {
        valorKwh,
        distanciaKm,
        valorKm,
        valorPorPlaca,
        valoresNegociados,
      },
      calculos,
      dataEmissao: prop.data_proposta || prop.created,
      autor: prop.autor || 'Equipe Comercial Delfos Solar',
    }
  }

  return (
    <div className="space-y-4 w-full">
      {/* Barra Superior de Ações e Filtros */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Busca Rápida Padronizada */}
          <div className="relative flex-1 max-w-xl">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar proposta..."
              className="w-full text-xs pl-9 pr-8 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end">
            <button
              type="button"
              onClick={() => setPainelFiltrosAberto((prev) => !prev)}
              aria-expanded={painelFiltrosAberto}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                painelFiltrosAberto
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-2xs ring-2 ring-emerald-500/20'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-2xs'
              }`}
              title={painelFiltrosAberto ? 'Recolher filtros' : 'Expandir filtros'}
            >
              <Filter className="w-3.5 h-3.5 text-emerald-600" />
              <span>Filtros</span>
              {totalFiltrosAtivos > 0 && (
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-black inline-flex items-center justify-center">
                  {totalFiltrosAtivos}
                </span>
              )}
              <ChevronDown
                className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${
                  painelFiltrosAberto ? 'rotate-180 text-emerald-700' : ''
                }`}
              />
            </button>

            <button
              type="button"
              onClick={handleNovaProposta}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl shadow-xs transition-all hover:shadow cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>&nbsp;O&amp;M</span>
            </button>
          </div>
        </div>

        {/* Painel expansível de filtros */}
        {painelFiltrosAberto && (
          <div className="pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in duration-200">
            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                Plano Escolhido
              </label>
              <select
                value={filtroPlano}
                onChange={(e) => setFiltroPlano(e.target.value)}
                className="w-full text-xs py-2 px-2.5 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="todos">Todos os planos</option>
                <option value="Essencial">Plano Essencial</option>
                <option value="Inspeção">Plano Inspeção</option>
                <option value="Completo">Plano Completo</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                Consultor
              </label>
              <select
                value={filtroConsultor}
                onChange={(e) => setFiltroConsultor(e.target.value)}
                className="w-full text-xs py-2 px-2.5 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="todos">Todos os consultores</option>
                {listaConsultores.map((cons) => (
                  <option key={cons} value={cons}>
                    {cons}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                Data Inicial
              </label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              ></input>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                Data Final
              </label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              ></input>
            </div>

            {totalFiltrosAtivos > 0 && (
              <div className="sm:col-span-2 lg:col-span-4 flex items-center justify-end pt-1">
                <button
                  type="button"
                  onClick={handleLimparFiltros}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
                  <span>Limpar filtros</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Linha de contadores */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-black text-gray-900 text-sm">
              {propostasFiltradas.length === 1
                ? '1 proposta O&M encontrada'
                : `${propostasFiltradas.length} propostas O&M encontradas`}
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-500 font-medium">
              Total da carteira: {propostasOM.length}
            </span>
          </div>
        </div>
      </div>

      {/* Tabela de Propostas O&M */}
      {propostasFiltradas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
          <FileCheck className="w-12 h-12 text-emerald-400 mx-auto mb-3 stroke-[1.5]" />
          <h3 className="text-base font-bold text-gray-800">Nenhuma proposta O&amp;M encontrada</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
            {totalFiltrosAtivos > 0
              ? 'Nenhum resultado corresponde aos filtros selecionados. Tente ajustar os parâmetros.'
              : 'Gere sua primeira proposta de Operação & Manutenção com comparativo de planos e análise de risco.'}
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {totalFiltrosAtivos > 0 && (
              <button
                type="button"
                onClick={handleLimparFiltros}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl transition-colors"
              >
                <RotateCcw className="w-4 h-4 text-emerald-600" />
                <span>Limpar filtros</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleNovaProposta}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#16A34A] text-white text-xs font-bold rounded-xl hover:bg-[#15803D] transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Proposta O&amp;M</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden w-full">
          <div className="overflow-x-auto">
            <TooltipProvider delayDuration={150}>
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Cliente &amp; Cidade</th>
                    <th className="py-3 px-3 whitespace-nowrap">Consultor</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">Potência / Usina</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">Ativo Protegido</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">Planos (Mensal)</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">Status</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">Data</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {propostasFiltradas.map((prop) => {
                    const cliente =
                      prop.expand?.cliente_id || clientes.find((c) => c.id === prop.cliente_id)
                    const nomeCliente = cliente?.nome || 'Cliente não identificado'

                    // Valores dos planos
                    const valEssencial = prop.valor_plano_essencial
                    const valInspecao = prop.valor_plano_inspecao || prop.valor_mensal_plano
                    const valCompleto = prop.valor_plano_completo
                    const ativoProtegido = prop.valor_ativo_protegido || 0

                    const pdfData = montarPDFData(prop, cliente)

                    return (
                      <tr
                        key={prop.id}
                        onClick={() => handleAbrirVisualizacao(prop)}
                        className="hover:bg-emerald-50/30 cursor-pointer transition-colors group"
                      >
                        {/* Cliente & Cidade */}
                        <td className="py-3 px-4 min-w-[200px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                              {nomeCliente}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                              O&amp;M
                            </span>
                            {prop.plano_escolhido && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                                {prop.plano_escolhido}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-0.5 flex-wrap">
                            <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                            <span>{cliente?.cidade || '—'}</span>
                            {cliente?.telefone && (
                              <>
                                <span className="text-gray-300">•</span>
                                <span>{cliente.telefone}</span>
                              </>
                            )}
                          </div>
                        </td>

                        {/* Consultor */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="font-semibold text-gray-800 text-[11px] flex items-center gap-1">
                            <User className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span className="truncate max-w-[140px]">
                              {prop.autor || 'Delfos Solar O&M'}
                            </span>
                          </div>
                        </td>

                        {/* Potência / Usina */}
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="font-bold text-gray-900 text-xs tabular-nums flex items-center justify-end gap-1">
                            <Zap className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                            <span>
                              {prop.potencia_kwp > 0 ? `${prop.potencia_kwp} kWp` : '5 kWp'}
                            </span>
                          </div>
                          <div className="text-[10px] text-gray-400 tabular-nums leading-tight mt-0.5">
                            {prop.numero_modulos
                              ? `${prop.numero_modulos} placas`
                              : 'Conforme usina'}
                          </div>
                        </td>

                        {/* Ativo Protegido */}
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="font-black text-emerald-700 text-sm tabular-nums leading-tight">
                            {ativoProtegido > 0 ? formatCurrency(ativoProtegido) : '—'}
                          </div>
                          <div className="text-[10px] text-gray-400 tabular-nums leading-tight mt-0.5">
                            {prop.geracao_mensal_kwh ? `${prop.geracao_mensal_kwh} kWh/mês` : '—'}
                          </div>
                        </td>

                        {/* Planos (Mensal) */}
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="space-y-0.5 text-right">
                            {valInspecao ? (
                              <div className="font-bold text-gray-800 text-xs tabular-nums">
                                <span className="text-gray-400 text-[10px] mr-1">Insp:</span>
                                {formatCurrency(valInspecao)}/mês
                              </div>
                            ) : null}
                            <div className="text-[10px] text-gray-500 tabular-nums">
                              {valEssencial && (
                                <span className="mr-2">
                                  <span className="text-gray-400">Ess:</span>{' '}
                                  {formatCurrency(valEssencial)}
                                </span>
                              )}
                              {valCompleto && (
                                <span>
                                  <span className="text-gray-400">Comp:</span>{' '}
                                  {formatCurrency(valCompleto)}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                            <FileCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>{prop.status || 'Proposta Enviada'}</span>
                          </span>
                        </td>

                        {/* Data */}
                        <td className="py-3 px-3 text-center text-gray-500 text-[11px] whitespace-nowrap font-medium tabular-nums">
                          <div className="flex items-center justify-center gap-1">
                            <Calendar className="w-3 h-3 text-gray-400 shrink-0" />
                            <span>{formatDateShort(prop.data_proposta || prop.created)}</span>
                          </div>
                        </td>

                        {/* Ações */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div
                            className="flex items-center justify-end gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => handleAbrirVisualizacao(prop)}
                                  className="p-1.5 rounded-lg bg-gray-50 text-gray-700 border border-gray-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-all shadow-2xs shrink-0"
                                  aria-label="Visualizar e editar proposta O&M"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <span>Visualizar / Editar</span>
                              </TooltipContent>
                            </Tooltip>

                            {/* Botão Baixar PDF */}
                            <BotaoBaixarPropostaOMPDF
                              dados={pdfData}
                              observacoesAdicionais={prop.observacoes || ''}
                              variante="outline"
                              tamanho="sm"
                              rotulo="PDF"
                              className="h-7 text-xs font-bold px-2 border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                            />

                            {/* Excluir */}
                            <button
                              type="button"
                              onClick={(e) => handleExcluir(prop.id, e)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                              title="Excluir proposta O&M"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </TooltipProvider>
          </div>
        </div>
      )}

      {/* Modal Nova / Editar Proposta O&M */}
      <ModalNovaPropostaOM
        isOpen={isNovaPropostaOpen}
        onClose={() => {
          setIsNovaPropostaOpen(false)
          setPropostaParaVisualizar(null)
        }}
        initialClienteId={propostaParaVisualizar?.cliente_id}
        initialProposta={propostaParaVisualizar}
      />
    </div>
  )
}

export default AbaPropostasOM
