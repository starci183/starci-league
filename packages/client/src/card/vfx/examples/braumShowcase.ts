// Demo VFX đủ bộ chiêu Braum theo đặc tả mới, phát trên vị trí tướng thật của bàn 5 tướng. Chỉ là hình ảnh: không gọi engine, không đổi trạng thái trận.
// Demo chỉ là nơi xem: tên hiệu ứng lấy từ heroMap. Mỗi chiêu một nhịp; riêng Dấu Băng là nhịp kích hoạt tách riêng trên đòn của đồng minh theo đúng lá bài.
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
    BRAUM_RUSH_MS
} from "../fx_braum"
import {
    BRAUM_VFX, heroBasicVfx, skillVfx
} from "../heroMap"
import {
    sleep
} from "../particles"
import type {
    Pt
} from "../types"
import {
    basicAttack, strike
} from "./renataShowcase"
import {
    closeHits, landDamage, landShield, openHits
} from "./showcaseHits"

const Q = skillVfx("braum",
    "q")
const E = skillVfx("braum",
    "e")
const R = skillVfx("braum",
    "r")
const P = skillVfx("braum",
    "p")
const TONE = {
    color: Q.color, color2: Q.color2
}
const ULT = {
    ...TONE, intensity: R.intensity
}
const BRAUM = "A:braum"
/** Tướng đối diện Braum: lãnh Choáng dài của R */
const OPPOSITE = "B:annie"
const OTHERS = ["B:garen",
    "B:leona",
    "B:jinx",
    "B:lux"]
/** Sát thương đòn gốc nhắm đồng minh; Braum chịu 60% */
const BLOCKED = 150
const SHIELD = 60
/** Cửa hầm đứng cách tâm đồng minh chừng này về phía kẻ tấn công */
const DOOR_GAP = 96
/** Lá Braum đứng sau cửa, che một phần đồng minh */
const STAND_GAP = 54
const RUSH_EASE = "cubic-bezier(.55, 0, 1, .45)"

const land = (e: cg.GameEvent) => {
    queueImpacts([e])
    landImpacts([e])
    applyToDisplay([e])
}
const stun = (target: string, turns: number, card: string) => land({
    t: "status", target, id: "stun", turns, v: 1, src: BRAUM, card
})
const shifted = (at: Pt, to: Pt, gap: number): Pt => {
    const dx = to.x - at.x, dy = to.y - at.y
    const len = Math.hypot(dx,
        dy) || 1
    return {
        x: at.x + dx / len * gap, y: at.y + dy / len * gap
    }
}

/** Chạm là ra kết quả, không chờ đuôi hạt; như strike nhưng đích là một điểm trên bàn */
function reach(travel: string, from: Pt, to: Pt, tone: Parameters<typeof playVfx>[3], arrive: () => void) {
    return new Promise<void>((resolve) => {
        void playVfx(travel,
            from,
            [to],
            {
                ...tone,
                onBeat() {
                    arrive()
                    resolve()
                }
            }).finally(resolve)
    })
}

class Run {
    private stacks = 0
    private anims: Animation[] = []

    stop() {
        for (const anim of this.anims) anim.cancel()
        this.anims = []
        const el = unitEl(BRAUM)
        if (el) el.style.zIndex = ""
    }

    private gain() {
        this.stacks += 1
        void playVfx(P.impact,
            unitPt(BRAUM),
            [],
            {
                ...TONE, amount: this.stacks
            })
    }

    /** Địch đánh trúng Braum: sát thương và 1 Song Giáp cùng nhịp */
    private async hitBraum(attacker: string, amount: number) {
        const hero = attacker.split(":")[1]
        const style = heroBasicVfx(hero)
        const tone = {
            color: style.color, color2: style.color2
        }
        await strike(style.travel,
            attacker,
            [BRAUM],
            tone,
            () => {
                landDamage(BRAUM,
                    amount,
                    cg.getHero(hero)?.damage ?? "physical")
                void playVfx(style.impact,
                    unitPt(BRAUM),
                    [],
                    tone)
                this.gain()
            })
    }

