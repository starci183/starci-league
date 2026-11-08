// Demo VFX đủ bộ chiêu Zed theo đặc tả mới: một lượt combo liền mạch, phát trên vị trí tướng thật của bàn 5 tướng. Chỉ là hình ảnh: không gọi engine, không đổi trạng thái trận.
// Demo chỉ là nơi xem: tên hiệu ứng lấy từ heroMap. Mỗi chiêu một nhịp; riêng R có thêm cú nổ vì đặc tả ghi "cuối lượt".
import type {
    cg
} from "@starci/shared"
import {
    flushSync
} from "react-dom"
import {
    laneRect, lunge, ptOf, unitEl, unitPt, unitRect
} from "../../anim/helpers"
import {
    applyToDisplay, getCard, receiveCardState
} from "../../store"
import {
    playVfx
} from "../VfxCanvas"
import {
    ZED_STEP_MS
} from "../fx_zed"
import {
    ZED_VFX, heroBasicVfx, skillVfx
} from "../heroMap"
import {
    sleep
} from "../particles"
import {
    movementTracks
} from "../sequence"
import type {
    Pt
} from "../types"
import {
    strike
} from "./renataShowcase"
import {
    closeHits, landDamage, openHits
} from "./showcaseHits"

const Q = skillVfx("zed",
    "q")
const E = skillVfx("zed",
    "e")
const R = skillVfx("zed",
    "r")
const P = skillVfx("zed",
    "p")
const tone = (v: typeof Q) => ({
    color: v.color, color2: v.color2, intensity: v.intensity
})
const ZED = "A:zed"
const FACING = "B:annie"
const PREY = "B:garen"
const CHAIN = "zed_chain"
const MARK = "zed_mark"
const LUNGE_MS = 260
const BEAT_GAP_MS = 720
/** Số nổ cuối lượt to hơn hẳn số thường */
const BURST_FONT_PX = 58

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

export async function runZedShowcase(say: (text: string) => void) {
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
        // trả bàn về đúng trạng thái engine, không giữ lần dịch chuyển của demo
        game.showState(game.state)
    }
}

class Run {
    private staged: cg.GameState
    private stacks = 0
    private endAura = () => {}
    private endMark = () => {}

    constructor(private game: NonNullable<Window["starciExamples"]>, private say: (text: string) => void) {
        this.staged = copy(game.state)
    }

    stop() {
        this.endAura()
        this.endMark()
    }

    private view() {
        const view = getCard().view
        if (!view) throw new Error("Demo Zed: bàn chưa sẵn sàng")
        return view
    }

    /** Lá rời tay: nhấc lên rồi biến khỏi tay; trả về tâm lá để hiệu ứng đặt đúng chỗ */
    private async lift(id: string): Promise<Pt | null> {
        const card = this.view().players.A.hand?.find(c => c.id === id)
        if (!card) throw new Error(`Demo Zed: thiếu lá ${id} trên tay`)
        const el = document.querySelector<HTMLElement>(`[data-hand-uid="${CSS.escape(card.uid)}"]`)
        const box = el?.querySelector(".cv")?.getBoundingClientRect() ?? el?.getBoundingClientRect()
        el?.animate([{
            transform: "translateY(0)"
        },
        {
            transform: "translateY(-34px)"
        }],
        {
            duration: 200, fill: "forwards", easing: "ease-out"
        })
        await sleep(230)
        flushSync(() => applyToDisplay([{
            t: "play", side: "A", card
        }]))
        return box ? {
            x: box.left + box.width / 2, y: box.top + box.height / 2 - 34
        } : null
    }

    /** Bóng bám Zed: thả lớp cũ, dựng lớp mới đặc hơn theo số Liên Hoàn */
    private aura() {
        this.endAura()
        let ended = false
        this.endAura = () => { ended = true }
        void playVfx(P.cast ?? "none",
            unitPt(ZED),
            [],
            {
                ...tone(P), amount: this.stacks, tether: {
                    target: () => unitPt(ZED), released: () => ended, contact() {}
                }
            })
    }

    /** Mỗi chiêu hoặc đòn cho 1 Liên Hoàn đúng lúc trúng: ô trạng thái tăng số, bóng phụt ra */
    private gain() {
        this.stacks++
        applyToDisplay([{
            t: "status", target: ZED, id: CHAIN, turns: 1, v: this.stacks, src: ZED
        }])
        void playVfx(P.impact,
            unitPt(ZED),
            [],
            {
                ...tone(P), amount: this.stacks
            })
        this.aura()
    }

