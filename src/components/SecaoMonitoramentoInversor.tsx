import React, { useState, useEffect, useCallback } from 'react'
import {
  Smartphone,
  User,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  ExternalLink,
  Wifi,
  Sparkles,
  Save,
  CheckCircle2,
  Info,
  Send,
  AlertCircle,
  Plus,
  Trash2,
  Cpu,
  Layers,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Cliente, Sistema, MonitoramentoMarca, ClienteInversor } from '@/types/crm'
import {
  fetchMonitoramentoMarcas,
  saveOrUpdateMonitoramentoMarca,
  fetchInversoresByClienteId,
  createClienteInversor,
  updateClienteInversor,
  deleteClienteInversor,
  sendWhatsAppMensagem,
} from '@/services/crmService'
import { cleanPhoneDigits } from '@/lib/formatters'
import { getFriendlyWhatsAppErrorMessage } from '@/lib/whatsappGateway'
import { DatasheetBadge } from './DatasheetBadge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface SecaoMonitoramentoInversorProps {
  cliente: Cliente
  sistema: Sistema | null
  onUpdateClienteField: (field: keyof Cliente, value: any) => Promise<void>
  onUpdateSistemaField?: (field: keyof Sistema, value: any) => Promise<void>
}

// Representação de trabalho para cada inversor
interface InversorFormItem {
  id?: string // se já existe no banco
  tempId: string // chave estável de renderização
  marca_inversor: string
  modelo_inversor: string
  potencia_kwp?: number
  numero_serie?: string
  app_nome: string
  login: string
  senha: string
  datalogger_url: string
  observacoes?: string
  ordem: number
  // Estado local de UI
  showPassword?: boolean
  copiedField?: string | null
  expanded?: boolean
}

