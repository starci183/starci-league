// Sân đấu chế độ thẻ bài: 2 hàng x 5 đường + ô triệu hồi phụ, thanh người chơi, chọn mục tiêu, số nổi.
// Đọc state từ store (read-only); chỉ gọi cardActions.chooseUnit / chooseLane / cancelTargeting.
import {
    useEffect, useMemo, useRef, useState, type ReactNode
} from "react"
import {
    cg
} from "@starci/shared"
import {
    cardActions, gameOf, targetable, useCard, type CardView
} from "./store"
import {
    GraveModal, PlayerStrip
} from "./board/Strip"
import {
    UnitCard, UnitTip, type Float
} from "./board/UnitCard"
import {
    tr, unitName, type Side
} from "./board/helpers"

const EXTRA = 5
const FLOAT_MS = 1100

interface FloatRec { slot: string; f: Float }
interface Hover { id: string; x: number; y: number }

const slotKey = (side: Side, lane: number) => `${side}:${lane}`

/** Chuyển một lô sự kiện thành số nổi gắn với tướng bị ảnh hưởng */
function floatsOf(events: cg.GameEvent[]): { unit: string; f: Omit<Float, "id"> }[] {
    const out: { unit: string; f: Omit<Float, "id"> }[] = []
    for (const e of events) {
        if (e.t === "damage") {
            if (e.hpLost > 0) {
                out.push({
                    unit: e.target, f: {
                        kind: e.crit ? "crit" : "dmg", text: `-${Math.round(e.hpLost)}`
                    }
                })
            } else if (e.absorbed > 0) {
                out.push({
                    unit: e.target, f: {
                        kind: "block", text: `${Math.round(e.absorbed)}`
                    }
                })
            }
        } else if (e.t === "heal" && e.amount > 0) {
            out.push({
                unit: e.target, f: {
                    kind: "heal", text: `+${Math.round(e.amount)}`
                }
            })
        } else if (e.t === "shield" && e.amount > 0) {
            out.push({
                unit: e.target, f: {
                    kind: "shield", text: `+${Math.round(e.amount)}`
                }
            })
        } else if (e.t === "kill") {
            out.push({
                unit: e.target, f: {
                    kind: "kill", text: "KO"
                }
            })
        }
    }
    return out
}

function TurnBar(p: { view: CardView; me: Side; hint: boolean }) {
    const { view, me } = p
    const t = tr()
    const spectator = view.you === null
    let label: string
    let cls = "foe"
    if (view.phase === "over") {
        label = "-"
    } else if (spectator) {
        label = `${t.sideTurn} ${view.names[view.active]}`
    } else if (view.toMove === me && view.active === me) {
        label = t.yourTurn
        cls = "mine"
    } else if (view.toMove === me) {
        label = t.react
        cls = "mine react"
    } else if (view.phase === "chain") {
        label = t.waitReact
    } else {
        label = t.oppTurn
    }
    return (
        <div className={`bd-bar ${cls}`}>
            <span className="bd-round">
                {`${t.round} ${view.round}`}
                <small>{` · ${t.turn} ${view.turnNo}`}</small>
            </span>
            <span className="bd-turn">{label}</span>
            <span className="bd-hint">{p.hint ? t.targetPick : spectator ? t.spectator : ""}</span>
        </div>
    )
}

