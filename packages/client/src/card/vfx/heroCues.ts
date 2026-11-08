// Từ sự kiện engine tới danh sách cue riêng của từng tướng. Thuần dữ liệu: không DOM, không PixiJS, kiểm thử được.
// heroMap.ts nói "tướng nào có cue gì"; file này nói "sự kiện nào phát cue đó, ở đâu, với ctx.amount bao nhiêu".
// plan.ts chỉ việc chạy các Cue trả về: lead (đạn dẫn tới nhịp trúng), with (cùng nhịp trúng), after (sau nhịp trúng), hold (bám lá tới khi nhả).
import {
    cg
} from "@starci/shared"
import {
    AATROX_BLOOD_RAGE, AATROX_FORM_AURA, AATROX_REBIRTH, ANNIE_VFX, ASHE_FROST_CLING, ASHE_FROST_SHED, BLITZ_HAND_DISCARD, BRAND_BURN_SHED, BRAUM_VFX, DARIUS_VFX, GANGPLANK_VFX, JINX_VFX, KHAZIX_VFX, KOGMAW_VFX, LEONA_VFX, MALPHITE_VFX, ORNN_FORGED_ITEM, RUMBLE_VFX, TEEMO_VFX, TRISTANA_BOMB_ADD, TRISTANA_BOMB_SHED, VAYNE_VFX, VELKOZ_RIFT_LINGER, YORICK_VFX, ZED_VFX, hasHeroVfx, skillIcon, skillVfx, type SkillKey
} from "./heroMap"
import {
    TF_CARD
} from "./fx_twistedfate"
import type {
    SkillVfx
} from "./types"

type Ev<T extends cg.GameEvent["t"]> = Extract<cg.GameEvent, { t: T }>
type Side = cg.Side

/** Nơi một cue diễn ra, plan.ts đổi thành toạ độ màn hình */
export type Place =
    | { unit: string; lane?: number }
    | { hand: Side }
    | { deck: Side }
    | { grave: Side }
    | { card: string; side: Side }
    /** Ô đường trống (Dao Katarina, Nguyên Tố Qiyana) */
    | { lane: number; side: Side }

export interface Cue {
    name: string;
    from: Place;
    to?: Place[];
    /** ctx.amount: số tầng, loại lá, Thuốc Súng... */
    amount?: number;
    icon?: string;
    /** Bám tới khi nhả bằng khoá này (ctx.tether) */
    hold?: string;
    /** lead: đạn dẫn, nhịp trúng là lúc nó chạm · with: cùng nhịp trúng · after: sau nhịp trúng */
    kind: "lead" | "with" | "after";
    color: number;
    color2?: number;
    intensity?: number;
}

export interface ImpactOverride { name?: string; amount?: number; to?: Place[]; from?: Place }

export interface CueSet {
    cues: Cue[];
    /** Khoá hold cần nhả; khoá kết thúc bằng "|" là nhả mọi hold của đơn vị đó */
    release: string[];
    /** Đổi cú trúng chính của sự kiện này (tên, amount, to) */
    impact?: ImpactOverride;
    /** Khiên đỡ đòn: thay cú trúng khi không mất máu, thêm vào khi mất máu */
    block?: boolean;
    /** Cue của sự kiện này thay hẳn cú trúng thường (tick cháy/chảy máu) */
    replace?: boolean;
    /** Đòn của sự kiện này đã có đạn riêng (hoặc đi cùng đạn khác): plan không bắn thêm đạn chung tới mục tiêu */
    skipTravel?: boolean;
}

/** Ngữ cảnh cho một sự kiện */
export interface CueEnv {
    /** Tướng đang hiển thị (stacks, statuses, token) */
    units: Record<string, cg.Unit>;
    me: Side;
}

export interface CueCtx {
    env: CueEnv;
    /** Lá đang đánh nếu sự kiện thuộc một chiêu */
    card?: cg.Card;
    /** Tướng ra chiêu */
    caster?: string;
    /** Khoảng sự kiện của nhóm đang diễn, và vị trí của sự kiện trong đó */
    span?: readonly cg.GameEvent[];
    index?: number;
}

interface Meta {
    /** Bộ đếm của đơn vị lúc BẮT ĐẦU lô, trước khi bất kỳ sự kiện nào của lô áp vào */
    prev?: number;
    src?: Record<string, number>;
    target?: Record<string, number>;
    via?: Record<string, number>;
    /** Khiên đỡ đòn này do tướng nào cho */
    shieldHero?: string;
    shieldKey?: SkillKey;
    keg?: { token: string; powder: number; kind: "skill" | "gold" | "item" | "other" };
    tf?: number;
    ability?: string;
    placed?: boolean;
    /** Có tướng chết trong lô ở đơn vị này */
    killed?: boolean;
    /** Lá chiêu đang diễn khi lá này được tạo/rút */
    byCard?: cg.Card;
}

const META = new WeakMap<cg.GameEvent, Meta>()
const meta = (e: cg.GameEvent): Meta => META.get(e) ?? {
}
const set = (e: cg.GameEvent, m: Meta) => { META.set(e,
    {
        ...META.get(e), ...m
    }) }

/** Khiên còn sống trên từng tướng và ai cho nó */
const shieldLedger = new Map<string, { hero: string; key?: SkillKey }>()
/** Mắt xích Chuỗi đang chờ: n -> kẻ ra đòn và các mục tiêu */
const chainLinks = new Map<number, { actor?: string; targets: string[]; kind: string }>()
/** Số đòn Vayne đánh trong lượt R, để vẽ dấu Mũi Tên Bạc */
const vayneHits = new Map<string, number>()

export function resetCueState() {
    shieldLedger.clear()
    chainLinks.clear()
    vayneHits.clear()
}

const sideOf = (unit: string): Side => (unit.split(":")[0] === "B" ? "B" : "A")
const heroOf = (env: CueEnv, unit?: string): string | undefined => (unit ? env.units[unit]?.hero ?? unit.split(":")[1] : undefined)
const keyOfCard = (card?: cg.Card): SkillKey | undefined => {
    const m = /_([qer])$/.exec(card?.copyOf ?? card?.id ?? "")
    return m?.[1] as SkillKey | undefined
}
const U = (unit: string, lane?: number): Place => (lane === undefined ? {
    unit
} : {
    unit, lane
})
const stackOf = (u: cg.Unit | undefined, key: string) => u?.stacks?.[key] ?? 0

/** Mô tả cue từ ô q/e/r/p của heroMap; field là nơi lấy tên */
type Field = "travel" | "impact" | "cast" | "extra" | "block" | "shield"
const X = (hero: string, key: SkillKey, field: Field): string | undefined => {
    const v = skillVfx(hero,
        key)[field]
    return v && v !== "none" ? v : undefined
}
const tone = (hero: string, key: SkillKey): Pick<Cue, "color" | "color2"> => {
    const s = skillVfx(hero,
        key)
    return {
        color: s.color, color2: s.color2
    }
}
function mk(hero: string, key: SkillKey, name: string | undefined, from: Place, o: Partial<Cue> = {
}): Cue[] {
    return name ? [{
        kind: "with", ...tone(hero,
            key), name, from, ...o
    }] : []
}
const none = (): CueSet => ({
    cues: [], release: []
})

// ---------------------------------------------------------------- chuẩn bị lô

