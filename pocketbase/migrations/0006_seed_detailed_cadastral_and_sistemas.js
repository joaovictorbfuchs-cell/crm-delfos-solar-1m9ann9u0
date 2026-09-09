migrate(
  (app) => {
    // Atualizar clientes com dados cadastrais realistas
    // Cliente 1: pp4572amhvqgm81 (Maria Santos - Erechim)
    try {
      const c1 = app.findCollectionByNameOrId('clientes')
      const rec1 = app.findFirstRecordByData('clientes', 'id', 'pp4572amhvqgm81')
      rec1.set('nome_fantasia', 'Mercado Santos & Filhos')
      rec1.set('razao_social', 'Maria Santos Comercio de Alimentos LTDA')
      rec1.set('cnpj', '14.283.945/0001-82')
      rec1.set('cpf', '458.192.830-49')
      rec1.set('inscricao_estadual', '039/0129482')
      rec1.set('email', 'contato@mercadosantos.com.br')
      rec1.set('cep', '99700-010')
      rec1.set('estado', 'RS')
      rec1.set('bairro', 'Centro')
      rec1.set('numero', '450')
      rec1.set('complemento', 'Sala 02 - Térreo')
      rec1.set('contato', 'Maria Santos (Proprietária)')
      rec1.set('data_nascimento_fundacao', '1982-05-14')
      rec1.set('rg', '4091827364')
      app.save(rec1)
    } catch (e) {
      console.log('Error updating c1:', e)
    }

    // Cliente 2: v339t6jz7wy93df (João Pedro Oliveira - Passo Fundo)
    try {
      const rec2 = app.findFirstRecordByData('clientes', 'id', 'v339t6jz7wy93df')
      rec2.set('nome_fantasia', 'Residencial Oliveira')
      rec2.set('razao_social', 'João Pedro Oliveira')
      rec2.set('cnpj', '')
      rec2.set('cpf', '629.401.829-15')
      rec2.set('inscricao_estadual', 'Isento')
      rec2.set('email', 'joaopedro.oliveira@gmail.com')
      rec2.set('cep', '99010-001')
      rec2.set('estado', 'RS')
      rec2.set('bairro', 'Boqueirão')
      rec2.set('numero', '1280')
      rec2.set('complemento', 'Casa com Sobrado')
      rec2.set('contato', 'João Pedro Oliveira')
      rec2.set('data_nascimento_fundacao', '1979-11-20')
      rec2.set('rg', '2084719283')
      app.save(rec2)
    } catch (e) {
      console.log('Error updating c2:', e)
    }

    // Cliente 3: 82wz5urzbk1qkp4 (Empresa Delfos Agroindustrial - Passo Fundo)
    try {
      const rec3 = app.findFirstRecordByData('clientes', 'id', '82wz5urzbk1qkp4')
      rec3.set('nome_fantasia', 'Delfos Agroindustrial')
      rec3.set('razao_social', 'Delfos Agroindustrial e Cereais S/A')
      rec3.set('cnpj', '88.392.104/0001-90')
      rec3.set('cpf', '')
      rec3.set('inscricao_estadual', '096/0048192')
      rec3.set('email', 'diretoria@delfosagro.com.br')
      rec3.set('cep', '99050-100')
      rec3.set('estado', 'RS')
      rec3.set('bairro', 'Distrito Industrial')
      rec3.set('numero', 'Km 5')
      rec3.set('complemento', 'Pavilhão 3 - Silos')
      rec3.set('contato', 'Eng. Roberto Silveira (Gerente de Operações)')
      rec3.set('data_nascimento_fundacao', '1998-03-10')
      rec3.set('rg', '1092837465')
      app.save(rec3)
    } catch (e) {
      console.log('Error updating c3:', e)
    }

    // Cliente 4: vtszbseb345heif (Carlos Alberto Lima - Chapecó)
    try {
      const rec4 = app.findFirstRecordByData('clientes', 'id', 'vtszbseb345heif')
      rec4.set('nome_fantasia', 'Frigorífico Lima')
      rec4.set('razao_social', 'Lima & Filhos Alimentos LTDA')
      rec4.set('cnpj', '23.456.789/0001-34')
      rec4.set('cpf', '319.482.019-88')
      rec4.set('inscricao_estadual', '256.789.012')
      rec4.set('email', 'comercial@frigorificolima.com.br')
      rec4.set('cep', '89801-000')
      rec4.set('estado', 'SC')
      rec4.set('bairro', 'Centro')
      rec4.set('numero', '2100')
      rec4.set('complemento', 'Complexo Industrial')
      rec4.set('contato', 'Carlos Alberto Lima')
      rec4.set('data_nascimento_fundacao', '1975-08-12')
      rec4.set('rg', '3829104')
      app.save(rec4)
    } catch (e) {
      console.log('Error updating c4:', e)
    }

    // Atualizar os sistemas correspondentes com TODOS os campos técnicos completos
    // Sistema 1 (pp4572amhvqgm81 - Erechim/RS)
    try {
      const s1 = app.findFirstRecordByData('sistemas', 'cliente_id', 'pp4572amhvqgm81')
      s1.set('geracao_media_mensal_kwh', 1560)
      s1.set('latitude', -27.6341)
      s1.set('longitude', -52.2739)
      s1.set('padrao_entrada', 'RIC BT Categoria A2')
      s1.set('tipo_atendimento', 'aéreo')
      s1.set('numero_fases', 'trifásico')
      s1.set('secao_cabos', '16 mm²')
      s1.set('tipo_caixa_medicao', 'caixa de medição instalada em poste')
      s1.set('amperagem_disjuntor', '50 A')
      s1.set('quantidade_modulos', 30)
      s1.set('fabricante_modulos', 'Canadian Solar')
      s1.set('modelo_modulos', 'CS3W-455MS MONOCRISTAL INO 455Wp')
      s1.set('fabricante_inversores', 'Fronius')
      s1.set('modelo_inversores', 'Fronius Symo 12.0-3-M')
      s1.set('potencia_pico_modulos_kwp', 13.65)
      s1.set('potencia_pico_inversores_kwp', 12.0)
      app.save(s1)
    } catch (e) {
      console.log('Error updating s1:', e)
    }

    // Sistema 2 (v339t6jz7wy93df - Passo Fundo/RS)
    try {
      const s2 = app.findFirstRecordByData('sistemas', 'cliente_id', 'v339t6jz7wy93df')
      s2.set('geracao_media_mensal_kwh', 640)
      s2.set('latitude', -28.2612)
      s2.set('longitude', -52.4083)
      s2.set('padrao_entrada', 'RIC BT Categoria A2')
      s2.set('tipo_atendimento', 'aéreo')
      s2.set('numero_fases', 'bifásico')
      s2.set('secao_cabos', '10 mm²')
      s2.set('tipo_caixa_medicao', 'caixa de medição instalada em poste')
      s2.set('amperagem_disjuntor', '40 A')
      s2.set('quantidade_modulos', 12)
      s2.set('fabricante_modulos', 'Trina Solar')
      s2.set('modelo_modulos', 'TSM-DE09.08 Vertex S 415Wp')
      s2.set('fabricante_inversores', 'Growatt')
      s2.set('modelo_inversores', 'Growatt MIN 5000TL-X')
      s2.set('potencia_pico_modulos_kwp', 4.98)
      s2.set('potencia_pico_inversores_kwp', 5.0)
      app.save(s2)
    } catch (e) {
      console.log('Error updating s2:', e)
    }

    // Sistema 3 (82wz5urzbk1qkp4 - Empresa Delfos Agroindustrial - Passo Fundo/RS)
    try {
      const s3 = app.findFirstRecordByData('sistemas', 'cliente_id', '82wz5urzbk1qkp4')
      s3.set('geracao_media_mensal_kwh', 19500)
      s3.set('latitude', -28.2891)
      s3.set('longitude', -52.3854)
      s3.set('padrao_entrada', 'RIC MT Categoria H3 (Cabine Primária)')
      s3.set('tipo_atendimento', 'subterrâneo')
      s3.set('numero_fases', 'trifásico')
      s3.set('secao_cabos', '95 mm²')
      s3.set('tipo_caixa_medicao', 'cubículo blindado de medição MT')
      s3.set('amperagem_disjuntor', '250 A')
      s3.set('quantidade_modulos', 340)
      s3.set('fabricante_modulos', 'Trina Solar')
      s3.set('modelo_modulos', 'Vertex DEG21C.20 Bifacial 650Wp')
      s3.set('fabricante_inversores', 'SMA')
      s3.set('modelo_inversores', 'SMA Sunny Tripower CORE2 110-60')
      s3.set('potencia_pico_modulos_kwp', 221.0)
      s3.set('potencia_pico_inversores_kwp', 150.0)
      app.save(s3)
    } catch (e) {
      console.log('Error updating s3:', e)
    }

    // Sistema 4 (vtszbseb345heif - Carlos Alberto Lima - Chapecó/SC)
    try {
      const s4 = app.findFirstRecordByData('sistemas', 'cliente_id', 'vtszbseb345heif')
      s4.set('geracao_media_mensal_kwh', 9750)
      s4.set('latitude', -27.1004)
      s4.set('longitude', -52.6152)
      s4.set('padrao_entrada', 'RIC BT Categoria C3')
      s4.set('tipo_atendimento', 'aéreo')
      s4.set('numero_fases', 'trifásico')
      s4.set('secao_cabos', '50 mm²')
      s4.set('tipo_caixa_medicao', 'caixa de medição instalada em poste')
      s4.set('amperagem_disjuntor', '125 A')
      s4.set('quantidade_modulos', 200)
      s4.set('fabricante_modulos', 'JA Solar')
      s4.set('modelo_modulos', 'JAM72S30-545/MR 545Wp')
      s4.set('fabricante_inversores', 'Huawei')
      s4.set('modelo_inversores', 'Huawei SUN2000-75KTL-M3')
      s4.set('potencia_pico_modulos_kwp', 109.0)
      s4.set('potencia_pico_inversores_kwp', 75.0)
      app.save(s4)
    } catch (e) {
      console.log('Error updating s4:', e)
    }
  },
  (app) => {
    // No-op revert
  },
)
