import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Download,
  Printer,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Building,
  User,
  Zap,
} from 'lucide-react'
import type {
  TipoDocumentoProjeto,
  DadosDocumentoProjetoInput,
} from '@/lib/documentosProjetosSolarGenerator'
import {
  TITULOS_DOCUMENTOS,
  baixarDocumentoProjetoDocx,
  abrirDocumentoProjetoEmNovaAba,
} from '@/lib/documentosProjetosSolarGenerator'
import { formatarCPF } from '@/lib/cpfValidator'
import { formatWhatsAppPhone } from '@/lib/formatters'

interface ModalConfirmarDocumentoProjetoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tipo: TipoDocumentoProjeto
  dadosIniciais: Partial<DadosDocumentoProjetoInput>
  onConfirmado?: (dados: DadosDocumentoProjetoInput) => void
}

export const ModalConfirmarDocumentoProjeto: React.FC<ModalConfirmarDocumentoProjetoProps> = ({
  open,
  onOpenChange,
  tipo,
  dadosIniciais,
  onConfirmado,
}) => {
  const [formData, setFormData] = useState<DadosDocumentoProjetoInput>({
    tipo,
    clienteNome: '',
    clienteCpfCnpj: '',
    clienteEndereco: '',
    clienteTelefone: '',
    clienteEmail: '',
    titularNome: '',
    titularCpf: '',
    titularTelefone: '',
    titularEmail: '',
    numeroUC: '4091823719',
    concessionaria: 'RGE (Rio Grande Energia)',
    potenciaKwp: 28.5,
    quantidadeModulos: 50,
    marcaModeloModulos: 'Canadian Solar 570W TOPCon',
    marcaModeloInversor: 'Growatt MAC 25KTL3-XL',
    potenciaInversorKw: 25.0,
    valorTotal: 78500,
    condicoesPagamento: 'Entrada de 30% + Saldo financiado ou na homologação',
    cidade: 'Passo Fundo / RS',
    ucDestino: '',
    percentualRateio: '100%',
    novoTitularNome: '',
    novoTitularCpf: '',
  })

  const [isGeneratingDocx, setIsGeneratingDocx] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  useEffect(() => {
    if (open) {
      setFormData({
        tipo,
        clienteNome: dadosIniciais.clienteNome || '',
        clienteCpfCnpj: dadosIniciais.clienteCpfCnpj || '',
        clienteEndereco: dadosIniciais.clienteEndereco || '',
        clienteTelefone: dadosIniciais.clienteTelefone || '',
        clienteEmail: dadosIniciais.clienteEmail || '',
        titularNome: dadosIniciais.titularNome || dadosIniciais.clienteNome || '',
        titularCpf: dadosIniciais.titularCpf || dadosIniciais.clienteCpfCnpj || '',
        titularTelefone: dadosIniciais.titularTelefone || dadosIniciais.clienteTelefone || '',
        titularEmail: dadosIniciais.titularEmail || dadosIniciais.clienteEmail || '',
        numeroUC: dadosIniciais.numeroUC || '4091823719',
        concessionaria: dadosIniciais.concessionaria || 'RGE (Rio Grande Energia)',
        potenciaKwp: dadosIniciais.potenciaKwp || 28.5,
        quantidadeModulos: dadosIniciais.quantidadeModulos || 50,
        marcaModeloModulos: dadosIniciais.marcaModeloModulos || 'Canadian Solar 570W TOPCon',
        marcaModeloInversor: dadosIniciais.marcaModeloInversor || 'Growatt MAC 25KTL3-XL',
        potenciaInversorKw: dadosIniciais.potenciaInversorKw || 25.0,
        valorTotal: dadosIniciais.valorTotal || 78500,
        condicoesPagamento:
          dadosIniciais.condicoesPagamento || 'Entrada de 30% + Saldo financiado ou na homologação',
        cidade: dadosIniciais.cidade || 'Passo Fundo / RS',
        ucDestino: dadosIniciais.ucDestino || '',
        percentualRateio: dadosIniciais.percentualRateio || '100%',
        novoTitularNome: dadosIniciais.novoTitularNome || '',
        novoTitularCpf: dadosIniciais.novoTitularCpf || '',
      })
      setIsSuccess(false)
    }
  }, [open, tipo, dadosIniciais])

  const handleCpfChange = (
    field: 'clienteCpfCnpj' | 'titularCpf' | 'novoTitularCpf',
    val: string,
  ) => {
    const raw = val.replace(/\D/g, '')
    if (raw.length <= 11) {
      setFormData((prev) => ({ ...prev, [field]: formatarCPF(raw) }))
    } else {
      setFormData((prev) => ({ ...prev, [field]: val }))
    }
  }

  const handlePhoneChange = (field: 'clienteTelefone' | 'titularTelefone', val: string) => {
    setFormData((prev) => ({ ...prev, [field]: formatWhatsAppPhone(val) }))
  }

  const handleDownloadDocx = async () => {
    try {
      setIsGeneratingDocx(true)
      await baixarDocumentoProjetoDocx(formData)
      setIsSuccess(true)
      onConfirmado?.(formData)
    } catch (err) {
      console.error('Erro ao gerar DOCX:', err)
      alert('Erro ao gerar arquivo Word. Tente novamente.')
    } finally {
      setIsGeneratingDocx(false)
    }
  }

  const handleVisualizarEImprimir = () => {
    abrirDocumentoProjetoEmNovaAba(formData)
    setIsSuccess(true)
    onConfirmado?.(formData)
  }

  const tituloDoc = TITULOS_DOCUMENTOS[tipo] || 'Documento do Projeto'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
              <FileText className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Revisão e Elaboração de Documento
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Confirme e ajuste os dados extraídos da ficha do cliente antes de gerar o documento
                oficial.
              </DialogDescription>
            </div>
          </div>
          <div className="mt-2">
            <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold px-2.5 py-0.5"
            >
              {tituloDoc}
            </Badge>
          </div>
        </DialogHeader>

        {isSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-800 text-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <span>
              Documento gerado com sucesso! Você pode baixar em Word (.docx) ou visualizar/imprimir
              em PDF.
            </span>
          </div>
        )}

        <div className="space-y-4 py-2">
          {/* Seção 1: Dados do Cliente */}
          <div className="rounded-lg border border-slate-200 p-3.5 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-emerald-600" /> 1. Dados do Cliente (Ficha
                Cadastral)
              </h4>
              <Badge variant="secondary" className="text-[10px]">
                Pré-preenchido
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <Label className="text-[11px] text-slate-600">Nome Completo / Razão Social</Label>
                <Input
                  className="h-8 text-xs mt-1"
                  value={formData.clienteNome}
                  onChange={(e) => setFormData({ ...formData, clienteNome: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-[11px] text-slate-600">CPF / CNPJ</Label>
                <Input
                  className="h-8 text-xs mt-1 font-mono"
                  value={formData.clienteCpfCnpj}
                  onChange={(e) => handleCpfChange('clienteCpfCnpj', e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-[11px] text-slate-600">Endereço da Instalação / Usina</Label>
                <Input
                  className="h-8 text-xs mt-1"
                  value={formData.clienteEndereco}
                  onChange={(e) => setFormData({ ...formData, clienteEndereco: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-[11px] text-slate-600">Telefone</Label>
                <Input
                  className="h-8 text-xs mt-1"
                  value={formData.clienteTelefone}
                  onChange={(e) => handlePhoneChange('clienteTelefone', e.target.value)}
                />
              </div>
              <div>
                <Label className="text-[11px] text-slate-600">Email</Label>
                <Input
                  className="h-8 text-xs mt-1"
                  value={formData.clienteEmail}
                  onChange={(e) => setFormData({ ...formData, clienteEmail: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Seção 2: Dados do Titular da UC */}
          <div className="rounded-lg border border-emerald-200 p-3.5 bg-emerald-50/30 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wide flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-emerald-700" /> 2. Titular / Responsável pela
                Conta de Energia (UC)
              </h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100"
                onClick={() => {
                  setFormData((prev) => ({
                    ...prev,
                    titularNome: prev.clienteNome,
                    titularCpf: prev.clienteCpfCnpj,
                    titularTelefone: prev.clienteTelefone,
                    titularEmail: prev.clienteEmail,
                  }))
                }}
              >
                <Sparkles className="h-3 w-3 mr-1" /> Usar dados do cliente
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <Label className="text-[11px] text-slate-600">Nome Completo do Titular da UC</Label>
                <Input
                  className="h-8 text-xs mt-1"
                  value={formData.titularNome}
                  onChange={(e) => setFormData({ ...formData, titularNome: e.target.value })}
                  placeholder="Nome na fatura de luz"
                />
              </div>
              <div>
                <Label className="text-[11px] text-slate-600">CPF do Titular da UC</Label>
                <Input
                  className="h-8 text-xs mt-1 font-mono"
                  value={formData.titularCpf}
                  onChange={(e) => handleCpfChange('titularCpf', e.target.value)}
                  placeholder="000.000.000-00"
                />
              </div>
              <div>
                <Label className="text-[11px] text-slate-600">Telefone do Titular</Label>
                <Input
                  className="h-8 text-xs mt-1"
                  value={formData.titularTelefone}
                  onChange={(e) => handlePhoneChange('titularTelefone', e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <Label className="text-[11px] text-slate-600">Email do Titular</Label>
                <Input
                  className="h-8 text-xs mt-1"
                  value={formData.titularEmail}
                  onChange={(e) => setFormData({ ...formData, titularEmail: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <Label className="text-[11px] text-slate-600">Nº da Unidade Consumidora (UC)</Label>
                <Input
                  className="h-8 text-xs mt-1 font-mono"
                  value={formData.numeroUC}
                  onChange={(e) => setFormData({ ...formData, numeroUC: e.target.value })}
                  placeholder="Ex: 4091823719"
                />
              </div>
              <div>
                <Label className="text-[11px] text-slate-600">Concessionária de Energia</Label>
                <Input
                  className="h-8 text-xs mt-1"
                  value={formData.concessionaria}
                  onChange={(e) => setFormData({ ...formData, concessionaria: e.target.value })}
                  placeholder="Ex: RGE (Rio Grande Energia)"
                />
              </div>
            </div>
          </div>

          {/* Seção 3: Dados Técnicos do Sistema Solar & Valor */}
          <div className="rounded-lg border border-slate-200 p-3.5 bg-slate-50/50 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-500" /> 3. Dados do Sistema Solar & Valores
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div>
                <Label className="text-[11px] text-slate-600">Potência Gerador (kWp)</Label>
                <Input
                  type="number"
                  step="0.1"
                  className="h-8 text-xs mt-1"
                  value={formData.potenciaKwp}
                  onChange={(e) =>
                    setFormData({ ...formData, potenciaKwp: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <Label className="text-[11px] text-slate-600">Qtd. Módulos</Label>
                <Input
                  type="number"
                  className="h-8 text-xs mt-1"
                  value={formData.quantidadeModulos}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantidadeModulos: parseInt(e.target.value, 10) || 0,
                    })
                  }
                />
              </div>
              <div>
                <Label className="text-[11px] text-slate-600">Valor Total (R$)</Label>
                <Input
                  type="number"
                  className="h-8 text-xs mt-1 font-semibold text-emerald-800"
                  value={formData.valorTotal}
                  onChange={(e) =>
                    setFormData({ ...formData, valorTotal: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-[11px] text-slate-600">Marca/Modelo dos Módulos</Label>
                <Input
                  className="h-8 text-xs mt-1"
                  value={formData.marcaModeloModulos}
                  onChange={(e) => setFormData({ ...formData, marcaModeloModulos: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-[11px] text-slate-600">Inversor Solar</Label>
                <Input
                  className="h-8 text-xs mt-1"
                  value={formData.marcaModeloInversor}
                  onChange={(e) =>
                    setFormData({ ...formData, marcaModeloInversor: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          {/* Campos específicos conforme o tipo */}
          {tipo === 'anexo_g' && (
            <div className="rounded-lg border border-blue-200 p-3 bg-blue-50/40 space-y-2">
              <h4 className="text-xs font-bold text-blue-900 uppercase">
                Dados de Destino dos Créditos (Anexo G)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <Label className="text-[11px]">UC Beneficiária (Destino)</Label>
                  <Input
                    className="h-8 text-xs mt-1"
                    value={formData.ucDestino}
                    onChange={(e) => setFormData({ ...formData, ucDestino: e.target.value })}
                    placeholder="Ex: 3098124501"
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Percentual de Rateio do Excedente</Label>
                  <Input
                    className="h-8 text-xs mt-1"
                    value={formData.percentualRateio}
                    onChange={(e) => setFormData({ ...formData, percentualRateio: e.target.value })}
                    placeholder="Ex: 100% ou 50%"
                  />
                </div>
              </div>
            </div>
          )}

          {tipo === 'troca_titularidade' && (
            <div className="rounded-lg border border-amber-200 p-3 bg-amber-50/40 space-y-2">
              <h4 className="text-xs font-bold text-amber-900 uppercase">
                Novo Titular Solicitado
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <Label className="text-[11px]">Nome do Novo Titular</Label>
                  <Input
                    className="h-8 text-xs mt-1"
                    value={formData.novoTitularNome}
                    onChange={(e) => setFormData({ ...formData, novoTitularNome: e.target.value })}
                    placeholder="Nome da pessoa física ou jurídica"
                  />
                </div>
                <div>
                  <Label className="text-[11px]">CPF / CNPJ do Novo Titular</Label>
                  <Input
                    className="h-8 text-xs mt-1 font-mono"
                    value={formData.novoTitularCpf}
                    onChange={(e) => handleCpfChange('novoTitularCpf', e.target.value)}
                    placeholder="000.000.000-00"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t pt-3">
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
            <span>Documento emitido com assinatura digital/física para concessionária.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleVisualizarEImprimir}
              className="border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              <Printer className="h-3.5 w-3.5 mr-1 text-slate-600" /> Visualizar / Imprimir PDF
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleDownloadDocx}
              disabled={isGeneratingDocx}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium shadow-sm"
            >
              {isGeneratingDocx ? (
                <span>Gerando Word...</span>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5 mr-1" /> Baixar Documento (.docx)
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
