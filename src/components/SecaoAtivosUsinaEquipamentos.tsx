import React, { useState, useEffect } from 'react'
import {
  Cpu,
  Sun,
  Wrench,
  Plus,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  Settings,
  Phone,
  Building2,
  Hash,
  AlertCircle,
  X,
  RefreshCw,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { Equipamento, UsinaEquipamentoAtivo } from '@/types/equipamentos'
import {
  fetchEquipamentosPorUsina,
  vincularEquipamentoUsina,
  desvincularEquipamentoUsina,
} from '@/services/usinaEquipamentosService'
import {
  fetchEquipamentos,
  getDatasheetEquipamentoUrl,
  getDataloggerEquipamentoUrl,
  formatarPotenciaEquipamento,
} from '@/services/equipamentosService'
import { ModalCadastroEquipamentoRapido } from '@/components/ModalCadastroEquipamentoRapido'
import { normalizarDigitosDestino } from '@/lib/resolverNumeroDestinoCliente'
import { aplicarPrefixoMensagemManual } from '@/lib/whatsappPrefixo'
import { useAuth } from '@/contexts/AuthContext'

interface SecaoAtivosUsinaEquipamentosProps {
  usinaId: string
  usinaNome: string
}

export const SecaoAtivosUsinaEquipamentos: React.FC<SecaoAtivosUsinaEquipamentosProps> = ({
  usinaId,
  usinaNome,
}) => {
  const { user } = useAuth()
  const [vinculos, setVinculos] = useState<UsinaEquipamentoAtivo[]>([])
  const [catalogoEquipamentos, setCatalogoEquipamentos] = useState<Equipamento[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [expandido, setExpandido] = useState<boolean>(true)

  // Modal para escolher e vincular equipamento existente do catálogo
  const [modalVincularAberto, setModalVincularAberto] = useState<boolean>(false)
  const [equipamentoSelecionadoId, setEquipamentoSelecionadoId] = useState<string>('')
  const [quantidade, setQuantidade] = useState<string>('1')
  const [numeroSerie, setNumeroSerie] = useState<string>('')
  const [observacoes, setObservacoes] = useState<string>('')
  const [salvandoVinculo, setSalvandoVinculo] = useState<boolean>(false)

  // Modal para cadastrar novo equipamento no catálogo na hora
  const [modalNovoEquipamentoAberto, setModalNovoEquipamentoAberto] = useState<boolean>(false)

  const carregarDados = async () => {
    if (!usinaId) return
    setLoading(true)
    try {
      const [vinculosData, catalogoData] = await Promise.all([
        fetchEquipamentosPorUsina(usinaId),
        fetchEquipamentos(),
      ])
      setVinculos(vinculosData)
      setCatalogoEquipamentos(catalogoData)
    } catch (err) {
      console.error('Erro ao carregar ativos/equipamentos da usina:', err)
      toast.error('Erro ao carregar relação de ativos da usina.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [usinaId])

  const handleVincularEquipamento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!equipamentoSelecionadoId) {
      toast.warning('Selecione um equipamento do catálogo.')
      return
    }

    setSalvandoVinculo(true)
    try {
      const qtdNum = quantidade ? parseInt(quantidade, 10) : 1
      await vincularEquipamentoUsina({
        usina_id: usinaId,
        equipamento_id: equipamentoSelecionadoId,
        quantidade: isNaN(qtdNum) ? 1 : qtdNum,
        numero_serie: numeroSerie.trim() || undefined,
        observacoes: observacoes.trim() || undefined,
      })

      toast.success('Ativo adicionado à usina com sucesso!')
      setModalVincularAberto(false)
      setEquipamentoSelecionadoId('')
      setQuantidade('1')
      setNumeroSerie('')
      setObservacoes('')
      await carregarDados()
    } catch (err: any) {
      console.error('Erro ao adicionar ativo na usina:', err)
      toast.error('Não foi possível adicionar o ativo. Tente novamente.')
    } finally {
      setSalvandoVinculo(false)
    }
  }

  const handleRemoverVinculo = async (id: string, nomeEq: string) => {
    if (!confirm(`Remover "${nomeEq}" da relação de ativos desta usina?`)) return
    try {
      await desvincularEquipamentoUsina(id)
      toast.success('Ativo desvinculado com sucesso.')
      setVinculos((prev) => prev.filter((v) => v.id !== id))
    } catch (err) {
      console.error('Erro ao remover ativo da usina:', err)
      toast.error('Erro ao remover o ativo da usina.')
    }
  }

  const handleNovoEquipamentoCadastrado = async (novoEquipamento: Equipamento) => {
    // Ao cadastrar um novo equipamento na hora, já vincula automaticamente à usina atual
    try {
      await vincularEquipamentoUsina({
        usina_id: usinaId,
        equipamento_id: novoEquipamento.id,
        quantidade: 1,
      })
      toast.success(`Equipamento "${novoEquipamento.modelo}" cadastrado e vinculado como ativo!`)
    } catch (err) {
      console.error('Equipamento criado mas falhou vínculo automático:', err)
      toast.success(`Equipamento criado no catálogo!`)
    }
    await carregarDados()
  }

  const handleWhatsAppSuporte = (numero: string, _nomeFornecedor?: string) => {
    const limpo = normalizarDigitosDestino(numero)
    if (!limpo || limpo.length < 10) {
      toast.warning('Número de telefone do suporte inválido.')
      return
    }
    const msg = aplicarPrefixoMensagemManual(
      `Olá! Preciso de suporte técnico sobre o equipamento da usina ${usinaNome || ''}.`,
      user?.name,
    )
    window.open(`https://wa.me/${limpo}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  return (
    <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3">
      {/* Cabeçalho da Seção */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-700 text-white shadow-2xs">
            <Cpu className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider">
                Relação de Ativos da Usina
              </span>
              <Badge
                variant="outline"
                className="bg-white text-emerald-800 text-[10px] font-bold border-emerald-300 shadow-2xs"
              >
                {vinculos.length} {vinculos.length === 1 ? 'ativo' : 'ativos'}
              </Badge>
            </div>
            <p className="text-[10px] text-emerald-800">
              Equipamentos fotovoltaicos cadastrados vinculados a esta usina (módulos, inversores,
              etc.)
            </p>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setModalVincularAberto(true)}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1.5 rounded-lg shadow-2xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Ativo</span>
          </button>

          <button
            type="button"
            onClick={() => setModalNovoEquipamentoAberto(true)}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-white hover:bg-emerald-100/70 px-2.5 py-1.5 rounded-lg border border-emerald-300 transition-colors shadow-2xs"
            title="Cadastrar um novo equipamento no catálogo geral e vincular a esta usina"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-600" />
            <span>Novo Equipamento</span>
          </button>

          {vinculos.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setExpandido((prev) => !prev)}
              className="h-7 px-2 text-xs text-emerald-900 hover:bg-emerald-100/50"
            >
              {expandido ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Lista de Ativos Vinculados */}
      {loading ? (
        <div className="py-4 text-center text-xs text-emerald-700 flex items-center justify-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>Carregando relação de ativos...</span>
        </div>
      ) : vinculos.length === 0 ? (
        <div className="p-4 bg-white rounded-xl border border-dashed border-emerald-300 text-xs text-emerald-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-center sm:text-left">
            <p className="font-semibold text-gray-800">
              Nenhum ativo vinculado a esta usina ainda.
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Vincule inversores, módulos ou outros equipamentos cadastrados no catálogo para ter
              acesso direto a datasheets, dataloggers e contatos de suporte.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setModalVincularAberto(true)}
              className="inline-flex items-center gap-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg shadow-2xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Vincular do Catálogo</span>
            </button>
            <button
              type="button"
              onClick={() => setModalNovoEquipamentoAberto(true)}
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200/80 px-3 py-1.5 rounded-lg border border-emerald-300 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Criar Novo</span>
            </button>
          </div>
        </div>
      ) : expandido ? (
        <div className="space-y-2 pt-1">
          {vinculos.map((item) => {
            const eq = item.expand?.equipamento_id
            if (!eq) return null

            const isInversor = eq.tipo === 'inversor'
            const isModulo = eq.tipo === 'modulo_fv'
            const datasheetUrl = getDatasheetEquipamentoUrl(eq)
            const dataloggerUrl = getDataloggerEquipamentoUrl(eq)
            const fornecedor = eq.expand?.fornecedor_id
            const telefoneSuporte =
              eq.telefone_suporte_fornecedor ||
              fornecedor?.telefone_suporte ||
              fornecedor?.whatsapp ||
              fornecedor?.telefone ||
              ''

            return (
              <div
                key={item.id}
                className="p-3 bg-white rounded-xl border border-gray-200 text-xs shadow-2xs hover:border-emerald-300 transition-all flex flex-col gap-2.5"
              >
                {/* Linha superior: Marca, Modelo, Tipo, Potência e Ações */}
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        isInversor
                          ? 'bg-blue-100 text-blue-800'
                          : isModulo
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {isInversor ? (
                        <Cpu className="w-3 h-3" />
                      ) : isModulo ? (
                        <Sun className="w-3 h-3" />
                      ) : (
                        <Wrench className="w-3 h-3" />
                      )}
                      {isInversor ? 'Inversor' : isModulo ? 'Módulo FV' : 'Outro'}
                    </span>

                    <span className="font-bold text-gray-900 text-xs truncate">
                      {eq.marca} {eq.modelo}
                    </span>

                    {eq.potencia_w > 0 && (
                      <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                        {formatarPotenciaEquipamento(eq.potencia_w)}
                      </span>
                    )}

                    {item.quantidade && item.quantidade > 1 && (
                      <span className="font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded text-[10px]">
                        Qtd: {item.quantidade}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleRemoverVinculo(item.id, `${eq.marca} ${eq.modelo}`)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                      title="Remover ativo da usina"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Linha intermediária: Detalhes específicos (S/N, Observações) */}
                {(item.numero_serie || item.observacoes) && (
                  <div className="text-[11px] text-gray-600 flex items-center gap-3 flex-wrap bg-gray-50/70 p-2 rounded-lg border border-gray-100">
                    {item.numero_serie && (
                      <span className="flex items-center gap-1 font-mono">
                        <Hash className="w-3 h-3 text-gray-400" />
                        <span>
                          S/N: <strong>{item.numero_serie}</strong>
                        </span>
                      </span>
                    )}
                    {item.observacoes && (
                      <span className="italic text-gray-500">{item.observacoes}</span>
                    )}
                  </div>
                )}

                {/* Linha inferior: Datasheet, Datalogger e Fornecedor com Suporte */}
                <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-gray-100 text-[11px]">
                  {/* Links: Datasheet & Datalogger */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {datasheetUrl ? (
                      <a
                        href={datasheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg border border-emerald-300 transition-colors"
                        title="Abrir Datasheet do Equipamento"
                      >
                        <FileText className="w-3 h-3 text-emerald-700" />
                        <span>Datasheet</span>
                        <ExternalLink className="w-2.5 h-2.5 text-emerald-600 ml-0.5" />
                      </a>
                    ) : (
                      <span className="text-gray-400 text-[10px] italic">Sem datasheet</span>
                    )}

                    {dataloggerUrl && (
                      <a
                        href={dataloggerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold rounded-lg border border-blue-300 transition-colors"
                        title="Abrir Configuração do Datalogger"
                      >
                        <Settings className="w-3 h-3 text-blue-700" />
                        <span>Configurar Datalogger</span>
                        <ExternalLink className="w-2.5 h-2.5 text-blue-600 ml-0.5" />
                      </a>
                    )}
                  </div>

                  {/* Fornecedor com Telefone / WhatsApp do Suporte ao lado */}
                  {(fornecedor || eq.telefone_suporte_fornecedor) && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-gray-700">
                        <Building2 className="w-3.5 h-3.5 text-gray-400" />
                        <span className="font-semibold">
                          {fornecedor?.nome_empresa || 'Fornecedor Cadastrado'}
                        </span>
                      </div>

                      {telefoneSuporte && (
                        <button
                          type="button"
                          onClick={() =>
                            handleWhatsAppSuporte(telefoneSuporte, fornecedor?.nome_empresa)
                          }
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[10px] shadow-2xs transition-colors"
                          title={`Contatar suporte: ${telefoneSuporte}`}
                        >
                          <Phone className="w-2.5 h-2.5" />
                          <span>{telefoneSuporte}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      {/* Modal Vincular Equipamento do Catálogo */}
      {modalVincularAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-[2px] animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-emerald-50/70">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Adicionar Ativo à Usina</h3>
                  <p className="text-[11px] text-gray-500">
                    Vincule um equipamento já cadastrado no catálogo à usina "{usinaNome}"
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalVincularAberto(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleVincularEquipamento} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="text-[11px] font-bold text-gray-700 uppercase block mb-1">
                  Equipamento do Catálogo *
                </label>
                <select
                  required
                  value={equipamentoSelecionadoId}
                  onChange={(e) => setEquipamentoSelecionadoId(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="">Selecione um equipamento...</option>
                  {catalogoEquipamentos.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      [
                      {eq.tipo === 'inversor'
                        ? 'INVERSOR'
                        : eq.tipo === 'modulo_fv'
                          ? 'MÓDULO'
                          : 'OUTRO'}
                      ] {eq.marca} {eq.modelo}{' '}
                      {eq.potencia_w > 0 ? `(${formatarPotenciaEquipamento(eq.potencia_w)})` : ''}
                    </option>
                  ))}
                </select>
                <div className="flex items-center justify-between mt-1 text-[10px] text-gray-500">
                  <span>Não encontrou na lista?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setModalVincularAberto(false)
                      setModalNovoEquipamentoAberto(true)
                    }}
                    className="text-emerald-700 hover:underline font-bold"
                  >
                    + Cadastrar novo equipamento agora
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-700 uppercase block mb-1">
                    Quantidade
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantidade}
                    onChange={(e) => setQuantidade(e.target.value)}
                    placeholder="Ex: 1"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-700 uppercase block mb-1">
                    Número de Série (S/N)
                  </label>
                  <input
                    type="text"
                    value={numeroSerie}
                    onChange={(e) => setNumeroSerie(e.target.value)}
                    placeholder="Ex: SN98421004"
                    className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-700 uppercase block mb-1">
                  Observações do Ativo
                </label>
                <textarea
                  rows={2}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex: Localizado no telhado leste, string 1..."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalVincularAberto(false)}
                  disabled={salvandoVinculo}
                  className="px-4 py-2 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoVinculo}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {salvandoVinculo ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Adicionar à Usina</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Novo Equipamento no Catálogo (Rápido) */}
      <ModalCadastroEquipamentoRapido
        isOpen={modalNovoEquipamentoAberto}
        onClose={() => setModalNovoEquipamentoAberto(false)}
        tipoInicial="inversor"
        onEquipamentoCadastrado={handleNovoEquipamentoCadastrado}
      />
    </div>
  )
}
