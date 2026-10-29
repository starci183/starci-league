// Đăng ký tướng và lá đặc biệt của chế độ thẻ bài.
import type {
    Game
} from "./game"
import type {
    HeroDef, Role, SkillDef, SpecialCardDef, Unit
} from "./types"

/** Luật chủ (30/10): AP gốc của MỌI tướng = 0, AP chỉ đến từ đồ. Bảng cũ giữ rỗng để không vỡ API. */
export const V3_BASE_AP: Record<string, number> = {
}

/** V3: hành vi của vật triệu hồi (token) theo id: engine gọi vào đầu/cuối lượt của phe chủ token. State chỉ là dữ liệu, nên hành vi tra theo id ở đây. */
export interface TokenBehavior {
  id: string;
  onOwnerTurnStart?(g: Game, token: Unit, owner: Unit | undefined): void;
  onOwnerTurnEnd?(g: Game, token: Unit, owner: Unit | undefined): void;
}
const tokenBehaviors = new Map<string, TokenBehavior>()
export function defineTokenBehavior(def: TokenBehavior): TokenBehavior {
    tokenBehaviors.set(def.id,
        def)
    return def
}
export const getTokenBehavior = (id: string) => tokenBehaviors.get(id)

const heroes = new Map<string, HeroDef>()
const specials = new Map<string, SpecialCardDef>()

export function defineHero(def: HeroDef): HeroDef {
    if (heroes.has(def.id)) throw new Error(`Trùng tướng: ${def.id}`)
    // V2: số lá chiêu cố định 4Q/4E/1R (RULES.skillCopies); HeroDef.skillCopies/supportCopies bị bỏ qua
    // Luật chủ (30/10): AP gốc = 0 cho mọi tướng (AP chỉ từ đồ)
    if (def.ap) def = {
        ...def, ap: 0
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
