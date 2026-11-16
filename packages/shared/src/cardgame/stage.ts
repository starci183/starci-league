// Dựng thế cờ có sẵn để quay demo và tái hiện lỗi: đặt tướng, tay bài, Máu, bộ đếm rồi vào thẳng Main 1. Server chỉ dùng khi bật CARD_RIG=1;
// màn Hướng dẫn của client Cocos dùng để dựng tình huống chuẩn cho từng chiêu (mộ bài, đỉnh bộ, mana đội, trạng thái, Lính, Dao...).
import {
    Game
} from "./game"
import {
    getHero
} from "./registry"
import type {
    Card, GameState, Side, SkillKey, TurnStep, Unit
} from "./types"

/** Lá đặt vào thế cờ: id lá (lấy từ bộ của phe đó nếu có, "<tướng>_<q|e|r>" tạo lá chiêu, còn lại là thẻ hỗ trợ) hoặc lá dựng sẵn */
export type StageCard = string | Omit<Card, "uid">

export interface Stage {
    /** Tướng ra sân: id tướng -> đường */
    board: Record<string, number>
    /** Tay bài theo phe của tướng được ghi: id tướng -> các id lá */
    hands: Record<string, string[]>
    /** Tướng có phe đi trước */
    first: string
    /** Máu đặt tay: id tướng -> số Máu */
    hp?: Record<string, number>
    /** Bộ đếm đặt tay: id tướng -> { khoá: số } */
    stacks?: Record<string, Record<string, number>>
    /** Chế độ ra sân: Jinx, Jayce */
    modes?: Record<string, string>
    round?: number
    // ---- tuỳ chọn thêm (màn Hướng dẫn) ----
    /** Bước của lượt khi vào thế cờ (mặc định main1): "battle" để đánh thường ngay, "standby" cho nút đổi dạng */
    step?: Extract<TurnStep, "standby" | "main1" | "battle" | "main2">
    /** Máu theo tỉ lệ Máu tối đa (0..1), áp sau đồ: id tướng -> tỉ lệ */
    hpPct?: Record<string, number>
    /** Đồ đeo sẵn: id tướng -> id món (đeo qua g.equip, Máu tối đa cộng theo đồ) */
    items?: Record<string, string[]>
    /** Trạng thái có thời hạn: id tướng -> { id trạng thái: { turns (lượt của chủ, mặc định 2), v (mặc định 1) } } */
    statuses?: Record<string, Record<string, { turns?: number; v?: number }>>
    /** Khiên trắng: id tướng -> lượng */
    shield?: Record<string, number>
    /** Mộ bài của phe tướng được ghi: id tướng -> các lá */
    grave?: Record<string, StageCard[]>
    /** Lá đặt lên đỉnh bộ của phe tướng được ghi, phần tử đầu là lá trên cùng (vd Nấm Teemo trong bộ địch) */
    deckTop?: Record<string, StageCard[]>
    /** Mana đội (mặc định 200 mỗi bên) */
    teamMana?: Partial<Record<Side, number>>
    /** Chồng hiệu ứng theo ô: phe -> đường -> { khoá: số } (Lính Cát của Azir) */
    laneStacks?: Partial<Record<Side, Record<number, Record<string, number>>>>
    /** Dấu trên đường: phe -> đường -> các id dấu (Dao của Katarina) */
    markers?: Partial<Record<Side, Record<number, string[]>>>
    /** Nguyên Tố 5 đường (Qiyana), đặt trước khi gọi tướng để tướng hấp thụ đúng */
    laneElements?: string[]
    /** Lá trên tay phe kia bị Hoá Băng: id tướng đóng băng -> các id lá trên tay đối thủ của nó */
    frozen?: Record<string, string[]>
}

const unitOf = (s: GameState, hero: string): Unit => {
    const u = Object.values(s.units).find((x) => x.hero === hero && !x.token)
    if (!u) throw new Error(`Thế cờ cần tướng ${hero}`)
    return u
}

