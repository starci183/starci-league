// Biến một lô sự kiện (GameEvent[]) thành các bước hoạt ảnh nối tiếp.
// Mỗi lá đánh có 4 nhịp: (1) lá bay ra giữa sân phóng to, (2) tướng ra đòn lao tới + lá mờ dần,
// (3) đạn bay từ người ra đòn tới từng mục tiêu, (4) nổ trúng đích + rung. Số sát thương nổi vẫn do Board.tsx vẽ.
import {
    cg, getItem
} from "@starci/shared"
import {
    applyToDisplay, gameOf, getCard
} from "../store"
import {
    CARD_W, boardCenter, deckPt, fadeOut, gravePt, handPt, handRect, laneRect, lunge, meSide, place, ptOf, pulse, rectOf, run, shake, sleep, unitEl, unitPt, unitRect, type Pt, type Side
} from "./helpers"
import {
    skillIcon
} from "./CardFace"
import {
    styleFor, vfxImpact, vfxMeta, vfxReady, vfxTravel
} from "../vfx/dispatch"
import {
    releaseCard
} from "./pending"
import {
    landImpacts
} from "./impacts"

type GameEvent = cg.GameEvent
type Card = cg.Card
type PlayEv = Extract<GameEvent, { t: "play" }>
type EquipEv = Extract<GameEvent, { t: "equip" }>
type CraftEv = Extract<GameEvent, { t: "craft" }>

export type Tint = "physical" | "magic" | "true" | "heal" | "shield" | "gold"

/** Sắc thái lá bay: burn = cháy cam (lá bị đốt), fade = tím nhạt (lá tạm tan biến) */
export type Tone = "burn" | "fade"

export type SpriteSpec =
    | { kind: "card"; card: Card; name: string; tone?: Tone }
    | { kind: "hero"; hero: string; name: string }
    /** Lá tướng úp lật mặt (lộ cùng lúc khi gọi tướng úp) */
    | { kind: "heroflip"; hero: string; name: string }
    | { kind: "orb"; tint: Tint; icon?: string }
    | { kind: "burst"; tint: Tint }
    | { kind: "back" }
    | { kind: "show"; card: Card; name: string; banner: string; desc: string }
    | { kind: "flip"; face?: Card; name?: string; tone?: Tone }
    | { kind: "icon"; src: string }
    /** Chữ nổi ngắn (Bị huỷ, Hoá Băng, Nâng cấp) */
    | { kind: "text"; text: string; tint: "cancel" | "ice" | "gold" }

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
    "manaChange",
    "attackCount",
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

function descOf(card: Card): string {
    try {
        const v = getCard().view
        if (v) {
            return cg.cardInfoL(gameOf(v),
                card).desc
        }
    } catch {
        /* không có mô tả */
    }
    return ""
}

/** Đếm mắt xích đã nối liên tiếp để lá khoe sau lệch nhẹ, nhìn ra chuỗi */
let chainDepth = 0

