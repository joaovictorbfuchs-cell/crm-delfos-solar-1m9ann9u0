import React, { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Sparkles, AlertTriangle, Send, Copy, Check } from 'lucide-react'
import {
  obterRelatorioFaturaPorToken,
  type AnaliseFaturaRegistro,
} from '@/services/analiseFaturaService'
import { ModalEnviarAnaliseWhatsApp } from '@/components/ModalEnviarAnaliseWhatsApp'
import { useToast } from '@/hooks/use-toast'
import { safeObj, safeArr, num, safeStr } from './relatorio-fatura/safeGuards'
import { construirDemonstrativo } from './relatorio-fatura/demonstrativo'
import { CardSecao } from './relatorio-fatura/CardSecao'
import { SecaoKpis } from './relatorio-fatura/SecaoKpis'
import { SecaoDemonstrativo } from './relatorio-fatura/SecaoDemonstrativo'
import { SecaoMedicaoGd } from './relatorio-fatura/SecaoMedicaoGd'
import {
  CabecalhoRelatorio,
  SecaoAlertas,
  SecaoHistoricoConsumo,
  SecaoConclusoes,
} from './relatorio-fatura/SecoesGerais'
import type { GdCalculada, ConsumoHistoricoItem } from './relatorio-fatura/tipos'

