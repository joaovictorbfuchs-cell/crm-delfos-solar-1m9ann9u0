export type EventoGrade = {
  top: number
  height: number
  duracaoMinutos?: number
}

export type LayoutCamada = {
  leftPct: number
  widthPct: number
  zIndex: number
}

/**
 * Calcula o layout de sobreposições em camadas estilo Google Calendar.
 *
 * Regras:
 * (a) Ordenar eventos do cluster/aglomerado por início (start/top), com desempate por maior duração (maior height).
 * (b) A base (evento que começa mais cedo) mantém left = 0 e width = 100% da célula.
 * (c) Cada evento sobreposto subsequente na ordem N recebe:
 *       left = N * incremento (~8%)
 *       width = 100% - N * incremento
 *     com largura mínima legível (~30% a 40%).
 * (d) O sobreposto fica visualmente por cima (zIndex crescente) com fundo e borda próprios,
 *     de modo que a base continue visível nas laterais — nunca largura cheia cobrindo tudo.
 * (e) Eventos com o MESMO horário de início (mesmo start) dividem a largura daquela camada lado a lado.
 * (f) Sobreposição compara início/fim: TOCAR NO FIM NÃO É SOBREPOSIÇÃO (start2 >= end1 não colide).
 * (g) Recalculado dinamicamente a cada render.
 */
export function calcularLayoutCamadas<T extends EventoGrade>(
  itens: T[],
  options: {
    incrementoPct?: number
    minWidthPct?: number
    zIndexBase?: number
  } = {},
): Map<T, LayoutCamada> {
  const layoutMap = new Map<T, LayoutCamada>()
  if (!itens || itens.length === 0) return layoutMap

  const incrementoPct = options.incrementoPct ?? 8
  const minWidthPct = options.minWidthPct ?? 35
  const zIndexBase = options.zIndexBase ?? 10

  // 1. Enriquecer e ordenar todos os itens por início e duração decrescente
  type ItemInterno = {
    item: T
    start: number
    height: number
    end: number
  }

  const itensOrdenados: ItemInterno[] = itens
    .map((item) => {
      const start = Number(item.top) || 0
      const height = Math.max(1, Number(item.height) || 0)
      const end = start + height
      return { item, start, height, end }
    })
    .sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start
      // Desempate: maior duração primeiro
      return b.height - a.height
    })

  // 2. Agrupar em clusters conectados (onde pelo menos um par se sobrepõe: start < maxEnd)
  // Tocar no fim (start >= clusterFim) NÃO é sobreposição e fecha o cluster.
  const clusters: ItemInterno[][] = []
  let clusterAtual: ItemInterno[] = []
  let clusterFim = -1

  for (const ev of itensOrdenados) {
    if (clusterAtual.length > 0 && ev.start >= clusterFim) {
      clusters.push(clusterAtual)
      clusterAtual = [ev]
      clusterFim = ev.end
    } else {
      clusterAtual.push(ev)
      clusterFim = Math.max(clusterFim, ev.end)
    }
  }
  if (clusterAtual.length > 0) {
    clusters.push(clusterAtual)
  }

  // 3. Processar cada cluster independentemente
  for (const cluster of clusters) {
    if (cluster.length === 1) {
      // Evento isolado: largura cheia
      layoutMap.set(cluster[0].item, {
        leftPct: 0,
        widthPct: 100,
        zIndex: zIndexBase,
      })
      continue
    }

    // Agrupar eventos do cluster por horário de início idêntico (mesmo start)
    // Map preserva a ordem de inserção (que já está ordenada por start crescente)
    const gruposPorStart = new Map<number, ItemInterno[]>()
    for (const ev of cluster) {
      const grupo = gruposPorStart.get(ev.start)
      if (grupo) {
        grupo.push(ev)
      } else {
        gruposPorStart.set(ev.start, [ev])
      }
    }

    // Cada horário de início distinto vira um nível de camada (tier N = 0, 1, 2, ...)
    let tierIndex = 0
    for (const [, eventosMesmoStart] of gruposPorStart.entries()) {
      const qtdMesmoStart = eventosMesmoStart.length

      // Camada N:
      // Se for a base (tierIndex === 0):
      //   leftBase = 0%
      //   widthDisponivel = 100%
      // Se for sobreposto (tierIndex > 0):
      //   leftBase = tierIndex * incrementoPct
      //   widthDisponivel = max(minWidthPct, 100 - leftBase)
      const rawLeftBase = tierIndex * incrementoPct
      const rawWidthDisponivel = 100 - rawLeftBase
      const widthDisponivel = Math.max(minWidthPct, Math.min(100, rawWidthDisponivel))
      const leftBase = Math.min(100 - widthDisponivel, rawLeftBase)

      // Se há mais de um evento iniciando EXATAMENTE no mesmo horário,
      // eles dividem a largura daquela camada lado a lado em colunas iguais
      const subColWidthPct = widthDisponivel / qtdMesmoStart

      eventosMesmoStart.forEach((ev, subIndex) => {
        const leftPct = leftBase + subIndex * subColWidthPct
        const widthPct = subColWidthPct
        // zIndex cresce com a camada para o sobreposto ficar visualmente por cima
        const zIndex = zIndexBase + tierIndex + 1

        layoutMap.set(ev.item, {
          leftPct,
          widthPct,
          zIndex,
        })
      })

      tierIndex++
    }
  }

  return layoutMap
}
