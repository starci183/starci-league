// Demo VFX đủ bộ chiêu Viktor theo đặc tả mới, phát trên vị trí tướng thật của bàn 5 tướng. Chỉ là hình ảnh: không gọi engine, không đổi trạng thái trận.
// Demo chỉ là nơi xem: tên hiệu ứng lấy từ heroMap. Mỗi chiêu một nhịp; lá bỏ là ô bài thật trên tay, ẩn đi lúc tan và trả lại khi demo kết thúc.
import type {
    cg
} from "@starci/shared"
import {
    landImpacts, queueImpacts
} from "../../anim/impacts"
import {
    unitPt
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
import type {
    Pt
} from "../types"
import {
    basicAttack, strike
} from "./renataShowcase"
import {
    closeHits, landDamage, landShield, openHits
} from "./showcaseHits"

const P = skillVfx("viktor",
    "p")
const Q = skillVfx("viktor",
    "q")
const E = skillVfx("viktor",
    "e")
const R = skillVfx("viktor",
    "r")
const toneOf = (v: typeof Q, amount?: number) => ({
    color: v.color, color2: v.color2, intensity: v.intensity, amount
})
const VIKTOR = "A:viktor"
const ENEMIES = ["B:garen",
    "B:leona",
    "B:annie",
    "B:jinx",
    "B:lux"]
/** Sát thương cộng thêm trên mỗi Tiến Hoá */
const PER_EVOLVE = 6
const CARD_GAP_MS = 70

const hidden = new Set<HTMLElement>()
let evolve = 0

function land(e: cg.GameEvent) {
    queueImpacts([e])
    landImpacts([e])
    applyToDisplay([e])
}

/** Đòn trúng Khiên: số nổi và Khiên giảm, Máu giữ nguyên */
function landBlocked(id: string, amount: number, kind: cg.DamageKind) {
    const u = getCard().view?.units[id]
    if (!u) return
    land({
        t: "damage", target: id, amount, hpLost: 0, absorbed: amount, kind, tag: "skill", hp: u.hp
    })
}

function restoreCards() {
    for (const slot of hidden) slot.style.visibility = ""
    hidden.clear()
}

/** Lấy n ô bài thật trên tay, ẩn đi và trả về vị trí cùng ảnh; hết lá thì trả lại cả tay để demo chạy tiếp */
function takeCards(n: number) {
    const free = () => [...document.querySelectorAll<HTMLElement>(".hd-fan .hd-slot")].filter(slot => !hidden.has(slot))
    if (free().length < n) restoreCards()
    return free().slice(-n).map((slot) => {
        const r = slot.getBoundingClientRect()
        const art = slot.querySelector<HTMLImageElement>(".cv-art")?.src
        slot.style.visibility = "hidden"
        hidden.add(slot)
        return {
            at: {
                x: r.left + r.width / 2, y: r.top + r.height / 2
            } as Pt, art
        }
    })
}

/** Bỏ n lá: từng lá tan thành mảnh thép bay vào Viktor; mảnh chạm là Tiến Hoá tăng */
async function discard(n: number) {
    const tone = toneOf(P)
    await Promise.all(takeCards(n).map(async (card, i) => {
        await sleep(i * CARD_GAP_MS)
        await new Promise<void>((resolve) => {
            void playVfx(P.cast ?? "none",
                unitPt(VIKTOR),
                [card.at],
                {
                    ...tone, icon: card.art,
                    onBeat() {
                        evolve += 1
                        applyToDisplay([{
                            t: "stack", unit: VIKTOR, key: "evolve", value: evolve
                        }])
                        void playVfx(P.impact,
                            unitPt(VIKTOR),
                            [],
                            {
                                ...tone, amount: evolve
                            })
                        resolve()
                    }
                }).finally(resolve)
        })
    }))
}

/** Q: lá tan, khiên mảnh tụ, đạn mảnh nổ ra; chạm là mục tiêu mất máu và Viktor có Khiên cùng lúc */
async function siphon(target: string, cards: number) {
    await discard(cards)
    const tone = toneOf(Q,
        evolve)
    await strike(Q.travel,
        VIKTOR,
        [target],
        tone,
        () => {
            landDamage(target,
                80 + evolve * PER_EVOLVE,
                "magic")
            landShield(VIKTOR,
                cards * 50)
            void playVfx(Q.impact,
                unitPt(target),
                [],
                tone)
            void playVfx(Q.shield ?? "none",
                unitPt(VIKTOR),
                [],
                tone)
        })
}

async function deathRay() {
    const tone = toneOf(E,
        evolve)
    const row = ENEMIES.map(id => unitPt(id))
    await playVfx(E.cast ?? "none",
        unitPt(VIKTOR),
        [row[2]],
        tone)
    await strike(E.travel,
        VIKTOR,
        ENEMIES,
        tone,
        () => {
            for (const id of ENEMIES) {
                landDamage(id,
                    90 + evolve * PER_EVOLVE,
                    "magic")
                void playVfx(E.impact,
                    unitPt(id),
                    [],
                    tone)
            }
        })
}

/** Tướng địch còn nhiều Máu nhất ngay lúc trường sụp */
function healthiest() {
    const units = getCard().view?.units
    return ENEMIES.reduce((best, id) => (units?.[id]?.hp ?? 0) > (units?.[best]?.hp ?? 0) ? id : best)
}

async function gravityField() {
    const tone = toneOf(R,
        evolve)
    await strike(R.cast ?? "none",
        VIKTOR,
        ENEMIES,
        tone,
        () => {
            const stunned = healthiest()
            for (const id of ENEMIES) {
                landDamage(id,
                    120 + evolve * PER_EVOLVE,
                    "magic")
                void playVfx(R.impact,
                    unitPt(id),
                    [],
                    tone)
            }
            land({
                t: "status", target: stunned, id: "stun", turns: 1, v: 1, src: VIKTOR, card: "viktor_r"
            })
            void playVfx(R.extra ?? "none",
                unitPt(stunned),
                [],
                tone)
        })
}

export async function runViktorShowcase(say: (text: string) => void) {
    evolve = 0
    openHits()
    try {
        await play(say)
    } finally {
        restoreCards()
        closeHits()
    }
}

async function play(say: (text: string) => void) {
    say("Đánh thường · Viktor: tia hextech gây sát thương phép")
    await basicAttack(VIKTOR,
        "B:annie",
        50)
    await sleep(800)

    say("Nội tại · Tiến Hoá Vinh Quang: lá bị bỏ tan thành mảnh thép, bay vào Viktor, +1 Tiến Hoá, không giới hạn")
    await discard(1)
    await sleep(1100)

    say("Q · Tháo Rời (Quick): bỏ 2 lá, khiên mảnh tụ lại, đạn mảnh trúng Leona, Khiên theo số lá bỏ")
    await siphon("B:leona",
        2)
    await sleep(1400)

    say(`E · Tia Tử Thần: ${evolve} Tiến Hoá, tia quét ngang cả hàng, vệt quét nổ dư chấn, sát thương phép cùng một nhịp`)
    await deathRay()
    await sleep(1400)

    say("Q · Tháo Rời (nối chuỗi): Jinx nhắm Viktor, Viktor bỏ 3 lá, khiên dựng trước, đạn mảnh đánh trả Jinx")
    // Jinx đang gồng đòn; mắt xích sau giải quyết trước nên khiên dựng và đạn mảnh bay trước đạn của Jinx
    const jinx = heroBasicVfx("jinx")
    const jinxTone = {
        color: jinx.color, color2: jinx.color2
    }
    void playVfx("spellCast",
        unitPt("B:jinx"),
        [],
        jinxTone)
    await sleep(520)
    await siphon("B:jinx",
        3)
    await sleep(420)
    await strike(jinx.travel,
        "B:jinx",
        [VIKTOR],
        jinxTone,
        () => {
            landBlocked(VIKTOR,
                80,
                "physical")
            void playVfx(Q.block ?? "none",
                unitPt(VIKTOR),
                [unitPt("B:jinx")],
                toneOf(Q))
        })
    await sleep(1300)

    say(`R · Trường Trọng Lực: ${evolve} Tiến Hoá, bụi và mảnh vụn bị hút vào, trường sụp; tướng nhiều Máu nhất Choáng cùng nhịp`)
    await gravityField()
    await sleep(1800)
}
