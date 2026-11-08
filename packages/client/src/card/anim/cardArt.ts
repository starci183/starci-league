import {
    cg
} from "@starci/shared"
type Card = cg.Card
export type FrameKind = "spell" | "trap" | "stat" | "item" | "combat"

export interface ArtInfo { kind: FrameKind; srcs: string[]; letter?: string }

function spellIdOf(card: Card): string | undefined {
    if (card.id.startsWith("spell_")) return card.id.slice(6)
    if (card.id.startsWith("spell:")) return card.id.slice(6)
    if (card.id === "spell") {
        const v = card.data?.spell ?? card.data?.id ?? card.item
        return v === undefined ? undefined : String(v)
    }
    return undefined
}

function weaponIcon(hero: string | undefined, key: string, form: number): string | undefined {
    if (hero === "jayce" && ["q",
        "e",
        "r"].includes(key)) {
        return `/ui/state-icons/jayce-${form ? "cannon" : "hammer"}${key === "r" ? "" : `-${key}`}.png`
    }
    if (hero === "jinx" && key === "q") {
        return `/ui/state-icons/jinx-${form ? "rocket" : "minigun"}.png`
    }
    return undefined
}

/** Native game assets for the actual weapon form; copied Jayce cards retain their captured form. */
export function formSkillIcon(card: Card, unit?: cg.Unit): string | undefined {
    const id = card.copyOf ?? card.id
    const hero = id.startsWith("jayce_") ? "jayce" : id.startsWith("jinx_") ? "jinx" : card.hero
    return weaponIcon(hero,
        id.slice(-1).toLowerCase(),
        Number(card.data?.form ?? unit?.stacks[hero === "jinx" ? "jinx_gun" : "jayce_form"] ?? 0))
}

/** Same native form mapping for champion sheets and comparison previews. */
export function unitSkillIcon(unit: cg.Unit, key: string): string {
    return weaponIcon(unit.hero,
        key.toLowerCase(),
        Number(unit.stacks[unit.hero === "jinx" ? "jinx_gun" : "jayce_form"] ?? 0)) ?? `/card_skills/${unit.hero}_${key.toLowerCase()}.png`
}

export function artInfo(card: Card, unit?: cg.Unit): ArtInfo {
    const key = (card.copyOf ?? card.id).slice(-1).toLowerCase()
    const hero = card.hero
    if (card.kind === "skill" || card.copyOf) {
        return {
            kind: "trap",
            srcs: hero ? [...(formSkillIcon(card,
                unit) ? [formSkillIcon(card,
                    unit)!] : []),
            `/card_skills/${hero}_${key}.png`,
            `/icons/${hero}_${key}.png`,
            `/skills_art/${hero}_${key}.jpg`,
            `/heroes-square/${hero}.jpg`] : []
        }
    }
    if (card.kind === "wild") {
        return {
            kind: "trap", srcs: [`/card_support/wild_${key}.png`], letter: key.toUpperCase()
        }
    }
    if (card.kind === "support") {
        const spell = spellIdOf(card)
        if (spell) {
            return {
                kind: "spell", srcs: [`/card_support/spell_${spell}.png`,
                    "/ui/badge/spell.png"]
            }
        }
        switch (card.id) {
        case "gold": return {
            kind: "stat", srcs: ["/card_support/gold.png",
                "/ui/coin.png"]
        }
        case "item":
        case "legend": return {
            kind: "item", srcs: card.item ? [`/card_items/${card.item}.png`,
                `/items/${card.item}.png`] : ["/ui/badge/item.png"]
        }
        case "potion": return {
            kind: "spell", srcs: ["/cards/binh_mau.jpg"]
        }
        case "draw": return {
            kind: "spell", srcs: ["/card_support/draw.png",
                "/cards/bai_moi.jpg"]
        }
        case "buff": return {
            kind: "spell", srcs: ["/cards/cuong_no.jpg"]
        }
        default: return {
            kind: "combat", srcs: ["/card_support/basic.png",
                "/ui/badge/combat.png"]
        }
        }
    }
    return {
        kind: "trap", srcs: card.id === "mushroom" ? ["/cards/nam_teemo.jpg"] : card.id === "velkoz_decay" ? ["/card_skills/velkoz_p.png",
            "/ui/badge/spell.png"] : ["/ui/badge/spell.png"]
    }
}

/** Biểu tượng chiêu (tròn) cho đạn bay; undefined nếu lá không có biểu tượng riêng */
export function skillIcon(card: Card | undefined, unit?: cg.Unit): string | undefined {
    if (!card || !card.hero || (card.kind !== "skill" && !card.copyOf)) return undefined
    const key = (card.copyOf ?? card.id).slice(-1).toLowerCase()
    return formSkillIcon(card,
        unit) ?? `/card_skills/${card.hero}_${key}.png`
}

