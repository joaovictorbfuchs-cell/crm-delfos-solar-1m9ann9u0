import React, { useState, useEffect, useMemo } from 'react'
import {
  Wrench,
  Search,
  Filter,
  Calendar,
  MapPin,
  User,
  Clock,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Phone,
  FileText,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatDateTime } from '@/lib/formatters'
import { fetchOrdensServico, updateOrdemServico } from '@/services/crmService'
import { fetchInstaladoresAtivos } from '@/services/usuariosService'
import { BotaoEnviarOSWhatsApp } from '@/components/BotaoEnviarOSWhatsApp'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import type { OrdemServico, SistemaUsuario } from '@/types/crm'
import { useNavigate } from 'react-router-dom'

interface GestaoOrdensServicoProps {
  onVerExecucao?: (osId: string) => void
}

export const GestaoOrdensServico: React.FC<GestaoOrdensServicoProps> = ({ onVerExecucao }) => {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [ordens, setOrdens] = useState<OrdemServico[]>([])
  const [instaladores, setInstaladores] = useState<SistemaUsuario[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendente' | 'concluida'>('todos')
  const [tipoFilter, setTipoFilter] = useState<string>('todos')

  // Modal de atribuição de responsável
  const [osParaAtribuir, setOsParaAtribuir] = useState<OrdemServico | null>(null)
  const [selectedInstaladorId, setSelectedInstaladorId] = useState<string>('')
  const [isSavingAtribuicao, setIsSavingAtribuicao] = useState(false)

  const carregarDados = async () => {
    setIsLoading(true)
    try {
      const [osList, instList] = await Promise.all([
        fetchOrdensServico(),
        fetchInstaladoresAtivos().catch(() => []),
      ])
      setOrdens(osList)
      setInstaladores(instList)
    } catch (err) {
      console.error('Erro ao carregar Ordens de Serviço:', err)
      toast.error('Não foi possível carregar as ordens de serviço.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const filteredOrdens = useMemo(() => {
    return ordens.filter((os) => {
      if (statusFilter !== 'todos' && os.status !== statusFilter) return false
      if (tipoFilter !== 'todos' && os.tipo_servico !== tipoFilter) return false

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase()
        const clienteNome = (
          os.expand?.cliente_id?.nome ||
          os.expand?.cliente_id?.razao_social ||
          ''
        ).toLowerCase()
        const endereco = (os.endereco || '').toLowerCase()
        const tecnico = (os.atribuida_a || '').toLowerCase()
        const tipo = (os.tipo_servico || '').toLowerCase()

        return (
          clienteNome.includes(query) ||
          endereco.includes(query) ||
          tecnico.includes(query) ||
          tipo.includes(query)
        )
      }
      return true
    })
  }, [ordens, statusFilter, tipoFilter, searchTerm])

  const handleSalvarAtribuicao = async () => {
    if (!osParaAtribuir) return
    setIsSavingAtribuicao(true)
    try {
      const targetInstalador = instaladores.find((i) => i.id === selectedInstaladorId)
      const updated = await updateOrdemServico(osParaAtribuir.id, {
        responsavel_usuario_id: selectedInstaladorId || '',
        atribuida_a: targetInstalador ? targetInstalador.name : '',
      })

      setOrdens((prev) =>
        prev.map((item) =>
          item.id === updated.id
            ? {
                ...item,
                responsavel_usuario_id: updated.responsavel_usuario_id,
                atribuida_a: updated.atribuida_a,
                expand: {
                  ...item.expand,
                  responsavel_usuario_id: targetInstalador || undefined,
                },
              }
            : item,
        ),
      )

      toast.success(
        targetInstalador ? `OS atribuída para ${targetInstalador.name}!` : 'Atribuição removida.',
      )
      setOsParaAtribuir(null)
    } catch (err) {
      console.error('Erro ao salvar atribuição:', err)
      toast.error('Não foi possível atualizar a atribuição do responsável.')
    } finally {
      setIsSavingAtribuicao(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Top Banner de Contexto */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
        <div>
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-emerald-600" />
            <span>Ordens de Serviço do Instalador (OS Campo)</span>
          </h3>
          <p className="text-xs text-gray-500">
            Gerenciamento de ordens de serviço, checklist, envio de notificação por WhatsApp e
            atribuição de técnicos responsáveis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={carregarDados}
            disabled={isLoading}
            className="rounded-xl h-9 text-xs text-gray-600"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => navigate('/execucao-os')}
            className="rounded-xl h-9 text-xs bg-[#16A34A] hover:bg-[#15803D] text-white font-bold"
          >
            <span>Abrir Ficha de Execução</span>
            <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Buscar por cliente, técnico ou endereço..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 text-xs rounded-xl"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full h-10 px-3 text-xs font-medium rounded-xl border border-gray-200 bg-white text-gray-800"
          >
            <option value="todos">Todos os Status</option>
            <option value="pendente">Pendentes</option>
            <option value="concluida">Concluídas</option>
          </select>
        </div>

        <div>
          <select
            value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value)}
            className="w-full h-10 px-3 text-xs font-medium rounded-xl border border-gray-200 bg-white text-gray-800"
          >
            <option value="todos">Todos os Serviços</option>
            <option value="Limpeza">Limpeza</option>
            <option value="Manutenção">Manutenção</option>
            <option value="Instalação">Instalação</option>
            <option value="Garantia">Garantia</option>
            <option value="Configuração de Datalogger">Configuração de Datalogger</option>
          </select>
        </div>
      </div>

      {/* Lista de OS */}
      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
          <p className="text-xs">Carregando ordens de serviço...</p>
        </div>
      ) : filteredOrdens.length === 0 ? (
        <div className="py-12 text-center bg-gray-50/50 rounded-2xl border border-gray-200/80 p-6">
          <Wrench className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-gray-800">Nenhuma ordem de serviço encontrada</h4>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
            As ordens de serviço cadastradas para execução pelos técnicos aparecerão listadas aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrdens.map((os) => {
            const cliente = os.expand?.cliente_id
            const clienteNome = cliente?.nome || cliente?.razao_social || 'Cliente Solar'
            const responsavel = os.expand?.responsavel_usuario_id
            const telefoneTecnico = responsavel?.phone || ''
            const checklistTotal = os.checklist?.length || 0
            const checklistFeitos = os.checklist?.filter((c) => c.concluido).length || 0

            return (
              <div
                key={os.id}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200/90 shadow-2xs hover:border-emerald-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {os.tipo_servico}
                    </span>

                    {os.status === 'concluida' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Concluída
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full">
                        <Clock className="w-3.5 h-3.5" />
                        Pendente
                      </span>
                    )}

                    <span className="text-xs text-gray-400 font-mono">#{os.id.slice(0, 8)}</span>
                  </div>

                  <h4 className="text-base font-bold text-gray-900 truncate">{clienteNome}</h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">
                        {os.endereco || cliente?.endereco || 'Endereço a confirmar'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Data: {formatDateTime(os.data_agendada)}</span>
                    </div>

                    <div className="flex items-center gap-1.5 truncate">
                      <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">
                        Instalador:{' '}
                        <strong className="text-gray-800">
                          {os.atribuida_a || responsavel?.name || 'Não atribuído'}
                        </strong>
                        {telefoneTecnico && (
                          <span className="text-[11px] text-gray-400 ml-1">
                            ({telefoneTecnico})
                          </span>
                        )}
                      </span>
                    </div>

                    {checklistTotal > 0 && (
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>
                          Checklist: {checklistFeitos}/{checklistTotal}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bloco de Ações e Disparo de WhatsApp */}
                <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end flex-wrap pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                  {/* Botão de Enviar OS por WhatsApp */}
                  <BotaoEnviarOSWhatsApp
                    osId={os.id}
                    responsavelNome={os.atribuida_a || responsavel?.name}
                    responsavelTelefone={telefoneTecnico}
                    responsavelId={os.responsavel_usuario_id}
                    size="sm"
                    label="Enviar OS por WhatsApp"
                  />

                  {/* Botão de Atribuir / Transferir Instalador */}
                  {isAdmin && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setOsParaAtribuir(os)
                        setSelectedInstaladorId(os.responsavel_usuario_id || '')
                      }}
                      className="h-8 px-2.5 text-xs text-gray-700 hover:text-gray-900 border-gray-200"
                    >
                      {os.responsavel_usuario_id ? 'Transferir' : 'Atribuir Técnico'}
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (onVerExecucao) {
                        onVerExecucao(os.id)
                      } else {
                        navigate('/execucao-os')
                      }
                    }}
                    className="h-8 px-2 text-xs text-emerald-700 hover:bg-emerald-50"
                  >
                    Ver Ficha →
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de Atribuição de Instalador à OS */}
      <Dialog
        open={Boolean(osParaAtribuir)}
        onOpenChange={(open) => !open && setOsParaAtribuir(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-900 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-emerald-600" />
              <span>Atribuir Instalador à OS</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Selecione o técnico instalador que receberá a ordem de serviço em campo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs">
              <span className="font-bold text-gray-700 block">Cliente:</span>
              <span className="text-gray-900 font-semibold">
                {osParaAtribuir?.expand?.cliente_id?.nome ||
                  osParaAtribuir?.expand?.cliente_id?.razao_social ||
                  'Cliente Solar'}
              </span>
              <span className="text-gray-500 block mt-1">
                Serviço: <strong>{osParaAtribuir?.tipo_servico}</strong>
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Instalador Responsável
              </label>
              <select
                value={selectedInstaladorId}
                onChange={(e) => setSelectedInstaladorId(e.target.value)}
                className="w-full h-11 px-3 text-xs sm:text-sm font-medium rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-hidden focus:border-emerald-600"
              >
                <option value="">-- Não atribuído / Remover atribuição --</option>
                {instaladores.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name} {inst.phone ? `(${inst.phone})` : '(Sem WhatsApp)'}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-500 mt-1">
                Ao salvar a atribuição, você também poderá clicar no botão manual{' '}
                <strong>"Enviar OS por WhatsApp"</strong> a qualquer momento para reenviar.
              </p>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSavingAtribuicao}
              onClick={() => setOsParaAtribuir(null)}
              className="rounded-xl h-10 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isSavingAtribuicao}
              onClick={handleSalvarAtribuicao}
              className="bg-[#16A34A] hover:bg-[#15803D] text-white font-bold rounded-xl h-10 text-xs"
            >
              {isSavingAtribuicao ? 'Salvando...' : 'Salvar Atribuição'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
