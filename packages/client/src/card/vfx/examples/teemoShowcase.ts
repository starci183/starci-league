// Demo VFX đủ bộ chiêu Teemo theo đặc tả mới, phát trên vị trí tướng thật của bàn 5 tướng. Chỉ là hình ảnh: không gọi engine, không đổi trạng thái trận.
// Demo chỉ là nơi xem: tên hiệu ứng lấy từ heroMap. Mỗi chiêu một nhịp; riêng R là loạt Nấm, mỗi Nấm trúng đúng lúc chạm.
import type {
    cg
} from "@starci/shared"
import {
    landImpacts, queueImpacts
} from "../../anim/impacts"
import {
    deckPt, handPt, unitEl, unitPt
} from "../../anim/helpers"
import {
    applyToDisplay, getCard
} from "../../store"
import {
    playVfx
} from "../VfxCanvas"
import {
    LEONA_VFX, TEEMO_VFX, skillVfx
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

const Q = skillVfx("teemo",
    "q")
const E = skillVfx("teemo",
    "e")
const R = skillVfx("teemo",
    "r")
const P = skillVfx("teemo",
    "p")
const TONE = {
    color: Q.color, color2: Q.color2
}
const DART = {
    color: E.color, color2: E.color2
}
const STRIKE = {
    color: 0xff4a32, color2: 0xffc9a8
}
const TEEMO = "A:teemo"
const ENEMIES = ["B:garen",
    "B:leona",
    "B:annie",
    "B:jinx",
    "B:lux"]
const MUSHROOM: cg.Card = {
    kind: "special", id: "mushroom", hero: "teemo", side: "B"
} as cg.Card
/** Khoảng cách giữa các Nấm trong chuỗi R */
const STRING_GAP_MS = 300
/** Chuỗi R: Nấm nào chí mạng */
const STRING = [false,
    true,
    false,
    false,
    true]

const unit = (id: string) => getCard().view?.units[id]
const foeDeck = () => deckPt("B",
    "A")

function land(e: cg.GameEvent) {
    queueImpacts([e])
    landImpacts([e])
    applyToDisplay([e])
}

/** Tướng địch tỉ lệ Máu thấp nhất tại đúng lúc Nấm nổ */
const lowestHp = () => [...ENEMIES].sort((a, b) => {
    const ua = unit(a), ub = unit(b)
    return (ua ? ua.hp / ua.maxHp : 1) - (ub ? ub.hp / ub.maxHp : 1)
})[0]

/** Sát thương Nấm: vật lý, chí mạng hiện dấu riêng, theo % Máu tối đa để Máu tụt rõ */
function landBlast(id: string, crit: boolean) {
    const u = unit(id)
    if (!u) return
    if (!crit) {
        landDamage(id,
            Math.round(u.maxHp * .06),
            "physical")
        return
    }
    const amount = Math.round(u.maxHp * .12)
    const hpLost = Math.min(amount,
        u.hp - 1)
    land({
        t: "damage", target: id, amount, hpLost, absorbed: 0, kind: "physical", tag: "skill", hp: u.hp - hpLost, crit: true
    } as cg.GameEvent)
}

/** Nấm chui vào bộ đối thủ; số trên ô Bộ bài tăng khi chạm */
function plant(count: number) {
    return new Promise<void>((resolve) => {
        void playVfx(P.impact,
            unitPt(TEEMO),
            [foeDeck()],
            {
                ...TONE,
                amount: count,
                onBeat() {
                    for (let i = 0; i < count; i++) applyToDisplay([{
                        t: "create", side: "B", card: MUSHROOM, zone: "deck"
                    }])
                    resolve()
                }
            }).finally(resolve)
    })
}

/** Một Nấm bật khỏi bộ, nổ lên tướng tỉ lệ Máu thấp nhất đúng lúc chạm */
function blast(crit: boolean) {
    const target = lowestHp()
    return new Promise<void>((resolve) => {
        void playVfx(TEEMO_VFX.burst,
            foeDeck(),
            [unitPt(target)],
            {
                ...TONE,
                intensity: crit ? 2 : 1,
                onBeat() {
                    landBlast(target,
                        crit)
                    resolve()
                }
            }).finally(resolve)
    })
}

/** Hiệu ứng mở màn rồi đi tiếp ngay ở ctx.onBeat, không chờ đuôi hạt tan */
const opener = (name: string, to: { x: number; y: number }[], tone: Parameters<typeof playVfx>[3]) => new Promise<void>((resolve) => {
    void playVfx(name,
        unitPt(TEEMO),
        to,
        {
            ...tone, onBeat: resolve
        }).finally(resolve)
})

/** Đánh thường trúng là nội tại xáo Nấm ngay */
async function attackPlants(target: string) {
    await basicAttack(TEEMO,
        target,
        40)
    await plant(1)
}

/** Q: Nấm nổ trên mục tiêu đúng lúc các Nấm khác chui vào bộ đối thủ, cùng một nhịp */
async function setTrap(target: string, amount: number, planted: number) {
    await opener(Q.cast ?? "none",
        [],
        TONE)
    void plant(planted)
    await strike(Q.travel,
        TEEMO,
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
        })
}

