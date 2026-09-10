import React, { useState, useEffect } from 'react'
import {
  X,
  Calendar as CalendarIcon,
  User,
  Clock,
  Loader2,
  Building,
  CheckCircle2,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { useAuth } from '@/contexts/AuthContext'
import {
  ATIVIDADES_12_TIPOS,
  getTipoAtividadeConfig,
  type TipoAtividadeDef,
} from '@/constants/atividadesTipos'
import type { AtividadeTipo } from '@/types/crm'

interface ModalNovaAtividadeProps {
  isOpen: boolean
  onClose: () => void
  initialTipo?: AtividadeTipo | null
  initialClienteId?: string | null
}

export const ModalNovaAtividade: React.FC<ModalNovaAtividadeProps> = ({
  isOpen,
  onClose,
  initialTipo,
  initialClienteId,
}) => {
  const { clientes, usuarios, addAtividade } = useClientes()
  const { user } = useAuth()

  const [selectedTipo, setSelectedTipo] = useState<AtividadeTipo>(initialTipo || 'contato_ligacao')
  const [titulo, setTitulo] = useState('')
  const [clienteId, setClienteId] = useState(initialClienteId || '')
  const [responsavelId, setResponsavelId] = useState('')
  const [dataHora, setDataHora] = useState(() => {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    return now.toISOString().slice(0, 16)
  })
  const [descricao, setDescricao] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState(false)

  // Quando abre ou muda o initialTipo, preenche automaticamente o título
  useEffect(() => {
    if (isOpen) {
      const tipoParaUsar = initialTipo || 'contato_ligacao'
      setSelectedTipo(tipoParaUsar)
      const conf = getTipoAtividadeConfig(tipoParaUsar)
      setTitulo(conf.tituloPadrao)
      if (initialClienteId) {
        setClienteId(initialClienteId)
      } else if (!clienteId && clientes.length > 0) {
        setClienteId(clientes[0].id)
      }

      // Definir responsável padrão: usuário logado se encontrado na lista, ou primeiro usuário
      if (!responsavelId) {
        const foundUser = usuarios.find((u) => u.email === user?.email || u.id === user?.id)
        if (foundUser) {
          setResponsavelId(foundUser.id)
        } else if (usuarios.length > 0) {
          setResponsavelId(usuarios[0].id)
        }
      }

      setFormError(null)
      setFormSuccess(false)
    }
  }, [isOpen, initialTipo, initialClienteId, clientes, usuarios, user])

  if (!isOpen) return null

  const handleTipoChange = (novoTipo: AtividadeTipo) => {
    setSelectedTipo(novoTipo)
    const conf = getTipoAtividadeConfig(novoTipo)
    // Regra do usuário: O nome do tipo clicado deve virar AUTOMATICAMENTE o título da atividade
    setTitulo(conf.tituloPadrao)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!clienteId) {
      setFormError('Por favor, selecione um cliente.')
      return
    }

    try {
      setIsSubmitting(true)
      setFormError(null)

      const conf = getTipoAtividadeConfig(selectedTipo)
      const finalTitulo = titulo.trim() || conf.tituloPadrao

      const selectedUser = usuarios.find((u) => u.id === responsavelId)
      const responsavelNome = selectedUser?.name || user?.name || 'João Delfos'

      await addAtividade({
        cliente_id: clienteId,
        tipo: selectedTipo,
        titulo: finalTitulo,
        descricao: descricao.trim(), // Descrição NÃO é obrigatória
        data: dataHora ? new Date(dataHora).toISOString() : new Date().toISOString(),
        responsavel_id: responsavelId || undefined,
        responsavel_nome: responsavelNome,
        status: 'pendente',
        autor: user?.name || 'João Delfos',
      })

      setFormSuccess(true)
      setTimeout(() => {
        setFormSuccess(false)
        onClose()
      }, 1000)
    } catch (err: unknown) {
      console.error('Falha ao agendar atividade:', err)
      setFormError('Erro ao agendar atividade. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const configAtual = getTipoAtividadeConfig(selectedTipo)
  const IconAtual = configAtual.icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop escuro */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Janela Modal */}
      <div className="relative z-50 w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Topo do modal */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-2xs ${configAtual.iconBg}`}
              style={{ color: configAtual.corHex }}
            >
              <IconAtual className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-gray-900 leading-tight">
                Registrar Atividade
              </h2>
              <p className="text-[11px] text-gray-500">
                Atribua tarefas e acompanhe no calendário e na lista de pendências
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 rounded-lg transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
          {/* Seletor rápido dos 12 tipos com badges */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 block">
              Tipo de Atividade (selecione para preencher o título)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto p-1 bg-gray-50/80 rounded-xl border border-gray-200">
              {ATIVIDADES_12_TIPOS.map((item) => {
                const ItemIcon = item.icon
                const isSelected = selectedTipo === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleTipoChange(item.id)}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-left text-xs transition-all ${
                      isSelected
                        ? 'bg-emerald-600 text-white font-bold shadow-2xs ring-1 ring-emerald-600'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-100'
                    }`}
                  >
                    <ItemIcon
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isSelected ? 'text-white' : 'text-gray-500'
                      }`}
                    />
                    <span className="truncate text-[11px]">{item.tituloPadrao}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Título Automático (editável) */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
              <span>Título da Atividade</span>
              <span className="text-[10px] text-emerald-600 font-normal">
                Preenchido automaticamente pelo tipo
              </span>
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Entrar em contato"
              required
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-gray-900 bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Cliente */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-gray-400" />
                Cliente Vinculado <span className="text-red-500">*</span>
              </label>
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                required
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900"
              >
                <option value="">Selecione um cliente...</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} {c.cidade ? `(${c.cidade})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Usuário Responsável */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                Usuário Responsável <span className="text-red-500">*</span>
              </label>
              <select
                value={responsavelId}
                onChange={(e) => setResponsavelId(e.target.value)}
                required
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900"
              >
                <option value="">Selecione o responsável...</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Data e Hora */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              Data e Horário Previsto <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={dataHora}
              onChange={(e) => setDataHora(e.target.value)}
              required
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900"
            />
          </div>

          {/* Descrição Detalhada (OPCIONAL) */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
              <span>Descrição / Observações</span>
              <span className="text-[10px] text-gray-400 font-normal">Opcional</span>
            </label>
            <textarea
              rows={3}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Detalhes adicionais, pauta combinada, links ou orientações técnicas (opcional)..."
              className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none bg-white text-gray-900"
            />
          </div>

          {formError && (
            <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
              {formError}
            </p>
          )}

          {formSuccess && (
            <div className="text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Atividade registrada com sucesso no calendário e na lista do responsável!</span>
            </div>
          )}

          {/* Ações */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !clienteId}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <CalendarIcon className="w-4 h-4" />
                  Confirmar e Agendar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
