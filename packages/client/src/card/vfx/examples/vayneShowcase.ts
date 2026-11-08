// Demo VFX đủ bộ chiêu Vayne theo đặc tả mới, phát trên vị trí tướng thật của bàn 5 tướng. Chỉ là hình ảnh: không gọi engine, không đổi trạng thái trận.
// Demo chỉ là nơi xem: tên hiệu ứng lấy từ heroMap. Mỗi đòn một nhịp: chạm là sát thương, số nổi, dấu bạc và cú nổ thứ 3 cùng đáp.
import type {
    cg
} from "@starci/shared"
import {
    flushSync
} from "react-dom"
import {
    handPt, laneRect, ptOf, unitEl, unitPt, unitRect
} from "../../anim/helpers"
import {
    applyToDisplay, getCard, receiveCardState
} from "../../store"
import {
    playVfx
} from "../VfxCanvas"
import {
    VAYNE_TUMBLE_MS
} from "../fx_vayne"
import {
    VAYNE_VFX, heroBasicVfx, skillVfx
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

const Q = skillVfx("vayne",
    "q")
const E = skillVfx("vayne",
    "e")
const R = skillVfx("vayne",
    "r")
const P = skillVfx("vayne",
    "p")
const NIGHT_TONE = {
    color: 0x7c4dff, color2: 0xdfe6ff
}
const Q_TONE = {
    color: Q.color, color2: Q.color2
}
const E_TONE = {
    color: E.color, color2: E.color2
}
const ULT = {
    color: R.color, color2: R.color2, intensity: R.intensity
}
const SILVER = {
    color: P.color, color2: P.color2
}
const VAYNE = "A:vayne"
const DARIUS = "A:darius"
const JINX = "B:jinx"
const GAREN = "B:garen"
/** Bóng Đêm mỗi lượt khi chưa ra sân và khi trên sân (p1 > p2) */
const P1 = 3
const P2 = 1
/** Sáu lá Đánh Thường R xả: % Máu tối đa của mục tiêu mỗi đòn, tăng dần; đòn 3 và 6 nổ chuẩn trắng */
const R_HITS = [.08,
    .1,
    .12,
    .14,
    .16,
    .2]
/** Mỗi cú nổ trắng: % Máu tối đa của mục tiêu */
const R_BURST = .1
const STRIKE_GAP_MS = 240
const SWAP_EASE = "cubic-bezier(.45,.05,.55,.95)"

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

export async function runVayneShowcase(say: (text: string) => void) {
    const game = window.starciExamples
    if (!game) return
    const run = new Run(game,
        say)
    run.hide()
    openHits()
    try {
        await run.play()
    } finally {
        run.stop()
        closeHits()
        // trả bàn về đúng trạng thái engine, không giữ các lần đổi chỗ của demo
        game.showState(game.state)
    }
}

class Run {
    /** Bản dựng riêng của demo: engine không biết Vayne chưa ra sân hay đã đổi đường, chỉ store nhìn thấy */
    private staged: cg.GameState
    private night = 0
    private cues: (() => void)[] = []
    private falls: Animation[] = []

    constructor(private game: NonNullable<Window["starciExamples"]>, private say: (text: string) => void) {
        this.staged = copy(game.state)
    }

    stop() {
        for (const end of this.cues) end()
        this.cues = []
        for (const anim of this.falls) anim.cancel()
        this.falls = []
    }

    private view() {
        const view = getCard().view
        if (!view) throw new Error("Demo Vayne: bàn chưa sẵn sàng")
        return view
    }

    /** Dựng Vayne chưa ra sân: đường của cô trống, lá nằm ở Đội dự bị */
    hide() {
        const lane = this.staged.units[VAYNE].lane
        this.staged.lanes.A[lane] = null
        this.staged.units[VAYNE].status = "reserve"
        receiveCardState(this.game.view(this.staged))
    }

    /** Lá Vayne trong Đội dự bị: nơi khói đêm tụ về khi chưa ra sân */
    private bench() {
        const el = document.querySelector<HTMLElement>(".reserve-roster button") ?? document.querySelector<HTMLElement>(".reserve-roster")
        return el ? ptOf(el.getBoundingClientRect()) : unitPt(VAYNE)
    }

    /** Lá dự bị chưa có ô bộ đếm nên số Bóng Đêm hiện ở dòng trạng thái của lá, chỉ trong demo */
    private benchCount() {
        const label = document.querySelector(".reserve-roster button span")
        if (label) label.textContent = `${this.night} Bóng Đêm`
    }

    private showNight() {
        applyToDisplay([{
            t: "roll", unit: VAYNE, key: "night", value: this.night
        } as cg.GameEvent])
    }

    /** Một lượt qua: khói đêm tụ về, chạm là tầng mới cộng vào số */
    private gain(at: () => ReturnType<typeof unitPt>, amount: number, onBoard: boolean) {
        return new Promise<void>((resolve) => {
            void playVfx(P.cast ?? "none",
                at(),
                [],
                {
                    ...NIGHT_TONE, amount,
                    onBeat: () => {
                        this.night += amount
                        if (onBoard) this.showNight()
                        else this.benchCount()
                        resolve()
                    }
                }).finally(resolve)
        })
    }

    /** Ra sân: lá lật lên trong khói, số Bóng Đêm đã tích hiện ngay trên lá */
    private async summon() {
        const lane = this.staged.units[VAYNE].lane
        const slot = laneRect(VAYNE,
            lane,
            "A")
        await new Promise<void>((resolve) => {
            void playVfx(VAYNE_VFX.card,
                this.bench(),
                slot ? [ptOf(slot)] : [],
                {
                    ...SILVER, onBeat: resolve
                }).finally(resolve)
        })
        this.staged.lanes.A[lane] = VAYNE
        this.staged.units[VAYNE].status = "board"
        this.staged.units[VAYNE].stacks = {
            ...this.staged.units[VAYNE].stacks, night: this.night
        }
        receiveCardState(this.game.view(this.staged))
        flushSync(() => {
            applyToDisplay([{
                t: "summon", unit: VAYNE, lane
            }])
            this.showNight()
        })
        void playVfx(Q.impact,
            unitPt(VAYNE),
            [],
            Q_TONE)
        await unitEl(VAYNE)?.animate([
            {
                transform: "perspective(900px) rotateY(-90deg)"
            },
            {
                transform: "perspective(900px) rotateY(0deg)"
            }
        ],
        {
            duration: 300, easing: "ease-out"
        }).finished.catch(() => {})
    }

    /** Lấy lá thật trên tay ra đánh: lá rời tay đúng lúc phát */
    private spend(id: string) {
        const view = this.view()
        const card = view.players.A.hand?.find(c => c.id === id)
        if (!card) throw new Error(`Demo Vayne: tay thiếu lá ${id}`)
        const el = document.querySelector<HTMLElement>(`[data-hand-uid="${CSS.escape(card.uid)}"]`)
        const rect = el?.getBoundingClientRect()
        const from = rect ? {
            x: rect.left + rect.width / 2, y: rect.top + rect.height / 2
        } : handPt("A",
            "A")
        applyToDisplay([{
            t: "play", side: "A", card
        } as cg.GameEvent])
        return from
    }

    private async condemn(target: string, amount: number) {
        this.spend("vayne_e")
        await playVfx(E.cast ?? "none",
            unitPt(VAYNE),
            [],
            E_TONE)
        await strike(E.travel,
            VAYNE,
            [target],
            E_TONE,
            () => {
                landDamage(target,
                    amount,
                    "physical")
                void playVfx(E.impact,
                    unitPt(target),
                    [unitPt(VAYNE)],
                    E_TONE)
            })
    }

    /** Dựng đổi chỗ vào bản demo, giữ Máu đang hiển thị của hai tướng, rồi cho store chốt đúng đường trận thật */
    private commitSwap(move: Extract<cg.GameEvent, { t: "move" }>) {
        const shown = this.view().units
        const ally = move.with ?? ""
        const lanes = this.staged.lanes.A
        lanes[move.from] = ally
        lanes[move.to] = VAYNE
        this.staged.units[VAYNE] = {
            ...copy(shown[VAYNE]), lane: move.to
        } as cg.GameState["units"][string]
        this.staged.units[ally] = {
            ...copy(shown[ally]), lane: move.from
        } as cg.GameState["units"][string]
        receiveCardState(this.game.view(this.staged))
        flushSync(() => applyToDisplay([move]))
    }

    /** Q: kẻ địch lấy đà; Vayne lộn đúng lúc đòn bay tới, đòn xuyên ô trống rồi tan vào khói; hai lá cùng chạy, tới nơi là chốt vị trí */
    private async tumble(attacker: string, ally: string) {
        const view = this.view()
        const from = view.units[VAYNE].lane
        const to = view.units[ally].lane
        const move = {
            t: "move" as const, unit: VAYNE, from, to, with: ally
        }
        const shooter = heroBasicVfx(attacker.split(":")[1])
        const windup = unitEl(attacker)?.animate([
            {
                transform: "translate(0, 0) scale(1)"
            },
            {
                transform: "translate(0, -14px) scale(1.07)"
            }
        ],
        {
            duration: 420, easing: "ease-out", fill: "forwards"
        })
        void playVfx("charge",
            unitPt(attacker),
            [],
            {
                color: shooter.color, color2: shooter.color2
            })
        await sleep(620)
        this.say("Q · Nhào Lộn: Quick nối Chuỗi, lộn sang đường kề, đòn đang nhắm bay vào khoảng không")
        this.spend("vayne_q")
        const oldSpot = unitPt(VAYNE)
        let moving = true
        const animations = movementTracks(move).flatMap((track) => {
            const el = unitEl(track.unit), old = unitRect(track.unit)
            const destination = laneRect(track.unit,
                track.to,
                "A")
            if (!el || !old || !destination) return []
            const start = ptOf(old), end = ptOf(destination), dx = end.x - start.x, dy = end.y - start.y
            return [el.animate([
                {
                    transform: "translate(0, 0) rotate(0deg)"
                },
                {
                    transform: `translate(${dx * .5}px, ${dy * .5 + track.arc * 1.5}px) rotate(${track.unit === VAYNE ? -14 : 0}deg)`, offset: .5
                },
                {
                    transform: `translate(${dx}px, ${dy}px) rotate(0deg)`
                }
            ],
            {
                duration: VAYNE_TUMBLE_MS, easing: SWAP_EASE, fill: "forwards"
            })]
        })
        void playVfx(Q.cast ?? "none",
            oldSpot,
            [ptOf(laneRect(ally,
                to,
                "A") as DOMRect)],
            {
                ...Q_TONE, tether: {
                    target: () => unitPt(VAYNE), released: () => !moving, contact() {}
                }
            })
        await sleep(60)
        windup?.cancel()
        void playVfx(Q.extra ?? "none",
            unitPt(attacker),
            [oldSpot],
            {
                color: shooter.color, color2: shooter.color2
            })
        await Promise.all(animations.map(a => a.finished.catch(() => {})))
        moving = false
        try {
            this.commitSwap(move)
        } finally {
            for (const animation of animations) animation.cancel()
        }
        void playVfx(Q.impact,
            unitPt(VAYNE),
            [],
            Q_TONE)
    }

    /** Vayne gục: khói tuột khỏi lá cùng lúc số tụt một nửa; hết vòng chờ, hồi sinh tại chỗ, giữ phần còn lại */
    private async fall(attacker: string) {
        await basicAttack(attacker,
            VAYNE,
            360)
        const lost = Math.ceil(this.night / 2)
        this.night -= lost
        const anim = unitEl(VAYNE)?.animate([
            {
                opacity: 1, filter: "grayscale(0)"
            },
            {
                opacity: .25, filter: "grayscale(1)"
            }
        ],
        {
            duration: 320, fill: "forwards"
        })
        this.showNight()
        void playVfx(P.extra ?? "none",
            unitPt(VAYNE),
            [],
            {
                ...NIGHT_TONE, amount: lost
            })
        await sleep(1500)
        this.say("Nội tại · Vayne trở lại, còn nguyên phần Bóng Đêm giữ được")
        anim?.cancel()
        const unit = this.view().units[VAYNE]
        applyToDisplay([{
            t: "heal", target: VAYNE, amount: unit.maxHp - unit.hp, hp: unit.maxHp
        }])
        void playVfx(Q.impact,
            unitPt(VAYNE),
            [],
            Q_TONE)
    }

    /** R: cánh dơi xoè rồi hào quang bám lá tới khi hết lượt */
    private async finalHour() {
        this.spend("vayne_r")
        let ended = false
        await playVfx(R.cast ?? "none",
            unitPt(VAYNE),
            [],
            ULT)
        void playVfx(R.extra ?? "none",
            unitPt(VAYNE),
            [],
            {
                ...ULT, tether: {
                    target: () => unitPt(VAYNE), released: () => ended, contact() {}
                }
            })
        this.cues.push(() => { ended = true })
    }

    /** Một lá Đánh Thường: lá vào nỏ, tên bay, chạm là số vàng; đòn thứ 3 thêm số trắng và nổ cùng khoảnh khắc */
    private async volley(target: string, index: number) {
        const n = index + 1
        const third = n % 3 === 0
        const maxHp = this.view().units[target].maxHp
        const from = this.spend("basic")
        await new Promise<void>((resolve) => {
            void playVfx(VAYNE_VFX.card,
                from,
                [unitPt(VAYNE)],
                {
                    ...SILVER, onBeat: resolve
                }).finally(resolve)
        })
        const tone = {
            ...(third ? SILVER : ULT), intensity: 1, amount: n
        }
        await strike(R.travel,
            VAYNE,
            [target],
            tone,
            () => {
                landDamage(target,
                    Math.round(maxHp * R_HITS[index]),
                    "physical")
                void playVfx(R.impact,
                    unitPt(target),
                    [unitPt(VAYNE)],
                    tone)
                if (third) {
                    landDamage(target,
                        Math.round(maxHp * R_BURST),
                        "true")
                    void playVfx(P.impact,
                        unitPt(target),
                        [],
                        {
                            ...SILVER, amount: n / 3
                        })
                } else void playVfx(VAYNE_VFX.mark,
                    unitPt(target),
                    [],
                    {
                        ...SILVER, amount: n % 3
                    })
            })
    }

    /** Garen đổ khi cú nổ cuối xong */
    private fell(id: string) {
        const anim = unitEl(id)?.animate([
            {
                opacity: 1, filter: "grayscale(0)"
            },
            {
                opacity: .25, filter: "grayscale(1)"
            }
        ],
        {
            duration: 320, fill: "forwards"
        })
        if (anim) this.falls.push(anim)
    }

    async play() {
        const say = this.say
        const bench = () => this.bench()
        await sleep(500)
        for (let turn = 1; turn <= 3; turn++) {
            say(`Nội tại · Thợ Săn Đêm: Vayne chưa ra sân, lượt ${turn} nhận ${P1} Bóng Đêm, nay ${this.night + P1} tầng`)
            await this.gain(bench,
                P1,
                false)
            await sleep(780)
        }

        say(`Nội tại · Ra sân muộn: Vayne mang theo ${this.night} Bóng Đêm, hiện trên lá`)
        await this.summon()
        await sleep(1000)

        for (let turn = 1; turn <= 2; turn++) {
            say(`Nội tại · Đang trên sân chỉ nhận ${P2} Bóng Đêm mỗi lượt, chậm hơn hẳn: ${this.night + P2} tầng`)
            await this.gain(() => unitPt(VAYNE),
                P2,
                true)
            await sleep(620)
        }

        say("Đánh thường · Mũi nỏ bạc bay thẳng, mỗi Bóng Đêm thêm AD và Tốc Đánh")
        await basicAttack(VAYNE,
            JINX,
            72)
        await sleep(800)

        say("E · Kết Án: mũi nỏ nặng vào tướng đối diện, sát thương vật lý")
        await this.condemn(JINX,
            140)
        await sleep(1000)

        say("Jinx nhắm đúng Vayne, lấy đà bắn")
        await this.tumble(JINX,
            DARIUS)
        await sleep(1000)

        say("Nội tại · Gục: Vayne mất một nửa Bóng Đêm, khói tan khỏi lá")
        await this.fall(GAREN)
        await sleep(900)

        say("R · Giờ Cuối: gọi muộn, giữ sáu lá Đánh Thường, cánh dơi xoè, cả tay xả trong một lượt")
        await this.finalHour()
        await sleep(260)
        for (let i = 0; i < R_HITS.length; i++) {
            const n = i + 1
            say(n % 3 === 0 ? `R · Đòn ${n}: mỗi đòn thứ 3 nổ trắng, sát thương chuẩn theo Máu tối đa` : `R · Đòn ${n}: mỗi đòn thêm sát thương, tên to và nhanh hơn`)
            await this.volley(GAREN,
                i)
            await sleep(n % 3 === 0 ? 620 : STRIKE_GAP_MS)
        }
        this.fell(GAREN)
        say("R · Lật kèo: Garen gục trong một lượt")
        await sleep(1800)
    }
}
