// Corrige as UCs informadas pelo João (08/11) e encurta o rótulo para o
// endereço/cidade aparecer na coluna UNIDADE da tabela de faturas.
migrate(
  (app) => {
    const fixes = [
      { de: '3082856911', para: '324500300149' },
      { de: '4003404327', para: '348643700111' },
    ]
    for (const f of fixes) {
      let recs = []
      try {
        recs = app.findRecordsByFilter('rge_credenciais', 'uc = "' + f.de + '"', '', 5, 0)
      } catch (e) {
        recs = []
      }
      for (const rec of recs) {
        rec.set('uc', f.para)
        rec.set('status', 'novo')
        rec.set('ultimo_erro', '')
        try {
          app.save(rec)
        } catch (e) {}
      }
    }
  },
  (app) => {
    // sem volta: as UCs antigas estavam erradas
  },
)
