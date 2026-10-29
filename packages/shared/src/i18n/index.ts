// Đa ngôn ngữ (vi / en). Chữ giao diện qua t(key, {tham số}); tên và mô tả trong dữ liệu game (tướng, chiêu, đồ, lá bài,
// trạng thái...) được đổi tại chỗ bằng applyLocale() để mọi chỗ đang đọc `.name` / `.desc` tự ra đúng ngôn ngữ.
// Tên tiếng Anh lấy bản chính thức của Riot (Data Dragon en_US, xem lol_en.ts).
import {
    DECK_KIND_NAME
} from "../deck/registry"
import {
    allBuffs, getBuff
} from "../deck/registry"
import {
    PRESET_DECKS
} from "../deck/presets"
import {
    LANES, RESOURCES, ROLE_INFO, STATUS_INFO, type Role, type StatusId
} from "../cards"
import {
    CARDS, SKILLS, allHeroes, getHero
} from "../registry"
import {
    allItems, getItem
} from "../items/registry"
import {
    STAT_NAMES
} from "../items/types"
import {
    CARDS_EN
} from "./cards_en"
import {
    TEXT_EN
} from "./text_en"
import {
    LOL_EN
} from "./lol_en"
import {
    UI_EN, UI_VI, type UiKey
} from "./ui"

export type Lang = "vi" | "en";
export const LANGS: { id: Lang; name: string }[] = [{
    id: "vi", name: "Tiếng Việt"
},
{
    id: "en", name: "English"
}]
let current: Lang = "vi"
export const getLang = () => current

/** Chữ giao diện theo ngôn ngữ hiện tại; `{x}` thay bằng vars.x */
export function t(key: UiKey, vars: Record<string, string | number> = {
}): string {
    const s: string = (current === "en" ? UI_EN : UI_VI)[key] ?? UI_VI[key] ?? key
    return s.replace(/\{(\w+)\}/g,
        (_, k) => String(vars[k] ?? `{${k}}`))
}

