import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Factory,
  Plus,
  Unlink,
  CheckCircle2,
  Clock,
  Zap,
  MapPin,
  Loader2,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react'
import {
  getUsinasByContratoId,
  getUsinasDisponiveis,
  vincularUsinaAoContrato,
  desvincularUsinaDoContrato,
  type ContratoUsina,
  type UsinaItem,
} from '@/services/contratosUsinasService'
import { formatDate } from '@/lib/formatters'
import { toast } from 'sonner'

interface SecaoContratoUsinasProps {
  contratoId: string
  clienteId?: string
  numeroContrato?: string
  plano?: string
  onUsinaSelecionada?: (usinaId: string) => void
}

export const SecaoContratoUsinas: React.FC<SecaoContratoUsinasProps> = ({
  contratoId,
  clienteId,
  numeroContrato,
  plano,
  onUsinaSelecionada,
}) => {
  const [usinasTodas, setUsinasTodas] = useState<UsinaItem[]>([])
  const [vinculos, setVinculos] = useState<ContratoUsina[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isVinculando, setIsVinculando] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [usinaParaVincularId, setUsinaParaVincularId] = useState('')
  const [observacoesVinculo, setObservacoesVinculo] = useState('')

  // Carrega os vínculos da relação contratos_usinas e usinas disponíveis
  const carregarDados = useCallback(async () => {
    if (!contratoId) return
    setIsLoading(true)
    try {
      const [listaVinculos, listaUsinas] = await Promise.all([
        getUsinasByContratoId(contratoId),
        getUsinasDisponiveis(clienteId),
      ])
      setVinculos(listaVinculos)
      setUsinasTodas(listaUsinas)
    } catch (err) {
      console.error('Erro ao carregar usinas do contrato:', err)
    } finally {
      setIsLoading(false)
    }
  }, [contratoId, clienteId])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  // Vinculos ativos e inativos (histórico temporal)
  const vinculosAtivos = useMemo(() => vinculos.filter((v) => v.ativo), [vinculos])
  const vinculosHistorico = useMemo(() => vinculos.filter((v) => !v.ativo), [vinculos])

  // Usinas disponíveis para vincular (pertencentes ao mesmo cliente ou gerais que ainda não estejam ativas neste contrato)
  const usinasDisponiveis = useMemo(() => {
    const ativasIds = new Set(vinculosAtivos.map((v) => v.usina_id))
    return usinasTodas.filter((u) => !ativasIds.has(u.id))
  }, [usinasTodas, vinculosAtivos])

  const handleVincular = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!usinaParaVincularId || !contratoId) return

    setIsVinculando(true)
    try {
      await vincularUsinaAoContrato({
        contrato_id: contratoId,
        usina_id: usinaParaVincularId,
        observacoes: observacoesVinculo.trim() || undefined,
      })

      toast.success('Usina vinculada com sucesso ao contrato O&M!')
      setIsModalOpen(false)
      setUsinaParaVincularId('')
      setObservacoesVinculo('')
      await carregarDados()
    } catch (err: unknown) {
      console.error('Erro ao vincular usina ao contrato:', err)
      toast.error(err instanceof Error ? err.message : 'Falha ao vincular usina ao contrato.')
    } finally {
      setIsVinculando(false)
    }
  }

  const handleDesvincular = async (vinculoId: string, nomeUsina: string) => {
    const motivo = window.prompt(
      `Confirma desvincular a usina "${nomeUsina}" deste contrato? O histórico será preservado. Opcional: informe o motivo da desvinculação:`,
    )
    if (motivo === null) return // usuário cancelou o prompt

    try {
      await desvincularUsinaDoContrato(vinculoId, motivo.trim() || undefined)
      toast.success(`Usina "${nomeUsina}" desvinculada. Histórico preservado com sucesso!`)
      await carregarDados()
    } catch (err: unknown) {
      console.error('Erro ao desvincular usina:', err)
      toast.error(err instanceof Error ? err.message : 'Falha ao desvincular usina.')
    }
  }

  return (
    <div className="p-4 sm:p-5 rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-white via-emerald-50/20 to-teal-50/30 shadow-xs space-y-4">
      {/* Cabeçalho da Seção Aditiva */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-emerald-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
            <Factory className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-gray-900 tracking-tight">
                Usinas Cobertas pelo Contrato
              </h4>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                {vinculosAtivos.length}{' '}
                {vinculosAtivos.length === 1 ? 'usina ativa' : 'usinas ativas'}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Este contrato de manutenção pode cobrir múltiplas usinas ao mesmo tempo, preservando
              todo o histórico.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-lg shadow-2xs transition-all hover:scale-[1.01]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Vincular Usina</span>
        </button>
      </div>

      {/* Lista de Usinas Atualmente Cobertas */}
      {isLoading ? (
        <div className="py-6 flex items-center justify-center text-xs text-gray-500 gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
          <span>Carregando usinas vinculadas...</span>
        </div>
      ) : vinculosAtivos.length === 0 ? (
        <div className="py-5 px-4 bg-gray-50/80 rounded-xl border border-dashed border-gray-200 text-center space-y-2">
          <AlertCircle className="w-6 h-6 text-amber-500 mx-auto" />
          <p className="text-xs font-semibold text-gray-700">
            Nenhuma usina vinculada ativamente a este contrato no momento.
          </p>
          <p className="text-[11px] text-gray-500">
            Clique no botão acima para adicionar uma ou mais usinas sob a cobertura deste plano{' '}
            {plano ? `(${plano})` : ''}.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {vinculosAtivos.map((v) => {
            const u = v.expand?.usina_id || usinasTodas.find((item) => item.id === v.usina_id)
            const nomeUsina = u?.nome || 'Usina Fotovoltaica'
            const pot = u?.potencia_kwp || 0
            const modulos = u?.qtd_modulos || 0
            const end = u?.endereco || ''

            return (
              <div
                key={v.id}
                className="p-3.5 bg-white rounded-xl border border-emerald-200/80 hover:border-emerald-300 shadow-2xs flex flex-col justify-between transition-all"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <h5 className="text-xs font-bold text-gray-900 truncate" title={nomeUsina}>
                          {nomeUsina}
                        </h5>
                      </div>
                      {end && (
                        <p
                          className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5 truncate"
                          title={end}
                        >
                          <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                          <span className="truncate">{end}</span>
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDesvincular(v.id, nomeUsina)}
                      className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                      title="Desvincular usina deste contrato (preserva histórico)"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Informações Técnicas */}
                  <div className="flex items-center gap-3 text-[11px] text-gray-600 pt-1 border-t border-gray-100">
                    <span className="flex items-center gap-1 font-semibold text-emerald-700">
                      <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                      {pot > 0 ? `${pot} kWp` : 'Potência n/d'}
                    </span>
                    {modulos > 0 && <span>• {modulos} placas</span>}
                    {v.data_vinculo && (
                      <span className="text-gray-400 ml-auto">
                        Desde: {formatDate(v.data_vinculo)}
                      </span>
                    )}
                  </div>

                  {v.observacoes && (
                    <p className="text-[10px] text-gray-500 italic bg-gray-50 p-1.5 rounded">
                      {v.observacoes}
                    </p>
                  )}
                </div>

                {onUsinaSelecionada && (
                  <button
                    type="button"
                    onClick={() => onUsinaSelecionada(v.usina_id)}
                    className="mt-2 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 self-start"
                  >
                    <span>Ver detalhes da usina</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Histórico Temporal de Usinas Desvinculadas deste Contrato */}
      {vinculosHistorico.length > 0 && (
        <div className="pt-3 border-t border-gray-200/80 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span>Histórico de Usinas Anteriores ({vinculosHistorico.length})</span>
          </div>

          <div className="space-y-1.5">
            {vinculosHistorico.map((v) => {
              const u = v.expand?.usina_id || usinasTodas.find((item) => item.id === v.usina_id)
              const nomeUsina = u?.nome || 'Usina Fotovoltaica'
              return (
                <div
                  key={v.id}
                  className="p-2.5 bg-gray-50/80 rounded-lg border border-gray-200 text-xs flex items-center justify-between flex-wrap gap-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800">{nomeUsina}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-200 text-gray-700 font-medium">
                      Encerrado
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-500">
                    Vigência: {v.data_vinculo ? formatDate(v.data_vinculo) : 'Início n/d'} até{' '}
                    {v.data_desvinculo ? formatDate(v.data_desvinculo) : 'Data n/d'}
                    {v.observacoes && ` • ${v.observacoes}`}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal Aditivo: Vincular Nova Usina */}
      {isModalOpen && (
        <div className="p-4 bg-emerald-50/90 rounded-2xl border border-emerald-300 space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              Adicionar Usina à Cobertura do Contrato
            </span>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="text-gray-400 hover:text-gray-600 text-xs font-semibold"
            >
              Cancelar
            </button>
          </div>

          <form onSubmit={handleVincular} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Selecione a Usina</label>
              {usinasDisponiveis.length === 0 ? (
                <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                  Todas as usinas cadastradas já estão vinculadas a este contrato ou nenhuma foi
                  encontrada.
                </p>
              ) : (
                <select
                  value={usinaParaVincularId}
                  onChange={(e) => setUsinaParaVincularId(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs bg-white text-gray-900"
                >
                  <option value="">Selecione uma usina...</option>
                  {usinasDisponiveis.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome} {u.potencia_kwp ? `(${u.potencia_kwp} kWp)` : ''}{' '}
                      {u.endereco ? `- ${u.endereco}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Observações do Vínculo (opcional)
              </label>
              <input
                type="text"
                value={observacoesVinculo}
                onChange={(e) => setObservacoesVinculo(e.target.value)}
                placeholder="Ex.: Usina Filial adicionada em aditivo contratual"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs bg-white text-gray-900"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 text-xs hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!usinaParaVincularId || isVinculando}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white rounded-lg text-xs font-bold"
              >
                {isVinculando ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Vinculando...</span>
                  </>
                ) : (
                  <span>Confirmar Vínculo</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
