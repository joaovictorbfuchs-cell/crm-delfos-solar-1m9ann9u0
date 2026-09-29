import { describe, it, expect } from 'vitest'
import {
  normalizarDigitosTelefoneBr,
  normalizarNome,
  isRegistroTeste,
  avaliarErroDigitacao,
  analisarBaseCentralAtendimento,
} from './exportCentralAtendimentoXlsx'
import { buildXlsxBuffer } from './xlsxBuilderClient'
import type { Cliente, ContatoAdicional, OutroContato, WhatsAppConversa } from '@/types/crm'

describe('Exportação de Planilha da Central de Atendimento', () => {
  it('normaliza dígitos de telefone brasileiro removendo DDI 55 quando presente', () => {
    expect(normalizarDigitosTelefoneBr('5554981108228')).toBe('54981108228')
    expect(normalizarDigitosTelefoneBr('(54) 98110-8228')).toBe('54981108228')
    expect(normalizarDigitosTelefoneBr('+55 (54) 99126-8473')).toBe('54991268473')
    expect(normalizarDigitosTelefoneBr('')).toBe('')
  })

  it('normaliza nomes removendo acentos e espaços redundantes', () => {
    expect(normalizarNome(' João Victor  Bagetti ')).toBe('joao victor bagetti')
    expect(normalizarNome('Érika Tréiches')).toBe('erika treiches')
  })

  it('identifica registros com indícios de teste', () => {
    expect(isRegistroTeste('Cliente Teste', '54999990000', '54999990000')).toBe(true)
    expect(isRegistroTeste('Lead Exemplo', '54981108228', '54981108228')).toBe(true)
    expect(isRegistroTeste('Asdfg Qwerty', '54981108228', '54981108228')).toBe(true)
    expect(isRegistroTeste('123456', '54981108228', '54981108228')).toBe(true)
    expect(isRegistroTeste('Saulo Pereira', '00000000000', '00000000000')).toBe(true)
    expect(isRegistroTeste('Saulo Pereira', '12345678901', '12345678901')).toBe(true)
    // Registro real
    expect(isRegistroTeste('João da Silva', '54981108228', '54981108228')).toBe(false)
  })

  it('avalia erro de digitação de telefone e respeita autoridade do WhatsApp', () => {
    // Menos de 10 dígitos (erro)
    const errCurto = avaliarErroDigitacao('549811', '', 'Carlos')
    expect(errCurto.isErro).toBe(true)
    expect(errCurto.motivo).toContain('dígitos insuficientes')

    // DDD inválido (ex.: DDD 00)
    const errDdd = avaliarErroDigitacao('00981108228', '', 'Carlos')
    expect(errDdd.isErro).toBe(true)
    expect(errDdd.motivo).toContain('DDD 00 inválido')

    // Telefone válido (RS 54 com 11 dígitos começando com 9)
    const ok = avaliarErroDigitacao('(54) 3522-1000', '54981108228', 'Carlos')
    expect(ok.isErro).toBe(false)

    // WhatsApp válido sobrepõe telefone alternativo
    const wppOk = avaliarErroDigitacao('123', '54981108228', 'Carlos')
    expect(wppOk.isErro).toBe(false)
  })

  it('analisa base unificada classificando Repetidos, Erros, Testes e Sem Telefone', () => {
    const clientes: Cliente[] = [
      {
        id: 'cli_1',
        nome: 'João da Silva',
        telefone: '54981108228',
        whatsapp: '54981108228',
        cidade: 'Erechim',
        estado: 'RS',
        status: 'Fechado',
        tipo_negocio: 'Energia Solar',
        created: '2026-09-01T10:00:00Z',
        updated: '2026-09-01T10:00:00Z',
      } as Cliente,
      // Duplicado com mesmo WhatsApp/telefone de cli_1
      {
        id: 'cli_2',
        nome: 'João da Silva (Cópia)',
        telefone: '54981108228',
        whatsapp: '54981108228',
        cidade: 'Erechim',
        estado: 'RS',
        status: 'Novo Lead',
        created: '2026-09-02T10:00:00Z',
        updated: '2026-09-02T10:00:00Z',
      } as Cliente,
      // Cliente de Teste
      {
        id: 'cli_3',
        nome: 'Lead Teste Exemplo',
        telefone: '54999990000',
        whatsapp: '54999990000',
        cidade: 'Erechim',
        status: 'Novo Lead',
        created: '2026-09-03T10:00:00Z',
        updated: '2026-09-03T10:00:00Z',
      } as Cliente,
      // Cliente sem telefone
      {
        id: 'cli_4',
        nome: 'Empresa Sem Telefone Ltda',
        telefone: '',
        whatsapp: '',
        cidade: 'Passo Fundo',
        status: 'Orçamento',
        created: '2026-09-04T10:00:00Z',
        updated: '2026-09-04T10:00:00Z',
      } as Cliente,
      // Cliente com erro de digitação no telefone (apenas 5 dígitos)
      {
        id: 'cli_5',
        nome: 'Cliente Número Curto',
        telefone: '54999',
        whatsapp: '54999',
        cidade: 'Marau',
        status: 'Levantamento',
        created: '2026-09-05T10:00:00Z',
        updated: '2026-09-05T10:00:00Z',
      } as Cliente,
    ]

    const contatosAdicionais: ContatoAdicional[] = [
      {
        id: 'ca_1',
        nome: 'Contato Adicional João',
        cliente: 'cli_1',
        telefone: '54991268473',
        is_whatsapp: true,
        created: '2026-09-01T12:00:00Z',
        updated: '2026-09-01T12:00:00Z',
      } as ContatoAdicional,
    ]

    const outrosContatos: OutroContato[] = [
      {
        id: 'oc_1',
        nome: 'Fornecedor Solar',
        telefone: '00000000000',
        tipo_contato: 'fornecedor',
        created: '2026-09-01T14:00:00Z',
        updated: '2026-09-01T14:00:00Z',
      } as OutroContato,
    ]

    const conversasWhatsApp: WhatsAppConversa[] = [
      {
        id: 'conv_1',
        numero: '5554996475030',
        status: 'novo',
        ultima_mensagem_preview: 'Gostaria de saber mais sobre energia solar',
        created: '2026-09-06T10:00:00Z',
        updated: '2026-09-06T10:00:00Z',
      } as WhatsAppConversa,
    ]

    const analise = analisarBaseCentralAtendimento({
      clientes,
      contatosAdicionais,
      outrosContatos,
      conversasWhatsApp,
    })

    // Total de registros na Base Completa
    // 5 clientes + 1 adicional + 1 outro contato + 1 conversa avulsa = 8
    expect(analise.baseCompleta.length).toBe(8)

    // Repetidos (cli_1 e cli_2 compartilham 54981108228)
    expect(analise.repetidos.length).toBeGreaterThanOrEqual(2)
    expect(analise.repetidos.some((r) => r.id === 'cli_1')).toBe(true)
    expect(analise.repetidos.some((r) => r.id === 'cli_2')).toBe(true)

    // Dados de teste (cli_3)
    expect(analise.dadosTeste.length).toBeGreaterThanOrEqual(1)
    expect(analise.dadosTeste.some((t) => t.id === 'cli_3')).toBe(true)

    // Sem telefone (cli_4 e oc_1 com 00000000000)
    expect(analise.semTelefone.length).toBeGreaterThanOrEqual(2)
    expect(analise.semTelefone.some((s) => s.id === 'cli_4')).toBe(true)
    expect(analise.semTelefone.some((s) => s.id === 'oc_1')).toBe(true)

    // Erros de digitação (cli_5 com 5 dígitos)
    expect(analise.errosDigitacao.length).toBeGreaterThanOrEqual(1)
    expect(analise.errosDigitacao.some((e) => e.id === 'cli_5')).toBe(true)
  })

  it('gera binário PKZIP (.xlsx) válido no cliente com múltiplas abas', () => {
    const sheets = [
      {
        name: 'Base Completa',
        rows: [
          ['Nome', 'Telefone', 'Cidade'],
          ['João Silva', '54981108228', 'Erechim'],
          ['Ademar Berlanda', '54991268473', 'Erechim'],
        ],
        colWidths: [30, 20, 20],
      },
      {
        name: 'Repetidos',
        rows: [
          ['Nome', 'Telefone'],
          ['João Silva', '54981108228'],
        ],
      },
      {
        name: 'Erros de digitação',
        rows: [['Nome', 'Telefone']],
      },
      {
        name: 'Dados de teste',
        rows: [['Nome', 'Telefone']],
      },
      {
        name: 'Sem telefone',
        rows: [['Nome', 'Telefone']],
      },
    ]

    const buffer = buildXlsxBuffer(sheets)
    expect(buffer).toBeInstanceOf(Uint8Array)
    expect(buffer.length).toBeGreaterThan(500)

    // Magic bytes de arquivo PKZIP / OpenXML: 0x50, 0x4B, 0x03, 0x04 ("PK\x03\x04")
    expect(buffer[0]).toBe(0x50)
    expect(buffer[1]).toBe(0x4b)
    expect(buffer[2]).toBe(0x03)
    expect(buffer[3]).toBe(0x04)
  })
})
