// Interpolação central de variáveis de templates WhatsApp (backend).
// Espelho de src/lib/whatsappTemplateVars.ts — manter os dois em sincronia.
//
// Sintaxes suportadas: {{chave}} e [chave] (ambas case-insensitive, com aliases
// e acentuação ignorada na comparação). Variável SEM valor no contexto é
// REMOVIDA do texto (com limpeza do espaço duplo deixado) e registrada em
// console.log — assim NUNCA sai placeholder cru ({{...}} ou [...]) na mensagem.

var GRUPOS_ALIASES = {
  nome_cliente: [
    'nome_cliente',
    'nome do cliente',
    'nome',
    'cliente',
    'cliente_nome',
    'nomecliente',
  ],
  empresa: ['empresa', 'nome_da_empresa', 'nome da empresa', 'empresa_nome'],
  valor_proposta: ['valor_proposta', 'valor da proposta', 'valor'],
  data: ['data', 'data atual', 'data_atual', 'data de hoje', 'hoje'],
  cidade: ['cidade'],
  potencia: ['potencia', 'potência', 'potencia_kwp', 'potencia da usina'],
  usina: ['usina', 'nome_usina', 'nome da usina'],
  numero_uc: [
    'numero_uc',
    'número da uc',
    'numero da uc',
    'numero_da_uc',
    'uc',
    'numero_instalacao',
    'número da instalação',
    'numero_instalacao_rge',
  ],
  endereco: ['endereco', 'endereço', 'endereco_uc', 'endereco_instalacao'],
  data_agendada: ['data_agendada', 'data agendada', 'data da visita'],
  tipo_servico: ['tipo_servico', 'tipo de serviço', 'tipo de servico', 'servico', 'serviço'],
  nome_instalador: ['nome_instalador', 'nome do instalador', 'instalador', 'tecnico', 'técnico'],
  dia_anterior: ['dia_anterior', 'dia anterior'],
  mes: ['mes', 'mês'],
}

function dobrarChave(s) {
  return String(s == null ? '' : s)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

// alias dobrado -> nome canônico
var _aliasParaCanon = {}
var _canons = []
;(function initAliasMap() {
  var grupos = Object.keys(GRUPOS_ALIASES)
  for (var g = 0; g < grupos.length; g++) {
    var canon = grupos[g]
    _canons.push(canon)
    var aliases = GRUPOS_ALIASES[canon]
    for (var a = 0; a < aliases.length; a++) {
      var k = dobrarChave(aliases[a])
      if (!_aliasParaCanon[k]) _aliasParaCanon[k] = canon
    }
  }
})()

// Resolve o valor de uma chave digitada no template contra o mapa canônico.
function valorResolvido(chave, mapa) {
  var dobrada = dobrarChave(chave)
  var canon = _aliasParaCanon[dobrada] || dobrada
  if (Object.prototype.hasOwnProperty.call(mapa, canon)) {
    var v = mapa[canon]
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v)
  }
  return null
}

// Consolida o contexto: chaves canônicas preenchidas a partir de qualquer alias,
// mais chaves extras do contexto passadas direto (ex.: id_os).
function normalizarContexto(ctx) {
  var fonte = {}
  if (ctx && typeof ctx === 'object') {
    var ks = Object.keys(ctx)
    for (var i = 0; i < ks.length; i++) {
      var v = ctx[ks[i]]
      if (v === undefined || v === null) continue
      if (typeof v === 'object') v = JSON.stringify(v)
      fonte[dobrarChave(ks[i])] = String(v)
    }
  }
  var mapa = {}
  for (var c = 0; c < _canons.length; c++) {
    var canon = _canons[c]
    var aliases = GRUPOS_ALIASES[canon]
    for (var a = 0; a < aliases.length; a++) {
      var vAlias = fonte[dobrarChave(aliases[a])]
      if (vAlias !== undefined && String(vAlias).trim() !== '') {
        mapa[canon] = vAlias
        break
      }
    }
  }
  // chaves extras (fora dos aliases conhecidos) — ex.: {{id_os}}
  var extras = Object.keys(fonte)
  for (var e = 0; e < extras.length; e++) {
    var chave = extras[e]
    if (!(chave in mapa) && String(fonte[chave]).trim() !== '') mapa[chave] = fonte[chave]
  }
  return mapa
}

function limparEspacosOrfaos(t) {
  var linhas = String(t).split('\n')
  var out = []
  for (var i = 0; i < linhas.length; i++) {
    var l = linhas[i]
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/[ \t]+([,.;:!?])/g, '$1')
      .replace(/[ \t]+$/, '')
    out.push(l)
  }
  return out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Interpola e devolve { texto, faltando } — para logs de variável órfã.
function interpolarComDetalhe(texto, contexto, tag) {
  var t = String(texto == null ? '' : texto)
  var mapa = normalizarContexto(contexto)
  var faltando = []
  var vistos = {}

  function registrarFalta(chave) {
    if (!vistos[chave]) {
      vistos[chave] = true
      faltando.push(chave)
    }
    return ''
  }

  // {{chave}}
  t = t.replace(/\{\{\s*([^\{\}\n]+?)\s*\}\}/g, function (_, chave) {
    var valor = valorResolvido(chave, mapa)
    if (valor === null) return registrarFalta('{{' + chave + '}}')
    return valor
  })

  // [chave] — case-insensitive
  t = t.replace(/\[([^\[\]\n]+?)\]/g, function (_, chave) {
    var valor = valorResolvido(chave, mapa)
    if (valor === null) return registrarFalta('[' + chave + ']')
    return valor
  })

  t = limparEspacosOrfaos(t)

  if (faltando.length > 0) {
    console.log(
      '[TEMPLATE VARS' +
        (tag ? ':' + tag : '') +
        '] Variáveis sem valor removidas do texto: ' +
        faltando.join(', '),
    )
  }
  return { texto: t, faltando: faltando }
}

// Interpolação direta (retorna só o texto final).
function interpolar(texto, contexto, tag) {
  return interpolarComDetalhe(texto, contexto, tag).texto
}

module.exports = {
  interpolar: interpolar,
  interpolarTemplate: interpolar,
  interpolarComDetalhe: interpolarComDetalhe,
}
