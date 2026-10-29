// Biến một lô sự kiện (GameEvent[]) thành các bước hoạt ảnh nối tiếp.
// Mỗi lá đánh có 4 nhịp: (1) lá bay ra giữa sân phóng to, (2) tướng ra đòn lao tới + lá mờ dần,
// (3) đạn bay từ người ra đòn tới từng mục tiêu, (4) nổ trúng đích + rung. Số sát thương nổi vẫn do Board.tsx vẽ.
import {
    cg, getItem
} from "@starci/shared"
import {
    gameOf, getCard
} from "../store"
import {
    CARD_W, boardCenter, deckPt, fadeOut, handPt, handRect, laneRect, lunge, meSide, place, ptOf, pulse, rectOf, run, shake, sleep, unitEl, unitPt, unitRect, type Pt, type Side
} from "./helpers"
import {
    skillIcon
} from "./CardFace"
import {
    styleFor, vfxImpact, vfxMeta, vfxReady, vfxTravel
} from "../vfx/dispatch"

type GameEvent = cg.GameEvent
type Card = cg.Card
type PlayEv = Extract<GameEvent, { t: "play" }>
type EquipEv = Extract<GameEvent, { t: "equip" }>
type CraftEv = Extract<GameEvent, { t: "craft" }>

export type Tint = "physical" | "magic" | "true" | "heal" | "shield" | "gold"

export type SpriteSpec =
    | { kind: "card"; card: Card; name: string }
    | { kind: "hero"; hero: string; name: string }
    | { kind: "orb"; tint: Tint; icon?: string }
    | { kind: "burst"; tint: Tint }
    | { kind: "back"; face?: Card; name?: string }
    | { kind: "icon"; src: string }

export interface Fx {
    spawn(spec: SpriteSpec): Promise<HTMLElement>;
    drop(el: HTMLElement): void;
    /** Co thời gian theo tốc độ (nhanh hơn khi hàng đợi dài) */
    t(ms: number): number;
}

type Step = () => Promise<void>

const EFFECT = new Set(["cast",
    "attack",
    "damage",
    "heal",
    "shield",
    "kill",
    "equip"])
const NEUTRAL = new Set(["log",
    "status",
    "statusEnd",
    "stack",
    "lives",
    "chainAdd",
    "chainWindow",
    "chainResolve",
    "chainEnd",
    "marker",
    "move",
    "reveal",
    "tokenFlip",
    "tokenEnd"])

const myside = () => meSide(getCard().view?.you ?? null)

function nameOf(card: Card): string {
    try {
        const v = getCard().view
        if (v) {
            return cg.cardInfoL(gameOf(v),
                card).name
        }
    } catch {
        /* rơi về id */
    }
    return card.hero ? `${card.hero} ${card.id.slice(-1).toUpperCase()}` : card.id
}

async function burst(fx: Fx, pt: Pt, tint: Tint, scale = 1) {
    const el = await fx.spawn({
        kind: "burst", tint
    })
    await run(el,
        [{
            transform: place(el,
                pt,
                .25 * scale), opacity: .95
        },
        {
            transform: place(el,
                pt,
                1.5 * scale), opacity: 0
        }],
        fx.t(320),
        "ease-out")
    fx.drop(el)
}

function fly(el: HTMLElement, a: Pt, b: Pt, s0: number, s1: number, o0: number, o1: number, ms: number, easing = "ease-in-out") {
    return run(el,
        [{
            transform: place(el,
                a,
                s0), opacity: o0
        },
        {
            transform: place(el,
                b,
                s1), opacity: o1
        }],
        ms,
        easing)
}

interface Hit { from?: string; to: string; tint: Tint; miss: boolean; crit: boolean }

const heroOf = (unit?: string): string | undefined => (unit ? getCard().view?.units[unit]?.hero : undefined)

