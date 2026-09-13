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
  Zap,
  DollarSign,
  Send,
  ArrowLeft,
  ExternalLink,
  Info,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import type { Cliente, PropostaOM } from '@/types/crm'
import {
  type DadosContratoOM,
  type PlanoContratoOM,
  type ServicosAdicionaisValores,
  DADOS_FIXOS_CONTRATADA_CONTRATO,
  SERVICOS_ADICIONAIS_PADRAO,
  formatarDataExtenso,
  numeroParaExtensoEmReais,
  normalizarDadosContrato,
  getAnexoIPlanoConteudo,
  getAnexoIIServicos,
  baixarContratoPDF,
  abrirContratoImpressao,
} from '@/lib/contratoGenerator'
import { formatarCPF } from '@/lib/cpfValidator'
import { formatCurrency, formatWhatsAppPhone } from '@/lib/formatters'
import { toast } from 'sonner'

export interface ModalGerarContratoOMProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cliente: Cliente
  propostaOM?: PropostaOM | null
  initialDados?: Partial<DadosContratoOM> | null
  modoVisualizacaoDireta?: boolean
  onDocumentoGerado?: (dados: DadosContratoOM) => void
}

export const ModalGerarContratoOM: React.FC<ModalGerarContratoOMProps> = ({
  open,
  onOpenChange,
  cliente,
  propostaOM,
  initialDados,
  modoVisualizacaoDireta = false,
  onDocumentoGerado,
}) => {
  // Etapa 1: 'revisao' (formulário com todos os dados preenchidos automaticamente da ficha e editáveis)
  // Etapa 2: 'previsualizacao' (página A4 com o texto exato do modelo + botões Baixar PDF e Enviar WhatsApp)
  const [etapa, setEtapa] = useState<'revisao' | 'previsualizacao'>('revisao')

  // Dados do Contratante
  const [formNome, setFormNome] = useState('')
  const [formCpfCnpj, setFormCpfCnpj] = useState('')
  const [formEndereco, setFormEndereco] = useState('')
  const [formMunicipio, setFormMunicipio] = useState('')
  const [formTelefone, setFormTelefone] = useState('')
  const [formEmail, setFormEmail] = useState('')

  // Dados Técnicos do Sistema
  const [formNumModulos, setFormNumModulos] = useState<number | string>('0')
  const [formMarcaInversores, setFormMarcaInversores] = useState('')
  const [formLocalInstalacao, setFormLocalInstalacao] = useState<'Telhado' | 'Solo'>('Telhado')
  const [formEnderecoInstalacaoDiferente, setFormEnderecoInstalacaoDiferente] = useState('')

  // Plano e Valores
  const [formPlano, setFormPlano] = useState<PlanoContratoOM>('Essencial')
  const [formValorTotal, setFormValorTotal] = useState<number>(2280)
  const [formValorMensal, setFormValorMensal] = useState<number>(190)
  const [formDataExtenso, setFormDataExtenso] = useState('')

  // Valores dos Serviços Adicionais (Anexo II)
  const [formServicosAdicionais, setFormServicosAdicionais] = useState<ServicosAdicionaisValores>(
    SERVICOS_ADICIONAIS_PADRAO,
  )
  const [showServicosAdicionaisEdit, setShowServicosAdicionaisEdit] = useState(false)

  // Ao abrir o modal, pré-carrega os dados da ficha do cliente ou initialDados
  useEffect(() => {
    if (open && cliente) {
      setAtividadeRegistrada(false)

      if (initialDados) {
        setFormNome(
          initialDados.nomeRazaoSocial ||
            cliente.razao_social ||
            cliente.nome ||
            cliente.titular_nome ||
            '',
        )
        setFormCpfCnpj(
          initialDados.cpfCnpj || cliente.cnpj || cliente.cpf || cliente.titular_cpf || '',
        )
        setFormEndereco(initialDados.enderecoInstalacao || cliente.endereco || '')
        setFormMunicipio(initialDados.municipio || cliente.cidade || 'Erechim/RS')
        setFormTelefone(
          initialDados.telefone ||
            cliente.telefone ||
            cliente.whatsapp ||
            cliente.titular_telefone ||
            '',
        )
        setFormEmail(initialDados.email || cliente.email || cliente.titular_email || '')
        setFormNumModulos(
          initialDados.numeroModulos || cliente.placas_qtd || propostaOM?.numero_modulos || '0',
        )
        setFormMarcaInversores(
          initialDados.marcaInversores ||
            cliente.inversor_marca ||
            cliente.inversor_modelo ||
            propostaOM?.marca_inversores ||
            'Growatt',
        )
        setFormLocalInstalacao(
          (initialDados.localInstalacao as any) ||
            (String(cliente.telhado_tipo || '')
              .toLowerCase()
              .includes('solo')
              ? 'Solo'
              : 'Telhado'),
        )
        setFormEnderecoInstalacaoDiferente(
          initialDados.enderecoInstalacaoDiferente || cliente.usina_endereco || '',
        )
        setFormPlano(initialDados.planoSelecionado || 'Essencial')
        setFormValorTotal(initialDados.valorTotal || 2280)
        setFormValorMensal(initialDados.valorMensal || 190)
        setFormDataExtenso(initialDados.dataPorExtenso || formatarDataExtenso(new Date()))
        setFormServicosAdicionais(initialDados.servicosAdicionais || SERVICOS_ADICIONAIS_PADRAO)
        setEtapa(modoVisualizacaoDireta ? 'previsualizacao' : 'revisao')
        return
      }

      // Preenchimento automático da ficha do cliente e proposta O&M aprovada
      const nomeEfetivo = cliente.razao_social || cliente.nome || cliente.titular_nome || ''
      const docEfetivo = cliente.cnpj || cliente.cpf || cliente.titular_cpf || ''

      const enderecoPartes = [
        cliente.endereco,
        cliente.numero && cliente.numero !== 'S/N' ? `nº ${cliente.numero}` : cliente.numero,
        cliente.bairro,
      ].filter(Boolean)
      const enderecoEfetivo =
        enderecoPartes.length > 0 ? enderecoPartes.join(', ') : cliente.endereco || ''

      const municipioEfetivo = cliente.cidade || 'Erechim/RS'
      const telefoneEfetivo = cliente.telefone || cliente.whatsapp || cliente.titular_telefone || ''
      const emailEfetivo = cliente.email || cliente.titular_email || ''

      // Sistema Fotovoltaico
      const modulosEfetivo = propostaOM?.numero_modulos || cliente.placas_qtd || 0
      const inversoresEfetivo =
        propostaOM?.marca_inversores ||
        [cliente.inversor_marca, cliente.inversor_modelo].filter(Boolean).join(' ') ||
        'Growatt / Huawei'

      const telhadoTipo = (cliente.telhado_tipo || '').toLowerCase()
      const localEfetivo: 'Telhado' | 'Solo' = telhadoTipo.includes('solo') ? 'Solo' : 'Telhado'

      // Plano e valores da proposta aprovada quando houver
      let planoDef: PlanoContratoOM = 'Essencial'
      let valorMensalDef = 190
      let valorTotalDef = 2280

      if (propostaOM) {
        const planoTexto = (propostaOM.plano_escolhido || '').toLowerCase()
        if (planoTexto.includes('preven')) {
          planoDef = 'Prevenção'
          valorMensalDef = propostaOM.valor_mensal_plano || 450
          valorTotalDef = propostaOM.valor_anual_plano || valorMensalDef * 12
        } else if (propostaOM.plano_escolhido === 'Completo') {
          planoDef = 'Completo'
          valorMensalDef = propostaOM.valor_mensal_plano || 1450
          valorTotalDef = propostaOM.valor_anual_plano || valorMensalDef * 12
        } else if (propostaOM.plano_escolhido === 'Essencial') {
          planoDef = 'Essencial'
          valorMensalDef = propostaOM.valor_mensal_plano || 190
          valorTotalDef = propostaOM.valor_anual_plano || valorMensalDef * 12
        } else if (propostaOM.valor_mensal_plano) {
          valorMensalDef = propostaOM.valor_mensal_plano
          valorTotalDef = propostaOM.valor_anual_plano || valorMensalDef * 12
        }
      }

      setFormNome(nomeEfetivo)
      setFormCpfCnpj(docEfetivo)
      setFormEndereco(enderecoEfetivo)
      setFormMunicipio(municipioEfetivo)
      setFormTelefone(telefoneEfetivo ? formatWhatsAppPhone(telefoneEfetivo) : '')
      setFormEmail(emailEfetivo)
      setFormNumModulos(modulosEfetivo)
      setFormMarcaInversores(inversoresEfetivo)
      setFormLocalInstalacao(localEfetivo)
      setFormEnderecoInstalacaoDiferente(cliente.usina_endereco || '')
      setFormPlano(planoDef)
      setFormValorMensal(valorMensalDef)
      setFormValorTotal(valorTotalDef)
      setFormDataExtenso(formatarDataExtenso(new Date()))
      setFormServicosAdicionais(SERVICOS_ADICIONAIS_PADRAO)
      setEtapa(modoVisualizacaoDireta ? 'previsualizacao' : 'revisao')
    }
  }, [open, cliente, propostaOM, initialDados, modoVisualizacaoDireta])

  // Altera valores quando o plano for mudado na etapa de revisão se o usuário não inseriu custom
  const handlePlanoChange = (novoPlano: PlanoContratoOM) => {
    setFormPlano(novoPlano)
    if (novoPlano === 'Essencial') {
      setFormValorMensal(190)
      setFormValorTotal(190 * 12)
    } else if (novoPlano === 'Prevenção') {
      setFormValorMensal(450)
      setFormValorTotal(450 * 12)
    } else if (novoPlano === 'Completo') {
      setFormValorMensal(1450)
      setFormValorTotal(1450 * 12)
    }
  }

  const handleValorMensalChange = (v: number) => {
    setFormValorMensal(v)
    setFormValorTotal(v * 12)
  }

  const dadosConsolidados: DadosContratoOM = useMemo(() => {
    return normalizarDadosContrato({
      nomeRazaoSocial: formNome,
      cpfCnpj: formCpfCnpj,
      enderecoInstalacao: formEndereco,
      municipio: formMunicipio,
      telefone: formTelefone,
      email: formEmail,
      numeroModulos: formNumModulos,
      marcaInversores: formMarcaInversores,
      localInstalacao: formLocalInstalacao,
      enderecoInstalacaoDiferente: formEnderecoInstalacaoDiferente,
      planoSelecionado: formPlano,
      valorTotal: formValorTotal,
      valorMensal: formValorMensal,
      valorEscritoTotal: numeroParaExtensoEmReais(formValorTotal),
      valorEscritoMensal: numeroParaExtensoEmReais(formValorMensal),
      servicosAdicionais: formServicosAdicionais,
      dataPorExtenso: formDataExtenso,
      cidadeAssinatura: 'Erechim',
    })
  }, [
    formNome,
    formCpfCnpj,
    formEndereco,
    formMunicipio,
    formTelefone,
    formEmail,
    formNumModulos,
    formMarcaInversores,
    formLocalInstalacao,
    formEnderecoInstalacaoDiferente,
    formPlano,
    formValorTotal,
    formValorMensal,
    formDataExtenso,
    formServicosAdicionais,
  ])

  // Telefone para checagem do WhatsApp
  const telefoneApenasDigitos = useMemo(() => {
    return (formTelefone || '').replace(/\D/g, '')
  }, [formTelefone])

  const temTelefoneValido = telefoneApenasDigitos.length >= 10

  const [atividadeRegistrada, setAtividadeRegistrada] = useState(false)

  const registrarAtividadeEmissao = (dados: DadosContratoOM) => {
    if (!atividadeRegistrada) {
      setAtividadeRegistrada(true)
      onDocumentoGerado?.(dados)
    }
  }

  // Avançar para tela de pré-visualização A4
  const handleConfirmarRevisao = () => {
    if (!formNome.trim()) {
      toast.warning('Informe o Nome ou Razão Social do cliente/contratante.')
      return
    }
    if (!formCpfCnpj.trim()) {
      toast.warning('Informe o CPF ou CNPJ do contratante.')
      return
    }
    setEtapa('previsualizacao')
    registrarAtividadeEmissao(dadosConsolidados)
  }

  // 1. Baixar Contrato como PDF binário
  const handleBaixarPDF = () => {
    try {
      baixarContratoPDF(dadosConsolidados)
      registrarAtividadeEmissao(dadosConsolidados)
      toast.success('Download do PDF do contrato iniciado com sucesso!')
    } catch (err) {
      console.error('Erro ao baixar PDF:', err)
      abrirContratoImpressao(dadosConsolidados, true)
      registrarAtividadeEmissao(dadosConsolidados)
    }
  }

  // 2. Enviar pelo WhatsApp
  const handleEnviarWhatsApp = () => {
    if (!temTelefoneValido) {
      toast.error(
        'O cliente não possui telefone de contato válido cadastrado para envio via WhatsApp.',
      )
      return
    }

    try {
      baixarContratoPDF(dadosConsolidados)
    } catch {
      /* intentionally ignored */
    }

    const ddiNumero = telefoneApenasDigitos.startsWith('55')
      ? telefoneApenasDigitos
      : `55${telefoneApenasDigitos}`

    const primeiroNome = (dadosConsolidados.nomeRazaoSocial || 'Cliente').split(' ')[0]
    const mensagemTexto = `Olá ${primeiroNome}! Segue em anexo o Contrato de Prestação de Serviços de Operação e Manutenção (O&M) da Delfos Solar no ${dadosConsolidados.planoSelecionado} para sua conferência e assinatura. O valor mensal é de ${formatCurrency(dadosConsolidados.valorMensal)} (${dadosConsolidados.valorEscritoMensal}). Ficamos à total disposição para qualquer dúvida!`

    const url = `https://wa.me/${ddiNumero}?text=${encodeURIComponent(mensagemTexto)}`
    window.open(url, '_blank')
    registrarAtividadeEmissao(dadosConsolidados)
    toast.success('PDF baixado e WhatsApp aberto com mensagem pronta!')
  }

  const anexoIConteudo = useMemo(() => {
    return getAnexoIPlanoConteudo(dadosConsolidados.planoSelecionado)
  }, [dadosConsolidados.planoSelecionado])

  const anexoIIServicos = useMemo(() => {
    return getAnexoIIServicos(dadosConsolidados.servicosAdicionais)
  }, [dadosConsolidados.servicosAdicionais])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 gap-0 bg-[#F9FAFB]">
        {/* Header Superior */}
        <div className="p-5 sm:p-6 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-gray-900">
                  {etapa === 'revisao'
                    ? 'Gerar Contrato de Prestação de Serviços O&M — Revisão de Dados'
                    : 'Pré-Visualização do Contrato O&M — Modelo Oficial Delfos'}
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500 mt-0.5">
                  {etapa === 'revisao'
                    ? 'Confira os dados do cliente, sistema técnico, plano e valores antes de gerar o contrato oficial.'
                    : 'Confira o contrato completo no padrão A4 oficial Delfos com os anexos antes de baixar ou enviar pelo WhatsApp.'}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold text-xs">
                Plano {dadosConsolidados.planoSelecionado}
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
        {/* TELA 1: PRÉ-REVISÃO DOS DADOS DO CLIENTE E CONTRATO (EDITÁVEIS)          */}
        {/* ========================================================================= */}
        {etapa === 'revisao' && (
          <div className="p-5 sm:p-6 space-y-5">
            {/* Bloco 1: Dados do Cliente / Contratante */}
            <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                    1. Dados do Contratante (Cliente)
                  </h4>
                </div>
                <span className="text-[11px] text-gray-400">Preenchido da ficha • Editável</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div className="sm:col-span-2">
                  <Label className="text-[11px] font-semibold text-gray-700">
                    Nome Completo ou Razão Social <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={formNome}
                    onChange={(e) => setFormNome(e.target.value)}
                    placeholder="Ex: Fazenda Três Palmeiras ou Marcelo Becker"
                    className="h-9 text-xs mt-1 bg-white font-medium"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Substitui «Nome_RazaoSocial» no modelo oficial.
                  </p>
                </div>

                <div>
                  <Label className="text-[11px] font-semibold text-gray-700">
                    CPF ou CNPJ <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={formCpfCnpj}
                    onChange={(e) => setFormCpfCnpj(e.target.value)}
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                    className="h-9 text-xs mt-1 bg-white font-mono"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Substitui «CPFCNPJ».</p>
                </div>

                <div>
                  <Label className="text-[11px] font-semibold text-gray-700">Município / UF</Label>
                  <Input
                    value={formMunicipio}
                    onChange={(e) => setFormMunicipio(e.target.value)}
                    placeholder="Ex: Erechim/RS ou Passo Fundo/RS"
                    className="h-9 text-xs mt-1 bg-white"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Substitui «municipio».</p>
                </div>

                <div className="sm:col-span-2">
                  <Label className="text-[11px] font-semibold text-gray-700">
                    Endereço da Instalação / Domicílio
                  </Label>
                  <Input
                    value={formEndereco}
                    onChange={(e) => setFormEndereco(e.target.value)}
                    placeholder="Ex: Linha São João, Km 12, Zona Rural"
                    className="h-9 text-xs mt-1 bg-white"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Substitui «Enderecoinstalacao».</p>
                </div>

                <div>
                  <Label className="text-[11px] font-semibold text-gray-700">
                    Telefone para Contato / WhatsApp
                  </Label>
                  <Input
                    value={formTelefone}
                    onChange={(e) => setFormTelefone(formatWhatsAppPhone(e.target.value))}
                    placeholder="(54) 99712-8844"
                    className="h-9 text-xs mt-1 bg-white font-mono"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Substitui «Telefone». Usado para envio do contrato via WhatsApp.
                  </p>
                </div>

                <div>
                  <Label className="text-[11px] font-semibold text-gray-700">
                    E-mail do Contratante
                  </Label>
                  <Input
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="cliente@exemplo.com.br"
                    className="h-9 text-xs mt-1 bg-white"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Substitui «Email».</p>
                </div>
              </div>
            </div>

            {/* Bloco 2: Dados Técnicos do Sistema Fotovoltaico */}
            <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                    2. Dados Técnicos do Sistema Fotovoltaico
                  </h4>
                </div>
                <span className="text-[11px] text-gray-400">Parâmetros técnicos da instalação</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                <div>
                  <Label className="text-[11px] font-semibold text-gray-700">
                    Número de Módulos (Painéis)
                  </Label>
                  <Input
                    type="number"
                    value={formNumModulos}
                    onChange={(e) => setFormNumModulos(e.target.value)}
                    placeholder="Ex: 64"
                    className="h-9 text-xs mt-1 bg-white font-medium"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Substitui «N_Modulos».</p>
                </div>

                <div>
                  <Label className="text-[11px] font-semibold text-gray-700">
                    Fabricante e Modelo dos Inversores
                  </Label>
                  <Input
                    value={formMarcaInversores}
                    onChange={(e) => setFormMarcaInversores(e.target.value)}
                    placeholder="Ex: Growatt MAX 30KTL3-X ou Fronius Symo"
                    className="h-9 text-xs mt-1 bg-white font-medium"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Substitui «Marcainversores».</p>
                </div>

                <div>
                  <Label className="text-[11px] font-semibold text-gray-700">
                    Local de Instalação
                  </Label>
                  <select
                    value={formLocalInstalacao}
                    onChange={(e) => setFormLocalInstalacao(e.target.value as any)}
                    className="w-full h-9 px-3 rounded-lg border border-gray-300 text-xs bg-white mt-1 font-medium"
                  >
                    <option value="Telhado">Telhado</option>
                    <option value="Solo">Solo</option>
                  </select>
                  <p className="text-[10px] text-gray-400 mt-1">Substitui «Local_SoloTelhado».</p>
                </div>

                <div className="sm:col-span-3">
                  <Label className="text-[11px] font-semibold text-gray-700">
                    Endereço da Instalação (se diferente do endereço do Contratante)
                  </Label>
                  <Input
                    value={formEnderecoInstalacaoDiferente}
                    onChange={(e) => setFormEnderecoInstalacaoDiferente(e.target.value)}
                    placeholder="Deixe em branco se for o mesmo endereço do cliente acima"
                    className="h-9 text-xs mt-1 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Bloco 3: Plano Contratado e Condições Financeiras */}
            <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                    3. Plano Contratado & Condições Financeiras
                  </h4>
                </div>
                <span className="text-[11px] text-gray-400">Cláusula 5ª • Parcelamento em 12x</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                <div>
                  <Label className="text-[11px] font-semibold text-gray-700">
                    Plano Selecionado <span className="text-rose-500">*</span>
                  </Label>
                  <select
                    value={formPlano}
                    onChange={(e) => handlePlanoChange(e.target.value as PlanoContratoOM)}
                    className="w-full h-9 px-3 rounded-lg border border-gray-300 text-xs bg-white mt-1 font-bold text-emerald-800"
                  >
                    <option value="Essencial">Essencial (R$ 190,00/mês)</option>
                    <option value="Prevenção">Prevenção (R$ 450,00/mês)</option>
                    <option value="Completo">Completo (R$ 1.450,00/mês)</option>
                  </select>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Substitui «PlanoSelecionado» e define o Anexo I.
                  </p>
                </div>

                <div>
                  <Label className="text-[11px] font-semibold text-gray-700">
                    Valor Mensal da Parcela (R$/mês) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="10"
                    value={formValorMensal}
                    onChange={(e) => handleValorMensalChange(Number(e.target.value) || 0)}
                    className="h-9 text-xs mt-1 bg-white font-bold text-emerald-700 font-mono"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Extenso: <em>{numeroParaExtensoEmReais(formValorMensal)}</em>
                  </p>
                </div>

                <div>
                  <Label className="text-[11px] font-semibold text-gray-700">
                    Valor Total Anual (12 parcelas) (R$) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="10"
                    value={formValorTotal}
                    onChange={(e) => setFormValorTotal(Number(e.target.value) || 0)}
                    className="h-9 text-xs mt-1 bg-white font-bold text-gray-900 font-mono"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Extenso: <em>{numeroParaExtensoEmReais(formValorTotal)}</em>
                  </p>
                </div>

                <div className="sm:col-span-3">
                  <Label className="text-[11px] font-semibold text-gray-700">
                    Data da Assinatura (por extenso em português)
                  </Label>
                  <Input
                    value={formDataExtenso}
                    onChange={(e) => setFormDataExtenso(e.target.value)}
                    placeholder="Ex: 14 de setembro de 2026"
                    className="h-9 text-xs mt-1 bg-white"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Substitui «Data» no fecho de Erechim.
                  </p>
                </div>
              </div>
            </div>

            {/* Bloco 4: Serviços Adicionais (Anexo II) — Valores editáveis */}
            <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-3">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setShowServicosAdicionaisEdit(!showServicosAdicionaisEdit)}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                    4. Tabela de Serviços Adicionais (Anexo II)
                  </h4>
                </div>
                <button
                  type="button"
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                >
                  <span>
                    {showServicosAdicionaisEdit
                      ? 'Ocultar Valores'
                      : 'Personalizar Valores (12 Itens)'}
                  </span>
                  {showServicosAdicionaisEdit ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>

              {showServicosAdicionaisEdit ? (
                <div className="pt-2 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs animate-in fade-in">
                  <div>
                    <Label className="text-[10px] text-gray-600">1. Diagnóstico Técnico (R$)</Label>
                    <Input
                      type="number"
                      value={formServicosAdicionais.diagnostico}
                      onChange={(e) =>
                        setFormServicosAdicionais((prev) => ({
                          ...prev,
                          diagnostico: Number(e.target.value) || 0,
                        }))
                      }
                      className="h-8 text-xs bg-white font-mono"
                    />
                  </div>

                  <div>
                    <Label className="text-[10px] text-gray-600">
                      2. Manutenção Corretiva (R$)
                    </Label>
                    <Input
                      type="number"
                      value={formServicosAdicionais.manutencaoCorretiva}
                      onChange={(e) =>
                        setFormServicosAdicionais((prev) => ({
                          ...prev,
                          manutencaoCorretiva: Number(e.target.value) || 0,
                        }))
                      }
                      className="h-8 text-xs bg-white font-mono"
                    />
                  </div>

                  <div>
                    <Label className="text-[10px] text-gray-600">
                      3. Inspeção Termográfica (R$)
                    </Label>
                    <Input
                      type="number"
                      value={formServicosAdicionais.inspecaoTermografica}
                      onChange={(e) =>
                        setFormServicosAdicionais((prev) => ({
                          ...prev,
                          inspecaoTermografica: Number(e.target.value) || 0,
                        }))
                      }
                      className="h-8 text-xs bg-white font-mono"
                    />
                  </div>

                  <div>
                    <Label className="text-[10px] text-gray-600">4. Inspeção Técnica (R$)</Label>
                    <Input
                      type="number"
                      value={formServicosAdicionais.inspecaoTecnica}
                      onChange={(e) =>
                        setFormServicosAdicionais((prev) => ({
                          ...prev,
                          inspecaoTecnica: Number(e.target.value) || 0,
                        }))
                      }
                      className="h-8 text-xs bg-white font-mono"
                    />
                  </div>

                  <div>
                    <Label className="text-[10px] text-gray-600">5. Limpeza de Painéis (R$)</Label>
                    <Input
                      type="number"
                      value={formServicosAdicionais.limpezaPaineis}
                      onChange={(e) =>
                        setFormServicosAdicionais((prev) => ({
                          ...prev,
                          limpezaPaineis: Number(e.target.value) || 0,
                        }))
                      }
                      className="h-8 text-xs bg-white font-mono"
                    />
                  </div>

                  <div>
                    <Label className="text-[10px] text-gray-600">6. Testes em Inversor (R$)</Label>
                    <Input
                      type="number"
                      value={formServicosAdicionais.testesInversor}
                      onChange={(e) =>
                        setFormServicosAdicionais((prev) => ({
                          ...prev,
                          testesInversor: Number(e.target.value) || 0,
                        }))
                      }
                      className="h-8 text-xs bg-white font-mono"
                    />
                  </div>

                  <div>
                    <Label className="text-[10px] text-gray-600">
                      7. Substituição Inversor (R$)
                    </Label>
                    <Input
                      type="number"
                      value={formServicosAdicionais.substituicaoInversor}
                      onChange={(e) =>
                        setFormServicosAdicionais((prev) => ({
                          ...prev,
                          substituicaoInversor: Number(e.target.value) || 0,
                        }))
                      }
                      className="h-8 text-xs bg-white font-mono"
                    />
                  </div>

                  <div>
                    <Label className="text-[10px] text-gray-600">
                      8. Relatório Seguradora (R$)
                    </Label>
                    <Input
                      type="number"
                      value={formServicosAdicionais.relatorioSeguradora}
                      onChange={(e) =>
                        setFormServicosAdicionais((prev) => ({
                          ...prev,
                          relatorioSeguradora: Number(e.target.value) || 0,
                        }))
                      }
                      className="h-8 text-xs bg-white font-mono"
                    />
                  </div>

                  <div>
                    <Label className="text-[10px] text-gray-600">9. Datalogger / WiFi (R$)</Label>
                    <Input
                      type="number"
                      value={formServicosAdicionais.configuracaoDatalogger}
                      onChange={(e) =>
                        setFormServicosAdicionais((prev) => ({
                          ...prev,
                          configuracaoDatalogger: Number(e.target.value) || 0,
                        }))
                      }
                      className="h-8 text-xs bg-white font-mono"
                    />
                  </div>

                  <div>
                    <Label className="text-[10px] text-gray-600">10. Gestão de Rateio (R$)</Label>
                    <Input
                      type="number"
                      value={formServicosAdicionais.gestaoRateio}
                      onChange={(e) =>
                        setFormServicosAdicionais((prev) => ({
                          ...prev,
                          gestaoRateio: Number(e.target.value) || 0,
                        }))
                      }
                      className="h-8 text-xs bg-white font-mono"
                    />
                  </div>

                  <div>
                    <Label className="text-[10px] text-gray-600">
                      11. Auditoria Faturamento (R$)
                    </Label>
                    <Input
                      type="number"
                      value={formServicosAdicionais.auditoriaFaturamento}
                      onChange={(e) =>
                        setFormServicosAdicionais((prev) => ({
                          ...prev,
                          auditoriaFaturamento: Number(e.target.value) || 0,
                        }))
                      }
                      className="h-8 text-xs bg-white font-mono"
                    />
                  </div>

                  <div>
                    <Label className="text-[10px] text-gray-600">12. Manutenção Ativos (R$)</Label>
                    <Input
                      type="number"
                      value={formServicosAdicionais.manutencaoAtivos}
                      onChange={(e) =>
                        setFormServicosAdicionais((prev) => ({
                          ...prev,
                          manutencaoAtivos: Number(e.target.value) || 0,
                        }))
                      }
                      className="h-8 text-xs bg-white font-mono"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-gray-500 bg-gray-50 p-2.5 rounded-lg">
                  Valores padrão Delfos configurados (Diagnóstico{' '}
                  {formatCurrency(formServicosAdicionais.diagnostico)}, Termografia{' '}
                  {formatCurrency(formServicosAdicionais.inspecaoTermografica)}, Limpeza{' '}
                  {formatCurrency(formServicosAdicionais.limpezaPaineis)}, etc. com hora adicional
                  R$ 150,00).
                </div>
              )}
            </div>

            {/* Bloco 5: Dados Fixos da Contratada Delfos */}
            <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-emerald-700" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                    5. Dados Fixos da Contratada (Delfos Solar)
                  </h4>
                </div>
                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                  Padrão Institucional
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white rounded-xl border border-emerald-100 space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Razão Social & CNPJ
                  </span>
                  <div className="font-bold text-gray-900">
                    {DADOS_FIXOS_CONTRATADA_CONTRATO.razaoSocial}
                  </div>
                  <div className="text-[11px] text-gray-600">
                    CNPJ: <span className="font-mono">{DADOS_FIXOS_CONTRATADA_CONTRATO.cnpj}</span>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-emerald-100 space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Representante Legal & RT
                  </span>
                  <div className="font-bold text-gray-900">
                    {DADOS_FIXOS_CONTRATADA_CONTRATO.representanteNome}
                  </div>
                  <div className="text-[11px] text-gray-600">
                    {DADOS_FIXOS_CONTRATADA_CONTRATO.representanteCargo} • CPF:{' '}
                    <span className="font-mono">
                      {DADOS_FIXOS_CONTRATADA_CONTRATO.representanteCpf}
                    </span>
                  </div>
                </div>

                <div className="sm:col-span-2 p-2.5 bg-white rounded-xl border border-emerald-100 text-[11px] text-gray-600">
                  <strong className="text-gray-800">Sede Social:</strong>{' '}
                  {DADOS_FIXOS_CONTRATADA_CONTRATO.endereco}
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
                <span>Confirmar e Visualizar Contrato</span>
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TELA 2: PRÉ-VISUALIZAÇÃO EM FOLHA A4 COM O TEXTO EXATO E BOTÕES          */}
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
                  onClick={() => abrirContratoImpressao(dadosConsolidados, true)}
                  className="text-xs border-gray-300 text-gray-700 hover:bg-gray-50 gap-1.5 hidden md:inline-flex"
                  title="Abrir versão de impressão nativa do navegador"
                >
                  <Printer className="w-4 h-4 text-gray-500" />
                  <span>Imprimir</span>
                </Button>

                {/* BOTÃO OBRIGATÓRIO 1: BAIXAR COMO PDF */}
                <Button
                  type="button"
                  size="sm"
                  onClick={handleBaixarPDF}
                  className="bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold gap-1.5 shadow-xs transition-transform hover:scale-[1.02]"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar como PDF</span>
                </Button>

                {/* BOTÃO OBRIGATÓRIO 2: ENVIAR PELO WHATSAPP */}
                <Button
                  type="button"
                  size="sm"
                  onClick={handleEnviarWhatsApp}
                  disabled={!temTelefoneValido}
                  className={`text-xs font-bold gap-1.5 shadow-xs transition-transform ${
                    temTelefoneValido
                      ? 'bg-emerald-700 hover:bg-emerald-800 text-white hover:scale-[1.02]'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  title={
                    temTelefoneValido
                      ? `Abrir conversa com ${dadosConsolidados.telefone || 'cliente'}`
                      : 'Cliente sem telefone de contato cadastrado na ficha'
                  }
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar pelo WhatsApp</span>
                </Button>
              </div>
            </div>

            {/* Aviso quando o cliente não tiver telefone */}
            {!temTelefoneValido && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Atenção:</strong> O cliente não possui telefone de contato válido
                  cadastrado. O botão <em>Enviar pelo WhatsApp</em> está desabilitado. Você pode
                  voltar à etapa de revisão e preencher o telefone ou fazer o download do PDF.
                </div>
              </div>
            )}

            {/* ===================================================================== */}
            {/* SIMULAÇÃO DA FOLHA A4 COM O TEXTO EXATO DO MODELO OFICIAL             */}
            {/* ===================================================================== */}
            <div className="w-full flex justify-center py-2">
              <div
                className="w-full max-w-[760px] bg-white rounded-lg border border-gray-300 shadow-xl p-8 sm:p-14 text-gray-900 space-y-6 leading-relaxed select-text"
                style={{
                  fontFamily: 'Georgia, Cambria, "Times New Roman", Times, serif',
                  fontSize: '14px',
                  lineHeight: '1.75',
                }}
              >
                {/* Header Institucional */}
                <div className="flex items-center justify-between border-b-2 border-emerald-600 pb-3 mb-6">
                  <div>
                    <div className="font-bold text-emerald-800 text-base tracking-wide">
                      DELFOS ENGENHARIA
                    </div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider">
                      Operação, Manutenção & Eficiência Solar
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-gray-600">
                    <div>CNPJ: 21.379.952/0001-38</div>
                    <div>Erechim/RS</div>
                  </div>
                </div>

                {/* Título Principal */}
                <div className="text-center space-y-1 mb-8">
                  <h1 className="font-bold uppercase tracking-wider text-base sm:text-lg">
                    CONTRATO DE PRESTAÇÃO DE SERVIÇOS
                  </h1>
                  <h2 className="text-xs sm:text-sm font-semibold text-gray-700">
                    Acompanhamento, Análise de Performance e Manutenção de Gerador Fotovoltaico
                  </h2>
                </div>

                {/* Preâmbulo */}
                <p className="text-justify">
                  Pelo presente instrumento particular, de um lado,{' '}
                  <strong>DELFOS ENGENHARIA LTDA</strong>, pessoa jurídica de direito privado,
                  inscrita no CNPJ sob o nº <strong>21.379.952/0001-38</strong>, com sede na Rua
                  Espírito Santo, nº 275, Centro, Erechim/RS, CEP 99709-296, neste ato representada
                  por seu sócio administrador e responsável técnico{' '}
                  <strong>João Victor Bagetti Fuchs</strong>, engenheiro eletricista, portador do
                  CPF nº <strong>811.562.780-15</strong>, doravante denominada{' '}
                  <strong>CONTRATADA</strong>; e, de outro lado,{' '}
                  <strong>{dadosConsolidados.nomeRazaoSocial}</strong>, portador do CPF/CNPJ nº{' '}
                  <strong>{dadosConsolidados.cpfCnpj}</strong>, domiciliado no endereço{' '}
                  <strong>{dadosConsolidados.enderecoInstalacao}</strong>,{' '}
                  <strong>{dadosConsolidados.municipio}</strong> com contato no telefone{' '}
                  <strong>{dadosConsolidados.telefone || 'não informado'}</strong> e e-mail{' '}
                  <strong>{dadosConsolidados.email || 'não informado'}</strong>, doravante
                  denominado <strong>CONTRATANTE</strong>, têm entre si, justo e contratado, o
                  presente Contrato de Prestação de Serviços de Monitoramento.
                </p>

                {/* Bloco Dados Técnicos */}
                <div className="p-4 bg-gray-50 rounded-lg border-l-4 border-emerald-600 text-xs space-y-1.5 my-4">
                  <div className="font-bold uppercase text-emerald-900 tracking-wider">
                    DADOS TÉCNICOS DO SISTEMA FOTOVOLTAICO:
                  </div>
                  <div>
                    <strong>Número total de módulos fotovoltaicos:</strong>{' '}
                    {dadosConsolidados.numeroModulos} painéis
                  </div>
                  <div>
                    <strong>Fabricante e potência dos inversores:</strong>{' '}
                    {dadosConsolidados.marcaInversores}
                  </div>
                  <div>
                    <strong>Local de instalação:</strong> {dadosConsolidados.localInstalacao}
                  </div>
                  <div>
                    <strong>Endereço da instalação:</strong>{' '}
                    {dadosConsolidados.enderecoInstalacaoDiferente ||
                      dadosConsolidados.enderecoInstalacao}
                  </div>
                </div>

                {/* Plano Contratado */}
                <p>
                  <strong>PLANO CONTRATADO: {dadosConsolidados.planoSelecionado}</strong>
                </p>

                <p className="text-justify">
                  Fica desde logo definido que o presente contrato é composto e integrado, para
                  todos os fins e efeitos de direito, pelos seguintes documentos:
                </p>
                <ol className="list-[lower-alpha] pl-6 space-y-1 text-justify">
                  <li>O corpo principal, contendo as Cláusulas 1ª a 13ª;</li>
                  <li>O Anexo I — Detalhamento de Serviços e Tabela de Valores;</li>
                  <li>O Anexo II — Tabela de Serviços Adicionais.</li>
                </ol>

                <p className="text-justify">
                  A <strong>CONTRATANTE</strong> declara ter recebido, lido e concordado
                  integralmente com o teor de todos os documentos acima referidos, que passam a
                  fazer parte inseparável deste instrumento contratual.
                </p>

                {/* Cláusula 1 */}
                <div className="font-bold uppercase text-sm pt-2">CLÁUSULA 1ª – OBJETO</div>
                <p className="text-justify">
                  O objeto do presente contrato é a prestação, pela <strong>CONTRATADA</strong> ao{' '}
                  <strong>CONTRATANTE</strong>, de serviços de acompanhamento, análise de
                  performance e manutenção preventiva de gerador fotovoltaico, conforme as
                  especificações técnicas e operacionais descritas no Anexo I, bem como a realização
                  de eventuais serviços adicionais previstos no Anexo II, quando solicitados pelo{' '}
                  <strong>CONTRATANTE</strong>.
                </p>

                {/* Cláusula 2 */}
                <div className="font-bold uppercase text-sm pt-2">
                  CLÁUSULA 2ª – PRAZO E VIGÊNCIA
                </div>
                <p className="text-justify">
                  2.1 O presente contrato terá vigência de 12 (doze) meses, contados a partir da
                  data de sua assinatura.
                </p>
                <p className="text-justify">
                  2.2 Ao término do prazo inicial, o contrato será automaticamente renovado por
                  períodos sucessivos de 12 (doze) meses, salvo manifestação em contrário de
                  qualquer das partes, comunicada por escrito com antecedência mínima de 30 (trinta)
                  dias do término da vigência em curso.
                </p>

                {/* Cláusula 3 */}
                <div className="font-bold uppercase text-sm pt-2">
                  CLÁUSULA 3ª – OBRIGAÇÕES DA CONTRATADA
                </div>
                <p className="text-justify">
                  3.1 A <strong>CONTRATADA</strong> obriga-se a executar os serviços descritos no
                  Anexo I, observando as diretrizes técnicas e os prazos ali estabelecidos.
                </p>
                <p className="text-justify">
                  3.2 A <strong>CONTRATADA</strong> se compromete a atuar em dias úteis e horário
                  comercial (segunda a sexta-feira, das 08h00 às 17h30), salvo disposição em
                  contrário expressamente acordada entre as partes.
                </p>
                <p className="text-justify">
                  3.3 Para manutenções e inspeções, o prazo máximo de atuação será de até 2 (dois)
                  dias úteis, contados a partir da notificação de anomalia ou solicitação de
                  serviço, desde que não haja necessidade de peças especiais ou condições
                  excepcionais que justifiquem prazo superior, hipótese em que a{' '}
                  <strong>CONTRATADA</strong> comunicará o novo prazo ao{' '}
                  <strong>CONTRATANTE</strong>.
                </p>

                {/* Cláusula 4 */}
                <div className="font-bold uppercase text-sm pt-2">
                  CLÁUSULA 4ª – OBRIGAÇÕES DO CONTRATANTE
                </div>
                <p className="text-justify">
                  4.1 O <strong>CONTRATANTE</strong> obriga-se a:
                </p>
                <ol className="list-decimal pl-6 space-y-1.5 text-justify text-xs sm:text-sm">
                  <li>
                    Permitir o acesso irrestrito da <strong>CONTRATADA</strong> ao local de
                    instalação do sistema fotovoltaico, para fins de monitoramento, inspeção,
                    manutenção e reparo, em dias úteis e horário comercial, mediante agendamento
                    prévio.
                  </li>
                  <li>
                    Fornecer à <strong>CONTRATADA</strong> todas as informações técnicas necessárias
                    à execução dos serviços, incluindo manuais, diagramas elétricos, dados de
                    garantia e histórico de manutenções anteriores.
                  </li>
                  <li>
                    Manter o ambiente da instalação em condições adequadas de segurança e limpeza.
                  </li>
                  <li>Pagar pontualmente os valores devidos na forma da Cláusula 5ª.</li>
                  <li>
                    Disponibilizar um ponto de acesso WiFi de alta qualidade de sinal próximo aos
                    inversores, essencial para garantir o monitoramento remoto contínuo do sistema.
                    O nome da rede (SSID) deve conter apenas letras ou números, sem espaços ou
                    caracteres especiais. O <strong>CONTRATANTE</strong> deverá fornecer login e
                    senha de acesso à <strong>CONTRATADA</strong>.
                  </li>
                  <li>
                    Comunicar imediatamente à <strong>CONTRATADA</strong> qualquer alteração nas
                    condições de funcionamento do sistema ou ocorrência de eventos que possam afetar
                    seu desempenho.
                  </li>
                  <li>
                    Informar as credenciais de acesso aos portais de monitoramento dos inversores.
                  </li>
                  <li>
                    Conceder acesso ao portal da concessionária/cooperativa de energia local para a
                    contratada, a fim desta obter as informações para elaboração dos relatórios
                    mensais.
                  </li>
                </ol>

                {/* Cláusula 5 */}
                <div className="font-bold uppercase text-sm pt-2">
                  CLÁUSULA 5ª – VALOR E CONDIÇÕES DE PAGAMENTO
                </div>
                <p className="text-justify">
                  5.1. Pelos serviços prestados, a <strong>CONTRATANTE</strong> pagará à{' '}
                  <strong>CONTRATADA</strong> o valor total de{' '}
                  <strong>{formatCurrency(dadosConsolidados.valorTotal)}</strong> (
                  <em>{dadosConsolidados.valorEscritoTotal}</em>), dividido em 12 (doze) parcelas
                  mensais, iguais e sucessivas, no valor unitário de{' '}
                  <strong>{formatCurrency(dadosConsolidados.valorMensal)}</strong> (
                  <em>{dadosConsolidados.valorEscritoMensal}</em>) cada, conforme plano contratado.
                </p>
                <p className="text-justify">
                  5.2 O pagamento será efetuado até o 10º (décimo) dia de cada mês, mediante boleto
                  bancário ou PIX a ser emitido pela <strong>CONTRATADA</strong>.
                </p>
                <p className="text-justify">
                  5.3 Em caso de atraso no pagamento, incidirá multa de 2% (dois por cento) sobre o
                  valor devido, além de juros de mora de 1% (um por cento) ao mês, e atualização
                  monetária pelo índice IGP-M (e, na impossibilidade de sua apuração, pelo IPCA),
                  calculados pro rata die.
                </p>

                {/* Cláusula 6 */}
                <div className="font-bold uppercase text-sm pt-2">CLÁUSULA 6ª – REAJUSTE ANUAL</div>
                <p className="text-justify">
                  6.1 O valor dos serviços será reajustado anualmente, na data de aniversário do
                  contrato, pelo índice IGP-M (ou, na falta deste, pelo IPCA), com base na variação
                  acumulada nos últimos 12 meses.
                </p>
                <p className="text-justify">
                  6.2 Caso o sistema seja ampliado (aumento de módulos, inversores ou potência
                  instalada), a <strong>CONTRATADA</strong> poderá solicitar reajuste proporcional
                  do valor dos serviços, mediante apresentação de documentação técnica comprovando a
                  ampliação. O novo valor entrará em vigor no mês subsequente à aprovação do
                  reajuste pelo <strong>CONTRATANTE</strong>.
                </p>

                {/* Cláusula 7 */}
                <div className="font-bold uppercase text-sm pt-2">
                  CLÁUSULA 7ª – GARANTIA DOS SERVIÇOS
                </div>
                <p className="text-justify">
                  7.1 A <strong>CONTRATADA</strong> garante o trabalho realizado pelo prazo de 6
                  (seis) meses, contados da data de execução do serviço, excetuando-se defeitos
                  decorrentes de uso inadequado, acidentes, intervenções de terceiros não
                  autorizados ou condições climáticas extremas.
                </p>
                <p className="text-justify">
                  7.2 Os materiais empregados nos serviços serão cobertos pela garantia do
                  respectivo fabricante, não assumindo a <strong>CONTRATADA</strong> qualquer
                  responsabilidade adicional além daquelas previstas na garantia original.
                </p>

                {/* Cláusula 8 */}
                <div className="font-bold uppercase text-sm pt-2">
                  CLÁUSULA 8ª – CONFIDENCIALIDADE E PROTEÇÃO DE DADOS
                </div>
                <p className="text-justify">
                  8.1 As partes se comprometem a manter sigilo absoluto sobre todas as informações
                  técnicas, comerciais e operacionais a que tiverem acesso em virtude deste
                  contrato, incluindo dados de geração, parâmetros de inversores, dados cadastrais e
                  financeiros do <strong>CONTRATANTE</strong>, durante e após a vigência contratual.
                </p>
                <p className="text-justify">
                  8.2 As partes se obrigam a cumprir integralmente as disposições da Lei nº
                  13.709/2018 (Lei Geral de Proteção de Dados Pessoais – LGPD), em especial quanto
                  ao tratamento de dados pessoais eventualmente coletados, armazenados ou
                  processados no âmbito da execução dos serviços, responsabilizando-se cada parte
                  por suas respectivas obrigações como controladora ou operadora de dados.
                </p>

                {/* Cláusula 9 */}
                <div className="font-bold uppercase text-sm pt-2">
                  CLÁUSULA 9ª – DEFINIÇÃO DE ANOMALIA E PROTOCOLO OPERACIONAL DE DIAGNÓSTICA
                </div>
                <p className="text-justify">
                  9.1 Para os fins deste contrato, considera-se anomalia qualquer falha de
                  equipamento detectada automaticamente pelo sistema de monitoramento (inversor
                  desligado, perda de comunicação, queda abrupta de geração, funcionamento fora dos
                  parâmetros previstos, etc.), bem como qualquer notificação feita pelo{' '}
                  <strong>CONTRATANTE</strong>.
                </p>
                <p className="text-justify">
                  9.2 O protocolo operacional de diagnóstico integrado seguirá as seguintes etapas:
                </p>
                <ol className="list-decimal pl-6 space-y-1.5 text-justify text-xs sm:text-sm">
                  <li>
                    <strong>Detecção:</strong> O sistema de monitoramento detecta a anomalia
                    automaticamente ou mediante comunicação do <strong>CONTRATANTE</strong>.
                  </li>
                  <li>
                    <strong>Solicitação de Informações:</strong> A <strong>CONTRATADA</strong>{' '}
                    solicita ao <strong>CONTRATANTE</strong> o envio de fotos e/ou vídeos do
                    equipamento afetado, bem como informações complementares (histórico de
                    funcionamento, mensagens de erro, comportamento observado) para análise técnica
                    preliminar.
                  </li>
                  <li>
                    <strong>Triagem Remota:</strong> A <strong>CONTRATADA</strong> realiza análise
                    técnica remota com base nas informações, fotos e vídeos fornecidos, buscando
                    identificar a causa provável da anomalia e tentar resolvê-la remotamente através
                    de orientações técnicas, reconfiguração de parâmetros ou outras soluções que não
                    exijam presença física.
                  </li>
                  <li>
                    <strong>Diagnóstico In Loco:</strong> Caso a triagem remota não seja suficiente
                    para resolver a anomalia, a <strong>CONTRATADA</strong> agendará visita técnica
                    in loco. O tempo despendido nesta visita será cobrado conforme a Tabela de
                    Serviços Adicionais (Anexo II), sendo faturado por hora ou fração de hora
                    conforme o item correspondente.
                  </li>
                  <li>
                    <strong>Execução e Faturamento:</strong> Realizado o serviço conforme
                    necessário, a <strong>CONTRATADA</strong> fornecerá relatório de conclusão
                    contendo descrição do serviço realizado, peças utilizadas (se houver), tempo
                    despendido e recomendações. O faturamento seguirá a Tabela de Serviços
                    Adicionais (Anexo II), sendo o valor cobrado conforme o serviço efetivamente
                    prestado.
                  </li>
                </ol>

                {/* Cláusula 10 */}
                <div className="font-bold uppercase text-sm pt-2">
                  CLÁUSULA 10ª – RESCISÃO CONTRATUAL
                </div>
                <p className="text-justify">
                  10.1 Rescisão por conveniência: Qualquer das partes poderá rescindir o presente
                  contrato, a qualquer tempo, mediante comunicação escrita com aviso prévio de 30
                  (trinta) dias.
                </p>
                <p className="text-justify">
                  10.1.1 Caso a rescisão seja motivada pelo <strong>CONTRATANTE</strong>, este
                  deverá pagar multa equivalente a 50% (cinquenta por cento) dos valores mensais
                  remanescentes até o final do período contratado. Todos os valores em aberto
                  (mensalidades vencidas, serviços adicionais realizados e multa rescisória) deverão
                  ser quitados integralmente no prazo de 10 (dez) dias após a data de rescisão.
                </p>
                <p className="text-justify">
                  10.2 Rescisão por inadimplemento: A <strong>CONTRATADA</strong> poderá rescindir o
                  contrato independentemente de aviso prévio, no caso de atraso no pagamento
                  superior a 30 (trinta) dias. Nesta hipótese, o <strong>CONTRATANTE</strong>{' '}
                  permanecerá obrigado ao pagamento das mensalidades vencidas e dos serviços
                  adicionais eventualmente prestados.
                </p>

                {/* Cláusula 11 */}
                <div className="font-bold uppercase text-sm pt-2">
                  CLÁUSULA 11ª – FORÇA MAIOR E SEGURO
                </div>
                <p className="text-justify">
                  11.1 Nenhuma das partes será responsável por perdas ou atrasos no cumprimento de
                  suas obrigações decorrentes de eventos de força maior ou caso fortuito, assim
                  entendidos aqueles imprevisíveis ou, se previsíveis, inevitáveis, tais como
                  guerras, greves, catástrofes naturais, tempestades com granizo, queda de raios,
                  incêndios de grandes proporções, interrupções no fornecimento de energia elétrica
                  pela concessionária, atos de autoridades públicas que impeçam a execução dos
                  serviços, e outros eventos equivalentes, desde que devidamente comprovados.
                </p>
                <p className="text-justify">
                  11.2 O <strong>CONTRATANTE</strong> declara-se ciente da necessidade de manter
                  seguro patrimonial adequado que cubra os riscos mencionados, bem como seguro de
                  responsabilidade civil para danos a terceiros eventualmente causados pelo sistema.
                  A <strong>CONTRATADA</strong> recomenda fortemente que o{' '}
                  <strong>CONTRATANTE</strong> contrate seguro específico para a instalação
                  fotovoltaica, com cobertura abrangente para eventos climáticos (granizo,
                  tempestades, raios), furto e roubo, de modo a proteger adequadamente seu
                  investimento e garantir a continuidade operacional do sistema em caso de sinistro.
                </p>

                {/* Cláusula 12 */}
                <div className="font-bold uppercase text-sm pt-2">
                  CLÁUSULA 12ª – RESPONSABILIDADE CIVIL
                </div>
                <p className="text-justify">
                  12.1 A <strong>CONTRATADA</strong> responderá exclusivamente por danos diretos
                  comprovadamente causados ao <strong>CONTRATANTE</strong> em decorrência de
                  negligência grave na execução dos serviços objeto deste contrato, desde que o{' '}
                  <strong>CONTRATANTE</strong> tenha cumprido integralmente suas obrigações
                  contratuais.
                </p>
                <p className="text-justify">
                  12.2 Ficam expressamente excluídos da responsabilidade da{' '}
                  <strong>CONTRATADA</strong>:
                </p>
                <ol className="list-decimal pl-6 space-y-1 text-justify text-xs">
                  <li>
                    Danos indiretos, lucros cessantes, perda de receita de energia, danos morais ou
                    qualquer outro dano não-material;
                  </li>
                  <li>Força maior ou caso fortuito, conforme definido na Cláusula 11ª;</li>
                  <li>
                    Negligência, imperícia ou imprudência do <strong>CONTRATANTE</strong> ou de
                    terceiros (incluindo, mas não se limitando a, outras empresas de manutenção,
                    instaladores, concessionárias ou prestadores de serviços);
                  </li>
                  <li>
                    Desgaste natural, uso inadequado, adulteração, modificação não autorizada ou
                    falta de manutenção do sistema pelo <strong>CONTRATANTE</strong>;
                  </li>
                  <li>
                    Eventos climáticos extremos, condições ambientais fora dos parâmetros normais de
                    operação, ou falhas de equipamentos de fabricação de terceiros;
                  </li>
                  <li>
                    Qualquer dano decorrente do não cumprimento das obrigações do{' '}
                    <strong>CONTRATANTE</strong> (incluindo, mas não se limitando a, falta de WiFi
                    adequado, falta de acesso ao local, falta de informações técnicas);
                  </li>
                  <li>
                    Danos causados por falta de seguro patrimonial ou de responsabilidade civil do{' '}
                    <strong>CONTRATANTE</strong>.
                  </li>
                </ol>
                <p className="text-justify">
                  12.3 Os serviços prestados são de natureza preventiva e de monitoramento, não
                  sendo a <strong>CONTRATADA</strong> responsável por falhas de equipamentos de
                  terceiros (fabricantes de módulos, inversores, string boxes, etc.), cuja
                  responsabilidade permanece exclusivamente com os respectivos fabricantes e suas
                  garantias.
                </p>

                {/* Cláusula 13 */}
                <div className="font-bold uppercase text-sm pt-2">CLÁUSULA 13ª – FORO</div>
                <p className="text-justify">
                  As partes elegem o foro da Comarca de <strong>Erechim/RS</strong> como o único
                  competente para dirimir quaisquer controvérsias oriundas do presente contrato, com
                  renúncia expressa a qualquer outro, por mais privilegiado que seja.
                </p>

                <p className="text-justify pt-2">
                  E, por estarem justas e contratadas, as partes assinam o presente instrumento em 2
                  (duas) vias de igual teor e forma, na presença das testemunhas abaixo.
                </p>

                {/* Assinaturas */}
                <div className="pt-8 grid grid-cols-1 sm:grid-cols-2 gap-8 text-center">
                  <div className="space-y-1">
                    <div className="border-t border-gray-900 w-full mb-2" />
                    <div className="font-bold text-xs sm:text-sm">
                      {dadosConsolidados.nomeRazaoSocial}
                    </div>
                    <div className="text-xs text-gray-700">
                      CPF/CNPJ: {dadosConsolidados.cpfCnpj}
                    </div>
                    <div className="text-[11px] font-semibold text-gray-500 uppercase">
                      CONTRATANTE
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="border-t border-gray-900 w-full mb-2" />
                    <div className="font-bold text-xs sm:text-sm">DELFOS ENGENHARIA LTDA.</div>
                    <div className="text-xs text-gray-700">CNPJ: 21.379.952/0001-38</div>
                    <div className="text-[11px] font-semibold text-gray-500 uppercase">
                      CONTRATADA
                    </div>
                  </div>
                </div>

                <div className="pt-4 text-left text-xs sm:text-sm">
                  {dadosConsolidados.cidadeAssinatura}/RS, {dadosConsolidados.dataPorExtenso}.
                </div>

                {/* ========================================================= */}
                {/* ANEXO I — RENDERIZA APENAS O PLANO SELECIONADO            */}
                {/* ========================================================= */}
                <div className="border-t-2 border-dashed border-gray-300 pt-8 mt-10 space-y-4">
                  <div className="text-center">
                    <h3 className="font-bold text-sm sm:text-base text-emerald-800 uppercase tracking-wide">
                      {anexoIConteudo.titulo}
                    </h3>
                    <p className="text-xs text-gray-600 font-semibold mt-1">
                      {anexoIConteudo.subtitulo}
                    </p>
                  </div>

                  <ol className="list-decimal pl-6 space-y-2 text-xs sm:text-sm text-justify">
                    {anexoIConteudo.itens.map((it) => (
                      <li key={it.numero}>
                        <strong>{it.titulo}</strong> — {it.descricao}
                      </li>
                    ))}
                  </ol>
                </div>

                {/* ========================================================= */}
                {/* ANEXO II — TABELA DE SERVIÇOS ADICIONAIS                  */}
                {/* ========================================================= */}
                <div className="border-t-2 border-dashed border-gray-300 pt-8 mt-10 space-y-4">
                  <div className="text-center">
                    <h3 className="font-bold text-sm sm:text-base text-emerald-800 uppercase tracking-wide">
                      ANEXO II – TABELA INTEGRADA DE SERVIÇOS ADICIONAIS
                    </h3>
                  </div>

                  <p className="text-xs text-gray-700 text-justify">
                    Os serviços abaixo serão cobrados adicionalmente ao valor do plano contratado,
                    mediante solicitação expressa do <strong>CONTRATANTE</strong> e aprovação do
                    respectivo orçamento. Os valores unitários serão reajustados anualmente pelo
                    mesmo índice previsto na Cláusula 6ª do contrato principal (IGP-M ou IPCA).
                  </p>

                  <div className="overflow-x-auto pt-2">
                    <table className="w-full text-[11px] border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-100 text-gray-900 font-bold">
                          <th className="border border-gray-300 p-2 text-center w-10">Item</th>
                          <th className="border border-gray-300 p-2 text-left w-36">Serviço</th>
                          <th className="border border-gray-300 p-2 text-left">
                            Descrição Detalhada
                          </th>
                          <th className="border border-gray-300 p-2 text-right w-24">Valor (R$)</th>
                          <th className="border border-gray-300 p-2 text-center w-24">
                            Hora Adic.
                          </th>
                          <th className="border border-gray-300 p-2 text-left w-32">Observações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {anexoIIServicos.map((s) => (
                          <tr key={s.item} className="hover:bg-gray-50/70">
                            <td className="border border-gray-300 p-2 text-center font-bold text-gray-800">
                              {s.item}
                            </td>
                            <td className="border border-gray-300 p-2 font-semibold text-gray-900">
                              {s.servico}
                            </td>
                            <td className="border border-gray-300 p-2 text-gray-700 leading-snug">
                              {s.descricao}
                            </td>
                            <td className="border border-gray-300 p-2 text-right font-bold text-emerald-700">
                              {s.valor}
                            </td>
                            <td className="border border-gray-300 p-2 text-center text-gray-800">
                              {s.horaAdicional}
                            </td>
                            <td className="border border-gray-300 p-2 text-[10px] text-gray-500">
                              {s.observacoes || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Dica de integração com WhatsApp */}
            <div className="p-3 bg-gray-100 rounded-xl text-[11px] text-gray-600 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-gray-500" />
                Ao clicar em "Enviar pelo WhatsApp", o PDF é baixado e a conversa é aberta no
                WhatsApp com o cliente.
              </span>
              <button
                type="button"
                onClick={() => abrirContratoImpressao(dadosConsolidados, false)}
                className="text-emerald-700 hover:text-emerald-900 font-semibold underline flex items-center gap-1 text-[11px]"
              >
                <ExternalLink className="w-3 h-3" />
                Abrir em nova aba
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
