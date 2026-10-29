import React, { useState } from 'react'
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
import { AlertCircle, CheckCircle2, RefreshCw, Trash2, ArrowRight } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  consolidarConversasDuplicadasWhatsApp,
  ConsolidarDuplicadasResponse,
} from '@/services/whatsappConsolidarService'
import { formatWhatsAppPhone } from '@/lib/formatters'

interface ModalConsolidarConversasProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConsolidadoSucesso?: () => void
}

export const ModalConsolidarConversas: React.FC<ModalConsolidarConversasProps> = ({
  open,
  onOpenChange,
  onConsolidadoSucesso,
}) => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [executandoReal, setExecutandoReal] = useState(false)
  const [resultado, setResultado] = useState<ConsolidarDuplicadasResponse | null>(null)

  const handleExecutarAnalise = async (dryRun: boolean = true) => {
    if (dryRun) {
      setLoading(true)
    } else {
      setExecutandoReal(true)
    }

    try {
      const res = await consolidarConversasDuplicadasWhatsApp(dryRun)
      setResultado(res)

      if (dryRun) {
        toast({
          title: 'Simulação concluída (dry-run)',
          description: `Identificados ${res.totalGruposDuplicados} grupo(s) com conversas duplicadas. Nenhuma alteração foi feita.`,
        })
      } else {
        toast({
          title: 'Consolidação realizada com sucesso!',
          description: `${res.totalConversasRemovidas} conversa(s) duplicada(s) consolidada(s) e ${res.totalMensagensMovidas} mensagem(ns) preservadas.`,
        })
        if (onConsolidadoSucesso) {
          onConsolidadoSucesso()
        }
      }
    } catch (err: any) {
      console.error('Erro ao consolidar conversas WhatsApp:', err)
      toast({
        title: 'Erro na operação',
        description: err?.message || 'Falha ao processar consolidação de conversas.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
      setExecutandoReal(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
            <RefreshCw className="w-4 h-4 text-emerald-600" />
            Consolidar Conversas Duplicadas do WhatsApp
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500">
            Identifica conversas duplicadas pertencentes ao mesmo número de telefone, move as
            mensagens para a conversa mais antiga e remove as duplicatas sem perder o histórico.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-3 py-2 text-xs">
          {!resultado && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-center space-y-2">
              <p className="text-gray-600 leading-relaxed">
                Clique no botão abaixo para analisar o banco de conversas em modo seguro (
                <strong>dry-run</strong>). O sistema fará uma varredura completa sem alterar nada.
              </p>
              <Button
                type="button"
                onClick={() => handleExecutarAnalise(true)}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Analisando banco...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Iniciar Análise (Dry-Run Seguro)
                  </>
                )}
              </Button>
            </div>
          )}

          {resultado && (
            <div className="space-y-3">
              {/* Resumo do resultado */}
              <div
                className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                  resultado.dryRun
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}
              >
                {resultado.dryRun ? (
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">
                      {resultado.dryRun ? 'Modo Simulação (Dry-Run)' : 'Consolidação Executada'}
                    </span>
                    <Badge
                      variant={resultado.dryRun ? 'outline' : 'default'}
                      className="text-[10px]"
                    >
                      {resultado.dryRun ? 'Nenhuma alteração feita' : 'Banco atualizado'}
                    </Badge>
                  </div>
                  <p className="text-xs leading-relaxed">
                    Total de conversas analisadas:{' '}
                    <strong>{resultado.totalConversasAnalisadas}</strong> | Grupos com duplicatas:{' '}
                    <strong>{resultado.totalGruposDuplicados}</strong> | Conversas duplicadas
                    detectadas: <strong>{resultado.totalConversasRemovidas}</strong> | Mensagens a
                    mover: <strong>{resultado.totalMensagensMovidas}</strong>
                  </p>
                </div>
              </div>

              {/* Lista dos grupos */}
              {resultado.grupos.length === 0 ? (
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-center text-emerald-800">
                  <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-emerald-600" />
                  <p className="font-semibold">Nenhuma conversa duplicada encontrada!</p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Todas as conversas no banco de dados estão únicas e organizadas.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-gray-700 px-1">
                    <span>Grupos identificados ({resultado.grupos.length})</span>
                    <button
                      type="button"
                      onClick={() => handleExecutarAnalise(true)}
                      disabled={loading || executandoReal}
                      className="text-emerald-700 hover:underline inline-flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Reexecutar análise
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {resultado.grupos.map((grp) => (
                      <div
                        key={grp.chave}
                        className="p-3 bg-white border border-gray-200 rounded-xl space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-900 font-mono text-xs">
                            {formatWhatsAppPhone(grp.principalNumero) || grp.principalNumero}
                          </span>
                          <span className="text-[10px] text-amber-700 bg-amber-100 font-bold px-2 py-0.5 rounded-full">
                            {grp.totalDuplicatas} duplicata(s)
                          </span>
                        </div>

                        <div className="text-[11px] text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100 space-y-1">
                          <div className="flex items-center gap-1 text-emerald-800">
                            <strong>Principal (mais antiga):</strong> ID {grp.principalId}
                            <span className="text-gray-400">
                              ({new Date(grp.principalCreated).toLocaleDateString()})
                            </span>
                          </div>
                          <div>
                            <strong>Duplicatas:</strong>
                            <ul className="list-disc list-inside mt-0.5 space-y-0.5 text-[10px] text-gray-500">
                              {grp.duplicatas.map((d) => (
                                <li key={d.id}>
                                  ID {d.id} • {d.mensagensContidas} mensagem(ns) contida(s)
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 border-t pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={loading || executandoReal}
            className="text-xs"
          >
            Fechar
          </Button>

          {resultado && resultado.dryRun && resultado.totalGruposDuplicados > 0 && (
            <Button
              type="button"
              size="sm"
              onClick={() => handleExecutarAnalise(false)}
              disabled={executandoReal}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs"
            >
              {executandoReal ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Consolidando no banco...
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Consolidar e Limpar Banco ({resultado.totalConversasRemovidas} duplicatas)
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