/** Ghi chú theo lô trước khi diễn: bộ đếm lúc đầu lô, nguồn Khiên, loại lá TF, Thùng Gangplank, mắt xích Chuỗi */
export function annotate(events: readonly cg.GameEvent[], units: Record<string, cg.Unit>) {
    const base = (id: string) => units[id]?.stacks ?? {
    }
    const seen = new Set<string>()
    let card: cg.Card | undefined
    let tf: number | undefined
    let keg: Meta["keg"] | undefined
    let ability: string | undefined
    const killed = new Set(events.filter((e): e is Ev<"kill"> => e.t === "kill").map((e) => e.target))
    for (const e of events) {
        switch (e.t) {
        case "play": card = e.card; tf = undefined; keg = undefined; ability = undefined; break
        case "chainResolve": card = e.card; tf = undefined; keg = undefined; break
        case "ability": ability = e.id; keg = undefined; break
        case "chainAdd":
            chainLinks.set(e.n,
                {
                    actor: e.actor, targets: e.targets, kind: e.kind
                })
            break
        case "chainEnd": chainLinks.clear(); break
        case "stack": {
            const k = `${e.unit}|${e.key}`
            // bộ đếm lúc đầu lô: lần đầu thấy sự kiện của khoá này
            set(e,
                {
                    prev: seen.has(k) ? lastStack.get(k) ?? 0 : stackOf(units[e.unit],
                        e.key), killed: killed.has(e.unit)
                })
            seen.add(k)
            lastStack.set(k,
                e.value)
            break
        }
        case "deckFlip": {
            const type = tfKind(e.card)
            tf = type
            set(e,
                {
                    tf: type
                })
            break
        }
        case "tokenFlip": {
            const kind = e.card?.kind === "skill" ? "skill" : e.card?.id === "gold" ? "gold" : e.card?.id === "item" ? "item" : "other"
            keg = {
                token: e.unit, powder: Number(e.secret?.powder ?? 0), kind
            }
            set(e,
                {
                    keg
                })
            break
        }
        case "shield":
            if (e.expired) shieldLedger.delete(e.target)
            else if (e.amount > 0 && e.src) {
                const hero = units[e.src]?.hero ?? e.src.split(":")[1]
                shieldLedger.set(e.target,
                    {
                        hero, key: keyOfCard(card)
                    })
            }
            set(e,
                {
                    tf
                })
            break
        case "damage": {
            const entry = e.absorbed > 0 ? shieldLedger.get(e.target) : undefined
            set(e,
                {
                    src: e.src ? {
                        ...base(e.src)
                    } : undefined, target: {
                        ...base(e.target)
                    }, via: e.via ? {
                        ...base(e.via)
                    } : undefined,
                    shieldHero: entry?.hero, shieldKey: entry?.key, keg, tf, ability, killed: killed.has(e.target)
                })
            break
        }
        case "heal": set(e,
            {
                keg, tf, src: e.src ? {
                    ...base(e.src)
                } : undefined, target: {
                    ...base(e.target)
                }
            }); break
        case "summonToken":
            set(e,
                {
                    placed: ability === "gp_stash"
                })
            break
        case "create": case "freeCard": case "returnToHand": case "draw":
            set(e,
                {
                    keg, byCard: card
                })
            break
        default: break
        }
    }
}
const lastStack = new Map<string, number>()

// ---------------------------------------------------------------- trạng thái

const hold = (unit: string, name: string) => `${unit}|${name}`

/** status: cue riêng của tướng thay cho cue Choáng/Câm Lặng/Mù chung. Rỗng = dùng cue chung của semanticVfx */
function statusOn(e: Ev<"status">, c: CueCtx): CueSet {
    const out = none()
    const src = heroOf(c.env,
        e.src)
    const key = keyOfCard(c.card)
    const at = U(e.target)
    const add = (hero: string, k: SkillKey, field: Field, o: Partial<Cue> = {
    }, from: Place = at) => out.cues.push(...mk(hero,
        k,
        X(hero,
            k,
            field),
        from,
        o))
    const holdAt = (name: string | undefined, hero: string, k: SkillKey, o: Partial<Cue> = {
    }, from: Place = at) => {
        if (name) out.cues.push({
            kind: "with", ...tone(hero,
                k), name, from, hold: hold(e.target,
                name), ...o
        })
    }
    switch (e.id) {
    case "stun":
        switch (src) {
        case "ashe": holdAt(X("ashe",
            "r",
            "extra"),
        "ashe",
        "r"); break
        case "leona":
            if (key === "e") add("leona",
                "e",
                "extra")
            else if (key === "r") add("leona",
                "r",
                "extra")
            else add("leona",
                "q",
                "extra")
            break
        case "lux": add("lux",
            "e",
            "extra"); break
        case "brand": add("brand",
            "q",
            "extra"); break
        case "viktor": add("viktor",
            "r",
            "extra"); break
        case "blitzcrank": add("blitzcrank",
            "e",
            "extra"); break
        case "braum":
            if (c.card?.hero === "braum" && key === "r") add("braum",
                "r",
                "extra")
            else if (c.card?.hero !== "braum") out.cues.push({
                kind: "with", ...tone("braum",
                    "q"), name: BRAUM_VFX.markBreak, from: at
            })
            break
        case "lissandra":
            // Lá chiêu của nó đang băng: tia băng nối lá trên tay đối thủ với tướng bị Choáng
            out.cues.push(...mk("lissandra",
                "e",
                X("lissandra",
                    "e",
                    "extra"),
                {
                    hand: sideOf(e.target)
                },
                {
                    to: [at]
                }))
            break
        case "annie": out.cues.push({
            kind: "with", ...tone("annie",
                "p"), name: ANNIE_VFX.stun, from: at
        }); break
        default: break
        }
        break
    case "silence":
        if (src === "garen") add("garen",
            "q",
            "extra")
        break
    case "blind":
        if (src === "jinx") holdAt(X("jinx",
            "e",
            "extra"),
        "jinx",
        "e")
        break
    case "stasis":
        if (heroOf(c.env,
            e.target) === "lissandra") holdAt(X("lissandra",
            "r",
            "extra"),
        "lissandra",
        "r")
        break
    case "stealth":
        if (heroOf(c.env,
            e.target) === "khazix") holdAt(KHAZIX_VFX.stealth,
            "khazix",
            "r")
        else if (heroOf(c.env,
            e.target) === "qiyana") {
            if (key === "e") add("qiyana",
                "e",
                "extra")
            else if (key === "r") add("qiyana",
                "r",
                "extra")
            else add("qiyana",
                "q",
                "extra")
        }
        break
    case "isolated":
        if (c.env.units[e.target]?.statuses?.stealth) out.cues.push({
            kind: "with", ...tone("khazix",
                "p"), name: KHAZIX_VFX.reveal, from: at
        })
        holdAt(KHAZIX_VFX.aura,
            "khazix",
            "p")
        break
    case "ahri_charm": holdAt(X("ahri",
        "r",
        "extra"),
    "ahri",
    "r"); break
    case "ashe_q": holdAt(X("ashe",
        "q",
        "extra"),
    "ashe",
    "q"); break
    case "mf_exposed": holdAt(X("missfortune",
        "e",
        "extra"),
    "missfortune",
    "e"); break
    case "tri_q": holdAt(X("tristana",
        "q",
        "extra"),
    "tristana",
    "q"); break
    case "vulnerable": out.cues.push(...mk("nami",
        "r",
        "namiExpose",
        at)); break
    case "shred":
        if (src === "yorick") add("yorick",
            "e",
            "extra")
        break
    case "armor_up":
        if (src === "leona" || heroOf(c.env,
            e.target) === "leona") out.cues.push({
            kind: "with", ...tone("leona",
                "e"), name: LEONA_VFX.armor, from: at
        })
        else if (src === "malphite") add("malphite",
            "q",
            "extra")
        break
    case "vayne_r": holdAt(X("vayne",
        "r",
        "extra"),
    "vayne",
    "r"); break
    case "zed_mark": holdAt(X("zed",
        "r",
        "extra"),
    "zed",
    "r",
    {
        amount: stackOf(c.env.units[e.src ?? ""],
            "zed_chain")
    }); break
    case "zed_q": holdAt(X("zed",
        "q",
        "extra"),
    "zed",
    "q"); break
    case "gp_wanted": {
        const from = e.src ? U(e.src) : at
        out.cues.push({
            kind: "with", ...tone("gangplank",
                "r"), name: X("gangplank",
                "r",
                "cast") ?? "gangplankWantedMark", from, to: [at], hold: hold(e.target,
                "gp_wanted")
        })
        break
    }
    default: break
    }
    return out
}

/** statusEnd: nhả cue bám và phát cue kết thúc */
function statusOff(e: Ev<"statusEnd">, c: CueCtx): CueSet {
    const out = none()
    const names: Record<string, string[]> = {
        stun: [X("ashe",
            "r",
            "extra") ?? ""], blind: [X("jinx",
            "e",
            "extra") ?? ""], stasis: [X("lissandra",
            "r",
            "extra") ?? ""],
        stealth: [KHAZIX_VFX.stealth], isolated: [KHAZIX_VFX.aura], ahri_charm: [X("ahri",
            "r",
            "extra") ?? ""], ashe_q: [X("ashe",
            "q",
            "extra") ?? ""],
        mf_exposed: [X("missfortune",
            "e",
            "extra") ?? ""], tri_q: [X("tristana",
            "q",
            "extra") ?? ""], vayne_r: [X("vayne",
            "r",
            "extra") ?? ""],
        zed_mark: [X("zed",
            "r",
            "extra") ?? ""], zed_q: [X("zed",
            "q",
            "extra") ?? ""], gp_wanted: ["gp_wanted"]
    }
    for (const n of names[e.id] ?? []) if (n) out.release.push(hold(e.target,
        n))
    const hero = heroOf(c.env,
        e.target)
    if (e.id === "stealth" && hero === "khazix") out.cues.push({
        kind: "with", ...tone("khazix",
            "r"), name: KHAZIX_VFX.unveil, from: U(e.target)
    })
    if (e.id === "bleed_t") out.cues.push({
        kind: "with", ...tone("darius",
            "p"), name: DARIUS_VFX.fade, from: U(e.target)
    })
    if (e.id === "stone_link") {
        const malphite = Object.values(c.env.units).find((u) => u.hero === "malphite" && u.side === sideOf(e.target) && u.status === "board")
        if (malphite && malphite.id !== e.target) out.cues.push({
            kind: "with", ...tone("malphite",
                "e"), name: MALPHITE_VFX.breakLink, from: U(malphite.id), to: [U(e.target)]
        })
    }
    if (e.id === "zed_mark") {
        const zed = c.span?.find((x): x is Ev<"damage"> => x.t === "damage" && x.target === e.target && x.kind === "true")
        const chain = zed?.src ? stackOf(c.env.units[zed.src],
            "zed_chain") : 0
        out.cues.push({
            kind: "with", ...tone("zed",
                "r"), name: ZED_VFX.burst, from: U(e.target), amount: chain
        })
    }
    if (e.id === "stealth" && hero === "qiyana") return out
    return out
}

