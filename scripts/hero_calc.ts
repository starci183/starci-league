// Bảng số của 1 tướng theo từng bộ đồ: chỉ số, đánh thường, chiêu lên tank chuẩn và lên pháp sư chuẩn.
// Tính bằng chính engine (computeAttack/computeSkill), lấy kỳ vọng chí mạng và tốc đánh.
// Chạy: npx tsx scripts/hero_calc.ts kogmaw "cuong_dao,diet_khong_lo,nanh_nashor" "mu_rabadon,quy_thu,bua_lam"
import {
    CARDS, HeroCard, UnitLike, apOf, atkOf, baseStats, computeAttack, computeSkill, getItem, itemDamageTaken, statsOf,
} from "@starci/shared"

const [defId = "kogmaw",
    ...builds] = process.argv.slice(2)
const hero = CARDS[defId] as HeroCard
let seq = 0

/** Bia đỡ đòn theo khung chỉ số mới (không đọc từ tướng thật để số không đổi khi tướng khác bị chỉnh) */
const DUMMIES: Record<string, { hp: number; armor: number; mr: number; role: string; items: string[] }> = {
    tank: {
        hp: 960, armor: 40, mr: 35, role: "tank", items: ["ao_choang_gai",
            "giap_gargoyle",
            "giap_warmog"]
    },
    mage: {
        hp: 720, armor: 25, mr: 25, role: "mage", items: ["mu_rabadon",
            "quy_thu",
            "mat_na_liandry"]
    },
}
for (const [k,
    d] of Object.entries(DUMMIES))
    (CARDS as Record<string, unknown>)[`dummy_${k}`] = {
        ...CARDS[k === "tank" ? "braum" : "lux"], id: `dummy_${k}`, hp: d.hp, armor: d.armor, mr: d.mr, role: d.role, skills: []
    }

function unit(owner: string, id: string, lane: number, row: string, items: string[] = [], stacks: Record<string, number> = {
}, statuses: Record<string, number> = {
}): UnitLike {
    const h = CARDS[id] as HeroCard
    const maxHp = h.hp + items.reduce((s, it) => s + (baseStats(getItem(it)!).hp ?? 0),
        0)
    return {
        id: `u${++seq}`, owner, defId: id, lane, row, hp: maxHp, maxHp, shield: 0, atkBonus: 0, mana: 999, status: "board",
        readyTurn: 0, attacked: false, castThisTurn: false, empowered: false, hidden: false, summonedTurn: 0, markedTargetId: "",
        cooldowns: new Map(), statuses: new Map(Object.entries(statuses)), stacks: new Map(Object.entries(stacks)), items,
    } as unknown as UnitLike
}

const ITEM_STACKS: Record<string, Record<string, number>> = {
    cuong_dao: {
        cuong_dao: 5
    }, nanh_nashor: {
        "t:nashor": 1
    }, truong_truong_sinh: {
        "bonus:spellAmp": 20
    }
}
const dmgOn = (fx: ReturnType<typeof computeAttack>, t: UnitLike) =>
    fx.reduce((s, f) => (f.type === "damage" && f.target.kind === "unit" && f.target.id === t.id ? s + f.amount : s),
        0)

function row(build: string, kog = 0) {
    const items = build ? build.split(",") : []
    const stacks = Object.assign({
        kog
    },
    ...items.map((i) => ITEM_STACKS[i] ?? {
    }))
    const me = unit("A",
        defId,
        2,
        "back",
        items,
        stacks)
    const st = statsOf(me)
    const critMult = 1 + st.crit * (0.5 + st.critDmg)
    const hits = 1 + st.extraAtk
    const out: Record<string, string | number> = {
        "Bộ đồ": items.length ? items.join(" + ") : "(không đồ)", "Kog stack": kog,
        AD: atkOf(me), AP: apOf(me), "Đòn/lượt": hits.toFixed(2), "Chí mạng": `${Math.round(st.crit * 100)}%`, Máu: me.maxHp,
    }
    for (const k of Object.keys(DUMMIES)) {
    // địch cùng số đồ với mình (đồ đúng vai trò của nó)
        const t = unit("B",
            `dummy_${k}`,
            2,
            "front",
            DUMMIES[k].items.slice(0,
                items.length))
        const taken = itemDamageTaken(t,
{
    state: undefined as never, isAttack: true, preview: true
} as never)
        const pct = (n: number) => `${Math.round((n * taken / t.maxHp) * 100)}%`
        const state = {
            turn: 9, activeSide: "A", units: new Map([[me.id,
                me],
            [t.id,
                t]])
        }
        const atk = dmgOn(computeAttack(state,
            me,
            {
                kind: "unit", id: t.id
            }),
        t) * critMult * hits
        me.statuses = new Map([["barrage",
            2]]) as never
        const atkW = dmgOn(computeAttack(state,
            me,
            {
                kind: "unit", id: t.id
            }),
        t) * critMult * hits
        me.statuses = new Map() as never
        out[`Đánh/lượt→${k}`] = pct(atk)
        out[`W bật/lượt→${k}`] = pct(atkW)
        for (const s of hero.skills) {
            const key = s.split("_").pop()!.toUpperCase()
            if (key === "W") continue
            out[`${key}→${k}`] = pct(dmgOn(computeSkill(state,
                me,
                s,
                t.id),
            t))
        }
    }
    return out
}

const rows = ["",
    ...builds].flatMap((b) => [row(b,
    0),
row(b,
    10)])
console.table(rows)
