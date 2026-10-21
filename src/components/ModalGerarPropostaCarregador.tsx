import React, { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Zap,
  Printer,
  Mail,
  MessageSquare,
  Save,
  Loader2,
  Edit3,
  Eye,
  Check,
  RefreshCw,
  UserPlus,
  Plus,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  Layers,
  Wrench,
  Search,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { useToast } from '@/hooks/use-toast'
import type { PropostaCarregador, Cliente } from '@/types/crm'
import type { Equipamento } from '@/types/equipamentos'
import { fetchEquipamentos } from '@/services/equipamentosService'
import {
  gerarValoresIniciaisPropostaCarregador,
  salvarPropostaCarregador,
  normalizarPropostaCarregadorParaInput,
  converterInputParaPropostaCarregador,
  type SalvarPropostaCarregadorInput,
  type ItemMaterialInfraestrutura,
  MATERIAIS_INFRAESTRUTURA_PADRAO,
} from '@/services/propostasCarregadorService'
import { PreviewPropostaCarregadorDocumento } from './PreviewPropostaCarregadorDocumento'
import { ModalEnviarPropostaCarregadorEmail } from './ModalEnviarPropostaCarregadorEmail'
import { ModalEnviarPropostaCarregadorWhatsApp } from './ModalEnviarPropostaCarregadorWhatsApp'
import { ModalCadastroClienteFornecedor } from './ModalCadastroClienteFornecedor'
import { SeletorClienteBuscaDropdown } from './SeletorClienteBuscaDropdown'

interface ModalGerarPropostaCarregadorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  propostaExistente?: PropostaCarregador | null
  clientePreSelecionadoId?: string
  negocioPreSelecionadoId?: string
  onSalvo?: (proposta: PropostaCarregador) => void
}

