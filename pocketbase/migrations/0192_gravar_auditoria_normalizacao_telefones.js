migrate(
  (app) => {
    // 0192_gravar_auditoria_normalizacao_telefones.js
    // Re-executa contagem / validação e salva log estruturado para inspeção garantida

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

      if (ehSequenciaRepetida(digits)) {
        return { status: 'invalid', formatted: '', digits: '' }
      }

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

      if (digits.startsWith('0') && digits.length >= 11 && digits.length <= 12) {
        const resto = digits.slice(1)
        const ddd = resto.slice(0, 2)
        if (DDD_VALIDOS.has(ddd) && (resto.length === 10 || resto.length === 11)) {
          digits = resto
        }
      }

      if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
        const sem55 = digits.slice(2)
        const ddd = sem55.slice(0, 2)
        if (DDD_VALIDOS.has(ddd)) {
          digits = sem55
        }
      }

      if (digits.length === 12 || digits.length === 13) {
        const ddd1 = digits.slice(0, 2)
        const ddd2 = digits.slice(2, 4)
        if (ddd1 === ddd2 && DDD_VALIDOS.has(ddd1)) {
          const candidato = digits.slice(2)
          if (candidato.length === 10 || candidato.length === 11) {
            digits = candidato
          }
        }
        if (digits.length === 12 || digits.length === 13) {
          const possivelDddSegundo = digits.slice(2, 4)
          if (DDD_VALIDOS.has(possivelDddSegundo)) {
            const candidato = digits.slice(2)
            if (candidato.length === 10 || candidato.length === 11) {
              digits = candidato
            }
          }
        }
      }

      if (digits.length === 8 || digits.length === 9) {
        digits = '54' + digits
      }

      if (digits.length !== 10 && digits.length !== 11) {
        return { status: 'invalid', formatted: '', digits: '' }
      }

      const dddFinal = digits.slice(0, 2)
      if (!DDD_VALIDOS.has(dddFinal)) {
        return { status: 'invalid', formatted: '', digits: '' }
      }

      const numLocal = digits.slice(2)
      if (numLocal.length === 9) {
        if (numLocal[0] !== '9') {
          return { status: 'invalid', formatted: '', digits: '' }
        }
      } else if (numLocal.length === 8) {
        if (numLocal[0] === '0' || numLocal[0] === '1') {
          return { status: 'invalid', formatted: '', digits: '' }
        }
      }

      if (ehSequenciaRepetida(numLocal)) {
        return { status: 'invalid', formatted: '', digits: '' }
      }

      const formatado = formatarNumeroBR(digits)
      if (limpo === formatado) {
        return { status: 'unchanged', formatted: formatado, digits: digits }
      }

      return { status: 'corrected', formatted: formatado, digits: digits }
    }

    const relatorio = {
      clientes: { processados: 0, corrigidos: 0, limpos: 0, exemplos: [] },
      contatos: { processados: 0, corrigidos: 0, limpos: 0, exemplos: [] },
      contatos_adicionais: { processados: 0, corrigidos: 0, limpos: 0, exemplos: [] },
      fornecedores: { processados: 0, corrigidos: 0, limpos: 0, exemplos: [] },
      profissionais: { processados: 0, corrigidos: 0, limpos: 0, exemplos: [] },
      users: { processados: 0, corrigidos: 0, limpos: 0, exemplos: [] },
    }

    // Processar clientes
    let offset = 0
    const batchSize = 200
    while (true) {
      const recs = app.findRecordsByFilter('clientes', "id != ''", 'created', batchSize, offset)
      if (!recs || recs.length === 0) break

      for (let i = 0; i < recs.length; i++) {
        const rec = recs[i]
        relatorio.clientes.processados++
        const wpp = rec.getString('whatsapp')
        const tel = rec.getString('telefone')
        const telSec = rec.getString('telefone_secundario')
        const titTel = rec.getString('titular_telefone')

        let mudou = false
        let finalWpp = wpp
        let finalTel = tel
        let finalTelSec = telSec
        let finalTitTel = titTel

        const nWpp = normalizarTelefone(wpp)
        if (wpp && wpp.trim() !== '') {
          if (nWpp.status === 'invalid') {
            finalWpp = ''
            mudou = true
            relatorio.clientes.limpos++
            if (relatorio.clientes.exemplos.length < 20) {
              relatorio.clientes.exemplos.push({
                cliente: rec.getString('nome'),
                campo: 'whatsapp',
                de: wpp,
                para: '',
                motivo: 'placeholder/invalido',
              })
            }
          } else if (nWpp.status === 'corrected') {
            finalWpp = nWpp.formatted
            mudou = true
            relatorio.clientes.corrigidos++
            if (relatorio.clientes.exemplos.length < 20) {
              relatorio.clientes.exemplos.push({
                cliente: rec.getString('nome'),
                campo: 'whatsapp',
                de: wpp,
                para: finalWpp,
                motivo: 'normalizacao formato/DDD',
              })
            }
          }
        }

        if (telSec && telSec.trim() !== '') {
          const nSec = normalizarTelefone(telSec)
          if (nSec.status === 'invalid') {
            finalTelSec = ''
            mudou = true
            relatorio.clientes.limpos++
          } else if (nSec.status === 'corrected') {
            finalTelSec = nSec.formatted
            mudou = true
            relatorio.clientes.corrigidos++
          }
        }

        if (titTel && titTel.trim() !== '') {
          const nTit = normalizarTelefone(titTel)
          if (nTit.status === 'invalid') {
            finalTitTel = ''
            mudou = true
            relatorio.clientes.limpos++
          } else if (nTit.status === 'corrected') {
            finalTitTel = nTit.formatted
            mudou = true
            relatorio.clientes.corrigidos++
          }
        }

        // WhatsApp é autoritativo
        if (finalWpp && finalWpp.trim() !== '') {
          if (finalTel !== finalWpp) {
            relatorio.clientes.corrigidos++
            if (relatorio.clientes.exemplos.length < 20) {
              relatorio.clientes.exemplos.push({
                cliente: rec.getString('nome'),
                campo: 'telefone',
                de: tel,
                para: finalWpp,
                motivo: 'igualado ao WhatsApp autoritativo',
              })
            }
            finalTel = finalWpp
            mudou = true
          }
        } else {
          if (tel && tel.trim() !== '') {
            const nTel = normalizarTelefone(tel)
            if (nTel.status === 'invalid') {
              finalTel = ''
              mudou = true
              relatorio.clientes.limpos++
            } else if (nTel.status === 'corrected') {
              finalTel = nTel.formatted
              finalWpp = nTel.formatted
              mudou = true
              relatorio.clientes.corrigidos++
            } else if (nTel.status === 'unchanged') {
              finalWpp = nTel.formatted
              mudou = true
              relatorio.clientes.corrigidos++
            }
          }
        }

        if (mudou) {
          rec.set('whatsapp', finalWpp)
          rec.set('telefone', finalTel)
          rec.set('telefone_secundario', finalTelSec)
          rec.set('titular_telefone', finalTitTel)
          app.save(rec)
        }
      }

      if (recs.length < batchSize) break
      offset += batchSize
    }

    // Processar contatos
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
        const wpp = rec.getString('whatsapp')
        const tel = rec.getString('telefone')

        let mudou = false
        let finalWpp = wpp
        let finalTel = tel

        const nWpp = normalizarTelefone(wpp)
        if (wpp && wpp.trim() !== '') {
          if (nWpp.status === 'invalid') {
            finalWpp = ''
            mudou = true
            relatorio.contatos.limpos++
            if (relatorio.contatos.exemplos.length < 10) {
              relatorio.contatos.exemplos.push({
                contato: rec.getString('nome'),
                campo: 'whatsapp',
                de: wpp,
                para: '',
                motivo: 'placeholder/invalido',
              })
            }
          } else if (nWpp.status === 'corrected') {
            finalWpp = nWpp.formatted
            mudou = true
            relatorio.contatos.corrigidos++
            if (relatorio.contatos.exemplos.length < 10) {
              relatorio.contatos.exemplos.push({
                contato: rec.getString('nome'),
                campo: 'whatsapp',
                de: wpp,
                para: finalWpp,
                motivo: 'normalizacao formato/DDD',
              })
            }
          }
        }

        if (finalWpp && finalWpp.trim() !== '') {
          if (finalTel !== finalWpp) {
            finalTel = finalWpp
            mudou = true
            relatorio.contatos.corrigidos++
          }
        } else {
          if (tel && tel.trim() !== '') {
            const nTel = normalizarTelefone(tel)
            if (nTel.status === 'invalid') {
              finalTel = ''
              mudou = true
              relatorio.contatos.limpos++
            } else if (nTel.status === 'corrected') {
              finalTel = nTel.formatted
              finalWpp = nTel.formatted
              mudou = true
              relatorio.contatos.corrigidos++
            } else if (nTel.status === 'unchanged') {
              finalWpp = nTel.formatted
              mudou = true
              relatorio.contatos.corrigidos++
            }
          }
        }

        if (mudou) {
          rec.set('whatsapp', finalWpp)
          rec.set('telefone', finalTel)
          app.save(rec)
        }
      }

      if (recs.length < batchSize) break
      offset += batchSize
    }

    // Processar contatos adicionais
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
        const tel = rec.getString('telefone')
        if (tel && tel.trim() !== '') {
          const nTel = normalizarTelefone(tel)
          if (nTel.status === 'invalid') {
            rec.set('telefone', '')
            app.save(rec)
            relatorio.contatos_adicionais.limpos++
          } else if (nTel.status === 'corrected') {
            rec.set('telefone', nTel.formatted)
            app.save(rec)
            relatorio.contatos_adicionais.corrigidos++
            if (relatorio.contatos_adicionais.exemplos.length < 10) {
              relatorio.contatos_adicionais.exemplos.push({
                nome: rec.getString('nome'),
                de: tel,
                para: nTel.formatted,
                motivo: 'normalizacao de DDD/prefixo operadora',
              })
            }
          }
        }
      }

      if (recs.length < batchSize) break
      offset += batchSize
    }

    // Salvar auditoria permanente em uma tabela de log (atividades ou observações)
    // Usaremos a coleção 'atividades' criando uma atividade do tipo 'anotacao' com os totais exatos
    try {
      const atividadesCol = app.findCollectionByNameOrId('atividades')
      const auditRec = new Record(atividadesCol)
      auditRec.set('titulo', 'Auditoria Normalização Telefones Contatos')
      auditRec.set('tipo', 'anotacao')
      auditRec.set('autor', 'Sistema Delfos - Migração')
      auditRec.set('status', 'concluida')
      auditRec.set('descricao', JSON.stringify(relatorio))
      app.save(auditRec)
    } catch (eAudit) {
      // continua
    }
  },
  (app) => {},
)
