import React, { useState, useMemo, useRef } from 'react'
import {
  Smartphone,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Download,
  Sparkles,
  RefreshCw,
  PhoneCall,
  UserCheck,
  UserX,
  ArrowRight,
  HelpCircle,
  ClipboardPaste,
  ShieldCheck,
  Check,
  RotateCcw,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import {
  parseContatosCsv,
  processarContatosComClientes,
  CSV_EXEMPLO_DEMONSTRACAO,
  ItemImportacaoContatoCelular,
  ContatoCsvRaw,
} from '@/services/importacaoContatosCelularService'
import { formatWhatsAppPhone } from '@/lib/formatters'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function ImportarContatosCelular() {
  const { clientes, isLoading: isLoadingClientes, updateCliente } = useClientes()

  // Arquivo / Dados Carregados
  const [nomeArquivo, setNomeArquivo] = useState<string>('')
  const [contatosBrutos, setContatosBrutos] = useState<ContatoCsvRaw[]>([])
  const [textoManual, setTextoManual] = useState<string>('')
  const [modoAba, setModoAba] = useState<'upload' | 'colar'>('upload')
  const [isProcessando, setIsProcessando] = useState<boolean>(false)

  // Mapa de telefones atualizados no banco nesta sessão: clienteId -> novoTelefone
  const [telefonesAtualizadosMap, setTelefonesAtualizadosMap] = useState<Record<string, string>>({})

  // Estado do diálogo de confirmação
  const [itemParaAtualizar, setItemParaAtualizar] = useState<ItemImportacaoContatoCelular | null>(
    null,
  )
  const [isConfirmandoAtualizacao, setIsConfirmandoAtualizacao] = useState<boolean>(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Processa itens com status de correspondência no CRM em tempo real
  const itensProcessados = useMemo<ItemImportacaoContatoCelular[]>(() => {
    if (contatosBrutos.length === 0) return []
    return processarContatosComClientes(contatosBrutos, clientes, telefonesAtualizadosMap)
  }, [contatosBrutos, clientes, telefonesAtualizadosMap])

  // Contadores do Resumo
  const resumo = useMemo(() => {
    const totalContatos = itensProcessados.length
    const clientesEncontrados = itensProcessados.filter((i) => i.status === 'encontrado').length
    const telefonesAtualizados = Object.keys(telefonesAtualizadosMap).length
    const naoEncontrados = itensProcessados.filter((i) => i.status === 'nao_encontrado').length

    return {
      totalContatos,
      clientesEncontrados,
      telefonesAtualizados,
      naoEncontrados,
    }
  }, [itensProcessados, telefonesAtualizadosMap])

  // Handler de leitura de arquivo
  const handleLerArquivo = async (file: File) => {
    if (
      !file.name.toLowerCase().endsWith('.csv') &&
      file.type !== 'text/csv' &&
      file.type !== 'text/plain'
    ) {
      toast.error('Por favor, selecione um arquivo no formato .csv')
      return
    }

    setIsProcessando(true)
    try {
      const text = await file.text()
      const parsed = parseContatosCsv(text)
      if (parsed.length === 0) {
        toast.error('Nenhum contato encontrado no arquivo. Verifique o cabeçalho "nome,telefone".')
        setIsProcessando(false)
        return
      }
      setNomeArquivo(file.name)
      setContatosBrutos(parsed)
      toast.success(`${parsed.length} contatos carregados com sucesso do arquivo ${file.name}!`)
    } catch (err: unknown) {
      console.error('Erro ao ler CSV:', err)
      toast.error('Falha ao processar o arquivo CSV.')
    } finally {
      setIsProcessando(false)
    }
  }

  // Carregar dados de exemplo com 5 contatos (3 encontrados, 2 não encontrados)
  const handleCarregarExemplo = () => {
    setIsProcessando(true)
    setTimeout(() => {
      const parsed = parseContatosCsv(CSV_EXEMPLO_DEMONSTRACAO)
      setNomeArquivo('exemplo_contatos_celular_5.csv')
      setTextoManual(CSV_EXEMPLO_DEMONSTRACAO)
      setContatosBrutos(parsed)
      setIsProcessando(false)
      toast.success(
        'CSV de exemplo carregado: 5 contatos (3 clientes reais do CRM + 2 não cadastrados)!',
      )
    }, 150)
  }

  // Baixar CSV de exemplo como arquivo
  const handleBaixarCsvExemplo = () => {
    try {
      const blob = new Blob([CSV_EXEMPLO_DEMONSTRACAO], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', 'exemplo_contatos_celular.csv')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success('Download do arquivo de exemplo iniciado!')
    } catch (e) {
      console.error('Erro ao baixar arquivo:', e)
      toast.error('Não foi possível fazer download do arquivo.')
    }
  }

  // Processar texto colado manualmente
  const handleProcessarTextoColado = () => {
    if (!textoManual.trim()) {
      toast.error('Cole o conteúdo CSV com nome e telefone no campo de texto.')
      return
    }
    const parsed = parseContatosCsv(textoManual)
    if (parsed.length === 0) {
      toast.error('Não foi possível identificar contatos no texto informado.')
      return
    }
    setNomeArquivo('contatos_colados.csv')
    setContatosBrutos(parsed)
    toast.success(`${parsed.length} contatos processados a partir do texto informado!`)
  }

  // Limpar dados para nova importação
  const handleLimparDados = () => {
    setNomeArquivo('')
    setContatosBrutos([])
    setTextoManual('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Solicitar atualização com confirmação
  const handleAbrirConfirmacao = (item: ItemImportacaoContatoCelular) => {
    setItemParaAtualizar(item)
  }

  // Aplicar atualização no banco de dados via updateCliente
  const handleConfirmarAtualizacao = async () => {
    if (!itemParaAtualizar || !itemParaAtualizar.clienteId) return

    setIsConfirmandoAtualizacao(true)
    try {
      const novoTelefone = itemParaAtualizar.telefoneCsv
      await updateCliente(itemParaAtualizar.clienteId, {
        telefone: novoTelefone,
      })

      // Marca localmente como atualizado
      setTelefonesAtualizadosMap((prev) => ({
        ...prev,
        [itemParaAtualizar.clienteId!]: novoTelefone,
      }))

      toast.success(
        `Telefone do cliente "${itemParaAtualizar.clienteNome}" atualizado para ${novoTelefone}!`,
      )
      setItemParaAtualizar(null)
    } catch (err: unknown) {
      console.error('Erro ao atualizar telefone do cliente:', err)
      toast.error('Erro ao salvar novo telefone no cadastro do cliente.')
    } finally {
      setIsConfirmandoAtualizacao(false)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 shadow-xs border border-emerald-200">
            <Smartphone className="w-6 h-6 text-[#16A34A]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              Importar Contatos do Celular
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Faça upload de contatos exportados do smartphone, compare números com a base do CRM e
              atualize cadastros com segurança.
            </p>
          </div>
        </div>

        {/* Botões de Apoio Rápido */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleCarregarExemplo}
            disabled={isProcessando}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#166534] border border-emerald-200 text-xs font-semibold shadow-2xs transition-all hover:scale-[1.01]"
            title="Carregar 5 contatos de exemplo (3 encontrados no CRM e 2 novos)"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#16A34A]" />
            <span>Carregar Dados de Exemplo</span>
          </button>

          <button
            type="button"
            onClick={handleBaixarCsvExemplo}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-xs font-semibold shadow-2xs transition-all"
            title="Baixar arquivo CSV de exemplo para teste local"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            <span>Baixar CSV de Exemplo</span>
          </button>
        </div>
      </div>

      {/* Cartão de Resumo em Tempo Real (Contadores) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Contatos importados */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-gray-500 font-medium">Contatos no CSV</div>
            <div className="text-2xl font-bold text-gray-900">{resumo.totalContatos}</div>
          </div>
        </div>

        {/* Clientes encontrados */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-gray-500 font-medium">Clientes Encontrados</div>
            <div className="text-2xl font-bold text-emerald-700">{resumo.clientesEncontrados}</div>
          </div>
        </div>

        {/* Clientes não encontrados */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center shrink-0">
            <UserX className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-gray-500 font-medium">Não Encontrados</div>
            <div className="text-2xl font-bold text-gray-600">{resumo.naoEncontrados}</div>
          </div>
        </div>

        {/* Telefones atualizados */}
        <div className="bg-white rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/40 to-white p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#16A34A] text-white flex items-center justify-center shrink-0 shadow-xs">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-emerald-800 font-medium">Telefones Atualizados</div>
            <div className="text-2xl font-black text-emerald-800">
              {resumo.telefonesAtualizados}
            </div>
          </div>
        </div>
      </div>

      {/* Caixa de Entrada: Upload ou Colar CSV */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg bg-gray-100 p-0.5">
              <button
                type="button"
                onClick={() => setModoAba('upload')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  modoAba === 'upload'
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Upload de Arquivo CSV
              </button>
              <button
                type="button"
                onClick={() => setModoAba('colar')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  modoAba === 'colar'
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                Colar Texto CSV
              </button>
            </div>
            {nomeArquivo && (
              <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md font-mono">
                {nomeArquivo}
              </span>
            )}
          </div>

          {contatosBrutos.length > 0 && (
            <button
              type="button"
              onClick={handleLimparDados}
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar e recomeçar</span>
            </button>
          )}
        </div>

        <div className="p-5">
          {modoAba === 'upload' ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              onDrop={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleLerArquivo(e.dataTransfer.files[0])
                }
              }}
              className="border-2 border-dashed border-gray-300 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-2xl p-8 text-center cursor-pointer transition-all group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,text/plain"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleLerArquivo(e.target.files[0])
                  }
                }}
              />
              <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 text-[#16A34A] group-hover:bg-emerald-100 flex items-center justify-center transition-colors mb-3">
                <UploadCloud className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">
                Clique para selecionar ou arraste o arquivo CSV aqui
              </h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto mb-3">
                Formatos aceitos: <strong>.csv</strong> com colunas <code>nome</code> e{' '}
                <code>telefone</code> (ou separador por vírgula / ponto-e-vírgula).
              </p>
              <div className="inline-flex items-center gap-2 text-[11px] text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-200">
                <span>Normalização inteligente: aceita com ou sem máscara, DDI +55 e DDD.</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-gray-700">
                Cole o conteúdo do CSV ou lista de contatos:
              </label>
              <textarea
                value={textoManual}
                onChange={(e) => setTextoManual(e.target.value)}
                placeholder="Nome,Telefone&#10;Marcelo Becker,(54) 99712-8844&#10;Maria Santos,+55 54 99812-3456"
                rows={5}
                className="w-full text-xs font-mono p-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none resize-y"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleProcessarTextoColado}
                  disabled={!textoManual.trim() || isProcessando}
                  className="px-4 py-2 rounded-xl bg-[#16A34A] hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                >
                  Processar Contatos Colados
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lista de Contatos Importados com Comparação e Ações */}
      {itensProcessados.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span>Lista de Contatos Importados</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-gray-100 text-gray-700">
                  {itensProcessados.length} contatos
                </span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Revise os contatos encontrados e clique para atualizar o telefone do cliente no CRM.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                {resumo.clientesEncontrados} encontrados
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-gray-500">
                <AlertCircle className="w-3.5 h-3.5 text-gray-400" />
                {resumo.naoEncontrados} não encontrados
              </span>
              {isLoadingClientes && (
                <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full text-[11px] font-medium border border-amber-200">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Carregando clientes do CRM...
                </span>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px] font-bold">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Nome no CSV</th>
                  <th className="py-3 px-4">Telefone no CSV</th>
                  <th className="py-3 px-4">Status no CRM</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {itensProcessados.map((item, idx) => {
                  const isEncontrado = item.status === 'encontrado'
                  const isAtualizado = item.telefoneAtualizado

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-gray-50/60 transition-colors ${
                        isAtualizado ? 'bg-emerald-50/30' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 text-gray-400 font-mono text-[11px]">{idx + 1}</td>

                      <td className="py-3.5 px-4 font-semibold text-gray-900">{item.nomeCsv}</td>

                      <td className="py-3.5 px-4">
                        {item.telefoneCsv ? (
                          <>
                            <div className="font-mono text-gray-700 font-medium">
                              {item.telefoneCsv}
                            </div>
                            {item.telefoneCsvNormalizado && (
                              <div className="text-[10px] text-gray-400">
                                Normalizado: {formatWhatsAppPhone(item.telefoneCsvNormalizado)}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-400 text-xs italic">Sem telefone</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {isEncontrado ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                              Cliente encontrado
                            </span>
                            <div className="text-xs text-gray-900 font-medium pl-1">
                              Cliente no CRM: <strong>{item.clienteNome}</strong>
                            </div>
                            {item.clienteTelefoneAtual && (
                              <div className="text-[11px] text-gray-500 pl-1">
                                Telefone atual no cadastro:{' '}
                                <span className="font-mono">{item.clienteTelefoneAtual}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                            <UserX className="w-3.5 h-3.5 text-gray-400" />
                            Cliente não encontrado
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {isEncontrado ? (
                          isAtualizado ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
                              <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                              Telefone atualizado
                            </span>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleAbrirConfirmacao(item)}
                              className="bg-[#16A34A] hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs h-8 px-3 rounded-lg inline-flex items-center gap-1.5 transition-all"
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                              <span>Atualizar telefone do cliente</span>
                            </Button>
                          )
                        ) : (
                          <span className="text-gray-400 text-xs italic">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Caixa de Ajuda / Instruções Delfos Solar */}
      <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 text-xs text-emerald-950 flex items-start gap-3">
        <HelpCircle className="w-5 h-5 text-[#16A34A] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-[#166534]">Como funciona o comparador inteligente?</p>
          <p className="text-gray-600 leading-relaxed">
            Ao carregar contatos exportados de agendas como Google Contatos, iOS ou WhatsApp, o
            sistema remove formatações de máscaras, pontuações, código de país (+55) e zeros
            iniciais para encontrar clientes mesmo quando o número estiver salvo como celular direto
            ou com código internacional. Nenhum telefone é sobrescrito sem a sua confirmação
            explícita.
          </p>
        </div>
      </div>

      {/* Diálogo de Confirmação Obrigatório */}
      <Dialog
        open={Boolean(itemParaAtualizar)}
        onOpenChange={(open) => {
          if (!open && !isConfirmandoAtualizacao) {
            setItemParaAtualizar(null)
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-[#166534] flex items-center justify-center mb-2">
              <ShieldCheck className="w-5 h-5 text-[#16A34A]" />
            </div>
            <DialogTitle className="text-base font-bold text-gray-900">
              Confirmar atualização de telefone
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-600 pt-2 leading-relaxed">
              O telefone do cliente{' '}
              <strong className="text-gray-900 font-bold">{itemParaAtualizar?.clienteNome}</strong>{' '}
              será atualizado para{' '}
              <strong className="text-emerald-700 font-mono font-bold">
                {itemParaAtualizar?.telefoneCsv}
              </strong>
              . Confirma?
            </DialogDescription>
          </DialogHeader>

          {itemParaAtualizar?.clienteTelefoneAtual && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-600 flex items-center justify-between">
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold">
                  Telefone cadastrado anteriormente:
                </span>
                <span className="font-mono text-gray-800 font-medium">
                  {itemParaAtualizar.clienteTelefoneAtual}
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
              <div className="text-right">
                <span className="text-emerald-600 block text-[10px] uppercase font-bold">
                  Novo número do CSV:
                </span>
                <span className="font-mono text-emerald-800 font-bold">
                  {itemParaAtualizar.telefoneCsv}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={isConfirmandoAtualizacao}
              onClick={() => setItemParaAtualizar(null)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isConfirmandoAtualizacao}
              onClick={handleConfirmarAtualizacao}
              className="bg-[#16A34A] hover:bg-emerald-700 text-white text-xs font-bold gap-1.5"
            >
              {isConfirmandoAtualizacao ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Atualizando...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Confirmar</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
