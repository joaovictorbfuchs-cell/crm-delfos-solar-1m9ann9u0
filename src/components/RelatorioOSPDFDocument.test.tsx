import { describe, it, expect } from 'vitest'
import React from 'react'
import { RelatorioOSPDFDocument } from '@/components/RelatorioOSPDFDocument'
import type { OrdemServico, Cliente, Sistema } from '@/types/crm'

describe('RelatorioOSPDFDocument', () => {
  const osMock = {
    id: 'os123456789abcde',
    collectionId: 'col_os',
    collectionName: 'ordens_servico',
    cliente_id: 'cli123',
    tipo_servico: 'Manutenção Preventiva',
    status: 'concluida' as const,
    concluida: true,
    data_agendada: '2025-05-10T09:00:00.000Z',
    concluida_em: '2025-05-10T11:30:00.000Z',
    atribuida_a: 'Lucas Instalador',
    endereco: 'Linha 4, KM 12 - Interior',
    checklist: [
      { id: '1', item: 'Limpeza dos módulos fotovoltaicos', concluido: true },
      { id: '2', item: 'Reaperto das conexões elétricas CA/CC', concluido: true },
      { id: '3', item: 'Inspeção visual da estrutura de fixação', concluido: false },
    ],
    observacoes: 'Usinas operando em conformidade com as normas ABNT e parâmetros Delfos Solar.',
    created: '2025-05-01T10:00:00.000Z',
    updated: '2025-05-10T12:00:00.000Z',
  } as OrdemServico

  const clienteMock = {
    id: 'cli123',
    collectionId: 'col_cli',
    collectionName: 'clientes',
    nome: 'Cooperativa Agroindustrial Erechim',
    cpf: '12.345.678/0001-90',
    telefone: '(54) 3522-0000',
    whatsapp: '(54) 99129-2121',
    cidade: 'Erechim',
    estado: 'RS',
    endereco: 'Rodovia RS 135, KM 5',
    uc: '1234567890',
    potencia_kwp: 75.5,
    placas_qtd: 136,
    status: 'ativo',
    created: '2025-01-01T10:00:00.000Z',
    updated: '2025-05-01T10:00:00.000Z',
  } as unknown as Cliente

  const sistemaMock = {
    id: 'sis123',
    cliente_id: 'cli123',
    nome: 'Usina Solar Sede Principal',
    potencia_total_kwp: 75.5,
    quantidade_modulos: 136,
    fabricante_modulos: 'Canadian Solar 555W',
    fabricante_inversores: 'Deye 75kW Trifásico 380V',
    tipo_telhado: 'metalico',
    concessionaria: 'RGE Sul',
    numero_uc: '1234567890',
    created: '2025-01-01T10:00:00.000Z',
    updated: '2025-05-01T10:00:00.000Z',
  } as unknown as Sistema

  it('instancia o componente React-PDF com dados completos da OS sem lançar erro', () => {
    const el = React.createElement(RelatorioOSPDFDocument, {
      dados: {
        os: osMock,
        cliente: clienteMock,
        sistema: sistemaMock,
        inversoresInfo: 'Deye 75kW',
        fotosDataUrls: [
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        ],
        rodapeComercial: {
          titulo: 'Economize mais com novos projetos',
          descricao: 'Contratos O&M Delfos Solar',
          indicacao: 'Ganhe R$ 500 por indicação',
          contato: '(54) 99129-2121',
        },
      },
    })

    expect(el).toBeDefined()
    expect(el.props.dados.os.id).toBe('os123456789abcde')
    expect(el.props.dados.cliente?.nome).toBe('Cooperativa Agroindustrial Erechim')
  })

  it('lida com tolerância a dados parciais ou nulos', () => {
    const el = React.createElement(RelatorioOSPDFDocument, {
      dados: {
        os: {
          id: 'os999',
          created: '2025-01-01T00:00:00.000Z',
          updated: '2025-01-01T00:00:00.000Z',
        } as any,
        cliente: null,
        sistema: null,
        fotosDataUrls: [],
      },
    })

    expect(el).toBeDefined()
    expect(el.props.dados.cliente).toBeNull()
  })
})