/** Lá đánh (play) hoặc đòn lẻ (play = null) cùng các hiệu ứng theo sau */
function playGroup(fx: Fx, play: PlayEv | null, effects: GameEvent[]): Step {
    return async () => {
        const me = myside()
        let caster = play?.args?.actor
        const hits: Hit[] = []
        const kills = new Set<string>()
        let equip: EquipEv | undefined
        for (const e of effects) {
            if (e.t === "cast") caster = caster ?? e.unit
            if (e.t === "attack") caster = caster ?? e.attacker
        }
        const add = (to: string, tint: Tint, from?: string, miss = false, crit = false) => {
            const old = hits.find((h) => h.to === to)
            if (old) {
                const dmg = tint === "physical" || tint === "magic" || tint === "true"
                if (dmg && old.tint !== "heal" && old.tint !== "shield") old.tint = tint
                if (!miss) old.miss = false
                if (crit) old.crit = true
                return
            }
            hits.push({
                from: from ?? caster, to, tint, miss, crit
            })
        }
        for (const e of effects) {
            if (e.t === "cast" && e.target) add(e.target,
                "physical",
                e.unit)
            else if (e.t === "attack") add(e.target,
                "physical",
                e.attacker,
                e.miss,
                e.crit)
            else if (e.t === "damage") add(e.target,
                e.kind,
                e.src,
                false,
                !!e.crit)
            else if (e.t === "heal") add(e.target,
                "heal",
                e.src)
            else if (e.t === "shield") add(e.target,
                "shield",
                e.src)
            else if (e.t === "kill") kills.add(e.target)
            else if (e.t === "equip") equip = e
        }
        if (play && !equip) {
            const a = play.args
            const named = [...(a?.target ? [a.target] : []),
                ...(a?.targets ?? [])]
            for (const t of named) {
                if (!hits.some((h) => h.to === t)) {
                    hits.push({
                        from: caster, to: t, tint: "gold", miss: false, crit: false
                    })
                }
            }
        }
        const center = boardCenter()
        const casterPt = caster ? unitPt(caster) : undefined

        // ---- nhịp 1: lá bay ra giữa sân, phóng to
        let card: HTMLElement | undefined
        if (play) {
            card = await fx.spawn({
                kind: "card", card: play.card, name: nameOf(play.card)
            })
            const hr = play.side === me ? rectOf(`[data-hand-uid="${play.card.uid}"]`) : null
            const start = hr ? ptOf(hr) : handPt(play.side,
                me)
            await fly(card,
                start,
                center,
                hr ? hr.width / CARD_W : .5,
                1.6,
                .85,
                1,
                fx.t(300),
                "cubic-bezier(.2,.8,.3,1)")
            await sleep(fx.t(60))
        }

        // ---- nhịp 2: tướng lao tới + lá mờ dần (lá đồ thì bay tới tướng nhận)
        const first = hits[0] ? unitPt(hits[0].to) : center
        const tasks: Promise<void>[] = []
        if (caster && casterPt) {
            tasks.push(lunge(unitEl(caster),
                casterPt,
                first,
                fx.t(240)))
        }
        if (card) {
            if (equip) {
                tasks.push(fly(card,
                    center,
                    unitPt(equip.unit),
                    1.6,
                    .5,
                    1,
                    .9,
                    fx.t(300),
                    "ease-in"))
            } else {
                tasks.push(fly(card,
                    center,
                    center,
                    1.6,
                    1.8,
                    1,
                    0,
                    fx.t(hits.length || caster ? 260 : 380),
                    "ease-in"))
            }
        }
        await Promise.all(tasks)
        if (card) fx.drop(card)

        // ---- nhịp 3: đạn bay tới từng mục tiêu
        const icon = skillIcon(play?.card)
        const flights = hits.filter((h) => h.to !== (h.from ?? caster)).map(async (h, i) => {
            await sleep(fx.t(i * 45))
            if (vfxReady()) {
                await vfxTravel(styleFor(play?.card,
                    h.tint,
                    h.crit,
                    heroOf(h.from ?? caster)),
                h.from ? unitPt(h.from) : (casterPt ?? center),
                unitPt(h.to))
                return
            }
            const orb = await fx.spawn({
                kind: "orb", tint: h.tint, icon
            })
            const a = h.from ? unitPt(h.from) : (casterPt ?? center)
            await fly(orb,
                a,
                unitPt(h.to),
                .6,
                1.1,
                1,
                1,
                fx.t(260),
                "cubic-bezier(.4,0,.6,1)")
            fx.drop(orb)
        })
        await Promise.all(flights)

        // ---- nhịp 4: trúng đích (nổ + rung / nhấp nháy xanh khi hồi máu, khiên)
        const impacts: Promise<void>[] = []
        for (const h of hits) {
            if (h.miss) continue
            impacts.push(vfxReady() ? vfxImpact(styleFor(play?.card,
                h.tint,
                h.crit,
                heroOf(h.from ?? caster)),
            unitPt(h.to)) : burst(fx,
                unitPt(h.to),
                h.tint,
                1))
            const el = unitEl(h.to)
            if (h.tint === "heal" || h.tint === "shield") {
                impacts.push(pulse(el,
                    fx.t(300),
                    1.07))
            } else if (h.tint !== "gold") {
                impacts.push(shake(el,
                    fx.t(260)))
            }
        }
        if (equip) {
            const items = unitEl(equip.unit)?.querySelector(".bd-items") ?? null
            impacts.push(vfxReady() ? vfxMeta("equip",
                unitPt(equip.unit)) : burst(fx,
                unitPt(equip.unit),
                "gold",
                1))
            impacts.push(pulse(items,
                fx.t(380),
                1.3))
        }
        if (!hits.length && !equip && casterPt) {
            impacts.push(vfxReady() ? vfxImpact(styleFor(play?.card,
                "gold",
                false,
                heroOf(caster)),
            casterPt) : burst(fx,
                casterPt,
                "gold",
                .9))
        }
        await Promise.all(impacts)
        for (const k of kills) {
            if (vfxReady()) void vfxMeta("death",
                unitPt(k))
            fadeOut(unitEl(k),
                fx.t(400))
        }
        if (kills.size) await sleep(fx.t(200))
    }
}

