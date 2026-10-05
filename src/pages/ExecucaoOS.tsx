import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { OrdemServico, OSTipoServico } from '@/types/crm'
import { fetchOrdensServico, deleteOrdemServico } from '@/services/crmService'
import { FichaExecucaoOS } from '@/components/FichaExecucaoOS'
import { CalendarioExecucaoOS } from '@/components/CalendarioExecucaoOS'
import { RelatorioOSPrestador } from '@/components/RelatorioOSPrestador'
import { ModalEnviarRelatorioOSWhatsApp } from '@/components/ModalEnviarRelatorioOSWhatsApp'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
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
  CheckCheck,
  BarChart3,
  Send,
  Trash2,
  X,
  RotateCcw,
  Navigation,
  Plus,
} from 'lucide-react'
import { ModalNovaAtividade } from '@/components/ModalNovaAtividade'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

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
  const [isModalNovaAtividadeOpen, setIsModalNovaAtividadeOpen] = useState(false)

  // Modal para admin enviar relatório de OS via WhatsApp
  const [osParaWhatsApp, setOsParaWhatsApp] = useState<OrdemServico | null>(null)

  // Estado de geração de PDF sob demanda ao clicar em "Ver Relatório"
  const [gerandoPdfOsId, setGerandoPdfOsId] = useState<string | null>(null)

  // Exclusão de OS (apenas Admin)
  const [osParaExcluir, setOsParaExcluir] = useState<OrdemServico | null>(null)
  const [isDeletingOS, setIsDeletingOS] = useState(false)

  // OS atualmente aberta na Ficha de Execução (null = tela inicial/lista)
  const [selectedOS, setSelectedOS] = useState<OrdemServico | null>(null)

  // Aba / Filtro na Lista: 'pendentes', 'calendario', 'concluidas' ou 'relatorio' (apenas admin)
  // Padrão do usuário: abrir DIRETO na aba Calendário na visualização semanal
  const [activeTab, setActiveTab] = useState<
    'pendentes' | 'concluidas' | 'calendario' | 'relatorio'
  >('calendario')

  // Filtros de busca, tipo, prestador e período
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTipoFilter, setSelectedTipoFilter] = useState<string>('todos')
  const [selectedPrestadorFilter, setSelectedPrestadorFilter] = useState<string>('todos')
  const [selectedPeriodoFilter, setSelectedPeriodoFilter] = useState<string>('todos')

  // Contagem de filtros ativos para badge no botão de filtro (prestador oculto para instalador)
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (searchTerm.trim()) count++
    if (selectedTipoFilter !== 'todos') count++
    if (!isInstalador && selectedPrestadorFilter !== 'todos') count++
    if (selectedPeriodoFilter !== 'todos') count++
    return count
  }, [searchTerm, selectedTipoFilter, selectedPrestadorFilter, selectedPeriodoFilter, isInstalador])

  const handleLimparFiltros = () => {
    setSearchTerm('')
    setSelectedTipoFilter('todos')
    setSelectedPrestadorFilter('todos')
    setSelectedPeriodoFilter('todos')
  }

  // Mapeamento de tipo de atividade de campo para tipo_servico suportado pela tela
  const mapTipoAtividadeParaTipoServico = (tipo?: string): OSTipoServico => {
    switch (tipo) {
      case 'limpeza_manutencao':
        return 'Limpeza'
      case 'instalacao':
        return 'Instalação'
      case 'visita_tecnica':
        return 'Manutenção'
      case 'garantia_equipamento':
        return 'Garantia'
      case 'configuracao_datalogger':
        return 'Configuração de Datalogger'
      default:
        return 'Manutenção'
    }
  }

  // Mapeamento de status da atividade para OSStatus
  const mapStatusAtividadeParaOSStatus = (
    status?: string,
  ): 'pendente' | 'concluida' | 'cancelada' => {
    if (status === 'concluida') return 'concluida'
    if (status === 'cancelada') return 'cancelada'
    return 'pendente'
  }

  // Ref para controlar se já há carregamento em andamento e evitar duplicidade
  const isFetchingRef = useRef(false)
  const [filtrosPopoverOpen, setFiltrosPopoverOpen] = useState(false)

  // Carrega OSs, atividades de manutenção e prestadores do banco
  const carregarDados = useCallback(
    async (silent = false) => {
      if (isFetchingRef.current) return
      isFetchingRef.current = true
      if (!silent) {
        setIsLoading(true)
      }
      try {
        const { fetchProfissionais } = await import('@/services/crmService')
        const responsavelFiltro = isInstalador && userProfile?.id ? userProfile.id : undefined

        // Filtro OR para as atividades de manutenção/campo
        const filterAtividades =
          "(tipo='limpeza_manutencao' || tipo='instalacao' || tipo='visita_tecnica' || tipo='garantia_equipamento' || tipo='configuracao_datalogger')"

        const promises = [
          fetchOrdensServico(undefined, responsavelFiltro),
          pb.collection('atividades').getFullList({
            filter: filterAtividades,
            sort: '-data,-created',
            expand: 'cliente_id,usina_id,responsavel_id,fornecedor_id',
            requestKey: null,
          }),
          isAdmin ? fetchInstaladoresAtivos() : Promise.resolve([]),
          fetchProfissionais ? fetchProfissionais() : Promise.resolve([]),
        ] as const

        const [osList, atividadesList, instList, profList] = await Promise.all(promises)

        // Mapear cada atividade para o formato OrdemServico com origem 'atividades'
        const atividadesMapeadas: OrdemServico[] = (
          Array.isArray(atividadesList) ? atividadesList : []
        ).map((atv: any) => {
          const cli = atv.expand?.cliente_id
          const usina = atv.expand?.usina_id
          const resp = atv.expand?.responsavel_id
          const forn = atv.expand?.fornecedor_id

          // Endereço: usina expand -> cliente expand -> endereco_uc
          const endereco = atv.endereco_uc || usina?.endereco || cli?.endereco || cli?.cidade || ''

          // Atribuído a: responsavel_nome -> equipe_nome -> fornecedor -> autor
          const atribuidaA =
            atv.responsavel_nome ||
            resp?.name ||
            atv.equipe_nome ||
            forn?.nome_empresa ||
            forn?.contato_nome ||
            atv.autor ||
            ''

          // Instruções combinando título e descrição quando existirem
          const instrucoesPartes = [atv.titulo, atv.descricao].filter(Boolean)
          const instrucoes = instrucoesPartes.length > 0 ? instrucoesPartes.join('\n\n') : undefined

          const tipoServico = mapTipoAtividadeParaTipoServico(atv.tipo)
          const status = mapStatusAtividadeParaOSStatus(atv.status)

          return {
            id: atv.id,
            collectionId: atv.collectionId || 'atividades',
            collectionName: atv.collectionName || 'atividades',
            cliente_id: atv.cliente_id,
            usina_id: atv.usina_id || undefined,
            tipo_servico: tipoServico,
            endereco,
            data_agendada: atv.data || atv.created,
            status,
            atribuida_a: atribuidaA,
            responsavel_usuario_id: atv.responsavel_id || undefined,
            profissional_id: undefined,
            instrucoes,
            detalhes_execucao: atv.descricao || '',
            concluida_em: status === 'concluida' ? atv.updated || atv.data : undefined,
            origem: 'atividades',
            created: atv.created,
            updated: atv.updated,
            expand: {
              cliente_id: cli,
              usina_id: usina,
              responsavel_usuario_id: resp,
            },
          } as OrdemServico
        })

        // Coexistência e deduplicação: OSs reais têm precedência se houver mesmo id
        const osReais = Array.isArray(osList) ? osList : []
        const osIdSet = new Set(osReais.map((o) => o.id))
        const atividadesDeduplicadas = atividadesMapeadas.filter((a) => !osIdSet.has(a.id))
        const ordensCombinadas = [...osReais, ...atividadesDeduplicadas]

        // Se instalador comum logado, filtra as combinadas pelo responsavel se aplicável
        const safeUserName = (userProfile?.name || '').trim().toLowerCase()
        const ordensFinais =
          responsavelFiltro && !isAdmin
            ? ordensCombinadas.filter(
                (o) =>
                  o.responsavel_usuario_id === responsavelFiltro ||
                  (safeUserName.length > 0 &&
                    (o.atribuida_a || '').toLowerCase().includes(safeUserName)),
              )
            : ordensCombinadas

        setOrdens(ordensFinais)
        setInstaladores(Array.isArray(instList) ? instList : [])
        setProfissionais(Array.isArray(profList) ? profList : [])
      } catch (err) {
        console.error('Erro ao carregar dados de OS e atividades:', err)
        if (!silent) {
          toast({
            variant: 'destructive',
            title: 'Erro ao carregar serviços de campo',
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
    [isAdmin, isInstalador, userProfile?.id, userProfile?.name, toast],
  )

  // Carregamento inicial ao montar ou trocar usuário
  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  // Atualização automática:
  // 1. Polling a cada 30 segundos em segundo plano (silent: sem spinner invasivo)
  // 2. Ao voltar para a aba ou janela ganhar foco (window focus / visibilitychange)
  // 3. Realtime nas coleções ordens_servico e atividades
  useEffect(() => {
    const interval = setInterval(() => {
      // Se não estiver com a ficha aberta e aba visível, atualiza suavemente
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

  // Realtime de ordens_servico e atividades para atualização instantânea
  useEffect(() => {
    let unmounted = false
    let unsubOS: (() => void) | undefined
    let unsubAtv: (() => void) | undefined

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
        console.warn('Realtime ordens_servico indisponível:', err)
      })

    pb.collection('atividades')
      .subscribe('*', () => {
        if (!unmounted && !selectedOS) {
          carregarDados(true)
        }
      })
      .then((unsub) => {
        unsubAtv = unsub
      })
      .catch((err) => {
        console.warn('Realtime atividades indisponível:', err)
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
      if (unsubAtv) {
        try {
          unsubAtv()
        } catch {
          /* intentionally ignored */
        }
      }
    }
  }, [carregarDados, selectedOS])

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
    ;(ordens || []).forEach((os) => {
      if (os?.atribuida_a) set.add(os.atribuida_a)
    })
    ;(instaladores || []).forEach((i) => {
      if (i?.name) set.add(i.name)
    })
    ;(profissionais || []).forEach((p) => {
      if (p?.nome) set.add(p.nome)
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
      if (selectedTipoFilter !== 'todos' && (os?.tipo_servico || '') !== selectedTipoFilter) {
        return false
      }

      // Filtro por prestador (ignorado para instalador, pois a visão já é filtrada/atribuída a ele)
      if (!isInstalador && selectedPrestadorFilter !== 'todos') {
        const prestadorOS = (os?.atribuida_a || '').toLowerCase()
        const target = (selectedPrestadorFilter || '').toLowerCase()
        if (
          !prestadorOS.includes(target) &&
          os?.responsavel_usuario_id !== selectedPrestadorFilter
        ) {
          return false
        }
      }

      // Filtro por período agendado
      if (selectedPeriodoFilter !== 'todos' && os?.data_agendada) {
        const dataOS = new Date(os.data_agendada).getTime()
        if (isNaN(dataOS)) return false
        if (selectedPeriodoFilter === 'hoje') {
          if (dataOS < inicioHoje || dataOS > fimHoje) return false
        } else if (selectedPeriodoFilter === 'semana') {
          if (dataOS < inicioSemana.getTime() || dataOS > fimSemana.getTime()) return false
        } else if (selectedPeriodoFilter === 'mes') {
          if (dataOS < inicioMes || dataOS > fimMes) return false
        }
      }

      // Busca por nome do cliente, endereço, técnico ou tipo de atividade
      if (searchTerm.trim()) {
        const query = searchTerm.trim().toLowerCase()
        const clienteNome = (
          os?.expand?.cliente_id?.nome ||
          os?.expand?.cliente_id?.razao_social ||
          os?.endereco ||
          ''
        ).toLowerCase()
        const endereco = (os?.endereco || '').toLowerCase()
        const atribuida = (os?.atribuida_a || '').toLowerCase()
        const tipo = (os?.tipo_servico || '').toLowerCase()

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
    isInstalador,
  ])

  // Ação de admin para visualizar o PDF do relatório (se não existir, gera na hora e salva no PocketBase)
  const handleVerRelatorioPdf = async (os: OrdemServico) => {
    // 1. Se a OS já tiver o arquivo salvo no PocketBase, abre diretamente em nova aba
    if (os.relatorio_pdf) {
      try {
        const fileUrl = pb.files.getURL(os, os.relatorio_pdf)
        if (fileUrl) {
          window.open(fileUrl, '_blank')
          return
        }
      } catch (e) {
        console.warn('Erro ao abrir URL do PDF da OS:', e)
      }
    }

    // 2. Fallback sob demanda: gera o PDF a partir dos dados registrados
    setGerandoPdfOsId(os.id)
    toast({
      title: 'Gerando Relatório Técnico...',
      description: 'Compilando os dados e fotografias da OS em PDF.',
    })
    try {
      const { gerarPdfRelatorioOS } = await import('@/lib/relatorioOSPdf')
      const { salvarRelatorioPdfOrdemServico } = await import('@/services/crmService')
      const res = await gerarPdfRelatorioOS(os, {
        cliente: os.expand?.cliente_id,
      })

      if (res.file) {
        try {
          const updatedOS = await salvarRelatorioPdfOrdemServico(os.id, res.file)
          setOrdens((prev) => prev.map((item) => (item.id === updatedOS.id ? updatedOS : item)))
        } catch (saveErr) {
          console.warn(
            'Não foi possível persistir o PDF no PocketBase (abrindo preview direto):',
            saveErr,
          )
        }
      }

      // Abre o PDF gerado em nova aba via Data URL / Object URL
      const pdfBlobUrl = URL.createObjectURL(res.file)
      window.open(pdfBlobUrl, '_blank')
      toast({
        title: 'Relatório Gerado!',
        description: 'O PDF da Ordem de Serviço foi aberto com sucesso.',
      })
    } catch (err) {
      console.error('Erro ao gerar relatório em PDF sob demanda:', err)
      toast({
        variant: 'destructive',
        title: 'Falha ao gerar relatório',
        description: 'Não foi possível gerar o PDF. Verifique os dados da OS.',
      })
    } finally {
      setGerandoPdfOsId(null)
    }
  }

  // Excluir OS com confirmação (suporta coleção ordens_servico ou atividades)
  const handleConfirmarExclusaoOS = async () => {
    if (!osParaExcluir) return
    setIsDeletingOS(true)
    try {
      if (osParaExcluir.origem === 'atividades') {
        const { deleteAtividade } = await import('@/services/crmService')
        await deleteAtividade(osParaExcluir.id)
      } else {
        await deleteOrdemServico(osParaExcluir.id)
      }
      setOrdens((prev) => prev.filter((o) => o?.id !== osParaExcluir.id))
      toast({
        title: 'Serviço de campo excluído com sucesso',
        description: `#${(osParaExcluir.id || '').slice(0, 8)} foi removido(a).`,
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

  // Salvar atribuição / reatribuição de instalador pela lista
  const handleSalvarAtribuicao = async () => {
    if (!osParaAtribuir) return
    setIsSavingAtribuicao(true)
    try {
      const targetInstalador = instaladores.find((i) => i.id === selectedInstaladorId)
      const targetProf = profissionais.find((p) => p.id === selectedProfissionalId)
      const nomeFinal = targetInstalador?.name || targetProf?.nome || ''

      if (osParaAtribuir.origem === 'atividades') {
        const { updateAtividade } = await import('@/services/crmService')
        const updated = await updateAtividade(osParaAtribuir.id, {
          responsavel_id: selectedInstaladorId || undefined,
          responsavel_nome: nomeFinal,
        })
        setOrdens((prev) =>
          prev.map((item) =>
            item.id === updated.id
              ? {
                  ...item,
                  responsavel_usuario_id: updated.responsavel_id || undefined,
                  atribuida_a: updated.responsavel_nome || nomeFinal,
                }
              : item,
          ),
        )
      } else {
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
      }

      toast({
        title: 'Prestador reatribuído com sucesso!',
        description: nomeFinal ? `Serviço reatribuído para ${nomeFinal}.` : 'Atribuição removida.',
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

  // Se uma OS foi selecionada, exibe a Ficha de Execução com barra de ações de admin caso concluída
  if (selectedOS) {
    return (
      <div className="space-y-2 pt-0">
        {isAdmin && selectedOS.status === 'concluida' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-950">
                  Relatório Técnico de Execução (Admin)
                </h4>
                <p className="text-[11px] text-emerald-700">
                  {selectedOS.relatorio_pdf
                    ? 'PDF oficial gerado e salvo nesta Ordem de Serviço.'
                    : 'Esta OS pode ter o relatório compilado e enviado agora.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={gerandoPdfOsId === selectedOS.id}
                onClick={() => handleVerRelatorioPdf(selectedOS)}
                className="h-8 px-2.5 text-xs font-bold text-emerald-800 border-emerald-300 hover:bg-emerald-100/60 bg-white"
              >
                <FileText className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                {gerandoPdfOsId === selectedOS.id
                  ? 'Gerando PDF...'
                  : selectedOS.relatorio_pdf
                    ? 'Ver Relatório (PDF)'
                    : 'Gerar Relatório (PDF)'}
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => setOsParaWhatsApp(selectedOS)}
                className="h-8 px-2.5 text-xs font-bold bg-[#16A34A] hover:bg-[#15803D] text-white shadow-2xs"
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                Enviar Relatório por WhatsApp
              </Button>
            </div>
          </div>
        )}

        <FichaExecucaoOS
          os={selectedOS}
          instaladores={instaladores}
          onBack={() => {
            setSelectedOS(null)
            carregarDados()
          }}
          onOSUpdated={handleOSUpdated}
          onOSFinalizada={handleOSFinalizada}
        />

        {/* Modal WhatsApp no modo visualização de Ficha */}
        {osParaWhatsApp && (
          <ModalEnviarRelatorioOSWhatsApp
            isOpen={Boolean(osParaWhatsApp)}
            onClose={() => setOsParaWhatsApp(null)}
            os={osParaWhatsApp}
            cliente={osParaWhatsApp.expand?.cliente_id}
            onSuccess={() => carregarDados()}
          />
        )}
      </div>
    )
  }

  // Renderiza as abas de navegação (Pendentes, Calendário, Concluídas, Relatório)
  const renderTabsNavegacao = () => (
    <div
      className={`grid gap-1 p-0.5 bg-gray-100/90 rounded-lg border border-gray-200 shrink-0 ${
        isAdmin ? 'grid-cols-4' : 'grid-cols-3'
      }`}
    >
      <button
        type="button"
        onClick={() => setActiveTab('pendentes')}
        className={`h-7 px-2.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
          activeTab === 'pendentes'
            ? 'bg-white text-emerald-800 shadow-2xs border border-gray-200/80'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <span>Pendentes</span>
        <span
          className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
            activeTab === 'pendentes' ? 'bg-amber-100 text-amber-800' : 'bg-gray-200 text-gray-700'
          }`}
        >
          {pendentesList.length}
        </span>
      </button>

      <button
        type="button"
        onClick={() => setActiveTab('calendario')}
        className={`h-7 px-2.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
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
        className={`h-7 px-2.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
          activeTab === 'concluidas'
            ? 'bg-white text-emerald-800 shadow-2xs border border-gray-200/80'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <CheckCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>Concluídas</span>
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

      {isAdmin && (
        <button
          type="button"
          onClick={() => setActiveTab('relatorio')}
          className={`h-7 px-2.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'relatorio'
              ? 'bg-white text-emerald-800 shadow-2xs border border-gray-200/80'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Relatório</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
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
  )

  // Botões de Ações Primárias (Nova Atividade + Filtros Popover)
  const renderAcoesPrimarias = () => (
    <div className="flex items-center gap-1.5 shrink-0">
      <button
        type="button"
        onClick={() => setIsModalNovaAtividadeOpen(true)}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer shrink-0 h-8"
        title="Gerar nova atividade de manutenção para os serviços de campo"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Nova Atividade</span>
      </button>

      <Popover open={filtrosPopoverOpen} onOpenChange={setFiltrosPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={`h-8 px-2.5 rounded-lg border font-semibold text-xs flex items-center gap-1.5 transition-all shrink-0 ${
              activeFiltersCount > 0
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100/70 shadow-2xs'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:text-gray-900 shadow-2xs'
            }`}
            title="Filtrar serviços de campo"
            aria-label="Abrir filtros de serviços de campo"
          >
            <Filter
              className={`w-3.5 h-3.5 ${activeFiltersCount > 0 ? 'text-emerald-700' : 'text-gray-500'}`}
            />
            <span className="hidden sm:inline">Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-emerald-600 text-white min-w-[16px] text-center">
                {activeFiltersCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          sideOffset={8}
          className="w-[340px] sm:w-[380px] p-4 bg-white rounded-2xl shadow-xl border border-gray-200 z-50 space-y-3.5"
        >
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-emerald-100 text-emerald-800">
                <Filter className="w-3.5 h-3.5" />
              </span>
              <h4 className="text-xs sm:text-sm font-bold text-gray-900">
                Filtros de Serviços de Campo
              </h4>
            </div>
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={handleLimparFiltros}
                className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 hover:underline cursor-pointer"
                title="Limpar todos os filtros"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Limpar</span>
              </button>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1">Busca Rápida</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder={
                  isInstalador
                    ? 'Buscar por cliente ou tipo de atividade...'
                    : 'Nome do cliente, endereço...'
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs rounded-lg border-gray-200 focus:border-emerald-600"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title="Limpar busca"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {!isInstalador && (
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                Prestador / Técnico
              </label>
              <select
                value={selectedPrestadorFilter}
                onChange={(e) => setSelectedPrestadorFilter(e.target.value)}
                className="w-full h-8 px-2.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-hidden focus:border-emerald-600"
              >
                <option value="todos">Todos os Prestadores</option>
                {prestadoresOpcoes.map((nome) => (
                  <option key={nome} value={nome}>
                    Prestador: {nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1">
              Tipo de Serviço
            </label>
            <select
              value={selectedTipoFilter}
              onChange={(e) => setSelectedTipoFilter(e.target.value)}
              className="w-full h-8 px-2.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-hidden focus:border-emerald-600"
            >
              <option value="todos">Todos os Serviços</option>
              <option value="Limpeza">Limpeza</option>
              <option value="Manutenção">Manutenção</option>
              <option value="Instalação">Instalação</option>
              <option value="Garantia">Garantia</option>
              <option value="Configuração de Datalogger">Configuração de Datalogger</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1">
              Período Agendado
            </label>
            <select
              value={selectedPeriodoFilter}
              onChange={(e) => setSelectedPeriodoFilter(e.target.value)}
              className="w-full h-8 px-2.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-hidden focus:border-emerald-600"
            >
              <option value="todos">Qualquer Período</option>
              <option value="hoje">Agendadas para Hoje</option>
              <option value="semana">Nesta Semana</option>
              <option value="mes">Neste Mês</option>
            </select>
          </div>

          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[11px] text-gray-500">{filteredList.length} resultado(s)</span>
            <Button
              type="button"
              size="sm"
              onClick={() => setFiltrosPopoverOpen(false)}
              className="h-7 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg"
            >
              Concluir
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )

  return (
    <div
      className={`space-y-2.5 pb-8 ${
        activeTab === 'calendario' ? 'w-full max-w-none' : 'max-w-5xl mx-auto'
      }`}
    >
      {/* Barra de Ações Superior para abas normais (pendentes, concluidas, relatorio) */}
      {activeTab !== 'calendario' && (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {renderTabsNavegacao()}
          {renderAcoesPrimarias()}
        </div>
      )}
      {/* Conteúdo da Aba Relatório (apenas Admin) */}
      {activeTab === 'relatorio' && isAdmin ? (
        isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin mb-3 mx-auto" />
            <p className="text-sm font-semibold text-gray-700">Carregando relatório mensal...</p>
          </div>
        ) : (
          <RelatorioOSPrestador ordens={ordens} onSelectOS={(os) => setSelectedOS(os)} />
        )
      ) : activeTab === 'calendario' ? (
        isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin mb-3 mx-auto" />
            <p className="text-sm font-semibold text-gray-700">Carregando calendário de OS...</p>
          </div>
        ) : (
          <CalendarioExecucaoOS
            ordens={ordens}
            onSelectOS={(os) => setSelectedOS(os)}
            onOSUpdated={handleOSUpdated}
            isInstalador={isInstalador}
            instaladorNome={userProfile?.name}
            leftControlsSlot={renderTabsNavegacao()}
            rightActionsSlot={renderAcoesPrimarias()}
          />
        )
      ) : (
        <>
          {/* Tag informativa de filtros ativos, se houver algum selecionado */}
          {activeFiltersCount > 0 && (
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl px-3 py-1.5 flex items-center justify-between gap-2 text-xs text-emerald-900 shadow-2xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold flex items-center gap-1 text-[11px] uppercase tracking-wide text-emerald-800">
                  <Filter className="w-3 h-3 text-emerald-700" />
                  Filtros ativos ({activeFiltersCount}):
                </span>
                {searchTerm.trim() && (
                  <span className="bg-white px-2 py-0.5 rounded-md border border-emerald-200 text-[11px] font-medium text-emerald-800">
                    Busca: "{searchTerm}"
                  </span>
                )}
                {!isInstalador && selectedPrestadorFilter !== 'todos' && (
                  <span className="bg-white px-2 py-0.5 rounded-md border border-emerald-200 text-[11px] font-medium text-emerald-800">
                    Prestador: {selectedPrestadorFilter}
                  </span>
                )}
                {selectedTipoFilter !== 'todos' && (
                  <span className="bg-white px-2 py-0.5 rounded-md border border-emerald-200 text-[11px] font-medium text-emerald-800">
                    Tipo: {selectedTipoFilter}
                  </span>
                )}
                {selectedPeriodoFilter !== 'todos' && (
                  <span className="bg-white px-2 py-0.5 rounded-md border border-emerald-200 text-[11px] font-medium text-emerald-800">
                    Período:{' '}
                    {selectedPeriodoFilter === 'hoje'
                      ? 'Hoje'
                      : selectedPeriodoFilter === 'semana'
                        ? 'Nesta Semana'
                        : 'Neste Mês'}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleLimparFiltros}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-950 underline shrink-0 cursor-pointer"
              >
                Limpar todos
              </button>
            </div>
          )}

          {/* Lista de Cards de Ordens de Serviço */}
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin mb-3 mx-auto" />
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

                const checklistTotal = (os?.checklist ?? []).length
                const checklistFeitos = (os?.checklist ?? []).filter((c) => c?.concluido).length
                const fotosQtd = (os?.fotos ?? []).length

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
                        : 'border-emerald-200 hover:border-emerald-500'
                    }`}
                  >
                    <div>
                      {/* Topo do Card: Tipo do Serviço, Origem, Status e Ação de Exclusão (Admin) */}
                      <div className="flex items-center justify-between gap-1.5 mb-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                            {os.tipo_servico}
                          </span>
                          {os.origem === 'atividades' && (
                            <span className="text-[10px] font-semibold tracking-wide px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/80">
                              Atividade
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 ml-auto">
                          {os.status === 'concluida' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3 shrink-0" />
                              Concluída
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

                      {/* Nome do Cliente - exibição legível de até 2 linhas com title/tooltip para integridade */}
                      <h3
                        title={clienteNome}
                        className="text-sm sm:text-base font-bold text-gray-900 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-snug mb-1"
                      >
                        {clienteNome}
                      </h3>

                      {/* Endereço de Execução - legível com quebra elegante em 2 linhas e title completo */}
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
                          Data:{' '}
                          <strong>
                            {os?.data_agendada ? formatDateTime(os.data_agendada) : 'Não agendada'}
                          </strong>
                        </span>
                      </div>

                      {/* Técnico Atribuído & Botão de Atribuir para Admin */}
                      <div className="flex items-center justify-between gap-1.5 text-xs text-gray-500 mb-2">
                        <div
                          title={`Instalador: ${os.atribuida_a || 'Não atribuído'}`}
                          className="flex items-center gap-1.5 min-w-0 flex-1"
                        >
                          <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="truncate text-[11px] sm:text-xs">
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
                              setSelectedInstaladorId(os?.responsavel_usuario_id || '')
                              setSelectedProfissionalId(os?.profissional_id || '')
                            }}
                            className="h-8 px-2.5 inline-flex items-center justify-center text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors shrink-0"
                          >
                            Reatribuir
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Rodapé do Card com Progresso e Botões Compactos h-8 */}
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

                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {/* Botão Traçar Rota (GPS Usina / Cliente) direto no card */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            const SEDE_DELFOS =
                              'Rua Espírito Santo, 275, Erechim - RS, CEP 99709296'
                            const usina = os.expand?.usina_id
                            const cli = os.expand?.cliente_id
                            const lat =
                              usina?.latitude !== undefined &&
                              usina?.latitude !== null &&
                              !isNaN(Number(usina.latitude)) &&
                              Number(usina.latitude) !== 0
                                ? Number(usina.latitude)
                                : cli?.latitude !== undefined &&
                                    cli?.latitude !== null &&
                                    !isNaN(Number(cli.latitude)) &&
                                    Number(cli.latitude) !== 0
                                  ? Number(cli.latitude)
                                  : null
                            const lng =
                              usina?.longitude !== undefined &&
                              usina?.longitude !== null &&
                              !isNaN(Number(usina.longitude)) &&
                              Number(usina.longitude) !== 0
                                ? Number(usina.longitude)
                                : cli?.longitude !== undefined &&
                                    cli?.longitude !== null &&
                                    !isNaN(Number(cli.longitude)) &&
                                    Number(cli.longitude) !== 0
                                  ? Number(cli.longitude)
                                  : null

                            if (lat !== null && lng !== null) {
                              window.open(
                                `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(SEDE_DELFOS)}&destination=${lat},${lng}`,
                                '_blank',
                                'noopener,noreferrer',
                              )
                              return
                            }

                            const dest = [
                              os.endereco ||
                                usina?.endereco ||
                                cli?.usina_endereco ||
                                cli?.endereco,
                              usina?.cidade || cli?.cidade,
                            ]
                              .filter(Boolean)
                              .join(' - ')

                            if (dest) {
                              window.open(
                                `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(SEDE_DELFOS)}&destination=${encodeURIComponent(dest)}`,
                                '_blank',
                                'noopener,noreferrer',
                              )
                              return
                            }

                            toast({
                              variant: 'destructive',
                              title: 'Destino não disponível',
                              description:
                                'Esta OS não possui coordenadas GPS nem endereço para traçar rota.',
                            })
                          }}
                          className="h-8 px-2.5 inline-flex items-center gap-1 text-[11px] font-bold text-[#0F2038] bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors shadow-2xs"
                          title="Traçar Rota a partir da sede Delfos Solar via GPS da usina ou endereço"
                        >
                          <Navigation className="w-3.5 h-3.5 text-[#0F2038]" />
                          <span>Traçar Rota</span>
                        </button>

                        {/* OS CONCLUÍDA: Ações exclusivas de Admin para Relatório Técnico em PDF e WhatsApp para Cliente */}
                        {os.status === 'concluida' && isAdmin && (
                          <div
                            className="flex items-center gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={gerandoPdfOsId === os.id}
                              onClick={() => handleVerRelatorioPdf(os)}
                              className="h-8 px-2.5 text-[11px] font-bold text-emerald-800 border-emerald-300 hover:bg-emerald-50 bg-white"
                              title="Visualizar Relatório Técnico de Execução em PDF"
                            >
                              <FileText className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                              {gerandoPdfOsId === os.id
                                ? 'Gerando...'
                                : os.relatorio_pdf
                                  ? 'Ver Relatório (PDF)'
                                  : 'Gerar Relatório (PDF)'}
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              onClick={() => setOsParaWhatsApp(os)}
                              className="h-8 px-2.5 text-[11px] font-bold bg-[#16A34A] hover:bg-[#15803D] text-white shadow-2xs"
                              title="Enviar Relatório Técnico de Execução por WhatsApp ao Cliente"
                            >
                              <Send className="w-3.5 h-3.5 mr-1" />
                              Enviar Relatório por WhatsApp
                            </Button>
                          </div>
                        )}

                        {/* OS PENDENTE/EM ANDAMENTO: Botão de Envio Manual de OS via WhatsApp para o prestador */}
                        {os.status !== 'concluida' && (!isInstalador || isAdmin) && (
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

                        <div className="h-8 px-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 group-hover:translate-x-0.5 transition-transform">
                          <span>{os.status === 'concluida' ? 'Ver Ficha' : 'Executar OS'}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
      {/* Modal de Envio do Relatório em PDF por WhatsApp ao Cliente (Apenas Admin) */}
      {osParaWhatsApp && (
        <ModalEnviarRelatorioOSWhatsApp
          isOpen={Boolean(osParaWhatsApp)}
          onClose={() => setOsParaWhatsApp(null)}
          os={osParaWhatsApp}
          cliente={osParaWhatsApp.expand?.cliente_id}
          onSuccess={() => {
            carregarDados()
          }}
        />
      )}

      {/* Confirmação de Exclusão de OS (Apenas Admin) */}
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
                  Ordem de Serviço #{(osParaExcluir?.id || '').slice(0, 8)} —{' '}
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
                      const safeInstName = (inst.name || '').trim().toLowerCase()
                      const matchProf = profissionais.find(
                        (p) => (p.nome || '').trim().toLowerCase() === safeInstName,
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
                className="rounded-lg h-8 px-3 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={isSavingAtribuicao}
                onClick={handleSalvarAtribuicao}
                className="bg-[#16A34A] hover:bg-[#15803D] text-white font-bold rounded-lg h-8 px-3 text-xs"
              >
                {isSavingAtribuicao ? 'Salvando...' : 'Confirmar Reatribuição'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de Criação de Nova Atividade (Apenas Manutenção nos Serviços de Campo) */}
      {isModalNovaAtividadeOpen && (
        <ModalNovaAtividade
          isOpen={isModalNovaAtividadeOpen}
          onClose={() => setIsModalNovaAtividadeOpen(false)}
          onAtividadeCriada={() => carregarDados()}
          apenasManutencao
        />
      )}
    </div>
  )
}