    /** Q: giơ khiên, khối băng bay; chạm là sát thương phép và Dấu Băng. Trả về hàm gỡ dấu */
    private async bite(target: string, amount: number) {
        let ended = false
        await playVfx(Q.cast ?? "none",
            unitPt(BRAUM),
            [unitPt(target)],
            TONE)
        await strike(Q.travel,
            BRAUM,
            [target],
            TONE,
            () => {
                landDamage(target,
                    amount,
                    "magic")
                void playVfx(Q.impact,
                    unitPt(target),
                    [],
                    TONE)
                void playVfx(Q.extra ?? "none",
                    unitPt(target),
                    [],
                    {
                        ...TONE, tether: {
                            target: () => unitPt(target), released: () => ended, contact() {}
                        }
                    })
            })
        return () => { ended = true }
    }

    /** Đồng minh trúng tướng mang dấu: trước là cú đánh của đồng minh, tách riêng là dấu vỡ, Choáng, 1 Song Giáp bay về Braum */
    private async triggerMark(ally: string, target: string, amount: number, clear: () => void) {
        await basicAttack(ally,
            target,
            amount)
        await sleep(240)
        clear()
        void playVfx(BRAUM_VFX.markBreak,
            unitPt(target),
            [],
            {
                ...TONE,
                onBeat: () => stun(target,
                    1,
                    "braum_q")
            })
        await strike(BRAUM_VFX.stackFlow,
            target,
            [BRAUM],
            TONE,
            () => this.gain())
    }

    /** Braum chịu phần đòn đã giảm: Khiên ăn trước rồi mới tới Máu */
    private absorb(amount: number, kind: cg.DamageKind) {
        const u = getCard().view?.units[BRAUM]
        if (!u) return
        const absorbed = Math.min(u.shield,
            amount)
        const hpLost = Math.min(amount - absorbed,
            u.hp - 1)
        land({
            t: "damage", target: BRAUM, amount, hpLost, absorbed, kind, tag: "skill", hp: u.hp - hpLost
        })
    }

    /** E nối chuỗi: lao tới đồng minh, Khiên và Song Giáp đáp lúc cửa cắm xuống, rồi đòn địch mới nện vào cửa và Braum chịu 60% */
    private async interpose(ally: string, foe: string, travel: string, tone: { color: number; color2?: number }, kind: cg.DamageKind, status: boolean) {
        const home = unitPt(BRAUM), allyPt = unitPt(ally), foePt = unitPt(foe)
        const door = shifted(allyPt,
            foePt,
            DOOR_GAP)
        const stand = shifted(allyPt,
            foePt,
            STAND_GAP)
        const dx = stand.x - home.x, dy = stand.y - home.y
        const el = unitEl(BRAUM)
        if (el) el.style.zIndex = "30"
        const go = el?.animate([{
            transform: "translate(0, 0)"
        },
        {
            transform: `translate(${dx}px, ${dy}px)`
        }],
        {
            duration: BRAUM_RUSH_MS, easing: RUSH_EASE, fill: "forwards"
        })
        if (go) this.anims.push(go)
        void playVfx(E.cast ?? "none",
            home,
            [],
            TONE)
        let ended = false
        await reach(E.travel,
            home,
            door,
            TONE,
            () => {
                void playVfx(E.shield ?? "none",
                    door,
                    [],
                    {
                        ...TONE,
                        tether: {
                            target: () => door, released: () => ended, contact() {}
                        },
                        onBeat: () => {
                            landShield(BRAUM,
                                SHIELD)
                            this.gain()
                        }
                    })
            })
        await sleep(420)
        await reach(travel,
            foePt,
            door,
            tone,
            () => {
                this.absorb(Math.round(BLOCKED * .6),
                    kind)
                void playVfx(E.impact,
                    door,
                    [],
                    TONE)
                if (status) void playVfx(E.extra ?? "none",
                    allyPt,
                    [],
                    tone)
            })
        await sleep(560)
        ended = true
        const back = el?.animate([{
            transform: `translate(${dx}px, ${dy}px)`
        },
        {
            transform: "translate(0, 0)"
        }],
        {
            duration: 300, easing: "ease-out", fill: "forwards"
        })
        await back?.finished.catch(() => {})
        go?.cancel()
        back?.cancel()
        if (el) el.style.zIndex = ""
    }

