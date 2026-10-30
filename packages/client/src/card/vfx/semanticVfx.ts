import type {
    cg
} from "@starci/shared"

export type EffectEvent = Extract<cg.GameEvent, { t: "damage" | "heal" | "shield" | "status" }>

/** Preserve engine order, including several effects or hits on the same champion. */
export function effectSequence(events: cg.GameEvent[]): EffectEvent[] {
    return events.filter((e): e is EffectEvent => ["damage",
        "heal",
        "shield",
        "status"].includes(e.t))
}

export function statusVfxNames(id: string, value = 0): string[] {
    switch (id) {
    case "stun": return ["stunHit"]
    case "silence": return ["silenceHit"]
    case "blind": return ["blindHit"]
    case "taunt": return ["tauntHit"]
    case "grievous": return ["grievousHit"]
    case "burn": return ["burn"]
    case "poison": return ["poisonHit"]
    case "bleed": return ["bleedTick"]
    case "freeze": case "frozen": case "chill": return ["freeze"]
    case "guard": return ["armorPlate",
        "runicBarrier"]
    case "armor_up": return ["armorPlate"]
    case "mr_up": return ["runicBarrier"]
    case "invuln": case "stasis": return ["invulnerability"]
    case "attackCut": case "dmgCut": return [value >= 1 ? "invulnerability" : "damageReduction"]
    default: return []
    }
}

/** Undefined damage impact delegates to the skill/role's physical delivery style. */
export function effectVfxNames(event: EffectEvent, sourceHero?: string): string[] {
    if (event.visuals !== undefined) return [...event.visuals]
    if (event.t === "heal") return ["heal"]
    if (event.t === "shield") return ["shield"]
    if (event.t === "status") return statusVfxNames(event.id,
        event.v)
    if (event.tag === "dot") {
        if (sourceHero === "brand") return ["burn"]
        if (sourceHero === "darius") return ["bleedTick"]
        return []
    }
    return []
}
