// Demo VFX đủ bộ chiêu Leona theo đặc tả mới, phát trên vị trí tướng thật của bàn 5 tướng. Chỉ là hình ảnh: không gọi engine, không đổi trạng thái trận.
// Demo chỉ là nơi xem: tên hiệu ứng lấy từ heroMap. Mỗi chiêu một nhịp: VFX, trừ Máu, số nổi và Choáng cùng đáp một khoảnh khắc.
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
    applyToDisplay
} from "../../store"
import {
    playVfx
} from "../VfxCanvas"
import {
    LEONA_VFX, skillVfx
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

const Q = skillVfx("leona",
    "q")
const E = skillVfx("leona",
    "e")
const R = skillVfx("leona",
    "r")
const P = skillVfx("leona",
    "p")
const TONE = {
    color: Q.color, color2: Q.color2
}
const FLARE = {
    color: R.color, color2: R.color2, intensity: R.intensity
}
/** Đòn địch màu đỏ để tách hẳn khỏi nắng vàng của Leona */
const STRIKE = {
    color: 0xff4a32, color2: 0xffc9a8
}
const LEONA = "A:leona"
const ENEMIES = ["B:garen",
    "B:gangplank",
    "B:annie",
    "B:jinx",
    "B:lux"]
const FACING = "B:annie"
/** Lá rơi trước khi giáp nắng khoá vào */
const DROP_MS = 340

function land(e: cg.GameEvent) {
    queueImpacts([e])
    landImpacts([e])
    applyToDisplay([e])
}

/** Hiệu ứng mở màn rồi đi tiếp ngay ở ctx.onBeat, không chờ đuôi hạt tan */
const opener = (name: string, tone: Parameters<typeof playVfx>[3]) => new Promise<void>((resolve) => {
    void playVfx(name,
        unitPt(LEONA),
        [],
        {
            ...tone, onBeat: resolve
        }).finally(resolve)
})

function stun(id: string, card: string) {
    land({
        t: "status", target: id, id: "stun", turns: 1, v: 1, src: LEONA, card
    })
    void playVfx(Q.extra ?? "none",
        unitPt(id),
        [],
        TONE)
}

const clearStuns = () => {
    applyToDisplay(ENEMIES.map((target) => ({
        t: "statusEnd" as const, target, id: "stun"
    })))
}

/** Nội tại: lá Leona rơi vào bàn, giáp nắng khoá lên đúng lúc lá đáp */
async function enterBoard() {
    const drop = unitEl(LEONA)?.animate([
        {
            opacity: 0, transform: "translateY(-96px) scale(1.2)"
        },
        {
            opacity: 1, transform: "translateY(0) scale(1)"
        }
    ],
    {
        duration: DROP_MS, delay: 420, easing: "cubic-bezier(.5,0,.9,.6)", fill: "both"
    })
    await sleep(420)
    await new Promise<void>((resolve) => {
        void playVfx(P.impact,
            unitPt(LEONA),
            [],
            {
                ...TONE, onBeat: resolve
            }).finally(resolve)
    })
    drop?.cancel()
}

/** Q: khiên bừng sáng rồi đập tướng đối diện; sát thương vật lý và Choáng cùng lúc */
async function bash(target: string, amount: number) {
    await opener(Q.cast ?? "none",
        TONE)
    void lunge(unitEl(LEONA),
        unitPt(LEONA),
        unitPt(target),
        420)
    await strike(Q.travel,
        LEONA,
        [target],
        TONE,
        () => {
            landDamage(target,
                amount,
                "physical")
            stun(target,
                "leona_q")
            void playVfx(Q.impact,
                unitPt(target),
                [],
                TONE)
        })
}

/** E: Quick. Sát thương phép, Choáng, Leona nhận Giáp, tất cả cùng lúc; `landed` để chuỗi huỷ đòn đúng nhịp đó */
async function eclipse(target: string, amount: number, landed?: () => void) {
    await opener(E.cast ?? "none",
        TONE)
    await strike(E.travel,
        LEONA,
        [target],
        TONE,
        () => {
            landDamage(target,
                amount,
                "magic")
            stun(target,
                "leona_e")
            land({
                t: "status", target: LEONA, id: "armor_up", turns: 2, v: 40, src: LEONA, card: "leona_e"
            })
            void playVfx(E.impact,
                unitPt(target),
                [],
                TONE)
            void playVfx(LEONA_VFX.armor,
                unitPt(LEONA),
                [],
                TONE)
            landed?.()
        })
}

/** Địch gồng đòn: lá ngả về sau, khí tụ. Trả về hàm huỷ đòn: lá khựng lại, đòn gãy, không có cú trúng */
function windup(attacker: string, target: string) {
    const tone = STRIKE
    const from = unitPt(attacker), to = unitPt(target)
    const back = 26 / (Math.hypot(to.x - from.x,
        to.y - from.y) || 1)
    const lean = unitEl(attacker)?.animate([
        {
            transform: "translate(0, 0) scale(1)"
        },
        {
            transform: `translate(${(from.x - to.x) * back}px, ${(from.y - to.y) * back}px) scale(1.08)`
        }
    ],
    {
        duration: 520, easing: "ease-out", fill: "forwards"
    })
    let cancelled = false
    void playVfx(LEONA_VFX.windup,
        from,
        [to],
        {
            ...tone,
            tether: {
                target: () => unitPt(attacker), released: () => cancelled, contact() {}
            }
        })
    return () => {
        cancelled = true
        lean?.cancel()
        void playVfx(LEONA_VFX.fizzle,
            from,
            [to],
            tone)
    }
}

/** R: nắng vọt lên trời rồi cột nắng rơi xuống cả hàng; Máu, số và Choáng đều đáp trong một nhịp */
async function solarFlare(amount: number) {
    await opener(R.cast ?? "none",
        FLARE)
    await strike(R.travel,
        LEONA,
        ENEMIES,
        FLARE,
        () => {
            for (const id of ENEMIES) {
                landDamage(id,
                    amount,
                    "magic")
                stun(id,
                    "leona_r")
                void playVfx(R.impact,
                    unitPt(id),
                    [],
                    FLARE)
            }
        })
}

async function play(say: (text: string) => void) {
    say("Nội tại · Giáp Mặt Trời: vào bàn, giáp nắng vàng khoá lên, % Giáp cộng thêm")
    await enterBoard()
    await sleep(1400)

    say("Đánh thường · Leona: kiếm mặt trời")
    await basicAttack(LEONA,
        FACING,
        60)
    await sleep(800)

    say("Q · Khiên Bình Minh: khiên sáng đập Annie đối diện, sát thương vật lý và Choáng cùng một nhịp")
    await bash(FACING,
        120)
    await sleep(1700)
    clearStuns()

    say("E · Nhật Thực (Quick): chọn Lux, sát thương phép, Choáng, Leona nhận Giáp")
    await eclipse("B:lux",
        130)
    await sleep(1800)
    clearStuns()

    say("E · Nhật Thực (nối chuỗi): Garen gồng đòn đánh Ashe, Leona nối chuỗi")
    const fizzle = windup("B:garen",
        "A:ashe")
    await sleep(1000)
    await eclipse("B:garen",
        130,
        () => {
            say("Choáng huỷ đòn: đòn của Garen tan biến, Ashe không mất Máu")
            fizzle()
        })
    await sleep(2200)
    clearStuns()

    say("R · Thái Dương Giáng Thế: cột nắng từ trời rơi xuống cả hàng, sát thương phép và Choáng một nhịp")
    await solarFlare(170)
    await sleep(2200)
}

export async function runLeonaShowcase(say: (text: string) => void) {
    openHits()
    try {
        await play(say)
    } finally {
        closeHits()
    }
}
