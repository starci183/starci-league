// Demo VFX đủ bộ chiêu Kog'Maw theo đặc tả mới, phát trên vị trí tướng thật của bàn 5 tướng. Chỉ là hình ảnh: không gọi engine, không đổi trạng thái trận.
// Demo chỉ là nơi xem: tên hiệu ứng lấy từ heroMap. Mỗi chiêu một nhịp: trúng là VFX, Máu, số và trạng thái cùng đáp. Số trong demo là số minh hoạ, số thật ở JSON cân bằng.
import {
    cg
} from "@starci/shared"
import {
    unitEl, unitPt
} from "../../anim/helpers"
import {
    landImpacts, queueImpacts
} from "../../anim/impacts"
import {
    applyToDisplay, getCard
} from "../../store"
import {
    playVfx
} from "../VfxCanvas"
import {
    KOGMAW_VFX, heroBasicVfx, skillVfx
} from "../heroMap"
import {
    sleep
} from "../particles"
import {
    basicAttack, strike
} from "./renataShowcase"
import {
    closeHits, landDamage, openHits, presetWound
} from "./showcaseHits"

const Q = skillVfx("kogmaw",
    "q")
const E = skillVfx("kogmaw",
    "e")
const R = skillVfx("kogmaw",
    "r")
const P = skillVfx("kogmaw",
    "p")
const TONE = {
    color: Q.color, color2: Q.color2
}
const VOID = {
    color: P.color, color2: P.color2
}
const KOG = "A:kogmaw"
const HUNGER_KEY = "hunger"
const ENEMIES = ["B:garen",
    "B:leona",
    "B:annie",
    "B:jinx",
    "B:lux"]
/** Đầu lượt: 1 Đói nhân (1 + 0,5·chí mạng), phần lẻ giữ nguyên */
const TURN_GAIN = 1.5
/** Tướng khác chết: 2 Đói nhân cùng hệ số */
const DEATH_GAIN = 3
/** R hạ gục cộng thêm */
const R_KILL_GAIN = 4
/** Bị hạ: nhận thêm, không mất */
const SELF_DEATH_GAIN = 6
const R_WOUND = 70
/** Một phát R vừa đủ hạ Lux, để số nổi đúng 168 */
const R_HIT = 168
const E_BUFF_MS = 3200
const SHOT_GAP_MS = 300
const E_SHOT = 74

const unit = (id: string) => getCard().view?.units[id]
const land = (e: cg.GameEvent) => {
    queueImpacts([e])
    landImpacts([e])
    applyToDisplay([e])
}

class Run {
    hunger = 0
    anims: Animation[] = []

    setHunger(value: number) {
        this.hunger = value
        applyToDisplay([{
            t: "stack", unit: KOG, key: HUNGER_KEY, value
        }])
    }

    /** Luồng Đói chạm miệng là bộ đếm tăng; trả về đúng lúc chạm */
    feed(gain: number, from: string[]) {
        return new Promise<void>((resolve) => {
            let done = false
            const beat = () => {
                if (done) return
                done = true
                this.setHunger(Math.round((this.hunger + gain) * 100) / 100)
                resolve()
            }
            void playVfx(P.impact,
                unitPt(KOG),
                from.map(id => unitPt(id)),
                {
                    ...VOID, amount: gain, onBeat: beat
                }).finally(beat)
        })
    }

    /** Tướng gục: bản hiển thị của demo không có đường chết thật nên làm tối lá ngay trên DOM và trả lại khi hết demo */
    fall(id: string, src: string, amount?: number, kind: cg.DamageKind = "physical") {
        const u = unit(id)
        if (!u) return
        land({
            t: "damage", target: id, amount: amount ?? u.hp, hpLost: u.hp, absorbed: 0, kind, tag: "skill", hp: 0
        })
        const ko: cg.GameEvent = {
            t: "kill", src, target: id
        }
        queueImpacts([ko])
        landImpacts([ko])
        const anim = unitEl(id)?.animate([{
            filter: "none"
        },
        {
            filter: "grayscale(1) brightness(.5)"
        }],
        {
            duration: 280, fill: "forwards"
        })
        if (anim) this.anims.push(anim)
    }

    /** Đòn đánh mang Đói: đạn đánh thường thật của Kog'Maw, miệng loé Hư Không, tới nơi răng Hư Không cắn cùng nhịp số */
    hungryAttack(target: string, amount: number) {
        const style = heroBasicVfx("kogmaw")
        const tone = {
            color: style.color, color2: style.color2
        }
        const power = {
            ...VOID, amount: this.hunger
        }
        void playVfx(P.cast ?? "none",
            unitPt(KOG),
            [],
            power)
        return strike(style.travel,
            KOG,
            [target],
            tone,
            () => {
                landDamage(target,
                    amount,
                    "physical")
                void playVfx(style.impact,
                    unitPt(target),
                    [],
                    tone)
                void playVfx(P.extra ?? "none",
                    unitPt(target),
                    [],
                    power)
            })
    }

    /** Một phát R: mở màn trên Kog'Maw, axit đổ xuống mục tiêu, chạm là kết quả */
    async artillery(target: string, missing: number, result: () => void) {
        const tone = {
            color: R.color, color2: R.color2, intensity: R.intensity
        }
        void playVfx(R.cast ?? "none",
            unitPt(KOG),
            [],
            tone)
        await sleep(600)
        await strike(R.travel,
            KOG,
            [target],
            tone,
            () => {
                result()
                void playVfx(R.impact,
                    unitPt(target),
                    [],
                    {
                        ...tone, amount: missing
                    })
            })
    }

