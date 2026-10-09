import React, { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  parseConfirmacaoConcessionaria,
  ResultadoParseRateioProtocolo,
} from '@/lib/rateioProtocoloParser'
import { UsinaBeneficiariaItem, UsinaBeneficiariasConfig, UsinaCliente } from '@/types/crm'
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Hash,
  Clock,
  ArrowRight,
  Plus,
  RefreshCw,
  Sparkles,
  Info,
} from 'lucide-react'

interface ModalImportarRateioProtocoloProps {
  isOpen: boolean
  onClose: () => void
  usina: UsinaCliente
  clienteNome?: string
  beneficiariasAtuais?: UsinaBeneficiariasConfig | null
  onConfirmarImportacao: (params: {
    novoConfig: UsinaBeneficiariasConfig
    protocolo: string
    dataHora?: string
    resumo: {
      atualizadas: number
      novas: number
      mantidas: number
      totalTexto: number
    }
    unidadesParaTimeline: Array<{
      numero_uc: string
      identificacao: string
      percentual: number
      isNova: boolean
    }>
  }) => Promise<void>
}

const EXEMPLO_PLACEHOLDER = `Solicitação concluída com sucesso!
Seu protocolo foi gerado e está em andamento. Em breve, nossa equipe entrará em contato para dar prosseguimento. Fique tranquilo, estamos cuidando de tudo para você!.

Protocolo: 2175698383
14:42 05/08/2026

UC | CPF/CNPJ | Rateio | UC âncora | Ações
308155225 | 54323843020 | 5
4004357003 | 54323843020 | 35
4004392324 | 54323843020 | 10
4004357004 | 54323843020 | 35
3083327475 | 54323843020 | 15`