const ROLE_EN: Record<Role, string> = {
    tank: "Tank", fighter: "Fighter", assassin: "Assassin", mage: "Mage", marksman: "Marksman", support: "Support"
}
const ROLE_PERK_EN: Record<Role, string> = {
    tank: "Steadfast: takes 10% less damage while in the front row.",
    fighter: "Duelist: basic attacks deal 15% more damage to a target alone in its lane; with no ally in the same lane, the fighter takes 10% less damage.",
    assassin: "Dash: the only role that may move 1 tile each turn on its own (others need Flash or an ability); basic attacks reach every row of the same lane, prefer marksmen/mages and deal 20% more damage to them.",
    mage: "Splash: basic attacks deal magic damage and splash 50% to enemies next to the target.",
    marksman: "Sniper: basic attacks deal 10% more damage to a target that did not move last turn.",
    support: "Helping Hand: the support's shields and heals are 15% stronger on adjacent allies.",
}
const STATUS_EN: Record<StatusId, { name: string; short: string; desc: string }> = {
    stun: {
        name: "Stun", short: "Stun", desc: "Can't attack or cast"
    },
    freeze: {
        name: "Frozen", short: "Frozen", desc: "Can't attack or cast"
    },
    chill: {
        name: "Chill", short: "Chill", desc: "Takes 25% more damage from all sources"
    },
    shred: {
        name: "Armor Shred", short: "Shred", desc: "Armor and MR −40%"
    },
    barrage: {
        name: "Barrage", short: "Barrage", desc: "Longer-range attacks with bonus magic damage"
    },
    wounds: {
        name: "Grievous Wounds", short: "Wounds", desc: "Healing reduced by 50%"
    },
    burn: {
        name: "Burn", short: "Burn", desc: "Loses HP every turn"
    },
    invuln: {
        name: "Invulnerable", short: "Invuln", desc: "Takes no damage"
    },
    unstoppable: {
        name: "Unstoppable", short: "Unstop", desc: "Immune to crowd control"
    },
    focus: {
        name: "Focus", short: "Focus", desc: "Attacks fire an extra bolt"
    },
    guard: {
        name: "Guard", short: "Guard", desc: "Takes 30% less damage"
    },
    empower: {
        name: "Empowered", short: "Empower", desc: "Empowered (depends on the ability)"
    },
    silence: {
        name: "Silence", short: "Silence", desc: "Can't cast abilities (can still attack and move)"
    },
}
const BUFF_EN: Record<string, { name: string; short: string; desc: string }> = {
    exhaust: {
        name: "Exhaust", short: "Exhaust", desc: "Deals 40% less damage."
    },
    wrath: {
        name: "Elixir of Wrath", short: "Wrath", desc: "+25% AD."
    },
    sorcery: {
        name: "Elixir of Sorcery", short: "Sorcery", desc: "+40 AP."
    },
    baron: {
        name: "Hand of Baron", short: "Baron", desc: "+15% AD, +20 AP, +50% damage to towers and the Nexus."
    },
    regen: {
        name: "Health Potion", short: "Regen", desc: "Heals 80 HP at the start of each of your turns."
    },
    crit: {
        name: "Infinity Edge", short: "Crit", desc: "Every basic attack critically strikes."
    },
    execute: {
        name: "Noxian Guillotine", short: "Execute", desc: "Deals 50% more damage to enemy champions below 40% HP."
    },
    red_buff: {
        name: "Red Buff", short: "Red", desc: "+20% AD, 10% lifesteal."
    },
    blue_buff: {
        name: "Blue Buff", short: "Blue", desc: "+30 AP, +10 Mana per turn."
    },
    tempo: {
        name: "Lethal Tempo", short: "Tempo", desc: "+40% Attack speed."
    },
    pierce: {
        name: "Pierce", short: "Pierce", desc: "Basic attacks pierce the target, also hitting the champion right behind it for 60% damage."
    },
}
const KIND_EN = {
    spell: "Spell", trap: "Trap", stat: "Boost", item: "Item"
} as const
const PRESET_EN: Record<string, { name: string; desc: string }> = {
    xa_thu: {
        name: "Marksman", desc: "Scale a back-row marksman: crits, double strikes, piercing shots; traps keep enemies away."
    },
    sat_thu: {
        name: "Assassin", desc: "Dive the back line: executes, Ignite, Smite; Jack In The Box and decoys to bluff."
    },
    phap_su: {
        name: "Mage", desc: "Burst with abilities: mana, AP, damage spells; Equinox and Noxious Traps for control."
    },
    do_don: {
        name: "Tank & Support", desc: "Tanky and protective: HP, shields, healing, Hand of Baron; Pulverize and Rocket Grab traps."
    },
}
const STAT_EN: Record<string, (v: number) => string> = {
    atk: (v) => `+${v} AD`, ap: (v) => `+${v} AP`, hp: (v) => `+${v} HP`, armor: (v) => `+${v} armor`, mr: (v) => `+${v} MR`,
    manaRegen: (v) => `+${v} mana regen`, atkMult: (v) => `+${Math.round(v * 100)}% AD`, crit: (v) => `+${Math.round(v * 100)}% crit chance`,
    critDmg: (v) => `+${Math.round(v * 100)}% crit damage`, extraAtk: (v) => `+${Math.round(v * 100)}% Attack speed`,
    lifesteal: (v) => `${Math.round(v * 100)}% life steal`, omnivamp: (v) => `${Math.round(v * 100)}% omnivamp`,
    spellAmp: (v) => `abilities +${Math.round(v * 100)}%`, dmgAmp: (v) => `+${Math.round(v * 100)}% damage`,
    manaDiscount: (v) => `abilities cost ${v} less`, lethality: (v) => `+${v} lethality`, magicPen: (v) => `+${v} magic pen`,
}

