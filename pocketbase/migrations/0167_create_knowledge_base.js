migrate(
  (app) => {
    // 1. Coleção knowledge_categories
    const categoriesCol = new Collection({
      name: 'knowledge_categories',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      updateRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      fields: [
        { name: 'titulo', type: 'text', required: true },
        { name: 'descricao', type: 'text' },
        { name: 'icone', type: 'text' },
        { name: 'ordem', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_knowledge_categories_ordem ON knowledge_categories (ordem, created ASC)',
      ],
    })
    app.save(categoriesCol)

    // 2. Coleção knowledge_articles
    const usersCol = app.findCollectionByNameOrId('users')
    const articlesCol = new Collection({
      name: 'knowledge_articles',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      updateRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      fields: [
        {
          name: 'categoria_id',
          type: 'relation',
          collectionId: categoriesCol.id,
          required: true,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'titulo', type: 'text', required: true },
        { name: 'conteudo', type: 'text', required: true },
        { name: 'texto_extraido', type: 'text' },
        {
          name: 'anexos',
          type: 'file',
          maxSelect: 10,
          maxSize: 20971520, // 20MB
          mimeTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/png',
            'image/webp',
          ],
        },
        {
          name: 'criado_por',
          type: 'relation',
          collectionId: usersCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'autor_nome', type: 'text' },
        { name: 'tags', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_knowledge_articles_cat ON knowledge_articles (categoria_id, created DESC)',
        'CREATE INDEX idx_knowledge_articles_titulo ON knowledge_articles (titulo)',
      ],
    })
    app.save(articlesCol)

    // 3. Seed das 3 categorias sugeridas
    const catFaturas = new Record(categoriesCol)
    catFaturas.set('titulo', 'Análise de Faturas')
    catFaturas.set(
      'descricao',
      'Regras regulatórias, parâmetros tarifários e interpretação de itens da RGE / DANF3E',
    )
    catFaturas.set('icone', 'FileSpreadsheet')
    catFaturas.set('ordem', 1)
    app.save(catFaturas)

    const catComercial = new Record(categoriesCol)
    catComercial.set('titulo', 'Suporte Comercial')
    catComercial.set(
      'descricao',
      'Argumentos de venda, contra-argumentos, superação de objeções e provas sociais',
    )
    catComercial.set('icone', 'TrendingUp')
    catComercial.set('ordem', 2)
    app.save(catComercial)

    const catTecnico = new Record(categoriesCol)
    catTecnico.set('titulo', 'Suporte Técnico')
    catTecnico.set(
      'descricao',
      'Dúvidas técnicas de instalação, O&M, inversores, placas fotovoltaicas e normas',
    )
    catTecnico.set('icone', 'Wrench')
    catTecnico.set('ordem', 3)
    app.save(catTecnico)

    // Obter um usuário admin ou default para atribuir autoria dos seeds
    let adminUserId = null
    let adminUserName = 'Engenharia Delfos'
    try {
      const usersList = app.findRecordsByFilter('users', "role = 'admin'", 'created', 1, 0)
      if (usersList && usersList.length > 0) {
        adminUserId = usersList[0].id
        adminUserName = usersList[0].getString('name') || 'Engenharia Delfos'
      }
    } catch (_) {}

    // 4. Seed de artigos de exemplo com dados plausíveis e completos

    // Artigo 1 - Faturas RGE
    const artFatura1 = new Record(articlesCol)
    artFatura1.set('categoria_id', catFaturas.id)
    artFatura1.set(
      'titulo',
      'Interpretação da Tarifa RGE: Soma TUSD + TE e Componentes Obrigatórias',
    )
    artFatura1.set(
      'conteudo',
      `Na fatura de energia da concessionária RGE (CPFL Energia / DANF3E), a tarifa total de energia com tributos é calculada obrigatoriamente pela SOMA exata de duas componentes essenciais na seção "Descrição da operação":

1. Componente TUSD: "Consumo Uso Sistema [KWh] - TUSD" (Tarifa de Uso do Sistema de Distribuição com tributos, frequentemente em torno de 0,70 a 0,85 R$/kWh).
2. Componente TE: "Consumo - TE" (Tarifa de Energia com tributos, em torno de 0,40 a 0,55 R$/kWh).

A tarifa cheia total com tributos (R$/kWh) é calculada como: Tarifa_Total = TUSD_com_tributos + TE_com_tributos. Exemplo real do RS: 0,74643940 + 0,45174243 = 1,19818183 R$/kWh.

Atenção redobrada da equipe:
- NUNCA utilize valores espúrios menores que 0,40 R$/kWh (ex: 0,12 que corresponde a taxas acessórias ou iluminação pública).
- O Número da Unidade Consumidora (UC) oficial segue a máscara com 11 dígitos "000.000.000-00" (ex: 200.419.001-19). Nunca confunda com o CPF/CNPJ do titular nem com códigos de entrega interna como "ERCBU083".`,
    )
    artFatura1.set(
      'texto_extraido',
      'Regras regulatórias RGE CPFL TUSD TE Tarifa com tributos UC Unidade Consumidora DANF3E',
    )
    artFatura1.set('tags', 'rge,fatura,tusd,te,tarifa,danf3e')
    if (adminUserId) artFatura1.set('criado_por', adminUserId)
    artFatura1.set('autor_nome', adminUserName)
    app.save(artFatura1)

    // Artigo 2 - Faturas RGE: Regras de Microgeração e Compensação (GD)
    const artFatura2 = new Record(articlesCol)
    artFatura2.set('categoria_id', catFaturas.id)
    artFatura2.set('titulo', 'Regras da Lei 14.300 na RGE: Fio B, Transição GD I e GD II')
    artFatura2.set(
      'conteudo',
      `Regras regulatórias e tarifárias aplicadas pela RGE conforme o Marco Legal da Micro e Minigeração Distribuída (Lei 14.300/2022):

1. GD I (Direito Adquirido até 06/01/2023):
- Isenção integral do Fio B até 2045 para a energia compensada simultânea ou injetada.
- Paga apenas a taxa de disponibilidade mínima da distribuidora (Monofásico: 30 kWh, Bifásico: 50 kWh, Trifásico: 100 kWh) + CIP (Iluminação Pública).

2. GD II (Conexões pós-janeiro/2023):
- Cobrança escalonada da componente TUSD Fio B sobre a energia injetada na rede que é posteriormente compensada:
  * 2023: 15% do Fio B
  * 2024: 30% do Fio B
  * 2025: 45% do Fio B
  * 2026: 60% do Fio B
  * 2027: 75% do Fio B
  * 2028: 90% do Fio B
  * 2029 em diante: 100% das regras da ANEEL.

3. Autoconsumo Local vs Remoto:
- Em autoconsumo local, a energia consumida simultaneamente no momento da geração solar (fator de simultaneidade) não passa pelo medidor bidirecional e é 100% isenta de Fio B mesmo em GD II.`,
    )
    artFatura2.set(
      'texto_extraido',
      'Lei 14.300 Fio B GD I GD II Transição Simultaneidade ANEEL RGE Compensação',
    )
    artFatura2.set('tags', 'lei 14300,fio b,gd1,gd2,compensacao,aneel')
    if (adminUserId) artFatura2.set('criado_por', adminUserId)
    artFatura2.set('autor_nome', adminUserName)
    app.save(artFatura2)

    // Artigo 3 - Suporte Comercial: Objeções de Preço e Taxa de Juros
    const artComercial1 = new Record(articlesCol)
    artComercial1.set('categoria_id', catComercial.id)
    artComercial1.set('titulo', 'Superando a Objeção "Achei Caro / O Concorrente Cobrou Menos"')
    artComercial1.set(
      'conteudo',
      `Guia comercial Delfos Solar para responder à comparação de preço:

1. O Conceito do "Custo da Inércia" (Custo de Não Fazer):
- O cliente continuará pagando a conta de luz todo mês com reajustes históricos da RGE acima de 8% a 10% ao ano.
- Em 5 anos, uma fatura de R$ 800,00 resulta em mais de R$ 60.000,00 pagos à distribuidora sem gerar patrimônio algum. A energia solar troca uma conta perpétua por um ativo produtivo próprio.

2. Diferenciais de Engenharia Delfos:
- Módulos fotovoltaicos Tier-1 com garantia de geração de 25 a 30 anos e degradação máxima garantida de 0,55%/ano.
- Inversores homologados com monitoramento inteligente integrado e suporte local.
- Projeto elétrico assinado por engenheiro habilitado (ART no CREA-RS), adequação de padrão de entrada e proteção contra surtos (DPS classe II e disjuntores específicos para CC e CA).
- Concorrentes de baixo custo frequentemente cortam custos em fixadores de telhado galvanizados (que enferrujam em 2 anos) ou cabos sem proteção solar UV.

3. Payback e Retorno:
- O payback médio das nossas instalações varia de 2,8 a 4 anos, gerando economia líquida acumulada de mais de 20 anos após o retorno do capital investido.`,
    )
    artComercial1.set(
      'texto_extraido',
      'Argumentos de venda objeção preço concorrente custo da inércia payback engenharia crea',
    )
    artComercial1.set('tags', 'vendas,objecoes,preco,payback,inercia,diferenciais')
    if (adminUserId) artComercial1.set('criado_por', adminUserId)
    artComercial1.set('autor_nome', adminUserName)
    app.save(artComercial1)

    // Artigo 4 - Suporte Comercial: Financiamento vs Pagamento à Vista
    const artComercial2 = new Record(articlesCol)
    artComercial2.set('categoria_id', catComercial.id)
    artComercial2.set(
      'titulo',
      'Técnica de Venda: Troca da Conta de Luz pela Parcela do Financiamento',
    )
    artComercial2.set(
      'conteudo',
      `Estratégia comercial consagrada:

Argumentação: "Você não precisa tirar dinheiro do bolso. Você substitui a sua conta da RGE pela parcela do financiamento do seu sistema solar."

Exemplo prático de simulação:
- Conta atual da RGE: R$ 650,00/mês.
- Parcela do financiamento (BV, Santander, Solfácil ou Sicredi em 60x): R$ 620,00/mês.
- Nova conta da RGE (taxa mínima + CIP): ~R$ 80,00/mês.
- O investimento é autossustentável desde o primeiro mês, e ao quitar o financiamento em 5 anos, o cliente desfruta de 20 anos adicionais de energia praticamente gratuita.`,
    )
    artComercial2.set(
      'texto_extraido',
      'Financiamento solar troca de boleto simulacao sicredi bv santander solfacil parcelas',
    )
    artComercial2.set('tags', 'financiamento,vendas,parcelas,troca de boleto')
    if (adminUserId) artComercial2.set('criado_por', adminUserId)
    artComercial2.set('autor_nome', adminUserName)
    app.save(artComercial2)

    // Artigo 5 - Suporte Técnico: Dúvidas de Instalação e Padrão de Entrada
    const artTecnico1 = new Record(articlesCol)
    artTecnico1.set('categoria_id', catTecnico.id)
    artTecnico1.set(
      'titulo',
      'Checklist Técnico de Instalação e Adequação do Padrão de Entrada RGE',
    )
    artTecnico1.set(
      'conteudo',
      `Normas técnicas e exigências da RGE (GED-2859 e GED-2855):

1. Padrão de Entrada e Disjuntor Geral:
- Monofásico: limite máximo de 10 kWp em microgeração (geralmente até 50A ou 63A).
- Bifásico: limite de até 15 kWp (disjuntor de 63A a 80A).
- Trifásico: para potências superiores a 15 kWp até 75 kWp, exige padrão trifásico adequado com caixa de medição compatível com medidor bidirecional.

2. Seção dos Condutores CA e Proteções:
- Os cabos de corrente alternada (CA) que conectam o inversor ao quadro de distribuição devem ser dimensionados para queda de tensão inferior a 1,5%.
- Obrigatória a instalação de Dispositivo de Proteção contra Surtos (DPS) classe II tetrapolar no quadro CA e DPS de 1000Vcc no String Box CC.
- Aterramento deve possuir resistência inferior a 10 ohms (utilizar hastes cobreadas de alta condutividade).`,
    )
    artTecnico1.set(
      'texto_extraido',
      'Norma RGE GED 2859 padrão de entrada disjuntor aterramento dps stringbox queda de tensão',
    )
    artTecnico1.set('tags', 'instalacao,normas,rge,padrao,dps,disjuntor')
    if (adminUserId) artTecnico1.set('criado_por', adminUserId)
    artTecnico1.set('autor_nome', adminUserName)
    app.save(artTecnico1)

    // Artigo 6 - Suporte Técnico: Operação e Manutenção (O&M) e Limpeza
    const artTecnico2 = new Record(articlesCol)
    artTecnico2.set('categoria_id', catTecnico.id)
    artTecnico2.set(
      'titulo',
      'Protocolo de O&M: Frequência de Limpeza, Inspeção Termográfica e Reaperto',
    )
    artTecnico2.set(
      'conteudo',
      `Protocolo oficial de Operação & Manutenção (O&M) da Delfos Solar:

1. Limpeza de Módulos Fotovoltaicos:
- Frequência recomendada: a cada 6 meses em áreas residenciais/urbanas e a cada 3 a 4 meses em regiões rurais ou próximas a rodovias com muita poeira.
- Impacto da sujeira (soiling): perdas de 8% a 25% na geração mensal.
- Procedimento: água desmineralizada ou filtrada, vassoura telescópica com cerdas macias de microfibra, SEM uso de produtos químicos abrasivos ou lavadoras de alta pressão próximas às células para não provocar microfissuras.
- Executar sempre nos períodos de baixa irradiação (início da manhã ou final de tarde) para evitar choque térmico no vidro temperado.

2. Inspeção Termográfica (Câmera Flir):
- Detecta pontos quentes (hotspots) causados por diodos de bypass defeituosos, sujeira concentrada ou trincas em células fotovoltaicas.

3. Manutenção Elétrica:
- Reaperto de conexões em bornes com torquímetro calibrado.
- Inspeção de conectores MC4 e medição da curva I-V e resistência de isolamento.`,
    )
    artTecnico2.set(
      'texto_extraido',
      'OM manutencao limpeza modulos termografia hotspots mc4 torquimetro frequencia',
    )
    artTecnico2.set('tags', 'o&m,limpeza,manutencao,termografia,hotspots')
    if (adminUserId) artTecnico2.set('criado_por', adminUserId)
    artTecnico2.set('autor_nome', adminUserName)
    app.save(artTecnico2)
  },
  (app) => {
    try {
      const articlesCol = app.findCollectionByNameOrId('knowledge_articles')
      app.delete(articlesCol)
    } catch (_) {}
    try {
      const categoriesCol = app.findCollectionByNameOrId('knowledge_categories')
      app.delete(categoriesCol)
    } catch (_) {}
  },
)
