import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Users,
  Search,
  Phone,
  Mail,
  Plus,
  Trash2,
  Edit2,
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
  Link as LinkIcon,
  Briefcase,
  X,
  FileText,
  AlertCircle,
  HelpCircle,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useClientes } from '@/contexts/ClientesContext'
import { Cliente, ContatoUnico, PapelContatoUnico, Negocio } from '@/types/crm'
import { formatWhatsAppPhone, cleanPhoneDigits } from '@/lib/formatters'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  fetchContatosConsolidados,
  createContatoUnico,
  updateContatoUnico,
  deleteContatoUnico,
  aplicarRegraWhatsAppAutoritativo,
} from '@/services/contatosService'
import {
  detectarDuplicidadeTelefone,
  executarMesclagemDuplicado,
  type ContatoCorrespondente,
} from '@/services/duplicidadeContatoService'
import { ModalAvisoDuplicidadeTelefone } from '@/components/ModalAvisoDuplicidadeTelefone'
import { fetchNegocios } from '@/services/negociosService'

// Opções de Papel do Contato
export const PAPEIS_CONTATO: {
  value: PapelContatoUnico
  label: string
  badge: string
  desc: string
}[] = [
  {
    value: 'cliente',
    label: 'Cliente',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    desc: 'Titular ou contato principal de um cliente cadastrado',
  },
  {
    value: 'lead',
    label: 'Lead em Negociação',
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
    desc: 'Oportunidade em prospecção ou funil de vendas',
  },
  {
    value: 'fornecedor',
    label: 'Fornecedor',
    badge: 'bg-purple-100 text-purple-800 border-purple-300',
    desc: 'Fornecedor de placas, inversores, estruturas ou suprimentos',
  },
  {
    value: 'tecnico',
    label: 'Técnico / Instalador',
    badge: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    desc: 'Engenheiro, eletricista, técnico de campo ou instalador',
  },
  {
    value: 'parceiro',
    label: 'Parceiro',
    badge: 'bg-blue-100 text-blue-800 border-blue-300',
    desc: 'Projetista, integrador parceiro, corretor ou indicador',
  },
  {
    value: 'familiar',
    label: 'Familiar de Cliente',
    badge: 'bg-pink-100 text-pink-800 border-pink-300',
    desc: 'Cônjuge, filho(a) ou parente autorizado do cliente',
  },
  {
    value: 'financeiro',
    label: 'Financeiro',
    badge: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    desc: 'Responsável pelo pagamento, faturamento ou contabilidade',
  },
  {
    value: 'responsavel',
    label: 'Responsável / Gerente',
    badge: 'bg-violet-100 text-violet-800 border-violet-300',
    desc: 'Gerente, administrador ou ponto focal operacional',
  },
  {
    value: 'outro',
    label: 'Outro Relacionamento',
    badge: 'bg-gray-100 text-gray-800 border-gray-300',
    desc: 'Contato geral sem papel fixo no CRM',
  },
]

