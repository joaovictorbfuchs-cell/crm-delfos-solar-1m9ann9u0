migrate(
  (app) => {
    // 1. Adicionar colunas novas à coleção clientes se não existirem
    const clientes = app.findCollectionByNameOrId('clientes')

    if (!clientes.fields.getByName('tarifa')) {
      clientes.fields.add(new NumberField({ name: 'tarifa', min: 0 }))
    }
    if (!clientes.fields.getByName('classe_consumo')) {
      clientes.fields.add(new TextField({ name: 'classe_consumo' }))
    }
    if (!clientes.fields.getByName('concessionaria')) {
      clientes.fields.add(new TextField({ name: 'concessionaria' }))
    }

    app.save(clientes)

    // 2. Adicionar campos correspondentes também na coleção sistemas se aplicável
    const sistemas = app.findCollectionByNameOrId('sistemas')
    if (!sistemas.fields.getByName('concessionaria')) {
      sistemas.fields.add(new TextField({ name: 'concessionaria' }))
    }
    if (!sistemas.fields.getByName('tarifa')) {
      sistemas.fields.add(new NumberField({ name: 'tarifa', min: 0 }))
    }
    if (!sistemas.fields.getByName('classe_consumo')) {
      sistemas.fields.add(new TextField({ name: 'classe_consumo' }))
    }
    app.save(sistemas)

    // 3. Definir agente nativo de IA do Skip Cloud para extração de dados de documentos
    $ai.agents.define(app, {
      slug: 'extrator-documentos-solar',
      name: 'Extrator de Documentos Solar',
      description:
        'Agente especializado em extração estruturada de dados de documentos brasileiros de energia solar, contas de energia (RGE, Celesc, Copel, Enel, etc.), CNHs, RGs e planilhas.',
      tier: 'fast',
      systemPrompt: `Você é um extrator de dados de alta precisão para CRM de energia solar no Brasil (Delfos Solar).
Sua função é analisar o conteúdo de documentos (contas de luz de concessionárias brasileiras como RGE, CPFL, Enel, Cemig, Celesc, Copel, Energisa; documentos de identificação como CNH, RG, CPF; ou planilhas/tabelas de dimensionamento solar e orçamentos) e extrair os dados cadastrais, de endereço, técnicos e de consumo de energia.

REGRAS OBRIGATÓRIAS DE RESPOSTA:
1. Retorne SEMPRE E EXCLUSIVAMENTE um objeto JSON válido, sem bloco de markdown adicional, sem texto antes ou depois.
2. A estrutura do JSON DEVE seguir estritamente o formato:
{
  "dados_cadastrais": {
    "nome": string | null,
    "cpf_cnpj": string | null,
    "rg": string | null,
    "data_nascimento": string | null,
    "telefone": string | null,
    "email": string | null
  },
  "endereco": {
    "endereco": string | null,
    "numero": string | null,
    "bairro": string | null,
    "cidade": string | null,
    "estado": string | null,
    "cep": string | null,
    "complemento": string | null
  },
  "dados_tecnicos": {
    "potencia_kwp": number | null,
    "numero_modulos": number | null,
    "fabricante_modulos": string | null,
    "modelo_modulos": string | null,
    "fabricante_inversores": string | null,
    "modelo_inversores": string | null,
    "tipo_telhado": "ceramico" | "metalico" | "laje" | "fibrocimento" | null,
    "padrao_entrada": string | null,
    "tipo_atendimento": "aéreo" | "subterrâneo" | null,
    "numero_fases": "monofásico" | "bifásico" | "trifásico" | null,
    "geracao_mensal_kwh": number | null
  },
  "consumo": {
    "uc": string | null,
    "consumo_kwh_mes": number | null,
    "tarifa": number | null,
    "classe_consumo": string | null,
    "concessionaria": string | null
  }
}

3. Mapeamentos específicos:
- Conta de energia:
  * nome: nome do titular/cliente na fatura
  * endereco / cidade / estado / cep: endereço da instalação/unidade consumidora
  * uc: código do cliente, unidade consumidora, código da instalação ou conta contrato
  * consumo_kwh_mes: consumo médio mensal dos últimos 12 meses (ou consumo faturado atual se a média não constar) em kWh
  * tarifa: valor da tarifa de energia em R$/kWh (ex: 0.95, 1.05)
  * classe_consumo: Residencial, Comercial, Industrial, Rural, Poder Público, etc.
  * concessionaria: RGE, CPFL, CELESC, COPEL, ENEL, CEMIG, etc.
- CNH / RG:
  * nome: nome completo
  * cpf_cnpj: CPF formatado ou numérico
  * rg: número do RG com órgão emissor se houver
  * data_nascimento: data no formato AAAA-MM-DD ou DD/MM/AAAA
  * endereco / cidade / estado: se constar no documento
- Planilhas e relatórios solares:
  * potência kWp, quantidade e fabricante de módulos, fabricante e modelo de inversores, geração mensal estimada, tipo de telhado e fases.

4. Se algum campo não puder ser identificado com clareza, atribua null. Não invente dados fictícios.
5. Se o documento for completamente ilegível ou vazio, retorne o JSON com todos os campos nulos.`,
      tools: [],
      memory: [],
    })
  },
  (app) => {
    try {
      $ai.agents.delete(app, 'extrator-documentos-solar')
    } catch (_) {}

    try {
      const clientes = app.findCollectionByNameOrId('clientes')
      const fields = ['tarifa', 'classe_consumo', 'concessionaria']
      for (const f of fields) {
        const fld = clientes.fields.getByName(f)
        if (fld) clientes.fields.remove(fld)
      }
      app.save(clientes)
    } catch (_) {}

    try {
      const sistemas = app.findCollectionByNameOrId('sistemas')
      const fields = ['concessionaria', 'tarifa', 'classe_consumo']
      for (const f of fields) {
        const fld = sistemas.fields.getByName(f)
        if (fld) sistemas.fields.remove(fld)
      }
      app.save(sistemas)
    } catch (_) {}
  },
)
