// Demo VFX đủ bộ chiêu Tristana theo đặc tả mới, phát trên vị trí tướng thật của bàn 5 tướng. Chỉ là hình ảnh: không gọi engine, không đổi trạng thái trận.
// Demo chỉ là nơi xem: tên hiệu ứng lấy từ heroMap. Số Bom và số sát thương là số minh hoạ theo công thức p3·n·(1 + n/p4)·(1 + p5·AD). Mỗi chiêu một nhịp.
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
    TRISTANA_BOMB_ADD, TRISTANA_BOMB_SHED, heroBasicVfx, skillVfx
} from "../heroMap"
import {
    sleep
} from "../particles"
import {
    strike
} from "./renataShowcase"
import {
    closeHits, landDamage, openHits, presetWound
} from "./showcaseHits"

const Q = skillVfx("tristana",
    "q")
const E = skillVfx("tristana",
    "e")
const R = skillVfx("tristana",
    "r")
const P = skillVfx("tristana",
    "p")
const TONE = {
    color: P.color, color2: P.color2
}
const ULT = {
    color: R.color, color2: R.color2, intensity: R.intensity
}
const SHOT = heroBasicVfx("tristana")
const SHOT_TONE = {
    color: SHOT.color, color2: SHOT.color2
}
const TRISTANA = "A:tristana"
const ENEMIES = ["B:garen",
    "B:leona",
    "B:annie",
    "B:jinx",
    "B:lux"]
const BOMB = "tri_bomb"
const RAPID = "tri_q"
/** e1: số Bom một lá E gắn */
const E_BOMBS = 2
/** r3: phần vụ nổ các tướng địch khác nhận */
const R_SPLASH = .4
const R_DAMAGE = 150
const SHOT_DAMAGE = 40
const RAPID_GAP_MS = 240

/** p3·n·(1 + n/p4)·(1 + p5·AD) với p3 = 10, p4 = 8, phần AD = 1.4 */
const blastDamage = (n: number) => Math.round(10 * n * (1 + n / 8) * 1.4)

const land = (e: cg.GameEvent) => {
    queueImpacts([e])
    landImpacts([e])
    applyToDisplay([e])
}

interface Mark { n: number; live: boolean }
/** Bom đang gắn: mỗi lần đổi số Bom là một quả mới, quả cũ biến cùng khung hình */
const marks = new Map<string, Mark>()
let falls: Animation[] = []

const bombsOn = (id: string) => marks.get(id)?.n ?? 0

function showMark(id: string, mark: Mark) {
    if (!mark.live) return
    void playVfx(P.cast ?? "none",
        unitPt(id),
        [],
        {
            ...TONE, amount: mark.n, tether: {
                target: () => unitPt(id), released: () => !mark.live, contact() {}
            }
        }).then(() => showMark(id,
        mark))
}

function setBombs(id: string, n: number) {
    const old = marks.get(id)
    if (old) old.live = false
    marks.delete(id)
    if (n <= 0) {
        applyToDisplay([{
            t: "statusEnd", target: id, id: BOMB
        }])
        return
    }
    const mark = {
        n, live: true
    }
    marks.set(id,
        mark)
    applyToDisplay([{
        t: "status", target: id, id: BOMB, turns: 99, v: n, src: TRISTANA
    }])
    showMark(id,
        mark)
}

function addBombs(id: string, count: number) {
    const n = bombsOn(id) + count
    setBombs(id,
        n)
    void playVfx(TRISTANA_BOMB_ADD,
        unitPt(id),
        [],
        {
            ...TONE, amount: n
        })
}

/** Nổ tại chỗ: bom biến, vụ nổ, số và máu cùng một khung hình */
function explode(id: string) {
    const n = bombsOn(id)
    setBombs(id,
        0)
    landDamage(id,
        blastDamage(n),
        "physical")
    void playVfx(P.impact,
        unitPt(id),
        [],
        {
            ...TONE, amount: n
        })
}

/** Đạn đại bác thường: trúng là mất máu và thêm 1 Bom */
function shoot(target: string, gain = 1) {
    return strike(SHOT.travel,
        TRISTANA,
        [target],
        SHOT_TONE,
        () => {
            landDamage(target,
                SHOT_DAMAGE,
                "physical")
            void playVfx(SHOT.impact,
                unitPt(target),
                [],
                SHOT_TONE)
            addBombs(target,
                gain)
        })
}

