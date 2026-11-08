// Demo VFX đủ bộ chiêu Ahri theo đặc tả mới, phát trên vị trí tướng thật của bàn 5 tướng. Chỉ là hình ảnh: không gọi engine, không đổi trạng thái trận.
// Demo chỉ là nơi xem: tên hiệu ứng lấy từ heroMap. Mỗi chiêu một nhịp; riêng Q có đúng hai cú trúng vì đặc tả ghi "sau đó".
import type {
    cg
} from "@starci/shared"
import {
    flushSync
} from "react-dom"
import {
    laneRect, ptOf, unitEl, unitPt, unitRect
} from "../../anim/helpers"
import {
    applyToDisplay, getCard, receiveCardState
} from "../../store"
import {
    playVfx
} from "../VfxCanvas"
import {
    AHRI_DASH_MS, AHRI_ORB_TURN_MS
} from "../fx_ahri"
import {
    skillVfx
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

const Q = skillVfx("ahri",
    "q")
const E = skillVfx("ahri",
    "e")
const R = skillVfx("ahri",
    "r")
const P = skillVfx("ahri",
    "p")
const TONE = {
    color: Q.color, color2: Q.color2
}
const ESSENCE = {
    color: P.color, color2: P.color2
}
const CHARM = {
    color: R.color, color2: R.color2, intensity: R.intensity
}
/** Lượt về của Q là sát thương chuẩn nên lửa ngả trắng */
const TRUE_TONE = {
    color: 0xffffff, color2: 0xffc2e8
}
const AHRI = "A:ahri"
const ENEMIES = ["B:garen",
    "B:leona",
    "B:annie",
    "B:jinx",
    "B:lux"]
/** VFX bị cắt ở 15s nên cue Say Mê dài ngày được nối bằng lần phát mới trước khi lần cũ hết */
const CUE_RELAY_MS = 9500
/** Đòn đánh liên tiếp khi nhiều Tinh Hoa */
const RAPID_GAP_MS = 170

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

export async function runAhriShowcase(say: (text: string) => void) {
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
        // trả bàn về đúng trạng thái engine và phát lại nước đi hợp lệ, không giữ các lần đổi chỗ của demo
        game.showState(game.state)
    }
}

class Run {
    /** Bản dựng riêng của demo: engine không biết các lần đổi chỗ, chỉ store nhìn thấy để applyToDisplay áp đúng làn */
    private staged: cg.GameState
    private essence = 0
    private cues: (() => void)[] = []

    constructor(private game: NonNullable<Window["starciExamples"]>, private say: (text: string) => void) {
        this.staged = copy(game.state)
    }

    stop() {
        for (const end of this.cues) end()
        this.cues = []
    }

    private view() {
        const view = getCard().view
        if (!view) throw new Error("Demo Ahri: bàn chưa sẵn sàng")
        return view
    }

    /** Nhận Tinh Hoa đúng nhịp đang đáp: luồng lửa chảy về Ahri */
    private gain(amount: number, sources: string[] = []) {
        this.essence += amount
        void playVfx(P.cast ?? "none",
            unitPt(AHRI),
            sources.map(id => unitPt(id)),
            {
                ...ESSENCE, amount
            })
    }

    private landCharm(id: string) {
        applyToDisplay([{
            t: "status", target: id, id: "ahri_charm", turns: 999, v: 1
        }])
    }

    /** Làn lửa hồng bám tướng Say Mê tới hết demo, theo đúng lá tướng */
    private charmCue(id: string) {
        let ended = false
        const tether = {
            target: () => unitPt(id), released: () => ended, contact() {}
        }
        const relay = async () => {
            while (!ended) {
                void playVfx(R.extra ?? "none",
                    unitPt(id),
                    [],
                    {
                        ...TONE, tether
                    })
                for (let waited = 0; !ended && waited < CUE_RELAY_MS; waited += 200) await sleep(200)
            }
        }
        void relay()
        this.cues.push(() => { ended = true })
    }

