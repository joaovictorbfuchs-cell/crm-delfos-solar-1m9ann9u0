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
import { Textarea } from '@/components/ui/textarea'
import { Plus, Briefcase, UserPlus, Search, Building2, User } from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { useAuth } from '@/contexts/AuthContext'
import { ClienteAutocomplete } from '@/components/ClienteAutocomplete'
import { createNegocio } from '@/services/negociosService'
import { removerPrefixoMensagemManual } from '@/lib/whatsappPrefixo'
import type { TipoNegocioSelect, EtapaFunilSelect, NegocioStatus, Cliente } from '@/types/crm'
import { toast } from '@/hooks/use-toast'

interface ModalNovoNegocioFunilProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientePredefinido?: Cliente | null
  clienteIdPredefinido?: string
  etapaInicial?: EtapaFunilSelect
  onCreated?: () => void
  modoFichaCliente?: boolean
  isCriacaoViaFicha?: boolean
}

const TIPOS_NEGOCIO_OPCOES: { value: TipoNegocioSelect; label: string; tipoVenda: string }[] = [
  { value: 'venda usina', label: 'Venda de Usina Fotovoltaica', tipoVenda: 'Energia Solar' },
  { value: 'creditos_energia', label: 'Créditos de Energia', tipoVenda: 'Créditos de energia' },
  { value: 'bateria', label: 'Bateria Solar (Storage)', tipoVenda: 'Baterias' },
  { value: 'expansão', label: 'Expansão de Usina Existente', tipoVenda: 'Energia Solar' },
  {
    value: 'renovação',
    label: 'Plano de O&M / Manutenção',
    tipoVenda: 'O&M (Operação e Manutenção)',
  },
  {
    value: 'serviço',
    label: 'Carregadores Veículos Elétricos',
    tipoVenda: 'Carregadores Veículos Elétricos',
  },
  { value: 'venda bateria', label: 'Venda de Bateria Avulsa', tipoVenda: 'Baterias' },
]

const ETAPAS_FUNIL_OPCOES: { value: EtapaFunilSelect; label: string; defaultProb: number }[] = [
  { value: 'novo lead', label: '1 - Novo Lead', defaultProb: 10 },
  { value: 'qualificado', label: '2 - Levantamento / Qualificado', defaultProb: 25 },
  { value: 'proposta enviada', label: '3 - Proposta Enviada', defaultProb: 50 },
  { value: 'negociação', label: '4 - Negociação', defaultProb: 75 },
  { value: 'contato_futuro', label: '5 - Contato Futuro', defaultProb: 10 },
  { value: 'contrato assinado', label: '6 - Contrato Assinado (Ganho)', defaultProb: 100 },
]