/** Đổi ngôn ngữ: chữ giao diện + tên/mô tả trong dữ liệu game. Gọi một lần trước khi vẽ (client); server giữ tiếng Việt. */
/** Điều kiện cường hoá của chiêu sang tiếng Anh (theo câu tiếng Việt do items/conditions sinh ra) */
const ROLE_VI_EN: Record<string, string> = {
    "đỡ đòn": "tank", "đấu sĩ": "fighter", "sát thủ": "assassin", "pháp sư": "mage", "xạ thủ": "marksman", "trợ thủ": "support"
}
function condEn(vi: string): string {
    let m: RegExpMatchArray | null
    if ((m = vi.match(/^mục tiêu dưới (\d+)% máu$/))) return `the target is below ${m[1]}% HP`
    if ((m = vi.match(/^bản thân dưới (\d+)% máu$/))) return `you are below ${m[1]}% HP`
    if ((m = vi.match(/^lane có từ (\d+) tướng địch$/))) return `the lane has ${m[1]} or more enemy champions`
    if ((m = vi.match(/^có từ (\d+) đồng minh đứng kề$/))) return `${m[1]} or more allies stand next to you`
    if ((m = vi.match(/^3 đường quanh mình có từ (\d+) tướng địch$/))) return `the 3 lanes around you hold ${m[1]} or more enemies`
    if ((m = vi.match(/^từ vòng (\d+)$/))) return `from round ${m[1]}`
    if ((m = vi.match(/^cụm 3×3 quanh mục tiêu có từ (\d+) tướng địch$/))) return `the 3×3 around the target holds ${m[1]} or more enemies`
    if ((m = vi.match(/^bản thân trên (\d+)% máu$/))) return `you are above ${m[1]}% HP`
    if ((m = vi.match(/^mục tiêu trên (\d+)% máu$/))) return `the target is above ${m[1]}% HP`
    if ((m = vi.match(/^mục tiêu là (.+)$/))) { const roles = m[1].split("/").map((r) => ROLE_VI_EN[r] ?? r).join("/"); return `the target is ${/^[aeiou]/.test(roles) ? "an" : "a"} ${roles}` }
    const fixed: Record<string, string> = {
        "mục tiêu đang Rã giáp/Buốt": "the target has Armor Shred/Chill", "mục tiêu đang Buốt": "the target is Chilled",
        "mục tiêu đứng một mình trong lane": "the target is alone in its lane", "mục tiêu bị Soi Rọi": "the target is Illuminated",
        "mục tiêu đang có khiên": "the target has a Shield", "mục tiêu đang Câm Lặng": "the target is Silenced", "đang giữ Đá": "holding Stone", "mục tiêu ở góc (đường biên, hậu tuyến)": "the target is in a corner (edge lane, back row)", "đang giữ Sông": "holding River", "đang giữ Cỏ": "holding Grass", "mục tiêu ở hậu tuyến": "the target is in the back row",
        "mục tiêu có dao găm": "the target has a dagger", "mục tiêu đang Choáng/Đóng băng": "the target is Stunned/Frozen",
        "có phân thân bóng tối": "a living shadow is out", "Hỏa Cuồng sẵn sàng": "Pyromania is ready",
        "mục tiêu sát tường (đường biên hoặc hàng cuối)": "the target is against a wall (edge lane or last row)", "bản thân sát tường (đường biên hoặc hàng cuối)": "you are against a wall (edge lane or last row)",
        "không có đồng minh đứng kề": "no ally stands next to you", "mục tiêu có đồng đội đứng kề": "the target has an ally next to it",
        "mục tiêu không có đồng đội đứng kề": "the target has no ally next to it", "mục tiêu cùng đường": "the target is in your lane",
        "vừa di chuyển lượt này": "you moved this turn", "bản thân đang có khiên": "you have a Shield", "mục tiêu còn đầy máu": "the target is at full HP",
        // xạ thủ/pháp sư (Vayne, Ashe, Lux...)
        "đường chỉ có 1 tướng địch": "your lane holds only 1 enemy", "mục tiêu bị đẩy va tường hoặc đồng đội": "the target is knocked into a wall or an ally",
        "mục tiêu đang ẩn": "the target is hidden", "mục tiêu ở lane khác": "the target is in another lane",
        "bản thân đang Cường Hoá": "you are Empowered", "mục tiêu đang Choáng": "the target is Stunned",
        // đỡ đòn / trợ thủ (Braum, Soraka, Janna)
        "đồng minh đó đứng kề Braum": "that ally stands next to Braum", "đồng minh đó đứng kề Soraka": "that ally stands next to Soraka",
        "tướng đó bị đẩy vào tường hoặc đồng đội": "it is knocked back into a wall or an ally", "tướng đó bị hất vào tường hoặc đồng đội": "it is knocked sideways into a wall or an ally",
        // đấu sĩ / sát thủ (Aatrox, Darius, Zed, Katarina, Kha'Zix)
        "mục tiêu đang bị xiềng xích": "the target is chained", "mục tiêu bị kéo va đồng đội": "the target is dragged into an ally",
        "mục tiêu có từ 3 dấu Xuất Huyết": "the target has 3 or more Hemorrhage stacks",
        "phân thân đứng cùng đường với mục tiêu": "the shadow stands in the target's lane",
        "có phân thân bóng tối và phân thân đứng cùng đường với Zed": "the shadow stands in Zed's own lane",
        "mục tiêu không có đồng đội đứng kề và đã tiến hoá Vuốt": "the target is isolated and Reaper Claws is evolved",
        "đã tiến hoá Gai": "Spike Racks is evolved",
        // thiết kế lại 10/2026 (Lissandra, Katarina, Aatrox, Thresh, Janna, Leona)
        "mục tiêu vừa di chuyển lượt trước": "the target moved last turn", "mục tiêu bị giam trong Tường Băng": "the target is trapped in an Ice Wall",
        "mục tiêu đang có bùa hoặc Cường Hoá": "the target has a buff or an Empower", "Katarina đang mang bùa hoặc Cường Hoá": "Katarina carries a buff or an Empower",
        "mục tiêu đang bị xích": "the target is chained", "mục tiêu đang bị xích và mục tiêu là trợ thủ/đỡ đòn": "the target is chained and is a support/tank",
        "hai tướng bị xích không đứng kề nhau": "the two chained champions are not adjacent", "có tướng địch đang bị xích": "an enemy is chained",
        "mục tiêu đang Choáng/Đóng băng/Câm Lặng": "the target is Stunned/Frozen/Silenced", "đồng minh cùng lane bị choáng/đóng băng": "an ally in your lane is Stunned/Frozen",
        "mục tiêu đứng ở đường trụ mình đã mất máu": "the target stands in a lane where your turret has lost HP",
        "mục tiêu đeo nhiều đồ nhất bên địch (từ 2 món)": "the target is the main carry (most items on its team, 2+)",
    }
    return fixed[vi] ?? vi
}