// ---------------------------------------------------------------- bộ đếm

const lanePassive = (hero: string, name: string | undefined, at: Place, o: Partial<Cue> = {
}): Cue[] => mk(hero,
    "p",
    name,
    at,
    o)

/** stack: nhận thêm, tiêu, hoặc rụng một nửa khi tướng gục */
function stackOn(e: Ev<"stack">, c: CueCtx): CueSet {
    const out = none()
    const m = meta(e)
    const prev = m.prev ?? stackOf(c.env.units[e.unit],
        e.key)
    const delta = e.value - prev
    const dead = !!m.killed || !!c.span?.some((x) => x.t === "kill" && x.target === e.unit)
    const at = U(e.unit)
    const hero = heroOf(c.env,
        e.unit)
    const owner = c.env.units[e.unit]
    const P = (name: string | undefined, o: Partial<Cue> = {
    }, h = hero ?? "") => lanePassive(h,
        name,
        at,
        o)
    if (delta === 0) return out
    // rụng một nửa khi gục
    if (dead && delta < 0) {
        const lost = -delta
        const shed: Record<string, Cue[]> = {
            braum_dual: P(X("braum",
                "p",
                "extra"),
            {
                amount: lost
            },
            "braum"),
            blitz_parts: P(X("blitzcrank",
                "p",
                "extra"),
            {
                amount: lost
            },
            "blitzcrank"),
            garen_steel: P(X("garen",
                "p",
                "extra"),
            {
                amount: lost
            },
            "garen"),
            lux_pool: P(X("lux",
                "p",
                "extra"),
            {
                amount: lost
            },
            "lux"),
            night: P(X("vayne",
                "p",
                "extra"),
            {
                amount: lost
            },
            "vayne"),
            velkoz_decay: P(X("velkoz",
                "p",
                "extra"),
            {
                amount: lost
            },
            "velkoz"),
            frost: P(ASHE_FROST_SHED,
                {
                    amount: lost
                },
                "ashe"),
            tri_bomb: P(TRISTANA_BOMB_SHED,
                {
                    amount: lost
                },
                "tristana"),
            bleed: P(DARIUS_VFX.shed,
                {
                    amount: lost
                },
                "darius"),
            burn: P(BRAND_BURN_SHED,
                {
                    amount: lost
                },
                "brand"),
            frenzy: P(JINX_VFX.shed,
                {
                    amount: lost
                },
                "jinx"),
            yorick_soul: P(YORICK_VFX.shed,
                {
                    amount: lost
                },
                "yorick")
        }
        out.cues.push(...(shed[e.key] ?? []))
        out.release.push(`${e.unit}|`)
        return out
    }
    if (delta > 0) {
        const gain: Record<string, () => Cue[]> = {
            nami_wave: () => {
                const step = cg.kit("nami").p.p3
                const crest = step > 0 && Math.floor(e.value / step) > Math.floor(prev / step)
                const allies = Object.values(c.env.units).filter((u) => u.side === owner?.side && u.id !== e.unit && u.status === "board" && !u.token)
                return [...P(X("nami",
                    "p",
                    "impact")),
                ...(crest ? mk("nami",
                    "p",
                    "namiSurgeCrest",
                    at,
                    {
                        to: allies.map((u) => U(u.id))
                    }) : [])]
            },
            nami_bless: () => mk("nami",
                "e",
                "namiBlessGain",
                at),
            braum_dual: () => {
                const victim = [...(c.span ?? [])].reverse().find((x): x is Ev<"damage"> => x.t === "damage" && x.target !== e.unit && sideOf(x.target) !== sideOf(e.unit))
                return victim ? mk("braum",
                    "p",
                    BRAUM_VFX.stackFlow,
                    U(victim.target),
                    {
                        to: [at]
                    }) : P(X("braum",
                    "p",
                    "impact"))
            },
            blitz_parts: () => P(X("blitzcrank",
                "p",
                "impact")),
            zed_chain: () => P(X("zed",
                "p",
                "impact"),
            {
                amount: e.value
            },
            "zed"),
            evolve: () => [...P(X("viktor",
                "p",
                "impact"),
            {
            },
            "viktor"),
            ...P(X("viktor",
                "p",
                "cast"),
            {
            },
            "viktor")],
            soraka_light: () => P(X("soraka",
                "p",
                "cast"),
            {
            },
            "soraka"),
            hunger: () => {
                const dead2 = c.span?.find((x): x is Ev<"kill"> => x.t === "kill")
                return P(X("kogmaw",
                    "p",
                    "impact"),
                {
                    amount: e.value, to: dead2 && sideOf(dead2.target) !== sideOf(e.unit) ? [U(dead2.target)] : []
                },
                "kogmaw")
            },
            garen_steel: () => P(X("garen",
                "p",
                "impact")),
            yorick_soul: () => {
                const list: Cue[] = P(YORICK_VFX.gain,
                    {
                        amount: e.value
                    },
                    "yorick")
                if (!prev) list.push(...P(YORICK_VFX.aura,
                    {
                        amount: e.value, hold: hold(e.unit,
                            YORICK_VFX.aura)
                    },
                    "yorick"))
                return list
            },
            mist_evo: () => mk("yorick",
                "r",
                YORICK_VFX.evolve,
                at,
                {
                    amount: e.value
                }),
            lux_pool: () => P(X("lux",
                "p",
                "cast"),
            {
            },
            "lux"),
            janna_wind: () => P(X("janna",
                "p",
                "impact")),
            ahri_essence: () => P(X("ahri",
                "p",
                "cast"),
            {
            },
            "ahri"),
            fire: () => {
                const list = P(ANNIE_VFX.gain,
                    {
                        amount: e.value
                    },
                    "annie")
                list.push(...P(ANNIE_VFX.motes,
                    {
                        amount: e.value, hold: hold(e.unit,
                            ANNIE_VFX.motes)
                    },
                    "annie"))
                return list
            },
            frost: () => [...P(X("ashe",
                "p",
                "cast"),
            {
            },
            "ashe"),
            ...P(ASHE_FROST_CLING,
                {
                    amount: e.value
                },
                "ashe")],
            frenzy: () => [...P(X("jinx",
                "p",
                "cast"),
            {
            },
            "jinx"),
            ...P(X("jinx",
                "p",
                "extra"),
            {
                amount: e.value, hold: hold(e.unit,
                    "jinxFrenzyAura")
            },
            "jinx")],
            sylas_shackle: () => (e.value > prev ? P(X("sylas",
                "p",
                "cast"),
            {
                amount: e.value
            },
            "sylas") : []),
            mel_glow: () => (e.value > prev ? P(X("mel",
                "p",
                "cast"),
            {
                amount: e.value
            },
            "mel") : []),
            jayce_charge: () => (e.value > prev ? P(X("jayce",
                "p",
                "impact"),
            {
            },
            "jayce") : []),
            jinx_gun: () => [...(prev === 0 && e.value === 1 ? P("jinxSwapRocket",
                {
                },
                "jinx") : []),
            ...P(JINX_VFX.stance,
                {
                    amount: e.value, hold: hold(e.unit,
                        JINX_VFX.stance)
                },
                "jinx")],
            velkoz_decay: () => P(X("velkoz",
                "p",
                "cast"),
            {
                amount: e.value
            },
            "velkoz"),
            tri_bomb: () => [...P(TRISTANA_BOMB_ADD,
                {
                    amount: e.value
                },
                "tristana"),
            ...P(X("tristana",
                "p",
                "cast"),
            {
                amount: e.value
            },
            "tristana")],
            bleed: () => [...P(X("darius",
                "p",
                "impact")),
            ...P(X("darius",
                "p",
                "cast"),
            {
                amount: e.value
            },
            "darius")],
            burn: () => [...P(X("brand",
                "p",
                "cast"),
            {
                amount: e.value
            },
            "brand"),
            ...P(X("brand",
                "p",
                "impact"))],
            night: () => P(X("vayne",
                "p",
                "cast"),
            {
                amount: e.value
            },
            "vayne"),
            element: () => [...P(X("qiyana",
                "p",
                "impact"),
            {
            },
            "qiyana"),
            ...P(X("qiyana",
                "p",
                "extra"),
            {
            },
            "qiyana").map((k): Cue => ({
                ...k, from: {
                    lane: owner?.lane ?? 0, side: sideOf(e.unit)
                }
            }))]
        }
        // hold của Annie/Jinx được thay mới mỗi lần đổi số
        if (e.key === "fire") out.release.push(hold(e.unit,
            ANNIE_VFX.motes))
        if (e.key === "jinx_gun") out.release.push(hold(e.unit,
            JINX_VFX.stance))
        if (e.key === "frenzy") out.release.push(hold(e.unit,
            "jinxFrenzyAura"))
        out.cues.push(...(gain[e.key]?.() ?? []))
        return out
    }
    // tiêu bộ đếm (còn sống)
    switch (e.key) {
    case "fire": {
        out.release.push(hold(e.unit,
            ANNIE_VFX.motes))
        out.cues.push(...P(ANNIE_VFX.spend,
            {
            },
            "annie"))
        if (e.value > 0) out.cues.push(...P(ANNIE_VFX.motes,
            {
                amount: e.value, hold: hold(e.unit,
                    ANNIE_VFX.motes)
            },
            "annie"))
        break
    }
    case "zed_chain": if (e.value === 0) out.cues.push(...P(ZED_VFX.chainFade,
        {
        },
        "zed")); break
    case "frost": if (e.value === 0) out.cues.push(...P(X("ashe",
        "p",
        "impact"),
    {
        amount: prev
    },
    "ashe")); break
    case "velkoz_decay": if (e.value === 0) out.cues.push(...P(X("velkoz",
        "p",
        "impact"),
    {
        amount: prev
    },
    "velkoz")); break
    case "tri_bomb": {
        if (e.value === 0) {
            const killsIt = c.span?.some((x) => x.t === "kill" && x.target === e.unit)
            if (killsIt) out.cues.push(...P(X("tristana",
                "p",
                "extra"),
            {
                amount: prev
            },
            "tristana"))
            out.cues.push(...P(X("tristana",
                "p",
                "impact"),
            {
                amount: prev
            },
            "tristana"))
        }
        break
    }
    case "jinx_gun":
        out.release.push(hold(e.unit,
            JINX_VFX.stance))
        out.cues.push(...P(X("jinx",
            "q",
            "extra"),
        {
        },
        "jinx"),
        ...P(JINX_VFX.stance,
            {
                amount: e.value, hold: hold(e.unit,
                    JINX_VFX.stance)
            },
            "jinx"))
        break
    case "frenzy": out.release.push(hold(e.unit,
        "jinxFrenzyAura")); if (e.value > 0) out.cues.push(...P(X("jinx",
            "p",
            "extra"),
        {
            amount: e.value, hold: hold(e.unit,
                "jinxFrenzyAura")
        },
        "jinx")); break
    default: break
    }
    return out
}

