import React, { useState, useRef } from 'react'
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Table as TableIcon,
  Home,
  Building2,
  Trash2,
  Info,
} from 'lucide-react'
import { parseSpreadsheetFile } from '@/lib/spreadsheetParser'
import { extrairLinhasTarifarias, type BlocoDetectado } from '@/lib/planilhaTarifariaParser'
import {
  saveProjecoesTarifarias,
  clearProjecoesTarifarias,
} from '@/services/projecaoTarifariaService'
import {
  saveParametrosTarifarios,
  countParametrosTarifarios,
  type ClasseTarifaria,
} from '@/services/parametrosTarifariosService'
import type { TipoClienteProjecao } from '@/data/planilhaBaseProjecao'
import { formatCurrency } from '@/lib/formatters'

interface ModalImportarPlanilhaTarifariaProps {
  isOpen: boolean
  onClose: () => void
  onImportSuccess?: () => void
  tipoClienteSugerido?: TipoClienteProjecao
}

export const ModalImportarPlanilhaTarifaria: React.FC<ModalImportarPlanilhaTarifariaProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  tipoClienteSugerido = 'residencial',
}) => {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [salvandoProgresso, setSalvandoProgresso] = useState<{
    atual: number
    total: number
  } | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null)
  const [blocos, setBlocos] = useState<BlocoDetectado[]>([])
  const [blocoAtivo, setBlocoAtivo] = useState<TipoClienteProjecao>(tipoClienteSugerido)
  const [modoFiltroTipo, setModoFiltroTipo] = useState<'auto' | 'residencial' | 'comercial'>('auto')

  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleProcessarArquivo = async (file: File) => {
    setArquivo(file)
    setIsParsing(true)
    setErro(null)
    setSucessoMsg(null)
    setBlocos([])

    try {
      const parsedData = await parseSpreadsheetFile(file)
      const resultado = extrairLinhasTarifarias(
        parsedData.rawMatrix,
        modoFiltroTipo === 'auto' ? undefined : modoFiltroTipo,
      )

      if (!resultado.sucesso || resultado.blocos.length === 0) {
        setErro(
          resultado.erro ||
            'Não foram encontradas linhas tarifárias válidas. Verifique se o arquivo contém as colunas de Ano, Tarifa e GD Eco Líquida.',
        )
      } else {
        setBlocos(resultado.blocos)
        // Selecionar o primeiro bloco detectado
        setBlocoAtivo(resultado.blocos[0].tipo)
      }
    } catch (err: unknown) {
      console.error('Erro ao processar arquivo tarifário:', err)
      const msg = err instanceof Error ? err.message : String(err)
      setErro(`Falha ao ler o arquivo: ${msg}`)
    } finally {
      setIsParsing(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleProcessarArquivo(file)
    }
  }

  const handleSalvarNoBanco = async () => {
    if (blocos.length === 0) return

    setIsSaving(true)
    setErro(null)
    setSucessoMsg(null)

    const todasLinhas = blocos.flatMap((b) => b.linhas)
    setSalvandoProgresso({ atual: 0, total: todasLinhas.length })

    try {
      // 1. Gravar em parametros_tarifarios (coleção oficial da Lei 14.300 / CRM Delfos)
      const parametrosPayload = todasLinhas.map((l) => ({
        ano: l.ano,
        classe: l.tipo_cliente as ClasseTarifaria,
        tarifa: l.tarifa_kwh,
        fio_b: l.fio_b_kwh,
        fs: l.fs,
        gd_eco_liquida: l.gd_eco_liquida,
      }))

      const resParametros = await saveParametrosTarifarios(parametrosPayload, {
        delayBetweenItemsMs: 60,
        onProgress: (current, total) => {
          setSalvandoProgresso({ atual: current, total })
        },
      })

      // 2. Gravar também em projecao_tarifaria (retrocompatibilidade da projeção de 25 anos)
      const res = await saveProjecoesTarifarias(todasLinhas, {
        replaceExistingForType: true,
        delayBetweenItemsMs: 100,
      })

      if (!res.success && res.errors.length > 0) {
        setErro(
          `Aviso: ${res.errors.length} de ${todasLinhas.length} linhas falharam ao salvar após múltiplas tentativas: ${res.errors.slice(0, 3).join(', ')}${res.errors.length > 3 ? ` (e mais ${res.errors.length - 3})` : ''}`,
        )
      } else {
        const tipos = blocos.map((b) => b.nome).join(' e ')
        setSucessoMsg(
          `Importação concluída com sucesso! ${resParametros.insertedOrUpdated} parâmetros tarifários foram gravados/atualizados em 'parametros_tarifarios' (${tipos}) com sucesso!`,
        )
        if (onImportSuccess) {
          onImportSuccess()
        }
      }
    } catch (err: unknown) {
      console.error('Erro ao salvar no banco:', err)
      const msg = err instanceof Error ? err.message : String(err)
      setErro(`Erro ao gravar dados no banco de dados: ${msg}`)
    } finally {
      setIsSaving(false)
      setSalvandoProgresso(null)
    }
  }

  const handleLimparBanco = async (tipo?: TipoClienteProjecao) => {
    const label = tipo ? (tipo === 'residencial' ? 'Residenciais' : 'Comerciais') : 'Todos'
    if (
      !confirm(
        `Tem certeza que deseja apagar os dados tarifários oficiais (${label})? O sistema voltará a utilizar a tabela interna de fallback estimado.`,
      )
    ) {
      return
    }

    setIsClearing(true)
    setErro(null)
    setSucessoMsg(null)

    try {
      const removidos = await clearProjecoesTarifarias(tipo)
      setSucessoMsg(
        `Dados tarifários oficiais (${label}) foram removidos (${removidos} registros). O sistema voltou ao fallback estimado.`,
      )
      setBlocos([])
      setArquivo(null)
      if (onImportSuccess) {
        onImportSuccess()
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setErro(`Erro ao remover dados: ${msg}`)
    } finally {
      setIsClearing(false)
    }
  }

  const blocoSelecionado = blocos.find((b) => b.tipo === blocoAtivo) || blocos[0]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Cabeçalho */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-800 via-emerald-700 to-green-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
              <FileSpreadsheet className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight">
                Importar Planilha Tarifária Oficial
              </h3>
              <p className="text-xs text-emerald-100">
                Alimente a projeção de 25 anos com os valores oficiais da concessionária e Lei
                14.300
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Instruções */}
          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-blue-950">
                Formato suportado: Planilha de Orçamento (.xlsx ou .csv)
              </p>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                O leitor identifica automaticamente os blocos <strong>Residencial (FS 30%)</strong>{' '}
                e <strong>Comercial (FS 70%)</strong> com as colunas: <em>Ano</em>,{' '}
                <em>Tarifa (R$/kWh)</em>, <em>FioB (R$/kWh)</em>, <em>FS</em> e{' '}
                <em>GD Eco Líquida (R$/kWh)</em>. O processamento é feito 100% no seu navegador com
                segurança. Ao confirmar, os dados substituem os registros anteriores.
              </p>
            </div>
          </div>

          {/* Área de Seleção / Dropzone */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-700">
                Selecione o arquivo Excel ou CSV da concessionária
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-gray-500">Modo de leitura:</span>
                <select
                  value={modoFiltroTipo}
                  onChange={(e) => {
                    const novoModo = e.target.value as 'auto' | 'residencial' | 'comercial'
                    setModoFiltroTipo(novoModo)
                    if (arquivo) handleProcessarArquivo(arquivo)
                  }}
                  className="text-[11px] font-semibold border border-gray-300 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="auto">Detectar ambos (Automático)</option>
                  <option value="residencial">Forçar Bloco Residencial</option>
                  <option value="comercial">Forçar Bloco Comercial</option>
                </select>
              </div>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">
                  {arquivo ? arquivo.name : 'Clique para escolher a planilha (.xlsx ou .csv)'}
                </p>
                <p className="text-[11px] text-gray-500">
                  Suporta arquivos como "Planilha de orçamento.xlsx" ou exportações tabulares
                </p>
              </div>
            </div>
          </div>

          {/* Feedback de Carregamento */}
          {isParsing && (
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-center gap-2 text-gray-700">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span className="font-semibold text-xs">
                Lendo e parseando planilha no navegador...
              </span>
            </div>
          )}

          {/* Erro */}
          {erro && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-900 flex items-start gap-2 text-xs">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <strong className="block">Atenção ao importar:</strong>
                <p className="text-[11px] text-red-800">{erro}</p>
              </div>
            </div>
          )}

          {/* Sucesso */}
          {sucessoMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-950 flex items-start gap-2 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <strong className="block">Operação Realizada:</strong>
                <p className="text-[11px] text-emerald-800">{sucessoMsg}</p>
              </div>
            </div>
          )}

          {/* Prévia dos Dados Detectados */}
          {blocos.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 pb-2">
                <div className="flex items-center gap-2">
                  <TableIcon className="w-4 h-4 text-emerald-600" />
                  <h4 className="font-bold text-xs uppercase tracking-wider text-gray-800">
                    Prévia das Linhas Detectadas (
                    {blocos.reduce((acc, b) => acc + b.linhas.length, 0)} anos no total)
                  </h4>
                </div>

                {/* Seletor de Bloco para Visualização */}
                <div className="inline-flex rounded-lg p-1 bg-gray-100 border border-gray-200">
                  {blocos.map((bloco) => {
                    const ativo = bloco.tipo === blocoAtivo
                    return (
                      <button
                        key={bloco.tipo}
                        type="button"
                        onClick={() => setBlocoAtivo(bloco.tipo)}
                        className={`px-3 py-1 rounded-md text-[11px] font-bold inline-flex items-center gap-1.5 transition-all ${
                          ativo
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {bloco.tipo === 'residencial' ? (
                          <Home className="w-3 h-3" />
                        ) : (
                          <Building2 className="w-3 h-3" />
                        )}
                        <span>
                          {bloco.nome} ({bloco.linhas.length} anos)
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Tabela de Prévia do Bloco Selecionado */}
              {blocoSelecionado && (
                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-100/90 sticky top-0 z-10 border-b border-gray-200 text-gray-600 uppercase text-[10px] font-black tracking-wider">
                        <tr>
                          <th className="py-2 px-3">Ano</th>
                          <th className="py-2 px-3 text-right">Tarifa (R$/kWh)</th>
                          <th className="py-2 px-3 text-right">Fio B (R$/kWh)</th>
                          <th className="py-2 px-3 text-right">FS</th>
                          <th className="py-2 px-3 text-right bg-emerald-50 text-emerald-900 font-black">
                            GD Eco Líquida (R$/kWh)
                          </th>
                          <th className="py-2 px-3 text-right">Eco. Acum.</th>
                          <th className="py-2 px-3 text-right">Gasto Acum.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {blocoSelecionado.linhas.map((l, idx) => (
                          <tr key={l.ano} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}>
                            <td className="py-1.5 px-3 font-bold text-gray-900">{l.ano}</td>
                            <td className="py-1.5 px-3 text-right text-gray-700">
                              R$ {l.tarifa_kwh.toFixed(4).replace('.', ',')}
                            </td>
                            <td className="py-1.5 px-3 text-right text-gray-600">
                              R$ {l.fio_b_kwh.toFixed(4).replace('.', ',')}
                            </td>
                            <td className="py-1.5 px-3 text-right text-gray-700 font-semibold">
                              {Math.round(l.fs * 100)}%
                            </td>
                            <td className="py-1.5 px-3 text-right font-black text-emerald-700 bg-emerald-50/40">
                              R$ {l.gd_eco_liquida.toFixed(4).replace('.', ',')}
                            </td>
                            <td className="py-1.5 px-3 text-right text-emerald-800">
                              {l.economia_acumulada ? formatCurrency(l.economia_acumulada) : '—'}
                            </td>
                            <td className="py-1.5 px-3 text-right text-red-700">
                              {l.gasto_acumulado ? formatCurrency(l.gasto_acumulado) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rodapé com Ações */}
        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between flex-wrap gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isClearing || isSaving}
              onClick={() => handleLimparBanco()}
              className="px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 border border-red-200 rounded-lg transition-colors inline-flex items-center gap-1 disabled:opacity-50"
              title="Apagar dados da coleção projecao_tarifaria e voltar ao fallback estimado"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-600" />
              <span>Limpar Base Tarifária</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-100 transition-colors"
            >
              Fechar
            </button>

            <button
              type="button"
              disabled={blocos.length === 0 || isSaving}
              onClick={handleSalvarNoBanco}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    {salvandoProgresso && salvandoProgresso.total > 0
                      ? `Salvando (${salvandoProgresso.atual}/${salvandoProgresso.total})...`
                      : 'Salvando no Banco...'}
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Gravar Planilha no Banco</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
export default ModalImportarPlanilhaTarifaria
