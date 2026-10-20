import React, { useState, useEffect } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { useToast } from '@/hooks/use-toast'
import type { PropostaCarregador, Cliente } from '@/types/crm'
import {
  gerarValoresIniciaisPropostaCarregador,
  salvarPropostaCarregador,
  type SalvarPropostaCarregadorInput,
} from '@/services/propostasCarregadorService'
import { PreviewPropostaCarregadorDocumento } from './PreviewPropostaCarregadorDocumento'
import { ModalEnviarPropostaCarregadorEmail } from './ModalEnviarPropostaCarregadorEmail'
import { ModalEnviarPropostaCarregadorWhatsApp } from './ModalEnviarPropostaCarregadorWhatsApp'

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
  const { clientes } = useClientes()
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

  // Sincroniza quando abrir modal ou mudar propostaExistente
  useEffect(() => {
    if (open) {
      if (propostaExistente) {
        setClienteId(propostaExistente.cliente_id)
        setFormData({
          id: propostaExistente.id,
          numero_proposta: propostaExistente.numero_proposta,
          cliente_id: propostaExistente.cliente_id,
          negocio_id: propostaExistente.negocio_id,
          data_emissao: propostaExistente.data_emissao,
          validade_dias: propostaExistente.validade_dias ?? 10,
          status: propostaExistente.status,
          autor: propostaExistente.autor,

          cliente_nome: propostaExistente.cliente_nome,
          cliente_documento: propostaExistente.cliente_documento,
          cliente_contato: propostaExistente.cliente_contato,
          endereco_instalacao: propostaExistente.endereco_instalacao,
          responsavel_acompanhante: propostaExistente.responsavel_acompanhante,
          tipo_local: propostaExistente.tipo_local,

          custo_proprio_min: propostaExistente.custo_proprio_min ?? 18,
          custo_proprio_max: propostaExistente.custo_proprio_max ?? 25,
          custo_publico_min: propostaExistente.custo_publico_min ?? 70,
          custo_publico_max: propostaExistente.custo_publico_max ?? 90,

          opcao_selecionada: propostaExistente.opcao_selecionada ?? 'ambas',
          opcao1_titulo: propostaExistente.opcao1_titulo ?? 'Opção 01: Wallbox AC 7,4 kW',
          opcao1_potencia: propostaExistente.opcao1_potencia ?? '7,4 kW (32A)',
          opcao1_tensao: propostaExistente.opcao1_tensao ?? 'Monofásico / Bifásico 220V',
          opcao1_tempo_recarga:
            propostaExistente.opcao1_tempo_recarga ?? '~7h a 8h (bateria 50–60 kWh)',
          opcao1_valor: propostaExistente.opcao1_valor ?? 6890,

          opcao2_titulo: propostaExistente.opcao2_titulo ?? 'Opção 02: Wallbox AC 22 kW',
          opcao2_potencia: propostaExistente.opcao2_potencia ?? '22 kW (32A trifásico)',
          opcao2_tensao: propostaExistente.opcao2_tensao ?? 'Trifásico 380V (ou 11kW em 220V)',
          opcao2_tempo_recarga:
            propostaExistente.opcao2_tempo_recarga ?? '~3h a 4h (bateria 50–60 kWh)',
          opcao2_valor: propostaExistente.opcao2_valor ?? 9450,

          valor_estacao_materiais: propostaExistente.valor_estacao_materiais ?? 5950,
          valor_servicos_engenharia: propostaExistente.valor_servicos_engenharia ?? 2450,
          valor_total: propostaExistente.valor_total ?? 8400,
          condicoes_pagamento: propostaExistente.condicoes_pagamento,

          prazo_execucao: propostaExistente.prazo_execucao,
          garantias: propostaExistente.garantias,
          premissas_orcamento_previo: propostaExistente.premissas_orcamento_previo,
          engenheiro_nome: propostaExistente.engenheiro_nome,
          engenheiro_crea: propostaExistente.engenheiro_crea,
          observacoes: propostaExistente.observacoes,
        })
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
  const handleSelecionarCliente = (novoClienteId: string) => {
    setClienteId(novoClienteId)
    const cli = clientes.find((c) => c.id === novoClienteId)
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
    }
  }

  const handleUpdateField = <K extends keyof SalvarPropostaCarregadorInput>(
    field: K,
    val: SalvarPropostaCarregadorInput[K],
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: val,
    }))
  }

  const handleRecalcularTotais = (materiais: number, servicos: number) => {
    setFormData((prev) => ({
      ...prev,
      valor_estacao_materiais: materiais,
      valor_servicos_engenharia: servicos,
      valor_total: materiais + servicos,
    }))
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
          <DialogHeader className="px-6 py-4 border-b border-slate-200 bg-white shrink-0 flex flex-row items-center justify-between">
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
                className="gap-1.5 text-xs"
                title="Imprimir ou gerar PDF via navegador"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span className="hidden sm:inline">Imprimir / PDF</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalEmailOpen(true)}
                className="gap-1.5 text-xs text-emerald-800 border-emerald-300 hover:bg-emerald-50"
              >
                <Mail className="w-4 h-4 text-[#047857]" />
                <span className="hidden sm:inline">E-mail</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalWhatsAppOpen(true)}
                className="gap-1.5 text-xs text-emerald-800 border-emerald-300 hover:bg-emerald-50"
              >
                <MessageSquare className="w-4 h-4 text-[#25D366]" />
                <span className="hidden sm:inline">WhatsApp</span>
              </Button>

              <Button
                type="button"
                onClick={handleSalvar}
                disabled={salvando}
                className="bg-[#047857] hover:bg-[#065f46] text-white gap-1.5 text-xs"
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
            <div className="px-6 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
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
                  <div className="sm:col-span-2">
                    <Label className="text-xs font-semibold text-slate-700">
                      Selecionar Cliente do CRM *
                    </Label>
                    <Select value={clienteId} onValueChange={handleSelecionarCliente}>
                      <SelectTrigger className="mt-1 bg-white">
                        <SelectValue placeholder="Selecione um cliente cadastrado..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {clientes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.razao_social || c.nome}{' '}
                            {c.cidade ? `(${c.cidade}/${c.estado || 'RS'})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-700">
                      Número da Proposta
                    </Label>
                    <Input
                      value={formData.numero_proposta || ''}
                      onChange={(e) => handleUpdateField('numero_proposta', e.target.value)}
                      placeholder="PROP-2025-084"
                      className="mt-1 bg-white font-mono"
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

              {/* Seção 3: Modelos de Carregador Disponíveis */}
              <div className="border border-slate-200 rounded-lg p-4 space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-1.5 h-3.5 bg-[#047857] rounded-xs" />
                  3. Modelos de Carregador Disponíveis (Valores Editáveis)
                </h3>

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
                        onChange={(e) => handleUpdateField('opcao2_titulo', e.target.value)}
                        className="mt-0.5 bg-white text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[11px] text-slate-600">Potência</Label>
                        <Input
                          value={formData.opcao2_potencia || ''}
                          onChange={(e) => handleUpdateField('opcao2_potencia', e.target.value)}
                          className="mt-0.5 bg-white text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] text-slate-600">Valor Base (R$)</Label>
                        <Input
                          type="number"
                          value={formData.opcao2_valor ?? 9450}
                          onChange={(e) =>
                            handleUpdateField('opcao2_valor', Number(e.target.value))
                          }
                          className="mt-0.5 bg-white text-xs font-bold text-[#047857]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção 5: Investimento & Condições Comerciais */}
              <div className="border border-slate-200 rounded-lg p-4 space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-1.5 h-3.5 bg-[#047857] rounded-xs" />
                  5. Investimento &amp; Condições Comerciais
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs text-slate-700 font-semibold">
                      Estação + Materiais (R$)
                    </Label>
                    <Input
                      type="number"
                      value={formData.valor_estacao_materiais ?? 5950}
                      onChange={(e) => {
                        const m = Number(e.target.value)
                        handleRecalcularTotais(m, formData.valor_servicos_engenharia ?? 2450)
                      }}
                      className="mt-1 font-semibold"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-slate-700 font-semibold">
                      Serviços de Engenharia (R$)
                    </Label>
                    <Input
                      type="number"
                      value={formData.valor_servicos_engenharia ?? 2450}
                      onChange={(e) => {
                        const s = Number(e.target.value)
                        handleRecalcularTotais(formData.valor_estacao_materiais ?? 5950, s)
                      }}
                      className="mt-1 font-semibold"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-slate-700 font-semibold">
                      INVESTIMENTO TOTAL (R$)
                    </Label>
                    <Input
                      type="number"
                      value={formData.valor_total ?? 8400}
                      onChange={(e) => handleUpdateField('valor_total', Number(e.target.value))}
                      className="mt-1 font-bold text-[#047857] bg-emerald-50/50"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <Label className="text-xs text-slate-700 font-semibold">
                      Condições de Pagamento
                    </Label>
                    <Textarea
                      rows={2}
                      value={formData.condicoes_pagamento || ''}
                      onChange={(e) => handleUpdateField('condicoes_pagamento', e.target.value)}
                      className="mt-1 text-xs"
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
          <DialogFooter className="px-6 py-3 border-t border-slate-200 bg-white shrink-0 flex items-center justify-between sm:justify-between">
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

      {/* Modais de Disparo E-mail e WhatsApp */}
      <ModalEnviarPropostaCarregadorEmail
        open={modalEmailOpen}
        onOpenChange={setModalEmailOpen}
        proposta={{
          id: formData.id || '',
          collectionId: 'propostas_carregador',
          collectionName: 'propostas_carregador',
          numero_proposta: formData.numero_proposta,
          cliente_id: clienteId,
          negocio_id: formData.negocio_id,
          data_emissao: formData.data_emissao,
          validade_dias: formData.validade_dias,
          status: (formData.status as PropostaCarregador['status']) || 'Em elaboração',
          cliente_nome: formData.cliente_nome,
          cliente_documento: formData.cliente_documento,
          cliente_contato: formData.cliente_contato,
          endereco_instalacao: formData.endereco_instalacao,
          responsavel_acompanhante: formData.responsavel_acompanhante,
          tipo_local: formData.tipo_local,
          custo_proprio_min: formData.custo_proprio_min,
          custo_proprio_max: formData.custo_proprio_max,
          custo_publico_min: formData.custo_publico_min,
          custo_publico_max: formData.custo_publico_max,
          opcao1_titulo: formData.opcao1_titulo,
          opcao1_potencia: formData.opcao1_potencia,
          opcao1_tensao: formData.opcao1_tensao,
          opcao1_tempo_recarga: formData.opcao1_tempo_recarga,
          opcao1_valor: formData.opcao1_valor,
          opcao2_titulo: formData.opcao2_titulo,
          opcao2_potencia: formData.opcao2_potencia,
          opcao2_tensao: formData.opcao2_tensao,
          opcao2_tempo_recarga: formData.opcao2_tempo_recarga,
          opcao2_valor: formData.opcao2_valor,
          valor_estacao_materiais: formData.valor_estacao_materiais,
          valor_servicos_engenharia: formData.valor_servicos_engenharia,
          valor_total: formData.valor_total,
          condicoes_pagamento: formData.condicoes_pagamento,
          prazo_execucao: formData.prazo_execucao,
          garantias: formData.garantias,
          premissas_orcamento_previo: formData.premissas_orcamento_previo,
          engenheiro_nome: formData.engenheiro_nome,
          engenheiro_crea: formData.engenheiro_crea,
          created: '',
          updated: '',
        }}
        clienteEmail={clienteAtual?.email}
      />

      <ModalEnviarPropostaCarregadorWhatsApp
        open={modalWhatsAppOpen}
        onOpenChange={setModalWhatsAppOpen}
        proposta={{
          id: formData.id || '',
          collectionId: 'propostas_carregador',
          collectionName: 'propostas_carregador',
          numero_proposta: formData.numero_proposta,
          cliente_id: clienteId,
          negocio_id: formData.negocio_id,
          data_emissao: formData.data_emissao,
          validade_dias: formData.validade_dias,
          status: (formData.status as PropostaCarregador['status']) || 'Em elaboração',
          cliente_nome: formData.cliente_nome,
          cliente_documento: formData.cliente_documento,
          cliente_contato: formData.cliente_contato,
          endereco_instalacao: formData.endereco_instalacao,
          responsavel_acompanhante: formData.responsavel_acompanhante,
          tipo_local: formData.tipo_local,
          custo_proprio_min: formData.custo_proprio_min,
          custo_proprio_max: formData.custo_proprio_max,
          custo_publico_min: formData.custo_publico_min,
          custo_publico_max: formData.custo_publico_max,
          opcao1_titulo: formData.opcao1_titulo,
          opcao1_potencia: formData.opcao1_potencia,
          opcao1_tensao: formData.opcao1_tensao,
          opcao1_tempo_recarga: formData.opcao1_tempo_recarga,
          opcao1_valor: formData.opcao1_valor,
          opcao2_titulo: formData.opcao2_titulo,
          opcao2_potencia: formData.opcao2_potencia,
          opcao2_tensao: formData.opcao2_tensao,
          opcao2_tempo_recarga: formData.opcao2_tempo_recarga,
          opcao2_valor: formData.opcao2_valor,
          valor_estacao_materiais: formData.valor_estacao_materiais,
          valor_servicos_engenharia: formData.valor_servicos_engenharia,
          valor_total: formData.valor_total,
          condicoes_pagamento: formData.condicoes_pagamento,
          prazo_execucao: formData.prazo_execucao,
          garantias: formData.garantias,
          premissas_orcamento_previo: formData.premissas_orcamento_previo,
          engenheiro_nome: formData.engenheiro_nome,
          engenheiro_crea: formData.engenheiro_crea,
          created: '',
          updated: '',
        }}
        clienteTelefone={clienteAtual?.whatsapp || clienteAtual?.telefone}
      />
    </>
  )
}
export default ModalGerarPropostaCarregador