interface DrawItem { side: Side; card?: Card; from?: Side }

function drawsStep(fx: Fx, list: DrawItem[]): Step {
    return async () => {
        const me = myside()
        await Promise.all(list.map(async (d, i) => {
            await sleep(fx.t(i * 80))
            const face = d.side === me && !!d.card
            const el = await fx.spawn(face && d.card ? {
                kind: "card", card: d.card, name: nameOf(d.card)
            } : {
                kind: "back"
            })
            const a = d.from ? handPt(d.from,
                me) : deckPt(d.side,
                me)
            const s = face ? .55 : 1
            await fly(el,
                a,
                handPt(d.side,
                    me),
                s * .8,
                s,
                .2,
                1,
                fx.t(300),
                "cubic-bezier(.2,.8,.3,1)")
            if (vfxReady()) void vfxMeta("drawSpark",
                handPt(d.side,
                    me))
            await run(el,
                [{
                    opacity: 1
                },
                {
                    opacity: 0
                }],
                fx.t(120),
                "ease-out")
            fx.drop(el)
        }))
    }
}

/** Xáo bộ bài: vài lá úp chia hai nửa rồi trộn xen kẽ ngay tại số đếm bộ bài */
function shuffleStep(fx: Fx, side: Side): Step {
    return async () => {
        const c = deckPt(side,
            myside())
        if (vfxReady()) void vfxMeta("shuffle",
            c)
        const els = await Promise.all([0,
            1,
            2,
            3,
            4,
            5].map(() => fx.spawn({
            kind: "back"
        })))
        await Promise.all(els.map(async (el, i) => {
            const dir = i % 2 ? 1 : -1
            const stack = {
                x: c.x, y: c.y - i * 2
            }
            await run(el,
                [{
                    transform: place(el,
                        c,
                        .8),
                    opacity: 0
                },
                {
                    transform: place(el,
                        {
                            x: c.x + dir * 22, y: c.y - 4
                        },
                        .8,
                        dir * 8),
                    opacity: 1,
                    offset: .35
                },
                {
                    transform: place(el,
                        stack,
                        .8),
                    opacity: 1,
                    offset: .75
                },
                {
                    transform: place(el,
                        stack,
                        .8),
                    opacity: 0
                }],
                fx.t(480 + i * 20),
                "ease-in-out")
            fx.drop(el)
        }))
    }
}

