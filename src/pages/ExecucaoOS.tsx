import React, { useState, useEffect, useMemo } from 'react'
import { OrdemServico, OSTipoServico } from '@/types/crm'
import { fetchOrdensServico } from '@/services/crmService'
import { FichaExecucaoOS } from '@/components/FichaExecucaoOS'
import { CalendarioExecucaoOS } from '@/components/CalendarioExecucaoOS'
import { RelatorioOSPrestador } from '@/components/RelatorioOSPrestador'
import { useToast } from '@/hooks/use-toast'
import { formatDateTime } from '@/lib/formatters'
import {
  Wrench,
  FileText,
  Clock,
  CheckCircle2,
  MapPin,
  Calendar,
  ChevronRight,
  User,
  Search,
  Filter,
  Sparkles,
  Zap,
  RefreshCw,
  Sun,
  ShieldCheck,
  CheckCheck,
  BarChart3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

import { useAuth } from '@/contexts/AuthContext'
import { fetchInstaladoresAtivos } from '@/services/usuariosService'
import { BotaoEnviarOSWhatsApp } from '@/components/BotaoEnviarOSWhatsApp'
import type { SistemaUsuario } from '@/types/crm'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function ExecucaoOS() {
  const { toast } = useToast()
  const { userProfile, isAdmin, isInstalador } = useAuth()

  const [ordens, setOrdens] = useState<OrdemServico[]>([])
  const [instaladores, setInstaladores] = useState<SistemaUsuario[]>([])
  const [profissionais, setProfissionais] = useState<{ id: string; nome: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Modal para admin atribuir / reatribuir instalador a uma OS
  const [osParaAtribuir, setOsParaAtribuir] = useState<OrdemServico | null>(null)
  const [selectedInstaladorId, setSelectedInstaladorId] = useState<string>('')
  const [selectedProfissionalId, setSelectedProfissionalId] = useState<string>('')
  const [isSavingAtribuicao, setIsSavingAtribuicao] = useState(false)

  // OS atualmente aberta na Ficha de Execução (null = tela inicial/lista)
  const [selectedOS, setSelectedOS] = useState<OrdemServico | null>(null)

  // Aba / Filtro na Lista: 'pendentes', 'calendario', 'concluidas' ou 'relatorio' (apenas admin)
  const [activeTab, setActiveTab] = useState<
    'pendentes' | 'concluidas' | 'calendario' | 'relatorio'
  >('pendentes')

  // Filtros de busca, tipo, prestador e período
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTipoFilter, setSelectedTipoFilter] = useState<string>('todos')
  const [selectedPrestadorFilter, setSelectedPrestadorFilter] = useState<string>('todos')
  const [selectedPeriodoFilter, setSelectedPeriodoFilter] = useState<string>('todos')

  // Carrega OSs e prestadores do banco
  const carregarDados = async () => {
    setIsLoading(true)
    try {
      const { fetchProfissionais } = await import('@/services/crmService')
      const responsavelFiltro = isInstalador && userProfile?.id ? userProfile.id : undefined
      const promises: [Promise<OrdemServico[]>, Promise<SistemaUsuario[]>, Promise<any[]>] = [
        fetchOrdensServico(undefined, responsavelFiltro),
        isAdmin ? fetchInstaladoresAtivos() : Promise.resolve([]),
        fetchProfissionais ? fetchProfissionais() : Promise.resolve([]),
      ]
      const [osList, instList, profList] = await Promise.all(promises)
      setOrdens(Array.isArray(osList) ? osList : [])
      setInstaladores(Array.isArray(instList) ? instList : [])
      setProfissionais(Array.isArray(profList) ? profList : [])
    } catch (err) {
      console.error('Erro ao carregar dados de OS:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar serviços de campo',
        description: 'Tente recarregar a página.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [isInstalador, userProfile?.id])

  // Callback de OS atualizada (rascunho ou salva)
  const handleOSUpdated = (updatedOS: OrdemServico) => {
    setOrdens((prev) => prev.map((item) => (item.id === updatedOS.id ? updatedOS : item)))
    if (selectedOS?.id === updatedOS.id) {
      setSelectedOS(updatedOS)
    }
  }

  // Callback de OS finalizada
  const handleOSFinalizada = (finalizedOS: OrdemServico) => {
    setOrdens((prev) => prev.map((item) => (item.id === finalizedOS.id ? finalizedOS : item)))
    setSelectedOS(null)
    setActiveTab('concluidas')
  }

  // Filtros aplicados com checagem segura contra array nulo
  const pendentesList = useMemo(() => {
    return (ordens || []).filter((o) => o && o.status === 'pendente')
  }, [ordens])

  const concluidasList = useMemo(() => {
    return (ordens || []).filter((o) => o && o.status === 'concluida')
  }, [ordens])

  const listToDisplay = activeTab === 'pendentes' ? pendentesList : concluidasList

  // Lista de todos os nomes de prestadores para o dropdown
  const prestadoresOpcoes = useMemo(() => {
    const set = new Set<string>()
    ordens.forEach((os) => {
      if (os.atribuida_a) set.add(os.atribuida_a)
    })
    instaladores.forEach((i) => {
      if (i.name) set.add(i.name)
    })
    profissionais.forEach((p) => {
      if (p.nome) set.add(p.nome)
    })
    return Array.from(set).sort()
  }, [ordens, instaladores, profissionais])

  const filteredList = useMemo(() => {
    const agora = new Date()
    const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).getTime()
    const fimHoje = inicioHoje + 24 * 60 * 60 * 1000 - 1

    const inicioSemana = new Date(agora)
    inicioSemana.setDate(agora.getDate() - agora.getDay())
    inicioSemana.setHours(0, 0, 0, 0)
    const fimSemana = new Date(inicioSemana)
    fimSemana.setDate(inicioSemana.getDate() + 7)

    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).getTime()
    const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59).getTime()

    return (listToDisplay || []).filter((os) => {
      if (!os) return false

      // Filtro por tipo de serviço
      if (selectedTipoFilter !== 'todos' && os.tipo_servico !== selectedTipoFilter) {
        return false
      }

      // Filtro por prestador
      if (selectedPrestadorFilter !== 'todos') {
        const prestadorOS = (os.atribuida_a || '').toLowerCase()
        const target = selectedPrestadorFilter.toLowerCase()
        if (
          !prestadorOS.includes(target) &&
          os.responsavel_usuario_id !== selectedPrestadorFilter
        ) {
          return false
        }
      }

      // Filtro por período
      if (selectedPeriodoFilter !== 'todos' && os.data_agendada) {
        const dataOS = new Date(os.data_agendada).getTime()
        if (selectedPeriodoFilter === 'hoje') {
          if (dataOS < inicioHoje || dataOS > fimHoje) return false
        } else if (selectedPeriodoFilter === 'semana') {
          if (dataOS < inicioSemana.getTime() || dataOS > fimSemana.getTime()) return false
        } else if (selectedPeriodoFilter === 'mes') {
          if (dataOS < inicioMes || dataOS > fimMes) return false
        }
      }

      // Busca por nome do cliente, endereço ou técnico
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase()
        const clienteNome = (
          os.expand?.cliente_id?.nome ||
          os.expand?.cliente_id?.razao_social ||
          os.endereco ||
          ''
        ).toLowerCase()
        const endereco = (os.endereco || '').toLowerCase()
        const atribuida = (os.atribuida_a || '').toLowerCase()
        const tipo = (os.tipo_servico || '').toLowerCase()

        return (
          clienteNome.includes(query) ||
          endereco.includes(query) ||
          atribuida.includes(query) ||
          tipo.includes(query)
        )
      }
      return true
    })
  }, [
    listToDisplay,
    selectedTipoFilter,
    selectedPrestadorFilter,
    selectedPeriodoFilter,
    searchTerm,
  ])

  // Salvar atribuição / reatribuição de instalador pela lista
  const handleSalvarAtribuicao = async () => {
    if (!osParaAtribuir) return
    setIsSavingAtribuicao(true)
    try {
      const targetInstalador = instaladores.find((i) => i.id === selectedInstaladorId)
      const targetProf = profissionais.find((p) => p.id === selectedProfissionalId)
      const nomeFinal = targetInstalador?.name || targetProf?.nome || ''

      const { updateOrdemServico } = await import('@/services/crmService')
      const updated = await updateOrdemServico(osParaAtribuir.id, {
        responsavel_usuario_id: selectedInstaladorId || '',
        profissional_id: selectedProfissionalId || '',
        atribuida_a: nomeFinal,
      })

      setOrdens((prev) =>
        prev.map((item) =>
          item.id === updated.id
            ? {
                ...item,
                responsavel_usuario_id: updated.responsavel_usuario_id,
                profissional_id: updated.profissional_id,
                atribuida_a: updated.atribuida_a,
              }
            : item,
        ),
      )
      toast({
        title: 'Prestador reatribuído com sucesso!',
        description: nomeFinal ? `OS reatribuída para ${nomeFinal}.` : 'Atribuição removida.',
      })
      setOsParaAtribuir(null)
    } catch (err) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao reatribuir prestador',
      })
    } finally {
      setIsSavingAtribuicao(false)
    }
  }

  // Se uma OS foi selecionada, exibe a Ficha de Execução
  if (selectedOS) {
    return (
      <FichaExecucaoOS
        os={selectedOS}
        instaladores={instaladores}
        onBack={() => setSelectedOS(null)}
        onOSUpdated={handleOSUpdated}
        onOSFinalizada={handleOSFinalizada}
      />
    )
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-12">
      {/* Top Banner de Serviços de Campo */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-[#E5E7EB] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-100 text-[#166534] inline-flex items-center justify-center">
              <Wrench className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">
                Serviços de Campo
              </h2>
              <p className="text-xs text-gray-500">
                Gestão geral de todas as ordens de serviço, prestadores e vistorias técnicas
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={carregarDados}
            disabled={isLoading}
            className="h-11 px-4 rounded-xl border-gray-200 hover:bg-gray-50 text-gray-700 flex items-center gap-2"
            title="Atualizar lista de OS"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="text-xs font-semibold">Atualizar</span>
          </Button>
        </div>
      </div>

      {/* Tabs de Navegação: Pendentes vs Calendário vs Concluídas vs Relatório (Apenas Admin) */}
      <div
        className={`grid gap-2 p-1.5 bg-gray-100/90 rounded-2xl border border-gray-200 ${
          isAdmin ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'
        }`}
      >
        <button
          type="button"
          onClick={() => setActiveTab('pendentes')}
          className={`h-12 sm:h-11 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
            activeTab === 'pendentes'
              ? 'bg-white text-emerald-800 shadow-xs border border-gray-200/80'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Clock className="w-4 h-4 text-amber-600" />
          <span>Pendentes</span>
          <span
            className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black ${
              activeTab === 'pendentes'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            {pendentesList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('calendario')}
          className={`h-12 sm:h-11 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
            activeTab === 'calendario'
              ? 'bg-white text-emerald-800 shadow-xs border border-gray-200/80'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Calendar className="w-4 h-4 text-emerald-600" />
          <span>Calendário</span>
          <span
            className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black ${
              activeTab === 'calendario'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            {ordens.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('concluidas')}
          className={`h-12 sm:h-11 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
            activeTab === 'concluidas'
              ? 'bg-white text-emerald-800 shadow-xs border border-gray-200/80'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <CheckCheck className="w-4 h-4 text-emerald-600" />
          <span>Concluídas</span>
          <span
            className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black ${
              activeTab === 'concluidas'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            {concluidasList.length}
          </span>
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('relatorio')}
            className={`h-12 sm:h-11 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
              activeTab === 'relatorio'
                ? 'bg-white text-emerald-800 shadow-xs border border-gray-200/80'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            <span>Relatório</span>
            <span
              className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black ${
                activeTab === 'relatorio'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Mês
            </span>
          </button>
        )}
      </div>

      {/* Conteúdo da Aba Relatório (apenas Admin) */}
      {activeTab === 'relatorio' && isAdmin ? (
        isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
            <p className="text-sm font-semibold text-gray-700">Carregando relatório mensal...</p>
          </div>
        ) : (
          <RelatorioOSPrestador ordens={ordens} onSelectOS={(os) => setSelectedOS(os)} />
        )
      ) : activeTab === 'calendario' ? (
        isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
            <p className="text-sm font-semibold text-gray-700">Carregando calendário de OS...</p>
          </div>
        ) : (
          <CalendarioExecucaoOS
            ordens={ordens}
            onSelectOS={(os) => setSelectedOS(os)}
            isInstalador={isInstalador}
            instaladorNome={userProfile?.name}
          />
        )
      ) : (
        <>
          {/* Barra de Filtros Avançados: Prestador, Status/Tipo, Período e Busca */}
          <div className="bg-white rounded-2xl p-3 sm:p-4 border border-gray-200 shadow-2xs flex flex-col gap-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Buscar cliente, endereço..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-11 text-xs sm:text-sm rounded-xl border-gray-200 focus:border-emerald-600"
                />
              </div>

              {/* Filtro por Prestador */}
              <select
                value={selectedPrestadorFilter}
                onChange={(e) => setSelectedPrestadorFilter(e.target.value)}
                className="h-11 px-3 text-xs sm:text-sm font-medium rounded-xl border border-gray-200 bg-white text-gray-800 focus:outline-hidden focus:border-emerald-600"
              >
                <option value="todos">Todos os Prestadores</option>
                {prestadoresOpcoes.map((nome) => (
                  <option key={nome} value={nome}>
                    Prestador: {nome}
                  </option>
                ))}
              </select>

              {/* Filtro por Tipo de Serviço */}
              <select
                value={selectedTipoFilter}
                onChange={(e) => setSelectedTipoFilter(e.target.value)}
                className="h-11 px-3 text-xs sm:text-sm font-medium rounded-xl border border-gray-200 bg-white text-gray-800 focus:outline-hidden focus:border-emerald-600"
              >
                <option value="todos">Todos os Serviços</option>
                <option value="Limpeza">Limpeza</option>
                <option value="Manutenção">Manutenção</option>
                <option value="Instalação">Instalação</option>
                <option value="Garantia">Garantia</option>
                <option value="Configuração de Datalogger">Configuração de Datalogger</option>
              </select>

              {/* Filtro por Período */}
              <select
                value={selectedPeriodoFilter}
                onChange={(e) => setSelectedPeriodoFilter(e.target.value)}
                className="h-11 px-3 text-xs sm:text-sm font-medium rounded-xl border border-gray-200 bg-white text-gray-800 focus:outline-hidden focus:border-emerald-600"
              >
                <option value="todos">Qualquer Período</option>
                <option value="hoje">Agendadas para Hoje</option>
                <option value="semana">Nesta Semana</option>
                <option value="mes">Neste Mês</option>
              </select>
            </div>
          </div>

          {/* Lista de Cards de Ordens de Serviço */}
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
              <p className="text-sm font-semibold text-gray-700">Carregando ordens de serviço...</p>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
                {activeTab === 'pendentes' ? (
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                ) : (
                  <FileText className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">
                {activeTab === 'pendentes'
                  ? 'Nenhuma OS pendente no momento'
                  : 'Nenhuma OS concluída encontrada'}
              </h3>
              <p className="text-xs text-gray-500 max-w-sm">
                {activeTab === 'pendentes'
                  ? 'Todas as ordens de serviço agendadas foram executadas pela equipe.'
                  : 'As ordens finalizadas pelos instaladores em campo aparecerão nesta seção.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredList.map((os) => {
                const cliente = os.expand?.cliente_id
                const checklistTotal = os.checklist?.length || 0
                const checklistFeitos = os.checklist?.filter((c) => c.concluido).length || 0
                const fotosQtd = os.fotos?.length || 0

                return (
                  <div
                    key={os.id}
                    onClick={() => setSelectedOS(os)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setSelectedOS(os)
                      }
                    }}
                    className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all text-left flex flex-col justify-between group cursor-pointer shadow-2xs hover:shadow-md hover:border-emerald-500 active:scale-[0.99] ${
                      os.status === 'concluida'
                        ? 'border-gray-200 bg-gray-50/50'
                        : 'border-emerald-200 hover:border-emerald-500'
                    }`}
                  >
                    <div>
                      {/* Topo do Card: Tipo do Serviço e Status */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                          {os.tipo_servico}
                        </span>

                        {os.status === 'concluida' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Concluída
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full">
                            <Clock className="w-3.5 h-3.5" />
                            Pendente
                          </span>
                        )}
                      </div>

                      {/* Nome do Cliente */}
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 group-hover:text-emerald-700 transition-colors mb-2">
                        {cliente?.nome || cliente?.razao_social || os.endereco || 'Cliente Solar'}
                      </h3>

                      {/* Endereço de Execução */}
                      <div className="flex items-start gap-2 text-xs text-gray-600 mb-2">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">
                          {os.endereco || cliente?.endereco || 'Endereço não informado'}
                          {cliente?.cidade ? ` • ${cliente.cidade}` : ''}
                        </span>
                      </div>

                      {/* Data Agendada */}
                      <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>
                          Data: <strong>{formatDateTime(os.data_agendada)}</strong>
                        </span>
                      </div>

                      {/* Técnico Atribuído & Botão de Atribuir para Admin */}
                      <div className="flex items-center justify-between gap-2 text-xs text-gray-500 mb-3">
                        <div className="flex items-center gap-1.5 truncate">
                          <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="truncate">
                            Instalador:{' '}
                            <strong className="text-gray-700">
                              {os.atribuida_a || 'Não atribuído'}
                            </strong>
                            {os.expand?.responsavel_usuario_id?.phone && (
                              <span className="text-[11px] text-gray-400 font-normal ml-1">
                                • {os.expand?.responsavel_usuario_id?.phone}
                              </span>
                            )}
                          </span>
                        </div>

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setOsParaAtribuir(os)
                              setSelectedInstaladorId(os.responsavel_usuario_id || '')
                              setSelectedProfissionalId(os.profissional_id || '')
                            }}
                            className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-200 transition-colors shrink-0"
                          >
                            Reatribuir
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Rodapé do Card com Progresso e Botão Grande */}
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2 mt-2 flex-wrap">
                      <div className="flex items-center gap-2 text-[11px] text-gray-500">
                        {checklistTotal > 0 && (
                          <span className="bg-gray-100 px-2 py-0.5 rounded font-medium">
                            Checklist: {checklistFeitos}/{checklistTotal}
                          </span>
                        )}
                        {fotosQtd > 0 && (
                          <span className="bg-gray-100 px-2 py-0.5 rounded font-medium">
                            📷 {fotosQtd} foto(s)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Botão de Envio Manual via WhatsApp: visível para Admin ou quando não for o próprio instalador logado */}
                        {(!isInstalador || isAdmin) && (
                          <div onClick={(e) => e.stopPropagation()}>
                            <BotaoEnviarOSWhatsApp
                              osId={os.id}
                              responsavelNome={
                                os.atribuida_a || os.expand?.responsavel_usuario_id?.name
                              }
                              responsavelTelefone={os.expand?.responsavel_usuario_id?.phone}
                              responsavelId={os.responsavel_usuario_id}
                              size="sm"
                              label="Enviar OS por WhatsApp"
                            />
                          </div>
                        )}

                        <div className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 group-hover:translate-x-0.5 transition-transform">
                          <span>{os.status === 'concluida' ? 'Ver Ficha' : 'Executar OS'}</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>{' '}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
      {/* Modal de Reatribuição de Prestador à OS (Apenas Admin) */}
      {isAdmin && (
        <Dialog
          open={Boolean(osParaAtribuir)}
          onOpenChange={(open) => !open && setOsParaAtribuir(null)}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-gray-900 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-emerald-600" />
                <span>Reatribuir Prestador / Técnico</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Selecione o prestador ou técnico responsável por executar esta ordem de serviço em
                campo.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs">
                <span className="font-bold text-gray-700 block">Cliente:</span>
                <span className="text-gray-900 font-semibold">
                  {osParaAtribuir?.expand?.cliente_id?.nome ||
                    osParaAtribuir?.expand?.cliente_id?.razao_social ||
                    osParaAtribuir?.endereco ||
                    'Cliente Solar'}
                </span>
                <span className="text-gray-500 block mt-1">
                  Serviço: <strong>{osParaAtribuir?.tipo_servico}</strong> • Atual:{' '}
                  <strong>{osParaAtribuir?.atribuida_a || 'Não atribuído'}</strong>
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Conta de Usuário do Prestador (App / Login)
                </label>
                <select
                  value={selectedInstaladorId}
                  onChange={(e) => {
                    const id = e.target.value
                    setSelectedInstaladorId(id)
                    const inst = instaladores.find((i) => i.id === id)
                    if (inst) {
                      // Tentar encontrar profissional com mesmo nome
                      const matchProf = profissionais.find(
                        (p) => p.nome.toLowerCase() === inst.name.toLowerCase(),
                      )
                      if (matchProf) setSelectedProfissionalId(matchProf.id)
                    }
                  }}
                  className="w-full h-11 px-3 text-xs sm:text-sm font-medium rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-hidden focus:border-emerald-600"
                >
                  <option value="">-- Selecionar conta de usuário (se houver) --</option>
                  {instaladores.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name} ({inst.email}) {inst.phone ? `• ${inst.phone}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Profissional Técnico Cadastrado
                </label>
                <select
                  value={selectedProfissionalId}
                  onChange={(e) => setSelectedProfissionalId(e.target.value)}
                  className="w-full h-11 px-3 text-xs sm:text-sm font-medium rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-hidden focus:border-emerald-600"
                >
                  <option value="">-- Selecionar da lista de profissionais --</option>
                  {profissionais.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-[11px] text-gray-400">
                Ao reatribuir, a OS aparecerá imediatamente na tela 'Minhas OS' do prestador
                selecionado.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={isSavingAtribuicao}
                onClick={() => setOsParaAtribuir(null)}
                className="rounded-xl h-10 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={isSavingAtribuicao}
                onClick={handleSalvarAtribuicao}
                className="bg-[#16A34A] hover:bg-[#15803D] text-white font-bold rounded-xl h-10 text-xs"
              >
                {isSavingAtribuicao ? 'Salvando...' : 'Confirmar Reatribuição'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
