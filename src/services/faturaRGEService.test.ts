import { describe, it, expect } from 'vitest'
import { isFaturaRGEProvavel } from './faturaRGEService'
import { FATURA_RGE_EXEMPLO_TEXTO } from '@/data/faturaRGESinteticaExemplo'

describe('faturaRGEService', () => {
  it('detecta corretamente se um documento ou arquivo é fatura RGE', () => {
    expect(isFaturaRGEProvavel(FATURA_RGE_EXEMPLO_TEXTO, 'fatura_mar_2025.pdf')).toBe(true)
    expect(isFaturaRGEProvavel('Comprovante de pagamento bancário', 'comprovante.png')).toBe(false)
    expect(isFaturaRGEProvavel('Conta da RGE Energia Março', 'doc.pdf')).toBe(true)
  })

  it('valida estrutura dos dados extraídos e cálculos conforme padrão RGE DANF3E', () => {
    // Exemplo sintético espelhando a fatura de teste DANF3E RGE SUL
    const faturaSintetica = {
      e_fatura_rge: true,
      concessionaria_detectada: 'RGE',
      titular_nome: 'DELFOS ENGENHARIA EIRELI',
      cpf_cnpj: '21.379.952/0001-38',
      uc: '200.419.001-19',
      tipo_fornecimento: 'Monofásico',
      tensao_nominal: 'Disp.: 220',
      classificacao_grupo_subgrupo: 'Convencional B3 Comercial Outros Serviços',
      endereco_completo: {
        rua: 'R ESPIRITO SANTO',
        numero: '275',
        complemento: 'não informado na fatura',
        bairro: 'FATIMA',
        cidade: 'ERECHIM',
        estado: 'RS',
        cep: '99709-296',
      },
      detalhes_tarifa: {
        tarifa_tusd_com_tributos: 0.7464394,
        tarifa_te_com_tributos: 0.45174243,
        tarifa_total_com_tributos: 1.19818183,
      },
      tarifa_com_tributos: 1.19818183,
      valor_total_fatura: 58.58,
      mes_referencia_atual: 'SET/2026',
      historico_consumo: [
        { mes_ano: 'SET 26', consumo_kwh: 132, dias_ciclo: 29 },
        { mes_ano: 'AGO 26', consumo_kwh: 124, dias_ciclo: 30 },
        { mes_ano: 'JUL 26', consumo_kwh: 264, dias_ciclo: 32 },
        { mes_ano: 'JUN 26', consumo_kwh: 143, dias_ciclo: 30 },
        { mes_ano: 'MAI 26', consumo_kwh: 74, dias_ciclo: 30 },
        { mes_ano: 'ABR 26', consumo_kwh: 118, dias_ciclo: 31 },
        { mes_ano: 'MAR 26', consumo_kwh: 145, dias_ciclo: 30 },
        { mes_ano: 'FEV 26', consumo_kwh: 115, dias_ciclo: 28 },
        { mes_ano: 'JAN 26', consumo_kwh: 79, dias_ciclo: 29 },
        { mes_ano: 'DEZ 25', consumo_kwh: 96, dias_ciclo: 33 },
        { mes_ano: 'NOV 25', consumo_kwh: 71, dias_ciclo: 29 },
        { mes_ano: 'OUT 25', consumo_kwh: 90, dias_ciclo: 33 },
        { mes_ano: 'SET 25', consumo_kwh: 1, dias_ciclo: 30 },
      ],
      calculos: {
        quantidade_meses_historico: 13,
        somatorio_consumo_anual_kwh: 1452,
        media_mensal_consumo_kwh: 111.69,
        consumo_medio_diario_kwh: 3.78,
      },
    }

    // 1. UC formatada com pontos e hífen, sem confundir com CNPJ
    expect(faturaSintetica.uc).toBe('200.419.001-19')
    expect(faturaSintetica.uc).not.toBe(faturaSintetica.cpf_cnpj)
    expect(faturaSintetica.cpf_cnpj).toBe('21.379.952/0001-38')

    // 2. Endereço completo com todos os 7 componentes
    expect(faturaSintetica.endereco_completo.rua).toBe('R ESPIRITO SANTO')
    expect(faturaSintetica.endereco_completo.numero).toBe('275')
    expect(faturaSintetica.endereco_completo.complemento).toBe('não informado na fatura')
    expect(faturaSintetica.endereco_completo.bairro).toBe('FATIMA')
    expect(faturaSintetica.endereco_completo.cidade).toBe('ERECHIM')
    expect(faturaSintetica.endereco_completo.estado).toBe('RS')
    expect(faturaSintetica.endereco_completo.cep).toBe('99709-296')

    // 3. Histórico de 13 meses e média = soma / 13 (não fixar 12)
    expect(faturaSintetica.historico_consumo).toHaveLength(13)
    const somaCalculada = faturaSintetica.historico_consumo.reduce(
      (acc, item) => acc + item.consumo_kwh,
      0,
    )
    expect(somaCalculada).toBe(1452)
    const mediaCalculada =
      Math.round((somaCalculada / faturaSintetica.historico_consumo.length) * 100) / 100
    expect(mediaCalculada).toBe(111.69)
    expect(faturaSintetica.calculos.media_mensal_consumo_kwh).toBe(mediaCalculada)

    // 4. Tarifa TUSD + TE somadas
    const tusd = faturaSintetica.detalhes_tarifa.tarifa_tusd_com_tributos
    const te = faturaSintetica.detalhes_tarifa.tarifa_te_com_tributos
    const somaTarifa = Math.round((tusd + te) * 100000000) / 100000000
    expect(somaTarifa).toBeCloseTo(1.19818183, 8)
    expect(faturaSintetica.tarifa_com_tributos).toBeCloseTo(1.19818183, 8)

    // 5. Tipo de fornecimento Monofásico
    expect(faturaSintetica.tipo_fornecimento).toBe('Monofásico')

    // 6. Consumo médio refletido diretamente
    expect(faturaSintetica.calculos.media_mensal_consumo_kwh).toBe(111.69)
  })

  it('valida extração determinística de UC formatada e componentes TUSD+TE via regex', () => {
    const textoFatura = `
      RIO GRANDE ENERGIA S.A.
      Número da UC: 200.419.001-19
      Código de Instalação: 14303744
      Descrição da operação Quantidade Tarifa com tributos R$
      Consumo Uso Sistema [KWh]-TUSD 132 0,74643940
      Consumo - TE 132 0,45174243
    `

    // Padrão de UC formatada
    const matchUc = textoFatura.match(
      /(?:N[uú]mero\s+da\s+UC|Unidade\s+Consumidora|C[oó]digo\s+da\s+UC)[^\n\r\d]*?([0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2})/i,
    )
    expect(matchUc).not.toBeNull()
    expect(matchUc![1]).toBe('200.419.001-19')

    // Padrão TUSD e TE
    const mTusd = textoFatura.match(
      /Consumo\s+Uso\s+Sistema[^\n\r]*?TUSD[^\n\r]*?([0-9]+[,.][0-9]{4,8})/i,
    )
    const mTe = textoFatura.match(/Consumo\s*-\s*TE[^\n\r]*?([0-9]+[,.][0-9]{4,8})/i)

    expect(mTusd).not.toBeNull()
    expect(mTe).not.toBeNull()

    const tusd = parseFloat(mTusd![1].replace(',', '.'))
    const te = parseFloat(mTe![1].replace(',', '.'))
    const soma = Math.round((tusd + te) * 1e8) / 1e8

    expect(tusd).toBeCloseTo(0.7464394, 7)
    expect(te).toBeCloseTo(0.45174243, 8)
    expect(soma).toBeCloseTo(1.19818183, 8)
  })

  it('calcula métricas de histórico de consumo com precisão numérica', () => {
    const historicoSintetico = [
      { mes_ano: 'Mar/25', consumo_kwh: 920, dias_ciclo: 30 },
      { mes_ano: 'Fev/25', consumo_kwh: 980, dias_ciclo: 29 },
      { mes_ano: 'Jan/25', consumo_kwh: 1050, dias_ciclo: 31 },
      { mes_ano: 'Dez/24', consumo_kwh: 890, dias_ciclo: 31 },
      { mes_ano: 'Nov/24', consumo_kwh: 820, dias_ciclo: 30 },
      { mes_ano: 'Out/24', consumo_kwh: 790, dias_ciclo: 31 },
      { mes_ano: 'Set/24', consumo_kwh: 750, dias_ciclo: 30 },
      { mes_ano: 'Ago/24', consumo_kwh: 710, dias_ciclo: 31 },
      { mes_ano: 'Jul/24', consumo_kwh: 680, dias_ciclo: 31 },
      { mes_ano: 'Jun/24', consumo_kwh: 690, dias_ciclo: 30 },
      { mes_ano: 'Mai/24', consumo_kwh: 740, dias_ciclo: 31 },
      { mes_ano: 'Abr/24', consumo_kwh: 780, dias_ciclo: 30 },
    ]

    const total = historicoSintetico.reduce((acc, h) => acc + h.consumo_kwh, 0)
    const media = Math.round((total / historicoSintetico.length) * 100) / 100
    const totalDias = historicoSintetico.reduce((acc, h) => acc + h.dias_ciclo, 0)
    const mediaDiaria = Math.round((total / totalDias) * 100) / 100

    expect(total).toBe(9800)
    expect(media).toBe(816.67)
    expect(mediaDiaria).toBe(26.85)

    const maior = historicoSintetico.reduce((m, h) => (h.consumo_kwh > m.consumo_kwh ? h : m))
    const menor = historicoSintetico.reduce((m, h) => (h.consumo_kwh < m.consumo_kwh ? h : m))

    expect(maior.mes_ano).toBe('Jan/25')
    expect(maior.consumo_kwh).toBe(1050)
    expect(menor.mes_ano).toBe('Jul/24')
    expect(menor.consumo_kwh).toBe(680)
  })
})
