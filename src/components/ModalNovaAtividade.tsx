import React, { useState, useEffect } from 'react'
import {
  X,
  Calendar as CalendarIcon,
  User,
  Clock,
  Loader2,
  Building,
  CheckCircle2,
  Sun,
  Plus,
  Trash2,
  CalendarDays,
  FileText,
  Sparkles,
  AlertTriangle,
  Briefcase,
} from 'lucide-react'
import { ModalSolicitarContasRGE } from '@/components/ModalSolicitarContasRGE'
import { ModalCriarAnaliseFatura } from '@/components/ModalCriarAnaliseFatura'
import { useClientes } from '@/contexts/ClientesContext'
import { useAuth } from '@/contexts/AuthContext'
import { ClienteAutocomplete } from '@/components/ClienteAutocomplete'
import { fetchUsinasByClienteId } from '@/services/crmService'
import { formatarDataParaDDMMAAAA, sincronizarFilhasNovas } from '@/services/autoLeituraService'
import {
  calcularCustosAtividade,
  getConfiguracaoDeslocamento,
  estimarDistanciaDelfosCliente,
} from '@/lib/calculoDeslocamentoAtividades'
import {
  CATEGORIAS_ATIVIDADES,
  ATIVIDADES_PADRAO,
  getTipoAtividadeConfig,
  buildCustomTipoDef,
  deduplicarTiposAtividades,
  isCategoriaManutencaoOuAdministrativa,
  MSG_USINA_OBRIGATORIA,
  type TipoAtividadeDef,
} from '@/constants/atividadesTipos'
import {
  somarMinutos,
  calcularDiferencaMinutos,
  formatarDuracao,
  HORAS_24,
  MINUTOS_PASSO_5,
  DURACOES_PREVISTAS_SUGESTOES,
} from '@/lib/horarios'
import type { AtividadeCategoriaId, AtividadeTipo, UsinaCliente } from '@/types/crm'

interface ProgramacaoLeituraItem {
  id: string
  dataPrevista: string // Formato YYYY-MM-DD para o input tipo date nativo
  responsavel: 'Cliente' | 'Distribuidora'
}

const ITENS_EXEMPLO_PROGRAMACAO: ProgramacaoLeituraItem[] = [
  { id: 'exemplo-1', dataPrevista: '2026-10-07', responsavel: 'Cliente' },
  { id: 'exemplo-2', dataPrevista: '2026-11-09', responsavel: 'Cliente' },
  { id: 'exemplo-3', dataPrevista: '2026-12-09', responsavel: 'Distribuidora' },
]

