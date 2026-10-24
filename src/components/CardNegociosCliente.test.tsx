import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  CardNegociosCliente,
  ModalFichaNegocio,
  ModalNovoNegocio,
  TIPOS_NEGOCIO_OPCOES as TIPOS_CARD,
} from './CardNegociosCliente'
import {
  TIPOS_NEGOCIO_OPCOES as TIPOS_CANONICOS,
  getTipoNegocioConfig,
  getTipoNegocioLabel,
} from '@/constants/tipoNegocio'
import type { Negocio } from '@/types/crm'

vi.mock('@/contexts/ClientesContext', () => ({
  useClientes: () => ({
    orcamentosSolar: [],
    usuarios: [{ id: 'usr-1', name: 'Consultor Carlos', role: 'consultor' }],
    refreshData: vi.fn(),
  }),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'usr-1', name: 'Consultor Carlos' },
  }),
}))

vi.mock('@/services/negociosService', () => ({
  fetchNegociosByClienteId: vi.fn().mockResolvedValue([]),
  createNegocio: vi.fn().mockResolvedValue({ id: 'neg-123' }),
  updateNegocio: vi.fn().mockResolvedValue({ id: 'neg-123' }),
  deleteNegocio: vi.fn().mockResolvedValue(true),
}))

vi.mock('@/lib/pocketbase/client', () => ({
  pb: {
    files: { getURL: () => 'https://fake-url/img.jpg' },
    collection: () => ({
      create: vi.fn().mockResolvedValue({ id: 'atv-1' }),
    }),
  },
  default: {
    files: { getURL: () => 'https://fake-url/img.jpg' },
  },
}))

describe('CardNegociosCliente - Normalização canônica dos tipos de negócio', () => {
  it('exporta exatamente os 7 tipos canônicos de negócio correspondentes a src/constants/tipoNegocio.ts', () => {
    expect(TIPOS_CARD.length).toBe(7)
    expect(TIPOS_CARD).toBe(TIPOS_CANONICOS)

    const values = TIPOS_CARD.map((t) => t.value)
    expect(values).toEqual([
      'venda usina',
      'creditos_energia',
      'bateria',
      'venda bateria',
      'expansão',
      'renovação',
      'serviço',
    ])
  })

  it('ModalFichaNegocio normaliza apelidos legados (ex: "Energia Solar", "Baterias") para o tipo canônico correto', () => {
    // 1. Legado: "Energia Solar" -> "venda usina"
    const negLegadoSolar: Negocio = {
      id: 'neg-leg-1',
      collectionId: 'negocios',
      collectionName: 'negocios',
      cliente_id: 'cli-1',
      titulo: 'Negócio Solar Legado',
      tipo_negocio: 'Energia Solar' as any,
      status: 'em andamento',
      created: '2026-01-01',
      updated: '2026-01-01',
    }
    const htmlSolar = renderToStaticMarkup(
      React.createElement(ModalFichaNegocio, {
        negocio: negLegadoSolar,
        clienteNome: 'Cliente Solar',
        open: true,
        onOpenChange: () => {},
        onSaved: () => {},
      }),
    )
    // Deve renderizar o select com os 7 tipos canônicos e conter os labels corretos
    expect(htmlSolar).toContain('Venda de Usina Fotovoltaica (Energia Solar)')
    expect(htmlSolar).toContain('Bateria Solar (Baterias)')
    expect(htmlSolar).toContain('Plano de O&M / Manutenção (O&M)')
    expect(htmlSolar).toContain('Carregadores de Veículos Elétricos (Carregadores)')

    // 2. Legado: "Baterias" -> "bateria"
    const negLegadoBateria: Negocio = {
      id: 'neg-leg-2',
      collectionId: 'negocios',
      collectionName: 'negocios',
      cliente_id: 'cli-2',
      titulo: 'Negócio Bateria Legado',
      tipo_negocio: 'Baterias' as any,
      status: 'em andamento',
      created: '2026-01-01',
      updated: '2026-01-01',
    }
    const cfgBateria = getTipoNegocioConfig(negLegadoBateria.tipo_negocio)
    expect(cfgBateria?.value).toBe('bateria')
    expect(cfgBateria?.tipoVenda).toBe('Baterias')

    // 3. Legado: "Carregadores Veículos Elétricos" -> "serviço"
    const cfgCarregador = getTipoNegocioConfig('Carregadores Veículos Elétricos')
    expect(cfgCarregador?.value).toBe('serviço')
    expect(cfgCarregador?.tipoVenda).toBe('Carregadores Veículos Elétricos')

    // 4. Legado: "O&M (Operação e Manutenção)" -> "renovação"
    const cfgOM = getTipoNegocioConfig('O&M (Operação e Manutenção)')
    expect(cfgOM?.value).toBe('renovação')
    expect(cfgOM?.tipoVenda).toBe('O&M (Operação e Manutenção)')
  })

  it('ModalNovoNegocio renderiza exatamente as 7 opções canônicas no dropdown', () => {
    const htmlNovo = renderToStaticMarkup(
      React.createElement(ModalNovoNegocio, {
        clienteId: 'cli-novo',
        clienteNome: 'Empresa Teste',
        open: true,
        onOpenChange: () => {},
        onCreated: () => {},
        modoFichaCliente: true,
        isCriacaoViaFicha: true,
      }),
    )

    // Verifica que cada um dos 7 labels canônicos está presente
    TIPOS_CANONICOS.forEach((tipo) => {
      expect(htmlNovo).toContain(tipo.label)
    })
    // Verifica que apelidos legados descontextualizados não existem soltos como opções
    expect(htmlNovo).not.toContain('<option value="Energia Solar">Energia Solar</option>')
    expect(htmlNovo).not.toContain('<option value="Baterias">Baterias</option>')
  })

  it('CardNegociosCliente exibe o rótulo limpo do tipo de negócio via getTipoNegocioLabel', () => {
    expect(getTipoNegocioLabel('venda usina')).toBe('Venda de Usina Fotovoltaica (Energia Solar)')
    expect(getTipoNegocioLabel('Energia Solar')).toBe('Venda de Usina Fotovoltaica (Energia Solar)')
    expect(getTipoNegocioLabel('Baterias')).toBe('Bateria Solar (Baterias)')
    expect(getTipoNegocioLabel('renovação')).toBe('Plano de O&M / Manutenção (O&M)')
    expect(getTipoNegocioLabel('serviço')).toBe('Carregadores de Veículos Elétricos (Carregadores)')
  })
})
