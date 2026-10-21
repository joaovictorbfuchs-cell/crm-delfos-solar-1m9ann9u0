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

    // Cabeçalho e identificação Delfos Solar canônica
    expect(html).toContain('DELFOS ENGENHARIA SOLAR')
    expect(html).toContain('Relatório de Atendimento e Condição do Sistema')
    expect(html).toContain('OS #123456')
    expect(html).toContain('Delfos Engenharia Ltda')
    expect(html).toContain('21.379.952/0001-38')

    // Dados do Cliente e Usina
    expect(html).toContain('Agropecuária Vista Verde Ltda')
    expect(html).toContain('Rua das Palmeiras, 450')
    expect(html).toContain('75,50 kWp')
    expect(html).toContain('136 módulos')
    expect(html).toContain('987654321')

    // Checklist e serviços executados
    expect(html).toContain('Inspeção visual dos módulos solares')
    expect(html).toContain('Reaperto dos conectores MC4 e quadros CA/CC')
    expect(html).toContain('Executado')
    expect(html).toContain('Pendente')
    expect(html).not.toContain('Avaliação dos componentes do sistema')
    expect(html).not.toContain('Nota técnica: Situação do atendimento')
    expect(html).not.toContain('Detalhes da limpeza')
    expect(html).not.toContain('Conclusão técnica')
    expect(html).not.toContain('>Local / Ativo<')
    expect(html).not.toContain('>Quantidade<')

    // Fotos
    expect(html).toContain('data:image/jpeg;base64,/9j/4AAQSkZJRg==')
  })

  it('agrega fotos em múltiplos itens do checklist sem sobrescrever e exibe referência "Foto N" em cada item', () => {
    const osComMultiplasFotos = {
      id: 'os_multi_fotos',
      tipo_servico: 'Manutenção' as const,
      status: 'concluida' as const,
      checklist: [
        { id: 'chk_1', item: 'Lavagem dos módulos fotovoltaicos', concluido: true },
        { id: 'chk_2', item: 'Reaperto de conectores e disjuntores', concluido: true },
        { id: 'chk_3', item: 'Inspeção do inversor', concluido: true },
      ],
      fotos: ['lavagem1.jpg', 'lavagem2.jpg', 'reaperto1.jpg', 'inversor1.jpg'],
      fotos_metadados: [
        {
          arquivo: 'lavagem1.jpg',
          item_checklist_id: 'chk_1',
          item_checklist_texto: 'Lavagem dos módulos fotovoltaicos',
        },
        {
          arquivo: 'lavagem2.jpg',
          item_checklist_id: 'chk_1',
          item_checklist_texto: 'Lavagem dos módulos fotovoltaicos',
        },
        {
          arquivo: 'reaperto1.jpg',
          item_checklist_id: 'chk_2',
          item_checklist_texto: 'Reaperto de conectores e disjuntores',
        },
        {
          arquivo: 'inversor1.jpg',
          item_checklist_id: 'chk_3',
          item_checklist_texto: 'Inspeção do inversor',
        },
      ],
    } as any

    const fotosDataUrls = [
      'data:image/jpeg;base64,foto1lavagem',
      'data:image/jpeg;base64,foto2lavagem',
      'data:image/jpeg;base64,foto3reaperto',
      'data:image/jpeg;base64,foto4inversor',
    ]

    const html = gerarHTMLRelatorioOS({
      os: osComMultiplasFotos,
      cliente: clienteMock,
      sistema: sistemaMock,
      fotosDataUrls,
    })

    // 1. A tabela de serviços executados deve referenciar as fotos corretas para cada item
    expect(html).toContain('Fotos 1 e 2')
    expect(html).toContain('Foto 3')
    expect(html).toContain('Foto 4')

    // 2. Os títulos de grupos fotográficos devem contemplar todos os itens que têm fotos
    expect(html).toContain('Lavagem dos módulos fotovoltaicos')
    expect(html).toContain('Reaperto de conectores e disjuntores')
    expect(html).toContain('Inspeção do inversor')

    // 3. Todas as fotos com seus respectivos badges devem estar presentes no HTML
    expect(html).toContain('Foto 1')
    expect(html).toContain('Foto 2')
    expect(html).toContain('Foto 3')
    expect(html).toContain('Foto 4')
    expect(html).toContain('foto1lavagem')
    expect(html).toContain('foto2lavagem')
    expect(html).toContain('foto3reaperto')
    expect(html).toContain('foto4inversor')
  })

  it('converte dataUri base64 para objeto File nativo com sucesso', () => {
    const fakeDataUri = 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXr'
    const file = dataUriToFile(fakeDataUri, 'Relatorio_OS_123456.pdf')

    expect(file).toBeInstanceOf(File)
    expect(file.name).toBe('Relatorio_OS_123456.pdf')
    expect(file.type).toBe('application/pdf')
    expect(file.size).toBeGreaterThan(0)
  })

  it('renderiza pendências customizadas quando informadas e não renderiza blocos pré-cadastrados removidos', () => {
    const html = gerarHTMLRelatorioOS({
      os: {
        id: 'os-blocos-123',
        numero_os: '999',
        tipo: 'manutencao_preventiva',
        pendencias_recomendacoes: 'Substituir conector MC4 da string 2 na próxima semana.',
      } as any,
    })

    expect(html).toContain('Substituir conector MC4 da string 2 na próxima semana.')
    expect(html).not.toContain('Diagnóstico Geral')
  })

  it('não deve misturar itens de prefixos diferentes pelo ordinal (ex: chk_limp_1 vs chk_insp_1)', () => {
    const osMockPrefixosDiferentes: Partial<OrdemServico> = {
      id: 'os-prefix-diferente',
      checklist: [
        { id: 'chk_limp_1', item: 'Lavagem técnica dos módulos', concluido: true },
        { id: 'chk_insp_1', item: 'Inspeção termográfica das strings', concluido: true },
      ],
      fotos_metadados: [
        {
          id: 'meta_limp',
          item_checklist_id: 'chk_limp_1',
          item_checklist_texto: 'Lavagem técnica dos módulos',
          arquivo: 'foto_lavagem.jpg',
        },
        {
          id: 'meta_insp',
          item_checklist_id: 'chk_insp_1',
          item_checklist_texto: 'Inspeção termográfica das strings',
          arquivo: 'foto_termica.jpg',
        },
      ] as any,
    }

    const fotosUrls = [
      'https://cloud.skip.com/api/files/os/123/hash1_foto_lavagem.jpg',
      'https://cloud.skip.com/api/files/os/123/hash2_foto_termica.jpg',
    ]

    const html = gerarHTMLRelatorioOS({
      os: osMockPrefixosDiferentes as OrdemServico,
      cliente: clienteMock,
      sistema: sistemaMock,
      fotosDataUrls: fotosUrls,
    })

    // Cada item do checklist deve receber a sua respectiva foto única, sem colisão de ordinal '1'
    expect(html).toContain('Foto 1')
    expect(html).toContain('Foto 2')
    // O registro fotográfico deve exibir os dois grupos separados
    expect(html).toContain('Lavagem técnica dos módulos')
    expect(html).toContain('Inspeção termográfica das strings')
  })

  it('casa fotos mesmo quando o PocketBase prefixa hash no upload do arquivo', () => {
    const osMockHash: Partial<OrdemServico> = {
      id: 'os-hash-upload',
      checklist: [
        { id: 'chk_limp_1', item: 'Lavagem de módulos', concluido: true },
        { id: 'chk_elet_1', item: 'Medição elétrica', concluido: true },
      ],
      fotos_metadados: [
        {
          id: 'meta_1',
          item_checklist_id: 'chk_limp_1',
          item_checklist_texto: 'Lavagem de módulos',
          arquivo: 'original_lavagem.jpg',
        },
        {
          id: 'meta_2',
          item_checklist_id: 'chk_elet_1',
          item_checklist_texto: 'Medição elétrica',
          arquivo: 'original_eletrica.jpg',
        },
      ] as any,
    }

    // URL com hash adicionado pelo PocketBase
    const fotosUrls = [
      'https://cloud.skip.com/api/files/os_table/rec_abc/xyz789_original_lavagem.jpg?token=test',
      'https://cloud.skip.com/api/files/os_table/rec_abc/uvw123_original_eletrica.jpg?token=test',
    ]

    const html = gerarHTMLRelatorioOS({
      os: osMockHash as OrdemServico,
      cliente: clienteMock,
      sistema: sistemaMock,
      fotosDataUrls: fotosUrls,
    })

    expect(html).toContain('Foto 1')
    expect(html).toContain('Foto 2')
    expect(html).toContain('Lavagem de módulos')
    expect(html).toContain('Medição elétrica')
  })

  it('deve casar fotos com itens quando IDs usam variantes de prefixo padrão (chk_limp_1 vs chk_1 ou chk_limp_2 vs chk_2)', () => {
    const osMock: Partial<OrdemServico> = {
      id: 'os-prefix-match',
      checklist: [
        { id: 'chk_1', item: 'Lavagem técnica dos módulos fotovoltaicos', concluido: true },
        { id: 'chk_2', item: 'Reaperto preventivo de disjuntores e conectores', concluido: true },
      ],
      fotos_metadados: [
        {
          id: 'meta_p1',
          item_checklist_id: 'chk_limp_1',
          item_checklist_texto: 'Lavagem técnica dos módulos fotovoltaicos',
          arquivo: 'foto_modulo_lavagem.jpg',
        },
        {
          id: 'meta_p2',
          item_checklist_id: 'chk_limp_2',
          item_checklist_texto: 'Reaperto preventivo de disjuntores e conectores',
          arquivo: 'foto_quadro_disjuntor.jpg',
        },
      ] as any,
    }

    const fotosUrls = [
      'https://cloud.skip.com/api/files/os/123/foto_modulo_lavagem.jpg',
      'https://cloud.skip.com/api/files/os/123/foto_quadro_disjuntor.jpg',
    ]

    const html = gerarHTMLRelatorioOS({
      os: osMock as OrdemServico,
      cliente: clienteMock,
      sistema: sistemaMock,
      fotosDataUrls: fotosUrls,
    })

    // Na tabela de serviços executados
    expect(html).toContain('Foto 1')
    expect(html).toContain('Foto 2')

    // No registro fotográfico: ambas as etapas devem ter título de grupo
    expect(html).toContain('Lavagem técnica dos módulos fotovoltaicos')
    expect(html).toContain('Reaperto preventivo de disjuntores e conectores')
    expect(html).toContain('foto_modulo_lavagem.jpg')
    expect(html).toContain('foto_quadro_disjuntor.jpg')
  })

  it('deve casar fotos por texto técnico e descrição do cliente tolerando acentos e maiúsculas', () => {
    const osMock: Partial<OrdemServico> = {
      id: 'os-text-match',
      checklist: [
        {
          id: 'random_uuid_1',
          item: 'Limpeza dos Módulos',
          descricao_cliente: 'Lavagem técnica com água desmineralizada',
          concluido: true,
        } as any,
        {
          id: 'random_uuid_2',
          item: 'Verificação dos Conectores MC4',
          descricao_cliente: 'Inspeção mecânica das conexões',
          concluido: true,
        } as any,
      ],
      fotos_metadados: [
        {
          id: 'meta_t1',
          item_checklist_id: 'outro_id',
          item_checklist_texto: 'limpeza dos modulos', // sem acento, minúsculo
          arquivo: 'foto1.jpg',
        },
        {
          id: 'meta_t2',
          item_checklist_id: 'outro_id_2',
          item_checklist_texto: 'INSPEÇÃO MECÂNICA DAS CONEXÕES', // bate com descricao_cliente
          arquivo: 'foto2.jpg',
        },
      ] as any,
    }

    const fotosUrls = [
      'https://cloud.skip.com/api/files/os/123/foto1.jpg',
      'https://cloud.skip.com/api/files/os/123/foto2.jpg',
    ]

    const html = gerarHTMLRelatorioOS({
      os: osMock as OrdemServico,
      cliente: clienteMock,
      sistema: sistemaMock,
      fotosDataUrls: fotosUrls,
    })

    // Evidências atribuídas aos itens certos
    expect(html).toContain('Foto 1')
    expect(html).toContain('Foto 2')
    expect(html).toContain('foto1.jpg')
    expect(html).toContain('foto2.jpg')
  })
})
