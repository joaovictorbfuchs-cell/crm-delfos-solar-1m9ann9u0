import React, { useState, useEffect } from 'react'
import {
  GitFork,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Clock,
  MessageSquare,
  Sparkles,
  Eye,
  EyeOff,
  MoveUp,
  MoveDown,
  Info,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Send,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  FluxoFollowUp,
  EtapaFollowUp,
  RegraEntradaFluxo,
  AcaoDesvioEtapa,
  AcaoRespostaEtapa,
  fetchFluxosFollowUp,
  createFluxoFollowUp,
  updateFluxoFollowUp,
  deleteFluxoFollowUp,
  createEtapaFollowUp,
  updateEtapaFollowUp,
  toggleEtapaFollowUp,
  deleteEtapaFollowUp,
  reordenarEtapasFollowUp,
  createRegraEntradaFluxo,
  updateRegraEntradaFluxo,
  deleteRegraEntradaFluxo,
} from '@/services/fluxosFollowUpService'
import { OPCOES_ETAPA_FUNIL_SCHEMA } from '@/services/negociosService'
import { PLACEHOLDERS_ENVIO_MASSA } from '@/lib/placeholdersMensagemMassa'
import { useClientes } from '@/contexts/ClientesContext'
import { ModalGerenciarWhatsAppTemplates } from '@/components/ModalGerenciarWhatsAppTemplates'
import { useWhatsAppTemplateTaxonomia } from '@/hooks/useWhatsAppTemplateTaxonomia'
import { WhatsAppTemplate } from '@/types/crm'

interface GerenciadorFluxosFollowUpProps {
  onFluxoAlterado?: () => void
}

