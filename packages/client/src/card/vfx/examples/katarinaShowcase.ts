// Demo VFX đủ bộ chiêu Katarina theo đặc tả mới, phát trên vị trí tướng thật của bàn 5 tướng. Chỉ là hình ảnh: không gọi engine, không đổi trạng thái trận.
// Demo chỉ là nơi xem: tên hiệu ứng lấy từ heroMap. Dao là vật thật nằm trên đường tới khi nhặt; dịch chuyển là lá Katarina biến mất rồi hiện ra, đồng minh chạy sang chỗ trống, rồi chốt vào bản dựng riêng của demo.
import type {
    cg
} from "@starci/shared"
import {
    flushSync
} from "react-dom"
import {
    laneRect, ptOf, pulse, unitEl, unitPt, unitRect, type Pt
} from "../../anim/helpers"
import {
    applyToDisplay, getCard, receiveCardState
} from "../../store"
import {
    playVfx
} from "../VfxCanvas"
import {
    KATARINA_BLINK_MS
} from "../fx_katarina"
import {
    heroBasicVfx, skillVfx
} from "../heroMap"
import {
    sleep
} from "../particles"
import {
    movementTracks
} from "../sequence"
import {
    basicAttack, strike
} from "./renataShowcase"
import {
    closeHits, landDamage, openHits
} from "./showcaseHits"

const Q = skillVfx("katarina",
    "q")
const E = skillVfx("katarina",
    "e")
const R = skillVfx("katarina",
    "r")
const P = skillVfx("katarina",
    "p")
const TONE = {
    color: Q.color, color2: Q.color2
}
const LOTUS = {
    color: R.color, color2: R.color2, intensity: R.intensity
}
const KAT = "A:katarina"
const ANNIE = "B:annie"
const GAREN = "B:garen"
/** Bản nặng nhất cho tướng đối diện, bản nhẹ cho hai tướng kề */
const FRONT_POWER = 3
const SIDE_POWER = .7
/** Lá Katarina đi bộ vào đường có Dao, cùng nhịp đổi chỗ thường */
const WALK_MS = 620
/** VFX bị cắt ở 15s nên Dao cắm lâu được nối bằng lần phát mới */
const REST_RELAY_MS = 12000
const P_DAMAGE = 46
const Q_DAMAGE = 72
const E_DAMAGE = 64
const R_FRONT = 150
const R_SIDE = 74
/** Hai số nổi trên cùng tướng hiện cùng vị trí: lệch chừng này mới đọc được cả hai */
const SECOND_NUMBER_MS = 240

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

export async function runKatarinaShowcase(say: (text: string) => void) {
    const game = window.starciExamples
    if (!game) return
    openHits()
    const run = new Run(game,
        say)
    try {
        await run.play()
    } finally {
        run.stop()
        closeHits()
        game.showState(game.state)
    }
}

class Run {
    /** Bản dựng riêng của demo: engine không biết các lần đổi chỗ, chỉ store nhìn thấy */
    private staged: cg.GameState
    private rests = new Map<number, () => void>()

    constructor(private game: NonNullable<Window["starciExamples"]>, private say: (text: string) => void) {
        this.staged = copy(game.state)
    }

    stop() {
        for (const end of this.rests.values()) end()
        this.rests.clear()
    }

    private view() {
        const view = getCard().view
        if (!view) throw new Error("Demo Katarina: bàn chưa sẵn sàng")
        return view
    }

    private lane() {
        return this.view().units[KAT].lane
    }

    private foeAt(lane: number) {
        const foe = this.view().lanes.B[lane]
        if (!foe) throw new Error("Demo Katarina: không có tướng đối diện")
        return foe
    }

    /** Mũi Dao cắm ngay mép trên ô của đường đó */
    private tipOf(lane: number): Pt {
        const rect = laneRect(KAT,
            lane,
            "A")
        if (!rect) throw new Error("Demo Katarina: không thấy đường")
        return {
            x: rect.left + rect.width / 2, y: rect.top - 4
        }
    }

    /** Dao rơi: đầu lượt rơi từ trời, Q thì bật lên từ mục tiêu. Mũi Dao chạm đất là Dao nằm lại trên đường */
    private fall(lane: number, source?: Pt) {
        const tip = this.tipOf(lane)
        return new Promise<void>((resolve) => {
            void playVfx((source ? Q.extra : P.cast) ?? "none",
                source ?? tip,
                source ? [tip] : [],
                {
                    ...TONE,
                    onBeat: () => {
                        this.rest(lane,
                            tip)
                        resolve()
                    }
                }).finally(resolve)
        })
    }

    private rest(lane: number, tip: Pt) {
        let ended = false
        const tether = {
            target: () => tip, released: () => ended, contact() {}
        }
        const relay = async () => {
            while (!ended) {
                void playVfx(P.extra ?? "none",
                    tip,
                    [],
                    {
                        ...TONE, tether
                    })
                for (let waited = 0; !ended && waited < REST_RELAY_MS; waited += 200) await sleep(200)
            }
        }
        void relay()
        this.rests.set(lane,
            () => { ended = true })
    }

