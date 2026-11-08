// Biến một lô sự kiện (GameEvent[]) thành các bước hoạt ảnh nối tiếp.
// Mỗi lá đánh có 4 nhịp: (1) lá bay ra giữa sân phóng to, (2) tướng ra đòn lao tới + lá mờ dần,
// (3) đạn bay từ người ra đòn tới từng mục tiêu, (4) nổ trúng đích + rung. Số sát thương nổi vẫn do Board.tsx vẽ.
import {
    cg, getItem
} from "@starci/shared"
import {
    applyToDisplay, gameOf, getCard, prepareCardArrival
} from "../store"
import {
    flushSync
} from "react-dom"
import {
    gameCanvasScale
} from "../ui/GameCanvas"
import {
    CARD_W, boardCenter, deckPt, fadeOut, gravePt, handPt, handRect, laneRect, lunge, meSide, opponentCardRect, place, ptOf, pulse, rectOf, run, shake, sleep, unitEl, unitPt, unitRect, type Pt, type Side
} from "./helpers"
import {
    skillIcon
} from "./cardArt"
import {
    effectStylesFor, styleFor, styleSequenceFor, vfxCardHook, vfxCastBeat, vfxCue, vfxEpoch, vfxImpact, vfxMeta, vfxMushroom, vfxReady, vfxRelease, vfxTeamMana, vfxTravel
} from "../vfx/dispatch"
import {
    annotate, cuesFor, handFlight, mayCue, playCues, resetCueState, tfKind, type Cue, type CueEnv, type CueSet, type Place
} from "../vfx/heroCues"
import {
    ORNN_FORGED_ITEM, TEEMO_VFX, skillVfx
} from "../vfx/heroMap"
import {
    releaseCard, reserveHiddenArrival
} from "./pending"
import {
    landImpacts
} from "./impacts"
import {
    effectBatches, movementTracks, runActionVfxSequence, runConcurrentTargets, runVisualSequence
} from "../vfx/sequence"
import type {
    EffectEvent
} from "../vfx/semanticVfx"

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

const pendingEffects = new Set<Promise<unknown>>()
function track(effect: Promise<unknown>) {
    const settled = effect.catch(() => undefined).finally(() => pendingEffects.delete(settled))
    pendingEffects.add(settled)
}

export interface Fx {
    spawn(spec: SpriteSpec): Promise<HTMLElement>;
    drop(el: HTMLElement): void;
    /** Co thời gian theo tốc độ (nhanh hơn khi hàng đợi dài) */
    t(ms: number): number;
    active?(): boolean;
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
    "teamManaChange",
    "attackCount",
    "move",
    "reveal",
    "tokenFlip",
    "tokenEnd",
    "summonToken",
    "transform",
    "deckFlip",
    "burn"])

/** Sự kiện đi kèm hành động: kể cả bỏ bài do hiệu ứng (R Blitzcrank), khác bỏ bài chủ động có hoạt ảnh riêng */
const neutral = (x: GameEvent) => NEUTRAL.has(x.t) || (x.t === "discard" && x.reason === "effect")
type AbilityEv = Extract<GameEvent, { t: "ability" }>
const isEffectEvent = (x: GameEvent): x is EffectEvent => x.t === "damage" || x.t === "heal" || x.t === "shield" || x.t === "status"

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

const heroOf = (unit?: string): string | undefined => {
    const u = unit ? getCard().view?.units[unit] : undefined
    return u?.hero === "jayce" && u.stacks?.jayce_form === 1 ? "jayce_cannon" : u?.hero // đòn thường Pháo có BASIC riêng
}

/** Cue của tướng (heroCues.ts) -> toạ độ màn hình */
function resolvePlace(p: Place): Pt {
    const me = myside()
    if ("unit" in p) return unitPt(p.unit,
        p.lane,
        me)
    if ("hand" in p) return handPt(p.hand,
        me)
    if ("deck" in p) return deckPt(p.deck,
        me)
    if ("grave" in p) return gravePt(p.grave,
        me)
    if ("lane" in p) {
        const r = laneRect(`${p.side}:lane`,
            p.lane,
            me)
        return r ? ptOf(r) : boardCenter()
    }
    const r = p.side === myside() ? rectOf(`[data-hand-uid="${p.card}"]`) : null
    return r ? ptOf(r) : handPt(p.side,
        me)
}
const cueEnv = (): CueEnv => ({
    units: getCard().view?.units ?? {
    }, me: myside()
})

/** Nhả hold rồi chạy các cue thuộc `kinds`. Mỗi lần gọi trả về lời hứa của từng cue; cue hold trả lời ngay */
function fireCues(sets: CueSet[], kinds: Cue["kind"][]): Promise<void>[] {
    const out: Promise<void>[] = []
    for (const set of sets) {
        if (kinds.includes("with")) for (const key of set.release) vfxRelease(key)
        if (!vfxReady()) continue
        for (const cue of set.cues) if (kinds.includes(cue.kind)) out.push(vfxCue(cue,
            resolvePlace))
    }
    return out
}

