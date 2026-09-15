migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('instalacoes_galeria')

    const initialItems = [
      {
        titulo: 'Usina 114 Kwp Barra do Rio Azul/ RS',
        cidade: 'Barra do Rio Azul/RS',
        potencia_kwp: 114,
        foto_url: 'https://img.usecurling.com/p/800/600?q=solar+farm+panels&color=green',
        ordem: 1,
        destaque: true,
      },
      {
        titulo: 'Usina Cassul 185 Kwp Erechim',
        cidade: 'Erechim/RS',
        potencia_kwp: 185,
        foto_url: 'https://img.usecurling.com/p/800/600?q=commercial+solar+rooftop&color=blue',
        ordem: 2,
        destaque: true,
      },
      {
        titulo: 'Usina Clanel 123,5 Kwp Erechim/ RS',
        cidade: 'Erechim/RS',
        potencia_kwp: 123.5,
        foto_url: 'https://img.usecurling.com/p/800/600?q=industrial+solar+plant&color=teal',
        ordem: 3,
        destaque: true,
      },
      {
        titulo: 'Usina 114 Kwp Barra do Rio Azul',
        cidade: 'Barra do Rio Azul/RS',
        potencia_kwp: 114,
        foto_url: 'https://img.usecurling.com/p/800/600?q=solar+panels+field&color=green',
        ordem: 4,
        destaque: true,
      },
      {
        titulo: 'Usina 114 Kwp Cacique Doble/ RS',
        cidade: 'Cacique Doble/RS',
        potencia_kwp: 114,
        foto_url: 'https://img.usecurling.com/p/800/600?q=solar+installation+roof&color=blue',
        ordem: 5,
        destaque: true,
      },
      {
        titulo: 'Estacionamento - System 75Kw Erechim',
        cidade: 'Erechim/RS',
        potencia_kwp: 75,
        foto_url: 'https://img.usecurling.com/p/800/600?q=solar+carport+parking&color=teal',
        ordem: 6,
        destaque: true,
      },
    ]

    for (const item of initialItems) {
      try {
        app.findFirstRecordByData('instalacoes_galeria', 'titulo', item.titulo)
      } catch (_) {
        const record = new Record(col)
        record.set('titulo', item.titulo)
        record.set('cidade', item.cidade)
        record.set('potencia_kwp', item.potencia_kwp)
        record.set('foto_url', item.foto_url)
        record.set('ordem', item.ordem)
        record.set('destaque', item.destaque)
        app.save(record)
      }
    }
  },
  (app) => {
    const records = app.findRecordsByFilter('instalacoes_galeria', '1=1', '-created', 100, 0)
    for (const rec of records) {
      try {
        app.delete(rec)
      } catch (_) {}
    }
  },
)