    /** Dấu Ấn bám mục tiêu: dựng lại mỗi khi Liên Hoàn tăng để phi tiêu trên đầu to theo */
    private markCue(target: string) {
        this.endMark()
        let ended = false
        this.endMark = () => { ended = true }
        void playVfx(R.extra ?? "none",
            unitPt(target),
            [],
            {
                ...tone(R), amount: this.stacks, tether: {
                    target: () => unitPt(target), released: () => ended, contact() {}
                }
            })
    }

    /** Đòn đánh thường thật của Zed tại mục tiêu; nhát thép thêm đậm theo Liên Hoàn. Trúng là trừ máu ngay */
    private async attack(target: string, amount: number) {
        const style = heroBasicVfx("zed")
        const look = {
            color: style.color, color2: style.color2
        }
        await Promise.all([
            lunge(unitEl(ZED),
                unitPt(ZED),
                unitPt(target),
                LUNGE_MS),
            strike(style.travel,
                ZED,
                [target],
                look,
                () => {
                    landDamage(target,
                        amount,
                        "physical")
                    void playVfx(style.impact,
                        unitPt(target),
                        [],
                        look)
                    void playVfx(P.extra ?? "none",
                        unitPt(target),
                        [],
                        {
                            ...tone(P), amount: this.stacks
                        })
                    this.gain()
                })
        ])
    }

    /** Q: phi tiêu xoay tới đối diện, chạm là trừ máu; hai lưỡi của Zed sáng lên cùng nhịp */
    private async shuriken(target: string, amount: number) {
        await this.lift("zed_q")
        await strike(Q.travel,
            ZED,
            [target],
            tone(Q),
            () => {
                landDamage(target,
                    amount,
                    "physical")
                void playVfx(Q.impact,
                    unitPt(target),
                    [],
                    {
                        ...tone(Q), amount: this.stacks
                    })
                void playVfx(Q.extra ?? "none",
                    unitPt(ZED),
                    [],
                    tone(Q))
                this.gain()
            })
    }

    /** Dựng dịch chuyển vào bản demo, giữ Máu và trạng thái đang hiển thị, rồi cho store chốt đúng đường trận thật */
    private commitSwap(move: Extract<cg.GameEvent, { t: "move" }>) {
        const shown = this.view().units
        const ally = move.with ?? ""
        const lanes = this.staged.lanes.A
        lanes[move.from] = ally
        lanes[move.to] = ZED
        this.staged.units[ZED] = {
            ...copy(shown[ZED]), lane: move.to
        } as cg.GameState["units"][string]
        this.staged.units[ally] = {
            ...copy(shown[ally]), lane: move.from
        } as cg.GameState["units"][string]
        receiveCardState(this.game.view(this.staged))
        flushSync(() => applyToDisplay([move]))
    }

    /** E: Zed tan vào bóng, hiện ra đối diện con mồi, đồng minh giữ ô đó về chỗ cũ. Hiện ra là chém, trừ máu cùng nhịp */
    private async step(target: string, amount: number) {
        await this.lift("zed_e")
        const view = this.view()
        const from = view.units[ZED].lane
        const to = view.units[target].lane
        const ally = view.lanes.A[to]
        if (!ally) throw new Error("Demo Zed: không có ô đối diện con mồi")
        const move = {
            t: "move" as const, unit: ZED, from, to, with: ally
        }
        const animations = movementTracks(move).flatMap((track) => {
            const el = unitEl(track.unit), old = unitRect(track.unit)
            const destination = laneRect(track.unit,
                track.to,
                "A")
            if (!el || !old || !destination) return []
            const start = ptOf(old), end = ptOf(destination), dx = end.x - start.x, dy = end.y - start.y
            const mine = track.unit === ZED
            return [el.animate([
                {
                    transform: "translate(0, 0)", opacity: 1
                },
                {
                    transform: mine ? "translate(0, 0)" : `translate(${dx * .5}px, ${dy * .5 + track.arc}px)`, opacity: mine ? 0 : 1, offset: .3
                },
                {
                    transform: `translate(${dx}px, ${dy}px)`, opacity: mine ? 0 : 1, offset: .75
                },
                {
                    transform: `translate(${dx}px, ${dy}px)`, opacity: 1
                }
            ],
            {
                duration: ZED_STEP_MS, easing: "linear", fill: "forwards"
            })]
        })
        await strike(E.cast ?? "none",
            ZED,
            [target],
            {
                ...tone(E)
            },
            () => {
                landDamage(target,
                    amount,
                    "physical")
                void playVfx(E.impact,
                    unitPt(target),
                    [],
                    {
                        ...tone(E), amount: this.stacks
                    })
            })
        await Promise.all(animations.map(a => a.finished.catch(() => {})))
        try {
            this.commitSwap(move)
        } finally {
            for (const animation of animations) animation.cancel()
        }
        this.gain()
    }

