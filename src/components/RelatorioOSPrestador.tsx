import React, { useState, useMemo } from 'react'
import { OrdemServico, OSTipoServico } from '@/types/crm'
import { formatCurrency, formatDateTime } from '@/lib/formatters'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  User,
  Wrench,
  TrendingUp,
  FileText,
  DollarSign,
  Briefcase,
  Layers,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Send } from 'lucide-react'
import { ModalEnviarRelatorioOSWhatsApp } from '@/components/ModalEnviarRelatorioOSWhatsApp'
import { ModalEnviarRelatorioCliente } from '@/components/ModalEnviarRelatorioCliente'
import { gerarPdfRelatorioConsolidadoMensal } from '@/lib/relatorioConsolidadoCampoPdf'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

interface RelatorioOSPrestadorProps {
  ordens: OrdemServico[]
  onSelectOS?: (os: OrdemServico) => void
}

interface PrestadorMetric {
  nome: string
  usuarioId?: string
  profissionalId?: string
  totalConcluidas: number
  porTipo: Record<string, number>
  minutosTotais: number
  qtdComTempo: number
  tempoMedioMinutos: number | null
  valorTotal: number
  qtdComValor: number
  ordens: OrdemServico[]
}

/**
 * Tenta inferir a data de início da execução a partir do texto de detalhes_execucao
 * ex: "[INÍCIO DO ATENDIMENTO: 26/09/2026 às 10:15]" ou da data agendada.
 */
function extrairDataInicio(os: OrdemServico): Date | null {
  if (os.detalhes_execucao) {
    const match = os.detalhes_execucao.match(
      /\[INÍCIO DO ATENDIMENTO:\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*às\s*(\d{1,2}):(\d{2})\]/i,
    )
    if (match) {
      const dia = parseInt(match[1], 10)
      const mes = parseInt(match[2], 10) - 1
      const ano = parseInt(match[3], 10)
      const hora = parseInt(match[4], 10)
      const minuto = parseInt(match[5], 10)
      const d = new Date(ano, mes, dia, hora, minuto)
      if (!isNaN(d.getTime())) return d
    }
  }

  // Se não encontrar carimbo específico, usa a data agendada como aproximação inicial
  if (os.data_agendada) {
    const d = new Date(os.data_agendada)
    if (!isNaN(d.getTime())) return d
  }

  return null
}

/**
 * Retorna a data de conclusão efetiva da OS
 */
function extrairDataConclusao(os: OrdemServico): Date | null {
  if (os.concluida_em) {
    const d = new Date(os.concluida_em)
    if (!isNaN(d.getTime())) return d
  }
  if (os.updated && os.status === 'concluida') {
    const d = new Date(os.updated)
    if (!isNaN(d.getTime())) return d
  }
  return null
}

/**
 * Formata minutos em formato amigável (ex: "1h 45m", "40 min")
 */
function formatarDuracao(minutos: number): string {
  if (minutos <= 0) return 'Menos de 1 min'
  const horas = Math.floor(minutos / 60)
  const minsRestantes = Math.round(minutos % 60)

  if (horas === 0) return `${minsRestantes} min`
  if (minsRestantes === 0) return `${horas}h`
  return `${horas}h ${minsRestantes}min`
}

