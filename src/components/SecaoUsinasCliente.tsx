import React, { useState } from 'react'
import {
  Sun,
  MapPin,
  Zap,
  Layers,
  Cpu,
  Calendar,
  Gauge,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  ExternalLink,
  Plus,
  Trash2,
  Building,
  TrendingUp,
  Hash,
  ShieldCheck,
  ChevronRight,
  Info,
  Sparkles,
} from 'lucide-react'
import {
  UsinaCliente,
  ContratoOM,
  Cliente,
  UsinaBeneficiariasConfig,
  UsinaBeneficiariaItem,
} from '@/types/crm'
import { formatCurrency, formatDate, formatWhatsAppPhone } from '@/lib/formatters'
import { calcularStatusDinamicoContrato } from '@/lib/contratoStatusDinamico'
import { useAuth } from '@/contexts/AuthContext'
import {
  fetchEquipamentos,
  getDatasheetEquipamentoUrl,
  encontrarEquipamentoCorrespondente,
} from '@/services/equipamentosService'
import type { Equipamento } from '@/types/equipamentos'
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
import { Badge } from '@/components/ui/badge'
import {
  User,
  Phone,
  MessageSquare,
  Mail,
  Compass,
  UserCheck,
  Activity,
  Home,
  Wrench,
  Copy,
  UploadCloud,
  Navigation,
  AlertTriangle,
  Globe,
  Lock,
  Eye,
  EyeOff,
  Users,
} from 'lucide-react'
import { BlocoAtivosDaUsina } from '@/components/BlocoAtivosDaUsina'
import { BlocoAnotacoesUsina } from '@/components/BlocoAnotacoesUsina'
import { SecaoDocumentosUsina } from '@/components/SecaoDocumentosUsina'
import { ModalImportarDocumentoUsina } from '@/components/ModalImportarDocumentoUsina'
import { ModalNovaAtividade } from '@/components/ModalNovaAtividade'
import { InlineEditField } from '@/components/InlineEditField'
import { DatasheetBadge } from '@/components/DatasheetBadge'
import { formatarCPF } from '@/lib/cpfValidator'
import { TipoAtendimento, NumeroFases, TelhadoTipo } from '@/types/crm'
import {
  extrairDadosDocumento,
  type DocumentoExtraidoData,
} from '@/services/documentExtractionService'
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react'

const TELHADOS_USINA: { value: TelhadoTipo; label: string }[] = [
  { value: 'ceramico', label: 'Cerâmico' },
  { value: 'metalico', label: 'Metálico' },
  { value: 'laje', label: 'Laje' },
  { value: 'fibrocimento', label: 'Fibrocimento' },
]

const ATENDIMENTOS_USINA: { value: TipoAtendimento; label: string }[] = [
  { value: 'aéreo', label: 'Aéreo' },
  { value: 'subterrâneo', label: 'Subterrâneo' },
]

const FASES_USINA: { value: NumeroFases; label: string }[] = [
  { value: 'monofásico', label: 'Monofásico' },
  { value: 'bifásico', label: 'Bifásico' },
  { value: 'trifásico', label: 'Trifásico' },
]

interface SecaoUsinasClienteProps {
  clienteId: string
  clienteNome: string
  clienteDocumento?: string
  cliente?: Cliente | null
  isAdmin?: boolean
  usinas: UsinaCliente[]
  contratos: ContratoOM[]
  onUpdateUsina?: (usinaId: string, data: Partial<UsinaCliente>) => Promise<void>
  onCreateUsina?: (
    data: Partial<UsinaCliente> & { cliente_id: string; nome: string },
  ) => Promise<void>
  onDeleteUsina?: (usinaId: string) => Promise<void>
  onVincularContrato?: (usinaId: string, contratoId: string) => Promise<void>
  onAbrirModalNovoContrato?: (usina: UsinaCliente) => void
  onRenovarContrato?: (usina: UsinaCliente, contrato: ContratoOM) => Promise<void> | void
  onVerDetalhesContrato?: (contrato: ContratoOM, usina?: UsinaCliente) => void
  onReabrirOportunidade?: () => void
}

