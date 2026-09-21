import React, { useState, useMemo, useRef } from 'react'
import {
  Upload,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Phone,
  MessageSquare,
  MapPin,
  Mail,
  UserPlus,
  UserCheck,
  EyeOff,
  ShieldCheck,
  Check,
  Sparkles,
  Layers,
  Download,
  AlertCircle,
  PlusCircle,
  Search,
  X,
  Building2,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { parseSpreadsheetFile } from '@/lib/spreadsheetParser'
import { formatWhatsAppPhone } from '@/lib/formatters'
import { Cliente } from '@/types/crm'
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

  // Estado para o modal de "Vincular a um cliente"
  const [itemParaVincular, setItemParaVincular] = useState<ItemComparacaoGoogle | null>(null)
  const [buscaClienteModal, setBuscaClienteModal] = useState<string>('')
  const [clienteSelecionadoModal, setClienteSelecionadoModal] = useState<Cliente | null>(null)
  const [isVinculandoDireto, setIsVinculandoDireto] = useState<boolean>(false)

  // Estado de execução da aplicação
  const [isAplicando, setIsAplicando] = useState<boolean>(false)
  const [progresso, setProgresso] = useState<number>(0)
  const [resultadoFinal, setResultadoFinal] = useState<{
    totalProcessados: number
    atualizados: number
    vinculados: number
    criados: number
    ignorados: number
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
    const acaoVincular = divergencias.filter((i) => i.acaoSelecionada === 'vincular').length
    const acaoIgnorar = divergencias.filter(
      (i) => i.acaoSelecionada === 'ignorar' || i.acaoSelecionada === 'manter_atual',
    ).length
    const acaoNovo = divergencias.filter((i) => i.acaoSelecionada === 'adicionar_novo').length

    return {
      totalLinhas,
      corretos,
      formatoDiferente,
      divergenciasTotal,
      pendentes,
      resolvidos,
      acaoAtualizar,
      acaoVincular,
      acaoIgnorar,
      acaoNovo,
    }
  }, [itens])

  // Clientes filtrados para o modal de busca de "Vincular a um cliente"
  const clientesParaVinculo = useMemo(() => {
    if (!itemParaVincular) return []
    const term = buscaClienteModal.trim().toLowerCase()
    if (!term) return clientes.slice(0, 20)

    const digitsOnly = term.replace(/\D/g, '')

    return clientes
      .filter((c) => {
        const nome = (c.nome || '').toLowerCase()
        const matchNome = nome.includes(term)

        const cidade = (c.cidade || '').toLowerCase()
        const matchCidade = cidade.includes(term)

        const telDigits = (c.telefone || '').replace(/\D/g, '')
        const whatsDigits = (c.whatsapp || '').replace(/\D/g, '')
        const matchTel =
          (digitsOnly.length > 0 &&
            (telDigits.includes(digitsOnly) || whatsDigits.includes(digitsOnly))) ||
          (c.telefone || '').toLowerCase().includes(term) ||
          (c.whatsapp || '').toLowerCase().includes(term)

        return matchNome || matchCidade || matchTel
      })
      .slice(0, 30)
  }, [clientes, buscaClienteModal, itemParaVincular])

  // Itens filtrados para exibição
  const itensFiltrados = useMemo(() => {
    return itens.filter((item) => {
      // Filtro de aba
      if (filtroAba === 'divergencias') {
        // Na aba de divergências, mostra apenas as divergências PENDENTES (não resolvidas)
        if (!item.ehDivergencia || item.resolvido) return false
      }
      if (filtroAba === 'resolvidos') {
        if (!item.ehDivergencia || !item.resolvido) return false
      }

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

  // Ação 1: Abrir modal de seleção de cliente para vincular
  const handleAbrirModalVincular = (item: ItemComparacaoGoogle) => {
    setItemParaVincular(item)
    // Se o item já tiver clienteDestinoVinculo ou clienteBanco, pré-seleciona ou inicializa a busca com o nome do contato
    setClienteSelecionadoModal(item.clienteDestinoVinculo || null)
    setBuscaClienteModal(
      item.nomeCompleto && item.nomeCompleto !== 'Contato sem nome' ? item.nomeCompleto : '',
    )
  }

  const handleFecharModalVincular = () => {
    setItemParaVincular(null)
    setClienteSelecionadoModal(null)
    setBuscaClienteModal('')
  }

  // Confirmação do vínculo de um cliente selecionado
  const handleConfirmarVinculoModal = async () => {
    if (!itemParaVincular || !clienteSelecionadoModal) return

    setIsVinculandoDireto(true)
    try {
      const telFormatado =
        itemParaVincular.telefoneNormalizadoCompleto ||
        formatWhatsAppPhone(itemParaVincular.telefoneCsv) ||
        itemParaVincular.telefoneCsv

      // Grava imediatamente o telefone do CSV como telefone e WhatsApp principal do cliente escolhido
      await updateCliente(clienteSelecionadoModal.id, {
        telefone: telFormatado,
        whatsapp: telFormatado,
      })

      // Se tiver telefones secundários e a opção estiver ativada, salva como contatos adicionais
      if (
        itemParaVincular.incluirContatosAdicionais &&
        itemParaVincular.telefonesSecundariosCsv.length > 0
      ) {
        for (const telSec of itemParaVincular.telefonesSecundariosCsv) {
          const telSecFormatado = formatWhatsAppPhone(telSec) || telSec
          await addContatoAdicional({
            cliente: clienteSelecionadoModal.id,
            nome: `${itemParaVincular.nomeCompleto} (Secundário Google)`,
            telefone: telSecFormatado,
            email: itemParaVincular.emailCsv || undefined,
            cargo: 'Telefone Secundário Google',
          })
        }
      }

      // Atualiza o item: marca como resolvido e salva a ação e o cliente vinculado
      setItens((prev) =>
        prev.map((it) =>
          it.idTemp === itemParaVincular.idTemp
            ? {
                ...it,
                acaoSelecionada: 'vincular',
                clienteDestinoVinculo: clienteSelecionadoModal,
                resolvido: true,
              }
            : it,
        ),
      )

      toast.success(
        `Contato vinculado com sucesso a "${clienteSelecionadoModal.nome}"! Telefone e WhatsApp atualizados para ${telFormatado}.`,
      )
      handleFecharModalVincular()
    } catch (err: any) {
      console.error('Erro ao vincular contato ao cliente:', err)
      toast.error(err?.message || 'Falha ao vincular contato ao cliente escolhido.')
    } finally {
      setIsVinculandoDireto(false)
    }
  }

  // Ação 2: Adicionar como novo contato direto do card
  const handleAdicionarComoNovoContato = async (item: ItemComparacaoGoogle) => {
    try {
      const telFormatado =
        item.telefoneNormalizadoCompleto ||
        formatWhatsAppPhone(item.telefoneCsv) ||
        item.telefoneCsv

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

      if (
        novoCliente?.id &&
        item.incluirContatosAdicionais &&
        item.telefonesSecundariosCsv.length > 0
      ) {
        for (const telSec of item.telefonesSecundariosCsv) {
          const telSecFormatado = formatWhatsAppPhone(telSec) || telSec
          await addContatoAdicional({
            cliente: novoCliente.id,
            nome: `${item.nomeCompleto} (Secundário Google)`,
            telefone: telSecFormatado,
            email: item.emailCsv || undefined,
            cargo: 'Telefone Secundário Google',
          })
        }
      }

      setItens((prev) =>
        prev.map((it) =>
          it.idTemp === item.idTemp
            ? {
                ...it,
                acaoSelecionada: 'adicionar_novo',
                resolvido: true,
              }
            : it,
        ),
      )

      toast.success(
        `Cliente "${item.nomeCompleto}" criado com sucesso com WhatsApp ${telFormatado}!`,
      )
    } catch (err: any) {
      console.error('Erro ao criar novo cliente:', err)
      toast.error(err?.message || 'Falha ao cadastrar novo cliente.')
    }
  }

  // Ação 3: Ignorar (descarta a divergência e marca como resolvido)
  const handleIgnorarItem = (item: ItemComparacaoGoogle) => {
    setItens((prev) =>
      prev.map((it) =>
        it.idTemp === item.idTemp
          ? {
              ...it,
              acaoSelecionada: 'ignorar',
              resolvido: true,
            }
          : it,
      ),
    )
    toast.info(`Contato "${item.nomeCompleto}" ignorado e removido das pendências.`)
  }

  // Ação 4: Atualizar telefone e WhatsApp do cliente encontrado automaticamente
  const handleAtualizarClienteEncontrado = async (item: ItemComparacaoGoogle) => {
    if (!item.clienteBanco) {
      toast.error('Nenhum cliente correspondente identificado automaticamente para atualizar.')
      return
    }

    try {
      const telFormatado =
        item.telefoneNormalizadoCompleto ||
        formatWhatsAppPhone(item.telefoneCsv) ||
        item.telefoneCsv

      await updateCliente(item.clienteBanco.id, {
        telefone: telFormatado,
        whatsapp: telFormatado,
      })

      if (item.incluirContatosAdicionais && item.telefonesSecundariosCsv.length > 0) {
        for (const telSec of item.telefonesSecundariosCsv) {
          const telSecFormatado = formatWhatsAppPhone(telSec) || telSec
          await addContatoAdicional({
            cliente: item.clienteBanco.id,
            nome: `${item.nomeCompleto} (Secundário Google)`,
            telefone: telSecFormatado,
            email: item.emailCsv || undefined,
            cargo: 'Telefone Secundário Google',
          })
        }
      }

      setItens((prev) =>
        prev.map((it) =>
          it.idTemp === item.idTemp
            ? {
                ...it,
                acaoSelecionada: 'atualizar',
                resolvido: true,
              }
            : it,
        ),
      )

      toast.success(
        `Cliente "${item.clienteBanco.nome}" atualizado com sucesso! WhatsApp: ${telFormatado}.`,
      )
    } catch (err: any) {
      console.error('Erro ao atualizar cliente:', err)
      toast.error(err?.message || 'Falha ao atualizar cliente.')
    }
  }

  // Reabrir item resolvido (se o usuário quiser desfazer a decisão na aba "Resolvidos")
  const handleReabrirItem = (idTemp: string) => {
    setItens((prev) =>
      prev.map((it) =>
        it.idTemp === idTemp
          ? {
              ...it,
              resolvido: false,
            }
          : it,
      ),
    )
    toast.info('Item reaberto na lista de divergências pendentes.')
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
    const labelAcao =
      acao === 'atualizar'
        ? 'Atualizar telefone e WhatsApp'
        : acao === 'adicionar_novo'
          ? 'Adicionar como novo contato'
          : 'Ignorar'
    toast.success(`Ação "${labelAcao}" pré-selecionada para as divergências.`)
  }

  // Ignorar todos os pendentes em massa
  const handleIgnorarTodosPendentes = () => {
    setItens((prev) =>
      prev.map((item) => {
        if (!item.ehDivergencia || item.resolvido) return item
        return {
          ...item,
          acaoSelecionada: 'ignorar',
          resolvido: true,
        }
      }),
    )
    toast.info('Todas as divergências pendentes foram marcadas como ignoradas.')
  }

  // Aplicar decisões pendentes em lote (caso o usuário utilize as ações em lote)
  const handleAplicarDecisoes = async () => {
    const pendentes = itens.filter((i) => i.ehDivergencia && !i.resolvido)
    if (pendentes.length === 0) {
      toast.info('Não há divergências pendentes para processar.')
      return
    }

    setIsAplicando(true)
    setProgresso(0)

    let countAtualizados = 0
    let countVinculados = 0
    let countCriados = 0
    let countIgnorados = 0
    let countContatosAdicionais = 0
    const erros: string[] = []

    const total = pendentes.length

    for (let i = 0; i < total; i++) {
      const item = pendentes[i]
      setProgresso(Math.round(((i + 1) / total) * 100))

      try {
        const telFormatado =
          item.telefoneNormalizadoCompleto ||
          formatWhatsAppPhone(item.telefoneCsv) ||
          item.telefoneCsv

        if (item.acaoSelecionada === 'atualizar' && item.clienteBanco) {
          await updateCliente(item.clienteBanco.id, {
            telefone: telFormatado,
            whatsapp: telFormatado,
          })
          countAtualizados++

          if (item.incluirContatosAdicionais && item.telefonesSecundariosCsv.length > 0) {
            for (const telSec of item.telefonesSecundariosCsv) {
              const telSecFormatado = formatWhatsAppPhone(telSec) || telSec
              await addContatoAdicional({
                cliente: item.clienteBanco.id,
                nome: `${item.nomeCompleto} (Secundário Google)`,
                telefone: telSecFormatado,
                email: item.emailCsv || undefined,
                cargo: 'Telefone Secundário Google',
              })
              countContatosAdicionais++
            }
          }

          setItens((prev) =>
            prev.map((it) => (it.idTemp === item.idTemp ? { ...it, resolvido: true } : it)),
          )
        } else if (item.acaoSelecionada === 'vincular' && item.clienteDestinoVinculo) {
          await updateCliente(item.clienteDestinoVinculo.id, {
            telefone: telFormatado,
            whatsapp: telFormatado,
          })
          countVinculados++

          if (item.incluirContatosAdicionais && item.telefonesSecundariosCsv.length > 0) {
            for (const telSec of item.telefonesSecundariosCsv) {
              const telSecFormatado = formatWhatsAppPhone(telSec) || telSec
              await addContatoAdicional({
                cliente: item.clienteDestinoVinculo.id,
                nome: `${item.nomeCompleto} (Secundário Google)`,
                telefone: telSecFormatado,
                email: item.emailCsv || undefined,
                cargo: 'Telefone Secundário Google',
              })
              countContatosAdicionais++
            }
          }

          setItens((prev) =>
            prev.map((it) => (it.idTemp === item.idTemp ? { ...it, resolvido: true } : it)),
          )
        } else if (item.acaoSelecionada === 'adicionar_novo') {
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

          if (
            novoCliente?.id &&
            item.incluirContatosAdicionais &&
            item.telefonesSecundariosCsv.length > 0
          ) {
            for (const telSec of item.telefonesSecundariosCsv) {
              const telSecFormatado = formatWhatsAppPhone(telSec) || telSec
              await addContatoAdicional({
                cliente: novoCliente.id,
                nome: `${item.nomeCompleto} (Secundário Google)`,
                telefone: telSecFormatado,
                email: item.emailCsv || undefined,
                cargo: 'Telefone Secundário Google',
              })
              countContatosAdicionais++
            }
          }

          setItens((prev) =>
            prev.map((it) => (it.idTemp === item.idTemp ? { ...it, resolvido: true } : it)),
          )
        } else if (item.acaoSelecionada === 'ignorar' || item.acaoSelecionada === 'manter_atual') {
          countIgnorados++
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
      vinculados: countVinculados,
      criados: countCriados,
      ignorados: countIgnorados,
      contatosAdicionaisCriados: countContatosAdicionais,
    })

    if (erros.length > 0) {
      toast.error(`Processamento concluído com ${erros.length} erro(s).`)
    } else {
      toast.success('Decisões pendentes aplicadas com sucesso no CRM!')
    }

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

      {/* Modal de Vincular Contato a um Cliente Existente */}
      {itemParaVincular && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Cabeçalho do Modal */}
            <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 text-[#166534] rounded-xl">
                  <UserCheck className="w-5 h-5 text-[#16A34A]" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    Vincular Contato a um Cliente
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    O número importado será gravado como telefone e WhatsApp principal do cliente
                    selecionado.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleFecharModalVincular}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Destaque do contato que está sendo vinculado */}
            <div className="px-5 py-3 bg-emerald-50/70 border-b border-emerald-100 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div>
                <span className="font-bold text-gray-800">Contato no CSV: </span>
                <span className="text-gray-900 font-semibold">{itemParaVincular.nomeCompleto}</span>
              </div>
              <div className="flex items-center gap-1.5 font-bold text-[#166534]">
                <Phone className="w-3.5 h-3.5 text-[#16A34A]" />
                <span className="font-mono">
                  {itemParaVincular.telefoneNormalizadoCompleto ||
                    itemParaVincular.telefoneCsvFormatado}
                </span>
              </div>
            </div>

            {/* Corpo do modal com campo de busca e lista de clientes */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Buscar cliente cadastrado no CRM por Nome, Telefone ou Cidade:
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Digite o nome do cliente para buscar..."
                    value={buscaClienteModal}
                    onChange={(e) => setBuscaClienteModal(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-gray-50 focus:bg-white border border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
                  />
                  {buscaClienteModal && (
                    <button
                      type="button"
                      onClick={() => setBuscaClienteModal('')}
                      className="p-1 text-gray-400 hover:text-gray-700 absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full"
                      title="Limpar busca"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Informação dos resultados */}
              <div className="flex items-center justify-between text-[11px] text-gray-500 px-0.5">
                <span>
                  {buscaClienteModal.trim() ? (
                    <>
                      Resultados para "
                      <strong className="text-gray-700">{buscaClienteModal.trim()}</strong>":{' '}
                      {clientesParaVinculo.length} cliente(s)
                    </>
                  ) : (
                    <>Exibindo clientes cadastrados no CRM. Digite para refinar a busca.</>
                  )}
                </span>
                {clienteSelecionadoModal && (
                  <span className="text-emerald-700 font-bold">1 cliente selecionado</span>
                )}
              </div>

              {/* Lista de clientes para confirmação */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {clientesParaVinculo.length === 0 ? (
                  <div className="text-center py-8 px-4 text-gray-500 text-xs bg-gray-50 rounded-xl border border-dashed border-gray-200 space-y-2">
                    <p className="font-semibold text-gray-700">
                      Nenhum cliente encontrado para "{buscaClienteModal}"
                    </p>
                    <p className="text-[11px] text-gray-400">
                      Verifique a grafia do nome ou busque por cidade ou telefone.
                    </p>
                  </div>
                ) : (
                  clientesParaVinculo.map((cliente) => {
                    const isSelected = clienteSelecionadoModal?.id === cliente.id

                    return (
                      <div
                        key={cliente.id}
                        onClick={() => setClienteSelecionadoModal(cliente)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                          isSelected
                            ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs'
                            : 'bg-white hover:bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="space-y-1 text-left flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-gray-900 truncate">
                              {cliente.nome}
                            </span>
                            {cliente.status && (
                              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                                {cliente.status}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-gray-400" />
                              {cliente.cidade || 'Cidade não informada'}
                            </span>
                            <span className="flex items-center gap-1 font-mono">
                              <Phone className="w-3 h-3 text-gray-400" />
                              Atual:{' '}
                              {formatWhatsAppPhone(cliente.telefone || cliente.whatsapp) ||
                                'Sem telefone'}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 pt-1">
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
                              isSelected
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-gray-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Rodapé do modal */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <button
                type="button"
                onClick={handleFecharModalVincular}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!clienteSelecionadoModal || isVinculandoDireto}
                onClick={handleConfirmarVinculoModal}
                className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
              >
                {isVinculandoDireto ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Vinculando...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirmar Vínculo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
                  {resultadoFinal.vinculados > 0 && (
                    <span>
                      • <strong>{resultadoFinal.vinculados}</strong> contatos vinculados a clientes
                    </span>
                  )}
                  <span>
                    • <strong>{resultadoFinal.ignorados}</strong> contatos ignorados/descartados
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
                  Divergências Pendentes ({estatisticas.pendentes})
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

            {/* Ações em Lote para Divergências Pendentes */}
            {estatisticas.pendentes > 0 && (
              <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-gray-700">Ações em lote:</span>
                  <button
                    type="button"
                    onClick={() => handleDefinirAcaoEmMassa('atualizar')}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-[#166534] hover:bg-emerald-100 border border-emerald-200"
                    title="Pré-seleciona Atualizar para itens com cliente detectado"
                  >
                    Marcar Atualizar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDefinirAcaoEmMassa('adicionar_novo')}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                    title="Pré-seleciona Adicionar como novo contato"
                  >
                    Marcar Adicionar Novos
                  </button>
                  <button
                    type="button"
                    onClick={handleIgnorarTodosPendentes}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
                    title="Ignora e resolve todos os itens pendentes sem fazer alterações"
                  >
                    Ignorar Todos Pendentes
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleAplicarDecisoes}
                  disabled={isAplicando || estatisticas.pendentes === 0}
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
                      Aplicar Pendentes no CRM ({estatisticas.pendentes})
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

                          {/* Telefone Atual no Banco ou Cliente Vinculado */}
                          <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200/80">
                            <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">
                              {item.clienteDestinoVinculo
                                ? 'Vinculado a Cliente'
                                : 'Cadastro no CRM'}
                            </span>
                            {item.clienteDestinoVinculo ? (
                              <div className="space-y-0.5">
                                <div className="font-semibold text-xs text-emerald-800 truncate flex items-center gap-1">
                                  <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span className="truncate">
                                    {item.clienteDestinoVinculo.nome}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-gray-700 text-[11px]">
                                  <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                                  <span>
                                    {item.clienteDestinoVinculo.cidade || 'Cidade não informada'}
                                  </span>
                                </div>
                              </div>
                            ) : item.clienteBanco ? (
                              <div className="space-y-0.5">
                                <div className="text-xs font-semibold text-gray-800 truncate">
                                  {item.clienteBanco.nome}
                                </div>
                                <div className="flex items-center gap-1.5 text-gray-700">
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
                      {/* Lado Direito: Ações da Divergência */}
                      {item.ehDivergencia && (
                        <div className="flex flex-col sm:flex-row lg:flex-col gap-1.5 shrink-0 w-full lg:w-56 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100">
                          {isResolvido ? (
                            <div className="space-y-1.5">
                              <div className="px-3 py-2 rounded-xl text-xs font-semibold bg-gray-50 border border-gray-200 text-gray-700 flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  {item.acaoSelecionada === 'vincular'
                                    ? 'Vinculado a cliente'
                                    : item.acaoSelecionada === 'adicionar_novo'
                                      ? 'Novo contato criado'
                                      : item.acaoSelecionada === 'atualizar'
                                        ? 'Cliente atualizado'
                                        : 'Ignorado'}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleReabrirItem(item.idTemp)}
                                className="w-full text-center text-[11px] font-semibold text-gray-500 hover:text-gray-800 hover:underline py-1"
                              >
                                Reabrir divergência
                              </button>
                            </div>
                          ) : (
                            <>
                              {/* 1. Vincular a um cliente (NOVA OPÇÃO) */}
                              <button
                                type="button"
                                onClick={() => handleAbrirModalVincular(item)}
                                className="w-full px-3 py-2 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between bg-emerald-50 text-[#166534] hover:bg-emerald-100 border border-emerald-200 shadow-2xs"
                                title="Buscar e selecionar um cliente já cadastrado no CRM para receber este número como telefone e WhatsApp"
                              >
                                <span className="flex items-center gap-1.5">
                                  <UserCheck className="w-3.5 h-3.5 text-[#16A34A]" />
                                  Vincular a um cliente
                                </span>
                              </button>

                              {/* 2. Adicionar como novo contato */}
                              <button
                                type="button"
                                onClick={() => handleAdicionarComoNovoContato(item)}
                                className="w-full px-3 py-2 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 shadow-2xs"
                                title="Cria um novo cliente no CRM com o telefone do CSV como WhatsApp principal"
                              >
                                <span className="flex items-center gap-1.5">
                                  <UserPlus className="w-3.5 h-3.5 text-gray-500" />
                                  Adicionar como novo contato
                                </span>
                              </button>

                              {/* Se houver cliente correspondente detectado automaticamente, oferece também Atualizar */}
                              {item.clienteBanco && (
                                <button
                                  type="button"
                                  onClick={() => handleAtualizarClienteEncontrado(item)}
                                  className="w-full px-3 py-2 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between bg-emerald-50/50 text-emerald-800 hover:bg-emerald-100/70 border border-emerald-200 shadow-2xs"
                                  title={`Atualiza o telefone e WhatsApp de ${item.clienteBanco.nome} para o número do CSV`}
                                >
                                  <span className="flex items-center gap-1.5">
                                    <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                                    Atualizar telefone e WhatsApp
                                  </span>
                                </button>
                              )}

                              {/* 3. Ignorar (substitui Manter Atual e descarta o item das pendências) */}
                              <button
                                type="button"
                                onClick={() => handleIgnorarItem(item)}
                                className="w-full px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left flex items-center justify-between bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200"
                                title="Descarta esta divergência sem alterar dados e remove da lista de pendentes"
                              >
                                <span className="flex items-center gap-1.5">
                                  <EyeOff className="w-3.5 h-3.5 text-gray-400" />
                                  Ignorar
                                </span>
                              </button>
                            </>
                          )}
                        </div>
                      )}{' '}
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
