import { useState, useRef, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  UploadCloud,
  FileImage,
  Info,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Sun,
  Layers,
  HelpCircle,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import {
  NOMES_MESES_SOLERGO,
  extrairGeracaoSolergoImagem,
  parsearRelatorioSolergo,
} from '@/services/ocrSolergoService'

export interface ModalImportarSolergoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  geracaoAutomaticaPadrao: number
  potenciaKwp?: number
  valoresIniciais?: number[] | null
  onAplicarSolergo: (dados: {
    valoresMensais: number[]
    totalAnual: number
    imagemArquivo?: File
    nomeArquivo?: string
  }) => void
}

export function ModalImportarSolergo({
  open,
  onOpenChange,
  geracaoAutomaticaPadrao,
  potenciaKwp,
  valoresIniciais,
  onAplicarSolergo,
}: ModalImportarSolergoProps) {
  // Inicializa com valores existentes ou gera distribuição inicial aproximada
  const [valoresMensais, setValoresMensais] = useState<number[]>(() => {
    if (valoresIniciais && valoresIniciais.length === 12) {
      return [...valoresIniciais]
    }
    const media = geracaoAutomaticaPadrao > 0 ? geracaoAutomaticaPadrao / 12 : 350
    const curva = [1.12, 1.05, 1.0, 0.9, 0.78, 0.72, 0.75, 0.85, 0.92, 1.02, 1.1, 1.15]
    return curva.map((f) => Math.round(media * f))
  })

  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [processandoOCR, setProcessandoOCR] = useState(false)
  const [statusOCR, setStatusOCR] = useState<{ status: string; percent: number }>({
    status: '',
    percent: 0,
  })
  const [ocrRealizado, setOcrRealizado] = useState(false)
  const [avisoExtracao, setAvisoExtracao] = useState<string | null>(null)
  const [mostrarDicas, setMostrarDicas] = useState(true)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Total anual calculado dinamicamente da tabela editável
  const totalAnualSolergo = useMemo(() => {
    return valoresMensais.reduce((acc, curr) => acc + (Number(curr) || 0), 0)
  }, [valoresMensais])

  // Diferença em kWh e percentual em relação ao cálculo automático padrão
  const diferencaKwh = totalAnualSolergo - geracaoAutomaticaPadrao
  const percentualDiferenca =
    geracaoAutomaticaPadrao > 0
      ? ((diferencaKwh / geracaoAutomaticaPadrao) * 100).toFixed(1)
      : '0.0'

  const handleArquivoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Formato não suportado',
        description: 'Por favor, selecione uma imagem do relatório (PNG, JPG, WebP).',
        variant: 'destructive',
      })
      return
    }

    setArquivoSelecionado(file)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)

    // Iniciar OCR automaticamente ao selecionar imagem
    await executarLeituraImagem(file)
  }

  const executarLeituraImagem = async (file: File) => {
    setProcessandoOCR(true)
    setStatusOCR({ status: 'Preparando OCR do Solergo...', percent: 10 })
    setAvisoExtracao(null)

    try {
      const res = await extrairGeracaoSolergoImagem(file, geracaoAutomaticaPadrao, (progresso) => {
        setStatusOCR(progresso)
      })

      if (res.valoresMensais && res.valoresMensais.length === 12) {
        setValoresMensais(res.valoresMensais)
      }

      setOcrRealizado(true)
      if (res.aviso) {
        setAvisoExtracao(res.aviso)
      }

      toast({
        title: res.sucesso ? 'Relatório Solergo processado!' : 'Leitura parcial concluída',
        description: res.sucesso
          ? 'Os 12 meses foram extraídos com sucesso. Confira os dados na tabela abaixo.'
          : 'Confira os valores na tabela editável e faça os ajustes necessários.',
      })
    } catch (err: any) {
      console.warn('Erro ao processar OCR do Solergo:', err)
      setAvisoExtracao(
        'Não foi possível extrair automaticamente todos os dados da imagem. Você pode digitar os 12 valores manualmente na tabela abaixo.',
      )
      toast({
        title: 'Atenção na leitura automática',
        description:
          'A imagem pode estar com baixa resolução. Preencha os valores na tabela editável.',
        variant: 'default',
      })
    } finally {
      setProcessandoOCR(false)
    }
  }

  const handleValorMesChange = (index: number, valStr: string) => {
    const valLimpo = valStr.replace(/[^\d]/g, '')
    const n = parseInt(valLimpo, 10) || 0
    setValoresMensais((prev) => {
      const novo = [...prev]
      novo[index] = n
      return novo
    })
  }

  const handlePreencherExemploSombreamento = () => {
    // Exemplo do requisito: Usina 3,75 kWp, automático 4.807, Solergo reduz inverno -> 4.200 kWh/ano
    // Distribuição com inverno reduzido (Mai, Jun, Jul, Ago) totalizando 4.200 kWh/ano
    const exemploSombreamento = [
      420, // Jan
      390, // Fev
      380, // Mar
      330, // Abr
      290, // Mai (inverno sombreado)
      270, // Jun (inverno sombreado)
      280, // Jul (inverno sombreado)
      320, // Ago (inverno sombreado)
      350, // Set
      380, // Out
      400, // Nov
      390, // Dez
    ]
    setValoresMensais(exemploSombreamento)
    toast({
      title: 'Exemplo de sombreamento carregado',
      description: 'Valores mensais preenchidos somando 4.200 kWh/ano (redução no inverno).',
    })
  }

  const handleConfirmar = () => {
    if (totalAnualSolergo <= 0) {
      toast({
        title: 'Valores inválidos',
        description: 'A geração anual total deve ser maior que zero.',
        variant: 'destructive',
      })
      return
    }

    onAplicarSolergo({
      valoresMensais,
      totalAnual: totalAnualSolergo,
      imagemArquivo: arquivoSelecionado || undefined,
      nomeArquivo: arquivoSelecionado?.name,
    })

    toast({
      title: 'Geração do Solergo aplicada com sucesso!',
      description: `Geração simulada ajustada para ${totalAnualSolergo.toLocaleString('pt-BR')} kWh/ano.`,
    })

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-lg dark:bg-amber-950/60 dark:text-amber-300">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                Importar Geração do Solergo
                <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50">
                  Uso Excepcional
                </Badge>
              </DialogTitle>
              <DialogDescription>
                Extração e ajuste fino de curva de geração para situações técnicas específicas
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Dicas e Casos de Uso Excepcional */}
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 text-xs text-slate-700 dark:text-slate-300">
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-200 dark:border-slate-800">
              <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-amber-600" />
                Quando utilizar a revisão via Solergo?
              </span>
              <button
                type="button"
                onClick={() => setMostrarDicas(!mostrarDicas)}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                {mostrarDicas ? 'Ocultar dicas' : 'Ver dicas'}
              </button>
            </div>

            {mostrarDicas && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                <div className="flex items-start gap-1.5">
                  <span className="text-amber-600 font-bold">•</span>
                  <span>
                    <strong>Sombreamento significativo no telhado:</strong> árvores, platibandas ou
                    prédios vizinhos com perdas sazonais.
                  </span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-amber-600 font-bold">•</span>
                  <span>
                    <strong>Perdas adicionais não padrão:</strong> sujeira severa, desvios azimutais
                    múltiplos ou inclinações desfavoráveis.
                  </span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-amber-600 font-bold">•</span>
                  <span>
                    <strong>Divergência técnica:</strong> diferença comprovada entre o motor padrão
                    e o estudo detalhado do engenheiro.
                  </span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-amber-600 font-bold">•</span>
                  <span>
                    <strong>Consumo atípico com ajuste fino:</strong> necessidade de equalização mês
                    a mês para clientes especiais.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Área de Upload da Imagem */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center justify-between">
              <span>Imagem do Relatório Solergo</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handlePreencherExemploSombreamento}
                className="text-xs h-7 text-amber-700 hover:text-amber-800 hover:bg-amber-50"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                Preencher caso teste (4.200 kWh/ano)
              </Button>
            </Label>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-500 rounded-lg p-5 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-amber-50/20"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleArquivoChange}
                className="hidden"
              />

              {arquivoSelecionado ? (
                <div className="flex items-center justify-center gap-3">
                  <FileImage className="w-8 h-8 text-amber-600" />
                  <div className="text-left">
                    <p className="font-medium text-sm text-slate-800 dark:text-slate-200">
                      {arquivoSelecionado.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {(arquivoSelecionado.size / 1024).toFixed(0)} KB • Clique para trocar de
                      imagem
                    </p>
                  </div>
                  {ocrRealizado && !processandoOCR && (
                    <Badge className="bg-emerald-600 text-white ml-2 text-xs">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> OCR Realizado
                    </Badge>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2">
                  <UploadCloud className="w-8 h-8 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Arraste ou clique para selecionar a imagem do relatório Solergo
                    </p>
                    <p className="text-xs text-slate-500">
                      PNG, JPG ou WebP contendo os 12 meses de geração estimada
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Barra de progresso do OCR */}
            {processandoOCR && (
              <div className="space-y-1.5 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 rounded-lg">
                <div className="flex justify-between text-xs text-amber-800 dark:text-amber-200 font-medium">
                  <span>{statusOCR.status || 'Processando OCR...'}</span>
                  <span>{statusOCR.percent}%</span>
                </div>
                <Progress value={statusOCR.percent} className="h-2" />
              </div>
            )}

            {/* Avisos de extração */}
            {avisoExtracao && (
              <Alert className="bg-amber-50/80 border-amber-300 text-amber-900 py-2">
                <AlertTriangle className="h-4 w-4 text-amber-700" />
                <AlertTitle className="text-xs font-semibold">Observação do OCR</AlertTitle>
                <AlertDescription className="text-xs">{avisoExtracao}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Tabela Editável dos 12 Meses */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">
                Valores Mensais de Geração (kWh/mês) — Editável
              </Label>
              <span className="text-xs text-slate-500">
                Você pode conferir e ajustar qualquer mês livremente
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border">
              {NOMES_MESES_SOLERGO.map((mes, idx) => (
                <div key={mes.sigla} className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block text-center">
                    {mes.sigla}
                  </label>
                  <Input
                    type="text"
                    value={valoresMensais[idx] || 0}
                    onChange={(e) => handleValorMesChange(idx, e.target.value)}
                    className="h-8 text-center text-xs font-mono font-semibold"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Comparativo: Automático vs Solergo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-100 dark:bg-slate-800/80 p-4 rounded-lg border">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">
                Cálculo Padrão do Sistema
              </p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                {geracaoAutomaticaPadrao.toLocaleString('pt-BR')}
                <span className="text-xs font-normal text-slate-500 ml-1">kWh/ano</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {potenciaKwp ? `${potenciaKwp.toFixed(2)} kWp configurado` : 'Base automática'}
              </p>
            </div>

            <div className="border-t md:border-t-0 md:border-l border-slate-300 dark:border-slate-700 md:pl-4 pt-2 md:pt-0">
              <p className="text-xs text-amber-700 dark:text-amber-400 uppercase tracking-wide font-bold">
                Total Solergo Calculado
              </p>
              <p className="text-xl font-bold text-amber-800 dark:text-amber-300 mt-1">
                {totalAnualSolergo.toLocaleString('pt-BR')}
                <span className="text-xs font-normal text-slate-500 ml-1">kWh/ano</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Soma dos 12 meses acima</p>
            </div>

            <div className="border-t md:border-t-0 md:border-l border-slate-300 dark:border-slate-700 md:pl-4 pt-2 md:pt-0">
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">
                Diferença de Projeção
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className={`text-xl font-bold ${
                    diferencaKwh < 0
                      ? 'text-rose-600'
                      : diferencaKwh > 0
                        ? 'text-emerald-600'
                        : 'text-slate-600'
                  }`}
                >
                  {diferencaKwh > 0 ? `+${diferencaKwh}` : diferencaKwh} kWh
                </span>
                <Badge
                  variant="outline"
                  className={
                    diferencaKwh < 0
                      ? 'border-rose-300 text-rose-700 bg-rose-50'
                      : diferencaKwh > 0
                        ? 'border-emerald-300 text-emerald-700 bg-emerald-50'
                        : 'border-slate-300'
                  }
                >
                  {Number(percentualDiferenca) > 0
                    ? `+${percentualDiferenca}%`
                    : `${percentualDiferenca}%`}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {diferencaKwh < 0
                  ? 'Redução por sombreamento ou perdas'
                  : diferencaKwh > 0
                    ? 'Acréscimo de irradiação/eficiência'
                    : 'Gerações equivalentes'}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 flex flex-col sm:flex-row gap-2 sm:justify-between items-center">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-slate-600"
          >
            Cancelar / Manter Automático
          </Button>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                // Restaurar curva padrão distribuída
                const media = geracaoAutomaticaPadrao > 0 ? geracaoAutomaticaPadrao / 12 : 350
                const curva = [1.12, 1.05, 1.0, 0.9, 0.78, 0.72, 0.75, 0.85, 0.92, 1.02, 1.1, 1.15]
                setValoresMensais(curva.map((f) => Math.round(media * f)))
                setArquivoSelecionado(null)
                setOcrRealizado(false)
              }}
              size="sm"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Resetar Valores
            </Button>

            <Button
              type="button"
              onClick={handleConfirmar}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            >
              Aplicar Valores do Solergo
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
