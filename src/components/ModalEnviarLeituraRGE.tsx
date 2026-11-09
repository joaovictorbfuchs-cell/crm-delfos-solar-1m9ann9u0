import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { X, Send, Loader2, CheckCircle2, AlertCircle, Clock, RefreshCw, Zap } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import type { Atividade, Cliente } from '@/types/crm'

export interface ModalEnviarLeituraRGEProps {
  isOpen: boolean
  onClose: () => void
  atividade: Atividade
  cliente?: Cliente | null
  onEnviadoSucesso?: (atividadeAtualizada?: Atividade) => void
}

interface LeituraRGE {
  id: string
  uc: string
  valor_03: string
  valor_a3: string
  status: 'na_fila' | 'processando' | 'enviada' | 'erro'
  protocolo: string
  horario_envio: string
  mensagem: string
  mes_referencia: string
  created: string
}

const soDigitos = (v?: string | null) => String(v || '').replace(/\D/g, '')

const STATUS_INFO: Record<string, { label: string; classe: string; Icone: typeof Clock }> = {
  na_fila: {
    label: 'Na fila — o robô vai enviar',
    classe: 'text-amber-800 bg-amber-50 border-amber-200',
    Icone: Clock,
  },
  processando: {
    label: 'Enviando agora...',
    classe: 'text-sky-800 bg-sky-50 border-sky-200',
    Icone: Loader2,
  },
  enviada: {
    label: 'Leitura registrada na RGE',
    classe: 'text-emerald-800 bg-emerald-50 border-emerald-200',
    Icone: CheckCircle2,
  },
  erro: {
    label: 'Falhou — veja o motivo',
    classe: 'text-red-800 bg-red-50 border-red-200',
    Icone: AlertCircle,
  },
}

