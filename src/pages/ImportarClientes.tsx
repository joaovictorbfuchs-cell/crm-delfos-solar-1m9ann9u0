import React, { useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Database,
  RefreshCw,
  Building2,
  User,
  Sparkles,
  Info,
  Check,
  ChevronDown,
  X,
  SlidersHorizontal,
  Table as TableIcon,
  HelpCircle,
  FileText,
  RotateCcw,
  ShieldCheck,
  ArrowLeftRight,
  GitMerge,
  EyeOff,
  UserCheck,
  Layers,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { StatusBadge } from '@/components/StatusBadge'
import { parseSpreadsheetFile, ParsedTableData } from '@/lib/spreadsheetParser'
import {
  ImportFonte,
  CAMPOS_DESTINO_IMPORTACAO,
  autoDetectarMapeamento,
  normalizarLinhaParaCliente,
  ClienteImportadoNormalizado,
  limparDocumento,
} from '@/services/importacaoClientesService'
import {
  ItemRevisaoPipedrive,
  encontrarCorrespondenciaCliente,
  mesclarDadosPipedriveNoCadastro,
  DecisaoRevisaoItem,
} from '@/lib/deduplicacaoPipedrive'
import { EXEMPLO_PIPEDRIVE, EXEMPLO_CONTA_AZUL } from '@/data/exemplosImportacao'
import { formatCurrency } from '@/lib/formatters'
import { toast } from 'sonner'

export type AcaoDuplicado = 'atualizar' | 'ignorar'

export default function ImportarClientes() {
  const navigate = useNavigate()
  const { clientes, addCliente, updateCliente } = useClientes()

  // Fonte ativa: pipedrive ou conta_azul
  const [fonteAtiva, setFonteAtiva] = useState<ImportFonte>('pipedrive')

  // Estado dos dados brutos carregados
  const [arquivoNome, setArquivoNome] = useState<string>('')
  const [dadosTabela, setDadosTabela] = useState<ParsedTableData | null>(null)
  const [mapeamentoColunas, setMapeamentoColunas] = useState<Record<string, string>>({})
  const [isProcessandoArquivo, setIsProcessandoArquivo] = useState<boolean>(false)
  const [mostrarMapeamentoAvancado, setMostrarMapeamentoAvancado] = useState<boolean>(false)

  // Etapa ativa para o Pipedrive: 'upload' | 'revisao'
  const [etapaPipedrive, setEtapaPipedrive] = useState<'upload' | 'revisao'>('upload')

  // Estado da Revisão e Deduplicação do Pipedrive (persistido durante a revisão)
  const [itensRevisao, setItensRevisao] = useState<ItemRevisaoPipedrive[]>([])
  const [filtroRevisao, setFiltroRevisao] = useState<'todos' | 'duplicados' | 'leads'>('todos')

  // Resolução de Duplicados tradicional (para Conta Azul)
  const [decisaoDuplicados, setDecisaoDuplicados] = useState<Record<string, AcaoDuplicado>>({})
  const [acaoDuplicadosGlobal, setAcaoDuplicadosGlobal] = useState<AcaoDuplicado | null>(null)

  // Estado de execução da importação
  const [isImportando, setIsImportando] = useState<boolean>(false)
  const [progressoImportacao, setProgressoImportacao] = useState<number>(0)
  const [resultadoFinal, setResultadoFinal] = useState<{
    total: number
    inseridos: number
    atualizados: number
    ignorados: number
    erros: number
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Troca de fonte
  const handleSelecionarFonte = (fonte: ImportFonte) => {
    if (fonte === fonteAtiva) return
    setFonteAtiva(fonte)
    // Limpar estados anteriores da outra fonte
    setDadosTabela(null)
    setArquivoNome('')
    setMapeamentoColunas({})
    setDecisaoDuplicados({})
    setAcaoDuplicadosGlobal(null)
    setResultadoFinal(null)
    setMostrarMapeamentoAvancado(false)
    setEtapaPipedrive('upload')
    setItensRevisao([])
  }

  // Gera a lista de revisão para o Pipedrive comparando com clientes existentes do sistema
  const inicializarRevisaoPipedrive = (
    parsed: ParsedTableData,
    mapping: Record<string, string>,
  ) => {
    const revisao: ItemRevisaoPipedrive[] = parsed.rows.map((row, index) => {
      const normalizado = normalizarLinhaParaCliente(
        row,
        mapping,
        'pipedrive',
        index,
        parsed.headers,
      )

      // Comparação inteligente com a base de clientes (Conta Azul e cadastros prévios)
      const correspondencia = encontrarCorrespondenciaCliente(
        {
          nome: normalizado.nome,
          cpf: normalizado.cpf,
          cnpj: normalizado.cnpj,
          telefone: normalizado.telefone,
          whatsapp: normalizado.whatsapp,
          email: normalizado.email,
        },
        clientes,
      )

      if (correspondencia) {
        return {
          idTemp: normalizado.idTemp,
          nome: normalizado.nome,
          telefone: normalizado.telefone,
          whatsapp: normalizado.whatsapp,
          email: normalizado.email,
          cpf: normalizado.cpf,
          cnpj: normalizado.cnpj,
          cidade: normalizado.cidade,
          estado: normalizado.estado,
          endereco: normalizado.endereco,
          // Requisito: "Nestes casos, o status deve ser automaticamente 'Cliente' (já fechou negócio)"
          statusSugerido: 'Fechado',
          tipo_pessoa: normalizado.tipo_pessoa,
          valor_estimado: normalizado.valor_estimado,
          data_ultimo_contato: normalizado.data_ultimo_contato,
          dados_importados: normalizado.dados_importados,
          isDuplicadoContaAzul: true,
          correspondencia,
          acaoDuplicado: 'atualizar', // Padrão: atualizar dados
          aprovadoParaImportar: true,
        }
      }

      // Requisito: "Para os registros do Pipedrive que não encontraram correspondência no Conta Azul,
      // classifique automaticamente como 'Possível Cliente / Lead' (ainda não fechou negócio).
      // Estes devem aparecer na lista para revisão com um check de confirmação antes de serem importados."
      return {
        idTemp: normalizado.idTemp,
        nome: normalizado.nome,
        telefone: normalizado.telefone,
        whatsapp: normalizado.whatsapp,
        email: normalizado.email,
        cpf: normalizado.cpf,
        cnpj: normalizado.cnpj,
        cidade: normalizado.cidade,
        estado: normalizado.estado,
        endereco: normalizado.endereco,
        statusSugerido: 'Novo Lead',
        tipo_pessoa: normalizado.tipo_pessoa,
        valor_estimado: normalizado.valor_estimado,
        data_ultimo_contato: normalizado.data_ultimo_contato,
        dados_importados: normalizado.dados_importados,
        isDuplicadoContaAzul: false,
        acaoDuplicado: 'atualizar',
        aprovadoParaImportar: true, // Marcado por padrão
      }
    })

    setItensRevisao(revisao)
    setEtapaPipedrive('revisao')
  }

  // Carregar dados de arquivo real (XLSX ou CSV)
  const handleUploadArquivo = async (file: File) => {
    setIsProcessandoArquivo(true)
    setResultadoFinal(null)
    try {
      const parsed = await parseSpreadsheetFile(file)
      if (!parsed.rows || parsed.rows.length === 0) {
        toast.error('O arquivo está vazio ou não possui linhas de dados.')
        setIsProcessandoArquivo(false)
        return
      }

      setArquivoNome(file.name)
      setDadosTabela(parsed)

      // Auto detecção de colunas
      const autoMap = autoDetectarMapeamento(parsed.headers, fonteAtiva)
      setMapeamentoColunas(autoMap)
      setDecisaoDuplicados({})
      setAcaoDuplicadosGlobal(null)

      if (fonteAtiva === 'pipedrive') {
        inicializarRevisaoPipedrive(parsed, autoMap)
        toast.success(
          `Planilha processada! ${parsed.rows.length} registros prontos para revisão e deduplicação.`,
        )
      } else {
        toast.success(
          `Planilha processada! ${parsed.rows.length} clientes encontrados com colunas auto-identificadas.`,
        )
      }
    } catch (err: any) {
      console.error('Erro ao ler planilha:', err)
      toast.error(
        err?.message || 'Erro ao processar o arquivo. Verifique o formato (.xlsx ou .csv).',
      )
    } finally {
      setIsProcessandoArquivo(false)
    }
  }

  // Carregar dataset de exemplo simulado
  const handleCarregarExemplo = (fonte: ImportFonte) => {
    setIsProcessandoArquivo(true)
    setResultadoFinal(null)
    setTimeout(() => {
      const dadosExemplo = fonte === 'pipedrive' ? EXEMPLO_PIPEDRIVE : EXEMPLO_CONTA_AZUL
      const nomeSimulado =
        fonte === 'pipedrive'
          ? 'export_pipedrive_deals_clientes_2026.xlsx'
          : 'export_contaazul_clientes_ativos_2026.xlsx'

      setArquivoNome(nomeSimulado)
      setDadosTabela(dadosExemplo)

      const autoMap = autoDetectarMapeamento(dadosExemplo.headers, fonte)
      setMapeamentoColunas(autoMap)
      setDecisaoDuplicados({})
      setAcaoDuplicadosGlobal(null)

      if (fonte === 'pipedrive') {
        inicializarRevisaoPipedrive(dadosExemplo, autoMap)
        toast.success(
          `Planilha de exemplo do Pipedrive carregada: 2 duplicados do Conta Azul e 3 leads novos prontos para revisão!`,
        )
      } else {
        toast.success(
          `Exemplo do Conta Azul carregado com sucesso (${dadosExemplo.rows.length} clientes simulados)!`,
        )
      }
      setIsProcessandoArquivo(false)
    }, 200)
  }

  // Alterar mapeamento manual de um campo de destino
  const handleAlterarMapeamento = (campoKey: string, colunaSelecionada: string) => {
    const updated = { ...mapeamentoColunas }
    if (!colunaSelecionada) {
      delete updated[campoKey]
    } else {
      updated[campoKey] = colunaSelecionada
    }
    setMapeamentoColunas(updated)

    // Se estiver no Pipedrive, recalcular a revisão com o novo mapeamento
    if (fonteAtiva === 'pipedrive' && dadosTabela) {
      inicializarRevisaoPipedrive(dadosTabela, updated)
    }
  }

  // Redefinir detecção automática
  const handleRedefinirMapeamento = () => {
    if (!dadosTabela) return
    const autoMap = autoDetectarMapeamento(dadosTabela.headers, fonteAtiva)
    setMapeamentoColunas(autoMap)
    if (fonteAtiva === 'pipedrive') {
      inicializarRevisaoPipedrive(dadosTabela, autoMap)
    }
    toast.info('Mapeamento redefinido para a detecção automática padrão.')
  }

  // Normalização tradicional (para Conta Azul)
  const clientesNormalizadosContaAzul = useMemo<ClienteImportadoNormalizado[]>(() => {
    if (!dadosTabela || fonteAtiva !== 'conta_azul') return []

    return dadosTabela.rows.map((row, index) => {
      const normalizado = normalizarLinhaParaCliente(
        row,
        mapeamentoColunas,
        'conta_azul',
        index,
        dadosTabela.headers,
      )

      const docClean = limparDocumento(normalizado.cpf || normalizado.cnpj)
      const emailLower = (normalizado.email || '').toLowerCase().trim()

      const duplicado = clientes.find((existente) => {
        if (docClean && docClean.length >= 11) {
          const docExistente = limparDocumento(existente.cpf || existente.cnpj || '')
          if (docExistente && docExistente === docClean) return true
        }
        if (emailLower && existente.email && existente.email.toLowerCase().trim() === emailLower) {
          return true
        }
        return false
      })

      if (duplicado) {
        let motivo: 'cpf' | 'cnpj' | 'email' = 'email'
        if (
          normalizado.cnpj &&
          duplicado.cnpj &&
          limparDocumento(normalizado.cnpj) === limparDocumento(duplicado.cnpj)
        ) {
          motivo = 'cnpj'
        } else if (
          normalizado.cpf &&
          duplicado.cpf &&
          limparDocumento(normalizado.cpf) === limparDocumento(duplicado.cpf)
        ) {
          motivo = 'cpf'
        }

        return {
          ...normalizado,
          isDuplicado: true,
          duplicadoPor: motivo,
          clienteExistenteId: duplicado.id,
          clienteExistenteNome: duplicado.nome,
        }
      }

      return normalizado
    })
  }, [dadosTabela, mapeamentoColunas, fonteAtiva, clientes])

  // Contadores para o Pipedrive
  const contadoresPipedrive = useMemo(() => {
    const duplicadosEncontrados = itensRevisao.filter((i) => i.isDuplicadoContaAzul).length
    const duplicadosAtualizar = itensRevisao.filter(
      (i) => i.isDuplicadoContaAzul && i.acaoDuplicado === 'atualizar',
    ).length
    const duplicadosIgnorados = itensRevisao.filter(
      (i) => i.isDuplicadoContaAzul && i.acaoDuplicado === 'ignorar',
    ).length

    const leadsNovosTotal = itensRevisao.filter((i) => !i.isDuplicadoContaAzul).length
    const leadsNovosImportar = itensRevisao.filter(
      (i) => !i.isDuplicadoContaAzul && i.aprovadoParaImportar,
    ).length
    const leadsNovosDesmarcados = leadsNovosTotal - leadsNovosImportar

    const totalIgnorados = duplicadosIgnorados + leadsNovosDesmarcados
    const totalAprovados = duplicadosAtualizar + leadsNovosImportar

    return {
      total: itensRevisao.length,
      duplicadosEncontrados,
      duplicadosAtualizar,
      duplicadosIgnorados,
      leadsNovosTotal,
      leadsNovosImportar,
      leadsNovosDesmarcados,
      totalIgnorados,
      totalAprovados,
    }
  }, [itensRevisao])

  // Ações de alteração na revisão do Pipedrive
  const handleDefinirAcaoDuplicadoPipedrive = (idTemp: string, acao: DecisaoRevisaoItem) => {
    setItensRevisao((prev) =>
      prev.map((item) => (item.idTemp === idTemp ? { ...item, acaoDuplicado: acao } : item)),
    )
  }

  const handleToggleLeadAprovado = (idTemp: string) => {
    setItensRevisao((prev) =>
      prev.map((item) =>
        item.idTemp === idTemp
          ? { ...item, aprovadoParaImportar: !item.aprovadoParaImportar }
          : item,
      ),
    )
  }

  const handleMarcarTodosLeads = (aprovado: boolean) => {
    setItensRevisao((prev) =>
      prev.map((item) =>
        !item.isDuplicadoContaAzul ? { ...item, aprovadoParaImportar: aprovado } : item,
      ),
    )
  }

  const handleDefinirAcaoTodosDuplicados = (acao: DecisaoRevisaoItem) => {
    setItensRevisao((prev) =>
      prev.map((item) => (item.isDuplicadoContaAzul ? { ...item, acaoDuplicado: acao } : item)),
    )
    toast.info(
      `Todos os duplicados foram definidos para: ${acao === 'atualizar' ? 'Atualizar Dados' : 'Ignorar'}`,
    )
  }

  // Itens filtrados para exibição na lista de revisão
  const itensRevisaoFiltrados = useMemo(() => {
    if (filtroRevisao === 'duplicados') {
      return itensRevisao.filter((i) => i.isDuplicadoContaAzul)
    }
    if (filtroRevisao === 'leads') {
      return itensRevisao.filter((i) => !i.isDuplicadoContaAzul)
    }
    return itensRevisao
  }, [itensRevisao, filtroRevisao])

  // Execução da Importação para o Pipedrive (Revisão & Deduplicação)
  const handleExecutarImportacaoPipedrive = async () => {
    if (itensRevisao.length === 0) {
      toast.error('Nenhum cliente para importar.')
      return
    }

    if (contadoresPipedrive.totalAprovados === 0) {
      toast.error('Nenhum registro foi aprovado para importação.')
      return
    }

    setIsImportando(true)
    setProgressoImportacao(0)

    let inseridos = 0
    let atualizados = 0
    let ignorados = 0
    let erros = 0

    const total = itensRevisao.length

    for (let i = 0; i < total; i++) {
      const item = itensRevisao[i]

      try {
        if (item.isDuplicadoContaAzul) {
          if (item.acaoDuplicado === 'ignorar') {
            ignorados++
          } else if (item.correspondencia?.clienteContaAzul) {
            // Requisito: Atualizar dados (mescla informações novas do Pipedrive no cadastro existente)
            const dadosMesclados = mesclarDadosPipedriveNoCadastro(
              item.correspondencia.clienteContaAzul,
              item,
            )
            await updateCliente(item.correspondencia.clienteContaAzul.id, dadosMesclados)
            atualizados++
          }
        } else {
          // Lead novo do Pipedrive
          if (!item.aprovadoParaImportar) {
            ignorados++
          } else {
            // Requisito: "Para os registros do Pipedrive que não encontraram correspondência no Conta Azul,
            // classifique automaticamente como 'Possível Cliente / Lead' (ainda não fechou negócio)."
            await addCliente({
              nome: item.nome,
              tipo_pessoa: item.tipo_pessoa,
              cpf: item.cpf || undefined,
              cnpj: item.cnpj || undefined,
              telefone: item.telefone,
              whatsapp: item.whatsapp || item.telefone,
              email: item.email,
              cidade: item.cidade || 'Erechim',
              estado: item.estado || 'RS',
              endereco: item.endereco,
              // Status Lead para quem não fechou negócio
              status: 'Novo Lead',
              valor_estimado: item.valor_estimado || 0,
              potencia_kwp: item.valor_estimado
                ? Math.round((item.valor_estimado / 3600) * 10) / 10
                : 5.5,
              produto: 'Energia Solar',
              origem_lead: 'Outro',
              como_conheceu: 'Pipedrive',
              observacoes: `Importado do Pipedrive CRM como Possível Cliente / Lead em ${new Date().toLocaleDateString('pt-BR')}`,
              dados_importados: item.dados_importados || undefined,
              uc: '',
              data_instalacao: '',
              inversor_marca: 'Deye',
              inversor_modelo: '',
              placas_marca: 'Canadian Solar',
              placas_qtd: 0,
              telhado_tipo: 'ceramico',
            })
            inseridos++
          }
        }
      } catch (err) {
        console.error(`Erro ao importar ${item.nome}:`, err)
        erros++
      }

      setProgressoImportacao(Math.round(((i + 1) / total) * 100))
    }

    setIsImportando(false)
    setResultadoFinal({
      total,
      inseridos,
      atualizados,
      ignorados,
      erros,
    })

    toast.success(
      `Importação do Pipedrive concluída! ${inseridos} leads novos criados, ${atualizados} cadastros atualizados e ${ignorados} ignorados.`,
    )
  }

  // Execução tradicional para Conta Azul
  const handleExecutarImportacaoContaAzul = async () => {
    if (clientesNormalizadosContaAzul.length === 0) {
      toast.error('Nenhum cliente para importar.')
      return
    }

    setIsImportando(true)
    setProgressoImportacao(0)

    let inseridos = 0
    let atualizados = 0
    let ignorados = 0
    let erros = 0

    const total = clientesNormalizadosContaAzul.length

    for (let i = 0; i < total; i++) {
      const item = clientesNormalizadosContaAzul[i]

      try {
        if (item.isDuplicado && item.clienteExistenteId) {
          const acao = decisaoDuplicados[item.idTemp] || acaoDuplicadosGlobal || 'atualizar'

          if (acao === 'ignorar') {
            ignorados++
          } else {
            await updateCliente(item.clienteExistenteId, {
              telefone: item.telefone || undefined,
              whatsapp: item.whatsapp || undefined,
              email: item.email || undefined,
              cidade: item.cidade || undefined,
              estado: item.estado || undefined,
              status: item.status,
              valor_estimado: item.valor_estimado || undefined,
              observacoes: item.observacoes,
              dados_importados: item.dados_importados || undefined,
            })
            atualizados++
          }
        } else {
          await addCliente({
            nome: item.nome,
            tipo_pessoa: item.tipo_pessoa,
            cpf: item.cpf || undefined,
            cnpj: item.cnpj || undefined,
            telefone: item.telefone,
            whatsapp: item.whatsapp,
            email: item.email,
            cidade: item.cidade,
            estado: item.estado,
            endereco: item.endereco,
            status: item.status,
            valor_estimado: item.valor_estimado,
            potencia_kwp: item.valor_estimado
              ? Math.round((item.valor_estimado / 3600) * 10) / 10
              : 5.5,
            produto: item.produto,
            origem_lead: item.origem_lead,
            como_conheceu: item.como_conheceu,
            observacoes: item.observacoes,
            dados_importados: item.dados_importados || undefined,
            uc: '',
            data_instalacao: '',
            inversor_marca: 'Deye',
            inversor_modelo: '',
            placas_marca: 'Canadian Solar',
            placas_qtd: 0,
            telhado_tipo: 'ceramico',
          })
          inseridos++
        }
      } catch (err) {
        console.error(`Erro ao importar cliente ${item.nome}:`, err)
        erros++
      }

      setProgressoImportacao(Math.round(((i + 1) / total) * 100))
    }

    setIsImportando(false)
    setResultadoFinal({
      total,
      inseridos,
      atualizados,
      ignorados,
      erros,
    })

    toast.success(
      `Importação concluída! ${inseridos} inseridos, ${atualizados} atualizados, ${ignorados} ignorados.`,
    )
  }

  // Resetar visualização
  const handleLimparDados = () => {
    setDadosTabela(null)
    setArquivoNome('')
    setMapeamentoColunas({})
    setDecisaoDuplicados({})
    setAcaoDuplicadosGlobal(null)
    setResultadoFinal(null)
    setEtapaPipedrive('upload')
    setItensRevisao([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Cabeçalho da Página */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
              <Upload className="w-3.5 h-3.5 text-emerald-600" />
              <span>Integração e Carga de Leads</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Importar Clientes via Planilha
            </h1>
            <p className="text-sm text-gray-500">
              Faça a migração ou sincronização rápida de clientes e negócios a partir do{' '}
              <strong className="text-gray-700">Pipedrive</strong> ou{' '}
              <strong className="text-gray-700">Conta Azul</strong>. O sistema realiza detecção e
              deduplicação inteligente contra a base de clientes já cadastrados.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/clientes')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors shrink-0"
          >
            <span>Ver Base de Clientes</span>
            <ArrowRight className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Abas das Fontes: Pipedrive vs Conta Azul */}
        <div className="mt-6 pt-5 border-t border-gray-100 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => handleSelecionarFonte('pipedrive')}
            className={`flex items-center gap-3 px-5 py-3 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
              fonteAtiva === 'pipedrive'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/40'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${
                fonteAtiva === 'pipedrive'
                  ? 'bg-white text-emerald-700'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              PD
            </div>
            <div className="text-left">
              <div className="leading-tight flex items-center gap-2">
                <span>1. Importar do Pipedrive</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-100">
                  Deduplicação Ativa
                </span>
              </div>
              <div
                className={`text-[11px] font-normal ${
                  fonteAtiva === 'pipedrive' ? 'text-emerald-100' : 'text-gray-400'
                }`}
              >
                Revisão lado a lado vs. Conta Azul
              </div>
            </div>
            {fonteAtiva === 'pipedrive' && <Check className="w-4 h-4 ml-2" />}
          </button>

          <button
            type="button"
            onClick={() => handleSelecionarFonte('conta_azul')}
            className={`flex items-center gap-3 px-5 py-3 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
              fonteAtiva === 'conta_azul'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/40'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${
                fonteAtiva === 'conta_azul'
                  ? 'bg-white text-emerald-700'
                  : 'bg-blue-100 text-blue-800'
              }`}
            >
              CA
            </div>
            <div className="text-left">
              <div className="leading-tight">2. Importar do Conta Azul</div>
              <div
                className={`text-[11px] font-normal ${
                  fonteAtiva === 'conta_azul' ? 'text-emerald-100' : 'text-gray-400'
                }`}
              >
                Cadastros fiscais, CPF/CNPJ e contatos
              </div>
            </div>
            {fonteAtiva === 'conta_azul' && <Check className="w-4 h-4 ml-2" />}
          </button>
        </div>
      </div>

      {/* Seção Principal de Upload e Simulação (quando não há arquivo carregado) */}
      {!dadosTabela && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Caixa de Upload Drag & Drop */}
          <div className="lg:col-span-2 bg-white rounded-2xl border-2 border-dashed border-gray-300 hover:border-emerald-500 transition-colors p-8 sm:p-10 text-center flex flex-col items-center justify-center space-y-4 shadow-xs">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleUploadArquivo(file)
              }}
            />

            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-inner">
              <FileSpreadsheet className="w-8 h-8 text-emerald-600 stroke-[1.8]" />
            </div>

            <div className="space-y-1.5 max-w-md">
              <h3 className="text-lg font-bold text-gray-900">
                Selecione o arquivo Excel do{' '}
                {fonteAtiva === 'pipedrive' ? 'Pipedrive' : 'Conta Azul'}
              </h3>
              <p className="text-xs text-gray-500">
                {fonteAtiva === 'pipedrive'
                  ? 'Após o upload, cada linha será comparada automaticamente com clientes do Conta Azul (CPF/CNPJ, nome parecido, telefone ou email) com etapa de revisão e deduplicação lado a lado.'
                  : 'Suporta planilhas exportadas em formato .xlsx ou .csv com auto-identificação de colunas e prevenção de duplicidades.'}
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                disabled={isProcessandoArquivo}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#16A34A] hover:bg-[#15803D] active:scale-[0.98] text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                <span>Escolher Arquivo .xlsx / .csv</span>
              </button>
            </div>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-[11px] text-gray-400">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Detecção inteligente de
                colunas
              </span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Deduplicação contra Conta
                Azul
              </span>
              <span className="flex items-center gap-1">
                <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-600" /> Comparação lado a lado
              </span>
            </div>
          </div>

          {/* Card de Demonstração / Dados de Exemplo */}
          <div className="bg-gradient-to-br from-emerald-50/70 via-white to-gray-50 rounded-2xl border border-emerald-200/80 p-6 flex flex-col justify-between shadow-xs">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100/70 text-emerald-900 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Ambiente de Demonstração</span>
                </div>
                <span className="text-xs text-gray-500 font-mono">
                  {fonteAtiva === 'pipedrive' ? '5 registros' : '6 clientes'}
                </span>
              </div>

              <h4 className="text-base font-bold text-gray-900">
                {fonteAtiva === 'pipedrive'
                  ? 'Testar Etapa de Revisão e Deduplicação'
                  : 'Ainda não tem o arquivo real em mãos?'}
              </h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                {fonteAtiva === 'pipedrive'
                  ? 'Carregue a planilha demo contendo exatamente 2 clientes duplicados já cadastrados do Conta Azul e 3 leads novos do Pipedrive para validar o fluxo de revisão lado a lado e resumo final.'
                  : 'Carregue uma planilha de exemplo autêntica do Conta Azul para testar a prévia, o mapeamento e a resolução de duplicados.'}
              </p>

              <div className="bg-white/80 rounded-xl p-3 border border-emerald-100 text-xs space-y-1.5 text-gray-600">
                <div className="font-semibold text-emerald-900 text-[11px] uppercase tracking-wider">
                  {fonteAtiva === 'pipedrive'
                    ? 'Cenário configurado para teste:'
                    : 'O que está incluído no exemplo:'}
                </div>
                {fonteAtiva === 'pipedrive' ? (
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-gray-600">
                    <li>
                      <strong className="text-amber-800">2 Duplicados do Conta Azul:</strong> Ademar
                      Fiorini (CPF/tel/email) e Ademar Emilio Berlanda (nome parecido/CPF)
                    </li>
                    <li>
                      <strong className="text-emerald-800">3 Leads Novos do Pipedrive:</strong>{' '}
                      Coop. Alfa RS, Dr. Eduardo Fontana e Lucas Menegat
                    </li>
                    <li>Classificação automática: Status "Cliente" vs "Possível Cliente / Lead"</li>
                  </ul>
                ) : (
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-gray-600">
                    <li>6 clientes fictícios detalhados (PF e PJ)</li>
                    <li>Mapeamento de valores, telefones e status</li>
                    <li>1 cliente intencionalmente duplicado para teste</li>
                  </ul>
                )}
              </div>
            </div>

            <button
              type="button"
              disabled={isProcessandoArquivo}
              onClick={() => handleCarregarExemplo(fonteAtiva)}
              className="mt-6 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-emerald-50 text-emerald-800 border-2 border-emerald-600 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer hover:shadow"
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>
                {fonteAtiva === 'pipedrive'
                  ? 'Carregar Planilha de Exemplo (2 Dup + 3 Leads)'
                  : 'Simular Prévia com Dados de Exemplo'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Barra de Status do Arquivo Carregado */}
      {dadosTabela && (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0">
              <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900 text-sm">{arquivoNome}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Fonte: {fonteAtiva === 'pipedrive' ? 'Pipedrive' : 'Conta Azul'}
                </span>
                {fonteAtiva === 'pipedrive' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                    Etapa: Revisão & Deduplicação
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                {dadosTabela.rows.length} registros detectados •{' '}
                {Object.keys(mapeamentoColunas).length} colunas mapeadas
                {fonteAtiva === 'pipedrive' &&
                  ` • ${contadoresPipedrive.duplicadosEncontrados} duplicata(s) e ${contadoresPipedrive.leadsNovosTotal} lead(s) novo(s)`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setMostrarMapeamentoAvancado(!mostrarMapeamentoAvancado)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-gray-500" />
              <span>
                {mostrarMapeamentoAvancado ? 'Ocultar De-Para' : 'Ajustar Mapeamento de Colunas'}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-gray-400 transition-transform ${
                  mostrarMapeamentoAvancado ? 'rotate-180' : ''
                }`}
              />
            </button>

            <button
              type="button"
              onClick={handleLimparDados}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-xs font-semibold text-red-600 transition-colors"
              title="Trocar arquivo"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Trocar Arquivo</span>
            </button>
          </div>
        </div>
      )}

      {/* Painel Expansível de Ajuste De-Para de Colunas */}
      {dadosTabela && mostrarMapeamentoAvancado && (
        <div className="bg-white rounded-2xl border border-emerald-200/90 p-5 shadow-xs space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
                Mapeamento de Colunas (De-Para)
              </h3>
              <p className="text-xs text-gray-500">
                Se alguma coluna não foi identificada automaticamente, selecione a coluna
                correspondente abaixo.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRedefinirMapeamento}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Redefinir Detecção Automática
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Campos Padrão do CRM Delfos Solar
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {CAMPOS_DESTINO_IMPORTACAO.map((campo) => {
                  const valorAtual = mapeamentoColunas[campo.key] || ''
                  return (
                    <div
                      key={campo.key}
                      className="space-y-1.5 p-3 rounded-xl bg-gray-50/70 border border-gray-200"
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-800 flex items-center gap-1">
                          {campo.label}
                          {campo.required && <span className="text-red-500">*</span>}
                        </label>
                        {valorAtual ? (
                          <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100 px-1.5 py-0.2 rounded">
                            Detectado
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400 font-mono">Não mapeado</span>
                        )}
                      </div>
                      <select
                        value={valorAtual}
                        onChange={(e) => handleAlterarMapeamento(campo.key, e.target.value)}
                        className="w-full text-xs bg-white border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      >
                        <option value="">-- Ignorar ou Não Mapear --</option>
                        {dadosTabela.headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-gray-400 leading-tight">{campo.description}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Seção de Colunas Adicionais da Planilha */}
            {(() => {
              const colunasMapeadasPadrao = new Set(
                CAMPOS_DESTINO_IMPORTACAO.map((c) => mapeamentoColunas[c.key]).filter(Boolean),
              )
              const colunasExtras = dadosTabela.headers.filter((h) => !colunasMapeadasPadrao.has(h))

              return (
                <div className="pt-3 border-t border-gray-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        <span>Colunas Extras da Planilha (Salvas em Dados da Importação)</span>
                      </div>
                      <p className="text-[11px] text-gray-500">
                        Todas as colunas abaixo são salvas no cadastro do cliente em{' '}
                        <code>dados_importados</code> para que nenhuma informação se perca.
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {colunasExtras.length} campo(s) extra(s)
                    </span>
                  </div>

                  {colunasExtras.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {colunasExtras.map((header) => (
                        <div
                          key={header}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50/70 border border-blue-200 text-xs text-blue-900"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="font-semibold">{header}</span>
                          <span className="text-[10px] text-blue-500 bg-white/80 px-1 py-0.2 rounded border border-blue-100">
                            Auto-salvo
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">
                      Todas as colunas da planilha estão mapeadas diretamente nos campos padrão do
                      CRM.
                    </p>
                  )}
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* FLUXO 1: PIPEDRIVE - ETAPA DE REVISÃO E DEDUPLICAÇÃO */}
      {/* ============================================================== */}
      {fonteAtiva === 'pipedrive' && dadosTabela && !resultadoFinal && (
        <div className="space-y-6">
          {/* Banner Explicativo da Etapa de Deduplicação */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 rounded-2xl border border-emerald-200/90 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span>Etapa de Revisão e Deduplicação Inteligente</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
                    Critérios: CPF/CNPJ, Nome similar, Telefone e E-mail
                  </span>
                </h3>
                <p className="text-xs text-gray-600 max-w-3xl leading-relaxed">
                  Cada linha do Pipedrive foi comparada com os clientes já cadastrados (Conta Azul).
                  Registros correspondentes estão marcados como{' '}
                  <strong className="text-amber-800">"Cliente já cadastrado — Duplicata"</strong>{' '}
                  com os dados lado a lado e status automático <strong>"Cliente"</strong>. Registros
                  sem correspondência foram classificados como{' '}
                  <strong className="text-emerald-800">"Possível Cliente / Lead"</strong> com check
                  de confirmação.
                </p>
              </div>
            </div>

            {/* Filtros rápidos da revisão */}
            <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-gray-200 shadow-2xs shrink-0 self-stretch md:self-auto justify-center">
              <button
                type="button"
                onClick={() => setFiltroRevisao('todos')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  filtroRevisao === 'todos'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Todos ({itensRevisao.length})
              </button>
              <button
                type="button"
                onClick={() => setFiltroRevisao('duplicados')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                  filtroRevisao === 'duplicados'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-amber-800 hover:bg-amber-50'
                }`}
              >
                <span>Duplicatas</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-900 font-bold">
                  {contadoresPipedrive.duplicadosEncontrados}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setFiltroRevisao('leads')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                  filtroRevisao === 'leads'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-blue-800 hover:bg-blue-50'
                }`}
              >
                <span>Leads Novos</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-900 font-bold">
                  {contadoresPipedrive.leadsNovosTotal}
                </span>
              </button>
            </div>
          </div>

          {/* Ações em Lote para a Revisão */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-bold text-gray-700">Ações em lote para revisão:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDefinirAcaoTodosDuplicados('atualizar')}
                  className="px-2.5 py-1 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-semibold transition-colors flex items-center gap-1"
                >
                  <GitMerge className="w-3.5 h-3.5" />
                  <span>Atualizar Todas as Duplicatas</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDefinirAcaoTodosDuplicados('ignorar')}
                  className="px-2.5 py-1 rounded-lg border border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100 font-semibold transition-colors flex items-center gap-1"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Ignorar Todas as Duplicatas</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleMarcarTodosLeads(true)}
                className="px-2.5 py-1 rounded-lg border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 font-semibold transition-colors flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Marcar Todos os Leads</span>
              </button>
              <button
                type="button"
                onClick={() => handleMarcarTodosLeads(false)}
                className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 font-semibold transition-colors"
              >
                Desmarcar Todos os Leads
              </button>
            </div>
          </div>

          {/* Lista de Cards da Revisão */}
          <div className="space-y-4">
            {itensRevisaoFiltrados.map((item, index) => {
              // ==========================================================
              // CARD DE CORRESPONDÊNCIA / DUPLICATA (Lado a Lado)
              // ==========================================================
              if (item.isDuplicadoContaAzul && item.correspondencia) {
                const cAzul = item.correspondencia.clienteContaAzul

                return (
                  <div
                    key={item.idTemp}
                    className={`rounded-2xl border-2 transition-all p-5 shadow-xs ${
                      item.acaoDuplicado === 'atualizar'
                        ? 'bg-amber-50/40 border-amber-300'
                        : 'bg-gray-50/80 border-gray-300 opacity-75'
                    }`}
                  >
                    {/* Cabeçalho do Card de Duplicata */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-200/80">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shadow-xs">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Cliente já cadastrado — Duplicata</span>
                        </span>

                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Status Automático: Cliente (Fechado)
                        </span>

                        <span className="text-xs text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-200 font-mono">
                          Critério: {item.correspondencia.detalhe}
                        </span>
                      </div>

                      {/* Botões de Ação para o Duplicado */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            handleDefinirAcaoDuplicadoPipedrive(item.idTemp, 'atualizar')
                          }
                          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            item.acaoDuplicado === 'atualizar'
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-emerald-50'
                          }`}
                        >
                          <GitMerge className="w-3.5 h-3.5" />
                          <span>Atualizar Dados</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDefinirAcaoDuplicadoPipedrive(item.idTemp, 'ignorar')
                          }
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            item.acaoDuplicado === 'ignorar'
                              ? 'bg-gray-800 text-white border-gray-900 shadow-xs'
                              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Ignorar Linha</span>
                        </button>
                      </div>
                    </div>

                    {/* Comparação Lado a Lado: Pipedrive vs Conta Azul */}
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Lado Esquerdo: Registro do Pipedrive (Importado) */}
                      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px]">
                              PD
                            </div>
                            <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                              Registro do Pipedrive (Planilha)
                            </span>
                          </div>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            Novos Dados
                          </span>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div>
                            <span className="text-gray-400 block text-[11px]">Nome / Empresa:</span>
                            <span className="font-bold text-gray-900 text-sm">{item.nome}</span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-gray-400 block text-[11px]">CPF / CNPJ:</span>
                              <span className="font-mono text-gray-800">
                                {item.cpf || item.cnpj || '-'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400 block text-[11px]">
                                Telefone / Celular:
                              </span>
                              <span className="text-gray-800">{item.telefone || '-'}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-gray-400 block text-[11px]">E-mail:</span>
                              <span className="text-gray-800 truncate block" title={item.email}>
                                {item.email || '-'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400 block text-[11px]">Cidade / UF:</span>
                              <span className="text-gray-800">
                                {item.cidade || 'Erechim'} / {item.estado || 'RS'}
                              </span>
                            </div>
                          </div>

                          <div className="pt-1 flex items-center justify-between text-[11px]">
                            <span className="text-gray-500">Valor Estimado do Deal:</span>
                            <span className="font-bold text-emerald-700">
                              {formatCurrency(item.valor_estimado)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Lado Direito: Cadastro Existente no Conta Azul */}
                      <div className="bg-emerald-50/50 rounded-xl border border-emerald-200/80 p-4 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[10px]">
                              CA
                            </div>
                            <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                              Cadastro Existente no CRM (Conta Azul)
                            </span>
                          </div>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Base Atual
                          </span>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div>
                            <span className="text-gray-400 block text-[11px]">Nome Atual:</span>
                            <span className="font-bold text-gray-900 text-sm">{cAzul.nome}</span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-gray-400 block text-[11px]">
                                CPF / CNPJ Atual:
                              </span>
                              <span className="font-mono text-gray-800">
                                {cAzul.cpf || cAzul.cnpj || '-'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400 block text-[11px]">
                                Telefone Atual:
                              </span>
                              <span className="text-gray-800">
                                {cAzul.telefone || cAzul.whatsapp || '-'}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-gray-400 block text-[11px]">E-mail Atual:</span>
                              <span className="text-gray-800 truncate block" title={cAzul.email}>
                                {cAzul.email || '-'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400 block text-[11px]">
                                Cidade / UF Atual:
                              </span>
                              <span className="text-gray-800">
                                {cAzul.cidade || '-'} / {cAzul.estado || 'RS'}
                              </span>
                            </div>
                          </div>

                          <div className="pt-1 flex items-center justify-between text-[11px]">
                            <span className="text-gray-500">Status Atual:</span>
                            <StatusBadge status={cAzul.status} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Rodapé com Informação da Ação Escolhida */}
                    <div className="mt-3 pt-2 text-xs flex items-center justify-between text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-gray-400" />
                        <span>
                          {item.acaoDuplicado === 'atualizar'
                            ? 'Ação: As informações novas do Pipedrive serão mescladas no cadastro existente, preservando campos do Conta Azul e atualizando o status para Cliente.'
                            : 'Ação: Esta linha será ignorada e nenhuma alteração será feita no cadastro existente.'}
                        </span>
                      </div>
                      <span className="font-bold">
                        {item.acaoDuplicado === 'atualizar' ? (
                          <span className="text-emerald-700">✓ Aprovado para Mesclagem</span>
                        ) : (
                          <span className="text-gray-500">✕ Marcado para Ignorar</span>
                        )}
                      </span>
                    </div>
                  </div>
                )
              }

              // ==========================================================
              // CARD DE LEAD NOVO (Sem Correspondência)
              // ==========================================================
              return (
                <div
                  key={item.idTemp}
                  className={`rounded-2xl border-2 transition-all p-5 shadow-xs ${
                    item.aprovadoParaImportar
                      ? 'bg-white border-emerald-200 hover:border-emerald-300'
                      : 'bg-gray-50/90 border-gray-200 opacity-60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={item.aprovadoParaImportar}
                          onChange={() => handleToggleLeadAprovado(item.idTemp)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300 cursor-pointer"
                        />
                        <span className="font-bold text-sm text-gray-900">{item.nome}</span>
                      </label>

                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                        <UserCheck className="w-3 h-3 text-blue-600" />
                        Possível Cliente / Lead
                      </span>

                      <span className="text-[11px] text-gray-400">
                        (Sem correspondência no Conta Azul)
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] text-gray-400 block uppercase">
                          Status ao Importar:
                        </span>
                        <StatusBadge status="Novo Lead" />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleLeadAprovado(item.idTemp)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                          item.aprovadoParaImportar
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}
                      >
                        {item.aprovadoParaImportar ? '✓ Selecionado' : '+ Selecionar para Importar'}
                      </button>
                    </div>
                  </div>

                  {/* Detalhes do Lead Novo */}
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-gray-400 block text-[11px]">Telefone / Celular:</span>
                      <span className="text-gray-800">{item.telefone || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[11px]">E-mail:</span>
                      <span className="text-gray-800 truncate block" title={item.email}>
                        {item.email || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[11px]">CPF / CNPJ:</span>
                      <span className="font-mono text-gray-800">
                        {item.cpf || item.cnpj || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[11px]">Cidade / UF:</span>
                      <span className="text-gray-800">
                        {item.cidade || 'Erechim'} / {item.estado || 'RS'}
                      </span>
                    </div>
                  </div>

                  {item.valor_estimado > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                      <span>Valor Estimado do Deal (Pipedrive):</span>
                      <span className="font-bold text-gray-900">
                        {formatCurrency(item.valor_estimado)}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* ============================================================== */}
          {/* RESUMO FINAL E CONFIRMAÇÃO DA IMPORTAÇÃO */}
          {/* ============================================================== */}
          <div className="bg-white rounded-2xl border-2 border-emerald-500 p-6 shadow-md space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Resumo Final da Revisão do Pipedrive
                  </h3>
                </div>
                <p className="text-xs text-gray-500">
                  Revise o balanço final antes de gravar os dados no CRM Delfos Solar. O botão
                  "Confirmar Importação" salvará apenas os registros aprovados.
                </p>
              </div>

              {/* Botão Principal de Confirmação */}
              <button
                type="button"
                disabled={isImportando || contadoresPipedrive.totalAprovados === 0}
                onClick={handleExecutarImportacaoPipedrive}
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-[#16A34A] hover:bg-[#15803D] active:scale-[0.98] text-white text-base font-bold rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer disabled:opacity-50 shrink-0"
              >
                {isImportando ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Processando ({progressoImportacao}%)...</span>
                  </>
                ) : (
                  <>
                    <Database className="w-5 h-5 stroke-[2.2]" />
                    <span>
                      Confirmar Importação ({contadoresPipedrive.totalAprovados} aprovados)
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Os 3 Contadores Obrigatórios conforme Especificação:
                1. Quantos clientes duplicados foram encontrados
                2. Quantos leads novos serão importados
                3. Quantos foram ignorados */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {/* Contador 1: Duplicados Encontrados */}
              <div className="bg-amber-50/80 border-2 border-amber-200 rounded-xl p-4 text-center space-y-1 shadow-2xs">
                <div className="text-3xl font-black text-amber-800">
                  {contadoresPipedrive.duplicadosEncontrados}
                </div>
                <div className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                  Clientes Duplicados Encontrados
                </div>
                <p className="text-[11px] text-amber-700">
                  {contadoresPipedrive.duplicadosAtualizar} com "Atualizar Dados" •{' '}
                  {contadoresPipedrive.duplicadosIgnorados} ignorado(s)
                </p>
              </div>

              {/* Contador 2: Leads Novos a Importar */}
              <div className="bg-emerald-50/80 border-2 border-emerald-200 rounded-xl p-4 text-center space-y-1 shadow-2xs">
                <div className="text-3xl font-black text-emerald-800">
                  {contadoresPipedrive.leadsNovosImportar}
                </div>
                <div className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                  Leads Novos a Importar
                </div>
                <p className="text-[11px] text-emerald-700">
                  Classificados como Possível Cliente / Lead (com confirmação)
                </p>
              </div>

              {/* Contador 3: Registros Ignorados */}
              <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 text-center space-y-1 shadow-2xs">
                <div className="text-3xl font-black text-gray-700">
                  {contadoresPipedrive.totalIgnorados}
                </div>
                <div className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                  Registros Ignorados
                </div>
                <p className="text-[11px] text-gray-500">
                  {contadoresPipedrive.duplicadosIgnorados} duplicata(s) +{' '}
                  {contadoresPipedrive.leadsNovosDesmarcados} lead(s) desmarcado(s)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* FLUXO 2: CONTA AZUL (Tabela Tradicional de Importação) */}
      {/* ============================================================== */}
      {fonteAtiva === 'conta_azul' && dadosTabela && !resultadoFinal && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden space-y-4">
            <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <TableIcon className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-gray-900 text-sm">
                    Prévia dos Dados do Conta Azul ({clientesNormalizadosContaAzul.length} clientes)
                  </h3>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Revise os dados fiscais e cadastrais mapeados antes de confirmar.
                </p>
              </div>

              <button
                type="button"
                disabled={isImportando}
                onClick={handleExecutarImportacaoContaAzul}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#16A34A] hover:bg-[#15803D] active:scale-[0.98] text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 shrink-0"
              >
                {isImportando ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Importando ({progressoImportacao}%)...</span>
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4 stroke-[2.2]" />
                    <span>Confirmar Importação do Conta Azul</span>
                  </>
                )}
              </button>
            </div>

            {/* Tabela do Conta Azul */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAF9] border-y border-gray-200 text-gray-600 uppercase font-semibold text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Razão Social / Nome</th>
                    <th className="py-3 px-4">Telefone</th>
                    <th className="py-3 px-4">E-mail</th>
                    <th className="py-3 px-4">CPF / CNPJ</th>
                    <th className="py-3 px-4">Cidade / UF</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {clientesNormalizadosContaAzul.map((c, idx) => (
                    <tr key={c.idTemp} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono text-gray-400">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-gray-900">{c.nome}</td>
                      <td className="py-3 px-4 text-gray-700">{c.telefone || '-'}</td>
                      <td className="py-3 px-4 text-gray-700">{c.email || '-'}</td>
                      <td className="py-3 px-4 font-mono text-gray-600">
                        {c.cnpj || c.cpf || '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {c.cidade} / {c.estado}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={c.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* RELATÓRIO PÓS-IMPORTAÇÃO (Sucesso) */}
      {/* ============================================================== */}
      {resultadoFinal && (
        <div className="bg-white rounded-2xl border-2 border-emerald-500 p-6 shadow-md space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Importação Executada com Sucesso!</h3>
              <p className="text-xs text-gray-500">
                Os dados aprovados foram processados e já estão disponíveis no Funil Comercial e na
                lista de Clientes.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-emerald-800">{resultadoFinal.inseridos}</div>
              <div className="text-xs font-semibold text-emerald-900">Novos Leads Inseridos</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-blue-800">{resultadoFinal.atualizados}</div>
              <div className="text-xs font-semibold text-blue-900">Cadastros Atualizados</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-gray-700">{resultadoFinal.ignorados}</div>
              <div className="text-xs font-semibold text-gray-800">Registros Ignorados</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-red-700">{resultadoFinal.erros}</div>
              <div className="text-xs font-semibold text-red-800">Falhas / Erros</div>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleLimparDados}
              className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Fazer Outra Importação
            </button>
            <button
              type="button"
              onClick={() => navigate('/clientes')}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-2"
            >
              <span>Ver Lista de Clientes</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
