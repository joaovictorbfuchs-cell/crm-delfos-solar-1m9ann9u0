import { describe, it, expect, vi } from 'vitest'
import {
  interpolarTemplate,
  interpolarComDetalhe,
  normalizarChave,
  normalizarContexto,
} from '@/lib/whatsappTemplateVars'

describe('normalizarChave', () => {
  it('normaliza trim/lowercase/sem acentos', () => {
    expect(normalizarChave('  Endereço  ')).toBe('endereco')
    expect(normalizarChave('NÚMERO_UC')).toBe('numero_uc')
    expect(normalizarChave('Potência')).toBe('potencia')
    expect(normalizarChave('  Nome  do  Cliente ')).toBe('nome do cliente')
  })
})

describe('normalizarContexto — aliases', () => {
  it('resolve canônicos a partir de qualquer alias', () => {
    const mapa = normalizarContexto({
      nome: 'João',
      valor: 1200,
      'nome da usina': 'Usina A',
      'número da instalação': '123456',
      endereço: 'Rua X, 100',
    })
    expect(mapa.nome_cliente).toBe('João')
    expect(mapa.valor_proposta).toBe('1200')
    expect(mapa.usina).toBe('Usina A')
    expect(mapa.numero_uc).toBe('123456')
    expect(mapa.endereco).toBe('Rua X, 100')
  })

  it('mantém chaves extras fora dos aliases (ex.: id_os)', () => {
    const mapa = normalizarContexto({ id_os: 'OS-99' })
    expect(mapa['id_os']).toBe('OS-99')
  })
})

describe('interpolarTemplate', () => {
  it('substitui {{chave}} e [chave] case-insensitive', () => {
    const saida = interpolarTemplate('Olá {{NOME_CLIENTE}}, [ Nome da Usina ]!', {
      nome_cliente: 'Maria',
      nomeDaUsina: 'Usina Solar',
    })
    expect(saida).toBe('Olá Maria, Usina Solar!')
  })

  it('remove variáveis ausentes e colapsa espaço duplo', () => {
    const saida = interpolarTemplate('Lembrete para   {{cliente_desaparecido}} amanhã.', {})
    expect(saida).toBe('Lembrete para amanhã.')
  })

  it('remove placeholder órfão seguido de pontuação sem deixar espaço', () => {
    const saida = interpolarTemplate('Olá {{nome_inexistente}}!, tudo bem?', {})
    expect(saida).toBe('Olá!, tudo bem?')
  })

  it('aplica todos os aliases do briefing', () => {
    const ctx = {
      nome: 'João',
      valor: 1200,
      data: '10/11/2026',
      potencia: '5 kWp',
      endereco: 'Rua X, 100',
      cidade: 'Erechim',
      usina: 'Usina A',
      numero_uc: '123456',
      data_agendada: '11/11/2026',
      tipo_servico: 'Limpeza',
      nome_instalador: 'Delfos',
      dia_anterior: '09/11/2026',
      empresa: 'Delfos Solar',
    }
    const saida = interpolarTemplate(
      '{{nome_cliente}} propôs {{valor_proposta}} em {{data atual}} (potência {{potência}}), endereço {{endereço}}, cidade {{cidade}}, usina {{usina}}, UC {{numero_da_uc}}, agendado {{data_agendada}}, serviço {{tipo de serviço}}, instalador {{nome do instalador}}, dia anterior {{dia_anterior}}, empresa {{nome da empresa}}.',
      ctx,
    )
    expect(saida).toBe(
      'João propôs 1200 em 10/11/2026 (potência 5 kWp), endereço Rua X, 100, cidade Erechim, usina Usina A, UC 123456, agendado 11/11/2026, serviço Limpeza, instalador Delfos, dia anterior 09/11/2026, empresa Delfos Solar.',
    )
  })

  it('saída nunca contém {{ nem [ de placeholder', () => {
    const saida = interpolarTemplate('Olá {{nome}}, veja [valor], ok {{xyz}} e [abc]?')
    expect(saida).not.toContain('{{')
    expect(saida).not.toContain('[')
    expect(saida).toBe('Olá, veja, ok e ?')
  })

  it('não remove colchetes legítimos com dígitos', () => {
    const saida = interpolarTemplate('Atenção: [1] item obrigatório', { nome: 'Ana' })
    expect(saida).toBe('Atenção: [1] item obrigatório')
  })

  it('interpolarComDetalhe reporta as órfãs (deduplicadas)', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const res = interpolarComDetalhe('{{a}} {{a}} [b]', {}, 'teste')
    expect(res.faltando).toEqual(['{{a}}', '[b]'])
    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  })

  it('texto vazio retorna vazio', () => {
    expect(interpolarTemplate('', { nome: 'x' })).toBe('')
    expect(interpolarTemplate(null as unknown as string)).toBe('')
  })
})