export const ModalEnviarLeituraRGE: React.FC<ModalEnviarLeituraRGEProps> = ({
  isOpen,
  onClose,
  atividade,
  cliente,
  onEnviadoSucesso,
}) => {
  const { toast } = useToast()
  const [uc, setUc] = useState('')
  const [valor03, setValor03] = useState('')
  const [valorA3, setValorA3] = useState('')
  const [telefone, setTelefone] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [leituras, setLeituras] = useState<LeituraRGE[]>([])
  const [carregando, setCarregando] = useState(false)
  const pollRef = useRef<number | null>(null)

  const chamar = useCallback(
    async <T = unknown,>(path: string, options: RequestInit = {}): Promise<T> => {
      const url = `${pb.baseUrl}/backend/v1${path}`
      const headers = new Headers(options.headers || {})
      const token = pb.authStore.token
      if (token) headers.set('Authorization', `Bearer ${token}`)
      if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
        headers.set('Content-Type', 'application/json')
      }
      const res = await fetch(url, { ...options, headers })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((json as { error?: string }).error || `HTTP ${res.status}`)
      return json as T
    },
    [],
  )

  const carregarStatus = useCallback(async () => {
    if (!atividade?.id) return
    try {
      setCarregando(true)
      const r = await chamar<{ ok: boolean; itens: LeituraRGE[] }>(
        `/rge/leitura-atividade?atividade_id=${encodeURIComponent(atividade.id)}`,
      )
      setLeituras(r.itens || [])
    } catch {
      /* sem histórico ainda */
    } finally {
      setCarregando(false)
    }
  }, [atividade?.id, chamar])

  useEffect(() => {
    if (!isOpen) return
    setErro(null)
    const ucInicial = soDigitos(atividade.numero_uc) || soDigitos(cliente?.uc) || ''
    setUc(ucInicial)
    setValor03(soDigitos(atividade.valor_grandeza_03))
    setValorA3(soDigitos(atividade.valor_grandeza_103))
    setTelefone(soDigitos(cliente?.telefone))
    void carregarStatus()
  }, [isOpen, atividade, cliente, carregarStatus])

  // Enquanto houver pedido na fila/processando, consulta de novo para o
  // operador ver o protocolo aparecer sem recarregar a página.
  useEffect(() => {
    if (!isOpen) return
    const pendente = leituras.some((l) => l.status === 'na_fila' || l.status === 'processando')
    if (!pendente) {
      if (pollRef.current) {
        window.clearInterval(pollRef.current)
        pollRef.current = null
      }
      return
    }
    if (pollRef.current) return
    pollRef.current = window.setInterval(() => void carregarStatus(), 6000)
    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [isOpen, leituras, carregarStatus])

  const ultima = useMemo(() => (leituras.length ? leituras[0] : null), [leituras])

  if (!isOpen) return null

  const jaEnviada = ultima?.status === 'enviada'
  const emAndamento = ultima?.status === 'na_fila' || ultima?.status === 'processando'

  const handleEnviar = async () => {
    const ucLimpa = soDigitos(uc)
    const l03 = soDigitos(valor03)
    const lA3 = soDigitos(valorA3)
    const tel = soDigitos(telefone)

    if (!ucLimpa) return setErro('Informe a UC.')
    if (!l03) return setErro('Informe a leitura do totalizador 03.')
    if (l03.length > 5) return setErro('A leitura 03 tem no máximo 5 dígitos.')
    if (lA3.length > 5) return setErro('A leitura A3 tem no máximo 5 dígitos.')
    if (tel.length < 10) return setErro('Informe o telefone com DDD (10 ou 11 dígitos).')

    try {
      setEnviando(true)
      setErro(null)
      const r = await chamar<{ ok: boolean; leitura_id: string; valor_03: string }>(
        '/rge/leitura-solicitar',
        {
          method: 'POST',
          body: JSON.stringify({
            atividade_id: atividade.id,
            uc: ucLimpa,
            valor_03: l03,
            valor_a3: lA3 || undefined,
            telefone: tel,
          }),
        },
      )
      toast({
        title: 'Leitura enviada para a fila',
        description: `UC ${ucLimpa} — grandeza 03 = ${r.valor_03}. O robô envia ao portal em instantes.`,
      })
      await carregarStatus()
      if (onEnviadoSucesso) onEnviadoSucesso()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao enviar a leitura.'
      setErro(msg)
      toast({ title: 'Não foi possível enviar', description: msg, variant: 'destructive' })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        onClick={enviando ? undefined : onClose}
        aria-hidden="true"
      />

      <div className="relative z-50 w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-700 to-orange-600 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center border border-white/25">
              <Zap className="w-5 h-5 text-orange-100" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold leading-tight">
                Enviar leitura para a RGE
              </h2>
              <p className="text-[11px] text-orange-100">
                O robô entra no portal e registra a autoleitura
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={enviando}
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3.5 max-h-[78vh] overflow-y-auto text-xs">
          {jaEnviada && ultima ? (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Leitura registrada na RGE</span>
              </div>
              <p className="text-[11px] text-emerald-900">
                Protocolo: <strong className="font-mono">{ultima.protocolo || '—'}</strong>
              </p>
              {ultima.horario_envio && (
                <p className="text-[11px] text-emerald-800">
                  Enviada em {new Date(ultima.horario_envio).toLocaleString('pt-BR')}
                </p>
              )}
              <p className="text-[10px] text-emerald-700">
                A atividade já foi concluída com os valores e o protocolo preenchidos.
              </p>
            </div>
          ) : null}

          {emAndamento && ultima ? (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2 ${STATUS_INFO[ultima.status].classe}`}
            >
              {ultima.status === 'processando' ? (
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              ) : (
                <Clock className="w-4 h-4 shrink-0" />
              )}
              <span className="font-semibold">{STATUS_INFO[ultima.status].label}</span>
              <button
                type="button"
                onClick={() => void carregarStatus()}
                className="ml-auto p-1 rounded-lg hover:bg-white/60"
                title="Atualizar"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${carregando ? 'animate-spin' : ''}`} />
              </button>
            </div>
          ) : null}

          {ultima?.status === 'erro' && ultima.mensagem ? (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span>O robô não conseguiu enviar</span>
              </div>
              <p className="text-[11px] font-mono break-words">{ultima.mensagem}</p>
              <p className="text-[10px] text-red-700">
                Corrija o dado e envie de novo — o pedido anterior fica no histórico.
              </p>
            </div>
          ) : null}

          {!jaEnviada && (
            <>
              <div>
                <label className="font-bold text-gray-700 uppercase tracking-wide block mb-1">
                  UC (Unidade Consumidora) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={uc}
                  onChange={(e) => setUc(e.target.value)}
                  placeholder="Ex: 374168800168"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 uppercase tracking-wide block mb-1">
                    03 — Consumo ativo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={valor03}
                    onChange={(e) => setValor03(e.target.value)}
                    placeholder="40"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono tracking-widest"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 uppercase tracking-wide block mb-1">
                    A3 — Ativo reverso
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={valorA3}
                    onChange={(e) => setValorA3(e.target.value)}
                    placeholder="1985"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono tracking-widest"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 uppercase tracking-wide block mb-1">
                  Telefone do solicitante <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="54991292121"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                />
              </div>

              <div className="p-2.5 bg-orange-50 border border-orange-200 rounded-xl text-[11px] text-orange-900 flex items-start gap-2">
                <Zap className="w-3.5 h-3.5 text-orange-600 shrink-0 mt-0.5" />
                <span>
                  A leitura é completada com zeros à esquerda até 5 dígitos — digitar{' '}
                  <strong>40</strong> envia <strong className="font-mono">00040</strong>. O robô
                  precisa estar rodando no PC da Delfos para pegar a fila.
                </span>
              </div>
            </>
          )}

          {erro && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {leituras.length > 1 && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                Histórico de envios
              </p>
              <div className="space-y-1">
                {leituras.slice(1).map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-gray-50 text-[10px]"
                  >
                    <span className="text-gray-600">
                      {new Date(l.created).toLocaleString('pt-BR')}
                    </span>
                    <span className="font-mono text-gray-700">
                      03={l.valor_03}
                      {l.valor_a3 ? ` · A3=${l.valor_a3}` : ''}
                    </span>
                    <span className="font-semibold text-gray-700">
                      {STATUS_INFO[l.status]?.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2">
          <button
            type="button"
            disabled={enviando}
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 rounded-xl hover:bg-gray-200/60 transition-colors"
          >
            Fechar
          </button>

          {!jaEnviada && (
            <button
              type="button"
              disabled={enviando || emAndamento}
              onClick={handleEnviar}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-orange-600 hover:bg-orange-700 shadow-sm disabled:opacity-50 transition-all"
            >
              {enviando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enviando para a fila...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{emAndamento ? 'Já está na fila' : 'Enviar para RGE'}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ModalEnviarLeituraRGE
