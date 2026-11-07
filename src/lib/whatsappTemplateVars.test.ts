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

  it('renderiza todos os templates ativos sem deixar {{ nem colchetes órfãos', () => {
    const templatesAtivos = [
      'Olá, {{nome_cliente}}! Passando para lembrar da sua visita técnica com o time de engenharia da Delfos Solar, agendada para {{data}} no endereço {{endereco}}.',
      'Olá, {{nome_cliente}}! Tudo bem? Já se passaram alguns dias desde a conclusão da instalação do seu sistema solar fotovoltaico em {{endereco}}.',
      '📋 *Nova Ordem de Serviço atribuída* 👤 Cliente: {{nome_cliente}} 🔧 Serviço: {{tipo_servico}} 📍 Endereço: {{endereco}} 📅 Data: {{data_agendada}} Acesse o App Delfos para ver a ficha de execução.',
      'Olá, {{nome_cliente}}! Chegou o momento da leitura do medidor de energia na usina {{usina}}, instalação consumidora {{numero_uc}} e endereço {{endereco}}. Solicitamos a leitura referente a {{data}}.',
      'Prezados, Venho por meio deste solicitar o envio das faturas/contas de energia elétrica dos últimos 5 (cinco) anos, referentes à Unidade Consumidora de número [número da UC], localizada em [endereço da UC] do titular [nome do cliente].',
      'Olá! Tudo bem? Aqui é a equipe Delfos Solar 🌞 Sua usina está gerando o que deveria?',
      'Olá, [nome do cliente]! Temos uma condição especial exclusiva este mês na Delfos Solar para ampliação do seu sistema solar, inclusão de baterias ou plano de monitoramento em [cidade].',
      'Olá, [nome do cliente]! Constatamos uma pendência financeira referente à sua fatura de serviços da Delfos Solar em [cidade], com vencimento recente.',
      'Olá, {{nome}}! Tudo bem? Passando rapidinho para confirmar se você conseguiu abrir e dar uma olhada na proposta de energia solar que enviamos.',
      'Olá, {{nome}}! Pensando no seu projeto, fiz questão de destacar um ponto: com essa proposta, sua economia estimada anual chega a um valor muito expressivo.',
      'Oi, {{nome}}, tudo bem? Sei que a rotina é corrida. Queria saber se você gostaria de avaliar uma opção com outro arranjo de potência ou até parcelamento em mais vezes.',
      'Olá, {{nome}}! Tudo certo? Finalizamos recentemente uma instalação muito parecida com a que projetamos para você, gerando resultados acima da média logo no primeiro mês.',
      'Olá, {{nome}}! Estamos fechando o lote de pedidos desta quinzena com a distribuidora para segurar as condições e preços dos módulos e inversores.',
      'Olá, {{nome}}! Imagino que agora não seja o momento ideal para avançar com o projeto solar, então não quero te incomodar.',
      'Olá, {{nome}}! Tudo bem? Sou da Delfos Solar. Vi que você tem interesse em energia solar fotovoltaica para reduzir sua conta de luz.',
      'Obrigado pelo retorno, {{nome}}! Além da conta de luz, o imóvel possui telhado com boa incidência de sol?',
      'Olá, {{nome}}! Seu estudo prévio ficou pronto. O próximo passo recomendado é fazermos uma visita técnica rápida no local para avaliar o telhado.',
      'Olá, {{nome}}! Segue a sua proposta técnico-comercial personalizada da Delfos Solar no valor de {{valor}}.',
      'Olá, {{nome}}! Passando apenas para lembrar que a fatura referente aos serviços da Delfos Solar no valor de {{valor}} vence em {{data}}.',
      'Olá, {{nome}}, tudo bem? Constatamos que a fatura de {{valor}} com vencimento em {{data}} ainda não consta liquidada em nosso sistema.',
      'Olá, {{nome}}! Entramos em contato referente à pendência financeira no valor de {{valor}}, vencida desde {{data}}.',
      'Prezado(a) {{nome}}, seu contrato possui fatura em aberto de {{valor}} desde {{data}}.',
      'Olá, {{nome}}! Lembramos que a sua fatura no valor de {{valor}} tem vencimento programado para hoje ({{data}}).',
      'Olá, {{nome}}! Para garantir a máxima eficiência e a longevidade do seu investimento solar, preparamos uma proposta para o Plano Anual de O&M Delfos no valor de {{valor}}.',
      'Olá, {{nome}}! Faz 30 dias que sua usina solar Delfos foi instalada e comissionada.',
      'Olá, {{nome}}! Tudo bem? Com o aumento do consumo elétrico, muitos clientes optam por ampliar o sistema solar existente.',
      'Olá, [Nome]! Tudo bem? Aqui é a equipe Delfos Solar 🌞 Já faz cerca de 6 meses desde a limpeza e manutenção que fizemos na usina de vocês.',
      'Olá, [Nome]! Tudo bem? Aqui é a equipe Delfos Solar 🌞 Quando conversamos, você comentou que ia avaliar a limpeza mais para frente. Estou fechando a agenda de [mês] e queria deixar a usina de vocês reservada.',
      'Olá, [Nome]! Tudo bem? Aqui é a equipe Delfos Solar 🌞 Anteriormente havíamos conversado e você comentou que não era o momento da limpeza das placas por questão de orçamento.',
      'Olá! Tudo bem? Aqui é a equipe Delfos Solar 🌞 Como combinamos, estou te chamando sobre a limpeza da usina de vocês.',
      'Olá, [Nome]! Tudo bem? Aqui é a equipe Delfos Solar 🌞 Chegou dezembro, como a gente tinha falado.',
      '[Nome], vou encerrar a programação de atendimentos deste mês na sexta. Deixo a usina de vocês fora da agenda desta leva ou reservo um horário?',
      '[Nome], fico à disposição! Só me ajuda em uma coisa para eu te atender melhor: o que pesou mais foi o valor, a data de execução, ou o escopo não ter ficado claro?',
    ]

    const contextoCompleto = {
      nome: 'Carlos Souza',
      empresa: 'Delfos Solar',
      valor: 'R$ 1.500,00',
      data: '08/11/2026',
      data_agendada: '10/11/2026',
      endereco: 'Rua Principal, 500, Erechim-RS',
      tipo_servico: 'Manutenção Preventiva',
      usina: 'Usina Solar Fazenda Boa Esperança',
      numero_uc: '7001234567',
      cidade: 'Erechim',
      potencia: '15 kWp',
      mes: 'Novembro',
      id_os: 'OS-2026-0042',
    }

    for (const tpl of templatesAtivos) {
      const resultadoComContexto = interpolarTemplate(tpl, contextoCompleto)
      expect(resultadoComContexto).not.toContain('{{')
      expect(resultadoComContexto).not.toContain('}}')
      // Verifica ausência de colchetes de placeholder (ex.: [cidade], [Nome], [mês], [número da UC])
      expect(resultadoComContexto).not.toMatch(/\[[a-zA-ZáéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ\s_]+\]/)

      // Sem contexto (órfãs removidas limpas)
      const resultadoSemContexto = interpolarTemplate(tpl, {})
      expect(resultadoSemContexto).not.toContain('{{')
      expect(resultadoSemContexto).not.toContain('}}')
      expect(resultadoSemContexto).not.toMatch(/\[[a-zA-ZáéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ\s_]+\]/)
    }
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