    async play(say: (text: string) => void) {
        say("Đánh thường · Kog'Maw: 0 Đói, nước bọt axit gốc, sát thương vật lý")
        await basicAttack(KOG,
            "B:annie",
            40)
        await sleep(800)

        say("Cơn Đói Hư Không · Đầu lượt: +1 Đói nhân (1 + chí mạng) = +1.5, phần lẻ giữ nguyên, Hư Không hút vào miệng")
        await this.feed(TURN_GAIN,
            [])
        await sleep(900)

        say("Cơn Đói Hư Không · Tướng khác chết: Ashe gục, Đói hút từ xác sang Kog'Maw, +3 Đói")
        presetWound("A:ashe",
            (unit("A:ashe")?.hp ?? 2) - 30)
        await strike(heroBasicVfx("jinx").travel,
            "B:jinx",
            ["A:ashe"],
            heroBasicVfx("jinx"),
            () => this.fall("A:ashe",
                "B:jinx",
                30))
        await this.feed(DEATH_GAIN,
            ["A:ashe"])
        await sleep(1000)

        say("Đòn đánh theo Đói: 4.5 Đói, thêm % Máu tối đa của mục tiêu, răng Hư Không cắn cùng nhịp số")
        await this.hungryAttack("B:annie",
            62)
        await sleep(900)

        this.setHunger(16)
        say("Đòn đánh theo Đói: 16 Đói sau nhiều lượt, cú cắn to hơn, số lớn hơn")
        await this.hungryAttack("B:garen",
            118)
        await sleep(900)

        this.setHunger(32)
        say("Đòn đánh theo Đói: 32 Đói, không có trần, cú cắn phủ cả lá")
        await this.hungryAttack("B:leona",
            196)
        await sleep(1100)

        say("Q · Phun Axít: bãi axit vàng chanh vỡ trên Leona, sát thương vật lý và Rã Giáp cùng đáp, axit ăn bong vảy giáp")
        await playVfx(Q.cast ?? "none",
            unitPt(KOG),
            [],
            TONE)
        await strike(Q.travel,
            KOG,
            ["B:leona"],
            TONE,
            () => {
                landDamage("B:leona",
                    84,
                    "physical")
                land({
                    t: "status", target: "B:leona", id: "shred", turns: 1, v: 1, src: KOG, card: "kogmaw_q"
                })
                void playVfx(Q.impact,
                    unitPt("B:leona"),
                    [],
                    TONE)
            })
        await sleep(1200)

        const barrage = {
            color: E.color, color2: E.color2
        }
        say("E · Cao Xạ Ma Pháp: tăng Tốc Đánh, đòn tới mọi đường, Kog'Maw toả hơi tím")
        void playVfx(E.impact,
            unitPt(KOG),
            [],
            {
                ...barrage, amount: E_BUFF_MS
            })
        await playVfx(E.cast ?? "none",
            unitPt(KOG),
            [],
            barrage)
        say("E · Cao Xạ Ma Pháp: đòn vồng cao tới bất kỳ đường nào, mỗi đòn thêm % Máu tối đa")
        await Promise.all(ENEMIES.map((id, i) => sleep(i * SHOT_GAP_MS).then(() => strike(KOGMAW_VFX.barrage,
            KOG,
            [id],
            barrage,
            () => {
                landDamage(id,
                    E_SHOT,
                    "physical")
                void playVfx(KOGMAW_VFX.barrageHit,
                    unitPt(id),
                    [],
                    {
                        ...barrage, amount: this.hunger
                    })
            }))))
        await sleep(1300)

        say("R · Pháo Sinh Học: phun thẳng lên trời, axit đổ xuống đường bất kỳ, Jinx đang mất Máu nên đau hơn")
        presetWound("B:jinx",
            R_WOUND)
        await this.artillery("B:jinx",
            60,
            () => landDamage("B:jinx",
                R_HIT,
                "physical"))
        await sleep(1300)

        say("R · Pháo Sinh Học hạ gục Lux: +4 Đói, cộng 3 Đói vì tướng khác chết, Đói hút từ xác về")
        presetWound("B:lux",
            (unit("B:lux")?.hp ?? R_HIT) - R_HIT)
        await this.artillery("B:lux",
            40,
            () => this.fall("B:lux",
                KOG))
        await this.feed(R_KILL_GAIN + DEATH_GAIN,
            ["B:lux"])
        await sleep(1200)

        say("Bị hạ: Kog'Maw nổ tung Hư Không, ngoại lệ không mất Đói, còn +6 Đói")
        const jinx = heroBasicVfx("jinx")
        await strike(jinx.travel,
            "B:jinx",
            [KOG],
            jinx,
            () => {
                this.fall(KOG,
                    "B:jinx")
                this.setHunger(this.hunger + SELF_DEATH_GAIN)
                void playVfx(KOGMAW_VFX.death,
                    unitPt(KOG),
                    [],
                    {
                        ...VOID, amount: this.hunger
                    })
            })
        await sleep(2300)
    }
}

export async function runKogmawShowcase(say: (text: string) => void) {
    openHits()
    const run = new Run()
    try {
        await run.play(say)
    } finally {
        for (const anim of run.anims) anim.cancel()
        closeHits()
    }
}
