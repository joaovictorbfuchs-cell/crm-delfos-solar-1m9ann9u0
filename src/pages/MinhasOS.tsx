import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { OrdemServico, OSTipoServico } from '@/types/crm'
import { fetchOrdensServico, deleteOrdemServico } from '@/services/crmService'
import { FichaExecucaoOS } from '@/components/FichaExecucaoOS'
import { CalendarioExecucaoOS } from '@/components/CalendarioExecucaoOS'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { formatDateTime } from '@/lib/formatters'
import {
  Wrench,
  Clock,
  CheckCircle2,
  MapPin,
  Calendar,
  ChevronRight,
  Search,
  CheckCheck,
  PlayCircle,
  FileText,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export default function MinhasOS() {
  const { toast } = useToast()
  const { userProfile, user, isAdmin } = useAuth()

  const [ordens, setOrdens] = useState<OrdemServico[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // OS atualmente aberta na Ficha de Execução
  const [selectedOS, setSelectedOS] = useState<OrdemServico | null>(null)

  // Exclusão de OS (apenas Admin)
  const [osParaExcluir, setOsParaExcluir] = useState<OrdemServico | null>(null)
  const [isDeletingOS, setIsDeletingOS] = useState(false)

  // Abas: 'pendentes', 'calendario', 'concluidas' (histórico)
  const [activeTab, setActiveTab] = useState<'pendentes' | 'calendario' | 'concluidas'>('pendentes')

  // Filtros de busca e tipo
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTipoFilter, setSelectedTipoFilter] = useState<string>('todos')

  const currentUserId = userProfile?.id || user?.id || ''
  const currentUserName = userProfile?.name || user?.name || ''

  const isFetchingRef = useRef(false)

  // Carrega OSs atribuídas exclusivamente ao prestador logado
  const carregarDados = useCallback(
    async (silent = false) => {
      if (isFetchingRef.current) return
      isFetchingRef.current = true
      if (!silent) {
        setIsLoading(true)
      }
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
        if (!silent) {
          toast({
            variant: 'destructive',
            title: 'Erro ao carregar ordens de serviço',
            description: 'Tente recarregar a página.',
          })
        }
      } finally {
        isFetchingRef.current = false
        if (!silent) {
          setIsLoading(false)
        }
      }
    },
    [currentUserId, currentUserName, toast],
  )

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  // Polling automático e recarregamento em foco
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && !selectedOS) {
        carregarDados(true)
      }
    }, 30000)

    const handleFocus = () => {
      if (!selectedOS) {
        carregarDados(true)
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !selectedOS) {
        carregarDados(true)
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [carregarDados, selectedOS])

  // Realtime para Minhas OS
  useEffect(() => {
    let unmounted = false
    let unsubOS: (() => void) | undefined

    pb.collection('ordens_servico')
      .subscribe('*', () => {
        if (!unmounted && !selectedOS) {
          carregarDados(true)
        }
      })
      .then((unsub) => {
        unsubOS = unsub
      })
      .catch((err) => {
        console.warn('Realtime ordens_servico indisponível em MinhasOS:', err)
      })

    return () => {
      unmounted = true
      if (unsubOS) {
        try {
          unsubOS()
        } catch {
          /* intentionally ignored */
        }
      }
    }
  }, [carregarDados, selectedOS])

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

  const handleConfirmarExclusaoOS = async () => {
    if (!osParaExcluir) return
    setIsDeletingOS(true)
    try {
      await deleteOrdemServico(osParaExcluir.id)
      setOrdens((prev) => prev.filter((o) => o.id !== osParaExcluir.id))
      toast({
        title: 'Ordem de serviço excluída com sucesso',
        description: `OS #${osParaExcluir.id.slice(0, 8)} foi removida.`,
      })
      setOsParaExcluir(null)
    } catch (err) {
      console.error('Erro ao excluir ordem de serviço:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir ordem de serviço',
        description: 'Tente novamente.',
      })
    } finally {
      setIsDeletingOS(false)
    }
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
    <div className="space-y-3.5 max-w-5xl mx-auto pb-10">
      {/* Top Banner de Minhas OS */}
      <div className="bg-white rounded-xl p-3 sm:p-4 border border-[#E5E7EB] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="p-1.5 rounded-lg bg-emerald-100 text-[#166534] inline-flex items-center justify-center shadow-2xs">
            <Wrench className="w-4 h-4" />
          </span>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
              Minhas Ordens de Serviço
            </h2>
            <p className="text-[11px] sm:text-xs text-gray-500">
              Atividades e manutenções solares atribuídas a você ({currentUserName || 'Prestador'})
            </p>
          </div>
        </div>
      </div>

      {/* Tabs: Pendentes (e em andamento) vs Calendário vs Concluídas (Histórico) */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-100/90 rounded-xl border border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('pendentes')}
          className={`h-8 sm:h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'pendentes'
              ? 'bg-white text-emerald-800 shadow-2xs border border-gray-200/80'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>Pendentes</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
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
          className={`h-8 sm:h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'calendario'
              ? 'bg-white text-emerald-800 shadow-2xs border border-gray-200/80'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Calendário</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
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
          className={`h-8 sm:h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'concluidas'
              ? 'bg-white text-emerald-800 shadow-2xs border border-gray-200/80'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <CheckCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Histórico Concluídas</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
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
            <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin mb-3 mx-auto" />
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
          <div className="bg-white rounded-xl p-2.5 sm:p-3 border border-gray-200 shadow-2xs flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Buscar por cliente ou endereço..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs rounded-lg border-gray-200 focus:border-emerald-600"
              />
            </div>

            <select
              value={selectedTipoFilter}
              onChange={(e) => setSelectedTipoFilter(e.target.value)}
              className="h-8 px-2.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-hidden focus:border-emerald-600"
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
              <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin mb-3 mx-auto" />
              <p className="text-sm font-semibold text-gray-700">
                Carregando suas ordens de serviço...
              </p>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="bg-white rounded-xl p-8 border border-gray-200 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
                {activeTab === 'pendentes' ? (
                  <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                ) : (
                  <FileText className="w-7 h-7 text-gray-400" />
                )}
              </div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-1">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {filteredList.map((os) => {
                const cliente = os.expand?.cliente_id
                const clienteNome =
                  cliente?.nome || cliente?.razao_social || os.endereco || 'Cliente Solar'
                const enderecoFormatado = [
                  os.endereco || cliente?.endereco || 'Endereço não informado',
                  cliente?.cidade ? cliente.cidade : null,
                ]
                  .filter(Boolean)
                  .join(' • ')

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
                    className={`bg-white rounded-xl p-3 sm:p-3.5 border transition-all text-left flex flex-col justify-between group cursor-pointer shadow-2xs hover:shadow-xs hover:border-emerald-500 active:scale-[0.99] ${
                      os.status === 'concluida'
                        ? 'border-gray-200 bg-gray-50/50'
                        : emAndamento
                          ? 'border-amber-300 bg-amber-50/20'
                          : 'border-emerald-200 hover:border-emerald-500'
                    }`}
                  >
                    <div>
                      {/* Topo do Card */}
                      <div className="flex items-center justify-between gap-1.5 mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                          {os.tipo_servico}
                        </span>

                        <div className="flex items-center gap-1 ml-auto">
                          {os.status === 'concluida' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3 shrink-0" />
                              Concluída
                            </span>
                          ) : emAndamento ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full animate-pulse">
                              <PlayCircle className="w-3 h-3 text-amber-600 shrink-0" />
                              Em Andamento
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full">
                              <Clock className="w-3 h-3 shrink-0" />
                              Pendente
                            </span>
                          )}

                          {isAdmin && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setOsParaExcluir(os)
                              }}
                              className="h-8 w-8 inline-flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Excluir ordem de serviço"
                              aria-label="Excluir ordem de serviço"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Nome do Cliente - legível com 2 linhas e title */}
                      <h3
                        title={clienteNome}
                        className="text-sm sm:text-base font-bold text-gray-900 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-snug mb-1"
                      >
                        {clienteNome}
                      </h3>

                      {/* Endereço - quebra elegante em 2 linhas com title completo */}
                      <div
                        title={enderecoFormatado}
                        className="flex items-start gap-1.5 text-xs text-gray-600 mb-1.5"
                      >
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2 leading-relaxed break-words">
                          {enderecoFormatado}
                        </span>
                      </div>

                      {/* Data Agendada */}
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-2">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="text-[11px] sm:text-xs">
                          Data: <strong>{formatDateTime(os.data_agendada)}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Rodapé do Card */}
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2 mt-1 flex-wrap">
                      <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-gray-500">
                        {checklistTotal > 0 && (
                          <span className="bg-gray-100 px-1.5 py-0.5 rounded font-medium">
                            Checklist: {checklistFeitos}/{checklistTotal}
                          </span>
                        )}
                        {fotosQtd > 0 && (
                          <span className="bg-gray-100 px-1.5 py-0.5 rounded font-medium">
                            📷 {fotosQtd} foto(s)
                          </span>
                        )}
                      </div>

                      <div className="h-8 px-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 group-hover:translate-x-0.5 transition-transform">
                        <span>{os.status === 'concluida' ? 'Ver Detalhes' : 'Executar OS'}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
      {/* Confirmação Segura de Exclusão de OS (Apenas Admin) */}
      {isAdmin && (
        <AlertDialog
          open={Boolean(osParaExcluir)}
          onOpenChange={(open) => {
            if (!open && !isDeletingOS) setOsParaExcluir(null)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-gray-900">
                Excluir Ordem de Serviço
              </AlertDialogTitle>
              <AlertDialogDescription>
                Deseja realmente excluir a{' '}
                <strong className="text-gray-900 font-semibold">
                  Ordem de Serviço #{osParaExcluir?.id.slice(0, 8)} —{' '}
                  {osParaExcluir?.expand?.cliente_id?.nome ||
                    osParaExcluir?.expand?.cliente_id?.razao_social ||
                    osParaExcluir?.endereco ||
                    'Cliente Solar'}
                </strong>
                ? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingOS}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={isDeletingOS}
                onClick={(e) => {
                  e.preventDefault()
                  handleConfirmarExclusaoOS()
                }}
                className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600"
              >
                {isDeletingOS ? 'Excluindo...' : 'Confirmar Exclusão'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