export const RelatorioFaturaPage: React.FC = () => {
  const { token } = useParams<{ token: string }>()
  const { toast } = useToast()

  const [registro, setRegistro] = useState<AnaliseFaturaRegistro | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalWhatsAppOpen, setModalWhatsAppOpen] = useState(false)
  const [linkCopiado, setLinkCopiado] = useState(false)
  const [clienteTelefone, setClienteTelefone] = useState('')

  useEffect(() => {
    let cancelado = false
    async function carregar() {
      if (!token) {
        setError('Token de análise não fornecido na URL.')
        setLoading(false)
        return
      }
      try {
        setLoading(true)
        setError(null)
        const data = await obterRelatorioFaturaPorToken(token)
        if (cancelado) return
        setRegistro(data)
        if (data.cliente_id) {
          try {
            const clientModule = await import('@/lib/pocketbase/client')
            const pbInst = (clientModule as any).pb || clientModule.default
            const cli = await pbInst.collection('clientes').getOne(data.cliente_id)
            let contatosDoCli: any[] = []
            try {
              contatosDoCli = await pbInst.collection('contatos_adicionais').getFullList({
                filter: `cliente_id = "${data.cliente_id}"`,
              })
            } catch {
              /* ignore */
            }
            const { resolverNumeroDestinoCliente } =
              await import('@/lib/resolverNumeroDestinoCliente')
            const resolucao = await resolverNumeroDestinoCliente(cli, {
              contatosAdicionais: contatosDoCli,
            })
            if (!cancelado && (resolucao.numeroFormatado || resolucao.numero)) {
              setClienteTelefone(resolucao.numeroFormatado || resolucao.numero)
            }
          } catch {
            /* telefone é opcional — ignora */
          }
        }
      } catch (err: unknown) {
        if (!cancelado) {
          setError(err instanceof Error ? err.message : 'Falha ao carregar relatório.')
        }
      } finally {
        if (!cancelado) setLoading(false)
      }
    }
    carregar()
    return () => {
      cancelado = true
    }
  }, [token])

  const dadosBrutos = registro?.dados_completos as unknown
  const dados = useMemo<Record<string, any>>(() => {
    if (!dadosBrutos) return {}
    if (typeof dadosBrutos === 'string') {
      try {
        return safeObj(JSON.parse(dadosBrutos))
      } catch {
        return {}
      }
    }
    return safeObj(dadosBrutos)
  }, [dadosBrutos])

  const cad = safeObj(dados.dados_cadastrais_fatura)
  const periodo = safeObj(dados.periodo)
  const medicao = safeObj(dados.medicao_e_creditos)
  const papelGd = safeObj(dados.papel_gd)
  const indicadores = safeObj(dados.indicadores)
  const demo = useMemo(
    () => construirDemonstrativo(dados.itens_faturados, dados),
    [dados],
  )

  const gd = useMemo<GdCalculada>(() => {
    const injetada =
      num(medicao.energia_injetada_geracao?.kwh_injetados_mes) || num(dados.energia_injetada_kwh)
    const compensadosMesAtual = num(medicao.creditos?.creditos_compensados_mes_atual_kwh)
    const saldoAtualInstalacao = num(safeObj(medicao.saldo_energia).saldo_atual_instalacao_kwh)
    const participacao = num(papelGd.participacao_geracao_percentual)
    const retidoPercent = num(papelGd.percentual_energia_fica_instalacao)
    const kwhEnviados = num(papelGd.kwh_enviados_outras_ucs)
    const detalheFluxo =
      safeStr(papelGd.fluxo_creditos_detalhe) || safeStr(papelGd.descricao_arranjo)
    return {
      injetada,
      compensadosMesAtual,
      saldoGeradoNaoUsado: Math.max(0, injetada - compensadosMesAtual),
      saldoAtualInstalacao,
      participacao,
      retidoPercent,
      kwhEnviados,
      detalheFluxo,
    }
  }, [medicao, papelGd, dados])

  const historico = useMemo<ConsumoHistoricoItem[]>(
    () =>
      safeArr(dados.historico_consumo)
        .map((h) => safeObj(h))
        .map((h) => ({
          mes: safeStr(h.mes, '—'),
          consumo_kwh: num(h.consumo_kwh),
          dias_ciclo: h.dias_ciclo != null ? num(h.dias_ciclo) : undefined,
        })),
    [dados],
  )
  const maiorConsumo = historico.length
    ? historico.reduce((a, b) => (b.consumo_kwh > a.consumo_kwh ? b : a))
    : null
  const menorConsumo = historico.length
    ? historico.reduce((a, b) => (b.consumo_kwh < a.consumo_kwh ? b : a))
    : null
  const mediaConsumo = historico.length
    ? historico.reduce((acc, h) => acc + h.consumo_kwh, 0) / historico.length
    : 0
  const alertas = useMemo(() => safeArr(dados.alertas).map((a) => safeObj(a)), [dados])
  const conclusoes = useMemo(
    () =>
      safeArr(dados.conclusoes_recomendacoes)
        .map((c) => safeStr(c))
        .filter(Boolean),
    [dados],
  )

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setLinkCopiado(true)
      toast({ title: 'Link copiado!' })
      setTimeout(() => setLinkCopiado(false), 2000)
    } catch {
      /* clipboard indisponível */
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Sparkles className="h-8 w-8 text-emerald-500 mx-auto animate-pulse" />
          <p className="text-sm text-gray-500">Carregando relatório...</p>
        </div>
      </div>
    )
  }

  if (error || !registro) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <CardSecao className="max-w-md w-full text-center space-y-3">
          <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto" />
          <h2 className="text-lg font-bold text-gray-900">Relatório não encontrado</h2>
          <p className="text-sm text-gray-500">
            {error || 'Análise não localizada para este token.'}
          </p>
          <Link to="/" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700">
            Voltar ao início
          </Link>
        </CardSecao>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Barra superior */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Sparkles className="h-5 w-5 text-emerald-500 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-gray-900 truncate">
                Análise de Fatura — {safeStr(registro.cliente_nome, 'Cliente')}
              </h1>
              <p className="text-[11px] text-gray-500 truncate">
                {safeStr(registro.competencia, '—')} · UC {safeStr(registro.uc, '—')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={copiarLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {linkCopiado ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {linkCopiado ? 'Copiado' : 'Copiar link'}
            </button>
            <button
              onClick={() => setModalWhatsAppOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
            >
              <Send className="h-3.5 w-3.5" />
              WhatsApp
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5 pb-16">
        <SecaoKpis medicao={medicao} gd={gd} indicadores={indicadores} />
        <CabecalhoRelatorio
          cad={cad}
          periodo={periodo}
          concessionaria={safeStr(dados.concessionaria)}
          competencia={safeStr(registro.competencia)}
        />
        <SecaoDemonstrativo demo={demo} />
        <SecaoMedicaoGd medicao={medicao} papelGd={papelGd} gd={gd} />
        <SecaoHistoricoConsumo
          historico={historico}
          media={mediaConsumo}
          maior={maiorConsumo}
          menor={menorConsumo}
        />
        <SecaoAlertas alertas={alertas} />
        <SecaoConclusoes conclusoes={conclusoes} indicadores={indicadores} />
      </main>

      <ModalEnviarAnaliseWhatsApp
        isOpen={modalWhatsAppOpen}
        onClose={() => setModalWhatsAppOpen(false)}
        analise={registro}
        linkRelatorio={typeof window !== 'undefined' ? window.location.href : ''}
        telefoneDestino={clienteTelefone || undefined}
      />
    </div>
  )
}

export default RelatorioFaturaPage
