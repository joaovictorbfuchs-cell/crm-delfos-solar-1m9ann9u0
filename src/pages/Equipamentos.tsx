import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  Wrench,
  Cpu,
  Sun,
  Plus,
  Trash2,
  Edit2,
  Upload,
  Search,
  RefreshCw,
  AlertCircle,
  X,
  Shield,
  Zap,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Equipamento, TipoEquipamento } from '@/types/equipamentos'
import {
  fetchEquipamentos,
  createEquipamento,
  updateEquipamento,
  deleteEquipamento,
  getFotoEquipamentoUrl,
  formatarPotenciaEquipamento,
} from '@/services/equipamentosService'
import { extractFieldErrors } from '@/lib/pocketbase/errors'

type TabFiltro = 'todos' | 'inversor' | 'modulo_fv'

export function EquipamentosPage() {
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [tabAtiva, setTabAtiva] = useState<TabFiltro>('todos')
  const [busca, setBusca] = useState<string>('')

  // Modal / Form state
  const [modalOpen, setModalOpen] = useState<boolean>(false)
  const [editingItem, setEditingItem] = useState<Equipamento | null>(null)
  const [modalDeleteConfirmOpen, setModalDeleteConfirmOpen] = useState<boolean>(false)
  const [itemParaExcluir, setItemParaExcluir] = useState<Equipamento | null>(null)

  // Campos do formulário
  const [tipo, setTipo] = useState<TipoEquipamento>('inversor')
  const [marca, setMarca] = useState<string>('')
  const [modelo, setModelo] = useState<string>('')
  const [potenciaW, setPotenciaW] = useState<string>('')
  const [descricaoPadrao, setDescricaoPadrao] = useState<string>('')
  const [garantiaAnos, setGarantiaAnos] = useState<string>('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [removerFotoExistente, setRemoverFotoExistente] = useState<boolean>(false)

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const carregar = async () => {
    setLoading(true)
    try {
      const data = await fetchEquipamentos()
      setEquipamentos(data)
    } catch (err) {
      console.error('Erro ao carregar equipamentos:', err)
      toast.error('Erro ao carregar lista de equipamentos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  const handleOpenCreate = () => {
    setEditingItem(null)
    setTipo(tabAtiva === 'modulo_fv' ? 'modulo_fv' : 'inversor')
    setMarca('')
    setModelo('')
    setPotenciaW('')
    setDescricaoPadrao('')
    setGarantiaAnos('')
    setSelectedFile(null)
    setPreviewUrl(null)
    setRemoverFotoExistente(false)
    setErrorMessage(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (item: Equipamento) => {
    setEditingItem(item)
    setTipo(item.tipo)
    setMarca(item.marca || '')
    setModelo(item.modelo || '')
    setPotenciaW(
      item.potencia_w !== undefined && item.potencia_w !== null ? String(item.potencia_w) : '',
    )
    setDescricaoPadrao(item.descricao_padrao || '')
    setGarantiaAnos(
      item.garantia_anos !== undefined && item.garantia_anos !== null
        ? String(item.garantia_anos)
        : '',
    )
    setSelectedFile(null)
    setRemoverFotoExistente(false)
    const urlAtual = getFotoEquipamentoUrl(item)
    setPreviewUrl(urlAtual)
    setErrorMessage(null)
    setModalOpen(true)
  }

  const handleOpenDeleteConfirm = (item: Equipamento) => {
    setItemParaExcluir(item)
    setModalDeleteConfirmOpen(true)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const maxBytes = 10 * 1024 * 1024
      if (file.size > maxBytes) {
        const msg = `O arquivo selecionado (${(file.size / (1024 * 1024)).toFixed(1)} MB) ultrapassa o limite máximo de 10 MB.`
        setErrorMessage(msg)
        toast.error(msg)
        return
      }
      setErrorMessage(null)
      setSelectedFile(file)
      setRemoverFotoExistente(false)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  const handleRemovePhoto = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setRemoverFotoExistente(true)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!marca.trim()) {
      setErrorMessage('Por favor, informe a marca do equipamento.')
      return
    }
    if (!modelo.trim()) {
      setErrorMessage('Por favor, informe o modelo do equipamento.')
      return
    }

    const cleanedPotencia = potenciaW.trim().replace(',', '.')
    const potenciaNum = parseFloat(cleanedPotencia)
    if (!cleanedPotencia || isNaN(potenciaNum) || potenciaNum <= 0) {
      setErrorMessage('Por favor, informe uma potência válida em Watts (número maior que zero).')
      return
    }

    let garantiaNum: number | null = null
    if (garantiaAnos.trim()) {
      const g = parseInt(garantiaAnos.trim(), 10)
      if (isNaN(g) || g < 0) {
        setErrorMessage('Por favor, informe um número válido de anos para a garantia.')
        return
      }
      garantiaNum = g
    }

    try {
      setIsSubmitting(true)

      const payload = {
        tipo,
        marca: marca.trim(),
        modelo: modelo.trim(),
        potencia_w: potenciaNum,
        descricao_padrao: descricaoPadrao.trim(),
        garantia_anos: garantiaNum,
      }

      if (editingItem) {
        await updateEquipamento(
          editingItem.id,
          payload,
          selectedFile || undefined,
          removerFotoExistente,
        )
        toast.success('Equipamento atualizado com sucesso!')
      } else {
        await createEquipamento(payload, selectedFile || undefined)
        toast.success('Equipamento cadastrado com sucesso!')
      }

      setModalOpen(false)
      await carregar()
    } catch (err: any) {
      console.error('Erro ao salvar equipamento:', err)
      let mensagemDetalhada = 'Falha ao salvar equipamento. Verifique os dados e tente novamente.'

      const fieldErrors = extractFieldErrors(err)
      const errorKeys = Object.keys(fieldErrors)

      if (errorKeys.length > 0) {
        const detalhes = errorKeys
          .map((k) => {
            const rotulos: Record<string, string> = {
              tipo: 'Tipo',
              marca: 'Marca',
              modelo: 'Modelo',
              potencia_w: 'Potência (W)',
              descricao_padrao: 'Descrição Padrão',
              garantia_anos: 'Garantia (anos)',
              foto: 'Foto',
            }
            const nomeCampo = rotulos[k] || k
            return `${nomeCampo}: ${fieldErrors[k]}`
          })
          .join('. ')
        mensagemDetalhada = `Erro de validação: ${detalhes}`
      } else if (err?.message) {
        if (err.message.includes('file too large') || err.message.includes('maxSize')) {
          mensagemDetalhada = 'O arquivo de imagem enviado é muito grande (máximo 10MB).'
        } else {
          mensagemDetalhada = `Erro: ${err.message}`
        }
      }

      setErrorMessage(mensagemDetalhada)
      toast.error(mensagemDetalhada)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!itemParaExcluir) return
    try {
      setIsDeleting(true)
      await deleteEquipamento(itemParaExcluir.id)
      toast.success(`Equipamento "${itemParaExcluir.modelo}" removido com sucesso.`)
      setModalDeleteConfirmOpen(false)
      setItemParaExcluir(null)
      await carregar()
    } catch (err: any) {
      console.error('Erro ao excluir equipamento:', err)
      toast.error('Não foi possível excluir o equipamento. Tente novamente.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Contagens para os tabs
  const contagens = useMemo(() => {
    const total = equipamentos.length
    const inversores = equipamentos.filter((e) => e.tipo === 'inversor').length
    const modulos = equipamentos.filter((e) => e.tipo === 'modulo_fv').length
    return { total, inversores, modulos }
  }, [equipamentos])

  // Lista filtrada
  const filtrados = useMemo(() => {
    return equipamentos.filter((item) => {
      // Filtro por tab
      if (tabAtiva !== 'todos' && item.tipo !== tabAtiva) {
        return false
      }
      // Filtro por busca
      if (!busca.trim()) return true
      const term = busca.toLowerCase().trim()
      const matchMarca = item.marca?.toLowerCase().includes(term)
      const matchModelo = item.modelo?.toLowerCase().includes(term)
      const matchDescricao = item.descricao_padrao?.toLowerCase().includes(term)
      const matchPotencia = String(item.potencia_w).includes(term)
      return matchMarca || matchModelo || matchDescricao || matchPotencia
    })
  }, [equipamentos, tabAtiva, busca])

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#166534] to-[#16A34A] text-white flex items-center justify-center shadow-xs">
            <Cpu className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              Cadastro de Equipamentos
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Gerencie os inversores e módulos fotovoltaicos que alimentam as propostas comerciais
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={carregar}
            disabled={loading}
            className="p-2.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl border border-gray-200 transition-colors shadow-2xs"
            title="Atualizar lista de equipamentos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all hover:shadow active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Equipamento</span>
          </button>
        </div>
      </div>

      {/* Banner Informativo Delfos */}
      <div className="bg-emerald-50/90 border border-emerald-200/80 rounded-2xl p-4 flex items-start gap-3 shadow-2xs">
        <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="text-xs text-emerald-950 space-y-1">
          <p className="font-bold text-sm text-[#166534]">
            Catálogo Integrado às Propostas Comerciais
          </p>
          <p className="text-emerald-800 leading-relaxed">
            Os dados cadastrados aqui (marca, modelo, potência em Watts, descrição técnica e
            garantia em anos) são usados na geração de orçamentos e propostas comerciais
            fotovoltaicas da Delfos Solar. Mantenha as fotos e descrições padronizadas para uma
            apresentação profissional aos clientes.
          </p>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-gray-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Tabs de Tipo */}
        <div className="inline-flex p-1 bg-gray-100 rounded-xl">
          <button
            type="button"
            onClick={() => setTabAtiva('todos')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              tabAtiva === 'todos'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Todos</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                tabAtiva === 'todos'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              {contagens.total}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTabAtiva('inversor')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              tabAtiva === 'inversor'
                ? 'bg-white text-blue-800 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-blue-600" />
            <span>Inversores</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                tabAtiva === 'inversor' ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-700'
              }`}
            >
              {contagens.inversores}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTabAtiva('modulo_fv')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              tabAtiva === 'modulo_fv'
                ? 'bg-white text-amber-800 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Sun className="w-3.5 h-3.5 text-amber-600" />
            <span>Módulos FV</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                tabAtiva === 'modulo_fv'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              {contagens.modulos}
            </span>
          </button>
        </div>

        {/* Busca e Totalizador */}
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por marca, modelo, potência..."
              className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <span className="text-xs text-gray-500 font-medium whitespace-nowrap hidden sm:inline">
            Total: <strong>{filtrados.length}</strong>
          </span>
        </div>
      </div>

      {/* Lista / Grade de Cards */}
      {loading ? (
        <div className="py-20 text-center">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-gray-500">
            Carregando catálogo de equipamentos...
          </p>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto mb-3 border border-gray-200">
            {tabAtiva === 'inversor' ? (
              <Cpu className="w-7 h-7 text-gray-400" />
            ) : tabAtiva === 'modulo_fv' ? (
              <Sun className="w-7 h-7 text-gray-400" />
            ) : (
              <Layers className="w-7 h-7 text-gray-400" />
            )}
          </div>
          <h3 className="text-base font-bold text-gray-800">Nenhum equipamento encontrado</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-5">
            {busca
              ? `Nenhum resultado corresponde à busca "${busca}". Tente outros termos.`
              : 'Não há equipamentos cadastrados nesta categoria ainda.'}
          </p>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#16A34A] text-white text-xs font-bold rounded-xl hover:bg-[#15803D] shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Equipamento</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtrados.map((item) => {
            const fotoUrl = getFotoEquipamentoUrl(item)
            const isInversor = item.tipo === 'inversor'

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden flex flex-col group hover:shadow-md hover:border-emerald-300 transition-all duration-200"
              >
                {/* Cabeçalho Visual: Foto ou Placeholder Profissional */}
                <div className="relative h-44 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden border-b border-gray-100">
                  {fotoUrl ? (
                    <img
                      src={fotoUrl}
                      alt={`${item.marca} ${item.modelo}`}
                      className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-300 group-hover:text-emerald-500 transition-colors">
                      {isInversor ? (
                        <Cpu className="w-16 h-16 stroke-1 mb-1" />
                      ) : (
                        <Sun className="w-16 h-16 stroke-1 mb-1" />
                      )}
                      <span className="text-[11px] font-medium text-gray-400">
                        {isInversor ? 'Inversor Fotovoltaico' : 'Módulo Fotovoltaico'}
                      </span>
                    </div>
                  )}

                  {/* Badge de Tipo */}
                  <div className="absolute top-3 left-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-xs ${
                        isInversor ? 'bg-blue-600 text-white' : 'bg-amber-500 text-white'
                      }`}
                    >
                      {isInversor ? (
                        <Cpu className="w-3.5 h-3.5" />
                      ) : (
                        <Sun className="w-3.5 h-3.5" />
                      )}
                      {isInversor ? 'Inversor' : 'Módulo FV'}
                    </span>
                  </div>

                  {/* Potência em Destaque */}
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-gray-900/80 text-white backdrop-blur-xs shadow-xs">
                      <Zap className="w-3 h-3 text-amber-300" />
                      {formatarPotenciaEquipamento(item.potencia_w)}
                    </span>
                  </div>
                </div>

                {/* Corpo do Card */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    {/* Marca e Modelo */}
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
                      <span>{item.marca}</span>
                    </div>
                    <h3 className="text-base font-bold text-gray-900 leading-snug mt-0.5">
                      {item.modelo}
                    </h3>

                    {/* Metadados Técnicos: Garantia */}
                    <div className="flex items-center gap-2 mt-2.5">
                      {item.garantia_anos !== undefined && item.garantia_anos !== null ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                          <Shield className="w-3 h-3 text-emerald-600" />
                          Garantia: {item.garantia_anos} {item.garantia_anos === 1 ? 'ano' : 'anos'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                          <Shield className="w-3 h-3 text-gray-300" />
                          Garantia não informada
                        </span>
                      )}
                    </div>

                    {/* Descrição Padrão */}
                    <div className="mt-3">
                      {item.descricao_padrao ? (
                        <p className="text-xs text-gray-600 leading-relaxed line-clamp-3 bg-gray-50/70 p-2.5 rounded-xl border border-gray-100">
                          {item.descricao_padrao}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400 italic">
                          Sem descrição técnica cadastrada.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Rodapé do Card com Ações */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[10px] text-gray-400">ID: #{item.id.slice(-5)}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-gray-200 hover:border-emerald-200"
                        title="Editar equipamento"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenDeleteConfirm(item)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir equipamento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Criar / Editar Equipamento */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-[2px] animate-in fade-in">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Topo do Modal */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-emerald-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                  {editingItem ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    {editingItem ? 'Editar Equipamento' : 'Novo Equipamento'}
                  </h2>
                  <p className="text-[11px] text-gray-500">
                    Preencha as especificações para uso nas propostas comerciais
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-white/80 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Alerta de erro */}
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3 flex items-start gap-2.5 text-xs animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold">Não foi possível salvar</p>
                    <p className="text-red-700 mt-0.5">{errorMessage}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setErrorMessage(null)}
                    className="text-red-400 hover:text-red-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Tipo de Equipamento */}
              <div>
                <label className="text-[11px] font-bold text-gray-700 uppercase block mb-1.5">
                  Tipo de Equipamento *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTipo('inversor')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                      tipo === 'inversor'
                        ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-xs ring-1 ring-blue-500'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Cpu
                      className={`w-4 h-4 ${tipo === 'inversor' ? 'text-blue-600' : 'text-gray-400'}`}
                    />
                    <span>Inversor</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipo('modulo_fv')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                      tipo === 'modulo_fv'
                        ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-xs ring-1 ring-amber-500'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Sun
                      className={`w-4 h-4 ${tipo === 'modulo_fv' ? 'text-amber-600' : 'text-gray-400'}`}
                    />
                    <span>Módulo FV</span>
                  </button>
                </div>
              </div>

              {/* Marca e Modelo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-gray-700 uppercase block mb-1">
                    Marca *
                  </label>
                  <input
                    type="text"
                    required
                    value={marca}
                    onChange={(e) => {
                      setMarca(e.target.value)
                      if (errorMessage) setErrorMessage(null)
                    }}
                    placeholder="Ex: Huawei, Growatt, JA Solar"
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-700 uppercase block mb-1">
                    Modelo *
                  </label>
                  <input
                    type="text"
                    required
                    value={modelo}
                    onChange={(e) => {
                      setModelo(e.target.value)
                      if (errorMessage) setErrorMessage(null)
                    }}
                    placeholder="Ex: SUN2000-6KTL-L1, JAM66D45LB"
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Potência (W) e Garantia (anos) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-gray-700 uppercase block mb-1">
                    Potência (W) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="1"
                      required
                      value={potenciaW}
                      onChange={(e) => {
                        setPotenciaW(e.target.value)
                        if (errorMessage) setErrorMessage(null)
                      }}
                      placeholder="Ex: 6000 para 6kW ou 550 para painel"
                      className="w-full text-xs font-semibold pl-3 pr-10 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-gray-400 pointer-events-none">
                      W
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400 block mt-1">
                    {tipo === 'inversor'
                      ? 'Exemplo: 5000 W (5 kW) ou 6000 W (6 kW)'
                      : 'Exemplo: 550 W, 580 W ou 610 W'}
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-700 uppercase block mb-1">
                    Garantia (anos)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={garantiaAnos}
                      onChange={(e) => setGarantiaAnos(e.target.value)}
                      placeholder="Ex: 5, 10 ou 12"
                      className="w-full text-xs font-semibold pl-3 pr-14 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-gray-400 pointer-events-none">
                      anos
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400 block mt-1">
                    Tempo de garantia legal/de fábrica
                  </span>
                </div>
              </div>

              {/* Descrição Padrão */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-gray-700 uppercase block">
                    Descrição padrão
                  </label>
                  <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Texto que aparecerá na proposta
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={descricaoPadrao}
                  onChange={(e) => setDescricaoPadrao(e.target.value)}
                  placeholder="Ex: Inversor monofásico com 2 MPPTs, Wi-Fi integrado e monitoramento inteligente..."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-y"
                />
              </div>

              {/* Foto do Equipamento */}
              <div>
                <label className="text-[11px] font-bold text-gray-700 uppercase block mb-1.5">
                  Foto do equipamento (opcional)
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl inline-flex items-center gap-1.5 transition-colors border border-gray-200 active:scale-95"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Selecionar Imagem</span>
                  </button>

                  {previewUrl && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-red-200"
                    >
                      Remover Foto
                    </button>
                  )}
                </div>
                <span className="text-[10px] text-gray-400 block mt-1">
                  JPG, PNG ou WEBP com fundo branco ou transparente (máx. 10 MB).
                </span>

                {/* Preview */}
                {previewUrl && (
                  <div className="mt-3">
                    <span className="text-[10px] font-bold text-gray-500 block mb-1">
                      Pré-visualização:
                    </span>
                    <div className="relative h-36 bg-gray-50 rounded-xl overflow-hidden border border-gray-200 flex items-center justify-center p-2">
                      <img
                        src={previewUrl}
                        alt="Pré-visualização do equipamento"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Botões do Rodapé */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 border border-gray-300 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50 transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>{editingItem ? 'Salvar Alterações' : 'Cadastrar Equipamento'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {modalDeleteConfirmOpen && itemParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-[2px] animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-100">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-gray-900">Excluir Equipamento?</h3>
              <p className="text-xs text-gray-600">
                Tem certeza que deseja remover o equipamento{' '}
                <strong className="text-gray-900">
                  {itemParaExcluir.marca} {itemParaExcluir.modelo}
                </strong>
                ? Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setModalDeleteConfirmOpen(false)
                  setItemParaExcluir(null)
                }}
                disabled={isDeleting}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EquipamentosPage
