import React, { useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Upload,
  FileSignature,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Search,
  Filter,
  Check,
  X,
  RotateCcw,
  Sparkles,
  Info,
  Calendar,
  DollarSign,
  UserPlus,
  Users,
  Edit2,
  FileText,
  ClipboardPaste,
  Layers,
  HelpCircle,
  Clock,
  Ban,
  Building,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { parseSpreadsheetFile } from '@/lib/spreadsheetParser'
import { extractTextFromDocx, extractTextFromPdf } from '@/lib/documentExtractor'
import {
  ItemImportacaoContrato,
  ColunasDetectadasContratos,
  RelatorioImportacaoContratos,
  detectarCabecalhoContratos,
  construirItensImportacaoContratos,
  extrairContratosDeTextoLivre,
  gerarContratosExemploDemonstracao,
  normalizarSituacaoContrato,
} from '@/services/importacaoContratosOMService'
import { createCliente, createContratoOM, updateContratoOM } from '@/services/crmService'
import { OMPlanoTipo, OMStatusPlano } from '@/types/crm'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { toast } from 'sonner'

export function ImportarContratosOM() {
  const navigate = useNavigate()
  const { clientes, contratosOM, refreshData } = useClientes()

  // Estados de Upload e Arquivo
  const [arquivoNome, setArquivoNome] = useState<string>('')
  const [isProcessandoArquivo, setIsProcessandoArquivo] = useState<boolean>(false)
  const [mostrarAreaColarTexto, setMostrarAreaColarTexto] = useState<boolean>(false)
  const [textoManualColado, setTextoManualColado] = useState<string>('')

  // Itens de Contrato para Revisão e Vinculação
  const [itensContrato, setItensContrato] = useState<ItemImportacaoContrato[]>([])

  // Modal de Selecionar Outro Cliente / Troca Manual
  const [itemSelecionandoCliente, setItemSelecionandoCliente] =
    useState<ItemImportacaoContrato | null>(null)
  const [buscaClienteModal, setBuscaClienteModal] = useState<string>('')

  // Modal de Criar Novo Cliente Rápido
  const [itemCriandoCliente, setItemCriandoCliente] = useState<ItemImportacaoContrato | null>(null)
  const [novoClienteNome, setNovoClienteNome] = useState<string>('')
  const [novoClienteCidade, setNovoClienteCidade] = useState<string>('Erechim/RS')
  const [novoClienteTelefone, setNovoClienteTelefone] = useState<string>('')

  // Modal de Edição de Linha do Contrato
  const [itemEmEdicao, setItemEmEdicao] = useState<ItemImportacaoContrato | null>(null)
  const [editNumeroContrato, setEditNumeroContrato] = useState<string>('')
  const [editPlano, setEditPlano] = useState<OMPlanoTipo>('Essencial')
  const [editValorMensal, setEditValorMensal] = useState<number>(250)
  const [editDataInicio, setEditDataInicio] = useState<string>('')
  const [editDataTermino, setEditDataTermino] = useState<string>('')
  const [editProxVencimento, setEditProxVencimento] = useState<string>('')
  const [editSituacao, setEditSituacao] = useState<string>('Ativo')

  // Filtros da Tabela
  const [buscaFiltro, setBuscaFiltro] = useState<string>('')
  const [statusFiltro, setStatusFiltro] = useState<
    'todos' | 'identificados' | 'nao_encontrados' | 'ignorados'
  >('todos')

  // Execução da Importação
  const [isImportando, setIsImportando] = useState<boolean>(false)
  const [relatorio, setRelatorio] = useState<RelatorioImportacaoContratos | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Estatísticas calculadas dinamicamente
  const estatisticas = useMemo(() => {
    const total = itensContrato.length
    const vinculados = itensContrato.filter((i) => i.decisao === 'vincular').length
    const criarNovo = itensContrato.filter((i) => i.decisao === 'criar_cliente').length
    const ignorados = itensContrato.filter((i) => i.decisao === 'ignorar').length
    const identificadosVerde = itensContrato.filter(
      (i) =>
        i.clienteIdentificadoId && (i.confiancaMatch === 'alta' || i.confiancaMatch === 'media'),
    ).length
    const naoEncontradosVermelho = itensContrato.filter(
      (i) => !i.clienteIdentificadoId || i.confiancaMatch === 'nenhuma',
    ).length

    return {
      total,
      vinculados,
      criarNovo,
      ignorados,
      identificadosVerde,
      naoEncontradosVermelho,
    }
  }, [itensContrato])

  // Filtragem da tabela para exibição
  const itensFiltrados = useMemo(() => {
    return itensContrato.filter((item) => {
      // Filtro por Abas/Status
      if (statusFiltro === 'identificados' && item.confiancaMatch === 'nenhuma') return false
      if (statusFiltro === 'nao_encontrados' && item.confiancaMatch !== 'nenhuma') return false
      if (statusFiltro === 'ignorados' && item.decisao !== 'ignorar') return false

      // Busca por Texto
      if (buscaFiltro.trim()) {
        const q = buscaFiltro.toLowerCase().trim()
        const matchOriginal = (item.nomeClienteOriginal || '').toLowerCase().includes(q)
        const matchCRM = (item.clienteSelecionadoNome || '').toLowerCase().includes(q)
        const matchNumero = (item.numeroContrato || '').toLowerCase().includes(q)
        const matchPlano = (item.planoSugerido || '').toLowerCase().includes(q)
        if (!matchOriginal && !matchCRM && !matchNumero && !matchPlano) return false
      }

      return true
    })
  }, [itensContrato, statusFiltro, buscaFiltro])

  // Processamento do Arquivo Uploaded
  const handleUploadArquivo = async (file: File) => {
    setIsProcessandoArquivo(true)
    setRelatorio(null)
    setArquivoNome(file.name)
    const ext = file.name.split('.').pop()?.toLowerCase() || ''

    try {
      if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
        const parsed = await parseSpreadsheetFile(file)
        if (!parsed.rows || parsed.rows.length === 0) {
          toast.error('A planilha está vazia ou não possui linhas legíveis.')
          setIsProcessandoArquivo(false)
          return
        }

        const cols = detectarCabecalhoContratos(parsed.headers)
        if (!cols) {
          toast.error(
            'Não foi possível identificar colunas contratuais (Cliente, Número, Valor, Início). Cole o texto abaixo.',
          )
          setMostrarAreaColarTexto(true)
          setIsProcessandoArquivo(false)
          return
        }

        const itens = construirItensImportacaoContratos(parsed.rows, cols, clientes, contratosOM)

        if (itens.length === 0) {
          toast.warning('Nenhum contrato válido pôde ser extraído da planilha.')
        } else {
          setItensContrato(itens)
          toast.success(`${itens.length} contratos O&M prontos para conferência e vinculação!`)
        }
      } else if (ext === 'docx') {
        const texto = await extractTextFromDocx(file)
        if (!texto || texto.trim().length < 20) {
          toast.error('Não foi possível extrair texto do documento Word. Cole o texto manualmente.')
          setMostrarAreaColarTexto(true)
          setIsProcessandoArquivo(false)
          return
        }

        const itens = extrairContratosDeTextoLivre(texto, clientes, contratosOM)
        if (itens.length === 0) {
          toast.warning(
            'O documento não possui dados contratuais tabulares óbvios. Ajuste ou cole o texto.',
          )
          setMostrarAreaColarTexto(true)
        } else {
          setItensContrato(itens)
          toast.success(`${itens.length} contratos O&M extraídos do Word!`)
        }
      } else if (ext === 'pdf') {
        const texto = await extractTextFromPdf(file)
        if (!texto || texto.trim().length < 20) {
          toast.error(
            'Este PDF pode estar digitalizado como imagem sem camada de texto. Você pode colar o texto ou dados manualmente abaixo.',
          )
          setMostrarAreaColarTexto(true)
          setIsProcessandoArquivo(false)
          return
        }

        const itens = extrairContratosDeTextoLivre(texto, clientes, contratosOM)
        if (itens.length === 0) {
          toast.warning(
            'Não foi possível detectar estrutura tabular de contratos no PDF. Use o campo abaixo para colar os dados.',
          )
          setMostrarAreaColarTexto(true)
        } else {
          setItensContrato(itens)
          toast.success(`${itens.length} contratos O&M extraídos do PDF!`)
        }
      } else {
        toast.error(
          'Formato não suportado. Por favor, envie um arquivo .xlsx, .csv, .docx ou .pdf.',
        )
      }
    } catch (err: any) {
      console.error('Erro ao ler arquivo de contratos:', err)
      toast.error(
        err?.message ||
          'Erro ao processar este arquivo. Você pode colar os dados textuais diretamente na área abaixo.',
      )
      setMostrarAreaColarTexto(true)
    } finally {
      setIsProcessandoArquivo(false)
    }
  }

  // Parsear texto colado manualmente
  const handleParsearTextoManual = () => {
    if (!textoManualColado.trim()) {
      toast.error('Cole o conteúdo textual ou colunas da Conta Azul no campo antes de processar.')
      return
    }

    const itens = extrairContratosDeTextoLivre(textoManualColado, clientes, contratosOM)
    if (itens.length === 0) {
      toast.error(
        'Não foi possível encontrar contratos no formato esperado. Dica: copie as linhas com Cliente, Valor e Datas.',
      )
      return
    }

    setItensContrato(itens)
    toast.success(`${itens.length} contratos O&M detectados no texto colado!`)
  }

  // Carregar dados de exemplo com 3 contratos (2 identificados + 1 não encontrado)
  const handleCarregarExemplo = () => {
    const dados = gerarContratosExemploDemonstracao(clientes, contratosOM)
    setItensContrato(dados)
    setArquivoNome('Exemplo_Conta_Azul_Contratos_OM.xlsx')
    setRelatorio(null)
    toast.success('3 contratos de exemplo carregados para demonstração dos fluxos!')
  }

  // Ações por Linha: Vincular ao cliente identificado
  const handleConfirmarVinculoLinha = (idTemp: string) => {
    setItensContrato((prev) =>
      prev.map((item) => {
        if (item.idTemp !== idTemp) return item
        if (!item.clienteIdentificadoId) {
          toast.error(
            'Esta linha não possui cliente identificado automaticamente. Selecione um cliente ou crie um novo.',
          )
          return item
        }
        return {
          ...item,
          decisao: 'vincular',
          clienteSelecionadoId: item.clienteIdentificadoId,
          clienteSelecionadoNome: item.clienteIdentificadoNome,
        }
      }),
    )
  }

  // Ações por Linha: Marcar para criar novo cliente
  const handleEscolherCriarNovoLinha = (item: ItemImportacaoContrato) => {
    setItemCriandoCliente(item)
    setNovoClienteNome(item.nomeClienteOriginal)
    setNovoClienteCidade('Erechim/RS')
    setNovoClienteTelefone('')
  }

  // Confirmar criação rápida de novo cliente no modal
  const handleSalvarNovoClienteForm = (e: React.FormEvent) => {
    e.preventDefault()
    if (!itemCriandoCliente || !novoClienteNome.trim()) return

    setItensContrato((prev) =>
      prev.map((item) => {
        if (item.idTemp !== itemCriandoCliente.idTemp) return item
        return {
          ...item,
          decisao: 'criar_cliente',
          clienteSelecionadoId: null,
          clienteSelecionadoNome: `${novoClienteNome.trim()} (Novo Cliente a ser criado)`,
          dadosNovoCliente: {
            nome: novoClienteNome.trim(),
            cidade: novoClienteCidade.trim(),
            telefone: novoClienteTelefone.trim(),
          },
        }
      }),
    )

    toast.success(`Linha configurada para criar novo cliente "${novoClienteNome.trim()}".`)
    setItemCriandoCliente(null)
  }

  // Ações por Linha: Alternar para Ignorar Linha
  const handleAlternarIgnorarLinha = (idTemp: string) => {
    setItensContrato((prev) =>
      prev.map((item) => {
        if (item.idTemp !== idTemp) return item
        const proximaDecisao =
          item.decisao === 'ignorar'
            ? item.clienteIdentificadoId
              ? 'vincular'
              : 'criar_cliente'
            : 'ignorar'
        return {
          ...item,
          decisao: proximaDecisao,
        }
      }),
    )
  }

  // Ações por Linha: Abrir seletor manual de cliente ("Não é o mesmo cliente")
  const handleAbrirSeletorCliente = (item: ItemImportacaoContrato) => {
    setItemSelecionandoCliente(item)
    setBuscaClienteModal('')
  }

  // Confirmar cliente selecionado manualmente no modal
  const handleSelecionarClienteManual = (clienteId: string) => {
    if (!itemSelecionandoCliente) return
    const cli = clientes.find((c) => c.id === clienteId)
    if (!cli) return

    setItensContrato((prev) =>
      prev.map((item) => {
        if (item.idTemp !== itemSelecionandoCliente.idTemp) return item
        return {
          ...item,
          decisao: 'vincular',
          clienteSelecionadoId: cli.id,
          clienteSelecionadoNome: cli.nome,
          confiancaMatch: 'alta',
          motivoMatch: 'Vinculado manualmente pelo usuário',
        }
      }),
    )

    toast.success(`Contrato vinculado manualmente a ${cli.nome}.`)
    setItemSelecionandoCliente(null)
  }

  // Abrir Modal de Edição dos Dados do Contrato
  const handleAbrirEdicaoContrato = (item: ItemImportacaoContrato) => {
    setItemEmEdicao(item)
    setEditNumeroContrato(item.numeroContrato || '')
    setEditPlano(item.planoSugerido || 'Essencial')
    setEditValorMensal(item.valorMensal || 250)
    setEditDataInicio(item.dataInicio || '')
    setEditDataTermino(item.dataTermino || '')
    setEditProxVencimento(item.proximoVencimento || '')
    setEditSituacao(item.situacaoOriginal || 'Ativo')
  }

  // Salvar Edição do Contrato
  const handleSalvarEdicaoContrato = (e: React.FormEvent) => {
    e.preventDefault()
    if (!itemEmEdicao) return

    setItensContrato((prev) =>
      prev.map((item) => {
        if (item.idTemp !== itemEmEdicao.idTemp) return item
        return {
          ...item,
          numeroContrato: editNumeroContrato.trim(),
          planoSugerido: editPlano,
          valorMensal: Number(editValorMensal) || 0,
          dataInicio: editDataInicio,
          dataTermino: editDataTermino,
          proximoVencimento: editProxVencimento,
          situacaoOriginal: editSituacao,
          editadoManualmente: true,
        }
      }),
    )

    toast.success('Campos do contrato atualizados!')
    setItemEmEdicao(null)
  }

  // Executar a Importação Definitiva para a base do CRM
  const handleConfirmarImportacao = async () => {
    const itensValidos = itensContrato.filter((i) => i.decisao !== 'ignorar')
    if (itensValidos.length === 0) {
      toast.error('Nenhum contrato ativo para importar. Revise ou inclua as linhas desejadas.')
      return
    }

    const confirmou = window.confirm(
      `Confirma a importação de ${itensValidos.length} contrato(s) O&M para as fichas dos clientes no CRM Delfos Solar?`,
    )
    if (!confirmou) return

    setIsImportando(true)

    let vinculadosCount = 0
    let novosClientesCount = 0
    let ignoradosCount = itensContrato.length - itensValidos.length
    let duplicadosCount = 0
    const falhas: { linha: number; identificador: string; erro: string }[] = []

    // Atualiza mapa de contratos para deduplicação em tempo de lote
    const mapaContratosPorNumero = new Map<string, string>()
    for (const c of contratosOM) {
      if (c.numero_contrato && c.numero_contrato.trim()) {
        mapaContratosPorNumero.set(c.numero_contrato.trim().toLowerCase(), c.id)
      }
    }

    for (let idx = 0; idx < itensValidos.length; idx++) {
      const item = itensValidos[idx]

      try {
        let finalClienteId = item.clienteSelecionadoId

        // Se a decisão é criar novo cliente
        if (item.decisao === 'criar_cliente') {
          const nomeNovo = item.dadosNovoCliente?.nome || item.nomeClienteOriginal
          const cidadeNova = item.dadosNovoCliente?.cidade || 'Erechim/RS'
          const telNovo = item.dadosNovoCliente?.telefone || ''

          const novoCli = await createCliente({
            nome: nomeNovo,
            cidade: cidadeNova,
            telefone: telNovo,
            status: 'Fechado',
            produto: 'Plano de O&M',
            origem_lead: 'Outro',
            observacoes: `Cliente cadastrado automaticamente na Importação de Contratos O&M (Conta Azul Pro). Contrato: ${item.numeroContrato || 'S/N'}.`,
          })

          finalClienteId = novoCli.id
          novosClientesCount++
        }

        if (!finalClienteId) {
          falhas.push({
            linha: idx + 1,
            identificador: item.nomeClienteOriginal,
            erro: 'Cliente não definido para este contrato',
          })
          continue
        }

        const vMensal = Number(item.valorMensal) || 250
        const vAnual = vMensal * 12
        const statusOM: OMStatusPlano = normalizarSituacaoContrato(
          item.situacaoOriginal,
          item.dataTermino,
        )

        const payloadContrato = {
          cliente_id: finalClienteId,
          numero_contrato: item.numeroContrato || '',
          plano: item.planoSugerido || 'Essencial',
          status: statusOM,
          valor_mensal: vMensal,
          valor_anual: vAnual,
          data_inicio: item.dataInicio
            ? new Date(item.dataInicio).toISOString()
            : new Date().toISOString(),
          data_vencimento: item.dataTermino
            ? new Date(item.dataTermino).toISOString()
            : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          proxima_atividade_titulo: `Inspeção e monitoramento preventivo - Plano ${item.planoSugerido}`,
          proxima_atividade_data: item.proximoVencimento
            ? new Date(item.proximoVencimento).toISOString()
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          servicos_realizados: ['Monitoramento da geração em horários comerciais'],
          servicos_agendados: [
            'Relatório mensal de desempenho',
            'Inspeção preventiva semestral',
            'Reaperto e termografia',
          ],
          observacoes: `Contrato importado da Conta Azul Pro em ${new Date().toLocaleDateString('pt-BR')}. Situação original: ${item.situacaoOriginal}.`,
        }

        // Deduplicação por número de contrato se já existir
        const contratoIdExistente = item.numeroContrato
          ? mapaContratosPorNumero.get(item.numeroContrato.trim().toLowerCase())
          : undefined

        if (contratoIdExistente) {
          // Atualiza contrato existente sem duplicar
          await updateContratoOM(contratoIdExistente, payloadContrato)
          duplicadosCount++
        } else {
          // Cria novo contrato O&M na ficha do cliente
          const created = await createContratoOM(payloadContrato)
          if (item.numeroContrato && item.numeroContrato.trim()) {
            mapaContratosPorNumero.set(item.numeroContrato.trim().toLowerCase(), created.id)
          }
        }

        if (item.decisao === 'vincular') {
          vinculadosCount++
        }
      } catch (err: any) {
        console.error(`Falha ao gravar contrato ${item.numeroContrato}:`, err)
        falhas.push({
          linha: idx + 1,
          identificador: `${item.nomeClienteOriginal} (${item.numeroContrato})`,
          erro: err?.message || 'Erro inesperado na gravação',
        })
      }
    }

    await refreshData()
    setIsImportando(false)

    setRelatorio({
      totalLidas: itensContrato.length,
      vinculadosExistentes: vinculadosCount,
      clientesNovosCriados: novosClientesCount,
      ignorados: ignoradosCount,
      duplicadosDeduplicados: duplicadosCount,
      falhas,
    })

    if (falhas.length === 0) {
      toast.success('Importação de contratos concluída com 100% de sucesso!')
    } else {
      toast.warning(`Importação finalizada com ${falhas.length} erro(s). Veja o resumo abaixo.`)
    }
  }

  // Lista de clientes filtrados para o modal de busca manual
  const clientesFiltradosModal = useMemo(() => {
    if (!buscaClienteModal.trim()) return clientes.slice(0, 30)
    const q = buscaClienteModal.toLowerCase().trim()
    return clientes
      .filter((c) => {
        const n = (c.nome || '').toLowerCase()
        const f = (c.nome_fantasia || '').toLowerCase()
        const r = (c.razao_social || '').toLowerCase()
        const cid = (c.cidade || '').toLowerCase()
        return n.includes(q) || f.includes(q) || r.includes(q) || cid.includes(q)
      })
      .slice(0, 30)
  }, [clientes, buscaClienteModal])

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* 1. CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-gray-200/80 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-800 rounded-2xl shrink-0 mt-0.5 shadow-2xs">
            <FileSignature className="w-6 h-6 text-emerald-700" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Operação & Manutenção
              </span>
              <span className="text-[11px] text-gray-500 font-medium">
                Conta Azul Pro / PDF / Word / Excel
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              Importar Contratos O&M
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 max-w-2xl">
              Faça upload de contratos O&M gerados na Conta Azul ou outros sistemas. O Delfos Solar
              reconhece os clientes pelo nome via correspondência fuzzy e permite conferência lado a
              lado.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleCarregarExemplo}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border border-emerald-200 transition-colors shadow-2xs"
            title="Carregar 3 contratos de exemplo para testar os fluxos"
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Carregar Dados de Exemplo</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/manutencoes')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 transition-colors shadow-2xs"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Ver Contratos Ativos</span>
          </button>
        </div>
      </div>

      {/* 2. CARD DE UPLOAD E ENTRADA DE DADOS */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-emerald-700" />
            <h2 className="text-base font-bold text-gray-900">Upload de Arquivo de Contratos</h2>
          </div>

          <button
            type="button"
            onClick={() => setMostrarAreaColarTexto((prev) => !prev)}
            className="inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-800 font-semibold"
          >
            <ClipboardPaste className="w-4 h-4" />
            <span>
              {mostrarAreaColarTexto ? 'Ocultar área de texto' : 'Colar texto manualmente'}
            </span>
          </button>
        </div>

        {/* Zona de Drop / Clique */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const file = e.dataTransfer.files[0]
            if (file) handleUploadArquivo(file)
          }}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            isProcessandoArquivo
              ? 'border-emerald-300 bg-emerald-50/40 pointer-events-none'
              : 'border-gray-300 hover:border-emerald-500 hover:bg-emerald-50/20'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,.docx,.pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleUploadArquivo(file)
            }}
          />

          <div className="flex flex-col items-center justify-center gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full">
              {isProcessandoArquivo ? (
                <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <FileSpreadsheet className="w-8 h-8 text-emerald-700" />
              )}
            </div>

            <div>
              <p className="text-sm font-bold text-gray-900">
                {isProcessandoArquivo
                  ? 'Processando documento e reconhecendo clientes...'
                  : 'Clique para escolher ou arraste o arquivo aqui'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Formatos aceitos: <strong>Excel (.xlsx, .xls)</strong>, <strong>CSV (.csv)</strong>,{' '}
                <strong>Word (.docx)</strong> e <strong>PDF (.pdf)</strong>
              </p>
            </div>

            {arquivoNome && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <FileSignature className="w-3.5 h-3.5" />
                <span>Arquivo carregado: {arquivoNome}</span>
              </div>
            )}
          </div>
        </div>

        {/* Opção Alternativa: Colar Texto Manualmente */}
        {mostrarAreaColarTexto && (
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <ClipboardPaste className="w-4 h-4 text-emerald-600" />
                <span>Colar texto de contratos (extraído da Conta Azul, PDF ou relatório)</span>
              </label>
              <span className="text-[11px] text-gray-500">
                Alternativa caso o PDF não tenha texto selecionável
              </span>
            </div>

            <textarea
              rows={4}
              value={textoManualColado}
              onChange={(e) => setTextoManualColado(e.target.value)}
              placeholder="Exemplo de linhas ou colunas coladas:&#10;Marcelo Becker Agropecuária	CT-2024-0089	01/05/2024	01/05/2025	350,00	Ativo&#10;Maria Santos Alimentos	CT-2024-0104	15/06/2024	15/06/2025	450,00	Ativo"
              className="w-full p-3 text-xs bg-white border border-gray-300 rounded-lg focus:ring-1 focus:ring-emerald-500 font-mono"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setTextoManualColado('')}
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-medium text-gray-600 hover:bg-gray-100"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={handleParsearTextoManual}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
              >
                Interpretar Texto Colado
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. RELATÓRIO PÓS-IMPORTAÇÃO (QUANDO EXECUTADO) */}
      {relatorio && (
        <div className="p-5 sm:p-6 rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/50 shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-emerald-200">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Relatório da Importação Concluída
                </h3>
                <p className="text-xs text-gray-600">
                  Os contratos O&M foram vinculados às fichas correspondentes dos clientes.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/manutencoes')}
              className="px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-2"
            >
              <span>Acessar Tela O&M</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-1">
              <span className="text-[10px] text-gray-500 font-semibold uppercase block">
                Vinculados a Clientes Existentes
              </span>
              <span className="text-lg font-bold text-emerald-700">
                {relatorio.vinculadosExistentes}
              </span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-1">
              <span className="text-[10px] text-gray-500 font-semibold uppercase block">
                Novos Clientes Cadastrados
              </span>
              <span className="text-lg font-bold text-blue-700">
                {relatorio.clientesNovosCriados}
              </span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-1">
              <span className="text-[10px] text-gray-500 font-semibold uppercase block">
                Deduplicados / Atualizados
              </span>
              <span className="text-lg font-bold text-purple-700">
                {relatorio.duplicadosDeduplicados}
              </span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-1">
              <span className="text-[10px] text-gray-500 font-semibold uppercase block">
                Linhas Ignoradas
              </span>
              <span className="text-lg font-bold text-gray-600">{relatorio.ignorados}</span>
            </div>
          </div>

          {relatorio.falhas.length > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-xs">
              <span className="font-bold text-rose-800 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Ocorrências de falha durante o lote ({relatorio.falhas.length})
              </span>
              <ul className="list-disc pl-5 space-y-1 text-rose-700">
                {relatorio.falhas.map((f, i) => (
                  <li key={i}>
                    Linha {f.linha} - {f.identificador}: {f.erro}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 4. PAINEL DE RESUMO E REVISÃO ANTES DE CONFIRMAR */}
      {itensContrato.length > 0 && (
        <div className="space-y-4">
          {/* Card Resumo com Contadores e Botão de Confirmação */}
          <div className="p-5 sm:p-6 bg-white rounded-2xl border border-gray-200/90 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                  Revisão e Vinculação de Contratos
                </span>
                <h3 className="text-lg font-bold text-gray-900">
                  {estatisticas.total} contratos lidos para importação
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Verifique a correspondência dos nomes e confirme ou altere a vinculação para cada
                  linha.
                </p>
              </div>

              {/* Botão de Confirmação Principal */}
              <button
                type="button"
                onClick={handleConfirmarImportacao}
                disabled={isImportando || estatisticas.vinculados + estatisticas.criarNovo === 0}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#16A34A] hover:bg-[#15803D] active:bg-[#166534] disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all hover:scale-[1.01]"
              >
                {isImportando ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Gravando Contratos...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      Confirmar Importação ({estatisticas.vinculados + estatisticas.criarNovo}{' '}
                      contratos)
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Painel de Métricas / Contadores Rápidos */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                  Clientes Identificados
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold text-emerald-900">
                    {estatisticas.identificadosVerde}
                  </span>
                  <span className="text-[11px] text-emerald-700">prontos p/ vincular</span>
                </div>
              </div>

              <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
                  Clientes Não Encontrados
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold text-rose-900">
                    {estatisticas.naoEncontradosVermelho}
                  </span>
                  <span className="text-[11px] text-rose-700">exigem escolha</span>
                </div>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">
                  Novos Clientes a Criar
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold text-blue-900">{estatisticas.criarNovo}</span>
                  <span className="text-[11px] text-blue-700">novos cadastros</span>
                </div>
              </div>

              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                  Linhas Ignoradas
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold text-gray-700">{estatisticas.ignorados}</span>
                  <span className="text-[11px] text-gray-500">não importadas</span>
                </div>
              </div>
            </div>

            {/* Barra de Filtros e Busca */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar por cliente, contrato ou plano..."
                  value={buscaFiltro}
                  onChange={(e) => setBuscaFiltro(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl bg-white focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
                <button
                  type="button"
                  onClick={() => setStatusFiltro('todos')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                    statusFiltro === 'todos'
                      ? 'bg-gray-900 text-white shadow-2xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Todos ({itensContrato.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFiltro('identificados')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                    statusFiltro === 'identificados'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  Identificados ({estatisticas.identificadosVerde})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFiltro('nao_encontrados')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                    statusFiltro === 'nao_encontrados'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                  }`}
                >
                  Não Encontrados ({estatisticas.naoEncontradosVermelho})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFiltro('ignorados')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                    statusFiltro === 'ignorados'
                      ? 'bg-gray-600 text-white shadow-2xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Ignorados ({estatisticas.ignorados})
                </button>
              </div>
            </div>
          </div>

          {/* TABELA DE REVISÃO E VINCULAÇÃO LADO A LADO */}
          <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Status / Match</th>
                    <th className="py-3 px-4 min-w-[280px]">
                      Comparação Lado a Lado (Contrato vs. CRM)
                    </th>
                    <th className="py-3 px-4">Nº Contrato</th>
                    <th className="py-3 px-4">Plano & Valor</th>
                    <th className="py-3 px-4">Datas (Início / Fim)</th>
                    <th className="py-3 px-4">Próx. Vencimento</th>
                    <th className="py-3 px-4">Situação</th>
                    <th className="py-3 px-4 text-right">Ações & Vinculação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {itensFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-400">
                        Nenhum contrato encontrado com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    itensFiltrados.map((item) => {
                      const temMatch = Boolean(
                        item.clienteIdentificadoId &&
                        (item.confiancaMatch === 'alta' || item.confiancaMatch === 'media'),
                      )
                      const isIgnorado = item.decisao === 'ignorar'

                      return (
                        <tr
                          key={item.idTemp}
                          className={`transition-colors hover:bg-gray-50/70 ${
                            isIgnorado
                              ? 'opacity-50 bg-gray-50/40'
                              : temMatch
                                ? 'bg-emerald-50/15'
                                : 'bg-rose-50/15'
                          }`}
                        >
                          {/* 1. Status / Badge de Match */}
                          <td className="py-3.5 px-4 align-top">
                            {temMatch ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                                  Cliente identificado
                                </span>
                                <span className="text-[10px] text-gray-500 block">
                                  {item.motivoMatch}
                                </span>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
                                  <span className="w-2 h-2 rounded-full bg-rose-600" />
                                  Cliente não encontrado
                                </span>
                                <span className="text-[10px] text-gray-500 block">
                                  Selecione ou crie novo
                                </span>
                              </div>
                            )}

                            {item.jaCadastradoNoCRM && (
                              <span className="inline-block mt-1 text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                Nº já existente (Atualizará)
                              </span>
                            )}
                          </td>

                          {/* 2. Comparação Lado a Lado (Nome do Contrato vs. Nome no CRM) */}
                          <td className="py-3.5 px-4 align-top space-y-2">
                            {/* Nome extraído do arquivo */}
                            <div className="p-2 bg-gray-50 rounded-lg border border-gray-200/80">
                              <span className="text-[9px] uppercase font-bold text-gray-400 block tracking-wider">
                                Nome no Contrato (Conta Azul)
                              </span>
                              <div className="font-bold text-gray-900 text-xs">
                                {item.nomeClienteOriginal}
                              </div>
                            </div>

                            {/* Nome no CRM correspondente */}
                            <div
                              className={`p-2 rounded-lg border ${
                                temMatch
                                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                                  : item.decisao === 'criar_cliente'
                                    ? 'bg-blue-50/60 border-blue-200 text-blue-950'
                                    : 'bg-rose-50/60 border-rose-200 text-rose-950'
                              }`}
                            >
                              <span className="text-[9px] uppercase font-bold text-gray-500 block tracking-wider">
                                {item.decisao === 'criar_cliente'
                                  ? 'Ação: Novo Cliente a Cadastrar'
                                  : 'Cliente Correspondente no CRM'}
                              </span>
                              <div className="font-semibold text-xs flex items-center justify-between gap-1">
                                <span className="truncate">
                                  {item.clienteSelecionadoNome ||
                                    item.clienteIdentificadoNome ||
                                    'Nenhum cliente vinculado'}
                                </span>
                                {item.clienteSelecionadoId && (
                                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 3. Número do Contrato */}
                          <td className="py-3.5 px-4 align-top font-mono font-bold text-gray-800">
                            {item.numeroContrato || 'S/N'}
                          </td>

                          {/* 4. Plano & Valor Mensal */}
                          <td className="py-3.5 px-4 align-top">
                            <div className="font-bold text-emerald-700 text-xs">
                              {formatCurrency(item.valorMensal)}/mês
                            </div>
                            <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700">
                              Plano {item.planoSugerido}
                            </span>
                          </td>

                          {/* 5. Datas Início / Término */}
                          <td className="py-3.5 px-4 align-top space-y-0.5 text-gray-700">
                            <div>
                              <span className="text-gray-400 text-[10px]">Início: </span>
                              <span className="font-semibold">
                                {item.dataInicio ? formatDate(item.dataInicio) : 'Não inf.'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400 text-[10px]">Fim: </span>
                              <span className="font-semibold">
                                {item.dataTermino ? formatDate(item.dataTermino) : 'Não inf.'}
                              </span>
                            </div>
                          </td>

                          {/* 6. Próximo Vencimento */}
                          <td className="py-3.5 px-4 align-top text-gray-800 font-semibold">
                            {item.proximoVencimento
                              ? formatDate(item.proximoVencimento)
                              : 'Conforme plano'}
                          </td>

                          {/* 7. Situação */}
                          <td className="py-3.5 px-4 align-top">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-800 border border-gray-200">
                              {item.situacaoOriginal || 'Ativo'}
                            </span>
                          </td>

                          {/* 8. Ações por Linha */}
                          <td className="py-3.5 px-4 align-top text-right">
                            <div className="flex flex-col items-end gap-1.5">
                              {temMatch && item.decisao === 'vincular' && (
                                <button
                                  type="button"
                                  onClick={() => handleAbrirSeletorCliente(item)}
                                  className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 underline"
                                  title="Buscar outro cliente se este não for o correto"
                                >
                                  Não é o mesmo cliente?
                                </button>
                              )}

                              {!temMatch && (
                                <div className="flex flex-wrap items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleAbrirSeletorCliente(item)}
                                    className="px-2.5 py-1 rounded bg-white hover:bg-gray-50 border border-gray-300 text-[11px] font-semibold text-gray-700 shadow-2xs"
                                  >
                                    Vincular manual
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleEscolherCriarNovoLinha(item)}
                                    className={`px-2.5 py-1 rounded text-[11px] font-bold shadow-2xs ${
                                      item.decisao === 'criar_cliente'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                                    }`}
                                  >
                                    Criar novo cliente
                                  </button>
                                </div>
                              )}

                              <div className="flex items-center gap-1.5 mt-1">
                                <button
                                  type="button"
                                  onClick={() => handleAbrirEdicaoContrato(item)}
                                  className="p-1 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                                  title="Editar campos do contrato (valor, datas, número)"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleAlternarIgnorarLinha(item.idTemp)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                                    isIgnorado
                                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                      : 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                                  }`}
                                  title={isIgnorado ? 'Restaurar linha' : 'Ignorar esta linha'}
                                >
                                  {isIgnorado ? 'Restaurar' : 'Ignorar'}
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: SELECIONAR CLIENTE EXISTENTE MANUALMENTE */}
      {itemSelecionandoCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px] animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Users className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Vincular a Cliente Existente
                  </h3>
                  <p className="text-xs text-gray-500">
                    Contrato: "{itemSelecionandoCliente.nomeClienteOriginal}"
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setItemSelecionandoCliente(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Pesquisar por nome, razão social ou cidade..."
                  value={buscaClienteModal}
                  onChange={(e) => setBuscaClienteModal(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
                  autoFocus
                />
              </div>

              <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-xl">
                {clientesFiltradosModal.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelecionarClienteManual(c.id)}
                    className="w-full p-2.5 text-left text-xs hover:bg-emerald-50/70 flex items-center justify-between group transition-colors"
                  >
                    <div>
                      <div className="font-bold text-gray-900 group-hover:text-emerald-800">
                        {c.nome}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {c.cidade || 'Erechim/RS'} {c.razao_social ? `• ${c.razao_social}` : ''}{' '}
                        {c.potencia_kwp ? `(${c.potencia_kwp} kWp)` : ''}
                      </div>
                    </div>
                    <Check className="w-4 h-4 text-emerald-600 opacity-0 group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setItemSelecionandoCliente(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CRIAR NOVO CLIENTE RÁPIDO */}
      {itemCriandoCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px] animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 text-blue-800 rounded-xl">
                  <UserPlus className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Criar Novo Cliente no CRM</h3>
                  <p className="text-xs text-gray-500">
                    Será criado automaticamente na confirmação da importação
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setItemCriandoCliente(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarNovoClienteForm} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Nome do Cliente *</label>
                <input
                  type="text"
                  required
                  value={novoClienteNome}
                  onChange={(e) => setNovoClienteNome(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Cidade / UF</label>
                <input
                  type="text"
                  value={novoClienteCidade}
                  onChange={(e) => setNovoClienteCidade(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  placeholder="(54) 99999-9999"
                  value={novoClienteTelefone}
                  onChange={(e) => setNovoClienteTelefone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setItemCriandoCliente(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs"
                >
                  Confirmar Novo Cadastro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIÇÃO DE CAMPOS DO CONTRATO */}
      {itemEmEdicao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px] animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Edit2 className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Editar Dados do Contrato O&M
                  </h3>
                  <p className="text-xs text-gray-500">
                    Cliente: {itemEmEdicao.nomeClienteOriginal}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setItemEmEdicao(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarEdicaoContrato} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Número do Contrato
                  </label>
                  <input
                    type="text"
                    value={editNumeroContrato}
                    onChange={(e) => setEditNumeroContrato(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Plano O&M *</label>
                  <select
                    value={editPlano}
                    onChange={(e) => setEditPlano(e.target.value as OMPlanoTipo)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="Essencial">Essencial</option>
                    <option value="Prevenção">Prevenção</option>
                    <option value="Completo">Completo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Valor Mensal (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editValorMensal}
                    onChange={(e) => setEditValorMensal(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Situação Original
                  </label>
                  <input
                    type="text"
                    value={editSituacao}
                    onChange={(e) => setEditSituacao(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Data de Início *</label>
                  <input
                    type="date"
                    required
                    value={editDataInicio}
                    onChange={(e) => setEditDataInicio(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Data de Término *
                  </label>
                  <input
                    type="date"
                    required
                    value={editDataTermino}
                    onChange={(e) => setEditDataTermino(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Próximo Vencimento</label>
                <input
                  type="date"
                  value={editProxVencimento}
                  onChange={(e) => setEditProxVencimento(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setItemEmEdicao(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ImportarContratosOM
