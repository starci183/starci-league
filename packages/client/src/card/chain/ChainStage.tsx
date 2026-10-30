// Chuỗi kiểu Master Duel ở GIỮA bàn: lá xếp chéo, số mắt xích, đường nối phát sáng, lời hô, giải quyết từ cuối về đầu.
// Không chặn thao tác: chỉ phần nhắc nối chuỗi nhận chuột.
import {
    useEffect, useMemo, useRef, useState, type CSSProperties
} from "react"
import {
    cg
} from "@starci/shared"
import {
    cardActions, gameOf, useCard, type CardView
} from "../store"
import {
    CardFace
} from "../anim/CardFace"
import {
    useChainAnim, linksOf, type LinkView
} from "./anim"
import {
    cardName, getLang, heroArt, isHidden, unitName, type Lang
} from "./text"
import {
    inspectionActions
} from "../ui/inspection"
import "./stage.css"

type Action = cg.Action

const S = {
    vi: {
        chain: "Chuỗi",
        resolve: "Giải quyết",
        end: "Chuỗi kết thúc",
        cancelled: "Vô hiệu",
        attack: "Đánh thường",
        ask: "Nối chuỗi?",
        pass: "Bỏ qua",
        wait: "Đối thủ đang cân nhắc…",
    },
    en: {
        chain: "Chain",
        resolve: "Resolve",
        end: "Chain ended",
        cancelled: "Cancelled",
        attack: "Basic attack",
        ask: "Add to the chain?",
        pass: "Pass",
        wait: "Opponent is considering…",
    },
} as const

const sideCls = (v: CardView, s: cg.Side): string => v.you === null ? (s === "A" ? "me" : "foe") : s === v.you ? "me" : "foe"

function AttackFace({ l, v }: { l: LinkView; v: CardView }) {
    const art = heroArt(l.actor)
    const [bad,
        setBad] = useState(false)
    const t = S[getLang()]
    return (
        <div className="cs-atk">
            {art && !bad ? <img src={`/${art}`} alt="" draggable={false} onError={() => setBad(true)} /> : <b>⚔</b>}
            <span className="cs-atk-name">{l.mode === "cardless" ? `${getLang() === "en" ? "Cardless attack" : "Đòn không cần lá"} ${Math.round((v.rules.fighterCardlessMult ?? .66) * 100)}%` : t.attack}</span>
            <small>{l.actor ? unitName(v,
                l.actor) : ""}</small>
        </div>
    )
}

interface Shout { id: number; text: string; cls: string }

