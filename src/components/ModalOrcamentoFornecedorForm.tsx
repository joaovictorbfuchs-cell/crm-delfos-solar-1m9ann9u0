import React, { useState, useEffect, useRef, useId } from 'react'
import {
  X,
  Search,
  Check,
  Building2,
  Cpu,
  Zap,
  PackagePlus,
  Trash2,
  DollarSign,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Plus,
} from 'lucide-react'
import type {
  Fornecedor,
  FornecedorOrcamentoExtraido,
  FornecedorItemOrcamento,
  FornecedorOrcamento,
} from '@/types/crm'
import { toast } from 'sonner'

export interface FornecedorModuloForm {
  modelo: string
  potenciaWp?: number | ''
  quantidade: number
}

export interface FornecedorInversorForm {
  marca: string
  modelo: string
  quantidade: number
}

export interface FornecedorAcessorioForm {
  descricao: string
  quantidade: number
}

export interface ModalOrcamentoFornecedorFormProps {
  isOpen: boolean
  onClose: () => void
  fornecedores: Fornecedor[]
  initialData?: Partial<FornecedorOrcamentoExtraido> | null
  arquivoOriginal?: File | null
  onSalvar: (dados: {
    nome_fornecedor: string
    fornecedor_id?: string
    numero_revisao?: string
    valor_total: number
    modulos: FornecedorItemOrcamento[]
    inversores: FornecedorItemOrcamento[]
    acessorios: FornecedorItemOrcamento[]
    observacoes?: string
    arquivo?: File | null
  }) => Promise<void>
  isSaving?: boolean
  motivoAberturaAutomatica?: string
}

