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
import { Textarea } from '@/components/ui/textarea'
import {
  Sparkles,
  Search,
  CheckSquare,
  Square,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Phone,
  Edit2,
  Info,
  DollarSign,
  Zap,
  TrendingDown,
  RefreshCw,
  Copy,
  Building2,
  Navigation,
  Layers,
  MapPin,
  ExternalLink,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { toast } from 'sonner'
import { formatCurrency, formatWhatsAppPhone } from '@/lib/formatters'
import { validarNumeroWhatsApp } from '@/lib/propostaWhatsAppService'
import { isAuthSessionError } from '@/lib/pocketbase/errors'
import {
  resolverNumeroDestinoClienteSync,
  MENSAGEM_ALERTA_SEM_NUMERO,
  type OrigemNumeroDestino,
} from '@/lib/resolverNumeroDestinoCliente'
import { SessaoExpiradaAlert } from '@/components/SessaoExpiradaAlert'
import {
  MENSAGEM_OFERTA_LIMPEZA_PADRAO,
  VALOR_BASE_LIMPEZA_PADRAO,
  TARIFA_ENERGIA_PADRAO,
  VALOR_KM_DESLOCAMENTO_LIMPEZA,
  MULTIPLICADOR_DESLOCAMENTO_IDA_VOLTA,
  calcularPerdaAnualPorSujeira,
  extrairGeracaoMediaMensal,
  extrairPotenciaUsinaTexto,
  extrairNumeroPlacas,
  calcularValorLimpezaPorPlacas,
  calcularValorDeslocamentoLimpeza,
  resolverPlaceholdersOfertaLimpeza,
} from '@/constants/ofertaLimpeza'
import { estimarDistanciaDelfosCliente } from '@/lib/calculoDeslocamentoAtividades'
import type { Cliente, UsinaCliente, Sistema } from '@/types/crm'

export interface ModalOferecerLimpezaAvulsaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialClienteId?: string | null
  usinasContexto?: UsinaCliente[]
  onSuccess?: () => void
  /**
   * Quando true, opera no modo individual estrito (tela/ficha do cliente):
   * - Desabilita seleção de outros clientes / multi-seleção
   * - Envia apenas para o cliente atual
   * - Calcula serviço e deslocamento conforme regras do CRM
   */
  modoIndividual?: boolean
  clienteContexto?: Cliente
  sistemaContexto?: Sistema | null
}

interface ItemClienteOferta {
  cliente: Cliente
  usina?: UsinaCliente | Sistema
  geracaoMensal: number
  geracaoAnual: number
  valorPerdaAnual: number
  potenciaTexto: string
  cidade: string
  telefoneAutoritativo: string
  origemNumero?: OrigemNumeroDestino
  contatoAdicionalNome?: string
  temWhatsAppValido: boolean
  numeroLimpo: string
}

