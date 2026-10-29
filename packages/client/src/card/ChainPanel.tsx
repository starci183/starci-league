// Cột phải của chế độ thẻ bài: lượt, Chuỗi Quick play, thông báo lá thưởng, nhật ký trận.
import {
    useEffect, useLayoutEffect, useMemo, useRef, useState
} from "react"
import {
    cg
} from "@starci/shared"
import {
    cardActions, gameOf, useCard, type CardView, type LogEntry
} from "./store"
import {
    useChainAnim, linksOf, type LinkView
} from "./chain/anim"
import {
    TXT, cardArt, cardName, eventLine, eventSide, getLang, heroArt, isHidden, isMinor, sideLabel, unitName, type Lang
} from "./chain/text"

type Side = cg.Side
type Action = cg.Action

const sideCls = (v: CardView, s: Side | null) => s === null ? "n" : v.you === null ? (s === "A" ? "me" : "foe") : s === v.you ? "me" : "foe"

/** Ảnh có dự phòng khi thiếu file */
function Art({ src, glyph, cls }: { src: string | null; glyph: string; cls?: string }) {
    const [bad,
        setBad] = useState(false)
    useEffect(() => setBad(false),
        [src])
    return (
        <span className={`ch-art ${cls ?? ""}`}>
            {src && !bad ? <img src={src} alt="" draggable={false} onError={() => setBad(true)} /> : <b>{glyph}</b>}
        </span>
    )
}

// ---------------------------------------------------------------- tiêu đề lượt
function TurnHeader({ v, lang, over }: { v: CardView; lang: Lang; over: boolean }) {
    const t = TXT[lang]
    const [ask,
        setAsk] = useState(false)
    const mine = v.toMove === v.you
    return (
        <header className="ch-head">
            <div className="ch-round">
                <span className="ch-round-n">{t.round} {v.round}</span>
                <span className={`ch-turn ${sideCls(v,
                    v.active)}`}>{t.turnOf} {sideLabel(v,
                        v.active,
                        lang)}</span>
            </div>
            {!over ? (
                <div className={`ch-move ${mine ? "mine" : ""}`}>
                    <i className="ch-dot" />
                    {mine ? t.yourMove : v.you === null ? `${sideLabel(v,
                        v.toMove,
                        lang)}…` : t.oppMove}
                </div>
            ) : null}
            {v.you !== null && !over ? (
                ask ? (
                    <div className="ch-resign">
                        <span>{t.sure}</span>
                        <button className="ch-btn danger" onClick={() => { setAsk(false); cardActions.resign() }}>{t.yes}</button>
                        <button className="ch-btn" onClick={() => setAsk(false)}>{t.no}</button>
                    </div>
                ) : <button className="ch-btn ghost ch-resign-btn" onClick={() => setAsk(true)}>{t.resign}</button>
            ) : null}
        </header>
    )
}

// ---------------------------------------------------------------- mắt xích
function LinkRow({ l, v, g, lang, state }: { l: LinkView; v: CardView; g: cg.Game; lang: Lang; state: "" | "resolving" | "done" }) {
    const t = TXT[lang]
    const name = l.kind === "attack" || !l.card ? t.attack : cardName(g,
        l.card,
        lang)
    const art = l.kind === "attack" ? heroArt(l.actor) : cardArt(l.card,
        l.actor)
    const who = l.actor ? unitName(v,
        l.actor) : ""
    const tg = l.targets.map((x) => unitName(v,
        x)).join(", ")
    return (
        <li className={`ch-link ${sideCls(v,
            l.side)} ${state}`}>
            <span className="ch-link-n">{l.n}</span>
            <Art src={art} glyph={l.kind === "attack" ? "⚔" : "✦"} cls={l.kind} />
            <span className="ch-link-body">
                <span className="ch-link-name">
                    {name}
                    {l.quick ? <em className="ch-q">{t.quick}</em> : null}
                </span>
                <span className="ch-link-sub">
                    {who}
                    {tg ? <> <i>→</i> {tg}</> : null}
                </span>
            </span>
        </li>
    )
}

