import React, { useState, useMemo } from 'react'
import {
  Building2,
  Plus,
  Search,
  Filter,
  Phone,
  Mail,
  MapPin,
  FileText,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  Tag,
  DollarSign,
  Calendar,
  Layers,
  ChevronRight,
  PackageCheck,
  ShieldCheck,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { Fornecedor, FornecedorEspecialidade, FornecedorOrcamento } from '@/types/crm'
import { validarCNPJ, formatarCNPJ } from '@/lib/orcamentoParser'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { toast } from 'sonner'
import pb from '@/lib/pocketbase/client'

const ESPECIALIDADES_CONFIG: Record<
  FornecedorEspecialidade,
  { label: string; bg: string; text: string; border: string }
> = {
  paineis: {
    label: 'Painéis Solares',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
  },
  inversores: {
    label: 'Inversores',
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
  },
  estruturas: {
    label: 'Estruturas de Fixação',
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-200',
  },
  acessorios: {
    label: 'Acessórios & Proteção',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
  },
  completo: {
    label: 'Kit Completo Fotovoltaico',
    bg: 'bg-emerald-100',
    text: 'text-emerald-900',
    border: 'border-emerald-300',
  },
}

export function Fornecedores() {
  const {
    fornecedores,
    fornecedoresOrcamentos,
    addFornecedor,
    updateFornecedor,
    removeFornecedor,
    removeFornecedorOrcamento,
    isLoading,
  } = useClientes()

  // Filtros e busca
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroEspecialidade, setFiltroEspecialidade] = useState<string>('todos')

  // Modais e Drawer
  const [modalCadastroOpen, setModalCadastroOpen] = useState(false)
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null)
  const [drawerFornecedor, setDrawerFornecedor] = useState<Fornecedor | null>(null)
  const [fornecedorParaExcluir, setFornecedorParaExcluir] = useState<Fornecedor | null>(null)
  const [orcamentoDetalheModal, setOrcamentoDetalheModal] = useState<FornecedorOrcamento | null>(
    null,
  )

  // Formulário State
  const [nomeEmpresa, setNomeEmpresa] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [cnpjError, setCnpjError] = useState<string | null>(null)
  const [contatoNome, setContatoNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [endereco, setEndereco] = useState('')
  const [especialidade, setEspecialidade] = useState<FornecedorEspecialidade>('completo')
  const [observacoes, setObservacoes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Resetar formulário
  const resetForm = () => {
    setNomeEmpresa('')
    setCnpj('')
    setCnpjError(null)
    setContatoNome('')
    setTelefone('')
    setEmail('')
    setEndereco('')
    setEspecialidade('completo')
    setObservacoes('')
    setEditingFornecedor(null)
  }

  const handleOpenCreateModal = () => {
    resetForm()
    setModalCadastroOpen(true)
  }

  const handleOpenEditModal = (f: Fornecedor) => {
    setEditingFornecedor(f)
    setNomeEmpresa(f.nome_empresa)
    setCnpj(f.cnpj || '')
    setCnpjError(null)
    setContatoNome(f.contato_nome || '')
    setTelefone(f.telefone || '')
    setEmail(f.email || '')
    setEndereco(f.endereco || '')
    setEspecialidade(f.especialidade || 'completo')
    setObservacoes(f.observacoes || '')
    setModalCadastroOpen(true)
  }

  const handleCnpjChange = (val: string) => {
    const formatted = formatarCNPJ(val)
    setCnpj(formatted)
    const raw = val.replace(/\D/g, '')
    if (raw.length === 14) {
      if (!validarCNPJ(raw)) {
        setCnpjError('CNPJ inválido (dígitos verificadores incorretos)')
      } else {
        setCnpjError(null)
      }
    } else if (raw.length > 0 && raw.length < 14) {
      setCnpjError('CNPJ incompleto (14 dígitos)')
    } else {
      setCnpjError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nomeEmpresa.trim()) {
      toast.error('Informe a razão social ou nome da empresa')
      return
    }

    if (cnpj.trim()) {
      const raw = cnpj.replace(/\D/g, '')
      if (raw.length > 0 && !validarCNPJ(raw)) {
        setCnpjError('CNPJ inválido')
        toast.error('Por favor, informe um CNPJ válido.')
        return
      }
    }

    setIsSubmitting(true)
    try {
      const payload: Partial<Fornecedor> = {
        nome_empresa: nomeEmpresa.trim(),
        cnpj: cnpj.trim() || undefined,
        contato_nome: contatoNome.trim() || undefined,
        telefone: telefone.trim() || undefined,
        email: email.trim() || undefined,
        endereco: endereco.trim() || undefined,
        especialidade,
        observacoes: observacoes.trim() || undefined,
      }

      if (editingFornecedor) {
        await updateFornecedor(editingFornecedor.id, payload)
        toast.success('Fornecedor atualizado com sucesso!')
        if (drawerFornecedor?.id === editingFornecedor.id) {
          setDrawerFornecedor({ ...drawerFornecedor, ...payload } as Fornecedor)
        }
      } else {
        await addFornecedor(payload)
        toast.success('Fornecedor cadastrado com sucesso!')
      }
      setModalCadastroOpen(false)
      resetForm()
    } catch (err) {
      console.error('Erro ao salvar fornecedor:', err)
      toast.error('Erro ao salvar fornecedor. Verifique os dados.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmExcluir = async () => {
    if (!fornecedorParaExcluir) return
    try {
      await removeFornecedor(fornecedorParaExcluir.id)
      toast.success(`Fornecedor "${fornecedorParaExcluir.nome_empresa}" excluído com sucesso.`)
      if (drawerFornecedor?.id === fornecedorParaExcluir.id) {
        setDrawerFornecedor(null)
      }
      setFornecedorParaExcluir(null)
    } catch (err) {
      console.error('Erro ao excluir fornecedor:', err)
      toast.error('Não foi possível excluir o fornecedor.')
    }
  }

  // Filtragem
  const fornecedoresFiltrados = useMemo(() => {
    return fornecedores.filter((f) => {
      const matchSearch =
        f.nome_empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.cnpj && f.cnpj.includes(searchTerm)) ||
        (f.contato_nome && f.contato_nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (f.telefone && f.telefone.includes(searchTerm)) ||
        (f.email && f.email.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchEspecialidade =
        filtroEspecialidade === 'todos' || f.especialidade === filtroEspecialidade

      return matchSearch && matchEspecialidade
    })
  }, [fornecedores, searchTerm, filtroEspecialidade])

  // Orçamentos por fornecedor
  const orcamentosDoFornecedorAtual = useMemo(() => {
    if (!drawerFornecedor) return []
    return fornecedoresOrcamentos.filter(
      (o) =>
        o.fornecedor_id === drawerFornecedor.id ||
        (o.nome_fornecedor &&
          o.nome_fornecedor.toLowerCase() === drawerFornecedor.nome_empresa.toLowerCase()),
    )
  }, [drawerFornecedor, fornecedoresOrcamentos])

  return (
    <div className="space-y-6">
      {/* Top Header / Ações */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-emerald-600" />
            Fornecedores de Equipamentos Fotovoltaicos
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Gestão de distribuidores, importadores e cotações de módulos, inversores e estruturas.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition-all hover:scale-[1.01]"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Fornecedor</span>
        </button>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por razão social, CNPJ, contato, telefone ou email..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />
          <select
            value={filtroEspecialidade}
            onChange={(e) => setFiltroEspecialidade(e.target.value)}
            className="w-full md:w-auto text-xs sm:text-sm font-semibold px-3 py-2 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="todos">Todas Especialidades</option>
            <option value="completo">Kit Completo</option>
            <option value="paineis">Painéis Solares</option>
            <option value="inversores">Inversores</option>
            <option value="estruturas">Estruturas</option>
            <option value="acessorios">Acessórios</option>
          </select>
        </div>
      </div>

      {/* Grid de Cards de Fornecedores */}
      {isLoading ? (
        <div className="p-12 text-center text-gray-400 text-sm">Carregando fornecedores...</div>
      ) : fornecedoresFiltrados.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-gray-300 space-y-3">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto" />
          <h3 className="text-sm font-bold text-gray-700">Nenhum fornecedor encontrado</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            {searchTerm || filtroEspecialidade !== 'todos'
              ? 'Nenhum fornecedor corresponde aos filtros selecionados. Tente alterar o termo de busca.'
              : 'Comece cadastrando os distribuidores de módulos, inversores e estruturas parceiros.'}
          </p>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Cadastrar Fornecedor</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {fornecedoresFiltrados.map((f) => {
            const espConfig =
              ESPECIALIDADES_CONFIG[f.especialidade] || ESPECIALIDADES_CONFIG.completo
            const orcs = fornecedoresOrcamentos.filter(
              (o) =>
                o.fornecedor_id === f.id ||
                (o.nome_fornecedor &&
                  o.nome_fornecedor.toLowerCase() === f.nome_empresa.toLowerCase()),
            )

            return (
              <div
                key={f.id}
                className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs hover:shadow-md transition-all p-5 flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  {/* Topo do Card */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${espConfig.bg} ${espConfig.text} ${espConfig.border} mb-1.5`}
                      >
                        <Tag className="w-3 h-3" />
                        {espConfig.label}
                      </span>
                      <h3 className="text-base font-bold text-gray-900 group-hover:text-emerald-700 transition-colors truncate">
                        {f.nome_empresa}
                      </h3>
                      {f.cnpj && (
                        <p className="text-xs text-gray-500 font-mono mt-0.5">CNPJ: {f.cnpj}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(f)}
                        className="p-1.5 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Editar fornecedor"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setFornecedorParaExcluir(f)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir fornecedor"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Informações de Contato */}
                  <div className="space-y-1.5 text-xs text-gray-600 pt-2 border-t border-gray-100">
                    {f.contato_nome && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 font-medium">Contato:</span>
                        <span className="font-semibold text-gray-800 truncate">
                          {f.contato_nome}
                        </span>
                      </div>
                    )}
                    {f.telefone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-medium text-gray-700">{f.telefone}</span>
                      </div>
                    )}
                    {f.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-medium text-gray-700 truncate">{f.email}</span>
                      </div>
                    )}
                    {f.endereco && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="font-medium text-gray-500 truncate">{f.endereco}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rodapé do Card com Contador de Orçamentos e Botão da Ficha */}
                <div className="pt-4 mt-3 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-gray-600">
                    <FileText className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-semibold text-gray-900">{orcs.length}</span>
                    <span className="text-gray-500">
                      {orcs.length === 1 ? 'orçamento' : 'orçamentos'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDrawerFornecedor(f)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                  >
                    <span>Ver Ficha</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* DRAWER / FICHA DO FORNECEDOR                                             */}
      {/* ========================================================================= */}
      {drawerFornecedor && (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-[1px]"
            onClick={() => setDrawerFornecedor(null)}
          />

          <div className="relative z-10 w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-gray-200 animate-in slide-in-from-right duration-250">
            {/* Header do Drawer */}
            <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {drawerFornecedor.nome_empresa}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    {drawerFornecedor.cnpj && (
                      <span className="text-xs text-gray-500 font-mono">
                        CNPJ: {drawerFornecedor.cnpj}
                      </span>
                    )}
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {ESPECIALIDADES_CONFIG[drawerFornecedor.especialidade]?.label ||
                        drawerFornecedor.especialidade}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(drawerFornecedor)}
                  className="p-2 text-gray-400 hover:text-emerald-700 rounded-lg hover:bg-white transition-colors"
                  title="Editar fornecedor"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerFornecedor(null)}
                  className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-white transition-colors"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Conteúdo com Scroll */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Informações Cadastrais */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200/80 space-y-2 text-xs">
                <h4 className="font-bold text-gray-800 text-[11px] uppercase tracking-wider mb-2">
                  Dados de Contato & Localização
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-700">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase">Contato</span>
                    <span className="font-semibold">
                      {drawerFornecedor.contato_nome || 'Não informado'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase">Telefone</span>
                    <span className="font-semibold">
                      {drawerFornecedor.telefone || 'Não informado'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase">Email</span>
                    <span className="font-semibold truncate block">
                      {drawerFornecedor.email || 'Não informado'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase">Endereço</span>
                    <span className="font-semibold truncate block">
                      {drawerFornecedor.endereco || 'Não informado'}
                    </span>
                  </div>
                </div>
                {drawerFornecedor.observacoes && (
                  <div className="pt-2 border-t border-gray-200 text-gray-600 italic">
                    {drawerFornecedor.observacoes}
                  </div>
                )}
              </div>

              {/* LISTA DE ORÇAMENTOS RECEBIDOS DELE COM DATA, NÚMERO DA REVISÃO E VALOR TOTAL */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    Histórico de Orçamentos Recebidos ({orcamentosDoFornecedorAtual.length})
                  </h4>
                  <span className="text-[11px] text-gray-500">Extraídos de PDF ou importados</span>
                </div>

                {orcamentosDoFornecedorAtual.length === 0 ? (
                  <div className="p-8 text-center rounded-xl border border-dashed border-gray-200 text-xs text-gray-500 space-y-2">
                    <FileText className="w-8 h-8 text-gray-300 mx-auto" />
                    <p>Nenhum orçamento cadastrado ou extraído para este fornecedor.</p>
                    <p className="text-[11px] text-gray-400">
                      Você pode extrair PDFs na aba "Dados Técnicos" do orçamento de energia solar.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orcamentosDoFornecedorAtual.map((orc) => {
                      return (
                        <div
                          key={orc.id}
                          className="p-4 rounded-xl border border-gray-200 bg-white hover:border-emerald-300 transition-colors shadow-2xs space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-gray-900">
                                  {orc.numero_revisao || 'Revisão Padrão'}
                                </span>
                                <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-gray-400" />
                                  {formatDate(orc.data)}
                                </span>
                              </div>
                              {orc.expand?.cliente_id && (
                                <p className="text-[11px] text-gray-600 mt-0.5">
                                  Cliente associado: <strong>{orc.expand.cliente_id.nome}</strong>
                                </p>
                              )}
                            </div>

                            <div className="text-right">
                              <span className="text-[10px] uppercase font-semibold text-gray-400 block">
                                Valor Total
                              </span>
                              <span className="text-sm font-black text-emerald-700">
                                {formatCurrency(orc.valor_total)}
                              </span>
                            </div>
                          </div>

                          {/* Resumo de itens extraídos */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-gray-100 text-[11px]">
                            <div className="bg-gray-50 p-2 rounded-lg">
                              <span className="text-gray-400 text-[10px] block font-bold uppercase">
                                Módulos ({orc.modulos?.length || 0})
                              </span>
                              {orc.modulos && orc.modulos.length > 0 ? (
                                <span className="font-medium text-gray-800 line-clamp-1">
                                  {orc.modulos[0].quantidade}x {orc.modulos[0].descricao}
                                </span>
                              ) : (
                                <span className="text-gray-400 italic">Não identificado</span>
                              )}
                            </div>

                            <div className="bg-gray-50 p-2 rounded-lg">
                              <span className="text-gray-400 text-[10px] block font-bold uppercase">
                                Inversores ({orc.inversores?.length || 0})
                              </span>
                              {orc.inversores && orc.inversores.length > 0 ? (
                                <span className="font-medium text-gray-800 line-clamp-1">
                                  {orc.inversores[0].quantidade}x {orc.inversores[0].descricao}
                                </span>
                              ) : (
                                <span className="text-gray-400 italic">Não identificado</span>
                              )}
                            </div>

                            <div className="bg-gray-50 p-2 rounded-lg">
                              <span className="text-gray-400 text-[10px] block font-bold uppercase">
                                Acessórios ({orc.acessorios?.length || 0})
                              </span>
                              <span className="font-medium text-gray-800 line-clamp-1">
                                {orc.acessorios?.length || 0} itens listados
                              </span>
                            </div>
                          </div>

                          {/* Ações do orçamento */}
                          <div className="pt-2 flex items-center justify-between text-xs">
                            <button
                              type="button"
                              onClick={() => setOrcamentoDetalheModal(orc)}
                              className="text-emerald-700 hover:text-emerald-800 font-bold text-xs inline-flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Ver Detalhes dos Itens</span>
                            </button>

                            <div className="flex items-center gap-2">
                              {orc.arquivo && (
                                <a
                                  href={pb.files.getURL(orc, orc.arquivo)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span>PDF Original</span>
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={async () => {
                                  if (confirm('Deseja excluir este orçamento de fornecedor?')) {
                                    await removeFornecedorOrcamento(orc.id)
                                    toast.success('Orçamento de fornecedor excluído.')
                                  }
                                }}
                                className="text-gray-400 hover:text-red-600 p-1"
                                title="Excluir cotação"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DETALHE DE ORÇAMENTO (ITENS AGRUPADOS)                             */}
      {/* ========================================================================= */}
      {orcamentoDetalheModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={() => setOrcamentoDetalheModal(null)}
          />
          <div className="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  {orcamentoDetalheModal.nome_fornecedor} — {orcamentoDetalheModal.numero_revisao}
                </h3>
                <span className="text-xs text-gray-500">
                  Data: {formatDate(orcamentoDetalheModal.data)} • Total:{' '}
                  <strong className="text-emerald-700">
                    {formatCurrency(orcamentoDetalheModal.valor_total)}
                  </strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOrcamentoDetalheModal(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              {/* Módulos */}
              <div className="space-y-1.5">
                <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-600" />
                  Módulos Fotovoltaicos
                </h4>
                {orcamentoDetalheModal.modulos && orcamentoDetalheModal.modulos.length > 0 ? (
                  <table className="w-full text-left border rounded-lg overflow-hidden">
                    <thead className="bg-gray-50 text-[10px] text-gray-500 uppercase">
                      <tr>
                        <th className="p-2">Descrição</th>
                        <th className="p-2 text-center w-20">Qtd</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-xs">
                      {orcamentoDetalheModal.modulos.map((m, i) => (
                        <tr key={i}>
                          <td className="p-2">{m.descricao}</td>
                          <td className="p-2 text-center font-bold">{m.quantidade}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-gray-400 italic">Nenhum módulo listado.</p>
                )}
              </div>

              {/* Inversores */}
              <div className="space-y-1.5">
                <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <PackageCheck className="w-3.5 h-3.5 text-blue-600" />
                  Inversores
                </h4>
                {orcamentoDetalheModal.inversores && orcamentoDetalheModal.inversores.length > 0 ? (
                  <table className="w-full text-left border rounded-lg overflow-hidden">
                    <thead className="bg-gray-50 text-[10px] text-gray-500 uppercase">
                      <tr>
                        <th className="p-2">Descrição</th>
                        <th className="p-2 text-center w-20">Qtd</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-xs">
                      {orcamentoDetalheModal.inversores.map((inv, i) => (
                        <tr key={i}>
                          <td className="p-2">{inv.descricao}</td>
                          <td className="p-2 text-center font-bold">{inv.quantidade}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-gray-400 italic">Nenhum inversor listado.</p>
                )}
              </div>

              {/* Acessórios */}
              <div className="space-y-1.5">
                <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                  Lista de Acessórios & Proteções
                </h4>
                {orcamentoDetalheModal.acessorios && orcamentoDetalheModal.acessorios.length > 0 ? (
                  <table className="w-full text-left border rounded-lg overflow-hidden">
                    <thead className="bg-gray-50 text-[10px] text-gray-500 uppercase">
                      <tr>
                        <th className="p-2">Descrição</th>
                        <th className="p-2 text-center w-20">Qtd</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-xs">
                      {orcamentoDetalheModal.acessorios.map((ac, i) => (
                        <tr key={i}>
                          <td className="p-2">{ac.descricao}</td>
                          <td className="p-2 text-center font-bold">{ac.quantidade}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-gray-400 italic">Nenhum acessório listado.</p>
                )}
              </div>

              {orcamentoDetalheModal.observacoes && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-xs">
                  <strong>Observações:</strong> {orcamentoDetalheModal.observacoes}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                type="button"
                onClick={() => setOrcamentoDetalheModal(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE CADASTRO / EDIÇÃO DE FORNECEDOR                                  */}
      {/* ========================================================================= */}
      {modalCadastroOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={() => setModalCadastroOpen(false)}
          />

          <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50/70">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600" />
                {editingFornecedor ? 'Editar Fornecedor' : 'Cadastrar Novo Fornecedor'}
              </h3>
              <button
                type="button"
                onClick={() => setModalCadastroOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              {/* Razão social / Nome */}
              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Nome da Empresa / Razão Social *
                </label>
                <input
                  type="text"
                  required
                  value={nomeEmpresa}
                  onChange={(e) => setNomeEmpresa(e.target.value)}
                  placeholder="Ex: Sol tecno Distribuidora"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* CNPJ e Especialidade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">
                    CNPJ (com validação)
                  </label>
                  <input
                    type="text"
                    value={cnpj}
                    onChange={(e) => handleCnpjChange(e.target.value)}
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                    className={`w-full px-3 py-2 text-xs font-mono rounded-lg border ${
                      cnpjError
                        ? 'border-red-400 focus:ring-red-400 bg-red-50/30'
                        : 'border-gray-300 focus:ring-emerald-500'
                    }`}
                  />
                  {cnpjError && (
                    <span className="text-[10px] text-red-600 flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3 h-3" />
                      {cnpjError}
                    </span>
                  )}
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">
                    Especialidade Principal *
                  </label>
                  <select
                    value={especialidade}
                    onChange={(e) => setEspecialidade(e.target.value as FornecedorEspecialidade)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="completo">Completo (Kit Solar)</option>
                    <option value="paineis">Painéis Fotovoltaicos</option>
                    <option value="inversores">Inversores</option>
                    <option value="estruturas">Estruturas de Fixação</option>
                    <option value="acessorios">Acessórios & Proteções</option>
                  </select>
                </div>
              </div>

              {/* Contato e Telefone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">
                    Nome do Contato / Representante
                  </label>
                  <input
                    type="text"
                    value={contatoNome}
                    onChange={(e) => setContatoNome(e.target.value)}
                    placeholder="Ex: Ricardo Mendes"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(54) 99999-9999"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Email e Endereço */}
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="comercial@fornecedor.com.br"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Endereço / Cidade / UF
                </label>
                <input
                  type="text"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  placeholder="Ex: Rodovia RS-135, Km 72, Erechim - RS"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Observações Internas
                </label>
                <textarea
                  rows={2}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Prazos de entrega médios, condições de frete, garantias, etc."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalCadastroOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !!cnpjError}
                  className="px-5 py-2 bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
                >
                  {isSubmitting
                    ? 'Salvando...'
                    : editingFornecedor
                      ? 'Atualizar Fornecedor'
                      : 'Cadastrar Fornecedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO                                         */}
      {/* ========================================================================= */}
      {fornecedorParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-[1px]"
            onClick={() => setFornecedorParaExcluir(null)}
          />
          <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl border border-gray-200 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Excluir Fornecedor</h3>
              <p className="text-xs text-gray-500 mt-1">
                Tem certeza que deseja excluir o fornecedor{' '}
                <strong>"{fornecedorParaExcluir.nome_empresa}"</strong>? Esta ação não pode ser
                desfeita.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFornecedorParaExcluir(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmExcluir}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Fornecedores
