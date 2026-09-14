import React, { useState, useEffect, useRef } from 'react'
import {
  OrdemServico,
  OSTemplate,
  OSChecklistItem,
  Cliente,
  Sistema,
  OSTipoServico,
} from '@/types/crm'
import {
  fetchSistemaByClienteId,
  finalizarOrdemServico,
  updateOrdemServico,
} from '@/services/crmService'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Sun,
  Zap,
  CheckSquare,
  Square,
  AlertTriangle,
  FileText,
  Upload,
  User,
  Image as ImageIcon,
  Check,
  ShieldCheck,
  X,
} from 'lucide-react'
import { formatDateTime } from '@/lib/formatters'

import { useAuth } from '@/contexts/AuthContext'
import type { SistemaUsuario } from '@/types/crm'
import { BotaoEnviarOSWhatsApp } from '@/components/BotaoEnviarOSWhatsApp'

interface FichaExecucaoOSProps {
  os: OrdemServico
  templates: OSTemplate[]
  instaladores?: SistemaUsuario[]
  onBack: () => void
  onOSUpdated: (updatedOS: OrdemServico) => void
  onOSFinalizada: (finalizedOS: OrdemServico) => void
}

// Checklist padrão por tipo de serviço solar caso a OS não tenha checklist registrado
export function getDefaultChecklist(tipo: OSTipoServico): OSChecklistItem[] {
  switch (tipo) {
    case 'Limpeza':
      return [
        { id: '1', item: 'Chegou no local da usina', concluido: false },
        { id: '2', item: 'Verificou estado físico das placas e sujidade', concluido: false },
        {
          id: '3',
          item: 'Limpou módulos com água desmineralizada e escova macia',
          concluido: false,
        },
        { id: '4', item: 'Verificou status e conexões do inversor', concluido: false },
        { id: '5', item: 'Testou geração e sincronismo com a rede', concluido: false },
      ]
    case 'Instalação':
      return [
        { id: '1', item: 'Conferiu lista de materiais e projeto', concluido: false },
        { id: '2', item: 'Fixou suportes e perfis na estrutura do telhado', concluido: false },
        { id: '3', item: 'Instalou módulos com alinhamento e torque correto', concluido: false },
        { id: '4', item: 'Conectou inversor, stringbox e condutores CC/CA', concluido: false },
        { id: '5', item: 'Testou parâmetros elétricos e funcionamento da usina', concluido: false },
      ]
    case 'Manutenção':
      return [
        { id: '1', item: 'Inspeção visual geral da usina e cabeamento', concluido: false },
        {
          id: '2',
          item: 'Termografia em módulos, caixas e barramentos elétricos',
          concluido: false,
        },
        { id: '3', item: 'Reaperto de bornes e parafusos com torquímetro', concluido: false },
        { id: '4', item: 'Limpeza de filtros e dissipadores do inversor', concluido: false },
        { id: '5', item: 'Medição de isolamento e teste de geração instantânea', concluido: false },
      ]
    case 'Garantia':
      return [
        {
          id: '1',
          item: 'Fotografou plaqueta do equipamento e número de série (SN)',
          concluido: false,
        },
        { id: '2', item: 'Registrou códigos de falhas e alarmes ativos', concluido: false },
        { id: '3', item: 'Aferiu tensão Voc e corrente Isc de entrada CC', concluido: false },
        {
          id: '4',
          item: 'Aferiu tensão e frequência de saída CA da concessionária',
          concluido: false,
        },
        {
          id: '5',
          item: 'Preencheu laudo técnico fotográfico para acionamento de garantia',
          concluido: false,
        },
      ]
    case 'Configuração de Datalogger':
      return [
        {
          id: '1',
          item: 'Conectou datalogger na porta de comunicação do inversor',
          concluido: false,
        },
        { id: '2', item: 'Acessou rede local do datalogger via celular', concluido: false },
        {
          id: '3',
          item: 'Configurou credenciais da rede Wi-Fi 2.4GHz do cliente',
          concluido: false,
        },
        {
          id: '4',
          item: 'Registrou planta no portal de monitoramento da Delfos',
          concluido: false,
        },
        {
          id: '5',
          item: 'Validou fluxo de dados e visualização no app do cliente',
          concluido: false,
        },
      ]
    default:
      return [
        { id: '1', item: 'Chegou no local e realizou análise preliminar', concluido: false },
        { id: '2', item: 'Executou os procedimentos técnicos', concluido: false },
        { id: '3', item: 'Testou funcionamento do sistema solar', concluido: false },
      ]
  }
}

