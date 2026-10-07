import React, { useState, useEffect, useCallback } from 'react'
import {
  X,
  Calendar as CalendarIcon,
  User,
  Clock,
  Loader2,
  Building,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  FileText,
  Tag,
  Save,
  CheckCircle,
  RotateCcw,
  ExternalLink,
  Send,
  CalendarDays,
  Sparkles,
  Plus,
  Trash2,
  Layers,
  FileCheck,
  Sun,
} from 'lucide-react'
import { PrazoRGEBadge } from '@/components/PrazoRGEBadge'
import { useClientes } from '@/contexts/ClientesContext'
import { ModalEnviarLembreteAutoLeituraWhatsApp } from './ModalEnviarLembreteAutoLeituraWhatsApp'
import { ModalRegistrarDadosLeitura } from './ModalRegistrarDadosLeitura'
import { ClienteAutocomplete } from '@/components/ClienteAutocomplete'
import {
  ATIVIDADES_12_TIPOS,
  getTipoAtividadeConfig,
  isCategoriaManutencaoOuAdministrativa,
  MSG_USINA_OBRIGATORIA,
} from '@/constants/atividadesTipos'
import { fetchUsinasByClienteId } from '@/services/crmService'
import type { UsinaCliente } from '@/types/crm'
import {
  somarMinutos,
  calcularDiferencaMinutos,
  formatarDuracao,
  HORAS_24,
  MINUTOS_PASSO_5,
  DURACOES_PREVISTAS_SUGESTOES,
} from '@/lib/horarios'
import type { Atividade, AtividadeTipo, AtividadeStatus } from '@/types/crm'
import {
  buscarAtividadesFilhasAutoLeitura,
  sincronizarFilhasNovas,
  excluirFilhaPorData,
  normalizarDatasLeitura,
  formatarDataParaDDMMAAAA,
} from '@/services/autoLeituraService'
import {
  SecaoCustosDeslocamentoAtividade,
  type CustosDeslocamentoValues,
} from './SecaoCustosDeslocamentoAtividade'
interface ModalDetalhesAtividadeProps {
  isOpen: boolean
  onClose: () => void
  atividade: Atividade | null
  onSuccess?: (atividadeAtualizada?: Atividade) => void
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
  onSuccess,
  onSaved,
}) => {
  const { clientes, usuarios, updateAtividade, openFichaCliente } = useClientes()

  // Estados dos campos editáveis
  const [titulo, setTitulo] = useState('')
  const [tipo, setTipo] = useState<AtividadeTipo>('contato_ligacao')
  const [clienteId, setClienteId] = useState('')
  const [usinasDoCliente, setUsinasDoCliente] = useState<UsinaCliente[]>([])
  const [selectedUsinaId, setSelectedUsinaId] = useState<string>('')
  const [dataHora, setDataHora] = useState('')
  // Campos de início, fim e duração prevista para atividades de manutenção
  const [horarioInicio, setHorarioInicio] = useState<string>('08:00')
  const [horarioFim, setHorarioFim] = useState<string>('09:00')
  const [duracaoMinutos, setDuracaoMinutos] = useState<number>(60)
  const [responsavelId, setResponsavelId] = useState('')
  const [responsavelAvisoBloqueio, setResponsavelAvisoBloqueio] = useState<string | null>(null)
  const [descricao, setDescricao] = useState('')
  const [status, setStatus] = useState<AtividadeStatus>('pendente')

  // Usuários válidos cadastrados no projeto
  const usuariosValidosCadastrados = React.useMemo(() => {
    return (usuarios || []).filter((u) => u && u.id && u.name)
  }, [usuarios])

  const clienteAtual = clientes.find((c) => c.id === (clienteId || atividade?.cliente_id))

  // Campos específicos de Solicitar contas RGE
  const [protocoloAtendimento, setProtocoloAtendimento] = useState('')
  const [retornoRge, setRetornoRge] = useState('')
  const [prazoConclusaoRge, setPrazoConclusaoRge] = useState('')
  const [numeroUc, setNumeroUc] = useState('')
  const [enderecoUc, setEnderecoUc] = useState('')
  const [documentoTitular, setDocumentoTitular] = useState('')
  const [emailDestinatario, setEmailDestinatario] = useState('')

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
  const [custosValores, setCustosValores] = useState<CustosDeslocamentoValues | null>(null)

  // Estados dedicados para Auto Leitura RGE mãe e filhas
  const [datasLeituraAutoLeitura, setDatasLeituraAutoLeitura] = useState<string[]>([])
  const [novaDataInput, setNovaDataInput] = useState<string>('')
  const [filhasAutoLeitura, setFilhasAutoLeitura] = useState<Atividade[]>([])
  const [carregandoFilhas, setCarregandoFilhas] = useState(false)

  const recarregarFilhas = useCallback(async () => {
    if (!atividade?.id) return
    try {
      setCarregandoFilhas(true)
      const filhas = await buscarAtividadesFilhasAutoLeitura(atividade.id)
      setFilhasAutoLeitura(filhas)
    } catch (err) {
      console.warn('Erro ao carregar filhas de auto leitura:', err)
    } finally {
      setCarregandoFilhas(false)
    }
  }, [atividade?.id])

  // Modais de ação para lembrete de auto leitura (WhatsApp e Registro de Leitura)
  const [modalLembreteWhatsAppOpen, setModalLembreteWhatsAppOpen] = useState(false)
  const [modalRegistrarLeituraOpen, setModalRegistrarLeituraOpen] = useState(false)
  const [atividadeFilhaAlvo, setAtividadeFilhaAlvo] = useState<Atividade | null>(null)

  // Preenchimento dos campos quando uma atividade é selecionada
  useEffect(() => {
    if (isOpen && atividade) {
      setTitulo(atividade.titulo || '')
      const tipoAtv = atividade.tipo || 'contato_ligacao'
      setTipo(tipoAtv)
      setClienteId(atividade.cliente_id || '')
      setSelectedUsinaId(atividade.usina_id || '')
      const dtLocal = toDateTimeLocalValue(atividade.data || atividade.created)
      setDataHora(dtLocal)

      // Inicializa horários de manutenção
      const horaPadrao = dtLocal && dtLocal.length >= 16 ? dtLocal.slice(11, 16) : '08:00'
      const inicioAtual = atividade.horario_inicio || horaPadrao
      const durAtual =
        typeof atividade.duracao_minutos === 'number' && atividade.duracao_minutos > 0
          ? atividade.duracao_minutos
          : 60
      const fimAtual = atividade.horario_fim || somarMinutos(inicioAtual, durAtual)

      setHorarioInicio(inicioAtual)
      setHorarioFim(fimAtual)
      setDuracaoMinutos(durAtual)

      setResponsavelId(atividade.responsavel_id || '')
      setDescricao(atividade.descricao || '')
      setStatus((atividade.status as 'pendente' | 'concluida') || 'pendente')

      // Inicializa campos de acompanhamento RGE
      setProtocoloAtendimento(atividade.protocolo_atendimento || '')
      setRetornoRge(atividade.retorno_rge || '')
      setPrazoConclusaoRge(
        atividade.prazo_conclusao_rge ? atividade.prazo_conclusao_rge.slice(0, 10) : '',
      )
      setNumeroUc(atividade.numero_uc || '')
      setEnderecoUc(atividade.endereco_uc || '')
      setDocumentoTitular(atividade.documento_titular || '')
      setEmailDestinatario(atividade.email_destinatario || '')

      // Se for Auto Leitura RGE mãe, carrega datas_leitura e filhas
      if (tipoAtv === 'auto_leitura_rge') {
        const norm = normalizarDatasLeitura(atividade.datas_leitura)
        setDatasLeituraAutoLeitura(norm)
        setNovaDataInput('')
        recarregarFilhas()
      } else {
        setDatasLeituraAutoLeitura([])
        setFilhasAutoLeitura([])
      }

      setFormError(null)
      setErrors({})
      setShowSuccessBadge(false)
    }
  }, [isOpen, atividade])

  // Carrega usinas do cliente selecionado para permitir seleção e validação
  useEffect(() => {
    if (!isOpen || !clienteId) {
      setUsinasDoCliente([])
      return
    }
    let isMounted = true
    fetchUsinasByClienteId(clienteId)
      .then((lista) => {
        if (!isMounted) return
        setUsinasDoCliente(lista || [])
        // Se ainda não tiver usina selecionada e a atividade tiver apenas 1 usina cadastrada
        if (!selectedUsinaId && lista && lista.length === 1) {
          setSelectedUsinaId(lista[0].id)
        }
      })
      .catch((err) => {
        console.warn('Erro ao buscar usinas do cliente no modal de detalhes:', err)
        if (isMounted) setUsinasDoCliente([])
      })
    return () => {
      isMounted = false
    }
  }, [isOpen, clienteId, selectedUsinaId])

  if (!isOpen || !atividade) return null

  const configAtual = getTipoAtividadeConfig(tipo)
  const IconAtual = configAtual.icon

  // Lógica bidirecional de Horário Início, Fim e Duração para Manutenção
  const handleHorarioInicioChange = (novoInicio: string) => {
    setHorarioInicio(novoInicio)
    const dataBase =
      dataHora && dataHora.length >= 10
        ? dataHora.slice(0, 10)
        : new Date().toISOString().slice(0, 10)
    setDataHora(`${dataBase}T${novoInicio}`)
    const duracaoAtual = duracaoMinutos > 0 ? duracaoMinutos : 60
    const novoFim = somarMinutos(novoInicio, duracaoAtual)
    setHorarioFim(novoFim)
  }

  const handleHorarioFimChange = (novoFim: string) => {
    setHorarioFim(novoFim)
    const novaDuracao = calcularDiferencaMinutos(horarioInicio, novoFim)
    setDuracaoMinutos(novaDuracao)
  }

  const handleDuracaoChange = (novaDuracao: number) => {
    const duracaoSegura = isNaN(novaDuracao) || novaDuracao < 0 ? 0 : novaDuracao
    setDuracaoMinutos(duracaoSegura)
    const novoFim = somarMinutos(horarioInicio, duracaoSegura)
    setHorarioFim(novoFim)
  }

  // Trata a alteração do tipo de atividade
  const handleTipoChange = (novoTipo: AtividadeTipo) => {
    setTipo(novoTipo)
    const conf = getTipoAtividadeConfig(novoTipo)
    // Se o título atual for vazio ou for o título padrão de outro tipo, sugere o novo título
    const currentConf = getTipoAtividadeConfig(tipo)
    if (!titulo.trim() || titulo.trim() === currentConf.tituloPadrao) {
      setTitulo(conf.tituloPadrao)
    }

    // Se o novo tipo não for de manutenção, checa se o responsável atual é instalador/técnico
    if (conf.categoria !== 'manutencao' && responsavelId) {
      const respAtual = usuariosValidosCadastrados.find((u) => u.id === responsavelId)
      if (
        respAtual &&
        (respAtual.role === 'instalador' || (respAtual.role as string) === 'tecnico')
      ) {
        const outro = usuariosValidosCadastrados.find(
          (u) => u.role !== 'instalador' && (u.role as string) !== 'tecnico',
        )
        setResponsavelId(outro ? outro.id : '')
        setResponsavelAvisoBloqueio(
          'O responsável anterior (instalador/técnico) foi desvinculado porque só recebe atividades de manutenção.',
        )
      } else {
        setResponsavelAvisoBloqueio(null)
      }
    } else {
      setResponsavelAvisoBloqueio(null)
    }
  }

  // Adiciona nova data de leitura
  const handleAddDataLeitura = () => {
    if (!novaDataInput) return
    const dataLimpa = novaDataInput.slice(0, 10)
    if (!datasLeituraAutoLeitura.includes(dataLimpa)) {
      setDatasLeituraAutoLeitura((prev) => [...prev, dataLimpa].sort())
    }
    setNovaDataInput('')
    setFormError(null)
  }

  // Remove uma data de leitura da mãe (com confirmação para apagar a filha correspondente se existir)
  const handleRemoveDataLeitura = async (dataParaRemover: string) => {
    const filhaCorrespondente = filhasAutoLeitura.find(
      (f) => (f.data_leitura || f.data || '').slice(0, 10) === dataParaRemover,
    )

    if (filhaCorrespondente) {
      const confirmou = window.confirm(
        `Deseja excluir também a atividade filha "Lembrete de Auto Leitura" (${formatarDataParaDDMMAAAA(
          dataParaRemover,
        )})?`,
      )
      if (confirmou) {
        try {
          await excluirFilhaPorData(atividade.id, dataParaRemover, filhasAutoLeitura)
          setFilhasAutoLeitura((prev) => prev.filter((f) => f.id !== filhaCorrespondente.id))
        } catch (err) {
          console.error('Erro ao excluir atividade filha:', err)
        }
      }
    }

    setDatasLeituraAutoLeitura((prev) => prev.filter((d) => d !== dataParaRemover))
  }

  const isAutoLeitura = tipo === 'auto_leitura_rge' || atividade?.tipo === 'auto_leitura_rge'

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
    if (!isAutoLeitura && !dataHora) {
      newErrors.dataHora = 'Informe a data e horário da atividade.'
    }
    if (!responsavelId) {
      newErrors.responsavel = 'Selecione um usuário responsável.'
    }

    // Validação de usina obrigatória para atividades de manutenção e administrativas
    const precisaUsina = isCategoriaManutencaoOuAdministrativa(configAtual.categoria)
    const usinaIdLimpaValidacao =
      selectedUsinaId && selectedUsinaId.trim() ? selectedUsinaId.trim() : ''

    if (precisaUsina && !usinaIdLimpaValidacao) {
      setFormError(MSG_USINA_OBRIGATORIA)
      return false
    }

    // Auto Leitura RGE precisa de pelo menos 1 data de leitura
    if (isAutoLeitura && datasLeituraAutoLeitura.length === 0) {
      setFormError('Informe pelo menos uma data de leitura para a Auto Leitura RGE.')
      return false
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
      const isManutencao = configAtual.categoria === 'manutencao'

      const usinaIdLimpa = selectedUsinaId && selectedUsinaId.trim() ? selectedUsinaId.trim() : null

      const payload: Record<string, unknown> = {
        titulo: titulo.trim(),
        tipo,
        cliente_id: clienteId,
        usina_id: usinaIdLimpa,
        data: isoDate,
        ...(isManutencao
          ? {
              horario_inicio: horarioInicio,
              horario_fim: horarioFim,
              duracao_minutos: duracaoMinutos,
            }
          : {}),
        responsavel_id: responsavelId,
        responsavel_nome: responsavelNome,
        descricao: descricao.trim(),
        status,
        valor_servico: custosValores?.valorServico ?? atividade.valor_servico,
        valor_por_placa: custosValores?.valorPorPlaca ?? atividade.valor_por_placa,
        qtd_modulos: custosValores?.qtdModulos ?? atividade.qtd_modulos,
        cobrar_deslocamento: custosValores?.cobrarDeslocamento ?? atividade.cobrar_deslocamento,
        distancia_km: custosValores?.distanciaKm ?? atividade.distancia_km,
        valor_km: custosValores?.valorKm ?? atividade.valor_km,
        custo_deslocamento: custosValores?.custoDeslocamento ?? atividade.custo_deslocamento,
        custo_placas: custosValores?.custoPlacas ?? atividade.custo_placas,
        custo_total: custosValores?.custoTotal ?? atividade.custo_total,
      }

      // Se for solicitar_contas_rge ou tiver dados da RGE, persiste
      if (tipo === 'solicitar_contas_rge') {
        payload.protocolo_atendimento = protocoloAtendimento.trim()
        payload.retorno_rge = retornoRge.trim()
        payload.prazo_conclusao_rge = prazoConclusaoRge
          ? new Date(prazoConclusaoRge + 'T12:00:00Z').toISOString()
          : null
        payload.numero_uc = numeroUc.trim()
        payload.endereco_uc = enderecoUc.trim()
        payload.documento_titular = documentoTitular.trim()
        payload.email_destinatario = emailDestinatario.trim()
      }

      // Se for auto_leitura_rge, persiste datas_leitura e numero_uc
      if (tipo === 'auto_leitura_rge') {
        payload.datas_leitura = datasLeituraAutoLeitura
        if (numeroUc) {
          payload.numero_uc = numeroUc.trim()
        }
      }

      const updated = await updateAtividade(atividade.id, payload as Partial<Atividade>)

      // Se for auto_leitura_rge, sincroniza filhas novas (deduplicando)
      if (tipo === 'auto_leitura_rge' && atividade.id) {
        await sincronizarFilhasNovas(
          {
            maeId: atividade.id,
            clienteId,
            usinaId: usinaIdLimpa || atividade.usina_id,
            numeroUc: numeroUc || atividade.numero_uc,
            datasLeitura: datasLeituraAutoLeitura,
            responsavelId,
            responsavelNome,
            autor: atividade.autor,
          },
          filhasAutoLeitura,
        )
      }

      setShowSuccessBadge(true)
      if (onSaved) {
        onSaved(updated)
      }
      if (onSuccess) {
        onSuccess(updated)
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
    setFormError(null)
    setStatus((prev) => (prev === 'concluida' ? 'pendente' : 'concluida'))
  }

  const handleOpenClienteDetail = () => {
    if (clienteId) {
      onClose()
      openFichaCliente(clienteId)
    }
  }

  const isFilhaLembrete =
    tipo === 'lembrete_auto_leitura' || atividade.tipo === 'lembrete_auto_leitura'
  const podeEnviarWhatsApp = isFilhaLembrete && (status === 'pendente' || status === 'enviado')
  const podeRegistrarLeitura = isFilhaLembrete && status !== 'concluida'

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
          <div className="space-y-1 relative z-20">
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

          {/* Campo de Vínculo de Usina (obrigatória para manutenção e administrativa) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                <Sun className="w-3.5 h-3.5 text-[#E0A838]" />
                <span>Usina Vinculada</span>
                {isCategoriaManutencaoOuAdministrativa(configAtual.categoria) ? (
                  <span className="text-red-500">*</span>
                ) : (
                  <span className="text-[10px] text-gray-400 font-normal">(opcional)</span>
                )}
              </label>
              {isCategoriaManutencaoOuAdministrativa(configAtual.categoria) && (
                <span className="text-[10px] text-amber-700 font-medium">
                  Obrigatória para{' '}
                  {configAtual.categoria === 'manutencao' ? 'manutenção' : 'administrativa'}
                </span>
              )}
            </div>

            {usinasDoCliente.length === 0 ? (
              <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 text-xs flex items-center justify-between">
                <span>Nenhuma usina encontrada para este cliente.</span>
                {isCategoriaManutencaoOuAdministrativa(configAtual.categoria) && (
                  <span className="text-[11px] text-red-600 font-semibold">Usina obrigatória</span>
                )}
              </div>
            ) : (
              <select
                value={selectedUsinaId}
                onChange={(e) => {
                  setSelectedUsinaId(e.target.value)
                  if (formError === MSG_USINA_OBRIGATORIA) setFormError(null)
                }}
                required={isCategoriaManutencaoOuAdministrativa(configAtual.categoria)}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900"
              >
                <option value="">
                  {isCategoriaManutencaoOuAdministrativa(configAtual.categoria)
                    ? 'Selecione a usina (obrigatória)...'
                    : 'Nenhuma usina vinculada (geral do cliente)'}
                </option>
                {usinasDoCliente.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome} {u.potencia_kwp ? `(${u.potencia_kwp} kWp)` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 4. Grid de Data/Hora e Responsável */}
          <div className="space-y-3">
            {configAtual.categoria === 'manutencao' ? (
              <div className="space-y-2.5 p-3 rounded-xl border border-sky-200 bg-sky-50/40">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Data da Manutenção */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-gray-700 block">
                      Data da Atividade <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={dataHora ? dataHora.slice(0, 10) : ''}
                      onChange={(e) => {
                        const novaData = e.target.value
                        const horaAtual = horarioInicio || '08:00'
                        if (novaData) {
                          setDataHora(`${novaData}T${horaAtual}`)
                          if (errors.dataHora)
                            setErrors((prev) => ({ ...prev, dataHora: undefined }))
                        }
                      }}
                      required
                      className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900 font-medium"
                    />
                  </div>

                  {/* Usuário Responsável */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-gray-700 block">
                      Usuário Responsável <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={responsavelId}
                      onChange={(e) => {
                        const targetUser = usuariosValidosCadastrados.find(
                          (u) => u.id === e.target.value,
                        )
                        const isPerfilTecnico =
                          targetUser?.role === 'instalador' ||
                          (targetUser?.role as string) === 'tecnico'
                        if (isPerfilTecnico && configAtual.categoria !== 'manutencao') {
                          setResponsavelAvisoBloqueio(
                            'Este perfil (instalador/técnico) só pode receber atividades do tipo manutenção.',
                          )
                          return
                        }
                        setResponsavelAvisoBloqueio(null)
                        setResponsavelId(e.target.value)
                        if (errors.responsavel)
                          setErrors((prev) => ({ ...prev, responsavel: undefined }))
                      }}
                      required
                      className="w-full text-xs px-2.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900"
                    >
                      <option value="">Selecione o responsável...</option>
                      {usuariosValidosCadastrados.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} {u.role ? `[${u.role}]` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Linha com Horário Início, Horário Fim e Duração Prevista */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-sky-100">
                  {/* Horário de Início */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700 flex items-center gap-1">
                      <span>Horário de Início</span>
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-1">
                      <select
                        value={horarioInicio.split(':')[0] || '08'}
                        onChange={(e) => {
                          const h = e.target.value.padStart(2, '0')
                          const m = horarioInicio.split(':')[1] || '00'
                          handleHorarioInicioChange(`${h}:${m}`)
                        }}
                        className="w-full text-xs px-1.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900 font-mono font-medium"
                      >
                        {HORAS_24.map((h) => (
                          <option key={`edit-ini-h-${h}`} value={h}>
                            {h}h
                          </option>
                        ))}
                      </select>
                      <select
                        value={(() => {
                          const mRaw = parseInt(horarioInicio.split(':')[1] || '0', 10) || 0
                          const mRound = Math.round(mRaw / 5) * 5
                          const mBound = mRound >= 60 ? 55 : mRound
                          return String(mBound).padStart(2, '0')
                        })()}
                        onChange={(e) => {
                          const h = horarioInicio.split(':')[0] || '08'
                          const m = e.target.value
                          handleHorarioInicioChange(`${h}:${m}`)
                        }}
                        className="w-full text-xs px-1.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900 font-mono font-medium"
                      >
                        {MINUTOS_PASSO_5.map((m) => (
                          <option key={`edit-ini-m-${m}`} value={m}>
                            {m}m
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Horário de Fim */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700 flex items-center gap-1">
                      <span>Horário de Fim</span>
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-1">
                      <select
                        value={horarioFim.split(':')[0] || '09'}
                        onChange={(e) => {
                          const h = e.target.value.padStart(2, '0')
                          const m = horarioFim.split(':')[1] || '00'
                          handleHorarioFimChange(`${h}:${m}`)
                        }}
                        className="w-full text-xs px-1.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900 font-mono font-medium"
                      >
                        {HORAS_24.map((h) => (
                          <option key={`edit-fim-h-${h}`} value={h}>
                            {h}h
                          </option>
                        ))}
                      </select>
                      <select
                        value={(() => {
                          const mRaw = parseInt(horarioFim.split(':')[1] || '0', 10) || 0
                          const mRound = Math.round(mRaw / 5) * 5
                          const mBound = mRound >= 60 ? 55 : mRound
                          return String(mBound).padStart(2, '0')
                        })()}
                        onChange={(e) => {
                          const h = horarioFim.split(':')[0] || '09'
                          const m = e.target.value
                          handleHorarioFimChange(`${h}:${m}`)
                        }}
                        className="w-full text-xs px-1.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900 font-mono font-medium"
                      >
                        {MINUTOS_PASSO_5.map((m) => (
                          <option key={`edit-fim-m-${m}`} value={m}>
                            {m}m
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Duração Prevista (Editável) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-gray-700">
                        Duração Prevista
                      </label>
                      <span className="text-[10px] font-extrabold text-sky-800 bg-sky-100 px-1.5 py-0.2 rounded border border-sky-200">
                        {formatarDuracao(duracaoMinutos)}
                      </span>
                    </div>
                    <select
                      value={duracaoMinutos}
                      onChange={(e) => handleDuracaoChange(parseInt(e.target.value, 10))}
                      className="w-full text-xs px-2 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900 font-medium"
                    >
                      {DURACOES_PREVISTAS_SUGESTOES.map((d) => (
                        <option key={`edit-dur-${d.minutos}`} value={d.minutos}>
                          {d.label}
                        </option>
                      ))}
                      {!DURACOES_PREVISTAS_SUGESTOES.some((d) => d.minutos === duracaoMinutos) && (
                        <option value={duracaoMinutos}>
                          {formatarDuracao(duracaoMinutos)} (personalizado)
                        </option>
                      )}
                    </select>
                  </div>
                </div>

                <p className="text-[10px] text-sky-900/80">
                  Previsão padrão: 1 hora. Alterar o fim recalcula a duração, e alterar a duração
                  recalcula o fim.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {!isAutoLeitura && (
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
                )}

                <div className={`space-y-1 ${isAutoLeitura ? 'sm:col-span-2' : ''}`}>
                  <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    Usuário Responsável <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={responsavelId}
                    onChange={(e) => {
                      const targetUser = usuariosValidosCadastrados.find(
                        (u) => u.id === e.target.value,
                      )
                      const isPerfilTecnico =
                        targetUser?.role === 'instalador' ||
                        (targetUser?.role as string) === 'tecnico'
                      if (isPerfilTecnico && configAtual.categoria !== 'manutencao') {
                        setResponsavelAvisoBloqueio(
                          'Este perfil (instalador/técnico) só pode receber atividades do tipo manutenção.',
                        )
                        return
                      }
                      setResponsavelAvisoBloqueio(null)
                      setResponsavelId(e.target.value)
                      if (errors.responsavel)
                        setErrors((prev) => ({ ...prev, responsavel: undefined }))
                    }}
                    required
                    className={`w-full text-xs px-3 py-2.5 rounded-xl border bg-white text-gray-900 transition-all focus:outline-none ${
                      errors.responsavel
                        ? 'border-red-300 ring-2 ring-red-200 bg-red-50/20'
                        : 'border-gray-200 focus:ring-2 focus:ring-emerald-500'
                    }`}
                  >
                    <option value="">Selecione o responsável...</option>
                    {usuariosValidosCadastrados.map((u) => {
                      const isPerfilTecnico =
                        u.role === 'instalador' || (u.role as string) === 'tecnico'
                      const bloqueado = isPerfilTecnico && configAtual.categoria !== 'manutencao'
                      return (
                        <option key={u.id} value={u.id} disabled={bloqueado}>
                          {u.name} {u.role ? `[${u.role}]` : ''}{' '}
                          {bloqueado ? '— (somente manutenção)' : ''}
                        </option>
                      )
                    })}
                  </select>
                </div>
              </div>
            )}
            {responsavelAvisoBloqueio && (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded-lg flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>{responsavelAvisoBloqueio}</span>
              </p>
            )}
            {errors.responsavel && (
              <p className="text-[11px] text-red-600 mt-0.5">{errors.responsavel}</p>
            )}
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

          {/* Seção de Custos e Deslocamento na edição de detalhes (apenas para Atividades de Manutenção) */}
          {clienteId && configAtual.categoria === 'manutencao' && (
            <SecaoCustosDeslocamentoAtividade
              enderecoCliente={clienteAtual?.endereco}
              cidadeCliente={clienteAtual?.cidade}
              usinaSelecionada={atividade.expand?.usina_id}
              valorBaseSugerido={configAtual.valor_base}
              valorPorPlacaSugerido={configAtual.valor_por_placa}
              categoria={configAtual.categoria}
              initialValues={{
                valorServico: atividade.valor_servico,
                valorPorPlaca: atividade.valor_por_placa,
                qtdModulos: atividade.qtd_modulos,
                cobrarDeslocamento: atividade.cobrar_deslocamento !== false,
                distanciaKm: atividade.distancia_km,
                valorKm: atividade.valor_km,
              }}
              onChange={setCustosValores}
            />
          )}

          {/* SEÇÃO ESPECIAL: AUTO LEITURA RGE (MÃE E ATIVIDADES FILHAS) */}
          {tipo === 'auto_leitura_rge' && (
            <div className="space-y-4 p-4 rounded-2xl border border-orange-200 bg-orange-50/40 shadow-xs">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-orange-100 pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-orange-100 text-orange-800">
                    <CalendarDays className="w-4 h-4 text-orange-700" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 leading-tight">
                      Auto Leitura RGE — Ciclo de Leituras
                    </h3>
                    <p className="text-[10px] text-gray-500">
                      Gerencie as datas de leitura da UC e as atividades de lembrete filhas
                    </p>
                  </div>
                </div>

                <span className="text-[11px] font-bold text-orange-800 bg-orange-100 px-2 py-0.5 rounded-full border border-orange-200">
                  Total: {datasLeituraAutoLeitura.length} datas
                </span>
              </div>

              {/* Número da UC */}
              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                  Número da UC (Unidade Consumidora)
                </label>
                <input
                  type="text"
                  value={numeroUc}
                  onChange={(e) => setNumeroUc(e.target.value)}
                  placeholder="Ex: 4004280183"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono bg-white font-medium"
                />
              </div>

              {/* Campo para adicionar nova data de leitura */}
              <div className="space-y-2 pt-2 border-t border-orange-100">
                <label className="text-[11px] font-semibold text-gray-700 block">
                  Adicionar nova data de leitura
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={novaDataInput}
                    onChange={(e) => setNovaDataInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddDataLeitura()
                      }
                    }}
                    className="text-xs px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleAddDataLeitura}
                    disabled={!novaDataInput}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50 rounded-xl transition-colors shadow-2xs shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar</span>
                  </button>
                </div>
              </div>

              {/* Lista das Atividades Filhas / Datas vinculadas */}
              <div className="space-y-2 pt-2 border-t border-orange-100">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-orange-600" />
                    Atividades Filhas de Lembrete ({datasLeituraAutoLeitura.length})
                  </span>
                  {carregandoFilhas && (
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Atualizando...
                    </span>
                  )}
                </div>

                {datasLeituraAutoLeitura.length === 0 ? (
                  <p className="text-xs text-gray-400 italic text-center py-2 bg-white rounded-xl border border-dashed border-gray-200">
                    Nenhuma data de leitura cadastrada.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {datasLeituraAutoLeitura.map((dt, idx) => {
                      const filha = filhasAutoLeitura.find(
                        (f) => (f.data_leitura || f.data || '').slice(0, 10) === dt,
                      )
                      const dataLembreteFormatada = filha?.data_lembrete
                        ? new Date(filha.data_lembrete).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : `${formatarDataParaDDMMAAAA(
                            new Date(new Date(dt + 'T12:00:00Z').getTime() - 2 * 86400000)
                              .toISOString()
                              .slice(0, 10),
                          )} às 08:00`

                      const statusFilha = filha?.status || 'pendente'

                      return (
                        <div
                          key={dt}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-orange-100/90 text-xs shadow-2xs hover:border-orange-300 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-gray-900">
                                  Leitura: {formatarDataParaDDMMAAAA(dt)}
                                </span>
                                {statusFilha === 'concluida' ? (
                                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-flex items-center gap-1">
                                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                    Concluída
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 inline-flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5 text-amber-600" />
                                    Pendente
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-500 mt-0.5">
                                Lembrete: <strong>{dataLembreteFormatada}</strong>
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveDataLeitura(dt)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0 ml-2"
                            title="Remover data e excluir atividade filha correspondente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SEÇÃO ESPECIAL: ACOMPANHAMENTO PÓS-ENVIO RGE */}
          {tipo === 'solicitar_contas_rge' && (
            <div className="space-y-3.5 p-4 rounded-2xl border border-sky-200 bg-sky-50/40 shadow-xs">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-sky-100 pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-sky-100 text-sky-800">
                    <Send className="w-4 h-4 text-sky-700" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 leading-tight">
                      Acompanhamento da Solicitação RGE
                    </h3>
                    <p className="text-[10px] text-gray-500">
                      Protocolo, prazos e retorno oficial da concessionária
                    </p>
                  </div>
                </div>

                <PrazoRGEBadge prazoStr={prazoConclusaoRge} concluida={status === 'concluida'} />
              </div>

              {/* Registro do disparo do e-mail ou aviso de falha */}
              {atividade.email_enviado_em ? (
                <div className="p-2.5 rounded-xl bg-white border border-sky-100 text-[11px] text-sky-900 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>
                      E-mail enviado para{' '}
                      <strong>{atividade.email_destinatario || 'concessionária'}</strong> em{' '}
                      {new Date(atividade.email_enviado_em).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  {atividade.email_resend_id && (
                    <span className="text-[11px] font-mono text-gray-500">
                      ID: {atividade.email_resend_id.slice(0, 16)}...
                    </span>
                  )}
                </div>
              ) : (
                (atividade.email_envio_status === 'falha' || atividade.email_log_erro) && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-amber-800">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Envio de e-mail com pendência ou erro</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed font-mono">
                      {atividade.email_log_erro || 'Falha reportada durante o disparo via Resend.'}
                    </p>{' '}
                    {atividade.email_destinatario && (
                      <p className="text-[10px] text-rose-600">
                        Destinatário previsto: {atividade.email_destinatario}
                      </p>
                    )}
                  </div>
                )
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Protocolo de Atendimento */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                    Protocolo de Atendimento RGE
                  </label>
                  <input
                    type="text"
                    value={protocoloAtendimento}
                    onChange={(e) => setProtocoloAtendimento(e.target.value)}
                    placeholder="Ex: RGE-2026-981244"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono bg-white font-medium"
                  />
                </div>

                {/* Prazo de conclusão informado pela RGE */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-700 block mb-1 flex items-center justify-between">
                    <span>Prazo de Conclusão da RGE</span>
                    <CalendarDays className="w-3 h-3 text-sky-600" />
                  </label>
                  <input
                    type="date"
                    value={prazoConclusaoRge}
                    onChange={(e) => setPrazoConclusaoRge(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white font-medium"
                  />
                </div>

                {/* Número da UC */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                    Número da UC
                  </label>
                  <input
                    type="text"
                    value={numeroUc}
                    onChange={(e) => setNumeroUc(e.target.value)}
                    placeholder="Número da Unidade Consumidora"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono bg-white"
                  />
                </div>

                {/* Documento Titular */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                    Documento do Titular (CPF/CNPJ)
                  </label>
                  <input
                    type="text"
                    value={documentoTitular}
                    onChange={(e) => setDocumentoTitular(e.target.value)}
                    placeholder="CPF ou CNPJ informado"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono bg-white"
                  />
                </div>

                {/* Endereço da UC */}
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                    Endereço da Unidade Consumidora
                  </label>
                  <input
                    type="text"
                    value={enderecoUc}
                    onChange={(e) => setEnderecoUc(e.target.value)}
                    placeholder="Endereço da UC informado"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                  />
                </div>

                {/* Retorno da RGE (texto livre) */}
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                    Retorno da RGE (texto livre)
                  </label>
                  <textarea
                    rows={2}
                    value={retornoRge}
                    onChange={(e) => setRetornoRge(e.target.value)}
                    placeholder="Descreva o retorno oficial recebido, pendências solicitadas pela concessionária ou orientações da resposta..."
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white resize-none leading-relaxed"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SEÇÃO ESPECIAL: LINK DO RELATÓRIO DE ANÁLISE DE FATURA */}
          {tipo === 'analise_fatura' && (
            <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/50 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  Relatório da Análise de Fatura RGE
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100 px-2 py-0.5 rounded-full">
                  Inteligência Gemini
                </span>
              </div>
              <p className="text-[11px] text-emerald-800">
                Esta atividade possui auditoria detalhada com KPIs de geração, desdobramento
                tarifário, GD e impostos.
              </p>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const col = await import('@/lib/pocketbase/client').then((m) =>
                      m.default.collection('analises_fatura').getList(1, 1, {
                        filter: `atividade_id = '${atividade.id}' || cliente_id = '${clienteId}'`,
                        sort: '-created',
                      }),
                    )
                    if (col.items.length > 0) {
                      window.open(`/relatorio-fatura/${col.items[0].token}`, '_blank')
                    } else {
                      alert('Nenhuma análise vinculada encontrada para esta atividade.')
                    }
                  } catch (e) {
                    console.warn(e)
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir Relatório Completo</span>
              </button>
            </div>
          )}

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

          <div className="flex items-center justify-end gap-2 flex-wrap">
            {/* Ações Específicas da Atividade Filha de Auto Leitura */}
            {podeEnviarWhatsApp && (
              <button
                type="button"
                onClick={() => {
                  setAtividadeFilhaAlvo(atividade)
                  setModalLembreteWhatsAppOpen(true)
                }}
                className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                title="Enviar lembrete por WhatsApp via Z-API"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{status === 'enviado' ? 'Reenviar WhatsApp' : 'Enviar WhatsApp'}</span>
              </button>
            )}

            {podeRegistrarLeitura && (
              <button
                type="button"
                onClick={() => {
                  setAtividadeFilhaAlvo(atividade)
                  setModalRegistrarLeituraOpen(true)
                }}
                className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                title="Registrar dados da leitura e concluir atividade mãe e filha"
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>Registrar dados da leitura</span>
              </button>
            )}

            {/* Botão Cancelar: fecha sem salvar */}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>

            {/* Botão Salvar: persiste no banco e atualiza */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
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

      {/* Modais de Ação para Atividade Filha (Lembrete de Auto Leitura) */}
      {modalLembreteWhatsAppOpen && (
        <ModalEnviarLembreteAutoLeituraWhatsApp
          isOpen={modalLembreteWhatsAppOpen}
          onClose={() => {
            setModalLembreteWhatsAppOpen(false)
            setAtividadeFilhaAlvo(null)
          }}
          atividade={atividadeFilhaAlvo || atividade}
          cliente={clienteAtual}
          onEnviadoSucesso={(atvAtualizada) => {
            if (atvAtualizada && atvAtualizada.id === atividade.id) {
              setStatus(atvAtualizada.status || 'enviado')
            }
            recarregarFilhas()
            if (onSuccess) onSuccess(atvAtualizada)
            if (onSaved && atvAtualizada) onSaved(atvAtualizada)
          }}
        />
      )}

      {modalRegistrarLeituraOpen && (
        <ModalRegistrarDadosLeitura
          isOpen={modalRegistrarLeituraOpen}
          onClose={() => {
            setModalRegistrarLeituraOpen(false)
            setAtividadeFilhaAlvo(null)
          }}
          atividade={atividadeFilhaAlvo || atividade}
          cliente={clienteAtual}
          onSalvoSucesso={(atvAtualizada) => {
            if (atvAtualizada && atvAtualizada.id === atividade.id) {
              setStatus('concluida')
            }
            recarregarFilhas()
            if (onSuccess) onSuccess(atvAtualizada)
            if (onSaved && atvAtualizada) onSaved(atvAtualizada)
          }}
        />
      )}
    </div>
  )
}