    /** R: khe băng tới tướng đối diện rồi rẽ hết hàng địch, cả hàng trúng một nhịp */
    private async fissure(amount: number) {
        await new Promise<void>((done) => {
            void playVfx(R.cast ?? "none",
                unitPt(BRAUM),
                [OPPOSITE,
                    ...OTHERS].map(id => unitPt(id)),
                {
                    ...ULT,
                    onBeat: () => {
                        landDamage(OPPOSITE,
                            amount,
                            "magic")
                        stun(OPPOSITE,
                            2,
                            "braum_r")
                        void playVfx(R.extra ?? "none",
                            unitPt(OPPOSITE),
                            [],
                            ULT)
                        for (const id of OTHERS) {
                            landDamage(id,
                                amount,
                                "magic")
                            stun(id,
                                1,
                                "braum_r")
                            void playVfx(R.impact,
                                unitPt(id),
                                [],
                                ULT)
                        }
                        done()
                    }
                }).finally(done)
        })
    }

    /** Braum gục: máu về 0, KO nổi, lá xám xuống, nửa Song Giáp vỡ khỏi người */
    private fall() {
        const u = getCard().view?.units[BRAUM]
        if (!u) return
        land({
            t: "damage", target: BRAUM, amount: u.hp, hpLost: u.hp, absorbed: 0, kind: "physical", tag: "skill", hp: 0
        })
        const ko: cg.GameEvent = {
            t: "kill", src: "B:garen", target: BRAUM
        }
        queueImpacts([ko])
        landImpacts([ko])
        const lost = Math.floor(this.stacks / 2)
        void playVfx(P.extra ?? "none",
            unitPt(BRAUM),
            [],
            {
                ...TONE, amount: lost
            })
        this.stacks -= lost
        const anim = unitEl(BRAUM)?.animate([{
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

    async play(say: (text: string) => void) {
        say("Đánh thường · Braum: khiên cửa hầm")
        await basicAttack(BRAUM,
            OPPOSITE,
            60)
        await sleep(800)

        say("Nội tại · Song Giáp: Annie đánh trúng Braum, nhận 1 Song Giáp")
        await this.hitBraum(OPPOSITE,
            70)
        await sleep(900)

        say("Nội tại · Song Giáp: mỗi đòn địch trúng thêm 1 tầng, không giới hạn, tăng Giáp và Kháng Phép")
        await this.hitBraum("B:jinx",
            60)
        await sleep(1000)

        say("Q · Cú Đấm Băng: khối băng bay từ khiên, sát thương phép và gắn Dấu Băng lên Leona")
        const clear = await this.bite("B:leona",
            140)
        await sleep(1300)

        say("Dấu Băng: Darius đánh Leona, dấu vỡ, Leona bị Choáng, Braum nhận Song Giáp")
        await this.triggerMark("A:darius",
            "B:leona",
            80,
            clear)
        await sleep(1300)

        say("Nối chuỗi: Lux tung Khoá Ánh Sáng nhắm Ashe")
        const lux = skillVfx("lux",
            "e")
        const luxTone = {
            color: lux.color, color2: lux.color2
        }
        void playVfx("charge",
            unitPt("B:lux"),
            [],
            luxTone)
        await sleep(620)

        say("E · Đứng Sau Tôi (Nhanh): Braum lao tới đỡ, Khiên trước, Braum chịu 60%, Choáng của Ashe tan biến")
        await this.interpose("A:ashe",
            "B:lux",
            lux.travel,
            luxTone,
            "magic",
            true)
        await sleep(700)

        say("Nối chuỗi: Jinx nhắm Viktor")
        const gun = heroBasicVfx("jinx")
        const gunTone = {
            color: gun.color, color2: gun.color2
        }
        void playVfx("charge",
            unitPt("B:jinx"),
            [],
            gunTone)
        await sleep(620)

        say("E · Đứng Sau Tôi (Nhanh): đòn đánh của Jinx nện vào cửa hầm, Viktor không mất Máu")
        await this.interpose("A:viktor",
            "B:jinx",
            gun.travel,
            gunTone,
            "physical",
            false)
        await sleep(700)

        say("R · Khe Băng: khe băng xé ngang bàn, cả hàng địch trúng phép, Annie đối diện Choáng dài, còn lại Choáng ngắn")
        await this.fissure(150)
        await sleep(2000)

        const had = this.stacks
        say(`Nội tại · Braum gục: mất nửa Song Giáp, ${had} còn ${had - Math.floor(had / 2)}`)
        this.fall()
        await sleep(1700)
    }
}

export async function runBraumShowcase(say: (text: string) => void) {
    openHits()
    const run = new Run()
    try {
        await run.play(say)
    } finally {
        run.stop()
        closeHits()
    }
}