/** Lá thưởng úp lật mặt rồi bay về tay */
function prizeStep(fx: Fx, side: Side, card: Card): Step {
    return async () => {
        const me = myside()
        const minis = document.querySelectorAll(`[data-cg-prizes="${side}"] .bd-mini:not(.gone)`)
        const a = minis.length ? ptOf(minis[0].getBoundingClientRect()) : deckPt(side,
            me)
        const mine = side === me
        const el = await fx.spawn({
            kind: "back", face: mine ? card : undefined, name: mine ? nameOf(card) : undefined
        })
        const at = (s: number, r: number) => `${place(el,
            a,
            s)} rotateY(${r}deg)`
        await run(el,
            [{
                transform: at(1,
                    0), opacity: 1
            },
            {
                transform: at(1.6,
                    90), opacity: 1
            }],
            fx.t(180),
            "ease-in")
        el.classList.add("flipped")
        if (vfxReady()) void vfxMeta("prizeFlip",
            a)
        await run(el,
            [{
                transform: at(1.6,
                    -90), opacity: 1
            },
            {
                transform: at(1.8,
                    0), opacity: 1
            }],
            fx.t(180),
            "ease-out")
        await sleep(fx.t(100))
        await fly(el,
            a,
            handPt(side,
                me),
            1.8,
            .8,
            1,
            0,
            fx.t(320),
            "ease-in")
        fx.drop(el)
    }
}

/** Triệu hồi / hồi sinh: lá tướng rơi xuống đường kèm chớp sáng */
function summonStep(fx: Fx, unit: string, lane: number): Step {
    return async () => {
        const view = getCard().view
        const hero = view?.units[unit]?.hero ?? unit.split(":")[1] ?? unit
        const r = unitRect(unit) ?? laneRect(unit,
            lane,
            myside())
        const to = r ? ptOf(r) : boardCenter()
        const el = await fx.spawn({
            kind: "hero", hero, name: cg.getHero(hero)?.name ?? hero
        })
        const s = r ? Math.max(.5,
            r.width / CARD_W) : .9
        await fly(el,
            {
                x: to.x, y: to.y - 130
            },
            to,
            s * 1.6,
            s,
            0,
            1,
            fx.t(260),
            "cubic-bezier(.5,0,.9,.6)")
        const b = vfxReady() ? vfxMeta("summon",
            to) : burst(fx,
            to,
            "gold",
            1.5)
        await run(el,
            [{
                transform: place(el,
                    to,
                    s),
                opacity: 1
            },
            {
                transform: place(el,
                    to,
                    s * 1.08),
                opacity: .8,
                offset: .3
            },
            {
                transform: place(el,
                    to,
                    s),
                opacity: 0
            }],
            fx.t(300),
            "ease-out")
        fx.drop(el)
        await b
    }
}

