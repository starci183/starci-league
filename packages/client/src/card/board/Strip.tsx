// Thanh thông tin người chơi (tên, mạng, bộ bài, tay, mộ, lá thưởng, tướng dự bị) và cửa sổ xem mộ.
import {
    useEffect
} from "react"
import {
    cg
} from "@starci/shared"
import type {
    CardView
} from "../store"
import {
    heroName, isEn, tr, type Side
} from "./helpers"
import {
    Img
} from "./UnitCard"

const BACK = "/ui/card_back.png"

function cardName(g: cg.Game, c: cg.Card): { name: string; desc: string } {
    try {
        const i = cg.cardInfoL(g,
            c)
        return {
            name: i.name, desc: i.desc
        }
    } catch {
        return {
            name: c.id, desc: ""
        }
    }
}

export function GraveModal(p: { side: Side; view: CardView; g: cg.Game; onClose(): void }) {
    const t = tr()
    const grave = p.view.players[p.side].grave
    useEffect(() => {
        const k = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.stopPropagation()
                p.onClose()
            }
        }
        window.addEventListener("keydown",
            k,
            true)
        return () => window.removeEventListener("keydown",
            k,
            true)
    },
    [p])
    return (
        <div className="bd-modal" onClick={p.onClose} onContextMenu={(e) => e.preventDefault()}>
            <div className="bd-modal-box" onClick={(e) => e.stopPropagation()}>
                <header>
                    <b>{`${t.graveTitle} · ${p.view.names[p.side]} (${grave.length})`}</b>
                    <button onClick={p.onClose}>{t.close}</button>
                </header>
                <ul>
                    {grave.length === 0 ? <li className="empty">{t.graveEmpty}</li> : null}
                    {[...grave].reverse().map((c) => {
                        const i = cardName(p.g,
                            c)
                        return (
                            <li key={c.uid} className={`k-${c.kind}`}>
                                <b>{i.name}</b>
                                {i.desc ? <small>{i.desc}</small> : null}
                            </li>
                        )
                    })}
                </ul>
            </div>
        </div>
    )
}

export function PlayerStrip(p: { side: Side; view: CardView; isMe: boolean; onGrave(): void }) {
    const { side, view } = p
    const t = tr()
    const pl = view.players[side]
    const maxLives = view.rules.lives
    const prizeMax = Math.max(6,
        view.prizes[side])
    const myTurn = view.active === side
    const reserve = pl.heroes.map((h) => view.units[`${side}:${h}`]).filter((u) => u && u.status !== "board")
    const handBacks = Math.min(pl.handCount,
        10)
    return (
        <div className={`bd-strip ${p.isMe ? "me" : "foe"} ${myTurn ? "active" : ""}`}>
            <div className="bd-pname">
                <span className="bd-side">{side}</span>
                <b>{view.names[side]}</b>
                {p.isMe && view.you ? <small>{t.you}</small> : null}
                {view.bots[side] ? <small>BOT</small> : null}
            </div>
            <div className="bd-lives" title={`${t.lives} ${pl.lives}/${maxLives}`}>
                {Array.from({
                    length: maxLives
                },
                (_, i) => (
                    <i key={i} className={i < pl.lives ? "on" : ""} />
                ))}
            </div>
            <div className="bd-counts">
                <span className="bd-cnt" title={t.deck}>
                    <Img src={BACK} className="bd-mini" />
                    <em>{t.deck}</em>
                    <b>{pl.deckCount}</b>
                </span>
                <span className="bd-cnt hand" title={t.hand}>
                    {p.isMe ? null : (
                        <span className="bd-fan">
                            {Array.from({
                                length: handBacks
                            },
                            (_, i) => <Img key={i} src={BACK} className="bd-mini" />)}
                        </span>
                    )}
                    <em>{t.hand}</em>
                    <b>{pl.handCount}</b>
                </span>
                <button className="bd-cnt grave" title={t.grave} onClick={p.onGrave}>
                    <em>{t.grave}</em>
                    <b>{pl.grave.length}</b>
                </button>
                <span className="bd-cnt prizes" title={t.prizes}>
                    <span className="bd-prizes">
                        {Array.from({
                            length: prizeMax
                        },
                        (_, i) => (
                            <Img key={i} src={BACK} className={`bd-mini prize ${i < view.prizes[side] ? "" : "gone"}`} />
                        ))}
                    </span>
                </span>
            </div>
            <div className="bd-reserve">
                {reserve.map((u) => (
                    <span key={u.id} className={`bd-res ${u.status}`} title={`${heroName(u.hero)}${u.status === "dead" ? ` · ${t.respawn} ${u.respawnRound}` : ` · ${t.reserve}`}`}>
                        <Img src={`/heroes/${u.hero}.jpg`} fallback={heroName(u.hero).slice(0,
                            1)} />
                        {u.status === "dead" ? <em>{`${isEn() ? "R" : "V"}${u.respawnRound}`}</em> : null}
                    </span>
                ))}
            </div>
        </div>
    )
}
