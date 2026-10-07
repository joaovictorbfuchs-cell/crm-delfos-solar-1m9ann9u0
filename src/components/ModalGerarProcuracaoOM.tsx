import React, { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  Phone,
  Send,
  ArrowLeft,
  ExternalLink,
  Info,
  Loader2,
  X,
  FileCheck,
} from 'lucide-react'
import type { Cliente, PropostaOM } from '@/types/crm'
import {
  type DadosProcuracaoOM,
  DADOS_FIXOS_CONTRATADA_PROCURACAO,
  formatarDataExtenso,
  normalizarDadosProcuracao,
  baixarProcuracaoPDF,
  abrirProcuracaoImpressao,
  gerarBase64Procuracao,
} from '@/lib/procuracaoGenerator'
import { formatarCPF } from '@/lib/cpfValidator'
import { formatWhatsAppPhone } from '@/lib/formatters'
import { sendWhatsAppDocumento, createAtividade } from '@/services/crmService'
import { getFriendlyWhatsAppErrorMessage } from '@/lib/whatsappGateway'
import { toast } from 'sonner'
import {
  resolverNumeroDestinoCliente,
  resolverNumeroDestinoClienteSync,
  MENSAGEM_ALERTA_SEM_NUMERO,
  type OrigemNumeroDestino,
} from '@/lib/resolverNumeroDestinoCliente'
import { aplicarPrefixoMensagemManual } from '@/lib/whatsappPrefixo'
export interface ModalGerarProcuracaoOMProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cliente: Cliente
  propostaOM?: PropostaOM | null
  initialDados?: Partial<DadosProcuracaoOM> | null
  modoVisualizacaoDireta?: boolean
  onDocumentoGerado?: (dados: DadosProcuracaoOM) => void
}