export const ContatosView: React.FC = () => {
  const navigate = useNavigate()
  const { clientes, openFichaCliente } = useClientes()

  // Lista de contatos da coleção unificada
  const [contatos, setContatos] = useState<ContatoUnico[]>([])
  const [negocios, setNegocios] = useState<Negocio[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroPapel, setFiltroPapel] = useState<string>('todos')
  const [filtroClienteId, setFiltroClienteId] = useState<string>('todos')
  const [filtroApenasWhatsApp, setFiltroApenasWhatsApp] = useState(false)
  const [filtroComVinculo, setFiltroComVinculo] = useState<string>('todos')

  // Modal de Criação / Edição
  const [modalOpen, setModalOpen] = useState(false)
  const [contatoEmEdicao, setContatoEmEdicao] = useState<ContatoUnico | null>(null)

  // Detecção de Duplicidade de Telefone/WhatsApp
  const [duplicadosEncontrados, setDuplicadosEncontrados] = useState<ContatoCorrespondente[]>([])
  const [modalDuplicidadeAberto, setModalDuplicidadeAberto] = useState(false)
  const [isMesclando, setIsMesclando] = useState(false)

  // Form State
  const [formNome, setFormNome] = useState('')
  const [formTelefone, setFormTelefone] = useState('')
  const [formWhatsApp, setFormWhatsApp] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPapel, setFormPapel] = useState<PapelContatoUnico>('outro')
  const [formCargo, setFormCargo] = useState('')
  const [formObservacoes, setFormObservacoes] = useState('')
  const [formClientesVinculados, setFormClientesVinculados] = useState<string[]>([])
  const [formNegociosVinculados, setFormNegociosVinculados] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)

  // Modal Confirmação de Exclusão
  const [contatoParaExcluir, setContatoParaExcluir] = useState<ContatoUnico | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Modal Visualizar Detalhes
  const [contatoDetalhes, setContatoDetalhes] = useState<ContatoUnico | null>(null)

  // Carregar contatos e negócios (consolidando contatos, clientes vivos e contatos adicionais)
  const carregarDados = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) setIsRefreshing(true)
        else setIsLoading(true)

        const [contatosData, negociosData] = await Promise.all([
          fetchContatosConsolidados({
            clientesPrecarregados: clientes && clientes.length > 0 ? clientes : undefined,
          }),
          fetchNegocios(),
        ])

        setContatos(contatosData)
        setNegocios(negociosData)
      } catch (err) {
        console.error('Erro ao carregar contatos consolidados:', err)
        toast.error('Erro ao carregar contatos. Tente novamente.')
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [clientes],
  )

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  // Maps rápidos para resolução de vínculos
  const clientesMap = useMemo(() => {
    const map = new Map<string, Cliente>()
    clientes.forEach((c) => map.set(c.id, c))
    return map
  }, [clientes])

  const negociosMap = useMemo(() => {
    const map = new Map<string, Negocio>()
    negocios.forEach((n) => map.set(n.id, n))
    return map
  }, [negocios])

  // Abrir Modal para Novo Contato
  const handleNovoContato = (prefillClienteId?: string) => {
    setContatoEmEdicao(null)
    setFormNome('')
    setFormTelefone('')
    setFormWhatsApp('')
    setFormEmail('')
    setFormPapel(prefillClienteId ? 'cliente' : 'outro')
    setFormCargo('')
    setFormObservacoes('')
    setFormClientesVinculados(prefillClienteId ? [prefillClienteId] : [])
    setFormNegociosVinculados([])
    setModalOpen(true)
  }

  // Abrir Modal para Edição
  const handleEditarContato = (contato: ContatoUnico) => {
    setContatoEmEdicao(contato)
    setFormNome(contato.nome || '')
    setFormTelefone(contato.telefone || '')
    setFormWhatsApp(contato.whatsapp || '')
    setFormEmail(contato.email || '')
    setFormPapel((contato.papel as PapelContatoUnico) || 'outro')
    setFormCargo(contato.cargo || '')
    setFormObservacoes(contato.observacoes || '')
    setFormClientesVinculados(
      Array.isArray(contato.clientes_vinculados) ? contato.clientes_vinculados : [],
    )
    setFormNegociosVinculados(
      Array.isArray(contato.negocios_vinculados) ? contato.negocios_vinculados : [],
    )
    setModalOpen(true)
  }

  // Disparar sincronização com a Regra do WhatsApp Autoritativo
  const handleTelefoneBlur = () => {
    // Se whatsapp estiver vazio e telefone preenchido: preenche whatsapp
    if (!formWhatsApp.trim() && formTelefone.trim()) {
      setFormWhatsApp(formTelefone.trim())
    }
  }

  const handleWhatsAppBlur = () => {
    // Regra autoritativa: se whatsapp estiver preenchido e divergir do telefone, o telefone se iguala ao WhatsApp
    if (formWhatsApp.trim()) {
      setFormTelefone(formWhatsApp.trim())
    }
  }

  // Executa salvamento real do contato (direto ou após confirmação de duplicidade)
  const executarPersistenciaContato = async (ignorarChecagemDuplicados = false) => {
    if (!formNome.trim()) {
      toast.error('Informe o nome do contato.')
      return
    }

    // Aplica regra de ouro autoritativa
    const telefones = aplicarRegraWhatsAppAutoritativo({
      telefone: formTelefone,
      whatsapp: formWhatsApp,
    })

    // 1. Checagem de duplicidade de Telefone / WhatsApp antes de persistir
    if (!ignorarChecagemDuplicados && (telefones.telefone || telefones.whatsapp)) {
      const duplicados = await detectarDuplicidadeTelefone({
        telefone: telefones.telefone,
        whatsapp: telefones.whatsapp,
        ignorarId: contatoEmEdicao?.id,
        ignorarOrigem: 'contato_unico',
        clientesPrecarregados: clientes,
        contatosUnicosPrecarregados: contatos,
      })

      if (duplicados.length > 0) {
        setDuplicadosEncontrados(duplicados)
        setModalDuplicidadeAberto(true)
        return
      }
    }

    setIsSaving(true)
    try {
      if (contatoEmEdicao) {
        // Se for um contato consolidado ainda não persistido diretamente em `contatos`
        const isVirtual =
          contatoEmEdicao.id.startsWith('cli_') ||
          contatoEmEdicao.id.startsWith('ca_') ||
          contatoEmEdicao.origem_registro === 'cliente_base_viva' ||
          contatoEmEdicao.origem_registro === 'contato_adicional'

        if (isVirtual) {
          // Persiste na coleção contatos unificada
          const created = await createContatoUnico({
            nome: formNome.trim(),
            telefone: telefones.telefone,
            whatsapp: telefones.whatsapp,
            email: formEmail.trim(),
            papel: formPapel,
            cargo: formCargo.trim(),
            observacoes: formObservacoes.trim(),
            clientes_vinculados: formClientesVinculados,
            negocios_vinculados: formNegociosVinculados,
            origem_registro: 'area_contatos_unificada',
          })
          setContatos((prev) => prev.map((c) => (c.id === contatoEmEdicao.id ? created : c)))
          toast.success(`Contato "${created.nome}" consolidado e salvo com sucesso!`)
        } else {
          const updated = await updateContatoUnico(contatoEmEdicao.id, {
            nome: formNome.trim(),
            telefone: telefones.telefone,
            whatsapp: telefones.whatsapp,
            email: formEmail.trim(),
            papel: formPapel,
            cargo: formCargo.trim(),
            observacoes: formObservacoes.trim(),
            clientes_vinculados: formClientesVinculados,
            negocios_vinculados: formNegociosVinculados,
          })
          setContatos((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
          toast.success(`Contato "${updated.nome}" atualizado com sucesso!`)
        }
      } else {
        const created = await createContatoUnico({
          nome: formNome.trim(),
          telefone: telefones.telefone,
          whatsapp: telefones.whatsapp,
          email: formEmail.trim(),
          papel: formPapel,
          cargo: formCargo.trim(),
          observacoes: formObservacoes.trim(),
          clientes_vinculados: formClientesVinculados,
          negocios_vinculados: formNegociosVinculados,
          origem_registro: 'area_contatos_unificada',
        })
        setContatos((prev) => [created, ...prev])
        toast.success(`Contato "${created.nome}" cadastrado com sucesso!`)
      }
      setModalOpen(false)
    } catch (err) {
      console.error('Erro ao salvar contato:', err)
      toast.error('Não foi possível salvar o contato. Verifique os dados e tente novamente.')
    } finally {
      setIsSaving(false)
    }
  }

  // Submeter Criação / Edição
  const handleSalvarContato = async (e: React.FormEvent) => {
    e.preventDefault()
    await executarPersistenciaContato(false)
  }

  // Callback de mesclagem acionado pelo modal de duplicidade
  const handleConfirmarMesclagemContato = async (destino: ContatoCorrespondente) => {
    setIsMesclando(true)
    try {
      await executarMesclagemDuplicado({
        registroDestino: destino,
        dadosNovos: {
          nome: formNome.trim(),
          telefone: formTelefone.trim() || undefined,
          whatsapp: formWhatsApp.trim() || undefined,
          email: formEmail.trim() || undefined,
          cargo: formCargo.trim() || undefined,
          observacoes: formObservacoes.trim() || undefined,
          papel: formPapel,
        },
        idOrigemEdicao: contatoEmEdicao?.id,
        origemEdicaoTipo: 'contato_unico',
      })

      toast.success(`Contato mesclado com sucesso em "${destino.nome}"!`)
      setModalDuplicidadeAberto(false)
      setModalOpen(false)
      await carregarDados(true)
    } catch (err) {
      console.error('Erro ao mesclar contato:', err)
      toast.error('Não foi possível mesclar os registros.')
    } finally {
      setIsMesclando(false)
    }
  }

  // Confirmar Exclusão
  const handleConfirmarExclusao = async () => {
    if (!contatoParaExcluir) return
    setIsDeleting(true)
    try {
      // Se for virtual (derivado de cliente ou contato_adicional), avisa e não tenta deletar na tabela contatos
      if (
        contatoParaExcluir.id.startsWith('cli_') ||
        contatoParaExcluir.origem_registro === 'cliente_base_viva'
      ) {
        toast.info(
          'Este contato é o titular de um cliente da base viva. Para removê-lo, gerencie o cliente na tela de Clientes.',
        )
        setContatoParaExcluir(null)
        return
      }
      if (
        contatoParaExcluir.id.startsWith('ca_') ||
        contatoParaExcluir.origem_registro === 'contato_adicional'
      ) {
        toast.info(
          'Este contato é um contato secundário vinculado a um cliente. Para removê-lo, acesse a ficha do cliente.',
        )
        setContatoParaExcluir(null)
        return
      }

      await deleteContatoUnico(contatoParaExcluir.id)
      setContatos((prev) => prev.filter((c) => c.id !== contatoParaExcluir.id))
      toast.success(`Contato "${contatoParaExcluir.nome}" excluído.`)
      setContatoParaExcluir(null)
    } catch (err) {
      console.error('Erro ao excluir contato:', err)
      toast.error('Erro ao excluir o contato.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Filtragem dos Contatos
  const contatosFiltrados = useMemo(() => {
    return contatos.filter((c) => {
      // 1. Busca textual (nome, telefone, whatsapp, email, cargo, observações)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim()
        const digitosBusca = cleanPhoneDigits(term)
        const matchNome = (c.nome || '').toLowerCase().includes(term)
        const matchEmail = (c.email || '').toLowerCase().includes(term)
        const matchCargo = (c.cargo || '').toLowerCase().includes(term)
        const matchObs = (c.observacoes || '').toLowerCase().includes(term)
        const matchTel = (c.telefone || '').toLowerCase().includes(term)
        const matchWpp = (c.whatsapp || '').toLowerCase().includes(term)
        const matchDigitos =
          digitosBusca.length >= 4 &&
          (cleanPhoneDigits(c.telefone || '').includes(digitosBusca) ||
            cleanPhoneDigits(c.whatsapp || '').includes(digitosBusca))

        // Match por nome de cliente vinculado
        const matchClientesVinculados = (c.clientes_vinculados || []).some((cliId) => {
          const cli = clientesMap.get(cliId)
          return cli && cli.nome.toLowerCase().includes(term)
        })

        if (
          !matchNome &&
          !matchEmail &&
          !matchCargo &&
          !matchObs &&
          !matchTel &&
          !matchWpp &&
          !matchDigitos &&
          !matchClientesVinculados
        ) {
          return false
        }
      }

      // 2. Filtro por papel
      if (filtroPapel !== 'todos') {
        if (c.papel !== filtroPapel) return false
      }

      // 3. Filtro por cliente vinculado
      if (filtroClienteId !== 'todos') {
        const vincs = Array.isArray(c.clientes_vinculados) ? c.clientes_vinculados : []
        if (!vincs.includes(filtroClienteId)) return false
      }

      // 4. Apenas com WhatsApp
      if (filtroApenasWhatsApp) {
        const wppDigits = cleanPhoneDigits(c.whatsapp || '')
        if (!wppDigits || wppDigits === '00000000000' || wppDigits.length < 8) return false
      }

      // 5. Filtro de vínculos
      if (filtroComVinculo === 'com_cliente') {
        if (!c.clientes_vinculados || c.clientes_vinculados.length === 0) return false
      } else if (filtroComVinculo === 'sem_vinculo') {
        const hasCli = c.clientes_vinculados && c.clientes_vinculados.length > 0
        const hasNeg = c.negocios_vinculados && c.negocios_vinculados.length > 0
        if (hasCli || hasNeg) return false
      }

      return true
    })
  }, [
    contatos,
    searchTerm,
    filtroPapel,
    filtroClienteId,
    filtroApenasWhatsApp,
    filtroComVinculo,
    clientesMap,
  ])

  // Ações de WhatsApp
  const handleAbrirWhatsApp = (telefoneOuWpp?: string) => {
    if (!telefoneOuWpp) {
      toast.error('Este contato não possui número cadastrado.')
      return
    }
    const digitos = cleanPhoneDigits(telefoneOuWpp)
    if (!digitos || digitos === '00000000000' || digitos.length < 8) {
      toast.error('Número de WhatsApp inválido.')
      return
    }
    navigate(`/central-atendimento?busca=${encodeURIComponent(digitos)}`)
  }

  // Toggle vínculo cliente no modal
  const handleToggleVinculoCliente = (clienteId: string) => {
    setFormClientesVinculados((prev) =>
      prev.includes(clienteId) ? prev.filter((id) => id !== clienteId) : [...prev, clienteId],
    )
  }

  // Toggle vínculo negócio no modal
  const handleToggleVinculoNegocio = (negocioId: string) => {
    setFormNegociosVinculados((prev) =>
      prev.includes(negocioId) ? prev.filter((id) => id !== negocioId) : [...prev, negocioId],
    )
  }

  // Métricas
  const totalContatos = contatos.length
  const totalComWhatsApp = contatos.filter((c) => {
    const d = cleanPhoneDigits(c.whatsapp || '')
    return d && d !== '00000000000' && d.length >= 8
  }).length
  const totalComVinculoCliente = contatos.filter(
    (c) => c.clientes_vinculados && c.clientes_vinculados.length > 0,
  ).length
  const totalSemVinculo = contatos.filter((c) => {
    const hasCli = c.clientes_vinculados && c.clientes_vinculados.length > 0
    const hasNeg = c.negocios_vinculados && c.negocios_vinculados.length > 0
    return !hasCli && !hasNeg
  }).length

  // Helper para badge de papel
  const renderPapelBadge = (papelVal: string) => {
    const found = PAPEIS_CONTATO.find((p) => p.value === papelVal)
    const label = found?.label || papelVal || 'Outro'
    const badgeStyle = found?.badge || 'bg-gray-100 text-gray-800 border-gray-300'

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${badgeStyle}`}
        title={found?.desc || label}
      >
        {label}
      </span>
    )
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* Cabeçalho da Área Única de Contatos */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <Users className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-gray-900">
                Cadastro Único de Contatos
              </h2>
            </div>
            <p className="text-xs text-gray-500">
              Todos os contatos do CRM reunidos em um único lugar: clientes, leads, fornecedores,
              técnicos, parceiros e familiares
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => carregarDados(true)}
            disabled={isRefreshing}
            className="text-xs border-gray-200 text-gray-700 hover:bg-gray-50 cursor-pointer"
            title="Recarregar contatos do banco"
          >
            <RotateCcw
              className={`w-3.5 h-3.5 mr-1 text-emerald-600 ${isRefreshing ? 'animate-spin' : ''}`}
            />
            Atualizar
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => handleNovoContato()}
            className="text-xs font-bold bg-[#16A34A] hover:bg-[#15803D] text-white shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 mr-1 stroke-[2.5]" />
            Novo Contato
          </Button>
        </div>
      </div>

      {/* Regra de Ouro do WhatsApp — Banner Informativo e Auditável */}

      {/* Métricas Rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3"></div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white p-3 rounded-xl border border-gray-200/80 shadow-2xs space-y-2.5">
        <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
          {/* Busca textual */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Buscar por nome, telefone, WhatsApp, e-mail, cliente vinculado ou cargo..."
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

          {/* Filtros Dropdown */}
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
                {PAPEIS_CONTATO.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por Cliente */}
            <div className="flex items-center gap-1.5 text-xs">
              <Building className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={filtroClienteId}
                onChange={(e) => setFiltroClienteId(e.target.value)}
                className="text-xs bg-gray-50/70 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer max-w-[180px] truncate"
              >
                <option value="todos">Todos os Clientes</option>
                {clientes.map((cli) => (
                  <option key={cli.id} value={cli.id}>
                    {cli.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por Status do Vínculo */}
            <div className="flex items-center gap-1.5 text-xs">
              <LinkIcon className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={filtroComVinculo}
                onChange={(e) => setFiltroComVinculo(e.target.value)}
                className="text-xs bg-gray-50/70 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="todos">Todos os vínculos</option>
                <option value="com_cliente">Com cliente vinculado</option>
                <option value="sem_vinculo">Sem nenhum vínculo</option>
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
                Com WhatsApp
              </span>
            </label>

            {(searchTerm ||
              filtroPapel !== 'todos' ||
              filtroClienteId !== 'todos' ||
              filtroComVinculo !== 'todos' ||
              filtroApenasWhatsApp) && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('')
                  setFiltroPapel('todos')
                  setFiltroClienteId('todos')
                  setFiltroComVinculo('todos')
                  setFiltroApenasWhatsApp(false)
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
            Exibindo <strong>{contatosFiltrados.length}</strong> de <strong>{totalContatos}</strong>{' '}
            contatos cadastrados
          </span>
          <span className="text-[10px] text-gray-400">
            Dica: clique em "Editar" para vincular um mesmo contato a múltiplos clientes sem
            duplicar
          </span>
        </div>
      </div>

      {/* Lista de Contatos */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 space-y-2">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-500">Carregando contatos...</p>
        </div>
      ) : contatosFiltrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 space-y-3">
          <Users className="w-10 h-10 mx-auto text-gray-300" />
          <p className="text-sm font-semibold text-gray-700">Nenhum contato encontrado</p>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            {searchTerm || filtroPapel !== 'todos' || filtroClienteId !== 'todos'
              ? 'Tente ajustar os filtros ou a busca para localizar os contatos desejados.'
              : 'Cadastre o primeiro contato no sistema usando o botão "Novo Contato" acima.'}
          </p>
          <Button
            type="button"
            size="sm"
            onClick={() => handleNovoContato()}
            className="text-xs font-bold bg-[#16A34A] hover:bg-[#15803D] text-white"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Cadastrar Contato
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs overflow-hidden">
          {/* Tabela Desktop */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#F8FAF9] border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Nome & Cargo</th>
                  <th className="py-3 px-3">Papel</th>
                  <th className="py-3 px-3">WhatsApp / Telefone</th>
                  <th className="py-3 px-3">E-mail</th>
                  <th className="py-3 px-4 min-w-[200px]">Clientes Vinculados (N:N)</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {contatosFiltrados.map((contato) => {
                  const numWpp = contato.whatsapp || contato.telefone || ''
                  const wppDigitos = cleanPhoneDigits(numWpp)
                  const temWppValido = Boolean(
                    wppDigitos && wppDigitos !== '00000000000' && wppDigitos.length >= 8,
                  )

                  const clientesIds = Array.isArray(contato.clientes_vinculados)
                    ? contato.clientes_vinculados
                    : []
                  const clientesVinculados = clientesIds
                    .map((id) => clientesMap.get(id))
                    .filter(Boolean) as Cliente[]

                  return (
                    <tr key={contato.id} className="hover:bg-emerald-50/20 transition-colors group">
                      {/* Nome & Cargo */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center font-bold text-xs shrink-0">
                            {(contato.nome || 'C').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-gray-900 block truncate max-w-[220px]">
                              {contato.nome}
                            </span>
                            {contato.cargo ? (
                              <span className="text-[10px] text-gray-500 block truncate max-w-[220px]">
                                {contato.cargo}
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-400 italic block">
                                Sem cargo registrado
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Papel */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {renderPapelBadge(contato.papel)}
                      </td>

                      {/* WhatsApp / Telefone (com regra autoritativa) */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="space-y-0.5">
                          {temWppValido ? (
                            <div className="flex items-center gap-1.5 font-mono text-gray-800">
                              <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="font-semibold">{formatWhatsAppPhone(numWpp)}</span>
                              <span
                                className="text-[9px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-sans font-bold"
                                title="Número autoritativo do contato"
                              >
                                Principal
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic text-[11px] flex items-center gap-1">
                              <Phone className="w-3 h-3 text-gray-300" />
                              Sem telefone
                            </span>
                          )}

                          {contato.telefone &&
                            contato.telefone !== contato.whatsapp &&
                            contato.telefone !== '00000000000' && (
                              <div className="text-[10px] text-gray-400 font-mono">
                                Tel: {formatWhatsAppPhone(contato.telefone)}
                              </div>
                            )}
                        </div>
                      </td>

                      {/* E-mail */}
                      <td className="py-3 px-3">
                        {contato.email ? (
                          <div
                            className="flex items-center gap-1 text-gray-700 truncate max-w-[180px]"
                            title={contato.email}
                          >
                            <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                            <span className="truncate">{contato.email}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">Sem e-mail</span>
                        )}
                      </td>

                      {/* Clientes Vinculados (N:N) */}
                      <td className="py-3 px-4">
                        {clientesVinculados.length > 0 ? (
                          <div className="flex flex-wrap gap-1 items-center">
                            {clientesVinculados.map((cli) => (
                              <button
                                key={cli.id}
                                type="button"
                                onClick={() => openFichaCliente(cli.id)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-[10px] font-semibold transition-colors cursor-pointer"
                                title="Abrir ficha do cliente vinculado"
                              >
                                <Building className="w-2.5 h-2.5 text-blue-600" />
                                <span className="max-w-[130px] truncate">{cli.nome}</span>
                                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">
                            Nenhum cliente vinculado
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botão WhatsApp */}
                          {temWppValido && (
                            <button
                              type="button"
                              onClick={() => handleAbrirWhatsApp(numWpp)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition-colors shadow-2xs cursor-pointer"
                              title="Iniciar conversa no WhatsApp"
                            >
                              <MessageSquare className="w-3 h-3 text-emerald-600" />
                              <span className="hidden sm:inline">WhatsApp</span>
                            </button>
                          )}

                          {/* Ver Detalhes */}
                          <button
                            type="button"
                            onClick={() => setContatoDetalhes(contato)}
                            className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Ver ficha completa do contato"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          {/* Editar */}
                          <button
                            type="button"
                            onClick={() => handleEditarContato(contato)}
                            className="p-1.5 text-gray-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Editar contato e vínculos"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Excluir */}
                          <button
                            type="button"
                            onClick={() => setContatoParaExcluir(contato)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Excluir contato"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Criação / Edição de Contato */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              {contatoEmEdicao ? 'Editar Contato' : 'Novo Contato'}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              {contatoEmEdicao
                ? 'Atualize os dados e vínculos deste contato. Um mesmo contato pode estar vinculado a múltiplos clientes.'
                : 'Cadastre um novo contato independente no CRM ou vincule-o a clientes existentes.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarContato} className="space-y-3.5 pt-1">
            {/* Nome Completo */}
            <div>
              <Label className="text-xs font-semibold text-gray-700">Nome do Contato *</Label>
              <Input
                required
                placeholder="Ex: Carlos Eduardo Silveira"
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
                className="text-xs mt-1"
                autoFocus
              />
            </div>

            {/* Papel e Cargo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <Label className="text-xs font-semibold text-gray-700">Papel do Contato *</Label>
                <select
                  value={formPapel}
                  onChange={(e) => setFormPapel(e.target.value as PapelContatoUnico)}
                  className="w-full text-xs bg-white border border-gray-300 rounded-md px-2.5 py-2 mt-1 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  {PAPEIS_CONTATO.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-gray-700">Cargo / Função</Label>
                <Input
                  placeholder="Ex: Gerente Geral, Sócio, Eletricista..."
                  value={formCargo}
                  onChange={(e) => setFormCargo(e.target.value)}
                  className="text-xs mt-1"
                />
              </div>
            </div>

            {/* WhatsApp e Telefone com Regra Autoritativa */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-emerald-50/40 p-2.5 rounded-xl border border-emerald-200">
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                    <WhatsAppIcon className="w-3 h-3 text-emerald-600" />
                    WhatsApp (Autoritativo)
                  </Label>
                  <span className="text-[9px] text-emerald-700 font-semibold">
                    Fonte da Verdade
                  </span>
                </div>
                <Input
                  placeholder="(00) 00000-0000"
                  value={formWhatsApp}
                  onChange={(e) => setFormWhatsApp(formatWhatsAppPhone(e.target.value))}
                  onBlur={handleWhatsAppBlur}
                  className="text-xs mt-1 bg-white border-emerald-300 focus:ring-emerald-500"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-gray-700">Telefone / Fixo</Label>
                <Input
                  placeholder="(00) 0000-0000"
                  value={formTelefone}
                  onChange={(e) => setFormTelefone(formatWhatsAppPhone(e.target.value))}
                  onBlur={handleTelefoneBlur}
                  className="text-xs mt-1 bg-white"
                />
              </div>

              <div className="col-span-1 sm:col-span-2 text-[10px] text-emerald-800">
                • Ao preencher o WhatsApp, o telefone será igualado ao WhatsApp caso divirjam.
              </div>
            </div>

            {/* E-mail */}
            <div>
              <Label className="text-xs font-semibold text-gray-700">E-mail</Label>
              <Input
                type="email"
                placeholder="contato@empresa.com.br"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                className="text-xs mt-1"
              />
            </div>

            {/* Vínculo N:N com Clientes */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-blue-600" />
                  Vincular a Clientes ({formClientesVinculados.length} selecionados)
                </Label>
                <span className="text-[10px] text-gray-400">Relação muitos-para-muitos</span>
              </div>
              <div className="max-h-36 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1 bg-gray-50/50">
                {clientes.map((cli) => {
                  const isChecked = formClientesVinculados.includes(cli.id)
                  return (
                    <label
                      key={cli.id}
                      className={`flex items-center gap-2 p-1.5 rounded-md text-xs cursor-pointer select-none transition-colors ${
                        isChecked ? 'bg-blue-100/70 text-blue-900 font-semibold' : 'hover:bg-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleVinculoCliente(cli.id)}
                        className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="truncate">{cli.nome}</span>
                      {cli.cidade && (
                        <span className="text-[10px] text-gray-400 ml-auto">({cli.cidade})</span>
                      )}
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Vínculo com Negócios (se houver negócios cadastrados) */}
            {negocios.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-amber-600" />
                    Vincular a Negócios ({formNegociosVinculados.length} selecionados)
                  </Label>
                  <span className="text-[10px] text-gray-400">Opcional</span>
                </div>
                <div className="max-h-28 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1 bg-gray-50/50">
                  {negocios.map((neg) => {
                    const isChecked = formNegociosVinculados.includes(neg.id)
                    const cliDoNeg = neg.cliente_id ? clientesMap.get(neg.cliente_id) : null
                    return (
                      <label
                        key={neg.id}
                        className={`flex items-center gap-2 p-1.5 rounded-md text-xs cursor-pointer select-none transition-colors ${
                          isChecked
                            ? 'bg-amber-100/70 text-amber-900 font-semibold'
                            : 'hover:bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleVinculoNegocio(neg.id)}
                          className="w-3.5 h-3.5 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
                        />
                        <span className="truncate">
                          {neg.titulo || 'Negócio'} • R${' '}
                          {(neg.valor_estimado || neg.valor || 0).toLocaleString('pt-BR')}
                        </span>
                        {cliDoNeg && (
                          <span className="text-[10px] text-gray-400 ml-auto truncate max-w-[120px]">
                            ({cliDoNeg.nome})
                          </span>
                        )}
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Observações */}
            <div>
              <Label className="text-xs font-semibold text-gray-700">Observações / Histórico</Label>
              <Textarea
                placeholder="Anotações adicionais, como conheceu, produtos de interesse..."
                value={formObservacoes}
                onChange={(e) => setFormObservacoes(e.target.value)}
                className="text-xs mt-1 min-h-[70px]"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
                disabled={isSaving}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSaving || !formNome.trim()}
                className="text-xs font-bold bg-[#16A34A] hover:bg-[#15803D] text-white"
              >
                {isSaving ? 'Salvando...' : contatoEmEdicao ? 'Salvar Alterações' : 'Criar Contato'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Detalhes da Ficha do Contato */}
      <Dialog
        open={Boolean(contatoDetalhes)}
        onOpenChange={(open) => !open && setContatoDetalhes(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                {(contatoDetalhes?.nome || 'C').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base text-gray-900 font-bold truncate">
                  {contatoDetalhes?.nome}
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500">
                  {contatoDetalhes?.cargo || 'Contato cadastrado no sistema'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Modal de Aviso de Duplicidade de Telefone / WhatsApp */}
          <ModalAvisoDuplicidadeTelefone
            isOpen={modalDuplicidadeAberto}
            onClose={() => setModalDuplicidadeAberto(false)}
            duplicados={duplicadosEncontrados}
            numeroInformado={formWhatsApp || formTelefone}
            nomeInformado={formNome}
            modo={contatoEmEdicao ? 'edicao' : 'criacao'}
            onConfirmarMesclar={handleConfirmarMesclagemContato}
            onContinuarMesmoAssim={async () => {
              setModalDuplicidadeAberto(false)
              await executarPersistenciaContato(true)
            }}
            isCarregando={isMesclando}
          />

          {contatoDetalhes && (
            <div className="space-y-3 pt-2">
              {/* Informações Básicas */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Papel</span>
                  <div className="mt-0.5">{renderPapelBadge(contatoDetalhes.papel)}</div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">
                    WhatsApp (Autoritativo)
                  </span>
                  <div className="mt-0.5 font-mono text-gray-800">
                    {contatoDetalhes.whatsapp
                      ? formatWhatsAppPhone(contatoDetalhes.whatsapp)
                      : 'Não informado'}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">
                    Telefone Secundário
                  </span>
                  <div className="mt-0.5 font-mono text-gray-800">
                    {contatoDetalhes.telefone
                      ? formatWhatsAppPhone(contatoDetalhes.telefone)
                      : 'Não informado'}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">
                    E-mail
                  </span>
                  <div className="mt-0.5 text-gray-800 truncate" title={contatoDetalhes.email}>
                    {contatoDetalhes.email || 'Não informado'}
                  </div>
                </div>
              </div>

              {/* Clientes Vinculados */}
              <div className="space-y-1">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                  Clientes Vinculados ({contatoDetalhes.clientes_vinculados?.length || 0})
                </span>
                {contatoDetalhes.clientes_vinculados &&
                contatoDetalhes.clientes_vinculados.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-gray-50 rounded-lg border border-gray-100">
                    {contatoDetalhes.clientes_vinculados.map((cliId) => {
                      const cli = clientesMap.get(cliId)
                      if (!cli) return null
                      return (
                        <button
                          key={cli.id}
                          type="button"
                          onClick={() => {
                            setContatoDetalhes(null)
                            openFichaCliente(cli.id)
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <Building className="w-3 h-3 text-blue-600" />
                          <span>{cli.nome}</span>
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic p-2 bg-gray-50 rounded-lg">
                    Nenhum cliente vinculado a este contato.
                  </p>
                )}
              </div>

              {/* Observações */}
              {contatoDetalhes.observacoes && (
                <div className="space-y-1">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                    Observações e Histórico
                  </span>
                  <div className="bg-slate-900 text-slate-100 rounded-xl p-3.5 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-[220px] overflow-y-auto border border-slate-800 shadow-inner select-text">
                    {contatoDetalhes.observacoes}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-2 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (contatoDetalhes) {
                  const c = contatoDetalhes
                  setContatoDetalhes(null)
                  handleEditarContato(c)
                }
              }}
              className="text-xs"
            >
              <Edit2 className="w-3.5 h-3.5 mr-1" />
              Editar Ficha
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setContatoDetalhes(null)}
              className="text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog de Confirmação de Exclusão */}
      <AlertDialog
        open={Boolean(contatoParaExcluir)}
        onOpenChange={(open) => !open && !isDeleting && setContatoParaExcluir(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-red-600 mb-1">
              <AlertCircle className="w-5 h-5" />
              <AlertDialogTitle>Excluir Contato</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs text-gray-600">
              Tem certeza que deseja excluir o contato{' '}
              <strong className="text-gray-900 font-semibold">"{contatoParaExcluir?.nome}"</strong>?
              Esta ação removerá o registro do cadastro centralizado de contatos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} onClick={() => setContatoParaExcluir(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={handleConfirmarExclusao}
              className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600 text-xs font-bold"
            >
              {isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default ContatosView