/** Con trỏ bấm vào lá tướng: dựng trên DOM của demo, tự gỡ khi xong */
async function clickOn(id: string) {
    const to = unitPt(id)
    const from = {
        x: to.x + 170, y: to.y + 230
    }
    const el = document.createElement("div")
    el.style.cssText = "position:fixed;left:0;top:0;z-index:9999;pointer-events:none;width:44px;height:44px;filter:drop-shadow(0 2px 6px rgba(0,0,0,.8))"
    el.innerHTML = "<svg viewBox=\"0 0 24 24\" width=\"44\" height=\"44\"><path d=\"M4 2l15 12h-8l4.5 8-3 1.6L8 15.4 4 20z\" fill=\"#fff\" stroke=\"#201008\" stroke-width=\"1.4\"/></svg>"
    document.body.append(el)
    const pos = (x: number, y: number, s = 1) => ({
        transform: `translate(${x}px,${y}px) scale(${s})`
    })
    await el.animate([pos(from.x,
        from.y),
    pos(to.x,
        to.y)],
    {
        duration: 460, easing: "ease-out", fill: "forwards"
    }).finished.catch(() => {})
    await el.animate([pos(to.x,
        to.y),
    pos(to.x,
        to.y,
        .72),
    pos(to.x,
        to.y)],
    {
        duration: 170, fill: "forwards"
    }).finished.catch(() => {})
    el.remove()
}

/** Bấm lên tướng địch, ngòi chạy tới, chạm là nổ. Không tốn lá */
async function detonateByClick(id: string) {
    await clickOn(id)
    await strike(P.travel,
        TRISTANA,
        [id],
        TONE,
        () => explode(id))
}

/** Q: đòn dồn dập, mỗi đòn một Bom */
async function rapidFire(target: string, shots: number) {
    let on = true
    const q = {
        color: Q.color, color2: Q.color2
    }
    land({
        t: "status", target: TRISTANA, id: RAPID, turns: 1, v: 1, src: TRISTANA
    })
    void playVfx(Q.impact,
        unitPt(TRISTANA),
        [],
        q)
    void playVfx(Q.extra ?? "none",
        unitPt(TRISTANA),
        [unitPt(target)],
        {
            ...q, tether: {
                target: () => unitPt(TRISTANA), released: () => !on, contact() {}
            }
        })
    await sleep(520)
    await Promise.all(Array.from({
        length: shots
    },
    (_, i) => sleep(i * RAPID_GAP_MS).then(() => shoot(target))))
    await sleep(520)
    on = false
    applyToDisplay([{
        t: "statusEnd", target: TRISTANA, id: RAPID
    }])
}

function throwBomb(target: string) {
    return strike(E.travel,
        TRISTANA,
        [target],
        {
            color: E.color, color2: E.color2
        },
        () => addBombs(target,
            E_BOMBS))
}

/** R: đạn đại bác chạm là kích nổ Bom; mọi tướng địch khác nhận phần vụ nổ, tất cả cùng một nhịp */
async function buster(target: string) {
    await playVfx(R.cast ?? "none",
        unitPt(TRISTANA),
        [unitPt(target)],
        ULT)
    await strike(R.travel,
        TRISTANA,
        [target],
        ULT,
        () => {
            const n = bombsOn(target)
            const others = ENEMIES.filter(id => id !== target)
            setBombs(target,
                0)
            landDamage(target,
                R_DAMAGE + blastDamage(n),
                "physical")
            for (const id of others) landDamage(id,
                Math.round(blastDamage(n) * R_SPLASH),
                "physical")
            void playVfx(R.impact,
                unitPt(target),
                [],
                {
                    ...ULT, amount: n
                })
            void playVfx(R.extra ?? "none",
                unitPt(target),
                others.map(id => unitPt(id)),
                {
                    ...ULT, amount: n
                })
        })
}

