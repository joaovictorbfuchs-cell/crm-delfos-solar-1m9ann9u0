migrate(
  (app) => {
    // 0191_normalizar_telefones_contatos.js
    // Normalização e correção de números de telefone e WhatsApp em contatos e clientes.

    const DDD_VALIDOS = new Set([
      '11',
      '12',
      '13',
      '14',
      '15',
      '16',
      '17',
      '18',
      '19',
      '21',
      '22',
      '24',
      '27',
      '28',
      '31',
      '32',
      '33',
      '34',
      '35',
      '37',
      '38',
      '41',
      '42',
      '43',
      '44',
      '45',
      '46',
      '47',
      '48',
      '49',
      '51',
      '53',
      '54',
      '55',
      '61',
      '62',
      '63',
      '64',
      '65',
      '66',
      '67',
      '68',
      '69',
      '71',
      '73',
      '74',
      '75',
      '77',
      '79',
      '81',
      '82',
      '83',
      '84',
      '85',
      '86',
      '87',
      '88',
      '89',
      '91',
      '92',
      '93',
      '94',
      '95',
      '96',
      '97',
      '98',
      '99',
    ])

    function ehSequenciaRepetida(s) {
      if (!s || s.length === 0) return true
      const c = s[0]
      for (let i = 1; i < s.length; i++) {
        if (s[i] !== c) return false
      }
      return true
    }

    function formatarNumeroBR(digits) {
      if (!digits) return ''
      const ddd = digits.slice(0, 2)
      const num = digits.slice(2)
      if (num.length === 9) {
        return '(' + ddd + ') ' + num.slice(0, 5) + '-' + num.slice(5)
      } else if (num.length === 8) {
        return '(' + ddd + ') ' + num.slice(0, 4) + '-' + num.slice(4)
      }
      return digits
    }

    // Normaliza ou descarta um número de telefone bruto brasileiro.
    // Retorna:
    // { status: 'empty' | 'invalid' | 'unchanged' | 'corrected', formatted: string, digits: string }
    function normalizarTelefone(raw) {
      if (!raw || typeof raw !== 'string') {
        return { status: 'empty', formatted: '', digits: '' }
      }

      let limpo = raw.trim()
      if (!limpo) {
        return { status: 'empty', formatted: '', digits: '' }
      }

      let digits = limpo.replace(/\D/g, '')
      if (!digits) {
        return { status: 'invalid', formatted: '', digits: '' }
      }

      // Números com apenas dígito 0 ou sequência repetida (ex: 00000000000, 11111111111)
      if (ehSequenciaRepetida(digits)) {
        return { status: 'invalid', formatted: '', digits: '' }
      }

      // Remove prefixos discagem de operadora brasileira como 021, 014, 015, 041, 031 se o tamanho ficar plausível
      // Ex: (02) 15499171-1057 -> dígitos 02154991711057 (14 digitos). 021 + 54 + 991711057 (11 dígitos).
      // Ou 0215435201500 (13 digitos). 021 + 54 + 35201500 (10 dígitos).
      const prefixesCSP = ['014', '015', '021', '031', '041', '043', '012', '023']
      for (let p = 0; p < prefixesCSP.length; p++) {
        const pref = prefixesCSP[p]
        if (digits.startsWith(pref) && digits.length >= pref.length + 10) {
          const resto = digits.slice(pref.length)
          const possivelDdd = resto.slice(0, 2)
          if (DDD_VALIDOS.has(possivelDdd) && (resto.length === 10 || resto.length === 11)) {
            digits = resto
            break
          }
        }
      }

      // Se começar com zero único de longa distância (ex: 054984025311 -> 54984025311)
      if (digits.startsWith('0') && digits.length >= 11 && digits.length <= 12) {
        const resto = digits.slice(1)
        const ddd = resto.slice(0, 2)
        if (DDD_VALIDOS.has(ddd) && (resto.length === 10 || resto.length === 11)) {
          digits = resto
        }
      }

      // Se tiver DDI 55 (12 ou 13 dígitos)
      if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
        const sem55 = digits.slice(2)
        const ddd = sem55.slice(0, 2)
        if (DDD_VALIDOS.has(ddd)) {
          digits = sem55
        }
      }

      // Tratar caso de DDD duplicado ou repetido:
      // Exemplo citado: "começa com 15 e na sequência repete o 54, ficando com 12 ou 13 dígitos" (ex: 1554981056197 ou 4154981056197)
      // Ou DDD 54 duplicado no início: 5454991234567 (13 dígitos) -> 54991234567
      // Ou CSP/prefixo colado como 1554981056197 -> 54981056197
      if (digits.length === 12 || digits.length === 13) {
        // Teste 1: DDD duplicado exato nos 4 primeiros dígitos (ex: 5454...)
        const ddd1 = digits.slice(0, 2)
        const ddd2 = digits.slice(2, 4)
        if (ddd1 === ddd2 && DDD_VALIDOS.has(ddd1)) {
          const candidato = digits.slice(2)
          if (candidato.length === 10 || candidato.length === 11) {
            digits = candidato
          }
        }
        // Teste 2: Prefixo de 2 dígitos (como 15, 41, 02) antes de um DDD válido de 2 dígitos
        // Exemplo: 1554981056197 -> 15 + 54 + 981056197 (13 dígitos -> resto 11 dígitos)
        //          4154981056197 -> 41 + 54 + 981056197 (onde 54 é o DDD regional da Delfos / cliente de Erechim)
        if (digits.length === 12 || digits.length === 13) {
          const possivelDddSegundo = digits.slice(2, 4)
          if (DDD_VALIDOS.has(possivelDddSegundo)) {
            const candidato = digits.slice(2)
            // Se o candidato tiver 10 ou 11 dígitos
            if (candidato.length === 10 || candidato.length === 11) {
              // Se os 2 primeiros dígitos do início não forem DDD válido ou se forem um CSP como 15, 21, 41
              // e o segundo DDD for 54 (ou outro válido), reduza
              digits = candidato
            }
          }
        }
      }

      // Caso de números sem DDD com 8 ou 9 dígitos:
      // Regra do projeto: se ausente, assume 54 padrão regional Delfos Solar / RS
      if (digits.length === 8 || digits.length === 9) {
        digits = '54' + digits
      }

      // Validação final de formato brasileiro válido:
      // DDD válido + 8 ou 9 dígitos = 10 ou 11 dígitos totais
      if (digits.length !== 10 && digits.length !== 11) {
        return { status: 'invalid', formatted: '', digits: '' }
      }

      const dddFinal = digits.slice(0, 2)
      if (!DDD_VALIDOS.has(dddFinal)) {
        return { status: 'invalid', formatted: '', digits: '' }
      }

      const numLocal = digits.slice(2)
      // Celular de 9 dígitos precisa começar com 9 (exceto se for fixo de 8 dígitos que não começa com 0 nem 1)
      if (numLocal.length === 9) {
        if (numLocal[0] !== '9') {
          return { status: 'invalid', formatted: '', digits: '' }
        }
      } else if (numLocal.length === 8) {
        if (numLocal[0] === '0' || numLocal[0] === '1') {
          return { status: 'invalid', formatted: '', digits: '' }
        }
      }

      // Verifica se o número local é sequência repetida (ex: 54999999999 ou 5400000000)
      if (ehSequenciaRepetida(numLocal)) {
        return { status: 'invalid', formatted: '', digits: '' }
      }

      const formatado = formatarNumeroBR(digits)

      // Se o valor original já era exatamente o número formatado ou dígitos equivalentes corretos
      if (limpo === formatado) {
        return { status: 'unchanged', formatted: formatado, digits: digits }
      }

      return { status: 'corrected', formatted: formatado, digits: digits }
    }

    const relatorio = {
      clientes: { processados: 0, corrigidos: 0, limpos: 0, exemplos: [] },
      contatos: { processados: 0, corrigidos: 0, limpos: 0, exemplos: [] },
      contatos_adicionais: { processados: 0, corrigidos: 0, limpos: 0, exemplos: [] },
      outros_contatos: { processados: 0, corrigidos: 0, limpos: 0, exemplos: [] },
      fornecedores: { processados: 0, corrigidos: 0, limpos: 0, exemplos: [] },
      profissionais: { processados: 0, corrigidos: 0, limpos: 0, exemplos: [] },
      users: { processados: 0, corrigidos: 0, limpos: 0, exemplos: [] },
      whatsapp_conversas: { processados: 0, corrigidos: 0, limpos: 0, exemplos: [] },
    }

    // 1. Processar CLIENTES
    // Campos: whatsapp, telefone, telefone_secundario, titular_telefone
    // Regra da memória: WhatsApp é autoritativo.
    // Quando WhatsApp e telefone divergirem, telefone = whatsapp (se whatsapp válido).
    // Telefone só é copiado para whatsapp quando whatsapp estiver vazio.
    let offset = 0
    const batchSize = 200
    while (true) {
      const recs = app.findRecordsByFilter('clientes', "id != ''", 'created', batchSize, offset)
      if (!recs || recs.length === 0) break

      for (let i = 0; i < recs.length; i++) {
        const rec = recs[i]
        relatorio.clientes.processados++

        let mudou = false
        const origWhats = rec.getString('whatsapp')
        const origTel = rec.getString('telefone')
        const origTelSec = rec.getString('telefone_secundario')
        const origTitularTel = rec.getString('titular_telefone')

        let normWhats = normalizarTelefone(origWhats)
        let normTel = normalizarTelefone(origTel)
        let normTelSec = normalizarTelefone(origTelSec)
        let normTitularTel = normalizarTelefone(origTitularTel)

        let finalWhats = origWhats
        let finalTel = origTel
        let finalTelSec = origTelSec
        let finalTitularTel = origTitularTel

        // Processa WhatsApp
        if (origWhats && origWhats.trim() !== '') {
          if (normWhats.status === 'invalid') {
            finalWhats = ''
            mudou = true
            relatorio.clientes.limpos++
            if (relatorio.clientes.exemplos.length < 15) {
              relatorio.clientes.exemplos.push(
                'whatsapp [' +
                  rec.getString('nome') +
                  ']: "' +
                  origWhats +
                  '" -> "" (placeholder/invalido)',
              )
            }
          } else if (normWhats.status === 'corrected') {
            finalWhats = normWhats.formatted
            mudou = true
            relatorio.clientes.corrigidos++
            if (relatorio.clientes.exemplos.length < 15) {
              relatorio.clientes.exemplos.push(
                'whatsapp [' +
                  rec.getString('nome') +
                  ']: "' +
                  origWhats +
                  '" -> "' +
                  finalWhats +
                  '"',
              )
            }
          }
        }

        // Processa Telefone Secundário
        if (origTelSec && origTelSec.trim() !== '') {
          if (normTelSec.status === 'invalid') {
            finalTelSec = ''
            mudou = true
            relatorio.clientes.limpos++
          } else if (normTelSec.status === 'corrected') {
            finalTelSec = normTelSec.formatted
            mudou = true
            relatorio.clientes.corrigidos++
          }
        }

        // Processa Titular Telefone
        if (origTitularTel && origTitularTel.trim() !== '') {
          if (normTitularTel.status === 'invalid') {
            finalTitularTel = ''
            mudou = true
            relatorio.clientes.limpos++
          } else if (normTitularTel.status === 'corrected') {
            finalTitularTel = normTitularTel.formatted
            mudou = true
            relatorio.clientes.corrigidos++
          }
        }

        // Processa Telefone com regra de autoridade WhatsApp:
        // Se WhatsApp tiver valor final válido:
        if (finalWhats && finalWhats.trim() !== '') {
          // Telefone deve ser igualado ao WhatsApp
          if (finalTel !== finalWhats) {
            if (relatorio.clientes.exemplos.length < 15) {
              relatorio.clientes.exemplos.push(
                'telefone igualado ao WhatsApp [' +
                  rec.getString('nome') +
                  ']: "' +
                  origTel +
                  '" -> "' +
                  finalWhats +
                  '"',
              )
            }
            finalTel = finalWhats
            mudou = true
            relatorio.clientes.corrigidos++
          }
        } else {
          // WhatsApp está vazio
          if (origTel && origTel.trim() !== '') {
            if (normTel.status === 'invalid') {
              finalTel = ''
              mudou = true
              relatorio.clientes.limpos++
            } else if (normTel.status === 'corrected') {
              finalTel = normTel.formatted
              finalWhats = normTel.formatted // Copia telefone para whatsapp quando whatsapp estava vazio
              mudou = true
              relatorio.clientes.corrigidos++
              if (relatorio.clientes.exemplos.length < 15) {
                relatorio.clientes.exemplos.push(
                  'telefone corrigido e copiado para whatsapp vazio [' +
                    rec.getString('nome') +
                    ']: "' +
                    origTel +
                    '" -> "' +
                    finalTel +
                    '"',
                )
              }
            } else if (normTel.status === 'unchanged') {
              // Telefone ja estava correto, copia para WhatsApp que estava vazio
              finalWhats = normTel.formatted
              mudou = true
              relatorio.clientes.corrigidos++
            }
          }
        }

        if (mudou) {
          rec.set('whatsapp', finalWhats)
          rec.set('telefone', finalTel)
          rec.set('telefone_secundario', finalTelSec)
          rec.set('titular_telefone', finalTitularTel)
          app.save(rec)
        }
      }

      if (recs.length < batchSize) break
      offset += batchSize
    }

    // 2. Processar CONTATOS
    // Campos: whatsapp, telefone
    offset = 0
    while (true) {
      let recs = []
      try {
        recs = app.findRecordsByFilter('contatos', "id != ''", 'created', batchSize, offset)
      } catch (e) {
        break
      }
      if (!recs || recs.length === 0) break

      for (let i = 0; i < recs.length; i++) {
        const rec = recs[i]
        relatorio.contatos.processados++
        let mudou = false
        const origWhats = rec.getString('whatsapp')
        const origTel = rec.getString('telefone')

        let normWhats = normalizarTelefone(origWhats)
        let normTel = normalizarTelefone(origTel)

        let finalWhats = origWhats
        let finalTel = origTel

        if (origWhats && origWhats.trim() !== '') {
          if (normWhats.status === 'invalid') {
            finalWhats = ''
            mudou = true
            relatorio.contatos.limpos++
            if (relatorio.contatos.exemplos.length < 10) {
              relatorio.contatos.exemplos.push(
                'contatos whatsapp [' +
                  rec.getString('nome') +
                  ']: "' +
                  origWhats +
                  '" -> "" (placeholder/invalido)',
              )
            }
          } else if (normWhats.status === 'corrected') {
            finalWhats = normWhats.formatted
            mudou = true
            relatorio.contatos.corrigidos++
            if (relatorio.contatos.exemplos.length < 10) {
              relatorio.contatos.exemplos.push(
                'contatos whatsapp [' +
                  rec.getString('nome') +
                  ']: "' +
                  origWhats +
                  '" -> "' +
                  finalWhats +
                  '"',
              )
            }
          }
        }

        // WhatsApp é autoritativo
        if (finalWhats && finalWhats.trim() !== '') {
          if (finalTel !== finalWhats) {
            finalTel = finalWhats
            mudou = true
            relatorio.contatos.corrigidos++
          }
        } else {
          // WhatsApp vazio
          if (origTel && origTel.trim() !== '') {
            if (normTel.status === 'invalid') {
              finalTel = ''
              mudou = true
              relatorio.contatos.limpos++
            } else if (normTel.status === 'corrected') {
              finalTel = normTel.formatted
              finalWhats = normTel.formatted
              mudou = true
              relatorio.contatos.corrigidos++
            } else if (normTel.status === 'unchanged') {
              finalWhats = normTel.formatted
              mudou = true
              relatorio.contatos.corrigidos++
            }
          }
        }

        if (mudou) {
          rec.set('whatsapp', finalWhats)
          rec.set('telefone', finalTel)
          app.save(rec)
        }
      }

      if (recs.length < batchSize) break
      offset += batchSize
    }

    // 3. Processar CONTATOS_ADICIONAIS
    // Campo: telefone
    offset = 0
    while (true) {
      let recs = []
      try {
        recs = app.findRecordsByFilter(
          'contatos_adicionais',
          "id != ''",
          'created',
          batchSize,
          offset,
        )
      } catch (e) {
        break
      }
      if (!recs || recs.length === 0) break

      for (let i = 0; i < recs.length; i++) {
        const rec = recs[i]
        relatorio.contatos_adicionais.processados++
        const origTel = rec.getString('telefone')
        if (origTel && origTel.trim() !== '') {
          const norm = normalizarTelefone(origTel)
          if (norm.status === 'invalid') {
            rec.set('telefone', '')
            app.save(rec)
            relatorio.contatos_adicionais.limpos++
            if (relatorio.contatos_adicionais.exemplos.length < 10) {
              relatorio.contatos_adicionais.exemplos.push(
                '[' + rec.getString('nome') + ']: "' + origTel + '" -> "" (placeholder/invalido)',
              )
            }
          } else if (norm.status === 'corrected') {
            rec.set('telefone', norm.formatted)
            app.save(rec)
            relatorio.contatos_adicionais.corrigidos++
            if (relatorio.contatos_adicionais.exemplos.length < 10) {
              relatorio.contatos_adicionais.exemplos.push(
                '[' + rec.getString('nome') + ']: "' + origTel + '" -> "' + norm.formatted + '"',
              )
            }
          }
        }
      }

      if (recs.length < batchSize) break
      offset += batchSize
    }

    // 4. Processar OUTROS_CONTATOS
    // Nota: 'outros_contatos.telefone' tem restrição required: true no schema original do PocketBase.
    // Portanto, registros inválidos/placeholders são removidos (delete) ou se mantidos, não podem salvar string vazia.
    // Como outros_contatos é uma coleção legada já migrada para 'contatos', se o telefone for placeholder/inválido,
    // deletamos o registro de outros_contatos ou ajustamos sem violar a constraint.
    offset = 0
    while (true) {
      let recs = []
      try {
        recs = app.findRecordsByFilter('outros_contatos', "id != ''", 'created', batchSize, offset)
      } catch (e) {
        break
      }
      if (!recs || recs.length === 0) break

      let deletouNesteLote = 0
      for (let i = 0; i < recs.length; i++) {
        const rec = recs[i]
        relatorio.outros_contatos.processados++
        const origTel = rec.getString('telefone')
        if (origTel && origTel.trim() !== '') {
          const norm = normalizarTelefone(origTel)
          if (norm.status === 'invalid') {
            // Em vez de salvar vazio (que viola 'telefone: Cannot be blank'), removemos o registro inválido da tabela legada
            app.delete(rec)
            deletouNesteLote++
            relatorio.outros_contatos.limpos++
          } else if (norm.status === 'corrected') {
            rec.set('telefone', norm.formatted)
            app.save(rec)
            relatorio.outros_contatos.corrigidos++
          }
        }
      }

      if (recs.length < batchSize) break
      // Se deletou registros, o offset precisa compensar
      offset += batchSize - deletouNesteLote
    }

    // 5. Processar FORNECEDORES
    // Campos: telefone, telefone_secundario
    offset = 0
    while (true) {
      let recs = []
      try {
        recs = app.findRecordsByFilter('fornecedores', "id != ''", 'created', batchSize, offset)
      } catch (e) {
        break
      }
      if (!recs || recs.length === 0) break

      for (let i = 0; i < recs.length; i++) {
        const rec = recs[i]
        relatorio.fornecedores.processados++
        let mudou = false
        const origTel = rec.getString('telefone')
        const origTelSec = rec.getString('telefone_secundario')

        if (origTel && origTel.trim() !== '') {
          const norm = normalizarTelefone(origTel)
          if (norm.status === 'invalid') {
            rec.set('telefone', '')
            mudou = true
            relatorio.fornecedores.limpos++
          } else if (norm.status === 'corrected') {
            rec.set('telefone', norm.formatted)
            mudou = true
            relatorio.fornecedores.corrigidos++
            if (relatorio.fornecedores.exemplos.length < 5) {
              relatorio.fornecedores.exemplos.push(
                '[' +
                  rec.getString('nome_empresa') +
                  ']: "' +
                  origTel +
                  '" -> "' +
                  norm.formatted +
                  '"',
              )
            }
          }
        }

        if (origTelSec && origTelSec.trim() !== '') {
          const normSec = normalizarTelefone(origTelSec)
          if (normSec.status === 'invalid') {
            rec.set('telefone_secundario', '')
            mudou = true
            relatorio.fornecedores.limpos++
          } else if (normSec.status === 'corrected') {
            rec.set('telefone_secundario', normSec.formatted)
            mudou = true
            relatorio.fornecedores.corrigidos++
          }
        }

        if (mudou) {
          app.save(rec)
        }
      }

      if (recs.length < batchSize) break
      offset += batchSize
    }

    // 6. Processar PROFISSIONAIS
    offset = 0
    while (true) {
      let recs = []
      try {
        recs = app.findRecordsByFilter('profissionais', "id != ''", 'created', batchSize, offset)
      } catch (e) {
        break
      }
      if (!recs || recs.length === 0) break

      for (let i = 0; i < recs.length; i++) {
        const rec = recs[i]
        relatorio.profissionais.processados++
        const origTel = rec.getString('telefone')
        if (origTel && origTel.trim() !== '') {
          const norm = normalizarTelefone(origTel)
          if (norm.status === 'invalid') {
            rec.set('telefone', '')
            app.save(rec)
            relatorio.profissionais.limpos++
          } else if (norm.status === 'corrected') {
            rec.set('telefone', norm.formatted)
            app.save(rec)
            relatorio.profissionais.corrigidos++
          }
        }
      }

      if (recs.length < batchSize) break
      offset += batchSize
    }

    // 7. Processar USERS (campo phone)
    offset = 0
    while (true) {
      let recs = []
      try {
        recs = app.findRecordsByFilter('users', "id != ''", 'created', batchSize, offset)
      } catch (e) {
        break
      }
      if (!recs || recs.length === 0) break

      for (let i = 0; i < recs.length; i++) {
        const rec = recs[i]
        relatorio.users.processados++
        const origPhone = rec.getString('phone')
        if (origPhone && origPhone.trim() !== '') {
          const norm = normalizarTelefone(origPhone)
          if (norm.status === 'invalid') {
            rec.set('phone', '')
            app.save(rec)
            relatorio.users.limpos++
          } else if (norm.status === 'corrected') {
            rec.set('phone', norm.formatted)
            app.save(rec)
            relatorio.users.corrigidos++
          }
        }
      }

      if (recs.length < batchSize) break
      offset += batchSize
    }

    // 8. Processar WHATSAPP_CONVERSAS (campo numero)
    // Nota: 'whatsapp_conversas.numero' tem restrição required: true no schema (e index UNIQUE).
    // Além disso, conversas no WhatsApp são identificadas pelo número de telefone.
    // Portanto, não limpamos para '' (violaria a constraint). Se corrigido, atualiza.
    offset = 0
    while (true) {
      let recs = []
      try {
        recs = app.findRecordsByFilter(
          'whatsapp_conversas',
          "id != ''",
          'created',
          batchSize,
          offset,
        )
      } catch (e) {
        break
      }
      if (!recs || recs.length === 0) break

      for (let i = 0; i < recs.length; i++) {
        const rec = recs[i]
        relatorio.whatsapp_conversas.processados++
        const origNum = rec.getString('numero')
        if (origNum && origNum.trim() !== '') {
          const norm = normalizarTelefone(origNum)
          if (norm.status === 'corrected') {
            try {
              rec.set('numero', norm.formatted)
              app.save(rec)
              relatorio.whatsapp_conversas.corrigidos++
            } catch (errConv) {
              // Se colidir com índice unique ou regra, mantém
            }
          }
        }
      }

      if (recs.length < batchSize) break
      offset += batchSize
    }

    console.log('=== RELATORIO DA MIGRACAO 0191_NORMALIZAR_TELEFONES ===')
    console.log(JSON.stringify(relatorio, null, 2))
  },
  (app) => {
    // Reversão de dados limpos/normalizados não é obrigatória
  },
)
