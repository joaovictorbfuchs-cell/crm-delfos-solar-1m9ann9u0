migrate(
  (app) => {
    const clientes = app.findCollectionByNameOrId('clientes')

    // 1. Cliente Pessoa Jurídica (PJ) demonstrativo com dados enriquecidos da Receita
    const cnpjExemplo = '33.000.167/0001-01'
    let clientePJJaExiste = false
    try {
      app.findFirstRecordByData('clientes', 'cnpj', cnpjExemplo)
      clientePJJaExiste = true
    } catch (_) {
      try {
        app.findFirstRecordByData('clientes', 'nome', 'Solar do Alto Vale Engenharia LTDA')
        clientePJJaExiste = true
      } catch (_) {}
    }

    if (!clientePJJaExiste) {
      const recPJ = new Record(clientes)
      recPJ.set('nome', 'Solar do Alto Vale Engenharia LTDA')
      recPJ.set('tipo_pessoa', 'juridica')
      recPJ.set('razao_social', 'Solar do Alto Vale Engenharia e Montagens LTDA')
      recPJ.set('nome_fantasia', 'Solar do Alto Vale')
      recPJ.set('cnpj', cnpjExemplo)
      recPJ.set('situacao_cadastral', 'ATIVA')
      recPJ.set('cnae_principal', 'Instalação e manutenção elétrica fotovoltaica')
      recPJ.set('data_abertura', '2019-06-15')
      recPJ.set('telefone', '(54) 3522-7711')
      recPJ.set('telefone_secundario', '(54) 99876-1122')
      recPJ.set('whatsapp', '(54) 99876-1122')
      recPJ.set('email', 'contato@solardoaltovale.com.br')
      recPJ.set('contato_principal', 'Eng. Rafael Bittencourt')
      recPJ.set('atividade_principal', 'Instalador')
      recPJ.set('origem_lead', 'Indicação')
      recPJ.set('como_conheceu', 'Indicação')
      recPJ.set('endereco', 'Rua Carlos Gomes, 850, Sala 402')
      recPJ.set('numero', '850')
      recPJ.set('complemento', 'Sala 402 - Edifício Comercial')
      recPJ.set('bairro', 'Centro')
      recPJ.set('cidade', 'Erechim')
      recPJ.set('estado', 'RS')
      recPJ.set('cep', '99700-050')
      recPJ.set(
        'observacoes',
        'Cliente PJ integrado com usina comercial de 75 kWp em fase de expansão.',
      )
      recPJ.set('status', 'Negociação')
      recPJ.set('produto', 'Energia Solar')
      recPJ.set('potencia_kwp', 75)
      recPJ.set('valor_estimado', 295000)
      app.save(recPJ)
    }

    // 2. Cliente Pessoa Física (PF) demonstrativo com validação de CPF
    // CPF válido de teste: 81293450902 (dígitos verificadores corretos: 0 e 2)
    const cpfExemplo = '812.934.509-02'
    let clientePFJaExiste = false
    try {
      app.findFirstRecordByData('clientes', 'cpf', cpfExemplo)
      clientePFJaExiste = true
    } catch (_) {
      try {
        app.findFirstRecordByData('clientes', 'nome', 'Mariana de Oliveira Silveira')
        clientePFJaExiste = true
      } catch (_) {}
    }

    if (!clientePFJaExiste) {
      const recPF = new Record(clientes)
      recPF.set('nome', 'Mariana de Oliveira Silveira')
      recPF.set('tipo_pessoa', 'fisica')
      recPF.set('cpf', cpfExemplo)
      recPF.set('telefone', '(54) 99654-8833')
      recPF.set('telefone_secundario', '(54) 3321-4455')
      recPF.set('whatsapp', '(54) 99654-8833')
      recPF.set('email', 'mariana.silveira@gmail.com')
      recPF.set('contato_principal', 'Mariana Silveira')
      recPF.set('atividade_principal', 'Consultoria')
      recPF.set('origem_lead', 'Instagram')
      recPF.set('como_conheceu', 'Redes Sociais')
      recPF.set('endereco', 'Rua Pedro Álvares Cabral, 340')
      recPF.set('numero', '340')
      recPF.set('complemento', 'Casa')
      recPF.set('bairro', 'Bela Vista')
      recPF.set('cidade', 'Passo Fundo')
      recPF.set('estado', 'RS')
      recPF.set('cep', '99025-110')
      recPF.set(
        'observacoes',
        'Interesse em sistema residencial com telhado cerâmico e microinversores.',
      )
      recPF.set('status', 'Levantamento')
      recPF.set('produto', 'Energia Solar')
      recPF.set('potencia_kwp', 6.5)
      recPF.set('valor_estimado', 26800)
      app.save(recPF)
    }
  },
  (app) => {
    try {
      const recPJ = app.findFirstRecordByData(
        'clientes',
        'nome',
        'Solar do Alto Vale Engenharia LTDA',
      )
      app.delete(recPJ)
    } catch (_) {}
    try {
      const recPF = app.findFirstRecordByData('clientes', 'nome', 'Mariana de Oliveira Silveira')
      app.delete(recPF)
    } catch (_) {}
  },
)
