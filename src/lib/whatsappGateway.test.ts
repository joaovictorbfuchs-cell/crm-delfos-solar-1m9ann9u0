import {
  normalizeWhatsAppDestinationPhone,
  isZApiGatewayUrl,
  isValidZApiInstanceUrl,
  formatZApiEndpoint,
  maskGatewayUrl,
  buildWhatsAppSendPayload,
  extractGatewayExternalId,
} from './whatsappGateway'
import { formatWhatsAppPhone } from './formatters'
import { getWhatsAppStatusIconConfig } from '@/components/ConversaChatView'

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`)
  }
}

function assertEquals(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) {
    throw new Error(
      `Assertion failed for ${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    )
  }
}

export function runWhatsAppGatewayTests(): { passed: number; total: number; errors: string[] } {
  const tests: { name: string; fn: () => void }[] = [
    {
      name: 'Normalização de telefone: remove caracteres especiais e adiciona 55 a número com 11 dígitos',
      fn: () => {
        assertEquals(
          normalizeWhatsAppDestinationPhone('(54) 99129-2121'),
          '5554991292121',
          'DDD + 9 dígitos',
        )
      },
    },
    {
      name: 'Normalização de telefone: adiciona 55 a número com 10 dígitos (fixo/DDD)',
      fn: () => {
        assertEquals(
          normalizeWhatsAppDestinationPhone('(54) 3321-4567'),
          '555433214567',
          'DDD + 8 dígitos',
        )
      },
    },
    {
      name: 'Normalização de telefone: preserva número que já possui 55',
      fn: () => {
        assertEquals(
          normalizeWhatsAppDestinationPhone('+55 (54) 98110-8228'),
          '5554981108228',
          'Número internacional já com 55',
        )
        assertEquals(
          normalizeWhatsAppDestinationPhone('5554981108228'),
          '5554981108228',
          'Número puro com 55',
        )
      },
    },
    {
      name: 'Detecção de provedor Z-API por domínio (.com e .io)',
      fn: () => {
        assert(
          isZApiGatewayUrl('https://api.z-api.com/instances/MY_INST/token/MY_TOK'),
          'z-api.com maiúsculo/minúsculo',
        )
        assert(
          isZApiGatewayUrl(
            'https://api.z-api.io/instances/3F902C5C5FE301D4EDF15EAA8B6A85A3/token/BA07F078D0E16FA524C1886E/send-text',
          ),
          'z-api.io aceito no caso real do usuário',
        )
        assert(
          !isZApiGatewayUrl('https://api.evolution.solar.com.br/message/sendText/delfos'),
          'Outro gateway não é Z-API',
        )
      },
    },
    {
      name: 'Validação de estrutura canônica da Z-API',
      fn: () => {
        assert(
          isValidZApiInstanceUrl(
            'https://api.z-api.io/instances/3F902C5C5FE301D4EDF15EAA8B6A85A3/token/BA07F078D0E16FA524C1886E',
          ),
          'Válida sem /send-text',
        )
        assert(
          isValidZApiInstanceUrl(
            'https://api.z-api.io/instances/3F902C5C5FE301D4EDF15EAA8B6A85A3/token/BA07F078D0E16FA524C1886E/send-text',
          ),
          'Válida com /send-text',
        )
        assert(
          isValidZApiInstanceUrl('https://api.z-api.com/instances/INST_123/token/TOK_456/'),
          'Válida com barra no final',
        )
        assert(
          !isValidZApiInstanceUrl(
            'https://api.z-api.io/instances/3F902C5C5FE301D4EDF15EAA8B6A85A3',
          ),
          'Inválida se faltar /token/...',
        )
      },
    },
    {
      name: 'Formatação de endpoint Z-API (/send-text) para múltiplos formatos colados',
      fn: () => {
        const baseCom = 'https://api.z-api.com/instances/INST_123/token/TOK_456'
        const baseIoComSufixo =
          'https://api.z-api.io/instances/3F902C5C5FE301D4EDF15EAA8B6A85A3/token/BA07F078D0E16FA524C1886E/send-text'

        assertEquals(
          formatZApiEndpoint(baseCom, 'send-text'),
          'https://api.z-api.com/instances/INST_123/token/TOK_456/send-text',
          'Adição do sufixo /send-text a partir da base sem sufixo',
        )
        assertEquals(
          formatZApiEndpoint(baseIoComSufixo, 'send-text'),
          'https://api.z-api.io/instances/3F902C5C5FE301D4EDF15EAA8B6A85A3/token/BA07F078D0E16FA524C1886E/send-text',
          'Não duplicar sufixo /send-text quando usuário colou com ele',
        )
        assertEquals(
          formatZApiEndpoint(baseIoComSufixo + '/', 'send-text'),
          'https://api.z-api.io/instances/3F902C5C5FE301D4EDF15EAA8B6A85A3/token/BA07F078D0E16FA524C1886E/send-text',
          'Não duplicar sufixo mesmo com barra final',
        )
        assertEquals(
          formatZApiEndpoint('  ' + baseCom + '/SEND-TEXT  ', 'send-text'),
          'https://api.z-api.com/instances/INST_123/token/TOK_456/send-text',
          'Tratar espaços e maiúsculas no sufixo',
        )
      },
    },
    {
      name: 'Mascaramento seguro de token na URL Z-API (.com e .io)',
      fn: () => {
        const urlCom = 'https://api.z-api.com/instances/3C829910292/token/992A8849FBB22019'
        const maskedCom = maskGatewayUrl(urlCom)
        assertEquals(
          maskedCom,
          'https://api.z-api.com/instances/3C829910292/token/••••2019',
          'Token da Z-API .com deve ser mascarado',
        )

        const urlIo =
          'https://api.z-api.io/instances/3F902C5C5FE301D4EDF15EAA8B6A85A3/token/BA07F078D0E16FA524C1886E/send-text'
        const maskedIo = maskGatewayUrl(urlIo)
        assertEquals(
          maskedIo,
          'https://api.z-api.io/instances/3F902C5C5FE301D4EDF15EAA8B6A85A3/token/••••886E/send-text',
          'Token da Z-API .io com sufixo deve ser mascarado preservando formato',
        )
      },
    },
    {
      name: 'Montagem de payload para Z-API (caso real do usuário com api.z-api.io e /send-text)',
      fn: () => {
        const config = buildWhatsAppSendPayload({
          apiUrl:
            'https://api.z-api.io/instances/3F902C5C5FE301D4EDF15EAA8B6A85A3/token/BA07F078D0E16FA524C1886E/send-text\n',
          apiKey: 'CLIENT_TOKEN_SECRET_999\n',
          phone: '(54) 98110-8228',
          message: 'teste skip',
        })

        assert(config.isZApi, 'Deve detectar Z-API no host api.z-api.io')
        assert(Boolean(config.isWellFormedZApi), 'Estrutura deve ser válida')
        assertEquals(
          config.targetUrl,
          'https://api.z-api.io/instances/3F902C5C5FE301D4EDF15EAA8B6A85A3/token/BA07F078D0E16FA524C1886E/send-text',
          'URL final formatada perfeitamente',
        )
        assertEquals(
          config.headers['Client-Token'],
          'CLIENT_TOKEN_SECRET_999',
          'Header Client-Token sem quebra de linha',
        )
        assertEquals(config.payload.phone, '5554981108228', 'Telefone com 55')
        assertEquals(config.payload.message, 'teste skip', 'Mensagem preservada')
        assert(!('number' in config.payload), 'Não deve enviar campo redundante "number" na Z-API')
        assertEquals(
          config.maskedTargetUrl,
          'https://api.z-api.io/instances/3F902C5C5FE301D4EDF15EAA8B6A85A3/token/••••886E/send-text',
          'Target URL mascarada com segurança para log',
        )
      },
    },
    {
      name: 'Montagem de payload para gateway genérico / Evolution API',
      fn: () => {
        const config = buildWhatsAppSendPayload({
          apiUrl: 'https://gateway.meu-zap.com/message/sendText',
          apiKey: 'EVOLUTION_TOKEN',
          originNumber: '5554999999999',
          phone: '54991292121',
          message: 'Mensagem genérica',
        })

        assert(!config.isZApi, 'Não deve marcar como Z-API')
        assertEquals(config.headers['apikey'], 'EVOLUTION_TOKEN', 'Header apikey genérico')
        assertEquals(config.payload.phone, '5554991292121', 'Phone normalizado')
        assertEquals(config.payload.number, '5554991292121', 'Number preenchido')
        assertEquals(config.payload.sender, '5554999999999', 'Sender de origem')
      },
    },
    {
      name: 'Extração de ID de resposta Z-API e genérico',
      fn: () => {
        assertEquals(
          extractGatewayExternalId({ messageId: 'MSG-ZAPI-101' }),
          'MSG-ZAPI-101',
          'Z-API messageId',
        )
        assertEquals(extractGatewayExternalId({ id: 'ID-ZAPI-102' }), 'ID-ZAPI-102', 'Z-API id')
        assertEquals(extractGatewayExternalId({ zaapId: 'ZAAP-999' }), 'ZAAP-999', 'Z-API zaapId')
        assertEquals(
          extractGatewayExternalId({ key: { id: 'EVOLUTION_KEY_123' } }),
          'EVOLUTION_KEY_123',
          'Evolution key.id',
        )
      },
    },
    {
      name: 'Formatação de telefone WhatsApp (formatWhatsAppPhone): remoção de DDI 55 e formatação correta',
      fn: () => {
        // Casos descritos na tarefa:
        // "5554981108228" → "(54) 98110-8228"
        // "555433214567" → "(54) 3321-4567"
        // "+55 (54) 98110-8228" → "(54) 98110-8228"
        // "54981108228" → "(54) 98110-8228"
        assertEquals(
          formatWhatsAppPhone('5554981108228'),
          '(54) 98110-8228',
          '13 dígitos começando com 55 (celular)',
        )
        assertEquals(
          formatWhatsAppPhone('555433214567'),
          '(54) 3321-4567',
          '12 dígitos começando com 55 (fixo)',
        )
        assertEquals(
          formatWhatsAppPhone('+55 (54) 98110-8228'),
          '(54) 98110-8228',
          'Formatado com +55',
        )
        assertEquals(
          formatWhatsAppPhone('54981108228'),
          '(54) 98110-8228',
          '11 dígitos sem 55 (celular)',
        )
        assertEquals(
          formatWhatsAppPhone('5433214567'),
          '(54) 3321-4567',
          '10 dígitos sem 55 (fixo)',
        )
        assertEquals(formatWhatsAppPhone(''), '', 'String vazia')
        assertEquals(formatWhatsAppPhone(null), '', 'Valor nulo')
        assertEquals(formatWhatsAppPhone(undefined), '', 'Valor indefinido')
        assertEquals(formatWhatsAppPhone('54'), '(54', 'Parcial: 2 dígitos')
        assertEquals(formatWhatsAppPhone('549'), '(54) 9', 'Parcial: 3 dígitos')
        assertEquals(formatWhatsAppPhone('549811'), '(54) 9811', 'Parcial: 6 dígitos')
        assertEquals(formatWhatsAppPhone('5498110'), '(54) 9811-0', 'Parcial: 7 dígitos')
      },
    },
    {
      name: 'Status WhatsApp no visual web: duplo-check cinza para enviada e entregue, duplo azul para lida',
      fn: () => {
        // Mensagens enviadas com sucesso exibem dois checks cinzas (#8696a0) por padrão (entregue)
        const cfgEnviada = getWhatsAppStatusIconConfig('enviada')
        assertEquals(cfgEnviada.iconType, 'double-check', 'Enviada deve ter duplo check')
        assertEquals(cfgEnviada.color, '#8696a0', 'Enviada deve ser cinza')
        assertEquals(cfgEnviada.tooltip, 'Entregue', 'Enviada tooltip Entregue')

        const cfgEntregue = getWhatsAppStatusIconConfig('entregue')
        assertEquals(cfgEntregue.iconType, 'double-check', 'Entregue deve ter duplo check')
        assertEquals(cfgEntregue.color, '#8696a0', 'Entregue deve ser cinza')
        assertEquals(cfgEntregue.tooltip, 'Entregue', 'Entregue tooltip Entregue')

        // Mensagens com confirmação de leitura exibem duplo check azul (#53bdeb)
        const cfgLida = getWhatsAppStatusIconConfig('lida')
        assertEquals(cfgLida.iconType, 'double-check', 'Lida deve ter duplo check')
        assertEquals(cfgLida.color, '#53bdeb', 'Lida deve ser azul #53bdeb')
        assertEquals(cfgLida.tooltip, 'Lida', 'Lida tooltip Lida')

        // Mensagens com falha exibem check simples cinza discreto + tooltip do motivo (sem círculo vermelho)
        const cfgFalha = getWhatsAppStatusIconConfig('falha', 'Instância desconectada')
        assertEquals(cfgFalha.iconType, 'single-check', 'Falha deve ter check simples')
        assertEquals(cfgFalha.color, '#8696a0', 'Falha deve ser cinza discreto')
        assertEquals(
          cfgFalha.tooltip,
          'Falha no envio: Instância desconectada',
          'Falha tooltip com motivo',
        )

        // Mensagens agendadas exibem relógio
        const cfgAgendada = getWhatsAppStatusIconConfig('agendada')
        assertEquals(cfgAgendada.iconType, 'clock', 'Agendada deve ter relógio')
        assertEquals(cfgAgendada.tooltip, 'Agendada', 'Agendada tooltip')

        // Mensagens pendentes/enviando exibem relógio
        const cfgPendente = getWhatsAppStatusIconConfig('pendente')
        assertEquals(cfgPendente.iconType, 'clock', 'Pendente deve ter relógio')
        assertEquals(cfgPendente.tooltip, 'Enviando', 'Pendente tooltip')
      },
    },
  ]

  let passed = 0
  const errors: string[] = []

  for (const t of tests) {
    try {
      t.fn()
      passed++
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      errors.push(`${t.name}: ${msg}`)
    }
  }

  return { passed, total: tests.length, errors }
}