/** Lá đánh (play) hoặc đòn lẻ (play = null) cùng các hiệu ứng theo sau */
function playGroup(fx: Fx, play: PlayEv | null, effects: GameEvent[], span: GameEvent[], ability?: AbilityEv): Step {
    return async () => {
        const visualEpoch = vfxEpoch()
        const me = myside()
        let caster = play?.args?.actor ?? ability?.unit
        const hits: Hit[] = []
        const kills = new Set<string>()
        const primaryDamage = effects.find((e): e is Extract<GameEvent, { t: "damage" }> => e.t === "damage" && (e.tag === "attack" || e.tag === "skill"))
        const reflected = primaryDamage ? effects.filter((e): e is Extract<GameEvent, { t: "damage" }> => e.t === "damage" && e.kind === "true" && e.tag === "effect" && e.src === primaryDamage.target && e.target === primaryDamage.src) : []
        const reflectionAt = reflected.length ? span.indexOf(reflected[0]) : -1
        const firstEffects = reflected.length ? effects.slice(0,
            effects.indexOf(reflected[0])) : effects
        const firstSpan = reflectionAt >= 0 ? span.slice(0,
            reflectionAt) : span
        const fizzledJump = play?.card.id === "khazix_e" && !span.some(e => e.t === "move" || e.t === "status" || e.t === "damage")
        let equip: EquipEv | undefined
        for (const e of firstEffects) {
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
        for (const e of effects) if (e.t === "kill") kills.add(e.target)
        for (const e of firstEffects) {
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
        if (play?.card.id === "renata_e") {
            const beneficiary = getCard().view?.chain?.links.at(-1)?.trigger.target
            if (beneficiary) {
                hits.length = 0
                add(beneficiary,
                    "gold",
                    caster)
            }
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
        if (play?.reaction && play.side !== me) flushSync(() => applyToDisplay([play]))
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
            const hr = mine ? rectOf(`[data-hand-uid="${play.card.uid}"]`) : opponentCardRect(play.side)
            const start = hr ? ptOf(hr) : handPt(play.side,
                me)
            // The physical card leaves the opponent fan before it is revealed.
            if (!mine) flushSync(() => applyToDisplay([play]))
            showScale = Math.max(.5,
                Math.min(1,
                    (window.innerHeight - 150) / (SHOW_W * 1.4 + 90)))
            showPt = {
                x: center.x + chainDepth * 34, y: center.y - 28 + chainDepth * 22
            }
            if (!mine) {
                const back = await fx.spawn({
                    kind: "flip", face: play.card, name
                })
                await Promise.all([fly(back,
                    start,
                    showPt,
                    hr ? hr.width / FLIP_W : .3,
                    SHOW_W / FLIP_W * showScale,
                    1,
                    1,
                    fx.t(460)),
                back.firstElementChild ? run(back.firstElementChild,
                    [{
                        transform: "rotateY(0deg)"
                    },
                    {
                        transform: "rotateY(180deg)"
                    }],
                    fx.t(460)) : Promise.resolve()])
                card.style.transform = place(card,
                    showPt,
                    showScale)
                card.style.opacity = "1"
                back.style.visibility = "hidden"
                fx.drop(back)
            } else await run(card,
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
            await sleep(fx.t(mine ? 650 : 750))
        }

        // Hero cues of this action: events that are not damage/heal/shield/status each carry their own recipe
        const ctxOf = (index: number) => ({
            env: cueEnv(), card: play?.card, caster, span: firstSpan, index
        })
        const setOf = (event: GameEvent): CueSet => cuesFor(event,
            ctxOf(firstSpan.indexOf(event)))
        const spanSets = firstSpan.filter(e => !isEffectEvent(e)).map(setOf)
        const openSets = play ? [playCues(play,
            ctxOf(0))] : []
        const active = () => (!fx.active || fx.active()) && visualEpoch === vfxEpoch()

        // Opening a reaction window only reveals the card; it must not attack before resolution.
        if (fizzledJump || !effects.length && !ability && !span.some(e => e.t === "teamManaChange")) {
            if (card) { await fly(card,
                showPt,
                showPt,
                showScale,
                showScale * .9,
                1,
                0,
                fx.t(180)); fx.drop(card) }
            // Chiêu chỉ đổi bộ đếm/trạng thái/Thùng (Đổi Súng Jinx, Úp Thùng Gangplank, nối Chuỗi): không có cú trúng, chỉ cue riêng của tướng
            if (!fizzledJump && vfxReady()) {
                // Mở cửa sổ Chuỗi: chỉ báo hiệu (gồng đòn); kết quả và cue của lá thuộc về lúc giải quyết mắt xích
                const windowOpening = span.some(e => e.t === "chainAdd")
                const only = windowOpening ? firstSpan.filter(e => e.t === "chainAdd").map(setOf) : [...openSets,
                    ...firstSpan.map(setOf)]
                for (const set of only) for (const cue of set.cues) if (cue.kind === "lead" && active()) await vfxCue(cue,
                    resolvePlace)
                track(Promise.all(fireCues(only,
                    ["with",
                        "after"])))
            }
            if (play?.reaction && span.some((e) => e.t === "chainAdd") || span[0]?.t === "chainResolve") await sleep(fx.t(650))
            return
        }

        // ---- nhịp 2: tướng lao tới + lá thu nhỏ bay tới đích rồi mờ dần (lá đồ thì bay tới tướng nhận)
        const first = hits[0] ? unitPt(hits[0].to) : center
        const tasks: Promise<void>[] = []
        if (caster && casterPt && !ability) {
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

        track(Promise.all(fireCues(openSets,
            ["with",
                "lead"])))
        if (casterPt && vfxReady() && play) {
            const opening = styleFor(play.card,
                hits[0]?.tint ?? "gold",
                false,
                heroOf(caster))
            const flipped = firstSpan.find((x): x is Extract<GameEvent, { t: "deckFlip" }> => x.t === "deckFlip")
            if (flipped) opening.amount = tfKind(flipped.card)
            // Truy Nã bám lá bằng trạng thái gp_wanted, không niệm hai lần
            const heldByStatus = !!opening.cast && opening.cast === skillVfx("gangplank",
                "r").cast && firstSpan.some(x => x.t === "status" && x.id === "gp_wanted")
            if (!heldByStatus) {
                // Lá Tái Chế hướng niệm về vị trí lá trên tay; chiêu thường vẽ trùm mọi mục tiêu
                const aimed = opening.recycled ? [handPt(play.side,
                    me)] : hits.filter(h => h.to !== caster).map(h => unitPt(h.to))
                const cast = vfxCastBeat(opening,
                    casterPt,
                    aimed)
                await cast.beat
                track(cast.tail)
            }
        }

        // Kéo/đẩy đến đường mới trước khi đòn gây sát thương tới đích.
        const moves = span.filter((e): e is Extract<GameEvent, { t: "move" }> => e.t === "move")
        for (const move of moves) {
            if (fx.active && !fx.active()) return
            if (play?.card.id === "darius_e" && casterPt && vfxReady()) await vfxTravel(styleFor(play.card,
                "physical",
                false,
                heroOf(caster)),
            casterPt,
            unitPt(move.unit))
            const animations: Animation[] = []
            try {
                await Promise.all(movementTracks(move,
                    play?.card.id === "khazix_e" ? "jump" : "swap").map(async track => {
                    const el = unitEl(track.unit), old = unitRect(track.unit)
                    const destination = laneRect(track.unit,
                        track.to,
                        me)
                    if (!el || !old || !destination) return
                    const to = ptOf(destination), from = ptOf(old), scale = gameCanvasScale(el), dx = (to.x - from.x) / scale, dy = (to.y - from.y) / scale
                    const duration = fx.t(620)
                    const animation = el.animate([
                        {
                            transform: "translate(0, 0)"
                        },
                        {
                            transform: `translate(${dx * .5}px, ${dy * .5 + track.arc}px)`, offset: .5
                        },
                        {
                            transform: `translate(${dx}px, ${dy}px)`
                        }
                    ],
                    {
                        duration, easing: "cubic-bezier(.2,.65,.3,1)", fill: "forwards"
                    })
                    animations.push(animation)
                    await Promise.race([animation.finished.catch(() => {}),
                        sleep(duration + 250)])
                }))
                if (!fx.active || fx.active()) flushSync(() => applyToDisplay([move]))
            } finally {
                // React now owns the new lanes; remove the temporary offsets.
                for (const animation of animations) animation.cancel()
            }
            if (play?.card.id === "khazix_e" && vfxReady() && visualEpoch === vfxEpoch()) await vfxMeta("groundSlam",
                unitPt(move.unit),
                0x9b72cb)
        }

        // ---- nhịp 3: đạn bay tới từng mục tiêu
        const icon = skillIcon(play?.card,
            caster ? getCard().view?.units[caster] : undefined)
        // Sát thương duy trì, nổ Thùng, Tibbers... xuất hiện tại nạn nhân; chỉ lá chiêu hoặc đòn đánh mới bắn đạn từ người ra đòn
        const noTravel = !play && !ability && !firstEffects.some(e => e.t === "attack")
        const ledTargets = new Set(firstSpan.filter(isEffectEvent).filter(e => setOf(e).skipTravel || setOf(e).cues.some(k => k.kind === "lead")).map(e => e.target))
        const flights = hits.filter((h) => h.to !== (h.from ?? caster) && !ledTargets.has(h.to) && !noTravel).map(async (h, i) => {
            const grouped = firstSpan.some(e => (e.t === "damage" || e.t === "heal" || e.t === "shield" || e.t === "status") && e.target === h.to && e.visualGroup)
            await sleep(fx.t(grouped ? 0 : i * 45))
            if (vfxReady()) {
                const styles = styleSequenceFor(play?.card,
                    h.tint,
                    h.crit,
                    heroOf(h.from ?? caster))
                for (const style of styles.slice(0,
                    1)) {
                    if (play?.card.id === "darius_e") style.travel = "heavyStrike"
                    await vfxTravel(style,
                        h.from ? unitPt(h.from) : (casterPt ?? center),
                        unitPt(h.to))
                }
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
        for (const set of spanSets) {
            if (!active()) return
            for (const cue of set.cues) if (cue.kind === "lead" && vfxReady()) await vfxCue(cue,
                resolvePlace)
        }

        // ---- nhịp 4: trúng đích (nổ + rung / nhấp nháy xanh khi hồi máu, khiên)
        const impacts: Promise<void>[] = []
        // 1 action -> N effect cues. Never deduplicate by target: damage, stun,
        // shield and healing on the same champion each retain their own beat.
        let effectCursor = 0
        // Cue của mọi sự kiện không phải sát thương (bộ đếm, hold, kết thúc trạng thái...) rơi cùng nhịp trúng đầu tiên, một lần
        let spanLaunched = false
        const launchSpan = () => {
            if (spanLaunched) return
            spanLaunched = true
            for (const p of fireCues(spanSets,
                ["with",
                    "after"])) track(p)
        }
        const presentEffect = async (event: EffectEvent, land: () => void) => {
            const set = setOf(event)
            for (const key of set.release) vfxRelease(key)
            if (vfxReady()) for (const cue of set.cues) if (cue.kind === "lead") await vfxCue(cue,
                resolvePlace)
            if (!active()) return
            const at = unitPt(event.target)
            const source = heroOf(event.src ?? caster)
            const tint: Tint = event.t === "damage" ? event.kind : event.t === "status" ? "gold" : event.t
            let styles = effectStylesFor(event,
                play?.card,
                source)
            // Cue Choáng/Câm Lặng/Mù riêng của tướng thay cue chung; tick duy trì thay hẳn cú trúng
            if (event.t === "status" && set.cues.some(k => k.kind !== "lead")) styles = []
            if (set.replace) styles = []
            if (set.impact) {
                const o = set.impact
                styles = styles.map(s => ({
                    ...s, impact: o.name ?? s.impact, amount: o.amount ?? s.amount, to: o.to ? o.to.map(resolvePlace) : s.to
                }))
            }
            // Khiên đỡ trọn đòn: chỉ có cue Khiên đỡ, không có cú trúng thân
            if (event.t === "damage" && set.block && event.hpLost === 0) styles = []
            for (const p of fireCues([{
                ...set, release: []
            }],
            ["with"])) track(p)
            const explicit = (event as { visuals?: string[] }).visuals !== undefined
            const render = async (style: typeof styles[number]) => {
                if (vfxReady()) await vfxImpact(style,
                    at)
                else if (event.t !== "status") await burst(fx,
                    at,
                    tint,
                    1)
            }
            const visuals = !explicit && event.t === "damage" && event.tag === "attack" && !ability && (!play || play.card.id === "basic")
                ? runActionVfxSequence(styles,
                    style => vfxReady() && event.src ? vfxTravel(style,
                        unitPt(event.src),
                        at) : Promise.resolve(),
                    render,
                    land,
                    active,
                    true)
                : runVisualSequence(styles,
                    render,
                    land,
                    active)
            await Promise.all([visuals,
                event.t === "damage" ? shake(unitEl(event.target),
                    fx.t(260)) : event.t === "heal" || event.t === "shield" ? pulse(unitEl(event.target),
                    fx.t(300),
                    1.07) : Promise.resolve()])
            for (const p of fireCues([{
                ...set, release: []
            }],
            ["after"])) track(p)
        }
        const batches = new Map(effectBatches(firstSpan).map(batch => [batch.start,
            batch]))
        for (let index = 0; index < firstSpan.length; index++) {
            if (fx.active && !fx.active()) return
            const event = firstSpan[index]
            if (event.t === "teamManaChange") {
                applyToDisplay(firstSpan.slice(effectCursor,
                    index).filter(x => x.t !== "kill"))
                await teamManaStep(fx,
                    event)()
                effectCursor = index + 1
                continue
            }
            const batch = batches.get(index)
            if (!batch) continue
            const land = () => {
                flushSync(() => {
                    landImpacts(batch.events)
                    applyToDisplay(firstSpan.slice(effectCursor,
                        batch.end).filter(x => x.t !== "kill"))
                })
                effectCursor = batch.end
                launchSpan()
            }
            if (batch.group) await runConcurrentTargets(batch.events,
                receipt => receipt.target,
                receipt => presentEffect(receipt,
                    () => {}),
                land,
                active)
            else await presentEffect(batch.events[0],
                land)
            index = batch.end - 1
        }
        launchSpan()
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
        if (!hits.length && !equip && casterPt && !ability && !["teemo_q",
            "teemo_r"].includes(play?.card.id ?? "")) {
            impacts.push(vfxReady() ? vfxImpact(styleFor(play?.card,
                "gold",
                false,
                heroOf(caster)),
            casterPt) : burst(fx,
                casterPt,
                "gold",
                .9))
        }
        // máu/khiên/trạng thái/đồ trên sân đổi đúng lúc trúng (tướng chết thì đợi mờ xong mới thành lá chết)
        applyToDisplay(firstSpan.filter((x) => x.t !== "kill"))
        await Promise.all(impacts)
        if (reflected.length && primaryDamage?.src) {
            const style = {
                travel: "reflectReturn", impact: "trueHit", color: 0xb78ad4, color2: 0xd9f2c8, intensity: 1, crit: false
            }
            const at = unitPt(primaryDamage.src)
            if (vfxReady()) await vfxTravel(style,
                unitPt(primaryDamage.target),
                at)
            const after = span.slice(reflectionAt)
            landImpacts(after)
            applyToDisplay(after.filter((x) => x.t !== "kill"))
            if (vfxReady()) await vfxImpact(style,
                at)
        }
        await Promise.all([...kills].map(async (k) => {
            const effect = vfxReady() ? vfxMeta("death",
                unitPt(k)) : Promise.resolve()
            fadeOut(unitEl(k),
                fx.t(400))
            await Promise.all([effect,
                sleep(fx.t(400))])
        }))
        applyToDisplay(span.filter((x) => x.t === "kill"))
    }
}

interface DrawItem { side: Side; card?: Card; from?: Side; by?: string; event: GameEvent; stolen?: Extract<GameEvent, { t: "steal" }>; redraw?: boolean }

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
            track((vfxReady() ? vfxMeta("drawSpark",
                mid) : burst(fx,
                mid,
                "physical",
                .8)))
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
 * The card on the battlefield itself turns over; no duplicate portrait underneath.
 */
function revealStep(fx: Fx, list: { unit: string; lane: number }[], evs: GameEvent[]): Step {
    return async () => {
        // Render the actual battlefield card, then turn that same card over. Never crossfade
        // a differently sized portrait on top of an already visible champion.
        flushSync(() => applyToDisplay(evs))
        const targets = list.map((s) => {
            const unit = unitEl(s.unit)
            const r = unit?.getBoundingClientRect() ?? laneRect(s.unit,
                s.lane,
                myside())
            const visibility = unit?.style.visibility ?? ""
            if (unit) unit.style.visibility = "hidden"
            return {
                unit, visibility, to: r ? ptOf(r) : boardCenter(), width: r?.width ?? 110, height: r?.height ?? 180
            }
        })
        const sprites: HTMLElement[] = []
        try {
            const items = await Promise.all(targets.map(async (x) => {
                const el = await fx.spawn({
                    kind: "back"
                })
                sprites.push(el)
                el.dataset.revealUnit = x.unit?.dataset.unitId ?? ""
                el.style.width = `${x.width}px`
                el.style.height = `${x.height}px`
                el.style.aspectRatio = "auto"
                return {
                    ...x, el
                }
            }))
            await Promise.all(items.map((x) => fly(x.el,
                {
                    x: x.to.x, y: x.to.y - 28
                },
                x.to,
                1.06,
                1,
                0,
                1,
                fx.t(260))))
            await sleep(fx.t(200))
            // Blind picks on both sides reveal together; no player learns an opponent pick early.
            await Promise.all(items.map(async (x) => {
                await run(x.el,
                    [{
                        transform: `${place(x.el,
                            x.to)} perspective(900px) rotateY(0deg)`, opacity: 1
                    },
                    {
                        transform: `${place(x.el,
                            x.to)} perspective(900px) rotateY(90deg)`, opacity: 1
                    }],
                    fx.t(220),
                    "ease-in")
                // React removes sprites on its next commit; hide the back synchronously
                // so it cannot overlap the real face during that handoff frame.
                x.el.style.visibility = "hidden"
                fx.drop(x.el)
                if (x.unit) {
                    x.unit.style.visibility = x.visibility
                    track(vfxReady() ? vfxMeta("summon",
                        x.to) : burst(fx,
                        x.to,
                        "gold"))
                    await run(x.unit,
                        [{
                            transform: "perspective(900px) rotateY(-90deg)", opacity: 1
                        },
                        {
                            transform: "perspective(900px) rotateY(0deg)", opacity: 1
                        }],
                        fx.t(240),
                        "ease-out",
                        "none")
                }
            }))
            await sleep(fx.t(140))
        } finally {
            targets.forEach((x) => { if (x.unit) x.unit.style.visibility = x.visibility })
            sprites.forEach((el) => fx.drop(el))
        }
    }
}

/** Bề rộng nền của lá úp bay (px) */
const FLIP_W = 150

async function reserveArrival(fx: Fx, side: Side, card: Card) {
    const existing = Array.from(document.querySelectorAll<HTMLElement>(".hd-slot[data-hand-uid]"))
        .map((el) => ({
            el, left: el.getBoundingClientRect().left
        }))
    flushSync(() => prepareCardArrival(side,
        card))
    await Promise.all(existing.map(({ el, left }) => {
        const dx = (left - el.getBoundingClientRect().left) / gameCanvasScale(el)
        return Math.abs(dx) > .5 ? run(el,
            [{
                transform: `translateX(${dx}px)`
            },
            {
                transform: "translateX(0)"
            }],
            fx.t(180),
            "ease-out",
            "none") : Promise.resolve()
    }))
}

/**
 * Lá úp bay từ `a` ra giữa, phóng to, lật (rotateY 180°) lộ mặt rồi thu nhỏ vào `to`.
 * Không có `face` thì giữ úp và bay thẳng về `to`.
 */
async function flipFly(fx: Fx, a: Pt, mid: Pt, to: Pt, toScale: number, face: Card | undefined, delay: number, s0 = .4, onLand?: () => void) {
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
        onLand?.()
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
        1,
        fx.t(340),
        "ease-in")
    onLand?.()
    await sleep(fx.t(50))
    fx.drop(el)
}

function drawsStep(fx: Fx, list: DrawItem[]): Step {
    return async () => {
        const me = myside()
        const center = boardCenter()
        for (const d of list) {
            if (fx.active?.() === false) return
            const mine = d.side === me
            const hiddenArrival = !mine && d.event.t !== "drawAuto" && d.event.t !== "steal"
            if (hiddenArrival) flushSync(() => reserveHiddenArrival(d.side,
                1))
            if (hiddenArrival) await sleep(fx.t(180))
            if (d.card && d.event.t !== "drawAuto" && d.event.t !== "steal") {
                await reserveArrival(fx,
                    d.side,
                    d.card)
            }
            if (fx.active?.() === false) return
            // Lá Tái Chế, lá rèn của Ornn, lá R của Yorick, Q miễn phí Kha'Zix, Nấm rút bù... bay lên tay bằng cue của tướng
            const hero = vfxReady() && (d.event.t === "create" || d.event.t === "freeCard" || d.event.t === "returnToHand" || d.event.t === "draw")
                ? d.redraw ? {
                    kind: "lead", name: TEEMO_VFX.redraw, from: {
                        deck: d.side
                    }, to: [{
                        hand: d.side
                    }], color: skillVfx("teemo",
                        "p").color, color2: skillVfx("teemo",
                        "p").color2
                } as Cue : handFlight(d.event,
                    cueEnv())
                : undefined
            if (hero) {
                const slot = mine && d.card ? rectOf(`[data-hand-uid="${d.card.uid}"] .cv`) : hiddenArrival ? opponentCardRect(d.side,
                    true) : null
                const landing = slot ? ptOf(slot) : handPt(d.side,
                    me)
                await vfxCue(hero,
                    (pl) => "hand" in pl && pl.hand === d.side ? landing : resolvePlace(pl))
                flushSync(() => {
                    applyToDisplay([d.event])
                    if (d.card) releaseCard(d.card.uid)
                    if (hiddenArrival) reserveHiddenArrival(d.side,
                        -1)
                })
                await sleep(fx.t(60))
                continue
            }
            let a = d.from ? handPt(d.from,
                me) : d.event.t === "create" ? center : deckPt(d.side,
                me)
            let hook: ReturnType<typeof vfxCardHook> | undefined
            if (d.stolen) {
                // A common stolen card keeps its UID. Its newly reserved destination
                // must never be mistaken for the source in the opponent's hand.
                const ownedSource = d.from === me ? rectOf(`[data-hand-uid="${d.stolen.card.uid}"] .cv`) : null
                const source = ownedSource ?? rectOf(`[data-chain-card-uid="${d.stolen.card.uid}"]`) ?? (d.from ? opponentCardRect(d.from) : null)
                if (source) a = ptOf(source)
                const thief = Object.values(getCard().view?.units ?? {
                }).find((u) => u.side === d.side && u.hero === "blitzcrank" && u.status === "board")
                const catcher = thief ? unitPt(thief.id) : center
                if (thief) {
                    hook = vfxCardHook(catcher,
                        a)
                    await hook.reached
                }
                if (fx.active?.() === false) { await hook?.release(); return }
                flushSync(() => applyToDisplay([d.stolen!]))
                if (d.card && d.card.uid !== d.stolen.card.uid) {
                    const original = await fx.spawn({
                        kind: "card", card: d.stolen.card, name: nameOf(d.stolen.card)
                    })
                    original.dataset.stolenUid = d.stolen.card.uid
                    original.style.transform = place(original,
                        a,
                        .5)
                    if (hook) await tetheredFlight(hook,
                        original,
                        a,
                        catcher,
                        .5,
                        1,
                        fx.t(440))
                    else await fly(original,
                        a,
                        catcher,
                        .5,
                        1,
                        1,
                        1,
                        fx.t(440))
                    await hook?.release()
                    hook = undefined
                    await Promise.all([fadeOut(original,
                        fx.t(160)),
                    burst(fx,
                        catcher,
                        "gold")])
                    fx.drop(original)
                    a = catcher
                }
            }
            const hr = mine && d.card ? rectOf(`[data-hand-uid="${d.card.uid}"] .cv`) : hiddenArrival ? opponentCardRect(d.side,
                true) : null
            const scale = hr ? hr.width / FLIP_W : mine ? .4 : .22
            const to = d.event.t === "steal" ? gravePt(d.card?.side ?? d.from ?? d.side,
                me) : hr ? ptOf(hr) : handPt(d.side,
                me)
            if (hr && !mine) to.y = hr.bottom - FLIP_W * 1.4 * scale / 2
            // Trợ thủ ra sân lấy Q/E từ bộ: chớp sáng tướng nguồn
            if (d.by) {
                track(pulse(unitEl(d.by),
                    fx.t(520),
                    1.1))
                track(burst(fx,
                    unitPt(d.by),
                    "gold",
                    .9))
            }
            // trộm bài: cả hai bên đều biết lá bị lấy nên lật mặt cho cả hai; rút thường chỉ chủ lá thấy mặt
            const seen = d.card && !(d.card as { hidden?: boolean }).hidden && (mine || d.from !== undefined)
            const el = await fx.spawn({
                kind: "flip", face: seen ? d.card : undefined, name: seen && d.card ? nameOf(d.card) : undefined
            })
            if (d.card) el.dataset.arrivalUid = d.card.uid
            // Keep the flight and the actual hand card the same shape at touchdown.
            if (hr && mine) el.style.height = `${hr.height / scale}px`
            el.style.transform = place(el,
                a,
                .32)
            const arc = {
                x: a.x + (to.x - a.x) * .54, y: Math.min(a.y,
                    to.y) - 46
            }
            const turn = seen && el.firstElementChild ? run(el.firstElementChild,
                [{
                    transform: "rotateY(0deg)"
                },
                {
                    transform: "rotateY(0deg)", offset: .22
                },
                {
                    transform: "rotateY(180deg)", offset: .76
                },
                {
                    transform: "rotateY(180deg)"
                }],
                fx.t(620),
                "ease-in-out") : Promise.resolve()
            const motion = hook ? tetheredFlight(hook,
                el,
                a,
                to,
                .32,
                scale,
                fx.t(620),
                arc) : run(el,
                [{
                    transform: place(el,
                        a,
                        .32,
                        8), opacity: .9
                },
                {
                    transform: place(el,
                        arc,
                        Math.max(scale,
                            .7),
                        -4), opacity: 1, offset: .45
                },
                {
                    transform: place(el,
                        to,
                        scale), opacity: 1
                }],
                fx.t(620),
                "cubic-bezier(.2,.55,.3,1)")
            await Promise.all([turn,
                motion])
            flushSync(() => {
                if (d.stolen) applyToDisplay([d.stolen])
                applyToDisplay([d.event])
                if (d.card) releaseCard(d.card.uid)
                if (hiddenArrival) reserveHiddenArrival(d.side,
                    -1)
            })
            await hook?.release()
            await sleep(32)
            el.style.visibility = "hidden"
            fx.drop(el)
            if (vfxReady()) track(vfxMeta("drawSpark",
                to))
            await sleep(fx.t(100))
        }
    }
}

function cardAnchor(el: HTMLElement): Pt {
    const r = el.getBoundingClientRect()
    return {
        x: r.x + r.width / 2, y: r.y + r.height / 2
    }
}

/** DOM card and Pixi claw share a frame update, avoiding a trailing-frame cable. */
async function tetheredFlight(hook: ReturnType<typeof vfxCardHook>, el: HTMLElement, from: Pt, to: Pt, startScale: number, endScale: number, ms: number, control?: Pt) {
    const started = performance.now()
    const bend = control ?? {
        x: (from.x + to.x) / 2, y: (from.y + to.y) / 2
    }
    let finish = () => {}
    const arrived = new Promise<void>((resolve) => { finish = resolve })
    hook.follow(() => {
        const raw = Math.min(1,
            (performance.now() - started) / Math.max(1,
                ms))
        const t = raw * raw * (3 - 2 * raw)
        const pt = {
            x: (1 - t) ** 2 * from.x + 2 * (1 - t) * t * bend.x + t * t * to.x,
            y: (1 - t) ** 2 * from.y + 2 * (1 - t) * t * bend.y + t * t * to.y
        }
        el.style.transform = place(el,
            pt,
            startScale + (endScale - startScale) * t + Math.sin(Math.PI * t) * .15,
            Math.sin(Math.PI * t) * -5)
        el.style.opacity = "1"
        if (raw >= 1) finish()
        return cardAnchor(el)
    })
    await Promise.race([arrived,
        hook.ended])
    el.style.transform = place(el,
        to,
        endScale)
    hook.follow(() => cardAnchor(el))
}

/** Xáo bộ bài: vài lá úp chia hai nửa rồi trộn xen kẽ ngay tại số đếm bộ bài */
function shuffleStep(fx: Fx, side: Side): Step {
    return async () => {
        const c = deckPt(side,
            myside())
        if (vfxReady()) track(vfxMeta("shuffle",
            c))
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
function prizeStep(fx: Fx, ev: Extract<GameEvent, { t: "prize" }>): Step {
    return async () => {
        const { side, card } = ev
        const me = myside()
        const minis = document.querySelectorAll(`[data-cg-prizes="${side}"] .bd-mini:not(.gone)`)
        const a = minis.length ? ptOf(minis[0].getBoundingClientRect()) : deckPt(side,
            me)
        const mine = side === me
        if (vfxReady()) track(vfxMeta("prizeFlip",
            a))
        await reserveArrival(fx,
            side,
            card)
        const hr = mine ? rectOf(`[data-hand-uid="${card.uid}"] .cv`) : null
        await flipFly(fx,
            a,
            boardCenter(),
            hr ? ptOf(hr) : handPt(side,
                me),
            hr ? hr.width / FLIP_W : .4,
            mine ? card : undefined,
            0,
            .3,
            () => flushSync(() => {
                applyToDisplay([ev])
                releaseCard(card.uid)
            }))
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
    return revealStep(fx,
        [{
            unit, lane
        }],
        [ev])
}

/** Sự kiện ngoài hành động (đầu lượt, hết hạn, rụng bộ đếm...) mà tướng có cue riêng: cue rơi cùng nhịp đổi số, không giữ hàng đợi lâu */
function ambientStep(fx: Fx, evs: GameEvent[]): Step {
    return async () => {
        if (!vfxReady()) return
        const env = cueEnv()
        const sets = evs.map((e, index) => cuesFor(e,
            {
                env, span: evs, index
            }))
        for (const set of sets) {
            for (const cue of set.cues) {
                if (fx.active && !fx.active()) return
                if (cue.kind === "lead") await vfxCue(cue,
                    resolvePlace)
            }
        }
        applyToDisplay(evs.filter(x => x.t !== "kill"))
        const tails = fireCues(sets,
            ["with",
                "after"])
        for (const set of sets) if (set.cues.some(k => k.kind !== "lead")) await Promise.race([Promise.all(tails),
            sleep(fx.t(650))])
        for (const tail of tails) track(tail)
    }
}

/** Ornn rèn thẳng vào ô đồ: búa nện ở Ornn, món rơi vào ô đồ của tướng nhận */
function ornnForgeStep(fx: Fx, ev: CraftEv, hammer: string | undefined): Step {
    return async () => {
        if (!ev.unit) return
        const items = unitEl(ev.unit)?.querySelector(".bd-items") ?? null
        const slot = items ? ptOf(items.getBoundingClientRect()) : unitPt(ev.unit)
        const from = hammer ? unitPt(hammer) : slot
        if (vfxReady()) await vfxMeta(ORNN_FORGED_ITEM,
            from,
            skillVfx("ornn",
                "r").color,
            [slot])
        await pulse(items,
            fx.t(380),
            1.3)
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
        track((vfxReady() ? vfxMeta("forge",
            center) : burst(fx,
            center,
            "gold",
            1.6)))
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
            side: x.side, card: x.card, by: x.t === "draw" && x.reason === "support" ? x.by : undefined, event: x
        }
    }
    if (x.t === "create" && x.zone === "hand") {
        return {
            side: x.side, card: x.card, event: x
        }
    }
    if (x.t === "steal") {
        return {
            side: x.to, card: x.card, from: x.from, event: x, stolen: x
        }
    }
    return null
}

/** Mana receipt and blue resource cue share one beat, before the skill is cast. */
function teamManaStep(fx: Fx, event: Extract<GameEvent, { t: "teamManaChange" }>): Step {
    return async () => {
        if (fx.active && !fx.active()) return
        const hud = rectOf(`[data-team-mana="${event.side}"]`)
        const pool = hud ? ptOf(hud) : handPt(event.side,
            myside())
        const actor = event.unit ? unitPt(event.unit) : pool
        const from = event.delta < 0 ? pool : actor, to = event.delta < 0 ? actor : pool
        const land = () => { if (!fx.active || fx.active()) applyToDisplay([event]) }
        if (event.delta && vfxReady()) await vfxTeamMana(from,
            to,
            event.delta,
            land)
        else land()
    }
}

/** Trap receipts never enter either hand. HP lands when the mushroom reaches its victim. */
function mushroomStep(fx: Fx, event: Extract<GameEvent, { t: "mushroom" }>, span: GameEvent[]): Step {
    return async () => {
        const deck = deckPt(event.side,
            myside())
        if (event.phase === "plant") {
            const creates = span.filter((x): x is Extract<GameEvent, { t: "create" }> => x.t === "create")
            for (let n = 0; n < event.count; n++) {
                if (fx.active && !fx.active()) return
                if (vfxReady()) await vfxMushroom("plant",
                    unitPt(event.source),
                    deck)
                else await sleep(fx.t(620))
                if (creates[n]) applyToDisplay([creates[n]])
            }
            applyToDisplay(span.filter(x => x.t !== "create"))
        } else {
            const at = event.target ? unitPt(event.target) : deck
            const effect = vfxReady() ? vfxMushroom("burst",
                deck,
                at) : Promise.resolve()
            await sleep(fx.t(480))
            if (fx.active && !fx.active()) return
            landImpacts(span)
            applyToDisplay(span.filter(x => x.t !== "kill"))
            await effect
            for (const e of span) if (e.t === "kill") await fadeOut(unitEl(e.target),
                fx.t(300))
            applyToDisplay(span.filter(x => x.t === "kill"))
        }
    }
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
        if (e.t === "teamManaChange") {
            steps.push(teamManaStep(fx,
                e))
            i++
            continue
        }
        // drawAuto is a triggered trap, not a card arriving in the hand. The public
        // mushroom event works for both players even when the private card is masked.
        if (e.t === "drawAuto" && events[i + 1]?.t === "mushroom") {
            steps.push(async () => { applyToDisplay([e]) })
            i++
            continue
        }
        if (e.t === "mushroom") {
            let j = i + 1
            while (j < events.length) {
                const x = events[j]
                if (e.phase === "plant" ? x.t === "create" && x.zone === "deck" || x.t === "shuffle" : EFFECT.has(x.t) || NEUTRAL.has(x.t)) j++
                else break
            }
            steps.push(mushroomStep(fx,
                e,
                events.slice(i,
                    j)))
            i = j
            continue
        }
        if (e.t === "chainResolve") {
            const eff: GameEvent[] = []
            let j = i + 1
            while (j < events.length) {
                const x = events[j]
                if (x.t === "chainResolve") break
                if (x.t === "attack" && (e.card?.id === "renata_r" || eff.some((previous) => previous.t === "attack"))) break
                if (EFFECT.has(x.t)) eff.push(x)
                else if (!neutral(x)) break
                j++
            }
            const played: PlayEv | null = e.card ? {
                t: "play", side: e.side, card: e.card, reaction: true
            } : null
            // Mắt xích không gây gì (Đổi Súng, Tàng Hình...) vẫn qua playGroup: cue riêng của tướng, nhả hold gồng đòn, rồi nghỉ nhịp như cũ
            steps.push(playGroup(fx,
                played,
                eff,
                events.slice(i,
                    j)))
            i = j
            continue
        }
        // Nút hành động của tướng (Kích Nổ Bom, Úp Lá): không có lá, nên không khoe lá; cue riêng của tướng và hậu quả đi cùng
        if (e.t === "ability") {
            const eff: GameEvent[] = []
            let j = i + 1
            while (j < events.length) {
                const x = events[j]
                if (x.t === "chainResolve" || x.t === "ability" || x.t === "play") break
                if (EFFECT.has(x.t)) eff.push(x)
                else if (!neutral(x)) break
                j++
            }
            steps.push(playGroup(fx,
                null,
                eff,
                events.slice(i,
                    j),
                e))
            i = j
            continue
        }
        if (e.t === "play" || EFFECT.has(e.t)) {
            const eff: GameEvent[] = []
            let j = e.t === "play" ? i + 1 : i
            while (j < events.length) {
                const x = events[j]
                if (x.t === "chainResolve") break
                if (x.t === "attack" && (e.t === "play" && e.card.id === "renata_r" || eff.some((previous) => previous.t === "attack"))) break
                if (EFFECT.has(x.t)) eff.push(x)
                else if (!neutral(x)) break
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
        if (e.t === "steal") {
            let j = i + 1
            while (j < events.length && ["status",
                "statusEnd",
                "manaChange",
                "stack",
                "log"].includes(events[j].t)) j++
            const receipt = events[j]
            const gained = receipt ? drawLike(receipt) : null
            if (gained && gained.side === e.to && (receipt.t === "create" || receipt.t === "draw")) {
                steps.push(drawsStep(fx,
                    [{
                        ...gained, from: e.from, stolen: e
                    }]))
                i = j + 1
                continue
            }
        }
        const d0 = drawLike(e)
        if (d0) {
            if (e.t === "draw" && e.reason === "effect" && events.slice(Math.max(0,
                i - 8),
            i).some(x => x.t === "mushroom" && x.phase === "burst")) d0.redraw = true
            const list = [d0]
            let j = i + 1
            while (j < events.length) {
                if (events[j].t === "steal") break
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
        // bỏ bài chủ động ("manual") dùng chung hoạt ảnh lá bay vào mộ với lá bị đốt
        if (e.t === "cardBurned" || (e.t === "discard" && e.reason === "manual")) {
            const list: { side: Side; card: Card }[] = []
            let j = i
            while (j < events.length) {
                const x = events[j]
                if (x.t === "cardBurned" || (x.t === "discard" && x.reason === "manual")) list.push({
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
                cg.getCardLang() === "en" ? `Link ${cancelled.n} · Cancelled` : `Mắt xích ${cancelled.n} · Vô hiệu`,
                "cancel",
                () => {
                    const r = rectOf(`[data-chain-link="${cancelled.n}"]`) ?? null
                    const p = r ? ptOf(r) : boardCenter()
                    return {
                        x: p.x, y: p.y
                    }
                }))
        } else if (e.t === "cardFrozen" || e.t === "cardThawed") {
            const fz = e
            const label = textStep(fx,
                fz.t === "cardFrozen" ? (cg.getCardLang() === "en" ? "Frozen" : "Hoá Băng") : (cg.getCardLang() === "en" ? "Thawed" : "Tan băng"),
                "ice",
                () => {
                    const r = fz.side === myside() ? rectOf(`[data-hand-uid="${fz.card.uid}"]`) : null
                    return r ? ptOf(r) : handPt(fz.side,
                        myside())
                })
            // Băng của Lissandra bò từ cú trúng lên lá (chạm lá thì Hoá Băng đáp và giữ tới khi tan); tan băng nhả hold
            steps.push(async () => {
                const sets = [cuesFor(fz,
                    {
                        env: cueEnv()
                    })]
                for (const set of sets) for (const cue of set.cues) if (cue.kind === "lead" && vfxReady()) await vfxCue(cue,
                    resolvePlace)
                for (const tail of fireCues(sets,
                    ["with",
                        "after"])) track(tail)
                await label()
            })
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
                e))
        } else if (e.t === "summon" || e.t === "respawn") {
            steps.push(summonStep(fx,
                e.unit,
                e.lane,
                e))
        } else if (mayCue(e) && e.t !== "cardFrozen" && e.t !== "cardThawed") {
            const run: GameEvent[] = []
            let j = i
            while (j < events.length && mayCue(events[j]) && events[j].t !== "cardFrozen" && events[j].t !== "cardThawed" && !skip.has(j)) run.push(events[j++])
            steps.push(ambientStep(fx,
                run))
            i = j
            continue
        } else if (e.t === "craft") {
            const hammer = e.unit && !e.card ? [...events.slice(0,
                i)].reverse().find((x): x is PlayEv => x.t === "play" && x.card.hero === "ornn") : undefined
            steps.push(hammer ? ornnForgeStep(fx,
                e,
                Object.keys(getCard().view?.units ?? {
                }).find(id => id.startsWith(`${hammer.side}:ornn`))) : craftStep(fx,
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
    // Ghi chú theo lô cho cue của tướng: bộ đếm lúc đầu lô, nguồn Khiên, loại lá TF, nội dung Thùng...
    if (events.some(e => e.t === "roundStart" && e.round <= 1)) resetCueState()
    try {
        annotate(events,
            getCard().view?.units ?? {
            })
    } catch {
        /* chỉ phục vụ cue phụ */
    }
    // lô chuyển lượt (rút, quà, đốt lá, hết hạn) không có hành động để xem: chạy nhanh để người chơi vào việc ngay
    const transition = !events.some(e => e.t === "play" || e.t === "attack" || e.t === "ability" || e.t === "chainResolve")
    const pace: Fx = transition ? {
        ...fx, t: (ms) => fx.t(ms) * .5
    } : fx
    for (const p of buildPlan(events,
        pace)) {
        if (!alive()) return
        // sự kiện không có bước riêng nằm trước bước này (hồi mana đầu lượt...) hiện ngay trước bước
        applyToDisplay(events.slice(cursor,
            p.start))
        if (events[p.start]?.t === "chainResolve" || events[p.start]?.t === "chainCancel") applyToDisplay(events.slice(p.start,
            p.start + 1))
        const first = events[p.start]
        if (first?.t === "play" && first.reaction) applyToDisplay(events.slice(p.start,
            p.end).filter((e) => e.t === "chainAdd" || e.t === "chainWindow"))
        try {
            await p.step()
        } catch (error) {
            // một bước lỗi không được chặn các bước sau, nhưng phải thấy được để sửa
            console.warn("[anim] bước hoạt ảnh lỗi",
                error)
        }
        applyToDisplay(events.slice(p.start,
            p.end))
        await Promise.all([...pendingEffects])
        cursor = p.end
    }
    await Promise.all([...pendingEffects])
    applyToDisplay(events.slice(cursor))
}
