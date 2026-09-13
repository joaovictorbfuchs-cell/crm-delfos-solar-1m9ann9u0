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
import { Textarea } from '@/components/ui/textarea'
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
  Phone,
  Send,
  ArrowLeft,
  FileCheck,
} from 'lucide-react'
import type {
  TipoDocumentoProjeto,
  DadosDocumentoProjetoInput,
} from '@/lib/documentosProjetosSolarGenerator'
import {
  TITULOS_DOCUMENTOS,
  baixarDocumentoProjetoDocx,
  abrirDocumentoProjetoEmNovaAba,
  baixarDocumentoProjetoHTML,
} from '@/lib/documentosProjetosSolarGenerator'
import { formatarCPF } from '@/lib/cpfValidator'
import { formatWhatsAppPhone } from '@/lib/formatters'

interface ModalConfirmarDocumentoProjetoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tipo: TipoDocumentoProjeto
  dadosIniciais: Partial<DadosDocumentoProjetoInput>
  clienteId?: string
  onConfirmado?: (dados: DadosDocumentoProjetoInput) => void
  onDocumentoEnviadoWhatsApp?: (dados: {
    tipo: TipoDocumentoProjeto
    telefone: string
    mensagem: string
  }) => void
}

export const ModalConfirmarDocumentoProjeto: React.FC<ModalConfirmarDocumentoProjetoProps> = ({
  open,
  onOpenChange,
  tipo,
  dadosIniciais,
  clienteId: _clienteId,
  onConfirmado,
  onDocumentoEnviadoWhatsApp,
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

  // Etapas: 'revisao' (tela inicial com inputs) e 'pos_confirmacao' (tela de sucesso com os 2 botões obrigatórios)
  const [step, setStep] = useState<'revisao' | 'pos_confirmacao'>('revisao')
  const [isGeneratingDocx, setIsGeneratingDocx] = useState(false)

  // Estados para envio WhatsApp na etapa pós-confirmação
  const [whatsAppTelefone, setWhatsAppTelefone] = useState('')
  const [whatsAppMensagem, setWhatsAppMensagem] = useState('')
  const [pdfBaixado, setPdfBaixado] = useState(false)

  useEffect(() => {
    if (open) {
      const initial: DadosDocumentoProjetoInput = {
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
      }
      setFormData(initial)
      setStep('revisao')
      setPdfBaixado(false)

      // Telefone preferencial do cliente ou titular
      const tel = initial.titularTelefone || initial.clienteTelefone || ''
      setWhatsAppTelefone(tel)

      const docNomeCurto =
        tipo === 'procuracao'
          ? 'a procuração'
          : tipo === 'contrato'
            ? 'o contrato'
            : `o documento (${TITULOS_DOCUMENTOS[tipo] || 'projeto'})`

      const clientePrimeiroNome = (initial.titularNome || initial.clienteNome || 'Cliente').split(
        ' ',
      )[0]
      setWhatsAppMensagem(
        `Olá ${clientePrimeiroNome}! Segue em anexo ${docNomeCurto} da Delfos Solar referente ao seu projeto fotovoltaico de ${initial.potenciaKwp} kWp para assinatura. Ficamos à disposição caso tenha qualquer dúvida!`,
      )
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

  // Confirmar dados da revisão e avançar para os DOIS botões: Baixar Documento (PDF) e Enviar pelo WhatsApp
  const handleConfirmarRevisao = () => {
    onConfirmado?.(formData)
    // Atualiza mensagem com os dados consolidados
    const docNomeCurto =
      tipo === 'procuracao'
        ? 'a procuração'
        : tipo === 'contrato'
          ? 'o contrato'
          : `o documento (${TITULOS_DOCUMENTOS[tipo] || 'projeto'})`
    const clientePrimeiroNome = (formData.titularNome || formData.clienteNome || 'Cliente').split(
      ' ',
    )[0]
    setWhatsAppMensagem(
      `Olá ${clientePrimeiroNome}! Segue em anexo ${docNomeCurto} da Delfos Solar referente ao seu projeto fotovoltaico de ${formData.potenciaKwp} kWp para conferência e assinatura.`,
    )
    setWhatsAppTelefone(formData.titularTelefone || formData.clienteTelefone || '')
    setStep('pos_confirmacao')
  }

  // 1. Baixar Documento (PDF / Impressão direta)
  const handleBaixarPDF = () => {
    // Abre a visualização formatada com botão window.print() para salvar como PDF oficial
    abrirDocumentoProjetoEmNovaAba(formData)
    // Também faz o download do arquivo HTML estilizado localmente
    baixarDocumentoProjetoHTML(formData)
    setPdfBaixado(true)
  }

  // 2. Enviar pelo WhatsApp
  const handleEnviarWhatsApp = () => {
    // Como o WhatsApp Web não aceita anexação programática de arquivos,
    // baixamos o arquivo automaticamente e abrimos o wa.me com a mensagem editável
    if (!pdfBaixado) {
      baixarDocumentoProjetoHTML(formData)
      setPdfBaixado(true)
    }

    const cleanPhone = whatsAppTelefone.replace(/\D/g, '')
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`
    const encodedText = encodeURIComponent(whatsAppMensagem)
    const url = `https://wa.me/${phoneWithCountry}?text=${encodedText}`

    window.open(url, '_blank')

    // Dispara callback para registrar status e timeline
    onDocumentoEnviadoWhatsApp?.({
      tipo,
      telefone: whatsAppTelefone,
      mensagem: whatsAppMensagem,
    })
  }

  const handleDownloadDocx = async () => {
    try {
      setIsGeneratingDocx(true)
      await baixarDocumentoProjetoDocx(formData)
    } catch (err) {
      console.error('Erro ao gerar DOCX:', err)
      alert('Erro ao gerar arquivo Word. Tente novamente.')
    } finally {
      setIsGeneratingDocx(false)
    }
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
                {step === 'revisao'
                  ? 'Revisão e Elaboração de Documento'
                  : 'Documento Pronto — Escolha a Ação'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {step === 'revisao'
                  ? 'Confirme e ajuste os dados extraídos da ficha do cliente antes de gerar o documento oficial.'
                  : 'Os dados foram validados com sucesso. Baixe o PDF ou envie para o WhatsApp do cliente.'}
              </DialogDescription>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold px-2.5 py-0.5"
            >
              {tituloDoc}
            </Badge>
            {step === 'pos_confirmacao' && (
              <Badge className="bg-emerald-600 text-white font-medium text-[11px]">
                Dados Revisados & Confirmados
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* ======================================================== */}
        {/* TELA 1: REVISÃO DOS DADOS DO DOCUMENTO                   */}
        {/* ======================================================== */}
        {step === 'revisao' && (
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
                  <Label className="text-[11px] text-slate-600">
                    Endereço da Instalação / Usina
                  </Label>
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
                  <Building className="h-3.5 w-3.5 text-emerald-700" /> 2. Titular / Responsável
                  pela Conta de Energia (UC)
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
                  <Label className="text-[11px] text-slate-600">
                    Nome Completo do Titular da UC
                  </Label>
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
                  <Label className="text-[11px] text-slate-600">
                    Nº da Unidade Consumidora (UC)
                  </Label>
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
                    onChange={(e) =>
                      setFormData({ ...formData, marcaModeloModulos: e.target.value })
                    }
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
                      onChange={(e) =>
                        setFormData({ ...formData, percentualRateio: e.target.value })
                      }
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
                      onChange={(e) =>
                        setFormData({ ...formData, novoTitularNome: e.target.value })
                      }
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
        )}

        {/* ======================================================== */}
        {/* TELA 2: PÓS-CONFIRMAÇÃO COM OS 2 BOTÕES PEDIDOS          */}
        {/* ======================================================== */}
        {step === 'pos_confirmacao' && (
          <div className="space-y-4 py-2">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-emerald-900">
                  Dados revisados e confirmados com sucesso!
                </h4>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Agora você pode <strong>Baixar o Documento (PDF)</strong> oficial ou{' '}
                  <strong>Enviar pelo WhatsApp</strong> com a mensagem personalizada ao cliente.
                </p>
              </div>
            </div>

            {/* Resumo do Documento e Titular */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                <div>
                  <span className="text-slate-400 block text-[11px]">Documento:</span>
                  <strong className="text-slate-900">{tituloDoc}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Titular da UC:</span>
                  <strong className="text-slate-900">
                    {formData.titularNome || formData.clienteNome}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">UC / Concessionária:</span>
                  <span>
                    UC {formData.numeroUC} &bull; {formData.concessionaria}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Potência do Sistema:</span>
                  <span className="font-semibold text-emerald-700">{formData.potenciaKwp} kWp</span>
                </div>
              </div>
            </div>

            {/* Bloco de Envio pelo WhatsApp (telefone do contato do cliente + mensagem editável) */}
            <div className="rounded-xl border border-emerald-300 p-4 bg-emerald-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide flex items-center gap-1.5">
                  <Phone className="h-4 w-4 text-emerald-700" /> Dados de Contato para Envio no
                  WhatsApp
                </h4>
                <Badge
                  variant="outline"
                  className="bg-white text-emerald-800 border-emerald-300 text-[10px]"
                >
                  wa.me com anexo
                </Badge>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-[11px] text-slate-700 font-semibold">
                    Telefone WhatsApp do Cliente/Titular *
                  </Label>
                  <Input
                    className="h-8 text-xs mt-1 bg-white"
                    value={whatsAppTelefone}
                    onChange={(e) => setWhatsAppTelefone(formatWhatsAppPhone(e.target.value))}
                    placeholder="(54) 99712-8844"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Preenchido automaticamente a partir do cadastro do cliente/titular da conta.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-[11px] text-slate-700 font-semibold">
                      Mensagem Pronta (Editável)
                    </Label>
                    <span className="text-[10px] text-slate-400">Pode ajustar antes de abrir</span>
                  </div>
                  <Textarea
                    rows={3}
                    className="text-xs bg-white text-slate-800 resize-none leading-relaxed"
                    value={whatsAppMensagem}
                    onChange={(e) => setWhatsAppMensagem(e.target.value)}
                  />
                </div>

                {/* Aviso amigável sobre o funcionamento do WhatsApp */}
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span>
                      Ao clicar em <strong>Enviar pelo WhatsApp</strong>, o arquivo do documento é
                      baixado automaticamente no seu computador e a conversa é aberta no WhatsApp
                      com a mensagem pronta instruindo o anexo do arquivo.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Ações adicionais secundárias (Word .docx e visualização) */}
            <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
              <span className="text-[11px]">Formatos alternativos:</span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadDocx}
                  disabled={isGeneratingDocx}
                  className="h-7 text-[11px]"
                >
                  <Download className="h-3 w-3 mr-1 text-slate-600" />
                  {isGeneratingDocx ? 'Gerando...' : 'Baixar Word (.docx)'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => abrirDocumentoProjetoEmNovaAba(formData)}
                  className="h-7 text-[11px]"
                >
                  <Printer className="h-3 w-3 mr-1 text-slate-600" /> Visualizar / Imprimir
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t pt-3">
          {step === 'revisao' ? (
            <>
              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                <span>Confirme os dados antes de emitir e enviar ao cliente.</span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleConfirmarRevisao}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium shadow-sm"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" /> Confirmar Dados e Avançar
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setStep('revisao')}
                className="text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Voltar à Revisão
              </Button>

              {/* OS DOIS BOTÕES SOLICITADOS PELO USUÁRIO:
                  1. Baixar Documento (PDF)
                  2. Enviar pelo WhatsApp */}
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleBaixarPDF}
                  className="border-emerald-600 text-emerald-800 hover:bg-emerald-50 font-semibold shadow-xs"
                >
                  <Download className="h-4 w-4 mr-1.5 text-emerald-700" />
                  <span>Baixar Documento (PDF)</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleEnviarWhatsApp}
                  disabled={!whatsAppTelefone.replace(/\D/g, '')}
                  className="bg-[#16A34A] hover:bg-[#15803D] text-white font-bold shadow-xs hover:scale-[1.02] transition-transform"
                >
                  <Send className="h-4 w-4 mr-1.5" />
                  <span>Enviar pelo WhatsApp</span>
                </Button>
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