export function applyLocale(lang: Lang) {
    current = lang
    if (lang !== "en") return // dữ liệu gốc là tiếng Việt
    for (const [id,
        sk] of Object.entries(SKILLS)) VI_NAME.set(sk.name,
        () => SKILLS[id].name)
    for (const [id,
        c] of Object.entries(CARDS)) VI_NAME.set(c.name,
        () => CARDS[id].name)
    for (const [role,
        name] of Object.entries(ROLE_EN)) (ROLE_INFO[role as Role] as { name: string }).name = name
    for (const [role,
        perk] of Object.entries(ROLE_PERK_EN)) (ROLE_INFO[role as Role] as { perk: string }).perk = perk
    for (const [id,
        v] of Object.entries(STATUS_EN)) Object.assign(STATUS_INFO[id as StatusId],
        v)
    for (const b of allBuffs()) if (BUFF_EN[b.id]) Object.assign(b,
        BUFF_EN[b.id])
    Object.assign(DECK_KIND_NAME,
        KIND_EN)
    RESOURCES.mana.name = "Mana"; RESOURCES.rage.name = "Fury"
    LANES.forEach((l, i) => { l.name = `Lane ${i + 1}` })
    for (const p of PRESET_DECKS) if (PRESET_EN[p.id]) Object.assign(p,
        PRESET_EN[p.id])
    Object.assign(STAT_NAMES,
        STAT_EN)
    // tướng, chiêu, nội tại: tên chính thức bản Anh
    for (const h of allHeroes()) {
        const en = LOL_EN.heroes[h.id as keyof typeof LOL_EN.heroes]
        if (!en) continue;
        (CARDS[h.id] as { name: string }).name = en.name;
        (h as { name: string }).name = en.name
        if (h.passive) h.passive.name = en.passive
        for (const [sid,
            name] of Object.entries(en.skills)) if (SKILLS[sid]) SKILLS[sid].name = name
    }
    // mô tả tướng, chiêu, nội tại đồ (TEXT_EN)
    const tx = (k: string) => TEXT_EN[k]
    for (const h of allHeroes()) {
        const card = CARDS[h.id] as unknown as Record<string, string>
        for (const f of ["desc",
            "strength",
            "counter",
            "concept"]) if (tx(`hero.${h.id}.${f}`)) card[f] = tx(`hero.${h.id}.${f}`)
        const adapter = getHero(h.id)
        if (adapter?.passive && tx(`hero.${h.id}.passive_desc`)) adapter.passive.desc = tx(`hero.${h.id}.passive_desc`)
    }
    for (const [id,
        sk] of Object.entries(SKILLS)) {
        if (tx(`skill.${id}.desc`)) sk.desc = tx(`skill.${id}.desc`)
        if (tx(`skill.${id}.formula`)) sk.formula = tx(`skill.${id}.formula`)
        sk.boosts = (sk.boosts ?? []).map((b, i) => { const en = tx(`skill.${id}.boost.${i}`); return en ? `If ${condEn(b.replace(/^Nếu /,
            "").split(":")[0])}: ${en}` : b })
    }
    for (const it of allItems()) it.props.forEach((p, i) => {
        const m = p as unknown as { name: string; desc: string; condition: { desc: string } }
        if (tx(`item.${it.id}.p${i}.name`)) m.name = tx(`item.${it.id}.p${i}.name`)
        if (tx(`item.${it.id}.p${i}.desc`)) m.desc = tx(`item.${it.id}.p${i}.desc`)
        if (tx(`item.${it.id}.p${i}.cond`)) m.condition.desc = tx(`item.${it.id}.p${i}.cond`)
    })
    // đồ (mảnh + huyền thoại) và thẻ đồ huyền thoại
    for (const it of allItems()) {
        const name = LOL_EN.items[it.id as keyof typeof LOL_EN.items]
        if (!name) continue;
        (it as { name: string }).name = name
        for (const card of [CARDS[`leg_${it.id}`],
            CARDS[`cmp_${it.id}`]]) if (card) (card as { name: string }).name = name
        const cmp = CARDS[`cmp_${it.id}`] as { desc: string } | undefined
        if (cmp) cmp.desc = `Equip to 1 allied champion: ${it.props.map((p) => p.desc).filter(Boolean).join(" · ")}.`
    }
    // 32 lá bài trong bộ bài
    for (const [id,
        en] of Object.entries(CARDS_EN)) {
        const card = CARDS[id] as { name: string; desc: string; bonus?: string[]; lol?: string } | undefined
        if (!card) continue
        // nguồn LoL: "Zyra W · Hạt Giống Gai" -> "Zyra W · Rampant Growth", "Phép bổ trợ Hồi Máu" -> "Summoner spell · Heal"
        if (card.lol) card.lol = card.lol.includes(" · ") ? `${card.lol.split(" · ")[0]} · ${en.name}`
            : card.lol.startsWith("Phép bổ trợ") ? `Summoner spell · ${en.name}` : en.name
        card.name = en.name; card.desc = en.desc
        if (en.bonus) card.bonus = en.bonus.map((b) => b)
    }
}

