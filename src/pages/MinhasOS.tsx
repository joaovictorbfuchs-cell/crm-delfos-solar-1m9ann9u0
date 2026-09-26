import React, { useState, useEffect, useMemo } from 'react'
import { OrdemServico, OSTipoServico } from '@/types/crm'
import { fetchOrdensServico } from '@/services/crmService'
import { FichaExecucaoOS } from '@/components/FichaExecucaoOS'
import { CalendarioExecucaoOS } from '@/components/CalendarioExecucaoOS'
import { useToast } from '@/hooks/use-toast'
import { formatDateTime } from '@/lib/formatters'
import {
  Wrench,
  Clock,
  CheckCircle2,
  MapPin,
  Calendar,
  ChevronRight,
  Search,
  RefreshCw,
  CheckCheck,
  PlayCircle,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'

export default function MinhasOS() {
  const { toast } = useToast()
  const { userProfile, user } = useAuth()

  const [ordens, setOrdens] = useState<OrdemServico[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // OS atualmente aberta na Ficha de Execução
  const [selectedOS, setSelectedOS] = useState<OrdemServico | null>(null)

  // Abas: 'pendentes', 'calendario', 'concluidas' (histórico)
  const [activeTab, setActiveTab] = useState<'pendentes' | 'calendario' | 'concluidas'>('pendentes')

  // Filtros de busca e tipo
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTipoFilter, setSelectedTipoFilter] = useState<string>('todos')

  const currentUserId = userProfile?.id || user?.id || ''
  const currentUserName = userProfile?.name || user?.name || ''

  // Carrega OSs atribuídas exclusivamente ao prestador logado
  const carregarDados = async () => {
    setIsLoading(true)
    try {
      // Buscar todas as ordens com expand
      const todas = await fetchOrdensServico()
      // Filtro real e estrito por prestador logado (responsavel_usuario_id ou atribuida_a)
      const minhas = todas.filter((os) => {
        if (!os) return false
        if (currentUserId && os.responsavel_usuario_id === currentUserId) return true
        if (
          currentUserName &&
          os.atribuida_a &&
          os.atribuida_a.trim().toLowerCase() === currentUserName.trim().toLowerCase()
        ) {
          return true
        }
        return false
      })
      setOrdens(minhas)
    } catch (err) {
      console.error('Erro ao carregar Minhas OS:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar ordens de serviço',
        description: 'Tente recarregar a página.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [currentUserId, currentUserName])

  const handleOSUpdated = (updatedOS: OrdemServico) => {
    setOrdens((prev) => prev.map((item) => (item.id === updatedOS.id ? updatedOS : item)))
    if (selectedOS?.id === updatedOS.id) {
      setSelectedOS(updatedOS)
    }
  }

  const handleOSFinalizada = (finalizedOS: OrdemServico) => {
    setOrdens((prev) => prev.map((item) => (item.id === finalizedOS.id ? finalizedOS : item)))
    setSelectedOS(null)
    setActiveTab('concluidas')
  }

  // Pendentes e Em Andamento
  const pendentesList = useMemo(() => {
    return (ordens || []).filter((o) => o && o.status === 'pendente')
  }, [ordens])

  // Histórico de Concluídas
  const concluidasList = useMemo(() => {
    return (ordens || []).filter((o) => o && o.status === 'concluida')
  }, [ordens])

  const listToDisplay = activeTab === 'pendentes' ? pendentesList : concluidasList

  const filteredList = useMemo(() => {
    return (listToDisplay || []).filter((os) => {
      if (!os) return false
      if (selectedTipoFilter !== 'todos' && os.tipo_servico !== selectedTipoFilter) {
        return false
      }
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase()
        const clienteNome = (
          os.expand?.cliente_id?.nome ||
          os.expand?.cliente_id?.razao_social ||
          os.endereco ||
          ''
        ).toLowerCase()
        const endereco = (os.endereco || '').toLowerCase()
        const tipo = (os.tipo_servico || '').toLowerCase()
        return clienteNome.includes(query) || endereco.includes(query) || tipo.includes(query)
      }
      return true
    })
  }, [listToDisplay, selectedTipoFilter, searchTerm])

  if (selectedOS) {
    return (
      <FichaExecucaoOS
        os={selectedOS}
        onBack={() => setSelectedOS(null)}
        onOSUpdated={handleOSUpdated}
        onOSFinalizada={handleOSFinalizada}
      />
    )
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-12">
      {/* Top Banner de Minhas OS */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-[#E5E7EB] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-emerald-100 text-[#166534] inline-flex items-center justify-center shadow-2xs">
            <Wrench className="w-6 h-6" />
          </span>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">
              Minhas Ordens de Serviço
            </h2>
            <p className="text-xs text-gray-500">
              Atividades e manutenções solares atribuídas a você ({currentUserName || 'Prestador'})
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={carregarDados}
          disabled={isLoading}
          className="h-11 px-4 rounded-xl border-gray-200 hover:bg-gray-50 text-gray-700 flex items-center gap-2 self-start sm:self-auto"
          title="Atualizar Minhas OS"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
          <span className="text-xs font-semibold">Atualizar</span>
        </Button>
      </div>

      {/* Tabs: Pendentes (e em andamento) vs Calendário vs Concluídas (Histórico) */}
      <div className="grid grid-cols-3 gap-2 p-1.5 bg-gray-100/90 rounded-2xl border border-gray-200">
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
          <span>Histórico Concluídas</span>
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
      </div>

      {/* Conteúdo */}
      {activeTab === 'calendario' ? (
        isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
            <p className="text-sm font-semibold text-gray-700">Carregando calendário de OS...</p>
          </div>
        ) : (
          <CalendarioExecucaoOS
            ordens={ordens}
            onSelectOS={(os) => setSelectedOS(os)}
            isInstalador={true}
            instaladorNome={currentUserName}
          />
        )
      ) : (
        <>
          {/* Busca e Filtros */}
          <div className="bg-white rounded-2xl p-3 sm:p-4 border border-gray-200 shadow-2xs flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Buscar por cliente ou endereço..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-11 text-xs sm:text-sm rounded-xl border-gray-200 focus:border-emerald-600"
              />
            </div>

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
          </div>

          {/* Lista de OSs do Prestador */}
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
              <p className="text-sm font-semibold text-gray-700">
                Carregando suas ordens de serviço...
              </p>
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
                  ? 'Você não possui OSs pendentes no momento'
                  : 'Nenhuma OS concluída no seu histórico'}
              </h3>
              <p className="text-xs text-gray-500 max-w-sm">
                {activeTab === 'pendentes'
                  ? 'Quando a gerência atribuir um serviço para você, ele aparecerá aqui com todos os detalhes técnicos e checklist.'
                  : 'As ordens concluídas e assinadas por você em campo ficarão registradas nesta seção.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredList.map((os) => {
                const cliente = os.expand?.cliente_id
                const checklistTotal = os.checklist?.length || 0
                const checklistFeitos = os.checklist?.filter((c) => c.concluido).length || 0
                const fotosQtd = os.fotos?.length || 0
                const emAndamento =
                  checklistFeitos > 0 ||
                  (os.detalhes_execucao && os.detalhes_execucao.includes('[INÍCIO DO ATENDIMENTO]'))

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
                        : emAndamento
                          ? 'border-amber-300 bg-amber-50/20'
                          : 'border-emerald-200 hover:border-emerald-500'
                    }`}
                  >
                    <div>
                      {/* Topo do Card */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                          {os.tipo_servico}
                        </span>

                        {os.status === 'concluida' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Concluída
                          </span>
                        ) : emAndamento ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full animate-pulse">
                            <PlayCircle className="w-3.5 h-3.5 text-amber-600" />
                            Em Andamento
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100/80 px-2.5 py-0.5 rounded-full">
                            <Clock className="w-3.5 h-3.5" />
                            Pendente
                          </span>
                        )}
                      </div>

                      {/* Nome do Cliente */}
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 group-hover:text-emerald-700 transition-colors mb-2">
                        {cliente?.nome || cliente?.razao_social || os.endereco || 'Cliente Solar'}
                      </h3>

                      {/* Endereço */}
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
                    </div>

                    {/* Rodapé do Card */}
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

                      <div className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 group-hover:translate-x-0.5 transition-transform">
                        <span>{os.status === 'concluida' ? 'Ver Detalhes' : 'Executar OS'}</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