export const ModalGerarPropostaCarregador: React.FC<ModalGerarPropostaCarregadorProps> = ({
  open,
  onOpenChange,
  propostaExistente,
  clientePreSelecionadoId,
  negocioPreSelecionadoId,
  onSalvo,
}) => {
  const { clientes, addCliente } = useClientes()
  const { toast } = useToast()

  const [clienteId, setClienteId] = useState<string>(
    propostaExistente?.cliente_id || clientePreSelecionadoId || '',
  )
  const [formData, setFormData] = useState<SalvarPropostaCarregadorInput>(() =>
    gerarValoresIniciaisPropostaCarregador(null),
  )

  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor')
  const [modoEdicaoLivre, setModoEdicaoLivre] = useState<boolean>(false)
  const [salvando, setSalvando] = useState<boolean>(false)

  // Modais de Envio
  const [modalEmailOpen, setModalEmailOpen] = useState(false)
  const [modalWhatsAppOpen, setModalWhatsAppOpen] = useState(false)
  const [modalNovoClienteOpen, setModalNovoClienteOpen] = useState(false)

  // Lista de equipamentos do sistema
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([])
  const [carregandoEquipamentos, setCarregandoEquipamentos] = useState<boolean>(false)

  // Carrega catálogo de equipamentos
  useEffect(() => {
    let ativo = true
    async function loadEquipamentos() {
      setCarregandoEquipamentos(true)
      try {
        const lista = await fetchEquipamentos()
        if (ativo) {
          setEquipamentos(lista || [])
        }
      } catch (err) {
        console.error('Erro ao carregar equipamentos:', err)
      } finally {
        if (ativo) setCarregandoEquipamentos(false)
      }
    }
    loadEquipamentos()
    return () => {
      ativo = false
    }
  }, [])

  // Sincroniza quando abrir modal ou mudar propostaExistente
  useEffect(() => {
    if (open) {
      if (propostaExistente) {
        setClienteId(propostaExistente.cliente_id)
        const normalizada = normalizarPropostaCarregadorParaInput(propostaExistente)
        setFormData(normalizada)
      } else {
        const cId = clientePreSelecionadoId || ''
        setClienteId(cId)
        const clienteAchado = clientes.find((c) => c.id === cId)
        const init = gerarValoresIniciaisPropostaCarregador(clienteAchado)
        if (negocioPreSelecionadoId) {
          init.negocio_id = negocioPreSelecionadoId
        }
        setFormData(init)
      }
    }
  }, [open, propostaExistente, clientePreSelecionadoId, negocioPreSelecionadoId, clientes])

  // Ao trocar o cliente selecionado, preenche os dados cadastrais automaticamente
  const handleSelecionarCliente = (novoClienteId: string, clienteObj?: Cliente) => {
    setClienteId(novoClienteId)
    const cli = clienteObj || clientes.find((c) => c.id === novoClienteId)
    if (cli) {
      const novosDados = gerarValoresIniciaisPropostaCarregador(cli, formData.autor)
      setFormData((prev) => ({
        ...prev,
        cliente_id: novoClienteId,
        cliente_nome: novosDados.cliente_nome,
        cliente_documento: novosDados.cliente_documento,
        cliente_contato: novosDados.cliente_contato,
        endereco_instalacao: novosDados.endereco_instalacao,
        tipo_local: novosDados.tipo_local,
      }))
    } else if (!novoClienteId) {
      setFormData((prev) => ({
        ...prev,
        cliente_id: '',
      }))
    }
  }

  // Callback chamado quando o cliente é salvo no modal inline de criação de cliente
  const handleSalvarNovoClienteInline = async (
    dados: import('./ModalCadastroClienteFornecedor').DadosCadastroForm,
  ) => {
    const novo = await addCliente({
      nome: dados.nome,
      tipo_pessoa: dados.tipo_pessoa,
      razao_social: dados.razao_social,
      nome_fantasia: dados.nome_fantasia,
      cpf: dados.cpf,
      cnpj: dados.cnpj,
      situacao_cadastral: dados.situacao_cadastral,
      cnae_principal: dados.cnae_principal,
      data_abertura: dados.data_abertura,
      telefone: dados.telefone,
      telefone_secundario: dados.telefone_secundario,
      whatsapp: dados.telefone,
      email: dados.email,
      contato_principal: dados.contato_principal,
      contato: dados.contato_principal,
      atividade_principal: dados.atividade_principal,
      como_conheceu: dados.como_conheceu,
      origem_lead:
        dados.como_conheceu === 'Redes Sociais'
          ? 'Instagram'
          : (dados.como_conheceu as any) || 'Indicação',
      observacoes: dados.observacoes,
      endereco: dados.endereco || '',
      numero: dados.numero,
      complemento: dados.complemento,
      bairro: dados.bairro,
      cidade: dados.cidade || 'Erechim',
      estado: dados.estado || 'RS',
      cep: dados.cep,
      uc: '',
      potencia_kwp: 5.5,
      valor_estimado: 0,
      status: 'Novo Lead',
      produto: 'Energia Solar',
      telhado_tipo: 'ceramico',
      inversor_marca: 'Deye',
      inversor_modelo: 'SUN-5K-SG01LP1',
      placas_qtd: 10,
      placas_marca: 'Canadian Solar',
      data_instalacao: new Date().toISOString().split('T')[0],
    })

    if (novo && novo.id) {
      handleSelecionarCliente(novo.id, novo)
      setModalNovoClienteOpen(false)
      toast({
        title: 'Cliente cadastrado com sucesso!',
        description: `${novo.razao_social || novo.nome} foi vinculado à proposta.`,
      })
    }
  }

  const handleUpdateField = <K extends keyof SalvarPropostaCarregadorInput>(
    field: K,
    val: SalvarPropostaCarregadorInput[K],
  ) => {
    setFormData((prev) => {
      const updated = {
        ...prev,
        [field]: val,
      }
      return updated
    })
  }

  // Recalcular totais consolidados
  const calcularTotalAutomatico = (dados: SalvarPropostaCarregadorInput) => {
    const mats = dados.materiais_infraestrutura || []
    const subtotalMats = mats.reduce(
      (acc, it) => acc + (Number(it.quantidade) || 0) * (Number(it.valor_unitario) || 0),
      0,
    )
    // Serviços unificados (instalação e engenharia consolidados em um item)
    const servicosTotal =
      typeof dados.valor_servicos === 'number'
        ? dados.valor_servicos
        : (Number(dados.valor_servicos_instalacao) || 0) +
          (Number(dados.valor_servicos_engenharia) || 0)

    let valorCarregador = 0
    if (dados.modo_carregador === 'adquirido' || dados.carregador_adquirido) {
      valorCarregador = 0
    } else {
      // Se selecionou modelo específico ou dois modelos (usa valor do carregador configurado)
      valorCarregador = Number(dados.carregador_valor) || 0
    }

    const total = valorCarregador + subtotalMats + servicosTotal
    return {
      subtotal_materiais: subtotalMats,
      valor_estacao_materiais: subtotalMats + valorCarregador,
      valor_servicos: servicosTotal,
      valor_total: total,
    }
  }

  // Atualizar itens de materiais
  const handleMaterialChange = (
    index: number,
    field: keyof ItemMaterialInfraestrutura,
    val: any,
  ) => {
    setFormData((prev) => {
      const mats = [...(prev.materiais_infraestrutura || [])]
      if (!mats[index]) return prev
      mats[index] = {
        ...mats[index],
        [field]: field === 'quantidade' || field === 'valor_unitario' ? Number(val) : val,
      }
      const novosTotais = calcularTotalAutomatico({
        ...prev,
        materiais_infraestrutura: mats,
      })
      return {
        ...prev,
        materiais_infraestrutura: mats,
        ...novosTotais,
      }
    })
  }

  const handleAdicionarMaterial = () => {
    setFormData((prev) => {
      const mats = [
        ...(prev.materiais_infraestrutura || []),
        {
          id: `mat-${Date.now()}`,
          descricao: '',
          quantidade: 1,
          valor_unitario: 0,
        },
      ]
      const novosTotais = calcularTotalAutomatico({
        ...prev,
        materiais_infraestrutura: mats,
      })
      return {
        ...prev,
        materiais_infraestrutura: mats,
        ...novosTotais,
      }
    })
  }

  const handleRemoverMaterial = (index: number) => {
    setFormData((prev) => {
      const mats = (prev.materiais_infraestrutura || []).filter((_, i) => i !== index)
      const novosTotais = calcularTotalAutomatico({
        ...prev,
        materiais_infraestrutura: mats,
      })
      return {
        ...prev,
        materiais_infraestrutura: mats,
        ...novosTotais,
      }
    })
  }

  // Selecionar equipamento do catálogo oficial
  const handleSelecionarEquipamentoCatalogo = (eqId: string) => {
    const eq = equipamentos.find((e) => e.id === eqId)
    if (!eq) {
      setFormData((prev) => ({
        ...prev,
        equipamento_id: '',
      }))
      return
    }

    // Calcula potência legível
    const potKw =
      eq.potencia_w > 0
        ? eq.potencia_w >= 1000
          ? `${(eq.potencia_w / 1000).toFixed(1)} kW`
          : `${eq.potencia_w} W`
        : ''
    const modeloNome = `${eq.marca} ${eq.modelo}`.trim()

    setFormData((prev) => {
      const next = {
        ...prev,
        equipamento_id: eq.id,
        carregador_modelo: modeloNome,
        carregador_potencia: potKw || prev.carregador_potencia,
        // Mantém valor ou define padrão
        opcao2_titulo: modeloNome,
        opcao2_potencia: potKw || prev.opcao2_potencia,
      }
      const totais = calcularTotalAutomatico(next)
      return {
        ...next,
        ...totais,
      }
    })

    toast({
      title: 'Equipamento selecionado',
      description: `${eq.marca} ${eq.modelo} vinculado à proposta.`,
    })
  }

  // Mudar modo: Dois modelos (padrão) vs. Já adquirido pelo cliente
  const handleToggleCarregadorAdquirido = (adquirido: boolean) => {
    setFormData((prev) => {
      const next: SalvarPropostaCarregadorInput = {
        ...prev,
        modo_carregador: adquirido ? 'adquirido' : 'padrao_dois_modelos',
        carregador_adquirido: adquirido,
      }
      const totais = calcularTotalAutomatico(next)
      return {
        ...next,
        ...totais,
      }
    })
  }

  const handleSalvar = async () => {
    if (!clienteId && !formData.cliente_id) {
      toast({
        title: 'Cliente obrigatório',
        description: 'Selecione um cliente para associar à proposta comercial.',
        variant: 'destructive',
      })
      return
    }

    setSalvando(true)
    try {
      const payload: SalvarPropostaCarregadorInput = {
        ...formData,
        cliente_id: clienteId || formData.cliente_id,
      }
      const salva = await salvarPropostaCarregador(payload)
      toast({
        title: 'Proposta salva com sucesso!',
        description: `Proposta ${salva.numero_proposta} gravada no CRM.`,
      })
      onSalvo?.(salva)
      onOpenChange(false)
    } catch (err: unknown) {
      console.error('Erro ao salvar proposta de carregador:', err)
      const msg = err instanceof Error ? err.message : 'Falha ao salvar proposta.'
      toast({
        title: 'Erro ao salvar',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const clienteAtual: Cliente | undefined = clientes.find((c) => c.id === clienteId)

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl w-full h-[92vh] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
          {/* Header Superior com Identidade Visual Delfos */}
          <DialogHeader className="no-print px-6 py-4 border-b border-slate-200 bg-white shrink-0 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-[#047857]">
                <Zap className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>Proposta — Carregador Veicular (Wallbox)</span>
                  <span className="text-xs bg-emerald-100 text-[#047857] font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                    NBR 5410 &amp; 17019
                  </span>
                </DialogTitle>
                <p className="text-xs text-slate-500">
                  Infraestrutura de Recarga Delfos Engenharia • Emissão e orçamentação técnica
                </p>
              </div>
            </div>

            {/* Ações Rápidas no Topo */}
            <div className="flex items-center gap-2 pr-6">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  window.print()
                }}
                className="gap-1.5 text-xs cursor-pointer"
                title="Imprimir ou gerar PDF limpo (A4 sem barras)"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span className="hidden sm:inline">Imprimir / Salvar PDF</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalWhatsAppOpen(true)}
                className="gap-1.5 text-xs text-emerald-800 border-emerald-300 hover:bg-emerald-50 cursor-pointer"
                title="Enviar por WhatsApp (Link ou PDF anexado)"
              >
                <MessageSquare className="w-4 h-4 text-[#25D366]" />
                <span className="hidden sm:inline">WhatsApp</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalEmailOpen(true)}
                className="gap-1.5 text-xs text-emerald-800 border-emerald-300 hover:bg-emerald-50 cursor-pointer"
                title="Enviar por E-mail (fluxo existente inalterado)"
              >
                <Mail className="w-4 h-4 text-[#047857]" />
                <span className="hidden sm:inline">E-mail</span>
              </Button>

              <Button
                type="button"
                onClick={handleSalvar}
                disabled={salvando}
                className="bg-[#047857] hover:bg-[#065f46] text-white gap-1.5 text-xs cursor-pointer"
              >
                {salvando ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Salvar Proposta</span>
              </Button>
            </div>
          </DialogHeader>

          {/* Abas Editor vs. Visualização do Documento A4 */}
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as 'editor' | 'preview')}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div className="no-print px-6 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <TabsList className="bg-slate-200/80">
                <TabsTrigger
                  value="editor"
                  className="text-xs gap-1.5 data-[state=active]:bg-white"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Formulário de Dados
                </TabsTrigger>
                <TabsTrigger
                  value="preview"
                  className="text-xs gap-1.5 data-[state=active]:bg-white"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Modelo Visual da Proposta
                </TabsTrigger>
              </TabsList>

              {activeTab === 'preview' && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={modoEdicaoLivre ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setModoEdicaoLivre((prev) => !prev)}
                    className={
                      modoEdicaoLivre
                        ? 'bg-[#047857] hover:bg-[#065f46] text-white text-xs h-7'
                        : 'text-xs h-7'
                    }
                  >
                    <Edit3 className="w-3.5 h-3.5 mr-1" />
                    {modoEdicaoLivre ? 'Modo Edição Ativo' : 'Edição Inline Livre'}
                  </Button>
                </div>
              )}
            </div>

            {/* Conteúdo Aba Formulário */}
            <TabsContent value="editor" className="flex-1 overflow-y-auto p-6 space-y-6 m-0">
              {/* Seletor do Cliente */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-1.5 h-3.5 bg-[#047857] rounded-xs" />
                    1. Vínculo do Cliente &amp; Identificação
                  </h3>
                  <span className="text-xs text-slate-500">
                    Preenchimento automático do cadastro
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-700">
                        Selecionar Cliente do CRM *
                      </Label>
                      <button
                        type="button"
                        onClick={() => setModalNovoClienteOpen(true)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                        title="Cadastrar cliente sem sair do fluxo da proposta"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>+ Cadastrar novo cliente</span>
                      </button>
                    </div>

                    <SeletorClienteBuscaDropdown
                      clientes={clientes}
                      value={clienteId}
                      onChange={handleSelecionarCliente}
                      onNovoClienteClick={() => setModalNovoClienteOpen(true)}
                      placeholder="Digite nome, CPF/CNPJ, cidade ou telefone para filtrar..."
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-700">
                      Número da Proposta
                    </Label>
                    <Input
                      value={formData.numero_proposta || ''}
                      onChange={(e) => handleUpdateField('numero_proposta', e.target.value)}
                      placeholder="PROP-2025-084"
                      className="mt-1 bg-white font-mono py-2.5 h-auto text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-200">
                  <div>
                    <Label className="text-xs text-slate-600">Cliente / Razão Social</Label>
                    <Input
                      value={formData.cliente_nome || ''}
                      onChange={(e) => handleUpdateField('cliente_nome', e.target.value)}
                      className="mt-1 bg-white text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-slate-600">CNPJ / CPF</Label>
                    <Input
                      value={formData.cliente_documento || ''}
                      onChange={(e) => handleUpdateField('cliente_documento', e.target.value)}
                      className="mt-1 bg-white text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-slate-600">Contato / Telefone / E-mail</Label>
                    <Input
                      value={formData.cliente_contato || ''}
                      onChange={(e) => handleUpdateField('cliente_contato', e.target.value)}
                      className="mt-1 bg-white text-xs"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Label className="text-xs text-slate-600">Endereço da Instalação</Label>
                    <Input
                      value={formData.endereco_instalacao || ''}
                      onChange={(e) => handleUpdateField('endereco_instalacao', e.target.value)}
                      className="mt-1 bg-white text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-slate-600">Tipo de Local</Label>
                    <Input
                      value={formData.tipo_local || ''}
                      onChange={(e) => handleUpdateField('tipo_local', e.target.value)}
                      placeholder="Residencial / Condomínio / Comercial"
                      className="mt-1 bg-white text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 2: Projeção de Economia */}
              <div className="border border-slate-200 rounded-lg p-4 space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-1.5 h-3.5 bg-[#047857] rounded-xs" />
                  2. Projeção de Economia (Wallbox Próprio vs. Posto Público)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs text-slate-600">Custo Próprio Mínimo (R$)</Label>
                    <Input
                      type="number"
                      value={formData.custo_proprio_min ?? 18}
                      onChange={(e) =>
                        handleUpdateField('custo_proprio_min', Number(e.target.value))
                      }
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600">Custo Próprio Máximo (R$)</Label>
                    <Input
                      type="number"
                      value={formData.custo_proprio_max ?? 25}
                      onChange={(e) =>
                        handleUpdateField('custo_proprio_max', Number(e.target.value))
                      }
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600">Posto Público Mínimo (R$)</Label>
                    <Input
                      type="number"
                      value={formData.custo_publico_min ?? 70}
                      onChange={(e) =>
                        handleUpdateField('custo_publico_min', Number(e.target.value))
                      }
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600">Posto Público Máximo (R$)</Label>
                    <Input
                      type="number"
                      value={formData.custo_publico_max ?? 90}
                      onChange={(e) =>
                        handleUpdateField('custo_publico_max', Number(e.target.value))
                      }
                      className="mt-1 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 3: Seleção do Carregador & Opção de Já Adquirido */}
              <div className="border border-slate-200 rounded-lg p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-1.5 h-3.5 bg-[#047857] rounded-xs" />
                    3. Carregador Veicular (Wallbox)
                  </h3>

                  {/* Toggle: Padrão 2 Opções vs. Cliente Já Possui Carregador */}
                  <div className="inline-flex items-center rounded-lg bg-slate-100 p-1 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => handleToggleCarregadorAdquirido(false)}
                      className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                        !formData.carregador_adquirido
                          ? 'bg-white text-emerald-800 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Fornecer Carregador (Delfos)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleCarregadorAdquirido(true)}
                      className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                        formData.carregador_adquirido
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Cliente Já Possui Carregador (Adquirido)
                    </button>
                  </div>
                </div>

                {/* Se o cliente JÁ TEM o carregador */}
                {formData.carregador_adquirido ? (
                  <div className="p-4 rounded-lg bg-amber-50/70 border border-amber-200 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xs font-bold text-amber-900 uppercase">
                          Opção Única: Carregador Veicular Já Adquirido pelo Cliente
                        </h4>
                        <p className="text-xs text-amber-800 mt-0.5">
                          O cliente já comprou ou possui o equipamento Wallbox. No documento da
                          proposta e na tabela de investimento, o carregador constará como{' '}
                          <strong>&quot;Adquirido&quot;</strong> (sem valor monetário), e o
                          investimento total incluirá estritamente os materiais da infraestrutura
                          elétrica e os serviços de engenharia e instalação.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-amber-200/80">
                      <div>
                        <Label className="text-xs font-semibold text-slate-700">
                          Modelo / Marca do Carregador do Cliente
                        </Label>
                        <Input
                          value={formData.carregador_modelo || ''}
                          onChange={(e) => handleUpdateField('carregador_modelo', e.target.value)}
                          placeholder="Ex: Wallbox Pulsar Plus, WEG WEMOB, BMW Wallbox..."
                          className="mt-1 bg-white text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-slate-700">
                          Potência / Tensão do Equipamento
                        </Label>
                        <Input
                          value={formData.carregador_potencia || ''}
                          onChange={(e) => handleUpdateField('carregador_potencia', e.target.value)}
                          placeholder="Ex: 7,4 kW (220V) ou 22 kW (380V)"
                          className="mt-1 bg-white text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Modo Padrão: Fornecimento com Seletor do Cadastro + Modelos */
                  <div className="space-y-4">
                    {/* Seletor que busca no CADASTRO DE EQUIPAMENTOS */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Search className="w-3.5 h-3.5 text-emerald-700" />
                          Buscar no Cadastro de Equipamentos do Sistema:
                        </Label>
                        <span className="text-[11px] text-slate-500">
                          Catálogo de equipamentos cadastrados em /equipamentos
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <select
                            value={formData.equipamento_id || ''}
                            onChange={(e) => handleSelecionarEquipamentoCatalogo(e.target.value)}
                            className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="">
                              {carregandoEquipamentos
                                ? 'Carregando catálogo de equipamentos...'
                                : '-- Selecione um equipamento do catálogo (ou preencha abaixo) --'}
                            </option>
                            {equipamentos.map((eq) => (
                              <option key={eq.id} value={eq.id}>
                                [{eq.tipo.toUpperCase()}] {eq.marca} {eq.modelo} —{' '}
                                {eq.potencia_w > 0
                                  ? `${(eq.potencia_w / 1000).toFixed(1)} kW`
                                  : 'Potência s/ ref'}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <Input
                            type="number"
                            placeholder="Valor Carregador (R$)"
                            value={formData.carregador_valor ?? 9450}
                            onChange={(e) => {
                              const v = Number(e.target.value)
                              setFormData((prev) => {
                                const next = { ...prev, carregador_valor: v, opcao2_valor: v }
                                const totais = calcularTotalAutomatico(next)
                                return { ...next, ...totais }
                              })
                            }}
                            className="bg-white text-xs font-bold text-[#047857]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Modelos 7,4 kW e 22 kW apresentados na proposta */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Opção 01 */}
                      <div className="border border-slate-200 rounded-md p-3.5 bg-slate-50 space-y-2.5">
                        <div className="font-bold text-xs text-slate-800 uppercase">
                          Opção 01 — Wallbox 7,4 kW
                        </div>
                        <div>
                          <Label className="text-[11px] text-slate-600">Título / Modelo</Label>
                          <Input
                            value={formData.opcao1_titulo || ''}
                            onChange={(e) => handleUpdateField('opcao1_titulo', e.target.value)}
                            className="mt-0.5 bg-white text-xs"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[11px] text-slate-600">Potência</Label>
                            <Input
                              value={formData.opcao1_potencia || ''}
                              onChange={(e) => handleUpdateField('opcao1_potencia', e.target.value)}
                              className="mt-0.5 bg-white text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-[11px] text-slate-600">Valor Base (R$)</Label>
                            <Input
                              type="number"
                              value={formData.opcao1_valor ?? 6890}
                              onChange={(e) =>
                                handleUpdateField('opcao1_valor', Number(e.target.value))
                              }
                              className="mt-0.5 bg-white text-xs font-bold"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Opção 02 */}
                      <div className="border border-emerald-300 rounded-md p-3.5 bg-emerald-50/50 space-y-2.5">
                        <div className="font-bold text-xs text-[#047857] uppercase flex items-center justify-between">
                          <span>Opção 02 — Wallbox 22 kW</span>
                          <span className="text-[10px] bg-[#047857] text-white px-1.5 py-0.5 rounded">
                            Recomendado
                          </span>
                        </div>
                        <div>
                          <Label className="text-[11px] text-slate-600">Título / Modelo</Label>
                          <Input
                            value={formData.opcao2_titulo || ''}
                            onChange={(e) => {
                              const t = e.target.value
                              setFormData((prev) => ({
                                ...prev,
                                opcao2_titulo: t,
                                carregador_modelo: t,
                              }))
                            }}
                            className="mt-0.5 bg-white text-xs"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[11px] text-slate-600">Potência</Label>
                            <Input
                              value={formData.opcao2_potencia || ''}
                              onChange={(e) => {
                                const p = e.target.value
                                setFormData((prev) => ({
                                  ...prev,
                                  opcao2_potencia: p,
                                  carregador_potencia: p,
                                }))
                              }}
                              className="mt-0.5 bg-white text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-[11px] text-slate-600">Valor Base (R$)</Label>
                            <Input
                              type="number"
                              value={formData.opcao2_valor ?? 9450}
                              onChange={(e) => {
                                const v = Number(e.target.value)
                                setFormData((prev) => {
                                  const next = { ...prev, opcao2_valor: v, carregador_valor: v }
                                  const totais = calcularTotalAutomatico(next)
                                  return { ...next, ...totais }
                                })
                              }}
                              className="mt-0.5 bg-white text-xs font-bold text-[#047857]"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Seção 4: Bloco de Cálculo com Lista de Materiais da Infraestrutura */}
              <div className="border border-slate-200 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <span className="w-1.5 h-3.5 bg-[#047857] rounded-xs" />
                      4. Materiais da Infraestrutura de Instalação (NBR 5410 / NBR 17019)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Itens adicionáveis com descrição técnica, quantidade e valor unitário com
                      subtotal automático.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAdicionarMaterial}
                    className="text-xs gap-1 border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Item</span>
                  </Button>
                </div>

                {/* Tabela de Materiais */}
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3 text-left">Descrição do Material</th>
                        <th className="py-2.5 px-3 text-center w-20">Qtd</th>
                        <th className="py-2.5 px-3 text-right w-32">Unitário (R$)</th>
                        <th className="py-2.5 px-3 text-right w-32">Total (R$)</th>
                        <th className="py-2.5 px-2 text-center w-12">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(formData.materiais_infraestrutura || []).map((mat, idx) => {
                        const itemTotal = (mat.quantidade || 0) * (mat.valor_unitario || 0)
                        return (
                          <tr key={mat.id || idx} className="hover:bg-slate-50/70">
                            <td className="p-2">
                              <Input
                                value={mat.descricao}
                                onChange={(e) =>
                                  handleMaterialChange(idx, 'descricao', e.target.value)
                                }
                                placeholder="Descrição do material..."
                                className="h-8 text-xs bg-transparent"
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                min={1}
                                value={mat.quantidade}
                                onChange={(e) =>
                                  handleMaterialChange(idx, 'quantidade', e.target.value)
                                }
                                className="h-8 text-xs text-center bg-transparent"
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                step="any"
                                value={mat.valor_unitario}
                                onChange={(e) =>
                                  handleMaterialChange(idx, 'valor_unitario', e.target.value)
                                }
                                className="h-8 text-xs text-right bg-transparent"
                              />
                            </td>
                            <td className="p-2 text-right font-semibold text-slate-800 pr-3">
                              {itemTotal.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              })}
                            </td>
                            <td className="p-2 text-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoverMaterial(idx)}
                                className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                                title="Remover item de material"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200 font-bold">
                      <tr>
                        <td colSpan={3} className="py-2.5 px-3 text-right text-slate-700">
                          SUBTOTAL DOS MATERIAIS DE INFRAESTRUTURA:
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-800 text-sm">
                          {(formData.subtotal_materiais ?? 0).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Seção 5: Serviços e Consolidação do Investimento */}
              <div className="border border-slate-200 rounded-lg p-4 space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-1.5 h-3.5 bg-[#047857] rounded-xs" />
                  5. Serviços e Resumo do Investimento Total
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Carregador */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                    <Label className="text-xs text-slate-600">
                      Carregador Veicular {formData.carregador_adquirido ? '(Já Adquirido)' : ''}
                    </Label>
                    <div className="text-sm font-bold text-slate-800 pt-1">
                      {formData.carregador_adquirido ? (
                        <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded text-xs">
                          Adquirido (R$ 0,00)
                        </span>
                      ) : (
                        (formData.carregador_valor ?? 9450).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })
                      )}
                    </div>
                  </div>

                  {/* Subtotal Materiais */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                    <Label className="text-xs text-slate-600">Materiais de Infraestrutura</Label>
                    <div className="text-sm font-bold text-slate-800 pt-1">
                      {(formData.subtotal_materiais ?? 0).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </div>
                  </div>

                  {/* Serviços Unificados de Instalação e Engenharia */}
                  <div className="sm:col-span-2 p-3 bg-white border border-slate-200 rounded-lg space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-slate-700 font-semibold">
                        Serviços de Instalação e Engenharia (R$) *
                      </Label>
                      <span className="text-[11px] text-slate-500">Item unificado na proposta</span>
                    </div>
                    <Input
                      type="number"
                      value={
                        formData.valor_servicos ??
                        (Number(formData.valor_servicos_instalacao || 0) +
                          Number(formData.valor_servicos_engenharia || 0) ||
                          3050)
                      }
                      onChange={(e) => {
                        const v = Number(e.target.value)
                        setFormData((prev) => {
                          const next = {
                            ...prev,
                            valor_servicos: v,
                            valor_servicos_instalacao: v,
                            valor_servicos_engenharia: 0,
                          }
                          const totais = calcularTotalAutomatico(next)
                          return { ...next, ...totais }
                        })
                      }}
                      className="h-8 font-bold text-xs text-slate-900"
                    />
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Inclui montagem do quadro, cabeamento, fixação do Wallbox, comissionamento e
                      emissão de ART/CREA-RS.
                    </p>
                  </div>
                </div>

                {/* Total Consolidado e Condições */}
                <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-lg space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                        Investimento Total Calculado
                      </div>
                      <div className="text-[11px] text-emerald-700">
                        {formData.carregador_adquirido
                          ? 'Carregador Adquirido (sem custo) + Materiais + Serviços'
                          : 'Carregador + Materiais + Serviços'}
                      </div>
                    </div>
                    <div className="text-2xl font-black text-[#047857]">
                      {(formData.valor_total ?? 0).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-slate-700 font-semibold">
                      Condições de Pagamento
                    </Label>
                    <Textarea
                      rows={2}
                      value={formData.condicoes_pagamento || ''}
                      onChange={(e) => handleUpdateField('condicoes_pagamento', e.target.value)}
                      placeholder="Ex: Entrada 40% + 60% na conclusão ou em até 12x no cartão de crédito..."
                      className="mt-1 text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 6 e 7: Prazos, Garantia & Responsabilidade Técnica */}
              <div className="border border-slate-200 rounded-lg p-4 space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-1.5 h-3.5 bg-[#047857] rounded-xs" />6 &amp; 7. Prazos,
                  Garantias &amp; Engenheiro Responsável
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-slate-600">Engenheiro Eletricista</Label>
                    <Input
                      value={formData.engenheiro_nome || ''}
                      onChange={(e) => handleUpdateField('engenheiro_nome', e.target.value)}
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600">Registro Profissional CREA</Label>
                    <Input
                      value={formData.engenheiro_crea || ''}
                      onChange={(e) => handleUpdateField('engenheiro_crea', e.target.value)}
                      className="mt-1 text-xs"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Conteúdo Aba Preview Documento Fiel */}
            <TabsContent
              value="preview"
              className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/80 m-0"
            >
              <PreviewPropostaCarregadorDocumento
                dados={formData}
                editavel={modoEdicaoLivre}
                onChangeField={handleUpdateField}
              />
            </TabsContent>
          </Tabs>

          {/* Footer de Fechamento */}
          <DialogFooter className="no-print px-6 py-3 border-t border-slate-200 bg-white shrink-0 flex items-center justify-between sm:justify-between">
            <div className="text-xs text-slate-500">
              {clienteAtual ? (
                <span>
                  Cliente vinculado:{' '}
                  <strong>{clienteAtual.razao_social || clienteAtual.nome}</strong>
                </span>
              ) : (
                <span className="text-amber-700">Atenção: selecione um cliente para salvar.</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSalvar}
                disabled={salvando}
                className="bg-[#047857] hover:bg-[#065f46] text-white gap-1.5"
              >
                {salvando ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Salvar Proposta
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Inline de Cadastro de Cliente (reutilização oficial do sistema) */}
      <ModalCadastroClienteFornecedor
        isOpen={modalNovoClienteOpen}
        onClose={() => setModalNovoClienteOpen(false)}
        tipoEntidade="cliente"
        onSubmit={handleSalvarNovoClienteInline}
      />

      {/* Modais de Disparo E-mail e WhatsApp */}
      <ModalEnviarPropostaCarregadorEmail
        open={modalEmailOpen}
        onOpenChange={setModalEmailOpen}
        proposta={converterInputParaPropostaCarregador(formData, clienteId)}
        clienteEmail={clienteAtual?.email}
      />

      <ModalEnviarPropostaCarregadorWhatsApp
        open={modalWhatsAppOpen}
        onOpenChange={setModalWhatsAppOpen}
        proposta={converterInputParaPropostaCarregador(formData, clienteId)}
        clienteTelefone={clienteAtual?.whatsapp || clienteAtual?.telefone}
      />
    </>
  )
}
export default ModalGerarPropostaCarregador
