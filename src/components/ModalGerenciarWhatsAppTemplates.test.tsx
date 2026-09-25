import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ModalGerenciarWhatsAppTemplates } from './ModalGerenciarWhatsAppTemplates'
import { ClientesContext } from '@/contexts/ClientesContext'

describe('ModalGerenciarWhatsAppTemplates', () => {
  const mockTemplates = [
    {
      id: 'tpl-1',
      titulo: 'Lembrete Auto Leitura RGE',
      slug: 'lembrete_auto_leitura_rge',
      categoria: 'Operacional',
      conteudo: 'Olá {{nome_cliente}}! Usina {{usina}} UC {{numero_uc}} em {{endereco}}.',
      ativo: true,
      tipo_gatilho: 'operacional',
      variaveis_disponiveis: ['nome_cliente', 'usina', 'numero_uc', 'endereco', 'data_leitura'],
    },
    {
      id: 'tpl-2',
      titulo: 'Notificação de OS para Técnico',
      slug: 'os_atribuida_instalador',
      categoria: 'Operacional',
      conteudo:
        'OS {{id_os}} para {{nome_cliente}}: {{tipo_servico}} em {{endereco}} na data {{data_agendada}}.',
      ativo: true,
      tipo_gatilho: 'operacional',
      variaveis_disponiveis: [
        'nome_cliente',
        'tipo_servico',
        'endereco',
        'data_agendada',
        'nome_instalador',
        'id_os',
      ],
    },
  ]

  const mockContextValue: any = {
    whatsAppTemplates: mockTemplates,
    carregandoWhatsAppTemplates: false,
    addWhatsAppTemplate: async () => {},
    updateWhatsAppTemplate: async () => {},
    removeWhatsAppTemplate: async () => {},
    reloadWhatsAppTemplates: async () => {},
  }

  it('aceita props open/onOpenChange e renderiza templates com categoria Operacional', () => {
    const html = renderToStaticMarkup(
      <ClientesContext.Provider value={mockContextValue}>
        <ModalGerenciarWhatsAppTemplates open={true} onOpenChange={() => {}} />
      </ClientesContext.Provider>,
    )

    expect(html).toContain('Gerenciamento de Templates de WhatsApp')
    expect(html).toContain('Lembrete Auto Leitura RGE')
    expect(html).toContain('Notificação de OS para Técnico')
    expect(html).toContain('Operacional')
    expect(html).toContain('nome_cliente')
    expect(html).toContain('usina')
  })

  it('aceita compatibilidade com props isOpen/onClose (usadas em Layout e CentralAtendimento)', () => {
    const html = renderToStaticMarkup(
      <ClientesContext.Provider value={mockContextValue}>
        <ModalGerenciarWhatsAppTemplates isOpen={true} onClose={() => {}} />
      </ClientesContext.Provider>,
    )

    expect(html).toContain('Gerenciamento de Templates de WhatsApp')
    expect(html).toContain('Lembrete Auto Leitura RGE')
    expect(html).toContain('Notificação de OS para Técnico')
  })
})