// ---------------------------------------------------------------- sát thương / hồi / khiên

const isMelee = (hero: string | undefined) => {
    const role = hero ? cg.getHero(hero)?.role : undefined
    return role === "fighter" || role === "tank" || role === "assassin"
}

/** Điểm đến của lá Q/E/R/P của một tướng ở dạng Cue "with" dùng ở các chỗ khác */
function damageOn(e: Ev<"damage">, c: CueCtx): CueSet {
    const out = none()
    const m = meta(e)
    const src = heroOf(c.env,
        e.src)
    const at = U(e.target)
    const key = keyOfCard(c.card)
    const srcUnit = e.src ? c.env.units[e.src] : undefined
    // --- Khiên đỡ đòn: block của tướng đã cho Khiên, không có thì cue trúng thường
    if (e.absorbed > 0 && m.shieldHero) {
        const owner = m.shieldHero
        const k = (["q",
            "e",
            "r"] as SkillKey[]).find((x) => x === m.shieldKey && X(owner,
            x,
            "block")) ?? (["q",
            "e",
            "r"] as SkillKey[]).find((x) => X(owner,
            x,
            "block"))
        const name = k ? X(owner,
            k,
            "block") : undefined
        if (name && k) {
            out.cues.push({
                kind: "with", ...tone(owner,
                    k), name, from: at, to: e.src ? [U(e.src)] : []
            })
            out.block = true
        }
    }
    if (heroOf(c.env,
        e.target) === "aatrox") {
        out.release.push(hold(e.target,
            AATROX_BLOOD_RAGE))
        out.cues.push(...rage(e.target,
            e.hp,
            c))
    }
    // --- Vel'Koz: nhát thứ hai của Khe Nứt cuối lượt
    if (src === "velkoz" && !c.card && e.tag === "effect" && e.src) {
        out.cues.push(...mk("velkoz",
            "e",
            X("velkoz",
                "e",
                "extra"),
            at,
            {
                kind: "after"
            }))
        out.release.push(hold(e.target,
            VELKOZ_RIFT_LINGER))
    }
    // --- Thùng Gangplank nổ / vỡ: Thùng bắn tới nạn nhân
    if (m.keg && m.keg.kind === "skill") {
        out.cues.push({
            kind: "lead", ...tone("gangplank",
                "r"), name: GANGPLANK_VFX.detonate, from: U(m.keg.token), to: [at], amount: m.keg.powder
        })
        out.impact = {
            name: GANGPLANK_VFX.hit, amount: m.keg.powder
        }
        return out
    }
    // --- Tướng đánh thông qua `via`: bước nảy từ tướng liền trước
    if (e.via) {
        const via = U(e.via)
        switch (src) {
        case "missfortune":
            if (e.tag === "attack") {
                out.cues.push(...mk("missfortune",
                    "p",
                    X("missfortune",
                        "p",
                        "travel"),
                    via,
                    {
                        kind: "lead", to: [at]
                    }))
                out.impact = {
                    name: X("missfortune",
                        "p",
                        "impact")
                }
            } else out.cues.push(...mk("missfortune",
                "q",
                X("missfortune",
                    "q",
                    "extra"),
                via,
                {
                    kind: "lead", to: [at]
                }))
            break
        case "nami":
            out.cues.push(...mk("nami",
                "q",
                X("nami",
                    "q",
                    "travel"),
                via,
                {
                    kind: "lead", to: [at]
                }))
            break
        case "jinx":
            out.cues.push({
                kind: "with", ...tone("jinx",
                    "q"), name: JINX_VFX.splash, from: via, to: [at]
            })
            break
        case "tristana": {
            // Lưỡi lửa lan từ mục tiêu chính: ctx.amount = số Bom trên nó lúc đầu lô (trước khi nổ)
            out.cues.push(...mk("tristana",
                "r",
                X("tristana",
                    "r",
                    "extra"),
                via,
                {
                    to: [at], amount: m.via?.tri_bomb ?? stackOf(c.env.units[e.via],
                        "tri_bomb")
                }))
            break
        }
        default: break
        }
    }
    // --- Nội tại / chiêu có số tầng: ctx.amount
    const tStack = (k: string) => m.target?.[k] ?? stackOf(c.env.units[e.target],
        k)
    const sStack = (k: string) => m.src?.[k] ?? stackOf(srcUnit,
        k)
    if (e.tag === "dot") {
        if (src === "brand") {
            out.cues.push(...mk("brand",
                "p",
                X("brand",
                    "p",
                    "extra"),
                at,
                {
                    amount: tStack("burn")
                }))
            out.replace = true
        } else if (src === "darius") {
            out.cues.push(...mk("darius",
                "p",
                X("darius",
                    "p",
                    "extra"),
                at,
                {
                    amount: tStack("bleed")
                }))
            out.replace = true
        }
        return out
    }
    switch (src) {
    case "tristana":
        if (m.ability === "tri_detonate") out.impact = {
            name: X("tristana",
                "p",
                "impact"), amount: tStack("tri_bomb")
        }
        else if (key === "r") out.impact = {
            amount: tStack("tri_bomb")
        }
        break
    case "jinx":
        if (e.tag === "attack" && e.src && !sStack("jinx_gun")) out.cues.push({
            kind: "with", ...tone("jinx",
                "q"), name: JINX_VFX.spin, from: U(e.src), to: [at]
        })
        break
    case "kogmaw":
        if (e.tag === "attack") {
            const hunger = sStack("hunger")
            if (hunger > 0) {
                out.cues.push(...mk("kogmaw",
                    "p",
                    X("kogmaw",
                        "p",
                        "extra"),
                    at,
                    {
                        amount: hunger
                    }))
                out.cues.push(...mk("kogmaw",
                    "p",
                    X("kogmaw",
                        "p",
                        "cast"),
                    U(e.src!),
                    {
                        amount: hunger, to: [at]
                    }))
            }
            if (srcUnit?.statuses?.kog_e) {
                out.cues.push(...mk("kogmaw",
                    "e",
                    KOGMAW_VFX.barrage,
                    U(e.src!),
                    {
                        kind: "lead", to: [at]
                    }))
                out.impact = {
                    name: KOGMAW_VFX.barrageHit, amount: hunger
                }
            }
        }
        break
    case "darius":
        if (key === "q" && e.src) out.impact = {
            amount: tStack("bleed")
        }
        break
    case "zed":
        if (e.tag === "skill" || e.tag === "attack") out.cues.push(...mk("zed",
            "p",
            X("zed",
                "p",
                "extra"),
            at,
            {
                amount: sStack("zed_chain")
            }))
        break
    case "khazix":
        if (e.target && c.env.units[e.target]?.statuses?.isolated) out.cues.push(...mk("khazix",
            "p",
            X("khazix",
                "p",
                "extra"),
            at))
        break
    case "vayne":
        if (e.tag === "attack" && e.src && srcUnit?.statuses?.vayne_r) {
            const n = (vayneHits.get(e.src) ?? 0) + 1
            vayneHits.set(e.src,
                n >= 3 ? 0 : n)
            if (n < 3) out.cues.push({
                kind: "with", ...tone("vayne",
                    "p"), name: VAYNE_VFX.mark, from: at, amount: n
            })
        }
        break
    default: break
    }
    // Tibbers / Ma Sương đánh
    if (srcUnit?.token) {
        const hero2 = heroOf(c.env,
            srcUnit.token.ownerId)
        if (hero2 === "annie" && e.tag !== "dot") {
            out.cues.push({
                kind: "lead", ...tone("annie",
                    "r"), name: ANNIE_VFX.leap, from: U(e.src!), to: [at]
            })
            out.impact = {
                name: ANNIE_VFX.claw, amount: c.env.units[e.target]?.statuses?.stun ? 1 : 0
            }
        } else if (hero2 === "yorick") {
            out.cues.push({
                kind: "with", ...tone("yorick",
                    "r"), name: YORICK_VFX.claw, from: at, amount: stackOf(srcUnit,
                    "mist_evo")
            })
        }
    }
    if (c.env.units[e.target]?.token && heroOf(c.env,
        c.env.units[e.target].token?.ownerId) === "annie") out.cues.push({
        kind: "with", ...tone("annie",
            "r"), name: ANNIE_VFX.hurt, from: at
    })
    // Liên Kết Đá: đòn chia sang các tướng nối
    if (c.env.units[e.target]?.statuses?.stone_link) {
        const mal = Object.values(c.env.units).find((u) => u.hero === "malphite" && u.side === sideOf(e.target) && u.status === "board")
        if (mal) {
            const linked = Object.values(c.env.units).filter((u) => u.side === mal.side && u.statuses?.stone_link && u.id !== mal.id && u.status === "board")
            out.cues.push({
                kind: "with", ...tone("malphite",
                    "e"), name: MALPHITE_VFX.crack, from: at, intensity: 2
            })
            out.cues.push({
                kind: "with", ...tone("malphite",
                    "e"), name: MALPHITE_VFX.surge, from: at, to: [U(mal.id),
                    ...linked.map((u) => U(u.id))]
            })
        }
    }
    // chiêu có extra cố định theo lá
    out.cues.push(...skillExtra(e,
        c,
        key))
    // Twisted Fate: lá lật từ Bộ bài bay tới mục tiêu mang mã loại lá (ctx.amount). Q lá đỏ nổ một lần ở mục tiêu chính cùng hai đường kề; lá xanh rút về tay
    if (src === "twistedfate" && (key === "q" || key === "r") && m.tf !== undefined && e.src) {
        const side = sideOf(e.src)
        const hits = (c.span ?? []).filter((x): x is Ev<"damage"> => x.t === "damage" && x.src === e.src)
        const primary = hits[0] === e
        if (key === "r") {
            out.cues.push(...mk("twistedfate",
                "r",
                X("twistedfate",
                    "r",
                    "travel"),
                {
                    deck: side
                },
                {
                    kind: "lead", to: [at], amount: m.tf
                }))
            out.impact = {
                amount: m.tf
            }
        } else if (m.tf === TF_CARD.red && !primary) {
            // cùng nổ một nhịp với mục tiêu chính: hai đường kề không có cú nổ riêng
            out.replace = true
            out.skipTravel = true
        } else {
            out.cues.push(...mk("twistedfate",
                "q",
                X("twistedfate",
                    "q",
                    "travel"),
                {
                    deck: side
                },
                {
                    kind: "lead", to: [at], amount: m.tf
                }))
            out.impact = {
                amount: m.tf, ...(m.tf === TF_CARD.blue ? {
                    to: [{
                        hand: side
                    }]
                } : m.tf === TF_CARD.red ? {
                    to: hits.filter((x) => x !== e).map((x) => U(x.target))
                } : {
                })
            }
        }
    }
    return out
}

