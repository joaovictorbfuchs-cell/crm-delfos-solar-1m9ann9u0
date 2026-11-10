import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'
import { LinhaDoTempoUnificada } from './LinhaDoTempoUnificada'
import { AtividadeItem } from './AtividadeItem'
import type { Atividade, Cliente } from '@/types/crm'

vi.mock('@/contexts/ClientesContext', () => ({
  useClientes: () => ({
    orcamentosSolar: [],
    propostasOM: [],
    contratosOM: [],
    documentosCliente: [],
    removeAtividade: vi.fn(),
  }),
}))

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}))

describe('Auto Leitura RGE - Linha do Tempo e AtividadeItem', () => {
  const clienteMock: Cliente = {
    id: 'cli-001',
    nome: 'Pedrinho Spassini',
    whatsapp: '54999991111',
  } as unknown as Cliente

  it('LinhaDoTempoUnificada renderiza Aviso automático com subtítulo correto e botões Enviar WhatsApp e Excluir', () => {
    const atvAviso: Atividade = {
      id: 'atv-aviso-1',
      cliente_id: 'cli-001',
      titulo: 'Aviso automático — leitura em 15/01/2027',
      tipo: 'lembrete_auto_leitura',
      status: 'pendente',
      data: '2027-01-13 12:00:00',
      data_leitura: '2027-01-15 12:00:00',
      collectionId: 'atividades_col',
      collectionName: 'atividades',
      created: '2026-11-10T12:00:00.000Z',
      updated: '2026-11-10T12:00:00.000Z',
    }

    render(<LinhaDoTempoUnificada cliente={clienteMock} atividades={[atvAviso]} />)

    // Título real mantido
    expect(screen.getByText('Aviso automático — leitura em 15/01/2027')).toBeTruthy()
    // Subtítulo canônico
    expect(screen.getByText('Mensagem WhatsApp 2 dias antes')).toBeTruthy()
    // Botão Enviar WhatsApp
    expect(screen.getByRole('button', { name: /Enviar WhatsApp/i })).toBeTruthy()
    // Botão Excluir visível
    expect(screen.getByRole('button', { name: /Excluir atividade Aviso automático/i })).toBeTruthy()
  })

  it('LinhaDoTempoUnificada renderiza Registro de auto leitura com subtítulo e botões Registrar leitura, Enviar WhatsApp e Excluir', () => {
    const atvRegistro: Atividade = {
      id: 'atv-reg-1',
      cliente_id: 'cli-001',
      titulo: 'Registro de auto leitura — 15/01/2027',
      tipo: 'registro_auto_leitura',
      status: 'pendente',
      data: '2027-01-15 12:00:00',
      data_leitura: '2027-01-15 12:00:00',
      collectionId: 'atividades_col',
      collectionName: 'atividades',
      created: '2026-11-10T12:00:00.000Z',
      updated: '2026-11-10T12:00:00.000Z',
    }

    render(<LinhaDoTempoUnificada cliente={clienteMock} atividades={[atvRegistro]} />)

    // Título real
    expect(screen.getByText('Registro de auto leitura — 15/01/2027')).toBeTruthy()
    // Subtítulo canônico
    expect(screen.getByText('Preencher 03/A3 e enviar para a RGE')).toBeTruthy()
    // Botão Registrar leitura
    expect(screen.getByRole('button', { name: /Registrar leitura/i })).toBeTruthy()
    // Botão Enviar WhatsApp
    expect(screen.getByRole('button', { name: /Enviar WhatsApp/i })).toBeTruthy()
    // Botão Excluir
    expect(
      screen.getByRole('button', { name: /Excluir atividade Registro de auto leitura/i }),
    ).toBeTruthy()
  })

  it('LinhaDoTempoUnificada renderiza lembretes antigos concluídos sem quebra', () => {
    const atvAntigaConcluida: Atividade = {
      id: 'eku54kxya9r7x05',
      cliente_id: 'cli-001',
      titulo: 'Lembrete de Auto Leitura — 10/10/2026',
      tipo: 'lembrete_auto_leitura',
      status: 'concluida',
      data: '2026-10-10 12:00:00',
      data_leitura: '2026-10-10 12:00:00',
      collectionId: 'atividades_col',
      collectionName: 'atividades',
      created: '2026-10-10T12:00:00.000Z',
      updated: '2026-10-10T12:00:00.000Z',
    }

    render(<LinhaDoTempoUnificada cliente={clienteMock} atividades={[atvAntigaConcluida]} />)

    expect(screen.getByText('Lembrete de Auto Leitura — 10/10/2026')).toBeTruthy()
    expect(screen.getByText(/Concluída/i)).toBeTruthy()
  })

  it('LinhaDoTempoUnificada exibe botão "Enviar para RGE" quando registro_auto_leitura está concluída mas sem protocolo_rge', () => {
    const atvConcluidaSemProtocolo: Atividade = {
      id: 'adl3gy2u844ue1u',
      cliente_id: 'cli-001',
      titulo: 'Registro de auto leitura — 10/11/2026',
      tipo: 'registro_auto_leitura',
      status: 'concluida',
      data: '2026-11-10 12:00:00',
      data_leitura: '2026-11-10 12:00:00',
      protocolo_rge: '',
      protocolo_atendimento: '',
      valor_grandeza_03: '12345',
      valor_grandeza_103: '67890',
      dados_leitura_registrados: '03: 12345 | A3: 67890',
      collectionId: 'atividades_col',
      collectionName: 'atividades',
      created: '2026-11-10T12:00:00.000Z',
      updated: '2026-11-10T12:00:00.000Z',
    }

    render(<LinhaDoTempoUnificada cliente={clienteMock} atividades={[atvConcluidaSemProtocolo]} />)

    expect(screen.getByText('Registro de auto leitura — 10/11/2026')).toBeTruthy()
    // Botão deve dizer explicitamente "Enviar para RGE"
    expect(screen.getByRole('button', { name: /Enviar para RGE/i })).toBeTruthy()
  })

  it('LinhaDoTempoUnificada NÃO exibe botão "Registrar leitura" ou "Enviar para RGE" quando concluída COM protocolo_rge', () => {
    const atvConcluidaComProtocolo: Atividade = {
      id: 'atv-concluida-ok',
      cliente_id: 'cli-001',
      titulo: 'Registro de auto leitura — 10/11/2026',
      tipo: 'registro_auto_leitura',
      status: 'concluida',
      data: '2026-11-10 12:00:00',
      data_leitura: '2026-11-10 12:00:00',
      protocolo_rge: 'RGE-2026-999999',
      protocolo_atendimento: 'ATD-12345',
      valor_grandeza_03: '12345',
      valor_grandeza_103: '67890',
      dados_leitura_registrados: '03: 12345 | A3: 67890',
      collectionId: 'atividades_col',
      collectionName: 'atividades',
      created: '2026-11-10T12:00:00.000Z',
      updated: '2026-11-10T12:00:00.000Z',
    }

    render(<LinhaDoTempoUnificada cliente={clienteMock} atividades={[atvConcluidaComProtocolo]} />)

    expect(screen.getByText('Registro de auto leitura — 10/11/2026')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Enviar para RGE/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /Registrar leitura/i })).toBeNull()
  })

  it('AtividadeItem garante botão de excluir visível (não apenas no hover) para auto leitura', () => {
    const onDelete = vi.fn()
    const atv: Atividade = {
      id: 'atv-01',
      cliente_id: 'cli-001',
      titulo: 'Aviso automático — leitura em 15/01/2027',
      tipo: 'lembrete_auto_leitura',
      status: 'pendente',
      data: '2027-01-13 12:00:00',
      collectionId: 'atividades_col',
      collectionName: 'atividades',
      created: '2026-11-10T12:00:00.000Z',
      updated: '2026-11-10T12:00:00.000Z',
    }

    render(<AtividadeItem atividade={atv} onDelete={onDelete} />)

    const btnDelete = screen.getByRole('button', { name: /Excluir atividade/i })
    expect(btnDelete).toBeTruthy()
    expect(btnDelete.className).toContain('opacity-100')
  })
})