export function RelatorioOSPrestador({ ordens, onSelectOS }: RelatorioOSPrestadorProps) {
  const { toast } = useToast()
  // Mês e ano selecionados (padrão: mês/ano atual)
  const [dataReferencia, setDataReferencia] = useState<Date>(() => new Date())
  const [prestadorAberto, setPrestadorAberto] = useState<string | null>(null)
  const [osParaWhatsApp, setOsParaWhatsApp] = useState<OrdemServico | null>(null)
  const [osParaEnviarCliente, setOsParaEnviarCliente] = useState<OrdemServico | null>(null)
  const [gerandoPdfOsId, setGerandoPdfOsId] = useState<string | null>(null)
  const [gerandoPdfConsolidado, setGerandoPdfConsolidado] = useState<boolean>(false)

  const handleVerRelatorioPdf = async (os: OrdemServico) => {
    if (os.relatorio_pdf) {
      try {
        const fileUrl = pb.files.getURL(os, os.relatorio_pdf)
        if (fileUrl) {
          window.open(fileUrl, '_blank')
          return
        }
      } catch (e) {
        console.warn('Erro ao abrir URL do PDF da OS:', e)
      }
    }

    setGerandoPdfOsId(os.id)
    toast({
      title: 'Gerando Relatório Técnico...',
      description: 'Compilando os dados e fotografias da OS em PDF.',
    })
    try {
      const { gerarPdfRelatorioOS } = await import('@/lib/relatorioOSPdf')
      const { salvarRelatorioPdfOrdemServico } = await import('@/services/crmService')
      const res = await gerarPdfRelatorioOS(os, {
        cliente: os.expand?.cliente_id,
      })

      if (res.file) {
        try {
          await salvarRelatorioPdfOrdemServico(os.id, res.file)
        } catch {
          /* ignore */
        }
      }

      const pdfBlobUrl = URL.createObjectURL(res.file)
      window.open(pdfBlobUrl, '_blank')
    } catch (err) {
      console.error('Erro ao gerar relatório em PDF sob demanda:', err)
      toast({
        variant: 'destructive',
        title: 'Falha ao gerar relatório',
        description: 'Não foi possível gerar o PDF. Verifique os dados da OS.',
      })
    } finally {
      setGerandoPdfOsId(null)
    }
  }

  const anoAtual = dataReferencia.getFullYear()
  const mesAtual = dataReferencia.getMonth() // 0 - 11

  const mesAnterior = () => {
    setDataReferencia(new Date(anoAtual, mesAtual - 1, 1))
  }

  const mesSeguinte = () => {
    setDataReferencia(new Date(anoAtual, mesAtual + 1, 1))
  }

  const irParaMesAtual = () => {
    setDataReferencia(new Date())
  }

  const handleGerarPdfConsolidadoMensal = async () => {
    setGerandoPdfConsolidado(true)
    toast({
      title: 'Gerando Relatório Consolidado...',
      description: `Compilando atividades e métricas de ${MESES[mesAtual]} de ${anoAtual}.`,
    })
    try {
      const res = await gerarPdfRelatorioConsolidadoMensal(
        osConcluidasMes,
        MESES[mesAtual] || 'Mes',
        anoAtual,
      )
      const blobUrl = URL.createObjectURL(res.file)
      window.open(blobUrl, '_blank')
      toast({
        title: 'Relatório Consolidado pronto!',
        description: 'O PDF foi aberto em uma nova aba para visualização e download.',
      })
    } catch (err) {
      console.error('Erro ao gerar relatório consolidado mensal:', err)
      toast({
        variant: 'destructive',
        title: 'Falha ao gerar relatório consolidado',
        description: 'Tente novamente.',
      })
    } finally {
      setGerandoPdfConsolidado(false)
    }
  }

  // Filtragem das OS concluídas do mês selecionado
  const osConcluidasMes = useMemo(() => {
    return (ordens || []).filter((os) => {
      if (!os || os.status !== 'concluida') return false

      // Consideramos a data de conclusão para alocar no mês (fallback para updated ou data_agendada)
      const dataRef =
        extrairDataConclusao(os) || (os.data_agendada ? new Date(os.data_agendada) : null)
      if (!dataRef || isNaN(dataRef.getTime())) return false

      return dataRef.getFullYear() === anoAtual && dataRef.getMonth() === mesAtual
    })
  }, [ordens, anoAtual, mesAtual])

  // Agrupamento por prestador
  const metricasPorPrestador = useMemo(() => {
    const mapa = new Map<string, PrestadorMetric>()

    osConcluidasMes.forEach((os) => {
      const nomePrestador =
        os.atribuida_a?.trim() ||
        os.expand?.responsavel_usuario_id?.name ||
        os.expand?.profissional_id?.nome ||
        'Não Atribuído'

      if (!mapa.has(nomePrestador)) {
        mapa.set(nomePrestador, {
          nome: nomePrestador,
          usuarioId: os.responsavel_usuario_id,
          profissionalId: os.profissional_id,
          totalConcluidas: 0,
          porTipo: {},
          minutosTotais: 0,
          qtdComTempo: 0,
          tempoMedioMinutos: null,
          valorTotal: 0,
          qtdComValor: 0,
          ordens: [],
        })
      }

      const item = mapa.get(nomePrestador)!
      item.totalConcluidas += 1
      item.ordens.push(os)

      // Contagem por tipo de serviço
      const tipo = os.tipo_servico || 'Outro'
      item.porTipo[tipo] = (item.porTipo[tipo] || 0) + 1

      // Tempo de execução (se houver início e conclusão válidos)
      const dtInicio = extrairDataInicio(os)
      const dtFim = extrairDataConclusao(os)
      if (dtInicio && dtFim) {
        const diffMs = dtFim.getTime() - dtInicio.getTime()
        const diffMinutos = diffMs / (1000 * 60)
        // Ignora durações negativas ou absurdamente longas (> 72h) para não distorcer médias
        if (diffMinutos > 0 && diffMinutos <= 72 * 60) {
          item.minutosTotais += diffMinutos
          item.qtdComTempo += 1
        }
      }

      // Valor do serviço se existir na OS (ex: campo valor ou expand de cliente)
      const valorOS = (os as any).valor || (os as any).valor_servico || (os as any).valor_final || 0
      if (typeof valorOS === 'number' && valorOS > 0) {
        item.valorTotal += valorOS
        item.qtdComValor += 1
      }
    })

    // Calcular médias finais
    const lista = Array.from(mapa.values()).map((p) => {
      const tempoMedio = p.qtdComTempo > 0 ? Math.round(p.minutosTotais / p.qtdComTempo) : null
      return {
        ...p,
        tempoMedioMinutos: tempoMedio,
      }
    })

    // Ordenar do maior para o menor número de OS concluídas
    lista.sort((a, b) => b.totalConcluidas - a.totalConcluidas)

    return lista
  }, [osConcluidasMes])

  // Totais gerais do mês
  const totaisGerais = useMemo(() => {
    const totalOS = osConcluidasMes.length
    const totalPrestadores = metricasPorPrestador.length
    const tiposTotais: Record<string, number> = {}
    let somaMinutos = 0
    let qtdTempos = 0
    let somaValores = 0
    let qtdValores = 0

    metricasPorPrestador.forEach((p) => {
      Object.entries(p.porTipo).forEach(([t, count]) => {
        tiposTotais[t] = (tiposTotais[t] || 0) + count
      })
      somaMinutos += p.minutosTotais
      qtdTempos += p.qtdComTempo
      somaValores += p.valorTotal
      qtdValores += p.qtdComValor
    })

    const tempoMedioGeral = qtdTempos > 0 ? Math.round(somaMinutos / qtdTempos) : null

    return {
      totalOS,
      totalPrestadores,
      tiposTotais,
      tempoMedioGeral,
      somaValores,
      temValores: qtdValores > 0,
    }
  }, [osConcluidasMes, metricasPorPrestador])

  // Cores por tipo de serviço
  const getBadgeColor = (tipo: string) => {
    switch (tipo) {
      case 'Limpeza':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'Manutenção':
        return 'bg-amber-50 text-amber-800 border-amber-200'
      case 'Instalação':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200'
      case 'Garantia':
        return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'Configuração de Datalogger':
        return 'bg-cyan-50 text-cyan-800 border-cyan-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const toggleExpandirPrestador = (nome: string) => {
    setPrestadorAberto((prev) => (prev === nome ? null : nome))
  }

  const isMesAtual = new Date().getFullYear() === anoAtual && new Date().getMonth() === mesAtual

  return (
    <div className="space-y-5">
      {/* Barra de Navegação de Mês/Ano */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-emerald-100 text-[#166534] inline-flex items-center justify-center shadow-2xs">
            <CalendarIcon className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
              Relatório de OS Concluídas por Prestador
            </h3>
            <p className="text-xs text-gray-500">
              Desempenho técnico mensal da equipe em serviços de campo
            </p>
          </div>
        </div>

        {/* Seletor Mês/Ano e Ação de Gerar PDF Consolidado */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto justify-between sm:justify-end">
          <Button
            type="button"
            onClick={handleGerarPdfConsolidadoMensal}
            disabled={gerandoPdfConsolidado || osConcluidasMes.length === 0}
            className="h-9 px-3 text-xs font-bold bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl shadow-2xs inline-flex items-center gap-1.5"
            title="Gerar PDF oficial do Relatório Consolidado Mensal do Serviço de Campo"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>
              {gerandoPdfConsolidado ? 'Gerando Relatório...' : 'Gerar PDF Mensal Consolidado'}
            </span>
          </Button>

          <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={mesAnterior}
              className="h-8 w-8 p-0 rounded-lg hover:bg-white text-gray-700"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <div className="px-3 text-center min-w-[150px]">
              <span className="text-sm font-bold text-gray-900 capitalize block">
                {MESES[mesAtual] || ''} {anoAtual}
              </span>
              {isMesAtual && (
                <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block">
                  Mês Atual
                </span>
              )}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={mesSeguinte}
              className="h-8 w-8 p-0 rounded-lg hover:bg-white text-gray-700"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>

            {!isMesAtual && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={irParaMesAtual}
                className="h-8 text-xs font-semibold rounded-lg bg-white border-gray-200 text-emerald-700 hover:bg-emerald-50 ml-1"
              >
                Hoje
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Cards de Métricas Gerais do Mês */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total OS Concluídas */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total Concluídas
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-[#16A34A]">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-gray-900">
            {totaisGerais.totalOS}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            {totaisGerais.totalOS === 1
              ? '1 ordem finalizada'
              : `${totaisGerais.totalOS} ordens finalizadas`}{' '}
            em {MESES[mesAtual] || ''}
          </p>
        </div>

        {/* Prestadores Atuantes */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Prestadores Ativos
            </span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <User className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-gray-900">
            {totaisGerais.totalPrestadores}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Técnicos com OS finalizada no mês</p>
        </div>

        {/* Tempo Médio Geral (se disponível) */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Tempo Médio
            </span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-gray-900">
            {totaisGerais.tempoMedioGeral !== null
              ? formatarDuracao(totaisGerais.tempoMedioGeral)
              : '—'}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            {totaisGerais.tempoMedioGeral !== null
              ? 'Média de execução em campo'
              : 'Sem registro de início/conclusão'}
          </p>
        </div>

        {/* Total em Serviços (se houver valor) ou Distribuição */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs">
          {totaisGerais.temValores ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Valor Total
                </span>
                <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                  <DollarSign className="w-4 h-4" />
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-gray-900 truncate">
                {formatCurrency(totaisGerais.somaValores)}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">Faturamento das OS concluídas</p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Serviços Realizados
                </span>
                <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
                  <Layers className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-gray-900">
                {Object.keys(totaisGerais.tiposTotais).length}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">Tipos distintos executados</p>
            </>
          )}
        </div>
      </div>

      {/* Resumo por Tipo de Serviço no Mês */}
      {totaisGerais.totalOS > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs">
          <div className="flex items-center gap-2 mb-3">
            <Wrench className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Distribuição por Tipo de Serviço em {MESES[mesAtual] || ''}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(totaisGerais.tiposTotais).map(([tipo, count]) => {
              const pct = Math.round((count / totaisGerais.totalOS) * 100)
              return (
                <div
                  key={tipo}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${getBadgeColor(
                    tipo,
                  )}`}
                >
                  <span>{tipo}</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-white/80 font-black text-[11px] shadow-2xs">
                    {count} ({pct}%)
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Conteúdo: Lista por Prestador */}
      {metricasPorPrestador.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 sm:p-12 border border-gray-200 text-center flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#16A34A] flex items-center justify-center mb-3">
            <FileText className="w-7 h-7" />
          </div>
          <h4 className="text-base font-bold text-gray-900 mb-1">
            Nenhuma OS concluída em {MESES[mesAtual] || ''} de {anoAtual}
          </h4>
          <p className="text-xs text-gray-500 max-w-md mb-4">
            Não há registros de ordens de serviço finalizadas neste mês. Navegue pelos meses
            anteriores ou acompanhe as ordens em andamento nas abas Pendentes e Calendário.
          </p>
          {!isMesAtual && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={irParaMesAtual}
              className="rounded-xl border-gray-200 text-emerald-700 font-semibold text-xs"
            >
              Voltar ao Mês Atual
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase px-1">
            <span>Ranking por Prestador ({metricasPorPrestador.length})</span>
            <span>Ordenado por OS Concluídas</span>
          </div>

          {metricasPorPrestador.map((prestador, index) => {
            const isExpanded = prestadorAberto === prestador.nome
            const pctTotal =
              totaisGerais.totalOS > 0
                ? Math.round((prestador.totalConcluidas / totaisGerais.totalOS) * 100)
                : 0

            return (
              <div
                key={prestador.nome}
                className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden transition-all hover:border-emerald-300"
              >
                {/* Cabeçalho do Card do Prestador */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleExpandirPrestador(prestador.nome)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      toggleExpandirPrestador(prestador.nome)
                    }
                  }}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-gray-50/70 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                        index === 0
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : index === 1
                            ? 'bg-slate-100 text-slate-800 border border-slate-300'
                            : index === 2
                              ? 'bg-orange-100 text-orange-900 border border-orange-300'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      #{index + 1}
                    </span>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base font-bold text-gray-900">{prestador.nome}</h4>
                        {index === 0 && totaisGerais.totalOS > 1 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-200">
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            Mais Produtivo
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {prestador.totalConcluidas}{' '}
                        {prestador.totalConcluidas === 1 ? 'OS concluída' : 'OS concluídas'} no mês
                        ({pctTotal}% do total)
                      </p>
                    </div>
                  </div>

                  {/* Métricas Resumidas à Direita */}
                  <div className="flex items-center gap-3 sm:gap-6 self-end sm:self-auto flex-wrap">
                    {/* Tempo Médio */}
                    {prestador.tempoMedioMinutos !== null && (
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-gray-400 block">
                          Tempo Médio
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-gray-700 flex items-center gap-1 justify-end">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          {formatarDuracao(prestador.tempoMedioMinutos)}
                        </span>
                      </div>
                    )}

                    {/* Valor Total se houver */}
                    {prestador.valorTotal > 0 && (
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-gray-400 block">
                          Faturamento
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-emerald-700">
                          {formatCurrency(prestador.valorTotal)}
                        </span>
                      </div>
                    )}

                    {/* Total Concluídas Destaque */}
                    <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-center min-w-[70px]">
                      <span className="text-[10px] uppercase font-black text-emerald-800 block">
                        Concluídas
                      </span>
                      <span className="text-base sm:text-lg font-black text-emerald-800">
                        {prestador.totalConcluidas}
                      </span>
                    </div>

                    <div className="text-gray-400">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Tipos de Serviço Realizados por este Prestador */}
                <div className="px-4 sm:px-5 pb-3 pt-1 border-t border-gray-100 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold text-gray-500 mr-1 flex items-center gap-1">
                    <Briefcase className="w-3 h-3 text-gray-400" />
                    Serviços:
                  </span>
                  {Object.entries(prestador.porTipo).map(([tipo, qtd]) => (
                    <span
                      key={tipo}
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg border ${getBadgeColor(
                        tipo,
                      )}`}
                    >
                      {tipo}: <strong>{qtd}</strong>
                    </span>
                  ))}
                </div>

                {/* Detalhes Expansíveis: Tabela/Cards das OS deste Prestador */}
                {isExpanded && (
                  <div className="bg-gray-50/70 p-4 sm:p-5 border-t border-gray-200 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-bold text-gray-600 mb-1">
                      <span>Ordens de Serviço Concluídas ({prestador.ordens.length})</span>
                      <span className="text-[11px] text-gray-400 font-normal">
                        Clique em uma OS para visualizar a ficha completa
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {prestador.ordens.map((os) => {
                        const cliente = os.expand?.cliente_id
                        const dtConclusao = extrairDataConclusao(os)
                        const dtInicio = extrairDataInicio(os)
                        let duracaoMinutos: number | null = null
                        if (dtInicio && dtConclusao) {
                          const diff = (dtConclusao.getTime() - dtInicio.getTime()) / (1000 * 60)
                          if (diff > 0 && diff <= 72 * 60) duracaoMinutos = Math.round(diff)
                        }

                        const valorOS =
                          (os as any).valor ||
                          (os as any).valor_servico ||
                          (os as any).valor_final ||
                          null

                        return (
                          <div
                            key={os.id}
                            onClick={() => onSelectOS && onSelectOS(os)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                if (onSelectOS) {
                                  onSelectOS(os)
                                }
                              }
                            }}
                            className="bg-white rounded-xl p-3 sm:p-3.5 border border-gray-200 hover:border-emerald-500 hover:shadow-xs transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                          >
                            <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                              <span className="p-1.5 rounded-lg bg-emerald-100 text-[#166534] shrink-0">
                                <CheckCircle2 className="w-4 h-4" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    title={
                                      cliente?.nome || cliente?.razao_social || 'Cliente Solar'
                                    }
                                    className="text-xs font-bold text-gray-900 line-clamp-2 leading-snug"
                                  >
                                    {cliente?.nome || cliente?.razao_social || 'Cliente Solar'}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] font-bold uppercase shrink-0 ${getBadgeColor(
                                      os.tipo_servico,
                                    )}`}
                                  >
                                    {os.tipo_servico}
                                  </Badge>
                                </div>
                                <div
                                  title={[
                                    os.endereco || cliente?.endereco || 'Sem endereço',
                                    cliente?.cidade,
                                  ]
                                    .filter(Boolean)
                                    .join(' • ')}
                                  className="text-[11px] text-gray-500 mt-0.5 line-clamp-2 leading-relaxed break-words"
                                >
                                  {os.endereco || cliente?.endereco || 'Sem endereço'}
                                  {cliente?.cidade ? ` • ${cliente.cidade}` : ''}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-auto text-xs flex-wrap justify-end">
                              {/* Duração individual se houver */}
                              {duracaoMinutos !== null && (
                                <span className="text-[11px] font-medium text-gray-600 flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-md">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  {formatarDuracao(duracaoMinutos)}
                                </span>
                              )}

                              {/* Valor se houver */}
                              {typeof valorOS === 'number' && valorOS > 0 && (
                                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                  {formatCurrency(valorOS)}
                                </span>
                              )}

                              {/* Data de Conclusão */}
                              <span className="text-[11px] text-gray-500 font-medium">
                                Concluída em:{' '}
                                <strong>{formatDateTime(os.concluida_em || os.updated)}</strong>
                              </span>

                              {/* Botões de Relatório PDF e WhatsApp para Admin */}
                              <div
                                className="flex items-center gap-1.5 ml-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={gerandoPdfOsId === os.id}
                                  onClick={() => handleVerRelatorioPdf(os)}
                                  className="h-8 px-2.5 text-[10px] font-bold text-emerald-800 border-emerald-300 hover:bg-emerald-50 bg-white"
                                  title="Ver Relatório Técnico de Execução em PDF"
                                >
                                  <FileText className="w-3 h-3 mr-1 text-emerald-600" />
                                  {gerandoPdfOsId === os.id ? 'Gerando...' : 'Ver PDF'}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => setOsParaEnviarCliente(os)}
                                  className="h-8 px-2.5 text-[10px] font-bold bg-[#16A34A] hover:bg-[#15803D] text-white shadow-2xs inline-flex items-center gap-1"
                                  title="Enviar Relatório Técnico por E-mail e WhatsApp ao Cliente"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>Enviar ao Cliente</span>
                                </Button>{' '}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de Envio por WhatsApp no Relatório */}
      {osParaWhatsApp && (
        <ModalEnviarRelatorioOSWhatsApp
          isOpen={Boolean(osParaWhatsApp)}
          onClose={() => setOsParaWhatsApp(null)}
          os={osParaWhatsApp}
          cliente={osParaWhatsApp.expand?.cliente_id}
        />
      )}

      {/* Modal Enviar Relatório ao Cliente (E-mail + WhatsApp) */}
      {osParaEnviarCliente && (
        <ModalEnviarRelatorioCliente
          isOpen={Boolean(osParaEnviarCliente)}
          onClose={() => setOsParaEnviarCliente(null)}
          os={osParaEnviarCliente}
          cliente={osParaEnviarCliente.expand?.cliente_id}
        />
      )}
    </div>
  )
}

export default RelatorioOSPrestador
