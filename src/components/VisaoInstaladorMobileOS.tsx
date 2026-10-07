import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Calendar,
  Clock,
  CheckCircle2,
  MapPin,
  Building,
  Navigation,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  RefreshCw,
  CheckSquare,
  Square,
  AlertCircle,
  FileCheck2,
} from 'lucide-react'
import { OrdemServico, OSChecklistItem } from '@/types/crm'
import { normalizeChecklist } from '@/components/CalendarioExecucaoOS'
import { updateOrdemServico, finalizarOrdemServico } from '@/services/crmService'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface VisaoInstaladorMobileOSProps {
  ordens: OrdemServico[]
  userId?: string
  userName?: string
  onOSUpdated: (os: OrdemServico) => void
  onSelectOS?: (os: OrdemServico) => void
  onRefresh?: () => void
}

export default function VisaoInstaladorMobileOS({
  ordens,
  userId,
  userName,
  onOSUpdated,
  onSelectOS,
  onRefresh,
}: VisaoInstaladorMobileOSProps) {
  const { toast } = useToast()

  // Checklist local por OS id para edição interativa no celular
  const [localChecklists, setLocalChecklists] = useState<Record<string, OSChecklistItem[]>>({})
  // Controle de carregamento/salvamento por OS
  const [salvandoOSId, setSalvandoOSId] = useState<string | null>(null)
  // Cards expandidos para ver detalhes/checklist
  const [expandedOSIds, setExpandedOSIds] = useState<Record<string, boolean>>({})

  // Catálogo de tipos de atividades custom (para carregar checklist dinâmico de tipos_atividades_custom)
  const [catalogoTipos, setCatalogoTipos] = useState<any[]>([])

  useEffect(() => {
    let cancelado = false
    import('@/services/crmService')
      .then(({ fetchTiposAtividadesCustom }) => fetchTiposAtividadesCustom())
      .then((tipos) => {
        if (!cancelado && Array.isArray(tipos)) {
          setCatalogoTipos(tipos)
        }
      })
      .catch((err) => console.warn('Erro ao carregar catálogo para instalador:', err))
    return () => {
      cancelado = true
    }
  }, [])

  // Inicializa checklists das ordens se ainda não carregados
  useEffect(() => {
    setLocalChecklists((prev) => {
      const next = { ...prev }
      let mudou = false

      for (const os of ordens) {
        if (!os || !os.id) continue
        if (next[os.id]) continue // já existe local

        const checklistExistente = normalizeChecklist(os.checklist)
        if (checklistExistente.length > 0) {
          next[os.id] = checklistExistente
          mudou = true
        } else {
          // Busca checklist do tipo em tipos_atividades_custom
          const tipoNome = String(os.tipo_servico || '')
            .toLowerCase()
            .trim()
          const match = catalogoTipos.find((t) => {
            const n = String(t?.nome || '')
              .toLowerCase()
              .trim()
            return (
              n === tipoNome ||
              n.includes(tipoNome) ||
              tipoNome.includes(n) ||
              (tipoNome.includes('limpeza') && n.includes('lavagem')) ||
              (tipoNome.includes('manuten') && n.includes('manuten'))
            )
          })

          if (match?.checklist && Array.isArray(match.checklist) && match.checklist.length > 0) {
            next[os.id] = match.checklist.map((item: any, idx: number) => ({
              id: item.id || `chk_${idx + 1}`,
              item: item.texto || item.item || `Item ${idx + 1}`,
              concluido: Boolean(item.concluido),
            }))
            mudou = true
          } else {
            // Checklist padrão de campo solar
            next[os.id] = [
              { id: 'c1', item: 'Inspeção visual dos módulos fotovoltaicos', concluido: false },
              { id: 'c2', item: 'Verificação dos conectores e cabeamento CC', concluido: false },
              { id: 'c3', item: 'Execução do procedimento técnico no local', concluido: false },
              { id: 'c4', item: 'Testes elétricos e conferência de geração', concluido: false },
            ]
            mudou = true
          }
        }
      }

      return mudou ? next : prev
    })
  }, [ordens, catalogoTipos])

  // Normalização de data para "Hoje"
  const hojeYMD = useMemo(() => {
    const d = new Date()
    const ano = d.getFullYear()
    const mes = String(d.getMonth() + 1).padStart(2, '0')
    const dia = String(d.getDate()).padStart(2, '0')
    return `${ano}-${mes}-${dia}`
  }, [])

  // Filtra APENAS atividades do instalador (responsavel_usuario_id ou atribuida_a)
  // e ordenadas por horário (horario_inicio ou data_agendada)
  const atividadesDoInstalador = useMemo(() => {
    const safeUserName = String(userName || '')
      .toLowerCase()
      .trim()
    const safeUserId = String(userId || '').trim()

    const doInstalador = ordens.filter((os) => {
      if (!os) return false
      // Se não houver ID e Nome informados, exibe todas passadas (já filtradas no backend/pai)
      if (!safeUserId && !safeUserName) return true

      const osRespId = String(os.responsavel_usuario_id || '').trim()
      const osAtribuida = String(os.atribuida_a || '')
        .toLowerCase()
        .trim()

      if (safeUserId && osRespId === safeUserId) return true
      if (safeUserName && osAtribuida.includes(safeUserName)) return true

      return false
    })

    // Ordenar por horário
    return doInstalador.sort((a, b) => {
      // Prioridade 1: pendentes primeiro, concluídas depois
      const aConcl = a.status === 'concluida' ? 1 : 0
      const bConcl = b.status === 'concluida' ? 1 : 0
      if (aConcl !== bConcl) return aConcl - bConcl

      // Prioridade 2: horário de início
      const horaA = String(a.horario_inicio || a.data_agendada?.slice(11, 16) || '99:99')
      const horaB = String(b.horario_inicio || b.data_agendada?.slice(11, 16) || '99:99')
      return horaA.localeCompare(horaB)
    })
  }, [ordens, userId, userName])

  // Toggle item do checklist
  const handleToggleChecklist = async (osId: string, itemId: string) => {
    const listAtual = localChecklists[osId] || []
    const updatedList = listAtual.map((item) =>
      item.id === itemId ? { ...item, concluido: !item.concluido } : item,
    )

    setLocalChecklists((prev) => ({
      ...prev,
      [osId]: updatedList,
    }))

    // Salva automaticamente no backend de forma transparente
    try {
      const updated = await updateOrdemServico(osId, { checklist: updatedList })
      onOSUpdated(updated)
    } catch (err) {
      console.warn('Erro ao salvar checklist no servidor:', err)
    }
  }

  // Atualizar status para Em Andamento
  const handleIniciarAtividade = async (os: OrdemServico) => {
    setSalvandoOSId(os.id)
    try {
      const horaAgora = new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })
      const carimbo = `[Início em campo: ${horaAgora}]\n`
      const novosDetalhes = os.detalhes_execucao
        ? `${carimbo}${os.detalhes_execucao}`
        : `${carimbo}Atendimento iniciado no local.`

      // Marca o 1º item da checklist como concluído se existir
      const listAtual = localChecklists[os.id] || normalizeChecklist(os.checklist)
      const listAtualizada = listAtual.map((item, idx) =>
        idx === 0 ? { ...item, concluido: true } : item,
      )

      const updated = await updateOrdemServico(os.id, {
        detalhes_execucao: novosDetalhes,
        checklist: listAtualizada,
      })

      setLocalChecklists((prev) => ({ ...prev, [os.id]: listAtualizada }))
      onOSUpdated(updated)
      toast({
        title: 'Atividade iniciada! ⏱️',
        description: `Horário registrado às ${horaAgora}.`,
      })
    } catch (err) {
      console.error('Erro ao iniciar atividade:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao iniciar',
        description: 'Tente novamente.',
      })
    } finally {
      setSalvandoOSId(null)
    }
  }

  // Concluir Atividade diretamente pelo card
  const handleConcluirAtividade = async (os: OrdemServico) => {
    setSalvandoOSId(os.id)
    try {
      const listFinal = localChecklists[os.id] || normalizeChecklist(os.checklist)
      // Marca todos os itens da checklist como concluídos se o usuário clicou em concluir
      const listTudoConcluido = listFinal.map((item) => ({ ...item, concluido: true }))

      const finalized = await finalizarOrdemServico(os.id, {
        checklist: listTudoConcluido,
        detalhes_execucao:
          os.detalhes_execucao ||
          `Atividade concluída com sucesso em campo às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`,
        cliente_id: os.cliente_id,
        tipo_servico: os.tipo_servico,
        tecnico_nome: userName || os.atribuida_a,
        origem: os.origem,
      })

      setLocalChecklists((prev) => ({ ...prev, [os.id]: listTudoConcluido }))
      onOSUpdated(finalized)
      toast({
        title: 'Atividade Concluída! 🎉',
        description: 'Atividade finalizada e sincronizada com sucesso.',
      })
    } catch (err) {
      console.error('Erro ao concluir atividade:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao concluir atividade',
        description: 'Não foi possível salvar a conclusão. Tente novamente.',
      })
    } finally {
      setSalvandoOSId(null)
    }
  }

  // Reabrir atividade caso precise
  const handleReabrirAtividade = async (os: OrdemServico) => {
    setSalvandoOSId(os.id)
    try {
      const updated = await updateOrdemServico(os.id, {
        status: 'pendente',
        concluida_em: null as unknown as string,
      })
      onOSUpdated(updated)
      toast({
        title: 'Atividade Reaberta 🔄',
        description: 'Status retornado para Pendente.',
      })
    } catch (err) {
      console.error('Erro ao reabrir atividade:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao reabrir',
        description: 'Tente novamente.',
      })
    } finally {
      setSalvandoOSId(null)
    }
  }

  // Traçar rota GPS usina ou endereço
  const handleTraçarRota = (os: OrdemServico, e: React.MouseEvent) => {
    e.stopPropagation()
    const SEDE_DELFOS = 'Rua Espírito Santo, 275, Erechim - RS, CEP 99709296'
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

    const endereco = os.endereco || usina?.endereco || cli?.usina_endereco || cli?.endereco || ''
    const cidade = usina?.cidade || cli?.cidade || ''
    const dest = [endereco, cidade].filter(Boolean).join(' - ')

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
      title: 'Endereço não cadastrado',
      description: 'Esta atividade não possui coordenadas nem endereço cadastrado.',
    })
  }

  const toggleExpandCard = (osId: string) => {
    setExpandedOSIds((prev) => ({ ...prev, [osId]: !prev[osId] }))
  }

  const pendentesCount = atividadesDoInstalador.filter((o) => o.status !== 'concluida').length
  const concluidasCount = atividadesDoInstalador.filter((o) => o.status === 'concluida').length

  return (
    <div className="space-y-3 pb-20 px-1 max-w-xl mx-auto">
      {/* Cabeçalho do Dia com data e resumo */}
      <div className="bg-[#0F2038] text-white rounded-2xl p-4 shadow-sm border border-slate-700/80">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-base font-extrabold text-white tracking-tight">
              Minhas Atividades de Hoje
            </h2>
          </div>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-slate-200 transition-all cursor-pointer"
              title="Atualizar atividades"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-slate-300 pt-1 border-t border-slate-700/60">
          <div className="flex items-center gap-1.5 font-medium">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {new Date().toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: '2-digit',
                month: 'short',
              })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-md font-bold">
              {pendentesCount} pendente{pendentesCount !== 1 ? 's' : ''}
            </span>
            <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md font-bold">
              {concluidasCount} concluída{concluidasCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Lista de Atividades */}
      {atividadesDoInstalador.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center flex flex-col items-center justify-center shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-gray-900 mb-1">Nenhuma atividade agendada</h3>
          <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
            Você não possui ordens de serviço pendentes para hoje. Quando novas atividades forem
            atribuídas a você, elas aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {atividadesDoInstalador.map((os) => {
            const isConcluida = os.status === 'concluida'
            const isSalvando = salvandoOSId === os.id
            const isExpanded = expandedOSIds[os.id] ?? !isConcluida // pendente expandido por padrão
            const checklist = localChecklists[os.id] || normalizeChecklist(os.checklist)
            const concluidosCount = checklist.filter((c) => c.concluido).length
            const totalCount = checklist.length
            const clienteNome =
              os.expand?.cliente_id?.nome || os.expand?.cliente_id?.razao_social || 'Cliente Solar'
            const usinaNome = os.expand?.usina_id?.nome || ''
            const endereco =
              os.endereco ||
              os.expand?.usina_id?.endereco ||
              os.expand?.cliente_id?.usina_endereco ||
              os.expand?.cliente_id?.endereco ||
              'Endereço não informado'
            const horario =
              os.horario_inicio ||
              (os.data_agendada && os.data_agendada.length >= 16
                ? os.data_agendada.slice(11, 16)
                : 'A definir')

            return (
              <div
                key={os.id}
                className={`bg-white rounded-2xl border transition-all shadow-2xs overflow-hidden ${
                  isConcluida
                    ? 'border-gray-200 bg-gray-50/60 opacity-90'
                    : 'border-emerald-300/80 hover:border-emerald-500'
                }`}
              >
                {/* Cabeçalho do Card */}
                <div
                  onClick={() => toggleExpandCard(os.id)}
                  className="p-3.5 cursor-pointer active:bg-gray-50/80 transition-colors select-none"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge
                        className={`text-[10px] font-bold px-2 py-0.5 border ${
                          isConcluida
                            ? 'bg-gray-100 text-gray-700 border-gray-300'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        }`}
                      >
                        {os.tipo_servico || 'Manutenção'}
                      </Badge>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
                        <Clock className="w-3 h-3 text-emerald-600 shrink-0" />
                        {horario}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {isConcluida ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          Concluída
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                          <Clock className="w-3 h-3" />
                          Pendente
                        </span>
                      )}
                      <button
                        type="button"
                        aria-label="Expandir ou recolher card"
                        className="text-gray-400 p-0.5"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Nome do Cliente e Usina */}
                  <h3 className="text-sm font-bold text-gray-900 leading-tight mb-1">
                    {clienteNome}
                  </h3>
                  {usinaNome && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1">
                      <Building className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate font-medium">{usinaNome}</span>
                    </div>
                  )}

                  {/* Endereço */}
                  <div className="flex items-start gap-1.5 text-xs text-gray-600">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="line-clamp-2 leading-relaxed">{endereco}</span>
                  </div>

                  {/* Barra rápida de status do checklist se recolhido */}
                  {!isExpanded && totalCount > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                      <span>
                        Checklist:{' '}
                        <strong>
                          {concluidosCount}/{totalCount}
                        </strong>{' '}
                        concluídos
                      </span>
                      <span className="text-emerald-700 font-bold">Toque para ver checklist</span>
                    </div>
                  )}
                </div>

                {/* Conteúdo Expandido (Checklist Dinâmico + Ações) */}
                {isExpanded && (
                  <div className="px-3.5 pb-3.5 pt-1 border-t border-gray-100 space-y-3 bg-white">
                    {/* Botão Traçar Rota GPS */}
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleTraçarRota(os, e)}
                        className="w-full h-8 px-2.5 text-xs font-bold text-[#0F2038] bg-amber-400 hover:bg-amber-300 border-amber-500/30 flex items-center justify-center gap-1.5 rounded-xl shadow-2xs cursor-pointer"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Traçar Rota no GPS (Waze / Maps)</span>
                      </Button>
                    </div>

                    {/* Instruções se houver */}
                    {os.instrucoes && (
                      <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-2.5 text-xs text-amber-950">
                        <span className="font-bold block mb-0.5 text-amber-900">
                          Instruções Técnicas:
                        </span>
                        <p className="whitespace-pre-line text-[11px] leading-relaxed">
                          {os.instrucoes}
                        </p>
                      </div>
                    )}

                    {/* Bloco de Checklist Dinâmico */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-gray-900 flex items-center gap-1">
                          <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                          Checklist de Campo ({concluidosCount}/{totalCount})
                        </span>
                        {totalCount > 0 && (
                          <span className="text-[11px] font-bold text-gray-500">
                            {Math.round((concluidosCount / totalCount) * 100)}%
                          </span>
                        )}
                      </div>

                      {/* Itens do Checklist */}
                      <div className="space-y-1 bg-gray-50/80 p-2 rounded-xl border border-gray-200/80">
                        {checklist.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleToggleChecklist(os.id, item.id)}
                            className={`w-full text-left p-2 rounded-lg flex items-start gap-2.5 transition-colors cursor-pointer ${
                              item.concluido
                                ? 'bg-emerald-50 text-emerald-950 border border-emerald-200/80'
                                : 'bg-white hover:bg-gray-100 text-gray-800 border border-gray-200/60'
                            }`}
                          >
                            <span className="shrink-0 mt-0.5">
                              {item.concluido ? (
                                <CheckSquare className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Square className="w-4 h-4 text-gray-400" />
                              )}
                            </span>
                            <span
                              className={`text-xs leading-snug ${
                                item.concluido
                                  ? 'line-through text-gray-500 font-medium'
                                  : 'font-semibold'
                              }`}
                            >
                              {item.item}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Barra de Ações do Instalador */}
                    <div className="pt-2 flex items-center gap-2 flex-wrap">
                      {!isConcluida ? (
                        <>
                          <Button
                            type="button"
                            disabled={isSalvando}
                            onClick={() => handleConcluirAtividade(os)}
                            className="flex-1 h-9 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-xs rounded-xl shadow-xs transition-transform active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <FileCheck2 className="w-4 h-4" />
                            <span>{isSalvando ? 'Salvando...' : 'Concluir Atividade'}</span>
                          </Button>

                          {onSelectOS && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => onSelectOS(os)}
                              className="h-9 px-3 text-xs font-semibold text-gray-700 border-gray-300 rounded-xl"
                            >
                              Ver Ficha
                            </Button>
                          )}
                        </>
                      ) : (
                        <div className="w-full flex items-center justify-between gap-2">
                          <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" />
                            Finalizada
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={isSalvando}
                              onClick={() => handleReabrirAtividade(os)}
                              className="h-8 px-2.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                            >
                              <RotateCcw className="w-3.5 h-3.5 mr-1" />
                              Reabrir
                            </Button>
                            {onSelectOS && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => onSelectOS(os)}
                                className="h-8 px-2.5 text-xs font-semibold rounded-lg"
                              >
                                Ver Ficha
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
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
