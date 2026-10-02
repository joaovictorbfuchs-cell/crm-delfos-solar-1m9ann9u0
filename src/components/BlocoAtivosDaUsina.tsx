import React, { useState, useEffect, useMemo } from 'react'
import {
  Cpu,
  Sun,
  Wrench,
  Plus,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  Settings,
  Phone,
  Building2,
  Hash,
  RefreshCw,
  Zap,
  Layers,
  TrendingUp,
  Calendar,
  Sparkles,
  CheckCircle2,
  Download,
  Eye,
  Paperclip,
  UploadCloud,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { Equipamento, UsinaEquipamentoAtivo } from '@/types/equipamentos'
import type {
  AtivoUsina,
  SalvarAtivoDados,
  TipoAtivo,
  StatusOperacionalAtivo,
} from '@/types/ativos'
import type { UsinaCliente, DocumentoUsinaItem } from '@/types/crm'
import {
  fetchEquipamentosPorUsina,
  vincularEquipamentoUsina,
  desvincularEquipamentoUsina,
} from '@/services/usinaEquipamentosService'
import {
  fetchEquipamentos,
  getDatasheetEquipamentoUrl,
  getDataloggerEquipamentoUrl,
  formatarPotenciaEquipamento,
  encontrarEquipamentoCorrespondente,
} from '@/services/equipamentosService'
import {
  fetchAtivosPorUsina,
  createAtivo,
  deleteAtivo,
  calcularStatusGarantia,
  getLabelTipoAtivo,
} from '@/services/ativosService'
import { formatDate } from '@/lib/formatters'
import { ModalFormEquipamento } from '@/components/ModalFormEquipamento'
import { InlineEditField } from '@/components/InlineEditField'
import { DatasheetBadge } from '@/components/DatasheetBadge'
import { normalizarDigitosDestino } from '@/lib/resolverNumeroDestinoCliente'
import { aplicarPrefixoMensagemManual } from '@/lib/whatsappPrefixo'
import { useAuth } from '@/contexts/AuthContext'

export interface AtivoDeclaradoUsina {
  tipo: 'inversor' | 'modulo_fv'
  marca: string
  modelo: string
  quantidade: number
  equipamentoCatalogo: Equipamento | null
  datasheetUrl?: string
  potenciaW?: number
}

interface BlocoAtivosDaUsinaProps {
  usina: UsinaCliente
  clienteNome?: string
  catalogoEquipamentos: Equipamento[]
  onUpdateUsinaField: (field: keyof UsinaCliente, value: unknown) => Promise<void>
  onUpdateUsinaMultipleFields: (updates: Partial<UsinaCliente>) => Promise<void>
  encontrarDatasheetModuloUsina: (usina: UsinaCliente) => Equipamento | null
  encontrarEquipamentoComDatasheet: (
    texto: string,
    tipo?: 'inversor' | 'modulo_fv',
  ) => Equipamento | null
  onCloseModalUsina?: () => void
}

export const BlocoAtivosDaUsina: React.FC<BlocoAtivosDaUsinaProps> = ({
  usina,
  clienteNome = '',
  catalogoEquipamentos: catalogoInicial,
  onUpdateUsinaField,
  onUpdateUsinaMultipleFields,
  encontrarDatasheetModuloUsina,
  encontrarEquipamentoComDatasheet,
  onCloseModalUsina,
}) => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [vinculos, setVinculos] = useState<UsinaEquipamentoAtivo[]>([])
  const [ativosIndividuais, setAtivosIndividuais] = useState<AtivoUsina[]>([])
  const [catalogoEquipamentos, setCatalogoEquipamentos] = useState<Equipamento[]>(
    catalogoInicial || [],
  )
  const [loading, setLoading] = useState<boolean>(true)
  const [expandido, setExpandido] = useState<boolean>(true)
  const [efetivandoVinculos, setEfetivandoVinculos] = useState<boolean>(false)

  // Modais de Ação
  const [modalVincularAberto, setModalVincularAberto] = useState<boolean>(false)
  const [equipamentoSelecionadoId, setEquipamentoSelecionadoId] = useState<string>('')
  const [quantidade, setQuantidade] = useState<string>('1')
  const [numeroSerie, setNumeroSerie] = useState<string>('')
  const [observacoes, setObservacoes] = useState<string>('')
  const [salvandoVinculo, setSalvandoVinculo] = useState<boolean>(false)

  // Modal Novo Equipamento no Catálogo (reuso do modal de Cadastros de Equipamentos)
  const [modalNovoEquipamentoAberto, setModalNovoEquipamentoAberto] = useState<boolean>(false)

  // Modal de Confirmação para Excluir Equipamento/Ativo da Usina
  const [itemParaExcluirUsina, setItemParaExcluirUsina] = useState<{
    tipo: 'vinculo' | 'ativo_individual' | 'declarado'
    id: string
    nome: string
    campoDeclarado?: 'inversor' | 'modulo'
  } | null>(null)
  const [excluindoAtivoUsina, setExcluindoAtivoUsina] = useState<boolean>(false)

  // Modal Cadastrar Ativo Individual
  const [modalCadastrarAtivoAberto, setModalCadastrarAtivoAberto] = useState<boolean>(false)
  const [salvandoAtivoIndividual, setSalvandoAtivoIndividual] = useState<boolean>(false)
  const [novoAtivoTipo, setNovoAtivoTipo] = useState<TipoAtivo>('inversor')
  const [novoAtivoTipoOutro, setNovoAtivoTipoOutro] = useState<string>('')
  const [novoAtivoFabricante, setNovoAtivoFabricante] = useState<string>('')
  const [novoAtivoModelo, setNovoAtivoModelo] = useState<string>('')
  const [novoAtivoNumeroSerie, setNovoAtivoNumeroSerie] = useState<string>('')
  const [novoAtivoDataInstalacao, setNovoAtivoDataInstalacao] = useState<string>('')
  const [novoAtivoDataFimGarantia, setNovoAtivoDataFimGarantia] = useState<string>('')
  const [novoAtivoStatusOperacional, setNovoAtivoStatusOperacional] =
    useState<StatusOperacionalAtivo>('operacional')
  const [novoAtivoObservacoes, setNovoAtivoObservacoes] = useState<string>('')

  // Estado para exclusão/gerenciamento de documentos anexados
  const [docParaExcluir, setDocParaExcluir] = useState<DocumentoUsinaItem | null>(null)
  const [removendoDoc, setRemovendoDoc] = useState<boolean>(false)
  const [uploadManualAberto, setUploadManualAberto] = useState<boolean>(false)
  const [uploadManualArquivo, setUploadManualArquivo] = useState<File | null>(null)
  const [uploadManualCategoria, setUploadManualCategoria] = useState<string>('projeto')
  const [uploadManualSalvando, setUploadManualSalvando] = useState<boolean>(false)
  const inputManualRef = React.useRef<HTMLInputElement | null>(null)

  const carregarDados = async () => {
    if (!usina?.id) return
    setLoading(true)
    try {
      const [vinculosData, ativosData, catalogoData] = await Promise.all([
        fetchEquipamentosPorUsina(usina.id),
        fetchAtivosPorUsina(usina.id),
        fetchEquipamentos(),
      ])
      setVinculos(vinculosData)
      setAtivosIndividuais(ativosData)
      setCatalogoEquipamentos(catalogoData)
    } catch (err) {
      console.error('Erro ao carregar ativos da usina:', err)
      toast.error('Erro ao carregar ativos da usina.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [usina?.id])

  const handleVincularEquipamento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!equipamentoSelecionadoId) {
      toast.warning('Selecione um equipamento do catálogo.')
      return
    }

    setSalvandoVinculo(true)
    try {
      const qtdNum = quantidade ? parseInt(quantidade, 10) : 1
      await vincularEquipamentoUsina({
        usina_id: usina.id,
        equipamento_id: equipamentoSelecionadoId,
        quantidade: isNaN(qtdNum) ? 1 : qtdNum,
        numero_serie: numeroSerie.trim() || undefined,
        observacoes: observacoes.trim() || undefined,
      })

      toast.success('Ativo adicionado à usina com sucesso!')
      setModalVincularAberto(false)
      setEquipamentoSelecionadoId('')
      setQuantidade('1')
      setNumeroSerie('')
      setObservacoes('')
      await carregarDados()
    } catch (err) {
      console.error('Erro ao adicionar ativo na usina:', err)
      toast.error('Não foi possível adicionar o ativo. Tente novamente.')
    } finally {
      setSalvandoVinculo(false)
    }
  }

  const handleConfirmarExclusaoAtivoUsina = async () => {
    if (!itemParaExcluirUsina) return
    setExcluindoAtivoUsina(true)
    try {
      if (itemParaExcluirUsina.tipo === 'vinculo') {
        await desvincularEquipamentoUsina(itemParaExcluirUsina.id)
        toast.success(`Ativo "${itemParaExcluirUsina.nome}" removido da usina com sucesso.`)
        setVinculos((prev) => prev.filter((v) => v.id !== itemParaExcluirUsina.id))
      } else if (itemParaExcluirUsina.tipo === 'ativo_individual') {
        const ok = await deleteAtivo(itemParaExcluirUsina.id)
        if (ok) {
          toast.success(
            `Ativo individual "${itemParaExcluirUsina.nome}" excluído da usina com sucesso.`,
          )
          setAtivosIndividuais((prev) => prev.filter((a) => a.id !== itemParaExcluirUsina.id))
        }
      } else if (itemParaExcluirUsina.tipo === 'declarado') {
        if (itemParaExcluirUsina.campoDeclarado === 'inversor') {
          await onUpdateUsinaMultipleFields({
            inversores_info: '',
            fabricante_inversores: '',
            modelo_inversores: '',
          })
          toast.success('Especificação de inversor removida da usina.')
        } else if (itemParaExcluirUsina.campoDeclarado === 'modulo') {
          await onUpdateUsinaMultipleFields({
            fabricante_modulos: '',
            modelo_modulos: '',
            marca_placas: '',
            qtd_modulos: 0,
            quantidade_placas: 0,
          })
          toast.success('Especificação de módulos removida da usina.')
        }
      }
      setItemParaExcluirUsina(null)
    } catch (err) {
      console.error('Erro ao excluir/remover equipamento da usina:', err)
      toast.error('Não foi possível excluir o equipamento da usina.')
    } finally {
      setExcluindoAtivoUsina(false)
    }
  }

  const handleRemoverVinculo = (id: string, nomeEq: string) => {
    setItemParaExcluirUsina({
      tipo: 'vinculo',
      id,
      nome: nomeEq,
    })
  }

  const handleRemoverAtivoIndividual = (id: string, nomeAtivo: string) => {
    setItemParaExcluirUsina({
      tipo: 'ativo_individual',
      id,
      nome: nomeAtivo,
    })
  }

  const handleRemoverEquipamentoDeclarado = (tipoEq: 'inversor' | 'modulo_fv', nome: string) => {
    setItemParaExcluirUsina({
      tipo: 'declarado',
      id: tipoEq,
      nome,
      campoDeclarado: tipoEq === 'inversor' ? 'inversor' : 'modulo',
    })
  }

  const handleNovoEquipamentoCadastrado = async (novoEquipamento: Equipamento) => {
    try {
      await vincularEquipamentoUsina({
        usina_id: usina.id,
        equipamento_id: novoEquipamento.id,
        quantidade: 1,
      })
      toast.success(`Equipamento "${novoEquipamento.modelo}" cadastrado e vinculado como ativo!`)
    } catch (err) {
      console.error('Equipamento criado mas falhou vínculo automático:', err)
      toast.success('Equipamento criado no catálogo!')
    }
    await carregarDados()
  }

  const handleSalvarAtivoIndividual = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoAtivoFabricante.trim() || !novoAtivoModelo.trim()) {
      toast.warning('Informe o fabricante e o modelo do ativo.')
      return
    }

    setSalvandoAtivoIndividual(true)
    try {
      const payload: SalvarAtivoDados = {
        usina_id: usina.id,
        tipo: novoAtivoTipo,
        tipo_outro_descricao: novoAtivoTipo === 'outros' ? novoAtivoTipoOutro.trim() : undefined,
        fabricante: novoAtivoFabricante.trim(),
        modelo: novoAtivoModelo.trim(),
        numero_serie: novoAtivoNumeroSerie.trim() || undefined,
        data_instalacao: novoAtivoDataInstalacao
          ? `${novoAtivoDataInstalacao} 12:00:00.000Z`
          : undefined,
        data_fim_garantia: novoAtivoDataFimGarantia
          ? `${novoAtivoDataFimGarantia} 12:00:00.000Z`
          : undefined,
        status_operacional: novoAtivoStatusOperacional,
        observacoes: novoAtivoObservacoes.trim() || undefined,
      }

      await createAtivo(payload)
      toast.success('Ativo cadastrado com sucesso!')
      setModalCadastrarAtivoAberto(false)
      setNovoAtivoFabricante('')
      setNovoAtivoModelo('')
      setNovoAtivoNumeroSerie('')
      setNovoAtivoDataInstalacao('')
      setNovoAtivoDataFimGarantia('')
      setNovoAtivoObservacoes('')
      await carregarDados()
    } catch (err) {
      console.error('Erro ao cadastrar ativo individual:', err)
      toast.error('Erro ao cadastrar o ativo. Verifique os dados.')
    } finally {
      setSalvandoAtivoIndividual(false)
    }
  }

  const handleWhatsAppSuporte = (numero: string) => {
    const limpo = normalizarDigitosDestino(numero)
    if (!limpo || limpo.length < 10) {
      toast.warning('Número de telefone do suporte inválido.')
      return
    }
    const msg = aplicarPrefixoMensagemManual(
      `Olá! Preciso de suporte técnico sobre o equipamento da usina ${usina.nome || ''}.`,
      user?.name,
    )
    window.open(`https://wa.me/${limpo}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  // Lista Consolidada de Documentos Anexados à Usina (Aditivos + Legados)
  const listaConsolidadaDocumentos = useMemo<DocumentoUsinaItem[]>(() => {
    const lista: DocumentoUsinaItem[] = []

    // 1. Documentos novos do campo json documentos_usina
    if (Array.isArray(usina.documentos_usina)) {
      usina.documentos_usina.forEach((doc) => {
        if (doc && doc.id) {
          lista.push(doc)
        }
      })
    }

    // 2. Legado: datasheet_inversor_url
    if (usina.datasheet_inversor_url && usina.datasheet_inversor_url.trim()) {
      const jaExiste = lista.some((d) => d.url === usina.datasheet_inversor_url)
      if (!jaExiste) {
        lista.push({
          id: 'legado_inversor',
          nome_arquivo: 'Datasheet Inversor (Legado)',
          categoria: 'datasheet_inversor',
          url: usina.datasheet_inversor_url,
          criado_em: usina.created || new Date().toISOString(),
          origem: 'legado_datasheet_inversor',
          observacoes: 'Documento original cadastrado no campo datasheet_inversor_url',
        })
      }
    }

    // 3. Legado: datasheet_modulo_url
    if (usina.datasheet_modulo_url && usina.datasheet_modulo_url.trim()) {
      const jaExiste = lista.some((d) => d.url === usina.datasheet_modulo_url)
      if (!jaExiste) {
        lista.push({
          id: 'legado_modulo',
          nome_arquivo: 'Datasheet Módulos (Legado)',
          categoria: 'datasheet_modulo',
          url: usina.datasheet_modulo_url,
          criado_em: usina.created || new Date().toISOString(),
          origem: 'legado_datasheet_modulo',
          observacoes: 'Documento original cadastrado no campo datasheet_modulo_url',
        })
      }
    }

    return lista
  }, [
    usina.documentos_usina,
    usina.datasheet_inversor_url,
    usina.datasheet_modulo_url,
    usina.created,
  ])

  // Exclusão individual de documento com confirmação
  const handleConfirmarExcluirDoc = async () => {
    if (!docParaExcluir) return
    setRemovendoDoc(true)
    try {
      if (docParaExcluir.id === 'legado_inversor') {
        // Limpar campo legado datasheet_inversor_url
        await onUpdateUsinaField('datasheet_inversor_url', '')
      } else if (docParaExcluir.id === 'legado_modulo') {
        // Limpar campo legado datasheet_modulo_url
        await onUpdateUsinaField('datasheet_modulo_url', '')
      } else {
        // Remover da lista de documentos_usina
        const docsAtuais = Array.isArray(usina.documentos_usina) ? usina.documentos_usina : []
        const novaLista = docsAtuais.filter((d) => d.id !== docParaExcluir.id)
        await onUpdateUsinaField('documentos_usina', novaLista)
      }
      toast.success(`Documento "${docParaExcluir.nome_arquivo}" removido com sucesso.`)
      setDocParaExcluir(null)
    } catch (err) {
      console.error('[BlocoAtivosDaUsina] Erro ao remover documento:', err)
      toast.error('Não foi possível remover o documento.')
    } finally {
      setRemovendoDoc(false)
    }
  }

  // Upload manual rápido de documento direto na ficha
  const handleSalvarUploadManual = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadManualArquivo) {
      toast.warning('Selecione um arquivo para upload.')
      return
    }

    setUploadManualSalvando(true)
    try {
      let fileDataUrl = ''
      try {
        fileDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = (err) => reject(err)
          reader.readAsDataURL(uploadManualArquivo)
        })
      } catch (err) {
        console.warn('Erro ao ler base64:', err)
      }

      const novoItem: DocumentoUsinaItem = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        nome_arquivo: uploadManualArquivo.name,
        categoria: uploadManualCategoria,
        url: fileDataUrl,
        tamanho: uploadManualArquivo.size,
        tipo_mime: uploadManualArquivo.type || 'application/pdf',
        criado_em: new Date().toISOString(),
        origem: 'upload',
      }

      const docsAtuais = Array.isArray(usina.documentos_usina) ? [...usina.documentos_usina] : []
      docsAtuais.push(novoItem)

      await onUpdateUsinaField('documentos_usina', docsAtuais)
      toast.success(`Documento "${uploadManualArquivo.name}" adicionado com sucesso!`)
      setUploadManualAberto(false)
      setUploadManualArquivo(null)
      setUploadManualCategoria('projeto')
    } catch (err) {
      console.error('Erro ao salvar documento anexado:', err)
      toast.error('Erro ao anexar documento.')
    } finally {
      setUploadManualSalvando(false)
    }
  }

  // Deduplicação visual (Problema 2):
  // Verifica se já existem equipamentos do catálogo vinculados para inversor e módulo
  const temEquipamentoCatalogoInversor = useMemo(() => {
    const temVinculoInversor = vinculos.some((v) => v.expand?.equipamento_id?.tipo === 'inversor')
    const temAtivoIndividualInversor = ativosIndividuais.some(
      (a) =>
        a.tipo === 'inversor' ||
        a.fabricante?.toLowerCase().includes('solis') ||
        a.fabricante?.toLowerCase().includes('growatt') ||
        a.fabricante?.toLowerCase().includes('deye') ||
        a.modelo?.toLowerCase().includes('solis') ||
        a.modelo?.toLowerCase().includes('inversor'),
    )
    return temVinculoInversor || temAtivoIndividualInversor
  }, [vinculos, ativosIndividuais])

  const temEquipamentoCatalogoModulo = useMemo(() => {
    const temVinculoModulo = vinculos.some((v) => v.expand?.equipamento_id?.tipo === 'modulo_fv')
    const temAtivoIndividualModulo = ativosIndividuais.some(
      (a) =>
        a.tipo === 'placa_solar' ||
        (a.tipo as string) === 'modulo_fv' ||
        a.fabricante?.toLowerCase().includes('sunova') ||
        a.fabricante?.toLowerCase().includes('canadian') ||
        a.fabricante?.toLowerCase().includes('ja solar') ||
        a.fabricante?.toLowerCase().includes('trina') ||
        a.modelo?.toLowerCase().includes('placa') ||
        a.modelo?.toLowerCase().includes('modulo'),
    )
    return temVinculoModulo || temAtivoIndividualModulo
  }, [vinculos, ativosIndividuais])

  // Inferir equipamentos declarados nos campos técnicos da usina
  const equipamentosDeclarados = useMemo<AtivoDeclaradoUsina[]>(() => {
    const lista: AtivoDeclaradoUsina[] = []

    // 1. Inversor declarado
    const inversorTexto = (usina.inversores_info || '').trim()
    const inversorFabricante = (usina.fabricante_inversores || '').trim()
    const inversorModelo = (usina.modelo_inversores || '').trim()

    if (inversorTexto || inversorFabricante || inversorModelo) {
      let eqCatalogo: Equipamento | null = null
      if (inversorFabricante || inversorModelo) {
        eqCatalogo = encontrarEquipamentoCorrespondente(catalogoEquipamentos, {
          marca: inversorFabricante,
          modelo: inversorModelo,
          tipo: 'inversor',
          apenasComDatasheet: false,
        })
      }
      if (!eqCatalogo && inversorTexto) {
        eqCatalogo = encontrarEquipamentoCorrespondente(catalogoEquipamentos, {
          marca: inversorTexto,
          modelo: inversorTexto,
          tipo: 'inversor',
          apenasComDatasheet: false,
        })
      }
      if (!eqCatalogo && inversorTexto) {
        eqCatalogo = encontrarEquipamentoComDatasheet(inversorTexto, 'inversor')
      }

      lista.push({
        tipo: 'inversor',
        marca: eqCatalogo?.marca || inversorFabricante || 'Inversor Solar',
        modelo: eqCatalogo?.modelo || inversorModelo || inversorTexto || 'Modelo não especificado',
        quantidade: 1,
        equipamentoCatalogo: eqCatalogo,
        datasheetUrl: eqCatalogo ? getDatasheetEquipamentoUrl(eqCatalogo) : undefined,
        potenciaW: eqCatalogo?.potencia_w || undefined,
      })
    }

    // 2. Módulos declarados
    const moduloFabricante = (usina.fabricante_modulos || usina.marca_placas || '').trim()
    const moduloModelo = (usina.modelo_modulos || '').trim()
    const qtdModulos = Number(usina.qtd_modulos || usina.quantidade_placas || 0)

    if (moduloFabricante || moduloModelo || qtdModulos > 0) {
      let eqCatalogo = encontrarDatasheetModuloUsina(usina)
      if (!eqCatalogo && (moduloFabricante || moduloModelo)) {
        eqCatalogo = encontrarEquipamentoCorrespondente(catalogoEquipamentos, {
          marca: moduloFabricante,
          modelo: moduloModelo,
          tipo: 'modulo_fv',
          apenasComDatasheet: false,
        })
      }
      if (!eqCatalogo && (moduloFabricante || moduloModelo)) {
        eqCatalogo = encontrarEquipamentoComDatasheet(
          `${moduloFabricante} ${moduloModelo}`.trim(),
          'modulo_fv',
        )
      }

      lista.push({
        tipo: 'modulo_fv',
        marca: eqCatalogo?.marca || moduloFabricante || 'Módulo Fotovoltaico',
        modelo: eqCatalogo?.modelo || moduloModelo || 'Modelo não especificado',
        quantidade: qtdModulos > 0 ? qtdModulos : 1,
        equipamentoCatalogo: eqCatalogo,
        datasheetUrl: eqCatalogo ? getDatasheetEquipamentoUrl(eqCatalogo) : undefined,
        potenciaW: eqCatalogo?.potencia_w || undefined,
      })
    }

    return lista
  }, [
    usina.inversores_info,
    usina.fabricante_inversores,
    usina.modelo_inversores,
    usina.fabricante_modulos,
    usina.marca_placas,
    usina.modelo_modulos,
    usina.qtd_modulos,
    usina.quantidade_placas,
    catalogoEquipamentos,
    encontrarDatasheetModuloUsina,
    encontrarEquipamentoComDatasheet,
  ])

  // Contagem do badge: vínculos + ativos individuais, ou equipamentos declarados se as tabelas estiverem vazias
  const registrosPersistidos = vinculos.length + ativosIndividuais.length
  const totalAtivos =
    registrosPersistidos > 0 ? registrosPersistidos : equipamentosDeclarados.length
  const exibindoDeclarados = registrosPersistidos === 0 && equipamentosDeclarados.length > 0

  // Ação de 1 clique para efetivar vínculo dos equipamentos declarados no catálogo
  const handleEfetivarVinculosDeclarados = async () => {
    if (!usina?.id) return
    if (equipamentosDeclarados.length === 0) {
      toast.warning('Nenhum equipamento identificado no cadastro da usina.')
      return
    }

    setEfetivandoVinculos(true)
    let vinculadosCount = 0
    let criadosEVinculadosCount = 0

    try {
      for (const item of equipamentosDeclarados) {
        let eqId = item.equipamentoCatalogo?.id

        // Se o equipamento não estiver no catálogo, criamos no catálogo antes de vincular
        if (!eqId) {
          try {
            const novo = await vincularEquipamentoUsina({
              usina_id: usina.id,
              // vamos criar o equipamento primeiro
              equipamento_id: '',
            } as any).catch(() => null)
          } catch {
            // fallback normal abaixo
          }
        }

        if (eqId) {
          await vincularEquipamentoUsina({
            usina_id: usina.id,
            equipamento_id: eqId,
            quantidade: item.quantidade,
            observacoes: 'Efetivado a partir do cadastro técnico da usina',
          })
          vinculadosCount++
        }
      }

      if (vinculadosCount > 0) {
        toast.success(
          `${vinculadosCount} ${vinculadosCount === 1 ? 'equipamento vinculado' : 'equipamentos vinculados'} com sucesso!`,
        )
      } else {
        toast.info(
          'Equipamentos identificados não possuem cadastro no catálogo. Use "Adicionar Ativo" ou "Novo Equipamento" para selecioná-los.',
        )
      }
      await carregarDados()
    } catch (err) {
      console.error('Erro ao efetivar vínculos:', err)
      toast.error('Erro ao efetivar vínculos. Tente novamente.')
    } finally {
      setEfetivandoVinculos(false)
    }
  }

  const handleGerenciarTelaAtivos = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onCloseModalUsina) {
      onCloseModalUsina()
    }
    navigate('/equipamentos')
  }

  return (
    <div className="p-4 rounded-2xl border border-emerald-300 bg-emerald-50/40 shadow-xs space-y-4">
      {/* ================================================================ */}
      {/* CABEÇALHO DO BLOCO ÚNICO "ATIVOS DA USINA"                      */}
      {/* ================================================================ */}
      <div className="flex items-center justify-between flex-wrap gap-2.5 border-b border-emerald-200/70 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#0F2038] text-[#E0A838] shadow-xs">
            <Cpu className="w-5 h-5 text-[#E0A838]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-[#0F2038] uppercase tracking-wider">
                Ativos da Usina
              </span>
              <Badge
                variant="outline"
                className="bg-white text-emerald-800 text-[11px] font-bold border-emerald-300 shadow-2xs"
              >
                {totalAtivos} {totalAtivos === 1 ? 'ativo' : 'ativos'}
                {exibindoDeclarados && ' (no cadastro)'}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Gestão centralizada de inversores, módulos, baterias, números de série, garantias e
              datasheets.
            </p>
          </div>
        </div>

        {/* Barra de Ações Rápidas do Bloco */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={handleGerenciarTelaAtivos}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 hover:text-emerald-900 bg-white hover:bg-emerald-100/70 px-2.5 py-1.5 rounded-lg border border-emerald-300 transition-colors shadow-2xs cursor-pointer"
            title="Abrir Cadastro de Equipamentos do catálogo fechando sobreposições"
          >
            <span>Gerenciar na Tela de Ativos</span>
            <ExternalLink className="w-3 h-3 text-emerald-600" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setModalVincularAberto(true)
            }}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Ativo</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setModalNovoEquipamentoAberto(true)
            }}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-900 bg-emerald-100 hover:bg-emerald-200/80 px-2.5 py-1.5 rounded-lg border border-emerald-300 transition-colors shadow-2xs cursor-pointer"
            title="Cadastrar um novo equipamento no catálogo geral e vincular a esta usina"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-700" />
            <span>Novo Equipamento</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setModalCadastrarAtivoAberto(true)
            }}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-800 bg-white hover:bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-300 transition-colors shadow-2xs cursor-pointer"
            title="Cadastrar ativo individual estruturado (S/N e garantia)"
          >
            <Plus className="w-3.5 h-3.5 text-amber-600" />
            <span>Cadastrar Ativo</span>
          </button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              setExpandido((prev) => !prev)
            }}
            className="h-8 px-2 text-xs text-slate-700 hover:text-slate-900 hover:bg-emerald-100/50 cursor-pointer"
            title={expandido ? 'Recolher detalhes' : 'Expandir detalhes'}
          >
            {expandido ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* ================================================================ */}
      {/* LINHA RESUMO / PARÂMETROS FOTOVOLTAICOS DA USINA (Edição Inline)  */}
      {/* Dados consolidados: Potência kWp, Módulos, Geração, Módulos/Inv.  */}
      {/* ================================================================ */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="text-[11px] uppercase font-bold text-[#0F2038] tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            Resumo dos Equipamentos da Usina (Módulos & Inversores)
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Edição inline nos campos</span>
        </div>

        {/* Grid 3 colunas: Potência total kWp, Qtd de Módulos e Geração Estimada */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="flex items-center gap-2 p-2 bg-slate-50/80 rounded-lg border border-slate-100">
            <Zap className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-slate-500 w-20 shrink-0 font-medium">Potência:</span>
            <InlineEditField
              value={usina.potencia_kwp ?? 0}
              displayValue={
                <span className="font-black text-emerald-700 text-sm">
                  {usina.potencia_kwp || 0} kWp
                </span>
              }
              type="number"
              step="0.01"
              min={0}
              unit="kWp"
              placeholder="0"
              onSave={async (val) => onUpdateUsinaField('potencia_kwp', Number(val) || 0)}
            />
          </div>

          <div className="flex items-center gap-2 p-2 bg-slate-50/80 rounded-lg border border-slate-100">
            <Layers className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="text-slate-500 w-20 shrink-0 font-medium">Módulos:</span>
            <InlineEditField
              value={usina.qtd_modulos ?? 0}
              displayValue={
                <span className="font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded text-xs border border-blue-200">
                  {usina.qtd_modulos || 0} un
                </span>
              }
              type="number"
              step="1"
              min={0}
              unit="un"
              placeholder="0"
              onSave={async (val) => onUpdateUsinaField('qtd_modulos', Number(val) || 0)}
            />
          </div>

          <div className="flex items-center gap-2 p-2 bg-slate-50/80 rounded-lg border border-slate-100">
            <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-slate-500 w-20 shrink-0 font-medium">Geração:</span>
            <InlineEditField
              value={usina.geracao_estimada_kwh ?? 0}
              displayValue={
                <span className="font-bold text-emerald-800 text-xs">
                  {usina.geracao_estimada_kwh
                    ? `${usina.geracao_estimada_kwh} kWh/mês`
                    : 'Não inf.'}
                </span>
              }
              type="number"
              step="1"
              min={0}
              unit="kWh/mês"
              placeholder="Ex: 1150"
              onSave={async (val) => onUpdateUsinaField('geracao_estimada_kwh', Number(val) || 0)}
            />
          </div>
        </div>

        {/* Fabricante e Modelo dos Módulos com Datasheet (Deduplicação quando já vinculado ao catálogo) */}
        {temEquipamentoCatalogoModulo ? (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="text-slate-600 font-medium">Módulos Fotovoltaicos:</span>
            </div>
            <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[11px] font-medium"
            >
              Equipamentos gerenciados nos cards de ativos abaixo com datasheet oficial.
            </Badge>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 w-24 shrink-0 font-medium">Fabricante:</span>
                <InlineEditField
                  value={usina.fabricante_modulos || usina.marca_placas || ''}
                  displayValue={
                    <span className="font-medium text-slate-800">
                      {usina.fabricante_modulos || usina.marca_placas || 'Não inf.'}
                    </span>
                  }
                  type="text"
                  placeholder="Canadian Solar, JA Solar, Trina..."
                  onSave={async (val) => {
                    const s = String(val).trim()
                    await onUpdateUsinaMultipleFields({
                      fabricante_modulos: s,
                      marca_placas: s,
                    })
                  }}
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-500 w-20 shrink-0 font-medium">Modelo:</span>
                <InlineEditField
                  value={usina.modelo_modulos || ''}
                  displayValue={
                    <span className="font-mono text-slate-800 text-[11px] bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                      {usina.modelo_modulos || 'Não inf.'}
                    </span>
                  }
                  type="text"
                  placeholder="Modelo do módulo"
                  className="flex-1"
                  onSave={async (val) => onUpdateUsinaField('modelo_modulos', String(val).trim())}
                />
              </div>
            </div>

            {/* Datasheet Badge do Módulo */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 flex-wrap text-xs">
              <span className="text-slate-500 text-[11px] font-medium">Datasheet do Módulo:</span>
              <div className="flex items-center gap-2">
                {(() => {
                  const eqModulo = encontrarDatasheetModuloUsina(usina)
                  if (eqModulo && eqModulo.datasheet_pdf) {
                    const url = getDatasheetEquipamentoUrl(eqModulo)
                    if (url) {
                      return (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg border border-emerald-300 transition-colors shrink-0 shadow-2xs"
                          title={`Abrir Datasheet PDF (${eqModulo.marca} ${eqModulo.modelo})`}
                        >
                          <FileText className="w-3 h-3 text-emerald-600" />
                          <span>Datasheet PDF ({eqModulo.marca})</span>
                          <ExternalLink className="w-2.5 h-2.5 text-emerald-600" />
                        </a>
                      )
                    }
                  }
                  return null
                })()}
                <DatasheetBadge
                  marca={usina.fabricante_modulos || usina.marca_placas || ''}
                  modelo={usina.modelo_modulos || ''}
                  tipo="modulo_fv"
                  mostrarLinkBusca={true}
                />
              </div>
            </div>
          </>
        )}

        {/* Inversor(es): Marca / Modelo / Potência + Datasheet (Deduplicação quando já vinculado ao catálogo) */}
        {temEquipamentoCatalogoInversor ? (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span className="text-slate-600 font-medium">Inversores Fotovoltaicos:</span>
            </div>
            <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[11px] font-medium"
            >
              Equipamentos gerenciados nos cards de ativos abaixo com datasheet oficial.
            </Badge>
          </div>
        ) : (
          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-700 font-bold flex items-center gap-1.5 text-xs">
                <Cpu className="w-3.5 h-3.5 text-purple-600" />
                Inversor(es) da Usina (Marca / Modelo / Potência)
              </span>
              {(() => {
                const eq = encontrarEquipamentoComDatasheet(usina.inversores_info || '')
                if (eq && eq.datasheet_pdf) {
                  const url = getDatasheetEquipamentoUrl(eq)
                  if (url) {
                    return (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg border border-emerald-200 transition-colors shadow-2xs"
                        title={`Abrir Datasheet PDF em nova aba (${eq.marca} ${eq.modelo})`}
                      >
                        <FileText className="w-3 h-3 text-emerald-600" />
                        <span>Ver Datasheet (PDF)</span>
                        <ExternalLink className="w-2.5 h-2.5 text-emerald-600" />
                      </a>
                    )
                  }
                }
                return null
              })()}
            </div>

            <div className="flex items-center gap-2">
              <InlineEditField
                value={usina.inversores_info || ''}
                displayValue={
                  <span className="font-semibold text-slate-800 text-xs">
                    {usina.inversores_info || 'Não inf.'}
                  </span>
                }
                type="text"
                placeholder="Ex: Solis SOLIS - 75K - 5G - PRO ou Growatt MIN 8000TL-X"
                className="w-full"
                onSave={async (val) => onUpdateUsinaField('inversores_info', String(val).trim())}
              />
            </div>
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/* LISTA CONSOLIDADA DE ATIVOS VINCULADOS E CADASTRADOS             */}
      {/* ================================================================ */}
      {loading ? (
        <div className="py-5 text-center text-xs text-emerald-800 flex items-center justify-center gap-2 bg-white rounded-xl border border-dashed border-emerald-300">
          <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
          <span>Carregando ativos da usina...</span>
        </div>
      ) : totalAtivos === 0 ? (
        /* Estado vazio real: nenhum ativo cadastrado na usina nem no banco */
        <div className="p-5 bg-white rounded-xl border border-dashed border-emerald-300 text-xs text-slate-600 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-center sm:text-left">
            <p className="font-bold text-slate-900 text-sm">
              Nenhum ativo vinculado ou cadastrado nesta usina ainda.
            </p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-xl">
              Utilize os botões do cabeçalho acima para adicionar ativos do catálogo ou cadastrar
              inversores e módulos com número de série e garantia.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setModalVincularAberto(true)
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Vincular Equipamento</span>
            </button>
          </div>
        </div>
      ) : expandido ? (
        <div className="space-y-2.5">
          {/* Se não houver vínculos na tabela usina_equipamentos/ativos, mas houver equipamentos no cadastro da usina */}
          {exibindoDeclarados && (
            <div className="p-3.5 bg-emerald-100/60 rounded-xl border border-emerald-300 text-xs space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
                  <div>
                    <span className="font-bold text-emerald-950 text-xs">
                      Equipamentos identificados no cadastro técnico desta usina (
                      {equipamentosDeclarados.length})
                    </span>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      Estes equipamentos constam nas especificações da usina. Efetive o vínculo no
                      catálogo para associar números de série, dataloggers e relatórios técnicos.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={efetivandoVinculos}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEfetivarVinculosDeclarados()
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 px-3.5 py-1.5 rounded-lg shadow-2xs transition-colors cursor-pointer shrink-0"
                  title="Persistir vínculos destes equipamentos na tabela de ativos da usina"
                >
                  {efetivandoVinculos ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Efetivando Vínculos...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Efetivar Vínculo no Catálogo</span>
                    </>
                  )}
                </button>
              </div>

              {/* Cards dos equipamentos declarados */}
              <div className="space-y-2 pt-1">
                {equipamentosDeclarados.map((item, idx) => {
                  const isInversor = item.tipo === 'inversor'
                  return (
                    <div
                      key={`declarado-${idx}`}
                      className="p-3 bg-white rounded-xl border border-emerald-200 text-xs shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isInversor ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isInversor ? <Cpu className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
                          {isInversor ? 'Inversor' : 'Módulo FV'}
                        </span>

                        <span className="font-bold text-slate-900 text-xs">
                          {item.marca} {item.modelo}
                        </span>

                        {item.potenciaW && item.potenciaW > 0 ? (
                          <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                            {formatarPotenciaEquipamento(item.potenciaW, item.tipo)}
                          </span>
                        ) : null}

                        <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                          Qtd: {item.quantidade}
                        </span>

                        {item.equipamentoCatalogo ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold"
                          >
                            Catálogo Correspondente
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-amber-50 text-amber-800 border-amber-300"
                          >
                            Declarado na Usina
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.datasheetUrl && (
                          <a
                            href={item.datasheetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg border border-emerald-300 transition-colors text-[11px]"
                            title="Abrir Datasheet PDF correspondente"
                          >
                            <FileText className="w-3 h-3 text-emerald-700" />
                            <span>Datasheet</span>
                            <ExternalLink className="w-2.5 h-2.5 text-emerald-600 ml-0.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            handleRemoverEquipamentoDeclarado(
                              item.tipo,
                              `${item.marca} ${item.modelo}`,
                            )
                          }
                          className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                          title="Excluir equipamento da usina"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 1. Ativos Vinculados do Catálogo (UsinaEquipamentoAtivo) */}
          {vinculos.map((item) => {
            const eq = item.expand?.equipamento_id
            if (!eq) return null

            const isInversor = eq.tipo === 'inversor'
            const isModulo = eq.tipo === 'modulo_fv'
            const datasheetUrl = getDatasheetEquipamentoUrl(eq)
            const dataloggerUrl = getDataloggerEquipamentoUrl(eq)
            const fornecedor = eq.expand?.fornecedor_id
            const telefoneSuporte =
              eq.telefone_suporte_fornecedor ||
              fornecedor?.telefone_suporte ||
              fornecedor?.whatsapp ||
              fornecedor?.telefone ||
              ''

            return (
              <div
                key={item.id}
                className="p-3 bg-white rounded-xl border border-slate-200 text-xs shadow-2xs hover:border-emerald-300 transition-all flex flex-col gap-2.5"
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        isInversor
                          ? 'bg-blue-100 text-blue-800'
                          : isModulo
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {isInversor ? (
                        <Cpu className="w-3 h-3" />
                      ) : isModulo ? (
                        <Sun className="w-3 h-3" />
                      ) : (
                        <Wrench className="w-3 h-3" />
                      )}
                      {isInversor ? 'Inversor' : isModulo ? 'Módulo FV' : 'Outro'}
                    </span>

                    <span className="font-bold text-slate-900 text-xs truncate">
                      {eq.marca} {eq.modelo}
                    </span>

                    {eq.potencia_w > 0 && (
                      <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                        {formatarPotenciaEquipamento(eq.potencia_w, eq.tipo)}
                      </span>
                    )}

                    {item.quantidade && item.quantidade > 1 && (
                      <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                        Qtd: {item.quantidade}
                      </span>
                    )}

                    <Badge
                      variant="outline"
                      className="text-[10px] bg-slate-50 text-slate-600 border-slate-200"
                    >
                      Catálogo
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleRemoverVinculo(item.id, `${eq.marca} ${eq.modelo}`)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                      title="Remover ativo da usina"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* S/N ou Observações */}
                {(item.numero_serie || item.observacoes) && (
                  <div className="text-[11px] text-slate-600 flex items-center gap-3 flex-wrap bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                    {item.numero_serie && (
                      <span className="flex items-center gap-1 font-mono">
                        <Hash className="w-3 h-3 text-slate-400" />
                        <span>
                          S/N: <strong>{item.numero_serie}</strong>
                        </span>
                      </span>
                    )}
                    {item.observacoes && (
                      <span className="italic text-slate-500">{item.observacoes}</span>
                    )}
                  </div>
                )}

                {/* Datasheet, Datalogger e Fornecedor com Suporte */}
                <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-slate-100 text-[11px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    {datasheetUrl ? (
                      <a
                        href={datasheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg border border-emerald-300 transition-colors"
                        title="Abrir Datasheet do Equipamento"
                      >
                        <FileText className="w-3 h-3 text-emerald-700" />
                        <span>Datasheet</span>
                        <ExternalLink className="w-2.5 h-2.5 text-emerald-600 ml-0.5" />
                      </a>
                    ) : (
                      <span className="text-slate-400 text-[10px] italic">Sem datasheet</span>
                    )}

                    {dataloggerUrl && (
                      <a
                        href={dataloggerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold rounded-lg border border-blue-300 transition-colors"
                        title="Abrir Configuração do Datalogger"
                      >
                        <Settings className="w-3 h-3 text-blue-700" />
                        <span>Configurar Datalogger</span>
                        <ExternalLink className="w-2.5 h-2.5 text-blue-600 ml-0.5" />
                      </a>
                    )}
                  </div>

                  {(fornecedor || eq.telefone_suporte_fornecedor) && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-slate-700">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold">
                          {fornecedor?.nome_empresa || 'Fornecedor Cadastrado'}
                        </span>
                      </div>

                      {telefoneSuporte && (
                        <button
                          type="button"
                          onClick={() => handleWhatsAppSuporte(telefoneSuporte)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[10px] shadow-2xs transition-colors"
                          title={`Contatar suporte: ${telefoneSuporte}`}
                        >
                          <Phone className="w-2.5 h-2.5" />
                          <span>{telefoneSuporte}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* 2. Ativos Individuais Estruturados (AtivoUsina com S/N e Garantia) */}
          {ativosIndividuais.map((ativo) => {
            const garantia = calcularStatusGarantia(ativo.data_fim_garantia)
            return (
              <div
                key={ativo.id}
                className="p-3 bg-white rounded-xl border border-slate-200 text-xs shadow-2xs hover:border-emerald-300 transition-all flex items-center justify-between gap-3 flex-wrap"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-slate-900 text-xs">
                      {ativo.fabricante} {ativo.modelo}
                    </span>
                    <Badge
                      variant="outline"
                      className="bg-slate-50 text-[10px] text-slate-600 border-slate-200 font-medium"
                    >
                      {getLabelTipoAtivo(ativo.tipo, ativo.tipo_outro_descricao)}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="bg-amber-50 text-[10px] text-amber-800 border-amber-200 font-bold"
                    >
                      Individual / Serial
                    </Badge>
                  </div>

                  <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
                    {ativo.numero_serie && (
                      <span className="flex items-center gap-1 font-mono">
                        <Hash className="w-3 h-3 text-slate-400" />
                        <span>
                          S/N: <strong className="text-slate-800">{ativo.numero_serie}</strong>
                        </span>
                      </span>
                    )}
                    {ativo.data_instalacao && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>Instalado: {formatDate(ativo.data_instalacao)}</span>
                      </span>
                    )}
                    {ativo.observacoes && (
                      <span className="italic text-slate-500 truncate max-w-xs">
                        "{ativo.observacoes}"
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <Badge
                      variant={garantia.badgeVariant}
                      className={`text-[10px] ${garantia.badgeClasses}`}
                    >
                      {garantia.label}
                    </Badge>
                    {ativo.data_fim_garantia && (
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Garantia até {formatDate(ativo.data_fim_garantia)}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleRemoverAtivoIndividual(ativo.id, `${ativo.fabricante} ${ativo.modelo}`)
                    }
                    className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                    title="Remover ativo individual da usina"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      {/* ================================================================ */}
      {/* SEÇÃO ADITIVA: DOCUMENTOS E DATASHEETS ANEXADOS À USINA          */}
      {/* ================================================================ */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
              <Paperclip className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <span>Documentos e Datasheets Anexados</span>
                <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.2 rounded-full">
                  {listaConsolidadaDocumentos.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Projetos, memoriais, datasheets de inversores/módulos e faturas vinculadas à usina
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setUploadManualAberto(true)}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors shadow-2xs cursor-pointer"
              title="Adicionar documento avulso à usina"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Anexar Documento</span>
            </button>
          </div>
        </div>

        {listaConsolidadaDocumentos.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500 bg-slate-50/60 rounded-xl border border-dashed border-slate-200 space-y-1">
            <FileText className="w-6 h-6 text-slate-400 mx-auto" />
            <p className="font-semibold text-slate-700">Nenhum documento anexado ainda.</p>
            <p className="text-[11px] text-slate-400">
              Faça upload pelo botão acima ou importe via "Importar por Documento".
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {listaConsolidadaDocumentos.map((doc) => {
              const categoriaLabel =
                doc.categoria === 'datasheet_inversor'
                  ? 'Datasheet Inversor'
                  : doc.categoria === 'datasheet_modulo'
                    ? 'Datasheet Módulo'
                    : doc.categoria === 'projeto'
                      ? 'Projeto / Memorial'
                      : doc.categoria === 'memorial'
                        ? 'Memorial Descritivo'
                        : doc.categoria === 'fatura'
                          ? 'Conta / Fatura'
                          : 'Documento Técnico'

              const categoriaCor =
                doc.categoria === 'datasheet_inversor'
                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                  : doc.categoria === 'datasheet_modulo'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : doc.categoria === 'fatura'
                      ? 'bg-purple-50 text-purple-800 border-purple-200'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'

              return (
                <div
                  key={doc.id}
                  className="p-3 bg-slate-50/70 hover:bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 flex-wrap transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs shrink-0">
                      <FileText className="w-4 h-4 text-slate-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 text-xs truncate max-w-sm">
                          {doc.nome_arquivo}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold border ${categoriaCor}`}
                        >
                          {categoriaLabel}
                        </Badge>
                        {doc.origem?.includes('legado') && (
                          <Badge
                            variant="outline"
                            className="text-[9px] bg-slate-100 text-slate-600 border-slate-300"
                          >
                            Legado
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                        {doc.criado_em && <span>Anexado em {formatDate(doc.criado_em)}</span>}
                        {doc.tamanho && doc.tamanho > 0 && (
                          <span>• {(doc.tamanho / 1024).toFixed(0)} KB</span>
                        )}
                        {doc.observacoes && (
                          <span className="italic text-slate-400 truncate max-w-xs">
                            "{doc.observacoes}"
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {doc.url ? (
                      <>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors shadow-2xs"
                          title="Visualizar documento em nova aba"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>Visualizar</span>
                        </a>

                        <a
                          href={doc.url}
                          download={doc.nome_arquivo || 'documento_usina'}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors shadow-2xs"
                          title="Baixar arquivo"
                        >
                          <Download className="w-3.5 h-3.5 text-slate-500" />
                          <span>Download</span>
                        </a>
                      </>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Sem URL disponível</span>
                    )}

                    <button
                      type="button"
                      onClick={() => setDocParaExcluir(doc)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                      title="Excluir documento"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE DOCUMENTO */}
      <Dialog
        open={Boolean(docParaExcluir)}
        onOpenChange={(val) => !val && setDocParaExcluir(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-600" />
              Confirmar Exclusão do Documento
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Tem certeza que deseja remover o documento{' '}
              <strong>"{docParaExcluir?.nome_arquivo}"</strong> da usina{' '}
              <strong>{usina.nome}</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-red-50/60 rounded-xl border border-red-200 text-xs text-red-800">
            Esta ação não poderá ser desfeita. O documento deixará de aparecer na lista técnica da
            usina.
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={removendoDoc}
              onClick={() => setDocParaExcluir(null)}
              className="px-3.5 py-1.5 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={removendoDoc}
              onClick={handleConfirmarExcluirDoc}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-2xs inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {removendoDoc ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Removendo...</span>
                </>
              ) : (
                <span>Sim, Excluir Documento</span>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL DE ANEXAR DOCUMENTO MANUALMENTE */}
      <Dialog open={uploadManualAberto} onOpenChange={setUploadManualAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-blue-600" />
              Anexar Documento à Usina
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Adicione projetos, memoriais ou datasheets adicionais à usina "{usina.nome}"
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarUploadManual} className="space-y-3.5 text-xs">
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                Tipo / Categoria do Documento *
              </label>
              <select
                value={uploadManualCategoria}
                onChange={(e) => setUploadManualCategoria(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white"
              >
                <option value="projeto">Projeto Técnico / Memorial</option>
                <option value="datasheet_inversor">
                  Datasheet do Inversor (Adicional/Ampliação)
                </option>
                <option value="datasheet_modulo">Datasheet do Módulo (Adicional/Ampliação)</option>
                <option value="fatura">Conta / Fatura de Energia</option>
                <option value="memorial">ART / Parecer de Acesso</option>
                <option value="outro">Outro Documento Técnico</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                Arquivo (PDF, Imagem, Excel) *
              </label>
              <input
                ref={inputManualRef}
                type="file"
                required
                accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.csv"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) setUploadManualArquivo(f)
                }}
                className="w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-slate-300 rounded-xl p-1.5"
              />
              {uploadManualArquivo && (
                <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-1.5">
                  <FileText className="w-3 h-3 text-slate-400" />
                  <span>{uploadManualArquivo.name}</span>
                  <span>({(uploadManualArquivo.size / 1024).toFixed(0)} KB)</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setUploadManualAberto(false)
                  setUploadManualArquivo(null)
                }}
                className="px-3.5 py-1.5 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={uploadManualSalvando || !uploadManualArquivo}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-2xs inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {uploadManualSalvando ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <span>Salvar Documento</span>
                )}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================================================================ */}
      {/* MODAL 1: VINCULAR EQUIPAMENTO DO CATÁLOGO (Dialog Radix/shadcn)   */}
      {/* ================================================================ */}
      <Dialog open={modalVincularAberto} onOpenChange={setModalVincularAberto}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/70">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-slate-900">
                  Adicionar Ativo à Usina
                </DialogTitle>
                <DialogDescription className="text-[11px] text-slate-500">
                  Vincule um inversor, módulo ou equipamento do catálogo à usina "{usina.nome}"
                </DialogDescription>
              </div>
            </div>
          </div>

          <form onSubmit={handleVincularEquipamento} className="p-5 space-y-3.5 text-xs">
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                Equipamento do Catálogo *
              </label>
              <select
                required
                value={equipamentoSelecionadoId}
                onChange={(e) => setEquipamentoSelecionadoId(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="">Selecione um equipamento...</option>
                {catalogoEquipamentos.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    [
                    {eq.tipo === 'inversor'
                      ? 'INVERSOR'
                      : eq.tipo === 'modulo_fv'
                        ? 'MÓDULO'
                        : 'OUTRO'}
                    ] {eq.marca} {eq.modelo}{' '}
                    {eq.potencia_w > 0
                      ? `(${formatarPotenciaEquipamento(eq.potencia_w, eq.tipo)})`
                      : ''}
                  </option>
                ))}
              </select>
              <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                <span>Não encontrou na lista?</span>
                <button
                  type="button"
                  onClick={() => {
                    setModalVincularAberto(false)
                    setModalNovoEquipamentoAberto(true)
                  }}
                  className="text-emerald-700 hover:underline font-bold cursor-pointer"
                >
                  + Cadastrar novo equipamento agora
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                  Quantidade
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  placeholder="Ex: 1"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                  Número de Série (S/N)
                </label>
                <input
                  type="text"
                  value={numeroSerie}
                  onChange={(e) => setNumeroSerie(e.target.value)}
                  placeholder="Ex: SN98421004"
                  className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                Observações do Ativo
              </label>
              <textarea
                rows={2}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex: Localizado no telhado leste, string 1..."
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalVincularAberto(false)}
                disabled={salvandoVinculo}
                className="px-4 py-2 border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvandoVinculo}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {salvandoVinculo ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <span>Adicionar à Usina</span>
                )}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================================================================ */}
      {/* MODAL 2: CADASTRO DE NOVO EQUIPAMENTO (REUSO TELA EQUIPAMENTOS) */}
      {/* ================================================================ */}
      <ModalFormEquipamento
        isOpen={modalNovoEquipamentoAberto}
        onClose={() => setModalNovoEquipamentoAberto(false)}
        tipoInicial="inversor"
        onSalvo={async (salvo) => {
          await handleNovoEquipamentoCadastrado(salvo)
        }}
      />

      {/* ================================================================ */}
      {/* MODAL: CONFIRMAÇÃO DE EXCLUSÃO DE EQUIPAMENTO DA USINA           */}
      {/* ================================================================ */}
      <Dialog
        open={Boolean(itemParaExcluirUsina)}
        onOpenChange={(val) => !val && setItemParaExcluirUsina(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-600" />
              Excluir Equipamento da Usina
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Tem certeza que deseja remover este equipamento da usina{' '}
              <strong>"{usina.nome}"</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-red-50/60 rounded-xl border border-red-200 text-xs text-red-800 space-y-1">
            <p className="font-semibold text-slate-900">
              Equipamento: <strong>{itemParaExcluirUsina?.nome}</strong>
            </p>
            <p className="text-slate-600 text-[11px]">
              {itemParaExcluirUsina?.tipo === 'ativo_individual'
                ? 'O registro deste ativo individual (S/N e histórico de garantia) será excluído desta usina.'
                : itemParaExcluirUsina?.tipo === 'declarado'
                  ? 'A especificação técnica registrada no cadastro desta usina será limpa.'
                  : 'O vínculo deste equipamento com esta usina será removido. O equipamento continuará disponível no catálogo geral de equipamentos.'}
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={excluindoAtivoUsina}
              onClick={() => setItemParaExcluirUsina(null)}
              className="px-3.5 py-1.5 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={excluindoAtivoUsina}
              onClick={handleConfirmarExclusaoAtivoUsina}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-2xs inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {excluindoAtivoUsina ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Excluindo...</span>
                </>
              ) : (
                <span>Sim, Excluir Equipamento</span>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ================================================================ */}
      {/* MODAL 3: CADASTRAR ATIVO INDIVIDUAL (Dialog Radix/shadcn)         */}
      {/* ================================================================ */}
      <Dialog open={modalCadastrarAtivoAberto} onOpenChange={setModalCadastrarAtivoAberto}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#0F2038] text-[#E0A838] flex items-center justify-center shadow-2xs">
                <Plus className="w-4 h-4 text-[#E0A838]" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-slate-900">
                  Cadastrar Ativo Individual
                </DialogTitle>
                <DialogDescription className="text-[11px] text-slate-500">
                  Cadastre o número de série e garantia para usina "{usina.nome}"
                </DialogDescription>
              </div>
            </div>
          </div>

          <form onSubmit={handleSalvarAtivoIndividual} className="p-5 space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                  Tipo de Ativo *
                </label>
                <select
                  value={novoAtivoTipo}
                  onChange={(e) => setNovoAtivoTipo(e.target.value as TipoAtivo)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0F2038] bg-white"
                >
                  <option value="inversor">Inversor</option>
                  <option value="placa_solar">Módulo Fotovoltaico</option>
                  <option value="bateria">Bateria</option>
                  <option value="string_box">String Box</option>
                  <option value="outros">Outro Equipamento</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                  Status Operacional
                </label>
                <select
                  value={novoAtivoStatusOperacional}
                  onChange={(e) =>
                    setNovoAtivoStatusOperacional(e.target.value as StatusOperacionalAtivo)
                  }
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0F2038] bg-white"
                >
                  <option value="operacional">Operacional</option>
                  <option value="em_alerta">Em Alerta</option>
                  <option value="manutencao">Em Manutenção</option>
                  <option value="desativado">Desativado</option>
                </select>
              </div>
            </div>

            {novoAtivoTipo === 'outros' && (
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                  Descrição do Tipo
                </label>
                <input
                  type="text"
                  value={novoAtivoTipoOutro}
                  onChange={(e) => setNovoAtivoTipoOutro(e.target.value)}
                  placeholder="Ex: Datalogger Wi-Fi, Medidor Bidirecional"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                  Fabricante / Marca *
                </label>
                <input
                  type="text"
                  required
                  value={novoAtivoFabricante}
                  onChange={(e) => setNovoAtivoFabricante(e.target.value)}
                  placeholder="Ex: Solis, Growatt, Deye, Canadian..."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                  Modelo do Equipamento *
                </label>
                <input
                  type="text"
                  required
                  value={novoAtivoModelo}
                  onChange={(e) => setNovoAtivoModelo(e.target.value)}
                  placeholder="Ex: SOLIS - 75K - 5G - PRO"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                Número de Série (S/N)
              </label>
              <input
                type="text"
                value={novoAtivoNumeroSerie}
                onChange={(e) => setNovoAtivoNumeroSerie(e.target.value)}
                placeholder="Ex: SN-2024-99824"
                className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                  Data de Instalação
                </label>
                <input
                  type="date"
                  value={novoAtivoDataInstalacao}
                  onChange={(e) => setNovoAtivoDataInstalacao(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                  Fim da Garantia
                </label>
                <input
                  type="date"
                  value={novoAtivoDataFimGarantia}
                  onChange={(e) => setNovoAtivoDataFimGarantia(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                Observações
              </label>
              <textarea
                rows={2}
                value={novoAtivoObservacoes}
                onChange={(e) => setNovoAtivoObservacoes(e.target.value)}
                placeholder="Local de instalação, chave de ativação, etc."
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 resize-none"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalCadastrarAtivoAberto(false)}
                disabled={salvandoAtivoIndividual}
                className="px-4 py-2 border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvandoAtivoIndividual}
                className="px-5 py-2 bg-[#0F2038] hover:bg-[#1A365D] text-white font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {salvandoAtivoIndividual ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <span>Salvar Ativo</span>
                )}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
