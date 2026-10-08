/**
 * Utilitários para correspondência rigorosa de equipamentos identificados em documentos
 * com itens existentes no catálogo de equipamentos.
 *
 * Regras:
 * 1. A marca DEVE coincidir (pré-requisito absoluto, nunca suficiente sozinha).
 * 2. O modelo / potência deve ser compatível:
 *    - Módulos: potência em Wp deve coincidir ou estar dentro de tolerância mínima (<1%),
 *      e tokens numéricos relevantes do modelo (ex: células 66 vs 72, potência 610 vs 555)
 *      não podem ser conflitantes. "SS-610-66MDH-G11" ≠ "SS-555-72MDH".
 *    - Inversores: potência em kW / W deve ser compatível (60 kW ≠ 75-80 kW).
 * 3. Sem heurísticas frouxas de `.includes` disjuntivo.
 */

import type { Equipamento, TipoEquipamento } from '@/types/equipamentos'

export interface DadosEquipamentoExtraido {
  tipo: TipoEquipamento
  fabricante?: string | null
  modelo?: string | null
  potenciaW?: number | null
}

/**
 * Normaliza strings para comparação (minúsculas, sem acentos, sem pontuação excessiva).
 */
export function normalizarTexto(texto: string | null | undefined): string {
  if (!texto) return ''
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

/**
 * Remove sufixos empresariais e palavras genéricas de marca para comparação.
 * Ex: "Sunova Solar" -> "sunova", "Solis Inverters" -> "solis", "JA Solar" -> "ja solar"
 */
export function normalizarMarca(marca: string | null | undefined): string {
  const norm = normalizarTexto(marca)
  if (!norm) return ''
  return norm
    .replace(
      /\b(solar|energia|energy|power|ltda|sa|s\.a\.|brasil|tecnologia|technologies|group)\b/g,
      '',
    )
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Verifica se duas marcas coincidem de forma segura.
 * Marca DEVE coincidir e não pode ser string vazia.
 */
export function marcasCoincidem(
  marcaA: string | null | undefined,
  marcaB: string | null | undefined,
): boolean {
  const a = normalizarMarca(marcaA)
  const b = normalizarMarca(marcaB)
  if (!a || !b) return false

  // Igualdade exata
  if (a === b) return true

  // Substring com fronteira de palavra se um dos nomes for composto
  // Ex: "sunova" em "sunova solar" ou "ja solar" em "ja"
  const tokensA = a.split(/\s+/).filter(Boolean)
  const tokensB = b.split(/\s+/).filter(Boolean)

  // O primeiro token significativo geralmente é a marca principal (ex: "sunova", "solis", "huawei", "growatt")
  if (tokensA[0] && tokensB[0] && tokensA[0] === tokensB[0] && tokensA[0].length >= 3) {
    return true
  }

  // Ou um contém o outro se tiver ao menos 4 caracteres
  if (a.length >= 4 && b.length >= 4) {
    if (a.includes(b) || b.includes(a)) {
      return true
    }
  }

  return false
}

/**
 * Extrai números e sequências alfanuméricas estruturais do modelo (ex: "610", "66", "mdh", "g11").
 */
export function extrairTokensModelo(modelo: string | null | undefined): string[] {
  if (!modelo) return []
  const norm = normalizarTexto(modelo)
  // Divide por separadores comuns: hífen, barra, espaço, underline, parênteses
  const tokens = norm
    .split(/[\s\-_/()]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
  return tokens
}

/**
 * Extrai todos os números inteiros ou decimais relevantes de um texto.
 */
export function extrairNumeros(texto: string | null | undefined): number[] {
  if (!texto) return []
  const matches = texto.match(/\b\d+(?:[.,]\d+)?\b/g)
  if (!matches) return []
  return matches.map((m) => parseFloat(m.replace(',', '.'))).filter((n) => !isNaN(n))
}

/**
 * Tenta extrair a potência em Wp a partir do modelo do módulo (ex: SS-610-66MDH -> 610, CS7L-550MS -> 550).
 * Procura números tipicamente entre 250 e 800.
 */
export function extrairPotenciaWpDoModelo(modelo: string | null | undefined): number | null {
  if (!modelo) return null
  const nums = extrairNumeros(modelo)
  // Encontrar número na faixa de módulos fotovoltaicos comerciais típicos (250 a 850 Wp)
  const pot = nums.find((n) => n >= 250 && n <= 850)
  return pot ?? null
}

/**
 * Tenta extrair a contagem de células a partir do modelo do módulo (ex: 66, 72, 78, 60, 54, 108, 120, 132, 144).
 */
export function extrairCelulasDoModelo(modelo: string | null | undefined): number | null {
  if (!modelo) return null
  const nums = extrairNumeros(modelo)
  const celulasConhecidas = [54, 60, 66, 72, 78, 108, 120, 132, 144, 156]
  const cel = nums.find((n) => celulasConhecidas.includes(n))
  return cel ?? null
}

/**
 * Tenta extrair potência em kW a partir do modelo de inversor ou texto.
 * Ex: "60 kW" -> 60, "S5-GC 60K" -> 60, "75-80K" -> [75, 80], "SUN2000-6KTL" -> 6.
 */
export function extrairPotenciasKwDoModelo(modelo: string | null | undefined): number[] {
  if (!modelo) return []
  const norm = normalizarTexto(modelo)

  const potencias: number[] = []

  // Padrão 1: "60k", "60kw", "60 kw", "6ktl", "30ktl3"
  const padraoK = norm.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:k|kw|ktl)/g)
  for (const m of padraoK) {
    const val = parseFloat(m[1].replace(',', '.'))
    if (!isNaN(val) && val > 0 && val < 500) {
      potencias.push(val)
    }
  }

  // Padrão 2: faixa de potência ex: "75-80k", "(75-80)k", "75/80"
  const padraoFaixa = norm.match(/(\d+)\s*[-/]\s*(\d+)\s*k/i)
  if (padraoFaixa) {
    const p1 = parseFloat(padraoFaixa[1])
    const p2 = parseFloat(padraoFaixa[2])
    if (!isNaN(p1)) potencias.push(p1)
    if (!isNaN(p2)) potencias.push(p2)
  }

  return potencias
}

/**
 * Verifica se um equipamento do catálogo corresponde rigorosamente ao equipamento extraído.
 */
export function equipamentoCorrespondeRigoroso(
  extraido: DadosEquipamentoExtraido,
  catalogo: Equipamento,
): boolean {
  // 1. Tipo deve bater
  if (extraido.tipo !== catalogo.tipo) {
    return false
  }

  // 2. Marca DEVE coincidir obrigatoriamente (pré-requisito absoluto)
  if (!marcasCoincidem(extraido.fabricante, catalogo.marca)) {
    return false
  }

  const modeloDoc = extraido.modelo?.trim() || ''
  const modeloCat = catalogo.modelo?.trim() || ''

  // Caso 3: MÓDULO FOTOVOLTAICO
  if (extraido.tipo === 'modulo_fv') {
    // Potências em Wp
    const potDoc =
      extraido.potenciaW && extraido.potenciaW > 0
        ? extraido.potenciaW
        : extrairPotenciaWpDoModelo(modeloDoc)
    const potCat =
      catalogo.potencia_w && catalogo.potencia_w > 0
        ? catalogo.potencia_w
        : extrairPotenciaWpDoModelo(modeloCat)

    // Se ambos tiverem potência, elas DEVEM ser compatíveis (diferença máxima de 1% para tolerância)
    if (potDoc && potCat) {
      const diff = Math.abs(potDoc - potCat)
      // Ex: 610 vs 555 -> diff 55 (> 5), rejeitado
      if (diff > 5) {
        return false
      }
    }

    // Células do modelo: ex 66 vs 72 células ("SS-610-66MDH" vs "SS-555-72MDH")
    const celDoc = extrairCelulasDoModelo(modeloDoc)
    const celCat = extrairCelulasDoModelo(modeloCat)
    if (celDoc && celCat && celDoc !== celCat) {
      return false
    }

    // Se o modelo foi informado no documento, comparar tokens numéricos do modelo
    if (modeloDoc && modeloCat) {
      const normDoc = normalizarTexto(modeloDoc)
      const normCat = normalizarTexto(modeloCat)

      // Se os modelos forem idênticos
      if (normDoc === normCat) return true

      // Tokens numéricos do modelo
      const numsDoc = extrairNumeros(normDoc)
      const numsCat = extrairNumeros(normCat)

      // Se ambos tiverem números relevantes no modelo (ex: 610 vs 555)
      if (numsDoc.length > 0 && numsCat.length > 0) {
        // Todos os números significativos principais do modelo do documento devem existir no catálogo
        // Números com mais de 2 dígitos ou de células
        const numsSignificativosDoc = numsDoc.filter((n) => n >= 50)
        const numsSignificativosCat = numsCat.filter((n) => n >= 50)

        for (const numDoc of numsSignificativosDoc) {
          if (!numsSignificativosCat.includes(numDoc)) {
            return false
          }
        }
      }

      // Se passou pelas potências e células e não há conflito numérico,
      // verificar se os códigos do modelo guardam compatibilidade
      const tokensDoc = extrairTokensModelo(normDoc)
      const tokensCat = extrairTokensModelo(normCat)
      const intersecao = tokensDoc.filter((t) => tokensCat.includes(t))

      // Deve ter pelo menos um token além da marca caso o modelo não seja vazio
      if (tokensDoc.length > 0 && intersecao.length === 0) {
        return false
      }

      return true
    }

    // Se não há modelo no doc, só aceita match se a potência bater perfeitamente
    if (!modeloDoc && potDoc && potCat && Math.abs(potDoc - potCat) <= 5) {
      return true
    }

    return false
  }

  // Caso 4: INVERSOR
  if (extraido.tipo === 'inversor') {
    // Potência em kW
    // Doc pode vir em W (ex: 60000 para 60 kW) ou tec.potencia_kwp
    let potKwDoc =
      extraido.potenciaW && extraido.potenciaW > 0
        ? extraido.potenciaW >= 500
          ? extraido.potenciaW / 1000
          : extraido.potenciaW
        : null

    const potKwCat =
      catalogo.potencia_w && catalogo.potencia_w > 0
        ? catalogo.potencia_w >= 500
          ? catalogo.potencia_w / 1000
          : catalogo.potencia_w
        : null

    // Também extrair potências explícitas no código do modelo (ex: "S5-GC" 60kW, "(75-80)K")
    const potsModeloDoc = extrairPotenciasKwDoModelo(modeloDoc)
    const potsModeloCat = extrairPotenciasKwDoModelo(modeloCat)

    // Se o modelo do documento tem número de kW específico (ex: "60")
    if (potsModeloDoc.length > 0 && !potKwDoc) {
      potKwDoc = potsModeloDoc[0]
    }

    // Validação estrita de potência:
    // Se temos potKwDoc e potKwCat (ex: 60 kW vs 75 kW ou 80 kW)
    if (potKwDoc && potKwCat) {
      const diff = Math.abs(potKwDoc - potKwCat)
      // Tolerância máxima de 0.5 kW (ex: 5 kW vs 5.5 kW não é mesmo inversor)
      if (diff > 0.5) {
        return false
      }
    }

    // Se o modelo do catálogo tem faixa de potência (ex: 75-80K) e o doc é 60 kW
    if (potKwDoc && potsModeloCat.length > 0) {
      const compativelComFaixa = potsModeloCat.some((p) => Math.abs(p - potKwDoc!) <= 0.5)
      if (!compativelComFaixa) {
        return false
      }
    }

    // Se o modelo do doc tem potência (ex: 60 kW) e o catálogo tem outra
    if (potsModeloDoc.length > 0 && potKwCat) {
      const compativelComCat = potsModeloDoc.some((p) => Math.abs(p - potKwCat) <= 0.5)
      if (!compativelComCat) {
        return false
      }
    }

    // Comparação de tokens do modelo do inversor
    if (modeloDoc && modeloCat) {
      const normDoc = normalizarTexto(modeloDoc)
      const normCat = normalizarTexto(modeloCat)

      if (normDoc === normCat) return true

      const numsDoc = extrairNumeros(normDoc)
      const numsCat = extrairNumeros(normCat)

      // Se ambos têm números (ex: 60 vs 75, 80) e não há nenhum número em comum
      if (numsDoc.length > 0 && numsCat.length > 0) {
        const algumIgual = numsDoc.some((n) => numsCat.includes(n))
        if (!algumIgual) {
          return false
        }
      }

      const tokensDoc = extrairTokensModelo(normDoc)
      const tokensCat = extrairTokensModelo(normCat)
      const intersecao = tokensDoc.filter((t) => tokensCat.includes(t))

      if (tokensDoc.length > 0 && intersecao.length === 0) {
        return false
      }

      return true
    }

    // Se não há modelo no doc, exige que a potência seja estritamente compatível
    if (!modeloDoc && potKwDoc && potKwCat && Math.abs(potKwDoc - potKwCat) <= 0.5) {
      return true
    }

    return false
  }

  return false
}

/**
 * Busca no catálogo de equipamentos a correspondência estrita para o equipamento extraído.
 * Retorna null se não houver correspondência inequívoca.
 */
export function buscarEquipamentoCorrespondente(
  extraido: DadosEquipamentoExtraido,
  catalogo: Equipamento[],
): Equipamento | null {
  if (!extraido.fabricante && !extraido.modelo) {
    return null
  }

  const candidatos = catalogo.filter((eq) => equipamentoCorrespondeRigoroso(extraido, eq))

  if (candidatos.length === 0) {
    return null
  }

  // Se houver mais de um candidato que passou no critério rigoroso, prioriza o mais específico
  // 1. Modelo exatamente igual
  const normModeloDoc = normalizarTexto(extraido.modelo)
  const exato = candidatos.find((eq) => normalizarTexto(eq.modelo) === normModeloDoc)
  if (exato) return exato

  // 2. O primeiro que bateu com precisão
  return candidatos[0]
}