function Prompt({ v, g, lang }: { v: CardView; g: cg.Game; lang: Lang }) {
    const { legal } = useCard()
    const t = TXT[lang]
    const me = v.you
    const groups = useMemo(() => {
        const m = new Map<string, Action[]>()
        for (const a of legal) if (a.t === "chain") m.set(a.uid,
            [...(m.get(a.uid) ?? []),
                a])
        return [...m.entries()]
    },
    [legal])
    const pass = legal.find((a) => a.t === "pass") ?? (me ? {
        t: "pass", side: me
    } as Action : null)
    const hand = me ? v.players[me].hand ?? [] : []
    return (
        <div className="ch-prompt">
            <div className="ch-prompt-q">{t.askChain}</div>
            <div className="ch-prompt-hint">{t.askHint}</div>
            <div className="ch-cards">
                {groups.map(([uid,
                    acts]) => {
                    const card = hand.find((c) => c.uid === uid)
                    const actor = acts[0].t === "chain" ? acts[0].args?.actor : undefined
                    const name = card ? cardName(g,
                        card,
                        lang) : uid
                    return (
                        <button key={uid} className="ch-card" onClick={() => cardActions.beginTargeting(uid,
                            acts)}>
                            <Art src={cardArt(card,
                                actor)} glyph="✦" />
                            <span className="ch-card-name">{name}</span>
                            {acts.length > 1 ? <small>×{acts.length}</small> : null}
                        </button>
                    )
                })}
            </div>
            {pass ? <button className="ch-btn big" onClick={() => cardActions.act(pass)}>{t.pass}</button> : null}
        </div>
    )
}

function ChainStack({ v, lang }: { v: CardView; lang: Lang }) {
    const anim = useChainAnim()
    const t = TXT[lang]
    const g = useMemo(() => gameOf(v),
        [v])
    const live = v.chain
    const links = anim ? anim.links : live ? linksOf(live) : []
    if (!links.length) return null
    const asking = !anim && v.phase === "chain" && !!live && live.priority === v.you
    const waiting = !anim && v.phase === "chain" && !!live && live.priority !== v.you && v.you !== null
    return (
        <section className={`ch-chain ${anim ? "resolving" : ""}`}>
            <div className="ch-chain-title">
                <span>{t.chain}</span>
                <small>{links.length} {t.links}</small>
                {anim ? <em>{t.resolving}</em> : null}
            </div>
            <ol className="ch-stack">
                {[...links].reverse().map((l) => (
                    <LinkRow
                        key={l.n}
                        l={l}
                        v={v}
                        g={g}
                        lang={lang}
                        state={anim ? (anim.resolving === l.n ? "resolving" : anim.done.includes(l.n) ? "done" : "") : ""}
                    />
                ))}
            </ol>
            {asking ? <Prompt v={v} g={g} lang={lang} /> : null}
            {waiting ? <div className="ch-wait"><i className="ch-dot" />{t.oppThinking}</div> : null}
        </section>
    )
}

// ---------------------------------------------------------------- thông báo lá thưởng
interface Toast { id: number; text: string; side: Side }
function usePrizeToasts(v: CardView | null, lang: Lang): Toast[] {
    const { lastEvents, tick } = useCard()
    const [toasts,
        setToasts] = useState<Toast[]>([])
    const seq = useRef(0)
    const vr = useRef(v)
    vr.current = v
    useEffect(() => {
        const view = vr.current
        if (!tick || !view) return
        const add: Toast[] = []
        for (const e of lastEvents) {
            if (e.t !== "prize") continue
            const mine = e.side === view.you
            const t = TXT[lang]
            const nm = isHidden(e.card) ? "" : cardName(gameOf(view),
                e.card,
                lang)
            add.push({
                id: ++seq.current, side: e.side, text: mine ? `${t.prizeYou} ${nm}`.trim() : t.prizeOpp,
            })
        }
        if (!add.length) return
        setToasts((x) => [...x,
            ...add])
        const ids = add.map((a) => a.id)
        window.setTimeout(() => setToasts((x) => x.filter((a) => !ids.includes(a.id))),
            4200)
    },
    [tick])
    return toasts
}

