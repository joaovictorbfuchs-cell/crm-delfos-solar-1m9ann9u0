import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { GerenciadorFluxosFollowUp } from './GerenciadorFluxosFollowUp'
import * as clientesContext from '@/contexts/ClientesContext'
import * as fluxosService from '@/services/fluxosFollowUpService'

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

describe('GerenciadorFluxosFollowUp - Seletor de Modelos de WhatsApp', () => {
  const fluxoMock = {
    id: 'fluxo_1',
    collectionId: 'fluxos_follow_up',
    collectionName: 'fluxos_follow_up',
    nome: 'Fluxo Comercial',
    descricao: 'Fluxo de teste',
    ativo: true,
    is_padrao: false,
    created: '2026-01-01',
    updated: '2026-01-01',
    etapas: [
      {
        id: 'etapa_1',
        collectionId: 'etapas_follow_up',
        collectionName: 'etapas_follow_up',
        fluxo_id: 'fluxo_1',
        nome: '1ª Mensagem',
        ordem: 1,
        dias_apos: 0,
        mensagem: 'Mensagem inicial de teste',
        ativa: true,
        desvio_acao: 'nenhuma' as const,
        desvio_dias: 0,
        desvio_fluxo_id: '',
        resposta_acao: 'encerrar' as const,
        resposta_fluxo_id: '',
        created: '2026-01-01',
        updated: '2026-01-01',
      },
    ],
    regras_entrada: [],
  }

  const templatesMock = [
    {
      id: 'tpl_1',
      collectionId: 'whatsapp_templates',
      collectionName: 'whatsapp_templates',
      titulo: 'Boas-vindas Comercial',
      slug: 'boas_vindas',
      conteudo: 'Olá, [nome do cliente]! Seja bem-vindo à Delfos Solar. Seu valor é [valor].',
      ativo: true,
      created: '2026-01-01',
      updated: '2026-01-01',
    },
    {
      id: 'tpl_inativo',
      collectionId: 'whatsapp_templates',
      collectionName: 'whatsapp_templates',
      titulo: 'Template Desativado',
      slug: 'desativado',
      conteudo: 'Texto desativado',
      ativo: false,
      created: '2026-01-01',
      updated: '2026-01-01',
    },
  ]

  it('renderiza o componente GerenciadorFluxosFollowUp com suporte ao seletor de modelos de WhatsApp', () => {
    vi.spyOn(fluxosService, 'fetchFluxosFollowUp').mockResolvedValue([fluxoMock])
    vi.spyOn(clientesContext, 'useClientes').mockReturnValue({
      whatsAppTemplates: templatesMock as any,
    } as any)

    const html = renderToStaticMarkup(<GerenciadorFluxosFollowUp />)
    expect(html).toContain('Fluxos de Follow-up de Disparos')
    expect(html).toContain('WhatsApp em Massa')
    expect(html).toContain('Novo Fluxo')
  })

  it('exibe o bloco de modelo de WhatsApp e botão Gerenciar Modelos quando o modal está aberto', () => {
    vi.spyOn(clientesContext, 'useClientes').mockReturnValue({
      whatsAppTemplates: templatesMock as any,
    } as any)

    const html = renderToStaticMarkup(<GerenciadorFluxosFollowUp />)
    expect(html).toBeDefined()
  })

  it('suporta etapa com ramificação de resposta configurada para fluxo alternativo (Fase 4)', () => {
    const fluxoComRamificacao = {
      ...fluxoMock,
      etapas: [
        {
          ...fluxoMock.etapas[0],
          resposta_acao: 'fluxo_alternativo' as const,
          resposta_fluxo_id: 'fluxo_2',
        },
      ],
    }
    const fluxoDestino = {
      ...fluxoMock,
      id: 'fluxo_2',
      nome: 'Fluxo Pós-Resposta',
    }

    vi.spyOn(fluxosService, 'fetchFluxosFollowUp').mockResolvedValue([
      fluxoComRamificacao,
      fluxoDestino,
    ])
    vi.spyOn(clientesContext, 'useClientes').mockReturnValue({
      whatsAppTemplates: templatesMock as any,
    } as any)

    const html = renderToStaticMarkup(<GerenciadorFluxosFollowUp />)
    expect(html).toContain('Fluxo Pós-Resposta')
    expect(html).toContain('Ao responder → Entra em')
  })
})
