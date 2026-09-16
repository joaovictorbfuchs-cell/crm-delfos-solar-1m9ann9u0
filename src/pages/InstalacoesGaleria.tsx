import React, { useState, useEffect, useRef } from 'react'
import {
  Images,
  Plus,
  Trash2,
  Edit2,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  MapPin,
  Zap,
  RefreshCw,
  Search,
  AlertCircle,
  X,
  FileText,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import type { InstalacaoGaleria } from '@/types/instalacoesGaleria'
import { monitoramentoPngAsset, onGridPngAsset } from '@/lib/propostaIlustracoesAssets'
import {
  fetchInstalacoesGaleria,
  createInstalacaoGaleria,
  updateInstalacaoGaleria,
  deleteInstalacaoGaleria,
  getFotoUrl,
} from '@/services/instalacoesGaleriaService'
import { extractFieldErrors } from '@/lib/pocketbase/errors'

export function InstalacoesGaleriaPage() {
  const [instalacoes, setInstalacoes] = useState<InstalacaoGaleria[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [busca, setBusca] = useState<string>('')

  // Modal / Form state
  const [modalOpen, setModalOpen] = useState<boolean>(false)
  const [editingItem, setEditingItem] = useState<InstalacaoGaleria | null>(null)
  const [titulo, setTitulo] = useState<string>('')
  const [cidade, setCidade] = useState<string>('')
  const [potenciaKwp, setPotenciaKwp] = useState<string>('')
  const [fotoUrl, setFotoUrl] = useState<string>('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const carregar = async () => {
    setLoading(true)
    try {
      const data = await fetchInstalacoesGaleria()
      setInstalacoes(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  const handleOpenCreate = () => {
    setEditingItem(null)
    setTitulo('')
    setCidade('')
    setPotenciaKwp('')
    setFotoUrl('')
    setSelectedFile(null)
    setPreviewUrl('')
    setErrorMessage(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (item: InstalacaoGaleria) => {
    setEditingItem(item)
    setTitulo(item.titulo || '')
    setCidade(item.cidade || '')
    setPotenciaKwp(
      item.potencia_kwp !== undefined && item.potencia_kwp !== null
        ? String(item.potencia_kwp)
        : '',
    )
    setFotoUrl(item.foto_url || '')
    setSelectedFile(null)
    setPreviewUrl(getFotoUrl(item))
    setErrorMessage(null)
    setModalOpen(true)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validação defensiva de tamanho no cliente (máx 25MB)
      const maxBytes = 25 * 1024 * 1024
      if (file.size > maxBytes) {
        const msg = `O arquivo selecionado (${(file.size / (1024 * 1024)).toFixed(1)} MB) ultrapassa o limite máximo de 25 MB. Por favor, selecione uma imagem menor.`
        setErrorMessage(msg)
        toast.error(msg)
        return
      }
      setErrorMessage(null)
      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!titulo.trim()) {
      setErrorMessage('Por favor, preencha o título da usina ou instalação.')
      return
    }

    try {
      setIsSubmitting(true)
      const cleanedPotencia = potenciaKwp.trim().replace(',', '.')
      const potenciaNum = cleanedPotencia ? parseFloat(cleanedPotencia) : null

      if (cleanedPotencia && isNaN(potenciaNum as number)) {
        setErrorMessage(
          'O valor de potência (kWp) informado é inválido. Digite apenas números (ex: 114 ou 123.5).',
        )
        setIsSubmitting(false)
        return
      }

      if (editingItem) {
        await updateInstalacaoGaleria(
          editingItem.id,
          {
            titulo: titulo.trim(),
            cidade: cidade.trim(),
            potencia_kwp: potenciaNum,
            foto_url: fotoUrl.trim(),
          },
          selectedFile || undefined,
        )
        toast.success('Foto da usina atualizada com sucesso!')
      } else {
        await createInstalacaoGaleria(
          {
            titulo: titulo.trim(),
            cidade: cidade.trim(),
            potencia_kwp: potenciaNum,
            foto_url:
              fotoUrl.trim() ||
              (selectedFile
                ? undefined
                : 'https://img.usecurling.com/p/800/600?q=solar+panels&color=green'),
            ordem: instalacoes.length + 1,
            destaque: true,
          },
          selectedFile || undefined,
        )
        toast.success('Foto da usina cadastrada com sucesso na galeria!')
      }

      setModalOpen(false)
      await carregar()
    } catch (err: any) {
      console.error('Erro ao salvar instalação:', err)

      let mensagemDetalhada = 'Falha ao salvar instalação. Verifique os dados e tente novamente.'

      const fieldErrors = extractFieldErrors(err)
      const errorKeys = Object.keys(fieldErrors)

      if (errorKeys.length > 0) {
        const detalhes = errorKeys
          .map((k) => {
            const rotulos: Record<string, string> = {
              titulo: 'Título',
              cidade: 'Cidade',
              potencia_kwp: 'Potência (kWp)',
              foto: 'Arquivo de foto',
              foto_url: 'Link da foto',
              ordem: 'Ordem',
            }
            const nomeCampo = rotulos[k] || k
            return `${nomeCampo}: ${fieldErrors[k]}`
          })
          .join('. ')
        mensagemDetalhada = `Erro de validação: ${detalhes}`
      } else if (err?.message) {
        if (err.message.includes('file too large') || err.message.includes('maxSize')) {
          mensagemDetalhada = 'O arquivo de imagem enviado é muito grande (limite de 25MB).'
        } else if (err.message.includes('mime') || err.message.includes('type')) {
          mensagemDetalhada =
            'O formato da imagem não é suportado. Envie em JPG, PNG, WEBP ou HEIC.'
        } else {
          mensagemDetalhada = `Erro do servidor: ${err.message}`
        }
      }

      setErrorMessage(mensagemDetalhada)
      toast.error(mensagemDetalhada)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (item: InstalacaoGaleria) => {
    if (window.confirm(`Deseja realmente remover "${item.titulo}" da biblioteca?`)) {
      try {
        await deleteInstalacaoGaleria(item.id)
        toast.success('Instalação removida com sucesso.')
        await carregar()
      } catch (err: any) {
        console.error('Erro ao deletar:', err)
        toast.error('Não foi possível remover o item da galeria.')
      }
    }
  }

  const filtrados = instalacoes.filter((item) => {
    if (!busca) return true
    const term = busca.toLowerCase()
    return (
      item.titulo.toLowerCase().includes(term) ||
      (item.cidade && item.cidade.toLowerCase().includes(term))
    )
  })

  return (
    <div className="space-y-5 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#166534] to-[#16A34A] text-white flex items-center justify-center shadow-xs">
              <Images className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                Biblioteca de Instalações Fotovoltaicas
              </h1>
              <p className="text-xs text-gray-500">
                Fotos de usinas homologadas para inclusão automática na galeria da proposta
                comercial (até 6 em grade)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={carregar}
            className="p-2 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl border border-gray-200 transition-colors"
            title="Atualizar lista"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl shadow-xs transition-all hover:shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Foto de Usina</span>
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div className="text-xs text-emerald-950 space-y-0.5">
          <span className="font-bold">Como funciona na Proposta Técnico-Comercial:</span>
          <p className="text-emerald-800">
            Na montagem da proposta comercial, você pode marcar até 6 fotos desta galeria. Elas
            serão organizadas em uma grade de 3 colunas logo abaixo da seção{' '}
            <strong>Quem Somos</strong>, exibindo o título de cada usina como legenda profissional.
          </p>
        </div>
      </div>

      {/* Busca */}
      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por título ou cidade..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <span className="text-xs text-gray-500 font-medium">
          Total: <strong>{filtrados.length}</strong> instalações
        </span>
      </div>

      {/* SEÇÃO ESPECIAL: ILUSTRAÇÕES EXPLICATIVAS DA PROPOSTA */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-md border border-emerald-800/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                Ilustrações Oficiais da Proposta Comercial
                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Página 2 • Automáticas
                </span>
              </h2>
              <p className="text-[11px] text-gray-300">
                Estas ilustrações já ficam disponíveis na proposta comercial e podem ser
                ativadas/desativadas na geração do PDF.
              </p>
            </div>
          </div>
          <span className="text-[11px] text-emerald-300 font-semibold bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 self-start sm:self-auto flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />2 Ilustrações Integradas
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Como Funciona o Sistema On-Grid */}
          <div className="bg-white/10 rounded-xl p-3.5 border border-white/10 flex flex-col justify-between backdrop-blur-xs">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white">
                  1. Como Funciona o Sistema Solar On-Grid
                </span>
                <span className="text-[10px] font-bold text-emerald-300 bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-500/30">
                  Ilustração do Usuário
                </span>
              </div>
              <p className="text-[11px] text-gray-300 leading-relaxed mb-3">
                Diagrama explicativo ilustrando módulos, inversor, medidor bidirecional, rede da
                concessionária, consumo da casa e funcionamento à noite.
              </p>
              <div className="rounded-lg overflow-hidden border border-white/20 bg-white aspect-[16/9] flex items-center justify-center p-1">
                <img
                  src={onGridPngAsset}
                  alt="Como Funciona o Sistema Solar On-Grid"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-gray-300">
              <span className="text-emerald-400 font-semibold">✓ Inclusa na proposta</span>
              <span>Formato de alta definição</span>
            </div>
          </div>

          {/* Card 2: Monitoramento em Tempo Real */}
          <div className="bg-white/10 rounded-xl p-3.5 border border-white/10 flex flex-col justify-between backdrop-blur-xs">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white">
                  2. Monitoramento do Sistema Solar em Tempo Real
                </span>
                <span className="text-[10px] font-bold text-blue-300 bg-blue-900/60 px-2 py-0.5 rounded border border-blue-500/30">
                  Foto Realista
                </span>
              </div>
              <p className="text-[11px] text-gray-300 leading-relaxed mb-3">
                Dashboard de telemetria no iPhone: geração agora (kW), energia gerada hoje (kWh),
                economia no mês em R$, créditos de energia e gráfico com curva solar diária.
              </p>
              <div className="rounded-lg overflow-hidden border border-white/20 bg-slate-900/40 aspect-[16/9] flex items-center justify-center p-1">
                <img
                  src={monitoramentoPngAsset}
                  alt="Monitoramento Solar em Tempo Real pelo Celular"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-gray-300">
              <span className="text-blue-400 font-semibold">✓ Inclusa na proposta</span>
              <span>Foto em alta resolução para proposta comercial</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grade de Fotos */}
      {loading ? (
        <div className="py-16 text-center text-gray-400 text-xs">
          Carregando fotos da galeria...
        </div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
          <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-800">Nenhuma instalação encontrada</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
            Adicione fotos com os títulos das usinas já entregues pela Delfos Solar.
          </p>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#16A34A] text-white text-xs font-bold rounded-xl hover:bg-[#15803D]"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Primeira Usina</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtrados.map((item) => {
            const url = getFotoUrl(item)
            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden flex flex-col group hover:shadow-md transition-shadow"
              >
                {/* Imagem */}
                <div className="relative aspect-[16/10] bg-gray-100 overflow-hidden">
                  <img
                    src={url}
                    alt={item.titulo}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  {item.potencia_kwp && (
                    <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-800/90 text-white backdrop-blur-xs flex items-center gap-1 shadow-sm">
                      <Zap className="w-3 h-3 text-amber-300" />
                      {item.potencia_kwp} kWp
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm line-clamp-2 leading-snug">
                      {item.titulo}
                    </h3>
                    {item.cidade && (
                      <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        {item.cidade}
                      </p>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Disponível na Proposta
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Criar / Editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-[2px] animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-emerald-50/50">
              <h2 className="text-sm sm:text-base font-bold text-gray-900">
                {editingItem ? 'Editar Foto da Usina' : 'Cadastrar Foto de Usina Instalada'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
              {/* Alerta de erro na UI */}
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3 flex items-start gap-2.5 text-xs">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">Não foi possível salvar</p>
                    <p className="text-red-700 mt-0.5">{errorMessage}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setErrorMessage(null)}
                    className="text-red-400 hover:text-red-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Título */}
              <div>
                <label className="text-[11px] font-bold text-gray-700 uppercase block mb-1">
                  Título da Usina / Legenda na Proposta *
                </label>
                <input
                  type="text"
                  required
                  value={titulo}
                  onChange={(e) => {
                    setTitulo(e.target.value)
                    if (errorMessage) setErrorMessage(null)
                  }}
                  placeholder="Ex: Usina Cassul 185 Kwp Erechim"
                  className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-gray-400 block mt-0.5">
                  Este texto aparecerá exatamente como legenda abaixo da foto na proposta.
                </span>
              </div>

              {/* Cidade & Potência */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                    Cidade / UF
                  </label>
                  <input
                    type="text"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    placeholder="Ex: Erechim/RS"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                    Potência (kWp)
                  </label>
                  <input
                    type="text"
                    value={potenciaKwp}
                    onChange={(e) => setPotenciaKwp(e.target.value)}
                    placeholder="Ex: 185"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Upload de Imagem */}
              <div>
                <label className="text-[11px] font-bold text-gray-700 uppercase block mb-1">
                  Foto da Usina (Upload do arquivo ou Link)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-lg inline-flex items-center gap-1.5 transition-colors border border-gray-200 active:scale-95"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Selecionar do Computador</span>
                  </button>
                  {selectedFile ? (
                    <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                      <span className="text-[11px] text-emerald-800 font-semibold truncate max-w-[180px]">
                        {selectedFile.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null)
                          if (editingItem) {
                            setPreviewUrl(getFotoUrl(editingItem))
                          } else if (fotoUrl) {
                            setPreviewUrl(fotoUrl)
                          } else {
                            setPreviewUrl('')
                          }
                          if (fileInputRef.current) fileInputRef.current.value = ''
                        }}
                        className="text-emerald-600 hover:text-red-600 p-0.5 rounded"
                        title="Remover arquivo selecionado"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : null}
                </div>
                <span className="text-[10px] text-gray-400 block mt-1">
                  Suporta JPG, PNG, WEBP e fotos de drones DJI / celulares (até 25 MB).
                </span>

                <div className="mt-2">
                  <label className="text-[10px] text-gray-500 block mb-0.5">
                    Ou informe uma URL direta de imagem (opcional):
                  </label>
                  <input
                    type="text"
                    value={fotoUrl}
                    onChange={(e) => {
                      setFotoUrl(e.target.value)
                      if (e.target.value) setPreviewUrl(e.target.value)
                    }}
                    placeholder="https://..."
                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Preview da Imagem */}
              {previewUrl && (
                <div>
                  <span className="text-[11px] font-semibold text-gray-600 block mb-1">
                    Pré-visualização:
                  </span>
                  <div className="relative aspect-[16/10] bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
                    <img
                      src={previewUrl}
                      alt="Pré-visualização"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              {/* Ações */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Instalação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default InstalacoesGaleriaPage
