// Hook proxy seguro para download e entrega de mídia WhatsApp (Z-API / Backblaze / AWS / etc.)
// Endpoint: GET /backend/v1/whatsapp/media-proxy?url=... ou ?msgId=...
// Garante que o navegador consiga carregar imagens, vídeos e documentos mesmo quando:
// 1. O servidor de origem exige cabeçalho Client-Token da Z-API
// 2. O CORS do host original não permite exibição direta
// 3. A mídia precisa ser inspecionada ou servida com Content-Type correto
//
// Proteção de segurança: Nunca expõe a WHATSAPP_API_KEY ou tokens no navegador.
routerAdd('GET', '/backend/v1/whatsapp/media-proxy', (e) => {
  try {
    const rawTargetUrl = (e.requestInfo().query.url || '').trim()
    const msgId = (e.requestInfo().query.msgId || '').trim()

    let targetUrl = rawTargetUrl

    let msgRec = null
    if (msgId) {
      try {
        msgRec = $app.findFirstRecordByData('whatsapp_mensagens', 'id', msgId)
        if (msgRec) {
          // Se já possui arquivo salvo localmente no PocketBase, servir ou redirecionar
          const arquivoNome = msgRec.getString('arquivo')
          if (arquivoNome) {
            // Redireciona diretamente para a URL de arquivo do PocketBase
            return e.redirect(
              302,
              `/api/files/whatsapp_mensagens/${msgRec.id}/${encodeURIComponent(arquivoNome)}`,
            )
          }
          if (!targetUrl) {
            targetUrl = (msgRec.getString('documento_url') || '').trim()
          }
        }
      } catch (_) {}
    }

    if (!targetUrl) {
      return e.json(400, { ok: false, error: 'Parâmetro url ou msgId é obrigatório' })
    }

    // Validação de protocolo
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      return e.json(400, { ok: false, error: 'URL inválida' })
    }

    // Configurar headers para download
    const headers = {
      'User-Agent': 'DelfosSolar-CRM/1.0',
    }

    // Se for URL da Z-API ou domínio relacionado, injetar Client-Token se configurado
    const lowerUrl = targetUrl.toLowerCase()
    const isZApi =
      lowerUrl.indexOf('z-api.io') !== -1 ||
      lowerUrl.indexOf('z-api.com') !== -1 ||
      lowerUrl.indexOf('plugzapi.com') !== -1

    const apiKey = ($os.getenv('WHATSAPP_API_KEY') || '').trim().replace(/[\r\n\t]/g, '')
    if (isZApi && apiKey) {
      headers['Client-Token'] = apiKey
    }

    // Realizar requisição HTTP
    const res = $http.send({
      url: targetUrl,
      method: 'GET',
      headers: headers,
      timeout: 30,
    })

    if (res.statusCode < 200 || res.statusCode >= 300) {
      console.log(
        '[MEDIA PROXY FALHA]',
        JSON.stringify({
          url: targetUrl,
          statusCode: res.statusCode,
          hasRaw: Boolean(res.raw),
        }),
      )
      return e.json(res.statusCode || 502, {
        ok: false,
        error: `Falha ao carregar mídia do servidor de origem (${res.statusCode})`,
      })
    }

    // Obter content-type da resposta ou deduzir pela extensão da URL
    let contentType = ''
    if (res.headers) {
      for (let k in res.headers) {
        if (k.toLowerCase() === 'content-type') {
          const val = res.headers[k]
          contentType = Array.isArray(val) ? val[0] : String(val)
          break
        }
      }
    }

    if (!contentType || contentType === 'application/octet-stream') {
      const cleanUrlWithoutQuery = targetUrl.split('?')[0].toLowerCase()
      if (cleanUrlWithoutQuery.endsWith('.jpg') || cleanUrlWithoutQuery.endsWith('.jpeg')) {
        contentType = 'image/jpeg'
      } else if (cleanUrlWithoutQuery.endsWith('.png')) {
        contentType = 'image/png'
      } else if (cleanUrlWithoutQuery.endsWith('.webp')) {
        contentType = 'image/webp'
      } else if (cleanUrlWithoutQuery.endsWith('.gif')) {
        contentType = 'image/gif'
      } else if (cleanUrlWithoutQuery.endsWith('.mp4')) {
        contentType = 'video/mp4'
      } else if (cleanUrlWithoutQuery.endsWith('.ogg') || cleanUrlWithoutQuery.endsWith('.opus')) {
        contentType = 'audio/ogg'
      } else if (cleanUrlWithoutQuery.endsWith('.mp3')) {
        contentType = 'audio/mpeg'
      } else if (cleanUrlWithoutQuery.endsWith('.pdf')) {
        contentType = 'application/pdf'
      } else {
        contentType = 'application/octet-stream'
      }
    }

    // Se a mensagem existir no banco e ainda não tiver arquivo persistido, persistir agora em background
    if (msgRec && !msgRec.getString('arquivo') && (res.body || res.raw)) {
      try {
        let fName = (msgRec.getString('nome_arquivo') || '').trim()
        if (!fName) {
          const cleanPart = targetUrl.split('?')[0].split('#')[0]
          const parts = cleanPart.split('/')
          fName = parts[parts.length - 1] || 'media_whatsapp'
        }
        if (!fName.includes('.')) {
          if (contentType.includes('jpeg') || contentType.includes('jpg')) fName += '.jpg'
          else if (contentType.includes('png')) fName += '.png'
          else if (contentType.includes('webp')) fName += '.webp'
          else if (contentType.includes('mp4')) fName += '.mp4'
          else if (contentType.includes('ogg')) fName += '.ogg'
          else if (contentType.includes('pdf')) fName += '.pdf'
        }
        const savedFile = $filesystem.fileFromBytes(res.body || res.raw, fName)
        if (savedFile) {
          msgRec.set('arquivo', savedFile)
          $app.save(msgRec)
          console.log('[MEDIA PROXY] Arquivo persistido retroativamente para mensagem:', msgRec.id)
        }
      } catch (backfillErr) {
        console.log('[MEDIA PROXY] Aviso ao persistir arquivo na mensagem:', backfillErr)
      }
    }

    // Configurar headers de resposta para cache e CORS
    e.response.header().set('Content-Type', contentType)
    e.response.header().set('Cache-Control', 'public, max-age=86400')
    e.response.header().set('Access-Control-Allow-Origin', '*')

    // Retornar os bytes brutos do arquivo
    return e.blob(200, contentType, res.raw)
  } catch (err) {
    let msg = 'Erro interno no proxy de mídia'
    if (err && err.message) msg = err.message
    console.log('[MEDIA PROXY ERRO]', msg)
    return e.json(500, { ok: false, error: msg })
  }
})
