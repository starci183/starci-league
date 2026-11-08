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
    artInfo
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
import {
    ArtFrame
} from "../ui/ArtFrame"
import {
    GameCardVisual
} from "../ui/GameCardVisual"
import "./stage.css"
import {
    GameIcon
} from "../ui/GameIcon"

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
    const pass = legal.find((a) => a.t === "pass")
    const responseGroups = count < cg.RULES.maxChain ? groups : []
    const hand = view.you ? view.players[view.you].hand ?? [] : []
    const top = live?.links[live.links.length - 1]
    const trigger = top?.trigger
    const triggerName = trigger?.target ? unitName(view,
        trigger.target) : ""
    const hint = trigger?.kind === "attack" ? (lang === "vi" ? "Đối thủ đánh thường" : "Opponent attacks") : (lang === "vi" ? "Đối thủ dùng chiêu" : "Opponent casts a skill")

    const shortName = (name: string) => name.replace(/^[^:]+:\s*/,
        "")
    const artFor = (card: cg.Card, actor?: string) => artInfo(card,
        actor ? view.units[actor] : card.hero ? view.units[`${card.side ?? view.you ?? "A"}:${card.hero}`] : undefined)
    const imageFor = (l: LinkView) => l.card && !isHidden(l.card) ? artFor(l.card,
        l.actor).srcs[0] : heroArt(l.actor) ? `/${heroArt(l.actor)}` : undefined
    const inspect = (l: LinkView) => {
        if (l.card && !isHidden(l.card)) inspectionActions.card(l.card,
            {
                source: "chain", side: l.side, actor: l.actor, targets: l.targets, link: l.n,
                cancelled: anim?.cancelled.includes(l.n) ?? false,
                trigger: live?.links.find((entry) => entry.n === l.n)?.reactTo
            })
        else if (l.actor) inspectionActions.unit(l.actor)
    }
    return (
        <div className={`cs-root cm-root ${anim ? "resolving" : ""}`} data-chain-count={count}>
            <div className="cm-stack">
                <ArtFrame kind="title" fitLabel={false} width={560} height={120} className="cm-title" contentClassName="cm-title-content">
                    <b>{t.chain} {count}/{cg.RULES.maxChain}</b>
                    <span>{anim ? t.resolve : lang === "vi" ? "Chờ phản ứng" : "Awaiting response"}</span>
                </ArtFrame>
                <div className="cm-links">
                    {links.map((l, i) => {
                        const state = anim ? (anim.resolving === l.n ? "resolving" : anim.done.includes(l.n) ? "done" : "") : ""
                        const cancelled = anim?.cancelled.includes(l.n) ?? false
                        const name = l.card && !isHidden(l.card) ? cardName(g,
                            l.card,
                            lang) : t.attack
                        const condition = i ? links[i - 1].kind === "attack" ? (lang === "vi" ? "Địch tấn công" : "Opponent attacks") : (lang === "vi" ? "Địch dùng chiêu" : "Opponent casts") : (lang === "vi" ? "Hành động gốc" : "Opening action")
                        return <div key={l.n} className="cm-slot" style={{
                            zIndex: 10 + i * 2
                        } as CSSProperties}>
                            {i > 0 ? <svg className={`cm-chain ${state}`} viewBox="0 0 90 44" aria-hidden="true"><g fill="none" stroke="#513814" strokeWidth="10"><ellipse cx="20" cy="22" rx="16" ry="10"/><ellipse cx="45" cy="22" rx="17" ry="8"/><ellipse cx="70" cy="22" rx="16" ry="10"/></g><g fill="none" stroke="#e4ba5a" strokeWidth="6"><ellipse cx="20" cy="22" rx="16" ry="10"/><ellipse cx="45" cy="22" rx="17" ry="8"/><ellipse cx="70" cy="22" rx="16" ry="10"/></g><path d="M7 18Q20 7 33 18M33 19Q45 12 57 19M58 18Q70 7 83 18" stroke="#fff0ad" strokeWidth="2" fill="none"/></svg> : null}
                            <div tabIndex={0} role="button" aria-label={`${t.chain} ${l.n}: ${name}`} onMouseEnter={() => inspect(l)} onFocus={() => inspect(l)} onClick={() => inspect(l)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inspect(l) } }} data-chain-link={l.n} data-chain-card-uid={l.card?.uid} className={`cm-link ${cancelled ? "cancelled" : ""} ${sideCls(view,
                                l.side)} ${state}`}>
                                <GameCardVisual name={shortName(name)} srcs={l.card && !isHidden(l.card) ? artFor(l.card,
                                    l.actor).srcs : imageFor(l) ? [imageFor(l)!] : []} actor={l.actor ? unitName(view,
                                    l.actor) : l.side} detail={<><small>{condition}</small><strong>{i ? `${lang === "vi" ? "Đáp mắt xích" : "Responds to link"} ${l.n - 1}` : l.targets.length ? l.targets.map((id) => unitName(view,
                                    id)).join(", ") : (lang === "vi" ? "Không chỉ định" : "No target")}</strong></>} />
                                <ArtFrame kind="icon" width={55} height={55} className="cm-number"><b>{l.n}</b></ArtFrame>
                                <ArtFrame kind="icon" width={38} height={38} className="cm-side"><b>{l.side}</b></ArtFrame>
                                {cancelled ? <ArtFrame kind="name" fitLabel={false} width={230} height={64} className="cm-cancelled"><b>{t.cancelled}</b></ArtFrame> : null}
                            </div>
                        </div>
                    })}
                </div>
                <ArtFrame kind="name" fitLabel={false} width={425} height={70} className="cm-order"><span>{t.resolve}</span>{[...links].reverse().map((l, i) => <b key={l.n} className={anim?.resolving === l.n ? "active" : ""}>{i > 0 ? "→ " : ""}{l.n}</b>)}</ArtFrame>
            </div>
            {shout ? <div key={shout.id} className={`cm-shout ${shout.cls}`} aria-live="polite">{shout.text}</div> : null}
            {mineTurn ? <div className="cm-response">
                <div className="cm-context">
                    <ArtFrame kind="name" fitLabel={false} width={335} height={80}><b className="cm-ask"><GameIcon name="chain" />{lang === "vi" ? "Bạn được phản ứng" : "Your response"}</b></ArtFrame>
                    <ArtFrame kind="name" fitLabel={false} width={335} height={94} contentClassName="cm-context-copy"><span>{hint}{triggerName ? ` → ${triggerName}` : ""}</span><strong>{lang === "vi" ? `${responseGroups.length} lá hợp lệ · Tối đa ${cg.RULES.maxChain}` : `${responseGroups.length} eligible · Max ${cg.RULES.maxChain}`}</strong></ArtFrame>
                </div>
                <div className="cm-response-options">
                    <div className="cm-cards">{responseGroups.map(([uid,
                        acts]) => {
                        const card = hand.find((c) => c.uid === uid)
                        if (!card) return null
                        const name = cardName(g,
                            card,
                            lang)
                        return <button key={uid} className="cm-reply" aria-label={name} title={cg.cardInfoL(g,
                            card).desc} onMouseEnter={() => inspectionActions.card(card,
                            {
                                source: "reaction", side: view.you ?? undefined, trigger
                            })} onFocus={() => inspectionActions.card(card,
                            {
                                source: "reaction", side: view.you ?? undefined, trigger
                            })} onClick={() => cardActions.beginTargeting(uid,
                            acts)}>
                            <GameCardVisual name={shortName(name)} srcs={artFor(card).srcs} />
                        </button>
                    })}</div>
                    <ArtFrame kind="name" fitLabel={false} width={460} height={50}><span className="cm-eligible">{responseGroups.length ? (lang === "vi" ? "Lá sáng đáp ứng điều kiện phản ứng." : "Glowing cards meet the response conditions.") : (lang === "vi" ? "Không có lá đáp ứng điều kiện." : "No eligible response cards.")}</span></ArtFrame>
                </div>
                {pass ? <button className="cm-pass" onClick={() => cardActions.act(pass)}><ArtFrame kind="name" fitLabel={false} width={225} height={88}><b>{t.pass}</b></ArtFrame></button> : null}
            </div> : null}
            {waiting ? <ArtFrame kind="name" fitLabel={false} width={530} height={95} className="cm-wait"><b>{t.wait}</b></ArtFrame> : null}
        </div>
    )
}