/** Cue phụ của lá chiêu cùng nhịp trúng chính (SkillVfx.extra) */
function skillExtra(e: Ev<"damage"> | Ev<"heal"> | Ev<"shield">, c: CueCtx, key: SkillKey | undefined): Cue[] {
    const hero = c.caster ? heroOf(c.env,
        c.caster) : heroOf(c.env,
        e.src)
    if (!hero || !key) return []
    const caster = c.caster ?? e.src
    if (!caster) return []
    const at = U(e.target)
    const name = X(hero,
        key,
        "extra")
    if (!name) return []
    const t = tone(hero,
        key)
    const first = c.span ? c.span.findIndex((x) => x === e) <= c.span.findIndex((x) => x.t === e.t && (x as { target?: string }).target === e.target) : true
    const mine = (id: string) => id === caster
    switch (`${hero}:${key}`) {
    case "ahri:q": return e.t === "damage" ? [{
        kind: "after", ...t, name, from: at, to: [U(caster)]
    }] : []
    case "darius:q": return e.t === "heal" && mine(e.target) ? [{
        kind: "with", ...t, name, from: U(c.span?.find((x): x is Ev<"damage"> => x.t === "damage")?.target ?? e.target), to: [U(caster)], amount: meta(e).target?.bleed ?? 0
    }] : []
    case "yorick:q": return e.t === "heal" && mine(e.target) ? [{
        kind: "with", ...t, name, from: U(caster)
    }] : []
    case "soraka:q": return e.t === "heal" && mine(e.target) ? [{
        kind: "with", ...t, name, from: U(caster)
    }] : []
    case "soraka:r": return e.t === "heal" && e.hp > 0 && first ? [{
        kind: "with", ...t, name, from: at
    }] : []
    case "garen:e": return e.t === "shield" && mine(e.target) ? [{
        kind: "with", ...t, name, from: at
    }] : []
    case "lux:q": return e.t === "shield" && mine(e.target) ? [{
        kind: "with", ...t, name, from: at
    }] : []
    case "aatrox:e": return e.t === "heal" && mine(e.target) ? [{
        kind: "with", ...t, name, from: U(c.span?.find((x): x is Ev<"damage"> => x.t === "damage")?.target ?? e.target), to: [U(caster)]
    }] : []
    case "velkoz:q": {
        // Phân Hạch: nhát thứ hai tách ra từ mục tiêu đầu tiên
        const firstHit = c.span?.find((x): x is Ev<"damage"> => x.t === "damage" && x.src === caster)
        return e.t === "damage" && firstHit && firstHit.target !== e.target ? [{
            kind: "with", ...t, name, from: U(firstHit.target), to: [at]
        }] : []
    }
    case "blitzcrank:r": return e.t === "damage" ? [{
        kind: "with", ...t, name, from: U(caster), to: [at]
    }] : []
    case "braum:q": return e.t === "damage" ? [{
        kind: "with", ...t, name, from: at
    }] : []
    case "braum:r": return e.t === "damage" && c.env.units[e.target] && c.env.units[caster] && c.env.units[e.target].lane === c.env.units[caster].lane ? [{
        kind: "with", ...t, name, from: at
    }] : []
    case "velkoz:r": return e.t === "damage" ? [{
        kind: "with", ...t, name, from: U(caster), to: [at], amount: 1
    }] : []
    default: return []
    }
}

/** Khí huyết Aatrox bám theo % Máu đã mất: thay hold mới mỗi lần Máu đổi */
function rage(unit: string, hp: number, c: CueCtx): Cue[] {
    const max = c.env.units[unit]?.maxHp ?? 0
    const lost = max > 0 ? Math.round((1 - hp / max) * 100) : 0
    return lost > 0 ? [{
        kind: "with", ...tone("aatrox",
            "p"), name: AATROX_BLOOD_RAGE, from: U(unit), amount: lost, hold: hold(unit,
            AATROX_BLOOD_RAGE)
    }] : []
}

