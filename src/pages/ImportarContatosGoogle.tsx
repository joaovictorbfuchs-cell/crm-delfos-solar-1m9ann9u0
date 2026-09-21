import React, { useState, useMemo, useRef } from 'react'
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Database,
  RefreshCw,
  Phone,
  MessageSquare,
  MapPin,
  Mail,
  UserPlus,
  ShieldCheck,
  Check,
  Sparkles,
  Info,
  SlidersHorizontal,
  ChevronRight,
  Layers,
  ArrowUpRight,
  Download,
  AlertCircle,
  Clock,
  PlusCircle,
  FileText,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { parseSpreadsheetFile } from '@/lib/spreadsheetParser'
import { formatWhatsAppPhone } from '@/lib/formatters'
import {
  ItemComparacaoGoogle,
  AcaoDivergenciaGoogle,
  parseGoogleContactRow,
  analisarContatoGoogle,
  CSV_EXEMPLO_GOOGLE_CONTATOS,
} from '@/services/googleContactsImportService'
import { toast } from 'sonner'

export default function ImportarContatosGoogle() {
  const { clientes, addCliente, updateCliente, addContatoAdicional, refreshData } = useClientes()

  // Estados de upload e processamento
  const [arquivoNome, setArquivoNome] = useState<string>('')
  const [isProcessandoArquivo, setIsProcessandoArquivo] = useState<boolean>(false)
  const [itens, setItens] = useState<ItemComparacaoGoogle[]>([])
  const [filtroAba, setFiltroAba] = useState<'divergencias' | 'todos' | 'resolvidos'>(
    'divergencias',
  )
  const [termoBusca, setTermoBusca] = useState<string>('')

  // Estado de execução da aplicação
  const [isAplicando, setIsAplicando] = useState<boolean>(false)
  const [progresso, setProgresso] = useState<number>(0)
  const [resultadoFinal, setResultadoFinal] = useState<{
    totalProcessados: number
    atualizados: number
    criados: number
    mantidos: number
    contatosAdicionaisCriados: number
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Estatísticas do processamento
  const estatisticas = useMemo(() => {
    const totalLinhas = itens.length
    const corretos = itens.filter((i) => i.statusComparacao === 'correto').length
    const formatoDiferente = itens.filter((i) => i.statusComparacao === 'formato_diferente').length
    const divergencias = itens.filter((i) => i.ehDivergencia)
    const divergenciasTotal = divergencias.length
    const pendentes = divergencias.filter((i) => !i.resolvido).length
    const resolvidos = divergencias.filter((i) => i.resolvido).length

    const acaoAtualizar = divergencias.filter((i) => i.acaoSelecionada === 'atualizar').length
    const acaoManter = divergencias.filter((i) => i.acaoSelecionada === 'manter_atual').length
    const acaoNovo = divergencias.filter((i) => i.acaoSelecionada === 'adicionar_novo').length

    return {
      totalLinhas,
      corretos,
      formatoDiferente,
      divergenciasTotal,
      pendentes,
      resolvidos,
      acaoAtualizar,
      acaoManter,
      acaoNovo,
    }
  }, [itens])

  // Itens filtrados para exibição
  const itensFiltrados = useMemo(() => {
    return itens.filter((item) => {
      // Filtro de aba
      if (filtroAba === 'divergencias' && !item.ehDivergencia) return false
      if (filtroAba === 'resolvidos' && (!item.ehDivergencia || !item.resolvido)) return false

      // Busca por texto
      if (termoBusca.trim()) {
        const query = termoBusca.toLowerCase()
        const matchNome = item.nomeCompleto.toLowerCase().includes(query)
        const matchTel = item.telefoneCsv.includes(query)
        const matchCidade = item.cidadeCsv.toLowerCase().includes(query)
        const matchEmail = item.emailCsv.toLowerCase().includes(query)
        return matchNome || matchTel || matchCidade || matchEmail
      }

      return true
    })
  }, [itens, filtroAba, termoBusca])

  // Processa dados de tabela do CSV
  const processarLinhasCSV = (rows: Record<string, string>[]) => {
    const itensAnalisados: ItemComparacaoGoogle[] = rows.map((rawRow, index) => {
      const parsed = parseGoogleContactRow(rawRow, index)
      return analisarContatoGoogle(parsed, clientes)
    })
    setItens(itensAnalisados)
  }

  // Upload do arquivo real
  const handleUploadArquivo = async (file: File) => {
    setIsProcessandoArquivo(true)
    setResultadoFinal(null)
    try {
      const parsed = await parseSpreadsheetFile(file)
      if (!parsed.rows || parsed.rows.length === 0) {
        toast.error('O arquivo selecionado não contém linhas de dados.')
        setIsProcessandoArquivo(false)
        return
      }

      setArquivoNome(file.name)
      processarLinhasCSV(parsed.rows)
      toast.success(
        `Arquivo lido com sucesso! ${parsed.rows.length} contatos processados e comparados com o banco.`,
      )
    } catch (err: any) {
      console.error('Erro ao ler CSV do Google:', err)
      toast.error(
        err?.message || 'Falha ao processar arquivo. Certifique-se de que é um CSV válido.',
      )
    } finally {
      setIsProcessandoArquivo(false)
    }
  }

  // Carregar dados de exemplo para demonstração
  const handleCarregarExemplo = () => {
    setIsProcessandoArquivo(true)
    setResultadoFinal(null)
    setTimeout(() => {
      const file = new File([CSV_EXEMPLO_GOOGLE_CONTATOS], 'google_contacts_exemplo.csv', {
        type: 'text/csv',
      })
      handleUploadArquivo(file)
    }, 150)
  }

  // Download do modelo de exemplo em CSV
  const handleBaixarExemploCsv = () => {
    const blob = new Blob([CSV_EXEMPLO_GOOGLE_CONTATOS], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'exemplo_google_contatos.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.info('Download do arquivo de exemplo concluído!')
  }

  // Alterar ação de um item
  const handleDefinirAcao = (idTemp: string, acao: AcaoDivergenciaGoogle) => {
    setItens((prev) =>
      prev.map((item) => {
        if (item.idTemp !== idTemp) return item
        return {
          ...item,
          acaoSelecionada: acao,
          resolvido: acao === 'manter_atual' ? true : item.resolvido,
        }
      }),
    )
  }

  // Alternar se deve salvar contatos adicionais
  const handleToggleContatosAdicionais = (idTemp: string) => {
    setItens((prev) =>
      prev.map((item) => {
        if (item.idTemp !== idTemp) return item
        return {
          ...item,
          incluirContatosAdicionais: !item.incluirContatosAdicionais,
        }
      }),
    )
  }

  // Definir ação em massa
  const handleDefinirAcaoEmMassa = (acao: AcaoDivergenciaGoogle) => {
    setItens((prev) =>
      prev.map((item) => {
        if (!item.ehDivergencia) return item
        return {
          ...item,
          acaoSelecionada: acao,
        }
      }),
    )
    toast.success(
      `Ação "${
        acao === 'atualizar'
          ? 'Atualizar telefone e WhatsApp'
          : acao === 'manter_atual'
            ? 'Manter atual'
            : 'Adicionar como novo contato'
      }" aplicada a todas as divergências.`,
    )
  }

  // Aplicar decisões com gravação real no PocketBase
  const handleAplicarDecisoes = async () => {
    const divergencias = itens.filter((i) => i.ehDivergencia)
    if (divergencias.length === 0) {
      toast.info('Não há divergências para processar.')
      return
    }

    setIsAplicando(true)
    setProgresso(0)

    let countAtualizados = 0
    let countCriados = 0
    let countMantidos = 0
    let countContatosAdicionais = 0
    const erros: string[] = []

    const total = divergencias.length

    for (let i = 0; i < total; i++) {
      const item = divergencias[i]
      setProgresso(Math.round(((i + 1) / total) * 100))

      try {
        // Grava sempre na forma completa com 55 e 54 assumidos se ausentes
        const telFormatado =
          item.telefoneNormalizadoCompleto ||
          formatWhatsAppPhone(item.telefoneCsv) ||
          item.telefoneCsv

        if (item.acaoSelecionada === 'atualizar' && item.clienteBanco) {
          // Substitui telefone no banco e atualiza o WhatsApp principal pelo número do CSV
          await updateCliente(item.clienteBanco.id, {
            telefone: telFormatado,
            whatsapp: telFormatado,
          })
          countAtualizados++

          // Se tiver telefones secundários e o toggle estiver marcado, incluir como contatos adicionais
          if (item.incluirContatosAdicionais && item.telefonesSecundariosCsv.length > 0) {
            for (const telSec of item.telefonesSecundariosCsv) {
              const telSecFormatado = formatWhatsAppPhone(telSec) || telSec
              await addContatoAdicional({
                cliente: item.clienteBanco.id,
                nome: `${item.nomeCompleto} (Secundário)`,
                telefone: telSecFormatado,
                email: item.emailCsv || undefined,
                cargo: 'Telefone Secundário Google',
              })
              countContatosAdicionais++
            }
          }

          // Marca item como resolvido
          setItens((prev) =>
            prev.map((it) => (it.idTemp === item.idTemp ? { ...it, resolvido: true } : it)),
          )
        } else if (item.acaoSelecionada === 'adicionar_novo') {
          // Cria novo cliente no CRM e salva o telefone do CSV como WhatsApp principal
          const novoCliente = await addCliente({
            nome: item.nomeCompleto,
            telefone: telFormatado,
            whatsapp: telFormatado,
            email: item.emailCsv || undefined,
            cidade: item.cidadeCsv || 'Erechim',
            estado: 'RS',
            status: 'Novo Lead',
            origem_lead: 'Outro',
            produto: 'Energia Solar',
            como_conheceu: 'Google Contatos',
            observacoes: `Importado do Google Contatos em ${new Date().toLocaleDateString('pt-BR')}`,
          })
          countCriados++

          // Se tiver telefones secundários, salvar como contatos adicionais
          if (
            novoCliente?.id &&
            item.incluirContatosAdicionais &&
            item.telefonesSecundariosCsv.length > 0
          ) {
            for (const telSec of item.telefonesSecundariosCsv) {
              const telSecFormatado = formatWhatsAppPhone(telSec) || telSec
              await addContatoAdicional({
                cliente: novoCliente.id,
                nome: `${item.nomeCompleto} (Secundário)`,
                telefone: telSecFormatado,
                email: item.emailCsv || undefined,
                cargo: 'Telefone Secundário Google',
              })
              countContatosAdicionais++
            }
          }

          // Marca item como resolvido
          setItens((prev) =>
            prev.map((it) => (it.idTemp === item.idTemp ? { ...it, resolvido: true } : it)),
          )
        } else if (item.acaoSelecionada === 'manter_atual') {
          // Apenas ignora e marca como resolvido
          countMantidos++
          setItens((prev) =>
            prev.map((it) => (it.idTemp === item.idTemp ? { ...it, resolvido: true } : it)),
          )
        }
      } catch (err: any) {
        console.error(`Erro ao processar item ${item.nomeCompleto}:`, err)
        erros.push(`${item.nomeCompleto}: ${err?.message || 'Erro desconhecido'}`)
      }
    }

    setIsAplicando(false)
    setResultadoFinal({
      totalProcessados: total,
      atualizados: countAtualizados,
      criados: countCriados,
      mantidos: countMantidos,
      contatosAdicionaisCriados: countContatosAdicionais,
    })

    if (erros.length > 0) {
      toast.error(`Processamento concluído com ${erros.length} erro(s).`)
    } else {
      toast.success('Decisões aplicadas com sucesso no banco de dados!')
    }

    // Atualiza cache geral do sistema
    refreshData().catch(console.error)
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-100 text-[#166534] rounded-xl font-bold">
              <Phone className="w-5 h-5 text-[#16A34A]" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                Importação de Contatos do Google
              </h1>
              <p className="text-xs sm:text-sm text-gray-500">
                Compare telefones e WhatsApp do Google Contatos com a base do CRM Delfos Solar
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleBaixarExemploCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors shadow-2xs"
            title="Baixar planilha CSV de exemplo"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            Baixar CSV de exemplo
          </button>
          <button
            type="button"
            onClick={handleCarregarExemplo}
            disabled={isProcessandoArquivo || isAplicando}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#166534] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors shadow-2xs disabled:opacity-50"
            title="Carregar dados de demonstração cobrindo todos os cenários"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#16A34A]" />
            Carregar dados de teste
          </button>
        </div>
      </div>

      {/* Área de Upload / Dropzone */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleUploadArquivo(file)
            e.target.value = ''
          }}
        />

        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          onDrop={(e) => {
            e.preventDefault()
            e.stopPropagation()
            const file = e.dataTransfer.files?.[0]
            if (file) handleUploadArquivo(file)
          }}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
            arquivoNome
              ? 'border-emerald-400 bg-emerald-50/40'
              : 'border-gray-200 hover:border-emerald-500 hover:bg-emerald-50/20'
          }`}
        >
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-100 flex items-center justify-center text-[#166534]">
            {isProcessandoArquivo ? (
              <RefreshCw className="w-6 h-6 animate-spin text-[#16A34A]" />
            ) : (
              <Upload className="w-6 h-6 text-[#16A34A]" />
            )}
          </div>
          <p className="text-sm font-semibold text-gray-900">
            {arquivoNome ? (
              <span className="text-[#166534] font-bold">Arquivo carregado: {arquivoNome}</span>
            ) : (
              'Clique para selecionar ou arraste o CSV exportado do Google Contatos'
            )}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Suporta colunas:{' '}
            <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">first_name</code>,{' '}
            <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">middle_name</code>,{' '}
            <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">last_name</code>,{' '}
            <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">phone_1_value</code>,{' '}
            <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">e_mail_1_value</code> e{' '}
            <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">address_1_city</code>
          </p>
        </div>

        {/* Informações sobre as regras de negócio */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/70 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-gray-800">Normalização Padrão Brasil e RS</p>
              <p className="text-gray-500 mt-0.5">
                Números sem código de país assumem <strong>+55 (Brasil)</strong> e números sem DDD
                assumem <strong>54 (região Delfos Solar/RS)</strong>. Isso evita erros com números
                do Google sem DDD (fixos de 8 dígitos e celulares de 9 dígitos).
              </p>
            </div>
          </div>
          <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/70 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-900">Regra do WhatsApp Principal</p>
              <p className="text-amber-700 mt-0.5">
                O telefone do CSV vira o WhatsApp principal do cliente no CRM. Divergências com o
                WhatsApp atual geram alerta com opção de substituição.
              </p>
            </div>
          </div>
          <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200/70 flex items-start gap-2.5">
            <PlusCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-blue-900">Contatos Adicionais</p>
              <p className="text-blue-700 mt-0.5">
                Outros números da mesma linha (phone_2_value, etc.) podem ser salvos como contatos
                adicionais vinculados à ficha do cliente.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Resumo da Análise e Cards de Estatísticas */}
      {itens.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Total de Linhas
              </span>
              <div className="text-2xl font-black text-gray-900 mt-1">
                {estatisticas.totalLinhas}
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">Contatos lidos do arquivo</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-emerald-200/80 bg-emerald-50/20 shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-[#16A34A]" /> Corretos
              </span>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {estatisticas.corretos}
              </div>
              <p className="text-[11px] text-emerald-600 mt-0.5">Idênticos aos do CRM</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-blue-200/80 bg-blue-50/20 shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-blue-600" /> Formato Diferente
              </span>
              <div className="text-2xl font-black text-blue-700 mt-1">
                {estatisticas.formatoDiferente}
              </div>
              <p className="text-[11px] text-blue-600 mt-0.5">Diferença de +55 ou espaços</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-amber-300 bg-amber-50/30 shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Divergências
              </span>
              <div className="text-2xl font-black text-amber-700 mt-1">
                {estatisticas.divergenciasTotal}
              </div>
              <p className="text-[11px] text-amber-700 mt-0.5">
                {estatisticas.pendentes} pendentes de decisão
              </p>
            </div>
          </div>

          {/* Banner de Resultado Final após aplicação */}
          {resultadoFinal && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              <div className="text-xs text-emerald-950 flex-1">
                <p className="font-bold text-sm text-[#166534]">Importação aplicada com sucesso!</p>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-emerald-900">
                  <span>
                    • <strong>{resultadoFinal.atualizados}</strong> clientes tiveram
                    telefone/WhatsApp atualizado
                  </span>
                  <span>
                    • <strong>{resultadoFinal.criados}</strong> novos clientes foram criados
                  </span>
                  <span>
                    • <strong>{resultadoFinal.mantidos}</strong> contatos foram mantidos sem
                    alteração
                  </span>
                  {resultadoFinal.contatosAdicionaisCriados > 0 && (
                    <span>
                      • <strong>{resultadoFinal.contatosAdicionaisCriados}</strong> telefones
                      secundários salvos em Contatos Adicionais
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Barra de Ações em Lote e Filtros */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Abas */}
              <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFiltroAba('divergencias')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    filtroAba === 'divergencias'
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Lista de Divergências ({estatisticas.divergenciasTotal})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroAba('todos')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    filtroAba === 'todos'
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Todos os Contatos ({estatisticas.totalLinhas})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroAba('resolvidos')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    filtroAba === 'resolvidos'
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Resolvidos ({estatisticas.resolvidos})
                </button>
              </div>

              {/* Busca */}
              <div className="w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Filtrar por nome, telefone ou cidade..."
                  value={termoBusca}
                  onChange={(e) => setTermoBusca(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Ações em Lote para Divergências */}
            {estatisticas.divergenciasTotal > 0 && (
              <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-gray-700">Ação em lote:</span>
                  <button
                    type="button"
                    onClick={() => handleDefinirAcaoEmMassa('atualizar')}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-[#166534] hover:bg-emerald-100 border border-emerald-200"
                  >
                    Marcar todos para Atualizar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDefinirAcaoEmMassa('manter_atual')}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
                  >
                    Marcar todos para Manter Atual
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDefinirAcaoEmMassa('adicionar_novo')}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                  >
                    Marcar todos para Adicionar como Novo
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleAplicarDecisoes}
                  disabled={isAplicando || estatisticas.divergenciasTotal === 0}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#16A34A] hover:bg-[#166534] shadow-xs hover:shadow transition-all disabled:opacity-50"
                >
                  {isAplicando ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Aplicando ({progresso}%)...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Aplicar Decisões no CRM ({estatisticas.divergenciasTotal})
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Lista de Contatos / Divergências */}
          <div className="space-y-3">
            {itensFiltrados.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <h3 className="text-base font-bold text-gray-900">
                  Nenhum registro nesta visualização
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {filtroAba === 'divergencias'
                    ? 'Todos os telefones do arquivo são idênticos ou já estão sincronizados com a base!'
                    : 'Ajuste os filtros de busca para encontrar outros contatos.'}
                </p>
              </div>
            ) : (
              itensFiltrados.map((item) => {
                const isResolvido = item.resolvido

                return (
                  <div
                    key={item.idTemp}
                    className={`bg-white rounded-2xl border transition-all p-4 sm:p-5 shadow-xs ${
                      isResolvido
                        ? 'border-gray-200 opacity-90'
                        : item.whatsappDiverge
                          ? 'border-amber-300 ring-1 ring-amber-200 bg-amber-50/15'
                          : item.statusComparacao === 'nao_encontrado'
                            ? 'border-blue-200 bg-blue-50/10'
                            : 'border-gray-200'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Lado Esquerdo: Identificação e Dados */}
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-gray-900 truncate">
                            {item.nomeCompleto}
                          </span>

                          {/* Badges de Status */}
                          {item.statusComparacao === 'correto' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <Check className="w-3 h-3" /> Correto
                            </span>
                          )}
                          {item.statusComparacao === 'formato_diferente' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                              <Layers className="w-3 h-3" /> Formato diferente
                            </span>
                          )}
                          {item.statusComparacao === 'divergente_telefone' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              <AlertTriangle className="w-3 h-3" /> Telefone divergente
                            </span>
                          )}
                          {item.statusComparacao === 'divergente_whatsapp' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              <MessageSquare className="w-3 h-3 text-emerald-700" /> WhatsApp
                              divergente
                            </span>
                          )}
                          {item.statusComparacao === 'nao_encontrado' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                              <UserPlus className="w-3 h-3" /> Novo contato
                            </span>
                          )}
                          {isResolvido && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
                              Resolvido
                            </span>
                          )}
                        </div>

                        {/* Comparativo de Telefones / Cidade / Email */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs pt-1">
                          {/* Telefone do CSV */}
                          <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200/80">
                            <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">
                              Telefone do CSV (Principal)
                            </span>
                            <div className="flex items-center gap-1.5 font-bold text-[#166534]">
                              <Phone className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
                              <span className="font-mono text-xs">{item.telefoneCsvFormatado}</span>
                            </div>
                            <div className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1">
                              <MessageSquare className="w-3 h-3 text-emerald-600" />
                              Será salvo como WhatsApp Principal
                            </div>
                          </div>

                          {/* Telefone Atual no Banco */}
                          <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200/80">
                            <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">
                              Cadastro no CRM
                            </span>
                            {item.clienteBanco ? (
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5 text-gray-800">
                                  <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                  <span className="font-mono text-xs">
                                    {formatWhatsAppPhone(item.telefoneBanco) || 'Sem telefone'}
                                  </span>
                                </div>
                                {item.whatsappBanco && (
                                  <div className="flex items-center gap-1 text-[11px] text-emerald-800 font-medium">
                                    <MessageSquare className="w-3 h-3 text-emerald-600 shrink-0" />
                                    <span>Whats: {formatWhatsAppPhone(item.whatsappBanco)}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">Não cadastrado no banco</span>
                            )}
                          </div>

                          {/* Cidade e Email do CSV */}
                          <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200/80">
                            <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">
                              Localização & Email
                            </span>
                            <div className="flex items-center gap-1.5 text-gray-700">
                              <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span>{item.cidadeCsv || 'Erechim'}</span>
                            </div>
                            {item.emailCsv && (
                              <div className="flex items-center gap-1.5 text-[11px] text-gray-500 truncate mt-0.5">
                                <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                                <span className="truncate">{item.emailCsv}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Aviso de Divergência de WhatsApp */}
                        {item.whatsappDiverge && (
                          <div className="p-2.5 bg-amber-100/60 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
                            <div>
                              <strong>Atenção:</strong> O cliente já possui WhatsApp cadastrado (
                              <span className="font-mono font-bold">
                                {formatWhatsAppPhone(item.whatsappBanco)}
                              </span>
                              ) diferente do telefone do CSV (
                              <span className="font-mono font-bold">
                                {item.telefoneCsvFormatado}
                              </span>
                              ). Escolha se deseja atualizar o WhatsApp ou manter o atual.
                            </div>
                          </div>
                        )}

                        {/* Contatos Adicionais (telefones secundários) */}
                        {item.telefonesSecundariosCsv.length > 0 && (
                          <div className="pt-1 flex flex-wrap items-center gap-2">
                            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100">
                              <input
                                type="checkbox"
                                checked={item.incluirContatosAdicionais}
                                onChange={() => handleToggleContatosAdicionais(item.idTemp)}
                                className="rounded text-[#16A34A] focus:ring-emerald-500"
                              />
                              <span>
                                Incluir {item.telefonesSecundariosCsv.length} outro(s) número(s)
                                como <strong>Contato Adicional</strong> na ficha
                              </span>
                            </label>
                            <span className="text-[11px] text-gray-500 font-mono">
                              (
                              {item.telefonesSecundariosCsv
                                .map((t) => formatWhatsAppPhone(t))
                                .join(', ')}
                              )
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Lado Direito: Três Botões de Ação para a Divergência */}
                      {item.ehDivergencia && (
                        <div className="flex flex-col sm:flex-row lg:flex-col gap-1.5 shrink-0 w-full lg:w-56 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100">
                          <button
                            type="button"
                            onClick={() => handleDefinirAcao(item.idTemp, 'atualizar')}
                            className={`w-full px-3 py-2 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between ${
                              item.acaoSelecionada === 'atualizar'
                                ? 'bg-[#16A34A] text-white shadow-xs'
                                : 'bg-emerald-50 text-[#166534] hover:bg-emerald-100 border border-emerald-200'
                            }`}
                            title="Substitui telefone no banco e atualiza o WhatsApp principal pelo número do CSV"
                          >
                            <span>Atualizar telefone e WhatsApp</span>
                            {item.acaoSelecionada === 'atualizar' && (
                              <Check className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDefinirAcao(item.idTemp, 'manter_atual')}
                            className={`w-full px-3 py-2 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between ${
                              item.acaoSelecionada === 'manter_atual'
                                ? 'bg-gray-800 text-white shadow-xs'
                                : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                            }`}
                            title="Ignora a alteração e mantém os dados já cadastrados"
                          >
                            <span>Manter atual</span>
                            {item.acaoSelecionada === 'manter_atual' && (
                              <Check className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDefinirAcao(item.idTemp, 'adicionar_novo')}
                            className={`w-full px-3 py-2 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between ${
                              item.acaoSelecionada === 'adicionar_novo'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                            }`}
                            title="Cria novo cliente e salva o telefone do CSV como WhatsApp principal"
                          >
                            <span>Adicionar como novo contato</span>
                            {item.acaoSelecionada === 'adicionar_novo' && (
                              <Check className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </>
      )}
    </div>
  )
}
