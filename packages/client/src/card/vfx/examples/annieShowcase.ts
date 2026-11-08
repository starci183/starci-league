// Demo VFX đủ bộ chiêu Annie theo đặc tả mới, phát trên vị trí tướng thật của bàn 5 tướng. Chỉ là hình ảnh: không gọi engine, không đổi trạng thái trận.
// Tibbers là vật triệu hồi thật trong bản dựng riêng của demo, nên lá gấu hiện ở ô Triệu hồi phụ, có Máu và trúng đòn được. Tên hiệu ứng lấy từ heroMap.
import {
    cg
} from "@starci/shared"
import {
    flushSync
} from "react-dom"
import {
    handPt, laneRect, ptOf, unitEl, unitPt
} from "../../anim/helpers"
import {
    landImpacts, queueImpacts
} from "../../anim/impacts"
import {
    applyToDisplay, getCard, receiveCardState
} from "../../store"
import {
    playVfx
} from "../VfxCanvas"
import {
    ANNIE_FIRE_MAX
} from "../fx_annie"
import {
    ANNIE_VFX, heroBasicVfx, skillVfx
} from "../heroMap"
import {
    sleep
} from "../particles"
import {
    basicAttack, strike
} from "./renataShowcase"
import {
    closeHits, landDamage, landShield, openHits
} from "./showcaseHits"

const Q = skillVfx("annie",
    "q")
const E = skillVfx("annie",
    "e")
const R = skillVfx("annie",
    "r")
const TONE = {
    color: Q.color, color2: Q.color2
}
const JINX = heroBasicVfx("jinx")
const JINX_TONE = {
    color: JINX.color, color2: JINX.color2
}
const ANNIE = "A:annie"
const ENEMIES = ["B:garen",
    "B:leona",
    "B:renata",
    "B:jinx",
    "B:lux"]
/** Ô Triệu hồi phụ nằm sau 5 đường */
const EXTRA_LANE = 5
/** Chờ số Khiên tan trước khi số đỡ hiện */
const SHIELD_NUMBER_CLEAR_MS = 650
/** VFX bị cắt ở 15s nên cue dài được nối bằng lần phát mới trước khi lần cũ hết */
const CUE_RELAY_MS = 9500
/** Hệ số sát thương lên tướng Choáng */
const STUN_BONUS = 1.5
/** Tibbers mạnh theo AP và Máu tối đa của Annie; số demo lớn hơn lá thường cho dễ đọc */
const TIBBERS: cg.TokenDef = {
    id: "tibbers", name: "Tibbers", hp: 640, atk: 120, armor: 70, mr: 70, damage: "magic", ownerId: ANNIE, soak: false
}

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const land = (e: cg.GameEvent) => {
    queueImpacts([e])
    landImpacts([e])
    applyToDisplay([e])
}