/** Ghép đồ: 2 mảnh + vàng gộp lại thành lá đồ, rồi bay tới tướng (hoặc về tay) */
function craftStep(fx: Fx, ev: CraftEv): Step {
    return async () => {
        const me = myside()
        const center = boardCenter()
        const start = handPt(ev.side,
            me)
        const recipe = getItem(ev.item)?.recipe ?? []
        const srcs = [...recipe.slice(0,
            2).map((id) => `/items/${id}.png`),
        "/card_support/gold.png"]
        const spots: Pt[] = [{
            x: center.x - 56, y: center.y
        },
        {
            x: center.x + 56, y: center.y
        },
        {
            x: center.x, y: center.y - 50
        }]
        const els = await Promise.all(srcs.map((src) => fx.spawn({
            kind: "icon", src
        })))
        await Promise.all(els.map((el, i) => fly(el,
            start,
            spots[i],
            .6,
            1.2,
            0,
            1,
            fx.t(280),
            "cubic-bezier(.2,.8,.3,1)")))
        await sleep(fx.t(80))
        await Promise.all(els.map((el, i) => fly(el,
            spots[i],
            center,
            1.2,
            .4,
            1,
            0,
            fx.t(220),
            "ease-in")))
        els.forEach((el) => fx.drop(el))
        const itemCard: Card = ev.card ?? ({
            uid: `anim-${ev.item}`, kind: "support", id: "legend", item: ev.item
        } as Card)
        const card = await fx.spawn({
            kind: "card", card: itemCard, name: nameOf(itemCard)
        })
        void (vfxReady() ? vfxMeta("forge",
            center) : burst(fx,
            center,
            "gold",
            1.6))
        await fly(card,
            center,
            center,
            1,
            1.6,
            0,
            1,
            fx.t(220),
            "cubic-bezier(.2,.9,.3,1.3)")
        await sleep(fx.t(120))
        if (ev.unit) {
            const to = unitPt(ev.unit)
            await fly(card,
                center,
                to,
                1.6,
                .5,
                1,
                .9,
                fx.t(300),
                "ease-in")
            fx.drop(card)
            const items = unitEl(ev.unit)?.querySelector(".bd-items") ?? null
            await Promise.all([burst(fx,
                to,
                "gold",
                1),
            pulse(items,
                fx.t(380),
                1.3)])
        } else {
            const hr = handRect(ev.side,
                me)
            await fly(card,
                center,
                hr ? ptOf(hr) : start,
                1.6,
                .6,
                1,
                .2,
                fx.t(320),
                "ease-in")
            fx.drop(card)
        }
    }
}

function drawLike(x: GameEvent): DrawItem | null {
    if (x.t === "draw" || x.t === "drawAuto" || x.t === "returnToHand") {
        return {
            side: x.side, card: x.card
        }
    }
    if (x.t === "create" && x.zone === "hand") {
        return {
            side: x.side, card: x.card
        }
    }
    if (x.t === "steal") {
        return {
            side: x.to, card: x.card, from: x.from
        }
    }
    return null
}

/** Dựng danh sách bước cho một lô sự kiện */
export function buildSteps(events: GameEvent[], fx: Fx): Step[] {
    const steps: Step[] = []
    const skip = new Set<number>()
    let i = 0
    while (i < events.length) {
        const e = events[i]
        if (skip.has(i)) {
            i++
            continue
        }
        if (e.t === "play" || EFFECT.has(e.t)) {
            const eff: GameEvent[] = []
            let j = e.t === "play" ? i + 1 : i
            while (j < events.length) {
                const x = events[j]
                if (EFFECT.has(x.t)) eff.push(x)
                else if (!NEUTRAL.has(x.t)) break
                j++
            }
            steps.push(playGroup(fx,
                e.t === "play" ? e : null,
                eff))
            i = j
            continue
        }
        const d0 = drawLike(e)
        if (d0) {
            const list = [d0]
            let j = i + 1
            while (j < events.length) {
                const d = drawLike(events[j])
                if (!d) break
                list.push(d)
                j++
            }
            steps.push(drawsStep(fx,
                list))
            i = j
            continue
        }
        if (e.t === "shuffle") {
            steps.push(shuffleStep(fx,
                e.side))
        } else if (e.t === "prize") {
            steps.push(prizeStep(fx,
                e.side,
                e.card))
        } else if (e.t === "summon" || e.t === "respawn") {
            steps.push(summonStep(fx,
                e.unit,
                e.lane))
        } else if (e.t === "craft") {
            steps.push(craftStep(fx,
                e))
            for (let j = i + 1; j < events.length; j++) {
                const x = events[j]
                if (x.t === "equip" && x.unit === e.unit && x.item === e.item) {
                    skip.add(j)
                    break
                }
                if (!NEUTRAL.has(x.t)) break
            }
        }
        i++
    }
    return steps
}

export async function runBatch(events: GameEvent[], fx: Fx, alive: () => boolean): Promise<void> {
    for (const s of buildSteps(events,
        fx)) {
        if (!alive()) return
        try {
            await s()
        } catch {
            /* một bước lỗi không được chặn các bước sau */
        }
    }
}
