// Đo sức mạnh từng món đồ bằng chính engine của game (không cần server).
// Tấn công: sát thương trung bình/lượt so với không đồ. Phòng thủ: máu hiệu dụng (EHP) so với không đồ.
// Chạy: npx tsx scripts/balance.ts [--csv]
import {
    CARDS, HeroCard, SKILLS, UnitLike, allItems, armorOf, attackTargets, baseStats, computeAttack, computeSkill,
    damageTakenMult, getItem, itemDamageTaken, mrOf, runHook, statsOf, type Effect,
} from "@starci/shared"

const TRIALS = 300
let seq = 0

function unit(owner: string, defId: string, lane: number, row: "front" | "back", items: string[] = [], level = 3, hpPct = 1, stacks: Record<string, number> = {
}): UnitLike {
    const hero = CARDS[defId] as HeroCard
    const maxHp = hero.hp[level - 1] + items.reduce((s, id) => s + (baseStats(getItem(id)!).hp ?? 0),
        0)
    return {
        id: `u${++seq}`, owner, defId, lane, row, level, xp: 0, hp: Math.round(maxHp * hpPct), maxHp, shield: 0, atkBonus: 0,
        attacked: false, castThisTurn: false, empowered: false, hidden: false, summonedTurn: 0, markedTargetId: "",
        cooldowns: new Map(), statuses: new Map(), stacks: new Map(Object.entries(stacks)), items,
    } as unknown as UnitLike
}
const stateOf = (units: UnitLike[]) => ({
    turn: 9, activeSide: "A", units: new Map(units.map((u) => [u.id,
        u]))
})

/** Mức cộng dồn giữa trận của đồ tích luỹ: chỉ áp khi đang đeo đúng món đó */
const ITEM_STACKS: Record<string, Record<string, number>> = {
    cuong_dao: {
        cuong_dao: 5
    }, y_chi_titan: {
        titan: 12
    }, kiem_tu_than: {
        "bonus:atk": 10
    },
    truong_truong_sinh: {
        "bonus:spellAmp": 20
    }, nanh_nashor: {
        "t:nashor": 1
    }, tam_hop_kiem: {
        "t:spellblade": 1
    },
}
const stacksFor = (items: string[]) => Object.assign({
},
...items.map((id) => ITEM_STACKS[id] ?? {
}))
/** Giá trị tiện ích engine không đo được bằng sát thương/EHP (vàng, miễn khống chế, phản đòn, buff đồng đội) */
const UTIL: Record<string, number> = {
    gang_dao_tac: 0.3, khan_giai_thuat: 0.15, ao_choang_gai: 0.12, tim_bang: 0.1, day_chuyen_chuoc_toi: 0.15,
    loi_the_ho_ve: 0.1, mu_thich_nghi: 0.08, quy_thu: 0.15, ao_choang_lua: 0.05, loi_nhac_tu_vong: 0.05,
}
/** Mỗi mana giảm cho chiêu ≈ 10% giá trị (đánh thêm được bài/chiêu) */
const MANA_VALUE = 0.1

/** Sát thương trung bình mỗi lượt của `defId` khi đeo `items`, lên đội hình địch mẫu */
function offense(defId: string, items: string[], targetHp: number, selfHp = 1) {
    const hero = CARDS[defId] as HeroCard
    const row = ["marksman",
        "mage"].includes(hero.role) ? "back" : "front"
    let total = 0
    for (let t = 0; t < TRIALS; t++) {
        const me = unit("A",
            defId,
            0,
            row,
            items,
            3,
            selfHp,
            stacksFor(items))
        const tank = unit("B",
            "braum",
            0,
            "front",
            [],
            3,
            targetHp)
        const carry = unit("B",
            "ashe",
            0,
            "back",
            [],
            3,
            targetHp)
        const side = unit("B",
            "lux",
            1,
            "front",
            [],
            3,
            targetHp)
        const st = stateOf([me,
            tank,
            carry,
            side])
        const enemyDmg = (fx: Effect[]) => {
            // đốt: server lấy mức cao nhất trên mỗi mục tiêu, không cộng dồn
            const burns = new Map<string, number>()
            for (const f of fx) if (f.type === "burn") burns.set(f.unitId,
                Math.max(burns.get(f.unitId) ?? 0,
                    f.amount * f.turns * 0.8))
            return [...burns.values()].reduce((a, v) => a + v,
                0) + fx.reduce((s, f) => {
                if (f.type !== "damage") return s
                if (f.target.kind === "tower") return s + f.amount * 0.5
                const u = st.units.get(f.target.id)
                return u && u.owner === "B" ? s + f.amount * damageTakenMult(u) : s
            },
            0)
        }
        // đòn đánh: chọn mục tiêu gây nhiều sát thương nhất trong các mục tiêu hợp lệ
        const targets = attackTargets(st,
            me)
        const best = Math.max(0,
            ...targets.map((tg) => enemyDmg(computeAttack(st,
                me,
                tg,
                true))))
        const extra = statsOf(me,
            st).extraAtk
        let dmg = best * (1 + extra)
        // chiêu gây sát thương đầu tiên đã mở: chia theo hồi chiêu
        for (const id of hero.skills) {
            const sk = SKILLS[id]
            if (sk.unlock > 3) continue
            const tgt = sk.target === "none" ? undefined : sk.target === "enemyAny" ? carry.id : me.id
            const d = enemyDmg(computeSkill(st,
                me,
                id,
                tgt,
                true))
            if (d > 0) { dmg += d / Math.max(1,
                sk.cooldown); break }
        }
        // hook đầu lượt (đốt quanh lane...)
        dmg += enemyDmg(runHook(me,
            "onTurnStart",
            {
                state: st, preview: false
            }))
        total += dmg
    }
    return total / TRIALS
}