export const SecaoUsinasCliente: React.FC<SecaoUsinasClienteProps> = ({
  clienteId,
  clienteNome,
  clienteDocumento,
  cliente,
  isAdmin: isAdminProp,
  usinas,
  contratos,
  onUpdateUsina,
  onCreateUsina,
  onDeleteUsina,
  onVincularContrato,
  onAbrirModalNovoContrato,
  onRenovarContrato,
  onVerDetalhesContrato,
  onReabrirOportunidade,
}) => {
  const { isAdmin: authIsAdmin, isInstalador } = useAuth()
  const podeVerValoresFinanceiros =
    !isInstalador && (isAdminProp !== undefined ? isAdminProp : authIsAdmin)

  // Usina aberta na ficha detalhada
  const [usinaDetalhes, setUsinaDetalhes] = useState<UsinaCliente | null>(null)
  const [isEditingDetalhes, setIsEditingDetalhes] = useState(false)
  const [isSavingDetalhes, setIsSavingDetalhes] = useState(false)
  const [modalImportarDocUsinaOpen, setModalImportarDocUsinaOpen] = useState(false)
  const [modalNovaAtividadeUsinaOpen, setModalNovaAtividadeUsinaOpen] = useState(false)

  // Form states para edição na ficha própria
  const [editNome, setEditNome] = useState('')
  const [editEndereco, setEditEndereco] = useState('')
  const [editCidade, setEditCidade] = useState('')
  const [editPotencia, setEditPotencia] = useState('')
  const [editQtdModulos, setEditQtdModulos] = useState('')
  const [editInversores, setEditInversores] = useState('')
  const [editGeracao, setEditGeracao] = useState('')
  const [editDataInstalacao, setEditDataInstalacao] = useState('')
  const [editNumeroMedidor, setEditNumeroMedidor] = useState('')
  const [editNumeroUc, setEditNumeroUc] = useState('')
  const [editConcessionaria, setEditConcessionaria] = useState('')
  const [editStatus, setEditStatus] = useState<'ativo' | 'inativo'>('ativo')
  const [editTipoEstrutura, setEditTipoEstrutura] = useState<'telhado' | 'solo'>('telhado')
  const [editTipoUsina, setEditTipoUsina] = useState<string>('residencial')
  const [editObservacoes, setEditObservacoes] = useState('')
  const [editDadosAtualizados, setEditDadosAtualizados] = useState<boolean>(true)
  const [isUpdatingStatusCadastral, setIsUpdatingStatusCadastral] = useState(false)

  // Unidades Beneficiárias na Edição da Ficha
  const [editBeneficiariasHabilitado, setEditBeneficiariasHabilitado] = useState(false)
  const [editPercentualGeradora, setEditPercentualGeradora] = useState<number | string>(100)
  const [editBeneficiariasLista, setEditBeneficiariasLista] = useState<UsinaBeneficiariaItem[]>([])

  // Modal Nova Usina
  // Catálogo de equipamentos para conferência de datasheet
  const [catalogoEquipamentos, setCatalogoEquipamentos] = useState<Equipamento[]>([])

  React.useEffect(() => {
    fetchEquipamentos()
      .then(setCatalogoEquipamentos)
      .catch(() => {})
  }, [])

  // Helper para buscar datasheet correspondente ao texto do inversor ou módulos
  const encontrarEquipamentoComDatasheet = (texto: string, tipo?: 'inversor' | 'modulo_fv') => {
    if (!texto || !catalogoEquipamentos.length) return null
    // Tenta primeiro correspondência tolerante estruturada
    const correspondente = encontrarEquipamentoCorrespondente(catalogoEquipamentos, {
      modelo: texto,
      marca: texto,
      tipo,
      apenasComDatasheet: true,
    })
    if (correspondente) return correspondente

    // Fallback legado com substring simples
    const txtLower = texto.toLowerCase()
    return (
      catalogoEquipamentos.find((eq) => {
        if (!eq.datasheet_pdf) return false
        if (tipo && eq.tipo !== tipo) return false
        const modeloMatch = eq.modelo && txtLower.includes(eq.modelo.toLowerCase())
        const marcaMatch = eq.marca && txtLower.includes(eq.marca.toLowerCase())
        return modeloMatch || (marcaMatch && txtLower.includes(String(eq.potencia_w)))
      }) || null
    )
  }

  // Helper para encontrar datasheet específico de módulo para a usina
  const encontrarDatasheetModuloUsina = (usina: UsinaCliente) => {
    if (!catalogoEquipamentos.length) return null
    const fabricante = usina.fabricante_modulos || usina.marca_placas || ''
    const modelo = usina.modelo_modulos || ''
    if (fabricante || modelo) {
      const match = encontrarEquipamentoCorrespondente(catalogoEquipamentos, {
        marca: fabricante,
        modelo: modelo,
        tipo: 'modulo_fv',
        apenasComDatasheet: true,
      })
      if (match) return match
    }
    // Tentar fallback se houver texto nos campos
    const textoFallback = `${fabricante} ${modelo}`.trim()
    if (textoFallback) {
      return encontrarEquipamentoComDatasheet(textoFallback, 'modulo_fv')
    }
    return null
  }

  const [modalNovaUsinaOpen, setModalNovaUsinaOpen] = useState(false)
  const [novaUsinaNome, setNovaUsinaNome] = useState('')
  const [novaUsinaEndereco, setNovaUsinaEndereco] = useState('')
  const [novaUsinaCidade, setNovaUsinaCidade] = useState('')
  const [novaUsinaLatitude, setNovaUsinaLatitude] = useState<number | undefined>(undefined)
  const [novaUsinaLongitude, setNovaUsinaLongitude] = useState<number | undefined>(undefined)
  const [novaUsinaPotencia, setNovaUsinaPotencia] = useState('')
  const [novaUsinaQtdModulos, setNovaUsinaQtdModulos] = useState('')
  const [novaUsinaInversores, setNovaUsinaInversores] = useState('')
  const [novaUsinaGeracao, setNovaUsinaGeracao] = useState('')
  const [novaUsinaDataInstalacao, setNovaUsinaDataInstalacao] = useState('')
  const [novaUsinaNumeroMedidor, setNovaUsinaNumeroMedidor] = useState('')
  const [novaUsinaNumeroUc, setNovaUsinaNumeroUc] = useState('')
  const [novaUsinaConcessionaria, setNovaUsinaConcessionaria] = useState('RGE Sul')
  const [novaUsinaStatus, setNovaUsinaStatus] = useState<'ativo' | 'inativo'>('ativo')
  const [novaUsinaEstrutura, setNovaUsinaEstrutura] = useState<'telhado' | 'solo'>('telhado')
  const [novaUsinaTipo, setNovaUsinaTipo] = useState<string>('residencial')
  const [novaUsinaObservacoes, setNovaUsinaObservacoes] = useState('')
  const [novaUsinaContratoId, setNovaUsinaContratoId] = useState<string>('')
  const [isSavingNovaUsina, setIsSavingNovaUsina] = useState(false)

  // Unidades Beneficiárias no Modal de Criação da Usina
  const [novaUsinaBeneficiariasHabilitado, setNovaUsinaBeneficiariasHabilitado] = useState(false)
  const [novaUsinaPercentualGeradora, setNovaUsinaPercentualGeradora] = useState<number | string>(
    100,
  )
  const [novaUsinaBeneficiariasLista, setNovaUsinaBeneficiariasLista] = useState<
    UsinaBeneficiariaItem[]
  >([])

  // Extração de documento para Nova Usina
  const [isExtraindoDocNovaUsina, setIsExtraindoDocNovaUsina] = useState(false)
  const [statusProgressoNovaUsina, setStatusProgressoNovaUsina] = useState<string | null>(null)
  const [erroExtracaoNovaUsina, setErroExtracaoNovaUsina] = useState<string | null>(null)
  const [sucessoExtracaoNovaUsina, setSucessoExtracaoNovaUsina] = useState<string | null>(null)
  const inputArquivoNovaUsinaRef = React.useRef<HTMLInputElement | null>(null)

  // Modal Vincular Contrato
  const [modalVincularOpen, setModalVincularOpen] = useState(false)
  const [usinaSelecionadaParaVincular, setUsinaSelecionadaParaVincular] =
    useState<UsinaCliente | null>(null)
  const [contratoSelecionadoId, setContratoSelecionadoId] = useState('')
  const [isVinculando, setIsVinculando] = useState(false)

  // Controle de visibilidade da senha do Portal da Concessionária
  const [mostrarSenhaPortal, setMostrarSenhaPortal] = useState(false)

  // Abrir Ficha Própria da Usina
  const handleOpenFichaUsina = (usina: UsinaCliente) => {
    setMostrarSenhaPortal(false)
    setUsinaDetalhes(usina)
    setEditNome(usina.nome || '')
    setEditEndereco(usina.endereco || '')
    setEditCidade(usina.cidade || '')
    setEditPotencia(usina.potencia_kwp ? String(usina.potencia_kwp) : '')
    setEditQtdModulos(usina.qtd_modulos ? String(usina.qtd_modulos) : '')
    setEditInversores(usina.inversores_info || '')
    setEditGeracao(usina.geracao_estimada_kwh ? String(usina.geracao_estimada_kwh) : '')
    setEditDataInstalacao(
      usina.data_instalacao ? usina.data_instalacao.split(' ')[0].split('T')[0] : '',
    )
    setEditNumeroMedidor(usina.numero_medidor || '')
    setEditNumeroUc(usina.numero_uc || '')
    setEditConcessionaria(usina.concessionaria || 'RGE Sul')
    setEditStatus((usina.status as 'ativo' | 'inativo') || 'ativo')
    setEditTipoEstrutura((usina.tipo_estrutura as 'telhado' | 'solo') || 'telhado')
    setEditTipoUsina(usina.tipo_usina || 'residencial')
    setEditObservacoes(usina.observacoes || '')
    setEditDadosAtualizados(usina.dados_atualizados ?? false)

    const ben = usina.beneficiarias
    if (ben && ben.habilitado) {
      setEditBeneficiariasHabilitado(true)
      setEditPercentualGeradora(ben.percentual_geradora ?? 0)
      setEditBeneficiariasLista(Array.isArray(ben.unidades) ? ben.unidades : [])
    } else {
      setEditBeneficiariasHabilitado(false)
      setEditPercentualGeradora(100)
      setEditBeneficiariasLista([])
    }

    setIsEditingDetalhes(false)
  }

  // Ação rápida para marcar/desmarcar dados como atualizados
  const handleToggleDadosAtualizados = async (novoValor: boolean) => {
    if (!usinaDetalhes) return
    setIsUpdatingStatusCadastral(true)
    try {
      if (onUpdateUsina) {
        await onUpdateUsina(usinaDetalhes.id, { dados_atualizados: novoValor })
      }
      setUsinaDetalhes((prev) => (prev ? { ...prev, dados_atualizados: novoValor } : null))
      setEditDadosAtualizados(novoValor)
    } catch (err) {
      console.error('Erro ao atualizar status cadastral da usina:', err)
      alert('Erro ao atualizar status cadastral da usina.')
    } finally {
      setIsUpdatingStatusCadastral(false)
    }
  }

  // Atualização atômica inline de campos da usina atualmente aberta na ficha
  const handleUpdateUsinaField = async (field: keyof UsinaCliente, value: unknown) => {
    if (!usinaDetalhes) return
    try {
      const payload: Partial<UsinaCliente> = { [field]: value }
      if (onUpdateUsina) {
        await onUpdateUsina(usinaDetalhes.id, payload)
      }
      setUsinaDetalhes((prev) => (prev ? { ...prev, ...payload } : null))
    } catch (err) {
      console.error(`Erro ao atualizar campo "${String(field)}" da usina:`, err)
      throw err
    }
  }

  // Atualização em lote de múltiplos campos da usina (ex: copiar dados do cliente para titular)
  const handleUpdateUsinaMultipleFields = async (updates: Partial<UsinaCliente>) => {
    if (!usinaDetalhes) return
    try {
      if (onUpdateUsina) {
        await onUpdateUsina(usinaDetalhes.id, updates)
      }
      setUsinaDetalhes((prev) => (prev ? { ...prev, ...updates } : null))
    } catch (err) {
      console.error('Erro ao atualizar múltiplos campos da usina:', err)
      throw err
    }
  }

  const handleSalvarEdicaoFicha = async () => {
    if (!usinaDetalhes) return
    if (!editNome.trim()) {
      alert('Informe o nome da usina.')
      return
    }

    let beneficiariasPayload: UsinaBeneficiariasConfig | null = null
    if (editBeneficiariasHabilitado) {
      const percGeradora = Number(editPercentualGeradora) || 0
      const totalUnidades = editBeneficiariasLista.reduce(
        (acc, item) => acc + (Number(item.percentual) || 0),
        0,
      )
      const somaTotal = Math.round((percGeradora + totalUnidades) * 100) / 100

      if (Math.abs(somaTotal - 100) > 0.01) {
        alert(
          `A soma dos percentuais deve ser 100% — total atual: ${somaTotal}%. Corrija os percentuais antes de salvar.`,
        )
        return
      }

      beneficiariasPayload = {
        habilitado: true,
        percentual_geradora: percGeradora,
        unidades: editBeneficiariasLista.map((u) => ({
          numero_uc: String(u.numero_uc || '').trim(),
          identificacao: String(u.identificacao || '').trim(),
          percentual: Number(u.percentual) || 0,
        })),
      }
    } else {
      beneficiariasPayload = null
    }

    setIsSavingDetalhes(true)
    try {
      const payload: Partial<UsinaCliente> = {
        nome: editNome.trim(),
        endereco: editEndereco.trim(),
        cidade: editCidade.trim(),
        potencia_kwp: Number(editPotencia) || 0,
        qtd_modulos: Number(editQtdModulos) || 0,
        inversores_info: editInversores.trim(),
        geracao_estimada_kwh: Number(editGeracao) || 0,
        data_instalacao: editDataInstalacao ? `${editDataInstalacao} 12:00:00.000Z` : undefined,
        numero_medidor: editNumeroMedidor.trim(),
        numero_uc: editNumeroUc.trim(),
        concessionaria: editConcessionaria.trim(),
        status: editStatus,
        tipo_estrutura: editTipoEstrutura,
        tipo_usina: editTipoUsina,
        observacoes: editObservacoes.trim(),
        dados_atualizados: editDadosAtualizados,
        beneficiarias: beneficiariasPayload,
      }
      if (onUpdateUsina) {
        await onUpdateUsina(usinaDetalhes.id, payload)
      }
      setUsinaDetalhes({
        ...usinaDetalhes,
        ...payload,
      })
      setIsEditingDetalhes(false)
    } catch (err) {
      console.error('Erro ao atualizar usina:', err)
      alert('Erro ao atualizar usina. Tente novamente.')
    } finally {
      setIsSavingDetalhes(false)
    }
  }

  const handleOpenNovaUsina = () => {
    setNovaUsinaNome(`Usina ${usinas.length + 1} - ${clienteNome.split(' ')[0]}`)
    setNovaUsinaEndereco('')
    setNovaUsinaCidade(cliente?.cidade || '')
    setNovaUsinaLatitude(cliente?.latitude !== undefined ? Number(cliente?.latitude) : undefined)
    setNovaUsinaLongitude(cliente?.longitude !== undefined ? Number(cliente?.longitude) : undefined)
    setNovaUsinaPotencia('')
    setNovaUsinaQtdModulos('')
    setNovaUsinaInversores('')
    setNovaUsinaGeracao('')
    setNovaUsinaDataInstalacao(new Date().toISOString().split('T')[0])
    setNovaUsinaNumeroMedidor('')
    setNovaUsinaNumeroUc('')
    setNovaUsinaConcessionaria('RGE Sul')
    setNovaUsinaStatus('ativo')
    setNovaUsinaEstrutura('telhado')
    setNovaUsinaTipo('residencial')
    setNovaUsinaObservacoes('')
    setNovaUsinaContratoId('')
    setNovaUsinaBeneficiariasHabilitado(false)
    setNovaUsinaPercentualGeradora(100)
    setNovaUsinaBeneficiariasLista([])
    setErroExtracaoNovaUsina(null)
    setSucessoExtracaoNovaUsina(null)
    setStatusProgressoNovaUsina(null)
    setModalNovaUsinaOpen(true)
  }

  // Manipulador de upload de documento técnico / fatura para preenchimento automático da Nova Usina
  const handleImportarDocumentoNovaUsina = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Limpar o input para permitir selecionar o mesmo arquivo novamente se necessário
    e.target.value = ''

    setIsExtraindoDocNovaUsina(true)
    setErroExtracaoNovaUsina(null)
    setSucessoExtracaoNovaUsina(null)
    setStatusProgressoNovaUsina('Lendo arquivo e estruturando conteúdo...')

    try {
      const res = await extrairDadosDocumento(file, {
        onProgress: (msg) => setStatusProgressoNovaUsina(msg),
      })

      if (!res.ok || !res.data) {
        setErroExtracaoNovaUsina(
          res.message ||
            'Não foi possível extrair dados legíveis deste documento. Verifique se o arquivo possui texto nítido ou preencha manualmente.',
        )
        return
      }

      const data: DocumentoExtraidoData = res.data
      const tec = data.dados_tecnicos || {}
      const cons = data.consumo || {}
      const end = data.endereco || {}

      const camposPreenchidos: string[] = []

      // Potência
      if (tec.potencia_kwp !== null && tec.potencia_kwp !== undefined) {
        setNovaUsinaPotencia(String(tec.potencia_kwp))
        camposPreenchidos.push(`Potência: ${tec.potencia_kwp} kWp`)
      }

      // Quantidade de módulos
      if (tec.numero_modulos !== null && tec.numero_modulos !== undefined) {
        setNovaUsinaQtdModulos(String(tec.numero_modulos))
        camposPreenchidos.push(`Módulos: ${tec.numero_modulos}`)
      }

      // Inversores
      const invPartes = [tec.fabricante_inversores, tec.modelo_inversores].filter(Boolean)
      if (invPartes.length > 0) {
        const infoInv = invPartes.join(' ')
        setNovaUsinaInversores(infoInv)
        camposPreenchidos.push(`Inversor: ${infoInv}`)
      }

      // Geração estimada
      if (tec.geracao_mensal_kwh !== null && tec.geracao_mensal_kwh !== undefined) {
        setNovaUsinaGeracao(String(tec.geracao_mensal_kwh))
        camposPreenchidos.push(`Geração: ${tec.geracao_mensal_kwh} kWh/mês`)
      }

      // Estrutura / Tipo telhado
      if (tec.tipo_telhado) {
        setNovaUsinaEstrutura('telhado')
      }

      // Endereço completo formatado
      const partesEnd = [
        end.endereco,
        end.numero ? `nº ${end.numero}` : null,
        end.bairro ? `Bairro ${end.bairro}` : null,
        end.cidade && end.estado ? `${end.cidade}/${end.estado}` : end.cidade || null,
        end.cep ? `CEP ${end.cep}` : null,
      ].filter(Boolean)
      if (partesEnd.length > 0) {
        const enderecoFormatado = partesEnd.join(', ')
        setNovaUsinaEndereco(enderecoFormatado)
        camposPreenchidos.push('Endereço')
      }

      if (end.cidade) {
        setNovaUsinaCidade(end.cidade)
        camposPreenchidos.push(`Cidade: ${end.cidade}`)
      }

      if (end.latitude !== null && end.latitude !== undefined && !isNaN(Number(end.latitude))) {
        setNovaUsinaLatitude(Number(end.latitude))
        camposPreenchidos.push(`Latitude: ${end.latitude}`)
      }
      if (end.longitude !== null && end.longitude !== undefined && !isNaN(Number(end.longitude))) {
        setNovaUsinaLongitude(Number(end.longitude))
        camposPreenchidos.push(`Longitude: ${end.longitude}`)
      }

      // UC
      if (cons.uc) {
        setNovaUsinaNumeroUc(cons.uc)
        camposPreenchidos.push(`UC: ${cons.uc}`)
      }

      // Concessionária
      if (cons.concessionaria) {
        setNovaUsinaConcessionaria(cons.concessionaria)
        camposPreenchidos.push(`Concessionária: ${cons.concessionaria}`)
      }

      // Tipo de Usina baseado na classe de consumo ou contexto
      if (cons.classe_consumo) {
        const clsLower = cons.classe_consumo.toLowerCase()
        if (clsLower.includes('comerc')) {
          setNovaUsinaTipo('comercial')
        } else if (clsLower.includes('industr')) {
          setNovaUsinaTipo('industrial')
        } else if (clsLower.includes('rural')) {
          setNovaUsinaTipo('rural')
        } else if (clsLower.includes('resid')) {
          setNovaUsinaTipo('residencial')
        }
      }

      // Observações automáticas com dados complementares do documento
      const notas: string[] = []
      if (data.dados_cadastrais?.nome) {
        notas.push(`Titular no documento: ${data.dados_cadastrais.nome}`)
      }
      if (data.dados_cadastrais?.cpf_cnpj) {
        notas.push(`CPF/CNPJ: ${data.dados_cadastrais.cpf_cnpj}`)
      }
      if (tec.fabricante_modulos || tec.modelo_modulos) {
        notas.push(
          `Módulos: ${[tec.fabricante_modulos, tec.modelo_modulos].filter(Boolean).join(' ')}`,
        )
      }
      if (tec.padrao_entrada) {
        notas.push(`Padrão: ${tec.padrao_entrada}`)
      }
      if (tec.numero_fases) {
        notas.push(`Fases: ${tec.numero_fases}`)
      }
      if (notas.length > 0) {
        const obsAtual = novaUsinaObservacoes.trim()
        const obsAdicional = `[Importado via ${file.name}]\n${notas.join(' | ')}`
        setNovaUsinaObservacoes(obsAtual ? `${obsAtual}\n\n${obsAdicional}` : obsAdicional)
      }

      if (camposPreenchidos.length > 0) {
        setSucessoExtracaoNovaUsina(
          `Dados importados com sucesso de "${file.name}"! (${camposPreenchidos.length} campos preenchidos: ${camposPreenchidos.slice(0, 4).join(', ')}${camposPreenchidos.length > 4 ? '...' : ''}). Revise os campos abaixo antes de cadastrar.`,
        )
      } else {
        setSucessoExtracaoNovaUsina(
          `Documento "${file.name}" lido, mas poucos campos técnicos específicos foram encontrados. Revise e complete manualmente.`,
        )
      }
    } catch (err: unknown) {
      console.error('[SecaoUsinasCliente] Erro na extração de documento da nova usina:', err)
      const msg = err instanceof Error ? err.message : 'Falha na conexão com o serviço de extração.'
      setErroExtracaoNovaUsina(`Erro ao extrair dados do documento: ${msg}`)
    } finally {
      setIsExtraindoDocNovaUsina(false)
      setStatusProgressoNovaUsina(null)
    }
  }

  const handleSalvarNovaUsina = async () => {
    if (!novaUsinaNome.trim()) {
      alert('Informe o nome ou identificação da usina.')
      return
    }

    let beneficiariasPayload: UsinaBeneficiariasConfig | null = null
    if (novaUsinaBeneficiariasHabilitado) {
      const percGeradora = Number(novaUsinaPercentualGeradora) || 0
      const totalUnidades = novaUsinaBeneficiariasLista.reduce(
        (acc, item) => acc + (Number(item.percentual) || 0),
        0,
      )
      const somaTotal = Math.round((percGeradora + totalUnidades) * 100) / 100

      if (Math.abs(somaTotal - 100) > 0.01) {
        alert(
          `A soma dos percentuais deve ser 100% — total atual: ${somaTotal}%. Corrija os percentuais antes de cadastrar.`,
        )
        return
      }

      beneficiariasPayload = {
        habilitado: true,
        percentual_geradora: percGeradora,
        unidades: novaUsinaBeneficiariasLista.map((u) => ({
          numero_uc: String(u.numero_uc || '').trim(),
          identificacao: String(u.identificacao || '').trim(),
          percentual: Number(u.percentual) || 0,
        })),
      }
    } else {
      beneficiariasPayload = null
    }

    setIsSavingNovaUsina(true)
    try {
      if (onCreateUsina) {
        await onCreateUsina({
          cliente_id: clienteId,
          nome: novaUsinaNome.trim(),
          endereco: novaUsinaEndereco.trim(),
          cidade: novaUsinaCidade.trim(),
          latitude: novaUsinaLatitude,
          longitude: novaUsinaLongitude,
          potencia_kwp: Number(novaUsinaPotencia) || 0,
          qtd_modulos: Number(novaUsinaQtdModulos) || 0,
          inversores_info: novaUsinaInversores.trim(),
          geracao_estimada_kwh: Number(novaUsinaGeracao) || 0,
          data_instalacao: novaUsinaDataInstalacao
            ? `${novaUsinaDataInstalacao} 12:00:00.000Z`
            : undefined,
          numero_medidor: novaUsinaNumeroMedidor.trim(),
          numero_uc: novaUsinaNumeroUc.trim(),
          concessionaria: novaUsinaConcessionaria.trim(),
          status: novaUsinaStatus,
          tipo_estrutura: novaUsinaEstrutura,
          tipo_usina: novaUsinaTipo,
          dados_atualizados: false,
          observacoes: novaUsinaObservacoes.trim(),
          contrato_id: novaUsinaContratoId || undefined,
          beneficiarias: beneficiariasPayload,
        })
      }
      setModalNovaUsinaOpen(false)
    } catch (err) {
      console.error('Erro ao criar usina:', err)
      alert('Erro ao criar usina. Verifique os dados e tente novamente.')
    } finally {
      setIsSavingNovaUsina(false)
    }
  }

  const handleOpenVincularContrato = (usina: UsinaCliente) => {
    setUsinaSelecionadaParaVincular(usina)
    setContratoSelecionadoId(usina.contrato_id || '')
    setModalVincularOpen(true)
  }

  const handleSalvarVinculoContrato = async () => {
    if (!usinaSelecionadaParaVincular || !contratoSelecionadoId) {
      alert('Selecione um contrato O&M para vincular.')
      return
    }
    setIsVinculando(true)
    try {
      if (onVincularContrato) {
        await onVincularContrato(usinaSelecionadaParaVincular.id, contratoSelecionadoId)
      }
      setModalVincularOpen(false)
      setUsinaSelecionadaParaVincular(null)
    } catch (err) {
      console.error('Erro ao vincular contrato:', err)
      alert('Erro ao vincular contrato. Tente novamente.')
    } finally {
      setIsVinculando(false)
    }
  }

  // Estatísticas Rápidas das Usinas
  const totalPotencia = usinas.reduce((acc, u) => acc + (Number(u.potencia_kwp) || 0), 0)
  const totalModulos = usinas.reduce((acc, u) => acc + (Number(u.qtd_modulos) || 0), 0)
  const totalGeracao = usinas.reduce((acc, u) => acc + (Number(u.geracao_estimada_kwh) || 0), 0)

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-5">
      {/* Header com identidade visual Delfos Solar: Azul Marinho & Dourado */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#0F2038] text-[#E0A838] rounded-xl shadow-xs">
            <Sun className="w-5 h-5 text-[#E0A838]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-extrabold uppercase tracking-wider text-[#0F2038]">
                Usinas Fotovoltaicas do Cliente
              </h4>
              <Badge
                variant="outline"
                className="bg-amber-50 text-[#9B7018] border-amber-300 font-bold text-xs"
              >
                {usinas.length} {usinas.length === 1 ? 'usina' : 'usinas'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Gerencie múltiplas usinas conectadas ao mesmo cliente com especificações técnicas e
              contratos próprios.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onReabrirOportunidade && (
            <Button
              type="button"
              onClick={onReabrirOportunidade}
              className="bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs shadow-xs rounded-xl flex items-center gap-1.5 border border-amber-500"
              title="Reabrir oportunidade comercial para este cliente no Kanban de vendas"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              <span>Nova Oportunidade</span>
            </Button>
          )}

          <Button
            type="button"
            onClick={handleOpenNovaUsina}
            className="bg-[#0F2038] hover:bg-[#1A365D] text-white font-bold text-xs shadow-xs rounded-xl flex items-center gap-2 border border-slate-700"
          >
            <Plus className="w-4 h-4 text-[#E0A838]" />
            <span>+ Nova Usina</span>
          </Button>
        </div>
      </div>

      {/* Cards de Resumo Geral (se houver usinas) */}
      {usinas.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Potência Instalada Total
              </span>
              <div className="text-lg font-black text-[#0F2038]">
                {totalPotencia.toFixed(2)}{' '}
                <span className="text-xs font-semibold text-slate-500">kWp</span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-amber-50 text-[#E0A838]">
              <Zap className="w-5 h-5 text-[#E0A838]" />
            </div>
          </div>

          <div className="p-3.5 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Total de Módulos
              </span>
              <div className="text-lg font-black text-[#0F2038]">
                {totalModulos} <span className="text-xs font-semibold text-slate-500">módulos</span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Layers className="w-5 h-5" />
            </div>
          </div>

          <div className="p-3.5 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Geração Estimada Total
              </span>
              <div className="text-lg font-black text-emerald-800">
                {totalGeracao.toLocaleString('pt-BR')}{' '}
                <span className="text-xs font-semibold text-slate-500">kWh/mês</span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Lista de Usinas (Cards clicáveis) */}
      {usinas.length === 0 ? (
        <div className="p-8 text-center bg-slate-50/70 rounded-2xl border-2 border-dashed border-slate-200 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#E0A838] flex items-center justify-center mx-auto">
            <Sun className="w-6 h-6" />
          </div>
          <div>
            <h5 className="text-sm font-bold text-slate-800">Nenhuma usina cadastrada</h5>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Cadastre a primeira usina do cliente para registrar dados técnicos, endereço de
              instalação e vincular atividades específicas.
            </p>
          </div>
          <Button
            type="button"
            onClick={handleOpenNovaUsina}
            className="bg-[#0F2038] hover:bg-[#1A365D] text-white text-xs font-bold rounded-xl shadow-xs"
          >
            <Plus className="w-4 h-4 text-[#E0A838] mr-1.5" />
            Cadastrar Primeira Usina
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {usinas.map((usina, index) => {
            const contratoVinculado =
              usina.expand?.contrato_id || contratos.find((c) => c.id === usina.contrato_id) || null

            const statusCalc = contratoVinculado
              ? calcularStatusDinamicoContrato(contratoVinculado)
              : null

            const isAtivo = usina.status !== 'inativo'

            return (
              <div
                key={usina.id}
                onClick={() => handleOpenFichaUsina(usina)}
                className="group relative border-slate-200 hover:border-[#0F2038]/40 hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden p-4 space-y-3 bg-[#ebf3e9] border-[3.1px] rounded-[6px]"
              >
                {/* Linha superior: Título da usina, badges e botão ver ficha */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center">
                      #{index + 1}
                    </span>
                    <h5 className="text-base font-bold text-[#0F2038] group-hover:text-blue-900 transition-colors">
                      {usina.nome}
                    </h5>

                    {/* Status Ativo/Inativo */}
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                        isAtivo
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      {isAtivo ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Ativo
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 text-rose-600" /> Inativo
                        </>
                      )}
                    </span>

                    {/* Badge Verificação Cadastral: Atualizado vs Desatualizado */}
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                        usina.dados_atualizados !== false
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
                      }`}
                      title={
                        usina.dados_atualizados !== false
                          ? 'Dados cadastrais da usina verificados e atualizados'
                          : 'Dados da usina desatualizados — atualizar antes de criar atividades de manutenção'
                      }
                    >
                      {usina.dados_atualizados !== false ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Dados Atualizados
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3 h-3 text-amber-700" /> Dados Desatualizados
                        </>
                      )}
                    </span>

                    {/* Tipo de Usina */}
                    <span className="text-[11px] font-bold capitalize px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {usina.tipo_usina || 'Residencial'}
                    </span>

                    {/* Tipo Estrutura */}
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                        usina.tipo_estrutura === 'solo'
                          ? 'bg-amber-50 text-amber-900 border-amber-300'
                          : 'bg-blue-50 text-blue-900 border-blue-200'
                      }`}
                    >
                      {usina.tipo_estrutura === 'solo' ? 'Solo' : 'Telhado'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        const SEDE_DELFOS = 'Rua Espírito Santo, 275, Erechim - RS, CEP 99709296'
                        const latVal =
                          typeof usina.latitude === 'number'
                            ? usina.latitude
                            : Number(usina.latitude)
                        const lngVal =
                          typeof usina.longitude === 'number'
                            ? usina.longitude
                            : Number(usina.longitude)
                        const temCoords =
                          !isNaN(latVal) && !isNaN(lngVal) && (latVal !== 0 || lngVal !== 0)

                        if (temCoords) {
                          const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(SEDE_DELFOS)}&destination=${latVal},${lngVal}`
                          window.open(url, '_blank')
                          return
                        }

                        const partes = [
                          usina.endereco,
                          usina.bairro,
                          usina.cidade,
                          usina.estado || 'RS',
                        ].filter(Boolean)

                        if (partes.length > 0) {
                          const query = encodeURIComponent(partes.join(', '))
                          const url = `https://www.google.com/maps/search/?api=1&query=${query}`
                          window.open(url, '_blank')
                          return
                        }

                        alert(
                          'Esta usina não possui coordenadas nem endereço cadastrado para traçar rota.',
                        )
                      }}
                      className="h-7 px-2.5 text-[11px] font-bold text-sky-700 bg-sky-50/60 hover:bg-sky-100 hover:text-sky-800 border-sky-300 transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                      title="Traçar rota no Google Maps a partir da sede Delfos Solar"
                    >
                      <Navigation className="w-3.5 h-3.5 text-sky-600" />
                      <span>Traçar Rota / Mapa</span>
                    </Button>

                    <span className="text-xs font-bold text-[#0F2038] group-hover:text-amber-600 transition-colors inline-flex items-center gap-1">
                      <span>Ver Ficha</span>
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>

                {/* Endereço */}
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{usina.endereco || 'Endereço não informado'}</span>
                </div>

                {/* Grade de Especificações Técnicas */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Potência
                    </span>
                    <span className="font-extrabold text-[#0F2038] text-sm">
                      {usina.potencia_kwp || 0} kWp
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Módulos
                      </span>
                      {(() => {
                        const eqModulo = encontrarDatasheetModuloUsina(usina)
                        if (!eqModulo || !eqModulo.datasheet_pdf) return null
                        const url = getDatasheetEquipamentoUrl(eqModulo)
                        if (!url) return null
                        return (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200 transition-colors shrink-0"
                            title={`Abrir Datasheet PDF (${eqModulo.marca} ${eqModulo.modelo})`}
                          >
                            <FileText className="w-2.5 h-2.5" />
                            <span>Datasheet</span>
                            <ExternalLink className="w-2 h-2" />
                          </a>
                        )
                      })()}
                    </div>
                    <span className="font-bold text-slate-800 text-sm block mt-0.5">
                      {usina.qtd_modulos || 0} un
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Geração Estimada
                    </span>
                    <span className="font-bold text-emerald-800 text-sm">
                      {usina.geracao_estimada_kwh
                        ? `${usina.geracao_estimada_kwh} kWh/mês`
                        : 'Sob demanda'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 truncate">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Inversor
                      </span>
                      {(() => {
                        const eq = encontrarEquipamentoComDatasheet(usina.inversores_info || '')
                        if (!eq || !eq.datasheet_pdf) return null
                        const url = getDatasheetEquipamentoUrl(eq)
                        if (!url) return null
                        return (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200 transition-colors shrink-0"
                            title={`Abrir Datasheet PDF (${eq.marca} ${eq.modelo})`}
                          >
                            <FileText className="w-2.5 h-2.5" />
                            <span>Datasheet</span>
                            <ExternalLink className="w-2 h-2" />
                          </a>
                        )
                      })()}
                    </div>
                    <span
                      className="font-medium text-slate-800 text-xs truncate block mt-0.5"
                      title={usina.inversores_info}
                    >
                      {usina.inversores_info || 'Não informado'}
                    </span>
                  </div>
                </div>

                {/* Linha de rodapé do card: Vínculo com Contrato O&M */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    {contratoVinculado && statusCalc ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>
                          Contrato O&M{' '}
                          <strong>
                            {contratoVinculado.numero_contrato ||
                              `#${contratoVinculado.id.slice(0, 6)}`}
                          </strong>{' '}
                          (Plano {contratoVinculado.plano})
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${statusCalc.badgeColorClass}`}
                        >
                          {statusCalc.badgeLabel}
                        </span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-700">
                        <Info className="w-3 h-3" />
                        Nenhum Contrato O&M vinculado
                      </span>
                    )}
                  </div>

                  {usina.numero_medidor && (
                    <span className="text-[11px] text-slate-400">
                      Medidor: <strong className="text-slate-600">{usina.numero_medidor}</strong>
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* DIALOG: FICHA PRÓPRIA DA USINA (TODOS OS CAMPOS TÉCNICOS) */}
      {/* ======================================================== */}
      <Dialog
        open={Boolean(usinaDetalhes)}
        onOpenChange={(open) => {
          if (!open) {
            setUsinaDetalhes(null)
            setIsEditingDetalhes(false)
          }
        }}
      >
        <DialogContent className="max-w-5xl w-[95vw] max-h-[92vh] overflow-y-auto">
          {usinaDetalhes && (
            <>
              {/* Modal de Importar Dados da Usina por Documento */}
              <ModalImportarDocumentoUsina
                open={modalImportarDocUsinaOpen}
                onOpenChange={setModalImportarDocUsinaOpen}
                usina={usinaDetalhes}
                clienteNome={clienteNome}
                onApplyImport={async (updates, _resumo, _modo) => {
                  await handleUpdateUsinaMultipleFields(updates)
                }}
              />

              <DialogHeader>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-[#0F2038] text-[#E0A838] rounded-xl">
                      <Sun className="w-5 h-5 text-[#E0A838]" />
                    </div>
                    <div>
                      <DialogTitle className="text-base font-extrabold text-[#0F2038]">
                        Ficha Técnica: {usinaDetalhes.nome}
                      </DialogTitle>
                      <DialogDescription className="text-xs text-slate-500">
                        Cliente: <strong>{clienteNome}</strong> • ID da Usina: {usinaDetalhes.id}
                      </DialogDescription>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isEditingDetalhes ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => setModalNovaAtividadeUsinaOpen(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg shadow-xs transition-all hover:scale-[1.02] bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-700"
                          title="Criar nova atividade vinculada a esta usina"
                        >
                          <Wrench className="w-4 h-4 text-white" />
                          <span>Nova Atividade</span>
                        </Button>

                        <button
                          type="button"
                          onClick={() => setModalImportarDocUsinaOpen(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg shadow-xs transition-all hover:scale-[1.02] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300"
                          title="Importar dados da usina automaticamente por documento técnico (Projeto, Inversores, Módulos ou Conta)"
                        >
                          <UploadCloud className="w-4 h-4 text-emerald-600" />
                          <span className="hidden sm:inline">Importar por Documento</span>
                          <span className="sm:hidden">Importar Doc</span>
                        </button>

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setIsEditingDetalhes(true)}
                          className="text-xs font-bold border-slate-300 hover:bg-slate-50"
                        >
                          Editar Ficha
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsEditingDetalhes(false)}
                        className="text-xs"
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>
              </DialogHeader>

              {/* Corpo da Ficha: Modo Visualização ou Modo Edição */}
              {!isEditingDetalhes ? (
                <div className="space-y-4 py-2 text-xs">
                  {/* Card no topo: Dados Cadastrais do Cliente */}
                  {(() => {
                    const docCadastral = cliente?.cpf || cliente?.cnpj || clienteDocumento
                    const telefoneCadastral = cliente?.telefone
                    const whatsappCadastral = cliente?.whatsapp || cliente?.telefone
                    const emailCadastral = cliente?.email
                    const enderecoPartes = [
                      cliente?.endereco,
                      cliente?.numero ? `nº ${cliente.numero}` : null,
                      cliente?.bairro,
                      cliente?.cidade && cliente?.estado
                        ? `${cliente.cidade} - ${cliente.estado}`
                        : cliente?.cidade || cliente?.estado,
                    ].filter(Boolean)
                    const enderecoCompleto = enderecoPartes.join(', ')

                    const whatsappDigits = whatsappCadastral
                      ? whatsappCadastral.replace(/\D/g, '')
                      : ''

                    return (
                      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0F2038] flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-[#E0A838]" />
                            Dados Cadastrais do Cliente
                          </span>
                          {docCadastral && (
                            <Badge
                              variant="outline"
                              className="font-mono text-[10px] font-semibold bg-white text-slate-700 border-slate-300"
                            >
                              {docCadastral}
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                              Nome / Razão Social
                            </span>
                            <span className="font-bold text-slate-900 text-xs">
                              {cliente?.nome || clienteNome}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                              Endereço Cadastral
                            </span>
                            <span className="font-medium text-slate-700 text-xs flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0 inline" />
                              <span className="truncate">
                                {enderecoCompleto || 'Endereço cadastral não informado'}
                              </span>
                            </span>
                          </div>
                        </div>

                        {/* Contatos Clicáveis */}
                        <div className="flex items-center gap-3 pt-1 border-t border-slate-200/50 flex-wrap">
                          {telefoneCadastral && (
                            <a
                              href={`tel:${telefoneCadastral.replace(/\D/g, '')}`}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:underline bg-white px-2 py-1 rounded-lg border border-slate-200"
                              title="Ligar para telefone cadastral"
                            >
                              <Phone className="w-3 h-3 text-blue-600" />
                              <span>{formatWhatsAppPhone(telefoneCadastral)}</span>
                            </a>
                          )}

                          {whatsappCadastral && (
                            <a
                              href={`https://wa.me/55${whatsappDigits.replace(/^55/, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline bg-white px-2 py-1 rounded-lg border border-slate-200"
                              title="Abrir conversa no WhatsApp"
                            >
                              <MessageSquare className="w-3 h-3 text-emerald-600" />
                              <span>WhatsApp ({formatWhatsAppPhone(whatsappCadastral)})</span>
                            </a>
                          )}

                          {emailCadastral && (
                            <a
                              href={`mailto:${emailCadastral}`}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:underline bg-white px-2 py-1 rounded-lg border border-slate-200"
                              title="Enviar e-mail"
                            >
                              <Mail className="w-3 h-3 text-slate-500" />
                              <span>{emailCadastral}</span>
                            </a>
                          )}

                          {!telefoneCadastral && !whatsappCadastral && !emailCadastral && (
                            <span className="text-[11px] text-slate-400 italic">
                              Nenhum contato cadastrado na ficha do cliente.
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })()}

                  {/* Status Banner */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-700">Status Operacional:</span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-xs ${
                          usinaDetalhes.status === 'inativo'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {usinaDetalhes.status === 'inativo' ? (
                          <>
                            <XCircle className="w-3.5 h-3.5" /> Inativo
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Ativo
                          </>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-medium">Classificação:</span>
                      <Badge variant="secondary" className="capitalize text-xs font-semibold">
                        {usinaDetalhes.tipo_usina || 'Residencial'}
                      </Badge>
                      <Badge variant="outline" className="capitalize text-xs font-semibold">
                        Estrutura {usinaDetalhes.tipo_estrutura || 'telhado'}
                      </Badge>
                    </div>
                  </div>

                  {/* Banner / Card de Verificação e Atualização de Dados da Usina */}
                  <div
                    className={`p-3.5 rounded-xl border transition-all ${
                      usinaDetalhes.dados_atualizados !== false
                        ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                        : 'bg-amber-50/90 border-amber-300 text-amber-950 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                            usinaDetalhes.dados_atualizados !== false
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-200 text-amber-800'
                          }`}
                        >
                          {usinaDetalhes.dados_atualizados !== false ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-amber-700" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs uppercase tracking-wider">
                              Verificação Cadastral da Usina
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold ${
                                usinaDetalhes.dados_atualizados !== false
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : 'bg-amber-100 text-amber-900 border-amber-400 font-extrabold'
                              }`}
                            >
                              {usinaDetalhes.dados_atualizados !== false
                                ? 'Dados Atualizados'
                                : 'Dados Desatualizados'}
                            </Badge>
                          </div>
                          <p className="text-xs mt-1 text-slate-600 leading-relaxed">
                            {usinaDetalhes.dados_atualizados !== false
                              ? 'Os dados cadastrais, técnicos e elétricos desta usina estão validados e liberados para abertura de atividades de manutenção.'
                              : 'Os dados desta usina estão marcados como desatualizados. Revise os campos técnicos/cadastrais abaixo e marque como atualizada para permitir a criação de atividades de manutenção.'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {usinaDetalhes.dados_atualizados === false ? (
                          <Button
                            type="button"
                            size="sm"
                            disabled={isUpdatingStatusCadastral}
                            onClick={() => handleToggleDadosAtualizados(true)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs gap-1.5"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-100" />
                            <span>
                              {isUpdatingStatusCadastral
                                ? 'Atualizando...'
                                : 'Marcar como Dados Atualizados'}
                            </span>
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isUpdatingStatusCadastral}
                            onClick={() => handleToggleDadosAtualizados(false)}
                            className="border-slate-300 text-slate-600 hover:text-amber-800 hover:bg-amber-50 hover:border-amber-300 text-xs gap-1.5"
                            title="Marcar que os dados da usina precisam de revisão"
                          >
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            <span>Marcar como Desatualizado</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ======================================================== */}
                  {/* 5 GRUPOS DE INFORMAÇÕES COM EDIÇÃO INLINE DA USINA       */}
                  {/* Padrão visual idêntico aos cards de FichaClienteDrawer   */}
                  {/* ======================================================== */}

                  {/* GRUPO 1: Localização da Instalação */}
                  <div className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <div className="text-[11px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        Localização da Instalação
                      </div>
                      <span className="text-[10px] text-gray-400">Edição inline</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      {/* Endereço */}
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 w-24 shrink-0">Endereço:</span>
                        <InlineEditField
                          value={usinaDetalhes.endereco || ''}
                          displayValue={
                            <span className="font-semibold text-gray-800">
                              {usinaDetalhes.endereco || 'Não inf.'}
                            </span>
                          }
                          type="text"
                          placeholder="Logradouro ou Linha/Estrada"
                          onSave={async (val) =>
                            handleUpdateUsinaField('endereco', String(val).trim())
                          }
                        />
                      </div>

                      {/* Número e Complemento */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 w-24 shrink-0">Número:</span>
                          <InlineEditField
                            value={usinaDetalhes.numero || ''}
                            displayValue={
                              <span className="font-medium text-gray-800">
                                {usinaDetalhes.numero || 'Não inf.'}
                              </span>
                            }
                            type="text"
                            placeholder="Nº ou S/N"
                            onSave={async (val) =>
                              handleUpdateUsinaField('numero', String(val).trim())
                            }
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 w-24 shrink-0">Complemento:</span>
                          <InlineEditField
                            value={usinaDetalhes.complemento || ''}
                            displayValue={
                              <span className="font-medium text-gray-800">
                                {usinaDetalhes.complemento || 'Não inf.'}
                              </span>
                            }
                            type="text"
                            placeholder="Galpão, Apto, Bloco..."
                            onSave={async (val) =>
                              handleUpdateUsinaField('complemento', String(val).trim())
                            }
                          />
                        </div>
                      </div>

                      {/* Bairro e CEP */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 w-24 shrink-0">Bairro:</span>
                          <InlineEditField
                            value={usinaDetalhes.bairro || ''}
                            displayValue={
                              <span className="font-medium text-gray-800">
                                {usinaDetalhes.bairro || 'Não inf.'}
                              </span>
                            }
                            type="text"
                            placeholder="Bairro ou Comunidade"
                            onSave={async (val) =>
                              handleUpdateUsinaField('bairro', String(val).trim())
                            }
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 w-24 shrink-0">CEP:</span>
                          <InlineEditField
                            value={usinaDetalhes.cep || ''}
                            displayValue={
                              <span className="font-mono text-gray-800 text-[11px] bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                                {usinaDetalhes.cep || 'Não inf.'}
                              </span>
                            }
                            type="text"
                            placeholder="00000-000"
                            onSave={async (val) =>
                              handleUpdateUsinaField('cep', String(val).trim())
                            }
                          />
                        </div>
                      </div>

                      {/* Cidade/UF */}
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 w-24 shrink-0">Cidade/UF:</span>
                        <InlineEditField
                          value={
                            usinaDetalhes.cidade && usinaDetalhes.estado
                              ? `${usinaDetalhes.cidade}/${usinaDetalhes.estado}`
                              : usinaDetalhes.cidade || usinaDetalhes.estado || ''
                          }
                          displayValue={
                            <span className="font-medium text-gray-800">
                              {usinaDetalhes.cidade
                                ? `${usinaDetalhes.cidade}${usinaDetalhes.estado ? ` - ${usinaDetalhes.estado}` : ''}`
                                : 'Não inf.'}
                            </span>
                          }
                          type="text"
                          placeholder="Cidade - UF"
                          onSave={async (val) => {
                            const raw = String(val).trim()
                            if (raw.includes('-')) {
                              const [c, uf] = raw.split('-')
                              await handleUpdateUsinaMultipleFields({
                                cidade: c.trim(),
                                estado: uf.trim(),
                              })
                            } else if (raw.includes('/')) {
                              const [c, uf] = raw.split('/')
                              await handleUpdateUsinaMultipleFields({
                                cidade: c.trim(),
                                estado: uf.trim(),
                              })
                            } else {
                              await handleUpdateUsinaField('cidade', raw)
                            }
                          }}
                        />
                      </div>

                      {/* Coordenadas Geográficas: Latitude e Longitude */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                          <Compass className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="text-gray-500 w-20 shrink-0">Latitude:</span>
                          <InlineEditField
                            value={usinaDetalhes.latitude ?? 0}
                            displayValue={
                              <span className="font-mono text-gray-800 text-[11px]">
                                {usinaDetalhes.latitude !== undefined &&
                                usinaDetalhes.latitude !== null &&
                                usinaDetalhes.latitude !== 0
                                  ? `${usinaDetalhes.latitude}°`
                                  : 'Não inf.'}
                              </span>
                            }
                            type="number"
                            step="0.0001"
                            unit="°"
                            placeholder="-27.6341"
                            onSave={async (val) =>
                              handleUpdateUsinaField('latitude', Number(val) || 0)
                            }
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <Compass className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="text-gray-500 w-20 shrink-0">Longitude:</span>
                          <InlineEditField
                            value={usinaDetalhes.longitude ?? 0}
                            displayValue={
                              <span className="font-mono text-gray-800 text-[11px]">
                                {usinaDetalhes.longitude !== undefined &&
                                usinaDetalhes.longitude !== null &&
                                usinaDetalhes.longitude !== 0
                                  ? `${usinaDetalhes.longitude}°`
                                  : 'Não inf.'}
                              </span>
                            }
                            type="number"
                            step="0.0001"
                            unit="°"
                            placeholder="-52.2739"
                            onSave={async (val) =>
                              handleUpdateUsinaField('longitude', Number(val) || 0)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CARD UNIFICADO: Concessionária de Energia + Titular / Responsável + Portal Concessionária */}
                  <div className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-xs space-y-4">
                    {/* Bloco 1 (Em cima): CONCESSIONÁRIA DE ENERGIA */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                        <div className="text-[11px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-emerald-600" />
                          Concessionária de Energia
                        </div>
                        <span className="text-[10px] text-gray-400">Edição inline</span>
                      </div>

                      <div className="space-y-2 text-xs">
                        {/* Número da UC (Geradora) */}
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 w-36 shrink-0">
                            Número da UC (Geradora):
                          </span>
                          <InlineEditField
                            value={usinaDetalhes.numero_uc || ''}
                            displayValue={
                              <span className="font-mono font-bold text-gray-900 bg-gray-50 px-2 py-0.5 rounded border border-gray-200 text-xs">
                                {usinaDetalhes.numero_uc || 'Não inf.'}
                              </span>
                            }
                            type="text"
                            placeholder="Ex: 1004589231"
                            onSave={async (val) =>
                              handleUpdateUsinaField('numero_uc', String(val).trim())
                            }
                          />
                        </div>

                        {/* Bloco de Beneficiárias (Aditivo) */}
                        <div className="pt-2 pb-1 border-t border-gray-100">
                          {(() => {
                            const benConfig = usinaDetalhes.beneficiarias
                            const habilitado = Boolean(benConfig?.habilitado)
                            const percGeradora = Number(benConfig?.percentual_geradora ?? 100)
                            const unidades = Array.isArray(benConfig?.unidades)
                              ? benConfig!.unidades
                              : []
                            const somaUnidades = unidades.reduce(
                              (acc, u) => acc + (Number(u.percentual) || 0),
                              0,
                            )
                            const somaTotal = Math.round((percGeradora + somaUnidades) * 100) / 100
                            const is100 = Math.abs(somaTotal - 100) <= 0.01

                            return (
                              <div className="space-y-2.5 bg-slate-50/70 p-2.5 rounded-lg border border-slate-200/80">
                                <div className="flex items-center justify-between">
                                  <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={habilitado}
                                      onChange={async (e) => {
                                        const novoHabilitado = e.target.checked
                                        if (novoHabilitado) {
                                          const novoConfig: UsinaBeneficiariasConfig = {
                                            habilitado: true,
                                            percentual_geradora: 100,
                                            unidades: [],
                                          }
                                          await handleUpdateUsinaField('beneficiarias', novoConfig)
                                        } else {
                                          await handleUpdateUsinaField('beneficiarias', null)
                                        }
                                      }}
                                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                                    />
                                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                      <Users className="w-3.5 h-3.5 text-emerald-600" />
                                      Beneficiárias (Rateio de Créditos)
                                    </span>
                                  </label>

                                  {habilitado && (
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                        is100
                                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                          : 'bg-rose-50 text-rose-800 border-rose-300'
                                      }`}
                                    >
                                      {is100 ? 'Soma: 100%' : `Soma: ${somaTotal}% (deve ser 100%)`}
                                    </span>
                                  )}
                                </div>

                                {habilitado && (
                                  <div className="space-y-2 pl-6">
                                    {/* Percentual da Geradora */}
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-600 w-44 shrink-0 font-medium text-[11px]">
                                        Percentual da Geradora (%):
                                      </span>
                                      <InlineEditField
                                        value={percGeradora}
                                        displayValue={
                                          <span className="font-mono font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200 text-xs">
                                            {percGeradora}%
                                          </span>
                                        }
                                        type="number"
                                        step="0.01"
                                        placeholder="Ex: 70"
                                        onSave={async (val) => {
                                          const novoPerc = Number(val) || 0
                                          const novoTotal =
                                            Math.round((novoPerc + somaUnidades) * 100) / 100
                                          if (Math.abs(novoTotal - 100) > 0.01) {
                                            alert(
                                              `A soma dos percentuais deve ser 100% — total atual: ${novoTotal}%. Ajuste as beneficiárias ou a geradora.`,
                                            )
                                            return
                                          }
                                          const novoConfig: UsinaBeneficiariasConfig = {
                                            habilitado: true,
                                            percentual_geradora: novoPerc,
                                            unidades,
                                          }
                                          await handleUpdateUsinaField('beneficiarias', novoConfig)
                                        }}
                                      />
                                    </div>

                                    {/* Lista de Unidades Beneficiárias */}
                                    <div className="space-y-1.5 pt-1">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-slate-700">
                                          Unidades Beneficiárias Cadastradas ({unidades.length})
                                        </span>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          onClick={async () => {
                                            const novaUnidade: UsinaBeneficiariaItem = {
                                              numero_uc: '',
                                              identificacao: '',
                                              percentual: 0,
                                            }
                                            const novasUnidades = [...unidades, novaUnidade]
                                            const novoConfig: UsinaBeneficiariasConfig = {
                                              habilitado: true,
                                              percentual_geradora: percGeradora,
                                              unidades: novasUnidades,
                                            }
                                            await handleUpdateUsinaField(
                                              'beneficiarias',
                                              novoConfig,
                                            )
                                          }}
                                          className="h-6 px-2 text-[10px] bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-300 font-bold flex items-center gap-1 shadow-2xs"
                                        >
                                          <Plus className="w-3 h-3 text-emerald-600" />
                                          <span>Adicionar Beneficiária</span>
                                        </Button>
                                      </div>

                                      {unidades.length === 0 ? (
                                        <p className="text-[11px] text-slate-400 italic">
                                          Nenhuma unidade beneficiária cadastrada. Clique em
                                          "Adicionar Beneficiária" acima.
                                        </p>
                                      ) : (
                                        <div className="space-y-1.5">
                                          {unidades.map((item, idx) => (
                                            <div
                                              key={idx}
                                              className="p-2 rounded bg-white border border-slate-200 text-xs space-y-1.5 shadow-2xs"
                                            >
                                              <div className="flex items-center justify-between">
                                                <span className="font-bold text-slate-700 text-[11px]">
                                                  Beneficiária #{idx + 1}
                                                </span>
                                                <button
                                                  type="button"
                                                  onClick={async () => {
                                                    const novas = unidades.filter(
                                                      (_, i) => i !== idx,
                                                    )
                                                    const novoConfig: UsinaBeneficiariasConfig = {
                                                      habilitado: true,
                                                      percentual_geradora: percGeradora,
                                                      unidades: novas,
                                                    }
                                                    await handleUpdateUsinaField(
                                                      'beneficiarias',
                                                      novoConfig,
                                                    )
                                                  }}
                                                  className="text-rose-500 hover:text-rose-700 text-[11px] flex items-center gap-0.5"
                                                  title="Remover unidade beneficiária"
                                                >
                                                  <Trash2 className="w-3 h-3" />
                                                  <span>Remover</span>
                                                </button>
                                              </div>

                                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                <div className="flex items-center gap-1.5">
                                                  <span className="text-gray-500 text-[11px] shrink-0">
                                                    UC:
                                                  </span>
                                                  <InlineEditField
                                                    value={item.numero_uc}
                                                    displayValue={
                                                      <span className="font-mono text-gray-900 bg-slate-50 px-1.5 py-0.5 rounded border border-gray-200 text-[11px]">
                                                        {item.numero_uc || 'Não inf.'}
                                                      </span>
                                                    }
                                                    type="text"
                                                    placeholder="Número da UC"
                                                    onSave={async (val) => {
                                                      const novas = [...unidades]
                                                      novas[idx] = {
                                                        ...novas[idx],
                                                        numero_uc: String(val).trim(),
                                                      }
                                                      await handleUpdateUsinaField(
                                                        'beneficiarias',
                                                        {
                                                          habilitado: true,
                                                          percentual_geradora: percGeradora,
                                                          unidades: novas,
                                                        },
                                                      )
                                                    }}
                                                  />
                                                </div>

                                                <div className="flex items-center gap-1.5">
                                                  <span className="text-gray-500 text-[11px] shrink-0">
                                                    Identificação:
                                                  </span>
                                                  <InlineEditField
                                                    value={item.identificacao}
                                                    displayValue={
                                                      <span className="text-gray-900 text-[11px] truncate max-w-[140px] block">
                                                        {item.identificacao || 'Não inf.'}
                                                      </span>
                                                    }
                                                    type="text"
                                                    placeholder="Nome / Descrição / Endereço"
                                                    onSave={async (val) => {
                                                      const novas = [...unidades]
                                                      novas[idx] = {
                                                        ...novas[idx],
                                                        identificacao: String(val).trim(),
                                                      }
                                                      await handleUpdateUsinaField(
                                                        'beneficiarias',
                                                        {
                                                          habilitado: true,
                                                          percentual_geradora: percGeradora,
                                                          unidades: novas,
                                                        },
                                                      )
                                                    }}
                                                  />
                                                </div>

                                                <div className="flex items-center gap-1.5">
                                                  <span className="text-gray-500 text-[11px] shrink-0">
                                                    Rateio (%):
                                                  </span>
                                                  <InlineEditField
                                                    value={item.percentual}
                                                    displayValue={
                                                      <span className="font-mono font-bold text-gray-900 bg-slate-50 px-1.5 py-0.5 rounded border border-gray-200 text-[11px]">
                                                        {item.percentual}%
                                                      </span>
                                                    }
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0"
                                                    onSave={async (val) => {
                                                      const novoPerc = Number(val) || 0
                                                      const novas = [...unidades]
                                                      novas[idx] = {
                                                        ...novas[idx],
                                                        percentual: novoPerc,
                                                      }
                                                      const sumU = novas.reduce(
                                                        (acc, u) =>
                                                          acc + (Number(u.percentual) || 0),
                                                        0,
                                                      )
                                                      const totalCheck =
                                                        Math.round((percGeradora + sumU) * 100) /
                                                        100
                                                      if (Math.abs(totalCheck - 100) > 0.01) {
                                                        alert(
                                                          `A soma dos percentuais deve ser 100% — total atual: ${totalCheck}%. Ajuste os percentuais.`,
                                                        )
                                                        return
                                                      }
                                                      await handleUpdateUsinaField(
                                                        'beneficiarias',
                                                        {
                                                          habilitado: true,
                                                          percentual_geradora: percGeradora,
                                                          unidades: novas,
                                                        },
                                                      )
                                                    }}
                                                  />
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      {/* Indicador de status da soma ao vivo */}
                                      <div
                                        className={`p-2 rounded text-[11px] font-bold border flex items-center gap-1.5 ${
                                          is100
                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                            : 'bg-rose-50 text-rose-800 border-rose-300'
                                        }`}
                                      >
                                        {is100 ? (
                                          <>
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                            <span>
                                              Soma: 100% (Geradora {percGeradora}% + Beneficiárias{' '}
                                              {somaUnidades}%)
                                            </span>
                                          </>
                                        ) : (
                                          <>
                                            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                            <span>
                                              A soma dos percentuais deve ser 100% — total atual:{' '}
                                              {somaTotal}% (Geradora {percGeradora}% + Beneficiárias{' '}
                                              {somaUnidades}%)
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })()}
                        </div>

                        {/* Concessionária e Classe de Consumo */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 w-28 shrink-0">Concessionária:</span>
                            <InlineEditField
                              value={usinaDetalhes.concessionaria || 'RGE Sul'}
                              displayValue={
                                <span className="font-bold text-gray-800 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                                  {usinaDetalhes.concessionaria || 'Não inf.'}
                                </span>
                              }
                              type="text"
                              placeholder="RGE, CPFL, Celesc..."
                              onSave={async (val) =>
                                handleUpdateUsinaField('concessionaria', String(val).trim())
                              }
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 w-24 shrink-0">Classe:</span>
                            <InlineEditField
                              value={usinaDetalhes.classe_consumo || ''}
                              displayValue={
                                <span className="font-medium text-gray-800 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                                  {usinaDetalhes.classe_consumo || 'Não inf.'}
                                </span>
                              }
                              type="text"
                              placeholder="Residencial, Comercial, Rural..."
                              onSave={async (val) =>
                                handleUpdateUsinaField('classe_consumo', String(val).trim())
                              }
                            />
                          </div>
                        </div>

                        {/* Tarifa R$/kWh e Tipo de Fornecimento */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 w-28 shrink-0">Tarifa R$/kWh:</span>
                            <InlineEditField
                              value={usinaDetalhes.tarifa ?? 0}
                              displayValue={
                                <span
                                  className="font-mono text-gray-800 text-[11px] bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200"
                                  title={`R$ ${usinaDetalhes.tarifa || 0}`}
                                >
                                  {Number(usinaDetalhes.tarifa) > 0
                                    ? `R$ ${Number(usinaDetalhes.tarifa).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`
                                    : 'Não inf.'}
                                </span>
                              }
                              type="number"
                              step="0.0001"
                              placeholder="0.9500"
                              onSave={async (val) =>
                                handleUpdateUsinaField('tarifa', Number(val) || 0)
                              }
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 w-24 shrink-0">Fornecimento:</span>
                            <InlineEditField
                              value={usinaDetalhes.tipo_fornecimento || 'trifásico'}
                              displayValue={
                                <span className="capitalize font-medium text-gray-800 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                                  {usinaDetalhes.tipo_fornecimento || 'trifásico'}
                                </span>
                              }
                              type="select"
                              options={FASES_USINA}
                              onSave={async (val) =>
                                handleUpdateUsinaField('tipo_fornecimento', String(val))
                              }
                            />
                          </div>
                        </div>

                        {/* Consumos: Médio Mensal, Anual e Diário */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-gray-100">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 w-28 sm:w-20 shrink-0 font-medium">
                              Cons. Médio:
                            </span>
                            <InlineEditField
                              value={usinaDetalhes.consumo_kwh_mes ?? 0}
                              displayValue={
                                <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
                                  {usinaDetalhes.consumo_kwh_mes
                                    ? `${usinaDetalhes.consumo_kwh_mes} kWh/mês`
                                    : 'Não inf.'}
                                </span>
                              }
                              type="number"
                              unit="kWh/mês"
                              placeholder="Ex: 650"
                              onSave={async (val) =>
                                handleUpdateUsinaField('consumo_kwh_mes', Number(val) || 0)
                              }
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 w-28 sm:w-20 shrink-0">
                              Cons. Anual:
                            </span>
                            <InlineEditField
                              value={usinaDetalhes.consumo_anual_kwh ?? 0}
                              displayValue={
                                <span className="font-bold text-gray-800 text-xs">
                                  {usinaDetalhes.consumo_anual_kwh
                                    ? `${usinaDetalhes.consumo_anual_kwh} kWh/ano`
                                    : 'Não inf.'}
                                </span>
                              }
                              type="number"
                              unit="kWh/ano"
                              placeholder="Ex: 7800"
                              onSave={async (val) =>
                                handleUpdateUsinaField('consumo_anual_kwh', Number(val) || 0)
                              }
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 w-28 sm:w-20 shrink-0">Méd./Dia:</span>
                            <InlineEditField
                              value={usinaDetalhes.consumo_medio_diario_kwh ?? 0}
                              displayValue={
                                <span className="font-bold text-gray-800 text-xs">
                                  {usinaDetalhes.consumo_medio_diario_kwh
                                    ? `${usinaDetalhes.consumo_medio_diario_kwh} kWh/dia`
                                    : 'Não inf.'}
                                </span>
                              }
                              type="number"
                              unit="kWh/dia"
                              placeholder="Ex: 25"
                              onSave={async (val) =>
                                handleUpdateUsinaField('consumo_medio_diario_kwh', Number(val) || 0)
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bloco 2 (Abaixo): TITULAR / RESPONSÁVEL */}
                    <div className="space-y-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                        <div className="text-[11px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                          Titular / Responsável
                        </div>

                        {cliente && (
                          <button
                            type="button"
                            onClick={async () => {
                              const updates: Partial<UsinaCliente> = {
                                titular_nome: cliente.nome || cliente.titular_nome || '',
                                titular_cpf:
                                  cliente.cpf || cliente.cnpj || cliente.titular_cpf || '',
                                titular_telefone:
                                  cliente.telefone ||
                                  cliente.whatsapp ||
                                  cliente.titular_telefone ||
                                  '',
                                titular_email: cliente.email || cliente.titular_email || '',
                              }
                              await handleUpdateUsinaMultipleFields(updates)
                            }}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 transition-colors shadow-2xs"
                            title="Copiar nome, CPF, telefone e e-mail da ficha principal do cliente para o titular desta usina"
                          >
                            <Copy className="w-3 h-3 text-emerald-600" />
                            <span>Copiar do cliente</span>
                          </button>
                        )}
                      </div>

                      <div className="space-y-2 text-xs">
                        {/* Nome do Titular */}
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="text-gray-500 w-24 shrink-0">Nome:</span>
                          <InlineEditField
                            value={usinaDetalhes.titular_nome || ''}
                            displayValue={
                              <span className="font-semibold text-gray-800">
                                {usinaDetalhes.titular_nome || 'Não inf.'}
                              </span>
                            }
                            type="text"
                            placeholder="Nome completo do titular na fatura"
                            onSave={async (val) =>
                              handleUpdateUsinaField('titular_nome', String(val).trim())
                            }
                          />
                        </div>

                        {/* CPF com máscara */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="flex items-center gap-2">
                            <Hash className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="text-gray-500 w-24 shrink-0">CPF:</span>
                            <InlineEditField
                              value={usinaDetalhes.titular_cpf || ''}
                              displayValue={
                                <span className="font-mono text-gray-800 text-[11px] bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                                  {usinaDetalhes.titular_cpf
                                    ? formatarCPF(usinaDetalhes.titular_cpf)
                                    : 'Não inf.'}
                                </span>
                              }
                              type="text"
                              placeholder="000.000.000-00"
                              onSave={async (val) => {
                                const raw = String(val)
                                const formatted = formatarCPF(raw)
                                await handleUpdateUsinaField('titular_cpf', formatted)
                              }}
                            />
                          </div>

                          {/* Telefone / WhatsApp */}
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="text-gray-500 w-20 shrink-0">Telefone:</span>
                            <InlineEditField
                              value={usinaDetalhes.titular_telefone || ''}
                              displayValue={
                                <span className="font-medium text-gray-800">
                                  {usinaDetalhes.titular_telefone
                                    ? formatWhatsAppPhone(usinaDetalhes.titular_telefone)
                                    : 'Não inf.'}
                                </span>
                              }
                              type="text"
                              placeholder="(00) 00000-0000"
                              onSave={async (val) =>
                                handleUpdateUsinaField(
                                  'titular_telefone',
                                  formatWhatsAppPhone(String(val)),
                                )
                              }
                            />
                          </div>
                        </div>

                        {/* E-mail */}
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="text-gray-500 w-24 shrink-0">E-mail:</span>
                          <InlineEditField
                            value={usinaDetalhes.titular_email || ''}
                            displayValue={
                              <span className="text-emerald-700 font-medium">
                                {usinaDetalhes.titular_email || 'Não inf.'}
                              </span>
                            }
                            type="text"
                            placeholder="email@exemplo.com.br"
                            onSave={async (val) =>
                              handleUpdateUsinaField('titular_email', String(val).trim())
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bloco 3 (Abaixo disso): PORTAL CONCESSIONÁRIA */}
                    <div className="space-y-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                        <div className="text-[11px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-emerald-600" />
                          Portal Concessionária
                        </div>
                        <span className="text-[10px] text-gray-400">Edição inline</span>
                      </div>

                      <div className="space-y-2 text-xs">
                        {/* Login (E-mail) */}
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="text-gray-500 w-24 shrink-0">Login:</span>
                          <InlineEditField
                            value={usinaDetalhes.portal_login || ''}
                            displayValue={
                              <span className="text-emerald-700 font-medium font-mono text-[11px]">
                                {usinaDetalhes.portal_login || 'Não inf.'}
                              </span>
                            }
                            type="email"
                            placeholder="usuario@email.com"
                            onSave={async (val) =>
                              handleUpdateUsinaField('portal_login', String(val).trim())
                            }
                          />
                        </div>

                        {/* Senha com toggle de olho Eye / EyeOff */}
                        <div className="flex items-center gap-2">
                          <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="text-gray-500 w-24 shrink-0">Senha:</span>
                          <InlineEditField
                            value={usinaDetalhes.portal_senha || ''}
                            displayValue={
                              <div className="inline-flex items-center gap-1.5">
                                <span className="font-mono text-gray-800 text-[11px] bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                                  {usinaDetalhes.portal_senha
                                    ? mostrarSenhaPortal
                                      ? usinaDetalhes.portal_senha
                                      : '••••••••'
                                    : 'Não inf.'}
                                </span>
                                {usinaDetalhes.portal_senha && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setMostrarSenhaPortal((prev) => !prev)
                                    }}
                                    className="p-1 rounded text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                                    title={mostrarSenhaPortal ? 'Ocultar senha' : 'Ver senha'}
                                    aria-label={mostrarSenhaPortal ? 'Ocultar senha' : 'Ver senha'}
                                  >
                                    {mostrarSenhaPortal ? (
                                      <EyeOff className="w-3.5 h-3.5" />
                                    ) : (
                                      <Eye className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                )}
                              </div>
                            }
                            type="password"
                            placeholder="Senha de acesso ao portal"
                            onSave={async (val) =>
                              handleUpdateUsinaField('portal_senha', String(val))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* GRUPO 4: Instalação Elétrica */}
                  <div className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <div className="text-[11px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-emerald-600" />
                        Instalação Elétrica
                      </div>
                      <span className="text-[10px] text-gray-400">Edição inline</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      {/* Data de Instalação e Tipo Telhado / Estrutura */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="text-gray-500 w-24 shrink-0">Instalação:</span>
                          <InlineEditField
                            value={
                              usinaDetalhes.data_instalacao
                                ? usinaDetalhes.data_instalacao.split(' ')[0].split('T')[0]
                                : ''
                            }
                            displayValue={
                              <span className="font-bold text-gray-800">
                                {usinaDetalhes.data_instalacao
                                  ? formatDate(usinaDetalhes.data_instalacao)
                                  : 'Não inf.'}
                              </span>
                            }
                            type="date"
                            placeholder="DD/MM/AAAA"
                            onSave={async (val) =>
                              handleUpdateUsinaField(
                                'data_instalacao',
                                val ? `${String(val)} 12:00:00.000Z` : undefined,
                              )
                            }
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <Home className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="text-gray-500 w-20 shrink-0">Telhado:</span>
                          <InlineEditField
                            value={usinaDetalhes.tipo_telhado || 'metalico'}
                            displayValue={
                              <span className="capitalize font-semibold text-gray-800">
                                {usinaDetalhes.tipo_telhado || 'Não inf.'}
                              </span>
                            }
                            type="select"
                            options={TELHADOS_USINA}
                            onSave={async (val) =>
                              handleUpdateUsinaField('tipo_telhado', String(val))
                            }
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <Wrench className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="text-gray-500 w-20 shrink-0">Estrutura:</span>
                          <InlineEditField
                            value={usinaDetalhes.tipo_estrutura || 'telhado'}
                            displayValue={
                              <span className="capitalize font-semibold text-gray-800">
                                {usinaDetalhes.tipo_estrutura || 'telhado'}
                              </span>
                            }
                            type="select"
                            options={[
                              { value: 'telhado', label: 'Telhado' },
                              { value: 'solo', label: 'Solo' },
                            ]}
                            onSave={async (val) =>
                              handleUpdateUsinaField('tipo_estrutura', String(val))
                            }
                          />
                        </div>
                      </div>

                      {/* Padrão de Entrada e Tipo de Atendimento */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 w-28 shrink-0">Padrão Entrada:</span>
                          <InlineEditField
                            value={usinaDetalhes.padrao_entrada || ''}
                            displayValue={
                              <span className="font-medium text-gray-800">
                                {usinaDetalhes.padrao_entrada || 'Não inf.'}
                              </span>
                            }
                            type="text"
                            placeholder="Ex: RIC BT Categoria A2"
                            onSave={async (val) =>
                              handleUpdateUsinaField('padrao_entrada', String(val).trim())
                            }
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 w-24 shrink-0">Atendimento:</span>
                          <InlineEditField
                            value={usinaDetalhes.tipo_atendimento || 'aéreo'}
                            displayValue={
                              <span className="capitalize font-medium text-gray-800 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                                {usinaDetalhes.tipo_atendimento || 'aéreo'}
                              </span>
                            }
                            type="select"
                            options={ATENDIMENTOS_USINA}
                            onSave={async (val) =>
                              handleUpdateUsinaField('tipo_atendimento', String(val))
                            }
                          />
                        </div>
                      </div>

                      {/* Seção de Cabos, Amperagem do Disjuntor e Número do Medidor */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 w-24 shrink-0">Seção Cabos:</span>
                          <InlineEditField
                            value={usinaDetalhes.secao_cabos || ''}
                            displayValue={
                              <span className="font-medium text-gray-800">
                                {usinaDetalhes.secao_cabos || 'Não inf.'}
                              </span>
                            }
                            type="text"
                            unit="mm²"
                            placeholder="Ex: 16 mm²"
                            onSave={async (val) =>
                              handleUpdateUsinaField('secao_cabos', String(val).trim())
                            }
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <Gauge className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="text-gray-500 w-16 shrink-0">Disjuntor:</span>
                          <InlineEditField
                            value={usinaDetalhes.amperagem_disjuntor || ''}
                            displayValue={
                              <span className="font-semibold text-gray-800 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                                {usinaDetalhes.amperagem_disjuntor || 'Não inf.'}
                              </span>
                            }
                            type="text"
                            unit="A"
                            placeholder="Ex: 40 A"
                            onSave={async (val) =>
                              handleUpdateUsinaField('amperagem_disjuntor', String(val).trim())
                            }
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <Hash className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="text-gray-500 w-20 shrink-0">Nº Medidor:</span>
                          <InlineEditField
                            value={usinaDetalhes.numero_medidor || ''}
                            displayValue={
                              <span className="font-mono font-bold text-gray-800 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200 text-[11px]">
                                {usinaDetalhes.numero_medidor || 'Não inf.'}
                              </span>
                            }
                            type="text"
                            placeholder="Ex: MED-RS-884210"
                            onSave={async (val) =>
                              handleUpdateUsinaField('numero_medidor', String(val).trim())
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bloco Unificado: Ativos da Usina (Consolida Equipamentos Fotovoltaicos, Relação de Ativos e Ativos Cadastrados) */}
                  <BlocoAtivosDaUsina
                    usina={usinaDetalhes}
                    clienteNome={clienteNome}
                    catalogoEquipamentos={catalogoEquipamentos}
                    onUpdateUsinaField={handleUpdateUsinaField}
                    onUpdateUsinaMultipleFields={handleUpdateUsinaMultipleFields}
                    encontrarDatasheetModuloUsina={encontrarDatasheetModuloUsina}
                    encontrarEquipamentoComDatasheet={encontrarEquipamentoComDatasheet}
                    onCloseModalUsina={() => setUsinaDetalhes(null)}
                  />

                  {/* Anotações da Usina (Histórico Operacional, Observações e Notas Técnicas) */}
                  <BlocoAnotacoesUsina
                    usina={usinaDetalhes}
                    clienteId={clienteId}
                    clienteNome={clienteNome}
                  />

                  {/* Documentos da Usina (Upload Múltiplo, Descrição por Documento, Lightbox & Download) */}
                  <SecaoDocumentosUsina
                    usinaId={usinaDetalhes.id}
                    usinaNome={usinaDetalhes.nome}
                    readOnly={false}
                  />

                  {/* Observações Técnicas */}
                  {usinaDetalhes.observacoes && (
                    <div className="p-3.5 rounded-xl bg-amber-50/40 border border-amber-200 text-slate-700 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-amber-700" />
                        Observações
                      </span>
                      <p className="text-xs leading-relaxed italic">{usinaDetalhes.observacoes}</p>
                    </div>
                  )}

                  {/* Contrato O&M Vinculado */}
                  {(() => {
                    const contratoVinculado =
                      usinaDetalhes.expand?.contrato_id ||
                      contratos.find((c) => c.id === usinaDetalhes.contrato_id) ||
                      null
                    const statusCalc = contratoVinculado
                      ? calcularStatusDinamicoContrato(contratoVinculado)
                      : null

                    return (
                      <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            Contrato O&M Vinculado
                          </span>

                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                handleOpenVincularContrato(usinaDetalhes)
                              }}
                              className="text-[11px] h-7 px-2.5"
                            >
                              Trocar Vínculo
                            </Button>
                          </div>
                        </div>

                        {contratoVinculado && statusCalc ? (
                          <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 text-xs">
                                {contratoVinculado.numero_contrato ||
                                  `#${contratoVinculado.id.slice(0, 8)}`}{' '}
                                • Plano {contratoVinculado.plano}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-bold ${statusCalc.badgeColorClass}`}
                              >
                                {statusCalc.badgeLabel}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-600">
                              <div>
                                <span className="text-slate-400 block">Vigência:</span>
                                <strong>{formatDate(contratoVinculado.data_inicio)}</strong> até{' '}
                                <strong>{formatDate(contratoVinculado.data_vencimento)}</strong>
                              </div>
                              {podeVerValoresFinanceiros && (
                                <div>
                                  <span className="text-slate-400 block">Valor Mensal:</span>
                                  <strong className="text-emerald-700">
                                    {formatCurrency(contratoVinculado.valor_mensal)}/mês
                                  </strong>
                                </div>
                              )}
                              <div className="flex items-center justify-end">
                                {onVerDetalhesContrato && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onVerDetalhesContrato(contratoVinculado, usinaDetalhes)
                                    }
                                    className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>Ver detalhes</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
                            <span>Nenhum contrato O&M vinculado a esta usina.</span>
                            {onAbrirModalNovoContrato && (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  const u = usinaDetalhes
                                  setUsinaDetalhes(null)
                                  onAbrirModalNovoContrato(u)
                                }}
                                className="bg-[#0F2038] hover:bg-[#1A365D] text-white text-[11px] h-7"
                              >
                                + Novo Contrato O&M
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              ) : (
                /* Formulário de Edição da Ficha */
                <div className="space-y-3 py-2 text-xs">
                  <div>
                    <Label className="text-xs font-bold text-slate-700">
                      Nome / Identificação da Usina *
                    </Label>
                    <Input
                      value={editNome}
                      onChange={(e) => setEditNome(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-700">
                      Endereço de Instalação
                    </Label>
                    <Input
                      value={editEndereco}
                      onChange={(e) => setEditEndereco(e.target.value)}
                      placeholder="Rua, número, bairro"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-700">Cidade da Usina</Label>
                    <Input
                      value={editCidade}
                      onChange={(e) => setEditCidade(e.target.value)}
                      placeholder="Ex: Erechim"
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bold text-slate-700">
                        Potência do Sistema (kWp)
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editPotencia}
                        onChange={(e) => setEditPotencia(e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-slate-700">
                        Quantidade de Módulos
                      </Label>
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        value={editQtdModulos}
                        onChange={(e) => setEditQtdModulos(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bold text-slate-700">
                        Inversor (Marca / Modelo / Potência)
                      </Label>
                      <Input
                        value={editInversores}
                        onChange={(e) => setEditInversores(e.target.value)}
                        placeholder="Ex: Growatt MIN 8000TL-X (8 kWp)"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-slate-700">
                        Geração Estimada (kWh/mês)
                      </Label>
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        value={editGeracao}
                        onChange={(e) => setEditGeracao(e.target.value)}
                        placeholder="Ex: 1150"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bold text-slate-700">Data de Instalação</Label>
                      <Input
                        type="date"
                        value={editDataInstalacao}
                        onChange={(e) => setEditDataInstalacao(e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-slate-700">Número do Medidor</Label>
                      <Input
                        value={editNumeroMedidor}
                        onChange={(e) => setEditNumeroMedidor(e.target.value)}
                        placeholder="Ex: MED-RS-884210"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bold text-slate-700">
                        Número da UC (Geradora)
                      </Label>
                      <Input
                        value={editNumeroUc}
                        onChange={(e) => setEditNumeroUc(e.target.value)}
                        placeholder="Ex: 1004589231"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-slate-700">Concessionária</Label>
                      <Input
                        value={editConcessionaria}
                        onChange={(e) => setEditConcessionaria(e.target.value)}
                        placeholder="Ex: RGE Sul"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Bloco de Beneficiárias na Edição Completa da Ficha */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-slate-800 flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editBeneficiariasHabilitado}
                          onChange={(e) => {
                            const checked = e.target.checked
                            setEditBeneficiariasHabilitado(checked)
                            if (checked && editBeneficiariasLista.length === 0) {
                              setEditPercentualGeradora(100)
                            }
                          }}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-emerald-600" />
                          Habilitar Unidades Beneficiárias (Rateio de Créditos)
                        </span>
                      </Label>

                      {editBeneficiariasHabilitado &&
                        (() => {
                          const percGeradora = Number(editPercentualGeradora) || 0
                          const totalU = editBeneficiariasLista.reduce(
                            (acc, item) => acc + (Number(item.percentual) || 0),
                            0,
                          )
                          const soma = Math.round((percGeradora + totalU) * 100) / 100
                          const is100 = Math.abs(soma - 100) <= 0.01
                          return (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                is100
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : 'bg-rose-50 text-rose-800 border-rose-300'
                              }`}
                            >
                              {is100 ? 'Soma: 100%' : `Soma: ${soma}% (deve ser 100%)`}
                            </span>
                          )
                        })()}
                    </div>

                    {editBeneficiariasHabilitado && (
                      <div className="space-y-3 pt-2 border-t border-slate-200">
                        <div className="max-w-xs">
                          <Label className="text-xs font-bold text-slate-700">
                            Percentual da Geradora (%) *
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={editPercentualGeradora}
                            onChange={(e) => setEditPercentualGeradora(e.target.value)}
                            placeholder="Ex: 70"
                            className="mt-1"
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700">
                              Unidades Beneficiárias Cadastradas ({editBeneficiariasLista.length})
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditBeneficiariasLista([
                                  ...editBeneficiariasLista,
                                  { numero_uc: '', identificacao: '', percentual: 0 },
                                ])
                              }}
                              className="h-7 px-2.5 text-xs bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-300 font-bold flex items-center gap-1 shadow-2xs"
                            >
                              <Plus className="w-3.5 h-3.5 text-emerald-600" />
                              <span>+ Adicionar Beneficiária</span>
                            </Button>
                          </div>

                          {editBeneficiariasLista.length === 0 ? (
                            <p className="text-xs text-slate-400 italic py-1">
                              Nenhuma unidade beneficiária adicionada ainda. Clique no botão acima
                              para incluir.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {editBeneficiariasLista.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-2 shadow-2xs"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-slate-700 text-xs">
                                      Beneficiária #{idx + 1}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditBeneficiariasLista(
                                          editBeneficiariasLista.filter((_, i) => i !== idx),
                                        )
                                      }}
                                      className="text-rose-500 hover:text-rose-700 text-xs flex items-center gap-1"
                                      title="Remover beneficiária"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Remover</span>
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <div>
                                      <Label className="text-[11px] text-slate-600">
                                        Número da UC
                                      </Label>
                                      <Input
                                        value={item.numero_uc}
                                        onChange={(e) => {
                                          const novalista = [...editBeneficiariasLista]
                                          novalista[idx] = {
                                            ...novalista[idx],
                                            numero_uc: e.target.value,
                                          }
                                          setEditBeneficiariasLista(novalista)
                                        }}
                                        placeholder="Ex: 2008741529"
                                        className="mt-0.5 h-8 text-xs"
                                      />
                                    </div>

                                    <div>
                                      <Label className="text-[11px] text-slate-600">
                                        Identificação (Nome / Endereço)
                                      </Label>
                                      <Input
                                        value={item.identificacao}
                                        onChange={(e) => {
                                          const novalista = [...editBeneficiariasLista]
                                          novalista[idx] = {
                                            ...novalista[idx],
                                            identificacao: e.target.value,
                                          }
                                          setEditBeneficiariasLista(novalista)
                                        }}
                                        placeholder="Ex: Filial Centro / Residência"
                                        className="mt-0.5 h-8 text-xs"
                                      />
                                    </div>

                                    <div>
                                      <Label className="text-[11px] text-slate-600">
                                        Percentual do Rateio (%)
                                      </Label>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="100"
                                        value={item.percentual}
                                        onChange={(e) => {
                                          const novalista = [...editBeneficiariasLista]
                                          novalista[idx] = {
                                            ...novalista[idx],
                                            percentual: Number(e.target.value) || 0,
                                          }
                                          setEditBeneficiariasLista(novalista)
                                        }}
                                        placeholder="Ex: 30"
                                        className="mt-0.5 h-8 text-xs"
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Indicador de Soma ao Vivo */}
                          {(() => {
                            const percGeradora = Number(editPercentualGeradora) || 0
                            const totalU = editBeneficiariasLista.reduce(
                              (acc, item) => acc + (Number(item.percentual) || 0),
                              0,
                            )
                            const soma = Math.round((percGeradora + totalU) * 100) / 100
                            const is100 = Math.abs(soma - 100) <= 0.01
                            return (
                              <div
                                className={`p-2.5 rounded-lg text-xs font-bold border flex items-center gap-2 ${
                                  is100
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : 'bg-rose-50 text-rose-800 border-rose-300'
                                }`}
                              >
                                {is100 ? (
                                  <>
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>
                                      Soma: 100% (Geradora {percGeradora}% + Beneficiárias {totalU}
                                      %)
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                    <span>
                                      A soma dos percentuais deve ser 100% — total atual: {soma}%
                                      (Geradora {percGeradora}% + Beneficiárias {totalU}%)
                                    </span>
                                  </>
                                )}
                              </div>
                            )
                          })()}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs font-bold text-slate-700">Status</Label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as 'ativo' | 'inativo')}
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs shadow-xs focus:border-[#0F2038] focus:outline-none"
                      >
                        <option value="ativo">Ativo</option>
                        <option value="inativo">Inativo</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-slate-700">Tipo de Usina</Label>
                      <select
                        value={editTipoUsina}
                        onChange={(e) => setEditTipoUsina(e.target.value)}
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs shadow-xs focus:border-[#0F2038] focus:outline-none"
                      >
                        <option value="residencial">Residencial</option>
                        <option value="comercial">Comercial</option>
                        <option value="industrial">Industrial</option>
                        <option value="rural">Rural</option>
                        <option value="investidor">Investidor</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-slate-700">Estrutura</Label>
                      <select
                        value={editTipoEstrutura}
                        onChange={(e) => setEditTipoEstrutura(e.target.value as 'telhado' | 'solo')}
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs shadow-xs focus:border-[#0F2038] focus:outline-none"
                      >
                        <option value="telhado">Telhado</option>
                        <option value="solo">Solo</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-700">Observações Técnicas</Label>
                    <textarea
                      rows={3}
                      value={editObservacoes}
                      onChange={(e) => setEditObservacoes(e.target.value)}
                      placeholder="Informações adicionais da usina, acesso ao padrão de entrada, detalhes de cabeamento, etc."
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white p-2 text-xs shadow-xs focus:border-[#0F2038] focus:outline-none"
                    />
                  </div>

                  {/* Verificação Cadastral no modo de edição */}
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                    <Label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="chk_dados_atualizados_edit"
                        checked={editDadosAtualizados}
                        onChange={(e) => setEditDadosAtualizados(e.target.checked)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                      />
                      <span>Marcar dados da usina como atualizados</span>
                    </Label>
                    <p className="text-[11px] text-slate-500 pl-6">
                      Ao manter marcado, libera a abertura de atividades de manutenção para esta
                      usina.
                    </p>
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between w-full">
                  <div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const confirmou = window.confirm(
                          `Deseja realmente excluir a usina "${usinaDetalhes.nome}"?`,
                        )
                        if (confirmou && onDeleteUsina) {
                          onDeleteUsina(usinaDetalhes.id)
                          setUsinaDetalhes(null)
                        }
                      }}
                      className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir Usina</span>
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    {isEditingDetalhes ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleSalvarEdicaoFicha}
                        disabled={isSavingDetalhes}
                        className="bg-[#0F2038] hover:bg-[#1A365D] text-white font-bold text-xs"
                      >
                        {isSavingDetalhes ? 'Salvando...' : 'Salvar Alterações'}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setUsinaDetalhes(null)}
                        className="text-xs"
                      >
                        Fechar Ficha
                      </Button>
                    )}
                  </div>
                </div>
              </DialogFooter>

              {/* Modal Nova Atividade vinculada a esta usina */}
              <ModalNovaAtividade
                isOpen={modalNovaAtividadeUsinaOpen}
                onClose={() => setModalNovaAtividadeUsinaOpen(false)}
                initialClienteId={clienteId}
                initialUsinaId={usinaDetalhes.id}
                usinas={usinas}
              />
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL: NOVA USINA (COM TODOS OS CAMPOS TÉCNICOS)          */}
      {/* ======================================================== */}
      <Dialog open={modalNovaUsinaOpen} onOpenChange={setModalNovaUsinaOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-extrabold text-[#0F2038]">
              <Sun className="w-5 h-5 text-[#E0A838]" />
              <span>Adicionar Nova Usina ao Cliente</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Cadastre uma nova usina vinculada a <strong>{clienteNome}</strong> com seus dados
              técnicos.
            </DialogDescription>
          </DialogHeader>

          {/* BLOCO ADITIVO: Importação por Documento (Fatura, Projeto, Memorial, Datasheet) */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-50/80 via-slate-50 to-amber-50/50 border border-amber-200/80 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                  <UploadCloud className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <span className="font-bold text-[#0F2038] text-xs">
                    Importar Dados por Documento
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Preencha os campos técnicos automaticamente com IA (fatura de energia, proposta,
                    projeto ou memorial).
                  </p>
                </div>
              </div>

              {/* Input de arquivo invisível acionado pelo botão */}
              <input
                ref={inputArquivoNovaUsinaRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.xls"
                className="hidden"
                disabled={isExtraindoDocNovaUsina || isSavingNovaUsina}
                onChange={handleImportarDocumentoNovaUsina}
              />

              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isExtraindoDocNovaUsina || isSavingNovaUsina}
                onClick={() => inputArquivoNovaUsinaRef.current?.click()}
                className="bg-white hover:bg-amber-50 text-[#0F2038] border-amber-300 font-bold text-xs shadow-xs flex items-center gap-1.5 shrink-0"
              >
                {isExtraindoDocNovaUsina ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                    <span>Processando...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-3.5 h-3.5 text-amber-600" />
                    <span>Importar Dados por Documento</span>
                  </>
                )}
              </Button>
            </div>

            {/* Feedback durante extração */}
            {isExtraindoDocNovaUsina && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-100/70 border border-amber-300 text-amber-900 text-[11px] animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-amber-700" />
                <span>
                  {statusProgressoNovaUsina || 'Analisando documento com IA especializada Skip...'}
                </span>
              </div>
            )}

            {/* Feedback de erro */}
            {erroExtracaoNovaUsina && (
              <div className="flex items-start gap-2 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px]">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600 mt-0.5" />
                <div className="flex-1">
                  <span>{erroExtracaoNovaUsina}</span>
                </div>
              </div>
            )}

            {/* Feedback de sucesso */}
            {sucessoExtracaoNovaUsina && (
              <div className="flex items-start gap-2 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px]">
                <CheckCircle className="w-3.5 h-3.5 shrink-0 text-emerald-600 mt-0.5" />
                <div className="flex-1">
                  <span>{sucessoExtracaoNovaUsina}</span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-bold text-slate-700">
                Nome / Identificação da Usina *
              </Label>
              <Input
                value={novaUsinaNome}
                onChange={(e) => setNovaUsinaNome(e.target.value)}
                placeholder="Ex: Usina 2 - Comercial Passo Fundo"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700">Endereço de Instalação</Label>
              <Input
                value={novaUsinaEndereco}
                onChange={(e) => setNovaUsinaEndereco(e.target.value)}
                placeholder="Rua, número, bairro"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700">Cidade da Usina</Label>
              <Input
                value={novaUsinaCidade}
                onChange={(e) => setNovaUsinaCidade(e.target.value)}
                placeholder="Ex: Erechim"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700">
                  Potência do Sistema (kWp)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={novaUsinaPotencia}
                  onChange={(e) => setNovaUsinaPotencia(e.target.value)}
                  placeholder="Ex: 15.0"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Quantidade de Módulos</Label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  value={novaUsinaQtdModulos}
                  onChange={(e) => setNovaUsinaQtdModulos(e.target.value)}
                  placeholder="Ex: 25"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700">
                  Inversor (Marca / Modelo / Potência)
                </Label>
                <Input
                  value={novaUsinaInversores}
                  onChange={(e) => setNovaUsinaInversores(e.target.value)}
                  placeholder="Ex: Deye SUN-15K-G04 (15 kWp)"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">
                  Geração Estimada (kWh/mês)
                </Label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  value={novaUsinaGeracao}
                  onChange={(e) => setNovaUsinaGeracao(e.target.value)}
                  placeholder="Ex: 2050"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700">Data de Instalação</Label>
                <Input
                  type="date"
                  value={novaUsinaDataInstalacao}
                  onChange={(e) => setNovaUsinaDataInstalacao(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Número do Medidor</Label>
                <Input
                  value={novaUsinaNumeroMedidor}
                  onChange={(e) => setNovaUsinaNumeroMedidor(e.target.value)}
                  placeholder="Ex: MED-PF-991204"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700">Status</Label>
                <select
                  value={novaUsinaStatus}
                  onChange={(e) => setNovaUsinaStatus(e.target.value as 'ativo' | 'inativo')}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs shadow-xs focus:border-[#0F2038] focus:outline-none"
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Tipo de Usina</Label>
                <select
                  value={novaUsinaTipo}
                  onChange={(e) => setNovaUsinaTipo(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs shadow-xs focus:border-[#0F2038] focus:outline-none"
                >
                  <option value="residencial">Residencial</option>
                  <option value="comercial">Comercial</option>
                  <option value="industrial">Industrial</option>
                  <option value="rural">Rural</option>
                  <option value="investidor">Investidor</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Estrutura</Label>
                <select
                  value={novaUsinaEstrutura}
                  onChange={(e) => setNovaUsinaEstrutura(e.target.value as 'telhado' | 'solo')}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs shadow-xs focus:border-[#0F2038] focus:outline-none"
                >
                  <option value="telhado">Telhado</option>
                  <option value="solo">Solo</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700">Número da UC (Geradora)</Label>
                <Input
                  value={novaUsinaNumeroUc}
                  onChange={(e) => setNovaUsinaNumeroUc(e.target.value)}
                  placeholder="Ex: 2008741529"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Concessionária</Label>
                <Input
                  value={novaUsinaConcessionaria}
                  onChange={(e) => setNovaUsinaConcessionaria(e.target.value)}
                  placeholder="Ex: RGE Sul"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Bloco de Beneficiárias no Modal de Criação da Usina */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-800 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={novaUsinaBeneficiariasHabilitado}
                    onChange={(e) => {
                      const checked = e.target.checked
                      setNovaUsinaBeneficiariasHabilitado(checked)
                      if (checked && novaUsinaBeneficiariasLista.length === 0) {
                        setNovaUsinaPercentualGeradora(100)
                      }
                    }}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-600" />
                    Habilitar Unidades Beneficiárias (Rateio de Créditos)
                  </span>
                </Label>

                {novaUsinaBeneficiariasHabilitado &&
                  (() => {
                    const percGeradora = Number(novaUsinaPercentualGeradora) || 0
                    const totalU = novaUsinaBeneficiariasLista.reduce(
                      (acc, item) => acc + (Number(item.percentual) || 0),
                      0,
                    )
                    const soma = Math.round((percGeradora + totalU) * 100) / 100
                    const is100 = Math.abs(soma - 100) <= 0.01
                    return (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          is100
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-rose-50 text-rose-800 border-rose-300'
                        }`}
                      >
                        {is100 ? 'Soma: 100%' : `Soma: ${soma}% (deve ser 100%)`}
                      </span>
                    )
                  })()}
              </div>

              {novaUsinaBeneficiariasHabilitado && (
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <div className="max-w-xs">
                    <Label className="text-xs font-bold text-slate-700">
                      Percentual da Geradora (%) *
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={novaUsinaPercentualGeradora}
                      onChange={(e) => setNovaUsinaPercentualGeradora(e.target.value)}
                      placeholder="Ex: 70"
                      className="mt-1"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">
                        Unidades Beneficiárias Cadastradas ({novaUsinaBeneficiariasLista.length})
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setNovaUsinaBeneficiariasLista([
                            ...novaUsinaBeneficiariasLista,
                            { numero_uc: '', identificacao: '', percentual: 0 },
                          ])
                        }}
                        className="h-7 px-2.5 text-xs bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-300 font-bold flex items-center gap-1 shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-600" />
                        <span>+ Adicionar Beneficiária</span>
                      </Button>
                    </div>

                    {novaUsinaBeneficiariasLista.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-1">
                        Nenhuma unidade beneficiária adicionada ainda. Clique no botão acima para
                        incluir.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {novaUsinaBeneficiariasLista.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-2 shadow-2xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-700 text-xs">
                                Beneficiária #{idx + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setNovaUsinaBeneficiariasLista(
                                    novaUsinaBeneficiariasLista.filter((_, i) => i !== idx),
                                  )
                                }}
                                className="text-rose-500 hover:text-rose-700 text-xs flex items-center gap-1"
                                title="Remover beneficiária"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Remover</span>
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div>
                                <Label className="text-[11px] text-slate-600">Número da UC</Label>
                                <Input
                                  value={item.numero_uc}
                                  onChange={(e) => {
                                    const novalista = [...novaUsinaBeneficiariasLista]
                                    novalista[idx] = {
                                      ...novalista[idx],
                                      numero_uc: e.target.value,
                                    }
                                    setNovaUsinaBeneficiariasLista(novalista)
                                  }}
                                  placeholder="Ex: 2008741529"
                                  className="mt-0.5 h-8 text-xs"
                                />
                              </div>

                              <div>
                                <Label className="text-[11px] text-slate-600">
                                  Identificação (Nome / Endereço)
                                </Label>
                                <Input
                                  value={item.identificacao}
                                  onChange={(e) => {
                                    const novalista = [...novaUsinaBeneficiariasLista]
                                    novalista[idx] = {
                                      ...novalista[idx],
                                      identificacao: e.target.value,
                                    }
                                    setNovaUsinaBeneficiariasLista(novalista)
                                  }}
                                  placeholder="Ex: Filial Centro / Residência"
                                  className="mt-0.5 h-8 text-xs"
                                />
                              </div>

                              <div>
                                <Label className="text-[11px] text-slate-600">
                                  Percentual do Rateio (%)
                                </Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="100"
                                  value={item.percentual}
                                  onChange={(e) => {
                                    const novalista = [...novaUsinaBeneficiariasLista]
                                    novalista[idx] = {
                                      ...novalista[idx],
                                      percentual: Number(e.target.value) || 0,
                                    }
                                    setNovaUsinaBeneficiariasLista(novalista)
                                  }}
                                  placeholder="Ex: 30"
                                  className="mt-0.5 h-8 text-xs"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Indicador de Soma ao Vivo */}
                    {(() => {
                      const percGeradora = Number(novaUsinaPercentualGeradora) || 0
                      const totalU = novaUsinaBeneficiariasLista.reduce(
                        (acc, item) => acc + (Number(item.percentual) || 0),
                        0,
                      )
                      const soma = Math.round((percGeradora + totalU) * 100) / 100
                      const is100 = Math.abs(soma - 100) <= 0.01
                      return (
                        <div
                          className={`p-2.5 rounded-lg text-xs font-bold border flex items-center gap-2 ${
                            is100
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-rose-50 text-rose-800 border-rose-300'
                          }`}
                        >
                          {is100 ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>
                                Soma: 100% (Geradora {percGeradora}% + Beneficiárias {totalU}%)
                              </span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                              <span>
                                A soma dos percentuais deve ser 100% — total atual: {soma}%
                                (Geradora {percGeradora}% + Beneficiárias {totalU}%)
                              </span>
                            </>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Dica de preenchimento inline completo após cadastro */}
            <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-emerald-800 text-[11px] flex items-center justify-between gap-2">
              <span>
                💡 Titular, Coordenadas GPS, Consumos e Detalhes Elétricos podem ser completados
                diretamente na Ficha com edição inline.
              </span>
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700">
                Vincular Contrato O&M Inicial (Opcional)
              </Label>
              <select
                value={novaUsinaContratoId}
                onChange={(e) => setNovaUsinaContratoId(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs shadow-xs focus:border-[#0F2038] focus:outline-none"
              >
                <option value="">Sem contrato O&M vinculado</option>
                {contratos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.numero_contrato || `#${c.id.slice(0, 6)}`} — Plano {c.plano}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700">Observações Técnicas</Label>
              <textarea
                rows={2}
                value={novaUsinaObservacoes}
                onChange={(e) => setNovaUsinaObservacoes(e.target.value)}
                placeholder="Observações de acesso, padrão de entrada, particularidades da usina..."
                className="mt-1 w-full rounded-md border border-slate-300 bg-white p-2 text-xs shadow-xs focus:border-[#0F2038] focus:outline-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalNovaUsinaOpen(false)}
              disabled={isSavingNovaUsina}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSalvarNovaUsina}
              disabled={isSavingNovaUsina}
              className="bg-[#0F2038] hover:bg-[#1A365D] text-white font-bold"
            >
              {isSavingNovaUsina ? 'Salvando...' : 'Cadastrar Usina'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Vincular Contrato O&M */}
      <Dialog open={modalVincularOpen} onOpenChange={setModalVincularOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-[#0F2038]">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>Vincular Contrato O&M à Usina</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {usinaSelecionadaParaVincular && (
                <span>
                  Selecione o contrato para vincular à usina{' '}
                  <strong>{usinaSelecionadaParaVincular.nome}</strong>.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3 text-xs">
            {contratos.length === 0 ? (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 space-y-2">
                <p className="font-bold">Nenhum contrato O&M cadastrado para este cliente.</p>
                <p className="text-[11px]">
                  Gere um Contrato O&M oficial com os dados da usina para iniciar a cobertura
                  técnica.
                </p>
                {onAbrirModalNovoContrato && usinaSelecionadaParaVincular && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      const u = usinaSelecionadaParaVincular
                      setModalVincularOpen(false)
                      onAbrirModalNovoContrato(u)
                    }}
                    className="w-full bg-[#0F2038] hover:bg-[#1A365D] text-white font-bold"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Gerar Novo Contrato O&M para esta Usina
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">
                  Contratos O&M Disponíveis
                </Label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {contratos.map((c) => {
                    const statusCalc = calcularStatusDinamicoContrato(c)
                    const isSelected = contratoSelecionadoId === c.id
                    return (
                      <div
                        key={c.id}
                        onClick={() => setContratoSelecionadoId(c.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-[#0F2038] bg-slate-50 ring-1 ring-[#0F2038]'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">
                            {c.numero_contrato || `Contrato #${c.id.slice(0, 8)}`}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusCalc.badgeColorClass}`}
                          >
                            {statusCalc.badgeLabel}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1 text-[11px] text-slate-600">
                          <span>Plano {c.plano}</span>
                          {podeVerValoresFinanceiros ? (
                            <span className="font-bold text-emerald-800">
                              {formatCurrency(c.valor_mensal)}/mês
                            </span>
                          ) : (
                            <span className="italic text-slate-400">Valores restritos</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          Vigência: {formatDate(c.data_inicio)} até {formatDate(c.data_vencimento)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalVincularOpen(false)}
              disabled={isVinculando}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSalvarVinculoContrato}
              disabled={isVinculando || !contratoSelecionadoId}
              className="bg-[#0F2038] hover:bg-[#1A365D] text-white font-bold"
            >
              {isVinculando ? 'Vinculando...' : 'Confirmar Vínculo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
