import React, { useState, useMemo } from 'react'
import {
  Users,
  Search,
  Phone,
  Mail,
  Briefcase,
  Plus,
  Trash2,
  ExternalLink,
  Filter,
  CheckCircle2,
  ShieldCheck,
  Building,
  UserCheck,
  User,
  MessageSquare,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Info,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useClientes } from '@/contexts/ClientesContext'
import { Cliente, ContatoAdicional, ContatoConsolidadoItem, PapelContatoTipo } from '@/types/crm'
import { formatWhatsAppPhone } from '@/lib/formatters'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const ContatosView: React.FC = () => {
  const navigate = useNavigate()
  const {
    clientes,
    contatosAdicionais,
    openFichaCliente,
    addContatoAdicional,
    removeContatoAdicional,
    refreshContatosAdicionais,
  } = useClientes()

  // Estados de filtro e busca
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroPapel, setFiltroPapel] = useState<string>('todos')
  const [filtroApenasWhatsApp, setFiltroApenasWhatsApp] = useState(false)
  const [filtroClienteId, setFiltroClienteId] = useState<string>('todos')

  // Modal para adicionar contato adicional
  const [modalNovoOpen, setModalNovoOpen] = useState(false)
  const [novoClienteId, setNovoClienteId] = useState('')
  const [novoNome, setNovoNome] = useState('')
  const [novoPapel, setNovoPapel] = useState<PapelContatoTipo>('responsavel')
  const [novoCargo, setNovoCargo] = useState('')
  const [novoTelefone, setNovoTelefone] = useState('')
  const [novoEmail, setNovoEmail] = useState('')
  const [novoIsWhatsapp, setNovoIsWhatsapp] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Modal confirmação exclusão
  const [contatoParaExcluir, setContatoParaExcluir] = useState<{ id: string; nome: string } | null>(
    null,
  )
  const [isDeleting, setIsDeleting] = useState(false)

  // Map rápido de clientes por id
  const clientesMap = useMemo(() => {
    const map = new Map<string, Cliente>()
    clientes.forEach((c) => map.set(c.id, c))
    return map
  }, [clientes])

  // Lista consolidada de contatos
  // 1. Contato principal de cada cliente (nome, telefone/whatsapp autoritativo, email, papel: principal)
  // 2. Contatos adicionais cadastrados na coleção contatos_adicionais
  const contatosConsolidados = useMemo<ContatoConsolidadoItem[]>(() => {
    const itens: ContatoConsolidadoItem[] = []

    // 1. Contatos principais dos clientes
    clientes.forEach((cli) => {
      // Regra de autoridade do WhatsApp:
      // Se whatsapp está preenchido, ele é o autoritativo.
      // Telefone deve ser igualado ao WhatsApp; se vazio, usa o que houver.
      const wpp = (cli.whatsapp || '').trim()
      const tel = (cli.telefone || '').trim()
      const numeroAutoritativo = wpp || tel
      const contatoNome =
        cli.contato_principal?.trim() ||
        cli.contato?.trim() ||
        cli.nome?.trim() ||
        'Contato Principal'

      const cargoInferido =
        cli.contato && cli.contato !== cli.nome
          ? 'Responsável / Contato Direto'
          : cli.tipo_pessoa === 'juridica'
            ? 'Representante Legal / Titular'
            : 'Titular / Proprietário'

      itens.push({
        id: `cli_${cli.id}`,
        origem: 'cliente_principal',
        clienteId: cli.id,
        clienteNome: cli.nome,
        nome: contatoNome,
        papel: 'principal',
        papelLabel: 'Principal',
        cargo: cargoInferido,
        telefone: tel || undefined,
        email: cli.email?.trim() || undefined,
        isWhatsapp: Boolean(numeroAutoritativo),
        numeroAutoritativo,
        rawRecord: cli,
      })
    })

    // 2. Contatos adicionais
    contatosAdicionais.forEach((ca) => {
      const cli = clientesMap.get(ca.cliente)
      const cliNome = cli?.nome || 'Cliente não identificado'

      // Papel pode vir do campo ca.papel ou inferido do cargo
      let papelEfetivo: string = (ca.papel || '').trim().toLowerCase()
      if (!papelEfetivo) {
        const cargoLower = (ca.cargo || '').toLowerCase()
        if (cargoLower.includes('financ')) papelEfetivo = 'financeiro'
        else if (
          cargoLower.includes('téc') ||
          cargoLower.includes('tec') ||
          cargoLower.includes('engen')
        )
          papelEfetivo = 'tecnico'
        else if (
          cargoLower.includes('respons') ||
          cargoLower.includes('gerente') ||
          cargoLower.includes('diretor')
        )
          papelEfetivo = 'responsavel'
        else papelEfetivo = 'outro'
      }

      const papelLabels: Record<string, string> = {
        principal: 'Principal',
        financeiro: 'Financeiro',
        tecnico: 'Técnico',
        responsavel: 'Responsável',
        outro: 'Outro',
      }

      const rawTel = (ca.telefone || '').trim()
      const isWhats = Boolean(ca.is_whatsapp)

      itens.push({
        id: ca.id,
        origem: 'contato_adicional',
        clienteId: ca.cliente,
        clienteNome: cliNome,
        nome: ca.nome || 'Contato Adicional',
        papel: papelEfetivo,
        papelLabel: papelLabels[papelEfetivo] || papelEfetivo || 'Outro',
        cargo: ca.cargo?.trim() || undefined,
        telefone: rawTel || undefined,
        email: ca.email?.trim() || undefined,
        isWhatsapp: isWhats,
        numeroAutoritativo: rawTel,
        rawRecord: ca,
      })
    })

    return itens
  }, [clientes, contatosAdicionais, clientesMap])

  // Filtragem dos contatos
  const contatosFiltrados = useMemo(() => {
    return contatosConsolidados.filter((item) => {
      // Filtro de busca geral
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase()
        const matchNome = item.nome.toLowerCase().includes(query)
        const matchCliente = item.clienteNome.toLowerCase().includes(query)
        const matchTelefone = (item.telefone || '').includes(query)
        const matchEmail = (item.email || '').toLowerCase().includes(query)
        const matchCargo = (item.cargo || '').toLowerCase().includes(query)
        const matchPapel = item.papelLabel.toLowerCase().includes(query)
        if (
          !matchNome &&
          !matchCliente &&
          !matchTelefone &&
          !matchEmail &&
          !matchCargo &&
          !matchPapel
        ) {
          return false
        }
      }

      // Filtro por papel
      if (filtroPapel !== 'todos') {
        if (item.papel !== filtroPapel) return false
      }

      // Filtro de apenas WhatsApp
      if (filtroApenasWhatsApp) {
        if (!item.isWhatsapp) return false
      }

      // Filtro por cliente específico
      if (filtroClienteId !== 'todos') {
        if (item.clienteId !== filtroClienteId) return false
      }

      return true
    })
  }, [contatosConsolidados, searchTerm, filtroPapel, filtroApenasWhatsApp, filtroClienteId])

  // Agrupamento por cliente
  const contatosAgrupadosPorCliente = useMemo(() => {
    const mapa = new Map<
      string,
      { clienteId: string; clienteNome: string; contatos: ContatoConsolidadoItem[] }
    >()

    contatosFiltrados.forEach((item) => {
      if (!mapa.has(item.clienteId)) {
        mapa.set(item.clienteId, {
          clienteId: item.clienteId,
          clienteNome: item.clienteNome,
          contatos: [],
        })
      }
      mapa.get(item.clienteId)!.contatos.push(item)
    })

    // Ordenar clientes alfabeticamente
    return Array.from(mapa.values()).sort((a, b) =>
      a.clienteNome.localeCompare(b.clienteNome, 'pt-BR', { sensitivity: 'base' }),
    )
  }, [contatosFiltrados])

  // Métricas rápidas
  const totalContatos = contatosConsolidados.length
  const totalPrincipais = contatosConsolidados.filter(
    (c) => c.origem === 'cliente_principal',
  ).length
  const totalAdicionais = contatosConsolidados.filter(
    (c) => c.origem === 'contato_adicional',
  ).length
  const totalComWhatsapp = contatosConsolidados.filter((c) => c.isWhatsapp).length

  // Abrir chat do WhatsApp ou iniciar conversa na Central de Atendimento
  const handleIniciarWhatsApp = (item: ContatoConsolidadoItem) => {
    const num = item.numeroAutoritativo || item.telefone || ''
    if (!num) {
      toast.error('Este contato não possui número de WhatsApp cadastrado.')
      return
    }
    // Navega para a central de atendimento com busca pré-preenchida
    navigate(`/central-atendimento?busca=${encodeURIComponent(num)}`)
  }

  // Salvar novo contato adicional via modal
  const handleSalvarNovoContato = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoClienteId) {
      toast.error('Selecione o cliente para associar o contato.')
      return
    }
    if (!novoNome.trim()) {
      toast.error('Informe o nome do contato.')
      return
    }

    setIsSaving(true)
    try {
      await addContatoAdicional({
        cliente: novoClienteId,
        nome: novoNome.trim(),
        papel: novoPapel,
        cargo: novoCargo.trim() || undefined,
        telefone: novoTelefone.trim() || undefined,
        email: novoEmail.trim() || undefined,
        is_whatsapp: novoIsWhatsapp,
      })
      toast.success('Contato adicional cadastrado com sucesso!')
      setModalNovoOpen(false)
      // Limpa formulário
      setNovoClienteId('')
      setNovoNome('')
      setNovoPapel('responsavel')
      setNovoCargo('')
      setNovoTelefone('')
      setNovoEmail('')
      setNovoIsWhatsapp(false)
    } catch (err) {
      console.error('Erro ao adicionar contato:', err)
      toast.error('Erro ao salvar contato. Tente novamente.')
    } finally {
      setIsSaving(false)
    }
  }

  // Excluir contato adicional
  const handleExcluirContatoAdicional = async () => {
    if (!contatoParaExcluir) return
    setIsDeleting(true)
    try {
      await removeContatoAdicional(contatoParaExcluir.id)
      toast.success(`Contato "${contatoParaExcluir.nome}" removido com sucesso.`)
      setContatoParaExcluir(null)
    } catch (err) {
      console.error('Erro ao excluir contato:', err)
      toast.error('Erro ao remover contato adicional.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* Cabeçalho da Visão Consolidada */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <Users className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-gray-900">
                Visão Consolidada de Contatos
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                Aditiva
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Todos os contatos principais e adicionais dos clientes organizados em lista única
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refreshContatosAdicionais()}
            className="text-xs border-gray-200 text-gray-700 hover:bg-gray-50 cursor-pointer"
            title="Atualizar contatos"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1 text-emerald-600" />
            Atualizar
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => setModalNovoOpen(true)}
            className="text-xs font-bold bg-[#16A34A] hover:bg-[#15803D] text-white shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 mr-1 stroke-[2.5]" />
            Novo Contato
          </Button>
        </div>
      </div>

      {/* Regra de Ouro do WhatsApp — Banner Informativo e Auditável */}
      <div className="bg-gradient-to-r from-emerald-50 via-emerald-50/60 to-white border border-emerald-200/90 rounded-xl p-3 flex items-start gap-2.5 text-xs text-emerald-950 shadow-2xs">
        <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold text-emerald-900">WhatsApp como Fonte da Verdade: </span>
          O número de WhatsApp cadastrado é autoritativo. Todos os envios de mensagens utilizam
          exclusivamente o WhatsApp autoritativo do cliente.
        </div>
      </div>

      {/* Métricas Rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-white rounded-xl p-3 border border-gray-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-gray-500">Total de Contatos</span>
          <div className="text-xl font-bold text-gray-900 mt-0.5">{totalContatos}</div>
          <span className="text-[10px] text-gray-400">Na base ativa</span>
        </div>

        <div className="bg-white rounded-xl p-3 border border-gray-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-gray-500">Contatos Principais</span>
          <div className="text-xl font-bold text-emerald-700 mt-0.5">{totalPrincipais}</div>
          <span className="text-[10px] text-gray-400">1 por cliente cadastrado</span>
        </div>

        <div className="bg-white rounded-xl p-3 border border-gray-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-gray-500">Contatos Adicionais</span>
          <div className="text-xl font-bold text-blue-700 mt-0.5">{totalAdicionais}</div>
          <span className="text-[10px] text-gray-400">Sócios, financeiro, etc.</span>
        </div>

        <div className="bg-white rounded-xl p-3 border border-gray-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-gray-500">Com WhatsApp</span>
          <div className="text-xl font-bold text-emerald-600 mt-0.5">{totalComWhatsapp}</div>
          <span className="text-[10px] text-gray-400">Canais de disparo autorizados</span>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white p-3 rounded-xl border border-gray-200/80 shadow-2xs space-y-2.5">
        <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
          {/* Busca textual */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Buscar por contato, cliente, cargo, telefone ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-8 text-xs bg-gray-50/70 focus:bg-white border-gray-200 h-9"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filtros em linha */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filtro por Papel */}
            <div className="flex items-center gap-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={filtroPapel}
                onChange={(e) => setFiltroPapel(e.target.value)}
                className="text-xs bg-gray-50/70 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="todos">Todos os Papéis</option>
                <option value="principal">Principal</option>
                <option value="financeiro">Financeiro</option>
                <option value="tecnico">Técnico</option>
                <option value="responsavel">Responsável</option>
                <option value="outro">Outro</option>
              </select>
            </div>

            {/* Filtro por Cliente */}
            <div className="flex items-center gap-1.5 text-xs">
              <Building className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={filtroClienteId}
                onChange={(e) => setFiltroClienteId(e.target.value)}
                className="text-xs bg-gray-50/70 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer max-w-[200px] truncate"
              >
                <option value="todos">Todos os Clientes</option>
                {clientes.map((cli) => (
                  <option key={cli.id} value={cli.id}>
                    {cli.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggle apenas com WhatsApp */}
            <label className="inline-flex items-center gap-1.5 text-xs text-gray-700 bg-gray-50/70 border border-gray-200 rounded-lg px-2.5 py-1.5 cursor-pointer select-none hover:bg-gray-100">
              <input
                type="checkbox"
                checked={filtroApenasWhatsApp}
                onChange={(e) => setFiltroApenasWhatsApp(e.target.checked)}
                className="w-3.5 h-3.5 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
              />
              <span className="flex items-center gap-1 font-medium">
                <WhatsAppIcon className="w-3 h-3 text-emerald-600" />
                Apenas com WhatsApp
              </span>
            </label>

            {(searchTerm ||
              filtroPapel !== 'todos' ||
              filtroApenasWhatsApp ||
              filtroClienteId !== 'todos') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('')
                  setFiltroPapel('todos')
                  setFiltroApenasWhatsApp(false)
                  setFiltroClienteId('todos')
                }}
                className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold underline px-1 cursor-pointer"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        <div className="text-[11px] text-gray-500 flex items-center justify-between border-t border-gray-100 pt-1.5">
          <span>
            Exibindo <strong>{contatosFiltrados.length}</strong> contatos em{' '}
            <strong>{contatosAgrupadosPorCliente.length}</strong> clientes
          </span>
          <span className="text-[10px] text-gray-400">
            Dica: clique no nome do cliente para abrir sua Ficha Cadastral completa
          </span>
        </div>
      </div>

      {/* Lista Única Agrupada por Cliente */}
      {contatosAgrupadosPorCliente.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 space-y-2">
          <Users className="w-8 h-8 mx-auto text-gray-300" />
          <p className="text-sm font-semibold text-gray-700">Nenhum contato encontrado</p>
          <p className="text-xs text-gray-500">
            Tente ajustar os filtros ou a busca para localizar os contatos desejados.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {contatosAgrupadosPorCliente.map((grupo) => {
            const clienteReal = clientesMap.get(grupo.clienteId)

            return (
              <div
                key={grupo.clienteId}
                className="bg-white rounded-xl border border-gray-200/90 shadow-2xs overflow-hidden transition-all hover:border-emerald-300/80"
              >
                {/* Cabeçalho do Cliente com Acesso Rápido à Ficha */}
                <div className="bg-gradient-to-r from-gray-50 via-white to-gray-50/50 px-4 py-2.5 border-b border-gray-200/80 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={() => openFichaCliente(grupo.clienteId)}
                      className="text-xs sm:text-sm font-bold text-gray-900 hover:text-emerald-700 flex items-center gap-1.5 transition-colors cursor-pointer group truncate"
                      title="Abrir ficha completa do cliente"
                    >
                      <Building className="w-3.5 h-3.5 text-emerald-600 shrink-0 group-hover:scale-110 transition-transform" />
                      <span className="truncate">{grupo.clienteNome}</span>
                      <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-emerald-600 shrink-0 opacity-70 group-hover:opacity-100" />
                    </button>

                    {clienteReal?.cidade && (
                      <span className="text-[10px] text-gray-500 hidden sm:inline">
                        • {clienteReal.cidade}
                        {clienteReal.estado ? `/${clienteReal.estado}` : ''}
                      </span>
                    )}

                    {clienteReal?.status && (
                      <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-gray-100 text-gray-700 border border-gray-200 hidden md:inline">
                        {clienteReal.status}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      {grupo.contatos.length} {grupo.contatos.length === 1 ? 'contato' : 'contatos'}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setNovoClienteId(grupo.clienteId)
                        setModalNovoOpen(true)
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                      title="Adicionar contato para este cliente"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Adicionar</span>
                    </button>
                  </div>
                </div>

                {/* Linhas de Contatos deste Cliente */}
                <div className="divide-y divide-gray-100">
                  {grupo.contatos.map((contato) => {
                    const isPrincipal = contato.origem === 'cliente_principal'
                    const papelBadgeStyles: Record<string, string> = {
                      principal: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                      financeiro: 'bg-blue-100 text-blue-800 border-blue-300',
                      tecnico: 'bg-amber-100 text-amber-800 border-amber-300',
                      responsavel: 'bg-purple-100 text-purple-800 border-purple-300',
                      outro: 'bg-gray-100 text-gray-700 border-gray-300',
                    }

                    return (
                      <div
                        key={contato.id}
                        className={`p-3 sm:px-4 sm:py-3 flex flex-col md:flex-row md:items-center justify-between gap-2.5 transition-colors ${
                          isPrincipal ? 'bg-emerald-50/20' : 'hover:bg-gray-50/60'
                        }`}
                      >
                        {/* Identificação e Papel */}
                        <div className="flex items-center gap-2.5 min-w-[240px]">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 ${
                              isPrincipal
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'bg-gray-100 text-gray-600 border border-gray-200'
                            }`}
                          >
                            {isPrincipal ? (
                              <UserCheck className="w-3.5 h-3.5" />
                            ) : (
                              <User className="w-3.5 h-3.5" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-gray-900 truncate">
                                {contato.nome}
                              </span>

                              {/* Selo do Papel */}
                              <span
                                className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border ${
                                  papelBadgeStyles[contato.papel] || papelBadgeStyles.outro
                                }`}
                              >
                                {contato.papelLabel}
                              </span>

                              {/* Indicador se é WhatsApp autoritativo */}
                              {contato.isWhatsapp && (
                                <span
                                  className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-300"
                                  title="Número de WhatsApp do cliente (fonte da verdade autoritativa)"
                                >
                                  <WhatsAppIcon className="w-2.5 h-2.5 text-emerald-600" />
                                  WhatsApp
                                </span>
                              )}
                            </div>

                            {contato.cargo && (
                              <p className="text-[10px] text-gray-500 truncate mt-0.5">
                                {contato.cargo}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Dados de Comunicação (Telefone / WhatsApp / E-mail) */}
                        <div className="flex items-center gap-4 text-xs text-gray-600 flex-wrap">
                          {/* Telefone / WhatsApp */}
                          <div className="flex items-center gap-1.5 min-w-[130px]">
                            {contato.isWhatsapp ? (
                              <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            )}
                            <span className="font-mono text-gray-800 text-[11px]">
                              {contato.telefone
                                ? formatWhatsAppPhone(contato.telefone)
                                : 'Sem telefone'}
                            </span>
                          </div>

                          {/* E-mail */}
                          <div className="flex items-center gap-1.5 min-w-[150px] max-w-[220px]">
                            <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span
                              className="text-[11px] text-gray-700 truncate"
                              title={contato.email || 'Não informado'}
                            >
                              {contato.email || (
                                <span className="text-gray-400 italic">Sem e-mail</span>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Ações: Disparo WhatsApp e Exclusão (se adicional) */}
                        <div className="flex items-center justify-end gap-1.5 shrink-0 pt-1 md:pt-0 border-t md:border-t-0 border-gray-100">
                          {/* Botão de WhatsApp */}
                          {contato.isWhatsapp &&
                            (contato.numeroAutoritativo || contato.telefone) && (
                              <button
                                type="button"
                                onClick={() => handleIniciarWhatsApp(contato)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition-colors shadow-2xs cursor-pointer"
                                title="Iniciar conversa na Central de Atendimento"
                              >
                                <MessageSquare className="w-3 h-3 text-emerald-600" />
                                <span className="hidden sm:inline">WhatsApp</span>
                              </button>
                            )}

                          {/* Botão de Excluir Contato Adicional (apenas contatos adicionais) */}
                          {!isPrincipal && (
                            <button
                              type="button"
                              onClick={() =>
                                setContatoParaExcluir({
                                  id: contato.id,
                                  nome: contato.nome,
                                })
                              }
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                              title="Remover contato adicional"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal para Adicionar Novo Contato Adicional */}
      <Dialog open={modalNovoOpen} onOpenChange={setModalNovoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
              <Plus className="w-4 h-4 text-emerald-600" />
              Adicionar Contato ao Cliente
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Cadastre uma nova pessoa de contato vinculada a um cliente existente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarNovoContato} className="space-y-3 pt-1">
            <div>
              <Label className="text-xs font-semibold text-gray-700">Cliente *</Label>
              <select
                required
                value={novoClienteId}
                onChange={(e) => setNovoClienteId(e.target.value)}
                className="w-full text-xs bg-white border border-gray-300 rounded-md px-2.5 py-2 mt-1 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="">Selecione um cliente...</option>
                {clientes.map((cli) => (
                  <option key={cli.id} value={cli.id}>
                    {cli.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700">Nome do Contato *</Label>
              <Input
                required
                placeholder="Ex: Carlos Oliveira"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                className="text-xs mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-semibold text-gray-700">Papel *</Label>
                <select
                  value={novoPapel}
                  onChange={(e) => setNovoPapel(e.target.value as PapelContatoTipo)}
                  className="w-full text-xs bg-white border border-gray-300 rounded-md px-2.5 py-2 mt-1 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="principal">Principal</option>
                  <option value="financeiro">Financeiro</option>
                  <option value="tecnico">Técnico</option>
                  <option value="responsavel">Responsável</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-gray-700">Cargo / Função</Label>
                <Input
                  placeholder="Ex: Gerente Financeiro"
                  value={novoCargo}
                  onChange={(e) => setNovoCargo(e.target.value)}
                  className="text-xs mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-semibold text-gray-700">Telefone</Label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={novoTelefone}
                  onChange={(e) => setNovoTelefone(formatWhatsAppPhone(e.target.value))}
                  className="text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-gray-700">E-mail</Label>
                <Input
                  type="email"
                  placeholder="email@empresa.com"
                  value={novoEmail}
                  onChange={(e) => setNovoEmail(e.target.value)}
                  className="text-xs mt-1"
                />
              </div>
            </div>

            <div className="pt-1">
              <label className="inline-flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={novoIsWhatsapp}
                  onChange={(e) => setNovoIsWhatsapp(e.target.checked)}
                  className="w-3.5 h-3.5 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                />
                <span>Este número é WhatsApp de contato</span>
              </label>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalNovoOpen(false)}
                disabled={isSaving}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSaving || !novoNome.trim() || !novoClienteId}
                className="text-xs font-bold bg-[#16A34A] hover:bg-[#15803D] text-white"
              >
                {isSaving ? 'Salvando...' : 'Salvar Contato'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <Dialog
        open={Boolean(contatoParaExcluir)}
        onOpenChange={(open) => !open && setContatoParaExcluir(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-gray-900">
              Confirmar exclusão
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-600">
              Deseja realmente remover o contato adicional{' '}
              <strong>"{contatoParaExcluir?.nome}"</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setContatoParaExcluir(null)}
              disabled={isDeleting}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleExcluirContatoAdicional}
              disabled={isDeleting}
              className="text-xs font-bold"
            >
              {isDeleting ? 'Excluindo...' : 'Remover Contato'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ContatosView