function healOn(e: Ev<"heal">, c: CueCtx): CueSet {
    const out = none()
    const m = meta(e)
    const src = heroOf(c.env,
        e.src)
    const key = keyOfCard(c.card)
    const at = U(e.target)
    if (heroOf(c.env,
        e.target) === "aatrox") {
        out.release.push(hold(e.target,
            AATROX_BLOOD_RAGE))
        out.cues.push(...rage(e.target,
            e.hp,
            c))
    }
    if (m.keg && m.keg.kind === "other") {
        out.cues.push({
            kind: "lead", ...tone("gangplank",
                "r"), name: GANGPLANK_VFX.heal, from: U(m.keg.token), to: [at]
        })
        return out
    }
    if (e.via && src === "nami") {
        out.cues.push(...mk("nami",
            "q",
            X("nami",
                "q",
                "travel"),
            U(e.via),
            {
                kind: "lead", to: [at]
            }))
        out.impact = {
            name: "namiTideHeal"
        }
    } else if (e.via) {
        out.cues.push(...mk(src ?? "nami",
            "q",
            X(src ?? "nami",
                "q",
                "travel"),
            U(e.via),
            {
                kind: "lead", to: [at]
            }))
    }
    // hút máu của Aatrox (nội tại và E): máu từ nạn nhân chảy về Aatrox
    if (src === "aatrox" && e.target === e.src) {
        const victim = [...(c.span ?? [])].reverse().find((x): x is Ev<"damage"> => x.t === "damage" && x.src === e.src)
        const name = key === "e" ? X("aatrox",
            "e",
            "extra") : X("aatrox",
            "p",
            "extra")
        if (victim && name) out.cues.push({
            kind: "with", ...tone("aatrox",
                "p"), name, from: U(victim.target), to: [at]
        })
    }
    out.cues.push(...skillExtra(e,
        c,
        key))
    return out
}

function shieldOn(e: Ev<"shield">, c: CueCtx): CueSet {
    const out = none()
    if (e.expired) return out
    out.cues.push(...skillExtra(e,
        c,
        keyOfCard(c.card)))
    return out
}

// ---------------------------------------------------------------- các sự kiện khác

function killOn(e: Ev<"kill">, c: CueCtx): CueSet {
    const out = none()
    const hero = heroOf(c.env,
        e.target)
    const srcHero = heroOf(c.env,
        e.src)
    const at = U(e.target)
    out.release.push(`${e.target}|`)
    if (hero === "kogmaw") out.cues.push({
        kind: "with", ...tone("kogmaw",
            "p"), name: KOGMAW_VFX.death, from: at, amount: stackOf(c.env.units[e.target],
            "hunger")
    })
    if (hero === "malphite") out.cues.push({
        kind: "with", ...tone("malphite",
            "e"), name: MALPHITE_VFX.shatter, from: at
    })
    if (c.card?.id === "annie_q" && srcHero === "annie") out.cues.push(...mk("annie",
        "q",
        X("annie",
            "q",
            "extra"),
        at,
        {
            to: [{
                hand: sideOf(e.src ?? e.target)
            }]
        }))
    const tok = c.env.units[e.target]?.token
    if (tok && heroOf(c.env,
        tok.ownerId) === "gangplank") out.cues.push({
        kind: "with", ...tone("gangplank",
            "p"), name: GANGPLANK_VFX.shatter, from: at
    })
    if (c.card?.id === "darius_r" && srcHero === "darius") out.cues.push({
        kind: "with", ...tone("darius",
            "r"), name: DARIUS_VFX.execute, from: at
    })
    if (srcHero === "jinx" && e.src) out.cues.push({
        kind: "with", ...tone("jinx",
            "p"), name: JINX_VFX.kill, from: U(e.src), to: [at]
    })
    return out
}

function tokenOn(e: Ev<"summonToken">, c: CueCtx): CueSet {
    const out = none()
    const unit = c.env.units[e.unit]
    const owner = heroOf(c.env,
        e.owner ?? unit?.token?.ownerId)
    const at = U(e.unit)
    if (owner === "annie") out.cues.push({
        kind: "with", ...tone("annie",
            "r"), name: X("annie",
                "r",
                "extra")!, from: at, hold: hold(e.unit,
            "annieTibbersAura")
    })
    else if (owner === "yorick") out.cues.push({
        kind: "with", ...tone("yorick",
            "r"), name: YORICK_VFX.maidenAura, from: at, hold: hold(e.unit,
            YORICK_VFX.maidenAura), amount: stackOf(unit,
            "mist_evo")
    })
    else if (owner === "gangplank") {
        const powder = Number(unit?.token?.secret?.powder ?? NaN)
        if (!meta(e).placed) out.cues.push({
            kind: "lead", ...tone("gangplank",
                "e"), name: GANGPLANK_VFX.place, from: {
                hand: sideOf(e.unit)
            }, to: [U(e.unit)], ...(Number.isFinite(powder) ? {
                amount: powder
            } : {
            })
        })
        out.cues.push({
            kind: "with", ...tone("gangplank",
                "p"), name: GANGPLANK_VFX.fuse, from: at, hold: hold(e.unit,
                GANGPLANK_VFX.fuse), ...(Number.isFinite(powder) ? {
                amount: powder
            } : {
            })
        })
    }
    return out
}

function tokenEndOn(e: Ev<"tokenEnd">, c: CueCtx): CueSet {
    const out = none()
    out.release.push(`${e.unit}|`)
    const unit = c.env.units[e.unit]
    const owner = heroOf(c.env,
        unit?.token?.ownerId)
    if (owner === "yorick" && e.reason === "owner") out.cues.push({
        kind: "with", ...tone("yorick",
            "r"), name: YORICK_VFX.fade, from: U(e.unit), amount: stackOf(unit,
            "mist_evo")
    })
    return out
}

function tokenFlipOn(e: Ev<"tokenFlip">, c: CueCtx): CueSet {
    const out = none()
    const unit = c.env.units[e.unit]
    if (heroOf(c.env,
        unit?.token?.ownerId) !== "gangplank") return out
    const icon = e.card?.kind === "skill" && e.card.hero ? skillIcon(e.card.hero,
(keyOfCard(e.card) ?? "q") as SkillKey) : undefined
    out.cues.push({
        kind: "lead", ...tone("gangplank",
            "p"), name: GANGPLANK_VFX.flip, from: U(e.unit), ...(icon ? {
            icon
        } : {
        })
    })
    out.release.push(hold(e.unit,
        GANGPLANK_VFX.fuse))
    return out
}

function abilityOn(e: Ev<"ability">, c: CueCtx): CueSet {
    const out = none()
    const hero = heroOf(c.env,
        e.unit)
    if (hero === "tristana" && e.target) {
        out.cues.push(...mk("tristana",
            "p",
            X("tristana",
                "p",
                "travel"),
            U(e.unit),
            {
                kind: "lead", to: [U(e.target)], amount: stackOf(c.env.units[e.target],
                    "tri_bomb")
            }))
    } else if (hero === "jayce") {
        out.cues.push(...mk("jayce",
            "p",
            X("jayce",
                "p",
                "cast"),
            U(e.unit)))
    } else if (hero === "gangplank") {
        // Úp Lá: lá (không lộ mặt) rời tay cắm xuống ô phụ
        out.cues.push({
            kind: "lead", ...tone("gangplank",
                "e"), name: GANGPLANK_VFX.place, from: {
                hand: sideOf(e.unit)
            }, to: [U(e.unit,
                5)], amount: 0
        })
    }
    return out
}

function deckFlipOn(e: Ev<"deckFlip">, c: CueCtx): CueSet {
    const out = none()
    const type = meta(e).tf ?? TF_CARD.blue
    // Q và R tự có đạn bay từ Bộ bài ở nhịp trúng; chỉ lần xem lá đầu lượt của nội tại mới nhấc lá lên
    if (c.card?.id === "twistedfate_q" || c.card?.id === "twistedfate_r") return out
    const tfUnit = e.by ?? Object.values(c.env.units).find((u) => u.hero === "twistedfate" && u.side === e.side && u.status === "board")?.id
    if (tfUnit) out.cues.push(...mk("twistedfate",
        "p",
        X("twistedfate",
            "p",
            "impact"),
        U(tfUnit),
        {
            amount: type
        }))
    return out
}

function frozenOn(e: Ev<"cardFrozen"> | Ev<"cardThawed">): CueSet {
    const out = none()
    const card = {
        card: e.card.uid, side: e.side
    } as Place
    if (e.t === "cardFrozen") {
        const liss = e.by
        // băng bò từ Lissandra lên lá, chạm lá thì Hoá Băng đáp và giữ tới khi tan
        out.cues.push(...mk("lissandra",
            "p",
            X("lissandra",
                "p",
                "cast") ?? X("lissandra",
                "q",
                "extra"),
            U(liss),
            {
                kind: "lead", to: [card]
            }))
        out.cues.push(...mk("lissandra",
            "p",
            X("lissandra",
                "p",
                "impact"),
            card,
            {
                hold: `${e.card.uid}|freeze`, to: [card]
            }))
    } else out.release.push(`${e.card.uid}|freeze`)
    return out
}

