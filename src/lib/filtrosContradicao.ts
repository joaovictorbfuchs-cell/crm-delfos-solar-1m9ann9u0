import type { CondicaoFiltro, ModuloFiltro } from '@/types/filtros'
import { getCampoPorId } from '@/lib/filtrosCatalogo'

export interface ContradicaoAviso {
  campoId: string
  campoLabel: string
  mensagem: string
  condicaoIdA: string
  condicaoIdB: string
}

/**
 * Detecta contradições lógicas entre condições no bloco TODAS (ALL) no mesmo campo.
 * Retorna lista de avisos com sugestão de mover para o bloco QUALQUER (ANY).
 */
export function detectarContradicoesAll(
  condicoesAll: CondicaoFiltro[],
  modulo: ModuloFiltro,
): ContradicaoAviso[] {
  const avisos: ContradicaoAviso[] = []
  if (!condicoesAll || condicoesAll.length < 2) return avisos

  // Agrupar condições por campoId
  const porCampo = new Map<string, CondicaoFiltro[]>()
  for (const c of condicoesAll) {
    if (!c.campoId) continue
    const lista = porCampo.get(c.campoId) || []
    lista.push(c)
    porCampo.set(c.campoId, lista)
  }

  for (const [campoId, lista] of porCampo.entries()) {
    if (lista.length < 2) continue
    const campoDef = getCampoPorId(modulo, campoId)
    const campoLabel = campoDef?.label || campoId

    // Comparar cada par (i, j)
    for (let i = 0; i < lista.length; i++) {
      for (let j = i + 1; j < lista.length; j++) {
        const c1 = lista[i]
        const c2 = lista[j]

        const contradicao = checarParContraditorio(c1, c2)
        if (contradicao) {
          avisos.push({
            campoId,
            campoLabel,
            mensagem: `O bloco TODAS contém condições mutuamente exclusivas no campo "${campoLabel}": ${contradicao}. Sugestão: mova uma das condições para o bloco QUALQUER (ANY).`,
            condicaoIdA: c1.id,
            condicaoIdB: c2.id,
          })
        }
      }
    }
  }

  return avisos
}

function normalizarTexto(val: any): string {
  return String(val ?? '')
    .trim()
    .toLowerCase()
}

function checarParContraditorio(c1: CondicaoFiltro, c2: CondicaoFiltro): string | null {
  const op1 = c1.operador
  const op2 = c2.operador

  // 1. Booleano: verdadeiro vs falso
  if (
    (op1 === 'e_verdadeiro' && op2 === 'e_falso') ||
    (op1 === 'e_falso' && op2 === 'e_verdadeiro')
  ) {
    return 'uma regra exige que seja "Verdadeiro" e outra que seja "Falso"'
  }

  // 2. Vazio vs Não vazio
  if (
    (op1 === 'esta_vazio' && op2 === 'nao_esta_vazio') ||
    (op1 === 'nao_esta_vazio' && op2 === 'esta_vazio')
  ) {
    return 'uma regra exige que o campo esteja vazio e outra que esteja preenchido'
  }
  if (
    (op1 === 'esta_vazio' && (op2 === 'e' || op2 === 'contem' || op2 === 'comeca_com')) ||
    (op2 === 'esta_vazio' && (op1 === 'e' || op1 === 'contem' || op1 === 'comeca_com'))
  ) {
    const comValor = op1 === 'esta_vazio' ? c2 : c1
    if (comValor.valor !== undefined && comValor.valor !== '') {
      return 'uma regra exige que o campo esteja vazio e outra exige um valor específico'
    }
  }

  // 3. Igualdade com valores diferentes: "é X" e "é Y"
  const v1 = normalizarTexto(c1.valor)
  const v2 = normalizarTexto(c2.valor)

  if (op1 === 'e' && op2 === 'e' && v1 && v2 && v1 !== v2) {
    return `uma regra exige "${c1.valor}" e outra exige "${c2.valor}"`
  }

  // 4. "é X" e "não é X"
  if (
    (op1 === 'e' && op2 === 'nao_e' && v1 === v2 && v1) ||
    (op1 === 'nao_e' && op2 === 'e' && v1 === v2 && v1)
  ) {
    return `uma regra exige ser "${c1.valor}" e outra proíbe ser "${c2.valor}"`
  }

  // 5. "contém X" e "não contém X"
  if (
    (op1 === 'contem' && op2 === 'nao_contem' && v1 && v2 && v1 === v2) ||
    (op1 === 'nao_contem' && op2 === 'contem' && v1 && v2 && v1 === v2)
  ) {
    return `uma regra exige conter "${c1.valor}" e outra exige não conter "${c1.valor}"`
  }

  // 6. Números: ex: > 100 e < 50
  const n1 = Number(c1.valor)
  const n2 = Number(c2.valor)
  const n1Valido = c1.valor !== undefined && c1.valor !== '' && !isNaN(n1)
  const n2Valido = c2.valor !== undefined && c2.valor !== '' && !isNaN(n2)

  if (n1Valido && n2Valido) {
    // maior / maior_igual vs menor / menor_igual
    const eMaior1 = op1 === 'maior' || op1 === 'maior_igual'
    const eMenor2 = op2 === 'menor' || op2 === 'menor_igual'

    if (eMaior1 && eMenor2) {
      if (n1 > n2) {
        return `exige valor ${op1 === 'maior' ? '>' : '>='} ${n1} e simultaneamente ${op2 === 'menor' ? '<' : '<='} ${n2}`
      }
      if (n1 === n2 && (op1 === 'maior' || op2 === 'menor')) {
        return `exige valor ${op1 === 'maior' ? '>' : '>='} ${n1} e simultaneamente ${op2 === 'menor' ? '<' : '<='} ${n2}`
      }
    }

    const eMaior2 = op2 === 'maior' || op2 === 'maior_igual'
    const eMenor1 = op1 === 'menor' || op1 === 'menor_igual'

    if (eMaior2 && eMenor1) {
      if (n2 > n1) {
        return `exige valor ${op2 === 'maior' ? '>' : '>='} ${n2} e simultaneamente ${op1 === 'menor' ? '<' : '<='} ${n1}`
      }
      if (n1 === n2 && (op2 === 'maior' || op1 === 'menor')) {
        return `exige valor ${op2 === 'maior' ? '>' : '>='} ${n2} e simultaneamente ${op1 === 'menor' ? '<' : '<='} ${n1}`
      }
    }

    // igual vs diferente do mesmo número
    if (
      (op1 === 'igual' && op2 === 'diferente' && n1 === n2) ||
      (op1 === 'diferente' && op2 === 'igual' && n1 === n2)
    ) {
      return `uma regra exige ser igual a ${n1} e outra exige ser diferente de ${n2}`
    }

    // igual com números diferentes
    if (op1 === 'igual' && op2 === 'igual' && n1 !== n2) {
      return `uma regra exige ser ${n1} e outra exige ser ${n2}`
    }
  }

  // 7. Datas: depois de vs antes de
  if ((op1 === 'depois_de' && op2 === 'antes_de') || (op1 === 'antes_de' && op2 === 'depois_de')) {
    const dDepois = op1 === 'depois_de' ? c1.valor : c2.valor
    const dAntes = op1 === 'antes_de' ? c1.valor : c2.valor
    if (dDepois && dAntes && String(dDepois).split('T')[0] >= String(dAntes).split('T')[0]) {
      return `exige data posterior a "${dDepois}" e anterior a "${dAntes}"`
    }
  }

  return null
}
