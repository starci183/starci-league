import type {
    Card, Side
} from "./types"

export interface DeckSummaryEntry { card: Card; count: number }
/** Only an owner receives composition. Sorting and synthetic ids reveal no original uid or deck order. */
export function deckSummaryFor(deck: readonly Card[], owner: Side, viewer: Side | null): DeckSummaryEntry[] | undefined {
    if (owner !== viewer) return undefined
    const groups = new Map<string, DeckSummaryEntry>()
    for (const c of deck) {
        const data = c.data ? Object.fromEntries(Object.entries(c.data).sort(([a], [b]) => a.localeCompare(b))) : undefined
        const publicCard = {
            kind: c.kind, id: c.id, hero: c.hero, side: c.side, item: c.item, copyOf: c.copyOf, temp: c.temp, data
        }
        const key = JSON.stringify(publicCard)
        const current = groups.get(key)
        if (current) current.count++
        else groups.set(key,
            {
                card: {
                    ...publicCard, uid: `summary:${key}`
                }, count: 1
            })
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, entry]) => entry)
}
