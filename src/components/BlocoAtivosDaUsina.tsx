import React, { useState, useEffect, useMemo, useRef } from 'react'
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
} from 'lucide-react'
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
import type { AtivoUsina } from '@/types/ativos'
import type { UsinaCliente, DocumentoUsinaItem } from '@/types/crm'
import {
  fetchEquipamentosPorUsina,
  vincularEquipamentoUsina,
  desvincularEquipamentoUsina,
  updateVinculoEquipamentoUsina,
} from '@/services/usinaEquipamentosService'
import { uploadDocumentoUsina, getDocumentoUsinaFileUrl } from '@/services/documentosUsinaService'
import { ModalFormEquipamento } from '@/components/ModalFormEquipamento'
import type { ConfiguracaoMonitoramento } from '@/types/equipamentos'
import { fetchConfiguracoesMonitoramento } from '@/services/configuracoesMonitoramentoService'
import { MonitoramentoConfigBadge } from '@/components/MonitoramentoConfigBadge'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import {
  fetchEquipamentos,
  getDatasheetEquipamentoUrl,
  getDataloggerEquipamentoUrl,
  formatarPotenciaEquipamento,
  encontrarEquipamentoCorrespondente,
} from '@/services/equipamentosService'
import {
  fetchAtivosPorUsina,
  deleteAtivo,
  calcularStatusGarantia,
  getLabelTipoAtivo,
} from '@/services/ativosService'
import { formatDate } from '@/lib/formatters'
import { InlineEditField } from '@/components/InlineEditField'
import { DatasheetBadge } from '@/components/DatasheetBadge'
import { formatarPotenciaEquipamentoUnidade } from '@/lib/equipamentoFormatters'
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