export function ChainStage() {
    const { view, legal } = useCard()
    const anim = useChainAnim()
    const lang: Lang = getLang()
    const t = S[lang]
    const live = view?.chain ?? null
    const g = useMemo(() => view ? gameOf(view) : null,
        [view])
    const links = anim ? anim.links : live ? linksOf(live) : []
    const count = links.length

    // lời hô khi thêm mắt xích / giải quyết / kết thúc
    const [shout,
        setShout] = useState<Shout | null>(null)
    const seq = useRef(0)
    const prevCount = useRef(0)
    const timer = useRef(0)
    const say = (text: string, cls: string) => {
        window.clearTimeout(timer.current)
        setShout({
            id: ++seq.current, text, cls
        })
        timer.current = window.setTimeout(() => setShout(null),
            1100)
    }
    const animating = !!anim
    useEffect(() => () => window.clearTimeout(timer.current),
        [])
    useEffect(() => {
        if (!animating && count > prevCount.current) say(`${t.chain} ${count}`,
            "add")
        if (!animating) prevCount.current = count
    },
    [count,
        animating])
    const resolving = anim?.resolving ?? null
    useEffect(() => {
        if (resolving !== null) say(`${t.resolve} ${resolving}`,
            "res")
    },
    [resolving])
    const ending = animating && resolving === null
    useEffect(() => {
        if (ending) {
            prevCount.current = 0
            say(t.end,
                "end")
        }
    },
    [ending])

    const { legal: legalActs } = {
        legal
    }
    const groups = useMemo(() => {
        const m = new Map<string, Action[]>()
        for (const a of legalActs) if (a.t === "chain") m.set(a.uid,
            [...(m.get(a.uid) ?? []),
                a])
        return [...m.entries()]
    },
    [legalActs])

    if (!view || !g || !count) return null
    const mineTurn = !anim && view.phase === "chain" && !!live && live.priority === view.you
    const waiting = !anim && view.phase === "chain" && !!live && live.priority !== view.you && view.you !== null
    const pass = legal.find((a) => a.t === "pass") ?? (view.you ? {
        t: "pass", side: view.you
    } as Action : null)
    const hand = view.you ? view.players[view.you].hand ?? [] : []
    const top = live?.links[live.links.length - 1]
    const trigger = top?.trigger
    const triggerName = trigger?.target ? unitName(view,
        trigger.target) : ""
    const hint = trigger?.kind === "attack" ? (lang === "vi" ? "Đối thủ đánh thường" : "Opponent attacks") : (lang === "vi" ? "Đối thủ dùng chiêu" : "Opponent casts a skill")

    return (
        <div className={`cs-root ${anim ? "resolving" : ""}`}>
            <div className="cs-stack">
                <header className="cs-title"><b>{t.chain} {count}/{cg.RULES.maxChain}</b><span>{anim ? t.resolve : lang === "vi" ? "Chờ phản ứng" : "Awaiting response"}</span></header>
                <div className="cs-links">
                    {links.map((l, i) => {
                        const state = anim ? (anim.resolving === l.n ? "resolving" : anim.done.includes(l.n) ? "done" : "") : ""
                        const cancelled = anim?.cancelled.includes(l.n) ?? false
                        const hiddenCard = !l.card || isHidden(l.card)
                        return (
                            <div key={l.n} className="cs-slot" style={{
                                zIndex: 10 + i * 2,
                            } as CSSProperties}>
                                {i > 0 ? <svg className={`cs-line ${state}`} viewBox="0 0 120 38" aria-hidden="true"><defs><marker id={`chain-arrow-${l.n}`} markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="none" stroke="#ff7770" strokeWidth="1.5" /></marker></defs><path d="M116,29 Q60,-12 5,29" fill="none" stroke="#ff6660" strokeWidth="2.5" markerEnd={`url(#chain-arrow-${l.n})`} /></svg> : null}
                                <div tabIndex={0} role="button" aria-label={`${t.chain} ${l.n}`} onMouseEnter={() => { if (l.card && !hiddenCard) inspectionActions.card(l.card,
                                    {
                                        source: "chain", side: l.side, actor: l.actor, targets: l.targets, link: l.n, cancelled, trigger: live?.links.find((entry) => entry.n === l.n)?.reactTo
                                    }); else if (l.actor) inspectionActions.unit(l.actor) }} onFocus={() => { if (l.card && !hiddenCard) inspectionActions.card(l.card,
                                    {
                                        source: "chain", side: l.side, actor: l.actor, targets: l.targets, link: l.n, cancelled, trigger: live?.links.find((entry) => entry.n === l.n)?.reactTo
                                    }); else if (l.actor) inspectionActions.unit(l.actor) }} data-chain-link={l.n} data-chain-card-uid={l.card?.uid} className={`cs-link ${cancelled ? "cancelled" : ""} ${sideCls(view,
                                    l.side)} ${state}`}>
                                    <span className="cs-num">{l.n} · {l.side}</span>
                                    {cancelled && <strong className="cs-cancelled">{t.cancelled}</strong>}
                                    <div className="cs-face">
                                        {l.kind === "attack" || hiddenCard ? <AttackFace l={l} v={view} /> : <CardFace card={l.card!} name={cardName(g,
                                        l.card!,
                                        lang)} />}
                                    </div>
                                    <div className="cs-link-detail"><small>{i > 0 ? (links[i - 1].kind === "attack" ? (lang === "vi" ? "Địch tấn công" : "Opponent attacks") : links[i - 1].card?.kind === "support" ? (lang === "vi" ? "Địch dùng lá hỗ trợ" : "Opponent uses support") : (lang === "vi" ? "Địch dùng chiêu" : "Opponent uses a skill")) : (lang === "vi" ? "Hành động gốc" : "Opening action")}</small><b>{i > 0 ? `${lang === "vi" ? "Đáp mắt xích" : "Responds to link"} ${l.n - 1}` : l.targets.length ? l.targets.map((id) => unitName(view,
                                        id)).join(", ") : (lang === "vi" ? "Không chỉ định" : "No target")}</b></div>
                                </div>
                            </div>
                        )
                    })}
                </div>
                <footer className="cs-order"><span>{t.resolve}</span>{[...links].reverse().map((l, i) => <span key={l.n} className={anim?.resolving === l.n ? "active" : ""}>{i > 0 ? "→ " : ""}{l.n}</span>)}</footer>
            </div>
            {shout ? <div key={shout.id} className={`cs-shout ${shout.cls}`}>{shout.text}</div> : null}
            {mineTurn ? (
                <div className="cs-prompt">
                    <div className="cs-ask">{lang === "vi" ? "Bạn có muốn nối chuỗi?" : t.ask}</div>
                    <p className="cs-trigger">{hint}{triggerName ? ` → ${triggerName}` : ""} · {count}/{cg.RULES.maxChain}</p>
                    <div className="cs-cards">
                        {groups.map(([uid,
                            acts]) => {
                            const card = hand.find((c) => c.uid === uid)
                            if (!card) return null
                            // rê chuột: tên + tác dụng của lá để biết nên nối lá nào
                            return (
                                <button key={uid} className="cs-btn-card" onMouseEnter={() => inspectionActions.card(card,
                                    {
                                        source: "reaction", side: view.you ?? undefined, trigger, targets: (acts[0].t === "chain" ? acts[0].args?.targets ?? (acts[0].args?.target ? [acts[0].args.target] : []) : [])
                                    })} onFocus={() => inspectionActions.card(card,
                                    {
                                        source: "reaction", side: view.you ?? undefined, trigger
                                    })} onClick={() => cardActions.beginTargeting(uid,
                                    acts)}>
                                    <CardFace card={card} name={cardName(g,
                                        card,
                                        lang)} />
                                    {acts.length > 1 ? <small>×{acts.length}</small> : null}

                                </button>
                            )
                        })}
                    </div>
                    <span className="cs-eligible">{lang === "vi" ? "Các lá sáng đủ điều kiện phản ứng" : "Highlighted cards meet the response conditions"}</span>
                    {pass ? <button className="cs-pass" onClick={() => cardActions.act(pass)}>{t.pass}</button> : null}
                </div>
            ) : null}
            {waiting ? <div className="cs-wait">{t.wait}</div> : null}
        </div>
    )
}
