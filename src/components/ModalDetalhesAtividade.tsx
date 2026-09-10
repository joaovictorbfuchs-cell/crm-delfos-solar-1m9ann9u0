import React, { useState, useEffect } from 'react'
import {
  X,
  Calendar as CalendarIcon,
  User,
  Clock,
  Loader2,
  Building,
  CheckCircle2,
  AlertCircle,
  FileText,
  Tag,
  Save,
  CheckCircle,
  RotateCcw,
  ExternalLink,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { ClienteAutocomplete } from '@/components/ClienteAutocomplete'
import { ATIVIDADES_12_TIPOS, getTipoAtividadeConfig } from '@/constants/atividadesTipos'
import type { Atividade, AtividadeTipo, AtividadeStatus } from '@/types/crm'

interface ModalDetalhesAtividadeProps {
  isOpen: boolean
  onClose: () => void
  atividade: Atividade | null
  onSaved?: (updated: Atividade) => void
}

/** Converte ISO string (ou Date string) em valor compativel com input datetime-local no fuso horario local */
function toDateTimeLocalValue(isoOrDateStr?: string): string {
  if (!isoOrDateStr) return ''
  const d = new Date(isoOrDateStr)
  if (isNaN(d.getTime())) return ''
  // Subtrai offset de timezone para representação local YYYY-MM-DDTHH:mm
  const localDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return localDate.toISOString().slice(0, 16)
}

export const ModalDetalhesAtividade: React.FC<ModalDetalhesAtividadeProps> = ({
  isOpen,
  onClose,
  atividade,
  onSaved,
}) => {
  const { clientes, usuarios, updateAtividade, openFichaCliente } = useClientes()

  // Estados dos campos editáveis
  const [titulo, setTitulo] = useState('')
  const [tipo, setTipo] = useState<AtividadeTipo>('contato_ligacao')
  const [clienteId, setClienteId] = useState('')
  const [dataHora, setDataHora] = useState('')
  const [responsavelId, setResponsavelId] = useState('')
  const [descricao, setDescricao] = useState('')
  const [status, setStatus] = useState<AtividadeStatus>('pendente')

  // Controle de submissão e feedback
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [errors, setErrors] = useState<{
    titulo?: string
    cliente?: string
    dataHora?: string
    responsavel?: string
  }>({})
  const [showSuccessBadge, setShowSuccessBadge] = useState(false)

  // Preenchimento dos campos quando uma atividade é selecionada
  useEffect(() => {
    if (isOpen && atividade) {
      setTitulo(atividade.titulo || '')
      setTipo(atividade.tipo || 'contato_ligacao')
      setClienteId(atividade.cliente_id || '')
      setDataHora(toDateTimeLocalValue(atividade.data || atividade.created))
      setResponsavelId(atividade.responsavel_id || '')
      setDescricao(atividade.descricao || '')
      setStatus(atividade.status || 'pendente')
      setFormError(null)
      setErrors({})
      setShowSuccessBadge(false)
    }
  }, [isOpen, atividade])

  if (!isOpen || !atividade) return null

  const configAtual = getTipoAtividadeConfig(tipo)
  const IconAtual = configAtual.icon

  // Trata a alteração do tipo de atividade
  const handleTipoChange = (novoTipo: AtividadeTipo) => {
    setTipo(novoTipo)
    const conf = getTipoAtividadeConfig(novoTipo)
    // Se o título atual for vazio ou for o título padrão de outro tipo, sugere o novo título
    const currentConf = getTipoAtividadeConfig(tipo)
    if (!titulo.trim() || titulo.trim() === currentConf.tituloPadrao) {
      setTitulo(conf.tituloPadrao)
    }
  }

  // Validação dos campos obrigatórios
  const validate = () => {
    const newErrors: {
      titulo?: string
      cliente?: string
      dataHora?: string
      responsavel?: string
    } = {}

    if (!titulo.trim()) {
      newErrors.titulo = 'O título da atividade é obrigatório.'
    }
    if (!clienteId) {
      newErrors.cliente = 'Selecione um cliente vinculado.'
    }
    if (!dataHora) {
      newErrors.dataHora = 'Informe a data e horário da atividade.'
    }
    if (!responsavelId) {
      newErrors.responsavel = 'Selecione um usuário responsável.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      setFormError('Por favor, preencha todos os campos obrigatórios.')
      return
    }

    try {
      setIsSubmitting(true)
      setFormError(null)

      const selectedUser = usuarios.find((u) => u.id === responsavelId)
      const responsavelNome = selectedUser?.name || atividade.responsavel_nome || 'Responsável'

      const isoDate = dataHora ? new Date(dataHora).toISOString() : new Date().toISOString()

      const payload: Partial<Atividade> = {
        titulo: titulo.trim(),
        tipo,
        cliente_id: clienteId,
        data: isoDate,
        responsavel_id: responsavelId,
        responsavel_nome: responsavelNome,
        descricao: descricao.trim(),
        status,
      }

      const updated = await updateAtividade(atividade.id, payload)

      setShowSuccessBadge(true)
      if (onSaved) {
        onSaved(updated)
      }

      setTimeout(() => {
        setShowSuccessBadge(false)
        onClose()
      }, 700)
    } catch (err: unknown) {
      console.error('Falha ao atualizar atividade:', err)
      setFormError('Erro ao salvar alterações da atividade. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Ação rápida: Alternar status Pendente <-> Concluída dentro do modal
  const handleToggleStatusQuick = () => {
    setStatus((prev) => (prev === 'concluida' ? 'pendente' : 'concluida'))
  }

  const handleOpenClienteDetail = () => {
    if (clienteId) {
      onClose()
      openFichaCliente(clienteId)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop escuro com blur */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-200"
        onClick={() => {
          if (!isSubmitting) onClose()
        }}
        aria-hidden="true"
      />

      {/* Janela Modal */}
      <div className="relative z-50 w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Cabeçalho do Modal */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50/90 via-emerald-50/20 to-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-2xs shrink-0 border ${configAtual.iconBg}`}
              style={{ color: configAtual.corHex }}
            >
              <IconAtual className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-gray-900 leading-tight truncate">
                  Detalhes da Atividade
                </h2>
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${configAtual.badgeClass}`}
                >
                  {configAtual.tituloPadrao}
                </span>
                {status === 'concluida' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Concluída
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    <Clock className="w-3 h-3 text-amber-600" />
                    Pendente
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Edite as informações da atividade e confirme para atualizar o painel
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors ml-2 shrink-0 disabled:opacity-50"
            aria-label="Fechar"
            title="Cancelar e fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário com scroll vertical se necessário */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Alerta de erro geral se houver */}
          {formError && (
            <div className="text-xs text-red-700 bg-red-50 p-3 rounded-xl border border-red-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* Feedback de sucesso */}
          {showSuccessBadge && (
            <div className="text-xs text-emerald-800 bg-emerald-50 p-3 rounded-xl border border-emerald-200 flex items-center gap-2 animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">
                Atividade atualizada com sucesso no banco de dados!
              </span>
            </div>
          )}

          {/* 1. Título */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                Título da Atividade <span className="text-red-500">*</span>
              </span>
              <span className="text-[10px] text-gray-400 font-normal">
                Nome descritivo da tarefa
              </span>
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => {
                setTitulo(e.target.value)
                if (errors.titulo) setErrors((prev) => ({ ...prev, titulo: undefined }))
              }}
              placeholder="Ex: Entrar em contato para fechamento"
              required
              className={`w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border font-medium text-gray-900 bg-white transition-all focus:outline-none ${
                errors.titulo
                  ? 'border-red-300 ring-2 ring-red-200 bg-red-50/20'
                  : 'border-gray-200 focus:ring-2 focus:ring-emerald-500'
              }`}
            />
            {errors.titulo && <p className="text-[11px] text-red-600 mt-0.5">{errors.titulo}</p>}
          </div>

          {/* 2. Tipo de Atividade (Seletor dos 12 tipos com badges/ícones) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-emerald-600" />
                Tipo de Atividade <span className="text-red-500">*</span>
              </span>
              <span className="text-[10px] text-gray-500 font-normal">
                {configAtual.descricaoAjuda}
              </span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-gray-50/80 rounded-xl border border-gray-200">
              {ATIVIDADES_12_TIPOS.map((item) => {
                const ItemIcon = item.icon
                const isSelected = tipo === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleTipoChange(item.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-left text-xs transition-all ${
                      isSelected
                        ? 'bg-emerald-600 text-white font-bold shadow-2xs ring-1 ring-emerald-600'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-100'
                    }`}
                  >
                    <ItemIcon
                      className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-gray-500'}`}
                    />
                    <span className="truncate text-[11px]">{item.tituloPadrao}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 3. Cliente Vinculado (Autocomplete) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-emerald-600" />
                Cliente Vinculado <span className="text-red-500">*</span>
              </label>
              {clienteId && (
                <button
                  type="button"
                  onClick={handleOpenClienteDetail}
                  className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1 hover:underline"
                >
                  <span>Abrir ficha completa</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
            <ClienteAutocomplete
              clientes={clientes}
              value={clienteId}
              onChange={(id) => {
                setClienteId(id)
                if (errors.cliente) setErrors((prev) => ({ ...prev, cliente: undefined }))
                if (formError) setFormError(null)
              }}
              placeholder="Buscar cliente por nome ou cidade..."
              required
              error={Boolean(errors.cliente)}
            />
            {errors.cliente && <p className="text-[11px] text-red-600 mt-0.5">{errors.cliente}</p>}
          </div>

          {/* 4. Grid de Data/Hora e Responsável */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Data e Horário */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                Data e Horário Previsto <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={dataHora}
                onChange={(e) => {
                  setDataHora(e.target.value)
                  if (errors.dataHora) setErrors((prev) => ({ ...prev, dataHora: undefined }))
                }}
                required
                className={`w-full text-xs px-3 py-2.5 rounded-xl border bg-white text-gray-900 transition-all focus:outline-none ${
                  errors.dataHora
                    ? 'border-red-300 ring-2 ring-red-200 bg-red-50/20'
                    : 'border-gray-200 focus:ring-2 focus:ring-emerald-500'
                }`}
              />
              {errors.dataHora && (
                <p className="text-[11px] text-red-600 mt-0.5">{errors.dataHora}</p>
              )}
            </div>

            {/* Usuário Responsável */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                Usuário Responsável <span className="text-red-500">*</span>
              </label>
              <select
                value={responsavelId}
                onChange={(e) => {
                  setResponsavelId(e.target.value)
                  if (errors.responsavel) setErrors((prev) => ({ ...prev, responsavel: undefined }))
                }}
                required
                className={`w-full text-xs px-3 py-2.5 rounded-xl border bg-white text-gray-900 transition-all focus:outline-none ${
                  errors.responsavel
                    ? 'border-red-300 ring-2 ring-red-200 bg-red-50/20'
                    : 'border-gray-200 focus:ring-2 focus:ring-emerald-500'
                }`}
              >
                <option value="">Selecione o responsável...</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} {u.email ? `(${u.email})` : ''}
                  </option>
                ))}
              </select>
              {errors.responsavel && (
                <p className="text-[11px] text-red-600 mt-0.5">{errors.responsavel}</p>
              )}
            </div>
          </div>

          {/* 5. Status da Atividade (Pendente / Concluída) com alternador visual */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 block">
              Status da Atividade <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus('pendente')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  status === 'pendente'
                    ? 'bg-amber-50 border-amber-300 text-amber-900 ring-2 ring-amber-400/20 font-bold shadow-2xs'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Clock
                  className={`w-4 h-4 ${status === 'pendente' ? 'text-amber-600' : 'text-gray-400'}`}
                />
                <span>Pendente</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('concluida')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  status === 'concluida'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950 ring-2 ring-emerald-500/20 font-bold shadow-2xs'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <CheckCircle2
                  className={`w-4 h-4 ${status === 'concluida' ? 'text-emerald-600' : 'text-gray-400'}`}
                />
                <span>Concluída</span>
              </button>
            </div>
          </div>

          {/* 6. Descrição / Observações */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
              <span>Descrição / Observações</span>
              <span className="text-[10px] text-gray-400 font-normal">Opcional</span>
            </label>
            <textarea
              rows={3}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Detalhes adicionais, orientações técnicas, anotações de reunião ou histórico do atendimento..."
              className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none bg-white text-gray-900 leading-relaxed"
            />
          </div>
        </form>

        {/* Rodapé com Botões de Ação */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/70 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
          {/* Botão rápido para alternar conclusão */}
          <button
            type="button"
            onClick={handleToggleStatusQuick}
            disabled={isSubmitting}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-colors ${
              status === 'concluida'
                ? 'text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-200'
                : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
            }`}
          >
            {status === 'concluida' ? (
              <>
                <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                <span>Reabrir como Pendente</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Marcar como Concluída</span>
              </>
            )}
          </button>

          <div className="flex items-center justify-end gap-2">
            {/* Botão Cancelar: fecha sem salvar */}
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>

            {/* Botão Salvar: persiste no banco e atualiza */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors active:scale-95"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