/** Lấy lá cho thế cờ: ưu tiên rút khỏi bộ của `side` (giữ đúng số lá), không có thì tạo mới */
function stageCard(g: Game, side: Side, c: StageCard): Card {
    if (typeof c !== "string") return g.newCard(c)
    const deck = g.s.players[side].deck
    const i = deck.findIndex((x) => x.id === c)
    if (i >= 0) return deck.splice(i,
        1)[0]
    const m = /^([a-z]+)_([qer])$/.exec(c)
    if (m && getHero(m[1])) return g.skillCard(m[1],
        side,
        m[2].toUpperCase() as SkillKey)
    return g.supportCard(c)
}

export function applyStage(s: GameState, stage: Stage) {
    const g = new Game(s)
    s.round = stage.round ?? 19
    s.blind = undefined
    if (stage.laneElements) s.laneElements = [...stage.laneElements]
    for (const [hero,
        lane] of Object.entries(stage.board)) g.summon(unitOf(s,
        hero).side,
    hero,
    lane,
    stage.modes?.[hero])
    s.players.A.hand = []
    s.players.B.hand = []
    for (const [hero,
        ids] of Object.entries(stage.hands)) {
        const side: Side = unitOf(s,
            hero).side
        const p = s.players[side]
        for (const id of ids) p.hand.push(stageCard(g,
            side,
            id))
    }
    for (const [hero,
        items] of Object.entries(stage.items ?? {
        })) for (const item of items) g.equip(unitOf(s,
        hero),
    item)
    for (const [hero,
        hp] of Object.entries(stage.hp ?? {
        })) unitOf(s,
        hero).hp = hp
    for (const [hero,
        pct] of Object.entries(stage.hpPct ?? {
        })) { const u = unitOf(s,
        hero); u.hp = Math.max(1,
        Math.round(u.maxHp * pct)) }
    for (const [hero,
        stacks] of Object.entries(stage.stacks ?? {
        })) Object.assign(unitOf(s,
        hero).stacks,
    stacks)
    for (const [hero,
        n] of Object.entries(stage.shield ?? {
        })) unitOf(s,
        hero).shield = n
    for (const [hero,
        cards] of Object.entries(stage.grave ?? {
        })) { const side = unitOf(s,
        hero).side; for (const c of cards) s.players[side].grave.push(stageCard(g,
        side,
        c)) }
    for (const [hero,
        cards] of Object.entries(stage.deckTop ?? {
        })) { const side = unitOf(s,
        hero).side; s.players[side].deck.unshift(...cards.map((c) => stageCard(g,
        side,
        c))) }
    for (const side of ["A",
        "B"] as Side[]) {
        for (const [lane,
            stacks] of Object.entries(stage.laneStacks?.[side] ?? {
            })) for (const [key,
            v] of Object.entries(stacks)) g.setLaneStack(side,
            Number(lane),
            key,
            v)
        for (const [lane,
            ids] of Object.entries(stage.markers?.[side] ?? {
            })) for (const id of ids) g.addMarker(side,
            Number(lane),
            id)
    }
    s.phase = "main"
    s.step = stage.step ?? "main1"
    s.active = unitOf(s,
        stage.first).side
    s.opened = {
        A: true, B: true
    }
    s.firstTurnDone = {
        A: true, B: true
    }
    s.teamMana = {
        A: stage.teamMana?.A ?? 200, B: stage.teamMana?.B ?? 200
    }
    // trạng thái và lá băng tính hạn theo phe đang có lượt nên đặt sau cùng
    for (const [hero,
        sts] of Object.entries(stage.statuses ?? {
        })) {
        const u = unitOf(s,
            hero)
        for (const [id,
            o] of Object.entries(sts)) u.statuses[id] = {
            until: g.turnsUntil(u.side,
                o.turns ?? 2), v: o.v ?? 1, at: s.turnNo
        }
    }
    for (const [hero,
        ids] of Object.entries(stage.frozen ?? {
        })) {
        const by = unitOf(s,
            hero)
        const hand = s.players[by.side === "A" ? "B" : "A"].hand
        for (const id of ids) {
            const c = hand.find((x) => x.id === id && !x.frozen)
            if (c) { c.frozen = by.id; c.frozenUntil = g.turnsUntil(by.side,
                2) }
        }
    }
}