function moveOn(e: Ev<"move">, c: CueCtx): CueSet {
    const out = none()
    const mover = heroOf(c.env,
        e.unit)
    const key = keyOfCard(c.card)
    if (mover === "vayne" && key === "q" && !e.with) {
        const link = [...chainLinks.values()].reverse().find((l) => l.targets.includes(e.unit))
        out.cues.push(...mk("vayne",
            "q",
            X("vayne",
                "q",
                "extra"),
            link?.actor ? U(link.actor) : U(e.unit),
            {
                to: [{
                    lane: e.from, side: sideOf(e.unit)
                }]
            }))
        return out
    }
    if (!e.with) return out
    if (mover === "ahri" && key === "e") out.cues.push(...mk("ahri",
        "e",
        X("ahri",
            "e",
            "extra"),
        U(e.with)))
    else if (mover === "khazix" && key === "e") out.cues.push(...mk("khazix",
        "e",
        X("khazix",
            "e",
            "extra"),
        U(e.with)))
    return out
}

function transformOn(e: Ev<"transform">, c: CueCtx): CueSet {
    const out = none()
    if (heroOf(c.env,
        e.unit) !== "aatrox") return out
    const at = U(e.unit)
    if (e.on) {
        out.cues.push(...mk("aatrox",
            "r",
            X("aatrox",
                "r",
                "extra"),
            at))
        out.cues.push({
            kind: "with", ...tone("aatrox",
                "r"), name: AATROX_FORM_AURA, from: at, hold: hold(e.unit,
                AATROX_FORM_AURA)
        })
    } else {
        out.release.push(hold(e.unit,
            AATROX_FORM_AURA))
        if (e.reason === "revive") out.cues.push({
            kind: "lead", ...tone("aatrox",
                "r"), name: AATROX_REBIRTH, from: at
        })
    }
    return out
}

function discardOn(e: Ev<"discard">, c: CueCtx): CueSet {
    const out = none()
    if (e.reason !== "effect") return out
    const span = c.span ?? []
    const idx = span.indexOf(e)
    // chỉ cue đầu của chuỗi bỏ bài liên tiếp (R Blitzcrank), amount = số lá
    if (idx > 0 && span[idx - 1].t === "discard" && (span[idx - 1] as Ev<"discard">).side === e.side) return out
    let n = 0
    for (let i = Math.max(idx,
        0); i < span.length && span[i].t === "discard" && (span[i] as Ev<"discard">).side === e.side; i++) n++
    const src = Object.values(c.env.units).find((u) => u.hero === "blitzcrank" && u.side !== e.side && u.status === "board")
    if (src) out.cues.push({
        kind: "with", ...tone("blitzcrank",
            "r"), name: BLITZ_HAND_DISCARD, from: {
            hand: e.side
        }, to: [{
            grave: e.side
        }], amount: n || 1
    })
    return out
}

function chainOn(e: Ev<"chainAdd"> | Ev<"chainResolve"> | Ev<"chainCancel">, c: CueCtx): CueSet {
    const out = none()
    const link = chainLinks.get(e.n)
    if (e.t === "chainAdd") {
        if (e.kind === "attack" && e.actor && e.targets[0]) {
            const defenders = Object.values(c.env.units).filter((u) => u.hero === "leona" && u.side !== sideOf(e.actor!) && u.status === "board")
            if (defenders.length) out.cues.push({
                kind: "with", ...tone("leona",
                    "e"), name: LEONA_VFX.windup, from: U(e.actor), to: [U(e.targets[0])], hold: `chain|${e.n}`
            })
        }
        return out
    }
    out.release.push(`chain|${e.n}`)
    if (e.t === "chainCancel" && link?.actor && link.targets.length) {
        const stunned = c.span?.some((x) => x.t === "status" && x.id === "stun" && x.target === link.actor)
        const lissTargeted = link.targets.find((id) => c.env.units[id]?.hero === "lissandra" && c.env.units[id]?.statuses?.stasis)
        if (stunned) out.cues.push({
            kind: "with", ...tone("leona",
                "e"), name: LEONA_VFX.fizzle, from: U(link.actor), to: [U(link.targets[0])]
        })
        if (lissTargeted) out.cues.push({
            kind: "with", ...tone("lissandra",
                "r"), name: X("lissandra",
                    "r",
                    "block")!, from: U(lissTargeted), to: [U(link.actor)]
        })
    }
    return out
}

function burnMillOn(e: Ev<"burn">, c: CueCtx): CueSet {
    const out = none()
    const side = e.side
    const yorick = Object.values(c.env.units).find((u) => u.hero === "yorick" && u.side !== side && u.status === "board")
    if (yorick) out.cues.push({
        kind: "with", ...tone("yorick",
            "p"), name: YORICK_VFX.mill, from: {
            deck: side
        }, to: [{
            grave: side
        }]
    })
    return out
}

function markerOn(e: Ev<"marker">, c: CueCtx): CueSet {
    const out = none()
    const lane: Place = {
        lane: e.lane, side: e.side
    }
    if (e.id === "sand_soldier") {
        // Dọn hold từ replay cũ; Lính Cát mới chỉ hiện bằng stack trên tướng.
        out.release.push(`sand_soldier|${e.side}|${e.lane}`)
        return out
    }
    if (e.id !== "dagger") return out
    const key = `dagger|${e.side}|${e.lane}`
    if (e.on) {
        out.cues.push(...mk("katarina",
            "p",
            X("katarina",
                "p",
                "cast") ?? X("katarina",
                "q",
                "extra"),
            lane))
        out.cues.push(...mk("katarina",
            "p",
            X("katarina",
                "p",
                "extra"),
            lane,
            {
                hold: key
            }))
    } else {
        const kat = Object.values(c.env.units).find((u) => u.hero === "katarina" && u.side === e.side && u.status === "board")
        const foe = Object.values(c.env.units).find((u) => u.side !== e.side && u.lane === e.lane && u.status === "board" && !u.token)
        out.release.push(key)
        if (kat) out.cues.push(...mk("katarina",
            "p",
            X("katarina",
                "p",
                "travel"),
            lane,
            {
                kind: "lead", to: foe ? [U(foe.id)] : [U(kat.id)]
            }))
    }
    return out
}

/** Mã loại lá TF lật được (ctx.amount của các cue Twisted Fate): lá chiêu đỏ, Vàng/đồ vàng, còn lại xanh */
export function tfKind(card: cg.Card): number {
    return card.kind === "skill" ? TF_CARD.red : card.id === "gold" || card.id === "item" ? TF_CARD.gold : TF_CARD.blue
}

/** Cue ở lúc lá được đánh (một lần mỗi lá), cùng nhịp mở màn */
export function playCues(play: Ev<"play">, c: CueCtx): CueSet {
    const out = none()
    const id = play.card.copyOf ?? play.card.id
    const caster = c.caster
    const side = play.side
    if (id === "zed_r") out.cues.push({
        kind: "with", ...tone("zed",
            "r"), name: ZED_VFX.cardVanish, from: {
            hand: side
        }
    })
    if (id === "braum_e") {
        // E Đứng Sau Tôi: đòn nhắm đồng minh bị huỷ tác động, dây trạng thái siết lấy lá đồng minh rồi tan
        const link = [...chainLinks.values()].reverse().find((l) => l.targets.some((t) => t !== caster && sideOf(t) === side))
        const ally = link?.targets.find((t) => t !== caster && sideOf(t) === side)
        if (ally) out.cues.push(...mk("braum",
            "e",
            X("braum",
                "e",
                "extra"),
            U(ally),
            {
                to: link?.actor ? [U(link.actor)] : []
            }))
    }
    if (id === "malphite_r" && caster) {
        const rows = [...new Set((c.span ?? []).filter((x): x is Ev<"damage"> => x.t === "damage").map((x) => x.target))]
        out.cues.push(...mk("malphite",
            "r",
            X("malphite",
                "r",
                "extra"),
            U(caster),
            {
                to: rows.map((t) => U(t))
            }))
    }
    if (id === "khazix_r" && caster) {
        const link = [...chainLinks.values()].reverse().find((l) => l.targets.includes(caster))
        if (link?.actor) out.cues.push(...mk("khazix",
            "r",
            X("khazix",
                "r",
                "extra"),
            U(caster),
            {
                to: [U(link.actor)]
            }))
    }
    if (id === "khazix_r") out.cues.push({
        kind: "with", ...tone("khazix",
            "r"), name: KHAZIX_VFX.shuffle, from: {
            hand: side
        }, to: [{
            deck: side
        }], icon: skillIcon("khazix",
            "r"), amount: cg.kit("khazix").p.r2
    })
    if (id === "basic" && heroOf(c.env,
        caster) === "vayne") out.cues.push({
        kind: "with", ...tone("vayne",
            "p"), name: VAYNE_VFX.card, from: {
            hand: side
        }, to: caster ? [U(caster)] : []
    })
    if (id === "velkoz_e") for (const t of [play.args?.target,
        ...(play.args?.targets ?? [])]) if (t) out.cues.push({
        kind: "with", ...tone("velkoz",
            "e"), name: VELKOZ_RIFT_LINGER, from: U(t), hold: hold(t,
            VELKOZ_RIFT_LINGER)
    })
    if (id === "darius_r" && caster) out.cues.push({
        kind: "after", ...tone("darius",
            "r"), name: DARIUS_VFX.wait, from: U(caster), amount: cg.kit("darius").p.r4, hold: hold(caster,
            DARIUS_VFX.wait)
    })
    return out
}

