import { describe, it, expect } from 'vitest'
import {
  extrairVariaveisTemplate,
  renderizarPreviewTemplate,
  getFluxoDoTemplate,
  VARIAVEIS_WHATSAPP_SISTEMA,
} from './whatsappTemplatesMetadata'

describe('whatsappTemplatesMetadata', () => {
  it('extrai variáveis corretamente a partir do array e do conteúdo', () => {
    const conteudo =
      'Olá {{nome_cliente}}! Sua usina {{usina}} com UC {numero_uc} em {endereco} agendada para {{data_leitura}}.'
    const vars = extrairVariaveisTemplate(['nome_cliente', 'usina'], conteudo)
    expect(vars).toContain('nome_cliente')
    expect(vars).toContain('usina')
    expect(vars).toContain('numero_uc')
    expect(vars).toContain('endereco')
    expect(vars).toContain('data_leitura')
  })

  it('renderiza preview substituindo as variáveis reais do CRM', () => {
    const templateLembrete =
      'Olá, boa tarde! Chegou o momento da leitura do medidor de energia na instalação da {{usina}}, UC {{numero_uc}} e endereço {{endereco}} para o cliente {{nome_cliente}}.'
    const preview = renderizarPreviewTemplate(templateLembrete)
    expect(preview).toContain('Usina Solar Fazenda Progresso')
    expect(preview).toContain('7001458923')
    expect(preview).toContain('Rua das Camélias, 350 - Centro, Erechim/RS')
    expect(preview).toContain('Carlos Alberto Mendes')
    expect(preview).not.toContain('{{usina}}')
  })

  it('identifica corretamente fluxos do sistema para lembrete e OS', () => {
    const fluxoLembrete = getFluxoDoTemplate('lembrete_auto_leitura_rge')
    expect(fluxoLembrete).not.toBeNull()
    expect(fluxoLembrete?.categoriaSugerida).toBe('Operacional')
    expect(fluxoLembrete?.tituloUso).toContain('Auto Leitura RGE')

    const fluxoOS = getFluxoDoTemplate('os_atribuida_instalador')
    expect(fluxoOS).not.toBeNull()
    expect(fluxoOS?.categoriaSugerida).toBe('Operacional')
    expect(fluxoOS?.tituloUso).toContain('OS para Técnico')
  })

  it('possui as variáveis reais com descrição e exemplos', () => {
    expect(VARIAVEIS_WHATSAPP_SISTEMA.nome_cliente).toBeDefined()
    expect(VARIAVEIS_WHATSAPP_SISTEMA.usina).toBeDefined()
    expect(VARIAVEIS_WHATSAPP_SISTEMA.numero_uc).toBeDefined()
    expect(VARIAVEIS_WHATSAPP_SISTEMA.endereco).toBeDefined()
    expect(VARIAVEIS_WHATSAPP_SISTEMA.tipo_servico).toBeDefined()
    expect(VARIAVEIS_WHATSAPP_SISTEMA.data_agendada).toBeDefined()
  })
})
