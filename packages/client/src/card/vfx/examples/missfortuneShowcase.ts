// Demo VFX đủ bộ chiêu Miss Fortune theo đặc tả mới, phát trên vị trí tướng thật của bàn 5 tướng. Chỉ là hình ảnh: không gọi engine, không đổi trạng thái trận.
// Demo chỉ là nơi xem: tên hiệu ứng lấy từ heroMap. Mỗi chiêu một nhịp; đạn nảy chạm là nảy tiếp, R là nhiều loạt nên mỗi loạt một cú trúng.
import {
    unitPt
} from "../../anim/helpers"
import {
    playVfx
} from "../VfxCanvas"
import {
    skillVfx
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

const Q = skillVfx("missfortune",
    "q")
const E = skillVfx("missfortune",
    "e")
const R = skillVfx("missfortune",
    "r")
const P = skillVfx("missfortune",
    "p")
const tone = (style: typeof Q) => ({
    color: style.color, color2: style.color2
})
const MF = "A:missfortune"
const ENEMIES = ["B:garen",
    "B:leona",
    "B:annie",
    "B:jinx",
    "B:lux"]
/** Số loạt R trong demo: r1 + r2·Tốc Đánh, loạt cuối chí mạng */
const VOLLEYS = 6
const VOLLEY_GAP_MS = 360
const VOLLEY_HIT = 34
const VOLLEY_CRIT = 72
/** Thời hạn E tính theo đơn vị: demo giữ dấu cháy qua đòn của đồng minh */
const RAIN_DAMAGE = 38
const RAIN_BONUS_HIT = 62

/** Nội tại: đòn chạm là đạn nảy tiếp sang địch khác, không dừng */
async function bounce(from: string, to: string, amount: number) {
    await strike(P.travel,
        from,
        [to],
        tone(P),
        () => {
            landDamage(to,
                amount,
                "physical")
            void playVfx(P.impact,
                unitPt(to),
                [],
                tone(P))
        })
}

/** Q: đạn gang tới mục tiêu chính, chạm là nảy sang 2 địch khác */
async function doubleUp(target: string, others: string[], amount: number, bounced: number, crit: boolean) {
    const look = {
        ...tone(Q), amount: crit ? 1 : 0
    }
    await strike(Q.cast ?? "none",
        MF,
        [],
        look,
        () => {})
    await strike(Q.travel,
        MF,
        [target],
        look,
        () => {
            landDamage(target,
                amount,
                "physical")
            void playVfx(Q.impact,
                unitPt(target),
                [],
                look)
        })
    await Promise.all(others.map(id => strike(Q.extra ?? "none",
        target,
        [id],
        look,
        () => {
            landDamage(id,
                bounced,
                "physical")
            void playVfx(Q.impact,
                unitPt(id),
                [],
                {
                    ...look, intensity: .8
                })
        })))
}

/** E: vết cháy ở lại trên mọi địch, phe bạn đánh vào đau hơn */
function scorchAll() {
    let ended = false
    const look = tone(E)
    for (const id of ENEMIES) void playVfx(E.extra ?? "none",
        unitPt(id),
        [],
        {
            ...look,
            tether: {
                target: () => unitPt(id), released: () => ended, contact() {}
            }
        })
    return () => { ended = true }
}

async function makeItRain() {
    const look = tone(E)
    await strike(E.cast ?? "none",
        MF,
        [],
        look,
        () => {})
    await strike(E.travel,
        MF,
        ENEMIES,
        look,
        () => {
            for (const id of ENEMIES) {
                landDamage(id,
                    RAIN_DAMAGE,
                    "physical")
                void playVfx(E.impact,
                    unitPt(id),
                    [],
                    look)
            }
        })
}

async function bulletTime() {
    const look = {
        ...tone(R), intensity: 1
    }
    await strike(R.cast ?? "none",
        MF,
        [ENEMIES[2]],
        tone(R),
        () => {})
    for (let i = 0; i < VOLLEYS; i++) {
        const crit = i === VOLLEYS - 1
        const shot = {
            ...look, amount: crit ? 1 : 0
        }
        await Promise.all([
            sleep(VOLLEY_GAP_MS),
            strike(R.travel,
                MF,
                ENEMIES,
                shot,
                () => {
                    for (const id of ENEMIES) {
                        landDamage(id,
                            crit ? VOLLEY_CRIT : VOLLEY_HIT,
                            "physical")
                        void playVfx(R.impact,
                            unitPt(id),
                            [],
                            shot)
                    }
                })
        ])
    }
}

async function play(say: (text: string) => void) {
    say("Đánh thường · Nội tại Song Súng: đạn trúng Annie, nảy sang Jinx với một phần sát thương")
    await basicAttack(MF,
        "B:annie",
        44)
    await bounce("B:annie",
        "B:jinx",
        26)
    await sleep(1000)

    say("Đánh thường · Mỗi đòn đều nảy: trúng Garen, nảy sang Leona")
    await basicAttack(MF,
        "B:garen",
        44)
    await bounce("B:garen",
        "B:leona",
        26)
    await sleep(1000)

    say("Q · Bắn Nảy: đạn gang trúng Annie, chạm là nảy sang 2 địch khác, Garen và Lux")
    await doubleUp("B:annie",
        ["B:garen",
            "B:lux"],
        64,
        38,
        false)
    await sleep(1050)

    say("Q · Bắn Nảy chí mạng: trúng Jinx, lửa trắng vàng, nảy sang Leona và Lux")
    await doubleUp("B:jinx",
        ["B:leona",
            "B:lux"],
        128,
        76,
        true)
    await sleep(1050)

    say("E · Mưa Đạn: hai súng xả lên trời, đạn trút xuống toàn hàng địch")
    await makeItRain()
    const release = scorchAll()
    await sleep(1500)

    say("E · Sau Mưa Đạn: phe bạn gây thêm sát thương lên địch đang cháy âm ỉ, Ashe bắn Garen")
    await basicAttack("A:ashe",
        "B:garen",
        RAIN_BONUS_HIT)
    await sleep(1100)
    release()

    say("R · Đạn Tử Thần: đứng vững, hai nòng nóng đỏ")
    await bulletTime()
    await sleep(1600)
}

export async function runMissFortuneShowcase(say: (text: string) => void) {
    openHits()
    try {
        await play(say)
    } finally {
        closeHits()
    }
}
