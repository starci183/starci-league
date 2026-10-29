import {
    Card, HeroCard, SkillDef
} from "./cards"
import type {
    HeroAdapter, SkillAdapter
} from "./types"

/** Toàn bộ thẻ: tướng, bài trong bộ bài (deck/), thẻ đồ huyền thoại; mỗi loại tự đăng ký vào đây */
export const CARDS: Record<string, Card> = {
}
export const SKILLS: Record<string, SkillDef> = {
}

const heroes = new Map<string, HeroAdapter>()
const skills = new Map<string, SkillAdapter>()

export function defineHero(hero: HeroAdapter): HeroAdapter {
    if (CARDS[hero.id]) throw new Error(`Trùng id thẻ: ${hero.id}`)
    const { skills: heroSkills = [], attack: _attack, extraTargets: _extraTargets, props: _props, onKill: _onKill, onDeath: _onDeath, zoneTick: _zoneTick, ...stats } = hero
    for (const s of heroSkills) {
        if (SKILLS[s.def.id]) throw new Error(`Trùng id chiêu: ${s.def.id}`)
        SKILLS[s.def.id] = {
            ...s.def, boosts: (s.boosts ?? []).map((b) => `Nếu ${b.condition.desc}: ${b.desc}`)
        }
        skills.set(s.def.id,
            s)
    }
    const card: HeroCard = {
        kind: "hero", ...stats, skills: heroSkills.map((s) => s.def.id)
    }
    CARDS[hero.id] = card
    heroes.set(hero.id,
        hero)
    return hero
}

export const getHero = (id: string) => heroes.get(id)
export const getSkill = (id: string) => skills.get(id)
export const allHeroes = () => [...heroes.values()]
