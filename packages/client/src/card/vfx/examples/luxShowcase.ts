// Demo VFX đủ bộ chiêu Lux theo đặc tả mới, phát trên vị trí tướng thật của bàn 5 tướng. Chỉ là hình ảnh: không gọi engine, không đổi trạng thái trận.
// Demo chỉ là nơi xem: tên hiệu ứng lấy từ heroMap. Mỗi chiêu một nhịp: mở màn trước, rồi một khoảnh khắc trúng duy nhất nơi VFX, Máu, số và trạng thái cùng đáp.
import type {
    cg
} from "@starci/shared"
import {
    landImpacts, queueImpacts
} from "../../anim/impacts"
import {
    unitEl, unitPt
} from "../../anim/helpers"
import {
    applyToDisplay, getCard
} from "../../store"
import {
    playVfx
} from "../VfxCanvas"
import {
    heroBasicVfx, skillVfx
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

const Q = skillVfx("lux",
    "q")
const E = skillVfx("lux",
    "e")
const R = skillVfx("lux",
    "r")
const P = skillVfx("lux",
    "p")
const TONE = {
    color: Q.color, color2: Q.color2
}
const LUX = "A:lux"
/** Mana quỹ đội lúc mở demo và mốc R bản đầy mana */
const MANA_START = 80
const MANA_FULL = 200
/** Mức Ánh Sáng đủ để E gây Choáng trong demo, đặc tả để [S] */
const STUN_LIGHT = 100

const unit = (id: string) => getCard().view?.units[id]

function land(e: cg.GameEvent) {
    queueImpacts([e])
    landImpacts([e])
    applyToDisplay([e])
}

/** Đòn trúng Khiên: số nổi và Khiên giảm, Máu giữ nguyên */
function landBlocked(id: string, amount: number) {
    const u = unit(id)
    if (!u) return
    land({
        t: "damage", target: id, amount, hpLost: 0, absorbed: amount, kind: "physical", tag: "skill", hp: u.hp
    })
}

function manaBar(): { x: number; y: number } {
    const box = document.querySelector("[data-team-mana=A]")?.getBoundingClientRect()
    return box ? {
        x: box.left + box.width / 2, y: box.top + box.height / 2
    } : {
        ...unitPt(LUX), y: unitPt(LUX).y + 260
    }
}

export async function runLuxShowcase(say: (text: string) => void) {
    openHits()
    const run = new Run(say)
    try {
        await run.play()
    } finally {
        run.stop()
        closeHits()
    }
}

class Run {
    private mana = MANA_START
    private light = 0
    private fallen: Animation | undefined

    constructor(private say: (text: string) => void) {}

    stop() {
        this.fallen?.cancel()
    }

    /** Đặt thanh mana chung đúng số demo, cùng nhịp với mana rời quỹ */
    private setMana(mana: number, reason: "spend" | "effect") {
        const delta = mana - this.mana
        this.mana = mana
        applyToDisplay([{
            t: "teamManaChange", side: "A", unit: LUX, mana, max: MANA_FULL, delta, reason
        }])
    }

    /** Nội tại: trả mana, thanh tụt ngay, hạt xanh rời quỹ hoá trắng chui vào Lux; về tới Lux là có Ánh Sáng */
    private pay(cost: number) {
        this.setMana(this.mana - cost,
            "spend")
        return new Promise<void>((resolve) => {
            void playVfx(P.cast ?? "none",
                unitPt(LUX),
                [manaBar()],
                {
                    ...TONE, amount: cost,
                    onBeat: () => {
                        this.light += cost
                        resolve()
                    }
                }).finally(resolve)
        })
    }

    /** Dấu Chiếu Sáng cùng nhịp mọi đòn: càng nhiều Ánh Sáng tia sao càng dài */
    private illuminate(target: string) {
        void playVfx(P.impact,
            unitPt(target),
            [],
            {
                ...TONE, amount: this.light
            })
    }

    /** Q: Khiên tụ quanh Lux rồi mảnh sáng lao đi; chạm là địch mất Máu và Lux có Khiên cùng lúc */
    private async prism(target: string, amount: number, shield: number) {
        await new Promise<void>((resolve) => {
            void playVfx(Q.shield ?? "none",
                unitPt(LUX),
                [],
                {
                    ...TONE, onBeat: resolve
                }).finally(resolve)
        })
        await strike(Q.travel,
            LUX,
            [target],
            TONE,
            () => {
                landDamage(target,
                    amount,
                    "magic")
                landShield(LUX,
                    shield)
                void playVfx(Q.impact,
                    unitPt(target),
                    [],
                    {
                        ...TONE, amount: this.light
                    })
                this.illuminate(target)
                void playVfx(Q.extra ?? "none",
                    unitPt(LUX),
                    [],
                    TONE)
            })
    }

    /** E: đủ Ánh Sáng thì dải sáng trói, Choáng, Máu và số cùng đáp */
    private async binding(target: string, amount: number) {
        const stun = this.light >= STUN_LIGHT
        await strike(E.travel,
            LUX,
            [target],
            TONE,
            () => {
                landDamage(target,
                    amount,
                    "magic")
                void playVfx(E.impact,
                    unitPt(target),
                    [],
                    {
                        ...TONE, amount: this.light
                    })
                this.illuminate(target)
                if (!stun) return
                land({
                    t: "status", target, id: "stun", turns: 1, v: 1, src: LUX, card: "lux_e"
                })
                void playVfx(E.extra ?? "none",
                    unitPt(target),
                    [],
                    TONE)
            })
    }

    /** R: tiêu M mana, tụ sáng, tia chạm là Máu và số đáp; M lớn tia dày và giữ lâu hơn */
    private async spark(target: string, spend: number, amount: number) {
        const tone = {
            color: R.color, color2: R.color2, intensity: R.intensity, amount: spend
        }
        await this.pay(spend)
        await strike(R.cast ?? "none",
            LUX,
            [target],
            tone,
            () => {})
        await strike(R.travel,
            LUX,
            [target],
            tone,
            () => {
                landDamage(target,
                    amount,
                    "magic")
                void playVfx(R.impact,
                    unitPt(target),
                    [],
                    tone)
                this.illuminate(target)
            })
    }

    /** Luật chết: Lux gục, mất nửa Ánh Sáng ngay lúc đó */
    private fall() {
        const u = unit(LUX)
        if (!u) return
        const lost = Math.floor(this.light / 2)
        this.light -= lost
        land({
            t: "damage", target: LUX, amount: u.hp, hpLost: u.hp, absorbed: 0, kind: "physical", tag: "skill", hp: 0
        })
        const ko: cg.GameEvent = {
            t: "kill", src: "B:jinx", target: LUX
        }
        queueImpacts([ko])
        landImpacts([ko])
        this.fallen = unitEl(LUX)?.animate([{
            filter: "none"
        },
        {
            filter: "grayscale(1) brightness(.5)"
        }],
        {
            duration: 280, fill: "forwards"
        })
        void playVfx(P.extra ?? "none",
            unitPt(LUX),
            [],
            {
                ...TONE, amount: lost
            })
    }

    async play() {
        const say = this.say
        say("Đánh thường · Lux: cầu sáng")
        await basicAttack(LUX,
            "B:annie",
            60)
        await sleep(820)

        say("Nội tại · Chiếu Sáng: trả 30 mana, mana xanh hoá trắng rồi chui vào Lux, Ánh Sáng không giới hạn")
        await this.pay(30)
        say(`Nội tại · Chiếu Sáng: ${this.light} Ánh Sáng, mọi chiêu thêm sát thương theo số này`)
        await sleep(1100)

        say("Q · Lăng Kính (Quick): Khiên lăng kính tụ quanh Lux, mảnh sáng trúng Annie, sát thương phép và Khiên cùng lúc")
        await this.pay(20)
        await this.prism("B:annie",
            110,
            120)
        await sleep(1100)

        say(`E · Khoá Ánh Sáng: ${this.light + 30} Ánh Sáng chưa đủ, cầu sáng chỉ gây sát thương phép lên Garen`)
        await this.pay(30)
        await this.binding("B:garen",
            130)
        await sleep(1100)

        await this.pay(40)
        say(`E · Khoá Ánh Sáng: ${this.light} Ánh Sáng đủ, sát thương và Choáng cùng một nhịp lên Leona`)
        await this.binding("B:leona",
            150)
        await sleep(1500)

        say("Q · Lăng Kính (nối chuỗi): Jinx nhắm Lux, Khiên dựng trước, mảnh sáng đánh trả Jinx")
        // Jinx đang gồng đòn; mắt xích sau giải quyết trước nên Khiên và mảnh sáng đi trước đạn của Jinx
        const jinx = heroBasicVfx("jinx")
        const jinxTone = {
            color: jinx.color, color2: jinx.color2
        }
        void playVfx("spellCast",
            unitPt("B:jinx"),
            [],
            jinxTone)
        await sleep(520)
        await this.pay(20)
        await this.prism("B:jinx",
            110,
            120)
        await sleep(420)
        await strike(jinx.travel,
            "B:jinx",
            [LUX],
            jinxTone,
            () => {
                landBlocked(LUX,
                    80)
                void playVfx(Q.block ?? "none",
                    unitPt(LUX),
                    [unitPt("B:jinx")],
                    TONE)
            })
        await sleep(1200)

        say("R · Cầu Vồng Tối Thượng, M = 30: tia cầu vồng mảnh vào Annie")
        await this.spark("B:annie",
            30,
            120)
        await sleep(1500)

        this.setMana(MANA_FULL,
            "effect")
        say(`R · Cầu Vồng Tối Thượng, M = ${MANA_FULL}: dốc cạn quỹ đội, tia to gấp nhiều lần, sát thương theo M`)
        await sleep(700)
        await this.spark("B:jinx",
            MANA_FULL,
            420)
        await sleep(2100)

        const before = this.light
        say(`Luật chết: Lux gục, mất một nửa ${before} Ánh Sáng`)
        this.fall()
        await sleep(1700)
        say(`Luật chết: còn ${this.light} Ánh Sáng`)
        await sleep(1200)
    }
}