const formatarParaDDMMAAAA = (dataStr: string): string => {
  if (!dataStr) return ''
  const partes = dataStr.split('-')
  if (partes.length === 3) {
    const [ano, mes, dia] = partes
    return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${ano}`
  }
  return dataStr
}

interface ModalNovaAtividadeProps {
  isOpen: boolean
  onClose: () => void
  initialTipo?: AtividadeTipo | null
  initialClienteId?: string | null
  initialUsinaId?: string | null
  initialNegocioId?: string | null
  usinas?: UsinaCliente[]
  apenasManutencao?: boolean
  onAtividadeCriada?: () => void
}

export interface ProgramarLeituraAnoLinha {
  dataPrevista: string // DD/MM/AAAA ou YYYY-MM-DD
  responsavel: 'Cliente' | 'Distribuidora'
}

export { ModalEditarTipoAtividade } from '@/components/ModalEditarTipoAtividade'
export type { TipoAtividadeDef } from '@/constants/atividadesTipos'

// Aliases para edição de tipos de atividades se invocado como ModalNovaAtividade (ou reutilizado)
export interface ModalNovaAtividadeEdicaoProps {
  isOpen?: boolean
  open?: boolean
  onClose?: () => void
  onOpenChange?: (open: boolean) => void
  tipoParaEditar?: any
  atividadeParaEditar?: any
  padraoParaEditar?: any
  onSuccess?: () => void
}

export const ModalNovaAtividade: React.FC<ModalNovaAtividadeProps> = ({
  isOpen,
  onClose,
  initialTipo,
  initialClienteId,
  initialUsinaId,
  initialNegocioId,
  usinas: usinasProp,
  apenasManutencao = false,
  onAtividadeCriada,
}) => {
  const { clientes, usuarios, addAtividade, tiposAtividadesCustom } = useClientes()
  const { user } = useAuth()

  const [selectedCategoria, setSelectedCategoria] = useState<AtividadeCategoriaId>(() => {
    if (apenasManutencao) return 'manutencao'
    return 'comercial'
  })
  const [selectedTipo, setSelectedTipo] = useState<AtividadeTipo>(() => {
    if (apenasManutencao) return initialTipo || 'visita_tecnica'
    return initialTipo || 'contato_ligacao'
  })
  const [titulo, setTitulo] = useState('')
  const [clienteId, setClienteId] = useState(initialClienteId || '')
  const [usinasDoCliente, setUsinasDoCliente] = useState<UsinaCliente[]>(usinasProp || [])
  const [selectedUsinaId, setSelectedUsinaId] = useState<string>(initialUsinaId || '')
  const [negociosDoCliente, setNegociosDoCliente] = useState<import('@/types/crm').Negocio[]>([])
  const [selectedNegocioId, setSelectedNegocioId] = useState<string>(initialNegocioId || '')
  const [responsavelId, setResponsavelId] = useState('')
  const [dataHora, setDataHora] = useState(() => {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    return now.toISOString().slice(0, 16)
  })
  // Campos de início, fim e duração prevista para atividades de manutenção
  const [horarioInicio, setHorarioInicio] = useState<string>('08:00')
  const [horarioFim, setHorarioFim] = useState<string>('09:00')
  const [duracaoMinutos, setDuracaoMinutos] = useState<number>(60)
  const [descricao, setDescricao] = useState('')

  // Estados dedicados para Auto Leitura RGE
  const [numeroUcAutoLeitura, setNumeroUcAutoLeitura] = useState<string>('')
  const [datasLeituraAutoLeitura, setDatasLeituraAutoLeitura] = useState<string[]>([])
  const [novaDataInput, setNovaDataInput] = useState<string>('')

  const [programacaoLeituras, setProgramacaoLeituras] =
    useState<ProgramacaoLeituraItem[]>(ITENS_EXEMPLO_PROGRAMACAO)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState(false)
  const [isModalSolicitarContasOpen, setIsModalSolicitarContasOpen] = useState(false)
  const [isModalAnaliseFaturaOpen, setIsModalAnaliseFaturaOpen] = useState(false)
  const [responsavelAvisoBloqueio, setResponsavelAvisoBloqueio] = useState<string | null>(null)

  // Usuários válidos cadastrados no projeto (apenas com id real de PocketBase)
  const usuariosValidosCadastrados = React.useMemo(() => {
    return (usuarios || []).filter((u) => u && u.id && u.name)
  }, [usuarios])

  // Quando abre ou muda o initialTipo, preenche automaticamente o título
  useEffect(() => {
    if (isOpen) {
      const tipoParaUsar = apenasManutencao
        ? initialTipo || 'visita_tecnica'
        : initialTipo || 'contato_ligacao'
      setSelectedTipo(tipoParaUsar)
      if (apenasManutencao) {
        setSelectedCategoria('manutencao')
        const conf = getTipoAtividadeConfig(tipoParaUsar)
        setTitulo(conf.tituloPadrao)
      } else {
        const conf = getTipoAtividadeConfig(tipoParaUsar)
        setSelectedCategoria(conf.categoria || 'comercial')
        setTitulo(conf.tituloPadrao)
      }
      if (initialClienteId) {
        setClienteId(initialClienteId)
      } else {
        setClienteId('')
      }
      if (initialUsinaId) {
        setSelectedUsinaId(initialUsinaId)
      }
      if (initialNegocioId) {
        setSelectedNegocioId(initialNegocioId)
      }

      // Reset / inicialização dos horários de manutenção: início da dataHora atual ou 08:00, fim +1h, duração 60min
      const horaPadrao = dataHora && dataHora.length >= 16 ? dataHora.slice(11, 16) : '08:00'
      setHorarioInicio(horaPadrao)
      setHorarioFim(somarMinutos(horaPadrao, 60))
      setDuracaoMinutos(60)

      if (tipoParaUsar === 'auto_leitura_rge') {
        setDatasLeituraAutoLeitura([])
        setNovaDataInput('')
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
  }, [
    isOpen,
    initialTipo,
    initialClienteId,
    initialUsinaId,
    initialNegocioId,
    clientes,
    usuarios,
    user,
  ])

  // Carregar ou sincronizar negócios do cliente selecionado e aplicar sugestão automática inteligente
  useEffect(() => {
    if (!isOpen) return
    let isMounted = true

    if (!clienteId) {
      setNegociosDoCliente([])
      setSelectedNegocioId(initialNegocioId || '')
      return
    }

    import('@/services/negociosService').then(({ fetchNegociosByClienteId }) => {
      fetchNegociosByClienteId(clienteId)
        .then((lista) => {
          if (!isMounted) return
          setNegociosDoCliente(lista || [])
          // Se initialNegocioId foi fornecido e existe nesta lista, mantém
          if (initialNegocioId && lista.some((n) => n.id === initialNegocioId)) {
            setSelectedNegocioId(initialNegocioId)
            return
          }
          // Regra do usuário: se cliente tem UM ÚNICO negócio em andamento (não fechado/ganho, não perdido), sugere pré-selecionado
          const emAndamento = (lista || []).filter(
            (n) =>
              n.status === 'em andamento' || (!n.status && n.etapa_funil !== 'contrato assinado'),
          )
          if (emAndamento.length === 1) {
            setSelectedNegocioId(emAndamento[0].id)
          } else if (!initialNegocioId) {
            setSelectedNegocioId('')
          }
        })
        .catch((err) => {
          console.warn('Erro ao buscar negócios do cliente no ModalNovaAtividade:', err)
          if (isMounted) setNegociosDoCliente([])
        })
    })

    return () => {
      isMounted = false
    }
  }, [isOpen, clienteId, initialNegocioId])

  // Carregar ou sincronizar usinas do cliente selecionado
  useEffect(() => {
    if (!isOpen) return

    let isMounted = true

    // Se veio via prop e bate com o cliente selecionado
    const cli = clientes.find((c) => c.id === clienteId)

    if (usinasProp && usinasProp.length > 0 && initialClienteId === clienteId) {
      setUsinasDoCliente(usinasProp)
      const usinaAlvo = initialUsinaId ? usinasProp.find((u) => u.id === initialUsinaId) : null
      const usinaPref = usinaAlvo || (usinasProp.length === 1 ? usinasProp[0] : null)
      setSelectedUsinaId(usinaPref?.id || initialUsinaId || '')
      setNumeroUcAutoLeitura(usinaPref?.numero_uc || cli?.uc || '')
      return
    }

    if (!clienteId) {
      setUsinasDoCliente([])
      setSelectedUsinaId(initialUsinaId || '')
      setNumeroUcAutoLeitura('')
      return
    }

    fetchUsinasByClienteId(clienteId)
      .then((lista) => {
        if (!isMounted) return
        setUsinasDoCliente(lista || [])
        const usinaAlvo = initialUsinaId ? lista?.find((u) => u.id === initialUsinaId) : null
        if (usinaAlvo) {
          setSelectedUsinaId(usinaAlvo.id)
          setNumeroUcAutoLeitura(usinaAlvo.numero_uc || cli?.uc || '')
        } else if (lista && lista.length === 1) {
          setSelectedUsinaId(lista[0].id)
          setNumeroUcAutoLeitura(lista[0].numero_uc || cli?.uc || '')
        } else {
          setSelectedUsinaId(initialUsinaId || '')
          setNumeroUcAutoLeitura(cli?.uc || '')
        }
      })
      .catch((err) => {
        console.warn('Erro ao buscar usinas do cliente no modal de atividade:', err)
        if (isMounted) {
          setUsinasDoCliente([])
          setSelectedUsinaId(initialUsinaId || '')
          setNumeroUcAutoLeitura(cli?.uc || '')
        }
      })

    return () => {
      isMounted = false
    }
  }, [isOpen, clienteId, usinasProp, initialClienteId, initialUsinaId])

  const customDefs = React.useMemo(() => {
    return (tiposAtividadesCustom || []).map((t) => buildCustomTipoDef(t))
  }, [tiposAtividadesCustom])

  const tiposDaCategoria = React.useMemo(() => {
    const padroes = ATIVIDADES_PADRAO.filter((t) => t.categoria === selectedCategoria)
    const customs = customDefs.filter((t) => t.categoria === selectedCategoria)
    return deduplicarTiposAtividades(padroes, customs)
  }, [selectedCategoria, customDefs])

  if (!isOpen) return null

  const handleCategoriaChange = (catId: AtividadeCategoriaId) => {
    setSelectedCategoria(catId)
    const firstOfCat =
      ATIVIDADES_PADRAO.find((t) => t.categoria === catId) ||
      customDefs.find((t) => t.categoria === catId)
    if (firstOfCat) {
      setSelectedTipo(firstOfCat.id)
      setTitulo(firstOfCat.tituloPadrao)
    }

    // Se a nova categoria não for manutenção, verifica se o responsável atual é instalador/técnico
    if (catId !== 'manutencao' && responsavelId) {
      const respAtual = usuariosValidosCadastrados.find((u) => u.id === responsavelId)
      if (
        respAtual &&
        (respAtual.role === 'instalador' || (respAtual.role as string) === 'tecnico')
      ) {
        // Redefine para outro usuário válido que não seja técnico/instalador, ou limpa
        const outroUsuario = usuariosValidosCadastrados.find(
          (u) => u.role !== 'instalador' && (u.role as string) !== 'tecnico',
        )
        if (outroUsuario) {
          setResponsavelId(outroUsuario.id)
        } else {
          setResponsavelId('')
        }
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

  const handleTipoChange = (novoTipo: AtividadeTipo) => {
    setSelectedTipo(novoTipo)
    const conf = getTipoAtividadeConfig(novoTipo, customDefs)
    // Regra do usuário: O nome do tipo clicado deve virar AUTOMATICAMENTE o título da atividade
    setTitulo(conf.tituloPadrao)
    if (novoTipo === 'auto_leitura_rge') {
      // Se tiver UC preenchida, incrementa o título conforme padrão "Auto Leitura RGE - UC <numero>"
      if (numeroUcAutoLeitura) {
        setTitulo(`Auto Leitura RGE - UC ${numeroUcAutoLeitura}`)
      }
    } else if (novoTipo === 'solicitar_contas_rge') {
      setIsModalSolicitarContasOpen(true)
    } else if (novoTipo === 'analise_fatura') {
      setIsModalAnaliseFaturaOpen(true)
    }
  }

  // Handlers do campo especial de MÚLTIPLAS datas de leitura (Auto Leitura RGE)
  const handleAddDataLeitura = () => {
    if (!novaDataInput) return
    const dataLimpa = novaDataInput.slice(0, 10)
    if (!datasLeituraAutoLeitura.includes(dataLimpa)) {
      setDatasLeituraAutoLeitura((prev) => [...prev, dataLimpa].sort())
    }
    setNovaDataInput('')
    setFormError(null)
  }

  const handleRemoveDataLeitura = (dataParaRemover: string) => {
    setDatasLeituraAutoLeitura((prev) => prev.filter((d) => d !== dataParaRemover))
  }

  const handleAddDataProgramacao = () => {
    const novoItem: ProgramacaoLeituraItem = {
      id: `prog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      dataPrevista: '',
      responsavel: 'Cliente',
    }
    setProgramacaoLeituras((prev) => [...prev, novoItem])
  }

  const handleUpdateItemProgramacao = (
    id: string,
    campo: 'dataPrevista' | 'responsavel',
    valor: string,
  ) => {
    setProgramacaoLeituras((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        return {
          ...item,
          [campo]: valor,
        }
      }),
    )
  }

  const handleRemoveItemProgramacao = (id: string) => {
    setProgramacaoLeituras((prev) => prev.filter((item) => item.id !== id))
  }

  // Lógica bidirecional de Horário Início, Fim e Duração para Manutenção
  const handleHorarioInicioChange = (novoInicio: string) => {
    setHorarioInicio(novoInicio)
    // Atualiza a parte de hora em dataHora
    const dataBase =
      dataHora && dataHora.length >= 10
        ? dataHora.slice(0, 10)
        : new Date().toISOString().slice(0, 10)
    setDataHora(`${dataBase}T${novoInicio}`)
    // Regra verbatim: Ao criar/alterar horário de início, preencher automaticamente o fim com 1 hora após (ou duração atual)
    const duracaoAtual = duracaoMinutos > 0 ? duracaoMinutos : 60
    const novoFim = somarMinutos(novoInicio, duracaoAtual)
    setHorarioFim(novoFim)
  }

  const handleHorarioFimChange = (novoFim: string) => {
    setHorarioFim(novoFim)
    // Recalcula e atualiza a duração automaticamente
    const novaDuracao = calcularDiferencaMinutos(horarioInicio, novoFim)
    setDuracaoMinutos(novaDuracao)
  }

  const handleDuracaoChange = (novaDuracao: number) => {
    const duracaoSegura = isNaN(novaDuracao) || novaDuracao < 0 ? 0 : novaDuracao
    setDuracaoMinutos(duracaoSegura)
    // Recalcula e atualiza o horário de fim automaticamente
    const novoFim = somarMinutos(horarioInicio, duracaoSegura)
    setHorarioFim(novoFim)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const clienteIdLimpo = typeof clienteId === 'string' ? clienteId.trim() : ''
    if (!clienteIdLimpo) {
      setFormError('Selecione um cliente para vincular à atividade.')
      return
    }

    const isAutoLeitura = selectedTipo === 'auto_leitura_rge'

    // Validação de usina obrigatória para manutenção e administrativa
    const precisaUsina = isCategoriaManutencaoOuAdministrativa(selectedCategoria)
    const usinaIdLimpaValidacao =
      selectedUsinaId && selectedUsinaId.trim() ? selectedUsinaId.trim() : ''

    if (precisaUsina && !usinaIdLimpaValidacao) {
      setFormError(MSG_USINA_OBRIGATORIA)
      return
    }

    // Validação estrita: Auto Leitura RGE exige pelo menos 1 data de leitura informada
    if (isAutoLeitura) {
      if (datasLeituraAutoLeitura.length === 0) {
        setFormError('Informe pelo menos uma data de leitura para a Auto Leitura RGE.')
        return
      }
    } else if (!dataHora) {
      setFormError('Data e horário são obrigatórios.')
      return
    }

    try {
      setIsSubmitting(true)
      setFormError(null)

      const conf = getTipoAtividadeConfig(selectedTipo, customDefs)
      let finalTitulo = titulo.trim() || conf.tituloPadrao

      if (selectedTipo === 'auto_leitura_rge' && numeroUcAutoLeitura) {
        if (!finalTitulo || finalTitulo === conf.tituloPadrao) {
          finalTitulo = `Auto Leitura RGE - UC ${numeroUcAutoLeitura}`
        }
      }

      const selectedUser = usuarios.find((u) => u.id === responsavelId)
      const responsavelNome = selectedUser?.name || user?.name || 'João Delfos'

      // Normalização de data para o padrão datetime do PocketBase com espaço (sem 'T' nem ms)
      const normalizarParaPocketBase = (isoOuData: string): string => {
        return isoOuData.replace('T', ' ').replace(/\.\d{3}Z?$/, '')
      }

      // Se for Auto Leitura - RGE, primeira data da leitura define a data inicial da mãe
      const primeiraData = datasLeituraAutoLeitura[0]
      const dataIsoMae =
        selectedTipo === 'auto_leitura_rge' && primeiraData
          ? new Date(primeiraData + 'T08:00:00Z').toISOString()
          : dataHora
            ? new Date(dataHora).toISOString()
            : new Date().toISOString()
      const dataFormatadaPocketBase = normalizarParaPocketBase(dataIsoMae)

      // Sanitização estrita de relations (omitir completamente quando vazias para não quebrar no PocketBase)
      const usinaIdLimpa =
        selectedUsinaId && selectedUsinaId.trim() ? selectedUsinaId.trim() : undefined
      const negocioIdLimpo =
        selectedNegocioId && selectedNegocioId.trim() ? selectedNegocioId.trim() : undefined
      const responsavelIdLimpo =
        responsavelId && responsavelId.trim() ? responsavelId.trim() : undefined

      // Defaults de custos/deslocamento para manter integridade downstream se for manutenção
      let defaultsManutencao: {
        valor_servico?: number
        valor_por_placa?: number
        qtd_modulos?: number
        cobrar_deslocamento?: boolean
        distancia_km?: number
        valor_km?: number
        custo_deslocamento?: number
        custo_placas?: number
        custo_total?: number
      } = {}

      if (selectedCategoria === 'manutencao') {
        const usinaSel = usinasDoCliente.find((u) => u.id === selectedUsinaId)
        const clienteSel = clientes.find((c) => c.id === clienteIdLimpo)
        const modulos =
          Number(usinaSel?.qtd_modulos) ||
          usinasDoCliente.reduce((acc, u) => acc + (Number(u.qtd_modulos) || 0), 0) ||
          undefined
        const valorServicoBase =
          conf.valor_base !== undefined && conf.valor_base > 0 ? conf.valor_base : 250
        const valorPlaca =
          conf.valor_por_placa !== undefined && conf.valor_por_placa > 0
            ? conf.valor_por_placa
            : undefined

        const configDesloc = getConfiguracaoDeslocamento()
        const enderecoClienteOuUsina = clienteSel?.endereco || usinaSel?.endereco || ''
        const cidadeClienteOuUsina =
          clienteSel?.cidade || usinaSel?.cidade || usinasDoCliente[0]?.cidade || ''
        const estimativa = estimarDistanciaDelfosCliente(
          enderecoClienteOuUsina || cidadeClienteOuUsina,
          cidadeClienteOuUsina,
          usinaSel?.coordenadas,
        )
        const distanciaKm = estimativa.distanciaKm || 15
        const valorKm = configDesloc.valorKmPadrao || 1.2

        const calc = calcularCustosAtividade({
          valorServico: valorServicoBase,
          valorPorPlaca: valorPlaca,
          qtdModulos: modulos,
          cobrarDeslocamento: true,
          distanciaKm,
          valorKm,
          cobrarIdaEVolta: true,
        })

        defaultsManutencao = {
          valor_servico: valorServicoBase,
          valor_por_placa: valorPlaca,
          qtd_modulos: modulos,
          cobrar_deslocamento: true,
          distancia_km: distanciaKm,
          valor_km: valorKm,
          custo_deslocamento: calc.custoDeslocamento,
          custo_placas: calc.custoPlacas,
          custo_total: calc.custoTotal,
        }
      }

      const isManutencao = selectedCategoria === 'manutencao'

      // Se selectedTipo for custom ("custom_RECORDID"), persistir tipo='custom' e vincular tipo_custom_id / subtipo / tipo_unificado
      let tipoParaSalvar = selectedTipo
      let customRecordId: string | undefined = undefined
      let tipoUnificadoNome: string | undefined = undefined
      let subtipoNome: string | undefined = undefined

      if (selectedTipo.startsWith('custom_')) {
        tipoParaSalvar = 'custom' as import('@/types/crm').AtividadeTipo
        customRecordId = selectedTipo.replace(/^custom_/, '')
        const customObj = customDefs.find(
          (c) => c.id === selectedTipo || c.customRecordId === customRecordId,
        )
        tipoUnificadoNome = customObj?.tituloPadrao || conf.tituloPadrao
        subtipoNome = customObj?.tituloPadrao || conf.tituloPadrao
      }

      const atividadePrincipalPayload: any = {
        cliente_id: clienteIdLimpo,
        tipo: tipoParaSalvar,
        ...(customRecordId
          ? {
              tipo_custom_id: customRecordId,
              tipo_unificado: tipoUnificadoNome,
              subtipo: subtipoNome,
            }
          : {}),
        titulo: finalTitulo,
        descricao: descricao.trim(), // Descrição NÃO é obrigatória
        data: dataFormatadaPocketBase,
        ...(isManutencao
          ? {
              horario_inicio: horarioInicio,
              horario_fim: horarioFim,
              duracao_minutos: duracaoMinutos,
            }
          : {}),
        responsavel_id: responsavelIdLimpo,
        responsavel_nome: responsavelNome,
        status: 'pendente',
        autor: user?.name || 'João Delfos',
        usina_id: usinaIdLimpa,
        negocio_id: negocioIdLimpo,
        numero_uc: (numeroUcAutoLeitura && numeroUcAutoLeitura.trim()) || undefined,
        ...defaultsManutencao,
      }

      if (selectedTipo === 'auto_leitura_rge') {
        atividadePrincipalPayload.datas_leitura = datasLeituraAutoLeitura
      }

      // Salva a atividade principal (mãe)
      const maeCriada = await addAtividade(atividadePrincipalPayload)

      // Se for Auto Leitura - RGE:
      // Cria automaticamente uma atividade filha "Lembrete de Auto Leitura" (tipo lembrete_auto_leitura)
      // para CADA data adicionada, com: mesmo cliente, mesma UC, data da leitura,
      // data do lembrete = 2 dias antes às 08:00, status pendente e parent_id apontando para a mãe.
      if (selectedTipo === 'auto_leitura_rge' && maeCriada?.id) {
        await sincronizarFilhasNovas({
          maeId: maeCriada.id,
          clienteId: clienteIdLimpo,
          usinaId: usinaIdLimpa,
          numeroUc: (numeroUcAutoLeitura && numeroUcAutoLeitura.trim()) || undefined,
          datasLeitura: datasLeituraAutoLeitura,
          responsavelId: responsavelIdLimpo,
          responsavelNome,
          autor: user?.name || 'João Delfos',
        })
      }

      setFormSuccess(true)
      if (onAtividadeCriada) {
        try {
          onAtividadeCriada()
        } catch (callbackErr) {
          console.warn('Erro no callback onAtividadeCriada:', callbackErr)
        }
      }
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

  const isAutoLeitura = selectedTipo === 'auto_leitura_rge'
  const configAtual = getTipoAtividadeConfig(selectedTipo, customDefs)
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
        {/* Banner de atalho se selecionar Email RGE */}
        {selectedTipo === 'solicitar_contas_rge' && (
          <div className="mx-5 mt-4 p-3 bg-sky-50 border border-sky-200 rounded-xl flex items-center justify-between gap-3 text-xs text-sky-900">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-600 shrink-0" />
              <span>
                Esta atividade possui fluxo completo de Email RGE com envio e modelos configuráveis.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsModalSolicitarContasOpen(true)}
              className="px-3 py-1 bg-sky-600 text-white font-bold rounded-lg hover:bg-sky-700 transition-colors shrink-0"
            >
              Abrir Email RGE
            </button>
          </div>
        )}
        {/* Banner de atalho se selecionar Análise de Fatura */}
        {selectedTipo === 'analise_fatura' && (
          <div className="mx-5 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-xs text-emerald-900">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Análise automática via IA Gemini: anexe a fatura e obtenha o relatório interativo
                completo.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsModalAnaliseFaturaOpen(true)}
              className="px-3 py-1 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors shrink-0"
            >
              Analisar fatura agora
            </button>
          </div>
        )}
        {/* Topo do modal */}{' '}
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
          {/* Seleção em 2 etapas: Categoria e Tipo */}
          <div className="space-y-2 p-3 bg-gray-50/80 rounded-xl border border-gray-200">
            {/* Etapa 1: Categoria */}
            <div>
              <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wide block mb-1">
                1. Selecione a Categoria
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {CATEGORIAS_ATIVIDADES.map((cat) => {
                  const isCatSelected = selectedCategoria === cat.id
                  const isDesabilitada = apenasManutencao && cat.id !== 'manutencao'
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      disabled={isDesabilitada}
                      onClick={() => !isDesabilitada && handleCategoriaChange(cat.id)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-semibold truncate transition-all border ${
                        isCatSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : isDesabilitada
                            ? 'bg-gray-100 text-gray-400 border-gray-200 opacity-40 cursor-not-allowed'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {cat.id === 'comercial'
                        ? 'Comercial'
                        : cat.id === 'manutencao'
                          ? 'Manutenção'
                          : cat.id === 'administrativo_pos_venda'
                            ? 'Administrativas'
                            : cat.nome.replace(/^Atividades (de )?/, '')}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Etapa 2: Tipos da Categoria */}
            <div>
              <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wide block mb-1">
                2. Tipo de Atividade
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto p-1 bg-white rounded-lg border border-gray-200">
                {tiposDaCategoria.map((item) => {
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
                      title={`${item.tituloPadrao} — ${item.descricaoAjuda}`}
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
            {/* Cliente com Autocomplete em tempo real */}
            <div className="space-y-1 relative z-20">
              <label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-gray-400" />
                  Cliente Vinculado <span className="text-red-500">*</span>
                </span>
                <span className="text-[10px] text-gray-400 font-normal">Busque por nome</span>
              </label>
              <ClienteAutocomplete
                clientes={clientes}
                value={clienteId}
                onChange={(id) => {
                  setClienteId(id)
                  if (formError) setFormError(null)
                }}
                placeholder="Digite o nome do cliente..."
                required
                error={Boolean(formError && !clienteId)}
              />
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
                  const targetUser = usuariosValidosCadastrados.find((u) => u.id === e.target.value)
                  const isPerfilTecnico =
                    targetUser?.role === 'instalador' || (targetUser?.role as string) === 'tecnico'
                  if (isPerfilTecnico && selectedCategoria !== 'manutencao') {
                    setResponsavelAvisoBloqueio(
                      'Este perfil (instalador/técnico) só pode receber atividades do tipo manutenção.',
                    )
                    return
                  }
                  setResponsavelAvisoBloqueio(null)
                  setResponsavelId(e.target.value)
                }}
                required
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900"
              >
                <option value="">Selecione o responsável...</option>
                {usuariosValidosCadastrados.map((u) => {
                  const isPerfilTecnico =
                    u.role === 'instalador' || (u.role as string) === 'tecnico'
                  const bloqueado = isPerfilTecnico && selectedCategoria !== 'manutencao'
                  return (
                    <option key={u.id} value={u.id} disabled={bloqueado}>
                      {u.name} {u.role ? `[${u.role}]` : ''}{' '}
                      {bloqueado ? '— (somente manutenção)' : ''}
                    </option>
                  )
                })}
              </select>
              {responsavelAvisoBloqueio && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded-lg flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>{responsavelAvisoBloqueio}</span>
                </p>
              )}
            </div>
          </div>

          {/* Seletor de Vínculo de Negócio Comercial (Opcional, com auto-sugestão quando único em andamento) */}
          {negociosDoCliente.length > 0 && (
            <div className="space-y-1 p-3 bg-amber-50/50 rounded-xl border border-amber-200/80">
              <label className="text-xs font-semibold text-gray-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-amber-600" />
                  <span>Negócio Vinculado</span>
                  <span className="text-[10px] text-gray-500 font-normal">(opcional)</span>
                </span>
                {negociosDoCliente.filter((n) => n.status === 'em andamento').length === 1 &&
                  selectedNegocioId && (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      Sugerido automaticamente (único em andamento)
                    </span>
                  )}
              </label>
              <select
                value={selectedNegocioId}
                onChange={(e) => setSelectedNegocioId(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white text-gray-900"
              >
                <option value="">Nenhum negócio vinculado (geral do cliente)</option>
                {negociosDoCliente.map((neg) => {
                  const valorFmt = neg.valor
                    ? new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(neg.valor)
                    : null
                  return (
                    <option key={neg.id} value={neg.id}>
                      {neg.titulo || 'Negócio'} •{' '}
                      {neg.tipo_venda || neg.tipo_negocio || 'Comercial'} [
                      {neg.status || 'em andamento'}] {valorFmt ? `— ${valorFmt}` : ''}
                    </option>
                  )
                })}
              </select>
            </div>
          )}

          {/* Campo de Vínculo de Usina Inteligente */}
          {usinasDoCliente.length === 1 && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs">
              <Sun className="w-3.5 h-3.5 text-[#E0A838] shrink-0" />
              <span className="text-[11px] font-medium">
                Vinculada automaticamente à usina: <strong>{usinasDoCliente[0].nome}</strong>
              </span>
            </div>
          )}

          {usinasDoCliente.length >= 2 && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Sun className="w-3.5 h-3.5 text-[#E0A838]" />
                  <span>Vincular a usina</span>
                  {isCategoriaManutencaoOuAdministrativa(selectedCategoria) ? (
                    <span className="text-red-500">*</span>
                  ) : (
                    <span className="text-[10px] text-gray-400 font-normal">(opcional)</span>
                  )}
                </span>
                {isCategoriaManutencaoOuAdministrativa(selectedCategoria) && (
                  <span className="text-[10px] text-amber-700 font-medium">
                    Obrigatória para{' '}
                    {selectedCategoria === 'manutencao' ? 'manutenção' : 'administrativa'}
                  </span>
                )}
              </label>
              <select
                value={selectedUsinaId}
                onChange={(e) => {
                  setSelectedUsinaId(e.target.value)
                  if (formError === MSG_USINA_OBRIGATORIA) setFormError(null)
                }}
                required={isCategoriaManutencaoOuAdministrativa(selectedCategoria)}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900"
              >
                <option value="">
                  {isCategoriaManutencaoOuAdministrativa(selectedCategoria)
                    ? 'Selecione a usina (obrigatória)...'
                    : 'Nenhuma usina vinculada (geral do cliente)'}
                </option>
                {usinasDoCliente.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome} {u.potencia_kwp ? `(${u.potencia_kwp} kWp)` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Alerta se a categoria exigir usina mas o cliente não tiver nenhuma usina cadastrada */}
          {isCategoriaManutencaoOuAdministrativa(selectedCategoria) &&
            clienteId &&
            usinasDoCliente.length === 0 && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  O cliente selecionado não possui usinas cadastradas. Cadastre ao menos uma usina
                  no cliente para vincular a esta atividade.
                </span>
              </div>
            )}

          {/* Data e Hora */}
          {!isAutoLeitura && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span>Data e Horário Previsto</span> <span className="text-red-500">*</span>
              </label>
              {selectedCategoria === 'manutencao' ? (
                <div className="space-y-2.5 p-3 rounded-xl border border-sky-200 bg-sky-50/40">
                  {/* Data base da manutenção */}
                  <div>
                    <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                      Data da Atividade
                    </label>
                    <input
                      type="date"
                      value={dataHora ? dataHora.slice(0, 10) : ''}
                      onChange={(e) => {
                        const novaData = e.target.value
                        const horaAtual = horarioInicio || '08:00'
                        if (novaData) {
                          setDataHora(`${novaData}T${horaAtual}`)
                        }
                      }}
                      required
                      className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900 font-medium"
                    />
                  </div>

                  {/* Grid com Horário de Início, Horário de Fim e Duração Prevista */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 border-t border-sky-100">
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
                          title="Hora de Início"
                        >
                          {HORAS_24.map((h) => (
                            <option key={`ini-h-${h}`} value={h}>
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
                          title="Minutos de Início (5 em 5 min)"
                        >
                          {MINUTOS_PASSO_5.map((m) => (
                            <option key={`ini-m-${m}`} value={m}>
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
                          title="Hora de Fim"
                        >
                          {HORAS_24.map((h) => (
                            <option key={`fim-h-${h}`} value={h}>
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
                          title="Minutos de Fim (5 em 5 min)"
                        >
                          {MINUTOS_PASSO_5.map((m) => (
                            <option key={`fim-m-${m}`} value={m}>
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
                        title="Duração Prevista (editável)"
                      >
                        {DURACOES_PREVISTAS_SUGESTOES.map((d) => (
                          <option key={`dur-${d.minutos}`} value={d.minutos}>
                            {d.label}
                          </option>
                        ))}
                        {!DURACOES_PREVISTAS_SUGESTOES.some(
                          (d) => d.minutos === duracaoMinutos,
                        ) && (
                          <option value={duracaoMinutos}>
                            {formatarDuracao(duracaoMinutos)} (personalizado)
                          </option>
                        )}
                      </select>
                    </div>
                  </div>

                  <p className="text-[10px] text-sky-900/80">
                    Previsão padrão inicial: 1 hora (+1h do início). Alterar o fim recalcula a
                    duração, e alterar a duração recalcula o fim.
                  </p>
                </div>
              ) : (
                <input
                  type="datetime-local"
                  value={dataHora}
                  onChange={(e) => setDataHora(e.target.value)}
                  required
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900"
                />
              )}
            </div>
          )}

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

          {/* Seção Condicional: Auto Leitura - RGE (Número da UC + Múltiplas datas de leitura) */}
          {selectedTipo === 'auto_leitura_rge' && (
            <div className="space-y-4 p-4 rounded-2xl border border-orange-200 bg-gradient-to-b from-orange-50/40 via-white to-orange-50/20 shadow-xs animate-in fade-in duration-200">
              <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-orange-100">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-orange-100 text-orange-800">
                    <CalendarDays className="w-4 h-4 text-orange-700" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-gray-900 leading-tight">
                      Configuração da Auto Leitura RGE
                    </h3>
                    <p className="text-[11px] text-gray-500">
                      Gera automaticamente atividades filhas com lembrete 2 dias antes às 08:00
                    </p>
                  </div>
                </div>
              </div>

              {/* Número da UC preenchido a partir das usinas do cliente */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 block">
                  Número da UC (Unidade Consumidora)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={numeroUcAutoLeitura}
                    onChange={(e) => {
                      setNumeroUcAutoLeitura(e.target.value)
                      if (
                        !titulo ||
                        titulo === 'Auto Leitura - RGE' ||
                        titulo.startsWith('Auto Leitura RGE')
                      ) {
                        setTitulo(
                          e.target.value
                            ? `Auto Leitura RGE - UC ${e.target.value}`
                            : 'Auto Leitura - RGE',
                        )
                      }
                    }}
                    placeholder="Ex: 4004280183"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono bg-white font-medium"
                  />

                  {usinasDoCliente.length > 0 && (
                    <select
                      value={selectedUsinaId}
                      onChange={(e) => {
                        const usinaId = e.target.value
                        setSelectedUsinaId(usinaId)
                        const usina = usinasDoCliente.find((u) => u.id === usinaId)
                        if (usina?.numero_uc) {
                          setNumeroUcAutoLeitura(usina.numero_uc)
                          setTitulo(`Auto Leitura RGE - UC ${usina.numero_uc}`)
                        }
                      }}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                    >
                      <option value="">Buscar UC pelas usinas cadastradas...</option>
                      {usinasDoCliente.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nome} {u.numero_uc ? `(UC: ${u.numero_uc})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Campo especial de MÚLTIPLAS datas de leitura */}
              <div className="space-y-2 pt-1 border-t border-orange-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                    <span>Datas de Leitura Programadas</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] font-bold text-orange-800 bg-orange-100 px-2 py-0.5 rounded-full border border-orange-200">
                    Total: {datasLeituraAutoLeitura.length}{' '}
                    {datasLeituraAutoLeitura.length === 1 ? 'data' : 'datas'}
                  </span>
                </div>

                <p className="text-[11px] text-gray-500">
                  Adicione as datas previstas de leitura da concessionária. Para cada data, uma
                  atividade "Lembrete de Auto Leitura" será criada com aviso 2 dias antes às 08:00.
                </p>

                {/* Input para digitar/selecionar nova data e botão Adicionar */}
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
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50 rounded-xl transition-colors shadow-2xs shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar</span>
                  </button>
                </div>

                {/* Lista de datas adicionadas */}
                {datasLeituraAutoLeitura.length === 0 ? (
                  <div className="p-3 text-center text-xs text-amber-700 bg-amber-50/60 rounded-xl border border-amber-200/80">
                    Nenhuma data de leitura adicionada ainda. Adicione pelo menos uma data para
                    continuar.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {datasLeituraAutoLeitura.map((dt, idx) => (
                      <div
                        key={dt}
                        className="flex items-center justify-between p-2 rounded-xl bg-white border border-gray-200 text-xs hover:border-orange-200 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-800 text-[10px] font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-gray-900">
                            {formatarDataParaDDMMAAAA(dt)}
                          </span>
                          <span className="text-[10px] text-gray-400 hidden sm:inline">
                            (lembrete 2 dias antes às 08:00)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveDataLeitura(dt)}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remover data"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

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
      {/* Modal Dedicado de Solicitar Contas RGE */}
      {isModalSolicitarContasOpen && (
        <ModalSolicitarContasRGE
          open={isModalSolicitarContasOpen}
          onOpenChange={setIsModalSolicitarContasOpen}
          clienteIdInicial={clienteId}
          onSuccess={() => {
            setIsModalSolicitarContasOpen(false)
            onClose()
          }}
        />
      )}

      {/* Modal Dedicado para Análise de Fatura RGE com Gemini */}
      <ModalCriarAnaliseFatura
        isOpen={isModalAnaliseFaturaOpen}
        onClose={() => setIsModalAnaliseFaturaOpen(false)}
        initialClienteId={clienteId || undefined}
        onAnaliseConcluida={() => {
          setIsModalAnaliseFaturaOpen(false)
          onClose()
        }}
      />
    </div>
  )
}

export default ModalNovaAtividade
