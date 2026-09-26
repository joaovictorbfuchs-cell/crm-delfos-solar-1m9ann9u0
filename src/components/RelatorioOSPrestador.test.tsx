import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { RelatorioOSPrestador } from '@/components/RelatorioOSPrestador'
import { OrdemServico } from '@/types/crm'

describe('RelatorioOSPrestador', () => {
  const ordensMock: OrdemServico[] = [
    {
      id: 'os1',
      collectionId: 'pbc_os',
      collectionName: 'ordens_servico',
      cliente_id: 'c1',
      tipo_servico: 'Limpeza',
      endereco: 'Rua das Flores, 123',
      data_agendada: new Date().toISOString(),
      status: 'concluida',
      concluida_em: new Date().toISOString(),
      atribuida_a: 'Cassio Navarini',
      responsavel_usuario_id: 'u1',
      detalhes_execucao:
        '[INÍCIO DO ATENDIMENTO: 20/09/2026 às 10:00]\nLavagem efetuada com sucesso.',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      expand: {
        cliente_id: {
          id: 'c1',
          nome: 'Cliente Solar Teste 1',
        } as any,
      },
    },
    {
      id: 'os2',
      collectionId: 'pbc_os',
      collectionName: 'ordens_servico',
      cliente_id: 'c2',
      tipo_servico: 'Instalação',
      endereco: 'Av Central, 456',
      data_agendada: new Date().toISOString(),
      status: 'concluida',
      concluida_em: new Date().toISOString(),
      atribuida_a: 'Cassio Navarini',
      responsavel_usuario_id: 'u1',
      detalhes_execucao: 'Finalizado com comissionamento.',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      expand: {
        cliente_id: {
          id: 'c2',
          nome: 'Cliente Solar Teste 2',
        } as any,
      },
    },
    {
      id: 'os3',
      collectionId: 'pbc_os',
      collectionName: 'ordens_servico',
      cliente_id: 'c3',
      tipo_servico: 'Manutenção',
      endereco: 'Rodovia RS 135',
      data_agendada: new Date().toISOString(),
      status: 'concluida',
      concluida_em: new Date().toISOString(),
      atribuida_a: 'Diego Fernandes',
      responsavel_usuario_id: 'u2',
      detalhes_execucao: 'Reaperto elétrico concluído.',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      expand: {
        cliente_id: {
          id: 'c3',
          nome: 'Cliente Fazenda Solar',
        } as any,
      },
    },
    {
      id: 'os4',
      collectionId: 'pbc_os',
      collectionName: 'ordens_servico',
      cliente_id: 'c4',
      tipo_servico: 'Garantia',
      data_agendada: new Date().toISOString(),
      status: 'pendente', // NÃO deve entrar no relatório pois é pendente
      atribuida_a: 'Cassio Navarini',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    },
  ]

  it('renderiza o título e totais do relatório no mês atual', () => {
    render(<RelatorioOSPrestador ordens={ordensMock} />)

    expect(screen.getByText('Relatório de OS Concluídas por Prestador')).toBeDefined()
    expect(screen.getByText('Total Concluídas')).toBeDefined()

    // 3 OS concluídas no total
    expect(screen.getByText('3')).toBeDefined()
    // 2 prestadores ativos
    expect(screen.getByText('2')).toBeDefined()
  })

  it('agrupa por prestador ordenado por maior número de OS concluídas', () => {
    render(<RelatorioOSPrestador ordens={ordensMock} />)

    // Cassio tem 2 OSs e deve estar em primeiro (#1)
    expect(screen.getByText('Cassio Navarini')).toBeDefined()
    expect(screen.getByText('Diego Fernandes')).toBeDefined()
    expect(screen.getByText('#1')).toBeDefined()
    expect(screen.getByText('#2')).toBeDefined()
  })

  it('permite expandir o prestador e ver as ordens de serviço individuais', () => {
    const handleSelectOS = vi.fn()
    render(<RelatorioOSPrestador ordens={ordensMock} onSelectOS={handleSelectOS} />)

    const prestadorCard = screen.getByText('Cassio Navarini')
    fireEvent.click(prestadorCard)

    // Deve exibir as ordens do Cassio
    expect(screen.getByText('Cliente Solar Teste 1')).toBeDefined()
    expect(screen.getByText('Cliente Solar Teste 2')).toBeDefined()

    // Clicar em uma OS dispara onSelectOS
    fireEvent.click(screen.getByText('Cliente Solar Teste 1'))
    expect(handleSelectOS).toHaveBeenCalled()
  })

  it('permite navegar entre meses anterior e próximo', () => {
    render(<RelatorioOSPrestador ordens={ordensMock} />)

    const btnAnterior = screen.getByTitle('Mês anterior')
    fireEvent.click(btnAnterior)

    // No mês anterior não há OSs semeadas no mock do teste
    expect(screen.getByText(/Nenhuma OS concluída/i)).toBeDefined()
    expect(screen.getByText('Voltar ao Mês Atual')).toBeDefined()

    // Clicar em voltar ao mês atual
    fireEvent.click(screen.getByText('Voltar ao Mês Atual'))
    expect(screen.getByText('3')).toBeDefined()
  })
})
