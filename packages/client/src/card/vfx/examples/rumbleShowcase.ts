// Demo VFX đủ bộ chiêu Rumble theo đặc tả mới. Rumble chưa có trong engine: Annie đứng thế ở giữa đội Xanh, demo này chỉ đổi ảnh và tên trong DOM. Chỉ là hình ảnh: không gọi engine, không đổi trạng thái trận.
// Mỗi chiêu một nhịp: mở màn trước, rồi một khoảnh khắc trúng duy nhất. Tên hiệu ứng lấy từ RUMBLE_VFX.
import type {
    cg
} from "@starci/shared"
import {
    landImpacts, queueImpacts
} from "../../anim/impacts"
import {
    gravePt, handPt, unitEl, unitPt
} from "../../anim/helpers"
import {
    applyToDisplay, getCard
} from "../../store"
import {
    playVfx
} from "../VfxCanvas"
import {
    RUMBLE_VFX as V, heroBasicVfx, skillIcon
} from "../heroMap"
import {
    sleep
} from "../particles"
import {
    strike
} from "./renataShowcase"
import {
    closeHits, landDamage, landShield, openHits
} from "./showcaseHits"

/** Id tướng đứng thế: mọi thanh máu, số nổi, đòn đánh của Rumble trong demo đi qua id này */
const RUMBLE = "A:annie"
const OPPOSITE = "B:renata"
const FRONT = ["B:leona",
    OPPOSITE,
    "B:jinx"]
const ENEMIES = ["B:garen",
    ...FRONT,
    "B:lux"]
const ART = "/heroes-square/rumble.jpg"
const NAME = "Rumble"
/** Lá của Annie trên tay đổi thành chiêu Rumble cùng phím */
const CARD_NAME: Record<string, string> = {
    q: "Súng Phun Lửa", e: "Khiên Phế Liệu", r: "Mưa Tên Lửa", p: "Tái Chế"
}
/** E của bộ này là Khiên Phế Liệu nên dùng ảnh Scrap Shield (W của LMHT) */
const ART_KEY: Record<string, string> = {
    e: "w"
}
const STAND_IN_ART = /\/(card_skills|icons)\/annie_([qerp])\.png/

const toneOf = (v: { color: number; color2?: number; intensity?: number }) => ({
    color: v.color, color2: v.color2, intensity: v.intensity
})
const hero = (id: string) => getCard().view?.units[id]

/** Đổi ảnh, tên của tướng đứng thế trong DOM; React vẽ lại lúc nào cũng được chỉnh lại. Trả về hàm gỡ */
export function dressRumble() {
    const setText = (el: Element | null | undefined, text: string) => {
        if (el && el.textContent !== text) el.textContent = text
    }
    const apply = () => {
        const card = unitEl(RUMBLE)
        const portrait = card?.querySelector<HTMLImageElement>(".bd-art img.af-art")
        if (portrait && !portrait.src.endsWith(ART)) portrait.src = ART
        setText(card?.querySelector(".bd-name"),
            NAME)
        for (const img of document.querySelectorAll<HTMLImageElement>(".example-host img")) {
            const hit = STAND_IN_ART.exec(img.src)
            if (!hit) continue
            img.src = `/${hit[1]}/rumble_${ART_KEY[hit[2]] ?? hit[2]}.png`
            setText(img.closest(".game-card")?.querySelector(".game-card-name"),
                CARD_NAME[hit[2]])
        }
    }
    apply()
    const watch = new MutationObserver(apply)
    watch.observe(document.body,
        {
            subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["src"]
        })
    return () => watch.disconnect()
}

/** Đòn trúng Khiên: số nổi và Khiên giảm, Máu giữ nguyên */
function landBlocked(id: string, amount: number, kind: cg.DamageKind) {
    const u = hero(id)
    if (!u) return
    const e: cg.GameEvent = {
        t: "damage", target: id, amount, hpLost: 0, absorbed: amount, kind, tag: "skill", hp: u.hp
    }
    queueImpacts([e])
    landImpacts([e])
    applyToDisplay([e])
}

