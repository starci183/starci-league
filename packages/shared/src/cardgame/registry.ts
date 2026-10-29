// Đăng ký tướng và lá đặc biệt của chế độ thẻ bài.
import type {
    HeroDef, Role, SkillDef, SpecialCardDef
} from "./types"

const heroes = new Map<string, HeroDef>()
const specials = new Map<string, SpecialCardDef>()

export function defineHero(def: HeroDef): HeroDef {
    if (heroes.has(def.id)) throw new Error(`Trùng tướng: ${def.id}`)
    // số lá chiêu riêng mỗi tướng: Q 3..10, E 3..10, R 1..3
    for (const [k,
        lo,
        hi] of [["Q",
            3,
            10],
        ["E",
            3,
            10],
        ["R",
            1,
            3]] as const) {
        const n = def.skillCopies?.[k]
        if (n !== undefined && (!Number.isInteger(n) || n < lo || n > hi)) throw new Error(`${def.id}: số lá ${k} phải trong ${lo}..${hi} (đang ${n})`)
    }
    heroes.set(def.id,
        def)
    return def
}
export const getHero = (id: string) => heroes.get(id)
export const allHeroes = () => [...heroes.values()]
/** Tướng đã viết xong (không còn todo): dùng cho bot/selfplay */
export const implementedHeroes = () => allHeroes().filter((h) => !h.todo)

export function defineSpecialCard(def: SpecialCardDef): SpecialCardDef {
    specials.set(def.id,
        def)
    return def
}
export const getSpecialCard = (id: string) => specials.get(id)

/** Chiêu giữ chỗ cho tướng chưa viết: không làm gì. */
export const todoSkill = (key: "Q" | "E" | "R", name = "TODO"): SkillDef => ({
    key, name, desc: "TODO: chưa viết.", target: "none", canPlay: () => false, resolve: () => {},
})

/** Khung tướng chưa viết: chỉ chỉ số + 3 chiêu giữ chỗ. Agent sau thay bằng defineHero đầy đủ. */
export function stubHero(o: {
  id: string; name: string; role: Role; damage: "physical" | "magic"; hp: number; atk: number; armor: number; mr: number; passive: string;
}): HeroDef {
    return defineHero({
        id: o.id, name: o.name, role: o.role, damage: o.damage, hp: o.hp, atk: o.atk, armor: o.armor, mr: o.mr,
        passive: {
            name: "TODO", desc: o.passive
        },
        skills: {
            Q: todoSkill("Q"), E: todoSkill("E"), R: todoSkill("R")
        },
        todo: true,
    })
}
