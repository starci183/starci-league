// Demo VFX đủ bộ chiêu Ashe theo đặc tả mới, phát trên vị trí tướng thật của bàn 5 tướng. Chỉ là hình ảnh: không gọi engine, không đổi trạng thái trận.
// Demo chỉ là nơi xem: tên hiệu ứng lấy từ heroMap. Mỗi chiêu một nhịp: cú trúng là lúc sát thương, Buốt, Choáng cùng đáp. Số `p2`, `q2`, `e3`, `r3` của đặc tả chưa chốt nên demo dùng 6, 1, 2, 3.
import type {
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
    ASHE_CLING_MS, ASHE_FROST_MAX
} from "../fx_ashe"
import {
    ASHE_FROST_CLING, ASHE_FROST_SHED, heroBasicVfx, skillVfx
} from "../heroMap"
import {
    sleep
} from "../particles"
import {
    basicAttack, strike
} from "./renataShowcase"
import {
    closeHits, landDamage, openHits
} from "./showcaseHits"

const Q = skillVfx("ashe",
    "q")
const E = skillVfx("ashe",
    "e")
const R = skillVfx("ashe",
    "r")
const P = skillVfx("ashe",
    "p")
const TONE = {
    color: P.color, color2: P.color2
}
const ULT = {
    color: R.color, color2: R.color2, intensity: R.intensity
}
const ASHE = "A:ashe"
/** Buốt thêm của đòn đánh khi đang Tập Trung, của E, của R */
const FOCUS_FROST = 2
const E_FROST = 2
const R_FROST = 3

const unit = (id: string) => getCard().view?.units[id]
const land = (e: cg.GameEvent) => {
    queueImpacts([e])
    landImpacts([e])
    applyToDisplay([e])
}

class Run {
    private frost = new Map<string, number>()
    private holds: (() => void)[] = []
    private alive = true
    private falls: Animation[] = []

    start() {
        void this.clingLoop()
    }

    stop() {
        this.alive = false
        for (const release of this.holds) release()
        this.holds = []
        for (const anim of this.falls) anim.cancel()
        for (const target of this.frost.keys()) applyToDisplay([{
            t: "statusEnd", target, id: "chill"
        }])
    }

    /** Băng bám lá nối liền trong suốt thời gian còn Buốt */
    private async clingLoop() {
        while (this.alive) {
            for (const [id,
                stacks] of this.frost) if (stacks > 0) void playVfx(ASHE_FROST_CLING,
                unitPt(id),
                [],
                {
                    ...TONE, amount: stacks
                })
            await sleep(ASHE_CLING_MS)
        }
    }

    /** Đổi số Buốt hiển thị: dùng đúng trạng thái Buốt của bàn, số tầng nằm ở v */
    private showFrost(id: string, stacks: number) {
        this.frost.set(id,
            stacks)
        if (stacks > 0) applyToDisplay([{
            t: "status", target: id, id: "chill", turns: 999, v: stacks, src: ASHE
        }])
        else applyToDisplay([{
            t: "statusEnd", target: id, id: "chill"
        }])
    }

    private hold(fx: string, id: string, tone: Parameters<typeof playVfx>[3]) {
        let ended = false
        const tether = {
            target: () => unitPt(id), released: () => ended, contact() {}
        }
        void playVfx(fx,
            unitPt(id),
            [],
            {
                ...tone, tether
            })
        const release = () => { ended = true }
        this.holds.push(release)
        return release
    }

    /** Choáng cùng nhịp với cú trúng, kèm băng dày đóng quanh lá */
    private stun(id: string) {
        land({
            t: "status", target: id, id: "stun", turns: 1, v: 1, src: ASHE, card: "ashe_r"
        })
        const release = this.hold(R.extra ?? "none",
            id,
            TONE)
        return () => {
            release()
            applyToDisplay([{
                t: "statusEnd", target: id, id: "stun"
            }])
        }
    }

    /** Thêm Buốt đúng nhịp đang đáp. Chạm ngưỡng là tiêu hết và Choáng; trả về hàm gỡ Choáng */
    private addFrost(id: string, amount: number) {
        const next = (this.frost.get(id) ?? 0) + amount
        if (next < ASHE_FROST_MAX) {
            this.showFrost(id,
                next)
            void playVfx(P.cast ?? "none",
                unitPt(id),
                [],
                {
                    ...TONE, amount: next
                })
            return undefined
        }
        this.showFrost(id,
            0)
        void playVfx(P.impact,
            unitPt(id),
            [],
            TONE)
        return this.stun(id)
    }