// ---------------------------------------------------------------- nhật ký
interface Row { n: number; text: string; side: Side | null; kind: string; minor: boolean }
const MAX_ROWS = 200

function useRows(log: LogEntry[], v: CardView | null, lang: Lang): Row[] {
    const cache = useRef(new Map<string, Row | null>())
    const gRef = useRef<{ v: CardView; g: cg.Game } | null>(null)
    return useMemo(() => {
        if (!v) return []
        if (!gRef.current || gRef.current.v !== v) gRef.current = {
            v, g: gameOf(v),
        }
        const g = gRef.current.g
        const c = cache.current
        if (c.size > 900) c.clear()
        const out: Row[] = []
        for (const { n, e } of log.slice(-MAX_ROWS)) {
            const key = `${lang}:${n}`
            let r = c.get(key)
            if (r === undefined) {
                const text = eventLine(e,
                    v,
                    g,
                    lang)
                r = text ? {
                    n, text, side: eventSide(e), kind: e.t, minor: isMinor(e),
                } : null
                c.set(key,
                    r)
            }
            if (r) out.push(r)
        }
        return out
    },
    [log,
        v,
        lang])
}

function BattleLog({ v, lang }: { v: CardView; lang: Lang }) {
    const { log } = useCard()
    const t = TXT[lang]
    const [detail,
        setDetail] = useState(() => {
        try { return localStorage.getItem("cg.logDetail") === "1" } catch { return false }
    })
    const rows = useRows(log,
        v,
        lang)
    const shown = detail ? rows : rows.filter((r) => !r.minor)
    const box = useRef<HTMLDivElement>(null)
    const stick = useRef(true)
    const [away,
        setAway] = useState(false)

    useLayoutEffect(() => {
        const el = box.current
        if (el && stick.current) el.scrollTop = el.scrollHeight
    },
    [shown.length,
        detail])

    const toggle = () => {
        const nx = !detail
        setDetail(nx)
        try { localStorage.setItem("cg.logDetail",
            nx ? "1" : "0") } catch { /* bỏ qua */ }
    }
    const onScroll = () => {
        const el = box.current
        if (!el) return
        const near = el.scrollHeight - el.scrollTop - el.clientHeight < 28
        stick.current = near
        setAway(!near)
    }
    const toEnd = () => {
        const el = box.current
        if (!el) return
        el.scrollTop = el.scrollHeight
        stick.current = true
        setAway(false)
    }

    return (
        <section className="ch-log">
            <div className="ch-log-bar">
                <span>{t.log}</span>
                <button className={`ch-chip ${detail ? "on" : ""}`} onClick={toggle}>{t.detail}</button>
            </div>
            <div className="ch-log-list" ref={box} onScroll={onScroll}>
                {shown.length ? shown.map((r) => (
                    <div key={r.n} className={`ch-row ${sideCls(v,
                        r.side)} k-${r.kind}${r.minor ? " minor" : ""}`}>{r.text}</div>
                )) : <div className="ch-empty">{t.empty}</div>}
            </div>
            {away ? <button className="ch-latest" onClick={toEnd}>↓ {t.latest}</button> : null}
        </section>
    )
}

// ---------------------------------------------------------------- tổng
export function ChainPanel() {
    const { view, stage } = useCard()
    const lang = getLang()
    const toasts = usePrizeToasts(view,
        lang)
    if (!view) return <section className="cg-chain ch" />
    return (
        <section className="cg-chain ch">
            <TurnHeader v={view} lang={lang} over={stage === "ended" || view.phase === "over"} />
            <ChainStack v={view} lang={lang} />
            <BattleLog v={view} lang={lang} />
            <div className="ch-toasts">
                {toasts.map((x) => <div key={x.id} className={`ch-toast ${sideCls(view,
                    x.side)}`}>{x.text}</div>)}
            </div>
        </section>
    )
}