export function ModalOrcamentoFornecedorForm({
  isOpen,
  onClose,
  fornecedores,
  initialData,
  arquivoOriginal,
  onSalvar,
  isSaving = false,
  motivoAberturaAutomatica = 'Não foi possível extrair os dados automaticamente do PDF. Preencha os campos abaixo para registrar o orçamento.',
}: ModalOrcamentoFornecedorFormProps) {
  // 1. Fornecedor (busca + cadastro livre)
  const [fornecedorTexto, setFornecedorTexto] = useState('')
  const [fornecedorSelecionadoId, setFornecedorSelecionadoId] = useState<string | undefined>(
    undefined,
  )
  const [isFornecedorDropdownOpen, setIsFornecedorDropdownOpen] = useState(false)
  const [fornecedorHighlightedIndex, setFornecedorHighlightedIndex] = useState(-1)
  const fornecedorContainerRef = useRef<HTMLDivElement>(null)
  const fornecedorInputId = useId()

  // 2. Número da revisão / cotação
  const [numeroRevisao, setNumeroRevisao] = useState('REV-01')

  // 3. Módulos solares: modelo, potência em Wp e quantidade
  const [modulos, setModulos] = useState<FornecedorModuloForm[]>([
    { modelo: '', potenciaWp: '', quantidade: 1 },
  ])

  // 4. Inversores: marca, modelo e quantidade
  const [inversores, setInversores] = useState<FornecedorInversorForm[]>([
    { marca: '', modelo: '', quantidade: 1 },
  ])

  // 5. Acessórios: lista adicionável (descrição e quantidade)
  const [acessorios, setAcessorios] = useState<FornecedorAcessorioForm[]>([])

  // 6. Valor total do orçamento
  const [valorTotal, setValorTotal] = useState<number | ''>('')

  // 7. Observações
  const [observacoes, setObservacoes] = useState('')

  // Inicializar / Preencher previamente dados extraídos parcialmente
  useEffect(() => {
    if (!isOpen) return

    if (initialData) {
      // 1. Fornecedor
      const fornNome = initialData.nome_fornecedor || ''
      setFornecedorTexto(fornNome)
      if (initialData.fornecedor_id) {
        setFornecedorSelecionadoId(initialData.fornecedor_id)
      } else {
        const matching = fornecedores.find(
          (f) => f.nome_empresa.toLowerCase() === fornNome.trim().toLowerCase(),
        )
        setFornecedorSelecionadoId(matching ? matching.id : undefined)
      }

      // 2. Revisão
      setNumeroRevisao(initialData.numero_revisao || 'REV-01')

      // 3. Valor
      setValorTotal(
        initialData.valor_total && initialData.valor_total > 0 ? initialData.valor_total : '',
      )

      // 4. Módulos: converter da lista de itens com parse de potência Wp se presente
      if (initialData.modulos && initialData.modulos.length > 0) {
        const parsedModulos: FornecedorModuloForm[] = initialData.modulos.map((m) => {
          let potencia: number | '' = ''
          const wpMatch = m.descricao.match(/(\d{3,4})\s*Wp?/i)
          if (wpMatch) {
            potencia = Number(wpMatch[1])
          }
          return {
            modelo: m.descricao,
            potenciaWp: potencia,
            quantidade: m.quantidade || 1,
          }
        })
        setModulos(parsedModulos)
      } else {
        setModulos([{ modelo: '', potenciaWp: '', quantidade: 1 }])
      }

      // 5. Inversores: converter da lista de itens
      if (initialData.inversores && initialData.inversores.length > 0) {
        const parsedInversores: FornecedorInversorForm[] = initialData.inversores.map((inv) => {
          let marca = ''
          const marcasConhecidas = [
            'Growatt',
            'Deye',
            'Huawei',
            'Solis',
            'Sungrow',
            'Fronius',
            'GoodWe',
            'Hoymiles',
            'SAJ',
            'Solis',
          ]
          for (const mc of marcasConhecidas) {
            if (new RegExp(`\\b${mc}\\b`, 'i').test(inv.descricao)) {
              marca = mc
              break
            }
          }
          return {
            marca,
            modelo: inv.descricao,
            quantidade: inv.quantidade || 1,
          }
        })
        setInversores(parsedInversores)
      } else {
        setInversores([{ marca: '', modelo: '', quantidade: 1 }])
      }

      // 6. Acessórios
      if (initialData.acessorios && initialData.acessorios.length > 0) {
        setAcessorios(
          initialData.acessorios.map((a) => ({
            descricao: a.descricao,
            quantidade: a.quantidade || 1,
          })),
        )
      } else {
        setAcessorios([])
      }

      // 7. Observações
      setObservacoes(
        initialData.observacoes ||
          (arquivoOriginal ? `Arquivo recebido: ${arquivoOriginal.name}` : ''),
      )
    } else {
      // Estado padrão limpo
      setFornecedorTexto('')
      setFornecedorSelecionadoId(undefined)
      setNumeroRevisao('REV-01')
      setModulos([{ modelo: '', potenciaWp: '', quantidade: 1 }])
      setInversores([{ marca: '', modelo: '', quantidade: 1 }])
      setAcessorios([])
      setValorTotal('')
      setObservacoes(arquivoOriginal ? `Arquivo recebido: ${arquivoOriginal.name}` : '')
    }
  }, [isOpen, initialData, fornecedores, arquivoOriginal])

  // Filtragem de fornecedores pelo texto digitado
  const fornecedoresFiltrados = React.useMemo(() => {
    const term = fornecedorTexto.trim().toLowerCase()
    if (!term) return fornecedores
    return fornecedores.filter(
      (f) =>
        f.nome_empresa.toLowerCase().includes(term) ||
        (f.cnpj && f.cnpj.includes(term)) ||
        (f.especialidade && f.especialidade.toLowerCase().includes(term)),
    )
  }, [fornecedores, fornecedorTexto])

  // Fechar dropdown de fornecedores ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        fornecedorContainerRef.current &&
        !fornecedorContainerRef.current.contains(e.target as Node)
      ) {
        setIsFornecedorDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!isOpen) return null

  // Helpers de Módulos
  const handleModuloChange = (
    index: number,
    field: keyof FornecedorModuloForm,
    value: string | number,
  ) => {
    setModulos((prev) => {
      const next = [...prev]
      if (field === 'quantidade') {
        next[index] = { ...next[index], quantidade: Math.max(1, Number(value) || 1) }
      } else if (field === 'potenciaWp') {
        const val = value === '' ? '' : Math.max(0, Number(value))
        next[index] = { ...next[index], potenciaWp: val }
      } else {
        next[index] = { ...next[index], [field]: String(value) }
      }
      return next
    })
  }

  const handleAddModulo = () => {
    setModulos((prev) => [...prev, { modelo: '', potenciaWp: '', quantidade: 1 }])
  }

  const handleRemoveModulo = (index: number) => {
    setModulos((prev) => {
      if (prev.length <= 1) return [{ modelo: '', potenciaWp: '', quantidade: 1 }]
      return prev.filter((_, i) => i !== index)
    })
  }

  // Helpers de Inversores
  const handleInversorChange = (
    index: number,
    field: keyof FornecedorInversorForm,
    value: string | number,
  ) => {
    setInversores((prev) => {
      const next = [...prev]
      if (field === 'quantidade') {
        next[index] = { ...next[index], quantidade: Math.max(1, Number(value) || 1) }
      } else {
        next[index] = { ...next[index], [field]: String(value) }
      }
      return next
    })
  }

  const handleAddInversor = () => {
    setInversores((prev) => [...prev, { marca: '', modelo: '', quantidade: 1 }])
  }

  const handleRemoveInversor = (index: number) => {
    setInversores((prev) => {
      if (prev.length <= 1) return [{ marca: '', modelo: '', quantidade: 1 }]
      return prev.filter((_, i) => i !== index)
    })
  }

  // Helpers de Acessórios
  const handleAcessorioChange = (
    index: number,
    field: keyof FornecedorAcessorioForm,
    value: string | number,
  ) => {
    setAcessorios((prev) => {
      const next = [...prev]
      if (field === 'quantidade') {
        next[index] = { ...next[index], quantidade: Math.max(1, Number(value) || 1) }
      } else {
        next[index] = { ...next[index], [field]: String(value) }
      }
      return next
    })
  }

  const handleAddAcessorio = () => {
    setAcessorios((prev) => [...prev, { descricao: '', quantidade: 1 }])
  }

  const handleRemoveAcessorio = (index: number) => {
    setAcessorios((prev) => prev.filter((_, i) => i !== index))
  }

  // Submissão do Formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const nomeForn = fornecedorTexto.trim()
    if (!nomeForn) {
      toast.error('Informe o nome do fornecedor (obrigatório).')
      return
    }

    if (valorTotal === '' || Number(valorTotal) <= 0) {
      toast.info('Atenção: o valor total do orçamento está zerado ou em branco.', {
        description: 'Você pode salvar agora e editar posteriormente caso necessário.',
      })
    }

    // Preparar lista de módulos no padrão FornecedorItemOrcamento
    const modulosFinais: FornecedorItemOrcamento[] = modulos
      .filter((m) => m.modelo.trim().length > 0)
      .map((m) => {
        let desc = m.modelo.trim()
        if (m.potenciaWp && !desc.toLowerCase().includes(`${m.potenciaWp}w`)) {
          desc = `${desc} ${m.potenciaWp}Wp`
        }
        return {
          descricao: desc,
          quantidade: m.quantidade > 0 ? m.quantidade : 1,
        }
      })

    // Preparar lista de inversores
    const inversoresFinais: FornecedorItemOrcamento[] = inversores
      .filter((inv) => inv.modelo.trim().length > 0 || inv.marca.trim().length > 0)
      .map((inv) => {
        let desc = inv.modelo.trim()
        if (inv.marca.trim() && !desc.toLowerCase().includes(inv.marca.toLowerCase())) {
          desc = `${inv.marca.trim()} ${desc}`.trim()
        }
        return {
          descricao: desc || 'Inversor Solar',
          quantidade: inv.quantidade > 0 ? inv.quantidade : 1,
        }
      })

    // Preparar lista de acessórios
    const acessoriosFinais: FornecedorItemOrcamento[] = acessorios
      .filter((a) => a.descricao.trim().length > 0)
      .map((a) => ({
        descricao: a.descricao.trim(),
        quantidade: a.quantidade > 0 ? a.quantidade : 1,
      }))

    // Descobrir se é fornecedor cadastrado
    let fornId = fornecedorSelecionadoId
    if (!fornId) {
      const match = fornecedores.find(
        (f) => f.nome_empresa.toLowerCase() === nomeForn.toLowerCase(),
      )
      if (match) fornId = match.id
    }

    await onSalvar({
      nome_fornecedor: nomeForn,
      fornecedor_id: fornId,
      numero_revisao: numeroRevisao.trim() || 'REV-01',
      valor_total: typeof valorTotal === 'number' ? valorTotal : 0,
      modulos: modulosFinais,
      inversores: inversoresFinais,
      acessorios: acessoriosFinais,
      observacoes: observacoes.trim() || undefined,
      arquivo: arquivoOriginal || null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-emerald-100 w-full max-w-3xl my-6 flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-orcamento-fornecedor-title"
      >
        {/* Cabeçalho Verde Solar Delfos */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white px-5 py-4 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white shadow-2xs">
              <Building2 className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3
                id="modal-orcamento-fornecedor-title"
                className="text-base font-bold text-white flex items-center gap-2 leading-tight"
              >
                Preenchimento Rápido de Orçamento de Fornecedor
              </h3>
              <p className="text-xs text-emerald-100/90">
                {arquivoOriginal ? (
                  <>
                    Arquivo PDF associado: <strong>{arquivoOriginal.name}</strong>
                  </>
                ) : (
                  'Cadastre os equipamentos e valores da cotação do fornecedor'
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title="Fechar"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Banner amigável quando acionado por falha/vazio na extração */}
        {motivoAberturaAutomatica && (
          <div className="px-5 py-3 bg-amber-50 border-b border-amber-200 flex items-start gap-2.5 text-xs text-amber-900 shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span>{motivoAberturaAutomatica}</span>
            </div>
          </div>
        )}

        {/* Corpo com scroll suave */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {/* SEÇÃO 1: FORNECEDOR E IDENTIFICAÇÃO */}
          <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-200 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200 text-gray-800 font-bold uppercase tracking-wider text-[11px]">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>1. Dados do Fornecedor & Cotação</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Autocomplete / Combobox Fornecedor */}
              <div ref={fornecedorContainerRef} className="sm:col-span-2 relative">
                <label
                  htmlFor={fornecedorInputId}
                  className="block text-[11px] font-semibold text-gray-700 mb-1"
                >
                  Fornecedor *
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id={fornecedorInputId}
                    type="text"
                    value={fornecedorTexto}
                    onChange={(e) => {
                      const val = e.target.value
                      setFornecedorTexto(val)
                      setIsFornecedorDropdownOpen(true)
                      setFornecedorHighlightedIndex(0)
                      // Se desmarcou do atual
                      const match = fornecedores.find(
                        (f) => f.nome_empresa.toLowerCase() === val.trim().toLowerCase(),
                      )
                      setFornecedorSelecionadoId(match ? match.id : undefined)
                    }}
                    onFocus={() => setIsFornecedorDropdownOpen(true)}
                    placeholder="Selecione ou digite um novo fornecedor..."
                    autoComplete="off"
                    required
                    className="w-full pl-8 pr-8 py-2 text-xs font-semibold rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-2xs"
                  />
                  {fornecedorTexto && (
                    <button
                      type="button"
                      onClick={() => {
                        setFornecedorTexto('')
                        setFornecedorSelecionadoId(undefined)
                        setIsFornecedorDropdownOpen(true)
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Dropdown de fornecedores existentes */}
                {isFornecedorDropdownOpen && (
                  <div className="absolute z-30 left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden max-h-56 overflow-y-auto">
                    <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 text-[10px] uppercase font-bold text-gray-500 flex justify-between items-center">
                      <span>Fornecedores Cadastrados ({fornecedoresFiltrados.length})</span>
                      {fornecedorTexto &&
                        !fornecedoresFiltrados.some(
                          (f) =>
                            f.nome_empresa.toLowerCase() === fornecedorTexto.trim().toLowerCase(),
                        ) && (
                          <span className="text-emerald-700 font-semibold normal-case">
                            (Pressione Enter ou clique fora para usar novo nome)
                          </span>
                        )}
                    </div>
                    {fornecedoresFiltrados.length === 0 ? (
                      <div className="p-3 text-center text-gray-500 text-xs">
                        Nenhum fornecedor cadastrado com esse nome.{' '}
                        <strong className="text-emerald-700">
                          Você pode digitar e salvar como um novo fornecedor!
                        </strong>
                      </div>
                    ) : (
                      <ul className="divide-y divide-gray-50">
                        {fornecedoresFiltrados.map((forn, idx) => {
                          const isSelected = forn.id === fornecedorSelecionadoId
                          return (
                            <li
                              key={forn.id}
                              onMouseDown={(e) => {
                                e.preventDefault()
                                setFornecedorTexto(forn.nome_empresa)
                                setFornecedorSelecionadoId(forn.id)
                                setIsFornecedorDropdownOpen(false)
                              }}
                              className={`px-3 py-2 cursor-pointer flex items-center justify-between transition-colors ${
                                isSelected
                                  ? 'bg-emerald-50 text-emerald-900 font-bold'
                                  : 'hover:bg-gray-50 text-gray-700'
                              }`}
                            >
                              <div>
                                <div className="font-semibold">{forn.nome_empresa}</div>
                                <div className="text-[10px] text-gray-400 flex items-center gap-2">
                                  {forn.cnpj && <span>CNPJ: {forn.cnpj}</span>}
                                  {forn.especialidade && (
                                    <span className="capitalize">
                                      Especialidade: {forn.especialidade}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {isSelected && (
                                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {/* Número da Revisão */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Revisão / Cotação Nº
                </label>
                <input
                  type="text"
                  value={numeroRevisao}
                  onChange={(e) => setNumeroRevisao(e.target.value)}
                  placeholder="Ex: REV-01 ou ST-2026-01"
                  className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: MÓDULOS SOLARES */}
          <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <div className="flex items-center gap-2 text-gray-800 font-bold uppercase tracking-wider text-[11px]">
                <Cpu className="w-4 h-4 text-emerald-600" />
                <span>2. Módulos Fotovoltaicos</span>
              </div>
              <button
                type="button"
                onClick={handleAddModulo}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Módulo</span>
              </button>
            </div>

            <div className="space-y-2">
              {modulos.map((mod, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-lg border border-gray-200"
                >
                  <div className="sm:col-span-6">
                    <label className="block text-[10px] text-gray-500 font-medium mb-0.5">
                      Modelo / Descrição do Módulo
                    </label>
                    <input
                      type="text"
                      value={mod.modelo}
                      onChange={(e) => handleModuloChange(idx, 'modelo', e.target.value)}
                      placeholder="Ex: Canadian Solar 550W BiHiKu7 Monocristalino"
                      className="w-full px-2.5 py-1.5 text-xs rounded-md border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] text-gray-500 font-medium mb-0.5">
                      Potência (Wp)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={mod.potenciaWp}
                      onChange={(e) => handleModuloChange(idx, 'potenciaWp', e.target.value)}
                      placeholder="Ex: 550"
                      className="w-full px-2.5 py-1.5 text-xs rounded-md border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] text-gray-500 font-medium mb-0.5">
                      Quantidade
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={mod.quantidade}
                      onChange={(e) => handleModuloChange(idx, 'quantidade', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-bold text-center rounded-md border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="sm:col-span-1 flex justify-end sm:pt-4">
                    <button
                      type="button"
                      onClick={() => handleRemoveModulo(idx)}
                      disabled={modulos.length === 1 && !mod.modelo}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded disabled:opacity-30"
                      title="Remover módulo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SEÇÃO 3: INVERSORES */}
          <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <div className="flex items-center gap-2 text-gray-800 font-bold uppercase tracking-wider text-[11px]">
                <Zap className="w-4 h-4 text-blue-600" />
                <span>3. Inversores</span>
              </div>
              <button
                type="button"
                onClick={handleAddInversor}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-800 px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Inversor</span>
              </button>
            </div>

            <div className="space-y-2">
              {inversores.map((inv, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-lg border border-gray-200"
                >
                  <div className="sm:col-span-4">
                    <label className="block text-[10px] text-gray-500 font-medium mb-0.5">
                      Marca do Inversor
                    </label>
                    <input
                      type="text"
                      value={inv.marca}
                      onChange={(e) => handleInversorChange(idx, 'marca', e.target.value)}
                      placeholder="Ex: Growatt, Deye, Huawei"
                      className="w-full px-2.5 py-1.5 text-xs rounded-md border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="sm:col-span-5">
                    <label className="block text-[10px] text-gray-500 font-medium mb-0.5">
                      Modelo do Inversor
                    </label>
                    <input
                      type="text"
                      value={inv.modelo}
                      onChange={(e) => handleInversorChange(idx, 'modelo', e.target.value)}
                      placeholder="Ex: MAX 30KTL3-X LV Trifásico 220V"
                      className="w-full px-2.5 py-1.5 text-xs rounded-md border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] text-gray-500 font-medium mb-0.5">
                      Quantidade
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={inv.quantidade}
                      onChange={(e) => handleInversorChange(idx, 'quantidade', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-bold text-center rounded-md border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="sm:col-span-1 flex justify-end sm:pt-4">
                    <button
                      type="button"
                      onClick={() => handleRemoveInversor(idx)}
                      disabled={inversores.length === 1 && !inv.modelo && !inv.marca}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded disabled:opacity-30"
                      title="Remover inversor"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SEÇÃO 4: ACESSÓRIOS */}
          <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <div className="flex items-center gap-2 text-gray-800 font-bold uppercase tracking-wider text-[11px]">
                <PackagePlus className="w-4 h-4 text-purple-600" />
                <span>4. Acessórios e Componentes Adicionais</span>
              </div>
              <button
                type="button"
                onClick={handleAddAcessorio}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 hover:text-purple-800 px-2 py-1 rounded bg-purple-50 hover:bg-purple-100 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Acessório</span>
              </button>
            </div>

            {acessorios.length === 0 ? (
              <div className="text-center py-3 text-gray-400 italic text-[11px] bg-white rounded-lg border border-dashed border-gray-200">
                Nenhum acessório adicionado. Clique em &quot;Adicionar Acessório&quot; para incluir
                string box, cabos, conectores ou estrutura.
              </div>
            ) : (
              <div className="space-y-2">
                {acessorios.map((ac, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-lg border border-gray-200"
                  >
                    <div className="sm:col-span-9">
                      <label className="block text-[10px] text-gray-500 font-medium mb-0.5">
                        Descrição do Acessório / Componente
                      </label>
                      <input
                        type="text"
                        value={ac.descricao}
                        onChange={(e) => handleAcessorioChange(idx, 'descricao', e.target.value)}
                        placeholder="Ex: String Box Solar CC DPS 1000V + Fusíveis ou Cabos 6mm²"
                        className="w-full px-2.5 py-1.5 text-xs rounded-md border border-gray-300 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] text-gray-500 font-medium mb-0.5">
                        Quantidade
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={ac.quantidade}
                        onChange={(e) => handleAcessorioChange(idx, 'quantidade', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-bold text-center rounded-md border border-gray-300 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                    <div className="sm:col-span-1 flex justify-end sm:pt-4">
                      <button
                        type="button"
                        onClick={() => handleRemoveAcessorio(idx)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                        title="Remover acessório"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SEÇÃO 5: VALOR TOTAL & OBSERVAÇÕES */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Valor total */}
            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200 space-y-2">
              <label className="block text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-700" />
                <span>5. Valor Total (R$)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-emerald-700 text-xs">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={valorTotal}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : Number(e.target.value)
                    setValorTotal(val)
                  }}
                  placeholder="0,00"
                  className="w-full pl-9 pr-3 py-2 text-sm font-black text-emerald-900 rounded-lg border border-emerald-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                />
              </div>
              <p className="text-[10px] text-gray-500 leading-tight">
                Valor total do kit fotovoltaico conforme cotação do fornecedor.
              </p>
            </div>

            {/* Observações */}
            <div className="sm:col-span-2 bg-gray-50/70 p-4 rounded-xl border border-gray-200 space-y-2">
              <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                6. Observações e Condições Comerciais
              </label>
              <textarea
                rows={3}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex: Frete incluso para entrega em Erechim/RS, garantia de 10 anos no inversor, prazo de entrega 5 dias úteis..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none shadow-2xs"
              />
            </div>
          </div>

          {/* Rodapé e Botões de Ação */}
          <div className="pt-4 border-t border-gray-200 flex items-center justify-between gap-3 flex-wrap">
            <span className="text-[11px] text-gray-500">
              * O orçamento salvo aparecerá na lista de cotações para comparação e aplicação ao
              projeto.
            </span>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition-all inline-flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando Orçamento...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Salvar Orçamento</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ModalOrcamentoFornecedorForm
