import { describe, it, expect } from 'vitest'
import {
  formatarTextoTemplate,
  getGatilhoDescricaoFormatada,
  getAcaoDescricaoFormatada,
  getDestinoDescricaoFormatada,
} from './automacoesService'
import { Automacao } from '@/types/automacoes'

describe('automacoesService - Testes Unitários de Lógica de Avaliação e Templates', () => {
  it('deve substituir variáveis {{cliente_nome}} e {{empresa_nome}} corretamente no texto', () => {
    const template = 'Olá {{cliente_nome}}, seu projeto na {{empresa_nome}} foi aprovado!'
    const resultado = formatarTextoTemplate(template, {
      cliente_nome: 'Carlos Eduardo',
      empresa_nome: 'Delfos Solar',
    })

    expect(resultado).toBe('Olá Carlos Eduardo, seu projeto na Delfos Solar foi aprovado!')
  })

  it('deve lidar com {{nome_cliente}} como alias para compatibilidade', () => {
    const template = 'Prezado(a) {{nome_cliente}}, tudo bem?'
    const resultado = formatarTextoTemplate(template, {
      cliente_nome: 'Mariana Lima',
    })

    expect(resultado).toBe('Prezado(a) Mariana Lima, tudo bem?')
  })

  it('deve usar valores padrão quando campos não forem fornecidos', () => {
    const template = 'Olá {{cliente_nome}} da {{empresa_nome}}'
    const resultado = formatarTextoTemplate(template, {})

    expect(resultado).toBe('Olá Cliente da Delfos Solar')
  })

  it('deve gerar texto descritivo legível para gatilho "status_mudou"', () => {
    const automacao: Automacao = {
      id: '1',
      nome: 'Aviso Fechamento',
      gatilho: 'status_mudou',
      configuracao_gatilho: { status_alvo: 'Fechado' },
      acao: 'criar_atividade',
      configuracao_acao: { titulo: 'Instalar sistema' },
      destino: 'cliente_evento',
      ativa: true,
      created: '',
      updated: '',
    }

    const desc = getGatilhoDescricaoFormatada(automacao)
    expect(desc).toBe('Quando o status do cliente mudar para "Fechado"')
  })

  it('deve gerar texto descritivo legível para gatilho "data_especifica"', () => {
    const automacao: Automacao = {
      id: '2',
      nome: 'Auto leitura RGE',
      gatilho: 'data_especifica',
      configuracao_gatilho: { dia_mes: 10 },
      acao: 'criar_atividade',
      configuracao_acao: { titulo: 'Auto leitura' },
      destino: 'responsavel_empresa',
      ativa: true,
      created: '',
      updated: '',
    }

    const desc = getGatilhoDescricaoFormatada(automacao)
    expect(desc).toBe('Todo dia 10 do mês')
  })

  it('deve gerar texto descritivo legível para gatilho "dias_apos_evento"', () => {
    const automacao1: Automacao = {
      id: '3',
      nome: 'Feedback Pós Instalação',
      gatilho: 'dias_apos_evento',
      configuracao_gatilho: { dias: 7, evento_base: 'instalacao_concluida' },
      acao: 'enviar_whatsapp',
      configuracao_acao: { mensagem: 'Como está o sistema?' },
      destino: 'cliente_evento',
      ativa: true,
      created: '',
      updated: '',
    }

    expect(getGatilhoDescricaoFormatada(automacao1)).toBe('7 dias após instalação concluída')

    const automacao2: Automacao = {
      ...automacao1,
      configuracao_gatilho: { dias: 3, evento_base: 'ultima_atividade' },
    }

    expect(getGatilhoDescricaoFormatada(automacao2)).toBe('3 dias após última atividade do cliente')
  })

  it('deve gerar texto descritivo legível para ações e destinos', () => {
    const automacaoWhats: Automacao = {
      id: '4',
      nome: 'Whats',
      gatilho: 'instalacao_concluida',
      configuracao_gatilho: {},
      acao: 'enviar_whatsapp',
      configuracao_acao: { mensagem: 'msg' },
      destino: 'responsavel_empresa',
      ativa: true,
      created: '',
      updated: '',
    }

    expect(getAcaoDescricaoFormatada(automacaoWhats)).toBe('Enviar mensagem no WhatsApp')
    expect(getDestinoDescricaoFormatada(automacaoWhats)).toBe('Responsável da empresa (atendente)')
  })

  it('deve formatar ação "mudar_status" com o novo status correto', () => {
    const automacaoStatus: Automacao = {
      id: '5',
      nome: 'Mudar status',
      gatilho: 'instalacao_concluida',
      configuracao_gatilho: {},
      acao: 'mudar_status',
      configuracao_acao: { novo_status: 'Fechado' },
      destino: 'cliente_evento',
      ativa: true,
      created: '',
      updated: '',
    }

    expect(getAcaoDescricaoFormatada(automacaoStatus)).toBe(
      'Mudar status do cliente para "Fechado"',
    )
  })
})