// ================= NHẬT KÝ / LỖI THEO KHÓA =================
// Server gửi "L|khóa|{tham số}"; client dịch theo ngôn ngữ của người xem. Tham số tên được tra theo id:
// hero/heroes = id tướng, card = id lá, item/item2/item3 = id đồ, skill = id chiêu, status, buff, lane, res, label, boost.

/** Tên tiếng Việt -> hàm lấy tên theo ngôn ngữ hiện tại (để dịch nhãn sát thương dạng chữ) */
const VI_NAME = new Map<string, () => string>()
const LABEL_KEY: Record<string, UiKey> = {
    "đánh thường": "label.attack", "đánh trụ": "label.tower", "đánh Nhà": "label.nexus", "phép": "label.magic", "phép lan": "label.splash",
    "Chặn đường": "label.block", "trụ bắn trả": "label.tower_shot", "Đốt": "label.burn", "lướt +20%": "label.dash", "Bắn Tỉa": "label.snipe", "Tay Đôi": "label.duel", "kéo dài trận": "label.overtime", "Kéo dài": "label.overtime", "Lính đẩy đường": "label.lane_push",
}
const label = (v: string) => (current === "vi" ? v : LABEL_KEY[v] ? t(LABEL_KEY[v]) : VI_NAME.get(v)?.() ?? v)

