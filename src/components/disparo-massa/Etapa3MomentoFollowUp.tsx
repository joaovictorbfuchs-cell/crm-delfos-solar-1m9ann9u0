import React from 'react'
import { Clock, Send, Calendar, RotateCcw, Info } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { FluxoFollowUp } from '@/services/fluxosFollowUpService'

export interface Etapa3MomentoFollowUpProps {
  tipoEnvio: 'agora' | 'agendar'
  onMudarTipoEnvio: (tipo: 'agora' | 'agendar') => void
  dataHoraAgendada: string
  onMudarDataHoraAgendada: (val: string) => void
  intervaloSegundos: number
  onMudarIntervaloSegundos: (val: number) => void
  // Régua de Follow-up e Fluxos
  reenvioAtivo: boolean
  onMudarReenvioAtivo: (val: boolean) => void
  fluxosDisponiveis: FluxoFollowUp[]
  fluxoSelecionadoId: string
  onMudarFluxoSelecionadoId: (val: string) => void
  textoVeraDoFluxo: boolean
  etapaImediataFluxo: { mensagem: string; nome?: string } | null
  fluxoSelecionadoObj: FluxoFollowUp | null
  // Textos legados de fallback
  textoReenvio1: string
  onMudarTextoReenvio1: (val: string) => void
  textoReenvio2: string
  onMudarTextoReenvio2: (val: string) => void
}