const staged = new Set<HTMLElement>()

/** Giữ chỗ một Lá Tái Chế trên tay: nhân bản ô lá có sẵn, ẩn tới khi lá bay tới. Lá này chỉ là DOM của demo */
function stageCard(icon: string, name: string) {
    const slot = document.querySelector<HTMLElement>(".hd-fan .hd-slot")
    if (!slot?.parentElement) return null
    const c = slot.cloneNode(true) as HTMLElement
    c.removeAttribute("data-hand-uid")
    c.style.visibility = "hidden"
    const art = c.querySelector<HTMLImageElement>(".game-card-image")
    if (art) art.src = icon
    const label = c.querySelector(".game-card-name")
    if (label) label.textContent = name
    c.querySelector(".hd-gem")?.remove()
    slot.parentElement.append(c)
    staged.add(c)
    return c
}

const centerOf = (el: HTMLElement | null) => {
    if (!el) return handPt("A",
        "A")
    const r = el.getBoundingClientRect()
    return {
        x: r.left + r.width / 2, y: r.top + r.height / 2
    }
}

/** Lá từ ô Mộ bay lên tay; tới nơi là lá hiện trên tay */
async function fly(icon: string, name: string) {
    const c = stageCard(icon,
        name)
    await new Promise<void>((resolve) => {
        void playVfx(V.p.cast ?? "none",
            gravePt("A",
                "A"),
            [centerOf(c)],
            {
                ...toneOf(V.p), icon,
                onBeat() {
                    if (c) c.style.visibility = ""
                    resolve()
                }
            }).finally(resolve)
    })
    return c
}

/** Rumble đánh Lá Tái Chế: lá rời tay bay tới tướng, cháy thành tia lửa */
async function castRecycled(card: HTMLElement | null, icon: string, tone: ReturnType<typeof toneOf>) {
    const at = centerOf(card)
    card?.remove()
    if (card) staged.delete(card)
    await playVfx(V.p.impact,
        unitPt(RUMBLE),
        [at],
        {
            ...tone, icon
        })
}

export async function runRumbleShowcase(say: (text: string) => void) {
    openHits()
    try {
        await play(say)
    } finally {
        for (const c of staged) c.remove()
        staged.clear()
        closeHits()
    }
}

