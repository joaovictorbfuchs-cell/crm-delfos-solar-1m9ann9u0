import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatAudioDuration,
  getSupportedAudioMimeType,
  blobToBase64,
} from './GravadorAudioWhatsApp'
import { buildWhatsAppAudioPayload } from '@/lib/whatsappGateway'

describe('Gravação e Envio de Áudio por WhatsApp Z-API', () => {
  describe('formatAudioDuration', () => {
    it('formata 0 segundos como 00:00', () => {
      expect(formatAudioDuration(0)).toBe('00:00')
    })

    it('formata segundos com zero à esquerda', () => {
      expect(formatAudioDuration(9)).toBe('00:09')
      expect(formatAudioDuration(45)).toBe('00:45')
    })

    it('formata minutos e segundos corretamente', () => {
      expect(formatAudioDuration(60)).toBe('01:00')
      expect(formatAudioDuration(75)).toBe('01:15')
      expect(formatAudioDuration(600)).toBe('10:00')
    })
  })

  describe('blobToBase64', () => {
    it('converte um Blob em data URL base64', async () => {
      const blob = new Blob(['teste-audio'], { type: 'audio/ogg' })
      const base64 = await blobToBase64(blob)
      expect(base64).toMatch(/^data:audio\/ogg;base64,/)
    })
  })

  describe('Detecção de MIME type do navegador', () => {
    const originalMediaRecorder = global.MediaRecorder

    afterEach(() => {
      global.MediaRecorder = originalMediaRecorder
    })

    it('retorna áudio/ogg se MediaRecorder não estiver definido', () => {
      const g = global as unknown as { MediaRecorder?: unknown }
      delete g.MediaRecorder
      expect(getSupportedAudioMimeType()).toBe('audio/ogg')
    })

    it('detecta áudio/ogg;codecs=opus se suportado', () => {
      const g = global as unknown as { MediaRecorder: unknown }
      g.MediaRecorder = {
        isTypeSupported: (type: string) => type === 'audio/ogg;codecs=opus',
      }
      expect(getSupportedAudioMimeType()).toBe('audio/ogg;codecs=opus')
    })

    it('fallback para webm se ogg não for suportado', () => {
      const g = global as unknown as { MediaRecorder: unknown }
      g.MediaRecorder = {
        isTypeSupported: (type: string) => type.includes('webm'),
      }
      expect(getSupportedAudioMimeType()).toBe('audio/webm;codecs=opus')
    })
  })

  describe('buildWhatsAppAudioPayload para Z-API', () => {
    it('constrói a URL para /send-audio a partir de URL Z-API', () => {
      const config = buildWhatsAppAudioPayload({
        apiUrl:
          'https://api.z-api.io/instances/3F902C5C5FE301D4EDF15EAA8B6A85A3/token/BA07F078D0E16FA524C1886E',
        apiKey: 'SECRET_CLIENT_TOKEN',
        phone: '(54) 99129-2121',
        audio: 'data:audio/ogg;base64,GkXfo59ChoEBQveBAULygQ8=',
      })

      expect(config.isZApi).toBe(true)
      expect(config.targetUrl).toBe(
        'https://api.z-api.io/instances/3F902C5C5FE301D4EDF15EAA8B6A85A3/token/BA07F078D0E16FA524C1886E/send-audio',
      )
      expect(config.headers['Client-Token']).toBe('SECRET_CLIENT_TOKEN')
      expect(config.payload.phone).toBe('5554991292121')
      expect(config.payload.waveform).toBe(true)
      expect(config.maskedTargetUrl).toContain('••••886E/send-audio')
    })

    it('troca /send-text por /send-audio quando o usuário colou o endpoint de texto', () => {
      const config = buildWhatsAppAudioPayload({
        apiUrl:
          'https://api.z-api.io/instances/3F902C5C5FE301D4EDF15EAA8B6A85A3/token/BA07F078D0E16FA524C1886E/send-text',
        phone: '54991292121',
        audio: 'data:audio/ogg;base64,abc123',
      })

      expect(config.targetUrl).toBe(
        'https://api.z-api.io/instances/3F902C5C5FE301D4EDF15EAA8B6A85A3/token/BA07F078D0E16FA524C1886E/send-audio',
      )
    })
  })
})