    /** Đánh Tinh Hoa: stacks càng cao cầu càng to, chạm là trừ máu và nổ cùng lúc */
    private essenceHit(target: string, amount: number, stacks: number) {
        const tone = {
            ...ESSENCE, amount: stacks
        }
        return strike(P.travel,
            AHRI,
            [target],
            tone,
            () => {
                landDamage(target,
                    amount,
                    "magic")
                void playVfx(P.impact,
                    unitPt(target),
                    [],
                    tone)
                this.gain(1,
                    [target])
            })
    }

    /** Đánh liên tiếp ở nhiều Tinh Hoa: mỗi viên một số */
    private rapid(target: string, amount: number, hits: number) {
        return Promise.all(Array.from({
            length: hits
        },
        (_, i) => sleep(i * RAPID_GAP_MS).then(() => this.essenceHit(target,
            amount,
            this.essence))))
    }

    /** Q: lượt đi số xanh, lượt về số trắng. Đúng hai cú trúng */
    private async orb(target: string, hit: number, missing: number, sayBack: string) {
        await strike(Q.travel,
            AHRI,
            [target],
            TONE,
            () => {
                landDamage(target,
                    hit,
                    "magic")
                void playVfx(Q.impact,
                    unitPt(target),
                    [],
                    TONE)
                this.gain(1,
                    [target])
            })
        await sleep(AHRI_ORB_TURN_MS)
        this.say(sayBack)
        await strike(Q.extra ?? "none",
            target,
            [AHRI],
            TRUE_TONE,
            () => {
                landDamage(target,
                    missing,
                    "true")
                void playVfx(Q.impact,
                    unitPt(target),
                    [],
                    TRUE_TONE)
            })
    }

    /** R: tụ lửa rồi trái tim lao tới, sát thương, Say Mê và cue cùng một nhịp */
    private async charm(target: string, amount: number) {
        await playVfx(R.cast ?? "none",
            unitPt(AHRI),
            [],
            CHARM)
        await strike(R.travel,
            AHRI,
            [target],
            CHARM,
            () => {
                landDamage(target,
                    amount,
                    "magic")
                this.landCharm(target)
                void playVfx(R.impact,
                    unitPt(target),
                    [],
                    CHARM)
                this.charmCue(target)
                this.gain(1,
                    [target])
            })
    }

    /** Dựng đổi chỗ vào bản demo, giữ Máu đang hiển thị của hai tướng, rồi cho store chốt đúng đường trận thật */
    private commitSwap(move: Extract<cg.GameEvent, { t: "move" }>) {
        const shown = this.view().units
        const ally = move.with ?? ""
        const lanes = this.staged.lanes.A
        lanes[move.from] = ally
        lanes[move.to] = AHRI
        this.staged.units[AHRI] = {
            ...copy(shown[AHRI]), lane: move.to
        } as cg.GameState["units"][string]
        this.staged.units[ally] = {
            ...copy(shown[ally]), lane: move.from
        } as cg.GameState["units"][string]
        receiveCardState(this.game.view(this.staged))
        flushSync(() => applyToDisplay([move]))
    }