export const FichaExecucaoOS: React.FC<FichaExecucaoOSProps> = ({
  os,
  templates,
  instaladores = [],
  onBack,
  onOSUpdated,
  onOSFinalizada,
}) => {
  const { toast } = useToast()
  const { isAdmin } = useAuth()
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Estado para admin reatribuir instalador direto na ficha
  const [responsavelId, setResponsavelId] = useState<string>(os.responsavel_usuario_id || '')

  const cliente: Cliente | undefined = os.expand?.cliente_id
  const [sistema, setSistema] = useState<Sistema | null>(null)
  const [loadingSistema, setLoadingSistema] = useState(false)
  const [inversoresLista, setInversoresLista] = useState<import('@/types/crm').ClienteInversor[]>(
    [],
  )

  // 2. Instruções do serviço: pré-preenchido automaticamente com template
  const [instrucoesTexto, setInstrucoesTexto] = useState<string>(() => {
    if (os.instrucoes && os.instrucoes.trim().length > 0) {
      return os.instrucoes
    }
    const matchingTemplate = templates.find((t) => t.tipo_servico === os.tipo_servico)
    return matchingTemplate?.instrucoes || ''
  })

  // 3. Checklist
  const [checklist, setChecklist] = useState<OSChecklistItem[]>(() => {
    if (os.checklist && os.checklist.length > 0) {
      return os.checklist
    }
    return getDefaultChecklist(os.tipo_servico)
  })

  // 4. Fotos: fotos já salvas (nomes em PB) + novas fotos capturadas na sessão
  const [fotosSalvas, setFotosSalvas] = useState<string[]>(os.fotos || [])
  const [novasFotos, setNovasFotos] = useState<{ file: File; previewUrl: string }[]>([])

  // 5. Detalhes da execução
  const [detalhesExecucao, setDetalhesExecucao] = useState<string>(os.detalhes_execucao || '')

  // Confirmação de Finalização
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Carrega dados do sistema solar do cliente
  useEffect(() => {
    if (os.cliente_id) {
      setLoadingSistema(true)
      fetchSistemaByClienteId(os.cliente_id)
        .then((sist) => setSistema(sist))
        .catch((e) => console.error('Erro ao carregar sistema:', e))
        .finally(() => setLoadingSistema(false))

      // Carrega lista de inversores caso o cliente tenha mais de um
      import('@/services/crmService').then(({ fetchInversoresByClienteId }) => {
        fetchInversoresByClienteId(os.cliente_id)
          .then((invs) => setInversoresLista(invs))
          .catch((e) => console.warn('Erro ao carregar inversores da OS:', e))
      })
    }
  }, [os.cliente_id])

  // Toggle de item do checklist
  const handleToggleChecklist = (id: string) => {
    if (os.status === 'concluida') return // leitura
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, concluido: !item.concluido } : item)),
    )
  }

  // Upload/Captura de fotos
  const handlePhotoCaptured = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const added: { file: File; previewUrl: string }[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const previewUrl = URL.createObjectURL(file)
      added.push({ file, previewUrl })
    }

    setNovasFotos((prev) => [...prev, ...added])
    toast({
      title: `${added.length} foto(s) capturada(s)!`,
      description: 'As fotos serão anexadas à Ordem de Serviço.',
    })
    // limpa o input para permitir capturar a mesma foto de novo se quiser
    e.target.value = ''
  }

  const handleRemoverNovaFoto = (index: number) => {
    setNovasFotos((prev) => {
      const target = prev[index]
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl)
      }
      return prev.filter((_, i) => i !== index)
    })
  }

  // Salvar rascunho / alterações intermediárias
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const handleSalvarRascunho = async () => {
    setIsSavingDraft(true)
    try {
      const filesToUpload = novasFotos.map((nf) => nf.file)
      const targetInstalador = instaladores.find((i) => i.id === responsavelId)
      const payload: Partial<OrdemServico> = {
        instrucoes: instrucoesTexto,
        checklist,
        detalhes_execucao: detalhesExecucao,
      }
      if (isAdmin && responsavelId !== os.responsavel_usuario_id) {
        payload.responsavel_usuario_id = responsavelId
        payload.atribuida_a = targetInstalador ? targetInstalador.name : ''
      }

      const updated = await updateOrdemServico(
        os.id,
        payload,
        filesToUpload.length > 0 ? filesToUpload : undefined,
      )
      setFotosSalvas(updated.fotos || [])
      setNovasFotos([])
      onOSUpdated(updated)
      toast({
        title: 'Progresso salvo!',
        description: 'Os dados da OS foram atualizados com sucesso.',
      })
    } catch (err) {
      console.error('Erro ao salvar rascunho:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as alterações da OS.',
      })
    } finally {
      setIsSavingDraft(false)
    }
  }

  // Finalizar OS
  const handleFinalizarOS = async () => {
    setIsSubmitting(true)
    try {
      const filesToUpload = novasFotos.map((nf) => nf.file)
      const finalized = await finalizarOrdemServico(os.id, {
        checklist,
        detalhes_execucao: detalhesExecucao,
        newPhotos: filesToUpload.length > 0 ? filesToUpload : undefined,
        cliente_id: os.cliente_id,
        tipo_servico: os.tipo_servico,
        tecnico_nome: os.atribuida_a,
      })

      setShowConfirmModal(false)
      toast({
        title: 'OS Finalizada com Sucesso! 🎉',
        description: 'Ordem de serviço marcada como concluída e registrada no histórico.',
      })
      onOSFinalizada(finalized)
    } catch (err) {
      console.error('Erro ao finalizar OS:', err)
      toast({
        variant: 'destructive',
        title: 'Falha ao finalizar OS',
        description: 'Ocorreu um erro ao concluir a OS. Tente novamente.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Indicador de progresso do checklist
  const totalItens = checklist.length
  const concluidosCount = checklist.filter((c) => c.concluido).length
  const progressoPct = totalItens > 0 ? Math.round((concluidosCount / totalItens) * 100) : 0

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-24">
      {/* Barra de Navegação Superior da Ficha */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs flex items-center justify-between sticky top-16 z-20">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Lista</span>
        </button>

        <div className="flex items-center gap-2">
          {os.status === 'concluida' ? (
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold px-3 py-1">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              OS Concluída
            </Badge>
          ) : (
            <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold px-3 py-1">
              <Clock className="w-3.5 h-3.5 mr-1 text-amber-600" />
              Pendente de Execução
            </Badge>
          )}

          {/* Botão de Envio Manual da OS via WhatsApp */}
          <BotaoEnviarOSWhatsApp
            osId={os.id}
            responsavelNome={os.atribuida_a || os.expand?.responsavel_usuario_id?.name}
            responsavelTelefone={os.expand?.responsavel_usuario_id?.phone}
            responsavelId={responsavelId || os.responsavel_usuario_id}
            size="sm"
            label="Enviar OS por WhatsApp"
          />
        </div>
      </div>

      {/* Cabeçalho da OS */}
      <div className="bg-gradient-to-br from-emerald-800 via-emerald-900 to-slate-900 text-white rounded-2xl p-4 sm:p-6 shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 bg-white/10 px-2.5 py-1 rounded-md">
              OS #{os.id.slice(-6).toUpperCase()} • {os.tipo_servico}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-emerald-100 bg-black/20 px-2.5 py-1 rounded-lg">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                Agendada: <strong>{formatDateTime(os.data_agendada)}</strong>
              </span>
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
            {cliente?.nome || cliente?.razao_social || 'Cliente Solar'}
          </h2>

          {isAdmin ? (
            <div className="flex items-center gap-2 text-xs text-emerald-200 bg-white/10 p-2 rounded-xl mt-1 max-w-md">
              <User className="w-4 h-4 text-emerald-300 shrink-0" />
              <div className="flex-1 flex items-center gap-2">
                <span className="font-semibold text-emerald-100 shrink-0">Responsável:</span>
                <select
                  value={responsavelId}
                  onChange={(e) => setResponsavelId(e.target.value)}
                  disabled={os.status === 'concluida'}
                  className="bg-emerald-950/80 border border-emerald-600 text-white text-xs rounded-lg px-2 py-1 w-full focus:outline-hidden"
                >
                  <option value="">-- Não atribuído --</option>
                  {instaladores.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name} {inst.phone ? `(${inst.phone})` : '(Sem WhatsApp)'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            os.atribuida_a && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-200">
                <User className="w-3.5 h-3.5" />
                <span>
                  Instalador responsável: <strong>{os.atribuida_a}</strong>
                  {os.expand?.responsavel_usuario_id?.phone && (
                    <span className="ml-1 opacity-80">
                      ({os.expand.responsavel_usuario_id.phone})
                    </span>
                  )}
                </span>
              </div>
            )
          )}
        </div>
      </div>

      {/* 1. DADOS DO CLIENTE & SISTEMA SOLAR */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-2">
            <Sun className="w-5 h-5 text-amber-500" />
            1. Dados do Cliente & Usina Solar
          </h3>
          <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
            Informações Técnicas
          </span>
        </div>

        {/* Endereço & Telefone com botões de ação rápida */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 flex flex-col justify-between">
            <div className="flex items-start gap-2 text-gray-700">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-gray-900 block mb-0.5">Endereço de Execução:</span>
                <span className="text-gray-600 leading-relaxed">
                  {os.endereco || cliente?.endereco || 'Endereço não informado'}
                  {cliente?.cidade ? ` - ${cliente.cidade}` : ''}
                </span>
              </div>
            </div>
            {(os.endereco || cliente?.endereco) && (
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(
                  `${os.endereco || cliente?.endereco} ${cliente?.cidade || ''}`,
                )}`}
                target="_blank"
                rel="noreferrer"
                className="mt-2.5 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 bg-white border border-gray-300 hover:border-emerald-600 text-emerald-700 font-bold rounded-lg text-xs transition-colors shadow-2xs"
              >
                <MapPin className="w-3.5 h-3.5" />
                Abrir no Google Maps / Waze
              </a>
            )}
          </div>

          <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 flex flex-col justify-between">
            <div className="flex items-start gap-2 text-gray-700">
              <Phone className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-gray-900 block mb-0.5">Contato do Cliente:</span>
                <span className="text-gray-600">
                  {cliente?.telefone || cliente?.whatsapp || 'Sem telefone'}
                </span>
                {cliente?.contato && (
                  <span className="block text-[11px] text-gray-500">
                    Falar com: {cliente.contato}
                  </span>
                )}
              </div>
            </div>
            {(cliente?.telefone || cliente?.whatsapp) && (
              <a
                href={`tel:${(cliente?.telefone || cliente?.whatsapp || '').replace(/\D/g, '')}`}
                className="mt-2.5 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 bg-white border border-gray-300 hover:border-emerald-600 text-emerald-700 font-bold rounded-lg text-xs transition-colors shadow-2xs"
              >
                <Phone className="w-3.5 h-3.5" />
                Ligar para Cliente
              </a>
            )}
          </div>
        </div>

        {/* Ficha do Sistema Solar */}
        <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-3.5">
          <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5 mb-2.5">
            <Zap className="w-4 h-4 text-amber-600" />
            <span>Dados da Usina Fotovoltaica Cadastrada:</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-white rounded-lg p-2.5 border border-amber-100">
              <span className="text-[10px] text-gray-500 font-semibold block uppercase">
                Potência
              </span>
              <span className="text-sm sm:text-base font-black text-amber-700">
                {sistema?.potencia_total_kwp || cliente?.potencia_kwp || '—'} kWp
              </span>
            </div>

            <div className="bg-white rounded-lg p-2.5 border border-amber-100">
              <span className="text-[10px] text-gray-500 font-semibold flex items-center justify-between uppercase">
                <span>
                  {inversoresLista.length > 1
                    ? `Inversores (${inversoresLista.length})`
                    : 'Inversor'}
                </span>
              </span>
              <span
                className="text-xs sm:text-sm font-bold text-gray-900 block truncate"
                title={
                  inversoresLista.length > 0
                    ? inversoresLista
                        .map((i) => i.marca_inversor)
                        .filter(Boolean)
                        .join(', ')
                    : sistema?.fabricante_inversores || cliente?.inversor_marca
                }
              >
                {inversoresLista.length > 0
                  ? inversoresLista
                      .map((i) => i.marca_inversor)
                      .filter(Boolean)
                      .join(' + ')
                  : sistema?.fabricante_inversores || cliente?.inversor_marca || '—'}
              </span>
              <span className="text-[10px] text-gray-500 truncate block">
                {inversoresLista.length > 0
                  ? inversoresLista
                      .map((i) => i.modelo_inversor)
                      .filter(Boolean)
                      .join(' / ') || (inversoresLista.length > 1 ? 'Múltiplos inversores' : '')
                  : sistema?.modelo_inversores || cliente?.inversor_modelo || ''}
              </span>
            </div>

            <div className="bg-white rounded-lg p-2.5 border border-amber-100">
              <span className="text-[10px] text-gray-500 font-semibold block uppercase">
                Módulos
              </span>
              <span className="text-xs sm:text-sm font-bold text-gray-900 block">
                {sistema?.quantidade_modulos || cliente?.placas_qtd || '—'} placas
              </span>
              <span className="text-[10px] text-gray-500 truncate block">
                {sistema?.fabricante_modulos || cliente?.placas_marca || ''}
              </span>
            </div>

            <div className="bg-white rounded-lg p-2.5 border border-amber-100">
              <span className="text-[10px] text-gray-500 font-semibold block uppercase">
                Telhado / UC
              </span>
              <span className="text-xs sm:text-sm font-bold text-gray-900 capitalize block">
                {sistema?.tipo_telhado || cliente?.telhado_tipo || '—'}
              </span>
              <span className="text-[10px] text-gray-500 truncate block">
                UC: {sistema?.numero_uc || cliente?.uc || 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. INSTRUÇÕES DO SERVIÇO (Pré-preenchido com Template) */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            2. Instruções do Serviço
          </h3>
          <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
            {os.tipo_servico}
          </span>
        </div>

        <p className="text-xs text-gray-500 leading-relaxed">
          Instruções técnicas para orientação da equipe em campo. Caso precise ajustar para esta OS,
          edite o texto abaixo:
        </p>

        <Textarea
          value={instrucoesTexto}
          onChange={(e) => setInstrucoesTexto(e.target.value)}
          disabled={os.status === 'concluida'}
          placeholder="Nenhuma instrução cadastrada no template para este tipo de serviço."
          className="min-h-[140px] text-xs sm:text-sm bg-gray-50/70 border-gray-200 rounded-xl leading-relaxed p-3.5 focus:bg-white resize-y font-mono"
        />
      </div>

      {/* 3. CHECKLIST DE EXECUÇÃO */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-gray-900 text-sm sm:text-base">
              3. Checklist de Execução
            </h3>
          </div>
          <span className="text-xs font-bold text-gray-600">
            {concluidosCount} de {totalItens} concluídos ({progressoPct}%)
          </span>
        </div>

        {/* Barra de Progresso Visual */}
        <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              progressoPct === 100 ? 'bg-emerald-600' : 'bg-emerald-500'
            }`}
            style={{ width: `${progressoPct}%` }}
          />
        </div>

        {/* Lista de Itens do Checklist com Botões Grandes para Toque Mobile */}
        <div className="space-y-2">
          {checklist.map((item, index) => {
            const isChecked = item.concluido
            return (
              <button
                key={item.id || index}
                type="button"
                onClick={() => handleToggleChecklist(item.id)}
                disabled={os.status === 'concluida'}
                className={`w-full text-left p-3.5 sm:p-4 rounded-xl border transition-all flex items-center gap-3.5 select-none ${
                  isChecked
                    ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-semibold shadow-2xs'
                    : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-800'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                    isChecked
                      ? 'bg-emerald-600 border-emerald-700 text-white shadow-2xs'
                      : 'bg-white border-gray-300 text-transparent'
                  }`}
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
                <span
                  className={`text-xs sm:text-sm flex-1 ${isChecked ? 'line-through text-gray-600' : ''}`}
                >
                  {item.item}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 4. FOTOS DO SERVIÇO COM BOTÕES GRANDES PARA CÂMERA */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-gray-900 text-sm sm:text-base">
              4. Fotos do Serviço em Campo
            </h3>
          </div>
          <span className="text-xs text-gray-500">
            {fotosSalvas.length + novasFotos.length} foto(s) anexada(s)
          </span>
        </div>

        {/* Botão Gigante de Câmera (Mobile First) */}
        {os.status !== 'concluida' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Input nativo com capture="environment" para abrir câmera traseira no smartphone */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={handlePhotoCaptured}
            />

            <Button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="h-16 sm:h-14 rounded-2xl bg-[#166534] hover:bg-[#14532d] text-white font-black text-sm sm:text-base shadow-sm flex items-center justify-center gap-3 transition-transform active:scale-[0.98]"
            >
              <Camera className="w-6 h-6 shrink-0" />
              <span>TIRAR FOTO (CÂMERA)</span>
            </Button>

            {/* Input alternativo para seleção de fotos da galeria */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotoCaptured}
            />

            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="h-16 sm:h-14 rounded-2xl border-gray-300 hover:border-emerald-600 hover:bg-emerald-50 text-gray-800 font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-transform active:scale-[0.98]"
            >
              <Upload className="w-5 h-5 text-emerald-700" />
              <span>ESCOLHER DA GALERIA</span>
            </Button>
          </div>
        )}

        {/* Grade de Fotos (Salvas + Novas) */}
        {fotosSalvas.length > 0 || novasFotos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
            {/* Fotos já persistidas no PocketBase */}
            {fotosSalvas.map((fotoNome, idx) => {
              const fileUrl = pb.files.getURL(os, fotoNome)
              return (
                <div
                  key={`saved-${idx}`}
                  className="relative group rounded-xl overflow-hidden aspect-square border border-gray-200 bg-gray-100 shadow-2xs"
                >
                  <img
                    src={fileUrl}
                    alt={`Foto ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold"
                  >
                    Ver foto
                  </a>
                  <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
                    Salva
                  </span>
                </div>
              )
            })}

            {/* Novas Fotos da Sessão */}
            {novasFotos.map((nf, idx) => (
              <div
                key={`new-${idx}`}
                className="relative group rounded-xl overflow-hidden aspect-square border-2 border-emerald-500 bg-gray-100 shadow-2xs"
              >
                <img
                  src={nf.previewUrl}
                  alt={`Nova foto ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleRemoverNovaFoto(idx)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md hover:bg-red-700 transition-colors"
                  title="Remover foto"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <span className="absolute bottom-1 right-1 bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                  Nova
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-center p-4">
            <ImageIcon className="w-10 h-10 text-gray-300 mb-2" />
            <p className="text-xs sm:text-sm font-semibold text-gray-600">
              Nenhuma foto anexada ainda
            </p>
            <p className="text-[11px] text-gray-400 max-w-xs mt-0.5">
              Utilize o botão acima para tirar fotos das placas, inversores, conexões e instalações.
            </p>
          </div>
        )}
      </div>

      {/* 5. DETALHES DA EXECUÇÃO */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            5. Detalhes da Execução & Observações Técnicas
          </h3>
          <span className="text-[11px] text-gray-400">{detalhesExecucao.length} caracteres</span>
        </div>

        <p className="text-xs text-gray-500 leading-relaxed">
          Descreva o que foi realizado em campo, problemas ou anomalias encontradas, medições
          elétricas, peças trocadas ou recomendações para o cliente:
        </p>

        <Textarea
          value={detalhesExecucao}
          onChange={(e) => setDetalhesExecucao(e.target.value)}
          disabled={os.status === 'concluida'}
          placeholder="Ex: Realizada lavagem de 30 placas com água deionizada. Medições de Voc em 385V string 1 e 390V string 2. Inversor operando com geração nominal de 11.8 kW. Nenhum hotspot detectado na termografia..."
          className="min-h-[130px] text-xs sm:text-sm bg-gray-50/70 border-gray-200 rounded-xl leading-relaxed p-3.5 focus:bg-white resize-y"
        />
      </div>

      {/* 6. BOTÃO DE AÇÃO: FINALIZAR OS OU SALVAR RASCUNHO */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-gray-200 z-30 shadow-lg">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          {os.status !== 'concluida' ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleSalvarRascunho}
                disabled={isSavingDraft || isSubmitting}
                className="h-14 sm:h-12 px-4 rounded-xl border-gray-300 font-bold text-xs sm:text-sm shrink-0"
              >
                {isSavingDraft ? 'Salvando...' : 'Salvar Rascunho'}
              </Button>

              <Button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                disabled={isSubmitting || isSavingDraft}
                className="flex-1 h-14 sm:h-12 rounded-xl bg-[#166534] hover:bg-[#14532d] text-white font-black text-sm sm:text-base shadow-md flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
              >
                <ShieldCheck className="w-5 h-5 shrink-0" />
                <span>FINALIZAR ORDEM DE SERVIÇO</span>
              </Button>
            </>
          ) : (
            <div className="w-full flex items-center justify-between">
              <span className="text-xs sm:text-sm font-bold text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Esta OS foi finalizada em{' '}
                {os.concluida_em ? formatDateTime(os.concluida_em) : 'data anterior'}.
              </span>
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                className="rounded-xl h-10 px-4 text-xs font-semibold"
              >
                Voltar
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Confirmação de Finalização */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-7 h-7" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-gray-900">Confirmar Finalização da OS?</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Ao finalizar, a ordem sairá da lista de pendências e será arquivada como concluída,
                gerando um registro automático na Linha do Tempo do cliente.
              </p>
            </div>

            {/* Alerta se o checklist não estiver 100% */}
            {progressoPct < 100 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Atenção: Apenas{' '}
                  <strong>
                    {concluidosCount} de {totalItens}
                  </strong>{' '}
                  itens do checklist foram marcados como concluídos.
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="flex-1 h-11 rounded-xl text-xs sm:text-sm font-semibold"
              >
                Revisar OS
              </Button>
              <Button
                type="button"
                onClick={handleFinalizarOS}
                disabled={isSubmitting}
                className="flex-1 h-11 rounded-xl bg-[#166534] hover:bg-[#14532d] text-white font-black text-xs sm:text-sm shadow-sm"
              >
                {isSubmitting ? 'Finalizando...' : 'Sim, Finalizar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
