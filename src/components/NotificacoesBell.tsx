import { useState, useMemo } from 'react'
import {
  Bell,
  Clock,
  Calendar,
  AlertTriangle,
  User,
  CheckCircle2,
  ExternalLink,
  Check,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useClientes } from '@/contexts/ClientesContext'
import { formatarDataHora } from '@/lib/formatters'
import { notificacoesService } from '@/services/notificacoesService'

export function NotificacoesBell() {
  const {
    notificacoes,
    marcarNotificacaoComoLida,
    marcarTodasNotificacoesComoLidas,
    refreshNotificacoes,
    openFichaCliente,
  } = useClientes()

  const [open, setOpen] = useState(false)
  const [sincronizando, setSincronizando] = useState(false)

  // Apenas notificações ativas
  const notificacoesAtivas = useMemo(() => {
    return (notificacoes || []).filter((n) => n.status === 'ativa')
  }, [notificacoes])

  // Contagem de não lidas
  const naoLidasCount = useMemo(() => {
    return notificacoesAtivas.filter((n) => !n.lida).length
  }, [notificacoesAtivas])

  // Separar não lidas e lidas
  const naoLidas = useMemo(() => notificacoesAtivas.filter((n) => !n.lida), [notificacoesAtivas])
  const lidas = useMemo(() => notificacoesAtivas.filter((n) => n.lida), [notificacoesAtivas])

  const handleMarcarTodas = async () => {
    await marcarTodasNotificacoesComoLidas()
  }

  const handleSincronizarManual = async () => {
    try {
      setSincronizando(true)
      await notificacoesService.sincronizar()
      await refreshNotificacoes()
    } finally {
      setSincronizando(false)
    }
  }

  const handleClickItem = async (notif: (typeof notificacoes)[0]) => {
    // 1. Marca como lida se ainda não estiver
    if (!notif.lida) {
      await marcarNotificacaoComoLida(notif.id)
    }
    // 2. Abre a ficha do cliente se houver cliente_id vinculado
    if (notif.cliente_id) {
      openFichaCliente(notif.cliente_id, 'historico')
      setOpen(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          title="Notificações internas"
        >
          <Bell className="h-5 w-5" />
          {naoLidasCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-gray-900 animate-in zoom-in"
              aria-label={`${naoLidasCount} notificações não lidas`}
            >
              {naoLidasCount > 99 ? '99+' : naoLidasCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-96 p-0 shadow-lg border border-gray-200 dark:border-gray-800"
        sideOffset={8}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b px-4 py-3 bg-gray-50/70 dark:bg-gray-900/50">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notificações</h4>
            {naoLidasCount > 0 ? (
              <Badge variant="destructive" className="h-5 px-1.5 text-[11px] font-semibold">
                {naoLidasCount} {naoLidasCount === 1 ? 'nova' : 'novas'}
              </Badge>
            ) : (
              <Badge variant="secondary" className="h-5 px-1.5 text-[11px]">
                0 novas
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-500 hover:text-gray-800 dark:text-gray-400"
              onClick={handleSincronizarManual}
              disabled={sincronizando}
              title="Verificar atividades atrasadas agora"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${sincronizando ? 'animate-spin' : ''}`} />
            </Button>

            {naoLidasCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 font-medium"
                onClick={handleMarcarTodas}
              >
                Ler todas
              </Button>
            )}
          </div>
        </div>

        {/* Lista de Notificações */}
        <ScrollArea className="max-h-[380px]">
          {notificacoesAtivas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center text-gray-500">
              <CheckCircle2 className="h-10 w-10 text-emerald-500/80 mb-2" />
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Tudo em dia!</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-[240px]">
                Nenhuma atividade atrasada ou notificação pendente no momento.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {/* Seção Não Lidas */}
              {naoLidas.length > 0 && (
                <div>
                  <div className="px-4 py-1.5 text-[11px] font-semibold tracking-wider uppercase text-gray-400 bg-gray-50/40 dark:bg-gray-900/30">
                    Não lidas ({naoLidas.length})
                  </div>
                  {naoLidas.map((item) => (
                    <div
                      key={item.id}
                      className="group relative flex flex-col gap-1 p-3.5 bg-red-50/40 dark:bg-red-950/20 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                      onClick={() => handleClickItem(item)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                              {item.titulo}
                            </p>
                            {item.cliente_nome && (
                              <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-0.5 flex items-center gap-1 font-medium">
                                <User className="h-3 w-3 text-gray-400" />
                                {item.cliente_nome}
                              </p>
                            )}
                          </div>
                        </div>

                        {item.dias_atraso !== undefined && item.dias_atraso > 0 && (
                          <Badge
                            variant="destructive"
                            className="shrink-0 text-[10px] font-bold px-1.5 py-0 h-5 bg-red-600 text-white"
                          >
                            {item.dias_atraso} {item.dias_atraso === 1 ? 'dia' : 'dias'} de atraso
                          </Badge>
                        )}
                      </div>

                      {item.mensagem && (
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 pl-6 leading-relaxed">
                          {item.mensagem}
                        </p>
                      )}

                      <div className="flex items-center justify-between pl-6 mt-1 text-[10px] text-gray-400">
                        <div className="flex items-center gap-2">
                          {item.data_prevista && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Prevista: {formatarDataHora(item.data_prevista).split(' ')[0]}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {item.created ? formatarDataHora(item.created).split(' ')[0] : 'Hoje'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-gray-400 hover:text-emerald-600"
                            title="Marcar como lida"
                            onClick={(e) => {
                              e.stopPropagation()
                              marcarNotificacaoComoLida(item.id)
                            }}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          {item.cliente_id && (
                            <span
                              className="text-emerald-600 hover:underline inline-flex items-center gap-0.5 text-[11px] font-medium"
                              title="Abrir ficha do cliente"
                            >
                              Ver cliente
                              <ExternalLink className="h-2.5 w-2.5" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Seção Já Lidas */}
              {lidas.length > 0 && (
                <div>
                  {naoLidas.length > 0 && <Separator />}
                  <div className="px-4 py-1.5 text-[11px] font-semibold tracking-wider uppercase text-gray-400 bg-gray-50/40 dark:bg-gray-900/30">
                    Lidas ({lidas.length})
                  </div>
                  {lidas.map((item) => (
                    <div
                      key={item.id}
                      className="group flex flex-col gap-1 p-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer opacity-75 hover:opacity-100"
                      onClick={() => handleClickItem(item)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <Clock className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-gray-800 dark:text-gray-200 leading-tight">
                              {item.titulo}
                            </p>
                            {item.cliente_nome && (
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                                <User className="h-3 w-3 text-gray-400" />
                                {item.cliente_nome}
                              </p>
                            )}
                          </div>
                        </div>

                        {item.dias_atraso !== undefined && item.dias_atraso > 0 && (
                          <Badge
                            variant="outline"
                            className="shrink-0 text-[10px] text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700/50 h-5"
                          >
                            {item.dias_atraso}d atraso
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between pl-6 mt-1 text-[10px] text-gray-400">
                        {item.data_prevista && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Prevista: {formatarDataHora(item.data_prevista).split(' ')[0]}
                          </span>
                        )}
                        {item.cliente_id && (
                          <span className="text-gray-500 hover:text-emerald-600 inline-flex items-center gap-0.5 text-[11px]">
                            Ver cliente
                            <ExternalLink className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Rodapé informativo */}
        <div className="border-t px-4 py-2 bg-gray-50/70 dark:bg-gray-900/50 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
          <span>Varredura automática ativa</span>
          <span className="text-[10px] text-gray-400">Delfos Solar CRM</span>
        </div>
      </PopoverContent>
    </Popover>
  )
}
export default NotificacoesBell
