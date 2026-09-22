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
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { useAuth } from '@/contexts/AuthContext'
import { ClienteAutocomplete } from '@/components/ClienteAutocomplete'
import { fetchUsinasByClienteId } from '@/services/crmService'
import {
  CATEGORIAS_ATIVIDADES,
  ATIVIDADES_PADRAO,
  getTipoAtividadeConfig,
  buildCustomTipoDef,
  type TipoAtividadeDef,
} from '@/constants/atividadesTipos'
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
  usinas?: UsinaCliente[]
}

export interface ProgramarLeituraAnoLinha {
  dataPrevista: string // DD/MM/AAAA ou YYYY-MM-DD
  responsavel: 'Cliente' | 'Distribuidora'
}

export const ModalNovaAtividade: React.FC<ModalNovaAtividadeProps> = ({
  isOpen,
  onClose,
  initialTipo,
  initialClienteId,
  usinas: usinasProp,
}) => {
  const { clientes, usuarios, addAtividade, tiposAtividadesCustom } = useClientes()
  const { user } = useAuth()

  const [selectedCategoria, setSelectedCategoria] = useState<AtividadeCategoriaId>('comercial')
  const [selectedTipo, setSelectedTipo] = useState<AtividadeTipo>(initialTipo || 'contato_ligacao')
  const [titulo, setTitulo] = useState('')
  const [clienteId, setClienteId] = useState(initialClienteId || '')
  const [usinasDoCliente, setUsinasDoCliente] = useState<UsinaCliente[]>(usinasProp || [])
  const [selectedUsinaId, setSelectedUsinaId] = useState<string>('')
  const [responsavelId, setResponsavelId] = useState('')
  const [dataHora, setDataHora] = useState(() => {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    return now.toISOString().slice(0, 16)
  })
  const [descricao, setDescricao] = useState('')
  const [programacaoLeituras, setProgramacaoLeituras] = useState<ProgramacaoLeituraItem[]>(ITENS_EXEMPLO_PROGRAMACAO)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState(false)

  // Quando abre ou muda o initialTipo, preenche automaticamente o título
  useEffect(() => {
    if (isOpen) {
      const tipoParaUsar = initialTipo || 'contato_ligacao'
      setSelectedTipo(tipoParaUsar)
      const conf = getTipoAtividadeConfig(tipoParaUsar)
      setSelectedCategoria(conf.categoria || 'comercial')
      setTitulo(conf.tituloPadrao)
      if (tipoParaUsar === 'auto_leitura_rge') {
        setProgramacaoLeituras(ITENS_EXEMPLO_PROGRAMACAO.map((it) => ({ ...it })))
      }
      if (initialClienteId) {
        setClienteId(initialClienteId)
      } else {
        setClienteId('')
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

  // Carregar ou sincronizar usinas do cliente selecionado
  useEffect(() => {
    if (!isOpen) return

    let isMounted = true

    // Se veio via prop e bate com o cliente selecionado
    if (usinasProp && usinasProp.length > 0 && initialClienteId === clienteId) {
      setUsinasDoCliente(usinasProp)
      setSelectedUsinaId(usinasProp.length === 1 ? usinasProp[0].id : '')
      return
    }

    if (!clienteId) {
      setUsinasDoCliente([])
      setSelectedUsinaId('')
      return
    }

    fetchUsinasByClienteId(clienteId)
      .then((lista) => {
        if (!isMounted) return
        setUsinasDoCliente(lista || [])
        if (lista && lista.length === 1) {
          setSelectedUsinaId(lista[0].id)
        } else {
          setSelectedUsinaId('')
        }
      })
      .catch((err) => {
        console.warn('Erro ao buscar usinas do cliente no modal de atividade:', err)
        if (isMounted) {
          setUsinasDoCliente([])
          setSelectedUsinaId('')
        }
      })

    return () => {
      isMounted = false
    }
  }, [isOpen, clienteId, usinasProp, initialClienteId])

  const customDefs = React.useMemo(() => {
    return (tiposAtividadesCustom || []).map((t) => buildCustomTipoDef(t))
  }, [tiposAtividadesCustom])

  const tiposDaCategoria = React.useMemo(() => {
    const padroes = ATIVIDADES_PADRAO.filter((t) => t.categoria === selectedCategoria)
    const customs = customDefs.filter((t) => t.categoria === selectedCategoria)
    return [...padroes, ...customs]
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
  }

  const handleTipoChange = (novoTipo: AtividadeTipo) => {
    setSelectedTipo(novoTipo)
    const conf = getTipoAtividadeConfig(novoTipo, customDefs)
    // Regra do usuário: O nome do tipo clicado deve virar AUTOMATICAMENTE o título da atividade
    setTitulo(conf.tituloPadrao)
    if (novoTipo === 'auto_leitura_rge') {
      setProgramacaoLeituras(ITENS_EXEMPLO_PROGRAMACAO.map((it) => ({ ...it })))
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!clienteId) {
      setFormError('Por favor, selecione um cliente.')
      return
    }

    try {
      setIsSubmitting(true)
      setFormError(null)

      const conf = getTipoAtividadeConfig(selectedTipo, customDefs)
      const finalTitulo = titulo.trim() || conf.tituloPadrao

      const selectedUser = usuarios.find((u) => u.id === responsavelId)
      const responsavelNome = selectedUser?.name || user?.name || 'João Delfos'

      // Se for Auto Leitura - RGE, separar linhas da Distribuidora para salvar como consulta
      const leiturasDistribuidora = selectedTipo === 'auto_leitura_rge'
        ? programacaoLeituras
            .filter((item) => item.responsavel === 'Distribuidora' && item.dataPrevista)
            .map((item) => ({
              data: formatarParaDDMMAAAA(item.dataPrevista),
              responsavel: 'Distribuidora' as const,
            }))
        : undefined

      const atividadePrincipalPayload: any = {
        cliente_id: clienteId,
        tipo: selectedTipo,
        titulo: finalTitulo,
        descricao: descricao.trim(), // Descrição NÃO é obrigatória
        data: dataHora ? new Date(dataHora).toISOString() : new Date().toISOString(),
        responsavel_id: responsavelId || undefined,
        responsavel_nome: responsavelNome,
        status: 'pendente',
        autor: user?.name || 'João Delfos',
        usina_id: selectedUsinaId || undefined,
      }

      if (leiturasDistribuidora && leiturasDistribuidora.length > 0) {
        atividadePrincipalPayload.leituras_programadas_distribuidora = leiturasDistribuidora
      }

      // Salva a atividade principal normalmente (como já funciona hoje)
      await addAtividade(atividadePrincipalPayload)

      // Se for Auto Leitura - RGE:
      // Para cada linha onde o Responsável for 'Cliente', cria automaticamente uma atividade filha
      // vinculada ao mesmo cliente, com título 'Auto Leitura RGE - [data]' (data em DD/MM/AAAA)
      if (selectedTipo === 'auto_leitura_rge') {
        const leiturasCliente = programacaoLeituras.filter(
          (item) => item.responsavel === 'Cliente' && item.dataPrevista,
        )

        for (const item of leiturasCliente) {
          const dataFormatada = formatarParaDDMMAAAA(item.dataPrevista)
          // Monta data ISO para a atividade filha baseada na data prevista escolhida
          const [ano, mes, dia] = item.dataPrevista.split('-').map(Number)
          const dataIsoFilha = new Date(Date.UTC(ano, mes - 1, dia, 12, 0, 0)).toISOString()

          await addAtividade({
            cliente_id: clienteId,
            tipo: 'auto_leitura_rge',
            titulo: `Auto Leitura RGE - ${dataFormatada}`,
            descricao: `Auto Leitura RGE programada para ${dataFormatada} (Responsável: Cliente)`,
            data: dataIsoFilha,
            responsavel_id: responsavelId || undefined,
            responsavel_nome: responsavelNome,
            status: 'pendente',
            autor: user?.name || 'João Delfos',
            usina_id: selectedUsinaId || undefined,
          })
        }
      }

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
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleCategoriaChange(cat.id)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-semibold truncate transition-all border ${
                        isCatSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {cat.nome.replace('Atividades ', '')}
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
            <div className="space-y-1">
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
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                <Sun className="w-3.5 h-3.5 text-[#E0A838]" />
                <span>Vincular a usina</span>
                <span className="text-[10px] text-gray-400 font-normal">(opcional)</span>
              </label>
              <select
                value={selectedUsinaId}
                onChange={(e) => setSelectedUsinaId(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-gray-900"
              >
                <option value="">Nenhuma usina vinculada (geral do cliente)</option>
                {usinasDoCliente.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome} {u.potencia_kwp ? `(${u.potencia_kwp} kWp)` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

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

          {/* Seção Condicional: Programar leituras do ano (quando tipo for Auto Leitura - RGE) */}
          {selectedTipo === 'auto_leitura_rge' && (
            <div className="space-y-3 p-4 rounded-xl border border-emerald-200 bg-gradient-to-b from-emerald-50/50 to-white shadow-xs animate-in fade-in duration-200">
              <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-emerald-100">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                    <CalendarDays className="w-4 h-4 text-emerald-700" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-gray-900 leading-tight">
                      Programar leituras do ano
                    </h3>
                    <p className="text-[11px] text-gray-500">
                      Datas com responsável "Cliente" gerarão atividades filhas automáticas
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddDataProgramacao}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors border border-emerald-300"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar data</span>
                </button>
              </div>

              {/* Tabela de Programação */}
              <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50/90 text-gray-600 font-semibold border-b border-gray-200 text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-2 px-3">Data Prevista</th>
                      <th className="py-2 px-3">Responsável</th>
                      <th className="py-2 px-2 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {programacaoLeituras.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-gray-400 italic text-[11px]">
                          Nenhuma data programada. Clique em "Adicionar data" para incluir.
                        </td>
                      </tr>
                    ) : (
                      programacaoLeituras.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                          <td className="py-2 px-3">
                            <input
                              type="date"
                              value={item.dataPrevista}
                              onChange={(e) =>
                                handleUpdateItemProgramacao(item.id, 'dataPrevista', e.target.value)
                              }
                              className="w-full sm:w-44 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-gray-900"
                            />
                            {item.dataPrevista && (
                              <span className="text-[10px] text-gray-400 ml-1.5 hidden sm:inline">
                                ({formatarParaDDMMAAAA(item.dataPrevista)})
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <select
                              value={item.responsavel}
                              onChange={(e) =>
                                handleUpdateItemProgramacao(
                                  item.id,
                                  'responsavel',
                                  e.target.value as 'Cliente' | 'Distribuidora',
                                )
                              }
                              className="w-full sm:w-36 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-gray-900 font-medium"
                            >
                              <option value="Cliente">Cliente</option>
                              <option value="Distribuidora">Distribuidora</option>
                            </select>
                            {item.responsavel === 'Distribuidora' && (
                              <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 ml-1.5 hidden md:inline">
                                Apenas consulta
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveItemProgramacao(item.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center"
                              title="Remover linha"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="sr-only">Remover</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                <span>
                  Linhas 'Cliente' viram atividades com a tag verde <strong>Aguardando envio</strong>
                </span>
                <span className="font-medium text-emerald-800">
                  {programacaoLeituras.filter((i) => i.responsavel === 'Cliente').length} para o Cliente
                </span>
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
    </div>
  )
}