/** Bề rộng lá khoe giữa màn hình (px) */
const SHOW_W = 260

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
function playGroup(fx: Fx, play: PlayEv | null, effects: GameEvent[], span: GameEvent[]): Step {
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

        // ---- nhịp 1: KHOE LÁ — lá nổi từ tay lên giữa màn hình, phóng to kèm hào quang và băng tên
        let card: HTMLElement | undefined
        let showPt = center
        let showScale = 1
        // Quick (phản ứng) hiện trong sân khấu Chuỗi (chain/ChainStage), không khoe lá lần nữa
        if (play && !play.reaction) {
            chainDepth = play.reaction ? Math.min(chainDepth + 1,
                4) : 0
            const mine = play.side === me
            const en = cg.getCardLang() === "en"
            const name = nameOf(play.card)
            const banner = mine ? (en ? "You play" : "Bạn đánh") : (en ? "Opponent plays" : "Đối thủ đánh")
            card = await fx.spawn({
                kind: "show", card: play.card, name, banner: `${banner} · ${name}`, desc: descOf(play.card)
            })
            const hr = mine ? rectOf(`[data-hand-uid="${play.card.uid}"]`) : null
            const start = hr ? ptOf(hr) : handPt(play.side,
                me)
            showScale = Math.max(.5,
                Math.min(1,
                    (window.innerHeight - 150) / (SHOW_W * 1.4 + 90)))
            showPt = {
                x: center.x + chainDepth * 34, y: center.y - 28 + chainDepth * 22
            }
            await run(card,
                [{
                    transform: place(card,
                        start,
                        hr ? hr.width / SHOW_W : .22), opacity: .5
                },
                {
                    transform: place(card,
                        showPt,
                        showScale), opacity: 1
                }],
                fx.t(460),
                "cubic-bezier(.18,.9,.3,1.3)")
            await sleep(fx.t(mine ? 1100 : 1000))
        }

        // ---- nhịp 2: tướng lao tới + lá thu nhỏ bay tới đích rồi mờ dần (lá đồ thì bay tới tướng nhận)
        const first = hits[0] ? unitPt(hits[0].to) : center
        const tasks: Promise<void>[] = []
        if (caster && casterPt) {
            tasks.push(lunge(unitEl(caster),
                casterPt,
                first,
                fx.t(240)))
        }
        if (card) {
            const dest = equip ? unitPt(equip.unit) : hits[0] ? unitPt(hits[0].to) : casterPt
            if (dest) {
                tasks.push(fly(card,
                    showPt,
                    dest,
                    showScale,
                    .3,
                    1,
                    0,
                    fx.t(340),
                    "ease-in"))
            } else {
                tasks.push(fly(card,
                    showPt,
                    showPt,
                    showScale,
                    showScale * 1.15,
                    1,
                    0,
                    fx.t(320),
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
        landImpacts(effects) // số nổi đúng lúc trúng
        // máu/khiên/trạng thái/đồ trên sân đổi đúng lúc trúng (tướng chết thì đợi mờ xong mới thành lá chết)
        applyToDisplay(span.filter((x) => x.t !== "kill"))
        await Promise.all(impacts)
        for (const k of kills) {
            if (vfxReady()) void vfxMeta("death",
                unitPt(k))
            fadeOut(unitEl(k),
                fx.t(400))
        }
        if (kills.size) await sleep(fx.t(400))
        applyToDisplay(span.filter((x) => x.t === "kill"))
    }
}

interface DrawItem { side: Side; card?: Card; from?: Side; by?: string }

/**
 * Vị trí lá trên tay ngay khi lô sự kiện tới (lúc đó tay còn nguyên); lô chạy sau có thể tới khi state mới đã bỏ lá.
 * Chỉ dùng cho hoạt ảnh lá tạm tan biến tại chỗ.
 */
const handRects = new Map<string, DOMRect>()

/** AnimLayer gọi ngay khi nhận lô: ghi nhớ chỗ các lá tạm sắp tan biến */
export function memoHandRects(events: GameEvent[]) {
    for (const e of events) {
        if (e.t !== "tempExpired") continue
        const r = rectOf(`[data-hand-uid="${e.card.uid}"]`)
        if (r) handRects.set(e.card.uid,
            r)
    }
    if (handRects.size > 40) handRects.clear()
}

const isHiddenCard = (c: Card | undefined) => !!c && (c as { hidden?: boolean }).hidden === true

/** Lá bị đốt vì tay đầy: bay từ bộ ra giữa sân, cháy cam rồi rơi vào mộ (mộ công khai nên ai cũng thấy mặt lá) */
function burnStep(fx: Fx, list: { side: Side; card: Card }[]): Step {
    return async () => {
        const me = myside()
        const center = boardCenter()
        await Promise.all(list.map(async (b, i) => {
            await sleep(fx.t(i * 180))
            const from = deckPt(b.side,
                me)
            const to = gravePt(b.side,
                me)
            const mid = {
                x: center.x + (i - (list.length - 1) / 2) * 90, y: center.y
            }
            const hid = isHiddenCard(b.card)
            const el = await fx.spawn(hid ? {
                kind: "flip", tone: "burn"
            } : {
                kind: "card", card: b.card, name: nameOf(b.card), tone: "burn"
            })
            const base = hid ? FLIP_W / CARD_W : 1
            await fly(el,
                from,
                mid,
                .35 * base,
                1.15 * base,
                0,
                1,
                fx.t(380),
                "cubic-bezier(.2,.8,.3,1)")
            void (vfxReady() ? vfxMeta("drawSpark",
                mid) : burst(fx,
                mid,
                "physical",
                .8))
            await sleep(fx.t(420))
            await fly(el,
                mid,
                to,
                1.15 * base,
                .3 * base,
                1,
                0,
                fx.t(380),
                "ease-in")
            fx.drop(el)
            await burst(fx,
                to,
                "physical",
                .7)
        }))
    }
}

/** Lá tạm tan biến tại chỗ trên tay (~400 ms) */
function expireStep(fx: Fx, list: { side: Side; card: Card }[]): Step {
    return async () => {
        const me = myside()
        await Promise.all(list.map(async (b, i) => {
            const hr = handRects.get(b.card.uid)
            handRects.delete(b.card.uid)
            const pt = hr ? ptOf(hr) : handPt(b.side,
                me)
            const hid = isHiddenCard(b.card)
            const el = await fx.spawn(hid ? {
                kind: "flip", tone: "fade"
            } : {
                kind: "card", card: b.card, name: nameOf(b.card), tone: "fade"
            })
            const k = hr ? hr.width / (hid ? FLIP_W : CARD_W) : hid ? .4 : .8
            await sleep(fx.t(i * 80))
            await run(el,
                [{
                    transform: place(el,
                        pt,
                        k), opacity: 1
                },
                {
                    transform: place(el,
                        pt,
                        k * 1.08), opacity: .75, offset: .4
                },
                {
                    transform: place(el,
                        {
                            x: pt.x, y: pt.y - 22
                        },
                        k * .92), opacity: 0
                }],
                fx.t(400),
                "ease-out")
            fx.drop(el)
        }))
    }
}

/**
 * Gọi tướng úp: các lá tướng của CẢ HAI bên nằm úp trên đường rồi lật cùng lúc (không ai thấy trước ai).
 * Sau lật, tướng thật đã nằm trên sân nên lá mờ dần.
 */
function revealStep(fx: Fx, list: { unit: string; lane: number }[], evs: GameEvent[]): Step {
    return async () => {
        const view = getCard().view
        const me = myside()
        const items = await Promise.all(list.map(async (s) => {
            const hero = view?.units[s.unit]?.hero ?? s.unit.split(":")[1] ?? s.unit
            const r = unitRect(s.unit) ?? laneRect(s.unit,
                s.lane,
                me)
            const to = r ? ptOf(r) : boardCenter()
            const el = await fx.spawn({
                kind: "heroflip", hero, name: cg.getHero(hero)?.name ?? hero
            })
            return {
                el, to, k: r ? Math.max(.5,
                    r.width / FLIP_W) : .8
            }
        }))
        // 1) úp xuống đường
        await Promise.all(items.map((x) => fly(x.el,
            {
                x: x.to.x, y: x.to.y - 110
            },
            x.to,
            x.k * 1.5,
            x.k,
            0,
            1,
            fx.t(300),
            "cubic-bezier(.5,0,.9,.6)")))
        await sleep(fx.t(450))
        applyToDisplay(evs) // tướng thật hiện dưới lá đang lật
        // 2) lật cùng lúc
        await Promise.all(items.map((x) => {
            const inner = x.el.firstElementChild
            const turn = inner ? run(inner,
                [{
                    transform: "rotateY(0deg)"
                },
                {
                    transform: "rotateY(180deg)"
                }],
                fx.t(460),
                "ease-in-out") : Promise.resolve()
            const pop = run(x.el,
                [{
                    transform: place(x.el,
                        x.to,
                        x.k), opacity: 1
                },
                {
                    transform: place(x.el,
                        x.to,
                        x.k * 1.25), opacity: 1, offset: .5
                },
                {
                    transform: place(x.el,
                        x.to,
                        x.k), opacity: 1
                }],
                fx.t(460),
                "ease-in-out")
            void (vfxReady() ? vfxMeta("summon",
                x.to) : burst(fx,
                x.to,
                "gold",
                1.4))
            return Promise.all([turn,
                pop])
        }))
        await sleep(fx.t(300))
        await Promise.all(items.map((x) => run(x.el,
            [{
                transform: place(x.el,
                    x.to,
                    x.k), opacity: 1
            },
            {
                transform: place(x.el,
                    x.to,
                    x.k), opacity: 0
            }],
            fx.t(280),
            "ease-out")))
        items.forEach((x) => fx.drop(x.el))
    }
}

/** Bề rộng nền của lá úp bay (px) */
const FLIP_W = 150

/**
 * Lá úp bay từ `a` ra giữa, phóng to, lật (rotateY 180°) lộ mặt rồi thu nhỏ vào `to`.
 * Không có `face` thì giữ úp và bay thẳng về `to`.
 */
async function flipFly(fx: Fx, a: Pt, mid: Pt, to: Pt, toScale: number, face: Card | undefined, delay: number, s0 = .4) {
    await sleep(fx.t(delay))
    const el = await fx.spawn({
        kind: "flip", face, name: face ? nameOf(face) : undefined
    })
    if (!face) {
        await fly(el,
            a,
            to,
            s0 * 1.6,
            toScale,
            1,
            0,
            fx.t(460),
            "cubic-bezier(.2,.8,.3,1)")
        fx.drop(el)
        return
    }
    const inner = el.firstElementChild
    await fly(el,
        a,
        mid,
        s0,
        1.3,
        1,
        1,
        fx.t(380),
        "cubic-bezier(.2,.8,.3,1)")
    const turn = inner ? run(inner,
        [{
            transform: "rotateY(0deg)"
        },
        {
            transform: "rotateY(180deg)"
        }],
        fx.t(420),
        "ease-in-out") : Promise.resolve()
    const pop = run(el,
        [{
            transform: place(el,
                mid,
                1.3), opacity: 1
        },
        {
            transform: place(el,
                mid,
                1.55), opacity: 1, offset: .5
        },
        {
            transform: place(el,
                mid,
                1.4), opacity: 1
        }],
        fx.t(420),
        "ease-in-out")
    await Promise.all([turn,
        pop])
    await sleep(fx.t(260))
    await fly(el,
        mid,
        to,
        1.4,
        toScale,
        1,
        0,
        fx.t(340),
        "ease-in")
    fx.drop(el)
}

function drawsStep(fx: Fx, list: DrawItem[]): Step {
    return async () => {
        const me = myside()
        const center = boardCenter()
        await Promise.all(list.map(async (d, i) => {
            const mine = d.side === me
            const a = d.from ? handPt(d.from,
                me) : deckPt(d.side,
                me)
            const hr = mine && d.card ? rectOf(`[data-hand-uid="${d.card.uid}"]`) : null
            const to = hr ? ptOf(hr) : handPt(d.side,
                me)
            // Trợ thủ ra sân lấy Q/E từ bộ: chớp sáng tướng nguồn
            if (d.by) {
                void pulse(unitEl(d.by),
                    fx.t(520),
                    1.1)
                void burst(fx,
                    unitPt(d.by),
                    "gold",
                    .9)
            }
            const mid = {
                x: center.x + (i - (list.length - 1) / 2) * 70, y: center.y
            }
            // trộm bài: cả hai bên đều biết lá bị lấy nên lật mặt cho cả hai; rút thường chỉ chủ lá thấy mặt
            const seen = d.card && !(d.card as { hidden?: boolean }).hidden && (mine || d.from !== undefined)
            await flipFly(fx,
                a,
                mid,
                to,
                hr ? hr.width / FLIP_W : mine ? .4 : .3,
                seen ? d.card : undefined,
                i * 150,
                d.from !== undefined ? .3 : .4)
            if (d.card) releaseCard(d.card.uid)
            if (vfxReady()) void vfxMeta("drawSpark",
                to)
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

/** Lá thưởng úp lật mặt (cùng kiểu lật với rút bài) rồi bay về tay */
function prizeStep(fx: Fx, side: Side, card: Card): Step {
    return async () => {
        const me = myside()
        const minis = document.querySelectorAll(`[data-cg-prizes="${side}"] .bd-mini:not(.gone)`)
        const a = minis.length ? ptOf(minis[0].getBoundingClientRect()) : deckPt(side,
            me)
        const mine = side === me
        if (vfxReady()) void vfxMeta("prizeFlip",
            a)
        const hr = mine ? rectOf(`[data-hand-uid="${card.uid}"]`) : null
        await flipFly(fx,
            a,
            boardCenter(),
            hr ? ptOf(hr) : handPt(side,
                me),
            hr ? hr.width / FLIP_W : .4,
            mine ? card : undefined,
            0,
            .3)
    }
}

/** Chữ nổi bay lên và mờ dần tại `pt` (~700 ms) */
function textStep(fx: Fx, text: string, tint: "cancel" | "ice" | "gold", where: () => Pt): Step {
    return async () => {
        const pt = where()
        const el = await fx.spawn({
            kind: "text", text, tint
        })
        await run(el,
            [{
                transform: place(el,
                    {
                        x: pt.x, y: pt.y + 10
                    },
                    .8), opacity: 0
            },
            {
                transform: place(el,
                    pt,
                    1.15), opacity: 1, offset: .25
            },
            {
                transform: place(el,
                    {
                        x: pt.x, y: pt.y - 26
                    },
                    1), opacity: 0
            }],
            fx.t(800),
            "ease-out")
        fx.drop(el)
    }
}

/** Nâng cấp đồ tại chỗ: chớp vàng trên tướng, ô đồ phình ra */
function upgradeStep(fx: Fx, unit: string): Step {
    return async () => {
        const pt = unitPt(unit)
        const items = unitEl(unit)?.querySelector(".bd-items") ?? null
        await Promise.all([vfxReady() ? vfxMeta("forge",
            pt) : burst(fx,
            pt,
            "gold",
            1.3),
        pulse(items,
            fx.t(420),
            1.35)])
    }
}

/** Triệu hồi / hồi sinh: lá tướng rơi xuống đường kèm chớp sáng */
function summonStep(fx: Fx, unit: string, lane: number, ev: GameEvent): Step {
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
        applyToDisplay([ev]) // tướng hiện trên sân đúng lúc lá chạm đường
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
        const recipe = cg.cardRecipeOf(ev.item) ?? getItem(ev.item)?.recipe ?? []
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
            side: x.side, card: x.card, by: x.t === "draw" && x.reason === "support" ? x.by : undefined
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

/** Một bước hoạt ảnh kèm khoảng sự kiện [start, end) nó phụ trách */
export interface PlanItem { step: Step; start: number; end: number }

/** Dựng danh sách bước cho một lô sự kiện */
export function buildPlan(events: GameEvent[], fx: Fx): PlanItem[] {
    const steps: Step[] = []
    const spans: { start: number; end: number }[] = []
    let lastStart = 0
    // bước thêm trong vòng lặp trước kết thúc tại chỉ số i hiện tại
    const mark = (end: number) => {
        while (spans.length < steps.length) spans.push({
            start: lastStart, end
        })
    }
    const skip = new Set<number>()
    // lô có bước gọi tướng úp: các sự kiện summon liền nhau là lật cùng lúc
    const blindBatch = events.some((x) => x.t === "blindLocked" || x.t === "blindStart")
    let i = 0
    while (i < events.length) {
        mark(i)
        lastStart = i
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
                eff,
                events.slice(i,
                    j)))
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
        if (e.t === "cardBurned") {
            const list: { side: Side; card: Card }[] = []
            let j = i
            while (j < events.length) {
                const x = events[j]
                if (x.t === "cardBurned") list.push({
                    side: x.side, card: x.card
                })
                else if (x.t !== "attackCount" && x.t !== "manaChange") break
                j++
            }
            steps.push(burnStep(fx,
                list))
            i = j
            continue
        }
        if (e.t === "chainCancel") {
            const cancelled = e
            steps.push(textStep(fx,
                cg.getCardLang() === "en" ? "Cancelled" : "Bị huỷ",
                "cancel",
                () => {
                    const r = rectOf(".cs-stage") ?? null
                    const p = r ? ptOf(r) : boardCenter()
                    return {
                        x: p.x + (cancelled.n - 1) * 24, y: p.y
                    }
                }))
        } else if (e.t === "cardFrozen" || e.t === "cardThawed") {
            const fz = e
            steps.push(textStep(fx,
                fz.t === "cardFrozen" ? (cg.getCardLang() === "en" ? "Frozen" : "Hoá Băng") : (cg.getCardLang() === "en" ? "Thawed" : "Tan băng"),
                "ice",
                () => {
                    const r = fz.side === myside() ? rectOf(`[data-hand-uid="${fz.card.uid}"]`) : null
                    return r ? ptOf(r) : handPt(fz.side,
                        myside())
                }))
        } else if (e.t === "upgrade") {
            steps.push(upgradeStep(fx,
                e.unit))
        }
        if (e.t === "tempExpired") {
            const list: { side: Side; card: Card }[] = []
            let j = i
            while (j < events.length) {
                const x = events[j]
                if (x.t === "tempExpired") list.push({
                    side: x.side, card: x.card
                })
                else break
                j++
            }
            steps.push(expireStep(fx,
                list))
            i = j
            continue
        }
        if (e.t === "summon" && blindBatch) {
            // mọi tướng lộ ra trong lô (cả hai bên) lật CÙNG LÚC; các sự kiện xen giữa (Trợ thủ lấy Q/E...) vẫn chạy bước riêng sau đó
            const list: { unit: string; lane: number }[] = []
            const evs: GameEvent[] = []
            for (let j = i; j < events.length; j++) {
                const x = events[j]
                if (x.t === "turnStart") break
                if (x.t !== "summon") continue
                list.push({
                    unit: x.unit, lane: x.lane
                })
                evs.push(x)
                if (j > i) skip.add(j)
            }
            steps.push(revealStep(fx,
                list,
                evs))
            i++
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
                e.lane,
                e))
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
    mark(events.length)
    return steps.map((step, k) => ({
        step, start: spans[k].start, end: spans[k].end
    }))
}

export async function runBatch(events: GameEvent[], fx: Fx, alive: () => boolean): Promise<void> {
    let cursor = 0
    for (const p of buildPlan(events,
        fx)) {
        if (!alive()) return
        // sự kiện không có bước riêng nằm trước bước này (hồi mana đầu lượt...) hiện ngay trước bước
        applyToDisplay(events.slice(cursor,
            p.start))
        try {
            await p.step()
        } catch {
            /* một bước lỗi không được chặn các bước sau */
        }
        applyToDisplay(events.slice(p.start,
            p.end))
        cursor = p.end
    }
    applyToDisplay(events.slice(cursor))
}