/** Lá bay lên tay bằng cue PixiJS thay cho lá DOM. Undefined = dùng lá DOM thường */
export function handFlight(e: Ev<"create"> | Ev<"freeCard"> | Ev<"returnToHand"> | Ev<"draw">, env: CueEnv): Cue | undefined {
    const card = e.card
    const side = e.side
    const m = meta(e)
    const origin = (card.data as { recycled?: string } | undefined)?.recycled
    const find = (hero: string) => Object.values(env.units).find((u) => u.hero === hero && u.side === side && u.status === "board")?.id
    const to: Place[] = [{
        hand: side
    }]
    if (origin && card.data?.stolen && e.t === "create") {
        const victim = find(origin) ?? Object.values(env.units).find((u) => u.hero === origin)?.id
        const key = (keyOfCard(card) ?? "q") as SkillKey
        return {
            kind: "lead", ...tone(origin,
                key), name: X("sylas",
                    "p",
                    "extra")!, from: victim ? U(victim) : {
                grave: side
            }, to, icon: skillIcon(origin,
                key)
        }
    }
    if (origin && e.t === "create") return {
        kind: "lead", ...tone("rumble",
            "p"), name: X("rumble",
                "p",
                "cast")!, from: {
            grave: side
        }, to, icon: skillIcon(origin,
(keyOfCard(card) ?? "q") as SkillKey)
    }
    if (e.t === "create" || e.t === "freeCard") {
        const yorick = find("yorick"), khazix = find("khazix"), ornn = find("ornn")
        if (card.id === "yorick_r" && yorick) return {
            kind: "lead", ...tone("yorick",
                "r"), name: YORICK_VFX.milestone, from: U(yorick), to, icon: skillIcon("yorick",
                "r")
        }
        if (card.id === "khazix_q" && khazix) return {
            kind: "lead", ...tone("khazix",
                "q"), name: KHAZIX_VFX.freeCard, from: U(khazix), to, icon: skillIcon("khazix",
                "q")
        }
        const key = keyOfCard(m.byCard)
        if (m.byCard?.hero === "ornn" && ornn && card.kind !== "skill") return {
            kind: "lead", ...tone("ornn",
                "q"), name: (key === "r" ? X("ornn",
                    "r",
                    "extra") : X("ornn",
                    "q",
                    "extra"))!, from: U(ornn), to, icon: card.item ? `/items/${card.item}.png` : undefined
        }
        if (m.keg && m.keg.kind === "gold") return {
            kind: "lead", ...tone("gangplank",
                "r"), name: GANGPLANK_VFX.gold, from: U(m.keg.token), to, amount: 1
        }
        if (m.keg && m.keg.kind === "item") return {
            kind: "lead", ...tone("gangplank",
                "r"), name: GANGPLANK_VFX.card, from: U(m.keg.token), to, amount: 1
        }
    }
    const darius = find("darius")
    if (e.t === "returnToHand" && card.id === "darius_r" && darius) return {
        kind: "lead", ...tone("darius",
            "r"), name: X("darius",
                "r",
                "extra")!, from: U(darius), to, icon: skillIcon("darius",
            "r")
    }
    return undefined
}

/** Cue hero cho một sự kiện. Rỗng nếu tướng/sự kiện không có cue riêng. Kết quả nhớ theo sự kiện (một sự kiện chỉ tính một lần) */
export function cuesFor(e: cg.GameEvent, c: CueCtx): CueSet {
    const known = MEMO.get(e)
    if (known) return known
    const out = cuesOf(e,
        c)
    MEMO.set(e,
        out)
    return out
}
const MEMO = new WeakMap<cg.GameEvent, CueSet>()

function cuesOf(e: cg.GameEvent, c: CueCtx): CueSet {
    switch (e.t) {
    case "marker": return markerOn(e,
        c)
    case "turnStart": {
        const out = none()
        for (const u of Object.values(c.env.units)) {
            if (u.side !== e.side || !u.token || u.status !== "board" || heroOf(c.env,
                u.token.ownerId) !== "gangplank") continue
            const powder = Number(u.token.secret?.powder ?? NaN)
            out.cues.push({
                kind: "with", ...tone("gangplank",
                    "p"), name: GANGPLANK_VFX.gain, from: U(u.id), ...(Number.isFinite(powder) ? {
                    amount: powder + 1
                } : {
                })
            })
        }
        return out
    }
    case "status": return statusOn(e,
        c)
    case "statusEnd": return statusOff(e,
        c)
    case "stack": return stackOn(e,
        c)
    case "damage": return damageOn(e,
        c)
    case "heal": return healOn(e,
        c)
    case "shield": return shieldOn(e,
        c)
    case "kill": return killOn(e,
        c)
    case "summonToken": return tokenOn(e,
        c)
    case "tokenEnd": return tokenEndOn(e,
        c)
    case "tokenFlip": return tokenFlipOn(e,
        c)
    case "ability": return abilityOn(e,
        c)
    case "deckFlip": return deckFlipOn(e,
        c)
    case "cardFrozen":
    case "cardThawed": return frozenOn(e)
    case "move": return moveOn(e,
        c)
    case "transform": return transformOn(e,
        c)
    case "discard": return discardOn(e,
        c)
    case "burn": return burnMillOn(e,
        c)
    case "chainAdd":
    case "chainResolve":
    case "chainCancel": return chainOn(e,
        c)
    default: return none()
    }
}

/** Sự kiện nào có thể mang cue riêng (để plan quyết định có dựng bước hay không mà chưa cần view) */
export function mayCue(e: cg.GameEvent): boolean {
    switch (e.t) {
    case "stack": return !e.key.startsWith("item:") && !e.key.startsWith("tc:") && !e.key.startsWith("aura:") && e.key !== "itemAmp"
    case "status": case "statusEnd": case "transform": case "tokenEnd": case "tokenFlip": case "deckFlip": case "cardFrozen": case "cardThawed": case "burn": case "marker": case "turnStart":
        return true
    case "discard": return e.reason === "effect"
    default: return false
    }
}

/** Cú trúng của hồi máu/khiên/sát thương của lá hồi sinh tự sinh: chọn kiểu Lá Tái Chế của Rumble */
export function recycledStyle(card: cg.Card, tintColor?: { color: number; color2?: number }): { origin: string; key: SkillKey; style: SkillVfx; cast?: string } | undefined {
    const origin = (card.data as { recycled?: string } | undefined)?.recycled
    if (!origin || card.data?.stolen) return undefined // Chiêu Đoạt của Sylas giữ VFX gốc, không dùng kiểu Lá Tái Chế
    const key = keyOfCard(card) ?? "q"
    const from = hasHeroVfx(origin) ? skillVfx(origin,
        key) : undefined
    const style = isMelee(origin) ? RUMBLE_VFX.recycle.cleave : RUMBLE_VFX.recycle.bolt
    return {
        origin, key,
        style: {
            ...style, color: from?.color ?? tintColor?.color ?? style.color, color2: from?.color2 ?? tintColor?.color2 ?? style.color2, intensity: from?.intensity
        },
        cast: X("rumble",
            "p",
            "impact")
    }
}

/** Cue mở đầu của Teemo cho nấm rút bù */
export const TEEMO_REDRAW = TEEMO_VFX.redraw
/** Cue Ornn rèn thẳng vào ô đồ */
export const ORNN_FORGED = ORNN_FORGED_ITEM
/** Khe Nứt Vel'Koz nằm chờ trên lá */
export const VELKOZ_LINGER = VELKOZ_RIFT_LINGER
/** Nội tại Aatrox: khí huyết bám theo Máu đã mất */
export const AATROX_RAGE = AATROX_BLOOD_RAGE