/** Tướng gục: bản hiển thị của demo không có đường chết thật nên làm tối lá ngay trên DOM và trả lại khi hết demo */
function fall(id: string, src: string, amount: number) {
    const u = getCard().view?.units[id]
    if (!u) return
    land({
        t: "damage", target: id, amount, hpLost: u.hp, absorbed: 0, kind: "physical", tag: "skill", hp: 0
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
    if (anim) falls.push(anim)
}

/** Đòn thường thêm 1 Bom, sát thương Bom đủ hạ: bom phồng lên rồi tự nổ, không cần bấm */
function lethalShot(target: string) {
    return strike(SHOT.travel,
        TRISTANA,
        [target],
        SHOT_TONE,
        () => {
            landDamage(target,
                SHOT_DAMAGE,
                "physical")
            void playVfx(SHOT.impact,
                unitPt(target),
                [],
                SHOT_TONE)
            const n = bombsOn(target) + 1
            setBombs(target,
                0)
            let blown = false
            void playVfx(P.extra ?? "none",
                unitPt(target),
                [],
                {
                    ...TONE, amount: n,
                    onBeat() {
                        if (blown) return
                        blown = true
                        fall(target,
                            TRISTANA,
                            blastDamage(n))
                        void playVfx(P.impact,
                            unitPt(target),
                            [],
                            {
                                ...TONE, amount: n
                            })
                    }
                })
        })
}

export async function runTristanaShowcase(say: (text: string) => void) {
    openHits()
    marks.clear()
    falls = []
    try {
        await play(say)
    } finally {
        for (const mark of marks.values()) mark.live = false
        marks.clear()
        for (const anim of falls) anim.cancel()
        closeHits()
    }
}

async function play(say: (text: string) => void) {
    say("Đánh thường · Tristana: đạn đại bác trúng Annie, gắn 1 Bom")
    await shoot("B:annie")
    await sleep(900)
    say("Nội tại · Bom Hẹn Giờ: mỗi đòn trúng thêm 1 Bom, quả bom to lên, không giới hạn")
    await shoot("B:annie")
    await sleep(1100)

    say("Kích nổ · một lần mỗi lượt, không tốn lá: bấm Annie, ngòi chạy tới, 2 Bom nổ nhỏ")
    await detonateByClick("B:annie")
    await sleep(1500)

    say("Q · Bắn Nhanh: tăng Tốc Đánh, đạn dồn dập vào Leona, mỗi đòn một Bom")
    await rapidFire("B:leona",
        4)
    await sleep(700)

    say(`E · Gắn Bom: quả bom bay tới, Leona thêm ${E_BOMBS} Bom, đủ 6 Bom`)
    await throwBomb("B:leona")
    await sleep(1300)

    say("Lượt sau · Kích nổ 6 Bom: cầu lửa lớn, cột khói đen")
    await detonateByClick("B:leona")
    await sleep(2200)

    say("Vài lượt sau · Garen tích tới 10 Bom, quả bom nóng đỏ, nhấp nháy gấp")
    setBombs("B:garen",
        10)
    await sleep(1500)
    say(`E · Gắn Bom: thêm ${E_BOMBS} Bom, đủ 12 Bom`)
    await throwBomb("B:garen")
    await sleep(1300)
    say("Kích nổ 12 Bom: cả dãy nổ, sóng bụi quét bàn, sát thương tăng vọt")
    await detonateByClick("B:garen")
    await sleep(2800)

    // mở lại bản hiển thị: máu về đầy để cảnh R có đủ 5 tướng địch
    closeHits()
    openHits()
    say("Trận mới · Leona mang 8 Bom")
    setBombs("B:leona",
        8)
    await sleep(1500)
    say("R · Đại Bác: đạn gang lớn kích nổ 8 Bom trên Leona, vụ nổ lan tới cả đội địch cùng một nhịp")
    await buster("B:leona")
    await sleep(2800)

    say("Bom tự nổ · Lux còn ít Máu, mang 5 Bom")
    presetWound("B:lux",
        120)
    setBombs("B:lux",
        5)
    await sleep(1400)
    say("Bom tự nổ · Đòn trúng thêm 1 Bom, sát thương Bom đủ hạ: bom phồng lên, tự nổ, không cần bấm")
    await lethalShot("B:lux")
    await sleep(2400)

    say("Luật chết · Jinx mang 8 Bom")
    setBombs("B:jinx",
        8)
    await sleep(1400)
    say("Luật chết · Jinx bị hạ bởi đòn khác: mất một nửa Bom, 4 quả rơi khỏi lá")
    await basicAttackFall("B:jinx")
    await sleep(2400)
}

/** Darius hạ Jinx: Bom chưa nổ, tướng mang chết nên rơi một nửa */
async function basicAttackFall(target: string) {
    const darius = "A:darius"
    const style = heroBasicVfx("darius")
    const tone = {
        color: style.color, color2: style.color2
    }
    await strike(style.travel,
        darius,
        [target],
        tone,
        () => {
            const n = bombsOn(target)
            fall(target,
                darius,
                200)
            void playVfx(style.impact,
                unitPt(target),
                [],
                tone)
            setBombs(target,
                Math.ceil(n / 2))
            void playVfx(TRISTANA_BOMB_SHED,
                unitPt(target),
                [],
                {
                    ...TONE, amount: Math.floor(n / 2)
                })
        })
}
