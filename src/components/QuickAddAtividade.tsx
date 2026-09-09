import React, { useState } from 'react'
import { FileText, Calendar, Send, Loader2, PhoneCall, Users, Wrench } from 'lucide-react'
import type { AtividadeTipo } from '@/types/crm'

interface QuickAddAtividadeProps {
  clienteId: string
  onAdd: (data: {
    cliente_id: string
    tipo: AtividadeTipo
    titulo?: string
    descricao: string
    data?: string
    autor?: string
  }) => Promise<unknown>
  defaultMode?: 'anotacao' | 'atividade'
}

export const QuickAddAtividade: React.FC<QuickAddAtividadeProps> = ({
  clienteId,
  onAdd,
  defaultMode = 'anotacao',
}) => {
  const [mode, setMode] = useState<'anotacao' | 'atividade'>(defaultMode)
  const [subTipo, setSubTipo] = useState<AtividadeTipo>('ligacao')
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [dataHora, setDataHora] = useState(() => {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    return now.toISOString().slice(0, 16)
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!descricao.trim()) {
      setError('Por favor, informe a descrição.')
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const finalTipo: AtividadeTipo = mode === 'anotacao' ? 'anotacao' : subTipo
      const finalTitulo =
        titulo.trim() ||
        (mode === 'anotacao'
          ? 'Nova anotação'
          : subTipo === 'ligacao'
            ? 'Ligação telefônica'
            : subTipo === 'reuniao'
              ? 'Reunião comercial'
              : subTipo === 'proposta'
                ? 'Envio de proposta'
                : 'Visita técnica')

      await onAdd({
        cliente_id: clienteId,
        tipo: finalTipo,
        titulo: finalTitulo,
        descricao: descricao.trim(),
        data: dataHora ? new Date(dataHora).toISOString() : new Date().toISOString(),
        autor: 'João Silva',
      })

      setTitulo('')
      setDescricao('')
    } catch (err: unknown) {
      console.error('Falha ao adicionar atividade/anotação:', err)
      setError('Não foi possível salvar. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200/90 shadow-xs p-3.5 space-y-3">
      {/* Botões alternadores rápidos de modo */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-2.5 gap-2">
        <div className="flex items-center p-0.5 bg-gray-100 rounded-lg text-xs font-medium">
          <button
            type="button"
            onClick={() => setMode('anotacao')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              mode === 'anotacao'
                ? 'bg-white text-emerald-800 font-bold shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-amber-500" />
            Nova Anotação
          </button>
          <button
            type="button"
            onClick={() => setMode('atividade')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              mode === 'atividade'
                ? 'bg-white text-emerald-800 font-bold shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            Agendar Atividade
          </button>
        </div>

        {mode === 'atividade' && (
          <div className="flex items-center gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => setSubTipo('ligacao')}
              className={`p-1.5 rounded-md text-xs flex items-center gap-1 transition-colors ${
                subTipo === 'ligacao'
                  ? 'bg-blue-100 text-blue-800 font-bold'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
              title="Ligação"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Ligação</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTipo('reuniao')}
              className={`p-1.5 rounded-md text-xs flex items-center gap-1 transition-colors ${
                subTipo === 'reuniao'
                  ? 'bg-purple-100 text-purple-800 font-bold'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
              title="Reunião"
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Reunião</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTipo('proposta')}
              className={`p-1.5 rounded-md text-xs flex items-center gap-1 transition-colors ${
                subTipo === 'proposta'
                  ? 'bg-emerald-100 text-emerald-800 font-bold'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
              title="Proposta"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Proposta</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTipo('visita_tecnica')}
              className={`p-1.5 rounded-md text-xs flex items-center gap-1 transition-colors ${
                subTipo === 'visita_tecnica'
                  ? 'bg-teal-100 text-teal-800 font-bold'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
              title="Visita Técnica"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Visita</span>
            </button>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder={
              mode === 'anotacao'
                ? 'Título da anotação (opcional)...'
                : 'Título da atividade (ex: Reunião com diretoria)...'
            }
            className="sm:col-span-2 text-xs px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />

          <input
            type="datetime-local"
            value={dataHora}
            onChange={(e) => setDataHora(e.target.value)}
            className="text-xs px-2.5 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-700 bg-white"
          />
        </div>

        <textarea
          rows={2}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder={
            mode === 'anotacao'
              ? 'Escreva uma anotação sobre o cliente (ex: ligou querendo saber do desconto no inversor)...'
              : 'Descreva a atividade agendada ou realizada...'
          }
          className="w-full text-xs p-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
        />

        {error && <p className="text-[11px] text-red-600 font-medium">{error}</p>}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="submit"
            disabled={isLoading || !descricao.trim()}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Salvando...
              </>
            ) : mode === 'anotacao' ? (
              <>
                <FileText className="w-3.5 h-3.5" />
                Salvar Anotação
              </>
            ) : (
              <>
                <Calendar className="w-3.5 h-3.5" />
                Agendar Atividade
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
