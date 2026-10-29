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
    RichText
} from "../RichText"
import "./stage.css"

type Action = cg.Action

const S = {
    vi: {
        chain: "Chuỗi",
        resolve: "Giải quyết",
        end: "Chuỗi kết thúc",
        attack: "Đánh thường",
        ask: "Nối chuỗi?",
        pass: "Bỏ qua",
        wait: "Đối thủ đang cân nhắc…",
    },
    en: {
        chain: "Chain",
        resolve: "Resolve",
        end: "Chain ended",
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
    const dx = Math.min(74,
        count > 1 ? 480 / (count - 1) : 74)
    const dy = dx * .5
    const len = Math.hypot(dx,
        dy)
    const ang = Math.atan2(dy,
        -dx) * 180 / Math.PI
    const spanX = dx * (count - 1)
    const spanY = dy * (count - 1)

    return (
        <div className={`cs-root ${anim ? "resolving" : ""}`}>
            <div className="cs-stack">
                {links.map((l, i) => {
                    const state = anim ? (anim.resolving === l.n ? "resolving" : anim.done.includes(l.n) ? "done" : "") : ""
                    const hiddenCard = !l.card || isHidden(l.card)
                    return (
                        <div key={l.n} className="cs-slot" style={{
                            left: i * dx - spanX / 2, top: -i * dy + spanY / 2, zIndex: 10 + i * 2,
                        } as CSSProperties}>
                            {i > 0 ? <i className={`cs-line ${state}`} style={{
                                width: len, transform: `rotate(${ang}deg)`, zIndex: -1,
                            }} /> : null}
                            <div className={`cs-link ${sideCls(view,
                                l.side)} ${state}`}>
                                <span className="cs-num">{l.n}</span>
                                <div className="cs-face">
                                    {l.kind === "attack" || hiddenCard ? <AttackFace l={l} v={view} /> : <CardFace card={l.card!} name={cardName(g,
                                        l.card!,
                                        lang)} />}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
            {shout ? <div key={shout.id} className={`cs-shout ${shout.cls}`}>{shout.text}</div> : null}
            {mineTurn ? (
                <div className="cs-prompt">
                    <div className="cs-ask">{t.ask}</div>
                    <div className="cs-cards">
                        {groups.map(([uid,
                            acts]) => {
                            const card = hand.find((c) => c.uid === uid)
                            if (!card) return null
                            // rê chuột: tên + tác dụng của lá để biết nên nối lá nào
                            const info = g ? cg.cardInfoL(g,
                                card) : null
                            return (
                                <button key={uid} className="cs-btn-card" onClick={() => cardActions.beginTargeting(uid,
                                    acts)}>
                                    <CardFace card={card} name={cardName(g,
                                        card,
                                        lang)} />
                                    {acts.length > 1 ? <small>×{acts.length}</small> : null}
                                    {info ? (
                                        <span className="cs-tip">
                                            <b>{info.name}</b>
                                            {info.desc ? <RichText text={info.desc} /> : null}
                                        </span>
                                    ) : null}
                                </button>
                            )
                        })}
                    </div>
                    {pass ? <button className="cs-pass" onClick={() => cardActions.act(pass)}>{t.pass}</button> : null}
                </div>
            ) : null}
            {waiting ? <div className="cs-wait">{t.wait}</div> : null}
        </div>
    )
}