export const ModalNovoNegocioFunil: React.FC<ModalNovoNegocioFunilProps> = ({
  open,
  onOpenChange,
  clientePredefinido,
  clienteIdPredefinido,
  etapaInicial = 'novo lead',
  onCreated,
  modoFichaCliente = false,
  isCriacaoViaFicha = false,
}) => {
  const isModoFicha = modoFichaCliente || isCriacaoViaFicha
  const { clientes, addCliente, usuarios, refreshData } = useClientes()
  const { user } = useAuth()

  // Modo de cliente: 'existente' ou 'novo'
  const [modoCliente, setModoCliente] = useState<'existente' | 'novo'>('existente')

  // Cliente existente selecionado
  const [clienteId, setClienteId] = useState<string>('')
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null)

  // Novo cliente rápido
  const [novoNome, setNovoNome] = useState('')
  const [novoTelefone, setNovoTelefone] = useState('')
  const [novoWhatsapp, setNovoWhatsapp] = useState('')
  const [novaCidade, setNovaCidade] = useState('Erechim/RS')
  const [novoCnpjCpf, setNovoCnpjCpf] = useState('')

  // Dados do Negócio
  const [titulo, setTitulo] = useState('')
  const [tipoNegocio, setTipoNegocio] = useState<TipoNegocioSelect>('venda usina')
  const [etapa, setEtapa] = useState<EtapaFunilSelect>(etapaInicial)
  const [status, setStatus] = useState<NegocioStatus>('em andamento')
  const [valorEstimado, setValorEstimado] = useState<string>('')
  const [valorFinal, setValorFinal] = useState<string>('')
  const [probabilidade, setProbabilidade] = useState<string>('10')
  const [dataPrevisao, setDataPrevisao] = useState<string>('')
  const [condicaoPagamento, setCondicaoPagamento] = useState<string>('')
  const [consultorResponsavel, setConsultorResponsavel] = useState<string>('')
  const [reabertura, setReabertura] = useState<boolean>(false)
  const [motivoReabertura, setMotivoReabertura] = useState<string>('')
  const [recorrenciaMensal, setRecorrenciaMensal] = useState<boolean>(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [erroValidacao, setErroValidacao] = useState<string | null>(null)

  // Preencher quando o modal abrir ou quando clientePredefinido mudar
  useEffect(() => {
    if (open) {
      setErroValidacao(null)
      const targetCliId = clienteIdPredefinido || clientePredefinido?.id || ''
      const targetCli =
        clientePredefinido ||
        (targetCliId ? clientes.find((c) => c.id === targetCliId) || null : null)

      if (targetCli) {
        setClienteId(targetCli.id)
        setClienteSelecionado(targetCli)
        setModoCliente('existente')
        if (!titulo) {
          const nomeClean = removerPrefixoMensagemManual(targetCli.nome)
          setTitulo(`Negócio - ${nomeClean}`)
        }
        // Prioriza o responsável já definido no cliente, ou assume o usuário logado
        if (targetCli.responsavel_id) {
          setConsultorResponsavel(targetCli.responsavel_id)
        } else if (user?.id) {
          setConsultorResponsavel(user.id)
        }
      } else {
        setClienteId('')
        setClienteSelecionado(null)
        setModoCliente('existente')
        if (user?.id) {
          setConsultorResponsavel(user.id)
        }
      }

      setEtapa(etapaInicial)
      const etapaOpt = ETAPAS_FUNIL_OPCOES.find((e) => e.value === etapaInicial)
      if (etapaOpt) setProbabilidade(String(etapaOpt.defaultProb))
    }
  }, [open, clientePredefinido, clienteIdPredefinido, etapaInicial, clientes, user?.id])

  // Ajusta título automático se usuário mudar o cliente existente
  const handleSelectClienteExistente = (id: string, cli?: Cliente) => {
    setClienteId(id)
    setClienteSelecionado(cli || null)
    setErroValidacao(null)
    if (cli && (!titulo || titulo.startsWith('Negócio - '))) {
      const nomeClean = removerPrefixoMensagemManual(cli.nome)
      setTitulo(`Negócio - ${nomeClean}`)
    }
    if (cli?.responsavel_id && !consultorResponsavel) {
      setConsultorResponsavel(cli.responsavel_id)
    }
  }

  const resetForm = () => {
    setModoCliente('existente')
    setClienteId('')
    setClienteSelecionado(null)
    setNovoNome('')
    setNovoTelefone('')
    setNovoWhatsapp('')
    setNovaCidade('Erechim/RS')
    setNovoCnpjCpf('')
    setTitulo('')
    setTipoNegocio('venda usina')
    setEtapa('novo lead')
    setStatus('em andamento')
    setValorEstimado('')
    setValorFinal('')
    setProbabilidade('10')
    setDataPrevisao('')
    setCondicaoPagamento('')
    setConsultorResponsavel(user?.id || '')
    setReabertura(false)
    setMotivoReabertura('')
    setRecorrenciaMensal(false)
    setErroValidacao(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErroValidacao(null)

    let finalClienteId = clienteId

    // Se estiver no modo novo cliente, valida e cria o cliente primeiro
    if (modoCliente === 'novo') {
      const nomeLimpo = novoNome.trim()
      if (!nomeLimpo) {
        setErroValidacao('Informe o nome do novo cliente.')
        return
      }
      const telFinal = novoTelefone.trim() || novoWhatsapp.trim()
      if (!telFinal) {
        setErroValidacao('Informe ao menos um telefone ou WhatsApp para o novo cliente.')
        return
      }

      setIsSubmitting(true)
      try {
        const docLimpo = novoCnpjCpf.replace(/\D/g, '')
        const isCnpj = docLimpo.length === 14
        const tipoVendaConfig = TIPOS_NEGOCIO_OPCOES.find((t) => t.value === tipoNegocio)

        const novoCliente = await addCliente({
          nome: removerPrefixoMensagemManual(nomeLimpo),
          telefone: novoTelefone.trim() || novoWhatsapp.trim(),
          whatsapp: novoWhatsapp.trim() || novoTelefone.trim(),
          cidade: novaCidade.trim() || 'Erechim/RS',
          cnpj: isCnpj ? novoCnpjCpf.trim() : undefined,
          cpf: !isCnpj && docLimpo.length === 11 ? novoCnpjCpf.trim() : undefined,
          tipo_venda: tipoVendaConfig?.tipoVenda || 'Energia Solar',
          status: 'Novo Lead',
          valor_estimado: valorEstimado ? Number(valorEstimado) : 0,
        })
        finalClienteId = novoCliente.id
      } catch (err: unknown) {
        console.error('Erro ao cadastrar novo cliente para o negócio:', err)
        setErroValidacao(err instanceof Error ? err.message : 'Falha ao cadastrar o novo cliente.')
        setIsSubmitting(false)
        return
      }
    } else {
      if (!finalClienteId) {
        setErroValidacao('Selecione um cliente existente ou opte por cadastrar um novo.')
        return
      }
    }

    // Validações do negócio
    const tipoConfig = TIPOS_NEGOCIO_OPCOES.find((t) => t.value === tipoNegocio)
    const tipoVenda = tipoConfig?.tipoVenda || 'Energia Solar'

    // Garante que o título NUNCA receba o prefixo manual de WhatsApp [Nome]:
    const clienteRef = clienteSelecionado || clientes.find((c) => c.id === finalClienteId)
    const fallbackNome = clienteRef?.nome
      ? removerPrefixoMensagemManual(clienteRef.nome)
      : 'Comercial'
    const tituloFinal = removerPrefixoMensagemManual(titulo.trim() || `Negócio - ${fallbackNome}`)

    // Se criado a partir da ficha do cliente (isModoFicha):
    // 1. Etapa do funil SEMPRE nasce como '1 - Novo Lead' ('novo lead')
    // 2. Valor Estimado, Valor Final = 0 (nulos/zerados até orçamento)
    // 3. Probabilidade = padrão (10% de Novo Lead)
    // 4. Previsão de Fechamento = undefined
    // 5. Condição de Pagamento = undefined
    // 6. Recorrência Mensal = false
    // 7. Reabertura / Expansão Futura = false
    const etapaFinalNegocio: EtapaFunilSelect = isModoFicha ? 'novo lead' : etapa
    const numEstimado = isModoFicha ? 0 : valorEstimado ? Number(valorEstimado) : 0
    const numFinal = isModoFicha ? 0 : valorFinal ? Number(valorFinal) : 0
    const numValor = numFinal > 0 ? numFinal : numEstimado
    const probFinal = isModoFicha ? 10 : probabilidade ? Number(probabilidade) : 10
    const dataPrevisaoFinal = isModoFicha
      ? undefined
      : dataPrevisao
        ? `${dataPrevisao} 12:00:00.000Z`
        : undefined
    const condicaoPagamentoFinal = isModoFicha ? undefined : condicaoPagamento.trim() || undefined
    const recorrenciaFinal = isModoFicha ? false : recorrenciaMensal
    const reaberturaFinal = isModoFicha ? false : reabertura
    const motivoReaberturaFinal =
      isModoFicha || !reabertura ? undefined : motivoReabertura.trim() || undefined
    const finalEtapa = isModoFicha ? 'novo lead' : etapaFinalNegocio

    setIsSubmitting(true)
    try {
      await createNegocio({
        cliente_id: finalClienteId,
        titulo: tituloFinal,
        tipo_negocio: tipoNegocio,
        tipo_venda: tipoVenda,
        valor_estimado: numEstimado,
        valor_final: numFinal,
        valor: numValor,
        etapa_funil: finalEtapa,
        status,
        probabilidade: probFinal,
        data_previsao_fechamento: dataPrevisaoFinal,
        condicao_pagamento: condicaoPagamentoFinal,
        consultor_responsavel:
          consultorResponsavel && consultorResponsavel.trim()
            ? consultorResponsavel.trim()
            : undefined,
        reabertura: reaberturaFinal,
        motivo_reabertura: motivoReaberturaFinal,
        recorrencia_mensal: recorrenciaFinal,
      })

      toast({
        title: 'Negócio criado com sucesso!',
        description: `O negócio "${tituloFinal}" foi adicionado ao funil comercial.`,
      })

      if (refreshData) await refreshData()
      if (onCreated) onCreated()
      onOpenChange(false)
      resetForm()
    } catch (err: unknown) {
      console.error('Erro ao criar negócio no funil:', err)
      setErroValidacao(
        err instanceof Error ? err.message : 'Não foi possível cadastrar o negócio no sistema.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const clienteFixo = Boolean(clientePredefinido || clienteIdPredefinido)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-base font-extrabold text-gray-900">
                Novo Negócio no Funil Comercial
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Oportunidade comercial vinculada a cliente, sem misturar com cadastro base.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {erroValidacao && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-semibold">
            {erroValidacao}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          {/* SELEÇÃO DO CLIENTE VINCULADO */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                Cliente Vinculado *
              </span>

              {!clienteFixo && (
                <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setModoCliente('existente')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                      modoCliente === 'existente'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Cliente Existente
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoCliente('novo')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                      modoCliente === 'novo'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    + Criar Novo Cliente
                  </button>
                </div>
              )}
            </div>

            {clienteFixo ? (
              <div className="p-2.5 bg-white border border-emerald-200 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-emerald-950">
                    {clienteSelecionado?.nome || clientePredefinido?.nome || 'Cliente Selecionado'}
                  </p>
                  {(clienteSelecionado?.cidade || clientePredefinido?.cidade) && (
                    <p className="text-[11px] text-slate-500">
                      {clienteSelecionado?.cidade || clientePredefinido?.cidade}
                    </p>
                  )}
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Cliente Vinculado
                </span>
              </div>
            ) : modoCliente === 'existente' ? (
              <div className="space-y-1">
                <ClienteAutocomplete
                  clientes={clientes}
                  value={clienteId}
                  onChange={handleSelectClienteExistente}
                  placeholder="Buscar cliente existente por nome, telefone, cidade ou documento..."
                />
                {clienteSelecionado && (
                  <p className="text-[11px] text-slate-500 pt-0.5">
                    Vinculado a:{' '}
                    <strong className="text-slate-800">{clienteSelecionado.nome}</strong>
                    {clienteSelecionado.cidade ? ` • ${clienteSelecionado.cidade}` : ''}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2.5 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700">
                      Nome do Novo Cliente *
                    </Label>
                    <Input
                      type="text"
                      value={novoNome}
                      onChange={(e) => {
                        const val = e.target.value
                        setNovoNome(val)
                        if (!titulo || titulo.startsWith('Negócio - ')) {
                          setTitulo(val ? `Negócio - ${val}` : '')
                        }
                      }}
                      placeholder="Ex: Carlos Eduardo Silveira"
                      className="text-xs h-9 bg-white"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700">
                      Telefone / Celular *
                    </Label>
                    <Input
                      type="text"
                      value={novoTelefone}
                      onChange={(e) => setNovoTelefone(e.target.value)}
                      placeholder="(54) 99999-0000"
                      className="text-xs h-9 bg-white"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700">
                      WhatsApp (opcional)
                    </Label>
                    <Input
                      type="text"
                      value={novoWhatsapp}
                      onChange={(e) => setNovoWhatsapp(e.target.value)}
                      placeholder="(54) 99999-0000"
                      className="text-xs h-9 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700">Cidade / UF</Label>
                    <Input
                      type="text"
                      value={novaCidade}
                      onChange={(e) => setNovaCidade(e.target.value)}
                      placeholder="Erechim/RS"
                      className="text-xs h-9 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700">CPF ou CNPJ</Label>
                    <Input
                      type="text"
                      value={novoCnpjCpf}
                      onChange={(e) => setNovoCnpjCpf(e.target.value)}
                      placeholder="000.000.000-00"
                      className="text-xs h-9 bg-white"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* DADOS DO NEGÓCIO */}
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Título do Negócio *</Label>
              <Input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Negócio - Venda Usina 15kWp"
                className="text-xs h-9"
                required
              />
              <span className="text-[10px] text-slate-400">
                Título limpo exibido no funil (sem prefixos manuais do WhatsApp).
              </span>
            </div>

            {isModoFicha ? (
              /* Modo criação a partir da Ficha do Cliente:
                 Exclui: Etapa do Funil (nasce sempre '1 - Novo Lead'), Valor Estimado,
                 Valor Final, Probabilidade, Previsão de Fechamento, Condição de Pagamento,
                 Recorrência Mensal e Reabertura / Expansão Futura.
                 Permanecem: Tipo de Negócio e Consultor Responsável.
              */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Tipo de Negócio *</Label>
                  <select
                    value={tipoNegocio}
                    onChange={(e) => setTipoNegocio(e.target.value as TipoNegocioSelect)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {TIPOS_NEGOCIO_OPCOES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label} ({t.tipoVenda})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Consultor Responsável</Label>
                  <select
                    value={consultorResponsavel}
                    onChange={(e) => setConsultorResponsavel(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">Selecione o responsável...</option>
                    {usuarios.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} {u.role ? `(${u.role})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">Tipo de Negócio *</Label>
                    <select
                      value={tipoNegocio}
                      onChange={(e) => setTipoNegocio(e.target.value as TipoNegocioSelect)}
                      className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      {TIPOS_NEGOCIO_OPCOES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label} ({t.tipoVenda})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">Etapa do Funil *</Label>
                    <select
                      value={etapa}
                      onChange={(e) => {
                        const novaEtapa = e.target.value as EtapaFunilSelect
                        setEtapa(novaEtapa)
                        const opt = ETAPAS_FUNIL_OPCOES.find((x) => x.value === novaEtapa)
                        if (opt) setProbabilidade(String(opt.defaultProb))
                      }}
                      className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      {ETAPAS_FUNIL_OPCOES.map((ef) => (
                        <option key={ef.value} value={ef.value}>
                          {ef.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">Valor Estimado (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={valorEstimado}
                      onChange={(e) => setValorEstimado(e.target.value)}
                      placeholder="Ex: 45000"
                      className="text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">Valor Final (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={valorFinal}
                      onChange={(e) => setValorFinal(e.target.value)}
                      placeholder="Ex: 42000"
                      className="text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">Probabilidade (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={probabilidade}
                      onChange={(e) => setProbabilidade(e.target.value)}
                      placeholder="Ex: 25"
                      className="text-xs h-9"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">
                      Previsão de Fechamento
                    </Label>
                    <Input
                      type="date"
                      value={dataPrevisao}
                      onChange={(e) => setDataPrevisao(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">
                      Consultor Responsável
                    </Label>
                    <select
                      value={consultorResponsavel}
                      onChange={(e) => setConsultorResponsavel(e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">Selecione o responsável...</option>
                      {usuarios.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} {u.role ? `(${u.role})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Condição de Pagamento</Label>
                  <Input
                    type="text"
                    value={condicaoPagamento}
                    onChange={(e) => setCondicaoPagamento(e.target.value)}
                    placeholder="Ex: Financiamento Santander 60x, Entrada 20% + 3x..."
                    className="text-xs h-9"
                  />
                </div>

                {/* Recorrência e Reabertura */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={recorrenciaMensal}
                        onChange={(e) => setRecorrenciaMensal(e.target.checked)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-800">Recorrência Mensal</span>
                    </label>
                    <p className="text-[10px] text-slate-500 pl-6">
                      Ideal para contratos recorrentes como Planos de O&M.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={reabertura}
                        onChange={(e) => setReabertura(e.target.checked)}
                        className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                      />
                      <span className="text-xs font-bold text-slate-800">
                        Reabertura / Expansão Futura
                      </span>
                    </label>
                    <p className="text-[10px] text-slate-500 pl-6">
                      Marca esta oportunidade como expansão de cliente existente.
                    </p>
                  </div>
                </div>

                {reabertura && (
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-600">
                      Motivo da Reabertura / Expansão
                    </Label>
                    <Textarea
                      value={motivoReabertura}
                      onChange={(e) => setMotivoReabertura(e.target.value)}
                      placeholder="Ex: Cliente solicitou aumento de potência para atender nova carga..."
                      rows={2}
                      className="text-xs bg-white"
                    />
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter className="border-t border-gray-100 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5"
            >
              {isSubmitting ? (
                'Criando Negócio...'
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Criar Negócio
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