/** Rút trúng Nấm: Nấm nổ, rồi rút bù một lá */
async function drawMushroom() {
    applyToDisplay([{
        t: "drawAuto", side: "B", card: MUSHROOM
    }])
    await blast(true)
    await sleep(520)
    await new Promise<void>((resolve) => {
        void playVfx(TEEMO_VFX.redraw,
            foeDeck(),
            [handPt("B",
                "A")],
            {
                ...TONE,
                onBeat() {
                    applyToDisplay([{
                        t: "draw", side: "B", card: MUSHROOM, reason: "mushroom"
                    }])
                    resolve()
                }
            }).finally(resolve)
    })
}

/** Địch gồng đòn: lá ngả về sau, khí đỏ tụ ngay trên lá, không kéo vệt tới Teemo để phi tiêu đọc rõ. Trả về hàm huỷ đòn: lá khựng lại, đòn gãy, không có cú trúng */
function windup(attacker: string, target: string) {
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
    void playVfx("charge",
        from,
        [],
        STRIKE)
    return () => {
        lean?.cancel()
        void playVfx(LEONA_VFX.fizzle,
            from,
            [to],
            STRIKE)
    }
}

/** E: phi tiêu chạm là sát thương vật lý, Mù và hiệu ứng cùng đáp; `landed` để chuỗi huỷ đòn đúng nhịp đó */
async function blindingDart(target: string, amount: number, landed: () => void) {
    await strike(E.travel,
        TEEMO,
        [target],
        DART,
        () => {
            landDamage(target,
                amount,
                "physical")
            land({
                t: "status", target, id: "blind", turns: 1, v: 1, src: TEEMO, card: "teemo_e"
            })
            void playVfx(E.impact,
                unitPt(target),
                [],
                DART)
            landed()
        })
}

async function play(say: (text: string) => void) {
    const lux = unit("B:lux")
    if (lux) presetWound("B:lux",
        Math.round(lux.maxHp * .35))

    say("Đánh thường · Teemo: phi tiêu thổi. Nội tại Nấm Độc: mỗi đòn trúng xáo 1 Nấm vào bộ đối thủ")
    await attackPlants("B:annie")
    await attackPlants("B:garen")
    await sleep(700)

    say("Q · Gài Nấm: cây nấm nổ trên Annie, 3 Nấm cùng lúc chui vào bộ đối thủ")
    await setTrap("B:annie",
        70,
        3)
    await sleep(1200)

    say("Nội tại · Rút trúng Nấm: Nấm bật khỏi bộ, nổ chí mạng lên Lux, tướng tỉ lệ Máu thấp nhất")
    await drawMushroom()
    say("Nội tại · Rút trúng Nấm: rồi rút bù một lá")
    await sleep(1000)

    say("E · Phi Tiêu Mù (nối chuỗi): Jinx gồng đòn đánh Teemo, Teemo nối chuỗi")
    const fizzle = windup("B:jinx",
        TEEMO)
    await sleep(1000)
    await blindingDart("B:jinx",
        85,
        () => {
            say("E · Mù huỷ đòn đánh: sát thương theo số Nấm trong bộ, đòn của Jinx tan biến, Teemo không mất Máu")
            fizzle()
        })
    await sleep(1900)
    applyToDisplay([{
        t: "statusEnd", target: "B:jinx", id: "blind"
    }])

    say("R · Kích Nổ: tia độc lao vào bộ đối thủ, cả bộ rùng lên")
    await opener(R.cast ?? "none",
        [foeDeck()],
        {
            color: R.color, color2: R.color2, intensity: R.intensity
        })
    say("R · Kích Nổ: chuỗi Nấm phun khỏi bộ, nổ lên tướng tỉ lệ Máu thấp nhất, có thể chí mạng, không rút bù")
    await Promise.all(STRING.map((crit, i) => sleep(i * STRING_GAP_MS).then(() => {
        applyToDisplay([{
            t: "mushroom", phase: "burst", side: "B", source: TEEMO, count: 1
        } as cg.GameEvent])
        return blast(crit)
    })))
    await sleep(1600)
}

export async function runTeemoShowcase(say: (text: string) => void) {
    openHits()
    try {
        await play(say)
    } finally {
        closeHits()
    }
}
