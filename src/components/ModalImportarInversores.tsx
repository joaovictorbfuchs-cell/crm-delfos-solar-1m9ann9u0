import React, { useState } from 'react'
import {
  Download,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  RefreshCw,
  Building,
  Info,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  XCircle,
  Layers,
} from 'lucide-react'
import { toast } from 'sonner'
import { analisarImportacaoInversores, executarCopiaInversores } from '@/services/ativosService'
import type { AnaliseImportacaoInversores, ResultadoExecucaoImportacao } from '@/types/ativos'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

interface ModalImportarInversoresProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSucesso: () => void
  usuarioId?: string
}

export function ModalImportarInversores({
  open,
  onOpenChange,
  onSucesso,
  usuarioId,
}: ModalImportarInversoresProps) {
  const [etapa, setEtapa] = useState<'carregando' | 'resumo' | 'executando' | 'concluido'>(
    'carregando',
  )
  const [analise, setAnalise] = useState<AnaliseImportacaoInversores | null>(null)
  const [resultado, setResultado] = useState<ResultadoExecucaoImportacao | null>(null)
  const [mostrarIgnorados, setMostrarIgnorados] = useState(false)
  const [mostrarAptos, setMostrarAptos] = useState(false)

  const iniciarAnalise = async () => {
    setEtapa('carregando')
    setResultado(null)
    setMostrarIgnorados(false)
    setMostrarAptos(false)
    try {
      const res = await analisarImportacaoInversores()
      setAnalise(res)
      setEtapa('resumo')
    } catch (err: any) {
      console.error('Erro ao analisar inversores para cópia:', err)
      toast.error('Erro ao consultar cadastro de cliente_inversores.')
      onOpenChange(false)
    }
  }

  // Sempre que abrir o modal, roda a análise prévia
  React.useEffect(() => {
    if (open) {
      iniciarAnalise()
    }
  }, [open])

  const handleConfirmarCopia = async () => {
    setEtapa('executando')
    try {
      const res = await executarCopiaInversores(usuarioId)
      setResultado(res)
      setEtapa('concluido')
      toast.success(
        `Processo concluído: ${res.criados} ativo(s) criado(s) com sucesso na coleção de ativos!`,
      )
      onSucesso()
    } catch (err: any) {
      console.error('Erro na execução da cópia:', err)
      toast.error('Ocorreu um erro durante a cópia dos inversores.')
      setEtapa('resumo')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-extrabold text-[#0F2038]">
            <Download className="w-5 h-5 text-[#E0A838]" />
            <span>Copiar Inversores de cliente_inversores para Ativos</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Processo 100% aditivo e seguro: lê os inversores existentes em{' '}
            <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono">
              cliente_inversores
            </code>{' '}
            e cria os registros correspondentes na coleção de ativos, sem alterar nem remover o
            cadastro original de monitoramento.
          </DialogDescription>
        </DialogHeader>

        {etapa === 'carregando' && (
          <div className="py-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#0F2038]" />
            <p className="text-sm font-semibold text-slate-700">
              Analisando inversores cadastrados e verificando idempotência...
            </p>
            <p className="text-xs text-slate-400">
              Verificando vínculos com usinas e integridade dos dados mínimos.
            </p>
          </div>
        )}

        {etapa === 'executando' && (
          <div className="py-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#E0A838]" />
            <p className="text-sm font-semibold text-slate-800">
              Copiando inversores para a coleção de ativos...
            </p>
            <p className="text-xs text-slate-500">
              Criando ativos do tipo inversor, vinculando às usinas e gerando observações de
              rastreabilidade.
            </p>
          </div>
        )}

        {etapa === 'resumo' && analise && (
          <div className="space-y-4 py-2 text-xs">
            {/* Cards de Resumo da Análise Prévia */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                  Aptos para Criar
                </span>
                <div className="text-2xl font-black text-emerald-900 mt-1">
                  {analise.aptosParaCriar.length}
                </div>
                <span className="text-[10px] text-emerald-700 block mt-0.5">
                  Novos ativos a gerar
                </span>
              </div>

              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 block">
                  Já Importados
                </span>
                <div className="text-2xl font-black text-blue-900 mt-1">
                  {analise.jaImportados.length}
                </div>
                <span className="text-[10px] text-blue-700 block mt-0.5">
                  Protegidos (sem duplicar)
                </span>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                  Fora por Dados
                </span>
                <div className="text-2xl font-black text-amber-900 mt-1">
                  {analise.foraPorFaltaDados.length}
                </div>
                <span className="text-[10px] text-amber-700 block mt-0.5">Sem dados mínimos</span>
              </div>
            </div>

            {/* Aviso de Segurança e Aditividade */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                <Info className="w-4 h-4 text-[#0F2038]" />
                <span>Critérios do Processo</span>
              </div>
              <ul className="list-disc pl-4 text-slate-600 space-y-1">
                <li>
                  <strong>Segurança total:</strong> Nenhum dado em{' '}
                  <code className="font-mono text-[11px]">cliente_inversores</code> é apagado ou
                  modificado.
                </li>
                <li>
                  <strong>Idempotência:</strong> Se este processo for executado novamente no futuro,
                  os ativos já copiados são ignorados sem criar duplicatas.
                </li>
                <li>
                  <strong>Vínculo confiável:</strong> Quando o cliente possui usina cadastrada, o
                  ativo é vinculado a ela; caso contrário, é criado com indicação explícita na
                  observação para manter o histórico.
                </li>
              </ul>
            </div>

            {/* Se houver inversores aptos, permitir ver a lista resumida */}
            {analise.aptosParaCriar.length > 0 && (
              <div className="border border-slate-200 rounded-xl p-3 bg-white">
                <button
                  type="button"
                  onClick={() => setMostrarAptos(!mostrarAptos)}
                  className="w-full flex items-center justify-between text-left font-bold text-slate-800"
                >
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Inversores que serão criados ({analise.aptosParaCriar.length})</span>
                  </span>
                  {mostrarAptos ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {mostrarAptos && (
                  <div className="mt-2.5 max-h-48 overflow-y-auto space-y-1.5 divide-y divide-slate-100 pt-1">
                    {analise.aptosParaCriar.map((item) => (
                      <div
                        key={item.inversorId}
                        className="pt-1.5 flex items-center justify-between text-[11px]"
                      >
                        <div>
                          <strong className="text-slate-900">{item.fabricante}</strong> •{' '}
                          {item.modelo}
                          {item.numeroSerie ? ` (S/N: ${item.numeroSerie})` : ''}
                          <p className="text-[10px] text-slate-500">
                            Cliente: {item.clienteNome}{' '}
                            {item.usinaNome ? `• Usina: ${item.usinaNome}` : '• (Sem usina direta)'}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-200"
                        >
                          Apto
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Lista dos que ficam de fora por falta de dados mínimos */}
            {analise.foraPorFaltaDados.length > 0 && (
              <div className="border border-amber-200 rounded-xl p-3 bg-amber-50/50">
                <button
                  type="button"
                  onClick={() => setMostrarIgnorados(!mostrarIgnorados)}
                  className="w-full flex items-center justify-between text-left font-bold text-amber-900"
                >
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>
                      Inversores fora da cópia por falta de dados (
                      {analise.foraPorFaltaDados.length})
                    </span>
                  </span>
                  {mostrarIgnorados ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                <p className="text-[11px] text-amber-800 mt-1">
                  Estes registros não têm fabricante, modelo nem número de série definidos. Não
                  foram copiados para não poluir a base de ativos.
                </p>

                {mostrarIgnorados && (
                  <div className="mt-2.5 max-h-48 overflow-y-auto space-y-2 divide-y divide-amber-200/60 pt-1">
                    {analise.foraPorFaltaDados.map((item) => (
                      <div key={item.id} className="pt-2 text-[11px] text-amber-950">
                        <div className="flex items-center justify-between">
                          <span className="font-bold">
                            #{item.id} • {item.cliente_nome || 'Cliente sem nome'}
                          </span>
                          <span className="text-[10px] text-amber-700 italic">{item.motivo}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {etapa === 'concluido' && resultado && (
          <div className="space-y-4 py-3 text-xs">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-extrabold text-emerald-950">
                  Cópia de Inversores Realizada com Sucesso!
                </h4>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Os inversores foram processados e os novos registros de ativos já estão
                  disponíveis para visualização e acompanhamento de garantias.
                </p>
              </div>
            </div>

            {/* Relatório Final Numérico */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">
                  Ativos Criados
                </span>
                <span className="text-2xl font-black text-emerald-700 block mt-1">
                  {resultado.criados}
                </span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">
                  Já Existentes
                </span>
                <span className="text-2xl font-black text-blue-700 block mt-1">
                  {resultado.jaExistentes}
                </span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">
                  Ficaram de Fora
                </span>
                <span className="text-2xl font-black text-amber-700 block mt-1">
                  {resultado.ignoradosPorFaltaDados}
                </span>
              </div>
            </div>

            {/* Lista dos registros que ficaram de fora por falta de dados para transparência */}
            {resultado.detalhesIgnorados.length > 0 && (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-bold text-slate-800">
                    Registros que ficaram de fora ({resultado.detalhesIgnorados.length})
                  </h5>
                  <span className="text-[10px] text-slate-500">Motivo: Falta de dados mínimos</span>
                </div>
                <div className="max-h-44 overflow-y-auto space-y-1.5 text-[11px] divide-y divide-slate-200">
                  {resultado.detalhesIgnorados.map((item) => (
                    <div key={item.id} className="pt-1.5 flex items-center justify-between">
                      <span className="text-slate-700">
                        <strong className="font-mono text-slate-900">#{item.id}</strong> —{' '}
                        {item.cliente_nome}
                      </span>
                      <span className="text-[10px] text-slate-500 italic">{item.motivo}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 pt-3 border-t border-slate-100">
          {etapa === 'resumo' && (
            <>
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!analise || analise.aptosParaCriar.length === 0}
                onClick={handleConfirmarCopia}
                className="bg-[#0F2038] hover:bg-[#1A365D] text-white font-bold gap-1.5"
              >
                <Download className="w-4 h-4 text-[#E0A838]" />
                <span>Confirmar Cópia ({analise?.aptosParaCriar.length || 0} inversores)</span>
              </Button>
            </>
          )}

          {etapa === 'concluido' && (
            <Button
              type="button"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="bg-[#0F2038] hover:bg-[#1A365D] text-white font-bold"
            >
              Fechar Relatório
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