    /** Nhặt: Dao trên đường tắt đúng lúc Dao trong tay hiệu ứng nhặt bật lên */
    private take(lane: number) {
        this.rests.get(lane)?.()
        this.rests.delete(lane)
    }

    /** Dựng đổi chỗ vào bản demo, giữ Máu đang hiển thị của hai tướng, rồi cho store chốt đúng đường trận thật */
    private commitSwap(move: Extract<cg.GameEvent, { t: "move" }>) {
        const shown = this.view().units
        const ally = move.with ?? ""
        const lanes = this.staged.lanes.A
        lanes[move.from] = ally
        lanes[move.to] = KAT
        this.staged.units[KAT] = {
            ...copy(shown[KAT]), lane: move.to
        } as cg.GameState["units"][string]
        this.staged.units[ally] = {
            ...copy(shown[ally]), lane: move.from
        } as cg.GameState["units"][string]
        receiveCardState(this.game.view(this.staged))
        flushSync(() => applyToDisplay([move]))
    }

    /** Hai lá cùng đổi đường. Dịch chuyển thì lá Katarina tan ở chỗ cũ, hiện ở chỗ mới; đồng minh luôn chạy thật sang ô trống */
    private async shift(lane: number, blink: boolean) {
        const view = this.view()
        const from = view.units[KAT].lane
        const ally = view.lanes.A[lane]
        if (!ally) throw new Error("Demo Katarina: đường đích không có đồng minh")
        const move = {
            t: "move" as const, unit: KAT, from, to: lane, with: ally
        }
        const ms = blink ? KATARINA_BLINK_MS + 60 : WALK_MS
        const animations = movementTracks(move).flatMap((track) => {
            const el = unitEl(track.unit), old = unitRect(track.unit)
            const destination = laneRect(track.unit,
                track.to,
                "A")
            if (!el || !old || !destination) return []
            const start = ptOf(old), end = ptOf(destination), dx = end.x - start.x, dy = end.y - start.y
            const there = `translate(${dx}px, ${dy}px)`
            const frames: Keyframe[] = blink && track.unit === KAT ? [
                {
                    transform: "translate(0, 0)", opacity: 1
                },
                {
                    transform: "translate(0, 0)", opacity: 0, offset: .3
                },
                {
                    transform: there, opacity: 0, offset: .31
                },
                {
                    transform: there, opacity: 0, offset: .78
                },
                {
                    transform: there, opacity: 1
                }
            ] : [
                {
                    transform: "translate(0, 0)"
                },
                {
                    transform: `translate(${dx * .5}px, ${dy * .5 + track.arc}px)`, offset: .5
                },
                {
                    transform: there
                }
            ]
            return [el.animate(frames,
                {
                    duration: ms, easing: "cubic-bezier(.2,.65,.3,1)", fill: "forwards"
                })]
        })
        await Promise.all(animations.map(a => a.finished.catch(() => {})))
        try {
            this.commitSwap(move)
        } finally {
            for (const animation of animations) animation.cancel()
        }
    }

    /** Dịch chuyển kèm hiệu ứng mở màn của chiêu; xong là lá đã chốt ở đường mới */
    private async blinkTo(lane: number, cast: string) {
        const rect = laneRect(KAT,
            lane,
            "A")
        if (!rect) return
        void playVfx(cast,
            unitPt(KAT),
            [ptOf(rect)],
            TONE)
        await this.shift(lane,
            true)
    }

    /** Vào đường có Dao: Dao bật vào tay, chém tướng đối diện, chạm là trừ máu */
    private pickup(lane: number) {
        const foe = this.foeAt(lane)
        const tip = this.tipOf(lane)
        this.take(lane)
        return new Promise<void>((resolve) => {
            void playVfx(P.travel,
                tip,
                [unitPt(foe)],
                {
                    ...TONE,
                    onBeat: () => {
                        landDamage(foe,
                            P_DAMAGE,
                            "physical")
                        void playVfx(P.impact,
                            unitPt(foe),
                            [],
                            TONE)
                        resolve()
                    }
                }).finally(resolve)
        })
    }

    private async walkPickup(lane: number) {
        await this.shift(lane,
            false)
        await this.pickup(lane)
    }

    /** Q: dịch chuyển sang đối diện, chém tại mục tiêu, cùng nhịp đó 1 Dao bật lên rơi xuống đường khác */
    private async phiDao(foe: string, nextLane: number) {
        await this.blinkTo(this.view().units[foe].lane,
            Q.cast ?? "none")
        let dropped: Promise<void> = Promise.resolve()
        await strike(Q.travel,
            KAT,
            [foe],
            TONE,
            () => {
                landDamage(foe,
                    Q_DAMAGE,
                    "physical")
                void playVfx(Q.impact,
                    unitPt(foe),
                    [],
                    TONE)
                dropped = this.fall(nextLane,
                    unitPt(foe))
            })
        await dropped
    }

