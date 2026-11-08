// Demo VFX đủ bộ chiêu Garen theo đặc tả mới, phát trên vị trí tướng thật của bàn 5 tướng. Chỉ là hình ảnh: không gọi engine, không đổi trạng thái trận.
// Demo chỉ là nơi xem: tên hiệu ứng lấy từ heroMap. Mỗi chiêu một nhịp: mở màn, rồi VFX, trừ Máu, số nổi và trạng thái cùng đáp một khoảnh khắc.
import type {
    cg
} from "@starci/shared"
import {
    landImpacts, queueImpacts
} from "../../anim/impacts"
import {
    lunge, unitEl, unitPt
} from "../../anim/helpers"
import {
    applyToDisplay, getCard
} from "../../store"
import {
    playVfx
} from "../VfxCanvas"
import {
    LEONA_VFX, heroBasicVfx, skillVfx
} from "../heroMap"
import {
    sleep
} from "../particles"
import {
    basicAttack, strike
} from "./renataShowcase"
import {
    closeHits, landDamage, landHeal, landShield, openHits, presetWound
} from "./showcaseHits"

const Q = skillVfx("garen",
    "q")
const E = skillVfx("garen",
    "e")
const R = skillVfx("garen",
    "r")
const P = skillVfx("garen",
    "p")
const TONE = {
    color: Q.color, color2: Q.color2
}
const GUARD = {
    color: E.color, color2: E.color2
}
const JUSTICE = {
    color: R.color, color2: R.color2, intensity: R.intensity
}
const PERSEVERE = {
    color: P.color, color2: P.color2
}
const GAREN = "A:garen"
const FACING = "B:annie"
/** Đối diện và 2 đường kề của Garen đứng giữa */
const LANES = ["B:leona",
    "B:annie",
    "B:jinx"]
const FAR_LANE = "B:lux"
const ATTACKER = "B:jinx"
/** Đòn địch màu đỏ để tách hẳn khỏi vàng của Garen */
const FOE_TONE = {
    color: 0xff4a32, color2: 0xffc9a8
}
const HEAL = 36
const ARMOR_STEP = 8
const SHIELD = 180
/** Máu dựng sẵn cho thấy rõ nội tại hồi */
const WOUND = 320

const unit = (id: string) => getCard().view?.units[id]

function land(e: cg.GameEvent) {
    queueImpacts([e])
    landImpacts([e])
    applyToDisplay([e])
}

/** Hiệu ứng mở màn rồi đi tiếp ngay ở ctx.onBeat, không chờ đuôi hạt tan */
const opener = (name: string, tone: Parameters<typeof playVfx>[3]) => new Promise<void>((resolve) => {
    void playVfx(name,
        unitPt(GAREN),
        [],
        {
            ...tone, onBeat: resolve
        }).finally(resolve)
})

class Run {
    private armor = 0
    private fallen?: Animation

    stop() {
        this.fallen?.cancel()
    }

    private setArmor(value: number) {
        this.armor = value
        land({
            t: "status", target: GAREN, id: "armor_up", turns: 99, v: value, src: GAREN, card: "garen_p"
        })
    }

    /** Nội tại ngay trên cú trúng: hồi Máu, thêm Giáp, cùng một nhịp với đòn đánh */
    private persevere() {
        landHeal(GAREN,
            HEAL)
        this.setArmor(this.armor + ARMOR_STEP)
        void playVfx(P.impact,
            unitPt(GAREN),
            [],
            PERSEVERE)
    }

    /** Đánh thường: nhát kiếm ngay tại mục tiêu, kèm nội tại */
    private async attack(target: string, amount: number) {
        void lunge(unitEl(GAREN),
            unitPt(GAREN),
            unitPt(target),
            380)
        await basicAttack(GAREN,
            target,
            amount)
        this.persevere()
    }

    /** Q: lưỡi kiếm bừng sáng rồi giáng xuống đầu mục tiêu; sát thương vật lý và Câm Lặng cùng lúc */
    private async decisive(target: string, amount: number) {
        await opener(Q.cast ?? "none",
            TONE)
        void lunge(unitEl(GAREN),
            unitPt(GAREN),
            unitPt(target),
            420)
        await strike(Q.travel,
            GAREN,
            [target],
            TONE,
            () => {
                landDamage(target,
                    amount,
                    "physical")
                land({
                    t: "status", target, id: "silence", turns: 1, v: 1, src: GAREN, card: "garen_q"
                })
                void playVfx(Q.impact,
                    unitPt(target),
                    [],
                    TONE)
                void playVfx(Q.extra ?? "none",
                    unitPt(target),
                    [],
                    TONE)
            })
    }

    /** E: xoay kiếm tại chỗ rồi lưỡi cuốn đúng ba đường; Khiên và ba cú trúng cùng một nhịp */
    private async judgment(amount: number, landed?: () => void) {
        await opener(E.cast ?? "none",
            GUARD)
        await strike(E.travel,
            GAREN,
            LANES,
            GUARD,
            () => {
                landShield(GAREN,
                    SHIELD)
                void playVfx(E.extra ?? "none",
                    unitPt(GAREN),
                    [],
                    GUARD)
                for (const id of LANES) {
                    landDamage(id,
                        amount,
                        "physical")
                    void playVfx(E.impact,
                        unitPt(id),
                        [],
                        GUARD)
                }
                landed?.()
            })
    }

