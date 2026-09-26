import { describe, it, expect, vi } from 'vitest'
import {
  gerarHTMLRelatorioOS,
  extrairInicioAtendimentoOS,
  limparTextoDetalhesExecucao,
  dataUriToFile,
} from './relatorioOSPdf'
import type { OrdemServico, Cliente, Sistema } from '@/types/crm'

describe('Módulo de Relatório de OS em PDF (relatorioOSPdf)', () => {
  const osMock = {
    id: 'os_test_123456',
    cliente_id: 'cli_1',
    tipo_servico: 'Manutenção' as const,
    status: 'concluida' as const,
    endereco: 'Rua das Palmeiras, 450 - Bairro Bela Vista',
    atribuida_a: 'Carlos Instalador',
    data_agendada: '2026-03-10T14:00:00.000Z',
    concluida_em: '2026-03-10T16:30:00.000Z',
    checklist: [
      { id: '1', item: 'Inspeção visual dos módulos solares', concluido: true },
      { id: '2', item: 'Reaperto dos conectores MC4 e quadros CA/CC', concluido: true },
      { id: '3', item: 'Medição de tensão de circuito aberto (Voc)', concluido: false },
    ],
    detalhes_execucao:
      '[INÍCIO DO ATENDIMENTO: 10/03/2026 às 14:05] Limpeza de 18 módulos realizada com água desmineralizada. Reaperto dos terminais verificado e sistema operando normalmente.',
    fotos: ['foto1.jpg', 'foto2.jpg'],
    created: '2026-03-01T10:00:00.000Z',
    updated: '2026-03-10T16:30:00.000Z',
  } as OrdemServico

  const clienteMock = {
    id: 'cli_1',
    nome: 'Agropecuária Vista Verde Ltda',
    whatsapp: '54999887766',
    telefone: '5435221100',
    cpf: '12.345.678/0001-90',
    endereco: 'Linha Três, Interior',
    cidade: 'Erechim',
    estado: 'RS',
    uc: '987654321',
    potencia_kwp: 75.5,
    placas_qtd: 136,
    inversor_marca: 'Growatt 75kW',
    created: '2026-01-01',
    updated: '2026-01-01',
  } as Cliente

  const sistemaMock = {
    id: 'sis_1',
    cliente_id: 'cli_1',
    potencia_total_kwp: 75.5,
    quantidade_modulos: 136,
    fabricante_inversores: 'Growatt MAC 70KTL3-X',
    numero_uc: '987654321',
    created: '2026-01-01',
    updated: '2026-01-01',
  } as Sistema

  it('extrai corretamente a data e hora do início do atendimento dos detalhes', () => {
    const inicio = extrairInicioAtendimentoOS(osMock.detalhes_execucao, osMock.data_agendada)
    expect(inicio).toBe('10/03/2026 às 14:05')

    const fallback = extrairInicioAtendimentoOS(undefined, '2026-03-10T14:00:00.000Z')
    expect(fallback).toContain('2026')
  })

  it('remove os marcadores de timestamp ao limpar o texto de observações', () => {
    const limpo = limparTextoDetalhesExecucao(osMock.detalhes_execucao)
    expect(limpo).not.toContain('[INÍCIO DO ATENDIMENTO:')
    expect(limpo).toContain('Limpeza de 18 módulos realizada com água desmineralizada')
  })

  it('monta o HTML completo contendo dados do cliente, usina, checklist e prestador', () => {
    const html = gerarHTMLRelatorioOS({
      os: osMock,
      cliente: clienteMock,
      sistema: sistemaMock,
      fotosDataUrls: ['data:image/jpeg;base64,/9j/4AAQSkZJRg=='],
      inversoresInfo: 'Growatt MAC 70KTL3-X',
    })

    // Cabeçalho e identificação Delfos Solar
    expect(html).toContain('DELFOS SOLAR')
    expect(html).toContain('Relatório Técnico de Serviço Executado')
    expect(html).toContain('OS #123456')
    expect(html).toContain('Delfos Engenharia Ltda')
    expect(html).toContain('21.379.952/0001-38')

    // Dados do Cliente e Usina
    expect(html).toContain('Agropecuária Vista Verde Ltda')
    expect(html).toContain('Rua das Palmeiras, 450 - Bairro Bela Vista')
    expect(html).toContain('Erechim - RS')
    expect(html).toContain('75.5 kWp')
    expect(html).toContain('136 módulos')
    expect(html).toContain('987654321')

    // Checklist
    expect(html).toContain('Inspeção visual dos módulos solares')
    expect(html).toContain('Reaperto dos conectores MC4 e quadros CA/CC')
    expect(html).toContain('2/3 Concluídos')

    // Observações
    expect(html).toContain('Limpeza de 18 módulos realizada com água desmineralizada')

    // Prestador
    expect(html).toContain('Carlos Instalador')

    // Fotos
    expect(html).toContain('data:image/jpeg;base64,/9j/4AAQSkZJRg==')
    expect(html).toContain('Registro Fotográfico #1')
  })

  it('converte dataUri base64 para objeto File nativo com sucesso', () => {
    const fakeDataUri = 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXr'
    const file = dataUriToFile(fakeDataUri, 'Relatorio_OS_123456.pdf')

    expect(file).toBeInstanceOf(File)
    expect(file.name).toBe('Relatorio_OS_123456.pdf')
    expect(file.type).toBe('application/pdf')
    expect(file.size).toBeGreaterThan(0)
  })
})