export const SecaoMonitoramentoInversor: React.FC<SecaoMonitoramentoInversorProps> = ({
  cliente,
  sistema,
  onUpdateClienteField,
  onUpdateSistemaField,
}) => {
  // Lista de inversores em edição
  const [inversores, setInversores] = useState<InversorFormItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false)

  // Diálogo de confirmação para exclusão
  const [inversorParaExcluir, setInversorParaExcluir] = useState<InversorFormItem | null>(null)

  // Padrões cadastrados por marca
  const [marcasCadastradas, setMarcasCadastradas] = useState<MonitoramentoMarca[]>([])

  // Carrega catálogo de marcas
  useEffect(() => {
    let isMounted = true
    fetchMonitoramentoMarcas().then((lista) => {
      if (isMounted) setMarcasCadastradas(lista)
    })
    return () => {
      isMounted = false
    }
  }, [])

  // Helper para buscar padrão correspondente por marca
  const encontrarPadraoMarca = useCallback(
    (marcaNome: string): MonitoramentoMarca | null => {
      if (!marcaNome || marcasCadastradas.length === 0) return null
      const mLower = marcaNome.trim().toLowerCase()
      return (
        marcasCadastradas.find((m) => {
          const dbLower = m.marca.toLowerCase()
          return mLower.includes(dbLower) || dbLower.includes(mLower)
        }) || null
      )
    },
    [marcasCadastradas],
  )

  // Carrega inversores do cliente da coleção cliente_inversores
  const carregarInversores = useCallback(async () => {
    if (!cliente.id) return
    setIsLoading(true)
    try {
      const records = await fetchInversoresByClienteId(cliente.id)
      if (records && records.length > 0) {
        setInversores(
          records.map((r, idx) => ({
            id: r.id,
            tempId: r.id,
            marca_inversor: r.marca_inversor || '',
            modelo_inversor: r.modelo_inversor || '',
            potencia_kwp: r.potencia_kwp,
            numero_serie: r.numero_serie || '',
            app_nome: r.app_nome || '',
            login: r.login || '',
            senha: r.senha || '',
            datalogger_url: r.datalogger_url || '',
            observacoes: r.observacoes || '',
            ordem: r.ordem ?? idx + 1,
            showPassword: false,
            copiedField: null,
            expanded: true,
          })),
        )
      } else {
        // Fallback: se o cliente ainda não tiver nenhum registro em cliente_inversores,
        // inicializa com os dados legados da ficha do cliente/sistema
        const marcaInicial = sistema?.fabricante_inversores || cliente.inversor_marca || 'SolarEdge'
        const modeloInicial = sistema?.modelo_inversores || cliente.inversor_modelo || ''
        const potInicial =
          sistema?.potencia_pico_inversores_kwp && sistema.potencia_pico_inversores_kwp > 0
            ? sistema.potencia_pico_inversores_kwp
            : sistema?.potencia_total_kwp && sistema.potencia_total_kwp > 0
              ? sistema.potencia_total_kwp
              : cliente.potencia_kwp && cliente.potencia_kwp > 0
                ? cliente.potencia_kwp
                : undefined
        const appInicial = cliente.monitoramento_app_nome || sistema?.monitoramento_app_nome || ''
        const loginInicial = cliente.monitoramento_login || sistema?.monitoramento_login || ''
        const senhaInicial = cliente.monitoramento_senha || sistema?.monitoramento_senha || ''
        const dataloggerInicial =
          cliente.monitoramento_datalogger_url || sistema?.monitoramento_datalogger_url || ''

        // Procura padrão da marca se os dados estiverem vazios
        const padrao = encontrarPadraoMarca(marcaInicial)

        setInversores([
          {
            tempId: 'temp-1',
            marca_inversor: marcaInicial,
            modelo_inversor: modeloInicial,
            potencia_kwp: potInicial,
            app_nome: appInicial || padrao?.app_nome || '',
            login: loginInicial || padrao?.login_padrao || '',
            senha: senhaInicial || padrao?.senha_padrao || '',
            datalogger_url: dataloggerInicial || padrao?.datalogger_url || '',
            ordem: 1,
            showPassword: false,
            copiedField: null,
            expanded: true,
          },
        ])
      }
    } catch (err) {
      console.warn('Erro ao carregar inversores:', err)
    } finally {
      setIsLoading(false)
    }
  }, [
    cliente.id,
    cliente.inversor_marca,
    cliente.inversor_modelo,
    cliente.monitoramento_app_nome,
    cliente.monitoramento_login,
    cliente.monitoramento_senha,
    cliente.monitoramento_datalogger_url,
    sistema?.fabricante_inversores,
    sistema?.modelo_inversores,
    sistema?.monitoramento_app_nome,
    sistema?.monitoramento_login,
    sistema?.monitoramento_senha,
    sistema?.monitoramento_datalogger_url,
    encontrarPadraoMarca,
  ])

  useEffect(() => {
    carregarInversores()
  }, [carregarInversores])

  // Atualizar campo de um inversor específico
  const handleUpdateInversorField = (index: number, field: keyof InversorFormItem, value: any) => {
    setInversores((prev) => {
      const next = [...prev]
      const item = { ...next[index], [field]: value }

      // Se alterou a marca e os dados de monitoramento estão vazios, auto-preencher com padrão
      if (field === 'marca_inversor' && typeof value === 'string') {
        const padrao = encontrarPadraoMarca(value)
        if (padrao) {
          if (!item.app_nome && padrao.app_nome) item.app_nome = padrao.app_nome
          if (!item.login && padrao.login_padrao) item.login = padrao.login_padrao
          if (!item.senha && padrao.senha_padrao) item.senha = padrao.senha_padrao
          if (!item.datalogger_url && padrao.datalogger_url)
            item.datalogger_url = padrao.datalogger_url
        }
      }

      next[index] = item
      return next
    })
  }

  // Aplicar explicitamente padrão da marca no inversor específico
  const handleAplicarPadrao = (index: number) => {
    const item = inversores[index]
    if (!item) return
    const padrao = encontrarPadraoMarca(item.marca_inversor)
    if (!padrao) {
      toast.info(`Nenhum padrão cadastrado para a marca "${item.marca_inversor || 'vazia'}".`)
      return
    }

    setInversores((prev) => {
      const next = [...prev]
      next[index] = {
        ...next[index],
        app_nome: padrao.app_nome || next[index].app_nome,
        login: padrao.login_padrao || next[index].login,
        senha: padrao.senha_padrao || next[index].senha,
        datalogger_url: padrao.datalogger_url || next[index].datalogger_url,
      }
      return next
    })

    toast.success(`Padrão da marca "${padrao.marca}" aplicado no Inversor #${index + 1}!`)
  }

  // Copiar valor de campo para clipboard
  const handleCopy = async (index: number, field: string, text: string) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setInversores((prev) => {
        const next = [...prev]
        next[index] = { ...next[index], copiedField: field }
        return next
      })
      toast.success('Copiado para a área de transferência!')
      setTimeout(() => {
        setInversores((prev) => {
          const next = [...prev]
          if (next[index]) next[index] = { ...next[index], copiedField: null }
          return next
        })
      }, 2000)
    } catch (_) {
      toast.error('Não foi possível copiar.')
    }
  }

  // Alternar visualização da senha
  const handleToggleSenha = (index: number) => {
    setInversores((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], showPassword: !next[index].showPassword }
      return next
    })
  }

  // Adicionar novo inversor
  const handleAdicionarInversor = () => {
    const novaOrdem = inversores.length + 1
    // Sugestão padrão de nova marca comum (ex: SolarEdge ou Growatt se ainda não estiver na lista)
    const marcasEmUso = inversores.map((inv) => (inv.marca_inversor || '').toLowerCase())
    let marcaSugerida = 'SolarEdge'
    if (marcasEmUso.includes('solaredge')) {
      marcaSugerida = 'Growatt'
    } else if (marcasEmUso.includes('growatt')) {
      marcaSugerida = 'SolarEdge'
    }

    const padrao = encontrarPadraoMarca(marcaSugerida)

    const novoInversor: InversorFormItem = {
      tempId: `temp-${Date.now()}`,
      marca_inversor: marcaSugerida,
      modelo_inversor: '',
      app_nome: padrao?.app_nome || '',
      login: padrao?.login_padrao || '',
      senha: padrao?.senha_padrao || '',
      datalogger_url: padrao?.datalogger_url || '',
      ordem: novaOrdem,
      showPassword: false,
      copiedField: null,
      expanded: true,
    }

    setInversores((prev) => [...prev, novoInversor])
    toast.success(`Inversor #${novaOrdem} adicionado! Preencha a marca e dados de acesso.`)
  }

  // Solicitar remoção de inversor
  const handleConfirmarRemocao = (item: InversorFormItem) => {
    setInversorParaExcluir(item)
  }

  // Executar remoção
  const handleRemoverInversorExecutar = async () => {
    if (!inversorParaExcluir) return
    const { id, tempId } = inversorParaExcluir

    try {
      if (id) {
        await deleteClienteInversor(id)
      }
      setInversores((prev) => {
        const filtrados = prev.filter((inv) => (id ? inv.id !== id : inv.tempId !== tempId))
        // Reordenar ordem 1, 2, 3...
        return filtrados.map((inv, idx) => ({ ...inv, ordem: idx + 1 }))
      })
      toast.success('Inversor removido com sucesso!')
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao excluir inversor: ' + (err?.message || 'Tente novamente'))
    } finally {
      setInversorParaExcluir(null)
    }
  }

  // Salvar todos os inversores e sincronizar campos principais com a ficha do cliente
  const handleSalvarTodos = async (memorizarMarcas = true) => {
    if (inversores.length === 0) {
      toast.error('Cadastre ao menos um inversor.')
      return
    }

    setIsSaving(true)
    setSaveSuccess(false)

    try {
      const novosSalvos: InversorFormItem[] = []

      for (let i = 0; i < inversores.length; i++) {
        const item = inversores[i]
        const payload: Partial<ClienteInversor> & { cliente_id: string } = {
          cliente_id: cliente.id,
          marca_inversor: (item.marca_inversor || '').trim(),
          modelo_inversor: (item.modelo_inversor || '').trim(),
          potencia_kwp: item.potencia_kwp ? Number(item.potencia_kwp) : undefined,
          numero_serie: (item.numero_serie || '').trim(),
          app_nome: (item.app_nome || '').trim(),
          login: (item.login || '').trim(),
          senha: (item.senha || '').trim(),
          datalogger_url: (item.datalogger_url || '').trim(),
          observacoes: (item.observacoes || '').trim(),
          ordem: i + 1,
        }

        let salvo: ClienteInversor
        if (item.id) {
          salvo = await updateClienteInversor(item.id, payload)
        } else {
          salvo = await createClienteInversor(payload)
        }

        novosSalvos.push({
          ...item,
          id: salvo.id,
          tempId: salvo.id,
          ordem: i + 1,
        })

        // Memorizar como padrão da marca se solicitado e se houver marca preenchida
        if (memorizarMarcas && item.marca_inversor?.trim()) {
          try {
            await saveOrUpdateMonitoramentoMarca({
              marca: item.marca_inversor.trim(),
              app_nome: item.app_nome?.trim() || '',
              login_padrao: item.login?.trim() || '',
              senha_padrao: item.senha?.trim() || '',
              datalogger_url: item.datalogger_url?.trim() || '',
            })
          } catch (mErr) {
            console.warn('Erro ao memorizar padrão da marca:', mErr)
          }
        }
      }

      setInversores(novosSalvos)

      // Sincronizar o primeiro inversor com os campos legados do cliente/sistema para retrocompatibilidade
      const primeiro = novosSalvos[0]
      if (primeiro) {
        await onUpdateClienteField('inversor_marca', primeiro.marca_inversor || '')
        await onUpdateClienteField('inversor_modelo', primeiro.modelo_inversor || '')
        await onUpdateClienteField('monitoramento_app_nome', primeiro.app_nome || '')
        await onUpdateClienteField('monitoramento_login', primeiro.login || '')
        await onUpdateClienteField('monitoramento_senha', primeiro.senha || '')
        await onUpdateClienteField('monitoramento_datalogger_url', primeiro.datalogger_url || '')

        // Se houver potência definida, sincronizar potência total / pico
        const somaPotenciaInversores = novosSalvos.reduce(
          (acc, inv) => acc + (Number(inv.potencia_kwp) || 0),
          0,
        )
        const potParaSincronizar =
          somaPotenciaInversores > 0
            ? somaPotenciaInversores
            : primeiro.potencia_kwp
              ? Number(primeiro.potencia_kwp)
              : undefined

        if (potParaSincronizar !== undefined && potParaSincronizar > 0) {
          await onUpdateClienteField('potencia_kwp', potParaSincronizar)
        }

        if (onUpdateSistemaField && sistema) {
          await onUpdateSistemaField('fabricante_inversores', primeiro.marca_inversor || '')
          await onUpdateSistemaField('modelo_inversores', primeiro.modelo_inversor || '')
          await onUpdateSistemaField('monitoramento_app_nome', primeiro.app_nome || '')
          await onUpdateSistemaField('monitoramento_login', primeiro.login || '')
          await onUpdateSistemaField('monitoramento_senha', primeiro.senha || '')
          await onUpdateSistemaField('monitoramento_datalogger_url', primeiro.datalogger_url || '')
          if (potParaSincronizar !== undefined && potParaSincronizar > 0) {
            await onUpdateSistemaField('potencia_pico_inversores_kwp', potParaSincronizar)
            await onUpdateSistemaField('potencia_total_kwp', potParaSincronizar)
          }
        }
      }

      setSaveSuccess(true)
      toast.success(`Todos os ${novosSalvos.length} inversores foram salvos com sucesso!`)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao salvar inversores: ' + (err?.message || 'Tente novamente'))
    } finally {
      setIsSaving(false)
    }
  }

  // Helper para URL do link do datalogger
  const getHrefDatalogger = (url: string) => {
    const trimmed = url.trim()
    if (!trimmed) return ''
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    return `http://${trimmed}`
  }

  // Validação de telefone para envio pelo WhatsApp
  const telefoneCru = cliente.whatsapp || cliente.telefone || ''
  const telefoneDigitos = cleanPhoneDigits(telefoneCru)
  const temTelefoneValido = telefoneDigitos.length >= 10

  // Disparo de credenciais pelo WhatsApp diretamente via Z-API listando TODOS os inversores
  const handleEnviarWhatsApp = async () => {
    if (!temTelefoneValido) {
      toast.error('O cliente não possui telefone de contato cadastrado na ficha.')
      return
    }

    const primeiroNome = (cliente.nome || 'Cliente').split(' ')[0]

    const linhasMensagem: (string | null)[] = [
      `Olá ${primeiroNome}! Seguem seus dados de acesso ao monitoramento do(s) seu(s) inversor(es) solar:`,
      '',
    ]

    inversores.forEach((inv, idx) => {
      const numLabel = inversores.length > 1 ? ` (Inversor #${idx + 1})` : ''
      const potenciaTexto = inv.potencia_kwp ? ` (${inv.potencia_kwp} kWp)` : ''
      linhasMensagem.push(
        `⚡ *INVERSOR${numLabel}:* ${inv.marca_inversor || 'Não informada'}${inv.modelo_inversor ? ` - ${inv.modelo_inversor}` : ''}${potenciaTexto}`,
      )
      if (inv.app_nome) linhasMensagem.push(`📱 *Aplicativo:* ${inv.app_nome}`)
      if (inv.login) linhasMensagem.push(`👤 *Login:* ${inv.login}`)
      if (inv.senha) linhasMensagem.push(`🔒 *Senha:* ${inv.senha}`)
      if (inv.datalogger_url) linhasMensagem.push(`📶 *Link do Datalogger:* ${inv.datalogger_url}`)
      if (inv.observacoes) linhasMensagem.push(`ℹ️ *Obs:* ${inv.observacoes}`)
      linhasMensagem.push('')
    })

    linhasMensagem.push(
      'Qualquer dúvida sobre a configuração ou primeiro acesso, estamos à inteira disposição!',
    )

    const textoFormatado = linhasMensagem.filter((l) => l !== null).join('\n')

    setIsSendingWhatsApp(true)
    try {
      const res = await sendWhatsAppMensagem({
        clienteId: cliente.id,
        telefone: telefoneDigitos,
        mensagem: textoFormatado,
        origem: 'secao_monitoramento_inversor',
      })

      if (res.ok && res.sent) {
        toast.success('Dados de acesso do(s) inversor(es) enviados via WhatsApp!')
      } else {
        const errorMsg = getFriendlyWhatsAppErrorMessage(res)
        toast.error(errorMsg)
      }
    } catch (err: any) {
      console.error('Erro ao enviar dados do inversor via WhatsApp:', err)
      toast.error(err?.message || 'Falha de comunicação ao enviar dados do inversor via WhatsApp.')
    } finally {
      setIsSendingWhatsApp(false)
    }
  }

  return (
    <div className="p-3.5 bg-gradient-to-br from-purple-50/70 via-indigo-50/40 to-blue-50/50 rounded-xl border border-purple-200/80 shadow-xs space-y-3.5">
      {/* Cabeçalho da Seção */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-purple-200/70 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center text-white shadow-xs">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-950 flex items-center gap-1.5">
                Inversores & Monitoramento do Cliente
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                {inversores.length} {inversores.length === 1 ? 'inversor' : 'inversores'}
              </span>
            </div>
            <p className="text-[11px] text-purple-800/80">
              Gerencie múltiplos inversores, marcas diferentes e credenciais de monitoramento
            </p>
          </div>
        </div>

        {/* Botão para Adicionar Inversor */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAdicionarInversor}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 px-3 py-1.5 rounded-lg transition-colors shadow-2xs hover:scale-[1.01]"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>+ Adicionar Inversor</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-6 text-center text-xs text-purple-700 font-medium">
          Carregando inversores do cliente...
        </div>
      ) : (
        /* Lista de Inversores como Cartões Empilhados */
        <div className="space-y-3">
          {inversores.map((inv, index) => {
            const padrao = encontrarPadraoMarca(inv.marca_inversor)
            const linkHref = getHrefDatalogger(inv.datalogger_url || '')

            return (
              <div
                key={inv.id || inv.tempId}
                className="bg-white rounded-xl border border-purple-200/90 shadow-2xs overflow-hidden transition-all"
              >
                {/* Cabeçalho do Cartão do Inversor */}
                <div className="bg-gradient-to-r from-purple-100/70 via-indigo-50/60 to-purple-50/40 p-2.5 px-3 border-b border-purple-200/70 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-700 text-white font-bold text-[11px] flex items-center justify-center shadow-2xs">
                      {index + 1}
                    </span>
                    <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-purple-700" />
                      Inversor #{index + 1}
                      {inv.marca_inversor && (
                        <span className="text-purple-700 font-extrabold">
                          — {inv.marca_inversor}
                        </span>
                      )}
                    </span>
                    {inv.modelo_inversor && (
                      <span className="text-[11px] text-gray-500 hidden sm:inline truncate max-w-[200px]">
                        ({inv.modelo_inversor})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Botão de Aplicar Padrão da Marca se houver */}
                    {padrao && (
                      <button
                        type="button"
                        onClick={() => handleAplicarPadrao(index)}
                        title={`Preencher credenciais com o padrão da marca "${padrao.marca}"`}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full transition-colors shadow-2xs"
                      >
                        <Sparkles className="w-3 h-3 text-indigo-600" />
                        Padrão {padrao.marca}
                      </button>
                    )}

                    {/* Botão Remover Inversor */}
                    {inversores.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleConfirmarRemocao(inv)}
                        title={`Remover Inversor #${index + 1}`}
                        className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Conteúdo do Cartão */}
                <div className="p-3 space-y-3">
                  {/* Linha 1: Marca, Modelo e Potência do Inversor */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Marca do Inversor (com lista de sugestões das marcas cadastradas) */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-gray-700 flex items-center justify-between">
                        <span className="text-purple-900 font-bold">Marca / Fabricante</span>
                        {padrao && (
                          <span className="text-[10px] text-indigo-600 font-medium">
                            Padrão ativo
                          </span>
                        )}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          list={`datalist-marcas-${index}`}
                          value={inv.marca_inversor}
                          onChange={(e) =>
                            handleUpdateInversorField(index, 'marca_inversor', e.target.value)
                          }
                          placeholder="Ex.: SolarEdge, Growatt, Fronius..."
                          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 transition-all shadow-2xs font-semibold"
                        />
                        <datalist id={`datalist-marcas-${index}`}>
                          {marcasCadastradas.map((m) => (
                            <option key={m.id} value={m.marca}>
                              {m.marca} ({m.app_nome || 'App'})
                            </option>
                          ))}
                        </datalist>
                      </div>
                    </div>

                    {/* Modelo do Inversor com Datasheet */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <label className="text-[11px] font-semibold text-gray-700">
                          Modelo do Inversor
                        </label>
                        <DatasheetBadge
                          marca={inv.marca_inversor}
                          modelo={inv.modelo_inversor}
                          tipo="inversor"
                          mostrarLinkBusca={true}
                        />
                      </div>
                      <input
                        type="text"
                        value={inv.modelo_inversor}
                        onChange={(e) =>
                          handleUpdateInversorField(index, 'modelo_inversor', e.target.value)
                        }
                        placeholder="Ex.: MAX 30KTL3-X LV"
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 transition-all shadow-2xs"
                      />
                    </div>

                    {/* Potência do Inversor (kWp) com destaque visual */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-gray-700 flex items-center justify-between">
                        <span className="text-purple-900 font-bold">Potência (kWp)</span>
                        {inv.potencia_kwp !== undefined && inv.potencia_kwp > 0 && (
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                            {inv.potencia_kwp} kWp
                          </span>
                        )}
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          step="0.1"
                          min={0}
                          value={inv.potencia_kwp ?? ''}
                          onChange={(e) =>
                            handleUpdateInversorField(
                              index,
                              'potencia_kwp',
                              e.target.value !== '' ? Number(e.target.value) : undefined,
                            )
                          }
                          placeholder="Ex.: 17.6"
                          className="w-full bg-white border border-gray-300 rounded-lg pl-3 pr-10 py-1.5 text-xs text-purple-950 font-bold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 transition-all shadow-2xs font-mono"
                        />
                        <span className="absolute right-2.5 text-[11px] font-bold text-gray-400 pointer-events-none">
                          kWp
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Linha 2: Os 4 Dados de Monitoramento (App, Login, Senha, Datalogger) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-gray-100">
                    {/* Campo 1: Nome do Aplicativo */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-gray-700 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-purple-900">
                          <Smartphone className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          Nome do Aplicativo
                        </span>
                        <span className="text-[10px] text-gray-400 font-normal">
                          App Store / Google Play
                        </span>
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          value={inv.app_nome}
                          onChange={(e) =>
                            handleUpdateInversorField(index, 'app_nome', e.target.value)
                          }
                          placeholder="Ex.: mySolarEdge, ShinePhone, Solar.web"
                          className="w-full bg-white border border-gray-300 rounded-lg pl-3 pr-8 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 transition-all shadow-2xs"
                        />
                        {inv.app_nome && (
                          <button
                            type="button"
                            onClick={() => handleCopy(index, 'app', inv.app_nome)}
                            title="Copiar nome do aplicativo"
                            className="absolute right-2 p-1 text-gray-400 hover:text-purple-600 transition-colors"
                          >
                            {inv.copiedField === 'app' ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Campo 2: Login do Aplicativo */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-gray-700 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-indigo-900">
                          <User className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          Login do Aplicativo
                        </span>
                        <span className="text-[10px] text-gray-400 font-normal">
                          E-mail ou Usuário
                        </span>
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          value={inv.login}
                          onChange={(e) =>
                            handleUpdateInversorField(index, 'login', e.target.value)
                          }
                          placeholder="Ex.: cliente@email.com ou usuario_inversor"
                          className="w-full bg-white border border-gray-300 rounded-lg pl-3 pr-8 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all shadow-2xs font-mono"
                        />
                        {inv.login && (
                          <button
                            type="button"
                            onClick={() => handleCopy(index, 'login', inv.login)}
                            title="Copiar login"
                            className="absolute right-2 p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                          >
                            {inv.copiedField === 'login' ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Campo 3: Senha do Aplicativo */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-gray-700 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-amber-900">
                          <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          Senha do Aplicativo
                        </span>
                        <span className="text-[10px] text-gray-400 font-normal">
                          Acesso cliente/suporte
                        </span>
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type={inv.showPassword ? 'text' : 'password'}
                          value={inv.senha}
                          onChange={(e) =>
                            handleUpdateInversorField(index, 'senha', e.target.value)
                          }
                          placeholder="••••••••••••"
                          className="w-full bg-white border border-gray-300 rounded-lg pl-3 pr-16 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all shadow-2xs font-mono"
                        />
                        <div className="absolute right-1.5 flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => handleToggleSenha(index)}
                            title={inv.showPassword ? 'Ocultar senha' : 'Ver senha'}
                            className="p-1 text-gray-400 hover:text-gray-700 transition-colors"
                          >
                            {inv.showPassword ? (
                              <EyeOff className="w-3.5 h-3.5 text-amber-700" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                          {inv.senha && (
                            <button
                              type="button"
                              onClick={() => handleCopy(index, 'senha', inv.senha)}
                              title="Copiar senha"
                              className="p-1 text-gray-400 hover:text-amber-600 transition-colors"
                            >
                              {inv.copiedField === 'senha' ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Campo 4: Link do Datalogger / IP Wi-Fi */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-gray-700 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-blue-900">
                          <Wifi className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          Configurar Datalogger / IP Wi-Fi
                        </span>
                        <span className="text-[10px] text-gray-400 font-normal">
                          Portal ou IP local
                        </span>
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          value={inv.datalogger_url}
                          onChange={(e) =>
                            handleUpdateInversorField(index, 'datalogger_url', e.target.value)
                          }
                          placeholder="Ex.: http://192.168.10.100 ou https://solaredge.com/setapp-help"
                          className="w-full bg-white border border-gray-300 rounded-lg pl-3 pr-16 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all shadow-2xs font-mono"
                        />
                        <div className="absolute right-1.5 flex items-center gap-0.5">
                          {inv.datalogger_url && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleCopy(index, 'datalogger', inv.datalogger_url)}
                                title="Copiar link"
                                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                              >
                                {inv.copiedField === 'datalogger' ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <a
                                href={linkHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`Abrir ${linkHref} em nova aba`}
                                className="p-1 text-blue-600 hover:text-blue-800 transition-colors inline-flex items-center"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Nota informativa */}
      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-white/70 border border-purple-100 text-[11px] text-gray-600">
        <Info className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
        <div className="leading-snug">
          <span>
            Cada inversor possui sua própria marca e dados de monitoramento. Ao salvar, os dados são
            armazenados individualmente na ficha do cliente e o botão WhatsApp abaixo envia a lista
            completa com todos os inversores e seus respectivos logins.
          </span>
        </div>
      </div>

      {/* Barra de Ações: Salvar Inversores e Enviar pelo WhatsApp */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-purple-100">
        <div className="flex items-center gap-1.5 text-[11px]">
          {saveSuccess && (
            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Inversores salvos com sucesso!
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Botão de Enviar Credenciais de Monitoramento pelo WhatsApp */}
          <button
            type="button"
            onClick={handleEnviarWhatsApp}
            disabled={!temTelefoneValido || isSendingWhatsApp}
            title={
              temTelefoneValido
                ? `Enviar credenciais dos ${inversores.length} inversor(es) via WhatsApp para ${telefoneCru}`
                : 'Cliente sem telefone de contato cadastrado na ficha'
            }
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all shadow-2xs ${
              temTelefoneValido && !isSendingWhatsApp
                ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white cursor-pointer hover:scale-[1.01]'
                : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-70'
            }`}
          >
            {isSendingWhatsApp ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>
              {isSendingWhatsApp ? 'Enviando WhatsApp...' : 'Enviar credenciais pelo WhatsApp'}
            </span>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSalvarTodos(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 active:bg-purple-900 rounded-lg transition-colors shadow-2xs disabled:opacity-50 hover:scale-[1.01]"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Salvando...' : 'Salvar Inversores'}
          </button>
        </div>
      </div>

      {/* Aviso caso cliente não tenha telefone */}
      {!temTelefoneValido && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50/80 border border-amber-200 text-[11px] text-amber-800">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>
            Cliente sem telefone/WhatsApp válido cadastrado. Cadastre o telefone na coluna da
            direita para habilitar o envio das credenciais com um clique.
          </span>
        </div>
      )}

      {/* Diálogo de Confirmação para Remover Inversor */}
      <AlertDialog
        open={Boolean(inversorParaExcluir)}
        onOpenChange={(open) => !open && setInversorParaExcluir(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-gray-900">
              Remover este Inversor?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-gray-600">
              Tem certeza que deseja remover o Inversor #{inversorParaExcluir?.ordem} (
              {inversorParaExcluir?.marca_inversor || 'Sem marca'}
              {inversorParaExcluir?.modelo_inversor
                ? ` - ${inversorParaExcluir.modelo_inversor}`
                : ''}
              )? Os dados de acesso deste equipamento serão excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoverInversorExecutar}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
            >
              Sim, Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