    private arrow(target: string, amount: number) {
        const style = heroBasicVfx("ashe")
        const tone = {
            color: style.color, color2: style.color2
        }
        return strike(style.travel,
            ASHE,
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
                this.addFrost(target,
                    1)
            })
    }

    /** Đòn đánh khi Tập Trung: loạt năm mũi, chạm là trừ máu, gắn thêm Buốt */
    private flurry(target: string, amount: number) {
        let unstun: (() => void) | undefined
        return strike(Q.travel,
            ASHE,
            [target],
            TONE,
            () => {
                landDamage(target,
                    amount,
                    "physical")
                void playVfx(Q.impact,
                    unitPt(target),
                    [],
                    TONE)
                unstun = this.addFrost(target,
                    FOCUS_FROST)
            }).then(() => unstun)
    }

    private volley(target: string, amount: number) {
        return strike(E.travel,
            ASHE,
            [target],
            TONE,
            () => {
                landDamage(target,
                    amount,
                    "physical")
                void playVfx(E.impact,
                    unitPt(target),
                    [],
                    TONE)
                this.addFrost(target,
                    E_FROST)
            })
    }

    /** R: kéo cung rồi mũi tên bay xuyên bàn, sát thương, Buốt, Choáng và cú vỡ cùng một nhịp */
    private async crystal(target: string, amount: number) {
        await playVfx(R.cast ?? "none",
            unitPt(ASHE),
            [unitPt(target)],
            ULT)
        let unstun: () => void = () => {}
        await strike(R.travel,
            ASHE,
            [target],
            ULT,
            () => {
                landDamage(target,
                    amount,
                    "physical")
                void playVfx(R.impact,
                    unitPt(target),
                    [],
                    ULT)
                this.showFrost(target,
                    R_FROST)
                unstun = this.stun(target)
            })
        return unstun
    }

    /** Tướng gục: bản hiển thị của demo không có đường chết thật nên làm tối lá ngay trên DOM và trả lại khi hết demo */
    private fall(id: string, amount: number) {
        const u = unit(id)
        if (!u) return
        land({
            t: "damage", target: id, amount, hpLost: u.hp, absorbed: 0, kind: "physical", tag: "skill", hp: 0
        })
        const ko: cg.GameEvent = {
            t: "kill", src: ASHE, target: id
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
        if (anim) this.falls.push(anim)
    }

    async play(say: (text: string) => void) {
        say("Đánh thường · Ashe: tên băng trúng Garen, Buốt 1")
        await this.arrow("B:garen",
            72)
        await sleep(1300)

        say("Nội tại · Băng Tiễn: Buốt 2, mỗi tầng băng trên lá dày thêm, không giới hạn thời gian")
        await this.arrow("B:garen",
            72)
        await sleep(1500)

        say("Nội tại · Garen đang Buốt chịu thêm sát thương từ phe Ashe: Darius đánh nặng hơn")
        await basicAttack("A:darius",
            "B:garen",
            96)
        await sleep(1200)

        say("Q · Tập Trung: cung phủ băng, tăng Tốc Đánh, đòn đánh gắn thêm Buốt")
        await playVfx(Q.cast ?? "none",
            unitPt(ASHE),
            [],
            TONE)
        const unfocus = this.hold(Q.extra ?? "none",
            ASHE,
            TONE)
        await sleep(500)

        say("Q · Loạt năm mũi tên liên hồi: Buốt 4")
        await this.flurry("B:garen",
            84)
        await sleep(620)

        say("Nội tại · Đủ 6 Buốt: tiêu hết, băng vỡ tung, Choáng ngay nhịp trúng")
        const unstun = await this.flurry("B:garen",
            84)
        await sleep(2300)
        unstun?.()
        unfocus()
        await sleep(500)

        say("E · Tên Băng: quạt tên chụm vào Jinx, sát thương vật lý, Buốt 2")
        await this.volley("B:jinx",
            150)
        await sleep(1500)

        say("E · Tên Băng lần nữa: Jinx lên Buốt 4")
        await this.volley("B:jinx",
            150)
        await sleep(1500)

        say("R · Đại Băng Tiễn: kéo cung, chọn Lux ở đường xa nhất")
        const unfreeze = await this.crystal("B:lux",
            260)
        say("R · Băng Tiễn xuyên bàn: sát thương, 3 Buốt và Choáng cùng một nhịp")
        await sleep(2500)
        unfreeze()
        await sleep(500)

        say("Luật chết: Jinx mang 4 Buốt gục, mất một nửa, còn 2")
        const style = heroBasicVfx("ashe")
        await strike(style.travel,
            ASHE,
            ["B:jinx"],
            {
                color: style.color, color2: style.color2
            },
            () => {
                this.fall("B:jinx",
                    400)
                this.showFrost("B:jinx",
                    2)
                void playVfx(ASHE_FROST_SHED,
                    unitPt("B:jinx"),
                    [],
                    TONE)
            })
        await sleep(2200)
    }
}

export async function runAsheShowcase(say: (text: string) => void) {
    openHits()
    const run = new Run()
    run.start()
    try {
        await run.play(say)
    } finally {
        run.stop()
        closeHits()
    }
}