    /** E: chớp tới đường có Dao. Nhặt Dao và nhát E vào tướng đối diện cùng một nhịp hình ảnh; số của nhát nhặt đáp lệch SECOND_NUMBER_MS vì số nổi cùng tướng chồng khít lên nhau */
    private async thuanBo(lane: number) {
        const foe = this.foeAt(lane)
        const tip = this.tipOf(lane)
        await this.blinkTo(lane,
            E.cast ?? "none")
        this.take(lane)
        void playVfx(P.travel,
            tip,
            [],
            TONE)
        await strike(E.travel,
            KAT,
            [foe],
            TONE,
            () => {
                landDamage(foe,
                    E_DAMAGE,
                    "physical")
                void sleep(SECOND_NUMBER_MS).then(() => landDamage(foe,
                    P_DAMAGE,
                    "physical"))
                void playVfx(E.impact,
                    unitPt(foe),
                    [],
                    TONE)
                void playVfx(P.impact,
                    unitPt(foe),
                    [],
                    TONE)
            })
    }

    /** R: lốc Dao quanh Katarina, rồi 3 đường cùng trúng một nhịp, tướng đối diện nặng nhất */
    private async lotus() {
        const lane = this.lane()
        const foes = [lane - 1,
            lane,
            lane + 1].flatMap(l => this.view().lanes.B[l] ?? [])
        const front = this.foeAt(lane)
        await new Promise<void>((resolve) => {
            void playVfx(R.cast ?? "none",
                unitPt(KAT),
                [],
                {
                    ...LOTUS, onBeat: resolve
                }).finally(resolve)
        })
        await strike(R.travel,
            KAT,
            foes,
            LOTUS,
            () => {
                for (const foe of foes) {
                    landDamage(foe,
                        foe === front ? R_FRONT : R_SIDE,
                        "physical")
                    void playVfx(R.impact,
                        unitPt(foe),
                        [],
                        {
                            ...LOTUS, intensity: foe === front ? FRONT_POWER : SIDE_POWER
                        })
                }
            })
    }

    /** Địch đánh vào Katarina ở vị trí mới: Chuỗi giải quyết ngược, E chạy trước */
    private annieShot() {
        const style = heroBasicVfx("annie")
        const tone = {
            color: style.color, color2: style.color2
        }
        return strike(style.travel,
            ANNIE,
            [KAT],
            tone,
            () => {
                landDamage(KAT,
                    48,
                    "magic")
                void playVfx(style.impact,
                    unitPt(KAT),
                    [],
                    tone)
            })
    }

    async play() {
        const say = this.say
        say("Đánh thường · Katarina: dao găm chém ngay tại mục tiêu")
        await basicAttack(KAT,
            ANNIE,
            62)
        await sleep(900)

        say("Nội tại · Nhặt Dao: đầu lượt 1 Dao rơi ngẫu nhiên 1 trong 5 đường, lượt này là đường 4")
        await this.fall(3)
        await sleep(1100)

        say("R · Bông Sen Tử Thần: chưa dùng được, lượt này chưa nhặt Dao")
        await sleep(1500)

        say("Q · Phi Dao: dịch chuyển sang đối diện Garen, chém tại chỗ, 1 Dao mới bật lên rơi xuống đường ngẫu nhiên")
        await this.phiDao(GAREN,
            1)
        await sleep(1200)

        say("Nội tại · Vào đường có Dao: nhặt Dao, tướng đối diện nhận sát thương")
        await this.walkPickup(1)
        await sleep(1100)

        say("R · Bông Sen Tử Thần: đã nhặt Dao lượt này, đối diện và 2 kề, Leona đối diện chịu nặng nhất")
        await this.lotus()
        await sleep(1500)

        say("Lượt địch · Annie nhắm đúng Katarina: E Quick được nối Chuỗi, còn Dao ở đường 4")
        await pulse(unitEl(ANNIE),
            700,
            1.1)
        await sleep(300)
        say("E · Thuấn Bộ: chớp tới đường có Dao, Jinx đối diện nhận nhát E và nhát nhặt Dao")
        await this.thuanBo(3)
        await sleep(620)
        say("Chuỗi giải quyết ngược: đòn của Annie đánh vào Katarina ở đường mới")
        await this.annieShot()
        await sleep(1200)

        say("Lượt mới · 1 Dao rơi ngẫu nhiên, lần này đường 3")
        await this.fall(2)
        await sleep(900)
        say("Combo · vào đường 3 nhặt Dao, chém Annie")
        await this.walkPickup(2)
        await sleep(420)
        say("Combo · R Bông Sen Tử Thần: Annie đối diện chịu nặng nhất, Leona và Jinx nhận phần nhẹ")
        await this.lotus()
        await sleep(1700)
    }
}
