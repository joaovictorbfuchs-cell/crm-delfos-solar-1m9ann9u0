import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AlertTriangle, Loader2, ShieldCheck } from 'lucide-react'
import { PreviewPropostaOMDocumento } from '@/components/PreviewPropostaOMDocumento'
import {
  aceitarPropostaOMPublica,
  obterPropostaOMPublica,
  type PropostaOMPublica,
} from '@/services/propostaOMPublicaService'
import { normalizarNomePlanoOM } from '@/lib/planosOM'
import type { OMPlanoTipo } from '@/types/crm'

export const PropostaOMPublicaPage: React.FC = () => {
  const { token = '' } = useParams<{ token: string }>()
  const [proposta, setProposta] = useState<PropostaOMPublica | null>(null)
  const [plano, setPlano] = useState<OMPlanoTipo>('Completo')
  const [nome, setNome] = useState('')
  const [documento, setDocumento] = useState('')
  const [confirmado, setConfirmado] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let ativo = true
    setLoading(true)
    obterPropostaOMPublica(token)
      .then((data) => {
        if (!ativo) return
        setProposta(data)
        setPlano(normalizarNomePlanoOM(data.parametros.planoEscolhido || 'Completo'))
        if (data.aceite) {
          setNome(data.aceite.nome)
          setDocumento(data.aceite.documento)
        }
      })
      .catch((err: any) => {
        if (ativo)
          setError(
            err?.message ||
              'Não foi possível abrir esta proposta. Solicite um novo link à Delfos Solar.',
          )
      })
      .finally(() => ativo && setLoading(false))
    return () => {
      ativo = false
    }
  }, [token])

  const jaAceita = Boolean(proposta?.aceite) || /aprovad/i.test(proposta?.status || '')
  const dadosDocumento = useMemo(() => {
    if (!proposta) return null
    return {
      ...proposta,
      parametros: { ...proposta.parametros, planoEscolhido: plano },
    }
  }, [proposta, plano])

  const registrarAceite = async () => {
    if (!proposta || !dadosDocumento) return
    setSubmitting(true)
    setError('')
    try {
      const result = await aceitarPropostaOMPublica(token, {
        nome,
        documento,
        plano,
        confirmado,
      })
      setProposta({
        ...proposta,
        status: result.status || 'Aprovada',
        parametros: { ...proposta.parametros, planoEscolhido: result.plano || plano },
        aceite: {
          nome: result.nome || nome.trim(),
          documento: documento.replace(/\D/g, ''),
          data: result.acceptedAt || new Date().toISOString(),
        },
        calculos: {
          ...proposta.calculos,
          planoEscolhido: result.plano || plano,
          valorMensalEscolhido: result.mensal,
          valorAnualEscolhido: result.anual,
        },
      })
      setPlano(result.plano || plano)
    } catch (err: any) {
      setError(
        err?.message || 'Não foi possível registrar o aceite. Confira os dados e tente novamente.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-700" />
          Carregando a proposta segura…
        </div>
      </main>
    )
  }

  if (error && !proposta) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-5">
        <div className="max-w-lg rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
          <AlertTriangle className="w-8 h-8 text-amber-600" />
          <h1 className="mt-3 text-lg font-bold text-gray-900">Proposta indisponível</h1>
          <p className="mt-2 text-sm text-gray-600">{error}</p>
          <p className="mt-4 text-xs text-gray-500">
            Entre em contato com a Delfos Solar para solicitar um novo link.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
          <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-700" />
          <div>
            <div className="text-sm font-bold text-gray-900">Proposta O&amp;M Delfos Solar</div>
            <div className="text-xs text-gray-600">
              Confira os dados e selecione o plano de sua preferência.
            </div>
          </div>
        </div>
        {error && (
          <div
            role="alert"
            className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800"
          >
            {error}
          </div>
        )}
        {dadosDocumento && (
          <PreviewPropostaOMDocumento
            dados={dadosDocumento}
            conteudo={proposta?.conteudo}
            planoSelecionado={plano}
            onSelecionarPlano={jaAceita ? undefined : setPlano}
            onAceitarPlano={jaAceita ? undefined : registrarAceite}
            isSubmitting={submitting}
            aceiteRegistrado={jaAceita}
            somenteLeitura={jaAceita}
            statusProposta={proposta?.status}
            coletaAceiteCliente={!jaAceita}
            aceiteNome={nome}
            onAceiteNomeChange={setNome}
            aceiteDocumento={documento}
            onAceiteDocumentoChange={setDocumento}
            aceiteConfirmado={confirmado}
            onAceiteConfirmadoChange={setConfirmado}
          />
        )}
        <p className="mt-4 text-center text-[10px] text-gray-500">
          Este link é individual e pode expirar. Em caso de dúvidas, fale com a Delfos Solar.
        </p>
      </div>
    </main>
  )
}

export default PropostaOMPublicaPage
