import pb from '@/lib/pocketbase/client'
import type { PropostaPDFInput } from '@/lib/propostaOMGenerator'
import type { OMPlanoTipo } from '@/types/crm'

export interface PropostaOMPublica extends PropostaPDFInput {
  status: string
  aceite: null | { nome: string; documento: string; data: string }
}

export async function obterPropostaOMPublica(token: string): Promise<PropostaOMPublica> {
  return pb.send(`/backend/v1/propostas-om/public/${encodeURIComponent(token)}`, {
    method: 'GET',
  })
}

export async function aceitarPropostaOMPublica(
  token: string,
  aceite: { nome: string; documento: string; plano: OMPlanoTipo; confirmado: boolean },
): Promise<{
  ok: boolean
  alreadyAccepted: boolean
  status: string
  plano: OMPlanoTipo
  nome: string
  mensal?: number
  anual?: number
  acceptedAt?: string
}> {
  return pb.send(`/backend/v1/propostas-om/public/${encodeURIComponent(token)}`, {
    method: 'POST',
    body: aceite,
  })
}

export async function criarLinkPropostaOM(
  id: string,
): Promise<{ token: string; expiresAt: string }> {
  return pb.send(`/backend/v1/propostas-om/${encodeURIComponent(id)}/link`, {
    method: 'POST',
    body: {},
  })
}
