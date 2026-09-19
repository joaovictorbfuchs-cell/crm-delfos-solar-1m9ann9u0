import React, { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Automacao, AutomacaoExecucao } from '@/types/automacoes'
import { fetchAutomacoesExecucoes } from '@/services/automacoesService'
import {
  History,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCw,
  User,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'
import { formatDateTime } from '@/lib/formatters'

interface ModalHistoricoAutomacaoProps {
  isOpen: boolean
  onClose: () => void
  automacao: Automacao | null
}

export const ModalHistoricoAutomacao: React.FC<ModalHistoricoAutomacaoProps> = ({
  isOpen,
  onClose,
  automacao,
}) => {
  const [execucoes, setExecucoes] = useState<AutomacaoExecucao[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  const carregarHistorico = useCallback(async () => {
    if (!automacao) return
    setLoading(true)
    try {
      const res = await fetchAutomacoesExecucoes(automacao.id, page, 20)
      setExecucoes(res.items)
      setTotalPages(res.totalPages)
      setTotalItems(res.totalItems)
    } catch (e) {
      console.error('Falha ao carregar execuções da automação:', e)
    } finally {
      setLoading(false)
    }
  }, [automacao, page])

  useEffect(() => {
    if (isOpen && automacao) {
      setPage(1)
      carregarHistorico()
    }
  }, [isOpen, automacao, carregarHistorico])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="pb-3 border-b">
          <div className="flex items-center justify-between pr-6">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-700">
                <History className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-gray-900">
                  Histórico de Execuções
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500">
                  {automacao?.nome} • {totalItems}{' '}
                  {totalItems === 1 ? 'disparo registrado' : 'disparos registrados'}
                </DialogDescription>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => carregarHistorico()}
              disabled={loading}
              className="gap-1.5 text-xs h-8"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {loading ? (
            <div className="py-12 text-center text-xs text-gray-500 flex flex-col items-center justify-center gap-2">
              <RotateCw className="w-5 h-5 animate-spin text-emerald-600" />
              Carregando registros de execuções...
            </div>
          ) : execucoes.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-500 bg-gray-50/60 rounded-xl border border-dashed border-gray-200">
              <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="font-semibold text-gray-700">
                Nenhuma execução registrada até o momento.
              </p>
              <p className="text-gray-400 mt-0.5">
                Esta automação ainda não foi disparada ou aguarda as condições de gatilho serem
                atendidas.
              </p>
            </div>
          ) : (
            execucoes.map((item) => {
              const dataFormatada = item.data_execucao
                ? formatDateTime(item.data_execucao)
                : 'Data desconhecida'

              const clienteNome = item.expand?.cliente?.nome || 'Cliente do evento'

              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl border bg-white shadow-2xs hover:border-gray-300 transition-all text-xs space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {item.sucesso ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-semibold gap-1 text-[11px] hover:bg-emerald-100">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Sucesso
                        </Badge>
                      ) : (
                        <Badge className="bg-rose-100 text-rose-800 border-rose-200 font-semibold gap-1 text-[11px] hover:bg-rose-100">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          Falha
                        </Badge>
                      )}

                      <span className="text-gray-500 text-[11px] font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        {dataFormatada}
                      </span>
                    </div>

                    {item.referencia_registro && (
                      <span
                        className="text-[10px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded truncate max-w-[200px]"
                        title={item.referencia_registro}
                      >
                        Ref: {item.referencia_registro}
                      </span>
                    )}
                  </div>

                  <div className="text-gray-800 font-medium leading-relaxed bg-gray-50/60 p-2.5 rounded-lg border border-gray-100">
                    {item.mensagem || 'Sem detalhes informados'}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-500 pt-0.5">
                    <div className="flex items-center gap-1.5 truncate">
                      <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="font-semibold text-gray-700 truncate">{clienteNome}</span>
                      {item.expand?.cliente?.telefone && (
                        <span className="text-gray-400">({item.expand.cliente.telefone})</span>
                      )}
                    </div>

                    {item.dados_execucao && (
                      <span className="text-[10px] text-gray-400">Disparo automático</span>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="pt-3 border-t flex items-center justify-between text-xs text-gray-500">
            <span>
              Página {page} de {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