    /** Địch gồng đòn nhắm đúng Garen; trả về hàm thả đòn */
    private windup(attacker: string) {
        let released = false
        void playVfx(LEONA_VFX.windup,
            unitPt(attacker),
            [unitPt(GAREN)],
            {
                ...FOE_TONE,
                tether: {
                    target: () => unitPt(attacker), released: () => released, contact() {}
                }
            })
        return () => { released = true }
    }

    /** Đòn của địch đập vào Khiên vừa nhận: Khiên ăn đòn, Máu không mất */
    private async onShield(attacker: string, amount: number) {
        const style = heroBasicVfx(attacker.split(":")[1])
        const tone = {
            color: style.color, color2: style.color2
        }
        await strike(style.travel,
            attacker,
            [GAREN],
            tone,
            () => {
                const u = unit(GAREN)
                if (!u) return
                land({
                    t: "damage", target: GAREN, amount, hpLost: 0, absorbed: amount, kind: "physical", tag: "skill", hp: u.hp
                })
                void playVfx(style.impact,
                    unitPt(GAREN),
                    [],
                    tone)
            })
    }

    /** R: ánh sáng vọt lên trời, đại kiếm rơi thẳng xuống; mũi chạm là sát thương chuẩn trắng */
    private async justice(target: string, amount: number) {
        await opener(R.cast ?? "none",
            JUSTICE)
        await strike(R.travel,
            GAREN,
            [target],
            JUSTICE,
            () => {
                landDamage(target,
                    amount,
                    "true")
                void playVfx(R.impact,
                    unitPt(target),
                    [],
                    JUSTICE)
            })
    }

    /** Luật chết: Garen gục, nửa số Giáp bong ra cùng nhịp */
    private async fall(attacker: string, amount: number) {
        const style = heroBasicVfx(attacker.split(":")[1])
        const tone = {
            color: style.color, color2: style.color2
        }
        await strike(style.travel,
            attacker,
            [GAREN],
            tone,
            () => {
                const u = unit(GAREN)
                if (!u) return
                land({
                    t: "damage", target: GAREN, amount, hpLost: u.hp, absorbed: 0, kind: "physical", tag: "skill", hp: 0
                })
                const ko: cg.GameEvent = {
                    t: "kill", src: attacker, target: GAREN
                }
                queueImpacts([ko])
                landImpacts([ko])
                this.fallen = unitEl(GAREN)?.animate([{
                    filter: "none"
                },
                {
                    filter: "grayscale(1) brightness(.5)"
                }],
                {
                    duration: 280, fill: "forwards"
                })
                this.setArmor(this.armor / 2)
                void playVfx(P.extra ?? "none",
                    unitPt(GAREN),
                    [],
                    PERSEVERE)
            })
    }

    async play(say: (text: string) => void) {
        presetWound(GAREN,
            WOUND)

        say("Đánh thường · Garen: đại kiếm chém ngay tại mục tiêu. Nội tại Kiên Cường: hồi Máu, +8 Giáp")
        await this.attack(FACING,
            70)
        await sleep(1150)

        say("Nội tại · Kiên Cường: Giáp cộng dồn vô hạn theo mỗi đòn đánh")
        await this.attack(FACING,
            70)
        await sleep(950)
        await this.attack(FACING,
            70)
        await sleep(1300)

        say("Q · Đòn Quyết Định: kiếm giáng xuống đầu Annie, sát thương vật lý và Câm Lặng cùng một nhịp")
        await this.decisive(FACING,
            150)
        await sleep(2000)
        applyToDisplay([{
            t: "statusEnd", target: FACING, id: "silence"
        }])

        say("E · Phán Xét (Quick): xoay kiếm, Khiên và ba đường đối diện cùng trúng một nhịp")
        await this.judgment(95)
        await sleep(2000)

        say("E · Phán Xét (nối chuỗi): Jinx gồng đòn nhắm đúng Garen, Garen nối chuỗi")
        const release = this.windup(ATTACKER)
        await sleep(1000)
        await this.judgment(95,
            release)
        await sleep(460)
        say("Chuỗi giải quyết: đòn của Jinx đập vào Khiên, Garen không mất Máu")
        await this.onShield(ATTACKER,
            90)
        await sleep(1500)

        say("R · Công Lý Demacia: đại kiếm ánh sáng từ trời rơi xuống Lux, đường nào cũng tới, sát thương chuẩn")
        await this.justice(FAR_LANE,
            420)
        await sleep(2500)

        say("Luật chết: Garen gục, mất một nửa số Giáp đã tích")
        await this.fall(ATTACKER,
            999)
        await sleep(1900)
    }
}

export async function runGarenShowcase(say: (text: string) => void) {
    const run = new Run()
    openHits()
    try {
        await run.play(say)
    } finally {
        run.stop()
        closeHits()
    }
}
