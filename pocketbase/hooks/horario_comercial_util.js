// Utilitário compartilhado de janela comercial e feriados nacionais — UTC−3 fixo (Brasília, sem horário de verão).
// Regras (decisão do usuário, v0.0.1560+):
//  - Mensagens automáticas (fila/fluxos) só saem em dias úteis (seg–sex, sem feriado nacional)
//    entre 08:00 e 16:30 de Brasília.
//  - Mensagens de envio de leituras (auto leitura) ANTECIPAM para o dia útil anterior (ex.: sexta ou véspera de feriado).
//  - Mensagens de fluxo ADIAM para o próximo dia útil (dia seguinte ao feriado / segunda-feira).
// Puro JavaScript (sem APIs do PocketBase): pode ser exigido via require() pelos hooks e também
// avaliado fora do VM do goja pelos testes do QA.

var horarioComercialUtil = (function () {
  var OFFSET_BRASILIA_MS = -3 * 60 * 60 * 1000 // UTC−3 fixo
  var MIN_INICIO_JANELA = 8 * 60 // 08:00
  var MIN_FIM_JANELA = 18 * 60 // 18:00
  var MS_DIA = 24 * 60 * 60 * 1000

  // Feriados nacionais fixos (chave "mes-dia", mês 1-based)
  var FERIADOS_FIXOS = {
    '1-1': true, // Confraternização Universal
    '4-21': true, // Tiradentes
    '5-1': true, // Dia do Trabalho
    '9-7': true, // Independência
    '10-12': true, // Nossa Senhora Aparecida
    '11-2': true, // Finados
    '11-15': true, // Proclamação da República
    '12-25': true, // Natal
  }

  var cachePascoa = {}

  // Páscoa pelo algoritmo de Meeus/Jones/Butcher (Gauss estendido) — cálculo local, sem serviço externo.
  function calcularPascoa(ano) {
    var a = ano % 19
    var b = Math.floor(ano / 100)
    var c = ano % 100
    var d = Math.floor(b / 4)
    var e = b % 4
    var f = Math.floor((b + 8) / 25)
    var g = Math.floor((b - f + 1) / 3)
    var h = (19 * a + b - d - g + 15) % 30
    var i = Math.floor(c / 4)
    var k = c % 4
    var l = (32 + 2 * e + 2 * i - h - k) % 7
    var m = Math.floor((a + 11 * h + 22 * l) / 451)
    var mes = Math.floor((h + l - 7 * m + 114) / 31) // 1-based (3 = março, 4 = abril)
    var dia = ((h + l - 7 * m + 114) % 31) + 1
    return { mes: mes, dia: dia }
  }

  function pascoaDe(ano) {
    if (!cachePascoa[ano]) cachePascoa[ano] = calcularPascoa(ano)
    return cachePascoa[ano]
  }

  // Âncora imune a fuso: meio-dia UTC do dia civil informado (equivale a 09:00 de Brasília).
  function anchorDia(ano, mes, dia) {
    return new Date(Date.UTC(ano, mes - 1, dia, 12, 0, 0))
  }

  /**
   * Partes de data/hora no relógio de Brasília (UTC−3 fixo), mesmo papel dos helpers
   * getSaoPaulo já usados nos hooks — mas sempre por deslocamento, sem depender de Intl.
   * diaSemana: 0 = domingo ... 6 = sábado.
   */
  function getBrasiliaParts(date) {
    var d = date instanceof Date ? date : new Date(date)
    if (isNaN(d.getTime())) return null
    var shifted = new Date(d.getTime() + OFFSET_BRASILIA_MS)
    return {
      ano: shifted.getUTCFullYear(),
      mes: shifted.getUTCMonth() + 1,
      dia: shifted.getUTCDate(),
      hora: shifted.getUTCHours(),
      minuto: shifted.getUTCMinutes(),
      segundo: shifted.getUTCSeconds(),
      diaSemana: shifted.getUTCDay(),
    }
  }

  /** Feriado nacional (fixos + Carnaval/Páscoa−47, Sexta-feira Santa/Páscoa−2, Corpus Christi/Páscoa+60). */
  function eFeriadoNacional(date) {
    var p = getBrasiliaParts(date)
    if (!p) return false
    if (FERIADOS_FIXOS[p.mes + '-' + p.dia]) return true
    var pas = pascoaDe(p.ano)
    var pasAnchor = anchorDia(p.ano, pas.mes, pas.dia).getTime()
    var diaAnchor = anchorDia(p.ano, p.mes, p.dia).getTime()
    var diffDias = Math.round((diaAnchor - pasAnchor) / MS_DIA)
    if (diffDias === -47) return true // Carnaval
    if (diffDias === -2) return true // Sexta-feira Santa
    if (diffDias === 60) return true // Corpus Christi
    return false
  }

  /** Segunda a sexta que não seja feriado nacional. */
  function ehDiaUtil(date) {
    var p = getBrasiliaParts(date)
    if (!p) return false
    if (p.diaSemana === 0 || p.diaSemana === 6) return false
    return !eFeriadoNacional(date)
  }

  /** Dentro da janela comercial: dia útil e hora entre 08:00 e 18:00 de Brasília (limites inclusos). */
  function estaNaJanelaComercial(date) {
    var p = getBrasiliaParts(date)
    if (!p) return false
    if (!ehDiaUtil(date)) return false
    var min = p.hora * 60 + p.minuto
    return min >= MIN_INICIO_JANELA && min <= MIN_FIM_JANELA
  }

  /**
   * Ajusta uma data/hora de envio:
   *  - modo 'antecipar': enquanto o dia não for útil, recua 1 dia (leituras → sexta/dia útil anterior);
   *  - modo 'adiar': enquanto o dia não for útil, avança 1 dia (fluxos → dia seguinte/segunda-feira);
   *  - em seguida clampa a hora para a janela 08:00–18:00 de Brasília no MESMO dia resolvido
   *    (< 08:00 → 08:00; > 18:00 → 18:00; dentro → mantém).
   * Resultado no passado é devolvido como está — o guarda do worker segura o envio
   * até a próxima abertura da janela. Timestamps de entrada são UTC; toda decisão de
   * dia útil/janela é tomada já convertendo para Brasília.
   */
  function ajustarDataEnvio(date, modo) {
    var base = date instanceof Date ? new Date(date.getTime()) : new Date(date)
    if (isNaN(base.getTime())) return base
    var parts = getBrasiliaParts(base)
    var ancora = anchorDia(parts.ano, parts.mes, parts.dia)
    var guarda = 0
    while (!ehDiaUtil(ancora) && guarda < 40) {
      ancora = new Date(ancora.getTime() + (modo === 'antecipar' ? -MS_DIA : MS_DIA))
      guarda++
    }
    var minDoDia = parts.hora * 60 + parts.minuto
    if (minDoDia < MIN_INICIO_JANELA) minDoDia = MIN_INICIO_JANELA
    else if (minDoDia > MIN_FIM_JANELA) minDoDia = MIN_FIM_JANELA
    var pFinal = getBrasiliaParts(ancora)
    var utcMs =
      Date.UTC(
        pFinal.ano,
        pFinal.mes - 1,
        pFinal.dia,
        Math.floor(minDoDia / 60),
        minDoDia % 60,
        0,
        0,
      ) - OFFSET_BRASILIA_MS
    return new Date(utcMs)
  }

  return {
    OFFSET_BRASILIA_MS: OFFSET_BRASILIA_MS,
    getBrasiliaParts: getBrasiliaParts,
    eFeriadoNacional: eFeriadoNacional,
    ehDiaUtil: ehDiaUtil,
    estaNaJanelaComercial: estaNaJanelaComercial,
    ajustarDataEnvio: ajustarDataEnvio,
  }
})()

if (typeof module !== 'undefined' && module.exports) {
  module.exports = horarioComercialUtil
}
