// Demo VFX đủ bộ chiêu Vel'Koz theo đặc tả mới, phát trên vị trí tướng thật của bàn 5 tướng. Chỉ là hình ảnh: không gọi engine, không đổi trạng thái trận.
// Demo chỉ là nơi xem: tên hiệu ứng lấy từ heroMap. Mỗi chiêu một nhịp; Q có hai cú trúng vì tia tách "sau đó", E có nhịp cuối lượt, R mỗi tia một số.
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
    VELKOZ_MARK_MS, VELKOZ_RAY_GAP_MS, VELKOZ_RAY_HIT_MS
} from "../fx_velkoz"
import {
    VELKOZ_DECAY_MAX, VELKOZ_RIFT_LINGER, heroBasicVfx, skillVfx
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

const Q = skillVfx("velkoz",
    "q")
const E = skillVfx("velkoz",
    "e")
const R = skillVfx("velkoz",
    "r")
const P = skillVfx("velkoz",
    "p")
const TONE = {
    color: Q.color, color2: Q.color2
}
const VELKOZ = "A:velkoz"
const DECAY_KEY = "velkoz_decay"
/** Sát thương chuẩn khi Phân Rã nổ */
const DECAY_DAMAGE = 60
/** Sáu tia R, số tăng theo Máu đã mất */
const RAY_DAMAGE = [22,
    25,
    29,
    33,
    37,
    42]

const unit = (id: string) => getCard().view?.units[id]
const land = (e: cg.GameEvent) => {
    queueImpacts([e])
    landImpacts([e])
    applyToDisplay([e])
}

/** Phân Rã đang bám từng tướng; vòng lặp dấu đọc từ đây */
const marks = new Map<string, number>()
let falls: Animation[] = []

const flare = (id: string) => void playVfx(P.cast ?? "none",
    unitPt(id),
    [],
    {
        ...TONE, amount: marks.get(id)
    })

function setDecay(id: string, stacks: number) {
    marks.set(id,
        stacks)
    applyToDisplay([{
        t: "stack", unit: id, key: DECAY_KEY, value: stacks
    }])
    if (stacks > 0) flare(id)
}

/** Một tia trúng: +1 Phân Rã, đủ tầng thì cả lá rã và sát thương chuẩn trắng đáp ngay */
function addDecay(id: string) {
    const next = (marks.get(id) ?? 0) + 1
    if (next < VELKOZ_DECAY_MAX) {
        setDecay(id,
            next)
        return
    }
    setDecay(id,
        0)
    landDamage(id,
        DECAY_DAMAGE,
        "true")
    void playVfx(P.impact,
        unitPt(id),
        [],
        TONE)
}

async function markLoop(alive: () => boolean) {
    while (alive()) {
        for (const [id,
            stacks] of marks) if (stacks > 0) flare(id)
        await sleep(VELKOZ_MARK_MS)
    }
}

/** Q: mũi plasma chạm mục tiêu chính, tia tách ngay tại đó sang tướng thứ hai */
async function fission(main: string, side: string, mainHit: number, sideHit: number) {
    await playVfx(Q.cast ?? "none",
        unitPt(VELKOZ),
        [],
        TONE)
    await strike(Q.travel,
        VELKOZ,
        [main],
        TONE,
        () => {
            landDamage(main,
                mainHit,
                "magic")
            void playVfx(Q.impact,
                unitPt(main),
                [],
                TONE)
            addDecay(main)
        })
    await strike(Q.extra ?? "none",
        main,
        [side],
        TONE,
        () => {
            landDamage(side,
                sideHit,
                "magic")
            void playVfx(Q.impact,
                unitPt(side),
                [],
                {
                    ...TONE, intensity: .8
                })
            addDecay(side)
        })
}

/** E nhịp đầu: khe lan tới mục tiêu, sập là trúng; khe còn nằm trên lá tới cuối lượt */
function riftOpen(target: string, amount: number, tether: { target(): ReturnType<typeof unitPt>; released(): boolean; contact(): void }) {
    return strike(E.travel,
        VELKOZ,
        [target],
        TONE,
        () => {
            landDamage(target,
                amount,
                "magic")
            void playVfx(E.impact,
                unitPt(target),
                [],
                TONE)
            addDecay(target)
            void playVfx(VELKOZ_RIFT_LINGER,
                unitPt(target),
                [],
                {
                    ...TONE, tether
                })
        })
}

/** E nhịp cuối lượt: khe rách lại rồi sập, một nhịp trúng riêng */
function riftClose(target: string, amount: number) {
    return strike(E.extra ?? "none",
        target,
        [],
        TONE,
        () => {
            landDamage(target,
                amount,
                "magic")
            void playVfx(E.impact,
                unitPt(target),
                [],
                {
                    ...TONE, amount: 2
                })
            addDecay(target)
        })
}

/** R: tụ ở con mắt, tia nền chạy suốt, mỗi tia một số; Phân Rã nổ ngay giữa luồng */
async function ray(target: string) {
    await playVfx(R.cast ?? "none",
        unitPt(VELKOZ),
        [],
        {
            ...TONE, intensity: R.intensity
        })
    const beam = playVfx(R.extra ?? "none",
        unitPt(VELKOZ),
        [unitPt(target)],
        {
            ...TONE, intensity: R.intensity, amount: RAY_DAMAGE.length
        })
    for (const amount of RAY_DAMAGE) {
        await strike(R.travel,
            VELKOZ,
            [target],
            TONE,
            () => {
                landDamage(target,
                    amount,
                    "magic")
                void playVfx(R.impact,
                    unitPt(target),
                    [],
                    TONE)
                addDecay(target)
            })
        await sleep(VELKOZ_RAY_GAP_MS - VELKOZ_RAY_HIT_MS)
    }
    await beam
}

/** Tướng gục: bản hiển thị của demo không có đường chết thật nên làm tối lá ngay trên DOM và trả lại khi hết demo */
function fall(id: string, amount: number) {
    const u = unit(id)
    if (!u) return
    land({
        t: "damage", target: id, amount, hpLost: u.hp, absorbed: 0, kind: "physical", tag: "skill", hp: 0
    })
    const ko: cg.GameEvent = {
        t: "kill", src: VELKOZ, target: id
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

export async function runVelkozShowcase(say: (text: string) => void) {
    openHits()
    marks.clear()
    falls = []
    let alive = true
    void markLoop(() => alive)
    try {
        await play(say)
    } finally {
        alive = false
        for (const anim of falls) anim.cancel()
        marks.clear()
        closeHits()
    }
}

async function play(say: (text: string) => void) {
    say("Đánh thường · Vel'Koz: xung plasma, không tích Phân Rã")
    await basicAttack(VELKOZ,
        "B:lux",
        60)
    await sleep(800)

    say("Q · Phân Hạch Plasma: chạm Garen, tia tách đôi ngay tại đó sang Leona. Mỗi tia 1 Phân Rã")
    await fission("B:garen",
        "B:leona",
        110,
        60)
    await sleep(1500)

    say("Nội tại · Phân Rã: mỗi tầng thêm một cụm plasma lượn quanh lá, bụi rã bong dày hơn")
    await fission("B:garen",
        "B:jinx",
        110,
        60)
    await sleep(1800)

    say("E · Khe Nứt Hư Không: khe lan tới Leona, sập là sát thương phép. Phân Rã 2")
    let closed = false
    const tether = {
        target: () => unitPt("B:leona"), released: () => closed, contact() {}
    }
    await riftOpen("B:leona",
        80,
        tether)
    await sleep(1300)

    say("Cuối lượt · Khe rách lại trên Leona lần nữa: đủ 3 Phân Rã, nổ sát thương chuẩn trắng")
    await sleep(500)
    closed = true
    await riftClose("B:leona",
        80)
    await sleep(1700)

    say("R · Tia Phân Rã Sự Sống: tụ ở con mắt, sáu tia vào Annie, số tăng theo Máu đã mất")
    await ray("B:annie")
    await sleep(1700)

    say("Luật chết: Garen gục, mất một nửa Phân Rã. Nửa còn lại vẫn bám")
    const before = marks.get("B:garen") ?? 0
    const style = heroBasicVfx("velkoz")
    await strike(style.travel,
        VELKOZ,
        ["B:garen"],
        {
            color: style.color, color2: style.color2
        },
        () => {
            fall("B:garen",
                120)
            setDecay("B:garen",
                before / 2)
            void playVfx(P.extra ?? "none",
                unitPt("B:garen"),
                [],
                {
                    ...TONE, amount: before / 2
                })
        })
    await sleep(2200)
}
