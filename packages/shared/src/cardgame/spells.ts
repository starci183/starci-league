// Phép bổ trợ (summoner spell) dạng thẻ hỗ trợ: id lá "spell_<phép>" (vd "spell_heal"), dùng trong lượt mình, dùng xong biến mất.
// Bộ gốc người chơi xếp bằng mã "spell:<phép>" (deck.ts).
import {
    pct
} from "./formula"
import type {
    SpellId
} from "./deck"
import type {
    Game
} from "./game"
import {
    otherSide, type PlayArgs, type Side, type Unit
} from "./types"

export const SPELL_NUM = {
    heal: {
        base: 100, pctMax: 0.1
    },
    ignite: {
        perTurn: 40, turns: 2
    },
    exhaust: {
        cut: 0.4
    },
    barrier: {
        base: 80, pctMax: 0.1
    },
    smite: {
        token: 150, champion: 0
    },
    teleport: {
        hpPct: 0.5
    },
}
/** Trạng thái khống chế/xấu mà Thanh Tẩy gỡ */
export const CLEANSE_IDS = ["stun",
    "silence",
    "chill",
    "shred",
    "blind",
    "ignite",
    "grievous",
    "exhaust",
    "bleed",
    "burn",
    "charm",
    "berserk"]

export const SPELL_VI: Record<SpellId, { name: string; desc: string }> = {
    heal: {
        name: "Hồi Máu", desc: `1 tướng mình hồi {${SPELL_NUM.heal.base}} + ${pct(SPELL_NUM.heal.pctMax)}% máu tối đa của nó.`
    },
    flash: {
        name: "Tốc Biến", desc: "1 tướng mình đổi đường với 1 tướng mình khác đang trên sân (không dời vào đường trống hay đường chưa mở)."
    },
    ignite: {
        name: "Thiêu Đốt", desc: `1 tướng địch bị Thiêu Đốt ${SPELL_NUM.ignite.turns} lượt: đầu mỗi lượt của nó mất ${SPELL_NUM.ignite.perTurn} máu (sát thương chuẩn), kèm Vết Thương Sâu (hồi máu và Khiên nhận vào giảm 50%) cùng thời hạn.`
    },
    exhaust: {
        name: "Kiệt Sức", desc: `1 tướng địch gây ít hơn ${pct(SPELL_NUM.exhaust.cut)}% sát thương tới hết lượt kế tiếp của nó.`
    },
    barrier: {
        name: "Lá Chắn", desc: `1 tướng mình nhận Khiên {${SPELL_NUM.barrier.base}} + ${pct(SPELL_NUM.barrier.pctMax)}% máu tối đa của nó.`
    },
    cleanse: {
        name: "Thanh Tẩy", desc: "Gỡ mọi hiệu ứng khống chế và hiệu ứng xấu (Choáng, Câm Lặng, Buốt, Rã giáp, Mù, Thiêu Đốt, Vết Thương Sâu, Kiệt Sức, Chảy Máu, Bỏng...) khỏi 1 tướng mình."
    },
    smite: {
        name: "Trừng Phạt", desc: `Gây ${SPELL_NUM.smite.token} sát thương chuẩn lên vật triệu hồi ở ô triệu hồi phụ của đối thủ (cách để tướng không phải xạ thủ trả lời token).`
    },
    teleport: {
        name: "Dịch Chuyển", desc: `1 tướng mình đang chờ hồi sinh quay lại sân ngay vào một đường đang mở còn trống, với ${pct(SPELL_NUM.teleport.hpPct)}% máu.`
    },
}

export const spellOf = (cardId: string): SpellId | undefined => (cardId.startsWith("spell_") ? cardId.slice(6) as SpellId : undefined)

/** Các lựa chọn hợp lệ để đánh phép (rỗng = không đánh được) */
export function spellOptions(g: Game, side: Side, spell: SpellId): PlayArgs[] {
    const allies = g.heroes(side)
    const foes = g.heroes(otherSide(side))
    switch (spell) {
    case "heal": return allies.filter((u) => u.hp < u.maxHp).map((u) => ({
        target: u.id
    }))
    case "barrier": return allies.map((u) => ({
        target: u.id
    }))
    case "cleanse": return allies.filter((u) => CLEANSE_IDS.some((id) => g.has(u,
        id))).map((u) => ({
        target: u.id
    }))
    // chủ 30/10: Tốc Biến = đổi đường với 1 đồng minh khác đang trên sân (lane = đường của đồng minh đó); không dời vào đường trống/chưa mở
    case "flash": return allies.flatMap((u) => allies.filter((v) => v.id !== u.id).map((v) => ({
        target: u.id, lane: v.lane
    })))
    case "ignite": return foes.filter((u) => !g.has(u,
        "stealth")).map((u) => ({
        target: u.id
    }))
    case "exhaust": return foes.filter((u) => !g.has(u,
        "stealth")).map((u) => ({
        target: u.id
    }))
    case "smite": { const t = g.tokenOf(otherSide(side)); return t ? [{
        target: t.id
    }] : [] }
    case "teleport": {
        // tướng chết giữ đường của nó: Dịch Chuyển hồi sinh nó ngay tại đường đó
        return Object.values(g.s.units).filter((u) => u.side === side && u.status === "dead" && !u.token && u.homeLane >= 0).map((u) => ({
            target: u.id, lane: u.homeLane
        }))
    }
    }
}

/** Giải quyết một phép bổ trợ */
export function resolveSpell(g: Game, side: Side, spell: SpellId, args: PlayArgs) {
    const t: Unit | undefined = g.unit(args.target)
    if (!t) return
    switch (spell) {
    case "heal": g.heal(undefined,
        t,
        SPELL_NUM.heal.base + SPELL_NUM.heal.pctMax * t.maxHp); break
    case "barrier": g.shield(undefined,
        t,
        SPELL_NUM.barrier.base + SPELL_NUM.barrier.pctMax * t.maxHp); break
    case "cleanse": for (const id of CLEANSE_IDS) g.removeStatus(t,
        id); break
    case "flash": {
        const mate = args.lane !== undefined ? g.at(side,
            args.lane) : undefined
        if (mate && mate.id !== t.id && !mate.token) g.swapWith(t,
            mate)
        break
    }
    case "ignite": g.status(t,
        "ignite",
        SPELL_NUM.ignite.turns,
        {
            v: SPELL_NUM.ignite.perTurn, visuals: ["burn"]
        }); g.status(t,
            "grievous",
            SPELL_NUM.ignite.turns); break
    case "exhaust": g.status(t,
        "exhaust",
        1); break
    case "smite": if (t.token) g.damage(undefined,
        t,
        SPELL_NUM.smite.token,
        "true",
        {
            tag: "effect"
        }); break
    case "teleport": {
        if (t.status !== "dead" || args.lane === undefined || args.lane !== t.homeLane || g.s.lanes[side][args.lane] !== t.id) break
        t.lane = args.lane; t.status = "board"
        t.hp = Math.round(t.maxHp * SPELL_NUM.teleport.hpPct); g.clearShields(t)
        g.emit({
            t: "respawn", unit: t.id, lane: args.lane
        })
        g.hook("onRespawn",
            {
                unit: t
            })
        break
    }
    }
}
