import React, { useState, useEffect } from 'react'
import {
  RefreshCw,
  Send,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  PhoneOff,
  UserCheck,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  Layers,
  ArrowRight,
  Filter,
  Check,
  Pause,
  Play,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import {
  DisparoMassaRegistro,
  DestinatarioLoteMassa,
  MarcacaoRespostaDestinatario,
  fetchDisparosMassa,
  updateStatusDisparoMassa,
  marcarRespostaDestinatario,
  toggleReenvioLote,
  dispararVerificacaoReenviosBackend,
} from '@/services/disparosMassaService'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { GitFork, MessageSquare, ThumbsUp, HelpCircle, BellOff, History } from 'lucide-react'
import { fetchFluxosFollowUp, type FluxoFollowUp } from '@/services/fluxosFollowUpService'

interface PainelAcompanhamentoDisparosProps {
  onAbrirNovoDisparo?: () => void
}

export const PainelAcompanhamentoDisparos: React.FC<PainelAcompanhamentoDisparosProps> = ({
  onAbrirNovoDisparo,
}) => {
  const { toast } = useToast()
  const [lotes, setLotes] = useState<DisparoMassaRegistro[]>([])
  const [fluxosMap, setFluxosMap] = useState<Record<string, FluxoFollowUp>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isVerificando, setIsVerificando] = useState(false)
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'ativo' | 'concluido' | 'cancelado'>(
    'todos',
  )
  const [buscaLote, setBuscaLote] = useState('')
  const [loteExpandidoId, setLoteExpandidoId] = useState<string | null>(null)
  const [filtroDestinatario, setFiltroDestinatario] = useState<string>('todos')
  const [destinatarioTrilhaModal, setDestinatarioTrilhaModal] =
    useState<DestinatarioLoteMassa | null>(null)
  const [isSalvandoMarcacao, setIsSalvandoMarcacao] = useState(false)

  const carregarLotes = async () => {
    setIsLoading(true)
    try {
      const [records, listaFluxos] = await Promise.all([
        fetchDisparosMassa(),
        fetchFluxosFollowUp(false).catch(() => []),
      ])
      setLotes(records)
      const mapa: Record<string, FluxoFollowUp> = {}
      listaFluxos.forEach((f) => {
        mapa[f.id] = f
      })
      setFluxosMap(mapa)

      if (records.length > 0 && !loteExpandidoId) {
        setLoteExpandidoId(records[0].id)
      }
    } catch (err) {
      console.error('Erro ao carregar lotes de disparo:', err)
      toast({
        title: 'Erro ao carregar disparos',
        description: 'Não foi possível carregar a lista de lotes de disparo em massa.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    carregarLotes()
  }, [])

  const handleForcarVerificacao = async () => {
    setIsVerificando(true)
    try {
      const res = await dispararVerificacaoReenviosBackend()
      toast({
        title: 'Verificação executada',
        description: 'Checagem de respostas e agendamento de reenvios concluída com sucesso.',
      })
      await carregarLotes()
    } catch (err) {
      toast({
        title: 'Erro na verificação',
        description: 'Falha ao executar a verificação de reenvio no servidor.',
        variant: 'destructive',
      })
    } finally {
      setIsVerificando(false)
    }
  }

  const handleToggleReenvio = async (lote: DisparoMassaRegistro, e: React.MouseEvent) => {
    e.stopPropagation()
    const novoStatus = !lote.reenvio_ativo
    try {
      await toggleReenvioLote(lote.id, novoStatus)
      setLotes((prev) =>
        prev.map((l) => (l.id === lote.id ? { ...l, reenvio_ativo: novoStatus } : l)),
      )
      toast({
        title: novoStatus ? 'Reenvio reativado' : 'Reenvio pausado',
        description: `Automação de reenvio do lote "${lote.titulo}" ${novoStatus ? 'ativada' : 'pausada'}.`,
      })
    } catch (err) {
      toast({
        title: 'Erro ao alterar reenvio',
        description: 'Não foi possível atualizar o status do reenvio deste lote.',
        variant: 'destructive',
      })
    }
  }

  const handleEncerrarLote = async (lote: DisparoMassaRegistro, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await updateStatusDisparoMassa(lote.id, 'concluido')
      setLotes((prev) => prev.map((l) => (l.id === lote.id ? { ...l, status: 'concluido' } : l)))
      toast({
        title: 'Lote concluído',
        description: `O lote "${lote.titulo}" foi marcado como concluído.`,
      })
    } catch (err) {
      toast({
        title: 'Erro ao concluir lote',
        description: 'Falha ao atualizar status do lote.',
      })
    }
  }

  const handleMarcarResposta = async (
    loteId: string,
    destinatarioIndex: number,
    marcacao: MarcacaoRespostaDestinatario,
    destNome: string,
  ) => {
    setIsSalvandoMarcacao(true)
    try {
      const loteAtualizado = await marcarRespostaDestinatario(loteId, destinatarioIndex, marcacao)
      setLotes((prev) => prev.map((l) => (l.id === loteId ? loteAtualizado : l)))

      const rotulos: Record<MarcacaoRespostaDestinatario, string> = {
        respondeu: 'Marcado como: Respondeu',
        interessado: 'Marcado como: Interessado',
        sem_resposta: 'Marcado como: Sem Resposta',
        nao_perturbe: 'Marcado como: Não Perturbe',
        nenhuma: 'Marcação removida',
      }

      toast({
        title: rotulos[marcacao],
        description: `Status de follow-up de ${destNome} atualizado com sucesso.`,
      })
    } catch (err) {
      console.error('Erro ao marcar resposta:', err)
      toast({
        title: 'Erro ao salvar marcação',
        description: 'Não foi possível registrar a marcação do destinatário.',
        variant: 'destructive',
      })
    } finally {
      setIsSalvandoMarcacao(false)
    }
  }

  // Filtragem dos lotes
  const lotesFiltrados = lotes.filter((l) => {
    if (filtroStatus !== 'todos' && l.status !== filtroStatus) return false
    if (buscaLote.trim()) {
      const termo = buscaLote.toLowerCase()
      const matchTitulo = l.titulo.toLowerCase().includes(termo)
      const matchMsg = l.mensagem_original?.toLowerCase().includes(termo)
      const matchSeg = l.segmento?.toLowerCase().includes(termo)
      return matchTitulo || matchMsg || matchSeg
    }
    return true
  })

  // Totalizadores gerais
  const totalLotes = lotes.length
  const totalMensagensLotes = lotes.reduce((acc, cur) => acc + (cur.total_destinatarios || 0), 0)
  const totalRespondidosGeral = lotes.reduce((acc, cur) => {
    const stats = cur.estatisticas
    if (stats?.respondidos !== undefined) return acc + stats.respondidos
    const dests = cur.destinatarios || []
    return acc + dests.filter((d) => d.status === 'respondido').length
  }, 0)
  const totalAtendidosGeral = lotes.reduce((acc, cur) => {
    const stats = cur.estatisticas
    if (stats?.atendidos !== undefined) return acc + stats.atendidos
    const dests = cur.destinatarios || []
    return acc + dests.filter((d) => d.status === 'atendido').length
  }, 0)
  const totalPendentesGeral = lotes.reduce((acc, cur) => {
    const stats = cur.estatisticas
    if (stats?.pendentes !== undefined) return acc + stats.pendentes
    const dests = cur.destinatarios || []
    return (
      acc +
      dests.filter(
        (d) =>
          d.status === 'pendente' ||
          d.status === 'reenvio_1_agendado' ||
          d.status === 'reenvio_2_agendado',
      ).length
    )
  }, 0)

  return (
    <div className="flex-1 flex flex-col space-y-4 p-4 sm:p-5 overflow-y-auto">
      {/* Topo com Título, Estatísticas Cards e Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#0284C7]" />
            <span>Acompanhamento dos Disparos em Massa</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Gerenciamento de lotes de disparo, taxa de resposta, atendimento na Central e automação
            de 1º e 2º reenvios.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={carregarLotes}
            disabled={isLoading}
            className="text-xs h-8 text-gray-700 bg-white"
            title="Recarregar lotes"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleForcarVerificacao}
            disabled={isVerificando}
            className="text-xs h-8 text-sky-800 bg-sky-50 border-sky-300 hover:bg-sky-100"
            title="Verifica agora se houve respostas ou se é hora de agendar 1º ou 2º reenvio"
          >
            <RotateCcw className={`w-3.5 h-3.5 mr-1.5 ${isVerificando ? 'animate-spin' : ''}`} />
            <span>{isVerificando ? 'Verificando...' : 'Verificar Respostas Agora'}</span>
          </Button>

          {onAbrirNovoDisparo && (
            <Button
              type="button"
              size="sm"
              onClick={onAbrirNovoDisparo}
              className="text-xs h-8 bg-[#0284C7] hover:bg-[#0369a1] text-white font-bold"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              <span>Novo Disparo</span>
            </Button>
          )}
        </div>
      </div>

      {/* Cards de Métricas Consolidadas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Total Disparados</span>
            <Send className="w-4 h-4 text-sky-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-gray-900">{totalMensagensLotes}</span>
            <span className="text-[11px] text-gray-400">em {totalLotes} lote(s)</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Respondidos</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-emerald-700">{totalRespondidosGeral}</span>
            <span className="text-[11px] text-emerald-600 font-medium">
              {totalMensagensLotes > 0
                ? `${Math.round((totalRespondidosGeral / totalMensagensLotes) * 100)}%`
                : '0%'}
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Atendidos na Central</span>
            <UserCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-blue-700">{totalAtendidosGeral}</span>
            <span className="text-[11px] text-gray-400">fora da régua</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Pendentes de Resposta</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-amber-700">{totalPendentesGeral}</span>
            <span className="text-[11px] text-amber-600 font-medium">aguardando régua</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca de Lotes */}
      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1">
          <Input
            placeholder="Buscar por título do lote, segmento ou mensagem..."
            value={buscaLote}
            onChange={(e) => setBuscaLote(e.target.value)}
            className="h-8 text-xs bg-white flex-1 max-w-md"
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-gray-500 font-medium mr-1">Status:</span>
          {(['todos', 'ativo', 'concluido', 'cancelado'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFiltroStatus(st)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                filtroStatus === st
                  ? 'bg-[#0284C7] text-white shadow-2xs'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              {st === 'todos'
                ? 'Todos'
                : st === 'ativo'
                  ? 'Ativos'
                  : st === 'concluido'
                    ? 'Concluídos'
                    : 'Cancelados'}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Lotes */}
      {isLoading && lotes.length === 0 ? (
        <div className="py-12 text-center text-xs text-gray-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-sky-600 mb-2" />
          <span>Carregando histórico de lotes de disparo...</span>
        </div>
      ) : lotesFiltrados.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-gray-200 text-xs text-gray-500 space-y-2">
          <Layers className="w-8 h-8 mx-auto text-gray-400" />
          <p className="font-semibold text-gray-700">Nenhum lote de disparo encontrado.</p>
          <p className="text-gray-400 max-w-sm mx-auto">
            Ao disparar mensagens em massa com a opção "Reenvio automático" ativada, cada lote é
            registrado aqui com critérios, estatísticas e acompanhamento diário.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {lotesFiltrados.map((lote) => {
            const isExpandido = loteExpandidoId === lote.id
            const dests = Array.isArray(lote.destinatarios) ? lote.destinatarios : []
            const stats = lote.estatisticas || {
              total: dests.length,
              pendentes: dests.filter(
                (d) =>
                  d.status === 'pendente' ||
                  d.status === 'reenvio_1_agendado' ||
                  d.status === 'reenvio_2_agendado',
              ).length,
              respondidos: dests.filter((d) => d.status === 'respondido').length,
              atendidos: dests.filter((d) => d.status === 'atendido').length,
              bloqueados: dests.filter(
                (d) => d.status === 'bloqueado' || d.status === 'sem_whatsapp',
              ).length,
              finalizados: dests.filter((d) => d.status === 'finalizado').length,
              reenvios_1_enviados: dests.filter((d) => Boolean(d.reenvio_1_data)).length,
              reenvios_2_enviados: dests.filter((d) => Boolean(d.reenvio_2_data)).length,
            }

            const dataFormatada = new Date(lote.data_disparo || lote.created).toLocaleString(
              'pt-BR',
              {
                timeZone: 'America/Sao_Paulo',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              },
            )

            // Destinatários filtrados pelo seletor interno
            const destsFiltrados = dests.filter((d) => {
              if (filtroDestinatario === 'todos') return true
              if (filtroDestinatario === 'respondido') return d.status === 'respondido'
              if (filtroDestinatario === 'atendido') return d.status === 'atendido'
              if (filtroDestinatario === 'pendente')
                return (
                  d.status === 'pendente' ||
                  d.status === 'reenvio_1_agendado' ||
                  d.status === 'reenvio_2_agendado'
                )
              if (filtroDestinatario === 'bloqueado')
                return d.status === 'bloqueado' || d.status === 'sem_whatsapp'
              if (filtroDestinatario === 'finalizado') return d.status === 'finalizado'
              return true
            })

            return (
              <div
                key={lote.id}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs transition-all hover:border-sky-300"
              >
                {/* Cabeçalho do Card de Lote */}
                <div
                  onClick={() => setLoteExpandidoId(isExpandido ? null : lote.id)}
                  className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 cursor-pointer select-none bg-gradient-to-r from-gray-50/50 via-white to-gray-50/30"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div
                      className={`p-2 rounded-xl text-white font-bold shrink-0 ${
                        lote.status === 'ativo'
                          ? 'bg-[#0284C7]'
                          : lote.status === 'concluido'
                            ? 'bg-emerald-600'
                            : 'bg-gray-400'
                      }`}
                    >
                      <Layers className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-gray-900">{lote.titulo}</span>

                        <Badge
                          variant="outline"
                          className={`text-[11px] font-bold capitalize ${
                            lote.status === 'ativo'
                              ? 'bg-sky-50 text-sky-800 border-sky-300'
                              : lote.status === 'concluido'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {lote.status}
                        </Badge>

                        {lote.reenvio_ativo ? (
                          <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-semibold flex items-center gap-1">
                            <RotateCcw className="w-3 h-3 text-amber-700" />
                            <span>Reenvio Automático Ativo (+3d / +90d)</span>
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] text-gray-500">
                            Reenvio Pausado
                          </Badge>
                        )}
                      </div>

                      <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-3 flex-wrap">
                        <span>Disparado em: {dataFormatada}</span>
                        <span>•</span>
                        <span>
                          Segmento:{' '}
                          <strong className="text-gray-700">{lote.segmento || 'Todos'}</strong>
                        </span>
                        <span>•</span>
                        <span>Intervalo: {lote.intervalo_segundos || 60}s</span>
                      </div>
                    </div>
                  </div>

                  {/* Resumo Numérico das Métricas do Lote */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100">
                    <div className="text-center px-2">
                      <span className="text-[10px] text-gray-400 block uppercase font-bold">
                        Total
                      </span>
                      <span className="text-sm font-bold text-gray-900">{stats.total}</span>
                    </div>

                    <div className="text-center px-2">
                      <span className="text-[10px] text-emerald-600 block uppercase font-bold">
                        Respondidos
                      </span>
                      <span className="text-sm font-bold text-emerald-700">
                        {stats.respondidos}
                      </span>
                    </div>

                    <div className="text-center px-2">
                      <span className="text-[10px] text-blue-600 block uppercase font-bold">
                        Atendidos
                      </span>
                      <span className="text-sm font-bold text-blue-700">{stats.atendidos}</span>
                    </div>

                    <div className="text-center px-2">
                      <span className="text-[10px] text-amber-600 block uppercase font-bold">
                        Pendentes
                      </span>
                      <span className="text-sm font-bold text-amber-700">{stats.pendentes}</span>
                    </div>

                    <div className="text-center px-2 hidden sm:block">
                      <span className="text-[10px] text-gray-400 block uppercase font-bold">
                        Bloq/Sem WPP
                      </span>
                      <span className="text-sm font-bold text-gray-500">{stats.bloqueados}</span>
                    </div>

                    <div className="pl-2 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => handleToggleReenvio(lote, e)}
                        className={`p-1.5 rounded-lg border transition-all text-xs font-semibold ${
                          lote.reenvio_ativo
                            ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                        }`}
                        title={
                          lote.reenvio_ativo ? 'Pausar reenvios deste lote' : 'Retomar reenvios'
                        }
                      >
                        {lote.reenvio_ativo ? (
                          <Pause className="w-3.5 h-3.5" />
                        ) : (
                          <Play className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                      </button>

                      <div className="text-gray-400 p-1">
                        {isExpandido ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Conteúdo Detalhado ao Expandir */}
                {isExpandido && (
                  <div className="p-4 sm:p-5 border-t border-gray-200 bg-slate-50/60 space-y-4">
                    {/* Linha de Informações do Fluxo Vinculado e Mensagem Inicial */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-white border border-gray-200 space-y-1">
                        <span className="font-bold text-gray-800 flex items-center gap-1.5">
                          <Send className="w-3.5 h-3.5 text-sky-600" />
                          <span>Mensagem Inicial Disparada</span>
                        </span>
                        <p className="text-gray-600 italic whitespace-pre-wrap line-clamp-3 bg-gray-50 p-2 rounded-lg border border-gray-100 text-[11px]">
                          "{lote.mensagem_original}"
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-white border border-emerald-200 space-y-1 md:col-span-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-emerald-700" />
                            <span>
                              Fluxo de Follow-up:{' '}
                              <strong>
                                {lote.fluxo_id && fluxosMap[lote.fluxo_id]
                                  ? fluxosMap[lote.fluxo_id].nome
                                  : 'Padrão Delfos (+3d / +90d)'}
                              </strong>
                            </span>
                          </span>
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                            {(stats.reenvios_1_enviados || 0) + (stats.reenvios_2_enviados || 0)}{' '}
                            reenvio(s) executado(s)
                          </span>
                        </div>

                        {lote.fluxo_id && fluxosMap[lote.fluxo_id]?.etapas ? (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {fluxosMap[lote.fluxo_id].etapas!.map((etapa, eIdx) => (
                              <div
                                key={etapa.id}
                                className={`text-[11px] px-2 py-1 rounded-md border flex items-center gap-1.5 ${
                                  etapa.ativa
                                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                                    : 'bg-gray-100 border-gray-200 text-gray-400 line-through'
                                }`}
                              >
                                <span className="font-bold">
                                  Etapa {eIdx + 1} (+{etapa.dias_apos}d):
                                </span>
                                <span className="truncate max-w-[180px]">{etapa.nome}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px] text-gray-600">
                            <div className="bg-amber-50/60 p-1.5 rounded border border-amber-200">
                              <strong>Etapa 1 (+3d):</strong>{' '}
                              {lote.texto_reenvio_1 || 'Mensagem padrão +3d'}
                            </div>
                            <div className="bg-purple-50/60 p-1.5 rounded border border-purple-200">
                              <strong>Etapa 2 (+90d):</strong>{' '}
                              {lote.texto_reenvio_2 || 'Mensagem padrão +90d'}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Filtros da Tabela de Destinatários do Lote */}
                    <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-gray-200">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-gray-700">Destinatários:</span>
                        {[
                          { id: 'todos', label: `Todos (${dests.length})` },
                          { id: 'respondido', label: `Respondidos (${stats.respondidos})` },
                          { id: 'atendido', label: `Atendidos (${stats.atendidos})` },
                          { id: 'pendente', label: `Pendentes (${stats.pendentes})` },
                          { id: 'bloqueado', label: `Bloqueados (${stats.bloqueados})` },
                          { id: 'finalizado', label: `Finalizados (${stats.finalizados})` },
                        ].map((filtro) => (
                          <button
                            key={filtro.id}
                            type="button"
                            onClick={() => setFiltroDestinatario(filtro.id)}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all ${
                              filtroDestinatario === filtro.id
                                ? 'bg-sky-600 text-white shadow-2xs'
                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            {filtro.label}
                          </button>
                        ))}
                      </div>

                      {lote.status === 'ativo' && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => handleEncerrarLote(lote, e)}
                          className="h-7 text-[11px] font-bold text-gray-700 hover:text-emerald-700"
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                          <span>Concluir Lote</span>
                        </Button>
                      )}
                    </div>

                    {/* Tabela de Destinatários */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
                      <div className="max-h-64 overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold sticky top-0 text-[11px]">
                            <tr>
                              <th className="py-2 px-3">Cliente</th>
                              <th className="py-2 px-3">Telefone</th>
                              <th className="py-2 px-3">Fluxo & Etapa Atual</th>
                              <th className="py-2 px-3">Próximo Envio</th>
                              <th className="py-2 px-3">Status / Desfecho</th>
                              <th className="py-2 px-3">Marcação de Resposta (Ações)</th>
                              <th className="py-2 px-3">Trilha / Histórico</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-[11px]">
                            {destsFiltrados.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="py-4 text-center text-gray-400">
                                  Nenhum destinatário com o status selecionado.
                                </td>
                              </tr>
                            ) : (
                              destsFiltrados.map((dest) => {
                                // Encontra o índice real no array original de destinatários do lote
                                const realIdx = dests.findIndex(
                                  (d) =>
                                    d.telefone === dest.telefone &&
                                    (d.cliente_id === dest.cliente_id ||
                                      (!d.cliente_id && !dest.cliente_id)),
                                )

                                const nomeFluxoItem =
                                  dest.fluxo_atual_id && fluxosMap[dest.fluxo_atual_id]
                                    ? fluxosMap[dest.fluxo_atual_id].nome
                                    : lote.fluxo_id && fluxosMap[lote.fluxo_id]
                                      ? fluxosMap[lote.fluxo_id].nome
                                      : 'Padrão Delfos'

                                const temDesvioOrigem = Boolean(
                                  dest.fluxo_origem_nome || (dest.trilha && dest.trilha.length > 1),
                                )

                                return (
                                  <tr
                                    key={realIdx}
                                    className="hover:bg-slate-50/80 transition-colors"
                                  >
                                    <td className="py-2 px-3 font-semibold text-gray-900">
                                      <div className="flex flex-col">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span>{dest.nome || 'Cliente sem nome'}</span>
                                          {dest.origem_entrada === 'automatica_por_estagio' && (
                                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[9px] font-bold px-1 py-0">
                                              Estágio
                                              {dest.estagio_origem
                                                ? `: ${dest.estagio_origem}`
                                                : ''}
                                            </Badge>
                                          )}
                                        </div>
                                        {dest.marcacao_resposta &&
                                          dest.marcacao_resposta !== 'nenhuma' && (
                                            <span className="text-[10px] text-sky-700 font-medium">
                                              Marcação: {dest.marcacao_resposta}
                                            </span>
                                          )}
                                      </div>
                                    </td>
                                    <td className="py-2 px-3 font-mono text-gray-600">
                                      {dest.telefone || '—'}
                                    </td>
                                    <td className="py-2 px-3">
                                      <div className="flex flex-col gap-0.5">
                                        <div className="flex items-center gap-1 flex-wrap">
                                          <span className="font-semibold text-gray-800">
                                            {dest.etapa_atual_nome ||
                                              (dest.reenvio_2_data
                                                ? '2ª Etapa (+90d)'
                                                : dest.reenvio_1_data
                                                  ? '1ª Etapa (+3d)'
                                                  : 'Disparo Inicial')}
                                          </span>
                                          {dest.etapa_atual_ordem && (
                                            <span className="text-[10px] text-gray-400 font-mono">
                                              #{dest.etapa_atual_ordem}
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                          <span className="font-medium text-emerald-800 bg-emerald-50 px-1 rounded">
                                            {nomeFluxoItem}
                                          </span>
                                          {temDesvioOrigem && (
                                            <span
                                              className="text-[10px] text-amber-700 font-semibold cursor-pointer underline flex items-center gap-0.5"
                                              onClick={() => setDestinatarioTrilhaModal(dest)}
                                              title="Clique para ver a trilha de desvio"
                                            >
                                              <GitFork className="w-2.5 h-2.5 text-amber-600" />
                                              <span>desviado</span>
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-2 px-3">
                                      {dest.proximo_envio_data ? (
                                        <div className="flex flex-col gap-0.5">
                                          <span className="inline-flex items-center gap-1 font-semibold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                                            <Clock className="w-3 h-3 text-sky-600" />
                                            <span>
                                              {new Date(dest.proximo_envio_data).toLocaleString(
                                                'pt-BR',
                                                {
                                                  timeZone: 'America/Sao_Paulo',
                                                  day: '2-digit',
                                                  month: '2-digit',
                                                  hour: '2-digit',
                                                  minute: '2-digit',
                                                },
                                              )}
                                            </span>
                                          </span>
                                          {dest.proxima_etapa_nome && (
                                            <span className="text-[10px] text-gray-500 truncate max-w-[150px]">
                                              Prox: {dest.proxima_etapa_nome}
                                            </span>
                                          )}
                                        </div>
                                      ) : dest.status === 'respondido' ||
                                        dest.status === 'atendido' ||
                                        dest.status === 'finalizado' ||
                                        dest.status === 'nao_perturbe' ||
                                        dest.status === 'arquivado' ? (
                                        <span className="text-gray-400 italic">Concluído</span>
                                      ) : (
                                        <span className="text-gray-400">—</span>
                                      )}
                                    </td>
                                    <td className="py-2 px-3">
                                      {dest.status === 'respondido' ? (
                                        <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                          <CheckCircle2 className="w-3 h-3" />
                                          <span>Respondeu</span>
                                        </span>
                                      ) : dest.status === 'atendido' ? (
                                        <span className="inline-flex items-center gap-1 font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                          <UserCheck className="w-3 h-3" />
                                          <span>Atendido Central</span>
                                        </span>
                                      ) : dest.status === 'reenvio_1_agendado' ? (
                                        <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                          <Clock className="w-3 h-3" />
                                          <span>1º Reenvio Agendado</span>
                                        </span>
                                      ) : dest.status === 'reenvio_2_agendado' ? (
                                        <span className="inline-flex items-center gap-1 font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                                          <Clock className="w-3 h-3" />
                                          <span>2º Reenvio Agendado</span>
                                        </span>
                                      ) : dest.status === 'bloqueado' ? (
                                        <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                          <PhoneOff className="w-3 h-3" />
                                          <span>Bloqueado</span>
                                        </span>
                                      ) : dest.status === 'sem_whatsapp' ? (
                                        <span className="inline-flex items-center gap-1 font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                                          <span>Sem WhatsApp</span>
                                        </span>
                                      ) : dest.status === 'nao_perturbe' ? (
                                        <span className="inline-flex items-center gap-1 font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-300">
                                          <BellOff className="w-3 h-3 text-slate-600" />
                                          <span>Não Perturbe</span>
                                        </span>
                                      ) : dest.status === 'arquivado' ? (
                                        <span className="inline-flex items-center gap-1 font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                          <span>Arquivado (desvio)</span>
                                        </span>
                                      ) : dest.status === 'finalizado' ? (
                                        <span className="inline-flex items-center gap-1 font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
                                          <span>Finalizado</span>
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                                          <Clock className="w-3 h-3" />
                                          <span>Na Régua de Follow-up</span>
                                        </span>
                                      )}
                                      {dest.motivo_saida && (
                                        <span className="block text-[10px] text-gray-400 mt-0.5 line-clamp-2">
                                          {dest.motivo_saida}
                                        </span>
                                      )}
                                    </td>
                                    {/* Ações de Marcação Manual de Resposta */}
                                    <td className="py-2 px-3">
                                      <div className="flex items-center gap-1 flex-wrap">
                                        <button
                                          type="button"
                                          disabled={isSalvandoMarcacao}
                                          onClick={() =>
                                            handleMarcarResposta(
                                              lote.id,
                                              realIdx,
                                              'respondeu',
                                              dest.nome,
                                            )
                                          }
                                          className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold transition-all flex items-center gap-0.5 ${
                                            dest.marcacao_resposta === 'respondeu'
                                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                                              : 'bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-50'
                                          }`}
                                          title="Marcar que o cliente respondeu (encerra envios)"
                                        >
                                          <MessageSquare className="w-2.5 h-2.5" />
                                          <span>Respondeu</span>
                                        </button>

                                        <button
                                          type="button"
                                          disabled={isSalvandoMarcacao}
                                          onClick={() =>
                                            handleMarcarResposta(
                                              lote.id,
                                              realIdx,
                                              'interessado',
                                              dest.nome,
                                            )
                                          }
                                          className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold transition-all flex items-center gap-0.5 ${
                                            dest.marcacao_resposta === 'interessado'
                                              ? 'bg-blue-600 text-white border-blue-700 shadow-2xs'
                                              : 'bg-white text-blue-800 border-blue-300 hover:bg-blue-50'
                                          }`}
                                          title="Marcar cliente como interessado"
                                        >
                                          <ThumbsUp className="w-2.5 h-2.5" />
                                          <span>Interessado</span>
                                        </button>

                                        <button
                                          type="button"
                                          disabled={isSalvandoMarcacao}
                                          onClick={() =>
                                            handleMarcarResposta(
                                              lote.id,
                                              realIdx,
                                              'sem_resposta',
                                              dest.nome,
                                            )
                                          }
                                          className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold transition-all flex items-center gap-0.5 ${
                                            dest.marcacao_resposta === 'sem_resposta'
                                              ? 'bg-amber-600 text-white border-amber-700 shadow-2xs'
                                              : 'bg-white text-amber-800 border-amber-300 hover:bg-amber-50'
                                          }`}
                                          title="Marcar sem resposta (deixa o timeout seguir régua/desvio)"
                                        >
                                          <HelpCircle className="w-2.5 h-2.5" />
                                          <span>Sem resp.</span>
                                        </button>

                                        <button
                                          type="button"
                                          disabled={isSalvandoMarcacao}
                                          onClick={() =>
                                            handleMarcarResposta(
                                              lote.id,
                                              realIdx,
                                              'nao_perturbe',
                                              dest.nome,
                                            )
                                          }
                                          className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold transition-all flex items-center gap-0.5 ${
                                            dest.marcacao_resposta === 'nao_perturbe'
                                              ? 'bg-slate-700 text-white border-slate-800 shadow-2xs'
                                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                                          }`}
                                          title="Marcar Não Perturbe (encerra o fluxo e cancela envios)"
                                        >
                                          <BellOff className="w-2.5 h-2.5" />
                                          <span>Não perturbe</span>
                                        </button>
                                      </div>
                                    </td>
                                    {/* Trilha e Histórico */}
                                    <td className="py-2 px-3 text-gray-600">
                                      <div className="flex flex-col gap-1">
                                        <button
                                          type="button"
                                          onClick={() => setDestinatarioTrilhaModal(dest)}
                                          className="text-[10px] font-semibold text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 px-2 py-0.5 rounded border border-sky-200 inline-flex items-center gap-1 w-fit"
                                        >
                                          <History className="w-3 h-3 text-sky-600" />
                                          <span>Ver Trilha</span>
                                        </button>

                                        {dest.etapas_executadas &&
                                        dest.etapas_executadas.length > 0 ? (
                                          <span className="text-[10px] text-gray-500">
                                            {dest.etapas_executadas.length} envio(s) realizado(s)
                                          </span>
                                        ) : dest.reenvio_1_data || dest.reenvio_2_data ? (
                                          <span className="text-[10px] text-gray-500">
                                            Reenvio executado
                                          </span>
                                        ) : (
                                          <span className="text-[10px] text-gray-400">
                                            1º disparo
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                )
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Visualização da Trilha de Origem e Desvios (Fase 2) */}
      <Dialog
        open={Boolean(destinatarioTrilhaModal)}
        onOpenChange={(open) => !open && setDestinatarioTrilhaModal(null)}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
              <GitFork className="w-5 h-5 text-emerald-600" />
              <span>Trilha de Follow-up do Destinatário</span>
            </DialogTitle>
            <DialogDescription>
              Acompanhe a origem, os fluxos pelos quais o cliente passou e as decisões de desvio por
              timeout ou resposta.
            </DialogDescription>
          </DialogHeader>

          {destinatarioTrilhaModal && (
            <div className="space-y-4 py-2 text-xs">
              {/* Card Resumo do Destinatário */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-gray-900 text-sm block">
                    {destinatarioTrilhaModal.nome}
                  </span>
                  <span className="text-gray-500 font-mono">
                    {destinatarioTrilhaModal.telefone}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="outline" className="text-[11px] font-semibold bg-white">
                    Status: {destinatarioTrilhaModal.status}
                  </Badge>
                  {destinatarioTrilhaModal.origem_entrada === 'automatica_por_estagio' && (
                    <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 text-[10px] font-bold">
                      Origem: Entrada Automática por Estágio
                      {destinatarioTrilhaModal.estagio_origem
                        ? ` (${destinatarioTrilhaModal.estagio_origem})`
                        : ''}
                    </Badge>
                  )}
                  {destinatarioTrilhaModal.origem_entrada === 'por_disparo' && (
                    <Badge className="bg-slate-100 text-slate-800 border-slate-300 text-[10px]">
                      Origem: Disparo em Lote
                    </Badge>
                  )}
                  {destinatarioTrilhaModal.marcacao_resposta && (
                    <Badge className="bg-sky-100 text-sky-900 border-sky-300 text-[10px]">
                      Marcação: {destinatarioTrilhaModal.marcacao_resposta}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Trilha de Origem e Desvios */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block">
                  Linha do Tempo de Fluxos & Desvios
                </span>

                {Array.isArray(destinatarioTrilhaModal.trilha) &&
                destinatarioTrilhaModal.trilha.length > 0 ? (
                  <div className="space-y-2 border-l-2 border-emerald-300 pl-3 ml-2">
                    {destinatarioTrilhaModal.trilha.map((item, tIdx) => (
                      <div key={tIdx} className="relative group">
                        <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-600 ring-2 ring-white" />
                        <div className="p-2.5 rounded-lg bg-white border border-gray-200 shadow-2xs space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-gray-900 flex items-center gap-1">
                              {item.fluxo_anterior_nome && (
                                <>
                                  <span className="text-gray-500">{item.fluxo_anterior_nome}</span>
                                  <ArrowRight className="w-3 h-3 text-emerald-600" />
                                </>
                              )}
                              <span className="text-emerald-800 font-bold">
                                {item.fluxo_nome || 'Fluxo'}
                              </span>
                            </span>
                            {item.data && (
                              <span className="text-[10px] text-gray-400">
                                {new Date(item.data).toLocaleString('pt-BR', {
                                  timeZone: 'America/Sao_Paulo',
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            )}
                          </div>
                          {item.motivo && (
                            <p className="text-[11px] text-gray-600 italic">{item.motivo}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-600">
                    <p className="font-semibold text-gray-800">Fluxo Direto:</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Destinatário segue o fluxo do lote desde o disparo inicial, sem desvios
                      executados até o momento.
                    </p>
                  </div>
                )}
              </div>

              {/* Histórico de Mensagens Enviadas na Régua */}
              <div className="space-y-2 pt-2 border-t border-gray-200">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block">
                  Etapas Enviadas
                </span>

                {destinatarioTrilhaModal.etapas_executadas &&
                destinatarioTrilhaModal.etapas_executadas.length > 0 ? (
                  <div className="space-y-1.5">
                    {destinatarioTrilhaModal.etapas_executadas.map((eExec, eIdx) => (
                      <div
                        key={eIdx}
                        className="p-2 rounded-lg bg-emerald-50/50 border border-emerald-200 flex items-center justify-between text-[11px]"
                      >
                        <span className="font-semibold text-emerald-950">
                          {eExec.nome || `Etapa #${eExec.ordem}`}
                        </span>
                        <span className="text-gray-500">
                          {new Date(eExec.enviado_em).toLocaleString('pt-BR', {
                            timeZone: 'America/Sao_Paulo',
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-400 italic">
                    Nenhum reenvio automático disparado ainda além da mensagem inicial.
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PainelAcompanhamentoDisparos