async function play(say: (text: string) => void) {
    const basic = toneOf(V.basic)
    const q = toneOf(V.q)
    const e = toneOf(V.e)
    const r = toneOf(V.r)

    say("Đánh thường · Rumble: súng điện khạc tia sét vào đối diện")
    await strike(V.basic.travel,
        RUMBLE,
        [OPPOSITE],
        basic,
        () => {
            landDamage(OPPOSITE,
                60,
                "magic")
            void playVfx(V.basic.impact,
                unitPt(OPPOSITE),
                [],
                basic)
        })
    await sleep(760)

    say("Q · Súng Phun Lửa: lửa phun vào Renata và 2 đường kề, sát thương phép cùng một nhịp")
    void playVfx(V.q.cast ?? "none",
        unitPt(RUMBLE),
        [unitPt(OPPOSITE)],
        q)
    await sleep(300)
    await strike(V.q.travel,
        RUMBLE,
        FRONT,
        q,
        () => {
            for (const id of FRONT) {
                landDamage(id,
                    130,
                    "magic")
                void playVfx(V.q.impact,
                    unitPt(id),
                    [],
                    q)
            }
        })
    await sleep(1300)

    const luxIcon = skillIcon("lux",
        "e")
    say("Nội tại · Tái Chế: Rumble vừa dùng chiêu, Lux E từ Mộ về tay thành Lá Tái Chế")
    const luxCard = await fly(luxIcon,
        "Tái Chế: Lux E")
    await sleep(760)

    const bolt = toneOf(V.recycle.bolt)
    say("Lá Tái Chế · Lux E: tia sáng rỉ sét theo AP Rumble, trúng Garen, không Choáng")
    await castRecycled(luxCard,
        luxIcon,
        bolt)
    await strike(V.recycle.bolt.travel,
        RUMBLE,
        ["B:garen"],
        bolt,
        () => {
            landDamage("B:garen",
                110,
                "magic")
            void playVfx(V.recycle.bolt.impact,
                unitPt("B:garen"),
                [],
                bolt)
        })
    await sleep(1000)

    say("E · Khiên Phế Liệu (Quick): Rumble nhận Khiên, mảnh sắt bắn trúng Lux")
    await scrapShield("B:lux")
    await sleep(1200)

    const dariusIcon = skillIcon("darius",
        "q")
    say("Nội tại · Tái Chế: lượt sau, Darius Q từ Mộ về tay thành Lá Tái Chế")
    const dariusCard = await fly(dariusIcon,
        "Tái Chế: Darius Q")
    await sleep(760)

    const cleave = toneOf(V.recycle.cleave)
    say("Lá Tái Chế · Darius Q: nhát chém sắt vụn vào Garen, 1 AD đổi thành 2 AP")
    await castRecycled(dariusCard,
        dariusIcon,
        cleave)
    await strike(V.recycle.cleave.travel,
        RUMBLE,
        ["B:garen"],
        cleave,
        () => {
            landDamage("B:garen",
                120,
                "magic")
            void playVfx(V.recycle.cleave.impact,
                unitPt("B:garen"),
                [],
                cleave)
        })
    await sleep(1100)

    say("E · Khiên Phế Liệu (nối chuỗi): Jinx nhắm Rumble, khiên dựng trước, mảnh sắt đánh trả Jinx")
    // Jinx đang gồng đòn; mắt xích sau giải quyết trước nên khiên dựng và mảnh sắt bay trước đạn của Jinx
    const jinx = heroBasicVfx("jinx")
    const jinxTone = {
        color: jinx.color, color2: jinx.color2
    }
    void playVfx("spellCast",
        unitPt("B:jinx"),
        [],
        jinxTone)
    await sleep(520)
    await scrapShield("B:jinx")
    await sleep(420)
    await strike(jinx.travel,
        "B:jinx",
        [RUMBLE],
        jinxTone,
        () => {
            landBlocked(RUMBLE,
                80,
                "physical")
            void playVfx(V.e.block ?? "none",
                unitPt(RUMBLE),
                [unitPt("B:jinx")],
                e)
        })
    await sleep(1100)

    say("R · Mưa Tên Lửa: tên lửa phủ cả hàng địch, sát thương phép cùng một nhịp, đất bốc lửa")
    await strike(V.r.cast ?? "none",
        RUMBLE,
        ENEMIES,
        r,
        () => {
            for (const id of ENEMIES) {
                landDamage(id,
                    150,
                    "magic")
                void playVfx(V.r.impact,
                    unitPt(id),
                    [],
                    r)
            }
        })
    await sleep(1500)

    say("R · Mưa Tên Lửa: Lá Tái Chế bay lên từ Mộ")
    await Promise.all(([["viktor",
        "q"],
    ["garen",
        "q"],
    ["leona",
        "e"]] as const).map(async ([who,
        key], i) => {
        await sleep(i * 260)
        await fly(skillIcon(who,
            key),
        "Lá Tái Chế")
    }))
    await sleep(1100)
}

/** Một lần E: khiên phế liệu tụ, mảnh sắt lao vào mục tiêu; chạm là mục tiêu mất máu, Rumble có Khiên cùng lúc */
async function scrapShield(target: string) {
    const e = toneOf(V.e)
    void playVfx(V.e.cast ?? "none",
        unitPt(RUMBLE),
        [],
        e)
    await sleep(560)
    await strike(V.e.travel,
        RUMBLE,
        [target],
        e,
        () => {
            landDamage(target,
                100,
                "magic")
            landShield(RUMBLE,
                110)
            void playVfx(V.e.impact,
                unitPt(target),
                [],
                e)
            void playVfx(V.e.shield ?? "none",
                unitPt(RUMBLE),
                [],
                e)
        })
}