export const ModalGerarProcuracaoOM: React.FC<ModalGerarProcuracaoOMProps> = ({
  open,
  onOpenChange,
  cliente,
  propostaOM,
  initialDados,
  modoVisualizacaoDireta = false,
  onDocumentoGerado,
}) => {
  // Etapa 1: 'revisao' (formulário com dados pré-preenchidos e editáveis)
  // Etapa 2: 'previsualizacao' (página A4 com o texto exato + botões de Baixar PDF e WhatsApp)
  const [etapa, setEtapa] = useState<'revisao' | 'previsualizacao'>('revisao')

  // Formulário editável de revisão
  const [formNome, setFormNome] = useState('')
  const [formCpf, setFormCpf] = useState('')
  const [formEndereco, setFormEndereco] = useState('')
  const [formMunicipio, setFormMunicipio] = useState('')
  const [formDataExtenso, setFormDataExtenso] = useState('')
  const [formTelefone, setFormTelefone] = useState('')
  const [origemDestino, setOrigemDestino] = useState<OrigemNumeroDestino>('nenhum')
  const [contatoAdicionalNome, setContatoAdicionalNome] = useState<string | undefined>()

  // Ao abrir o modal, pré-carrega os dados da ficha do cliente ou initialDados
  useEffect(() => {
    if (open && cliente) {
      let cancelResolucao = false
      async function resolverTelefoneCliente() {
        const res = await resolverNumeroDestinoCliente(cliente)
        if (cancelResolucao) return
        setOrigemDestino(res.origem)
        setContatoAdicionalNome(res.contatoAdicionalNome)
        if (res.numeroFormatado && !initialDados?.telefone) {
          setFormTelefone(res.numeroFormatado)
        }
      }
      resolverTelefoneCliente()

      setAtividadeRegistrada(false)

      if (initialDados) {
        setFormNome(initialDados.nome || cliente.titular_nome || cliente.nome || '')
        setFormCpf(initialDados.cpf || cliente.titular_cpf || cliente.cpf || '')
        setFormEndereco(initialDados.endereco || cliente.endereco || '')
        setFormMunicipio(initialDados.municipio || cliente.cidade || 'Passo Fundo/RS')
        setFormDataExtenso(initialDados.dataPorExtenso || formatarDataExtenso(new Date()))
        setFormTelefone(
          initialDados.telefone ||
            cliente.titular_telefone ||
            cliente.telefone ||
            cliente.whatsapp ||
            '',
        )
        setEtapa(modoVisualizacaoDireta ? 'previsualizacao' : 'revisao')
        return
      }

      const nomeEfetivo = cliente.titular_nome || cliente.nome || ''
      const cpfEfetivo = cliente.titular_cpf || cliente.cpf || ''

      const enderecoPartes = [
        cliente.endereco,
        cliente.numero && cliente.numero !== 'S/N' ? `nº ${cliente.numero}` : cliente.numero,
        cliente.bairro,
      ].filter(Boolean)
      const enderecoEfetivo =
        enderecoPartes.length > 0 ? enderecoPartes.join(', ') : cliente.endereco || ''

      const municipioEfetivo = cliente.cidade || 'Passo Fundo/RS'
      const telefoneEfetivo = cliente.whatsapp || cliente.telefone || cliente.titular_telefone || ''

      setFormNome(nomeEfetivo)
      setFormCpf(cpfEfetivo ? formatarCPF(cpfEfetivo) : '')
      setFormEndereco(enderecoEfetivo)
      setFormMunicipio(municipioEfetivo)
      setFormDataExtenso(formatarDataExtenso(new Date()))
      setFormTelefone(telefoneEfetivo ? formatWhatsAppPhone(telefoneEfetivo) : '')
      setEtapa(modoVisualizacaoDireta ? 'previsualizacao' : 'revisao')

      return () => {
        cancelResolucao = true
      }
    }
  }, [open, cliente, initialDados, modoVisualizacaoDireta])

  const dadosConsolidados: DadosProcuracaoOM = useMemo(() => {
    return normalizarDadosProcuracao({
      nome: formNome,
      cpf: formCpf,
      endereco: formEndereco,
      municipio: formMunicipio,
      dataPorExtenso: formDataExtenso,
      telefone: formTelefone,
    })
  }, [formNome, formCpf, formEndereco, formMunicipio, formDataExtenso, formTelefone])

  // Apenas dígitos do telefone para checagem e envio via Z-API
  const telefoneApenasDigitos = useMemo(() => {
    return (formTelefone || '').replace(/\D/g, '')
  }, [formTelefone])

  const temTelefoneValido = telefoneApenasDigitos.length >= 10

  const handleCpfInput = (val: string) => {
    const limpo = val.replace(/\D/g, '')
    if (limpo.length <= 11) {
      setFormCpf(formatarCPF(limpo))
    } else {
      setFormCpf(val)
    }
  }

  const handleTelefoneInput = (val: string) => {
    setFormTelefone(formatWhatsAppPhone(val))
  }

  // Estado para garantir que a atividade é registrada uma única vez por emissão
  const [atividadeRegistrada, setAtividadeRegistrada] = useState(false)
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false)
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false)

  // Submodal de conferência e envio do WhatsApp
  const [modalConferenciaWhatsAppOpen, setModalConferenciaWhatsAppOpen] = useState(false)
  const [whatsappTelefoneEditado, setWhatsappTelefoneEditado] = useState('')
  const [whatsappMensagemEditada, setWhatsappMensagemEditada] = useState('')

  const registrarAtividadeEmissao = (dados: DadosProcuracaoOM) => {
    if (!atividadeRegistrada) {
      setAtividadeRegistrada(true)
      onDocumentoGerado?.(dados)
    }
  }

  // Avançar para tela de pré-visualização A4
  const handleConfirmarRevisao = () => {
    if (!formNome.trim()) {
      toast.warning('Informe o nome completo do titular/outorgante.')
      return
    }
    setEtapa('previsualizacao')
    registrarAtividadeEmissao(dadosConsolidados)
  }

  // 1. Baixar Documento (PDF A4 canônico com margens idênticas ao Imprimir)
  const handleBaixarPDF = async () => {
    setIsDownloadingPDF(true)
    try {
      await baixarProcuracaoPDF(dadosConsolidados)
      registrarAtividadeEmissao(dadosConsolidados)
      toast.success('Download do PDF da procuração iniciado com sucesso!')
    } catch (err) {
      console.error('Erro ao baixar PDF:', err)
      // Fallback abre tela de impressão nativa
      abrirProcuracaoImpressao(dadosConsolidados, true)
      registrarAtividadeEmissao(dadosConsolidados)
    } finally {
      setIsDownloadingPDF(false)
    }
  }

  // 2. Abrir Modal de Conferência de WhatsApp ao clicar no botão "Enviar pelo WhatsApp"
  const handleAbrirConferenciaWhatsApp = () => {
    const primeiroNome = (dadosConsolidados.nome || 'Cliente').split(' ')[0]
    const mensagemTexto = `Olá ${primeiroNome}! Segue em anexo a procuração da Delfos Solar para conferência e assinatura, autorizando os trâmites junto à concessionária de energia. Por favor, assine no campo indicado e nos devolva a via preenchida. Ficamos à disposição!`

    setWhatsappTelefoneEditado(formTelefone || '')
    setWhatsappMensagemEditada(mensagemTexto)
    setModalConferenciaWhatsAppOpen(true)
  }

  // 3. Confirmar e Enviar Documento via WhatsApp com PDF oficial gerado e mensagem como legenda
  const handleConfirmarEnvioWhatsApp = async () => {
    const telLimpo = (whatsappTelefoneEditado || '').replace(/\D/g, '')
    if (telLimpo.length < 10) {
      toast.error('Informe um número de telefone WhatsApp válido com DDD (mínimo 10 dígitos).')
      return
    }

    const mensagemLimpa = whatsappMensagemEditada.trim()
    if (!mensagemLimpa) {
      toast.error('Por favor, informe a mensagem a ser enviada junto à procuração.')
      return
    }

    setIsSendingWhatsApp(true)
    try {
      // 1. Gera o PDF oficial em Base64 Data URI pelo HTML canônico
      const { base64, fileName } = await gerarBase64Procuracao(dadosConsolidados)
      if (!base64) {
        toast.error('Não foi possível gerar o PDF oficial da procuração para envio.')
        setIsSendingWhatsApp(false)
        return
      }

      const legendaComPrefixo = aplicarPrefixoMensagemManual(mensagemLimpa)

      // 2. Envia documento de fato via endpoint oficial de documentos do WhatsApp
      const res = await sendWhatsAppDocumento({
        cliente_id: cliente.id,
        telefone_destino: telLimpo,
        tipo: 'documento',
        legenda: legendaComPrefixo,
        nome_arquivo:
          fileName ||
          `Procuracao_Delfos_${dadosConsolidados.nome.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
        base64: base64,
      })

      if (res.sent || res.ok) {
        toast.success('Procuração em PDF enviada com sucesso pelo WhatsApp!')
        registrarAtividadeEmissao(dadosConsolidados)

        // Registrar atividade no histórico/timeline do cliente
        try {
          await createAtividade({
            cliente_id: cliente.id,
            tipo: 'gerar_procuracao',
            titulo: 'Procuração Particular O&M Enviada via WhatsApp',
            descricao: `Procuração em PDF enviada para ${dadosConsolidados.nome} no número ${formatWhatsAppPhone(telLimpo)} com documento anexo.`,
            data: new Date().toISOString(),
            status: 'concluida',
            autor: 'CRM Delfos Solar',
          })
        } catch (atvErr) {
          console.warn('Falha ao registrar atividade de envio no histórico:', atvErr)
        }

        setModalConferenciaWhatsAppOpen(false)
      } else {
        const errorMsg = getFriendlyWhatsAppErrorMessage(res)
        toast.error(errorMsg || 'Falha ao enviar documento via WhatsApp.')
      }
    } catch (err: any) {
      console.error('Erro ao disparar WhatsApp de procuração O&M com PDF anexo:', err)
      toast.error(err?.message || 'Falha na conexão ao enviar documento via WhatsApp.')
    } finally {
      setIsSendingWhatsApp(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 gap-0 bg-[#F9FAFB]">
        {/* Header Superior */}
        <div className="p-5 sm:p-6 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800">
                <FileText className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-gray-900">
                  {etapa === 'revisao'
                    ? 'Gerar Procuração Particular — Revisão de Dados'
                    : 'Pré-Visualização do Documento — Procuração Particular'}
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500 mt-0.5">
                  {etapa === 'revisao'
                    ? 'Confirme e ajuste as informações do cliente antes de gerar o documento oficial.'
                    : 'Confira a procuração no padrão A4 oficial Delfos antes de baixar ou enviar ao cliente.'}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold text-xs">
                {propostaOM?.plano_escolhido
                  ? `Plano O&M ${propostaOM.plano_escolhido}`
                  : 'Procuração O&M'}
              </Badge>
              {etapa === 'previsualizacao' && (
                <Badge className="bg-emerald-600 text-white font-medium text-xs">
                  Pronto para emissão
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TELA 1: PRÉ-REVISÃO DOS DADOS DO CLIENTE                                  */}
        {/* ========================================================================= */}
        {etapa === 'revisao' && (
          <div className="p-5 sm:p-6 space-y-5">
            {/* Bloco 1: Dados do Cliente / Outorgante (Editáveis) */}
            <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                    1. Dados do Outorgante (Cliente / Titular da UC)
                  </h4>
                </div>
                <span className="text-[11px] text-gray-400">
                  Pré-preenchido da ficha • Editável
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div className="sm:col-span-2">
                  <Label className="text-[11px] font-semibold text-gray-700">
                    Nome Completo do Outorgante <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={formNome}
                    onChange={(e) => setFormNome(e.target.value)}
                    placeholder="Ex: Marcelo Becker"
                    className="h-9 text-xs mt-1 bg-white font-medium"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Substitui o campo «NomeProcuração» do modelo oficial.
                  </p>
                </div>

                <div>
                  <Label className="text-[11px] font-semibold text-gray-700">
                    CPF do Outorgante <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={formCpf}
                    onChange={(e) => handleCpfInput(e.target.value)}
                    placeholder="000.000.000-00"
                    className="h-9 text-xs mt-1 bg-white font-mono"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Substitui o campo «CPF_Procuração».
                  </p>
                </div>

                <div>
                  <Label className="text-[11px] font-semibold text-gray-700">
                    Município e Estado
                  </Label>
                  <Input
                    value={formMunicipio}
                    onChange={(e) => setFormMunicipio(e.target.value)}
                    placeholder="Ex: Passo Fundo/RS ou Erechim/RS"
                    className="h-9 text-xs mt-1 bg-white"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Substitui o campo «MunicipioProcuração».
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <Label className="text-[11px] font-semibold text-gray-700">
                    Endereço Completo de Domicílio
                  </Label>
                  <Input
                    value={formEndereco}
                    onChange={(e) => setFormEndereco(e.target.value)}
                    placeholder="Ex: Linha São João, Km 12, Zona Rural"
                    className="h-9 text-xs mt-1 bg-white"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Substitui o campo «EndereçoProcuração».
                  </p>
                </div>

                <div>
                  <Label className="text-[11px] font-semibold text-gray-700">
                    Data da Procuração (por extenso)
                  </Label>
                  <Input
                    value={formDataExtenso}
                    onChange={(e) => setFormDataExtenso(e.target.value)}
                    placeholder="Ex: 13 de setembro de 2026"
                    className="h-9 text-xs mt-1 bg-white"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Substitui o campo «DataProcuração» (formato brasileiro).
                  </p>
                </div>

                <div>
                  <Label className="text-[11px] font-semibold text-gray-700">
                    Telefone para WhatsApp
                  </Label>
                  <Input
                    value={formTelefone}
                    onChange={(e) => handleTelefoneInput(e.target.value)}
                    placeholder="(54) 99712-8844"
                    className="h-9 text-xs mt-1 bg-white font-mono"
                  />
                  {origemDestino === 'contato_adicional_whatsapp' && (
                    <div className="mt-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-800 flex items-center gap-1.5 font-medium">
                      <span className="font-bold">Contato adicional:</span>
                      <span>{contatoAdicionalNome || 'Contato com WhatsApp'}</span>
                      <span className="text-blue-600">(utilizado como alternativa)</span>
                    </div>
                  )}
                  {origemDestino === 'cliente_telefone' && (
                    <div className="mt-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 flex items-center gap-1.5">
                      <span>Usando telefone do cliente (sem WhatsApp cadastrado).</span>
                    </div>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1">
                    Usado no envio direto pelo WhatsApp.
                  </p>
                </div>
              </div>
            </div>

            {/* Bloco 2: Dados Fixos da Contratada (Informativo, não editável) */}
            <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-emerald-700" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                    2. Outorgados (Dados Fixos da Contratada Delfos)
                  </h4>
                </div>
                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                  Padrão Institucional
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white rounded-xl border border-emerald-100 space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Outorgado 1
                  </span>
                  <div className="font-bold text-gray-900">Daniel Rotava</div>
                  <div className="text-[11px] text-gray-600">
                    CPF: <span className="font-mono">047.838.700-80</span> • RG: 1131962548
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-emerald-100 space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Outorgado 2
                  </span>
                  <div className="font-bold text-gray-900">João Victor Bagetti Fuchs</div>
                  <div className="text-[11px] text-gray-600">
                    CPF: <span className="font-mono">811.562.780-15</span> • RG: 5073762014
                  </div>
                </div>

                <div className="sm:col-span-2 p-2.5 bg-white rounded-xl border border-emerald-100 text-[11px] text-gray-600">
                  <strong className="text-gray-800">Domicílio Profissional:</strong>{' '}
                  {DADOS_FIXOS_CONTRATADA_PROCURACAO.enderecoProfissional}
                </div>
              </div>
            </div>

            {/* Rodapé com botões de ação da Revisão */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 pt-2 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto text-xs"
              >
                Cancelar
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleConfirmarRevisao}
                className="w-full sm:w-auto bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold gap-2 shadow-xs transition-transform hover:scale-[1.01]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar e Gerar Documento</span>
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TELA 2: PRÉ-VISUALIZAÇÃO EM FOLHA A4 COM OS BOTÕES OBRIGATÓRIOS           */}
        {/* ========================================================================= */}
        {etapa === 'previsualizacao' && (
          <div className="p-4 sm:p-6 space-y-5">
            {/* Barra Superior de Ações com os botões obrigatórios */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEtapa('revisao')}
                className="text-xs text-gray-600 hover:text-gray-900 gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar e Editar Dados</span>
              </Button>

              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
                {/* Botão Secundário: Abrir para Impressão */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => abrirProcuracaoImpressao(dadosConsolidados, true)}
                  className="text-xs border-gray-300 text-gray-700 hover:bg-gray-50 gap-1.5 hidden md:inline-flex"
                  title="Abrir versão de impressão nativa"
                >
                  <Printer className="w-4 h-4 text-gray-500" />
                  <span>Imprimir</span>
                </Button>
                {/* BOTÃO OBRIGATÓRIO 1: BAIXAR COMO PDF */}
                <Button
                  type="button"
                  size="sm"
                  onClick={handleBaixarPDF}
                  disabled={isDownloadingPDF}
                  className="bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold gap-1.5 shadow-xs transition-transform hover:scale-[1.02]"
                >
                  {isDownloadingPDF ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>{isDownloadingPDF ? 'Baixando PDF...' : 'Baixar como PDF'}</span>
                </Button>
                {/* BOTÃO OBRIGATÓRIO 2: ENVIAR PELO WHATSAPP (abre modal de conferência) */}
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAbrirConferenciaWhatsApp}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold gap-1.5 shadow-xs transition-transform hover:scale-[1.02]"
                  title="Conferir telefone, mensagem e enviar procuração em PDF anexa pelo WhatsApp"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar pelo WhatsApp</span>
                </Button>{' '}
              </div>
            </div>

            {/* Aviso quando o cliente não tiver telefone */}
            {!temTelefoneValido && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Atenção:</strong> {MENSAGEM_ALERTA_SEM_NUMERO} O botão{' '}
                  <em>Enviar pelo WhatsApp</em> está desabilitado. Você pode voltar à etapa de
                  revisão e preencher o telefone ou fazer o download do PDF.
                </div>
              </div>
            )}

            {/* ===================================================================== */}
            {/* SIMULAÇÃO DA FOLHA A4 COM O TEXTO EXATO DO MODELO OFICIAL             */}
            {/* ===================================================================== */}
            <div className="w-full flex justify-center py-2 overflow-x-auto">
              <div
                className="bg-white rounded-lg border border-gray-300 shadow-xl text-gray-900 select-text"
                style={{
                  width: '210mm',
                  minHeight: '297mm',
                  padding: '25mm',
                  boxSizing: 'border-box',
                  fontFamily: '"Times New Roman", Times, Georgia, serif',
                  fontSize: '12pt',
                  lineHeight: '1.6',
                }}
              >
                {/* Título Principal */}
                <h1
                  className="font-bold uppercase"
                  style={{
                    textAlign: 'center',
                    fontSize: '14pt',
                    letterSpacing: '0.05em',
                    marginBottom: '2rem',
                  }}
                >
                  PROCURAÇÃO PARTICULAR
                </h1>

                {/* Parágrafo OUTORGANTE */}
                <p
                  style={{
                    textAlign: 'justify',
                    textJustify: 'inter-word',
                    marginBottom: '1.25rem',
                    marginTop: 0,
                  }}
                >
                  <strong>OUTORGANTE: {dadosConsolidados.nome},</strong> CPF nº{' '}
                  {dadosConsolidados.cpf}, domiciliado na {dadosConsolidados.endereco},{' '}
                  {dadosConsolidados.municipio}.
                </p>

                {/* Parágrafo OUTORGADOS */}
                <p
                  style={{
                    textAlign: 'justify',
                    textJustify: 'inter-word',
                    marginBottom: '1.25rem',
                    marginTop: 0,
                  }}
                >
                  <strong>OUTORGADOS</strong>: <strong>Daniel Rotava</strong>, brasileiro, inscrito
                  no CPF sob nº. <strong>047.838.700-80</strong>, RG sob nº 1131962548;{' '}
                  <strong>João Victor Bagetti Fuchs</strong>, brasileiro, inscrito no CPF sob nº{' '}
                  <strong>811.562.780-15</strong>, RG sob nº 5073762014.; Todos com domicílio
                  profissional na {DADOS_FIXOS_CONTRATADA_PROCURACAO.enderecoProfissional}
                </p>

                {/* Parágrafo PODERES */}
                <p
                  style={{
                    textAlign: 'justify',
                    textJustify: 'inter-word',
                    marginBottom: '1.25rem',
                    marginTop: 0,
                  }}
                >
                  <strong>PODERES:</strong> Pelo presente instrumento, a <strong>Outorgante</strong>{' '}
                  acima qualificada nomeia e constitui seu bastante procurador a pessoa retro
                  citada, outorgando-lhe os poderes específicos para praticar os atos consistentes
                  nas alterações de titularidade, cadastro e alteração de unidades beneficiárias,
                  protocolos em geral, com plenos poderes para assinar termos e documentos, dentre
                  outros procedimentos correlatos requisitados perante a Concessionária de Energia
                  RGE.
                </p>

                {/* Data e Local */}
                <div
                  style={{
                    marginTop: '2.5rem',
                    marginBottom: '3.5rem',
                    textAlign: 'left',
                  }}
                >
                  Erechim/RS, {dadosConsolidados.dataPorExtenso}.
                </div>

                {/* Bloco de Assinatura */}
                <div
                  style={{
                    marginLeft: 'auto',
                    width: '320px',
                    textAlign: 'center',
                  }}
                  className="space-y-1"
                >
                  <div
                    style={{
                      borderTop: '1px solid #000000',
                      width: '100%',
                      marginBottom: '0.5rem',
                    }}
                  />
                  <div className="font-bold text-xs" style={{ fontSize: '11pt' }}>
                    Assinatura do(a) Outorgante
                  </div>
                  <div className="font-bold text-xs" style={{ fontSize: '11pt' }}>
                    {dadosConsolidados.nome}
                  </div>
                  <div className="font-bold text-xs" style={{ fontSize: '11pt' }}>
                    CPF: {dadosConsolidados.cpf}
                  </div>
                </div>
              </div>
            </div>

            {/* Dica de integração com WhatsApp */}
            <div className="p-3 bg-gray-100 rounded-xl text-[11px] text-gray-600 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-gray-500" />
                Ao clicar em "Enviar pelo WhatsApp", uma caixa de conferência se abre para você
                checar o número, o texto e o PDF em anexo.
              </span>
              <button
                type="button"
                onClick={() => abrirProcuracaoImpressao(dadosConsolidados, false)}
                className="text-emerald-700 hover:text-emerald-900 font-semibold underline flex items-center gap-1 text-[11px]"
              >
                <ExternalLink className="w-3 h-3" />
                Abrir em nova aba
              </button>
            </div>
          </div>
        )}
      </DialogContent>

      {/* ========================================================================= */}
      {/* MODAL DE CONFERÊNCIA ANTES DO DISPARO DO WHATSAPP COM PDF ANEXO           */}
      {/* ========================================================================= */}
      {modalConferenciaWhatsAppOpen && (
        <Dialog open={modalConferenciaWhatsAppOpen} onOpenChange={setModalConferenciaWhatsAppOpen}>
          <DialogContent className="max-w-lg p-0 gap-0 bg-white border border-gray-200 overflow-hidden shadow-2xl">
            {/* Cabeçalho */}
            <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-white to-emerald-50/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#166534] to-[#16A34A] text-white flex items-center justify-center shadow-xs">
                  <Send className="w-5 h-5 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-gray-900 tracking-tight">
                    Conferir e Enviar por WhatsApp
                  </DialogTitle>
                  <DialogDescription className="text-xs text-gray-500">
                    Confira o número, a mensagem e o documento anexo antes de disparar
                  </DialogDescription>
                </div>
              </div>
            </div>

            {/* Corpo do Modal */}
            <div className="p-4 sm:p-5 space-y-4">
              {/* Card do Anexo PDF */}
              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg shrink-0">
                    <FileCheck className="w-4 h-4 text-emerald-700" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-gray-900 truncate">
                      Procuracao_Delfos_
                      {(dadosConsolidados.nome || 'Cliente').replace(/[^a-zA-Z0-9]/g, '_')}.pdf
                    </div>
                    <div className="text-[11px] text-emerald-700 font-medium">
                      PDF da Procuração (Formatação A4 Oficial Delfos)
                    </div>
                  </div>
                </div>

                <Badge className="bg-emerald-600 text-white font-bold text-[10px] shrink-0 uppercase tracking-wider">
                  PDF em anexo
                </Badge>
              </div>

              {/* Campo de Telefone Editável */}
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1 mb-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    Número de Telefone do WhatsApp <span className="text-rose-500">*</span>
                  </span>
                </Label>
                <Input
                  type="text"
                  value={whatsappTelefoneEditado}
                  onChange={(e) => setWhatsappTelefoneEditado(formatWhatsAppPhone(e.target.value))}
                  placeholder="(54) 99712-8844"
                  className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white font-mono"
                />
                {whatsappTelefoneEditado.replace(/\D/g, '').length < 10 && (
                  <p className="text-[11px] text-amber-700 mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Informe um número com DDD válido para envio.
                  </p>
                )}
              </div>

              {/* Campo de Mensagem Editável */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                    Mensagem de Texto (Legenda do Documento){' '}
                    <span className="text-rose-500">*</span>
                  </Label>
                  <span className="text-[11px] text-gray-400">Editável</span>
                </div>
                <textarea
                  rows={4}
                  value={whatsappMensagemEditada}
                  onChange={(e) => setWhatsappMensagemEditada(e.target.value)}
                  placeholder="Digite a mensagem que acompanhará o documento PDF..."
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs leading-relaxed"
                />
              </div>
            </div>

            {/* Rodapé de Ações */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalConferenciaWhatsAppOpen(false)}
                disabled={isSendingWhatsApp}
                className="text-xs"
              >
                Cancelar
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleConfirmarEnvioWhatsApp}
                disabled={
                  isSendingWhatsApp ||
                  whatsappTelefoneEditado.replace(/\D/g, '').length < 10 ||
                  !whatsappMensagemEditada.trim()
                }
                className="bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold gap-2 shadow-xs transition-transform hover:scale-[1.01]"
              >
                {isSendingWhatsApp ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Enviando Documento com PDF...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Confirmar e Enviar</span>
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  )
}
