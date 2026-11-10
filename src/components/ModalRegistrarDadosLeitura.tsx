import React, { useState, useRef, useEffect } from 'react'
import {
  X,
  CheckCircle2,
  UploadCloud,
  FileText,
  Loader2,
  Image as ImageIcon,
  Trash2,
  AlertCircle,
  Sparkles,
  Send,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import type { Atividade, Cliente } from '@/types/crm'
import { formatarDataParaDDMMAAAA } from '@/services/autoLeituraService'

export interface ModalRegistrarDadosLeituraProps {
  isOpen: boolean
  onClose: () => void
  atividade: Atividade
  cliente?: Cliente | null
  onSalvoSucesso?: (atividadeAtualizada?: Atividade) => void
}

const MAX_FILE_SIZE = 15 * 1024 * 1024 // 15MB

export const ModalRegistrarDadosLeitura: React.FC<ModalRegistrarDadosLeituraProps> = ({
  isOpen,
  onClose,
  atividade,
  cliente,
  onSalvoSucesso,
}) => {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const clienteNome = cliente?.nome || atividade.expand?.cliente_id?.nome || 'Cliente'
  const dataLeituraStr = atividade.data_leitura || atividade.data || ''
  const dataVencimentoFormatada = dataLeituraStr
    ? formatarDataParaDDMMAAAA(dataLeituraStr.slice(0, 10))
    : ''

  const [textoDados, setTextoDados] = useState(atividade.dados_leitura_registrados || '')
  const [fotoArquivo, setFotoArquivo] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [erroValidacao, setErroValidacao] = useState<string | null>(null)
  // Campos de leitura para enviar a RGE
  const [valor03, setValor03] = useState(atividade.valor_grandeza_03 || '')
  const [valorA3, setValorA3] = useState(atividade.valor_grandeza_103 || '')
  const [telefoneSolicitante, setTelefoneSolicitante] = useState(
    cliente?.whatsapp || cliente?.telefone || cliente?.titular_telefone || '',
  )
  const [enviandoRGE, setEnviandoRGE] = useState(false)
  const [protocoloRGE, setProtocoloRGE] = useState(atividade.protocolo_rge || '')
  const [dataEnvioLeitura, setDataEnvioLeitura] = useState<string>(
    atividade.data_leitura || atividade.updated || '',
  )

  useEffect(() => {
    if (isOpen) {
      setTextoDados(atividade.dados_leitura_registrados || '')
      setFotoArquivo(null)
      setFotoPreview(null)
      setErroValidacao(null)
      setValor03(atividade.valor_grandeza_03 || '')
      setValorA3(atividade.valor_grandeza_103 || '')
      setTelefoneSolicitante(
        cliente?.whatsapp || cliente?.telefone || cliente?.titular_telefone || '',
      )
      setProtocoloRGE(atividade.protocolo_rge || '')
      setDataEnvioLeitura(atividade.data_leitura || atividade.updated || '')

      // Se já tiver foto_medidor gravada no backend, monta url de preview
      if (atividade.foto_medidor && atividade.id) {
        const url = pb.files.getURL(atividade, atividade.foto_medidor)
        setFotoPreview(url)
      }
    }
  }, [isOpen, atividade, cliente])

  if (!isOpen) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setErroValidacao('Selecione um arquivo de imagem válido (JPEG, PNG, WebP).')
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setErroValidacao('A imagem deve ter no máximo 15MB.')
      return
    }

    setErroValidacao(null)
    setFotoArquivo(file)
    const previewUrl = URL.createObjectURL(file)
    setFotoPreview(previewUrl)
  }

  const handleRemoverFoto = () => {
    setFotoArquivo(null)
    setFotoPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handlePreencherExemplo = () => {
    const hojeStr = new Date().toLocaleDateString('pt-BR')
    const exemplo = `Leitura do medidor: 45890 kWh\nProtocolo RGE: 2027-${Math.floor(1000 + Math.random() * 9000)}\nData do envio à RGE: ${hojeStr}\nObservações: Relógio conferido e dados validados com sucesso.`
    setTextoDados(exemplo)
  }

  // Envia a leitura para a RGE pelo robo (fila no CRM)
  const handleEnviarRGE = async () => {
    const l03 = String(valor03 || '').replace(/\D/g, '')
    const lA3 = String(valorA3 || '').replace(/\D/g, '')
    const tel = String(telefoneSolicitante || '').replace(/\D/g, '')
    const ucLimpa = String(atividade.numero_uc || cliente?.uc || '').replace(/\D/g, '')

    if (!ucLimpa) {
      setErroValidacao('Informe a UC da unidade consumidora.')
      return
    }
    if (!l03) {
      setErroValidacao('Informe a leitura do totalizador 03 (Consumo ativo).')
      return
    }
    if (l03.length > 5) {
      setErroValidacao('A leitura 03 tem no máximo 5 dígitos.')
      return
    }
    if (lA3.length > 5) {
      setErroValidacao('A leitura A3 tem no máximo 5 dígitos.')
      return
    }
    if (tel.length > 0 && tel.length < 10) {
      setErroValidacao('Telefone do solicitante deve ter DDD e no mínimo 10 dígitos.')
      return
    }

    try {
      setEnviandoRGE(true)
      setErroValidacao(null)
      const token = pb.authStore.token
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`${pb.baseUrl}/backend/v1/rge/leitura-solicitar`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          atividade_id: atividade.id,
          uc: ucLimpa,
          valor_03: l03,
          valor_a3: lA3 || undefined,
          telefone: tel || (cliente?.telefone || '').replace(/\D/g, ''),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)

      // Atualiza valores locais
      if (json.valor_03) setValor03(json.valor_03)
      if (json.valor_a3) setValorA3(json.valor_a3)
      if (json.protocolo) {
        setProtocoloRGE(json.protocolo)
        setDataEnvioLeitura(new Date().toISOString())
      }

      toast({
        title: 'Leitura enviada para a fila RGE',
        description: `03=${json.valor_03 || l03}${json.valor_a3 || lA3 ? ` · A3=${json.valor_a3 || lA3}` : ''}. O robô envia ao portal em instantes.`,
      })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao enviar a leitura.'
      setErroValidacao(msg)
      toast({ title: 'Não foi possível enviar', description: msg, variant: 'destructive' })
    } finally {
      setEnviandoRGE(false)
    }
  }

  const handleSalvar = async () => {
    try {
      setIsSubmitting(true)
      setErroValidacao(null)

      // 1. Atualizar a atividade filha:
      // status: 'concluida', dados_leitura_registrados, foto_medidor (se houver)
      const formData = new FormData()
      formData.append('status', 'concluida')
      if (textoDados.trim()) {
        formData.append('dados_leitura_registrados', textoDados.trim())
      } else if (valor03.trim() || valorA3.trim() || protocoloRGE.trim()) {
        const resumo = `03: ${valor03.trim() || '—'} | A3: ${valorA3.trim() || '—'}${protocoloRGE ? ` | Protocolo: ${protocoloRGE}` : ''}`
        formData.append('dados_leitura_registrados', resumo)
      }
      // gravar os valores de leitura na atividade
      if (valor03.trim()) formData.append('valor_grandeza_03', valor03.trim())
      if (valorA3.trim()) formData.append('valor_grandeza_103', valorA3.trim())
      if (protocoloRGE.trim()) formData.append('protocolo_rge', protocoloRGE.trim())

      if (fotoArquivo) {
        formData.append('foto_medidor', fotoArquivo)
      }

      const filhaAtualizada = await pb
        .collection('atividades')
        .update<Atividade>(atividade.id, formData as any, {
          expand: 'cliente_id,usina_id,responsavel_id,parent_id',
        })

      // 2. Se a filha possuir parent_id (atividade mãe 'auto_leitura_rge'):
      // Conclui a mãe automaticamente e copia os dados registrados para auto_leitura_obs
      const parentId = atividade.parent_id || (atividade.expand?.parent_id?.id as string)

      if (parentId) {
        try {
          const maeRecord = await pb.collection('atividades').getOne<Atividade>(parentId)

          const textoFilha = textoDados.trim()
          const dataInfo = dataVencimentoFormatada ? ` [Leitura ${dataVencimentoFormatada}]` : ''
          const timestamp = new Date().toLocaleString('pt-BR')
          const novoRegistro = `[Registro em ${timestamp}${dataInfo}]:\n${textoFilha}`

          let obsAtual = maeRecord.auto_leitura_obs || maeRecord.descricao || ''
          let novaObs = obsAtual ? `${obsAtual}\n\n---\n${novoRegistro}` : novoRegistro

          // Conclui a atividade mãe e copia os dados para auto_leitura_obs
          await pb.collection('atividades').update(parentId, {
            status: 'concluida',
            auto_leitura_obs: novaObs,
            dados_leitura_registrados: textoFilha,
          })
        } catch (maeErr) {
          console.warn('Aviso ao sincronizar dados com atividade mãe:', maeErr)
        }
      }

      toast({
        title: 'Dados da leitura registrados com sucesso!',
        description: 'Atividade filha concluída e dados sincronizados com a atividade mãe.',
      })

      if (onSalvoSucesso) {
        onSalvoSucesso(filhaAtualizada)
      }

      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao registrar dados da leitura.'
      console.error('Erro ao salvar dados de leitura:', err)
      setErroValidacao(msg)
      toast({
        title: 'Erro ao registrar leitura',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={isSubmitting ? undefined : onClose}
        aria-hidden="true"
      />

      <div className="relative z-50 w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Cabeçalho */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-900 to-indigo-800 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <FileText className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white leading-tight">
                Registrar Dados da Leitura
              </h2>
              <p className="text-[11px] text-indigo-100">
                Conclui a filha e sincroniza com a atividade mãe
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
          {/* Informações da Atividade */}
          <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between gap-2 text-indigo-950">
            <div>
              <span className="font-bold block text-[11px]">{clienteNome}</span>
              <span className="text-[10px] text-indigo-800">
                {dataVencimentoFormatada
                  ? `Data programada: ${dataVencimentoFormatada}`
                  : 'Lembrete de Auto Leitura'}
                {atividade.numero_uc ? ` • UC: ${atividade.numero_uc}` : ''}
              </span>
            </div>
            <span className="text-[10px] font-bold text-indigo-800 bg-white px-2 py-0.5 rounded-full border border-indigo-200 shadow-2xs">
              Filha de Auto Leitura
            </span>
          </div>

          {/* Protocolo e valores retornados (se preenchido na atividade) */}
          {protocoloRGE ? (
            <div className="p-3 bg-emerald-50/80 border border-emerald-300 rounded-xl space-y-2 text-emerald-950">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">
                  Leitura Concluída e Registrada na RGE
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Concluída
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-white border border-emerald-200">
                  <span className="text-[10px] text-emerald-700 block font-medium">
                    Protocolo RGE
                  </span>
                  <span className="font-mono font-bold text-gray-900 break-all">
                    {protocoloRGE}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white border border-emerald-200">
                  <span className="text-[10px] text-emerald-700 block font-medium">
                    Data / Hora
                  </span>
                  <span className="font-bold text-gray-900">
                    {dataEnvioLeitura
                      ? new Date(dataEnvioLeitura.replace(' ', 'T')).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white border border-emerald-200">
                  <span className="text-[10px] text-emerald-700 block font-medium">
                    03 — Consumo ativo
                  </span>
                  <span className="font-mono font-bold text-gray-900 tracking-widest">
                    {valor03 || '—'}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white border border-emerald-200">
                  <span className="text-[10px] text-emerald-700 block font-medium">
                    A3 — Ativo reverso
                  </span>
                  <span className="font-mono font-bold text-gray-900 tracking-widest">
                    {valorA3 || '—'}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          {/* Campos de leitura 03, A3 e Telefone do solicitante */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-gray-700 uppercase tracking-wide block text-[11px]">
                03 — Consumo ativo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={5}
                value={valor03}
                onChange={(e) => setValor03(e.target.value.replace(/\D/g, ''))}
                placeholder="00040"
                className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono tracking-widest text-sm"
              />
              <span className="text-[10px] text-gray-400 block">Máximo 5 dígitos numéricos</span>
            </div>
            <div className="space-y-1">
              <label className="font-bold text-gray-700 uppercase tracking-wide block text-[11px]">
                A3 — Ativo reverso
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={5}
                value={valorA3}
                onChange={(e) => setValorA3(e.target.value.replace(/\D/g, ''))}
                placeholder="01985"
                className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono tracking-widest text-sm"
              />
              <span className="text-[10px] text-gray-400 block">Máximo 5 dígitos numéricos</span>
            </div>
          </div>

          {/* Telefone do solicitante (opcional) */}
          <div className="space-y-1">
            <label className="font-bold text-gray-700 uppercase tracking-wide block text-[11px]">
              Telefone do solicitante <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              inputMode="tel"
              value={telefoneSolicitante}
              onChange={(e) => setTelefoneSolicitante(e.target.value)}
              placeholder="(54) 99999-9999"
              className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
            />
            <span className="text-[10px] text-gray-400 block">
              Telefone com DDD enviado para o protocolo da RGE
            </span>
          </div>

          {/* Campo Único Formato Livre */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-gray-700 uppercase tracking-wide block">
                Observações (opcional)
              </label>
              <button
                type="button"
                onClick={handlePreencherExemplo}
                className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-indigo-500" />
                Exemplo
              </button>
            </div>
            <p className="text-[11px] text-gray-500">
              Informe número da leitura, protocolo gerado, data de envio à concessionária e
              quaisquer observações técnicas.
            </p>
            <textarea
              rows={5}
              value={textoDados}
              onChange={(e) => {
                setTextoDados(e.target.value)
                if (erroValidacao) setErroValidacao(null)
              }}
              placeholder="Ex.: Número da leitura: 48920. Protocolo RGE: 2027-0115-9982. Data de envio: 15/01/2027. Foto do medidor recebida e validada."
              className="w-full p-3 font-sans text-xs leading-relaxed rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 bg-white resize-y"
            />
          </div>

          {/* Anexo Opcional de Foto do Medidor (até 15MB) */}
          <div className="space-y-1.5">
            <label className="font-bold text-gray-700 uppercase tracking-wide block">
              Foto do Medidor (opcional, até 15MB)
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileChange}
              className="hidden"
            />

            {fotoPreview ? (
              <div className="relative p-2 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={fotoPreview}
                    alt="Foto do medidor"
                    className="w-14 h-14 object-cover rounded-lg border border-gray-200 shrink-0"
                  />
                  <div className="min-w-0 text-[11px]">
                    <p className="font-bold text-gray-800 truncate">
                      {fotoArquivo?.name || 'Foto do medidor anexada'}
                    </p>
                    {fotoArquivo && (
                      <p className="text-[10px] text-gray-500">
                        {(fotoArquivo.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2 py-1 text-[11px] font-semibold text-gray-700 hover:text-gray-900 bg-white border border-gray-200 rounded-lg"
                  >
                    Trocar
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoverFoto}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remover foto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-4 border-2 border-dashed border-gray-300 hover:border-indigo-400 rounded-xl bg-gray-50/60 hover:bg-indigo-50/20 transition-all flex flex-col items-center justify-center gap-1.5 text-gray-600"
              >
                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <UploadCloud className="w-4 h-4" />
                </div>
                <span className="font-semibold text-xs text-gray-800">
                  Clique para anexar foto do medidor
                </span>
                <span className="text-[10px] text-gray-400">
                  Formatos aceitos: JPEG, PNG, WebP (máx. 15MB)
                </span>
              </button>
            )}
          </div>

          {/* Erro de validação se houver */}
          {erroValidacao && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{erroValidacao}</span>
            </div>
          )}

          {/* Informação sobre sincronização com a mãe */}
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-gray-600 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <span>
              Ao salvar, esta atividade filha será marcada como <strong>Concluída</strong> e os
              dados registrados serão copiados automaticamente para a atividade mãe{' '}
              <strong>Auto Leitura RGE</strong>, concluindo-a.
            </span>
          </div>
        </div>

        {/* Rodapé */}
        <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 rounded-xl hover:bg-gray-200/60 transition-colors"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-2">
            {/* Botão Enviar para RGE (laranja) - OCULTO quando protocolo_rge estiver preenchido */}
            {!protocoloRGE && (
              <button
                type="button"
                disabled={enviandoRGE || !valor03.trim()}
                onClick={handleEnviarRGE}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-orange-600 hover:bg-orange-700 shadow-sm disabled:opacity-50 transition-all"
                title="O robô entra no portal da RGE e registra a leitura"
              >
                {enviandoRGE ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Enviar para RGE</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSalvar}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm disabled:opacity-50 transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando dados...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Salvar e Concluir</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ModalRegistrarDadosLeitura
