// Demo VFX đủ bộ chiêu Brand theo đặc tả mới, phát trên vị trí tướng thật của bàn 5 tướng. Chỉ là hình ảnh: không gọi engine, không đổi trạng thái trận.
// Demo chỉ là nơi xem: tên hiệu ứng lấy từ heroMap. Mỗi chiêu một nhịp: mở màn trước, rồi một khoảnh khắc trúng duy nhất nơi VFX, trừ máu, số nổi, Bỏng, Choáng cùng đáp.
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
    BRAND_AURA_MS
} from "../fx_brand"
import {
    BRAND_BURN_SHED, skillVfx
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

const Q = skillVfx("brand",
    "q")
const E = skillVfx("brand",
    "e")
const R = skillVfx("brand",
    "r")
const P = skillVfx("brand",
    "p")
const TONE = {
    color: Q.color, color2: Q.color2
}
const BRAND = "A:brand"
const ENEMIES = ["B:garen",
    "B:leona",
    "B:renata",
    "B:jinx",
    "B:lux"]
/** Mỗi tầng Bỏng: % Máu hiện tại và % Máu tối đa, sát thương phép */
const TICK_CURRENT = .03
const TICK_MAX = .012

const land = (e: cg.GameEvent) => {
    queueImpacts([e])
    landImpacts([e])
    applyToDisplay([e])
}
const unit = (id: string) => getCard().view?.units[id]

/** Tầng Bỏng đang bám từng tướng; vòng lặp aura đọc từ đây để lửa lớn dần */
const burns = new Map<string, number>()
let falls: Animation[] = []

function setBurn(id: string, stacks: number, card = "brand_q") {
    burns.set(id,
        stacks)
    land({
        t: "status", target: id, id: "burn", turns: 1, v: stacks, src: BRAND, card
    })
    if (stacks > 0) flare(id)
}

/** Một lượt bám lửa tại tướng; gọi thêm ngay khi tầng tăng để lửa lớn cùng nhịp trúng */
const flare = (id: string) => void playVfx(P.cast ?? "none",
    unitPt(id),
    [],
    {
        ...TONE, amount: burns.get(id)
    })

async function auraLoop(alive: () => boolean) {
    while (alive()) {
        for (const id of burns.keys()) flare(id)
        await sleep(BRAND_AURA_MS)
    }
}

/** Lượng Bỏng cháy của một tướng */
function tickAmount(id: string) {
    const u = unit(id)
    const stacks = burns.get(id) ?? 0
    return u ? Math.round(stacks * (u.hp * TICK_CURRENT + u.maxHp * TICK_MAX)) : 0
}

/** Bỏng cháy một lần tại nạn nhân, không bắn đạn mới từ Brand */
function burnOnce(id: string) {
    landDamage(id,
        tickAmount(id),
        "magic")
    void playVfx(P.extra ?? "none",
        unitPt(id),
        [],
        {
            ...TONE, amount: burns.get(id)
        })
}

/** Tướng gục: máu về 0, KO nổi, lá xám xuống. Bản hiển thị của demo không có đường chết thật nên làm tối lá ngay trên DOM và trả lại khi hết demo */
function fall(id: string, amount: number) {
    const u = unit(id)
    if (!u) return
    land({
        t: "damage", target: id, amount, hpLost: u.hp, absorbed: 0, kind: "magic", tag: "skill", hp: 0
    })
    const ko: cg.GameEvent = {
        t: "kill", src: BRAND, target: id
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
    if (anim) falls.push(anim)
}

export async function runBrandShowcase(say: (text: string) => void) {
    openHits()
    burns.clear()
    falls = []
    let alive = true
    void auraLoop(() => alive)
    try {
        await play(say)
    } finally {
        alive = false
        for (const anim of falls) anim.cancel()
        burns.clear()
        closeHits()
    }
}

/** Q: mở màn tại Brand, cầu lửa chạm là kết quả ra cùng lúc */
async function thieuRui(target: string, land: () => void) {
    await playVfx(Q.cast ?? "none",
        unitPt(BRAND),
        [],
        TONE)
    await strike(Q.travel,
        BRAND,
        [target],
        TONE,
        () => {
            land()
            void playVfx(Q.impact,
                unitPt(target),
                [],
                TONE)
        })
}

async function play(say: (text: string) => void) {
    say("Đánh thường · Brand: cầu lửa")
    await basicAttack(BRAND,
        "B:jinx",
        60)
    await sleep(700)

    say("Q · Thiêu Rụi: chạm Garen là sát thương phép và Bỏng cùng lúc. 2,26 Bỏng = 2 tầng và 26% thêm 1")
    await thieuRui("B:garen",
        () => {
            landDamage("B:garen",
                120,
                "magic")
            setBurn("B:garen",
                2)
        })
    await sleep(1400)

    say("E · Rải Lửa: lửa tràn cả hàng địch, sát thương và Bỏng đáp cùng lúc")
    await new Promise<void>((resolve) => {
        void playVfx(E.cast ?? "none",
            unitPt(BRAND),
            ENEMIES.map(id => unitPt(id)),
            {
                ...TONE,
                onBeat() {
                    for (const id of ENEMIES) {
                        landDamage(id,
                            80,
                            "magic")
                        setBurn(id,
                            (burns.get(id) ?? 0) + 2,
                            "brand_e")
                        void playVfx(E.impact,
                            unitPt(id),
                            [],
                            TONE)
                    }
                    resolve()
                }
            }).finally(resolve)
    })
    await sleep(1700)

    say("Q · Thiêu Rụi: Garen đã đủ Bỏng, sát thương, thêm Bỏng và Choáng cùng một nhịp")
    await thieuRui("B:garen",
        () => {
            landDamage("B:garen",
                120,
                "magic")
            setBurn("B:garen",
                (burns.get("B:garen") ?? 0) + 2)
            land({
                t: "status", target: "B:garen", id: "stun", turns: 1, v: 1, src: BRAND, card: "brand_q"
            })
            void playVfx(Q.extra ?? "none",
                unitPt("B:garen"),
                [],
                TONE)
        })
    await sleep(1600)

    say("Nội tại · Hoả Lực: đầu lượt địch, mỗi tầng Bỏng cháy theo % Máu hiện tại và % Máu tối đa")
    for (const id of ENEMIES) burnOnce(id)
    await sleep(1800)

    say("R · Bão Lửa: toàn địch trúng phép, Bỏng nhân đôi và cháy ngay một lần")
    await new Promise<void>((resolve) => {
        void playVfx(R.cast ?? "none",
            unitPt(BRAND),
            ENEMIES.map(id => unitPt(id)),
            {
                ...TONE, intensity: R.intensity,
                onBeat() {
                    for (const id of ENEMIES) {
                        landDamage(id,
                            110,
                            "magic")
                        setBurn(id,
                            (burns.get(id) ?? 0) * 2,
                            "brand_r")
                        landDamage(id,
                            tickAmount(id),
                            "magic")
                        void playVfx(R.impact,
                            unitPt(id),
                            [],
                            {
                                ...TONE, intensity: R.intensity, amount: burns.get(id)
                            })
                    }
                    resolve()
                }
            }).finally(resolve)
    })
    await sleep(2200)

    say("Luật chết: Lux gục, mất một nửa Bỏng. Nửa tàn lửa tản đi, nửa còn lại vẫn bám")
    const before = burns.get("B:lux") ?? 0
    await strike(Q.travel,
        BRAND,
        ["B:lux"],
        TONE,
        () => {
            fall("B:lux",
                120)
            setBurn("B:lux",
                before / 2)
            void playVfx(BRAND_BURN_SHED,
                unitPt("B:lux"),
                [],
                {
                    ...TONE, amount: before / 2
                })
        })
    await sleep(2000)

    say("Brand gục không đổi gì: Bỏng trên địch vẫn cháy nguyên")
    fall(BRAND,
        60)
    await sleep(1800)
}