/** Máu hiệu dụng của `defId` đeo `items`: máu / tỉ lệ sát thương nhận (50% vật lý, 50% phép) + khiên/hồi sinh/hồi máu */
function defense(defId: string, items: string[]) {
    let sum = 0
    for (const hpPct of [1,
        0.6,
        0.35]) {
        const me = unit("B",
            defId,
            0,
            "front",
            items,
            3,
            hpPct,
            stacksFor(items))
        const foe = unit("A",
            "katarina",
            0,
            "front")
        const st = stateOf([me,
            foe])
        const taken = itemDamageTaken(me,
            {
                state: st, source: foe, isAttack: true, preview: false
            }) * damageTakenMult(me)
        const frac = taken * (0.5 * (1 - armorOf(me)) + 0.5 * (1 - mrOf(me)))
        let ehp = me.maxHp / Math.max(0.05,
            frac)
        const extras = [
            ...runHook(me,
                "onEquip",
                {
                    state: st, preview: false
                }),
            ...runHook(me,
                "onDamaged",
                {
                    state: st, source: foe, isAttack: true, amount: 100, preview: false
                }),
            ...runHook(me,
                "preventDeath",
                {
                    state: st, preview: false
                }),
            ...[0,
                1,
                2].flatMap(() => runHook(me,
                "onTurnStart",
                {
                    state: st, preview: false
                })),
        ]
        for (const f of extras) {
            if (f.type === "shield" && f.unitId === me.id) ehp += f.amount / Math.max(0.05,
                frac)
            if (f.type === "heal" && f.unitId === me.id) ehp += f.amount / Math.max(0.05,
                frac) / (f.amount >= 300 ? 1 : 1.5)
            if (f.type === "maxhp" && f.unitId === me.id) ehp += f.amount / Math.max(0.05,
                frac)
            if (f.type === "status" && f.unitId === me.id && f.status === "invuln") ehp += 300 / Math.max(0.05,
                frac)
        }
        sum += ehp
    }
    return sum / 3
}

const HEROES = ["kogmaw",
    "katarina",
    "lux",
    "aatrox"]
const TANK = "braum"
const base = Object.fromEntries(HEROES.map((h) => [h,
    (offense(h,
        [],
        1) + offense(h,
        [],
        0.6) + offense(h,
        [],
        0.25)) / 3]))
const baseDef = defense(TANK,
    [])

type Row = { id: string; name: string; off: number; bestHero: string; def: number; util: number; score: number };
const rows: Row[] = []
for (const it of allItems().filter((i) => i.tier === "legendary")) {
    let off = 0, bestHero = ""
    for (const h of HEROES) {
        const v = (offense(h,
            [it.id],
            1) + offense(h,
            [it.id],
            0.6) + offense(h,
            [it.id],
            0.25)) / 3 / base[h] - 1
        if (v > off) { off = v; bestHero = h }
    }
    const def = defense(TANK,
        [it.id]) / baseDef - 1
    const util = (UTIL[it.id] ?? 0) + baseStats(it).manaDiscount * MANA_VALUE
    rows.push({
        id: it.id, name: it.name, off, bestHero, def, util, score: Math.max(off,
            def) + 0.35 * Math.min(off,
            def) + util
    })
}
rows.sort((a, b) => b.score - a.score)
const pct = (v: number) => `${v >= 0 ? "+" : ""}${Math.round(v * 100)}%`.padStart(6)
const LOW = 0.35, HIGH = 0.85
if (process.argv.includes("--csv")) {
    console.log("id,name,off,bestHero,def,util,score")
    for (const r of rows) console.log([r.id,
        r.name,
        r.off.toFixed(3),
        r.bestHero,
        r.def.toFixed(3),
        r.util.toFixed(3),
        r.score.toFixed(3)].join(","))
} else {
    console.log("Món".padEnd(24),
        "Tấn công".padStart(8),
        "(tướng)".padEnd(10),
        "Phòng thủ".padStart(9),
        "Tiện ích".padStart(9),
        "Điểm".padStart(7),
        " Đánh giá")
    for (const r of rows) {
        const tag = r.score > HIGH ? "QUÁ MẠNH" : r.score < LOW ? "yếu" : "ổn"
        console.log(r.name.padEnd(24),
            pct(r.off).padStart(8),
            r.bestHero.padEnd(10),
            pct(r.def).padStart(9),
            pct(r.util).padStart(9),
            pct(r.score).padStart(7),
            " " + tag)
    }
    const s = rows.map((r) => r.score)
    console.log(`\nKhung cân bằng: ${pct(LOW)}..${pct(HIGH)} · trung bình ${pct(s.reduce((a, b) => a + b,
        0) / s.length)} · lệch nhất ${pct(Math.max(...s) - Math.min(...s))}`)
}