export const GerenciadorFluxosFollowUp: React.FC<GerenciadorFluxosFollowUpProps> = ({
  onFluxoAlterado,
}) => {
  const { toast } = useToast()
  const { whatsAppTemplates } = useClientes()
  const [fluxos, setFluxos] = useState<FluxoFollowUp[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [fluxoSelecionadoId, setFluxoSelecionadoId] = useState<string | null>(null)

  // Modais de Criação/Edição de Fluxo
  const [modalFluxoAberto, setModalFluxoAberto] = useState(false)
  const [fluxoEmEdicao, setFluxoEmEdicao] = useState<FluxoFollowUp | null>(null)
  const [nomeFluxo, setNomeFluxo] = useState('')
  const [descricaoFluxo, setDescricaoFluxo] = useState('')
  const [isSalvandoFluxo, setIsSalvandoFluxo] = useState(false)

  // Modais de Criação/Edição de Etapa
  const [modalEtapaAberto, setModalEtapaAberto] = useState(false)
  const [etapaEmEdicao, setEtapaEmEdicao] = useState<EtapaFollowUp | null>(null)
  const [nomeEtapa, setNomeEtapa] = useState('')
  const [diasAposEtapa, setDiasAposEtapa] = useState<number>(3)
  const [mensagemEtapa, setMensagemEtapa] = useState('')
  const [etapaAtivaFlag, setEtapaAtivaFlag] = useState(true)
  const [desvioAcao, setDesvioAcao] = useState<AcaoDesvioEtapa>('nenhuma')
  const [desvioDias, setDesvioDias] = useState<number>(7)
  const [desvioFluxoId, setDesvioFluxoId] = useState<string>('')
  // Ramificação de Resposta (Fase 4)
  const [respostaAcao, setRespostaAcao] = useState<AcaoRespostaEtapa>('encerrar')
  const [respostaFluxoId, setRespostaFluxoId] = useState<string>('')
  const [isSalvandoEtapa, setIsSalvandoEtapa] = useState(false)
  const [mostrarPreviaEtapa, setMostrarPreviaEtapa] = useState(true)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [filtroCategoriaModal, setFiltroCategoriaModal] = useState<string>('todas')
  const [modalGerenciarTemplatesAberto, setModalGerenciarTemplatesAberto] = useState(false)

  // Taxonomia de WhatsApp do banco
  const { nomesCategorias } = useWhatsAppTemplateTaxonomia()

  // Regras de Entrada por Estágio (Fase 3)
  const [estagioNovaRegra, setEstagioNovaRegra] = useState<string>('negociação')
  const [isAdicionandoRegra, setIsAdicionandoRegra] = useState(false)

  // Confirmação de exclusão
  const [fluxoParaExcluir, setFluxoParaExcluir] = useState<FluxoFollowUp | null>(null)
  const [etapaParaExcluir, setEtapaParaExcluir] = useState<EtapaFollowUp | null>(null)

  const carregarDados = async () => {
    setIsLoading(true)
    try {
      const lista = await fetchFluxosFollowUp(false)
      setFluxos(lista)
      if (
        lista.length > 0 &&
        (!fluxoSelecionadoId || !lista.some((f) => f.id === fluxoSelecionadoId))
      ) {
        setFluxoSelecionadoId(lista[0].id)
      }
    } catch (err) {
      console.error('Erro ao buscar fluxos:', err)
      toast({
        title: 'Erro ao carregar fluxos',
        description: 'Não foi possível buscar os fluxos de follow-up cadastrados.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const fluxoAtivo = fluxos.find((f) => f.id === fluxoSelecionadoId) || fluxos[0] || null

  // Abrir modal de novo fluxo
  const handleNovoFluxo = () => {
    setFluxoEmEdicao(null)
    setNomeFluxo('')
    setDescricaoFluxo('')
    setModalFluxoAberto(true)
  }

  // Abrir modal de editar fluxo
  const handleEditarFluxo = (f: FluxoFollowUp) => {
    setFluxoEmEdicao(f)
    setNomeFluxo(f.nome)
    setDescricaoFluxo(f.descricao || '')
    setModalFluxoAberto(true)
  }

  // Formatação visual amigável dos estágios do funil
  const formatarNomeEstagio = (estagio: string): string => {
    const mapa: Record<string, string> = {
      'novo lead': 'Novo Lead',
      qualificado: 'Qualificado',
      'proposta enviada': 'Proposta Enviada',
      negociação: 'Negociação',
      contato_futuro: 'Contato Futuro',
      'contrato assinado': 'Fechado / Ganho',
      perdido: 'Perdido',
    }
    return mapa[estagio.toLowerCase()] || estagio
  }

  // Adicionar Regra de Entrada por Estágio (Fase 3)
  const handleAdicionarRegraEntrada = async () => {
    if (!fluxoAtivo || !estagioNovaRegra) return

    // Evitar regra duplicada para o mesmo estágio no mesmo fluxo
    const jaExiste = fluxoAtivo.regras_entrada?.some(
      (r) => r.estagio_funil.toLowerCase() === estagioNovaRegra.toLowerCase(),
    )
    if (jaExiste) {
      toast({
        title: 'Regra já existe',
        description: `Este fluxo já possui uma regra configurada para o estágio "${formatarNomeEstagio(estagioNovaRegra)}".`,
        variant: 'destructive',
      })
      return
    }

    setIsAdicionandoRegra(true)
    try {
      const novaRegra = await createRegraEntradaFluxo({
        fluxo_id: fluxoAtivo.id,
        estagio_funil: estagioNovaRegra,
        ativo: true,
      })
      setFluxos((prev) =>
        prev.map((f) => {
          if (f.id !== fluxoAtivo.id) return f
          return {
            ...f,
            regras_entrada: [...(f.regras_entrada || []), novaRegra],
          }
        }),
      )
      toast({
        title: 'Regra de entrada adicionada',
        description: `Contatos no estágio "${formatarNomeEstagio(estagioNovaRegra)}" entrarão automaticamente neste fluxo.`,
      })
      if (onFluxoAlterado) onFluxoAlterado()
    } catch (err) {
      toast({
        title: 'Erro ao adicionar regra',
        description: 'Não foi possível salvar a regra de entrada.',
        variant: 'destructive',
      })
    } finally {
      setIsAdicionandoRegra(false)
    }
  }

  // Toggle ativo/inativo na regra de entrada
  const handleToggleRegraEntrada = async (regra: RegraEntradaFluxo) => {
    if (!fluxoAtivo) return
    const novoAtivo = !regra.ativo
    try {
      await updateRegraEntradaFluxo(regra.id, { ativo: novoAtivo })
      setFluxos((prev) =>
        prev.map((f) => {
          if (f.id !== fluxoAtivo.id) return f
          const regras = (f.regras_entrada || []).map((r) =>
            r.id === regra.id ? { ...r, ativo: novoAtivo } : r,
          )
          return { ...f, regras_entrada: regras }
        }),
      )
      toast({
        title: novoAtivo ? 'Regra ativada' : 'Regra pausada',
        description: `Entrada automática para "${formatarNomeEstagio(regra.estagio_funil)}" agora está ${novoAtivo ? 'ativa' : 'pausada'}.`,
      })
      if (onFluxoAlterado) onFluxoAlterado()
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar a regra.',
        variant: 'destructive',
      })
    }
  }

  // Excluir regra de entrada
  const handleExcluirRegraEntrada = async (regraId: string) => {
    if (!fluxoAtivo) return
    try {
      await deleteRegraEntradaFluxo(regraId)
      setFluxos((prev) =>
        prev.map((f) => {
          if (f.id !== fluxoAtivo.id) return f
          const regras = (f.regras_entrada || []).filter((r) => r.id !== regraId)
          return { ...f, regras_entrada: regras }
        }),
      )
      toast({
        title: 'Regra removida',
        description: 'A regra de entrada foi excluída deste fluxo.',
      })
      if (onFluxoAlterado) onFluxoAlterado()
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a regra de entrada.',
        variant: 'destructive',
      })
    }
  }

  // Salvar fluxo
  const handleSalvarFluxo = async () => {
    if (!nomeFluxo.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Dê um nome identificável para o fluxo (ex: Comercial, Reativação O&M).',
        variant: 'destructive',
      })
      return
    }

    setIsSalvandoFluxo(true)
    try {
      if (fluxoEmEdicao) {
        const atualizado = await updateFluxoFollowUp(fluxoEmEdicao.id, {
          nome: nomeFluxo.trim(),
          descricao: descricaoFluxo.trim(),
        })
        setFluxos((prev) =>
          prev.map((f) =>
            f.id === atualizado.id
              ? { ...f, nome: atualizado.nome, descricao: atualizado.descricao }
              : f,
          ),
        )
        toast({ title: 'Fluxo atualizado', description: `O fluxo "${atualizado.nome}" foi salvo.` })
      } else {
        const criado = await createFluxoFollowUp({
          nome: nomeFluxo.trim(),
          descricao: descricaoFluxo.trim(),
          ativo: true,
          is_padrao: false,
        })
        setFluxos((prev) => [...prev, criado])
        setFluxoSelecionadoId(criado.id)
        toast({
          title: 'Fluxo criado',
          description: `O fluxo "${criado.nome}" foi criado com sucesso.`,
        })
      }
      setModalFluxoAberto(false)
      if (onFluxoAlterado) onFluxoAlterado()
    } catch (err) {
      toast({
        title: 'Erro ao salvar',
        description: 'Falha ao salvar o fluxo de follow-up.',
        variant: 'destructive',
      })
    } finally {
      setIsSalvandoFluxo(false)
    }
  }

  // Excluir fluxo
  const handleConfirmarExcluirFluxo = async () => {
    if (!fluxoParaExcluir) return
    try {
      await deleteFluxoFollowUp(fluxoParaExcluir.id)
      setFluxos((prev) => prev.filter((f) => f.id !== fluxoParaExcluir.id))
      if (fluxoSelecionadoId === fluxoParaExcluir.id) {
        const restante = fluxos.filter((f) => f.id !== fluxoParaExcluir.id)
        setFluxoSelecionadoId(restante.length > 0 ? restante[0].id : null)
      }
      toast({
        title: 'Fluxo excluído',
        description: `O fluxo "${fluxoParaExcluir.nome}" foi removido.`,
      })
      setFluxoParaExcluir(null)
      if (onFluxoAlterado) onFluxoAlterado()
    } catch (err) {
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o fluxo.',
        variant: 'destructive',
      })
    }
  }

  // Toggle ativo no fluxo
  const handleToggleAtivoFluxo = async (f: FluxoFollowUp) => {
    const novoAtivo = !f.ativo
    try {
      await updateFluxoFollowUp(f.id, { ativo: novoAtivo })
      setFluxos((prev) =>
        prev.map((item) => (item.id === f.id ? { ...item, ativo: novoAtivo } : item)),
      )
      toast({
        title: novoAtivo ? 'Fluxo ativado' : 'Fluxo pausado',
        description: `O fluxo "${f.nome}" agora está ${novoAtivo ? 'ativo' : 'pausado'}.`,
      })
      if (onFluxoAlterado) onFluxoAlterado()
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o status.',
        variant: 'destructive',
      })
    }
  }

  // Abrir modal nova etapa
  const handleNovaEtapa = () => {
    if (!fluxoAtivo) return
    const totalEtapas = fluxoAtivo.etapas?.length || 0
    setEtapaEmEdicao(null)
    setNomeEtapa(`${totalEtapas + 1}ª Mensagem`)
    // Se for a primeira etapa do fluxo, padrão pode ser 0 (imediato) ou 3; definindo 0 se totalEtapas === 0 para permitir imediato
    setDiasAposEtapa(totalEtapas === 0 ? 0 : 7)
    setMensagemEtapa(
      'Olá, [nome do cliente]! Tudo bem? Passando para saber se conseguiu ver nossa mensagem anterior. Qualquer dúvida, estou por aqui!',
    )
    setEtapaAtivaFlag(true)
    setDesvioAcao('nenhuma')
    setDesvioDias(7)
    // Seleciona o primeiro fluxo alternativo diferente deste, se houver
    const outroFluxo = fluxos.find((f) => f.id !== fluxoAtivo.id)
    setDesvioFluxoId(outroFluxo ? outroFluxo.id : '')
    setRespostaAcao('encerrar')
    setRespostaFluxoId(outroFluxo ? outroFluxo.id : '')
    setSelectedTemplateId('')
    setModalEtapaAberto(true)
  }

  // Abrir modal editar etapa
  const handleEditarEtapa = (etapa: EtapaFollowUp) => {
    setEtapaEmEdicao(etapa)
    setNomeEtapa(etapa.nome)
    setDiasAposEtapa(etapa.dias_apos)
    setMensagemEtapa(etapa.mensagem)
    setEtapaAtivaFlag(etapa.ativa)
    setDesvioAcao(etapa.desvio_acao || 'nenhuma')
    setDesvioDias(etapa.desvio_dias && etapa.desvio_dias > 0 ? etapa.desvio_dias : 7)
    setDesvioFluxoId(etapa.desvio_fluxo_id || '')
    setRespostaAcao(etapa.resposta_acao || 'encerrar')
    setRespostaFluxoId(etapa.resposta_fluxo_id || '')
    setSelectedTemplateId('')
    setModalEtapaAberto(true)
  }

  // Determina se a etapa atual sendo editada/criada é a primeira etapa do fluxo (ordem 1)
  const isEtapaInicial = etapaEmEdicao
    ? etapaEmEdicao.ordem === 1
    : (fluxoAtivo?.etapas?.length || 0) === 0

  // Salvar etapa
  const handleSalvarEtapa = async () => {
    if (!fluxoAtivo) return
    if (!mensagemEtapa.trim()) {
      toast({
        title: 'Mensagem obrigatória',
        description: 'Digite o texto da mensagem que será disparada nesta etapa.',
        variant: 'destructive',
      })
      return
    }

    const valorDiasApos = Number(diasAposEtapa)
    if (isNaN(valorDiasApos) || valorDiasApos < 0 || (!isEtapaInicial && valorDiasApos < 1)) {
      toast({
        title: 'Tempo de espera inválido',
        description: isEtapaInicial
          ? 'O tempo de espera da primeira etapa deve ser de no mínimo 0 dias (0 = imediato).'
          : 'O tempo de espera a partir da 2ª etapa deve ser de no mínimo 1 dia.',
        variant: 'destructive',
      })
      return
    }

    // Validação de prevenção de ciclo direto: desvio não pode apontar para o próprio fluxo
    if (desvioAcao === 'fluxo_alternativo') {
      if (!desvioFluxoId) {
        toast({
          title: 'Fluxo alternativo obrigatório',
          description:
            'Selecione para qual fluxo alternativo o contato deve ser desviado no timeout.',
          variant: 'destructive',
        })
        return
      }
      if (desvioFluxoId === fluxoAtivo.id) {
        toast({
          title: 'Desvio circular inválido',
          description:
            'Um fluxo não pode desviar para si mesmo no timeout. Escolha outro fluxo alternativo.',
          variant: 'destructive',
        })
        return
      }
    }

    // Validação de prevenção de ciclo direto: ramificação de resposta
    if (respostaAcao === 'fluxo_alternativo') {
      if (!respostaFluxoId) {
        toast({
          title: 'Fluxo de resposta obrigatório',
          description: 'Selecione em qual fluxo alternativo o contato deve entrar ao responder.',
          variant: 'destructive',
        })
        return
      }
      if (respostaFluxoId === fluxoAtivo.id) {
        toast({
          title: 'Ramificação circular inválida',
          description:
            'Um fluxo não pode ramificar para si mesmo ao responder. Escolha outro fluxo alternativo.',
          variant: 'destructive',
        })
        return
      }
    }

    setIsSalvandoEtapa(true)
    try {
      const diasCalculados = isEtapaInicial
        ? Math.max(0, isNaN(Number(diasAposEtapa)) ? 0 : Number(diasAposEtapa))
        : Math.max(1, isNaN(Number(diasAposEtapa)) ? 1 : Number(diasAposEtapa))

      const payloadEtapa = {
        nome:
          nomeEtapa.trim() ||
          `Etapa ${etapaEmEdicao ? etapaEmEdicao.ordem : (fluxoAtivo.etapas?.length || 0) + 1}`,
        dias_apos: diasCalculados,
        mensagem: mensagemEtapa.trim(),
        ativa: etapaAtivaFlag,
        desvio_acao: desvioAcao,
        desvio_dias: desvioAcao !== 'nenhuma' ? Math.max(1, Number(desvioDias) || 1) : 0,
        desvio_fluxo_id: desvioAcao === 'fluxo_alternativo' ? desvioFluxoId : '',
        resposta_acao: respostaAcao,
        resposta_fluxo_id: respostaAcao === 'fluxo_alternativo' ? respostaFluxoId : '',
      }

      if (etapaEmEdicao) {
        const atualizada = await updateEtapaFollowUp(etapaEmEdicao.id, payloadEtapa)
        setFluxos((prev) =>
          prev.map((f) => {
            if (f.id !== fluxoAtivo.id) return f
            const etapas = (f.etapas || []).map((e) => (e.id === atualizada.id ? atualizada : e))
            return { ...f, etapas }
          }),
        )
        toast({ title: 'Etapa atualizada', description: `A etapa "${atualizada.nome}" foi salva.` })
      } else {
        const criada = await createEtapaFollowUp({
          fluxo_id: fluxoAtivo.id,
          ...payloadEtapa,
        })
        setFluxos((prev) =>
          prev.map((f) => {
            if (f.id !== fluxoAtivo.id) return f
            const etapas = [...(f.etapas || []), criada]
            return { ...f, etapas }
          }),
        )
        toast({
          title: 'Etapa criada',
          description: `A etapa "${criada.nome}" foi adicionada ao fluxo.`,
        })
      }
      setModalEtapaAberto(false)
      if (onFluxoAlterado) onFluxoAlterado()
    } catch (err) {
      toast({
        title: 'Erro ao salvar etapa',
        description: 'Falha ao salvar etapa de follow-up.',
        variant: 'destructive',
      })
    } finally {
      setIsSalvandoEtapa(false)
    }
  }

  // Toggle ativa/desativa etapa sem apagar
  const handleToggleAtivaEtapa = async (etapa: EtapaFollowUp) => {
    if (!fluxoAtivo) return
    const novaAtiva = !etapa.ativa
    try {
      await toggleEtapaFollowUp(etapa.id, novaAtiva)
      setFluxos((prev) =>
        prev.map((f) => {
          if (f.id !== fluxoAtivo.id) return f
          const etapas = (f.etapas || []).map((e) =>
            e.id === etapa.id ? { ...e, ativa: novaAtiva } : e,
          )
          return { ...f, etapas }
        }),
      )
      toast({
        title: novaAtiva ? 'Etapa ativada' : 'Etapa pausada',
        description: `A etapa "${etapa.nome}" foi ${novaAtiva ? 'ativada' : 'desativada'} na sequência.`,
      })
      if (onFluxoAlterado) onFluxoAlterado()
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar a etapa.',
        variant: 'destructive',
      })
    }
  }

  // Excluir etapa
  const handleConfirmarExcluirEtapa = async () => {
    if (!fluxoAtivo || !etapaParaExcluir) return
    try {
      await deleteEtapaFollowUp(etapaParaExcluir.id)
      setFluxos((prev) =>
        prev.map((f) => {
          if (f.id !== fluxoAtivo.id) return f
          const etapas = (f.etapas || []).filter((e) => e.id !== etapaParaExcluir.id)
          return { ...f, etapas }
        }),
      )
      toast({
        title: 'Etapa excluída',
        description: `A etapa "${etapaParaExcluir.nome}" foi removida.`,
      })
      setEtapaParaExcluir(null)
      if (onFluxoAlterado) onFluxoAlterado()
    } catch {
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir a etapa.',
        variant: 'destructive',
      })
    }
  }

  // Mover etapa para cima / baixo
  const handleMoverEtapa = async (etapa: EtapaFollowUp, direcao: 'up' | 'down') => {
    if (!fluxoAtivo || !fluxoAtivo.etapas) return
    const lista = [...fluxoAtivo.etapas].sort((a, b) => a.ordem - b.ordem)
    const index = lista.findIndex((e) => e.id === etapa.id)
    if (index === -1) return
    if (direcao === 'up' && index === 0) return
    if (direcao === 'down' && index === lista.length - 1) return

    const targetIndex = direcao === 'up' ? index - 1 : index + 1
    const swap = lista[targetIndex]
    const currentOrdem = etapa.ordem
    const targetOrdem = swap.ordem

    lista[index] = { ...swap, ordem: currentOrdem }
    lista[targetIndex] = { ...etapa, ordem: targetOrdem }

    const novaOrdenacao = lista.map((item, idx) => ({ id: item.id, ordem: idx + 1 }))

    // Otimista
    setFluxos((prev) =>
      prev.map((f) => {
        if (f.id !== fluxoAtivo.id) return f
        const etapas = f.etapas?.map((e) => {
          const match = novaOrdenacao.find((n) => n.id === e.id)
          return match ? { ...e, ordem: match.ordem } : e
        })
        return { ...f, etapas: (etapas || []).sort((a, b) => a.ordem - b.ordem) }
      }),
    )

    try {
      await reordenarEtapasFollowUp(novaOrdenacao)
      if (onFluxoAlterado) onFluxoAlterado()
    } catch (err) {
      console.warn('Erro ao reordenar no backend:', err)
      carregarDados()
    }
  }

  // Pré-visualização com dados de exemplo
  const renderPreviaMensagem = (texto: string) => {
    if (!texto) return 'Digite a mensagem para visualizar a prévia...'
    return texto
      .replace(/\[nome do cliente\]/gi, 'João')
      .replace(/\[nome da empresa\]/gi, 'Delfos Solar')
      .replace(/\[empresa\]/gi, 'Delfos Solar')
      .replace(/\[cidade\]/gi, 'Erechim')
      .replace(/\[data atual\]/gi, new Date().toLocaleDateString('pt-BR'))
      .replace(/\[data\]/gi, new Date().toLocaleDateString('pt-BR'))
      .replace(/\[potência\]/gi, '7,1 kWp')
      .replace(/\[potencia\]/gi, '7,1 kWp')
      .replace(/\[valor\]/gi, 'R$ 350,00')
      .replace(/\{\{nome_cliente\}\}/g, 'João')
  }

  // Inserir tag no editor
  const handleInserirTag = (tag: string) => {
    setMensagemEtapa((prev) => (prev ? `${prev} ${tag}` : tag))
  }

  // Modelos de WhatsApp ativos
  const templatesAtivos = (whatsAppTemplates || []).filter((t) => t.ativo !== false)

  // Ao selecionar um modelo de WhatsApp
  const handleSelecionarTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId)
    if (!templateId) return
    const encontrado = templatesAtivos.find((t) => t.id === templateId)
    if (encontrado?.conteudo) {
      setMensagemEtapa(encontrado.conteudo)
      toast({
        title: 'Modelo aplicado',
        description: `O modelo "${encontrado.titulo}" preencheu a mensagem da etapa. Você pode editá-lo livremente.`,
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Topo: Título + Botão Criar Fluxo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <GitFork className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900">
              Fluxos de Follow-up de Disparos
            </h3>
            <Badge
              variant="outline"
              className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 border-emerald-300"
            >
              WhatsApp em Massa
            </Badge>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Configure réguas de reenvio com etapas escalonadas por prazo em dias, mensagens
            personalizadas e ativação sem apagar etapas.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={carregarDados}
            disabled={isLoading}
            className="text-xs h-8 text-gray-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleNovoFluxo}
            className="text-xs h-8 bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            <span>Novo Fluxo</span>
          </Button>
        </div>
      </div>

      {/* Grid Principal: Seletor de Fluxos à Esquerda + Editor de Etapas à Direita */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Coluna Esquerda: Lista de Fluxos (4 cols) */}
        <div className="lg:col-span-4 space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block px-1">
            Fluxos Disponíveis ({fluxos.length})
          </span>

          {isLoading && fluxos.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-600 mb-2" />
              <span>Carregando fluxos...</span>
            </div>
          ) : fluxos.length === 0 ? (
            <div className="p-6 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200 text-xs text-gray-500">
              Nenhum fluxo encontrado.
            </div>
          ) : (
            <div className="space-y-2">
              {fluxos.map((f) => {
                const isSelected = fluxoAtivo?.id === f.id
                const qtdEtapas = f.etapas?.length || 0
                const qtdAtivas = f.etapas?.filter((e) => e.ativa).length || 0
                const regrasAtivas = f.regras_entrada?.filter((r) => r.ativo) || []

                return (
                  <div
                    key={f.id}
                    onClick={() => setFluxoSelecionadoId(f.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-emerald-50/80 border-emerald-300 shadow-2xs ring-1 ring-emerald-300'
                        : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-sm text-gray-900 truncate">{f.nome}</span>
                          {f.is_padrao && (
                            <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-bold px-1.5 py-0">
                              Padrão Delfos
                            </Badge>
                          )}
                          {!f.ativo && (
                            <Badge variant="secondary" className="text-[10px] text-gray-500">
                              Pausado
                            </Badge>
                          )}
                        </div>
                        {f.descricao && (
                          <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">
                            {f.descricao}
                          </p>
                        )}

                        {/* Badges de Resumo Visual de Entrada por Estágio (Fase 3) */}
                        {regrasAtivas.length > 0 && (
                          <div className="flex items-center gap-1 mt-2 flex-wrap">
                            <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100/70 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                              <span>
                                Entra em:{' '}
                                {regrasAtivas
                                  .map((r) => formatarNomeEstagio(r.estagio_funil))
                                  .join(', ')}
                              </span>
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-emerald-600" />
                            <strong>{qtdEtapas}</strong> etapa{qtdEtapas === 1 ? '' : 's'} (
                            {qtdAtivas} ativa{qtdAtivas === 1 ? '' : 's'})
                          </span>
                        </div>
                      </div>

                      <div
                        className="flex items-center gap-1 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => handleEditarFluxo(f)}
                          className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
                          title="Editar nome/descrição do fluxo"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {!f.is_padrao && (
                          <button
                            type="button"
                            onClick={() => setFluxoParaExcluir(f)}
                            className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                            title="Excluir fluxo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Coluna Direita: Detalhe do Fluxo Selecionado e suas Etapas (8 cols) */}
        <div className="lg:col-span-8">
          {fluxoAtivo ? (
            <div className="space-y-4">
              {/* Header do Fluxo Selecionado */}
              <div className="p-4 rounded-xl bg-white border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-base font-bold text-gray-900">{fluxoAtivo.nome}</h4>
                    {fluxoAtivo.is_padrao && (
                      <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-bold">
                        Fluxo Padrão do Sistema
                      </Badge>
                    )}
                    <span className="text-xs text-gray-400">•</span>
                    <button
                      type="button"
                      onClick={() => handleToggleAtivoFluxo(fluxoAtivo)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-emerald-700"
                    >
                      {fluxoAtivo.ativo ? (
                        <>
                          <ToggleRight className="w-4 h-4 text-emerald-600" />
                          <span className="text-emerald-700">Fluxo Ativo</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-500">Fluxo Pausado</span>
                        </>
                      )}
                    </button>
                  </div>
                  {fluxoAtivo.descricao && (
                    <p className="text-xs text-gray-500 mt-1">{fluxoAtivo.descricao}</p>
                  )}

                  {/* Resumo visual no cabeçalho do fluxo ativo */}
                  {fluxoAtivo.regras_entrada && fluxoAtivo.regras_entrada.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span className="text-[11px] font-semibold text-gray-600">
                        Entrada automática em:
                      </span>
                      {fluxoAtivo.regras_entrada.map((r) => (
                        <Badge
                          key={r.id}
                          variant={r.ativo ? 'default' : 'secondary'}
                          className={`text-[10px] font-semibold ${
                            r.ativo
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {formatarNomeEstagio(r.estagio_funil)}
                          {!r.ativo && ' (pausada)'}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleNovaEtapa}
                    className="text-xs h-8 bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    <span>Adicionar Etapa</span>
                  </Button>
                </div>
              </div>

              {/* BLOCO: REGRAS DE ENTRADA POR ESTÁGIO (FASE 3) */}
              <div className="p-4 rounded-xl bg-white border border-gray-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="font-bold text-sm text-gray-900">
                        Regras de Entrada por Estágio do Negócio
                      </h5>
                      <p className="text-[11px] text-gray-500">
                        Clientes que mudarem para estes estágios no CRM entram automaticamente neste
                        fluxo.
                      </p>
                    </div>
                  </div>

                  {/* Adicionar nova regra */}
                  <div className="flex items-center gap-2">
                    <select
                      value={estagioNovaRegra}
                      onChange={(e) => setEstagioNovaRegra(e.target.value)}
                      className="h-8 text-xs bg-slate-50 border border-gray-300 rounded-md px-2 font-medium text-gray-800"
                    >
                      <option value="novo lead">Novo Lead</option>
                      <option value="qualificado">Qualificado</option>
                      <option value="proposta enviada">Proposta Enviada</option>
                      <option value="negociação">Negociação</option>
                      <option value="contato_futuro">Contato Futuro</option>
                      <option value="contrato assinado">Fechado / Ganho</option>
                      <option value="perdido">Perdido</option>
                    </select>

                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAdicionarRegraEntrada}
                      disabled={isAdicionandoRegra}
                      className="text-xs h-8 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      <span>Adicionar Regra</span>
                    </Button>
                  </div>
                </div>

                {/* Lista de Regras Configuradas */}
                {!fluxoAtivo.regras_entrada || fluxoAtivo.regras_entrada.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-2">
                    Nenhuma regra de entrada configurada. O fluxo só receberá clientes incluídos
                    manualmente ou por disparo direto.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                    {fluxoAtivo.regras_entrada.map((regra) => (
                      <div
                        key={regra.id}
                        className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 transition-all ${
                          regra.ativo
                            ? 'bg-emerald-50/60 border-emerald-200'
                            : 'bg-gray-50 border-gray-200 opacity-70'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-xs text-gray-900 block truncate">
                            {formatarNomeEstagio(regra.estagio_funil)}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            {regra.ativo ? 'Entrada ativa' : 'Entrada pausada'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleRegraEntrada(regra)}
                            className="p-1 text-gray-500 hover:text-emerald-700 cursor-pointer"
                            title={regra.ativo ? 'Pausar regra' : 'Ativar regra'}
                          >
                            {regra.ativo ? (
                              <ToggleRight className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <ToggleLeft className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExcluirRegraEntrada(regra.id)}
                            className="p-1 text-gray-400 hover:text-rose-600 cursor-pointer rounded"
                            title="Remover regra"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Lista de Etapas do Fluxo */}
              {!fluxoAtivo.etapas || fluxoAtivo.etapas.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-xl border border-dashed border-gray-200 text-xs text-gray-500 space-y-2">
                  <Clock className="w-8 h-8 mx-auto text-gray-400" />
                  <p className="font-semibold text-gray-700">
                    Este fluxo ainda não possui etapas cadastradas.
                  </p>
                  <p className="text-gray-400 max-w-sm mx-auto">
                    Clique no botão acima para adicionar a 1ª etapa de follow-up (definindo dias de
                    espera e mensagem).
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleNovaEtapa}
                    className="text-xs mt-2"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    <span>Adicionar 1ª Etapa</span>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {fluxoAtivo.etapas.map((etapa, idx) => {
                    const isPrimeira = idx === 0
                    const isUltima = idx === (fluxoAtivo.etapas?.length || 0) - 1

                    return (
                      <div
                        key={etapa.id}
                        className={`p-4 rounded-xl border transition-all bg-white ${
                          etapa.ativa
                            ? 'border-gray-200 hover:border-emerald-300'
                            : 'border-dashed border-gray-300 bg-gray-50/60 opacity-80'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          {/* Lado Esquerdo: Indicador de Ordem + Dias */}
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                              <span
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                  etapa.ativa
                                    ? 'bg-emerald-700 text-white'
                                    : 'bg-gray-300 text-gray-700'
                                }`}
                              >
                                {etapa.ordem}
                              </span>

                              {/* Botões de reordenação */}
                              <div className="flex flex-col gap-0.5">
                                <button
                                  type="button"
                                  disabled={isPrimeira}
                                  onClick={() => handleMoverEtapa(etapa, 'up')}
                                  className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-20 cursor-pointer"
                                  title="Mover para cima"
                                >
                                  <MoveUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={isUltima}
                                  onClick={() => handleMoverEtapa(etapa, 'down')}
                                  className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-20 cursor-pointer"
                                  title="Mover para baixo"
                                >
                                  <MoveDown className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm text-gray-900">
                                  {etapa.nome}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-[11px] font-semibold bg-sky-50 text-sky-800 border-sky-300 flex items-center gap-1"
                                >
                                  <Clock className="w-3 h-3 text-sky-600" />
                                  <span>
                                    {etapa.dias_apos === 0
                                      ? 'Imediato (no disparo)'
                                      : `+${etapa.dias_apos} dia${etapa.dias_apos === 1 ? '' : 's'} ${idx === 0 ? 'após 1º disparo' : 'da etapa anterior'}`}
                                  </span>
                                </Badge>

                                {etapa.ativa ? (
                                  <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 text-[10px] font-semibold">
                                    Ativa
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-[10px] text-gray-500">
                                    Desativada (pulada na fila)
                                  </Badge>
                                )}

                                {/* Badge de regra de desvio por timeout */}
                                {etapa.desvio_acao && etapa.desvio_acao !== 'nenhuma' && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] font-semibold bg-amber-50 text-amber-900 border-amber-300 flex items-center gap-1"
                                  >
                                    <GitFork className="w-3 h-3 text-amber-600" />
                                    <span>
                                      Sem resposta em {etapa.desvio_dias}d →{' '}
                                      {etapa.desvio_acao === 'arquivar'
                                        ? 'Arquivar contato'
                                        : `Entra em "${fluxos.find((f) => f.id === etapa.desvio_fluxo_id)?.nome || 'Outro fluxo'}"`}
                                    </span>
                                  </Badge>
                                )}

                                {/* Badge de ramificação de resposta (Fase 4) */}
                                {etapa.resposta_acao === 'fluxo_alternativo' && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] font-semibold bg-blue-50 text-blue-900 border-blue-300 flex items-center gap-1"
                                  >
                                    <MessageSquare className="w-3 h-3 text-blue-600" />
                                    <span>
                                      Ao responder → Entra em "
                                      {fluxos.find((f) => f.id === etapa.resposta_fluxo_id)?.nome ||
                                        'Outro fluxo'}
                                      "
                                    </span>
                                  </Badge>
                                )}
                              </div>

                              {/* Caixa de Texto da Mensagem */}
                              <div className="mt-2 text-xs text-gray-700 bg-slate-50 p-3 rounded-lg border border-slate-200 whitespace-pre-wrap font-sans">
                                {etapa.mensagem}
                              </div>

                              {/* Pré-visualização com dados reais */}
                              <div className="mt-2 text-[11px] text-gray-500 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-200/80 flex items-start gap-2">
                                <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <strong className="text-emerald-900 block text-[10px] uppercase tracking-wide">
                                    Prévia com variáveis substituídas:
                                  </strong>
                                  <p className="italic text-gray-700 mt-0.5 whitespace-pre-wrap">
                                    "{renderPreviaMensagem(etapa.mensagem)}"
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Lado Direito: Ações da Etapa */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleAtivaEtapa(etapa)}
                              className={`p-1.5 rounded-lg border text-xs font-semibold transition-all ${
                                etapa.ativa
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-100'
                              }`}
                              title={etapa.ativa ? 'Desativar etapa sem apagar' : 'Ativar etapa'}
                            >
                              {etapa.ativa ? (
                                <Check className="w-3.5 h-3.5 text-emerald-700" />
                              ) : (
                                <X className="w-3.5 h-3.5 text-gray-400" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleEditarEtapa(etapa)}
                              className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                              title="Editar texto ou tempo em dias"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setEtapaParaExcluir(etapa)}
                              className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200"
                              title="Excluir etapa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Modal Criar / Editar Fluxo */}
      <Dialog open={modalFluxoAberto} onOpenChange={setModalFluxoAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {fluxoEmEdicao ? 'Editar Fluxo de Follow-up' : 'Novo Fluxo de Follow-up'}
            </DialogTitle>
            <DialogDescription>
              Crie réguas temáticas para disparo (ex: Comercial, Reativação O&M, Pós-instalação).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold text-gray-700 block mb-1">Nome do Fluxo *</label>
              <Input
                placeholder="Ex: Comercial, Reativação O&M"
                value={nomeFluxo}
                onChange={(e) => setNomeFluxo(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-gray-700 block mb-1">Descrição (opcional)</label>
              <Textarea
                placeholder="Explique o objetivo deste fluxo e para qual perfil de clientes ele é indicado..."
                value={descricaoFluxo}
                onChange={(e) => setDescricaoFluxo(e.target.value)}
                rows={3}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalFluxoAberto(false)}
              className="text-xs h-8"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSalvarFluxo}
              disabled={isSalvandoFluxo}
              className="text-xs h-8 bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
            >
              {isSalvandoFluxo ? 'Salvando...' : 'Salvar Fluxo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Criar / Editar Etapa */}
      <Dialog open={modalEtapaAberto} onOpenChange={setModalEtapaAberto}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {etapaEmEdicao ? 'Editar Etapa de Follow-up' : 'Nova Etapa de Follow-up'}
            </DialogTitle>
            <DialogDescription>
              Configure o prazo em dias, a mensagem da etapa e variáveis de personalização.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="font-semibold text-gray-700 block mb-1">Nome da Etapa</label>
                <Input
                  placeholder="Ex: 1º Follow-up, Oferta Especial"
                  value={nomeEtapa}
                  onChange={(e) => setNomeEtapa(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Tempo de Espera (Dias) *
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    min={isEtapaInicial ? 0 : 1}
                    max={365}
                    value={diasAposEtapa}
                    onChange={(e) => {
                      const val = parseInt(e.target.value)
                      const minPermitido = isEtapaInicial ? 0 : 1
                      if (isNaN(val)) {
                        setDiasAposEtapa(minPermitido)
                      } else {
                        setDiasAposEtapa(Math.max(minPermitido, val))
                      }
                    }}
                    className={`h-8 text-xs font-mono font-bold ${
                      isEtapaInicial && diasAposEtapa === 0 ? 'pr-20 text-emerald-700' : 'pr-12'
                    }`}
                  />
                  <span
                    className={`absolute right-2.5 top-1.5 text-[11px] font-semibold ${
                      isEtapaInicial && diasAposEtapa === 0 ? 'text-emerald-700' : 'text-gray-400'
                    }`}
                  >
                    {isEtapaInicial && diasAposEtapa === 0 ? 'imediato' : 'dias'}
                  </span>
                </div>
                {isEtapaInicial && (
                  <p className="text-[10px] text-gray-500 mt-1">
                    {diasAposEtapa === 0
                      ? '0 dias = enviado imediatamente junto com o disparo inicial do lote.'
                      : '0 dias = envio instantâneo sem espera, ou configure dias após o agendamento.'}
                  </p>
                )}
              </div>
            </div>

            {/* Seletor de Modelo de WhatsApp + Editor da Mensagem */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5">
                  <label className="font-semibold text-gray-700 flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Mensagem da Etapa *</span>
                  </label>
                  <span className="text-[10px] text-gray-400 font-normal">(100% editável)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setModalGerenciarTemplatesAberto(true)}
                    className="h-6 px-2 text-[11px] text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 font-medium"
                    title="Abrir gerenciador de modelos de mensagem do CRM"
                  >
                    Gerenciar Modelos
                  </Button>
                  <span className="text-[11px] text-gray-400">
                    {mensagemEtapa.length} caracteres
                  </span>
                </div>
              </div>

              {/* Seletor de modelos de WhatsApp cadastrados */}
              <div className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-emerald-900 flex items-center gap-1">
                    <span>Preencher a partir de um Modelo de WhatsApp</span>
                  </span>
                  {templatesAtivos.length > 0 && (
                    <span className="text-[10px] text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded font-medium">
                      {templatesAtivos.length}{' '}
                      {templatesAtivos.length === 1 ? 'modelo ativo' : 'modelos ativos'}
                    </span>
                  )}
                </div>

                {templatesAtivos.length > 0 ? (
                  <div className="space-y-1.5">
                    {/* Filtro de Categoria com Taxonomia Dinâmica do Banco */}
                    {nomesCategorias.length > 0 && (
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-medium text-emerald-900 whitespace-nowrap">
                          Filtrar Categoria:
                        </label>
                        <select
                          value={filtroCategoriaModal}
                          onChange={(e) => setFiltroCategoriaModal(e.target.value)}
                          className="h-6 text-[11px] bg-white border border-emerald-200 rounded px-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="todas">Todas as categorias</option>
                          {nomesCategorias.map((catNome) => (
                            <option key={catNome} value={catNome}>
                              {catNome}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <select
                      value={selectedTemplateId}
                      onChange={(e) => handleSelecionarTemplate(e.target.value)}
                      className="w-full h-8 text-xs bg-white border border-emerald-200 rounded-md px-2 font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Selecione um modelo para preencher o texto...</option>
                      {templatesAtivos
                        .filter((t) => {
                          if (filtroCategoriaModal === 'todas') return true
                          return (t.categoria || '').trim() === filtroCategoriaModal
                        })
                        .map((t) => {
                          const previa = t.conteudo
                            ? t.conteudo.replace(/\s+/g, ' ').trim().slice(0, 60) +
                              (t.conteudo.length > 60 ? '...' : '')
                            : ''
                          return (
                            <option key={t.id} value={t.id}>
                              {t.categoria ? `[${t.categoria}] ` : ''}
                              {t.titulo} {previa ? `— "${previa}"` : ''}
                            </option>
                          )
                        })}
                    </select>
                    {selectedTemplateId && (
                      <p className="text-[10px] text-emerald-700">
                        O texto do modelo foi copiado abaixo. Você pode ajustar ou adicionar
                        variáveis normalmente.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-[11px] text-gray-500 bg-white/80 p-2 rounded border border-gray-200 flex items-center justify-between">
                    <span>
                      Nenhum modelo de WhatsApp cadastrado. Acesse Configurações &gt; Comunicação.
                    </span>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={() => setModalGerenciarTemplatesAberto(true)}
                      className="h-auto p-0 text-[11px] text-emerald-700 font-semibold"
                    >
                      Cadastrar modelo
                    </Button>
                  </div>
                )}
              </div>

              <Textarea
                placeholder="Digite a mensagem do follow-up... Use as variáveis abaixo para personalizar automaticamente."
                value={mensagemEtapa}
                onChange={(e) => setMensagemEtapa(e.target.value)}
                rows={4}
                className="text-xs font-sans leading-relaxed"
              />
            </div>

            {/* Variáveis / Placeholders Disponíveis */}
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1.5">
                Clique para inserir variáveis suportadas:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PLACEHOLDERS_ENVIO_MASSA.map((p) => (
                  <button
                    key={p.tag}
                    type="button"
                    onClick={() => handleInserirTag(p.tag)}
                    className="px-2 py-0.5 rounded bg-white hover:bg-slate-200 border border-slate-300 text-[11px] font-mono text-slate-700 transition-colors"
                    title={`${p.label} - ${p.descricao}`}
                  >
                    {p.tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Pré-visualização do Texto */}
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Pré-visualização do texto recebido pelo cliente</span>
                </span>
                <span className="text-[10px] text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded font-semibold">
                  Exemplo: João (Erechim)
                </span>
              </div>
              <div className="bg-white p-3 rounded-md border border-emerald-100 text-xs text-gray-800 whitespace-pre-wrap leading-relaxed shadow-2xs">
                {renderPreviaMensagem(mensagemEtapa)}
              </div>
            </div>

            {/* Bloco de Regra de Desvio por Etapa (Fase 2) */}
            <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <GitFork className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-bold text-gray-900 block text-xs">
                    Regra de Desvio por Etapa (Timeout sem resposta)
                  </span>
                  <span className="text-[11px] text-gray-500">
                    Se o destinatário continuar sem responder após o envio desta etapa, desvie para
                    outro fluxo ou arquive.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Ação de Desvio</label>
                  <select
                    value={desvioAcao}
                    onChange={(e) => setDesvioAcao(e.target.value as AcaoDesvioEtapa)}
                    className="w-full h-8 text-xs bg-white border border-gray-300 rounded-md px-2 font-medium text-gray-800"
                  >
                    <option value="nenhuma">Nenhuma (seguir régua)</option>
                    <option value="fluxo_alternativo">Entrar no fluxo alternativo</option>
                    <option value="arquivar">Arquivar do fluxo (parar envios)</option>
                  </select>
                </div>

                {desvioAcao !== 'nenhuma' && (
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">
                      Sem resposta em
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        min={1}
                        max={180}
                        value={desvioDias}
                        onChange={(e) => setDesvioDias(Math.max(1, parseInt(e.target.value) || 1))}
                        className="h-8 text-xs pr-12 font-mono font-bold bg-white"
                      />
                      <span className="absolute right-2.5 top-1.5 text-[11px] text-gray-400 font-medium">
                        dias
                      </span>
                    </div>
                  </div>
                )}

                {desvioAcao === 'fluxo_alternativo' && (
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">
                      Fluxo Alternativo *
                    </label>
                    <select
                      value={desvioFluxoId}
                      onChange={(e) => setDesvioFluxoId(e.target.value)}
                      className="w-full h-8 text-xs bg-white border border-gray-300 rounded-md px-2 font-medium text-gray-800"
                    >
                      <option value="">Selecione outro fluxo...</option>
                      {fluxos
                        .filter((f) => f.id !== fluxoAtivo.id)
                        .map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.nome} {f.is_padrao ? '(Padrão)' : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>

              {desvioAcao === 'fluxo_alternativo' && (
                <div className="text-[11px] text-amber-800 bg-amber-100/60 p-2 rounded-md border border-amber-200">
                  <strong>Encadeamento de fluxos:</strong> ao expirar {desvioDias} dia(s) sem
                  retorno, o contato sai deste fluxo e passa a receber automaticamente as mensagens
                  do fluxo selecionado a partir da 1ª etapa ativa. A trilha registra o desvio de
                  origem.
                </div>
              )}
            </div>

            {/* Bloco de Ramificação de Resposta (Fase 4) */}
            <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/40 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-bold text-gray-900 block text-xs">
                    Ramificação de Resposta (Detecção Automática WhatsApp)
                  </span>
                  <span className="text-[11px] text-gray-500">
                    Defina o que acontece quando o cliente responder a esta etapa via WhatsApp.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">
                    Quando o cliente responder
                  </label>
                  <select
                    value={respostaAcao}
                    onChange={(e) => setRespostaAcao(e.target.value as AcaoRespostaEtapa)}
                    className="w-full h-8 text-xs bg-white border border-gray-300 rounded-md px-2 font-medium text-gray-800"
                  >
                    <option value="encerrar">Encerrar o fluxo atual (Padrão)</option>
                    <option value="fluxo_alternativo">Entrar no fluxo alternativo</option>
                  </select>
                </div>

                {respostaAcao === 'fluxo_alternativo' && (
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">
                      Fluxo de Resposta *
                    </label>
                    <select
                      value={respostaFluxoId}
                      onChange={(e) => setRespostaFluxoId(e.target.value)}
                      className="w-full h-8 text-xs bg-white border border-gray-300 rounded-md px-2 font-medium text-gray-800"
                    >
                      <option value="">Selecione outro fluxo...</option>
                      {fluxos
                        .filter((f) => f.id !== fluxoAtivo.id)
                        .map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.nome} {f.is_padrao ? '(Padrão)' : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>

              {respostaAcao === 'fluxo_alternativo' ? (
                <div className="text-[11px] text-blue-800 bg-blue-100/60 p-2 rounded-md border border-blue-200">
                  <strong>Ramificação ativa:</strong> ao detectar resposta do cliente, o contato é
                  marcado como <em>Respondeu</em>, o fluxo atual é encerrado e ele entra
                  automaticamente no fluxo selecionado. Se a 1ª etapa do novo fluxo for imediata (0
                  dias), a mensagem será agendada no momento da resposta. A trilha registra
                  "Resposta detectada automaticamente".
                </div>
              ) : (
                <div className="text-[11px] text-gray-500">
                  Padrão do sistema: ao responder, o contato é marcado como{' '}
                  <strong>Respondeu</strong> e o fluxo é concluído sem disparos adicionais.
                </div>
              )}
            </div>

            {/* Flag Ativa/Inativa */}
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-gray-200 bg-gray-50/50">
              <div>
                <span className="font-bold text-gray-800 block text-xs">Etapa Ativa</span>
                <span className="text-[11px] text-gray-500">
                  Se desativada, a etapa será pulada pelo robô sem interromper o restante do fluxo.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEtapaAtivaFlag(!etapaAtivaFlag)}
                className="cursor-pointer"
              >
                {etapaAtivaFlag ? (
                  <ToggleRight className="w-6 h-6 text-emerald-600" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalEtapaAberto(false)}
              className="text-xs h-8"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSalvarEtapa}
              disabled={isSalvandoEtapa}
              className="text-xs h-8 bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
            >
              {isSalvandoEtapa ? 'Salvando...' : 'Salvar Etapa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmação Exclusão de Fluxo */}
      <Dialog
        open={Boolean(fluxoParaExcluir)}
        onOpenChange={(open) => !open && setFluxoParaExcluir(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="w-5 h-5" />
              <span>Excluir Fluxo</span>
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o fluxo "{fluxoParaExcluir?.nome}" e todas as suas
              etapas? Disparos que já estejam em andamento continuarão registrados normalmente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFluxoParaExcluir(null)}
              className="text-xs h-8"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={handleConfirmarExcluirFluxo}
              className="text-xs h-8 font-bold"
            >
              Excluir Fluxo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmação Exclusão de Etapa */}
      <Dialog
        open={Boolean(etapaParaExcluir)}
        onOpenChange={(open) => !open && setEtapaParaExcluir(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="w-5 h-5" />
              <span>Excluir Etapa</span>
            </DialogTitle>
            <DialogDescription>
              Deseja remover a etapa "{etapaParaExcluir?.nome}" (
              {etapaParaExcluir?.dias_apos === 0 ? 'Imediato' : `+${etapaParaExcluir?.dias_apos}d`}
              )? Dica: você também pode apenas desativá-la com o botão de toggle sem precisar
              apagá-la.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEtapaParaExcluir(null)}
              className="text-xs h-8"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={handleConfirmarExcluirEtapa}
              className="text-xs h-8 font-bold"
            >
              Excluir Etapa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para Gerenciar Modelos de WhatsApp sem sair do fluxo */}
      <ModalGerenciarWhatsAppTemplates
        open={modalGerenciarTemplatesAberto}
        onOpenChange={setModalGerenciarTemplatesAberto}
      />
    </div>
  )
}

export default GerenciadorFluxosFollowUp
