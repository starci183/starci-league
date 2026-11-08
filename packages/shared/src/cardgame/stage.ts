// Dựng thế cờ có sẵn để quay demo và tái hiện lỗi: đặt tướng, tay bài, Máu, bộ đếm rồi vào thẳng Main 1. Chỉ server bật CARD_RIG=1 mới dùng.
import {
    Game
} from "./game"
import type {
    GameState, Side, Unit
} from "./types"

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
}

const unitOf = (s: GameState, hero: string): Unit => {
    const u = Object.values(s.units).find((x) => x.hero === hero && !x.token)
    if (!u) throw new Error(`Thế cờ cần tướng ${hero}`)
    return u
}

export function applyStage(s: GameState, stage: Stage) {
    const g = new Game(s)
    s.round = stage.round ?? 19
    s.blind = undefined
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
        for (const id of ids) {
            const i = p.deck.findIndex((c) => c.id === id)
            p.hand.push(i >= 0 ? p.deck.splice(i,
                1)[0] : g.supportCard(id as never))
        }
    }
    for (const [hero,
        hp] of Object.entries(stage.hp ?? {
        })) unitOf(s,
        hero).hp = hp
    for (const [hero,
        stacks] of Object.entries(stage.stacks ?? {
        })) Object.assign(unitOf(s,
        hero).stacks,
    stacks)
    s.phase = "main"
    s.step = "main1"
    s.active = unitOf(s,
        stage.first).side
    s.opened = {
        A: true, B: true
    }
    s.firstTurnDone = {
        A: true, B: true
    }
    s.teamMana = {
        A: 200, B: 200
    }
}