export const Etapa3MomentoFollowUp: React.FC<Etapa3MomentoFollowUpProps> = ({
  tipoEnvio,
  onMudarTipoEnvio,
  dataHoraAgendada,
  onMudarDataHoraAgendada,
  intervaloSegundos,
  onMudarIntervaloSegundos,
  reenvioAtivo,
  onMudarReenvioAtivo,
  fluxosDisponiveis,
  fluxoSelecionadoId,
  onMudarFluxoSelecionadoId,
  textoVeraDoFluxo,
  etapaImediataFluxo,
  fluxoSelecionadoObj,
  textoReenvio1,
  onMudarTextoReenvio1,
  textoReenvio2,
  onMudarTextoReenvio2,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-full">
      {/* Bloco 1: Momento do Envio (Enviar Agora vs Agendar) */}
      <div className="lg:col-span-6 flex flex-col space-y-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-2xs space-y-4 flex-1">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <Label className="text-xs font-bold uppercase tracking-wider text-gray-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#0284C7]" />
              <span>Momento do Envio</span>
            </Label>
          </div>

          {/* Botões alternadores Enviar agora vs Agendar */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onMudarTipoEnvio('agora')}
              className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                tipoEnvio === 'agora'
                  ? 'bg-sky-50 border-[#0284C7] text-[#0284C7] shadow-xs ring-2 ring-sky-100'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>Enviar agora</span>
            </button>

            <button
              type="button"
              onClick={() => onMudarTipoEnvio('agendar')}
              className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                tipoEnvio === 'agendar'
                  ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-xs ring-2 ring-amber-100'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Calendar className="w-4 h-4 text-amber-600" />
              <span>Agendar envio</span>
            </button>
          </div>

          {/* Parâmetros de Envio e Intervalo */}
          <div className="space-y-3 pt-2">
            {tipoEnvio === 'agendar' && (
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1.5 animate-in fade-in duration-150">
                <Label className="text-xs font-bold text-amber-900 block">
                  Data e Horário de Início (Brasília):
                </Label>
                <Input
                  type="datetime-local"
                  value={dataHoraAgendada}
                  onChange={(e) => onMudarDataHoraAgendada(e.target.value)}
                  className="h-9 text-xs bg-white font-medium border-amber-300"
                />
                <p className="text-[11px] text-amber-800">
                  O worker agendará e disparará as mensagens em sequência a partir deste horário.
                </p>
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <Label className="text-xs font-bold text-gray-700 block">
                Intervalo entre mensagens (proteção anti-bloqueio):
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={5}
                  max={3600}
                  step={5}
                  value={intervaloSegundos}
                  onChange={(e) =>
                    onMudarIntervaloSegundos(Math.max(5, parseInt(e.target.value) || 60))
                  }
                  className="h-8 text-xs bg-white font-bold w-24 text-center"
                />
                <span className="text-xs text-gray-600 font-medium">
                  segundos (padrão seguro: <strong>60s</strong>)
                </span>
              </div>
              <p className="text-[11px] text-gray-500">
                Garante que o Z-API não sofra suspensão pela Meta por envio acelerado.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-sky-50/80 border border-sky-200 text-[11px] text-sky-950 flex items-start gap-2">
              <Info className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
              <span>
                {tipoEnvio === 'agendar' ? (
                  <>
                    As mensagens são salvas como <strong>"agendada"</strong> e escalonadas a cada{' '}
                    {intervaloSegundos}s para envio automático em segundo plano.
                  </>
                ) : (
                  <>
                    O disparo imediato inicia assim que você confirmar na etapa 4, com intervalo de{' '}
                    {intervaloSegundos}s entre cada destinatário.
                  </>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bloco 2: Régua de Follow-up (+3d e +90d / Fluxos Dinâmicos) */}
      <div className="lg:col-span-6 flex flex-col space-y-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-2xs space-y-4 flex-1 flex flex-col">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-emerald-600" />
              <Label
                htmlFor="toggle-reenvio-ativo"
                className="text-xs font-bold uppercase tracking-wider text-gray-800 cursor-pointer flex items-center gap-1.5"
              >
                <span>Régua de Follow-up</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  +3d e +90d
                </span>
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="toggle-reenvio-ativo"
                type="checkbox"
                checked={reenvioAtivo}
                onChange={(e) => onMudarReenvioAtivo(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-600 cursor-pointer"
              />
              <Label
                htmlFor="toggle-reenvio-ativo"
                className="text-xs font-bold text-gray-700 cursor-pointer select-none"
              >
                {reenvioAtivo ? 'Ativa' : 'Desativada'}
              </Label>
            </div>
          </div>

          <p className="text-xs text-gray-600">
            Dispara mensagens subsequentes caso o cliente não responda ao primeiro contato, mantendo
            o engajamento automático.
          </p>

          {reenvioAtivo ? (
            <div className="space-y-3 flex-1 flex flex-col pt-1 animate-in fade-in duration-150">
              {/* Seletor de Fluxo de Follow-up */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-gray-700">
                    Fluxo de Follow-up Selecionado:
                  </Label>
                  <span className="text-[11px] text-emerald-700 font-bold">
                    {fluxoSelecionadoObj?.nome || 'Padrão Delfos'}
                  </span>
                </div>

                <select
                  value={fluxoSelecionadoId}
                  onChange={(e) => onMudarFluxoSelecionadoId(e.target.value)}
                  className="w-full text-xs font-medium py-2 px-2.5 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs"
                >
                  {fluxosDisponiveis.length === 0 ? (
                    <option value="">Padrão Delfos (+3d e +90d)</option>
                  ) : (
                    fluxosDisponiveis.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nome} {f.is_padrao ? '(Padrão Delfos)' : ''} ({f.etapas?.length || 0}{' '}
                        etapa{f.etapas?.length === 1 ? '' : 's'})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Etapas programadas do fluxo */}
              {(() => {
                const etapas = fluxoSelecionadoObj?.etapas || []
                if (etapas.length > 0) {
                  return (
                    <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2 flex-1 overflow-y-auto max-h-56">
                      <span className="text-[10px] font-bold text-emerald-900 block uppercase tracking-wider">
                        Etapas programadas nesta régua:
                      </span>
                      <div className="space-y-1.5">
                        {etapas.map((et, idx) => (
                          <div
                            key={et.id}
                            className={`text-xs flex items-start gap-2 p-2 rounded-lg ${
                              et.ativa
                                ? 'bg-white border border-emerald-200 text-gray-800 shadow-2xs'
                                : 'bg-gray-100 text-gray-400 line-through'
                            }`}
                          >
                            <span className="font-bold text-emerald-700 shrink-0">#{idx + 1}</span>
                            <span className="font-bold text-gray-900 shrink-0">
                              {et.dias_apos === 0 ? 'Imediato:' : `+${et.dias_apos} dias:`}
                            </span>
                            <span className="truncate flex-1 italic text-gray-600">
                              "{et.mensagem}"
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                }

                // Fallback legado com inputs caso não haja etapas dinâmicas no fluxo
                return (
                  <div className="space-y-3 pt-1">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-gray-700">
                          1º Reenvio (+3 dias sem resposta):
                        </Label>
                      </div>
                      <Textarea
                        rows={2}
                        value={textoReenvio1}
                        onChange={(e) => onMudarTextoReenvio1(e.target.value)}
                        className="text-xs font-mono bg-white resize-none p-2"
                        placeholder="Olá, [nome do cliente]! Passando para checar se conseguiu ver a mensagem anterior..."
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-gray-700">
                          2º Reenvio (+90 dias sem resposta):
                        </Label>
                      </div>
                      <Textarea
                        rows={2}
                        value={textoReenvio2}
                        onChange={(e) => onMudarTextoReenvio2(e.target.value)}
                        className="text-xs font-mono bg-white resize-none p-2"
                        placeholder="Olá, [nome do cliente]! Já faz um tempo desde nosso último contato..."
                      />
                    </div>
                  </div>
                )
              })()}

              <p className="text-[11px] text-gray-500 pt-1">
                A régua é pausada automaticamente caso o cliente responda a qualquer uma das
                mensagens.
              </p>
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-xs text-gray-500 flex-1 flex flex-col justify-center items-center space-y-1">
              <p className="font-semibold text-gray-700">Régua de follow-up desativada</p>
              <p>Apenas a mensagem inicial da etapa 2 será disparada para os clientes.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Etapa3MomentoFollowUp