export const ModalOferecerLimpezaAvulsa: React.FC<ModalOferecerLimpezaAvulsaProps> = ({
  open,
  onOpenChange,
  initialClienteId,
  usinasContexto,
  onSuccess,
  modoIndividual = false,
  clienteContexto,
  sistemaContexto,
}) => {
  const {
    clientes,
    contatosAdicionais,
    sistemas,
    sendWhatsAppMessage,
    addAtividade,
    updateCliente,
    whatsAppConfig,
    isSessionExpired,
  } = useClientes()

  // Estado da mensagem e do valor comercial
  const [templateTexto, setTemplateTexto] = useState(MENSAGEM_OFERTA_LIMPEZA_PADRAO)
  const [valorServico, setValorServico] = useState<number>(VALOR_BASE_LIMPEZA_PADRAO)

  // Deslocamento (requisito 3)
  const [incluirDeslocamento, setIncluirDeslocamento] = useState(false)
  const [distanciaKm, setDistanciaKm] = useState<number>(0)

  // Seleção de clientes e busca (modo em lote)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [clienteFocadoId, setClienteFocadoId] = useState<string | null>(null)
  const [busca, setBusca] = useState('')

  // Edição rápida de telefone de cliente sem WhatsApp ou divergente
  const [editandoTelefoneId, setEditandoTelefoneId] = useState<string | null>(null)
  const [telefoneEmEdicao, setTelefoneEmEdicao] = useState('')

  // Progresso do envio em lote
  const [isEnviando, setIsEnviando] = useState(false)
  const [progressoEnvio, setProgressoEnvio] = useState<{
    total: number
    atual: number
    sucessos: string[]
    erros: Array<{ clienteNome: string; erro: string }>
  } | null>(null)

  // Erro de sessão expirada local (se capturado em tempo de disparo)
  const [authErrorCapturado, setAuthErrorCapturado] = useState(false)

  // Constrói lista rica de clientes com usinas e perdas calculadas
  const clientesProcessados = useMemo<ItemClienteOferta[]>(() => {
    const listaBase = clienteContexto
      ? [clienteContexto, ...clientes.filter((c) => c.id !== clienteContexto.id)]
      : clientes

    return listaBase.map((cli) => {
      // Usina vinculada: procura nas usinas passadas por prop ou no array de sistemas unificado
      const usinaVinculada =
        usinasContexto?.find((u) => u.cliente_id === cli.id) ||
        (sistemaContexto && cli.id === sistemaContexto.cliente_id ? sistemaContexto : null) ||
        sistemas.find((s) => s.cliente_id === cli.id)

      const geracaoMensal = extrairGeracaoMediaMensal(
        cli,
        usinaVinculada ? ([usinaVinculada as any] as UsinaCliente[]) : [],
      )
      const { geracaoAnualKwh, valorPerda } = calcularPerdaAnualPorSujeira(
        geracaoMensal,
        TARIFA_ENERGIA_PADRAO,
      )
      const potenciaTexto = extrairPotenciaUsinaTexto(
        cli,
        usinaVinculada ? ([usinaVinculada as any] as UsinaCliente[]) : [],
      )

      // Resolução via utilitário central (WhatsApp -> Contato Adicional -> Telefone)
      const caDoCli = Array.isArray(contatosAdicionais)
        ? contatosAdicionais.filter((ca) => ca.cliente_id === cli.id)
        : []
      const resolucao = resolverNumeroDestinoClienteSync(cli, caDoCli)
      const telAutoritativo =
        resolucao.numeroFormatado || resolucao.numero || cli.whatsapp || cli.telefone || ''
      const validacao = validarNumeroWhatsApp(resolucao.numero || telAutoritativo)

      return {
        cliente: cli,
        usina: usinaVinculada || undefined,
        geracaoMensal,
        geracaoAnual: geracaoAnualKwh,
        valorPerdaAnual: valorPerda,
        potenciaTexto,
        cidade: (cli.cidade || usinaVinculada?.endereco || 'Erechim').trim(),
        telefoneAutoritativo: telAutoritativo,
        origemNumero: resolucao.origem,
        contatoAdicionalNome: resolucao.contatoAdicionalNome,
        temWhatsAppValido: validacao.valido && resolucao.origem !== 'nenhum',
        numeroLimpo: validacao.numeroLimpo || resolucao.numeroLimpo || '',
      }
    })
  }, [clientes, contatosAdicionais, clienteContexto, sistemaContexto, sistemas, usinasContexto])

  // Filtragem pela busca
  const clientesFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return clientesProcessados
    return clientesProcessados.filter((item) => {
      const matchNome = item.cliente.nome?.toLowerCase().includes(termo)
      const matchCidade = item.cidade?.toLowerCase().includes(termo)
      const matchTel = item.telefoneAutoritativo?.includes(termo)
      return matchNome || matchCidade || matchTel
    })
  }, [clientesProcessados, busca])

  // Identificação do cliente atual para modo individual
  const clienteAlvoId = initialClienteId || clienteContexto?.id || null

  const clienteAtualIndividual = useMemo<ItemClienteOferta | null>(() => {
    if (clienteContexto) {
      const usinaVinculada =
        usinasContexto?.find((u) => u.cliente_id === clienteContexto.id) ||
        (sistemaContexto && clienteContexto.id === sistemaContexto.cliente_id
          ? sistemaContexto
          : null) ||
        sistemas.find((s) => s.cliente_id === clienteContexto.id)

      const geracaoMensal = extrairGeracaoMediaMensal(
        clienteContexto,
        usinaVinculada ? ([usinaVinculada as any] as UsinaCliente[]) : [],
      )
      const { geracaoAnualKwh, valorPerda } = calcularPerdaAnualPorSujeira(
        geracaoMensal,
        TARIFA_ENERGIA_PADRAO,
      )
      const potenciaTexto = extrairPotenciaUsinaTexto(
        clienteContexto,
        usinaVinculada ? ([usinaVinculada as any] as UsinaCliente[]) : [],
      )
      const caDoCli = Array.isArray(contatosAdicionais)
        ? contatosAdicionais.filter((ca) => ca.cliente_id === clienteContexto.id)
        : []
      const resolucao = resolverNumeroDestinoClienteSync(clienteContexto, caDoCli)
      const telAutoritativo =
        resolucao.numeroFormatado ||
        resolucao.numero ||
        clienteContexto.whatsapp ||
        clienteContexto.telefone ||
        ''
      const validacao = validarNumeroWhatsApp(resolucao.numero || telAutoritativo)

      return {
        cliente: clienteContexto,
        usina: usinaVinculada || undefined,
        geracaoMensal,
        geracaoAnual: geracaoAnualKwh,
        valorPerdaAnual: valorPerda,
        potenciaTexto,
        cidade: (clienteContexto.cidade || usinaVinculada?.endereco || 'Erechim').trim(),
        telefoneAutoritativo: telAutoritativo,
        origemNumero: resolucao.origem,
        contatoAdicionalNome: resolucao.contatoAdicionalNome,
        temWhatsAppValido: validacao.valido && resolucao.origem !== 'nenhum',
        numeroLimpo: validacao.numeroLimpo || resolucao.numeroLimpo || '',
      }
    }

    if (clienteAlvoId) {
      return clientesProcessados.find((c) => c.cliente.id === clienteAlvoId) || null
    }

    return null
  }, [
    clienteContexto,
    contatosAdicionais,
    clienteAlvoId,
    clientesProcessados,
    usinasContexto,
    sistemaContexto,
    sistemas,
  ])

  // Número de placas do cliente focado/atual (requisito 2)
  const numeroPlacasCalculado = useMemo(() => {
    const cli = modoIndividual
      ? clienteAtualIndividual?.cliente
      : clienteContexto ||
        clientesProcessados.find((c) => c.cliente.id === (clienteFocadoId || selectedIds[0]))
          ?.cliente
    if (!cli) return 0
    return extrairNumeroPlacas(
      cli,
      usinasContexto || [],
      sistemaContexto || (sistemas.find((s) => s.cliente_id === cli.id) as any),
    )
  }, [
    modoIndividual,
    clienteAtualIndividual,
    clienteContexto,
    clientesProcessados,
    clienteFocadoId,
    selectedIds,
    usinasContexto,
    sistemaContexto,
    sistemas,
  ])

  // Valor sugerido da limpeza baseada nas placas (requisito 2: <30 -> R$ 300; >=30 -> placas * 9)
  const valorSugeridoLimpeza = useMemo(() => {
    return calcularValorLimpezaPorPlacas(numeroPlacasCalculado)
  }, [numeroPlacasCalculado])

  // Valor do deslocamento calculado (requisito 3: distanciaKm * 1.50 * 2)
  const valorDeslocamentoCalculado = useMemo(() => {
    if (!incluirDeslocamento) return 0
    return calcularValorDeslocamentoLimpeza(distanciaKm)
  }, [incluirDeslocamento, distanciaKm])

  // Valor total = valor do serviço de limpeza + deslocamento
  const valorTotalCalculado = useMemo(() => {
    return Math.round((valorServico + valorDeslocamentoCalculado) * 100) / 100
  }, [valorServico, valorDeslocamentoCalculado])

  // Inicialização ao abrir o modal
  useEffect(() => {
    if (!open) {
      setProgressoEnvio(null)
      setIsEnviando(false)
      setAuthErrorCapturado(false)
      setEditandoTelefoneId(null)
      setIncluirDeslocamento(false)
      return
    }

    setTemplateTexto(MENSAGEM_OFERTA_LIMPEZA_PADRAO)
    setAuthErrorCapturado(false)
    setProgressoEnvio(null)

    if (modoIndividual && (clienteAtualIndividual || clienteContexto || initialClienteId)) {
      const cliId =
        clienteAtualIndividual?.cliente.id || clienteContexto?.id || (initialClienteId as string)
      setSelectedIds([cliId])
      setClienteFocadoId(cliId)

      // Calcula valor sugerido automático
      const cli =
        clienteAtualIndividual?.cliente || clienteContexto || clientes.find((c) => c.id === cliId)
      const nPlacas = cli
        ? extrairNumeroPlacas(
            cli,
            usinasContexto || [],
            sistemaContexto || (sistemas.find((s) => s.cliente_id === cli.id) as any),
          )
        : 0
      const valorBaseSugerido = calcularValorLimpezaPorPlacas(nPlacas)
      setValorServico(valorBaseSugerido)

      // Estima a distância padrão de deslocamento se o cliente tiver cidade/endereço
      if (cli) {
        const est = estimarDistanciaDelfosCliente(cli.endereco, cli.cidade)
        setDistanciaKm(est.distanciaKm || 0)
      }
    } else {
      if (initialClienteId) {
        setSelectedIds([initialClienteId])
        setClienteFocadoId(initialClienteId)
        const cli = clientes.find((c) => c.id === initialClienteId)
        if (cli) {
          const nPlacas = extrairNumeroPlacas(
            cli,
            usinasContexto || [],
            sistemas.find((s) => s.cliente_id === cli.id) as any,
          )
          setValorServico(calcularValorLimpezaPorPlacas(nPlacas))
        } else {
          setValorServico(VALOR_BASE_LIMPEZA_PADRAO)
        }
      } else {
        const comWhats = clientesProcessados.filter((c) => c.temWhatsAppValido)
        const idsIniciais = comWhats.slice(0, 3).map((c) => c.cliente.id)
        setSelectedIds(idsIniciais)
        setClienteFocadoId(idsIniciais[0] || clientesProcessados[0]?.cliente.id || null)
        setValorServico(VALOR_BASE_LIMPEZA_PADRAO)
      }
      setIncluirDeslocamento(false)
    }
  }, [
    open,
    modoIndividual,
    initialClienteId,
    clienteContexto,
    clienteAtualIndividual,
    clientes,
    sistemas,
    usinasContexto,
    sistemaContexto,
    clientesProcessados,
  ])

  // Cliente atualmente visualizado na prévia
  const clienteFocado = useMemo(() => {
    if (modoIndividual && clienteAtualIndividual) {
      return clienteAtualIndividual
    }
    if (clienteFocadoId) {
      const achado = clientesProcessados.find((c) => c.cliente.id === clienteFocadoId)
      if (achado) return achado
    }
    const primeiroSelecionadoId = selectedIds[0]
    if (primeiroSelecionadoId) {
      const achado = clientesProcessados.find((c) => c.cliente.id === primeiroSelecionadoId)
      if (achado) return achado
    }
    return clientesProcessados[0] || null
  }, [modoIndividual, clienteAtualIndividual, clienteFocadoId, selectedIds, clientesProcessados])

  // Mensagem resolvida em tempo real para a prévia (usa valor total com limpeza + deslocamento se houver)
  const mensagemPreviaResolvida = useMemo(() => {
    if (!clienteFocado) return templateTexto
    return resolverPlaceholdersOfertaLimpeza({
      template: templateTexto,
      cliente: clienteFocado.cliente,
      usinasDoCliente: clienteFocado.usina ? ([clienteFocado.usina as any] as UsinaCliente[]) : [],
      valorServico: valorTotalCalculado,
      tarifa: TARIFA_ENERGIA_PADRAO,
    })
  }, [templateTexto, clienteFocado, valorTotalCalculado])

  // Handlers de seleção
  const handleToggleCliente = (clienteId: string) => {
    setSelectedIds((prev) => {
      const existe = prev.includes(clienteId)
      const novos = existe ? prev.filter((id) => id !== clienteId) : [...prev, clienteId]
      if (!existe) setClienteFocadoId(clienteId)
      return novos
    })
  }

  const handleSelectAll = () => {
    if (selectedIds.length === clientesFiltrados.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(clientesFiltrados.map((c) => c.cliente.id))
    }
  }

  // Salvar número do WhatsApp editado inline
  const handleSalvarTelefoneInline = async (cliente: Cliente) => {
    const val = validarNumeroWhatsApp(telefoneEmEdicao)
    if (!val.valido) {
      toast.error('Número de WhatsApp inválido', {
        description: 'Informe DDD + número (ex: 54 99999-9999).',
      })
      return
    }

    try {
      // Regra: WhatsApp é o número autoritativo do cliente.
      await updateCliente(cliente.id, {
        whatsapp: val.numeroFormatado,
        telefone: val.numeroFormatado,
      })
      toast.success('WhatsApp atualizado', {
        description: `Número gravado para ${cliente.nome}.`,
      })
      setEditandoTelefoneId(null)
      setTelefoneEmEdicao('')
    } catch (err) {
      console.error('Erro ao atualizar telefone:', err)
      toast.error('Erro ao salvar telefone')
    }
  }

  // Disparo / Abertura no WhatsApp e registro no histórico do cliente
  const handleConfirmarEnvio = async () => {
    // -------------------------------------------------------------
    // FLUXO DO MODO INDIVIDUAL (TELA / FICHA DO CLIENTE ATUAL)
    // -------------------------------------------------------------
    if (modoIndividual) {
      const item = clienteFocado
      if (!item) {
        toast.error('Cliente não encontrado para envio.')
        return
      }

      // Validação do número de destino via utilitário central
      if (!item.temWhatsAppValido || !item.numeroLimpo) {
        toast.error('Envio não realizado', {
          description: MENSAGEM_ALERTA_SEM_NUMERO,
        })
        return
      }

      // Formata número DDI 55 + DDD + dígitos
      let cleanDigits = item.numeroLimpo.replace(/\D/g, '')
      if (cleanDigits.length >= 10 && !cleanDigits.startsWith('55')) {
        cleanDigits = `55${cleanDigits}`
      }

      const mensagemFinal = mensagemPreviaResolvida
      const whatsappUrl = `https://wa.me/${cleanDigits}?text=${encodeURIComponent(mensagemFinal)}`

      setIsEnviando(true)
      try {
        // 1. Abre o WhatsApp com o número do cliente e a mensagem pronta (Requisito 5)
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer')

        // 2. Dispara também via gateway em background se configurado
        try {
          await sendWhatsAppMessage({
            cliente_id: item.cliente.id,
            telefone_destino: item.numeroLimpo,
            conteudo_final: mensagemFinal,
            tipo_disparo: 'manual',
          })
        } catch (gwErr) {
          // Log apenas se o gateway não responder, sem barrar o fluxo wa.me do usuário
          console.warn('Gateway Z-API não respondeu ou em fallback:', gwErr)
        }

        // 3. Registra no histórico do cliente que a oferta de limpeza avulsa foi enviada (Requisito 5)
        const agora = new Date().toISOString()
        const detalheDeslocamento = incluirDeslocamento
          ? ` (inclui ${distanciaKm} km de deslocamento ida/volta: ${formatCurrency(valorDeslocamentoCalculado)})`
          : ''
        const descHistorico = `Oferta de limpeza avulsa enviada via WhatsApp para ${item.cliente.nome}. Placas: ${numeroPlacasCalculado} un. Valor do serviço: ${formatCurrency(valorServico)}${detalheDeslocamento}. Total: ${formatCurrency(valorTotalCalculado)}. Perda estimada por sujeira: ${formatCurrency(item.valorPerdaAnual)}/ano.`

        await addAtividade({
          cliente_id: item.cliente.id,
          usina_id: item.usina?.id,
          tipo: 'oferecer_limpeza_avulsa',
          titulo: 'Oferecer Limpeza Avulsa',
          descricao: descHistorico,
          data: agora,
          status: 'concluida',
          autor: 'CRM Delfos Solar',
          valor_servico: valorServico,
          custo_deslocamento: incluirDeslocamento ? valorDeslocamentoCalculado : 0,
          distancia_km: incluirDeslocamento ? distanciaKm : 0,
          custo_total: valorTotalCalculado,
          cobrar_deslocamento: incluirDeslocamento,
        })

        toast.success(`WhatsApp aberto e oferta de limpeza registrada para ${item.cliente.nome}!`, {
          description: `Valor total: ${formatCurrency(valorTotalCalculado)} (${numeroPlacasCalculado} placas)`,
        })

        onOpenChange(false)
        if (onSuccess) onSuccess()
      } catch (err: unknown) {
        console.error('Erro ao registrar oferta de limpeza no CRM:', err)
        toast.error('Erro ao registrar atividade da oferta no histórico do cliente.')
      } finally {
        setIsEnviando(false)
      }
      return
    }

    // -------------------------------------------------------------
    // FLUXO DO MODO EM LOTE (LISTAGEM DE CLIENTES /CLIENTES)
    // -------------------------------------------------------------
    if (selectedIds.length === 0) {
      toast.error('Selecione ao menos um cliente para enviar a oferta.')
      return
    }

    const selecionados = clientesProcessados.filter((c) => selectedIds.includes(c.cliente.id))
    const semWhatsApp = selecionados.filter((c) => !c.temWhatsAppValido)

    if (semWhatsApp.length > 0 && semWhatsApp.length === selecionados.length) {
      toast.error('Envio não realizado', {
        description: MENSAGEM_ALERTA_SEM_NUMERO,
      })
      return
    }

    setIsEnviando(true)
    const estadoEnvio = {
      total: selecionados.length,
      atual: 0,
      sucessos: [] as string[],
      erros: [] as Array<{ clienteNome: string; erro: string }>,
    }
    setProgressoEnvio({ ...estadoEnvio })

    for (let i = 0; i < selecionados.length; i++) {
      const item = selecionados[i]
      estadoEnvio.atual = i + 1
      setProgressoEnvio({ ...estadoEnvio })

      // Validação do número antes de enviar
      if (!item.temWhatsAppValido || !item.numeroLimpo) {
        estadoEnvio.erros.push({
          clienteNome: item.cliente.nome,
          erro: MENSAGEM_ALERTA_SEM_NUMERO,
        })
        setProgressoEnvio({ ...estadoEnvio })
        continue
      }

      // Mensagem personalizada resolvida para este cliente específico
      const mensagemFinal = resolverPlaceholdersOfertaLimpeza({
        template: templateTexto,
        cliente: item.cliente,
        usinasDoCliente: item.usina ? ([item.usina as any] as UsinaCliente[]) : [],
        valorServico: valorTotalCalculado,
        tarifa: TARIFA_ENERGIA_PADRAO,
      })

      try {
        // 1. Dispara via WhatsApp Gateway (Z-API)
        await sendWhatsAppMessage({
          cliente_id: item.cliente.id,
          telefone_destino: item.numeroLimpo,
          conteudo_final: mensagemFinal,
          tipo_disparo: 'manual',
        })

        // 2. Registra atividade "oferecer_limpeza_avulsa" na timeline/atividades do CRM
        const agora = new Date().toISOString()
        await addAtividade({
          cliente_id: item.cliente.id,
          usina_id: item.usina?.id,
          tipo: 'oferecer_limpeza_avulsa',
          titulo: 'Oferecer Limpeza Avulsa',
          descricao: `Oferta enviada via WhatsApp: investimento de ${formatCurrency(valorTotalCalculado)}, perda estimada por sujeira de ${formatCurrency(item.valorPerdaAnual)}/ano.`,
          data: agora,
          status: 'concluida',
          autor: 'CRM Delfos Solar',
          valor_servico: valorServico,
          custo_deslocamento: incluirDeslocamento ? valorDeslocamentoCalculado : 0,
          distancia_km: incluirDeslocamento ? distanciaKm : 0,
          custo_total: valorTotalCalculado,
          cobrar_deslocamento: incluirDeslocamento,
        })

        estadoEnvio.sucessos.push(item.cliente.nome)
        setProgressoEnvio({ ...estadoEnvio })
      } catch (err: unknown) {
        console.error(`Erro ao enviar oferta para ${item.cliente.nome}:`, err)
        if (isAuthSessionError(err)) {
          setAuthErrorCapturado(true)
          estadoEnvio.erros.push({
            clienteNome: item.cliente.nome,
            erro: 'Sessão expirada. Faça login novamente.',
          })
          setProgressoEnvio({ ...estadoEnvio })
          break // interrompe o lote para evitar falhas consecutivas de auth
        }

        const msgErro =
          err instanceof Error
            ? err.message
            : 'Falha na comunicação com o gateway de WhatsApp (Z-API).'
        estadoEnvio.erros.push({
          clienteNome: item.cliente.nome,
          erro: msgErro,
        })
        setProgressoEnvio({ ...estadoEnvio })
      }
    }

    setIsEnviando(false)

    // Feedback final
    if (estadoEnvio.sucessos.length > 0) {
      toast.success(`Oferta de limpeza enviada para ${estadoEnvio.sucessos.length} cliente(s)!`, {
        description: 'As mensagens foram disparadas e as atividades foram registradas no CRM.',
      })
      if (onSuccess) onSuccess()
    }

    if (estadoEnvio.erros.length > 0) {
      toast.error(`Falha no envio para ${estadoEnvio.erros.length} cliente(s)`, {
        description: 'Verifique o status individual dos envios no painel.',
      })
    }
  }

  const isAllSelected =
    clientesFiltrados.length > 0 && selectedIds.length === clientesFiltrados.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden sm:rounded-2xl">
        {/* Header Visual */}
        <DialogHeader className="p-5 sm:p-6 pb-4 border-b bg-gradient-to-r from-emerald-50 via-white to-teal-50/50">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-xs">
                <Sparkles className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span>Oferecer Limpeza Avulsa</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Oferta Proativa via WhatsApp
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500 mt-0.5">
                  Dispare ofertas personalizadas de limpeza com cálculo automático de perda
                  financeira por sujeira.
                </DialogDescription>
              </div>
            </div>

            {/* Configuração de Gateway Z-API Badge */}
            {whatsAppConfig && (
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-gray-500 bg-white px-2.5 py-1 rounded-lg border border-gray-200 shadow-2xs">
                <span
                  className={`w-2 h-2 rounded-full ${
                    whatsAppConfig.configured ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                <span>Z-API {whatsAppConfig.configured ? 'Conectada' : 'Pendente'}</span>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Alerta de Sessão Expirada se capturado */}
        {(isSessionExpired || authErrorCapturado) && (
          <div className="p-4 border-b bg-amber-50">
            <SessaoExpiradaAlert />
          </div>
        )}

        {/* Progresso de Envio em Lote (se disparado) */}
        {progressoEnvio && (
          <div className="p-4 bg-slate-50 border-b space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-gray-700">
              <span className="flex items-center gap-2">
                {isEnviando ? (
                  <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                )}
                <span>{isEnviando ? 'Disparando ofertas via Z-API...' : 'Envios concluídos'}</span>
              </span>
              <span>
                {progressoEnvio.atual} de {progressoEnvio.total}
              </span>
            </div>
            {/* Barra de Progresso */}
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-600 h-2 transition-all duration-300"
                style={{
                  width: `${(progressoEnvio.atual / Math.max(progressoEnvio.total, 1)) * 100}%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-500">
              <span className="text-emerald-700 font-semibold">
                ✓ Sucesso: {progressoEnvio.sucessos.length}
              </span>
              {progressoEnvio.erros.length > 0 && (
                <span className="text-rose-700 font-semibold">
                  ✕ Falhas: {progressoEnvio.erros.length}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Corpo do Modal em 2 Colunas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* ======================================================== */}
          {/* COLUNA ESQUERDA (lg:col-span-5 ou 6):                    */}
          {/* MODO INDIVIDUAL: Dados da Usina & Placas do Cliente      */}
          {/* MODO LOTE: Seleção Multi-cliente com Busca              */}
          {/* ======================================================== */}
          {modoIndividual && clienteFocado ? (
            <div className="lg:col-span-5 flex flex-col space-y-3.5">
              <div className="bg-gradient-to-br from-emerald-50 via-teal-50/40 to-white p-4 rounded-xl border border-emerald-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-emerald-700" />
                    <span>Cliente Selecionado</span>
                  </Label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Envio Individual
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-bold text-gray-900 leading-tight">
                    {clienteFocado.cliente.nome}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-600 flex-wrap">
                    {clienteFocado.cidade && (
                      <span className="flex items-center gap-1 text-gray-700">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        {clienteFocado.cidade}
                      </span>
                    )}
                    <span>•</span>
                    <span className="flex items-center gap-1 text-amber-700 font-semibold">
                      <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      {clienteFocado.potenciaTexto}
                    </span>
                  </div>
                </div>

                {/* WhatsApp Autoritativo do Cliente */}
                <div className="bg-white p-3 rounded-lg border border-emerald-200 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                      <Phone className="w-3 h-3 text-emerald-600" />
                      WhatsApp Autoritativo:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditandoTelefoneId(clienteFocado.cliente.id)
                        setTelefoneEmEdicao(clienteFocado.telefoneAutoritativo)
                      }}
                      className="text-[10px] text-emerald-700 hover:text-emerald-900 font-semibold underline inline-flex items-center gap-1"
                    >
                      <Edit2 className="w-2.5 h-2.5" />
                      <span>
                        {clienteFocado.temWhatsAppValido ? 'Alterar' : 'Informar WhatsApp'}
                      </span>
                    </button>
                  </div>

                  {editandoTelefoneId === clienteFocado.cliente.id ? (
                    <div className="flex items-center gap-1.5 pt-1">
                      <Input
                        value={telefoneEmEdicao}
                        onChange={(e) => setTelefoneEmEdicao(formatWhatsAppPhone(e.target.value))}
                        placeholder="(00) 00000-0000"
                        className="h-8 text-xs bg-white flex-1"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        type="button"
                        onClick={() => handleSalvarTelefoneInline(clienteFocado.cliente)}
                        className="h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        Salvar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        type="button"
                        onClick={() => {
                          setEditandoTelefoneId(null)
                          setTelefoneEmEdicao('')
                        }}
                        className="h-8 px-2 text-xs"
                      >
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1 pt-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-sm">
                          {clienteFocado.telefoneAutoritativo || 'Não cadastrado'}
                        </span>
                        {clienteFocado.temWhatsAppValido ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            Válido
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Inválido
                          </span>
                        )}
                      </div>
                      {clienteFocado.origemNumero === 'contato_adicional_whatsapp' && (
                        <span className="text-[10px] text-blue-700 font-medium">
                          Contato adicional: {clienteFocado.contatoAdicionalNome || 'Contato'}{' '}
                          (utilizado como alternativa)
                        </span>
                      )}
                      {clienteFocado.origemNumero === 'cliente_telefone' && (
                        <span className="text-[10px] text-amber-700 font-medium">
                          Telefone do cliente (sem WhatsApp cadastrado)
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Card do Requisito 2: Número de Placas / Módulos e Cálculo Automático */}
                <div className="bg-white p-3.5 rounded-lg border border-emerald-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-blue-600" />
                      <span>Número de Placas / Módulos</span>
                    </span>
                    <span className="text-sm font-black text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
                      {numeroPlacasCalculado} {numeroPlacasCalculado === 1 ? 'placa' : 'placas'}
                    </span>
                  </div>

                  <div className="text-[11px] text-gray-600 space-y-1 bg-slate-50 p-2.5 rounded-md border border-slate-200">
                    <div className="flex items-center justify-between font-medium">
                      <span>Critério do cálculo comercial:</span>
                      <span className="font-bold text-gray-900">
                        {numeroPlacasCalculado < 30
                          ? 'Menos de 30 placas'
                          : `${numeroPlacasCalculado} × R$ 9,00`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-emerald-800 font-bold">
                      <span>Valor sugerido de limpeza:</span>
                      <span>{formatCurrency(valorSugeridoLimpeza)}</span>
                    </div>
                  </div>
                </div>

                {/* Informações da Usina e Perda Financeira por Sujeira */}
                <div className="grid grid-cols-2 gap-2 text-center text-[10px]">
                  <div className="p-2 bg-white rounded-lg border border-gray-200">
                    <span className="text-gray-400 block font-medium">Geração Estimada</span>
                    <span className="font-bold text-gray-800 text-xs">
                      {Math.round(clienteFocado.geracaoMensal)} kWh/mês
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-gray-200">
                    <span className="text-gray-400 block font-medium">Perda Estimada 30%</span>
                    <span className="font-bold text-rose-700 text-xs">
                      {formatCurrency(clienteFocado.valorPerdaAnual)}/ano
                    </span>
                  </div>
                </div>
              </div>

              {/* Dica Informativa */}
              <div className="text-[11px] text-gray-500 bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-start gap-2">
                <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Nesta tela individual o envio é direcionado exclusivamente a{' '}
                  <strong className="text-gray-800">{clienteFocado.cliente.nome}</strong>. O
                  WhatsApp é aberto diretamente com a mensagem preenchida e a atividade é registrada
                  na timeline.
                </span>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-6 flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <span>Selecionar Clientes ({selectedIds.length} selecionados)</span>
                </Label>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline"
                >
                  {isAllSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                </button>
              </div>

              {/* Barra de Busca de Clientes */}
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <Input
                  placeholder="Buscar cliente por nome, cidade ou telefone..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-9 text-xs sm:text-sm bg-white"
                />
              </div>

              {/* Lista com Rolagem e Multi-seleção */}
              <div className="flex-1 border border-gray-200 rounded-xl overflow-hidden bg-white max-h-[360px] overflow-y-auto divide-y divide-gray-100 shadow-2xs">
                {clientesFiltrados.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-500 space-y-1">
                    <p className="font-semibold text-gray-700">Nenhum cliente encontrado</p>
                    <p>Tente alterar o termo de busca.</p>
                  </div>
                ) : (
                  clientesFiltrados.map((item) => {
                    const isChecked = selectedIds.includes(item.cliente.id)
                    const isFocado = clienteFocado?.cliente.id === item.cliente.id
                    const isEditandoTel = editandoTelefoneId === item.cliente.id

                    return (
                      <div
                        key={item.cliente.id}
                        onClick={() => {
                          setClienteFocadoId(item.cliente.id)
                        }}
                        className={`p-3 transition-colors cursor-pointer flex flex-col gap-2 ${
                          isFocado
                            ? 'bg-emerald-50/70 border-l-4 border-l-emerald-600'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          {/* Checkbox de Seleção */}
                          <div
                            className="flex items-start gap-2.5 flex-1 min-w-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleToggleCliente(item.cliente.id)
                            }}
                          >
                            <button
                              type="button"
                              className="mt-0.5 text-gray-400 hover:text-emerald-700 transition-colors shrink-0"
                            >
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Square className="w-4 h-4 text-gray-400" />
                              )}
                            </button>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-xs sm:text-sm text-gray-900 truncate">
                                  {item.cliente.nome}
                                </span>
                                {item.cidade && (
                                  <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded">
                                    {item.cidade}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-0.5 flex-wrap">
                                <span className="flex items-center gap-1 text-amber-700 font-semibold">
                                  <Zap className="w-3 h-3 text-amber-500 shrink-0" />
                                  {item.potenciaTexto}
                                </span>
                                <span>•</span>
                                <span>{Math.round(item.geracaoMensal)} kWh/mês</span>
                                <span>•</span>
                                <span className="text-rose-700 font-semibold flex items-center gap-0.5">
                                  <TrendingDown className="w-3 h-3" />
                                  Perda: {formatCurrency(item.valorPerdaAnual)}/ano
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Linha do Telefone / WhatsApp */}
                        <div
                          className="flex items-center justify-between text-[11px] pt-1 border-t border-gray-100/80 gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isEditandoTel ? (
                            <div className="flex items-center gap-1.5 w-full">
                              <Input
                                value={telefoneEmEdicao}
                                onChange={(e) =>
                                  setTelefoneEmEdicao(formatWhatsAppPhone(e.target.value))
                                }
                                placeholder="(00) 00000-0000"
                                className="h-7 text-xs bg-white flex-1"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                type="button"
                                onClick={() => handleSalvarTelefoneInline(item.cliente)}
                                className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                Salvar
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                type="button"
                                onClick={() => {
                                  setEditandoTelefoneId(null)
                                  setTelefoneEmEdicao('')
                                }}
                                className="h-7 px-2 text-xs"
                              >
                                Cancelar
                              </Button>
                            </div>
                          ) : (
                            <>
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1.5">
                                  <Phone className="w-3 h-3 text-emerald-600" />
                                  {item.temWhatsAppValido ? (
                                    <span className="font-medium text-gray-800">
                                      {item.telefoneAutoritativo}
                                    </span>
                                  ) : (
                                    <span className="font-semibold text-rose-600 flex items-center gap-1">
                                      <AlertCircle className="w-3 h-3" />
                                      Sem número cadastrado
                                    </span>
                                  )}
                                </div>
                                {item.origemNumero === 'contato_adicional_whatsapp' && (
                                  <span className="text-[10px] text-blue-700 font-medium">
                                    Contato adicional: {item.contatoAdicionalNome || 'Contato'}{' '}
                                    (utilizado como alternativa)
                                  </span>
                                )}
                                {item.origemNumero === 'cliente_telefone' && (
                                  <span className="text-[10px] text-amber-700 font-medium">
                                    Telefone do cliente (sem WhatsApp cadastrado)
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditandoTelefoneId(item.cliente.id)
                                  setTelefoneEmEdicao(item.telefoneAutoritativo)
                                }}
                                className="text-[10px] text-emerald-700 hover:text-emerald-900 font-semibold underline inline-flex items-center gap-1"
                              >
                                <Edit2 className="w-2.5 h-2.5" />
                                <span>
                                  {item.temWhatsAppValido ? 'Alterar' : 'Informar WhatsApp'}
                                </span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Dica da regra do WhatsApp autoritativo */}
              <div className="text-[11px] text-gray-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-start gap-2">
                <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  No CRM Delfos Solar o WhatsApp é o número autoritativo. Ao disparar, cada cliente
                  selecionado receberá a mensagem personalizada com seus dados de usina e perda
                  anual.
                </span>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* COLUNA DIREITA (lg:col-span-6): EDITOR & PRÉVIA DA OFERTA */}
          {/* ======================================================== */}
          <div className="lg:col-span-6 flex flex-col space-y-3.5">
            {/* Configuração de Valor do Serviço e Deslocamento */}
            <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="valor-servico"
                  className="text-xs font-bold text-emerald-950 flex items-center gap-1.5"
                >
                  <DollarSign className="w-4 h-4 text-emerald-700" />
                  <span>Valor do Serviço de Limpeza (R$)</span>
                </Label>
                <span className="text-[11px] font-bold text-emerald-800">
                  {formatCurrency(valorServico)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id="valor-servico"
                  type="number"
                  step="10"
                  min="0"
                  value={valorServico}
                  onChange={(e) => setValorServico(Number(e.target.value) || 0)}
                  className="bg-white text-xs sm:text-sm font-bold text-gray-900"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setValorServico(valorSugeridoLimpeza || VALOR_BASE_LIMPEZA_PADRAO)}
                  className="text-xs h-9 text-gray-600 shrink-0"
                  title={`Restaurar valor sugerido (${formatCurrency(valorSugeridoLimpeza)})`}
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  {formatCurrency(valorSugeridoLimpeza)}
                </Button>
              </div>

              {/* Requisito 3: Flag de Deslocamento com KM e cálculo (distância * 1.50 * 2) */}
              <div className="pt-2 border-t border-emerald-200/70 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={incluirDeslocamento}
                      onChange={(e) => setIncluirDeslocamento(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 border-gray-300 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-emerald-950 flex items-center gap-1">
                      <Navigation className="w-3.5 h-3.5 text-emerald-700" />
                      Incluir deslocamento
                    </span>
                  </label>
                  {incluirDeslocamento && (
                    <span className="text-xs font-bold text-emerald-800">
                      + {formatCurrency(valorDeslocamentoCalculado)}
                    </span>
                  )}
                </div>

                {incluirDeslocamento && (
                  <div className="bg-white p-2.5 rounded-lg border border-emerald-200 space-y-1.5 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Label
                          htmlFor="distancia-km"
                          className="text-[11px] font-semibold text-gray-600 block mb-1"
                        >
                          Distância (km)
                        </Label>
                        <div className="relative">
                          <Input
                            id="distancia-km"
                            type="number"
                            step="1"
                            min="0"
                            value={distanciaKm || ''}
                            onChange={(e) =>
                              setDistanciaKm(Math.max(0, Number(e.target.value) || 0))
                            }
                            placeholder="0"
                            className="text-xs h-8 pr-8"
                          />
                          <span className="absolute right-2.5 top-2 text-[10px] text-gray-400 font-semibold">
                            km
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right text-[11px] pt-4 text-gray-600">
                        <div className="text-[10px] text-gray-400">
                          {distanciaKm} km × R$ 1,50 × 2
                        </div>
                        <div className="font-bold text-emerald-700">
                          = {formatCurrency(valorDeslocamentoCalculado)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Totalizador Comercial: Limpeza + Deslocamento */}
              <div className="pt-2 border-t border-emerald-200 flex items-center justify-between text-xs">
                <span className="font-bold text-gray-700">Valor Total Comercial:</span>
                <span className="text-sm font-black text-emerald-800">
                  {formatCurrency(valorTotalCalculado)}
                </span>
              </div>
            </div>

            {/* Editor de Texto com Placeholders */}
            <div className="space-y-1.5 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Modelo da Mensagem (com placeholders)
                </Label>
                <button
                  type="button"
                  onClick={() => setTemplateTexto(MENSAGEM_OFERTA_LIMPEZA_PADRAO)}
                  className="text-[11px] text-gray-500 hover:text-emerald-700 underline"
                >
                  Restaurar padrão
                </button>
              </div>

              <Textarea
                rows={5}
                value={templateTexto}
                onChange={(e) => setTemplateTexto(e.target.value)}
                className="text-xs font-mono bg-white resize-none p-2.5 leading-relaxed"
                placeholder="Digite o texto com os placeholders..."
              />

              {/* Badges explicativos dos Placeholders */}
              <div className="flex items-center gap-1 flex-wrap text-[10px] text-gray-500 pt-1">
                <span className="font-semibold text-gray-600">Tags disponíveis:</span>
                <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono">
                  [nome do cliente]
                </span>
                <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono">
                  [geração média]
                </span>
                <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono">
                  [valor calculado]
                </span>
                <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono">
                  [potência]
                </span>
                <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono">
                  [cidade]
                </span>
                <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono">
                  [valor]
                </span>
              </div>
            </div>

            {/* Pré-visualização da Mensagem Resolvida */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Prévia: {clienteFocado?.cliente.nome || 'Cliente Selecionado'}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(mensagemPreviaResolvida)
                    toast.success('Mensagem copiada para a área de transferência')
                  }}
                  className="text-[10px] text-gray-500 hover:text-gray-900 inline-flex items-center gap-1 font-semibold"
                  title="Copiar texto da prévia"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copiar</span>
                </button>
              </div>

              {/* Balão estilo WhatsApp */}
              <div className="bg-[#DCF8C6]/80 text-gray-900 text-xs p-3 rounded-xl rounded-tr-none shadow-xs border border-emerald-200/60 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto font-sans">
                {mensagemPreviaResolvida}
              </div>

              {/* Resumo dos Dados do Cliente na Prévia */}
              {clienteFocado && (
                <div className="grid grid-cols-3 gap-2 text-center text-[10px] pt-1">
                  <div className="p-1.5 bg-white rounded border border-gray-200">
                    <span className="text-gray-400 block">Geração Média</span>
                    <span className="font-bold text-gray-800">
                      {Math.round(clienteFocado.geracaoMensal)} kWh/mês
                    </span>
                  </div>
                  <div className="p-1.5 bg-white rounded border border-gray-200">
                    <span className="text-gray-400 block">Perda Estimada 30%</span>
                    <span className="font-bold text-rose-700">
                      {formatCurrency(clienteFocado.valorPerdaAnual)}/ano
                    </span>
                  </div>
                  <div className="p-1.5 bg-white rounded border border-gray-200">
                    <span className="text-gray-400 block">Potência</span>
                    <span className="font-bold text-emerald-700">
                      {clienteFocado.potenciaTexto}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rodapé de Ações */}
        <div className="p-4 sm:p-5 border-t bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-gray-600 text-center sm:text-left">
            {modoIndividual ? (
              <span className="font-medium text-gray-700">
                Total:{' '}
                <strong className="text-emerald-800 font-bold text-sm">
                  {formatCurrency(valorTotalCalculado)}
                </strong>
                {incluirDeslocamento && (
                  <span className="text-gray-500 text-[11px] ml-1">
                    (Limpeza {formatCurrency(valorServico)} + Deslocamento{' '}
                    {formatCurrency(valorDeslocamentoCalculado)})
                  </span>
                )}
              </span>
            ) : (
              <>
                <span className="font-bold text-gray-900">
                  {selectedIds.length === 1
                    ? '1 cliente selecionado'
                    : `${selectedIds.length} clientes selecionados`}
                </span>
                <span className="hidden sm:inline">
                  {' '}
                  • Envio direto via Z-API com registro de atividade no CRM
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={isEnviando}
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancelar
            </Button>

            <Button
              type="button"
              disabled={isEnviando || (modoIndividual ? !clienteFocado : selectedIds.length === 0)}
              onClick={handleConfirmarEnvio}
              className="bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold shadow-sm flex items-center gap-2 px-4"
            >
              {isEnviando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    {modoIndividual
                      ? 'Abrindo WhatsApp...'
                      : `Enviando ${progressoEnvio?.atual || 0} de ${progressoEnvio?.total || selectedIds.length}...`}
                  </span>
                </>
              ) : (
                <>
                  {modoIndividual ? (
                    <ExternalLink className="w-4 h-4" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>
                    {modoIndividual
                      ? 'Enviar WhatsApp (Cliente Atual)'
                      : selectedIds.length <= 1
                        ? 'Enviar Oferta por WhatsApp'
                        : `Enviar para ${selectedIds.length} Clientes`}
                  </span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ModalOferecerLimpezaAvulsa
