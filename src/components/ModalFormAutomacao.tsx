import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { Switch } from '@/components/ui/switch'
import {
  Automacao,
  AutomacaoGatilhoTipo,
  AutomacaoAcaoTipo,
  AutomacaoDestinoTipo,
  SalvarAutomacaoInput,
} from '@/types/automacoes'
import { ATIVIDADES_PADRAO } from '@/constants/atividadesTipos'
import { useClientes } from '@/contexts/ClientesContext'
import { Zap, Sparkles } from 'lucide-react'

interface ModalFormAutomacaoProps {
  isOpen: boolean
  onClose: () => void
  onSave: (dados: SalvarAutomacaoInput) => Promise<void>
  automacaoParaEditar?: Automacao | null
}

const ESTAGIOS_FUNIL = [
  'Novo Lead',
  'Levantamento',
  'Orçamento',
  'Negociação',
  'Fechado',
  'Contato Futuro',
  'Perdido',
]

export const ModalFormAutomacao: React.FC<ModalFormAutomacaoProps> = ({
  isOpen,
  onClose,
  onSave,
  automacaoParaEditar,
}) => {
  const { clientes } = useClientes()

  // Estados do formulário
  const [nome, setNome] = useState('')
  const [gatilho, setGatilho] = useState<AutomacaoGatilhoTipo>('status_mudou')
  const [acao, setAcao] = useState<AutomacaoAcaoTipo>('criar_atividade')
  const [destino, setDestino] = useState<AutomacaoDestinoTipo>('cliente_evento')
  const [clienteEspecificoId, setClienteEspecificoId] = useState<string>('')
  const [ativa, setAtiva] = useState(true)

  // Configurações do gatilho
  const [statusAlvo, setStatusAlvo] = useState('Fechado')
  const [tipoAtividadeGatilho, setTipoAtividadeGatilho] = useState('')
  const [diaMes, setDiaMes] = useState(10)
  const [diasApos, setDiasApos] = useState(7)
  const [eventoBase, setEventoBase] = useState<'instalacao_concluida' | 'ultima_atividade'>(
    'instalacao_concluida',
  )

  // Configurações da ação
  const [atividadeTitulo, setAtividadeTitulo] = useState('')
  const [atividadeDescricao, setAtividadeDescricao] = useState('')
  const [atividadeTipo, setAtividadeTipo] = useState('follow_up')
  const [whatsappMensagem, setWhatsappMensagem] = useState('')
  const [emailAssunto, setEmailAssunto] = useState('')
  const [emailCorpo, setEmailCorpo] = useState('')
  const [mudarStatusPara, setMudarStatusPara] = useState('Orçamento')

  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  // Reset/Carregar dados
  useEffect(() => {
    if (automacaoParaEditar) {
      setNome(automacaoParaEditar.nome)
      setGatilho(automacaoParaEditar.gatilho)
      setAcao(automacaoParaEditar.acao)
      setDestino(automacaoParaEditar.destino)
      setClienteEspecificoId(automacaoParaEditar.cliente_especifico_id || '')
      setAtiva(automacaoParaEditar.ativa ?? true)

      const cfgG = automacaoParaEditar.configuracao_gatilho || {}
      setStatusAlvo(cfgG.status_alvo || 'Fechado')
      setTipoAtividadeGatilho(cfgG.tipo_atividade || '')
      setDiaMes(cfgG.dia_mes || 10)
      setDiasApos(cfgG.dias ?? 7)
      setEventoBase(cfgG.evento_base || 'instalacao_concluida')

      const cfgA = automacaoParaEditar.configuracao_acao || {}
      setAtividadeTitulo(cfgA.titulo || '')
      setAtividadeDescricao(cfgA.descricao || '')
      setAtividadeTipo(cfgA.tipo_atividade || 'follow_up')
      setWhatsappMensagem(cfgA.mensagem || '')
      setEmailAssunto(cfgA.assunto || '')
      setEmailCorpo(cfgA.corpo || '')
      setMudarStatusPara(cfgA.novo_status || 'Orçamento')
    } else {
      // Valores padrão para nova automação
      setNome('')
      setGatilho('dias_apos_evento')
      setAcao('enviar_whatsapp')
      setDestino('cliente_evento')
      setClienteEspecificoId('')
      setAtiva(true)
      setStatusAlvo('Fechado')
      setTipoAtividadeGatilho('')
      setDiaMes(10)
      setDiasApos(7)
      setEventoBase('instalacao_concluida')
      setAtividadeTitulo('')
      setAtividadeDescricao('')
      setAtividadeTipo('follow_up')
      setWhatsappMensagem(
        'Olá {{cliente_nome}}! Passando para checar como está sua experiência com o sistema da Delfos Solar.',
      )
      setEmailAssunto('Acompanhamento Delfos Solar')
      setEmailCorpo('Olá {{cliente_nome}},\n\nAgradecemos pela parceria com a Delfos Solar!')
      setMudarStatusPara('Orçamento')
    }
    setErro(null)
  }, [automacaoParaEditar, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) {
      setErro('Por favor, informe o nome da automação.')
      return
    }

    setSaving(true)
    setErro(null)

    try {
      // Montar configuracao_gatilho
      const configuracao_gatilho: Record<string, unknown> = {}
      if (gatilho === 'status_mudou') {
        configuracao_gatilho.status_alvo = statusAlvo
      } else if (gatilho === 'atividade_concluida') {
        if (tipoAtividadeGatilho) {
          configuracao_gatilho.tipo_atividade = tipoAtividadeGatilho
        }
      } else if (gatilho === 'data_especifica') {
        configuracao_gatilho.dia_mes = Math.min(31, Math.max(1, Number(diaMes) || 1))
      } else if (gatilho === 'dias_apos_evento') {
        configuracao_gatilho.dias = Math.max(1, Number(diasApos) || 1)
        configuracao_gatilho.evento_base = eventoBase
      }

      // Montar configuracao_acao
      const configuracao_acao: Record<string, unknown> = {}
      if (acao === 'criar_atividade') {
        configuracao_acao.titulo = atividadeTitulo || nome
        configuracao_acao.descricao = atividadeDescricao
        configuracao_acao.tipo_atividade = atividadeTipo
      } else if (acao === 'enviar_whatsapp') {
        configuracao_acao.mensagem = whatsappMensagem
      } else if (acao === 'enviar_email') {
        configuracao_acao.assunto = emailAssunto
        configuracao_acao.corpo = emailCorpo
      } else if (acao === 'mudar_status') {
        configuracao_acao.novo_status = mudarStatusPara
      }

      const payload: SalvarAutomacaoInput = {
        nome: nome.trim(),
        gatilho,
        configuracao_gatilho,
        acao,
        configuracao_acao,
        destino,
        cliente_especifico_id: destino === 'cliente_especifico' ? clienteEspecificoId : undefined,
        ativa,
      }

      await onSave(payload)
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar automação'
      setErro(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900">
                {automacaoParaEditar ? 'Editar Automação' : 'Nova Automação'}
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Configure regras para disparos de WhatsApp, criação de atividades ou mudança de
                status sem programar.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {erro && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
              {erro}
            </div>
          )}

          {/* Nome e Toggle Ativa */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div className="md:col-span-3 space-y-1.5">
              <Label htmlFor="nome" className="text-xs font-semibold text-gray-700">
                Nome da Automação *
              </Label>
              <Input
                id="nome"
                placeholder="Ex: Mensagem pós-instalação 7 dias"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center justify-between md:justify-end gap-2 p-2 rounded-lg border bg-gray-50/70 h-10">
              <Label htmlFor="ativa" className="text-xs font-medium cursor-pointer text-gray-700">
                {ativa ? 'Ativa' : 'Pausada'}
              </Label>
              <Switch id="ativa" checked={ativa} onCheckedChange={setAtiva} />
            </div>
          </div>

          {/* BLOCO 1: GATILHO */}
          <div className="p-4 border rounded-xl bg-slate-50/50 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800">
              <Zap className="w-3.5 h-3.5 text-emerald-600" />
              1. Gatilho (Quando Dispara)
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-gray-600">Selecione o evento de disparo:</Label>
              <Select
                value={gatilho}
                onValueChange={(val) => setGatilho(val as AutomacaoGatilhoTipo)}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Selecione o gatilho" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dias_apos_evento">
                    Dias após um evento (ex: 7 dias após instalação ou última atividade)
                  </SelectItem>
                  <SelectItem value="status_mudou">
                    Quando o status do cliente mudar para...
                  </SelectItem>
                  <SelectItem value="instalacao_concluida">
                    Quando uma instalação for concluída
                  </SelectItem>
                  <SelectItem value="atividade_concluida">
                    Quando uma atividade for concluída
                  </SelectItem>
                  <SelectItem value="data_especifica">
                    Data específica (ex: todo dia 10 do mês)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Condições extras do Gatilho */}
            {gatilho === 'status_mudou' && (
              <div className="space-y-1.5 pt-2 border-t border-slate-200">
                <Label className="text-xs font-medium text-gray-700">
                  Disparar quando mudar para o estágio:
                </Label>
                <Select value={statusAlvo} onValueChange={setStatusAlvo}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTAGIOS_FUNIL.map((st) => (
                      <SelectItem key={st} value={st}>
                        {st}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {gatilho === 'atividade_concluida' && (
              <div className="space-y-1.5 pt-2 border-t border-slate-200">
                <Label className="text-xs font-medium text-gray-700">
                  Tipo de atividade concluída (opcional):
                </Label>
                <Select
                  value={tipoAtividadeGatilho || '__todas__'}
                  onValueChange={(val) => setTipoAtividadeGatilho(val === '__todas__' ? '' : val)}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Qualquer tipo de atividade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__todas__">Qualquer tipo de atividade</SelectItem>
                    {ATIVIDADES_PADRAO.map((atv) => (
                      <SelectItem key={atv.id} value={atv.id}>
                        {atv.tituloPadrao} ({atv.categoria})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {gatilho === 'data_especifica' && (
              <div className="space-y-1.5 pt-2 border-t border-slate-200">
                <Label className="text-xs font-medium text-gray-700">Dia do mês (1 a 31):</Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={diaMes}
                  onChange={(e) => setDiaMes(Number(e.target.value))}
                  className="bg-white w-32"
                />
                <p className="text-[11px] text-gray-500">
                  A automação será avaliada e disparada todo mês no dia selecionado.
                </p>
              </div>
            )}

            {gatilho === 'dias_apos_evento' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-700">
                    Número de dias após o evento:
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={diasApos}
                    onChange={(e) => setDiasApos(Number(e.target.value))}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-700">
                    Evento base de contagem:
                  </Label>
                  <Select
                    value={eventoBase}
                    onValueChange={(v) =>
                      setEventoBase(v as 'instalacao_concluida' | 'ultima_atividade')
                    }
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instalacao_concluida">Instalação concluída</SelectItem>
                      <SelectItem value="ultima_atividade">Última atividade do cliente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* BLOCO 2: AÇÃO */}
          <div className="p-4 border rounded-xl bg-slate-50/50 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              2. Ação (O Que Faz)
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-gray-600">Selecione a ação executada:</Label>
              <Select value={acao} onValueChange={(val) => setAcao(val as AutomacaoAcaoTipo)}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Selecione a ação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enviar_whatsapp">Enviar mensagem WhatsApp</SelectItem>
                  <SelectItem value="criar_atividade">Criar atividade</SelectItem>
                  <SelectItem value="enviar_email">Enviar e-mail</SelectItem>
                  <SelectItem value="mudar_status">Mudar status do cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Campos dinâmicos da Ação */}
            {acao === 'criar_atividade' && (
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-gray-700">
                      Título da Atividade *
                    </Label>
                    <Input
                      placeholder="Ex: Follow-up de vendas"
                      value={atividadeTitulo}
                      onChange={(e) => setAtividadeTitulo(e.target.value)}
                      className="bg-white"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-gray-700">Tipo de Atividade</Label>
                    <Select value={atividadeTipo} onValueChange={setAtividadeTipo}>
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ATIVIDADES_PADRAO.map((atv) => (
                          <SelectItem key={atv.id} value={atv.id}>
                            {atv.tituloPadrao}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-700">
                    Descrição da Atividade
                  </Label>
                  <Textarea
                    placeholder="Instruções para a equipe. Suporta variáveis: {{cliente_nome}}, {{empresa_nome}}"
                    value={atividadeDescricao}
                    onChange={(e) => setAtividadeDescricao(e.target.value)}
                    rows={2}
                    className="bg-white text-xs"
                  />
                  <p className="text-[11px] text-gray-500">
                    Variáveis disponíveis:{' '}
                    <code className="bg-gray-100 px-1 py-0.5 rounded text-emerald-700">{`{{cliente_nome}}`}</code>
                    ,{' '}
                    <code className="bg-gray-100 px-1 py-0.5 rounded text-emerald-700">{`{{empresa_nome}}`}</code>
                  </p>
                </div>
              </div>
            )}

            {acao === 'enviar_whatsapp' && (
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <Label className="text-xs font-medium text-gray-700">Mensagem WhatsApp *</Label>
                <Textarea
                  placeholder="Ex: Olá {{cliente_nome}}! Sua usina solar está operando há uma semana. Como está sendo sua experiência?"
                  value={whatsappMensagem}
                  onChange={(e) => setWhatsappMensagem(e.target.value)}
                  rows={3}
                  className="bg-white text-xs"
                  required
                />
                <div className="text-[11px] text-gray-500 flex items-center justify-between">
                  <span>
                    Variáveis:{' '}
                    <code className="bg-gray-100 px-1 py-0.5 rounded text-emerald-700">{`{{cliente_nome}}`}</code>
                    ,{' '}
                    <code className="bg-gray-100 px-1 py-0.5 rounded text-emerald-700">{`{{empresa_nome}}`}</code>
                  </span>
                  <span className="text-gray-400">Disparo via Z-API integrado</span>
                </div>
              </div>
            )}

            {acao === 'enviar_email' && (
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-700">Assunto do E-mail *</Label>
                  <Input
                    placeholder="Ex: Como está sendo sua usina Delfos Solar?"
                    value={emailAssunto}
                    onChange={(e) => setEmailAssunto(e.target.value)}
                    className="bg-white"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-700">Corpo do E-mail *</Label>
                  <Textarea
                    placeholder="Olá {{cliente_nome}}, ..."
                    value={emailCorpo}
                    onChange={(e) => setEmailCorpo(e.target.value)}
                    rows={3}
                    className="bg-white text-xs"
                    required
                  />
                  <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                    Nota: se o servidor SMTP não estiver configurado, a automação registrará o erro
                    no histórico sem bloquear a criação.
                  </p>
                </div>
              </div>
            )}

            {acao === 'mudar_status' && (
              <div className="space-y-1.5 pt-2 border-t border-slate-200">
                <Label className="text-xs font-medium text-gray-700">Mudar status para:</Label>
                <Select value={mudarStatusPara} onValueChange={setMudarStatusPara}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTAGIOS_FUNIL.map((st) => (
                      <SelectItem key={st} value={st}>
                        {st}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* BLOCO 3: DESTINO */}
          {acao !== 'mudar_status' && (
            <div className="p-4 border rounded-xl bg-slate-50/50 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800">
                3. Destino (Para Quem Vai)
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-gray-600">Selecione o destinatário da ação:</Label>
                <Select
                  value={destino}
                  onValueChange={(val) => setDestino(val as AutomacaoDestinoTipo)}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Selecione o destino" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cliente_evento">
                      Cliente vinculado ao evento / orçamento
                    </SelectItem>
                    <SelectItem value="responsavel_empresa">
                      Responsável da empresa (atendente/vendedor)
                    </SelectItem>
                    <SelectItem value="cliente_especifico">
                      Cliente específico selecionado
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {destino === 'cliente_especifico' && (
                <div className="space-y-1.5 pt-2 border-t border-slate-200">
                  <Label className="text-xs font-medium text-gray-700">Selecione o cliente:</Label>
                  <Select value={clienteEspecificoId} onValueChange={setClienteEspecificoId}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Escolha um cliente da base" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome} {c.cidade ? `(${c.cidade})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {saving
                ? 'Salvando...'
                : automacaoParaEditar
                  ? 'Atualizar Automação'
                  : 'Criar Automação'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
