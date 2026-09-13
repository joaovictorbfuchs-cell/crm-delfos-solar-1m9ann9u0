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

  // Resolução de Duplicados
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

      toast.success(
        `Planilha processada! ${parsed.rows.length} clientes encontrados com colunas auto-identificadas.`,
      )
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
      setIsProcessandoArquivo(false)

      toast.success(
        `Exemplo do ${fonte === 'pipedrive' ? 'Pipedrive' : 'Conta Azul'} carregado com sucesso (${dadosExemplo.rows.length} clientes simulados)!`,
      )
    }, 200)
  }

  // Alterar mapeamento manual de um campo de destino
  const handleAlterarMapeamento = (campoKey: string, colunaSelecionada: string) => {
    setMapeamentoColunas((prev) => {
      const updated = { ...prev }
      if (!colunaSelecionada) {
        delete updated[campoKey]
      } else {
        updated[campoKey] = colunaSelecionada
      }
      return updated
    })
  }

  // Normalização e verificação de duplicidade com a base atual de clientes
  const clientesNormalizados = useMemo<ClienteImportadoNormalizado[]>(() => {
    if (!dadosTabela) return []

    return dadosTabela.rows.map((row, index) => {
      const normalizado = normalizarLinhaParaCliente(
        row,
        mapeamentoColunas,
        fonteAtiva,
        index,
        dadosTabela.headers,
      )

      // Verificar duplicidade no banco por CPF, CNPJ ou e-mail
      const docClean = limparDocumento(normalizado.cpf || normalizado.cnpj)
      const emailLower = (normalizado.email || '').toLowerCase().trim()

      const duplicado = clientes.find((existente) => {
        // Checagem por documento (CPF ou CNPJ)
        if (docClean && docClean.length >= 11) {
          const docExistente = limparDocumento(existente.cpf || existente.cnpj || '')
          if (docExistente && docExistente === docClean) {
            return true
          }
        }
        // Checagem por e-mail
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

  // Contagem de duplicados
  const duplicadosList = useMemo(() => {
    return clientesNormalizados.filter((c) => c.isDuplicado)
  }, [clientesNormalizados])

  // Aplicação da regra de duplicidade (individual ou global)
  const getDecisaoDuplicado = (idTemp: string): AcaoDuplicado => {
    if (acaoDuplicadosGlobal) return acaoDuplicadosGlobal
    return decisaoDuplicados[idTemp] || 'atualizar'
  }

  const handleDefinirAcaoGlobal = (acao: AcaoDuplicado) => {
    setAcaoDuplicadosGlobal(acao)
    const novasDecisoes: Record<string, AcaoDuplicado> = {}
    duplicadosList.forEach((c) => {
      novasDecisoes[c.idTemp] = acao
    })
    setDecisaoDuplicados(novasDecisoes)
    toast.info(
      `Regra aplicada a todos os duplicados: ${acao === 'atualizar' ? 'Atualizar Dados' : 'Ignorar'}`,
    )
  }

  const handleDefinirAcaoIndividual = (idTemp: string, acao: AcaoDuplicado) => {
    setAcaoDuplicadosGlobal(null)
    setDecisaoDuplicados((prev) => ({
      ...prev,
      [idTemp]: acao,
    }))
  }

  // Executar a importação para o banco de dados PocketBase
  const handleExecutarImportacao = async () => {
    if (clientesNormalizados.length === 0) {
      toast.error('Nenhum cliente para importar.')
      return
    }

    setIsImportando(true)
    setProgressoImportacao(0)

    let inseridos = 0
    let atualizados = 0
    let ignorados = 0
    let erros = 0

    const total = clientesNormalizados.length

    for (let i = 0; i < total; i++) {
      const item = clientesNormalizados[i]

      try {
        if (item.isDuplicado && item.clienteExistenteId) {
          const acao = getDecisaoDuplicado(item.idTemp)

          if (acao === 'ignorar') {
            ignorados++
          } else {
            // Atualizar cliente existente com os dados novos da planilha
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
          // Criar novo cliente
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
              <strong className="text-gray-700">Conta Azul</strong>. O sistema identifica as colunas
              automaticamente e previne duplicidades.
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
              <div className="leading-tight">1. Importar do Pipedrive</div>
              <div
                className={`text-[11px] font-normal ${
                  fonteAtiva === 'pipedrive' ? 'text-emerald-100' : 'text-gray-400'
                }`}
              >
                Funil comercial, deals e pessoas
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

      {/* Seção Principal de Upload e Simulação */}
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
                Suporta planilhas exportadas em formato <strong>.xlsx</strong> ou{' '}
                <strong>.csv</strong>. O CRM identifica automaticamente nomes, telefones, e-mails,
                cidades, documentos e status.
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

            <div className="pt-4 flex items-center gap-6 text-[11px] text-gray-400">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Detecção inteligente de
                colunas
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Verificação de duplicados
              </span>
            </div>
          </div>

          {/* Card de Demonstração / Dados de Exemplo */}
          <div className="bg-gradient-to-br from-emerald-50/70 via-white to-gray-50 rounded-2xl border border-emerald-200/80 p-6 flex flex-col justify-between shadow-xs">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100/70 text-emerald-900 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Ambiente de Teste</span>
                </div>
                <span className="text-xs text-gray-400 font-mono">6 clientes</span>
              </div>

              <h4 className="text-base font-bold text-gray-900">
                Ainda não tem o arquivo real em mãos?
              </h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Carregue uma planilha de exemplo autêntica do{' '}
                <strong>{fonteAtiva === 'pipedrive' ? 'Pipedrive' : 'Conta Azul'}</strong> com
                empresas e pessoas reais da região de Erechim e Passo Fundo para testar toda a
                prévia, o mapeamento e a resolução de duplicados.
              </p>

              <div className="bg-white/80 rounded-xl p-3 border border-emerald-100 text-xs space-y-1.5 text-gray-600">
                <div className="font-semibold text-emerald-900 text-[11px] uppercase tracking-wider">
                  O que está incluído no exemplo:
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-gray-600">
                  <li>6 clientes fictícios detalhados (PF e PJ)</li>
                  <li>Mapeamento de valores, telefones e status</li>
                  <li>1 cliente intencionalmente duplicado para teste</li>
                </ul>
              </div>
            </div>

            <button
              type="button"
              disabled={isProcessandoArquivo}
              onClick={() => handleCarregarExemplo(fonteAtiva)}
              className="mt-6 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-emerald-50 text-emerald-800 border-2 border-emerald-600 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer hover:shadow"
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Simular Prévia com Dados de Exemplo</span>
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
              </div>
              <p className="text-xs text-gray-500">
                {dadosTabela.rows.length} registros detectados •{' '}
                {Object.keys(mapeamentoColunas).length} colunas mapeadas
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
                Se alguma coluna não foi identificada corretamente, escolha a coluna correspondente
                da sua planilha abaixo.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const autoMap = autoDetectarMapeamento(dadosTabela.headers, fonteAtiva)
                setMapeamentoColunas(autoMap)
                toast.info('Mapeamento redefinido para a detecção automática padrão.')
              }}
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

            {/* Seção de Colunas Adicionais da Planilha (Campos Extras / Novos) */}
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
                        "Se não tem o campo específico neste CRM, precisa criar": Todas as colunas
                        abaixo são salvas no cadastro do cliente e visíveis na Ficha cadastral para
                        que nenhuma informação se perca.
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
                            Auto-criado
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

      {/* Painel de Alerta e Resolução de Clientes Duplicados */}
      {dadosTabela && duplicadosList.length > 0 && !resultadoFinal && (
        <div className="bg-amber-50/70 rounded-2xl border-2 border-amber-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-950">
                  {duplicadosList.length} cliente{duplicadosList.length > 1 ? 's' : ''} já existe
                  {duplicadosList.length > 1 ? 'm' : ''} no CRM Delfos Solar
                </h3>
                <p className="text-xs text-amber-800/90">
                  Detectamos registros com o mesmo <strong>CPF, CNPJ ou E-mail</strong> já
                  cadastrados na base de clientes. Escolha se deseja atualizar os dados existentes
                  ou ignorar a linha da planilha.
                </p>
              </div>
            </div>

            {/* Ações Globais */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-amber-900">Aplicar a todos:</span>
              <button
                type="button"
                onClick={() => handleDefinirAcaoGlobal('atualizar')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  acaoDuplicadosGlobal === 'atualizar'
                    ? 'bg-amber-700 text-white border-amber-800'
                    : 'bg-white text-amber-900 border-amber-300 hover:bg-amber-100/50'
                }`}
              >
                Atualizar Todos
              </button>
              <button
                type="button"
                onClick={() => handleDefinirAcaoGlobal('ignorar')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  acaoDuplicadosGlobal === 'ignorar'
                    ? 'bg-gray-800 text-white border-gray-900'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                }`}
              >
                Ignorar Todos
              </button>
            </div>
          </div>

          {/* Lista detalhada dos duplicados */}
          <div className="bg-white rounded-xl border border-amber-200/90 overflow-hidden text-xs">
            <div className="p-3 bg-amber-100/40 border-b border-amber-200 font-bold text-amber-950 text-xs flex items-center justify-between">
              <span>Clientes com duplicidade identificada:</span>
              <span className="text-[11px] font-normal text-amber-800">
                {duplicadosList.length} registro(s) requerem sua atenção
              </span>
            </div>
            <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto">
              {duplicadosList.map((c) => {
                const decisao = getDecisaoDuplicado(c.idTemp)
                return (
                  <div
                    key={c.idTemp}
                    className="p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-amber-50/30 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{c.nome}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">
                          Duplicado por {c.duplicadoPor?.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-500 flex items-center gap-2">
                        {c.cpf && <span>CPF: {c.cpf}</span>}
                        {c.cnpj && <span>CNPJ: {c.cnpj}</span>}
                        {c.email && <span>E-mail: {c.email}</span>}
                        <span>• Registro existente: "{c.clienteExistenteNome}"</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDefinirAcaoIndividual(c.idTemp, 'atualizar')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                          decisao === 'atualizar'
                            ? 'bg-emerald-600 text-white border-emerald-700'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-emerald-50'
                        }`}
                      >
                        Atualizar dados
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDefinirAcaoIndividual(c.idTemp, 'ignorar')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                          decisao === 'ignorar'
                            ? 'bg-gray-700 text-white border-gray-800'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        Ignorar
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Relatório de Resultado Pós-Importação */}
      {resultadoFinal && (
        <div className="bg-white rounded-2xl border-2 border-emerald-500 p-6 shadow-md space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Importação Executada com Sucesso!</h3>
              <p className="text-xs text-gray-500">
                Os dados foram processados e já estão disponíveis no Funil Comercial e na lista
                geral de Clientes.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-emerald-800">{resultadoFinal.inseridos}</div>
              <div className="text-xs font-semibold text-emerald-900">Novos Inseridos</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-blue-800">{resultadoFinal.atualizados}</div>
              <div className="text-xs font-semibold text-blue-900">Atualizados</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-gray-700">{resultadoFinal.ignorados}</div>
              <div className="text-xs font-semibold text-gray-800">Ignorados</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-red-700">{resultadoFinal.erros}</div>
              <div className="text-xs font-semibold text-red-800">Erros / Falhas</div>
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

      {/* Tabela de Prévia dos Dados */}
      {dadosTabela && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden space-y-4">
          <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50">
            <div>
              <div className="flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-gray-900 text-sm">
                  Prévia dos Dados a Importar ({clientesNormalizados.length} clientes detectados)
                </h3>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Revise os dados mapeados antes de confirmar a gravação no banco de dados do CRM.
              </p>
            </div>

            {/* Botão de Confirmação no Topo da Tabela */}
            {!resultadoFinal && (
              <button
                type="button"
                disabled={isImportando}
                onClick={handleExecutarImportacao}
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
                    <span>Confirmar e Importar Clientes</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Tabela Responsiva */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAF9] border-y border-gray-200 text-gray-600 uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Nome / Empresa</th>
                  <th className="py-3 px-4">Telefone / WhatsApp</th>
                  <th className="py-3 px-4">E-mail</th>
                  <th className="py-3 px-4">CPF / CNPJ</th>
                  <th className="py-3 px-4">Cidade / UF</th>
                  <th className="py-3 px-4">Status no Funil</th>
                  <th className="py-3 px-4">Valor Estimado</th>
                  <th className="py-3 px-4">Campos Extras</th>
                  <th className="py-3 px-4">Ação / Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clientesNormalizados.map((c, idx) => {
                  const decisao = getDecisaoDuplicado(c.idTemp)
                  const extrasEntries = c.dados_importados ? Object.entries(c.dados_importados) : []
                  return (
                    <tr
                      key={c.idTemp}
                      className={`hover:bg-gray-50/80 transition-colors ${
                        c.isDuplicado ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono text-gray-400">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-gray-900">{c.nome}</span>
                          {c.tipo_pessoa === 'juridica' ? (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200">
                              <Building2 className="w-2.5 h-2.5" /> PJ
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                              <User className="w-2.5 h-2.5" /> PF
                            </span>
                          )}
                        </div>
                        {c.data_ultimo_contato && (
                          <div className="text-[10px] text-gray-400">
                            Último contato: {c.data_ultimo_contato}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-700 whitespace-nowrap">
                        {c.telefone || <span className="text-gray-300">-</span>}
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {c.email ? (
                          <span className="truncate max-w-[180px] block" title={c.email}>
                            {c.email}
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-600 whitespace-nowrap">
                        {c.cnpj || c.cpf || <span className="text-gray-300">-</span>}
                      </td>
                      <td className="py-3 px-4 text-gray-700 whitespace-nowrap">
                        {c.cidade} / {c.estado}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="py-3 px-4 font-semibold text-gray-800 whitespace-nowrap">
                        {formatCurrency(c.valor_estimado)}
                      </td>
                      <td className="py-3 px-4 max-w-[200px]">
                        {extrasEntries.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {extrasEntries.slice(0, 2).map(([k, v]) => (
                              <span
                                key={k}
                                className="inline-block max-w-[120px] truncate text-[10px] bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200"
                                title={`${k}: ${v}`}
                              >
                                <strong>{k}:</strong> {v}
                              </span>
                            ))}
                            {extrasEntries.length > 2 && (
                              <span className="text-[10px] font-bold text-blue-600 bg-blue-100/70 px-1 py-0.5 rounded">
                                +{extrasEntries.length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {c.isDuplicado ? (
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              decisao === 'atualizar'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            {decisao === 'atualizar' ? 'Vai Atualizar' : 'Vai Ignorar'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Novo Cliente
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Rodapé da Tabela com Confirmação Inferior */}
          {!resultadoFinal && (
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-gray-500">
                Total:{' '}
                <strong className="text-gray-800">{clientesNormalizados.length} registros</strong> (
                {clientesNormalizados.length - duplicadosList.length} novos e{' '}
                {duplicadosList.length} duplicados)
              </div>

              <button
                type="button"
                disabled={isImportando}
                onClick={handleExecutarImportacao}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {isImportando ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Importando...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirmar Importação de Todos</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
