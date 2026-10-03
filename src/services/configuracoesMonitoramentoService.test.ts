import { describe, it, expect } from 'vitest'
import {
  sugerirConfiguracaoPorMarca,
  getProcedimentoMonitoramentoUrl,
} from '@/services/configuracoesMonitoramentoService'
import type { ConfiguracaoMonitoramento } from '@/types/equipamentos'

describe('configuracoesMonitoramentoService', () => {
  const mockCatalogo: ConfiguracaoMonitoramento[] = [
    {
      id: 'cfg_huawei',
      collectionId: 'pbc_1',
      collectionName: 'configuracoes_monitoramento',
      marca: 'Huawei',
      titulo: 'Configuração Datalogger / FusionSolar - Huawei',
      tipo_procedimento: 'link',
      link_procedimento: 'https://intl.fusionsolar.huawei.com',
      instrucoes: 'Conectar no FusionSolar',
      ativo: true,
      created: '2026-10-01',
      updated: '2026-10-01',
    },
    {
      id: 'cfg_growatt',
      collectionId: 'pbc_1',
      collectionName: 'configuracoes_monitoramento',
      marca: 'Growatt',
      titulo: 'Manual PDF Datalogger ShineWiFi - Growatt',
      tipo_procedimento: 'pdf',
      arquivo_pdf: 'growatt_manual_datalogger.pdf',
      instrucoes: 'Seguir passo a passo do PDF',
      ativo: true,
      created: '2026-10-01',
      updated: '2026-10-01',
    },
    {
      id: 'cfg_deye',
      collectionId: 'pbc_1',
      collectionName: 'configuracoes_monitoramento',
      marca: 'Deye',
      titulo: 'Passo a passo Deye Datalogger',
      tipo_procedimento: 'link',
      link_procedimento: 'http://10.10.100.254',
      ativo: true,
      created: '2026-10-01',
      updated: '2026-10-01',
    },
  ]

  it('sugere configuração por correspondência exata de marca (case-insensitive)', () => {
    const sugHuawei = sugerirConfiguracaoPorMarca('huawei', mockCatalogo)
    expect(sugHuawei).not.toBeNull()
    expect(sugHuawei?.id).toBe('cfg_huawei')

    const sugGrowatt = sugerirConfiguracaoPorMarca('GROWATT', mockCatalogo)
    expect(sugGrowatt).not.toBeNull()
    expect(sugGrowatt?.id).toBe('cfg_growatt')
  })

  it('sugere configuração por correspondência parcial/tolerante', () => {
    const sug = sugerirConfiguracaoPorMarca('Huawei Solar Inverter', mockCatalogo)
    expect(sug).not.toBeNull()
    expect(sug?.id).toBe('cfg_huawei')
  })

  it('retorna null se não houver marca informada ou compatível', () => {
    expect(sugerirConfiguracaoPorMarca('', mockCatalogo)).toBeNull()
    expect(sugerirConfiguracaoPorMarca('Marca Inexistente XYZ 999', mockCatalogo)).toBeNull()
  })

  it('getProcedimentoMonitoramentoUrl prioriza PDF quando presente e identifica tipo', () => {
    const cfgPdf = mockCatalogo.find((c) => c.id === 'cfg_growatt')!
    const resPdf = getProcedimentoMonitoramentoUrl(cfgPdf)
    expect(resPdf.tipo).toBe('pdf')
    expect(resPdf.url).toContain('growatt_manual_datalogger.pdf')

    const cfgLink = mockCatalogo.find((c) => c.id === 'cfg_huawei')!
    const resLink = getProcedimentoMonitoramentoUrl(cfgLink)
    expect(resLink.tipo).toBe('link')
    expect(resLink.url).toBe('https://intl.fusionsolar.huawei.com')
  })
})
