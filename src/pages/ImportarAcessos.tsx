import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Database,
  RefreshCw,
  Search,
  Filter,
  Check,
  X,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  ChevronDown,
  Info,
  Radio,
  Eye,
  EyeOff,
  Building2,
  User,
  Zap,
  ArrowLeft,
  Sparkles,
  ExternalLink,
  Lock,
  UserCheck,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import {
  fetchMonitoramentoMarcas,
  fetchAllInversores,
  createClienteInversor,
  updateClienteInversor,
} from '@/services/crmService'
import { parseSpreadsheetFile, ParsedTableData } from '@/lib/spreadsheetParser'
import {
  detectarCabecalhoAcessos,
  extrairLinhasAcessos,
  aplicarModoImportacao,
  ItemImportacaoAcesso,
  ColunasDetectadasAcessos,
  RelatorioImportacaoAcessos,
  ModoImportacaoAcessos,
} from '@/services/importacaoAcessosService'
import { Cliente, ClienteInversor, MonitoramentoMarca } from '@/types/crm'
import { toast } from 'sonner'

export function ImportarAcessos() {
  const navigate = useNavigate()
  const { clientes, refreshData } = useClientes()

  // Estados de dados e catálogo
  const [marcasCadastradas, setMarcasCadastradas] = useState<MonitoramentoMarca[]>([])
  const [inversoresExistentes, setInversoresExistentes] = useState<ClienteInversor[]>([])
  const [isLoadingCatalogo, setIsLoadingCatalogo] = useState<boolean>(true)

  // Estados do arquivo
  const [arquivoNome, setArquivoNome] = useState<string>('')
  const [isProcessandoArquivo, setIsProcessandoArquivo] = useState<boolean>(false)
  const [dadosTabela, setDadosTabela] = useState<ParsedTableData | null>(null)
  const [colunasDetectadas, setColunasDetectadas] = useState<ColunasDetectadasAcessos | null>(null)
  const [mostrarMapeamentoColunas, setMostrarMapeamentoColunas] = useState<boolean>(false)

  // Modo de importação (persistido na sessão do navegador)
  const [modoImportacao, setModoImportacao] = useState<ModoImportacaoAcessos>(() => {
    try {
      const salvo = sessionStorage.getItem('delfos_importar_acessos_modo')
      if (salvo === 'somente_faltam' || salvo === 'atualizar_todos') {
        return salvo
      }
    } catch {
      // Ignora falha de sessionStorage se desabilitado
    }
    return 'atualizar_todos'
  })

  // Itens da Prévia
  const [itensAcesso, setItensAcesso] = useState<ItemImportacaoAcesso[]>([])

  // Filtros da Prévia
  const [buscaTexto, setBuscaTexto] = useState<string>('')
  const [filtroConfianca, setFiltroConfianca] = useState<
    'todos' | 'alta' | 'media' | 'baixa' | 'sem_cliente' | 'ignorados_ja_cadastrados'
  >('todos')
  const [mostrarSenhas, setMostrarSenhas] = useState<boolean>(false)

  // Execução da Importação
  const [isImportando, setIsImportando] = useState<boolean>(false)
  const [progresso, setProgresso] = useState<{ atual: number; total: number; percent: number }>({
    atual: 0,
    total: 0,
    percent: 0,
  })
  const [relatorio, setRelatorio] = useState<RelatorioImportacaoAcessos | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Carregar marcas de monitoramento e inversores atuais para cruzamento e deduplicação
  const carregarDadosApoio = async () => {
    setIsLoadingCatalogo(true)
    try {
      const [marcas, invs] = await Promise.all([fetchMonitoramentoMarcas(), fetchAllInversores()])
      setMarcasCadastradas(marcas)
      setInversoresExistentes(invs)
    } catch (err) {
      console.warn('Erro ao carregar dados de apoio:', err)
    } finally {
      setIsLoadingCatalogo(false)
    }
  }

  useEffect(() => {
    carregarDadosApoio()
  }, [])

  // Agrupar inversores existentes por cliente_id para deduplicação instantânea
  const inversoresPorClienteMap = useMemo(() => {
    const map = new Map<string, ClienteInversor[]>()
    for (const inv of inversoresExistentes) {
      if (!inv.cliente_id) continue
      const list = map.get(inv.cliente_id) || []
      list.push(inv)
      map.set(inv.cliente_id, list)
    }
    return map
  }, [inversoresExistentes])

  // Processa o arquivo .xlsx / .xls / .csv
  const handleUploadArquivo = async (file: File) => {
    setIsProcessandoArquivo(true)
    setRelatorio(null)
    try {
      const parsed = await parseSpreadsheetFile(file)
      if (!parsed.rows || parsed.rows.length === 0) {
        toast.error('O arquivo está vazio ou não possui linhas de dados legíveis.')
        setIsProcessandoArquivo(false)
        return
      }

      setArquivoNome(file.name)
      setDadosTabela(parsed)

      // 1. Detectar cabeçalho automaticamente
      const cols = detectarCabecalhoAcessos(parsed.headers)
      if (!cols) {
        toast.error(
          'Não foi possível identificar as colunas mínimas (CLIENTE, TIPO DE ACESSO). Configure o mapeamento manual.',
        )
        setMostrarMapeamentoColunas(true)
        setIsProcessandoArquivo(false)
        return
      }

      setColunasDetectadas(cols)

      // 2. Extrair e casar linhas da planilha com clientes e marcas
      const itens = extrairLinhasAcessos(
        parsed.rows,
        cols,
        clientes,
        marcasCadastradas,
        inversoresPorClienteMap,
        modoImportacao,
      )

      setItensAcesso(itens)
      toast.success(
        `Planilha processada com sucesso! ${itens.length} linhas de acessos prontas para conferência na prévia.`,
      )
    } catch (err: any) {
      console.error('Erro ao ler planilha de acessos:', err)
      toast.error(
        err?.message ||
          'Não foi possível ler este arquivo. Verifique o formato (.xlsx, .xls ou .csv).',
      )
    } finally {
      setIsProcessandoArquivo(false)
    }
  }

  // Alternar modo de importação e persistir na sessão
  const handleMudarModoImportacao = (novoModo: ModoImportacaoAcessos) => {
    setModoImportacao(novoModo)
    try {
      sessionStorage.setItem('delfos_importar_acessos_modo', novoModo)
    } catch {
      // Ignora erro de storage
    }
    setItensAcesso((prev) =>
      aplicarModoImportacao(prev, novoModo, inversoresPorClienteMap, clientes),
    )
    if (novoModo === 'somente_faltam') {
      toast.info(
        'Modo "Somente os que faltam" ativado: clientes com acessos já cadastrados serão ignorados.',
      )
    } else {
      toast.info('Modo "Atualizar todos" ativado: todas as linhas ativas serão processadas.')
    }
  }

  // Recalcular itens se o usuário alterar o mapeamento manual de colunas
  const handleAtualizarMapeamentoColuna = (
    campo: keyof ColunasDetectadasAcessos,
    valor: string,
  ) => {
    if (!colunasDetectadas || !dadosTabela) return
    const novoCols = { ...colunasDetectadas, [campo]: valor }
    setColunasDetectadas(novoCols)

    const itens = extrairLinhasAcessos(
      dadosTabela.rows,
      novoCols,
      clientes,
      marcasCadastradas,
      inversoresPorClienteMap,
      modoImportacao,
    )
    setItensAcesso(itens)
  }

  // Atualizar cliente selecionado manualmente na tabela de prévia
  const handleMudarClienteItem = (idTemp: string, novoClienteId: string) => {
    const clienteAlvo = clientes.find((c) => c.id === novoClienteId) || null
    setItensAcesso((prev) => {
      const atualizados = prev.map((item) => {
        if (item.idTemp !== idTemp) return item
        return {
          ...item,
          clienteSelecionadoId: clienteAlvo ? clienteAlvo.id : null,
          clienteSelecionadoNome: clienteAlvo ? clienteAlvo.nome : null,
          confiancaMatch: clienteAlvo ? ('alta' as const) : ('nenhuma' as const),
          motivoMatch: clienteAlvo ? 'Vinculado manualmente pelo usuário' : 'Sem cliente vinculado',
          scoreMatch: clienteAlvo ? 1 : 0,
        }
      })
      return aplicarModoImportacao(atualizados, modoImportacao, inversoresPorClienteMap, clientes)
    })
  }

  // Alternar ignorar/incluir item na importação
  const handleToggleIgnorarItem = (idTemp: string) => {
    setItensAcesso((prev) =>
      prev.map((item) => {
        if (item.idTemp !== idTemp) return item
        const novoIgnorado = !item.ignorado
        return {
          ...item,
          ignorado: novoIgnorado,
          // Se o usuário desmarcou o checkbox (ou seja, quer incluir), removemos a trava automática de ignoradoPorJaCadastrado
          ignoradoPorJaCadastrado: novoIgnorado ? item.ignoradoPorJaCadastrado : false,
        }
      }),
    )
  }

  // Alterar ação (criar novo vs atualizar existente)
  const handleMudarAcaoItem = (idTemp: string, novaAcao: 'criar' | 'atualizar' | 'ignorar') => {
    setItensAcesso((prev) =>
      prev.map((item) => {
        if (item.idTemp !== idTemp) return item
        const novoIgnorado = novaAcao === 'ignorar'
        return {
          ...item,
          acao: novaAcao,
          ignorado: novoIgnorado,
          ignoradoPorJaCadastrado: novoIgnorado ? item.ignoradoPorJaCadastrado : false,
        }
      }),
    )
  }

  // Mudar marca mapeada manualmente
  const handleMudarMarcaItem = (idTemp: string, novaMarca: string) => {
    setItensAcesso((prev) =>
      prev.map((item) => (item.idTemp === idTemp ? { ...item, marcaMapeada: novaMarca } : item)),
    )
  }

  // Estatísticas e contadores
  const estatisticas = useMemo(() => {
    const total = itensAcesso.length
    const alta = itensAcesso.filter((i) => i.confiancaMatch === 'alta').length
    const media = itensAcesso.filter((i) => i.confiancaMatch === 'media').length
    const baixa = itensAcesso.filter((i) => i.confiancaMatch === 'baixa').length
    const semCliente = itensAcesso.filter(
      (i) => !i.clienteSelecionadoId || i.confiancaMatch === 'nenhuma',
    ).length

    const ativosParaGravar = itensAcesso.filter((i) => !i.ignorado && i.clienteSelecionadoId).length
    const marcadosIgnorados = itensAcesso.filter((i) => i.ignorado).length
    const ignoradosJaCadastrados = itensAcesso.filter(
      (i) => i.ignorado && (i.ignoradoPorJaCadastrado || i.clienteJaPossuiCredenciais),
    ).length
    const sugeridosAtualizar = itensAcesso.filter(
      (i) => !i.ignorado && i.acao === 'atualizar',
    ).length
    const sugeridosCriar = itensAcesso.filter((i) => !i.ignorado && i.acao === 'criar').length

    return {
      total,
      alta,
      media,
      baixa,
      semCliente,
      ativosParaGravar,
      marcadosIgnorados,
      ignoradosJaCadastrados,
      sugeridosAtualizar,
      sugeridosCriar,
    }
  }, [itensAcesso])

  // Itens filtrados para exibição na tabela
  const itensFiltrados = useMemo(() => {
    return itensAcesso.filter((item) => {
      // Filtro por Confiança / Status
      if (filtroConfianca === 'alta' && item.confiancaMatch !== 'alta') return false
      if (filtroConfianca === 'media' && item.confiancaMatch !== 'media') return false
      if (filtroConfianca === 'baixa' && item.confiancaMatch !== 'baixa') return false
      if (
        filtroConfianca === 'sem_cliente' &&
        item.clienteSelecionadoId &&
        item.confiancaMatch !== 'nenhuma'
      )
        return false
      if (filtroConfianca === 'ignorados_ja_cadastrados') {
        const ehIgnoradoCadastrado =
          item.ignorado && (item.ignoradoPorJaCadastrado || item.clienteJaPossuiCredenciais)
        if (!ehIgnoradoCadastrado) return false
      }

      // Busca por texto
      if (buscaTexto.trim()) {
        const q = buscaTexto.toLowerCase().trim()
        const matchNome = (item.nomePlanilha || '').toLowerCase().includes(q)
        const matchCli = (item.clienteSelecionadoNome || '').toLowerCase().includes(q)
        const matchMarca = (item.marcaMapeada || '').toLowerCase().includes(q)
        const matchTipo = (item.tipoAcessoPlanilha || '').toLowerCase().includes(q)
        const matchLogin = (item.loginPlanilha || '').toLowerCase().includes(q)
        if (!matchNome && !matchCli && !matchMarca && !matchTipo && !matchLogin) return false
      }

      return true
    })
  }, [itensAcesso, filtroConfianca, buscaTexto])

  // Executar a gravação segura e idempotente no PocketBase
  const handleConfirmarImportacao = async () => {
    const itensValidos = itensAcesso.filter((i) => !i.ignorado && i.clienteSelecionadoId)
    if (itensValidos.length === 0) {
      toast.error('Nenhuma linha ativa associada a um cliente para importar.')
      return
    }

    const confirmou = window.confirm(
      `Confirma a gravação de ${itensValidos.length} inversores/acessos no CRM Delfos Solar?`,
    )
    if (!confirmou) return

    setIsImportando(true)
    setProgresso({ atual: 0, total: itensValidos.length, percent: 0 })

    let importadosCriados = 0
    let atualizados = 0
    const ignorados = itensAcesso.length - itensValidos.length
    const ignoradosJaCadastrados = itensAcesso.filter(
      (i) => i.ignorado && (i.ignoradoPorJaCadastrado || i.clienteJaPossuiCredenciais),
    ).length
    const semCliente = itensAcesso.filter(
      (i) => !i.clienteSelecionadoId || i.confiancaMatch === 'nenhuma',
    ).length
    const erros: { linha: number; mensagem: string }[] = []

    // Atualizar mapa local de inversores para prevenir duplicidades durante o próprio lote
    const mapaInversoresLocal = new Map(inversoresPorClienteMap)

    for (let index = 0; index < itensValidos.length; index++) {
      const item = itensValidos[index]
      const clienteId = item.clienteSelecionadoId!

      try {
        const invsDoCli = mapaInversoresLocal.get(clienteId) || []
        const proximaOrdem = invsDoCli.length + 1

        const obsOriginal =
          item.nomePlanilha && item.nomePlanilha !== item.clienteSelecionadoNome
            ? `Nome original na planilha de acessos: "${item.nomePlanilha}"`
            : ''

        if (item.acao === 'atualizar' && item.inversorExistenteId) {
          // Atualiza inversor existente preenchendo credenciais e mantendo demais campos
          const invExistente = invsDoCli.find((i) => i.id === item.inversorExistenteId)
          await updateClienteInversor(item.inversorExistenteId, {
            marca_inversor: item.marcaMapeada || invExistente?.marca_inversor || '',
            app_nome: item.appNome || invExistente?.app_nome || '',
            login: item.loginPlanilha || invExistente?.login || '',
            senha: item.senhaPlanilha || invExistente?.senha || '',
            datalogger_url: item.linkPlanilha || invExistente?.datalogger_url || '',
            observacoes: invExistente?.observacoes
              ? `${invExistente.observacoes} • ${obsOriginal}`
              : obsOriginal,
          })
          atualizados++
        } else {
          // Cria novo registro de inversor
          const criado = await createClienteInversor({
            cliente_id: clienteId,
            marca_inversor: item.marcaMapeada,
            app_nome: item.appNome,
            login: item.loginPlanilha,
            senha: item.senhaPlanilha,
            datalogger_url: item.linkPlanilha,
            observacoes: obsOriginal,
            ordem: proximaOrdem,
          })
          importadosCriados++
          // Atualiza lista local
          mapaInversoresLocal.set(clienteId, [...invsDoCli, criado])
        }
      } catch (err: any) {
        console.error(`Erro ao gravar linha ${item.linhaNum}:`, err)
        erros.push({
          linha: item.linhaNum,
          mensagem: err?.message || 'Falha ao gravar no banco de dados',
        })
      }

      const atual = index + 1
      setProgresso({
        atual,
        total: itensValidos.length,
        percent: Math.round((atual / itensValidos.length) * 100),
      })
    }

    setIsImportando(false)
    setRelatorio({
      totalLidos: itensAcesso.length,
      importadosCriados,
      atualizados,
      ignorados,
      ignoradosJaCadastrados,
      semCliente,
      erros,
    })

    // Recarregar clientes e catálogo para sincronizar com a interface
    await Promise.all([refreshData(), carregarDadosApoio()])

    if (erros.length === 0) {
      toast.success(
        `Importação concluída! ${importadosCriados} criados, ${atualizados} atualizados.`,
      )
    } else {
      toast.warning(
        `Importação finalizada com ${erros.length} aviso(s). Veja o relatório detalhado.`,
      )
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Topo / Breadcrumb & Título */}
      <div className="bg-white rounded-xl border border-gray-200/90 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => navigate('/clientes')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-emerald-700 transition-colors mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar para Base de Clientes
            </button>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-600" />
              Importar Acessos aos Apps de Monitoramento
            </h1>
            <p className="text-xs text-gray-500">
              Faça o upload da planilha (.xlsx/.xls/.csv) com as credenciais de monitoramento dos
              inversores. O sistema faz o cruzamento automático com a base de clientes do CRM.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/clientes')}
              className="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            {dadosTabela && (
              <button
                type="button"
                onClick={() => {
                  setDadosTabela(null)
                  setItensAcesso([])
                  setArquivoNome('')
                  setRelatorio(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                className="px-3 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors inline-flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Limpar Planilha
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Relatório Final de Importação (se concluído) */}
      {relatorio && (
        <div className="bg-white rounded-xl border border-emerald-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Importação de Acessos Concluída!
                </h3>
                <p className="text-xs text-gray-500">
                  Os dados foram sincronizados na coleção de inversores dos clientes
                  (cliente_inversores).
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/clientes')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors"
            >
              Ver Clientes Atualizados
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
              <span className="text-xs text-emerald-700 font-semibold block">Novos Criados</span>
              <span className="text-xl font-bold text-emerald-900">
                {relatorio.importadosCriados}
              </span>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
              <span className="text-xs text-blue-700 font-semibold block">Atualizados</span>
              <span className="text-xl font-bold text-blue-900">{relatorio.atualizados}</span>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
              <span className="text-xs text-purple-700 font-semibold block">
                Ignorados (Já Cadastrados)
              </span>
              <span className="text-xl font-bold text-purple-900">
                {relatorio.ignoradosJaCadastrados}
              </span>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
              <span className="text-xs text-amber-700 font-semibold block">Sem Cliente Casado</span>
              <span className="text-xl font-bold text-amber-900">{relatorio.semCliente}</span>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
              <span className="text-xs text-gray-600 font-semibold block">Total Ignorados</span>
              <span className="text-xl font-bold text-gray-800">{relatorio.ignorados}</span>
            </div>
          </div>

          {relatorio.erros.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 space-y-1">
              <span className="font-bold block">Linhas com falha de gravação:</span>
              <ul className="list-disc pl-5 space-y-0.5">
                {relatorio.erros.map((e, idx) => (
                  <li key={idx}>
                    Linha {e.linha}: {e.mensagem}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Caixa de Upload do Arquivo */}
      {!dadosTabela && (
        <div className="bg-white rounded-xl border border-dashed border-emerald-300 p-8 sm:p-12 text-center space-y-4 hover:border-emerald-500 transition-colors bg-emerald-50/20">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 shadow-xs">
            <Upload className="w-8 h-8" />
          </div>

          <div className="max-w-md mx-auto space-y-1">
            <h2 className="text-base font-bold text-gray-900">
              Selecione a planilha de controle de acessos
            </h2>
            <p className="text-xs text-gray-500">
              Formatos aceitos: <strong>.xlsx, .xls ou .csv</strong> (ex.: aba ACESSO com colunas
              CLIENTE, TIPO DE ACESSO, Login, SENHA, link de acesso).
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleUploadArquivo(file)
              }}
              className="hidden"
              id="file-upload-acessos"
            />
            <label
              htmlFor="file-upload-acessos"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-sm font-bold rounded-xl shadow-md transition-all cursor-pointer"
            >
              {isProcessandoArquivo ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processando Planilha...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Escolher Arquivo do Computador</span>
                </>
              )}
            </label>
          </div>

          <div className="pt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              Processamento local seguro no seu navegador. Nenhuma senha trafega desprotegida.
            </span>
          </div>
        </div>
      )}

      {/* Conteúdo Principal com a Tabela de Prévia e Ações */}
      {dadosTabela && (
        <div className="space-y-4">
          {/* Card de Informações da Planilha e Estatísticas */}
          <div className="bg-white rounded-xl border border-gray-200/90 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <span className="font-bold text-gray-900 text-sm">{arquivoNome}</span>
                <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                  {estatisticas.total} linhas lidas
                </span>
                <span className="text-xs bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full font-semibold">
                  {estatisticas.ativosParaGravar} ativos para salvar
                </span>
                {estatisticas.ignoradosJaCadastrados > 0 && (
                  <span className="text-xs bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-purple-600" />
                    {estatisticas.ignoradosJaCadastrados} já cadastrados ignorados
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setMostrarMapeamentoColunas(!mostrarMapeamentoColunas)}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors inline-flex items-center gap-1.5"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-gray-500" />
                  <span>
                    {mostrarMapeamentoColunas ? 'Ocultar Colunas' : 'Mapeamento de Colunas'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setMostrarSenhas(!mostrarSenhas)}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors inline-flex items-center gap-1.5"
                >
                  {mostrarSenhas ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                  <span>{mostrarSenhas ? 'Ocultar Senhas' : 'Exibir Senhas'}</span>
                </button>
              </div>
            </div>

            {/* Seletor de Modo de Importação */}
            <div className="pt-3 border-t border-gray-100">
              <div className="bg-gradient-to-r from-emerald-50/70 via-gray-50 to-blue-50/50 rounded-xl border border-emerald-200/80 p-3.5 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                        Modo de Importação dos Acessos
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Escolha como tratar linhas cujos clientes já possuem credenciais de inversor
                      cadastradas.
                    </p>
                  </div>

                  <span className="text-[11px] font-semibold text-emerald-700 bg-white/90 border border-emerald-200 px-2.5 py-1 rounded-md shadow-2xs self-start sm:self-auto">
                    {modoImportacao === 'somente_faltam'
                      ? '⚡ Filtrando: apenas os que faltam'
                      : '🔄 Modo padrão: sincronizar todos'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {/* Opção 1: Atualizar todos */}
                  <label
                    className={`relative flex items-start gap-3 p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      modoImportacao === 'atualizar_todos'
                        ? 'bg-white border-emerald-500 shadow-xs ring-1 ring-emerald-500'
                        : 'bg-white/60 border-gray-200 hover:bg-white hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="modo-importacao"
                      value="atualizar_todos"
                      checked={modoImportacao === 'atualizar_todos'}
                      onChange={() => handleMudarModoImportacao('atualizar_todos')}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <div className="space-y-0.5 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-gray-900">Atualizar todos</span>
                        <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded">
                          Padrão
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-600 leading-snug">
                        Cria novos inversores e atualiza existentes sem duplicar credenciais
                        idênticas. Processa todas as linhas ativas.
                      </p>
                    </div>
                  </label>

                  {/* Opção 2: Somente os que faltam */}
                  <label
                    className={`relative flex items-start gap-3 p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      modoImportacao === 'somente_faltam'
                        ? 'bg-white border-purple-500 shadow-xs ring-1 ring-purple-500'
                        : 'bg-white/60 border-gray-200 hover:bg-white hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="modo-importacao"
                      value="somente_faltam"
                      checked={modoImportacao === 'somente_faltam'}
                      onChange={() => handleMudarModoImportacao('somente_faltam')}
                      className="mt-0.5 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                    />
                    <div className="space-y-0.5 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-gray-900">Somente os que faltam</span>
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-100 border border-purple-200 px-1.5 py-0.2 rounded">
                          Reimportação Segura
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-600 leading-snug">
                        Desconsidera automaticamente clientes que{' '}
                        <strong>já possuem credenciais</strong> cadastradas no banco (login ou senha
                        preenchidos). Ideal para completar linhas faltantes.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Painel expansível de Mapeamento de Colunas */}
            {mostrarMapeamentoColunas && colunasDetectadas && (
              <div className="pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 bg-gray-50/60 p-3 rounded-lg text-xs">
                <div>
                  <label className="font-bold text-gray-600 block mb-1">Coluna CLIENTE</label>
                  <select
                    value={colunasDetectadas.clienteCol}
                    onChange={(e) => handleAtualizarMapeamentoColuna('clienteCol', e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded p-1.5 text-xs"
                  >
                    {dadosTabela.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-600 block mb-1">TIPO DE ACESSO</label>
                  <select
                    value={colunasDetectadas.tipoAcessoCol}
                    onChange={(e) =>
                      handleAtualizarMapeamentoColuna('tipoAcessoCol', e.target.value)
                    }
                    className="w-full bg-white border border-gray-300 rounded p-1.5 text-xs"
                  >
                    {dadosTabela.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-600 block mb-1">Login</label>
                  <select
                    value={colunasDetectadas.loginCol}
                    onChange={(e) => handleAtualizarMapeamentoColuna('loginCol', e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded p-1.5 text-xs"
                  >
                    {dadosTabela.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-600 block mb-1">SENHA</label>
                  <select
                    value={colunasDetectadas.senhaCol}
                    onChange={(e) => handleAtualizarMapeamentoColuna('senhaCol', e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded p-1.5 text-xs"
                  >
                    {dadosTabela.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-600 block mb-1">Link de Acesso</label>
                  <select
                    value={colunasDetectadas.linkCol}
                    onChange={(e) => handleAtualizarMapeamentoColuna('linkCol', e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded p-1.5 text-xs"
                  >
                    {dadosTabela.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Badges de Confiança do Matching e Filtros Rápidos */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setFiltroConfianca(filtroConfianca === 'alta' ? 'todos' : 'alta')}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  filtroConfianca === 'alta'
                    ? 'bg-emerald-100 border-emerald-400 ring-1 ring-emerald-500'
                    : 'bg-emerald-50/50 border-emerald-200 hover:bg-emerald-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-800">Alta Confiança</span>
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-200/80 text-emerald-900">
                    {estatisticas.alta}
                  </span>
                </div>
                <span className="text-[10px] text-emerald-700 block mt-0.5">
                  Nome ou e-mail exato no CRM
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFiltroConfianca(filtroConfianca === 'media' ? 'todos' : 'media')}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  filtroConfianca === 'media'
                    ? 'bg-blue-100 border-blue-400 ring-1 ring-blue-500'
                    : 'bg-blue-50/50 border-blue-200 hover:bg-blue-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-800">Média Confiança</span>
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-blue-200/80 text-blue-900">
                    {estatisticas.media}
                  </span>
                </div>
                <span className="text-[10px] text-blue-700 block mt-0.5">
                  Similaridade fonética/substring
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFiltroConfianca(filtroConfianca === 'baixa' ? 'todos' : 'baixa')}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  filtroConfianca === 'baixa'
                    ? 'bg-amber-100 border-amber-400 ring-1 ring-amber-500'
                    : 'bg-amber-50/50 border-amber-200 hover:bg-amber-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-800">Baixa Confiança</span>
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-amber-200/80 text-amber-900">
                    {estatisticas.baixa}
                  </span>
                </div>
                <span className="text-[10px] text-amber-700 block mt-0.5">
                  Conferir vínculo sugerido
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setFiltroConfianca(filtroConfianca === 'sem_cliente' ? 'todos' : 'sem_cliente')
                }
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  filtroConfianca === 'sem_cliente'
                    ? 'bg-red-100 border-red-400 ring-1 ring-red-500'
                    : 'bg-red-50/50 border-red-200 hover:bg-red-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-red-800">Não Encontrados</span>
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-red-200/80 text-red-900">
                    {estatisticas.semCliente}
                  </span>
                </div>
                <span className="text-[10px] text-red-700 block mt-0.5">
                  Vincular cliente manualmente
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setFiltroConfianca(
                    filtroConfianca === 'ignorados_ja_cadastrados'
                      ? 'todos'
                      : 'ignorados_ja_cadastrados',
                  )
                }
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  filtroConfianca === 'ignorados_ja_cadastrados'
                    ? 'bg-purple-100 border-purple-400 ring-1 ring-purple-500'
                    : 'bg-purple-50/50 border-purple-200 hover:bg-purple-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-purple-800">Já Cadastrados</span>
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-purple-200/80 text-purple-900">
                    {estatisticas.ignoradosJaCadastrados}
                  </span>
                </div>
                <span className="text-[10px] text-purple-700 block mt-0.5">
                  Ignorados por dados existentes
                </span>
              </button>
            </div>
          </div>

          {/* Barra de Filtros e Busca Rápida na Prévia */}
          <div className="bg-white rounded-xl border border-gray-200/80 p-3 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={buscaTexto}
                onChange={(e) => setBuscaTexto(e.target.value)}
                placeholder="Filtrar por cliente, marca, app ou login..."
                className="w-full text-xs pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
              />
              {buscaTexto && (
                <button
                  type="button"
                  onClick={() => setBuscaTexto('')}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-gray-500">
              <span>Exibindo</span>
              <strong className="text-gray-800">{itensFiltrados.length}</strong>
              <span>de</span>
              <strong className="text-gray-800">{itensAcesso.length}</strong>
              <span>linhas</span>
              {filtroConfianca !== 'todos' && (
                <button
                  type="button"
                  onClick={() => setFiltroConfianca('todos')}
                  className="text-emerald-700 font-bold hover:underline ml-2"
                >
                  Ver Todos
                </button>
              )}
            </div>
          </div>

          {/* Tabela de Prévia Interativa */}
          <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#F8FAF9] border-b border-gray-200 text-[11px] font-bold text-gray-700 uppercase tracking-wider sticky top-0 z-10 shadow-2xs">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-12">#</th>
                    <th className="py-2.5 px-3">Cliente na Planilha</th>
                    <th className="py-2.5 px-3 min-w-[240px]">Cliente Casado no CRM</th>
                    <th className="py-2.5 px-3">Marca Inversor</th>
                    <th className="py-2.5 px-3">Tipo / App</th>
                    <th className="py-2.5 px-3">Login</th>
                    <th className="py-2.5 px-3">Senha</th>
                    <th className="py-2.5 px-3">Link Datalogger</th>
                    <th className="py-2.5 px-3 text-center">Ação</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {itensFiltrados.map((item) => {
                    const isBaixaOuSem =
                      item.confiancaMatch === 'baixa' || item.confiancaMatch === 'nenhuma'
                    const isIgnoradoJaCadastrado =
                      item.ignorado &&
                      (item.ignoradoPorJaCadastrado || item.clienteJaPossuiCredenciais)

                    return (
                      <tr
                        key={item.idTemp}
                        className={`transition-colors ${
                          isIgnoradoJaCadastrado
                            ? 'bg-purple-50/40 text-gray-500 hover:bg-purple-50/70'
                            : item.ignorado
                              ? 'bg-gray-100/70 text-gray-400 opacity-60'
                              : isBaixaOuSem
                                ? 'bg-amber-50/30 hover:bg-amber-50/60'
                                : 'hover:bg-emerald-50/40'
                        }`}
                      >
                        {/* Linha / Ignorar Toggle */}
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={!item.ignorado}
                            onChange={() => handleToggleIgnorarItem(item.idTemp)}
                            title={
                              item.ignorado
                                ? 'Incluir manualmente na importação'
                                : 'Desmarcar / Ignorar linha'
                            }
                            className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                        </td>

                        {/* Nome Original na Planilha */}
                        <td className="py-2 px-3 font-semibold text-gray-900 max-w-[200px] truncate">
                          <div className="flex items-center gap-1.5" title={item.nomePlanilha}>
                            <span>
                              {item.nomePlanilha || (
                                <em className="text-gray-400 font-normal">Vazio</em>
                              )}
                            </span>
                          </div>
                        </td>

                        {/* Cliente Casado no CRM (com Select manual para override) */}
                        <td className="py-2 px-3">
                          <div className="space-y-1">
                            <select
                              value={item.clienteSelecionadoId || ''}
                              onChange={(e) => handleMudarClienteItem(item.idTemp, e.target.value)}
                              className={`w-full text-xs py-1 px-2 rounded-md border focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer ${
                                item.confiancaMatch === 'alta'
                                  ? 'bg-emerald-50/50 text-emerald-900 border-emerald-300 font-medium'
                                  : item.confiancaMatch === 'media'
                                    ? 'bg-blue-50/50 text-blue-900 border-blue-300 font-medium'
                                    : item.confiancaMatch === 'baixa'
                                      ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold'
                                      : 'bg-red-50 text-red-800 border-red-300 font-bold'
                              }`}
                            >
                              <option value="">-- Não Encontrado (Escolha Manual) --</option>
                              {clientes.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.nome} {c.cidade ? `(${c.cidade})` : ''}
                                </option>
                              ))}
                            </select>

                            {/* Badge do motivo do match */}
                            <div className="flex items-center gap-1 text-[10px]">
                              {item.confiancaMatch === 'alta' && (
                                <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  {item.motivoMatch}
                                </span>
                              )}
                              {item.confiancaMatch === 'media' && (
                                <span className="text-blue-700 font-medium flex items-center gap-0.5">
                                  <Info className="w-3 h-3 text-blue-600" />
                                  {item.motivoMatch}
                                </span>
                              )}
                              {item.confiancaMatch === 'baixa' && (
                                <span className="text-amber-800 font-bold flex items-center gap-0.5">
                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                  {item.motivoMatch}
                                </span>
                              )}
                              {item.confiancaMatch === 'nenhuma' && (
                                <span className="text-red-600 font-semibold flex items-center gap-0.5">
                                  <X className="w-3 h-3" />
                                  {item.motivoMatch}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Marca Mapeada */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          <input
                            type="text"
                            value={item.marcaMapeada}
                            onChange={(e) => handleMudarMarcaItem(item.idTemp, e.target.value)}
                            placeholder="Marca..."
                            className="w-28 text-xs py-1 px-2 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-gray-800 bg-gray-50/50"
                          />
                        </td>

                        {/* Tipo / App Original */}
                        <td
                          className="py-2 px-3 text-gray-600 max-w-[140px] truncate"
                          title={item.tipoAcessoPlanilha}
                        >
                          {item.tipoAcessoPlanilha || '-'}
                        </td>

                        {/* Login */}
                        <td
                          className="py-2 px-3 text-gray-700 font-mono text-[11px] max-w-[130px] truncate"
                          title={item.loginPlanilha}
                        >
                          {item.loginPlanilha || (
                            <em className="text-gray-400 font-sans">Sem login</em>
                          )}
                        </td>

                        {/* Senha */}
                        <td
                          className="py-2 px-3 text-gray-700 font-mono text-[11px] max-w-[140px] truncate"
                          title={item.senhaPlanilha}
                        >
                          {item.senhaPlanilha ? (
                            mostrarSenhas ? (
                              item.senhaPlanilha
                            ) : (
                              '••••••••'
                            )
                          ) : (
                            <em className="text-gray-400 font-sans">Sem senha</em>
                          )}
                        </td>

                        {/* Link Datalogger */}
                        <td className="py-2 px-3 text-gray-600 max-w-[140px] truncate">
                          {item.linkPlanilha ? (
                            <a
                              href={
                                item.linkPlanilha.startsWith('http')
                                  ? item.linkPlanilha
                                  : `http://${item.linkPlanilha}`
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-700 hover:underline flex items-center gap-1 font-mono text-[11px]"
                              title={item.linkPlanilha}
                            >
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              <span className="truncate">{item.linkPlanilha}</span>
                            </a>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>

                        {/* Ação: Criar Novo vs Atualizar ou Badge de Já Cadastrado */}
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          {isIgnoradoJaCadastrado ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-300 cursor-help shadow-2xs"
                                title={
                                  item.motivoJaCadastrado ||
                                  'Cliente já possui dados de acesso (login ou senha) cadastrados no banco de dados. Linha desconsiderada no modo "Somente os que faltam". Para forçar a importação, marque o checkbox da linha.'
                                }
                              >
                                <UserCheck className="w-3 h-3 text-purple-700 shrink-0" />
                                <span>Já cadastrado — ignorado</span>
                              </span>
                              <span className="text-[9px] text-purple-700/80 font-medium">
                                Modo: somente faltantes
                              </span>
                            </div>
                          ) : item.inversorExistenteId ? (
                            <select
                              value={item.acao}
                              onChange={(e) =>
                                handleMudarAcaoItem(item.idTemp, e.target.value as any)
                              }
                              className="text-[10px] font-bold py-0.5 px-1.5 rounded border border-blue-300 bg-blue-50 text-blue-800 cursor-pointer"
                            >
                              <option value="atualizar">Atualizar Existente</option>
                              <option value="criar">Criar Novo Inversor</option>
                              <option value="ignorar">Ignorar Linha</option>
                            </select>
                          ) : item.ignorado ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-300">
                              Ignorado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Novo Inversor
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Barra Inferior com Confirmação e Progresso */}
          <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-4 z-20">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-gray-900">
                  Pronto para gravar {estatisticas.ativosParaGravar} inversor(es)
                </span>
                {estatisticas.sugeridosAtualizar > 0 && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-semibold">
                    {estatisticas.sugeridosAtualizar} atualizações
                  </span>
                )}
                {estatisticas.ignoradosJaCadastrados > 0 && (
                  <span className="text-xs bg-purple-100 text-purple-900 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 border border-purple-200">
                    <UserCheck className="w-3 h-3 text-purple-700" />
                    {estatisticas.ignoradosJaCadastrados} já cadastrados ignorados
                  </span>
                )}
                {estatisticas.semCliente > 0 && (
                  <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold">
                    {estatisticas.semCliente} sem cliente casado
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                {modoImportacao === 'somente_faltam'
                  ? 'Modo ativo: "Somente os que faltam". Linhas de clientes que já possuem acessos cadastrados não serão modificadas.'
                  : 'Modo ativo: "Atualizar todos". Linhas ativas serão salvas/atualizadas no CRM.'}
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => navigate('/clientes')}
                disabled={isImportando}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={handleConfirmarImportacao}
                disabled={isImportando || estatisticas.ativosParaGravar === 0}
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isImportando ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>
                      Gravando ({progresso.atual}/{progresso.total} - {progresso.percent}%)
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar e Gravar no CRM</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ImportarAcessos
