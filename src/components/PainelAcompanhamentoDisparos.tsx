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
  fetchDisparosMassa,
  updateStatusDisparoMassa,
  toggleReenvioLote,
  dispararVerificacaoReenviosBackend,
} from '@/services/disparosMassaService'

interface PainelAcompanhamentoDisparosProps {
  onAbrirNovoDisparo?: () => void
}

export const PainelAcompanhamentoDisparos: React.FC<PainelAcompanhamentoDisparosProps> = ({
  onAbrirNovoDisparo,
}) => {
  const { toast } = useToast()
  const [lotes, setLotes] = useState<DisparoMassaRegistro[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isVerificando, setIsVerificando] = useState(false)
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'ativo' | 'concluido' | 'cancelado'>(
    'todos',
  )
  const [buscaLote, setBuscaLote] = useState('')
  const [loteExpandidoId, setLoteExpandidoId] = useState<string | null>(null)
  const [filtroDestinatario, setFiltroDestinatario] = useState<string>('todos')

  const carregarLotes = async () => {
    setIsLoading(true)
    try {
      const records = await fetchDisparosMassa()
      setLotes(records)
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
        variant: 'destructive',
      })
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
                    {/* Linha dos Textos do 1º e 2º Reenvio Configurados */}
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

                      <div className="p-3 rounded-xl bg-white border border-amber-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-900 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>1º Reenvio (+3 dias sem resposta)</span>
                          </span>
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded">
                            {stats.reenvios_1_enviados || 0} enviado(s)
                          </span>
                        </div>
                        <p className="text-gray-600 italic whitespace-pre-wrap line-clamp-3 bg-amber-50/50 p-2 rounded-lg border border-amber-100 text-[11px]">
                          "{lote.texto_reenvio_1 || 'Sem texto de reenvio configurado'}"
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-white border border-purple-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-purple-900 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-purple-600" />
                            <span>2º Reenvio (+90 dias do 1º)</span>
                          </span>
                          <span className="text-[10px] font-bold text-purple-800 bg-purple-50 px-1.5 py-0.5 rounded">
                            {stats.reenvios_2_enviados || 0} enviado(s)
                          </span>
                        </div>
                        <p className="text-gray-600 italic whitespace-pre-wrap line-clamp-3 bg-purple-50/50 p-2 rounded-lg border border-purple-100 text-[11px]">
                          "{lote.texto_reenvio_2 || 'Sem texto de 2º reenvio configurado'}"
                        </p>
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
                              <th className="py-2 px-3">Status na Automação</th>
                              <th className="py-2 px-3">1º Reenvio (+3d)</th>
                              <th className="py-2 px-3">2º Reenvio (+90d)</th>
                              <th className="py-2 px-3">Desfecho / Motivo</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-[11px]">
                            {destsFiltrados.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="py-4 text-center text-gray-400">
                                  Nenhum destinatário com o status selecionado.
                                </td>
                              </tr>
                            ) : (
                              destsFiltrados.map((dest, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="py-2 px-3 font-semibold text-gray-900">
                                    {dest.nome || 'Cliente sem nome'}
                                  </td>
                                  <td className="py-2 px-3 font-mono text-gray-600">
                                    {dest.telefone || '—'}
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
                                    ) : dest.status === 'finalizado' ? (
                                      <span className="inline-flex items-center gap-1 font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
                                        <span>Finalizado</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                                        <Clock className="w-3 h-3" />
                                        <span>Aguardando (+3d)</span>
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-gray-600">
                                    {dest.reenvio_1_data
                                      ? new Date(dest.reenvio_1_data).toLocaleString('pt-BR', {
                                          timeZone: 'America/Sao_Paulo',
                                          day: '2-digit',
                                          month: '2-digit',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })
                                      : '—'}
                                  </td>
                                  <td className="py-2 px-3 text-gray-600">
                                    {dest.reenvio_2_data
                                      ? new Date(dest.reenvio_2_data).toLocaleString('pt-BR', {
                                          timeZone: 'America/Sao_Paulo',
                                          day: '2-digit',
                                          month: '2-digit',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })
                                      : '—'}
                                  </td>
                                  <td className="py-2 px-3 text-gray-500">
                                    {dest.motivo_saida ||
                                      (dest.status === 'respondido'
                                        ? 'Cliente respondeu à mensagem'
                                        : dest.status === 'atendido'
                                          ? 'Atendido na Central'
                                          : 'Em acompanhamento automático')}
                                  </td>
                                </tr>
                              ))
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
    </div>
  )
}

export default PainelAcompanhamentoDisparos
