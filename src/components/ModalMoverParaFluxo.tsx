import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  GitFork,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  ArrowRight,
  Send,
  Zap,
} from 'lucide-react'
import { fetchFluxosFollowUp, type FluxoFollowUp } from '@/services/fluxosFollowUpService'
import {
  moverDestinatariosParaFluxo,
  type DestinatarioLoteMassa,
  type DisparoMassaRegistro,
} from '@/services/disparosMassaService'
import { useToast } from '@/hooks/use-toast'

export interface ModalMoverParaFluxoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  destinatarios: DestinatarioLoteMassa[]
  lotesExistentes?: DisparoMassaRegistro[]
  onSucesso?: () => void
}

export const ModalMoverParaFluxo: React.FC<ModalMoverParaFluxoProps> = ({
  open,
  onOpenChange,
  destinatarios,
  lotesExistentes = [],
  onSucesso,
}) => {
  const { toast } = useToast()
  const [fluxos, setFluxos] = useState<FluxoFollowUp[]>([])
  const [fluxoSelecionadoId, setFluxoSelecionadoId] = useState<string>('')
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)

  // Carregar fluxos ativos quando o modal abre
  useEffect(() => {
    if (open) {
      setCarregando(true)
      fetchFluxosFollowUp(true)
        .then((lista) => {
          setFluxos(lista)
          if (lista.length > 0 && !fluxoSelecionadoId) {
            // Seleciona preferencialmente o padrão ou o primeiro
            const padrao = lista.find((f) => f.is_padrao) || lista[0]
            setFluxoSelecionadoId(padrao.id)
          }
        })
        .catch((err) => {
          console.error('Erro ao carregar fluxos ativos:', err)
          toast({
            title: 'Erro ao carregar fluxos',
            description: 'Não foi possível buscar os fluxos de follow-up ativos.',
            variant: 'destructive',
          })
        })
        .finally(() => setCarregando(false))
    }
  }, [open, toast])

  const fluxoSelecionado = fluxos.find((f) => f.id === fluxoSelecionadoId) || null
  const etapasAtivas = (fluxoSelecionado?.etapas || []).filter((e) => e.ativa !== false)
  const primeiraEtapa = etapasAtivas.length > 0 ? etapasAtivas[0] : null
  const isPrimeiraImediata = primeiraEtapa ? primeiraEtapa.dias_apos === 0 : false

  // Checagem de clientes já ativos no fluxo selecionado
  const clientesJaAtivos = destinatarios.filter((d) => {
    if (!fluxoSelecionadoId) return false
    return lotesExistentes.some((lote) => {
      if (lote.fluxo_id !== fluxoSelecionadoId || lote.status !== 'ativo') return false
      const dests = Array.isArray(lote.destinatarios) ? lote.destinatarios : []
      return dests.some(
        (destLote) =>
          destLote.cliente_id === d.cliente_id &&
          destLote.status !== 'finalizado' &&
          destLote.status !== 'arquivado' &&
          destLote.status !== 'respondido' &&
          destLote.status !== 'atendido' &&
          destLote.status !== 'nao_perturbe' &&
          destLote.status !== 'bloqueado' &&
          destLote.status !== 'sem_whatsapp',
      )
    })
  })

  const todosJaAtivos = destinatarios.length > 0 && clientesJaAtivos.length === destinatarios.length

  const handleConfirmar = async () => {
    if (!fluxoSelecionadoId) {
      toast({
        title: 'Selecione um fluxo',
        description: 'Por favor, selecione o fluxo de destino para mover o cliente.',
        variant: 'destructive',
      })
      return
    }

    if (destinatarios.length === 0) {
      toast({
        title: 'Nenhum destinatário selecionado',
        description: 'Selecione ao menos um cliente para mover.',
        variant: 'destructive',
      })
      return
    }

    setSalvando(true)
    try {
      const clienteIds = destinatarios.map((d) => d.cliente_id).filter(Boolean)
      const res = await moverDestinatariosParaFluxo(clienteIds, fluxoSelecionadoId)

      if (res.sucessoCount > 0) {
        toast({
          title: 'Cliente(s) movido(s) para o fluxo',
          description: `${res.sucessoCount} cliente(s) inscrito(s) no fluxo "${fluxoSelecionado?.nome}".${
            isPrimeiraImediata ? ' A 1ª mensagem imediata já foi agendada para envio.' : ''
          }`,
        })
        onOpenChange(false)
        if (onSucesso) onSucesso()
      } else if (res.jaAtivoCount > 0) {
        toast({
          title: 'Cliente já está neste fluxo',
          description:
            res.resultados[0]?.motivo ||
            'O cliente selecionado já possui acompanhamento ativo neste mesmo fluxo.',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Falha ao mover',
          description:
            res.resultados[0]?.motivo || 'Não foi possível inscrever o cliente no fluxo.',
          variant: 'destructive',
        })
      }
    } catch (err: unknown) {
      console.error('Erro ao mover destinatário para fluxo:', err)
      const errMsg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: unknown }).message)
          : 'Erro ao conectar ao servidor'
      toast({
        title: 'Erro ao mover para fluxo',
        description: errMsg,
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
            <GitFork className="w-5 h-5 text-sky-600" />
            <span>Mover para Fluxo de Follow-up</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500">
            Inscreva o cliente em um novo fluxo de acompanhamento a partir da 1ª etapa ativa, sem
            precisar criar um disparo em massa do zero.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Destinatário(s) selecionado(s) */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-bold text-gray-700 block mb-1">
              {destinatarios.length === 1
                ? 'Destinatário selecionado:'
                : `Destinatários selecionados (${destinatarios.length}):`}
            </span>
            {destinatarios.length === 1 ? (
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900">{destinatarios[0].nome}</span>
                <span className="font-mono text-gray-500 text-[11px]">
                  {destinatarios[0].telefone}
                </span>
              </div>
            ) : (
              <div className="max-h-24 overflow-y-auto space-y-1">
                {destinatarios.map((d, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px]">
                    <span className="font-medium text-gray-800 truncate max-w-[200px]">
                      {d.nome}
                    </span>
                    <span className="font-mono text-gray-500">{d.telefone}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lista de Fluxos Ativos */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-800 flex items-center justify-between">
              <span>Selecione o fluxo de destino:</span>
              <span className="text-[11px] font-normal text-gray-500">
                {fluxos.length} fluxo(s) ativo(s)
              </span>
            </label>

            {carregando ? (
              <div className="py-6 text-center text-gray-400">
                <span>Carregando fluxos ativos...</span>
              </div>
            ) : fluxos.length === 0 ? (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
                <span>Nenhum fluxo de follow-up ativo encontrado no sistema.</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
                {fluxos.map((fluxo) => {
                  const isSelected = fluxoSelecionadoId === fluxo.id
                  const qtdEtapas = (fluxo.etapas || []).filter((e) => e.ativa !== false).length
                  const jaAtivo =
                    destinatarios.length === 1 &&
                    clientesJaAtivos.some((c) => c.cliente_id === destinatarios[0].cliente_id)

                  return (
                    <div
                      key={fluxo.id}
                      onClick={() => setFluxoSelecionadoId(fluxo.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-sky-500 bg-sky-50/70 shadow-2xs'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="fluxo_destino"
                            checked={isSelected}
                            onChange={() => setFluxoSelecionadoId(fluxo.id)}
                            className="text-sky-600 focus:ring-sky-500"
                          />
                          <span className="font-bold text-gray-900">{fluxo.nome}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {fluxo.is_padrao && (
                            <Badge className="bg-sky-100 text-sky-800 border-sky-300 text-[10px] font-semibold">
                              Padrão
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className="text-[10px] font-medium text-gray-600 bg-white"
                          >
                            {qtdEtapas} {qtdEtapas === 1 ? 'etapa' : 'etapas'}
                          </Badge>
                        </div>
                      </div>

                      {fluxo.descricao && (
                        <p className="text-[11px] text-gray-500 mt-1 pl-5 line-clamp-2">
                          {fluxo.descricao}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Detalhes da 1ª etapa do fluxo selecionado */}
          {fluxoSelecionado && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-[11px] font-bold text-gray-700 block">
                Regra de início no fluxo "{fluxoSelecionado.nome}":
              </span>
              {primeiraEtapa ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    {isPrimeiraImediata ? (
                      <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-bold flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-700" />
                        <span>1ª Etapa Imediata (na hora)</span>
                      </Badge>
                    ) : (
                      <Badge className="bg-blue-100 text-blue-900 border-blue-300 text-[10px] font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3 text-blue-700" />
                        <span>
                          1ª Etapa (+{primeiraEtapa.dias_apos} dia
                          {primeiraEtapa.dias_apos > 1 ? 's' : ''})
                        </span>
                      </Badge>
                    )}
                    <span className="font-semibold text-gray-800 text-[11px]">
                      {primeiraEtapa.nome}
                    </span>
                  </div>
                  {primeiraEtapa.mensagem && (
                    <p className="text-[11px] text-gray-600 italic bg-white p-2 rounded border border-gray-200 line-clamp-2">
                      "{primeiraEtapa.mensagem}"
                    </p>
                  )}
                  <p className="text-[10px] text-gray-500">
                    O motor de reenvios automáticos continuará conduzindo as etapas seguintes
                    normalmente.
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-gray-400 italic">
                  Este fluxo não possui etapas ativas cadastradas.
                </p>
              )}
            </div>
          )}

          {/* Alerta de idempotência se cliente já está ativo */}
          {clientesJaAtivos.length > 0 && (
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription className="text-xs">
                {destinatarios.length === 1 ? (
                  <span>
                    Atenção: o cliente <strong>{destinatarios[0].nome}</strong> já possui
                    acompanhamento ativo neste mesmo fluxo. Se confirmar, a operação será evitada
                    para não duplicar envios.
                  </span>
                ) : (
                  <span>
                    Atenção: <strong>{clientesJaAtivos.length}</strong> dos {destinatarios.length}{' '}
                    clientes selecionados já possuem acompanhamento ativo neste mesmo fluxo.
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={salvando}
            className="text-xs"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleConfirmar}
            disabled={salvando || carregando || !fluxoSelecionadoId || todosJaAtivos}
            className="text-xs bg-[#0284C7] hover:bg-[#0369a1] text-white font-bold"
          >
            {salvando ? (
              <span>Movendo...</span>
            ) : (
              <span className="flex items-center gap-1.5">
                <GitFork className="w-3.5 h-3.5" />
                <span>Confirmar e Mover</span>
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ModalMoverParaFluxo