    /** R: lá rã khỏi tay, bóng nuốt Zed, ba bóng cùng xuyên mục tiêu; cú sốc đầu và Dấu Ấn gắn cùng một nhịp */
    private async mark(target: string, amount: number) {
        const at = await this.lift("zed_r")
        if (at) void playVfx(ZED_VFX.cardVanish,
            at,
            [],
            tone(R))
        const el = unitEl(ZED)
        const dim = el?.animate([{
            opacity: 1
        },
        {
            opacity: .12
        }],
        {
            duration: 300, fill: "forwards", easing: "ease-in"
        })
        await playVfx(R.cast ?? "none",
            unitPt(ZED),
            [],
            tone(R))
        await strike(R.travel,
            ZED,
            [target],
            tone(R),
            () => {
                landDamage(target,
                    amount,
                    "physical")
                applyToDisplay([{
                    t: "status", target, id: MARK, turns: 1, v: 1, src: ZED, card: "zed_r"
                }])
                void playVfx(R.impact,
                    unitPt(target),
                    [],
                    tone(R))
                this.gain()
                this.markCue(target)
                dim?.cancel()
            })
    }

    /** Số trắng của cú nổ: phóng to ngay khi số hiện, đúng đường hiển thị của trận */
    private enlargeBurstNumber() {
        requestAnimationFrame(() => requestAnimationFrame(() => {
            const shown = document.querySelectorAll<HTMLElement>(".bd-float.true")
            const last = shown[shown.length - 1] as HTMLElement | undefined
            if (last) last.style.fontSize = `${BURST_FONT_PX}px`
        }))
    }

    /** Cuối lượt: Dấu Ấn nổ theo Máu đã mất và Liên Hoàn, số trắng lớn; rồi toàn bộ Liên Hoàn tan */
    private async endTurn(target: string) {
        const unit = this.view().units[target]
        const burst = Math.max(1,
            unit.hp - Math.round(unit.maxHp * .02))
        await strike(ZED_VFX.burst,
            target,
            [],
            {
                ...tone(R), amount: this.stacks
            },
            () => {
                landDamage(target,
                    burst,
                    "true")
                this.enlargeBurstNumber()
                this.endMark()
                applyToDisplay([{
                    t: "statusEnd", target, id: MARK
                }])
            })
        await sleep(1300)
        this.say("Hết lượt · Liên Hoàn mất sạch, bóng tan, lá R đã biến mất khỏi tay và không về mộ")
        void playVfx(ZED_VFX.chainFade,
            unitPt(ZED),
            [],
            {
                ...tone(P), amount: this.stacks
            })
        this.endAura()
        this.stacks = 0
        applyToDisplay([{
            t: "statusEnd", target: ZED, id: CHAIN
        }])
        await sleep(1700)
    }

    async play() {
        const say = this.say
        say("Đánh thường · Zed chém chữ X vào Annie đối diện, Liên Hoàn 1")
        await this.attack(FACING,
            40)
        await sleep(BEAT_GAP_MS)

        say("Q · Phi Tiêu Sắc Lẻm vào Annie, Liên Hoàn 2. Đòn đánh lượt này nặng hơn")
        await this.shuriken(FACING,
            78)
        await sleep(BEAT_GAP_MS)

        say("Đánh thường · lưỡi đã mài sau Q, Liên Hoàn 3: bóng dày hơn")
        await this.attack(FACING,
            52)
        await sleep(BEAT_GAP_MS)

        say("E · Quick, Phân Thân Bóng Tối: Garen nhắm Zed, Zed tan vào bóng, hiện ra đối diện Garen, Liên Hoàn 4")
        await this.step(PREY,
            82)
        await sleep(BEAT_GAP_MS)

        say("R · Dấu Ấn Tử Thần: cú sốc đầu, gắn Dấu Ấn, Liên Hoàn 5. Lá R mất sau khi dùng")
        await this.mark(PREY,
            96)
        await sleep(BEAT_GAP_MS + 300)

        say("Đánh thường · Liên Hoàn 6: phi tiêu Dấu Ấn trên đầu Garen to dần")
        await this.attack(PREY,
            58)
        this.markCue(PREY)
        await sleep(BEAT_GAP_MS)

        say("Đánh thường · Liên Hoàn 7: bóng đặc nhất của lượt")
        await this.attack(PREY,
            64)
        this.markCue(PREY)
        await sleep(BEAT_GAP_MS + 200)

        say(`Cuối lượt · Dấu Ấn nổ: sát thương chuẩn theo Máu đã mất và ${this.stacks} Liên Hoàn`)
        await this.endTurn(PREY)
    }
}
