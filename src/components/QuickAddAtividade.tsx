import React, { useState } from 'react'
import { FileText, Calendar, Loader2, User, ChevronDown } from 'lucide-react'
import type { AtividadeTipo, AtividadeStatus } from '@/types/crm'
import {
  ATIVIDADES_12_TIPOS,
  getTipoAtividadeConfig,
  type TipoAtividadeDef,
} from '@/constants/atividadesTipos'
import { useClientes } from '@/contexts/ClientesContext'
import { useAuth } from '@/contexts/AuthContext'

interface QuickAddAtividadeProps {
  clienteId: string
  onAdd: (data: {
    cliente_id: string
    tipo: AtividadeTipo
    titulo?: string
    descricao?: string
    data?: string
    autor?: string
    status?: AtividadeStatus
    responsavel_id?: string
    responsavel_nome?: string
  }) => Promise<unknown>
  defaultMode?: 'anotacao' | 'atividade'
  onSuccess?: () => void
}

export const QuickAddAtividade: React.FC<QuickAddAtividadeProps> = ({
  clienteId,
  onAdd,
  defaultMode = 'atividade',
  onSuccess,
}) => {
  const { usuarios } = useClientes()
  const { user } = useAuth()

  const [mode, setMode] = useState<'anotacao' | 'atividade'>(defaultMode)
  const [subTipo, setSubTipo] = useState<AtividadeTipo>('contato_ligacao')
  const [titulo, setTitulo] = useState(() => {
    return defaultMode === 'anotacao'
      ? 'Anotação interna'
      : getTipoAtividadeConfig('contato_ligacao').tituloPadrao
  })
  const [descricao, setDescricao] = useState('')
  const [responsavelId, setResponsavelId] = useState<string>(() => {
    return user?.id || (usuarios.length > 0 ? usuarios[0].id : '')
  })
  const [dataHora, setDataHora] = useState(() => {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    return now.toISOString().slice(0, 16)
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Atualiza responsavelId quando user ou usuarios carregarem se estiver vazio
  React.useEffect(() => {
    if (!responsavelId) {
      if (user?.id) {
        setResponsavelId(user.id)
      } else if (usuarios.length > 0) {
        setResponsavelId(usuarios[0].id)
      }
    }
  }, [user, usuarios, responsavelId])

  // Ao alternar para Anotação ou Atividade, ou ao mudar de subtipo:
  // "o nome do tipo escolhido também deve virar o título automaticamente. Descrição continua opcional. Substituir os 4 tipos antigos do quick add pelos mesmos 12 tipos (com ícones)"
  const handleSelectTipo = (tipoItem: TipoAtividadeDef) => {
    setSubTipo(tipoItem.id)
    setTitulo(tipoItem.tituloPadrao)
  }

  const handleModeChange = (newMode: 'anotacao' | 'atividade') => {
    setMode(newMode)
    if (newMode === 'anotacao') {
      setTitulo('Anotação interna')
    } else {
      const conf = getTipoAtividadeConfig(subTipo)
      setTitulo(conf.tituloPadrao)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setIsLoading(true)
      setError(null)

      const finalTipo: AtividadeTipo = mode === 'anotacao' ? 'anotacao' : subTipo
      const conf = getTipoAtividadeConfig(finalTipo)
      const finalTitulo =
        titulo.trim() || (mode === 'anotacao' ? 'Anotação de cliente' : conf.tituloPadrao)

      const selectedUser = usuarios.find((u) => u.id === responsavelId)
      const responsavelNome = selectedUser?.name || user?.name || 'João Delfos'

      await onAdd({
        cliente_id: clienteId,
        tipo: finalTipo,
        titulo: finalTitulo,
        descricao: descricao.trim(), // Descrição opcional
        data: dataHora ? new Date(dataHora).toISOString() : new Date().toISOString(),
        responsavel_id: responsavelId || undefined,
        responsavel_nome: responsavelNome,
        status: 'pendente',
        autor: user?.name || 'João Delfos',
      })

      // Limpar formulário mantendo o título coerente com o subtipo atual
      setDescricao('')
      if (mode === 'anotacao') {
        setTitulo('Anotação interna')
      } else {
        setTitulo(conf.tituloPadrao)
      }

      setSuccess(true)
      if (onSuccess) onSuccess()
      setTimeout(() => setSuccess(false), 2500)
    } catch (err: unknown) {
      console.error('Falha ao adicionar atividade/anotação:', err)
      setError('Não foi possível salvar. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-4 space-y-3.5">
      {/* Botões alternadores de modo: Anotação vs Atividade */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 gap-2 flex-wrap">
        <div className="flex items-center p-1 bg-gray-100 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => handleModeChange('atividade')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              mode === 'atividade'
                ? 'bg-white text-emerald-800 font-bold shadow-2xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            Agendar Atividade (12 Tipos)
          </button>

          <button
            type="button"
            onClick={() => handleModeChange('anotacao')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              mode === 'anotacao'
                ? 'bg-white text-amber-800 font-bold shadow-2xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-amber-500" />
            Nova Anotação
          </button>
        </div>

        <span className="text-[11px] text-gray-400 font-medium">
          {mode === 'atividade' ? '12 tipos de atividade Pipedrive' : 'Nota interna rápida'}
        </span>
      </div>
      {/* Grid de seleção dos 12 tipos como ícones com título atualizado automaticamente ao clicar */}
      {mode === 'atividade' && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-600">
              Escolha o tipo da atividade (define o título):
            </span>
            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {getTipoAtividadeConfig(subTipo).tituloPadrao}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5 p-1 bg-gray-50/70 rounded-xl border border-gray-100">
            {ATIVIDADES_12_TIPOS.map((item) => {
              const ItemIcon = item.icon
              const isSelected = subTipo === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectTipo(item)}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-left text-xs transition-all ${
                    isSelected
                      ? 'bg-[#16A34A] text-white font-bold shadow-2xs ring-1 ring-[#16A34A]'
                      : 'bg-white text-gray-700 hover:bg-emerald-50/50 hover:text-emerald-900 border border-gray-200/70'
                  }`}
                  title={`${item.tituloPadrao} — ${item.descricaoAjuda}`}
                >
                  <div
                    className={`p-1 rounded-md shrink-0 ${
                      isSelected ? 'bg-white/20 text-white' : `${item.iconBg} ${item.iconText}`
                    }`}
                  >
                    <ItemIcon className="w-3.5 h-3.5" />
                  </div>
                  <span className="truncate text-[11px] leading-tight">{item.tituloPadrao}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
      {/* Formulário: se Anotação, campo de texto simples e direto; se Atividade, título + data/hora + responsável + descrição opcional */}
      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === 'anotacao' ? (
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-gray-700 block">
              Conteúdo da Anotação
            </label>
            <textarea
              rows={3}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Escreva a anotação sobre a fatura, negociação, restrições ou observações internas..."
              className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none bg-white shadow-2xs"
              autoFocus
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              {/* Título (preenchido automaticamente ao clicar no ícone) */}
              <div className="sm:col-span-6">
                <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                  Título da Atividade
                </label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Título da atividade..."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                />
              </div>

              {/* Data e Hora */}
              <div className="sm:col-span-3">
                <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                  Data e Horário
                </label>
                <input
                  type="datetime-local"
                  value={dataHora}
                  onChange={(e) => setDataHora(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-700 bg-white"
                />
              </div>

              {/* Usuário Responsável (padrão: usuário logado) */}
              <div className="sm:col-span-3">
                <label className="text-[11px] font-semibold text-gray-600 block mb-1 flex items-center gap-1">
                  <User className="w-3 h-3 text-emerald-600" />
                  Responsável
                </label>
                <select
                  value={responsavelId}
                  onChange={(e) => setResponsavelId(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                >
                  {usuarios.length === 0 && user && (
                    <option value={user.id}>{user.name || user.email}</option>
                  )}
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} {user?.id === u.id ? '(Você)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Descrição Detalhada - Opcional */}
            <div>
              <label className="text-[11px] font-semibold text-gray-600 flex items-center justify-between mb-1">
                <span>Descrição detalhada</span>
                <span className="text-[10px] text-gray-400 font-normal">Opcional</span>
              </label>
              <textarea
                rows={2}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Detalhes adicionais da atividade, pauta da reunião ou observações técnicas (opcional)..."
                className="w-full text-xs p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none bg-white"
              />
            </div>
          </div>
        )}

        {error && <p className="text-[11px] text-red-600 font-medium">{error}</p>}
        {success && (
          <p className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
            ✓ {mode === 'anotacao' ? 'Anotação salva' : 'Atividade agendada'} com sucesso na
            timeline!
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
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
      </form>{' '}
    </div>
  )
}
