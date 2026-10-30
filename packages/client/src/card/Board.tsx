// Sân đấu chế độ thẻ bài: 2 hàng x 5 đường + ô triệu hồi phụ, thanh người chơi, chọn mục tiêu, số nổi.
// Đọc state từ store (read-only); chỉ gọi cardActions.chooseUnit / chooseLane / cancelTargeting.
import {
    useEffect, useMemo, useRef, useState, type ReactNode
} from "react"
import {
    onImpactFloats
} from "./anim/impacts"
import {
    cg
} from "@starci/shared"
import {
    attacksOf, cardActions, cardlessOptions, gameOf, targetable, useCard, type CardView
} from "./store"
import {
    DeckModal, GraveModal, PlayerHud, PlayerPiles
} from "./board/Strip"
import {
    OpponentHand
} from "./board/OpponentHand"
import {
    inspectionActions
} from "./ui/inspection"
import {
    CritIcon, DeadCard, Img, UnitCard, UnitTip, type Float
} from "./board/UnitCard"
import {
    heroName, isEn, tr, unitName, type Side
} from "./board/helpers"
import {
    inspectedUnit
} from "./stats/UnitPanel"
import {
    useChainAnim
} from "./chain/anim"

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
                        kind: e.crit ? "crit" : "dmg", text: `-${Math.round(e.hpLost)}`, dmg: e.kind
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
        } else if (e.t === "manaChange" && e.delta !== 0) {
            out.push({
                unit: e.unit, f: {
                    kind: "mana", text: `${e.delta > 0 ? "+" : "−"}${Math.abs(Math.round(e.delta))}`
                }
            })
        } else if (e.t === "attack" && e.cardless) {
            out.push({
                unit: e.attacker, f: {
                    kind: "tag", text: `${Math.round(cg.RULES.fighterCardlessMult * 100)}%`
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

export function TurnBar(p: { view: CardView; me: Side; hint: boolean; busy: boolean }) {
    const { view, me } = p
    const { log } = useCard()
    const lastAction = [...log].reverse().find(({ e }) => ["play",
        "attack",
        "draw",
        "drawAuto",
        "prize",
        "turnStart"].includes(e.t))?.e
    const actionPhase = lastAction?.t === "attack" || lastAction?.t === "play" && lastAction.card.id === "basic" ? "Battle" : lastAction?.t === "draw" || lastAction?.t === "drawAuto" ? "Draw" : lastAction?.t === "prize" ? "Reward" : "Skills"
    const chainAnim = useChainAnim()
    const shownPhase = chainAnim ? "chain" : view.phase
    const chainCount = chainAnim?.links.length ?? view.chain?.links.length ?? 0
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
    if (p.busy && view.phase !== "over") label = isEn() ? "Resolving…" : "Đang giải quyết…"
    else if (chainAnim && view.phase !== "chain") label = isEn() ? "Chain ended" : "Chuỗi kết thúc"
    const phases = isEn() ? {
        blind: "Face-down summons", summon: "Summon", main: "Actions", chain: "Chain", over: "Game over"
    } : {
        blind: "Gọi tướng úp", summon: "Triệu hồi", main: "Hành động", chain: "Chuỗi", over: "Kết thúc"
    }
    return (
        <div className={`bd-bar ${cls} ${p.busy ? "busy" : ""}`}>
            <div className="bd-phase-ribbon" aria-label={isEn() ? "Turn sequence" : "Trình tự lượt"}>{["Draw",
                "Reward",
                "Skills",
                "Battle"].map(name => <span key={name} className={view.phase === "main" && name === actionPhase ? "active" : ""}>{name}</span>)}</div>
            <span className="bd-phase">{phases[shownPhase]}{shownPhase === "chain" ? ` ${chainCount}/${cg.RULES.maxChain}` : ""}</span>
            <span className="bd-round" title={`${t.turn} ${view.turnNo} · ${view.names[view.active]}`}>
                {`${t.round} ${view.round}`}
                <small>{` · ${t.turn} ${view.turnNo}`}</small>
            </span>
            <span className="bd-turn">{label}</span>
            <span className="bd-active-owner">{view.names[view.active]}</span>
            <span className="bd-hint">{p.hint ? t.targetPick : spectator ? t.spectator : ""}</span>
        </div>
    )
}

export function Board() {
    const snap = useCard()
    const { view, targeting } = snap
    const [hover,
        setHover] = useState<Hover | null>(null)
    const [grave,
        setGrave] = useState<Side | null>(null)
    const [deck,
        setDeck] = useState<Side | null>(null)
    const [floats,
        setFloats] = useState<FloatRec[]>([])
    const posRef = useRef<Map<string, string>>(new Map())
    const idRef = useRef(0)
    const timers = useRef<number[]>([])
    const viewRef = useRef(view)
    viewRef.current = view
    const g = useMemo(() => (view ? gameOf(view) : null),
        [view])
    const tg = useMemo(() => targetable(targeting),
        [targeting])

    // số nổi: phát khi hoạt ảnh tới nhịp trúng đích (anim/impacts), không phải lúc state tới
    useEffect(() => onImpactFloats((events) => {
        const view = viewRef.current
        const made: FloatRec[] = []
        for (const x of floatsOf(events)) {
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
    }),
    [])

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
    const selId = inspectedUnit(view,
        snap.inspect)?.id
    const hovered = hover ? view.units[hover.id] : undefined
    const jumpSelected = targeting && view.players[me].hand?.find(card => card.uid === targeting.source)?.id === "khazix_e"
    const jumper = jumpSelected ? Object.values(view.units).find(unit => unit.side === me && unit.hero === "khazix" && unit.status === "board") : undefined
    const prey = jumper && hovered?.side === foe && tg.units.has(hovered.id) ? hovered : undefined
    const movePreview = (side: Side, lane: number): string | undefined => {
        if (!jumper || !prey || lane === EXTRA) return undefined
        if (side === foe && lane === prey.lane) return isEn() ? "Prey" : "Con mồi"
        if (side !== me) return undefined
        if (lane === prey.lane) return isEn() ? "Kha’Zix lands here" : "Kha’Zix đáp xuống"
        if (lane === jumper.lane) {
            const ally = view.units[view.lanes[me][prey.lane] ?? ""]
            return ally ? `${unitName(ally)} ${isEn() ? "moves here" : "nhường về đây"}` : isEn() ? "Jump starts here" : "Nhảy từ đây"
        }
        return undefined
    }
    const linked = new Set<string>()
    if (hovered?.token?.ownerId) linked.add(hovered.token.ownerId)
    if (hovered && !hovered.token) for (const s of [me,
        foe]) {
        const tok = view.extra[s] ? view.units[view.extra[s]!] : undefined
        if (tok?.token?.ownerId === hovered.id) linked.add(tok.id)
    }

    const click = (side: Side, lane: number, uid: string | null) => {
        if (!picking) {
            if (uid) {
                inspectionActions.unit(uid)
                cardActions.inspect(uid)
            }
            return
        }
        if (uid && tg.units.has(uid)) return cardActions.chooseUnit(uid)
        if (side === me && tg.lanes.has(lane)) return cardActions.chooseLane(lane)
    }

    const slot = (side: Side, lane: number): ReactNode => {
        const key = slotKey(side,
            lane)
        const uid = lane === EXTRA ? view.extra[side] : view.lanes[side][lane]
        // view đã là bản hiển thị (store.applyToDisplay): máu/khiên/trạng thái đổi đúng nhịp hoạt ảnh
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
                selId === u.id ? "sel" : "",
            ].join(" ")
            const owner = u.token?.ownerId ? view.units[u.token.ownerId] : undefined
            const cardless = side === me && !u.token && g.role(u) === "fighter" ? (() => {
                const used = attacksOf(view,
                    side).cardless.includes(u.id)
                const opts = cardlessOptions(snap.legal,
                    u.id)
                if (!used && !opts.length) return undefined
                return {
                    used,
                    ready: !used && opts.length > 0 && !picking,
                    pct: Math.round(view.rules.fighterCardlessMult * 100),
                    onClick: () => cardActions.beginTargeting(u.id,
                        opts),
                }
            })() : undefined
            const soaked = !u.token && !!view.extra[side] && view.units[view.extra[side]!]?.token?.ownerId === u.id
            return (
                <div key={key} className={`bd-slot occupied ${lane === EXTRA ? "extra" : ""}`} data-lane={lane + 1} data-move-preview={movePreview(side,
                    lane)}>
                    <UnitCard
                        u={u}
                        g={g}
                        turnNo={view.turnNo}
                        mine={side === me}
                        cls={cls}
                        floats={here}
                        ownerName={owner ? unitName(owner) : undefined}
                        soaked={soaked}
                        cardless={cardless}
                        onEnter={(e) => {
                            inspectionActions.unit(u.id)
                            setHover({
                                id: u.id, x: e.clientX, y: e.clientY
                            })
                        }}
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
        if (u && u.status === "dead") {
            return (
                <div key={key} className={`bd-slot occupied dead ${lane === EXTRA ? "extra" : ""}`} data-lane={lane + 1}>
                    <DeadCard u={u} round={view.round} onClick={() => {
                        if (!picking) {
                            inspectionActions.unit(u.id)
                            cardActions.inspect(u.id)
                        }
                    }} />
                </div>
            )
        }
        if (lane === EXTRA) {
            return (
                <div key={key} className={`bd-slot extra empty ${state}`} data-lane={lane + 1}>
                    <span className="bd-slot-label">{t.extra}</span>
                    <span className="bd-slot-sub">{t.emptyExtra}</span>
                    {here.map((f) => <span key={f.id} className={`bd-float ${f.kind}${f.dmg ? ` ${f.dmg}` : ""}`}>{f.kind === "crit" ? <CritIcon /> : null}{f.text}</span>)}
                </div>
            )
        }
        const open = view.openLanes.includes(lane)
        const mine = side === me ? view.blind?.picks[me].find((x) => x.lane === lane) : undefined
        if (mine && open) {
            return (
                <div key={key} className="bd-slot empty pending" data-lane={lane + 1}>
                    <Img src={`/heroes/${mine.hero}.jpg`} className="bd-pend-img" fallback={heroName(mine.hero).slice(0,
                        1)} />
                    <span className="bd-slot-label">{heroName(mine.hero)}</span>
                    <span className="bd-slot-sub">{view.blind?.ready[me] ? tr().blindPicked : tr().blindDraft}</span>
                </div>
            )
        }
        if (!open) {
            return (
                <div key={key} className="bd-slot closed" data-lane={lane + 1}>
                    <span className="bd-lock" />
                    <span className="bd-slot-sub">{`${t.opensRound} ${view.rules.laneOpenRound[lane]}`}</span>
                </div>
            )
        }
        return (
            <div key={key} className={`bd-slot empty ${state}`} data-lane={lane + 1} data-move-preview={movePreview(side,
                lane)} onClick={() => click(side,
                lane,
                null)}>
                <span className="bd-slot-label">{`${t.lane} ${lane + 1}`}</span>
                {here.map((f) => <span key={f.id} className={`bd-float ${f.kind}${f.dmg ? ` ${f.dmg}` : ""}`}>{f.kind === "crit" ? <CritIcon /> : null}{f.text}</span>)}
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
            <div className="bd-duel-hud">
                <PlayerHud side={foe} view={view} isMe={false} />
                <div className="bd-hud-spacer" aria-hidden="true" />
                <PlayerHud side={me} view={view} isMe />
            </div>
            <OpponentHand view={view} />
            <div className="bd-board-body">
                <div className="bd-playfield">
                    {view.phase === "blind" && view.blind?.ready[foe] ? <div className="bd-back picked bd-foe-ready"><b>?</b>{tr().foeLocked}</div> : null}
                    {row(foe)}
                    <div className="bd-mid">
                        {[0,
                            1,
                            2,
                            3,
                            4].map((lane) => <span key={lane} className={view.openLanes.includes(lane) ? "open" : ""}>{lane + 1}</span>)}
                        <span className="x">+</span>
                    </div>
                    {row(me)}
                </div>
                <aside className="bd-deck-rail" aria-label={isEn() ? "Decks, graveyards and prizes" : "Bộ bài, mộ và lá thưởng"}>
                    <PlayerPiles side={foe} view={view} g={g} isMe={false} onGrave={() => setGrave(foe)} onDeck={() => setDeck(foe)} />
                    <PlayerPiles side={me} view={view} g={g} isMe onGrave={() => setGrave(me)} onDeck={() => setDeck(me)} />
                </aside>
            </div>
            {hover && hovered ? <UnitTip u={hovered} g={g} turnNo={view.turnNo} x={hover.x} y={hover.y} /> : null}
            {grave ? <GraveModal side={grave} view={view} g={g} onClose={() => setGrave(null)} /> : null}
            {deck ? <DeckModal side={deck} view={view} g={g} onClose={() => setDeck(null)} /> : null}
        </section>
    )
}