    /** E: hai lá cùng chạy theo hai đường nhường nhau như move thật, tới nơi là chốt vị trí; lưỡi lửa đánh tướng đối diện chạm đúng lúc đáp */
    private async dash(ally: string, amount: number) {
        const view = this.view()
        const from = view.units[AHRI].lane
        const to = view.units[ally].lane
        const foe = view.lanes.B[to]
        if (!foe) throw new Error("Demo Ahri: không có tướng đối diện")
        const move = {
            t: "move" as const, unit: AHRI, from, to, with: ally
        }
        let moving = true
        const follow = (id: string) => ({
            target: () => unitPt(id), released: () => !moving, contact() {}
        })
        const animations = movementTracks(move).flatMap((track) => {
            const el = unitEl(track.unit), old = unitRect(track.unit)
            const destination = laneRect(track.unit,
                track.to,
                "A")
            if (!el || !old || !destination) return []
            const start = ptOf(old), end = ptOf(destination), dx = end.x - start.x, dy = end.y - start.y
            return [el.animate([
                {
                    transform: "translate(0, 0)"
                },
                {
                    transform: `translate(${dx * .5}px, ${dy * .5 + track.arc}px)`, offset: .5
                },
                {
                    transform: `translate(${dx}px, ${dy}px)`
                }
            ],
            {
                duration: AHRI_DASH_MS, easing: "cubic-bezier(.2,.65,.3,1)", fill: "forwards"
            })]
        })
        void playVfx(E.extra ?? "none",
            unitPt(ally),
            [unitPt(AHRI)],
            {
                ...TONE, tether: follow(ally)
            })
        let landed: Promise<void> = Promise.resolve()
        await playVfx(E.cast ?? "none",
            unitPt(AHRI),
            [unitPt(ally)],
            {
                ...TONE, tether: follow(AHRI),
                onBeat: () => {
                    landed = strike(E.travel,
                        AHRI,
                        [foe],
                        TONE,
                        () => {
                            landDamage(foe,
                                amount,
                                "magic")
                            void playVfx(E.impact,
                                unitPt(foe),
                                [],
                                TONE)
                            this.gain(2,
                                [foe])
                        })
                }
            })
        await landed
        await Promise.all(animations.map(a => a.finished.catch(() => {})))
        moving = false
        try {
            this.commitSwap(move)
        } finally {
            for (const animation of animations) animation.cancel()
        }
    }

    async play() {
        const say = this.say
        say("Đánh thường · Ahri: cầu hồ ly gây sát thương phép, Tinh Hoa 1")
        await basicAttack(AHRI,
            "B:jinx",
            40)
        this.gain(1,
            ["B:jinx"])
        await sleep(820)

        say("Nội tại · Hút Tinh Hoa: mỗi đòn đánh, chiêu, đổi chỗ cho 1 Tinh Hoa, không giới hạn")
        this.gain(5,
            ENEMIES)
        await sleep(1250)

        say(`Nội tại · ${this.essence} Tinh Hoa: đòn đánh nặng hơn, cầu lửa to hơn`)
        await this.essenceHit("B:jinx",
            64,
            this.essence)
        await sleep(820)

        this.gain(11,
            ENEMIES)
        say(`Nội tại · hút thêm, ${this.essence} Tinh Hoa`)
        await sleep(1250)
        say(`Nội tại · ${this.essence} Tinh Hoa: đánh nhanh gấp ba, mỗi đòn đều nặng`)
        await this.rapid("B:jinx",
            44,
            3)
        await sleep(1000)

        say("Q · Quả Cầu Ma Lực: cầu trúng Annie, sát thương phép")
        await this.orb("B:annie",
            56,
            30,
            "Q · cầu quay về: sát thương chuẩn theo Máu đã mất")
        await sleep(900)

        say("R · Mê Hoặc: trái tim lửa hồ ly, sát thương phép và Say Mê cùng một nhịp")
        await this.charm("B:annie",
            64)
        await sleep(900)

        say("Say Mê · Không hết hạn: Ahri gây thêm sát thương lên Annie, Annie gây ít hơn lên Ahri")
        await sleep(1500)

        say("E · Phi Hồ: đổi chỗ với Darius, hai lá cùng chạy, nhường đường nhau, trúng tướng đối diện vị trí mới")
        await this.dash("A:darius",
            90)
        await sleep(1000)

        say("Q · Quả Cầu Ma Lực: Annie Say Mê nên trúng được dù khác đường")
        await this.orb("B:annie",
            50,
            44,
            "Q · cầu quay về xuyên đường: sát thương chuẩn")
        await sleep(1000)

        say("Combo · E Phi Hồ sang Ashe, trúng Garen")
        await this.dash("A:ashe",
            90)
        await sleep(260)
        say("Combo · R Mê Hoặc Garen")
        await this.charm("B:garen",
            64)
        await sleep(320)
        say("Combo · Q xuyên đường vào Annie đang Say Mê")
        await this.orb("B:annie",
            40,
            52,
            "Combo · Q quay về: sát thương chuẩn")
        await sleep(420)
        say(`Combo · ${this.essence} Tinh Hoa: đánh thường dồn Garen`)
        await this.rapid("B:garen",
            60,
            3)
        await sleep(1500)
    }
}