export function Board() {
    const snap = useCard()
    const { view, targeting, tick, lastEvents } = snap
    const [hover,
        setHover] = useState<Hover | null>(null)
    const [grave,
        setGrave] = useState<Side | null>(null)
    const [floats,
        setFloats] = useState<FloatRec[]>([])
    const posRef = useRef<Map<string, string>>(new Map())
    const idRef = useRef(0)
    const timers = useRef<number[]>([])
    const seenTick = useRef(tick)

    const g = useMemo(() => (view ? gameOf(view) : null),
        [view])
    const tg = useMemo(() => targetable(targeting),
        [targeting])

    // số nổi: mỗi lần nhận lô sự kiện mới (cg:events đến trước cg:state nên vị trí cũ vẫn còn)
    useEffect(() => {
        if (tick === seenTick.current) return
        seenTick.current = tick
        const made: FloatRec[] = []
        for (const x of floatsOf(lastEvents)) {
            const u = view?.units[x.unit]
            const slot = posRef.current.get(x.unit) ?? (u && u.lane >= 0 ? slotKey(u.side,
                u.lane) : undefined)
            if (!slot) continue
            made.push({
                slot, f: {
                    ...x.f, id: ++idRef.current
                }
            })
        }
        if (!made.length) return
        setFloats((old) => [...old,
            ...made])
        const ids = new Set(made.map((m) => m.f.id))
        timers.current.push(window.setTimeout(() => setFloats((old) => old.filter((o) => !ids.has(o.f.id))),
            FLOAT_MS))
    },
    [tick,
        lastEvents,
        view])

    // nhớ ô của từng tướng (kể cả tướng vừa chết) để số nổi không mất chỗ
    useEffect(() => {
        if (!view) return
        for (const u of Object.values(view.units)) if (u.status === "board" && u.lane >= 0) posRef.current.set(u.id,
            slotKey(u.side,
                u.lane))
    },
    [view])

    useEffect(() => () => timers.current.forEach((x) => window.clearTimeout(x)),
        [])

    // Esc huỷ chọn mục tiêu
    useEffect(() => {
        if (!targeting || grave) return
        const k = (e: KeyboardEvent) => {
            if (e.key === "Escape") cardActions.cancelTargeting()
        }
        window.addEventListener("keydown",
            k)
        return () => window.removeEventListener("keydown",
            k)
    },
    [targeting,
        grave])

    if (!view || !g) return <section className="cg-board" />

    const me: Side = view.you ?? "A"
    const foe: Side = me === "A" ? "B" : "A"
    const picking = !!targeting
    const chainTargets = new Set<string>()
    const chainActors = new Set<string>()
    for (const l of view.chain?.links ?? []) {
        l.targets.forEach((x) => chainTargets.add(x))
        if (l.actor) chainActors.add(l.actor)
    }
    const hovered = hover ? view.units[hover.id] : undefined
    const linked = new Set<string>()
    if (hovered?.token?.ownerId) linked.add(hovered.token.ownerId)
    if (hovered && !hovered.token) for (const s of [me,
        foe]) {
        const tok = view.extra[s] ? view.units[view.extra[s]!] : undefined
        if (tok?.token?.ownerId === hovered.id) linked.add(tok.id)
    }

    const click = (side: Side, lane: number, uid: string | null) => {
        if (!picking) return
        if (uid && tg.units.has(uid)) return cardActions.chooseUnit(uid)
        if (side === me && tg.lanes.has(lane)) return cardActions.chooseLane(lane)
    }

    const slot = (side: Side, lane: number): ReactNode => {
        const key = slotKey(side,
            lane)
        const uid = lane === EXTRA ? view.extra[side] : view.lanes[side][lane]
        const u = uid ? view.units[uid] : undefined
        const t = tr()
        const here = floats.filter((x) => x.slot === key).map((x) => x.f)
        const laneOk = side === me && tg.lanes.has(lane)
        const unitOk = !!u && tg.units.has(u.id)
        const canPick = picking && (unitOk || laneOk)
        const state = picking ? (canPick ? "tg" : "dim") : ""
        const hit = here.some((f) => f.kind === "dmg" || f.kind === "crit") ? "hit" : ""
        if (u && u.status === "board") {
            const cls = [
                state,
                hit,
                chainTargets.has(u.id) ? "ctarget" : "",
                chainActors.has(u.id) ? "cactor" : "",
                linked.has(u.id) ? "linked" : "",
                hover?.id === u.id ? "hov" : "",
            ].join(" ")
            const owner = u.token?.ownerId ? view.units[u.token.ownerId] : undefined
            const soaked = !u.token && !!view.extra[side] && view.units[view.extra[side]!]?.token?.ownerId === u.id
            return (
                <div key={key} className={`bd-slot occupied ${lane === EXTRA ? "extra" : ""}`} data-lane={lane + 1}>
                    <UnitCard
                        u={u}
                        g={g}
                        turnNo={view.turnNo}
                        mine={side === me}
                        cls={cls}
                        floats={here}
                        ownerName={owner ? unitName(owner) : undefined}
                        soaked={soaked}
                        onEnter={(e) => setHover({
                            id: u.id, x: e.clientX, y: e.clientY
                        })}
                        onMove={(e) => setHover({
                            id: u.id, x: e.clientX, y: e.clientY
                        })}
                        onLeave={() => setHover(null)}
                        onClick={() => click(side,
                            lane,
                            u.id)}
                    />
                </div>
            )
        }
        if (lane === EXTRA) {
            return (
                <div key={key} className={`bd-slot extra empty ${state}`}>
                    <span className="bd-slot-label">{t.extra}</span>
                    <span className="bd-slot-sub">{t.emptyExtra}</span>
                    {here.map((f) => <span key={f.id} className={`bd-float ${f.kind}`}>{f.text}</span>)}
                </div>
            )
        }
        const open = view.openLanes.includes(lane)
        if (!open) {
            return (
                <div key={key} className="bd-slot closed">
                    <span className="bd-lock" />
                    <span className="bd-slot-sub">{`${t.opensRound} ${view.rules.laneOpenRound[lane]}`}</span>
                </div>
            )
        }
        return (
            <div key={key} className={`bd-slot empty ${state}`} onClick={() => click(side,
                lane,
                null)}>
                <span className="bd-slot-label">{`${t.lane} ${lane + 1}`}</span>
                {here.map((f) => <span key={f.id} className={`bd-float ${f.kind}`}>{f.text}</span>)}
            </div>
        )
    }

    const row = (side: Side) => (
        <div className={`bd-row ${side === me ? "me" : "foe"}`}>
            {[0,
                1,
                2,
                3,
                4].map((l) => slot(side,
                l))}
            {slot(side,
                EXTRA)}
        </div>
    )

    return (
        <section className={`cg-board ${picking ? "picking" : ""}`} onContextMenu={(e) => {
            if (picking) {
                e.preventDefault()
                cardActions.cancelTargeting()
            }
        }}
        >
            <TurnBar view={view} me={me} hint={picking} />
            <PlayerStrip side={foe} view={view} isMe={false} onGrave={() => setGrave(foe)} />
            {row(foe)}
            <div className="bd-mid">
                {[0,
                    1,
                    2,
                    3,
                    4].map((l) => <span key={l} className={view.openLanes.includes(l) ? "open" : ""}>{l + 1}</span>)}
                <span className="x">+</span>
            </div>
            {row(me)}
            <PlayerStrip side={me} view={view} isMe onGrave={() => setGrave(me)} />
            {hover && hovered ? <UnitTip u={hovered} g={g} turnNo={view.turnNo} x={hover.x} y={hover.y} /> : null}
            {grave ? <GraveModal side={grave} view={view} g={g} onClose={() => setGrave(null)} /> : null}
        </section>
    )
}