export const encodeMsg = (key: UiKey, params: Record<string, string | number> = {
}) => `L|${key}|${JSON.stringify(params)}`

const MONSTER_EN: Record<string, string> = {
    red: "Red Brambleback", wolves: "Murk Wolves", baron: "Baron Nashor", raptors: "Crimson Raptors", blue: "Blue Sentinel"
}
const MONSTER_VI: Record<string, string> = {
    red: "Bùa Đỏ", wolves: "Bầy Sói", baron: "Baron Nashor", raptors: "Chim Đỏ", blue: "Bùa Xanh"
}
/** Tên quái rừng theo ngôn ngữ */
export const monsterName = (id: string) => (current === "en" ? MONSTER_EN : MONSTER_VI)[id] ?? id

export function formatMsg(line: string): string {
    if (!line.startsWith("L|")) return line
    const cut = line.indexOf("|",
        2)
    const key = line.slice(2,
        cut) as UiKey
    let p: Record<string, string | number> = {
    }
    try { p = JSON.parse(line.slice(cut + 1)) } catch { /* bỏ qua */ }
    const v: Record<string, string | number> = {
        ...p
    }
    const name = (id: unknown) => CARDS[String(id)]?.name ?? String(id)
    if (p.hero !== undefined) v.hero = name(p.hero)
    if (p.src !== undefined) v.src = name(p.src)
    if (p.heroes !== undefined) v.heroes = String(p.heroes).split(",").map(name).join(", ")
    if (p.card !== undefined) v.card = name(p.card)
    for (const k of ["item",
        "item2",
        "item3"]) if (p[k] !== undefined) v[k] = getItem(String(p[k]))?.name ?? String(p[k])
    if (p.skill !== undefined) v.skill = SKILLS[String(p.skill)]?.name ?? String(p.skill)
    if (p.monster !== undefined) v.monster = monsterName(String(p.monster))
    if (p.status !== undefined) v.status = STATUS_INFO[p.status as StatusId]?.name ?? String(p.status)
    if (p.buff !== undefined) v.buff = getBuff(String(p.buff))?.name ?? String(p.buff)
    if (p.lane !== undefined) v.lane = LANES[Number(p.lane)]?.name ?? String(p.lane)
    if (p.res !== undefined) v.res = RESOURCES[p.res as "mana" | "rage"]?.name ?? String(p.res)
    if (p.label !== undefined) v.label = label(String(p.label))
    if (p.boost !== undefined && p.card !== undefined) {
        const c = CARDS[String(p.card)] as { bonus?: string[] } | undefined
        v.boost = c?.bonus?.[Number(p.boost)] ?? ""
    }
    return t(key,
        v)
}

export type { UiKey }