export const ModalImportarRateioProtocolo: React.FC<ModalImportarRateioProtocoloProps> = ({
  isOpen,
  onClose,
  usina,
  clienteNome,
  beneficiariasAtuais,
  onConfirmarImportacao,
}) => {
  const [textoColado, setTextoColado] = useState('')
  const [isProcessando, setIsProcessando] = useState(false)
  const [percentualGeradoraSugerido, setPercentualGeradoraSugerido] = useState<number | string>(0)

  // Unidades atuais já cadastradas na usina
  const unidadesExistentes = useMemo<UsinaBeneficiariaItem[]>(() => {
    return Array.isArray(beneficiariasAtuais?.unidades) ? beneficiariasAtuais!.unidades : []
  }, [beneficiariasAtuais])

  // Resultado do parse tolerante em tempo real
  const parseResultado = useMemo<ResultadoParseRateioProtocolo | null>(() => {
    if (!textoColado.trim()) return null
    return parseConfirmacaoConcessionaria(textoColado)
  }, [textoColado])

  // Quando o parse mudar e for válido, define percentual da geradora inteligente
  React.useEffect(() => {
    if (parseResultado?.sucesso) {
      if (Math.abs(parseResultado.somaPercentuais - 100) <= 0.01) {
        setPercentualGeradoraSugerido(0)
      } else if (parseResultado.somaPercentuais < 100) {
        // Se a soma der menor que 100, sugere a diferença para fechar 100%
        const diff = Math.round((100 - parseResultado.somaPercentuais) * 100) / 100
        setPercentualGeradoraSugerido(diff)
      } else {
        setPercentualGeradoraSugerido(0)
      }
    }
  }, [parseResultado])

  // Simulação / Merge da lista resultante
  const mergePreview = useMemo(() => {
    if (!parseResultado || !parseResultado.sucesso) return null

    const textoUcsMap = new Map<string, number>()
    for (const u of parseResultado.unidades) {
      textoUcsMap.set(u.numero_uc, u.percentual)
    }

    const mapaExistentes = new Map<string, UsinaBeneficiariaItem>()
    for (const item of unidadesExistentes) {
      const ucLimpa = String(item.numero_uc || '').trim()
      if (ucLimpa) {
        mapaExistentes.set(ucLimpa, item)
      }
    }

    let atualizadasCount = 0
    let novasCount = 0
    let mantidasCount = 0

    const listaFinal: Array<{
      numero_uc: string
      identificacao: string
      percentual: number
      tipo: 'atualizada' | 'nova' | 'mantida'
      percentualAnterior?: number
    }> = []

    // 1. Processar UCs que vieram no texto da concessionária
    for (const u of parseResultado.unidades) {
      const existe = mapaExistentes.get(u.numero_uc)
      if (existe) {
        atualizadasCount++
        listaFinal.push({
          numero_uc: u.numero_uc,
          identificacao: existe.identificacao || '',
          percentual: u.percentual,
          tipo: 'atualizada',
          percentualAnterior: existe.percentual,
        })
      } else {
        novasCount++
        listaFinal.push({
          numero_uc: u.numero_uc,
          identificacao: '',
          percentual: u.percentual,
          tipo: 'nova',
        })
      }
    }

    // 2. Beneficiárias cadastradas que NÃO vieram no texto (manter como estão — regra 100% aditiva)
    for (const item of unidadesExistentes) {
      const ucLimpa = String(item.numero_uc || '').trim()
      if (ucLimpa && !textoUcsMap.has(ucLimpa)) {
        mantidasCount++
        listaFinal.push({
          numero_uc: ucLimpa,
          identificacao: item.identificacao || '',
          percentual: item.percentual,
          tipo: 'mantida',
        })
      }
    }

    const somaUnidades =
      Math.round(listaFinal.reduce((acc, u) => acc + u.percentual, 0) * 100) / 100
    const percGer = Number(percentualGeradoraSugerido) || 0
    const somaTotalComGeradora = Math.round((percGer + somaUnidades) * 100) / 100
    const isValido100 = Math.abs(somaTotalComGeradora - 100) <= 0.01

    return {
      listaFinal,
      atualizadasCount,
      novasCount,
      mantidasCount,
      somaUnidades,
      somaTotalComGeradora,
      isValido100,
    }
  }, [parseResultado, unidadesExistentes, percentualGeradoraSugerido])

  const handleAplicarExemplo = () => {
    setTextoColado(EXEMPLO_PLACEHOLDER)
  }

  const handleLimpar = () => {
    setTextoColado('')
  }

  const handleConfirmar = async () => {
    if (!parseResultado || !parseResultado.sucesso || !mergePreview) {
      alert('Corrija os erros do texto antes de processar.')
      return
    }

    if (!parseResultado.protocolo) {
      alert('Número do protocolo não encontrado.')
      return
    }

    if (!mergePreview.isValido100) {
      alert(
        `A soma dos percentuais deve ser 100% (atual: ${mergePreview.somaTotalComGeradora}%). Ajuste o percentual da geradora ou as unidades antes de confirmar.`,
      )
      return
    }

    setIsProcessando(true)
    try {
      const percGer = Number(percentualGeradoraSugerido) || 0
      const unidadesPayload: UsinaBeneficiariaItem[] = mergePreview.listaFinal.map((u) => ({
        numero_uc: u.numero_uc,
        identificacao: u.identificacao,
        percentual: u.percentual,
      }))

      const novoConfig: UsinaBeneficiariasConfig = {
        habilitado: true,
        percentual_geradora: percGer,
        unidades: unidadesPayload,
        protocolo: parseResultado.protocolo,
        data_protocolo: parseResultado.dataHora,
        atualizado_em: new Date().toISOString(),
      }

      const unidadesParaTimeline = mergePreview.listaFinal.map((u) => ({
        numero_uc: u.numero_uc,
        identificacao: u.identificacao,
        percentual: u.percentual,
        isNova: u.tipo === 'nova',
      }))

      await onConfirmarImportacao({
        novoConfig,
        protocolo: parseResultado.protocolo,
        dataHora: parseResultado.dataHora,
        resumo: {
          atualizadas: mergePreview.atualizadasCount,
          novas: mergePreview.novasCount,
          mantidas: mergePreview.mantidasCount,
          totalTexto: parseResultado.unidades.length,
        },
        unidadesParaTimeline,
      })

      onClose()
      setTextoColado('')
    } catch (err: any) {
      console.error('Erro ao processar importação de rateio:', err)
      alert(err?.message || 'Erro ao processar e salvar beneficiárias e protocolo.')
    } finally {
      setIsProcessando(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isProcessando && !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200">
              <FileText className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <DialogTitle className="text-base font-extrabold text-[#0F2038]">
                Importar Rateio / Protocolo da Concessionária
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Usina <strong>{usina.nome}</strong> • {clienteNome || 'Cliente'} (UC Geradora:{' '}
                {usina.numero_uc || 'Não inf.'})
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-1 text-xs">
          {/* Instruções rápidas */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5 text-emerald-900">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[11px] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                Como funciona a leitura automática:
              </span>
              <button
                type="button"
                onClick={handleAplicarExemplo}
                className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer"
              >
                Preencher com exemplo real RGE
              </button>
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              Copie o texto da tela de confirmação da concessionária (contendo o{' '}
              <strong>Protocolo</strong> e a tabela de <strong>UCs e Rateio</strong>) e cole na
              caixa abaixo. UCs existentes terão seus percentuais atualizados e novas UCs serão
              adicionadas automaticamente.
            </p>
          </div>

          {/* Área de texto para colar confirmação */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span>Cole aqui o texto da confirmação da concessionária:</span>
              </Label>
              {textoColado && (
                <button
                  type="button"
                  onClick={handleLimpar}
                  disabled={isProcessando}
                  className="text-[11px] text-slate-400 hover:text-rose-600 font-semibold"
                >
                  Limpar
                </button>
              )}
            </div>
            <textarea
              rows={7}
              value={textoColado}
              onChange={(e) => setTextoColado(e.target.value)}
              placeholder={`Cole aqui o texto completo copiado da tela da concessionária...\nExemplo:\nProtocolo: 2175698383\n14:42 05/08/2026\nUC | CPF/CNPJ | Rateio\n308155225 | 54323843020 | 5\n4004357003 | 54323843020 | 35`}
              className="w-full rounded-lg border border-slate-300 bg-white p-2.5 font-mono text-[11px] text-slate-800 shadow-2xs focus:border-[#0F2038] focus:ring-1 focus:ring-[#0F2038] focus:outline-none"
              disabled={isProcessando}
            />
          </div>

          {/* Feedback de erros ou avisos do parser */}
          {parseResultado && !parseResultado.sucesso && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-[11px]">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>Não foi possível processar o texto colado:</span>
              </div>
              <ul className="list-disc list-inside text-[11px] pl-1 space-y-0.5">
                {parseResultado.erros.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Quando o parser tiver sucesso: Prévia dos dados extraídos */}
          {parseResultado && parseResultado.sucesso && mergePreview && (
            <div className="p-3.5 rounded-xl border border-emerald-200/90 bg-slate-50/80 space-y-3">
              {/* Cabeçalho do Protocolo e Data */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-emerald-100 text-emerald-800">
                    <Hash className="w-3.5 h-3.5 text-emerald-700" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Protocolo Reconhecido
                    </span>
                    <span className="font-mono font-bold text-xs text-slate-900">
                      {parseResultado.protocolo}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-blue-100 text-blue-800">
                    <Clock className="w-3.5 h-3.5 text-blue-700" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Data / Hora
                    </span>
                    <span className="text-xs font-semibold text-slate-800">
                      {parseResultado.dataHora || 'Não identificada'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Resumo da mesclagem */}
              <div className="flex items-center gap-2 flex-wrap text-[11px]">
                <Badge
                  variant="outline"
                  className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold"
                >
                  {mergePreview.novasCount} nova(s) UC(s)
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-blue-800 border-blue-300 font-bold"
                >
                  {mergePreview.atualizadasCount} atualizada(s)
                </Badge>
                {mergePreview.mantidasCount > 0 && (
                  <Badge
                    variant="outline"
                    className="bg-slate-100 text-slate-700 border-slate-300 font-bold"
                  >
                    {mergePreview.mantidasCount} mantida(s) (não estavam no texto)
                  </Badge>
                )}
              </div>

              {/* Tabela de prévia das beneficiárias */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700">
                    Lista resultante de Beneficiárias ({mergePreview.listaFinal.length}):
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Soma das beneficiárias: <strong>{mergePreview.somaUnidades}%</strong>
                  </span>
                </div>

                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {mergePreview.listaFinal.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2 flex items-center justify-between gap-2 text-[11px] hover:bg-slate-50/80"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          {item.numero_uc}
                        </span>
                        {item.identificacao ? (
                          <span className="text-slate-600 truncate max-w-[180px]">
                            {item.identificacao}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[10px]">
                            (sem identificação)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.tipo === 'nova' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-0.5">
                            <Plus className="w-2.5 h-2.5" /> Nova UC
                          </span>
                        )}
                        {item.tipo === 'atualizada' && (
                          <span className="text-[10px] font-semibold text-blue-700">
                            {item.percentualAnterior !== undefined &&
                            item.percentualAnterior !== item.percentual
                              ? `${item.percentualAnterior}% → `
                              : ''}
                            {item.percentual}%
                          </span>
                        )}
                        {item.tipo === 'mantida' && (
                          <span className="text-[10px] text-slate-500 italic">
                            mantida ({item.percentual}%)
                          </span>
                        )}
                        <span className="font-mono font-bold text-slate-900 bg-emerald-50 text-emerald-900 px-2 py-0.5 rounded border border-emerald-200">
                          {item.percentual}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ajuste do Percentual da Geradora */}
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <Label className="text-xs font-bold text-slate-800 block">
                      Percentual da Geradora (%):
                    </Label>
                    <span className="text-[10px] text-slate-500">
                      Geralmente 0% se 100% dos créditos foram rateados entre as beneficiárias.
                    </span>
                  </div>
                  <div className="w-28 shrink-0">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={percentualGeradoraSugerido}
                      onChange={(e) => setPercentualGeradoraSugerido(e.target.value)}
                      className="h-8 text-xs font-mono font-bold text-right"
                    />
                  </div>
                </div>

                {/* Validação de soma total = 100% */}
                <div
                  className={`p-2 rounded text-[11px] font-bold border flex items-center gap-2 ${
                    mergePreview.isValido100
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-rose-50 text-rose-800 border-rose-300'
                  }`}
                >
                  {mergePreview.isValido100 ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>
                        Soma válida: 100% (Geradora {Number(percentualGeradoraSugerido) || 0}% +
                        Beneficiárias {mergePreview.somaUnidades}%)
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>
                        A soma deve ser 100% — total atual: {mergePreview.somaTotalComGeradora}%
                        (Geradora {Number(percentualGeradoraSugerido) || 0}% + Beneficiárias{' '}
                        {mergePreview.somaUnidades}%). Ajuste o percentual da geradora.
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 border-t border-slate-100 pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isProcessando}
            className="text-xs"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleConfirmar}
            disabled={!parseResultado?.sucesso || !mergePreview?.isValido100 || isProcessando}
            className="bg-[#0F2038] hover:bg-[#1A365D] text-white font-bold text-xs gap-1.5"
          >
            {isProcessando ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Confirmar e Registrar Protocolo</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
