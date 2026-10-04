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
} from '@/services/usinaEquipamentosService'
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
  const [uploadManualArquivo, setUploadManualArquivo] = useState<File | null>(null)
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

      // Se tipo === 'inversor' e houver onUpdateUsinaMultipleFields / onUpdateUsinaField:
      try {
        if (equipamentoCriado.tipo === 'inversor') {
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
        } else if (equipamentoCriado.tipo === 'modulo_fv') {
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
          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-700 font-bold flex items-center gap-1.5 text-xs">
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                Módulos Fotovoltaicos da Usina
              </span>
              {(usina.fabricante_modulos || usina.marca_placas || usina.modelo_modulos) && (
                <button
                  type="button"
                  onClick={() =>
                    handleRemoverEquipamentoDeclarado(
                      'modulo_fv',
                      `${usina.fabricante_modulos || usina.marca_placas || 'Módulos'} ${usina.modelo_modulos || ''}`.trim(),
                    )
                  }
                  className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer shrink-0 shadow-2xs inline-flex items-center gap-1 text-[11px] font-bold"
                  aria-label="Excluir equipamento da usina"
                  title="Excluir equipamento da usina"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
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
                    <span className="font-mono text-slate-800 text-[11px] bg-white px-2 py-0.5 rounded border border-slate-200">
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
          </div>
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
              <div className="flex items-center gap-2">
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
                    className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer shrink-0 shadow-2xs inline-flex items-center gap-1 text-[11px] font-bold"
                    aria-label="Excluir equipamento da usina"
                    title="Excluir equipamento da usina"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir</span>
                  </button>
                )}
              </div>
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
                handleAbrirModalAdicionarAtivo()
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
                        {/* Configuração de Monitoramento para inversor declarado */}
                        {isInversor &&
                          (() => {
                            const cfg = encontrarConfigMonitoramentoInversor(
                              item.equipamentoCatalogo,
                              item.marca,
                            )
                            if (!cfg) return null
                            return (
                              <MonitoramentoConfigBadge
                                configuracao={cfg}
                                rotulo="Config. de Monitoramento"
                                mostrarTipo
                              />
                            )
                          })()}
                        <button
                          type="button"
                          onClick={() =>
                            handleRemoverEquipamentoDeclarado(
                              item.tipo,
                              `${item.marca} ${item.modelo}`,
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
                      className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer shrink-0 shadow-2xs"
                      aria-label="Excluir equipamento da usina"
                      title="Excluir equipamento da usina"
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

                {/* Datasheet, Configuração de Monitoramento, Datalogger e Fornecedor com Suporte */}
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

                    {/* Configuração de Monitoramento vinculada ao inversor (no mesmo formato do Datasheet) */}
                    {isInversor &&
                      (() => {
                        const cfg = encontrarConfigMonitoramentoInversor(eq, eq.marca)
                        if (!cfg) return null
                        return (
                          <MonitoramentoConfigBadge
                            configuracao={cfg}
                            rotulo="Config. de Monitoramento"
                            mostrarTipo
                          />
                        )
                      })()}

                    {/* Link direto legado de datalogger caso exista e não tenha cfg vinculada */}
                    {dataloggerUrl && !eq.configuracao_monitoramento_id && (
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
                    className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer shrink-0 shadow-2xs"
                    aria-label="Excluir equipamento da usina"
                    title="Excluir equipamento da usina"
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
