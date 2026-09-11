import {
  normalizeWhatsAppDestinationPhone,
  isZApiGatewayUrl,
  formatZApiEndpoint,
  maskGatewayUrl,
  buildWhatsAppSendPayload,
  extractGatewayExternalId,
} from './whatsappGateway'

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
      name: 'Detecção de provedor Z-API por domínio',
      fn: () => {
        assert(
          isZApiGatewayUrl('https://api.z-api.com/instances/MY_INST/token/MY_TOK'),
          'z-api.com maiúsculo/minúsculo',
        )
        assert(isZApiGatewayUrl('https://api.z-api.io/instances/ABC/token/XYZ'), 'z-api.io aceito')
        assert(
          !isZApiGatewayUrl('https://api.evolution.solar.com.br/message/sendText/delfos'),
          'Outro gateway não é Z-API',
        )
      },
    },
    {
      name: 'Formatação de endpoint Z-API (/send-text)',
      fn: () => {
        const base = 'https://api.z-api.com/instances/INST_123/token/TOK_456'
        assertEquals(
          formatZApiEndpoint(base, 'send-text'),
          'https://api.z-api.com/instances/INST_123/token/TOK_456/send-text',
          'Adição do sufixo /send-text',
        )
        assertEquals(
          formatZApiEndpoint(base + '/send-text', 'send-text'),
          'https://api.z-api.com/instances/INST_123/token/TOK_456/send-text',
          'Não duplicar sufixo /send-text',
        )
        assertEquals(
          formatZApiEndpoint(base + '/', 'send-text'),
          'https://api.z-api.com/instances/INST_123/token/TOK_456/send-text',
          'Remover barra trailing antes do append',
        )
      },
    },
    {
      name: 'Mascaramento seguro de token na URL Z-API',
      fn: () => {
        const url = 'https://api.z-api.com/instances/3C829910292/token/992A8849FBB22019'
        const masked = maskGatewayUrl(url)
        assertEquals(
          masked,
          'https://api.z-api.com/instances/3C829910292/token/••••22019',
          'Token da Z-API deve ser mascarado',
        )
      },
    },
    {
      name: 'Montagem de payload para Z-API (phone, message, Client-Token)',
      fn: () => {
        const config = buildWhatsAppSendPayload({
          apiUrl: 'https://api.z-api.com/instances/INST123/token/TOK456',
          apiKey: 'CLIENT_TOKEN_SECRET_999',
          phone: '(54) 99129-2121',
          message: 'Olá, proposta pronta!',
        })

        assert(config.isZApi, 'Deve detectar Z-API')
        assertEquals(
          config.targetUrl,
          'https://api.z-api.com/instances/INST123/token/TOK456/send-text',
          'URL final deve ter /send-text',
        )
        assertEquals(
          config.headers['Client-Token'],
          'CLIENT_TOKEN_SECRET_999',
          'Header Client-Token',
        )
        assertEquals(config.payload.phone, '5554991292121', 'Telefone normalizado no body')
        assertEquals(config.payload.message, 'Olá, proposta pronta!', 'Texto no body')
        assert(!('number' in config.payload), 'Não deve enviar campo redundante "number" na Z-API')
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