export async function runAnnieShowcase(say: (text: string) => void) {
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
    /** Bản dựng riêng của demo: engine thật không biết Tibbers, chỉ store nhìn thấy */
    private staged: cg.GameState
    private fire = 0
    /** Đổi thế hệ là thả cue Lửa cũ, cue mới nối đúng pha vì Lửa quay theo đồng hồ chung */
    private moteRun = 0
    private tibbers = ""
    private auraRun = 0
    private stopped = false
    private fallen: Animation[] = []

    constructor(private game: NonNullable<Window["starciExamples"]>, private say: (text: string) => void) {
        this.staged = copy(game.state)
    }

    stop() {
        this.stopped = true
        this.moteRun++
        this.auraRun++
        for (const anim of this.fallen) anim.cancel()
    }

    private async showMotes() {
        const run = ++this.moteRun
        const tether = {
            target: () => unitPt(ANNIE), released: () => run !== this.moteRun, contact() {}
        }
        while (run === this.moteRun && this.fire > 0) {
            void playVfx(ANNIE_VFX.motes,
                unitPt(ANNIE),
                [],
                {
                    ...TONE, amount: this.fire, tether
                })
            for (let waited = 0; run === this.moteRun && waited < CUE_RELAY_MS; waited += 200) await sleep(200)
        }
    }

    /** Chiêu giải quyết xong: thêm 1 Lửa, tối đa 4, ngọn mới bùng cùng nhịp */
    private gain() {
        if (this.fire >= ANNIE_FIRE_MAX) return
        this.fire++
        void playVfx(ANNIE_VFX.gain,
            unitPt(ANNIE),
            [],
            {
                ...TONE, amount: this.fire
            })
        void this.showMotes()
    }

    /** Tiêu 4 Lửa: mở màn của chiêu gây Choáng */
    private async spend() {
        this.fire = 0
        this.moteRun++
        await playVfx(ANNIE_VFX.spend,
            unitPt(ANNIE),
            [],
            TONE)
    }

    private stun(id: string) {
        land({
            t: "status", target: id, id: "stun", turns: 1, v: 1, src: ANNIE, card: "annie_r"
        })
        void playVfx(ANNIE_VFX.stun,
            unitPt(id),
            [],
            TONE)
    }

    private bolt(target: string, amount: number, stunned = false, after?: () => void) {
        return playVfx(Q.cast ?? "none",
            unitPt(ANNIE),
            [],
            TONE).then(() => strike(Q.travel,
            ANNIE,
            [target],
            TONE,
            () => {
                landDamage(target,
                    amount,
                    "magic")
                void playVfx(Q.impact,
                    unitPt(target),
                    [],
                    {
                        ...TONE, amount: stunned ? 1 : 0
                    })
                after?.()
                this.gain()
            }))
    }

    /** E: lửa cuộn thành Khiên rồi lằn lửa quất đi; chạm là sát thương và Khiên cùng đáp */
    private async lash(target: string, amount: number, shield: number) {
        await playVfx(E.cast ?? "none",
            unitPt(ANNIE),
            [],
            TONE)
        await strike(E.travel,
            ANNIE,
            [target],
            TONE,
            () => {
                landDamage(target,
                    amount,
                    "magic")
                landShield(ANNIE,
                    shield)
                void playVfx(E.impact,
                    unitPt(target),
                    [],
                    TONE)
                void playVfx(E.shield ?? "none",
                    unitPt(ANNIE),
                    [],
                    TONE)
                this.gain()
            })
    }

    /** Khiên đỡ trọn đòn: số đỡ màu Khiên, không mất Máu */
    private blocked(amount: number) {
        const unit = getCard().view?.units[ANNIE]
        if (!unit) return
        land({
            t: "damage", target: ANNIE, amount, hpLost: 0, absorbed: amount, kind: "physical", tag: "attack", hp: unit.hp
        })
        void playVfx(E.block ?? "none",
            unitPt(ANNIE),
            [],
            TONE)
    }

    /** Đặt lá Tibbers thật vào ô phụ của bản dựng; ô đang có Tibbers thì gấu cũ bị thay như luật token */
    private placeTibbers() {
        const old = this.tibbers
        const g = new cg.Game(this.staged)
        this.auraRun++
        const token = g.summonToken("A",
            TIBBERS)
        this.tibbers = token.id
        receiveCardState(this.game.view(this.staged))
        const events: cg.GameEvent[] = [{
            t: "summonToken", side: "A", unit: token.id, name: TIBBERS.name, owner: ANNIE
        }]
        if (old) events.unshift({
            t: "tokenEnd", unit: old, reason: "replaced"
        })
        flushSync(() => applyToDisplay(events))
        void this.showAura(token.id)
    }

    /** Lửa cháy quanh lá Tibbers tới hết demo */
    private async showAura(id: string) {
        const run = this.auraRun
        const tether = {
            target: () => unitPt(id), released: () => run !== this.auraRun, contact() {}
        }
        while (run === this.auraRun && !this.stopped) {
            void playVfx(R.extra ?? "none",
                unitPt(id),
                [],
                {
                    ...TONE, tether
                })
            for (let waited = 0; run === this.auraRun && waited < CUE_RELAY_MS; waited += 200) await sleep(200)
        }
    }

    /** R: một nhịp duy nhất lúc Tibbers chạm đất: lá gấu hiện, lửa nở cả hàng, trừ máu và Choáng cùng đáp */
    private summon(amount: number, stuns: boolean) {
        const rect = laneRect(ANNIE,
            EXTRA_LANE,
            "A")
        const tibbersSlot = rect ? ptOf(rect) : unitPt(this.tibbers)
        return new Promise<void>((resolve) => {
            void playVfx(R.cast ?? "none",
                tibbersSlot,
                ENEMIES.map(id => unitPt(id)),
                {
                    ...TONE, intensity: R.intensity,
                    onBeat: () => {
                        this.placeTibbers()
                        for (const id of ENEMIES) {
                            landDamage(id,
                                amount,
                                "magic")
                            void playVfx(R.impact,
                                unitPt(id),
                                [],
                                {
                                    ...TONE, intensity: R.intensity
                                })
                            if (stuns) this.stun(id)
                        }
                        if (!stuns) this.gain()
                        resolve()
                    }
                }).finally(resolve)
        })
    }

    /** Cuối lượt: Tibbers vồ 1 địch, chạm là vuốt cào, sát thương cùng lúc */
    private claw(target: string, amount: number, stunned = false) {
        return strike(ANNIE_VFX.leap,
            this.tibbers,
            [target],
            TONE,
            () => {
                landDamage(target,
                    amount,
                    "magic")
                void playVfx(ANNIE_VFX.claw,
                    unitPt(target),
                    [],
                    {
                        ...TONE, amount: stunned ? 1 : 0
                    })
            })
    }

    /** Tướng gục: KO nổi, lá xám xuống; trả lại khi hết demo */
    private fall(id: string, amount: number) {
        const unit = getCard().view?.units[id]
        if (!unit) return
        land({
            t: "damage", target: id, amount, hpLost: unit.hp, absorbed: 0, kind: "magic", tag: "skill", hp: 0
        })
        land({
            t: "kill", src: ANNIE, target: id
        })
        const anim = unitEl(id)?.animate([{
            filter: "none"
        },
        {
            filter: "grayscale(1) brightness(.5)"
        }],
        {
            duration: 280, fill: "forwards"
        })
        if (anim) this.fallen.push(anim)
    }

    async play() {
        const say = this.say
        say("Đánh thường · Annie: giọt lửa")
        await basicAttack(ANNIE,
            "B:renata",
            60)
        await sleep(800)

        say("Q · Phi Tiêu Lửa: cầu lửa xoáy, sát thương phép. Nội tại Hoả Thuật: Lửa 1")
        await this.bolt("B:jinx",
            130)
        await sleep(1300)

        say("E · Lá Chắn Cháy (chủ động): lửa cuộn thành Khiên, lằn lửa quất địch. Lửa 2")
        await this.lash("B:renata",
            90,
            120)
        await sleep(1500)

        say("E · Lá Chắn Cháy (nối chuỗi): Jinx nhắm Annie, Khiên dựng trước, lằn lửa đánh trả. Lửa 3")
        await this.lash("B:jinx",
            90,
            120)
        await sleep(SHIELD_NUMBER_CLEAR_MS)
        await strike(JINX.travel,
            "B:jinx",
            [ANNIE],
            JINX_TONE,
            () => this.blocked(70))
        await sleep(1400)

        say("R · Tibbers: Tibbers đổ sập vào ô Triệu hồi phụ, lửa nở khắp hàng địch. Lửa 4")
        await this.summon(110,
            false)
        await sleep(1900)

        say("Cuối lượt · Tibbers vồ 1 địch, ba vuốt lửa, sát thương phép")
        await this.claw("B:garen",
            120)
        await sleep(1400)

        say("Tibbers có Máu, Giáp, Kháng theo AP và Máu tối đa của Annie; địch nào cũng đánh được: Garen chém Tibbers")
        await basicAttack("B:garen",
            this.tibbers,
            90)
        void playVfx(ANNIE_VFX.hurt,
            unitPt(this.tibbers),
            [],
            TONE)
        await sleep(1500)

        say("Nội tại · 4 Lửa: bốn ngọn Lửa nóng trắng quay nhanh, chiêu kế tiếp gây Choáng")
        await sleep(1700)

        say("R · Tibbers khi đủ 4 Lửa: tiêu Lửa, cả hàng địch Choáng ngay trong cú đổ sập")
        await this.spend()
        await this.summon(110,
            true)
        await sleep(1700)

        say("Q · Phi Tiêu Lửa vào Jinx đang Choáng: sát thương tăng")
        await this.bolt("B:jinx",
            Math.round(130 * STUN_BONUS),
            true)
        await sleep(1100)

        say("Cuối lượt · Tibbers vồ Jinx đang Choáng: sát thương tăng")
        await this.claw("B:jinx",
            Math.round(120 * STUN_BONUS),
            true)
        await sleep(1400)

        say("Q · Phi Tiêu Lửa kết liễu Lux: lá quay về tay, đốm lửa nhỏ bay về")
        await this.bolt("B:lux",
            260,
            true,
            () => {
                this.fall("B:lux",
                    260)
                void playVfx(Q.extra ?? "none",
                    unitPt("B:lux"),
                    [handPt("A",
                        "A")],
                    TONE)
            })
        await sleep(2000)
    }
}
