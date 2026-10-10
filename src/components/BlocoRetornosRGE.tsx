import React, { useState } from 'react'
import {
  FileText,
  Send,
  Plus,
  Clock,
  User,
  CheckCircle2,
  Loader2,
  CalendarDays,
  History,
  AlertCircle,
} from 'lucide-react'
import type { Atividade, RetornoRGEItem } from '@/types/crm'
import { useAuth } from '@/contexts/AuthContext'
import { PrazoRGEBadge } from '@/components/PrazoRGEBadge'

export interface BlocoRetornosRGEProps {
  atividade: Atividade
  statusAtual?: string
  prazoConclusaoRge?: string
  onChangePrazoConclusaoRge?: (novoPrazo: string) => void
  onAtualizarAtividade: (patch: Partial<Atividade>) => Promise<Atividade | void>
  onMarcarConcluida?: () => Promise<void> | void
  readOnly?: boolean
}

/**
 * Normaliza retornos_rge independente de como vem do PocketBase
 * (pode vir como Array, string JSON, null ou undefined).
 */
export function normalizarRetornosRGE(raw: unknown): RetornoRGEItem[] {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw
      .filter((item): item is RetornoRGEItem =>
        Boolean(item && typeof item === 'object' && item.texto),
      )
      .map((item) => ({
        id: item.id || `ret_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        texto: String(item.texto || '').trim(),
        dataHora: item.dataHora || new Date().toISOString(),
        autor: item.autor ? String(item.autor).trim() : undefined,
      }))
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return normalizarRetornosRGE(parsed)
    } catch {
      if (raw.trim()) {
        return [
          {
            id: `ret_legacy_${Date.now()}`,
            texto: raw.trim(),
            dataHora: new Date().toISOString(),
          },
        ]
      }
      return []
    }
  }
  return []
}

/**
 * Retorna o último retorno RGE para exibição resumida.
 */
export function obterUltimoRetornoRGE(raw: unknown): RetornoRGEItem | null {
  const lista = normalizarRetornosRGE(raw)
  if (lista.length === 0) return null
  return lista[lista.length - 1]
}

export const BlocoRetornosRGE: React.FC<BlocoRetornosRGEProps> = ({
  atividade,
  statusAtual,
  prazoConclusaoRge,
  onChangePrazoConclusaoRge,
  onAtualizarAtividade,
  onMarcarConcluida,
  readOnly = false,
}) => {
  const { userProfile, user } = useAuth()
  const nomeUsuarioLogado = userProfile?.name || user?.name || 'Equipe Delfos'

  const [novoRetornoTexto, setNovoRetornoTexto] = useState('')
  const [protocoloInput, setProtocoloInput] = useState(atividade.protocolo_atendimento || '')
  const [isSavingRetorno, setIsSavingRetorno] = useState(false)
  const [isSavingProtocolo, setIsSavingProtocolo] = useState(false)
  const [isMarkingConcluida, setIsMarkingConcluida] = useState(false)
  const [erroMsg, setErroMsg] = useState<string | null>(null)
  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null)

  // Estado local dos retornos para resposta rápida
  const retornosAtuais: RetornoRGEItem[] = normalizarRetornosRGE(atividade.retornos_rge)

  // Ordenação para exibição: mais recente primeiro
  const retornosOrdenados = [...retornosAtuais].sort((a, b) => {
    const timeA = new Date(a.dataHora).getTime() || 0
    const timeB = new Date(b.dataHora).getTime() || 0
    return timeB - timeA
  })

  const isConcluida =
    (statusAtual || atividade.status) === 'concluida' ||
    (statusAtual || atividade.status) === 'concluido'

  // Salvar novo retorno no histórico acumulável
  const handleAdicionarRetorno = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const textoLimpo = novoRetornoTexto.trim()
    if (!textoLimpo) return

    try {
      setIsSavingRetorno(true)
      setErroMsg(null)

      const novaEntrada: RetornoRGEItem = {
        id: `ret_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        texto: textoLimpo,
        dataHora: new Date().toISOString(),
        autor: nomeUsuarioLogado,
      }

      // IMPORTANTE: ACUMULA (append) sobre os retornos existentes — nunca sobrescreve o array inteiro
      const novosRetornos = [...retornosAtuais, novaEntrada]

      // Atualiza também retorno_rge textual de fallback para compatibilidade
      await onAtualizarAtividade({
        retornos_rge: novosRetornos,
        retorno_rge: textoLimpo,
      })

      setNovoRetornoTexto('')
      setSucessoMsg('Retorno adicionado ao histórico com sucesso!')
      setTimeout(() => setSucessoMsg(null), 3000)
    } catch (err: unknown) {
      console.error('Erro ao adicionar retorno RGE:', err)
      setErroMsg('Não foi possível gravar o retorno RGE. Tente novamente.')
    } finally {
      setIsSavingRetorno(false)
    }
  }

  // Salvar protocolo de atendimento RGE
  const handleSalvarProtocolo = async () => {
    const limpo = protocoloInput.trim()
    if (limpo === (atividade.protocolo_atendimento || '').trim()) return

    try {
      setIsSavingProtocolo(true)
      setErroMsg(null)
      await onAtualizarAtividade({
        protocolo_atendimento: limpo,
      })
      setSucessoMsg('Protocolo RGE salvo!')
      setTimeout(() => setSucessoMsg(null), 2500)
    } catch (err: unknown) {
      console.error('Erro ao salvar protocolo RGE:', err)
      setErroMsg('Não foi possível salvar o protocolo. Tente novamente.')
    } finally {
      setIsSavingProtocolo(false)
    }
  }

  // Ação direta "Concluída"
  const handleConcluirDireto = async () => {
    if (isConcluida) return
    try {
      setIsMarkingConcluida(true)
      setErroMsg(null)
      if (onMarcarConcluida) {
        await onMarcarConcluida()
      } else {
        await onAtualizarAtividade({
          status: 'concluida',
        })
      }
      setSucessoMsg('Atividade marcada como concluída!')
      setTimeout(() => setSucessoMsg(null), 3000)
    } catch (err: unknown) {
      console.error('Erro ao marcar atividade como concluída:', err)
      setErroMsg('Erro ao concluir a atividade.')
    } finally {
      setIsMarkingConcluida(false)
    }
  }

  return (
    <div className="space-y-3.5 p-4 rounded-2xl border border-teal-200 bg-teal-50/40 shadow-xs">
      {/* Cabeçalho da seção */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-teal-100 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-teal-100 text-teal-800">
            <FileText className="w-4 h-4 text-teal-700" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-900 leading-tight">
              Acompanhamento RGE — Troca de Titularidade
            </h3>
            <p className="text-[10px] text-gray-500">
              Protocolo, histórico acumulável de retornos e conclusão da troca
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <PrazoRGEBadge
            prazoStr={prazoConclusaoRge || atividade.prazo_conclusao_rge}
            concluida={isConcluida}
          />

          {!readOnly && !isConcluida && (
            <button
              type="button"
              onClick={handleConcluirDireto}
              disabled={isMarkingConcluida}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs disabled:opacity-50"
              title="Marcar esta atividade de troca de titularidade como concluída"
            >
              {isMarkingConcluida ? (
                <div className="contents">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Concluindo...</span>
                </div>
              ) : (
                <div className="contents">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Concluída</span>
                </div>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Alertas de erro e sucesso */}
      {erroMsg && (
        <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{erroMsg}</span>
        </div>
      )}
      {sucessoMsg && (
        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{sucessoMsg}</span>
        </div>
      )}

      {/* Linha 1: Protocolo de Atendimento e Prazo de Conclusão */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div>
          <label className="text-[11px] font-semibold text-gray-700 block mb-1">
            Protocolo de Atendimento RGE
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={protocoloInput}
              disabled={readOnly}
              onChange={(e) => setProtocoloInput(e.target.value)}
              onBlur={handleSalvarProtocolo}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSalvarProtocolo()
                }
              }}
              placeholder="Ex: RGE-2026-981244"
              className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono bg-white font-medium"
            />
            {!readOnly && (
              <button
                type="button"
                onClick={handleSalvarProtocolo}
                disabled={isSavingProtocolo}
                className="px-2.5 py-2 text-xs font-semibold bg-white border border-gray-200 text-teal-800 hover:bg-teal-50 rounded-xl transition-colors shrink-0 disabled:opacity-50"
                title="Salvar protocolo"
              >
                {isSavingProtocolo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Salvar'}
              </button>
            )}
          </div>
        </div>

        {/* Prazo de conclusão informado pela RGE */}
        <div>
          <label className="text-[11px] font-semibold text-gray-700 block mb-1 flex items-center justify-between">
            <span>Prazo de Conclusão da RGE</span>
            <CalendarDays className="w-3 h-3 text-teal-700" />
          </label>
          <input
            type="date"
            value={
              prazoConclusaoRge
                ? prazoConclusaoRge.slice(0, 10)
                : atividade.prazo_conclusao_rge
                  ? atividade.prazo_conclusao_rge.slice(0, 10)
                  : ''
            }
            disabled={readOnly}
            onChange={(e) => {
              const val = e.target.value
              if (onChangePrazoConclusaoRge) {
                onChangePrazoConclusaoRge(val)
              } else {
                onAtualizarAtividade({
                  prazo_conclusao_rge: val ? new Date(val + 'T12:00:00Z').toISOString() : null,
                })
              }
            }}
            className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white font-medium"
          />
        </div>
      </div>

      {/* Linha 2: Novo Protocolo / Retorno RGE com botão "Adicionar" (acumulável) */}
      {!readOnly && (
        <div className="space-y-1.5 pt-1">
          <label className="text-[11px] font-semibold text-gray-700 block flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Plus className="w-3.5 h-3.5 text-teal-700" />
              <span>Novo Protocolo / Retorno RGE</span>
            </span>
            <span className="text-[10px] text-gray-400 font-normal">
              Gera nova entrada no histórico com data/hora e autor
            </span>
          </label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-2">
            <textarea
              rows={2}
              value={novoRetornoTexto}
              onChange={(e) => setNovoRetornoTexto(e.target.value)}
              placeholder="Digite o novo retorno da concessionária, protocolo, exigência ou pendência..."
              className="flex-1 text-xs p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white resize-none leading-relaxed"
            />
            <button
              type="button"
              onClick={() => handleAdicionarRetorno()}
              disabled={isSavingRetorno || !novoRetornoTexto.trim()}
              className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
            >
              {isSavingRetorno ? (
                <div className="contents">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Gravando...</span>
                </div>
              ) : (
                <div className="contents">
                  <Send className="w-3.5 h-3.5" />
                  <span>Adicionar</span>
                </div>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Linha 3: Histórico Acumulável de Entradas Anteriores */}
      <div className="space-y-2 pt-2 border-t border-teal-100">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-teal-700" />
            <span>Histórico de Retornos RGE</span>
            <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-teal-100 text-teal-900 border border-teal-200">
              {retornosOrdenados.length}
            </span>
          </label>
          {retornosOrdenados.length > 0 && (
            <span className="text-[10px] text-gray-400">Mais recentes primeiro</span>
          )}
        </div>

        {retornosOrdenados.length === 0 ? (
          <div className="p-3 rounded-xl bg-white/70 border border-teal-100 text-center text-xs text-gray-500">
            Nenhum retorno RGE registrado ainda. Adicione uma entrada acima para registrar o
            protocolo e histórico de respostas da concessionária.
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {retornosOrdenados.map((item, idx) => {
              const dt = new Date(item.dataHora)
              const dataFormatada = !isNaN(dt.getTime())
                ? dt.toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : item.dataHora

              return (
                <div
                  key={item.id || `ret_${idx}`}
                  className="p-3 rounded-xl bg-white border border-teal-100 shadow-2xs space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[10px] text-gray-500 border-b border-gray-100 pb-1 flex-wrap gap-1">
                    <span className="inline-flex items-center gap-1 font-semibold text-teal-900">
                      <Clock className="w-3 h-3 text-teal-600" />
                      <span>{dataFormatada}</span>
                    </span>
                    {item.autor && (
                      <span className="inline-flex items-center gap-1 text-gray-600">
                        <User className="w-3 h-3 text-gray-400" />
                        <span>{item.autor}</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {item.texto}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default BlocoRetornosRGE
