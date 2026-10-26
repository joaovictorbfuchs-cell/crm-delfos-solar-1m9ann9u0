import { useState, useEffect, useCallback } from 'react'
import { WhatsAppTemplateCategoria, WhatsAppTemplateEtapa } from '@/types/crm'
import { whatsappTemplateTaxonomiaService } from '@/services/whatsappTemplateTaxonomiaService'
import {
  CATEGORIAS_WHATSAPP_CANONICAS,
  ETAPAS_WHATSAPP_CANONICAS,
} from '@/lib/whatsappTemplatesMetadata'

// Fallbacks resilientes caso o banco não responda
export const CATEGORIAS_FALLBACK: Array<
  Pick<WhatsAppTemplateCategoria, 'id' | 'nome' | 'ordem' | 'cor' | 'descricao' | 'ativo'>
> = [
  {
    id: 'fb-cat-1',
    nome: 'Comercial',
    ordem: 1,
    cor: 'emerald',
    descricao: 'Propostas, orçamentos, fechamento e negociação',
    ativo: true,
  },
  {
    id: 'fb-cat-2',
    nome: 'Atendimento',
    ordem: 2,
    cor: 'blue',
    descricao: 'Primeiro contato, qualificação e agendamentos',
    ativo: true,
  },
  {
    id: 'fb-cat-3',
    nome: 'O&M & Pós-Venda',
    ordem: 3,
    cor: 'purple',
    descricao: 'Operação, manutenção, planos anuais e pós-instalação',
    ativo: true,
  },
  {
    id: 'fb-cat-4',
    nome: 'Financeiro/Cobrança',
    ordem: 4,
    cor: 'amber',
    descricao: 'Lembretes de fatura, cobrança e 2ª via',
    ativo: true,
  },
  {
    id: 'fb-cat-5',
    nome: 'Operacional/RGE',
    ordem: 5,
    cor: 'orange',
    descricao: 'Auto leitura RGE, ordens de serviço e concessionária',
    ativo: true,
  },
]

export const ETAPAS_FALLBACK: Array<
  Pick<WhatsAppTemplateEtapa, 'id' | 'nome' | 'ordem' | 'cor' | 'descricao' | 'ativo'>
> = [
  {
    id: 'fb-etapa-1',
    nome: '1º contato',
    ordem: 1,
    descricao: 'Recepção e qualificação inicial do lead',
    ativo: true,
  },
  {
    id: 'fb-etapa-2',
    nome: 'Orçamento enviado',
    ordem: 2,
    descricao: 'Envio de estudo prévio ou proposta solar',
    ativo: true,
  },
  {
    id: 'fb-etapa-3',
    nome: 'Follow-up Fase 1',
    ordem: 3,
    descricao: 'Checagem de recebimento e esclarecimento de dúvidas',
    ativo: true,
  },
  {
    id: 'fb-etapa-4',
    nome: 'Follow-up Fase 2',
    ordem: 4,
    descricao: 'Prova social, comparativo e ajustes técnicos',
    ativo: true,
  },
  {
    id: 'fb-etapa-5',
    nome: 'Follow-up Fase 3',
    ordem: 5,
    descricao: 'Última chamada e reserva de condições',
    ativo: true,
  },
  {
    id: 'fb-etapa-6',
    nome: 'Break-up',
    ordem: 6,
    descricao: 'Fechamento amigável e arquivamento temporário',
    ativo: true,
  },
  {
    id: 'fb-etapa-7',
    nome: 'Visita técnica',
    ordem: 7,
    descricao: 'Agendamento e confirmação de vistoria em campo',
    ativo: true,
  },
  {
    id: 'fb-etapa-8',
    nome: 'Assinatura/documentos',
    ordem: 8,
    descricao: 'Contrato, procuração e anexos para homologação',
    ativo: true,
  },
  {
    id: 'fb-etapa-9',
    nome: 'Pós-instalação',
    ordem: 9,
    descricao: 'Acompanhamento pós-obra, leitura e comissionamento',
    ativo: true,
  },
  {
    id: 'fb-etapa-10',
    nome: 'Renovação O&M',
    ordem: 10,
    descricao: 'Oferta de limpeza, manutenção preventiva e contrato O&M',
    ativo: true,
  },
  {
    id: 'fb-etapa-11',
    nome: 'Cobrança',
    ordem: 11,
    descricao: 'Lembretes de vencimento e avisos de pendência',
    ativo: true,
  },
]

export function useWhatsAppTemplateTaxonomia() {
  const [categorias, setCategorias] = useState<WhatsAppTemplateCategoria[]>([])
  const [etapas, setEtapas] = useState<WhatsAppTemplateEtapa[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const recarregar = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [catsRes, etapasRes] = await Promise.allSettled([
        whatsappTemplateTaxonomiaService.listarCategorias(),
        whatsappTemplateTaxonomiaService.listarEtapas(),
      ])

      if (catsRes.status === 'fulfilled' && catsRes.value.length > 0) {
        setCategorias(catsRes.value)
      } else {
        // Fallback resiliente
        setCategorias(CATEGORIAS_FALLBACK as WhatsAppTemplateCategoria[])
      }

      if (etapasRes.status === 'fulfilled' && etapasRes.value.length > 0) {
        setEtapas(etapasRes.value)
      } else {
        // Fallback resiliente
        setEtapas(ETAPAS_FALLBACK as WhatsAppTemplateEtapa[])
      }
    } catch (err: any) {
      console.warn('Erro ao carregar taxonomia de WhatsApp templates (usando fallback):', err)
      setError(err?.message || 'Erro ao consultar taxonomia')
      setCategorias(CATEGORIAS_FALLBACK as WhatsAppTemplateCategoria[])
      setEtapas(ETAPAS_FALLBACK as WhatsAppTemplateEtapa[])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  // Nomes para uso rápido em selects/filtros
  const nomesCategorias = (
    categorias.length > 0 ? categorias : (CATEGORIAS_FALLBACK as WhatsAppTemplateCategoria[])
  )
    .filter((c) => c.ativo !== false)
    .map((c) => c.nome)

  const nomesEtapas = (etapas.length > 0 ? etapas : (ETAPAS_FALLBACK as WhatsAppTemplateEtapa[]))
    .filter((e) => e.ativo !== false)
    .map((e) => e.nome)

  return {
    categorias,
    etapas,
    nomesCategorias:
      nomesCategorias.length > 0 ? nomesCategorias : [...CATEGORIAS_WHATSAPP_CANONICAS],
    nomesEtapas: nomesEtapas.length > 0 ? nomesEtapas : [...ETAPAS_WHATSAPP_CANONICAS],
    isLoading,
    error,
    recarregar,
  }
}