const BlocoAtivosDaUsinaInterno: React.FC<BlocoAtivosDaUsinaProps> = ({
  usina,
  clienteNome = '',
  catalogoEquipamentos: catalogoInicial,
  onUpdateUsinaField,
  onUpdateUsinaMultipleFields,
  encontrarDatasheetModuloUsina,
  encontrarEquipamentoComDatasheet,
  onCloseModalUsina: _onCloseModalUsina,
}) => {
  const { user } = useAuth()
  const [vinculos, setVinculos] = useState<UsinaEquipamentoAtivo[]>([])
  const [ativosIndividuais, setAtivosIndividuais] = useState<AtivoUsina[]>([])
  const [catalogoEquipamentos, setCatalogoEquipamentos] = useState<Equipamento[]>(
    catalogoInicial || [],
  )
  const [configuracoesMonitoramento, setConfiguracoesMonitoramento] = useState<
    ConfiguracaoMonitoramento[]
  >([])
  const [loading, setLoading] = useState<boolean>(true)
  const [expandido, setExpandido] = useState<boolean>(true)
  const [efetivandoVinculos, setEfetivandoVinculos] = useState<boolean>(false)

  // Modal Cadastrar Equipamento (formulário completo com datasheet, monitoramento, etc.)
  const [modalCadastrarEquipamentoAberto, setModalCadastrarEquipamentoAberto] =
    useState<boolean>(false)

  // Modal Adicionar Ativo (Seleção em Cascata: Equipamento -> Marca -> Modelo/Potência)
  const [modalVincularAberto, setModalVincularAberto] = useState<boolean>(false)
  const [filtroTipo, setFiltroTipo] = useState<'modulo_fv' | 'inversor' | ''>('')
  const [filtroMarca, setFiltroMarca] = useState<string>('')
  const [equipamentoSelecionadoId, setEquipamentoSelecionadoId] = useState<string>('')
  const [quantidade, setQuantidade] = useState<string>('1')
  const [numeroSerie, setNumeroSerie] = useState<string>('')
  const [observacoes, setObservacoes] = useState<string>('')
  const [salvandoVinculo, setSalvandoVinculo] = useState<boolean>(false)

  // IDs dos itens expandidos (para ver detalhes de suporte, datasheet, observações, etc.)
  const [itensExpandidos, setItensExpandidos] = useState<Record<string, boolean>>({})
  const toggleItemExpandido = (id: string) => {
    setItensExpandidos((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // Modal de Confirmação para Excluir Equipamento/Ativo da Usina
  const [itemParaExcluirUsina, setItemParaExcluirUsina] = useState<{
    tipo: 'vinculo' | 'ativo_individual' | 'declarado'
    id: string
    nome: string
    campoDeclarado?: 'inversor' | 'modulo'
  } | null>(null)
  const [excluindoAtivoUsina, setExcluindoAtivoUsina] = useState<boolean>(false)

  // Estado para exclusão/gerenciamento de documentos anexados
  const [docParaExcluir, setDocParaExcluir] = useState<DocumentoUsinaItem | null>(null)
  const [removendoDoc, setRemovendoDoc] = useState<boolean>(false)
  const [uploadManualAberto, setUploadManualAberto] = useState<boolean>(false)
  const [arquivosParaClassificar, setArquivosParaClassificar] = useState<
    Array<{ id: string; file: File; categoria: string }>
  >([])
  const [uploadManualCategoria, setUploadManualCategoria] = useState<string>('projeto')
  const [uploadManualSalvando, setUploadManualSalvando] = useState<boolean>(false)
  const inputManualRef = React.useRef<HTMLInputElement | null>(null)

  const carregarDados = async () => {
    if (!usina?.id) return
    setLoading(true)
    try {
      const [vinculosData, ativosData, catalogoData, monitoramentoData] = await Promise.all([
        fetchEquipamentosPorUsina(usina.id).catch((err) => {
          console.error('[BlocoAtivosDaUsina] Erro ao buscar vínculos:', err)
          return []
        }),
        fetchAtivosPorUsina(usina.id).catch((err) => {
          console.error('[BlocoAtivosDaUsina] Erro ao buscar ativos individuais:', err)
          return []
        }),
        fetchEquipamentos().catch((err) => {
          console.error('[BlocoAtivosDaUsina] Erro ao buscar catálogo:', err)
          return []
        }),
        fetchConfiguracoesMonitoramento().catch((err) => {
          console.error('[BlocoAtivosDaUsina] Erro ao buscar configurações de monitoramento:', err)
          return []
        }),
      ])
      setVinculos(Array.isArray(vinculosData) ? vinculosData : [])
      setAtivosIndividuais(Array.isArray(ativosData) ? ativosData : [])
      setCatalogoEquipamentos(Array.isArray(catalogoData) ? catalogoData : [])
      setConfiguracoesMonitoramento(Array.isArray(monitoramentoData) ? monitoramentoData : [])
    } catch (err) {
      console.error('[BlocoAtivosDaUsina] Erro ao carregar ativos da usina:', err)
      toast.error('Erro ao carregar ativos da usina.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [usina?.id])

  /**
   * Helper para resolver a configuração de monitoramento associada a um inversor.
   * Procura via expand.configuracao_monitoramento_id, ID direto ou correspondência por marca.
   */
  const encontrarConfigMonitoramentoInversor = (
    eq?: Equipamento | null,
    marcaFallback?: string,
  ): ConfiguracaoMonitoramento | null => {
    if (eq?.expand?.configuracao_monitoramento_id) {
      return eq.expand.configuracao_monitoramento_id
    }
    if (eq?.configuracao_monitoramento_id) {
      const encontradaPorId = configuracoesMonitoramento.find(
        (c) => c.id === eq.configuracao_monitoramento_id,
      )
      if (encontradaPorId) return encontradaPorId
    }
    const marcaAlvo = (eq?.marca || marcaFallback || '').toLowerCase().trim()
    if (!marcaAlvo) return null
    return (
      configuracoesMonitoramento.find((c) => c.marca?.toLowerCase().trim() === marcaAlvo) || null
    )
  }

  // Lista de marcas distintas filtradas pelo tipo selecionado no modal Adicionar Ativo
  const marcasDisponiveis = useMemo(() => {
    if (!filtroTipo) return []
    const marcasSet = new Set<string>()
    catalogoEquipamentos.forEach((eq) => {
      if (eq.tipo === filtroTipo && eq.marca?.trim()) {
        marcasSet.add(eq.marca.trim())
      }
    })
    return Array.from(marcasSet).sort((a, b) =>
      a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }),
    )
  }, [catalogoEquipamentos, filtroTipo])

  // Lista de modelos filtrados por tipo + marca selecionados no modal Adicionar Ativo
  const modelosDisponiveis = useMemo(() => {
    if (!filtroTipo || !filtroMarca) return []
    return catalogoEquipamentos
      .filter(
        (eq) =>
          eq.tipo === filtroTipo &&
          eq.marca?.trim().toLowerCase() === filtroMarca.trim().toLowerCase(),
      )
      .sort((a, b) => (a.potencia_w || 0) - (b.potencia_w || 0) || a.modelo.localeCompare(b.modelo))
  }, [catalogoEquipamentos, filtroTipo, filtroMarca])

  // Equipamento selecionado atualmente
  const equipamentoSelecionado = useMemo(() => {
    return catalogoEquipamentos.find((eq) => eq.id === equipamentoSelecionadoId) || null
  }, [catalogoEquipamentos, equipamentoSelecionadoId])

  const handleTipoChange = (novoTipo: 'modulo_fv' | 'inversor' | '') => {
    setFiltroTipo(novoTipo)
    setFiltroMarca('')
    setEquipamentoSelecionadoId('')
  }

  const handleMarcaChange = (novaMarca: string) => {
    setFiltroMarca(novaMarca)
    setEquipamentoSelecionadoId('')
  }

  const handleAbrirModalAdicionarAtivo = () => {
    setFiltroTipo('')
    setFiltroMarca('')
    setEquipamentoSelecionadoId('')
    setQuantidade('1')
    setNumeroSerie('')
    setObservacoes('')
    setModalVincularAberto(true)
  }

  const handleEquipamentoCadastrado = async (
    equipamentoCriado: Equipamento,
    _isEdicao: boolean,
    extra?: { quantidade?: number },
  ) => {
    if (!equipamentoCriado || !usina?.id) {
      setModalCadastrarEquipamentoAberto(false)
      return
    }

    const qtd = extra?.quantidade && extra.quantidade > 0 ? extra.quantidade : 1
    try {
      try {
        await vincularEquipamentoUsina({
          usina_id: usina.id,
          equipamento_id: equipamentoCriado.id,
          quantidade: qtd,
        })
      } catch (vincErr) {
        console.error('[BlocoAtivosDaUsina] Erro ao vincular equipamento:', vincErr)
        toast.error(
          'O equipamento foi salvo no catálogo, mas não foi possível vinculá-lo à usina automaticamente.',
        )
      }

      // Sincronização condicional com os campos escalares legados da usina:
      // Apenas preenche se a usina AINDA NÃO POSSUIR equipamentos vinculados daquele tipo.
      // Se já existirem vínculos de inversor ou módulo em usina_equipamentos, NÃO sobrescreve
      // os campos escalares legados para evitar conflito na mesclagem de ativos.
      try {
        if (equipamentoCriado.tipo === 'inversor') {
          const jaTemInversores = vinculos.some(
            (v) => v.expand?.equipamento_id?.tipo === 'inversor',
          )
          if (!jaTemInversores) {
            const potPicoKwp = ((equipamentoCriado.potencia_w || 0) * qtd) / 1000
            const updatesInversor: Partial<UsinaCliente> = {
              fabricante_inversores: equipamentoCriado.marca || '',
              modelo_inversores: equipamentoCriado.modelo || '',
              potencia_pico_inversores_kwp: potPicoKwp > 0 ? potPicoKwp : undefined,
            }
            if (onUpdateUsinaMultipleFields) {
              await onUpdateUsinaMultipleFields(updatesInversor)
            } else if (onUpdateUsinaField) {
              if (equipamentoCriado.marca) {
                await onUpdateUsinaField('fabricante_inversores', equipamentoCriado.marca)
              }
              if (equipamentoCriado.modelo) {
                await onUpdateUsinaField('modelo_inversores', equipamentoCriado.modelo)
              }
              if (potPicoKwp > 0) {
                await onUpdateUsinaField('potencia_pico_inversores_kwp', potPicoKwp)
              }
            }
          }
        } else if (equipamentoCriado.tipo === 'modulo_fv') {
          const jaTemModulos = vinculos.some((v) => v.expand?.equipamento_id?.tipo === 'modulo_fv')
          if (!jaTemModulos) {
            const potPicoKwp = ((equipamentoCriado.potencia_w || 0) * qtd) / 1000
            const updatesModulo: Partial<UsinaCliente> = {
              fabricante_modulos: equipamentoCriado.marca || '',
              modelo_modulos: equipamentoCriado.modelo || '',
              quantidade_placas: qtd,
              potencia_pico_modulos_kwp: potPicoKwp > 0 ? potPicoKwp : undefined,
            }
            if (onUpdateUsinaMultipleFields) {
              await onUpdateUsinaMultipleFields(updatesModulo)
            } else if (onUpdateUsinaField) {
              if (equipamentoCriado.marca) {
                await onUpdateUsinaField('fabricante_modulos', equipamentoCriado.marca)
              }
              if (equipamentoCriado.modelo) {
                await onUpdateUsinaField('modelo_modulos', equipamentoCriado.modelo)
              }
              await onUpdateUsinaField('quantidade_placas', qtd)
              if (potPicoKwp > 0) {
                await onUpdateUsinaField('potencia_pico_modulos_kwp', potPicoKwp)
              }
            }
          }
        }
      } catch (updateErr) {
        console.error(
          '[BlocoAtivosDaUsina] Erro ao sincronizar especificações da usina:',
          updateErr,
        )
      }

      try {
        await carregarDados()
      } catch (carregarErr) {
        console.error('[BlocoAtivosDaUsina] Erro ao recarregar dados após cadastro:', carregarErr)
      }

      toast.success('Equipamento cadastrado com sucesso!')
    } catch (err) {
      console.error('[BlocoAtivosDaUsina] Erro no fluxo de cadastro de equipamento:', err)
      toast.error(
        'O equipamento foi criado, mas houve uma falha ao atualizar a visualização da usina.',
      )
    } finally {
      setModalCadastrarEquipamentoAberto(false)
    }
  }

  const handleVincularEquipamento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!equipamentoSelecionadoId) {
      toast.warning('Selecione o modelo do equipamento.')
      return
    }

    setSalvandoVinculo(true)
    try {
      const qtdNum = quantidade ? parseInt(quantidade, 10) : 1
      await vincularEquipamentoUsina({
        usina_id: usina.id,
        equipamento_id: equipamentoSelecionadoId,
        quantidade: isNaN(qtdNum) || qtdNum < 1 ? 1 : qtdNum,
        numero_serie: numeroSerie.trim() || undefined,
        observacoes: observacoes.trim() || undefined,
      })

      toast.success('Ativo adicionado à usina com sucesso!')
      setModalVincularAberto(false)
      setFiltroTipo('')
      setFiltroMarca('')
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

  const [salvandoQtdVinculoId, setSalvandoQtdVinculoId] = useState<string | null>(null)

  const handleUpdateQuantidadeVinculo = async (vinculoId: string, novaQtd: number) => {
    const qtdFinal = Math.max(1, Math.round(novaQtd) || 1)
    setSalvandoQtdVinculoId(vinculoId)
    // Atualização otimista local imediata (silenciosa: sem toast, sem carregarDados com scroll/flash)
    setVinculos((prev) =>
      prev.map((v) => (v.id === vinculoId ? { ...v, quantidade: qtdFinal } : v)),
    )
    try {
      await updateVinculoEquipamentoUsina(vinculoId, { quantidade: qtdFinal }, usina?.id)
    } catch (err) {
      console.error('Erro ao atualizar quantidade do equipamento:', err)
      toast.error('Erro ao salvar quantidade.')
    } finally {
      setSalvandoQtdVinculoId(null)
    }
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

  // Upload manual rápido de documentos direto na ficha com classificação individual por arquivo
  const handleSalvarUploadManual = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!arquivosParaClassificar || arquivosParaClassificar.length === 0) {
      toast.warning('Selecione ao menos um arquivo para upload.')
      return
    }

    setUploadManualSalvando(true)
    const novosItens: DocumentoUsinaItem[] = []
    let falhas = 0

    try {
      for (let i = 0; i < arquivosParaClassificar.length; i++) {
        const item = arquivosParaClassificar[i]
        const file = item.file
        try {
          // Converter com leitura de DataURL ou upload na coleção de documentos_usina
          let fileDataUrl = ''
          try {
            // Tenta salvar via serviço de arquivos de documentos_usina se tiver usina.id
            if (usina?.id) {
              const regDoc = await uploadDocumentoUsina({
                usina_id: usina.id,
                arquivo: file,
                nome_original: file.name,
                descricao: item.categoria,
                ativo: true,
              }).catch(() => null)
              if (regDoc) {
                fileDataUrl = getDocumentoUsinaFileUrl(regDoc)
              }
            }
          } catch {
            // Fallback para FileReader base64 caso falhe o upload direto no PB
          }

          if (!fileDataUrl) {
            fileDataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader()
              reader.onload = () => resolve(reader.result as string)
              reader.onerror = (err) => reject(err)
              reader.readAsDataURL(file)
            })
          }

          novosItens.push({
            id: `doc_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`,
            nome_arquivo: file.name,
            categoria: item.categoria || 'projeto',
            url: fileDataUrl,
            tamanho: file.size,
            tipo_mime: file.type || 'application/pdf',
            criado_em: new Date().toISOString(),
            origem: 'upload',
          })
        } catch (itemErr) {
          console.error(`Erro ao processar arquivo "${file.name}":`, itemErr)
          falhas++
        }
      }

      if (novosItens.length > 0) {
        const docsAtuais = Array.isArray(usina.documentos_usina) ? [...usina.documentos_usina] : []
        docsAtuais.push(...novosItens)

        await onUpdateUsinaField('documentos_usina', docsAtuais)

        if (falhas === 0) {
          if (novosItens.length === 1) {
            toast.success(`Documento "${novosItens[0].nome_arquivo}" anexado com sucesso!`)
          } else {
            toast.success(`${novosItens.length} documentos anexados com sucesso!`)
          }
        } else {
          toast.warning(
            `${novosItens.length} documento(s) salvo(s) com sucesso, mas ${falhas} arquivo(s) falharam.`,
          )
        }
        await carregarDados()
        setUploadManualAberto(false)
        setArquivosParaClassificar([])
      } else {
        toast.error('Nenhum documento pôde ser processado. Tente novamente.')
      }
    } catch (err) {
      console.error('Erro ao salvar documentos anexados:', err)
      toast.error('Erro ao anexar documento(s).')
    } finally {
      setUploadManualSalvando(false)
    }
  }

  // Deduplicação visual:
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

  // Inferir equipamentos declarados nos campos técnicos da usina.
  // Precedência total do catálogo: se já existir vínculo do catálogo (ou ativo individual)
  // correspondente (tipo inversor ou modulo_fv), o equipamento declarado é filtrado para não duplicar.
  const equipamentosDeclarados = useMemo<AtivoDeclaradoUsina[]>(() => {
    const lista: AtivoDeclaradoUsina[] = []

    // 1. Inversor declarado: só inclui se NÃO houver vínculo/ativo correspondente no catálogo
    const inversorTexto = (usina.inversores_info || '').trim()
    const inversorFabricante = (usina.fabricante_inversores || '').trim()
    const inversorModelo = (usina.modelo_inversores || '').trim()

    if (
      !temEquipamentoCatalogoInversor &&
      (inversorTexto || inversorFabricante || inversorModelo)
    ) {
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

    // 2. Módulos declarados: só inclui se NÃO houver vínculo/ativo correspondente no catálogo
    const moduloFabricante = (usina.fabricante_modulos || usina.marca_placas || '').trim()
    const moduloModelo = (usina.modelo_modulos || '').trim()
    const qtdModulos = Number(usina.qtd_modulos || usina.quantidade_placas || 0)

    if (!temEquipamentoCatalogoModulo && (moduloFabricante || moduloModelo || qtdModulos > 0)) {
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
    temEquipamentoCatalogoInversor,
    temEquipamentoCatalogoModulo,
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

  // Deduplicação entre vinculos (usina_equipamentos) e ativos individuais (ativos)
  // Se um ativo individual corresponder ao mesmo equipamento vinculado, mantemos uma única contagem
  const vinculosDeduplicados = useMemo(() => {
    return vinculos
  }, [vinculos])

  // =========================================================================
  // CÁLCULO DINÂMICO: POTÊNCIA TOTAL E QUANTIDADE DE MÓDULOS (useMemo)
  // =========================================================================
  const { potenciaTotalCalculada, qtdModulosCalculada } = useMemo(() => {
    const vinculosModulos = vinculos.filter((v) => v.expand?.equipamento_id?.tipo === 'modulo_fv')
    const ativosModulos = ativosIndividuais.filter(
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

    const temItensModulos = vinculosModulos.length > 0 || ativosModulos.length > 0

    if (!temItensModulos) {
      // Fallback para valores cadastrados na usina quando não há vínculos ou ativos
      const potFallback = Number(usina.potencia_kwp) || 0
      const qtdFallback = Number(usina.qtd_modulos || usina.quantidade_placas) || 0
      return {
        potenciaTotalCalculada: potFallback,
        qtdModulosCalculada: qtdFallback,
      }
    }

    // Soma dos vínculos: (potencia_w / 1000) * quantidade
    let potVinculosKw = 0
    let qtdVinculos = 0
    for (const v of vinculosModulos) {
      const q = v.quantidade && v.quantidade > 0 ? v.quantidade : 1
      const potW = Number(v.expand?.equipamento_id?.potencia_w) || 0
      qtdVinculos += q
      potVinculosKw += (potW / 1000) * q
    }

    // Soma dos ativos individuais de módulo (cada um conta 1 un, potencia se houver ou 0)
    let potAtivosKw = 0
    const qtdAtivos = ativosModulos.length
    for (const a of ativosModulos) {
      const potW = Number((a as any).potencia_w || (a as any).potencia) || 0
      if (potW > 0) {
        potAtivosKw += potW / 1000
      }
    }

    const totalQtd = qtdVinculos + qtdAtivos
    const totalPotKw = Number((potVinculosKw + potAtivosKw).toFixed(2))

    return {
      potenciaTotalCalculada: totalPotKw,
      qtdModulosCalculada: totalQtd,
    }
  }, [vinculos, ativosIndividuais, usina.potencia_kwp, usina.qtd_modulos, usina.quantidade_placas])

  // Sincronização silenciosa no banco (sem loop, sem toast)
  const lastSyncedRef = React.useRef<{ potencia_kwp?: number; qtd_modulos?: number }>({})
  useEffect(() => {
    if (!usina?.id) return

    const vinculosModulos = vinculos.filter((v) => v.expand?.equipamento_id?.tipo === 'modulo_fv')
    const ativosModulos = ativosIndividuais.filter(
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
    const temItens = vinculosModulos.length > 0 || ativosModulos.length > 0
    if (!temItens) return // não sobrescreve se derivou do próprio fallback da usina

    const potAtualBanco = Number(usina.potencia_kwp) || 0
    const qtdAtualBanco = Number(usina.qtd_modulos) || 0

    const mudouPot = Math.abs(potAtualBanco - potenciaTotalCalculada) > 0.001
    const mudouQtd = qtdAtualBanco !== qtdModulosCalculada

    const jaSincronizouPot = lastSyncedRef.current.potencia_kwp === potenciaTotalCalculada
    const jaSincronizouQtd = lastSyncedRef.current.qtd_modulos === qtdModulosCalculada

    if (mudouPot && !jaSincronizouPot) {
      lastSyncedRef.current.potencia_kwp = potenciaTotalCalculada
      onUpdateUsinaField('potencia_kwp', potenciaTotalCalculada).catch((err) => {
        console.warn('[BlocoAtivosDaUsina] Erro na sincronização silenciosa de potencia_kwp:', err)
      })
    }

    if (mudouQtd && !jaSincronizouQtd) {
      lastSyncedRef.current.qtd_modulos = qtdModulosCalculada
      onUpdateUsinaField('qtd_modulos', qtdModulosCalculada).catch((err) => {
        console.warn('[BlocoAtivosDaUsina] Erro na sincronização silenciosa de qtd_modulos:', err)
      })
    }
  }, [
    potenciaTotalCalculada,
    qtdModulosCalculada,
    usina?.id,
    usina.potencia_kwp,
    usina.qtd_modulos,
    vinculos,
    ativosIndividuais,
    onUpdateUsinaField,
  ])

  // Contagem do badge: vínculos + ativos individuais (filtrando redundâncias com vínculos) + declarados residuais
  const totalAtivos = useMemo(() => {
    const totalVinculos = vinculosDeduplicados.length
    // Ativos individuais que não casam com equipamentos já vinculados no catálogo
    const ativosIndividuaisSemVinculo = ativosIndividuais.filter((ativo) => {
      const matchNoVinculo = vinculosDeduplicados.some((v) => {
        const eq = v.expand?.equipamento_id
        if (!eq) return false
        const mesmoTipo =
          (eq.tipo === 'inversor' && ativo.tipo === 'inversor') ||
          (eq.tipo === 'modulo_fv' &&
            (ativo.tipo === 'placa_solar' || (ativo.tipo as string) === 'modulo_fv'))
        const mesmaMarca =
          eq.marca &&
          ativo.fabricante &&
          eq.marca.toLowerCase().trim() === ativo.fabricante.toLowerCase().trim()
        const mesmoModelo =
          eq.modelo &&
          ativo.modelo &&
          eq.modelo.toLowerCase().trim() === ativo.modelo.toLowerCase().trim()
        return mesmoTipo && mesmaMarca && mesmoModelo
      })
      return !matchNoVinculo
    })

    const persistidos = totalVinculos + ativosIndividuaisSemVinculo.length
    if (persistidos > 0) {
      // Se houver algum tipo ainda não coberto nem por vínculo nem por ativo individual,
      // soma os declarados desse tipo restante
      return persistidos + equipamentosDeclarados.length
    }
    return equipamentosDeclarados.length
  }, [vinculosDeduplicados, ativosIndividuais, equipamentosDeclarados])

  const exibindoDeclarados =
    vinculos.length === 0 && ativosIndividuais.length === 0 && equipamentosDeclarados.length > 0

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
          'Equipamentos identificados não possuem cadastro no catálogo. Use "Adicionar Ativo" para selecioná-los.',
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

        {/* Barra de Ações Rápidas do Bloco: "Adicionar Ativo", "Cadastrar Equipamento" e Chevron recolher */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleAbrirModalAdicionarAtivo()
            }}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Ativo</span>
          </button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              setModalCadastrarEquipamentoAberto(true)
            }}
            className="inline-flex items-center gap-1 text-[11px] font-bold border-emerald-300 text-emerald-800 hover:bg-emerald-50 h-8 px-3 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-600" />
            <span>Cadastrar Equipamento</span>
          </Button>

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

      {loading ? (
        <div className="py-5 text-center text-xs text-emerald-800 flex items-center justify-center gap-2 bg-white rounded-xl border border-dashed border-emerald-300">
          <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
          <span>Carregando ativos da usina...</span>
        </div>
      ) : expandido ? (
        /* ================================================================ */
        /* QUADRO PRINCIPAL: RESUMO, MÓDULOS E INVERSORES                   */
        /* 3 seções organizadas, cada uma em sua linha, separadas por card   */
        /* dentro de um mesmo quadro com padrão visual moderno e limpo      */
        /* ================================================================ */
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3.5">
          {/* Cabeçalho interno do quadro */}

          {/* -------------------------------------------------------------- */}
          {/* LINHA 1: CARD RESUMO DA USINA                                  */}
          {/* -------------------------------------------------------------- */}
          <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-200/80 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold text-slate-900">Resumo da Usina</span>
              </div>
              <span className="text-[10px] text-slate-400">Clique no valor para editar</span>
            </div>

            {/* Grid 3 colunas de indicadores do resumo enxuto */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              {/* Indicador Potência (Calculada a partir dos módulos da usina) */}
              <div className="flex items-center gap-2.5 p-2 bg-white rounded-lg border border-slate-200/80 shadow-2xs">
                <div className="w-7 h-7 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200/60">
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-semibold text-slate-400 block leading-tight">
                    Potência Total
                  </span>
                  <span className="font-black text-emerald-700 text-sm block">
                    {potenciaTotalCalculada.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}{' '}
                    kWp
                  </span>
                </div>
              </div>

              {/* Indicador Módulos (Calculada a partir dos módulos da usina) */}
              <div className="flex items-center gap-2.5 p-2 bg-white rounded-lg border border-slate-200/80 shadow-2xs">
                <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200/60">
                  <Sun className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-semibold text-slate-400 block leading-tight">
                    Quantidade de Módulos
                  </span>
                  <span className="font-black text-blue-700 text-sm block">
                    {qtdModulosCalculada} un
                  </span>
                </div>
              </div>

              {/* Indicador Geração */}
              <div className="flex items-center gap-2.5 p-2 bg-white rounded-lg border border-slate-200/80 shadow-2xs">
                <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200/60">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-semibold text-slate-400 block leading-tight">
                    Geração Estimada
                  </span>
                  <InlineEditField
                    value={usina.geracao_estimada_kwh ?? 0}
                    displayValue={
                      <span className="font-black text-emerald-700 text-sm">
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
                    onSave={async (val) =>
                      onUpdateUsinaField('geracao_estimada_kwh', Number(val) || 0)
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          {/* -------------------------------------------------------------- */}
          {/* MÓDULOS FOTOVOLTAICOS                                          */}
          {/* -------------------------------------------------------------- */}
          {/* Cabeçalho de Grupo: Módulos Fotovoltaicos */}
          {(() => {
            const vinculosModulos = vinculos.filter(
              (v) => v.expand?.equipamento_id?.tipo === 'modulo_fv',
            )
            const ativosModulos = ativosIndividuais.filter(
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
            const totalModulos =
              vinculosModulos.reduce((acc, v) => acc + (v.quantidade || 1), 0) +
              ativosModulos.length +
              (!temEquipamentoCatalogoModulo &&
              (usina.fabricante_modulos || usina.marca_placas || usina.modelo_modulos)
                ? usina.quantidade_placas || 1
                : 0)

            return (
              <div className="flex items-center justify-between pt-1 pb-0.5">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  Módulos Fotovoltaicos ({totalModulos})
                </span>
              </div>
            )
          })()}

          {/* Conteúdo de Módulos: Vinculados do catálogo, declarados e ativos individuais */}
          <div className="space-y-2">
            {/* 1. Módulos vinculados via catálogo (usina_equipamentos) */}
            {vinculos
              .filter((v) => v.expand?.equipamento_id?.tipo === 'modulo_fv')
              .map((item) => {
                const eq = item.expand?.equipamento_id
                if (!eq) return null
                const datasheetUrl = getDatasheetEquipamentoUrl(eq)
                const fornecedor = eq.expand?.fornecedor_id
                const telefoneSuporte =
                  eq.telefone_suporte_fornecedor ||
                  fornecedor?.telefone_suporte ||
                  fornecedor?.whatsapp ||
                  fornecedor?.telefone ||
                  ''
                const expandidoDetalhes = Boolean(itensExpandidos[item.id])
                const toggleDetalhes = () => {
                  setItensExpandidos((prev) => ({
                    ...prev,
                    [item.id]: !prev[item.id],
                  }))
                }

                return (
                  <div
                    key={item.id}
                    className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs shadow-2xs hover:border-amber-300 transition-all flex flex-col gap-2"
                  >
                    {/* UMA linha principal: Fabricante, Modelo, Potência, Quantidade, Datasheet e Ícone Excluir */}
                    <div className="flex items-center justify-between gap-2 flex-wrap min-h-[30px]">
                      <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                        {/* Marca e Modelo com o mesmo estilo de destaque da potência */}
                        <span className="font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[10px]">
                          {eq.marca}
                        </span>
                        <span className="font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[10px]">
                          {eq.modelo}
                        </span>

                        {/* Potência em W para módulos */}
                        {eq.potencia_w > 0 && (
                          <span className="font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[10px]">
                            {Math.round(eq.potencia_w)} W
                          </span>
                        )}

                        {/* Quantidade SEMPRE visível (mesmo 1) e editável inline silenciosa */}
                        <InlineEditField
                          value={item.quantidade || 1}
                          displayValue={
                            <span
                              className="font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200 text-[10px] cursor-pointer"
                              title="Clique para editar a quantidade"
                            >
                              {item.quantidade || 1} un
                            </span>
                          }
                          type="number"
                          step="1"
                          min={1}
                          unit="un"
                          placeholder="1"
                          onSave={async (val) =>
                            handleUpdateQuantidadeVinculo(item.id, Number(val) || 1)
                          }
                        />

                        {(item.numero_serie || telefoneSuporte || fornecedor) && (
                          <button
                            type="button"
                            onClick={toggleDetalhes}
                            className="text-slate-400 hover:text-slate-600 p-0.5 transition-colors cursor-pointer"
                            title="Mais detalhes"
                          >
                            <ChevronDown
                              className={`w-3.5 h-3.5 transition-transform ${
                                expandidoDetalhes ? 'rotate-180' : ''
                              }`}
                            />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                        {datasheetUrl ? (
                          <a
                            href={datasheetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg border border-emerald-300 text-[11px] transition-colors shadow-2xs"
                            title="Abrir Datasheet do Módulo"
                          >
                            <FileText className="w-3 h-3 text-emerald-700" />
                            <span>Datasheet</span>
                            <ExternalLink className="w-2.5 h-2.5 text-emerald-600" />
                          </a>
                        ) : null}

                        {(() => {
                          const cfg = encontrarConfigMonitoramentoInversor(eq, eq.marca)
                          if (cfg) {
                            return (
                              <MonitoramentoConfigBadge configuracao={cfg} rotulo="Monitoramento" />
                            )
                          }
                          return null
                        })()}

                        <button
                          type="button"
                          onClick={() => handleRemoverVinculo(item.id, `${eq.marca} ${eq.modelo}`)}
                          className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer shrink-0 shadow-2xs"
                          aria-label="Excluir equipamento da usina"
                          title="Excluir equipamento da usina"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Detalhes secundários discretos atrás de expandir */}
                    {expandidoDetalhes && (
                      <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600 space-y-1.5 bg-slate-50/50 p-2 rounded-lg">
                        {item.numero_serie && (
                          <div className="flex items-center gap-1 font-mono">
                            <Hash className="w-3 h-3 text-slate-400" />
                            <span>
                              S/N: <strong>{item.numero_serie}</strong>
                            </span>
                          </div>
                        )}
                        {(fornecedor || telefoneSuporte) && (
                          <div className="flex items-center gap-2 flex-wrap">
                            {fornecedor && (
                              <span className="text-slate-600">
                                Fornecedor: <strong>{fornecedor.nome_empresa}</strong>
                              </span>
                            )}
                            {telefoneSuporte && (
                              <button
                                type="button"
                                onClick={() => handleWhatsAppSuporte(telefoneSuporte)}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[10px]"
                                title={`WhatsApp: ${telefoneSuporte}`}
                              >
                                <Phone className="w-2.5 h-2.5" />
                                <span>{telefoneSuporte}</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

            {/* 2. Ativos individuais de módulos */}
            {ativosIndividuais
              .filter(
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
              .map((ativo) => {
                const garantia = calcularStatusGarantia(ativo.data_fim_garantia)
                const expandido = Boolean(itensExpandidos[ativo.id])
                const toggleDetalhes = () => {
                  setItensExpandidos((prev) => ({
                    ...prev,
                    [ativo.id]: !prev[ativo.id],
                  }))
                }
                return (
                  <div
                    key={ativo.id}
                    className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs shadow-2xs hover:border-amber-300 transition-all flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap min-h-[30px]">
                      <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                        <span className="font-bold text-slate-900 text-xs truncate">
                          {ativo.fabricante} {ativo.modelo}
                        </span>
                        {(ativo.numero_serie ||
                          ativo.data_instalacao ||
                          ativo.observacoes ||
                          ativo.data_fim_garantia) && (
                          <button
                            type="button"
                            onClick={toggleDetalhes}
                            className="text-slate-400 hover:text-slate-600 p-0.5 transition-colors cursor-pointer"
                            title="Mais detalhes"
                          >
                            <ChevronDown
                              className={`w-3.5 h-3.5 transition-transform ${
                                expandido ? 'rotate-180' : ''
                              }`}
                            />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                        {(() => {
                          const cfg = encontrarConfigMonitoramentoInversor(
                            null,
                            ativo.fabricante || ativo.modelo || '',
                          )
                          if (cfg) {
                            return (
                              <MonitoramentoConfigBadge configuracao={cfg} rotulo="Monitoramento" />
                            )
                          }
                          return null
                        })()}

                        <button
                          type="button"
                          onClick={() =>
                            handleRemoverAtivoIndividual(
                              ativo.id,
                              `${ativo.fabricante} ${ativo.modelo}`,
                            )
                          }
                          className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer shrink-0 shadow-2xs"
                          aria-label="Excluir equipamento da usina"
                          title="Excluir equipamento da usina"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {expandido && (
                      <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600 space-y-1.5 bg-slate-50/50 p-2 rounded-lg">
                        <div className="flex items-center gap-3 flex-wrap">
                          {ativo.numero_serie && (
                            <span className="flex items-center gap-1 font-mono">
                              <Hash className="w-3 h-3 text-slate-400" />
                              <span>
                                S/N: <strong>{ativo.numero_serie}</strong>
                              </span>
                            </span>
                          )}
                          {ativo.data_instalacao && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>Instalado: {formatDate(ativo.data_instalacao)}</span>
                            </span>
                          )}
                          {ativo.data_fim_garantia && (
                            <Badge
                              variant={garantia.badgeVariant}
                              className={`text-[10px] ${garantia.badgeClasses}`}
                            >
                              {garantia.label} ({formatDate(ativo.data_fim_garantia)})
                            </Badge>
                          )}
                        </div>
                        {ativo.observacoes && (
                          <p className="italic text-slate-500">"{ativo.observacoes}"</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

            {/* 3. Módulos declarados no cadastro técnico da usina */}
            {!temEquipamentoCatalogoModulo && (
              <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs shadow-2xs flex items-center justify-between gap-2 min-h-[38px]">
                {/* UMA linha com Fabricante, Modelo e Potência */}
                <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <InlineEditField
                      value={usina.fabricante_modulos || usina.marca_placas || ''}
                      displayValue={
                        <span className="font-bold text-slate-900 text-xs">
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

                  <span className="text-slate-300">•</span>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <InlineEditField
                      value={usina.modelo_modulos || ''}
                      displayValue={
                        <span className="font-mono text-slate-800 text-[11px] bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                          {usina.modelo_modulos || 'Não inf.'}
                        </span>
                      }
                      type="text"
                      placeholder="Modelo do módulo"
                      onSave={async (val) =>
                        onUpdateUsinaField('modelo_modulos', String(val).trim())
                      }
                    />
                  </div>

                  {usina.potencia_kwp > 0 && (
                    <div className="contents">
                      <span className="text-slate-300">•</span>
                      <span className="font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[10px]">
                        {usina.potencia_kwp} kWp
                      </span>
                    </div>
                  )}
                </div>
                {/* Ações da linha: um único botão de datasheet, monitoramento se houver e somente o ícone de excluir */}
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  {(() => {
                    const eqModulo = encontrarDatasheetModuloUsina(usina)
                    const url =
                      eqModulo && eqModulo.datasheet_pdf
                        ? getDatasheetEquipamentoUrl(eqModulo)
                        : null
                    if (url) {
                      return (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg border border-emerald-300 text-[11px] transition-colors shadow-2xs"
                          title="Abrir Datasheet PDF"
                        >
                          <FileText className="w-3 h-3 text-emerald-700" />
                          <span>Datasheet</span>
                          <ExternalLink className="w-2.5 h-2.5 text-emerald-600" />
                        </a>
                      )
                    }
                    return (
                      <DatasheetBadge
                        marca={usina.fabricante_modulos || usina.marca_placas || ''}
                        modelo={usina.modelo_modulos || ''}
                        tipo="modulo_fv"
                        mostrarLinkBusca={true}
                      />
                    )
                  })()}

                  {(() => {
                    const eqModulo = encontrarDatasheetModuloUsina(usina)
                    const cfg = encontrarConfigMonitoramentoInversor(
                      eqModulo,
                      usina.fabricante_modulos || usina.marca_placas || '',
                    )
                    if (cfg) {
                      return <MonitoramentoConfigBadge configuracao={cfg} rotulo="Monitoramento" />
                    }
                    return null
                  })()}

                  {(usina.fabricante_modulos || usina.marca_placas || usina.modelo_modulos) && (
                    <button
                      type="button"
                      onClick={() =>
                        handleRemoverEquipamentoDeclarado(
                          'modulo_fv',
                          `${usina.fabricante_modulos || usina.marca_placas || 'Módulos'} ${usina.modelo_modulos || ''}`.trim(),
                        )
                      }
                      className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer shrink-0 shadow-2xs"
                      aria-label="Excluir equipamento da usina"
                      title="Excluir equipamento da usina"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>{' '}
              </div>
            )}
          </div>

          {/* -------------------------------------------------------------- */}
          {/* INVERSORES                                                     */}
          {/* -------------------------------------------------------------- */}
          {/* Cabeçalho de Grupo: Inversores */}
          {(() => {
            const vinculosInversores = vinculos.filter(
              (v) => v.expand?.equipamento_id?.tipo === 'inversor',
            )
            const ativosInversores = ativosIndividuais.filter(
              (a) =>
                a.tipo === 'inversor' ||
                a.fabricante?.toLowerCase().includes('solis') ||
                a.fabricante?.toLowerCase().includes('growatt') ||
                a.fabricante?.toLowerCase().includes('deye') ||
                a.modelo?.toLowerCase().includes('solis') ||
                a.modelo?.toLowerCase().includes('inversor'),
            )
            const totalInversores =
              vinculosInversores.reduce((acc, v) => acc + (v.quantidade || 1), 0) +
              ativosInversores.length +
              (!temEquipamentoCatalogoInversor &&
              (usina.inversores_info || usina.fabricante_inversores || usina.modelo_inversores)
                ? 1
                : 0)

            return (
              <div className="flex items-center justify-between pt-1 pb-0.5">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-purple-600" />
                  Inversores ({totalInversores})
                </span>
              </div>
            )
          })()}

          {/* Conteúdo de Inversores: Vinculados do catálogo, declarados e individuais */}
          <div className="space-y-2">
            {/* 1. Inversores vinculados via catálogo (usina_equipamentos) */}
            {vinculos
              .filter((v) => v.expand?.equipamento_id?.tipo === 'inversor')
              .map((item) => {
                const eq = item.expand?.equipamento_id
                if (!eq) return null
                const datasheetUrl = getDatasheetEquipamentoUrl(eq)
                const dataloggerUrl = getDataloggerEquipamentoUrl(eq)
                const fornecedor = eq.expand?.fornecedor_id
                const telefoneSuporte =
                  eq.telefone_suporte_fornecedor ||
                  fornecedor?.telefone_suporte ||
                  fornecedor?.whatsapp ||
                  fornecedor?.telefone ||
                  ''
                const cfgMonitoramento = encontrarConfigMonitoramentoInversor(eq, eq.marca)
                const expandidoDetalhes = Boolean(itensExpandidos[item.id])
                const toggleDetalhes = () => {
                  setItensExpandidos((prev) => ({
                    ...prev,
                    [item.id]: !prev[item.id],
                  }))
                }

                return (
                  <div
                    key={item.id}
                    className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs shadow-2xs hover:border-blue-300 transition-all flex flex-col gap-2"
                  >
                    {/* UMA linha principal: Fabricante, Modelo, Potência, Quantidade, Datasheet, Botão Monitoramento e Ícone Excluir */}
                    <div className="flex items-center justify-between gap-2 flex-wrap min-h-[30px]">
                      <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                        {/* Marca e Modelo com o mesmo estilo de destaque da potência */}
                        <span className="font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[10px]">
                          {eq.marca}
                        </span>
                        <span className="font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[10px]">
                          {eq.modelo}
                        </span>

                        {/* Potência em kW para inversores */}
                        {eq.potencia_w > 0 && (
                          <span className="font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[10px]">
                            {(eq.potencia_w / 1000).toLocaleString('pt-BR', {
                              maximumFractionDigits: 2,
                            })}{' '}
                            kW
                          </span>
                        )}

                        {/* Quantidade SEMPRE visível (mesmo 1) e editável inline silenciosa */}
                        <InlineEditField
                          value={item.quantidade || 1}
                          displayValue={
                            <span
                              className="font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200 text-[10px] cursor-pointer"
                              title="Clique para editar a quantidade"
                            >
                              {item.quantidade || 1} un
                            </span>
                          }
                          type="number"
                          step="1"
                          min={1}
                          unit="un"
                          placeholder="1"
                          onSave={async (val) =>
                            handleUpdateQuantidadeVinculo(item.id, Number(val) || 1)
                          }
                        />

                        {(item.numero_serie || telefoneSuporte || fornecedor || dataloggerUrl) && (
                          <button
                            type="button"
                            onClick={toggleDetalhes}
                            className="text-slate-400 hover:text-slate-600 p-0.5 transition-colors cursor-pointer"
                            title="Mais detalhes"
                          >
                            <ChevronDown
                              className={`w-3.5 h-3.5 transition-transform ${
                                expandidoDetalhes ? 'rotate-180' : ''
                              }`}
                            />
                          </button>
                        )}
                      </div>

                      {/* Contêiner flex horizontal com datasheet, monitoramento e exclusão */}
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                        {datasheetUrl ? (
                          <a
                            href={datasheetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg border border-emerald-300 text-[11px] transition-colors shadow-2xs"
                            title="Abrir Datasheet do Inversor"
                          >
                            <FileText className="w-3 h-3 text-emerald-700" />
                            <span>Datasheet</span>
                            <ExternalLink className="w-2.5 h-2.5 text-emerald-600" />
                          </a>
                        ) : null}

                        {/* Botão de Monitoramento: no MESMO contêiner flex horizontal do botão datasheet */}
                        {cfgMonitoramento && (
                          <MonitoramentoConfigBadge
                            configuracao={cfgMonitoramento}
                            rotulo="Monitoramento"
                          />
                        )}

                        <button
                          type="button"
                          onClick={() => handleRemoverVinculo(item.id, `${eq.marca} ${eq.modelo}`)}
                          className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer shrink-0 shadow-2xs"
                          aria-label="Excluir equipamento da usina"
                          title="Excluir equipamento da usina"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Detalhes secundários discretos atrás de expandir */}
                    {expandidoDetalhes && (
                      <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600 space-y-1.5 bg-slate-50/50 p-2 rounded-lg">
                        {item.numero_serie && (
                          <div className="flex items-center gap-1 font-mono">
                            <Hash className="w-3 h-3 text-slate-400" />
                            <span>
                              S/N: <strong>{item.numero_serie}</strong>
                            </span>
                          </div>
                        )}
                        {(fornecedor || telefoneSuporte) && (
                          <div className="flex items-center gap-2 flex-wrap">
                            {fornecedor && (
                              <span className="text-slate-600">
                                Fornecedor: <strong>{fornecedor.nome_empresa}</strong>
                              </span>
                            )}
                            {telefoneSuporte && (
                              <button
                                type="button"
                                onClick={() => handleWhatsAppSuporte(telefoneSuporte)}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[10px]"
                                title={`WhatsApp: ${telefoneSuporte}`}
                              >
                                <Phone className="w-2.5 h-2.5" />
                                <span>{telefoneSuporte}</span>
                              </button>
                            )}
                          </div>
                        )}
                        {dataloggerUrl && (
                          <div className="pt-1">
                            <a
                              href={dataloggerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-blue-700 hover:underline"
                            >
                              <Settings className="w-3 h-3" />
                              <span>Configuração do Datalogger</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

            {/* 2. Ativos individuais de inversores */}
            {ativosIndividuais
              .filter(
                (a) =>
                  a.tipo === 'inversor' ||
                  a.fabricante?.toLowerCase().includes('solis') ||
                  a.fabricante?.toLowerCase().includes('growatt') ||
                  a.fabricante?.toLowerCase().includes('deye') ||
                  a.modelo?.toLowerCase().includes('solis') ||
                  a.modelo?.toLowerCase().includes('inversor'),
              )
              .map((ativo) => {
                const garantia = calcularStatusGarantia(ativo.data_fim_garantia)
                const expandido = Boolean(itensExpandidos[ativo.id])
                const toggleDetalhes = () => {
                  setItensExpandidos((prev) => ({
                    ...prev,
                    [ativo.id]: !prev[ativo.id],
                  }))
                }
                return (
                  <div
                    key={ativo.id}
                    className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs shadow-2xs hover:border-blue-300 transition-all flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap min-h-[30px]">
                      <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                        <span className="font-bold text-slate-900 text-xs truncate">
                          {ativo.fabricante} {ativo.modelo}
                        </span>
                        {(ativo.numero_serie ||
                          ativo.data_instalacao ||
                          ativo.observacoes ||
                          ativo.data_fim_garantia) && (
                          <button
                            type="button"
                            onClick={toggleDetalhes}
                            className="text-slate-400 hover:text-slate-600 p-0.5 transition-colors cursor-pointer"
                            title="Mais detalhes"
                          >
                            <ChevronDown
                              className={`w-3.5 h-3.5 transition-transform ${
                                expandido ? 'rotate-180' : ''
                              }`}
                            />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                        {(() => {
                          const cfg = encontrarConfigMonitoramentoInversor(
                            null,
                            ativo.fabricante || ativo.modelo || '',
                          )
                          if (cfg) {
                            return (
                              <MonitoramentoConfigBadge configuracao={cfg} rotulo="Monitoramento" />
                            )
                          }
                          return null
                        })()}

                        <button
                          type="button"
                          onClick={() =>
                            handleRemoverAtivoIndividual(
                              ativo.id,
                              `${ativo.fabricante} ${ativo.modelo}`,
                            )
                          }
                          className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer shrink-0 shadow-2xs"
                          aria-label="Excluir equipamento da usina"
                          title="Excluir equipamento da usina"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {expandido && (
                      <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600 space-y-1.5 bg-slate-50/50 p-2 rounded-lg">
                        <div className="flex items-center gap-3 flex-wrap">
                          {ativo.numero_serie && (
                            <span className="flex items-center gap-1 font-mono">
                              <Hash className="w-3 h-3 text-slate-400" />
                              <span>
                                S/N: <strong>{ativo.numero_serie}</strong>
                              </span>
                            </span>
                          )}
                          {ativo.data_instalacao && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>Instalado: {formatDate(ativo.data_instalacao)}</span>
                            </span>
                          )}
                          {ativo.data_fim_garantia && (
                            <Badge
                              variant={garantia.badgeVariant}
                              className={`text-[10px] ${garantia.badgeClasses}`}
                            >
                              {garantia.label} ({formatDate(ativo.data_fim_garantia)})
                            </Badge>
                          )}
                        </div>
                        {ativo.observacoes && (
                          <p className="italic text-slate-500">"{ativo.observacoes}"</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

            {/* 3. Inversor declarado no cadastro da usina */}
            {!temEquipamentoCatalogoInversor && (
              <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs shadow-2xs flex items-center justify-between gap-2 min-h-[38px]">
                {/* UMA linha com Fabricante, Modelo e Potência */}
                <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <InlineEditField
                      value={usina.inversores_info || ''}
                      displayValue={
                        <span className="font-bold text-slate-900 text-xs">
                          {usina.inversores_info || 'Não inf.'}
                        </span>
                      }
                      type="text"
                      placeholder="Ex: Solis SOLIS - 75K - 5G - PRO ou Growatt MIN 8000TL-X"
                      className="w-full"
                      onSave={async (val) =>
                        onUpdateUsinaField('inversores_info', String(val).trim())
                      }
                    />
                  </div>
                </div>

                {/* Ações da linha: botão de datasheet, botão de monitoramento e ícone de excluir */}
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
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
                            className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg border border-emerald-300 text-[11px] transition-colors shadow-2xs"
                            title={`Abrir Datasheet PDF (${eq.marca} ${eq.modelo})`}
                          >
                            <FileText className="w-3 h-3 text-emerald-700" />
                            <span>Datasheet</span>
                            <ExternalLink className="w-2.5 h-2.5 text-emerald-600 ml-0.5" />
                          </a>
                        )
                      }
                    }
                    return null
                  })()}

                  {(() => {
                    const eq = encontrarEquipamentoComDatasheet(usina.inversores_info || '')
                    const cfg = encontrarConfigMonitoramentoInversor(
                      eq,
                      usina.fabricante_inversores || usina.inversores_info || '',
                    )
                    if (cfg) {
                      return <MonitoramentoConfigBadge configuracao={cfg} rotulo="Monitoramento" />
                    }
                    return null
                  })()}

                  {(usina.inversores_info ||
                    usina.fabricante_inversores ||
                    usina.modelo_inversores) && (
                    <button
                      type="button"
                      onClick={() =>
                        handleRemoverEquipamentoDeclarado(
                          'inversor',
                          usina.inversores_info ||
                            `${usina.fabricante_inversores || 'Inversor'} ${usina.modelo_inversores || ''}`.trim(),
                        )
                      }
                      className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer shrink-0 shadow-2xs"
                      aria-label="Excluir equipamento da usina"
                      title="Excluir equipamento da usina"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* -------------------------------------------------------------- */}
          {/* OUTROS ATIVOS (Baterias, medidores, transformadores etc.)       */}
          {/* Mantidos com integridade 100% aditiva caso existam no cadastro */}
          {/* -------------------------------------------------------------- */}
          {(() => {
            const outrosVinculos = vinculos.filter(
              (v) =>
                v.expand?.equipamento_id?.tipo !== 'inversor' &&
                v.expand?.equipamento_id?.tipo !== 'modulo_fv',
            )
            const outrosIndividuais = ativosIndividuais.filter(
              (a) =>
                a.tipo !== 'inversor' &&
                a.tipo !== 'placa_solar' &&
                (a.tipo as string) !== 'modulo_fv' &&
                !a.fabricante?.toLowerCase().includes('solis') &&
                !a.fabricante?.toLowerCase().includes('growatt') &&
                !a.fabricante?.toLowerCase().includes('deye') &&
                !a.modelo?.toLowerCase().includes('solis') &&
                !a.modelo?.toLowerCase().includes('inversor') &&
                !a.fabricante?.toLowerCase().includes('sunova') &&
                !a.fabricante?.toLowerCase().includes('canadian') &&
                !a.fabricante?.toLowerCase().includes('ja solar') &&
                !a.fabricante?.toLowerCase().includes('trina') &&
                !a.modelo?.toLowerCase().includes('placa') &&
                !a.modelo?.toLowerCase().includes('modulo'),
            )

            if (outrosVinculos.length === 0 && outrosIndividuais.length === 0) return null

            return (
              <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/80 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-purple-600" />
                  Outros Ativos e Equipamentos da Usina
                </span>
                <div className="space-y-2">
                  {outrosVinculos.map((item) => {
                    const eq = item.expand?.equipamento_id
                    if (!eq) return null
                    const datasheetUrl = getDatasheetEquipamentoUrl(eq)
                    return (
                      <div
                        key={item.id}
                        className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs shadow-2xs flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-bold text-slate-900 truncate">
                            {eq.marca} {eq.modelo}
                          </span>
                          {item.quantidade && item.quantidade > 1 ? (
                            <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                              Qtd: {item.quantidade}
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {datasheetUrl && (
                            <a
                              href={datasheetUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-emerald-700 font-bold hover:underline"
                            >
                              Datasheet
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              handleRemoverVinculo(item.id, `${eq.marca} ${eq.modelo}`)
                            }
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Excluir da usina"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                  {outrosIndividuais.map((ativo) => (
                    <div
                      key={ativo.id}
                      className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs shadow-2xs flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 truncate">
                          {ativo.fabricante} {ativo.modelo}
                        </span>
                        <span className="text-[10px] text-slate-500 ml-2">
                          {getLabelTipoAtivo(ativo.tipo, ativo.tipo_outro_descricao)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleRemoverAtivoIndividual(
                            ativo.id,
                            `${ativo.fabricante} ${ativo.modelo}`,
                          )
                        }
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Excluir da usina"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Informação e ação de efetivar equipamentos declarados quando existirem */}
          {exibindoDeclarados && (
            <div className="p-3 bg-emerald-100/60 rounded-xl border border-emerald-300 text-xs flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
                <div>
                  <span className="font-bold text-emerald-950 text-xs">
                    Equipamentos declarados identificados ({equipamentosDeclarados.length})
                  </span>
                  <p className="text-[11px] text-emerald-800">
                    Efetive o vínculo no catálogo para associar números de série, dataloggers e
                    suporte técnico.
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
                  <div className="contents">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Efetivando Vínculos...</span>
                  </div>
                ) : (
                  <div className="contents">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Efetivar Vínculo no Catálogo</span>
                  </div>
                )}
              </button>
            </div>
          )}
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
              <span>Anexar documentos</span>
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
          <div className="space-y-1.5">
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
                  className="px-2.5 py-1 bg-slate-50/70 hover:bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between gap-2 transition-colors text-xs min-h-[32px]"
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span
                      className="font-bold text-slate-900 truncate max-w-[200px] sm:max-w-xs shrink-0"
                      title={doc.nome_arquivo}
                    >
                      {doc.nome_arquivo}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1.5 py-0 h-4 font-semibold border shrink-0 ${categoriaCor}`}
                    >
                      {categoriaLabel}
                    </Badge>
                    {doc.origem?.includes('legado') && (
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1.5 py-0 h-4 bg-slate-100 text-slate-600 border-slate-300 shrink-0 hidden sm:inline-flex"
                      >
                        Legado
                      </Badge>
                    )}
                    {doc.criado_em && (
                      <span className="text-[10px] text-slate-400 shrink-0 hidden md:inline">
                        {formatDate(doc.criado_em)}
                      </span>
                    )}
                    {doc.tamanho && doc.tamanho > 0 && (
                      <span className="text-[10px] text-slate-400 shrink-0 hidden lg:inline">
                        • {(doc.tamanho / 1024).toFixed(0)} KB
                      </span>
                    )}
                    {doc.observacoes && (
                      <span
                        className="text-[10px] text-slate-400 italic truncate max-w-xs hidden xl:inline"
                        title={doc.observacoes}
                      >
                        • "{doc.observacoes}"
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {doc.url ? (
                      <div className="contents">
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-semibold rounded-md border border-slate-200 transition-colors shadow-2xs"
                          title="Visualizar documento em nova aba"
                        >
                          <Eye className="w-3 h-3 text-slate-500" />
                          <span className="hidden sm:inline">Visualizar</span>
                        </a>

                        <a
                          href={doc.url}
                          download={doc.nome_arquivo || 'documento_usina'}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-semibold rounded-md border border-slate-200 transition-colors shadow-2xs"
                          title="Baixar arquivo"
                        >
                          <Download className="w-3 h-3 text-slate-500" />
                          <span className="hidden sm:inline">Download</span>
                        </a>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Sem URL</span>
                    )}

                    <button
                      type="button"
                      onClick={() => setDocParaExcluir(doc)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors cursor-pointer"
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
                <div className="contents">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Removendo...</span>
                </div>
              ) : (
                <span>Sim, Excluir Documento</span>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL DE ANEXAR DOCUMENTOS COM CLASSIFICAÇÃO INDIVIDUAL */}
      <Dialog
        open={uploadManualAberto}
        onOpenChange={(val) => {
          setUploadManualAberto(val)
          if (!val) {
            setArquivosParaClassificar([])
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-blue-600" />
              Anexar Documentos à Usina
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Selecione um ou mais arquivos e classifique a categoria de cada documento para a usina
              "{usina.nome}".
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarUploadManual} className="space-y-4 text-xs">
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                Selecionar Arquivo(s) (PDF, Imagem, Planilha) *
              </label>
              <input
                ref={inputManualRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.csv,.doc,.docx"
                onChange={(e) => {
                  const files = e.target.files ? Array.from(e.target.files) : []
                  if (files.length > 0) {
                    const novosItens = files.map((file, idx) => ({
                      id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
                      file,
                      categoria: uploadManualCategoria || 'projeto',
                    }))
                    setArquivosParaClassificar((prev) => [...prev, ...novosItens])
                    if (inputManualRef.current) {
                      inputManualRef.current.value = ''
                    }
                  }
                }}
                className="w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-slate-300 rounded-xl p-1.5 cursor-pointer"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Dica: Você pode selecionar vários arquivos de uma vez.
              </p>
            </div>

            {/* LISTA DE ARQUIVOS COM SELEÇÃO DE CATEGORIA INDIVIDUAL */}
            {arquivosParaClassificar.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 uppercase">
                  <span>Arquivos para envio ({arquivosParaClassificar.length})</span>
                  <span className="text-slate-400 font-normal">Classifique cada arquivo</span>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {arquivosParaClassificar.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p
                            className="font-semibold text-slate-800 truncate text-[11px]"
                            title={item.file.name}
                          >
                            {item.file.name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {(item.file.size / 1024).toFixed(0)} KB
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <select
                          value={item.categoria}
                          onChange={(e) => {
                            const novaCat = e.target.value
                            setArquivosParaClassificar((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, categoria: novaCat } : it)),
                            )
                          }}
                          className="text-[11px] font-medium px-2 py-1 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="projeto">Projeto Técnico / Memorial</option>
                          <option value="datasheet_inversor">Datasheet do Inversor</option>
                          <option value="datasheet_modulo">Datasheet do Módulo</option>
                          <option value="fatura">Conta / Fatura de Energia</option>
                          <option value="memorial">ART / Parecer de Acesso</option>
                          <option value="outro">Outro Documento Técnico</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => {
                            setArquivosParaClassificar((prev) => prev.filter((_, i) => i !== idx))
                          }}
                          className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                          title="Remover arquivo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setUploadManualAberto(false)
                  setArquivosParaClassificar([])
                }}
                className="px-3.5 py-1.5 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={uploadManualSalvando || arquivosParaClassificar.length === 0}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-2xs inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {uploadManualSalvando ? (
                  <div className="contents">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Salvando...</span>
                  </div>
                ) : (
                  <span>
                    Salvar{' '}
                    {arquivosParaClassificar.length > 1
                      ? `Todos (${arquivosParaClassificar.length})`
                      : 'Documento'}
                  </span>
                )}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================================================================ */}
      {/* MODAL: ADICIONAR ATIVO À USINA (Seleção em Cascata do Catálogo)   */}
      {/* Equipamento (placa/inversor) -> Marca -> Modelo / Potência        */}
      {/* ================================================================ */}
      <Dialog open={modalVincularAberto} onOpenChange={setModalVincularAberto}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/70">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-slate-900">
                  Adicionar Ativo à Usina
                </DialogTitle>
                <DialogDescription className="text-[11px] text-slate-500">
                  Selecione do catálogo o equipamento, a marca e o modelo/potência para vincular à
                  usina "{usina.nome}".
                </DialogDescription>
              </div>
            </div>
          </div>

          <form onSubmit={handleVincularEquipamento} className="p-5 space-y-4 text-xs">
            {/* 1. Seleção em Cascata: Equipamento (Tipo) */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                Equipamento *
              </label>
              <select
                required
                value={filtroTipo}
                onChange={(e) => handleTipoChange(e.target.value as 'modulo_fv' | 'inversor' | '')}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="">Selecione o tipo de equipamento...</option>
                <option value="inversor">Inversor Fotovoltaico</option>
                <option value="modulo_fv">Módulo Fotovoltaico (Placa)</option>
              </select>
            </div>

            {/* 2. Seleção em Cascata: Marca */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                Marca{' '}
                {filtroTipo === 'inversor'
                  ? 'do Inversor'
                  : filtroTipo === 'modulo_fv'
                    ? 'da Placa / Módulo'
                    : ''}{' '}
                *
              </label>
              <select
                required
                disabled={!filtroTipo}
                value={filtroMarca}
                onChange={(e) => handleMarcaChange(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
              >
                <option value="">
                  {!filtroTipo
                    ? 'Selecione primeiro o equipamento acima...'
                    : marcasDisponiveis.length === 0
                      ? 'Nenhuma marca encontrada no catálogo'
                      : 'Selecione a marca...'}
                </option>
                {marcasDisponiveis.map((marca) => (
                  <option key={marca} value={marca}>
                    {marca}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Seleção em Cascata: Modelo / Potência */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                Modelo / Potência *
              </label>
              <select
                required
                disabled={!filtroMarca}
                value={equipamentoSelecionadoId}
                onChange={(e) => setEquipamentoSelecionadoId(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
              >
                <option value="">
                  {!filtroMarca
                    ? 'Selecione primeiro a marca acima...'
                    : modelosDisponiveis.length === 0
                      ? 'Nenhum modelo cadastrado para esta marca'
                      : 'Selecione o modelo e potência...'}
                </option>
                {modelosDisponiveis.map((eq) => {
                  const potFormatada =
                    eq.tipo === 'modulo_fv'
                      ? `${Math.round(eq.potencia_w || 0).toLocaleString('pt-BR')} W`
                      : eq.potencia_w
                        ? `${Math.round(eq.potencia_w).toLocaleString('pt-BR')} W (${formatarPotenciaEquipamento(eq.potencia_w, eq.tipo)})`
                        : 'Potência não informada'
                  return (
                    <option key={eq.id} value={eq.id}>
                      {eq.modelo} — {potFormatada}
                    </option>
                  )
                })}
              </select>

              {/* Pré-visualização do Equipamento Selecionado */}
              {equipamentoSelecionado && (
                <div className="mt-2 p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-[11px] text-emerald-950 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {equipamentoSelecionado.tipo === 'inversor' ? (
                      <Cpu className="w-4 h-4 text-purple-600 shrink-0" />
                    ) : (
                      <Sun className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <div>
                      <span className="font-bold">
                        {equipamentoSelecionado.marca} {equipamentoSelecionado.modelo}
                      </span>
                      <span className="text-slate-600 ml-1.5">
                        •{' '}
                        {formatarPotenciaEquipamento(
                          equipamentoSelecionado.potencia_w,
                          equipamentoSelecionado.tipo,
                        )}
                      </span>
                    </div>
                  </div>
                  {getDatasheetEquipamentoUrl(equipamentoSelecionado) && (
                    <Badge
                      variant="outline"
                      className="bg-white text-emerald-800 border-emerald-300 font-semibold text-[10px]"
                    >
                      Com Datasheet
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Campos Complementares: Quantidade e Número de Série (S/N) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                  Quantidade *
                </label>
                <input
                  type="number"
                  min="1"
                  required
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

            {/* Observações */}
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
                disabled={salvandoVinculo || !equipamentoSelecionadoId}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {salvandoVinculo ? (
                  <div className="contents">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando...</span>
                  </div>
                ) : (
                  <span>Adicionar à Usina</span>
                )}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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
                <div className="contents">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Excluindo...</span>
                </div>
              ) : (
                <span>Sim, Excluir Equipamento</span>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ================================================================ */}
      {/* MODAL: CADASTRAR EQUIPAMENTO (NOVO NOVO CATALOGO + VINCULO DIRETO) */}
      {/* ================================================================ */}
      <ModalFormEquipamento
        isOpen={modalCadastrarEquipamentoAberto}
        onClose={() => setModalCadastrarEquipamentoAberto(false)}
        tiposPermitidos={['inversor', 'modulo_fv']}
        exibirQuantidade={true}
        onSalvo={handleEquipamentoCadastrado}
      />
    </div>
  )
}

export const BlocoAtivosDaUsina: React.FC<BlocoAtivosDaUsinaProps> = (props) => {
  return (
    <ErrorBoundary compact={true} errorMessage="Não foi possível exibir o bloco de Ativos da Usina">
      <BlocoAtivosDaUsinaInterno {...props} />
    </ErrorBoundary>
  )
}
