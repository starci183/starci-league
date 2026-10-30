// Thanh thông tin người chơi (tên, mạng, bộ bài, tay, mộ, lá thưởng, tướng dự bị) và cửa sổ xem mộ.
import {
    useEffect, useId, useRef, useState
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
import {
    GameIcon
} from "../ui/GameIcon"

import {
    CardFace
} from "../anim/CardFace"
import {
    CardInspector
} from "../ui/CardInspector"
import {
    inspectionActions
} from "../ui/inspection"

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

interface CollectionProps { side: Side; view: CardView; g: cg.Game; onClose(): void }
function CollectionModal(p: CollectionProps & { source: "deck" | "grave" }) {
    const en = isEn()
    const id = useId()
    const box = useRef<HTMLDivElement>(null)
    const close = useRef(p.onClose)
    close.current = p.onClose
    const [query,
        setQuery] = useState("")
    const [kind,
        setKind] = useState("all")
    const [selected,
        setSelected] = useState<string | null>(null)
    const hidden = p.source === "deck" && p.view.you !== p.side
    const entries = hidden ? [] : p.source === "deck" ? p.view.players[p.side].deckSummary ?? [] : cg.deckSummaryFor(p.view.players[p.side].grave,
        p.side,
        p.side) ?? []
    const cards = entries.map((entry) => ({
        ...entry, info: cardName(p.g,
            entry.card)
    })).filter((entry) => (kind === "all" || entry.card.kind === kind) && `${entry.info.name} ${entry.info.desc}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
    const current = cards.find((entry) => entry.card.uid === selected) ?? cards[0]
    const total = p.source === "deck" ? p.view.players[p.side].deckCount : p.view.players[p.side].grave.length
    useEffect(() => {
        const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
        box.current?.querySelector<HTMLButtonElement>("button")?.focus()
        const key = (e: KeyboardEvent) => {
            if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close.current(); return }
            if (e.key !== "Tab") return
            const items = [...(box.current?.querySelectorAll<HTMLElement>("button:not([disabled]), input, select, [tabindex=\"0\"]") ?? [])]
            if (!items.length) return
            const first = items[0], last = items[items.length - 1]
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
        }
        window.addEventListener("keydown",
            key,
            true)
        return () => { window.removeEventListener("keydown",
            key,
            true); previous?.focus() }
    },
    [])
    const title = p.source === "deck" ? (en ? "Deck" : "Bộ bài") : (en ? "Graveyard" : "Mộ bài")
    return <div className="bd-modal bd-collection" onMouseDown={(e) => { if (e.target === e.currentTarget) p.onClose() }}>
        <div className="bd-modal-box bd-collection-box" ref={box} role="dialog" aria-modal="true" aria-labelledby={id}>
            <header><h3 id={id}>{title} · {p.view.names[p.side]} ({total})</h3><button type="button" onClick={p.onClose} aria-label={en ? "Close collection" : "Đóng bộ sưu tập"}>{en ? "Close" : "Đóng"} ×</button></header>
            {hidden ? <p className="bd-collection-empty">{en ? "The opponent's remaining deck count is public; its contents and order stay hidden." : "Chỉ số lá còn lại của đối thủ là công khai; nội dung và thứ tự bộ bài được giữ kín."}</p> : <>
                <div className="bd-collection-controls"><label>{en ? "Search" : "Tìm lá"}<input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={en ? "Card name or effect" : "Tên lá hoặc tác dụng"} /></label><label>{en ? "Card type" : "Loại lá"}<select value={kind} onChange={(e) => setKind(e.target.value)}><option value="all">{en ? "All" : "Tất cả"}</option><option value="skill">{en ? "Skills" : "Chiêu"}</option><option value="support">{en ? "Support / equipment" : "Hỗ trợ / trang bị"}</option><option value="wild">{en ? "Wild" : "Chiêu chung"}</option><option value="special">{en ? "Special" : "Đặc biệt"}</option></select></label><span aria-live="polite">{cards.reduce((n, entry) => n + entry.count,
                    0)} {en ? "cards" : "lá"}</span></div>
                {p.source === "deck" ? <p className="bd-collection-note">{en ? "Remaining composition. Cards are grouped; draw order is hidden." : "Thành phần còn lại, gộp theo loại lá; không hiển thị thứ tự rút."}</p> : null}
                <div className="bd-collection-body"><div className="bd-collection-grid">
                    {cards.map((entry) => <button type="button" key={entry.card.uid} className="bd-collection-card" aria-pressed={current?.card.uid === entry.card.uid} onMouseEnter={() => { setSelected(entry.card.uid); inspectionActions.card(entry.card,
                        {
                            source: p.source, side: p.side, count: entry.count
                        }) }} onFocus={() => setSelected(entry.card.uid)} onClick={() => { setSelected(entry.card.uid); inspectionActions.card(entry.card,
                        {
                            source: p.source, side: p.side, count: entry.count
                        }) }}><div className="bd-collection-thumb"><CardFace card={entry.card} name={entry.info.name} /></div><b>{entry.info.name}</b><span>×{entry.count}</span></button>)}
                    {!cards.length ? <p className="bd-collection-empty">{query || kind !== "all" ? (en ? "No matching cards." : "Không có lá phù hợp.") : (en ? "This collection is empty." : "Chưa có lá nào tại đây.")}</p> : null}
                </div>{current ? <aside className="bd-collection-detail"><CardInspector dismissible={false} card={current.card} context={{
                    source: p.source, side: p.side, count: current.count
                }} view={p.view} /></aside> : null}</div>
            </>}
        </div>
    </div>
}
export function GraveModal(p: CollectionProps) { return <CollectionModal {...p} source="grave" /> }
export function DeckModal(p: CollectionProps) { return <CollectionModal {...p} source="deck" /> }

interface PlayerDisplayProps { side: Side; view: CardView; isMe: boolean }

/** Player identity stays in the duel HUD; hidden piles have separate hit targets. */
export function TeamManaMeter({ side, view, mine = false }: { side: Side; view: CardView; mine?: boolean }) {
    return <div className="bd-team-mana" data-team-mana={side} role="meter" aria-label={isEn() ? "Team mana" : "Mana chung của đội"} aria-valuemin={0} aria-valuemax={200} aria-valuenow={view.teamMana?.[side] ?? 0} title={isEn() ? "All champions on this team share this mana pool" : "Mọi tướng cùng đội dùng chung bể mana này"}>
        <GameIcon name="diamond" />
        <div className="bd-team-mana-track">
            <i style={{
                width: `${Math.max(0,
                    Math.min(100,
                        (view.teamMana?.[side] ?? 0) / 2))}%`
            }} />
            <span>{isEn() ? mine ? "YOUR TEAM MANA" : "OPPONENT MANA" : mine ? "MANA ĐỘI BẠN" : "MANA ĐỘI ĐỊCH"} · <b data-team-mana-number={side}>{view.teamMana?.[side] ?? 0}/200</b></span>
        </div>
    </div>
}

export function PlayerHud(p: PlayerDisplayProps) {
    const { side, view } = p
    const t = tr()
    const pl = view.players[side]
    const heroes = pl.heroes.map((hero) => view.units[`${side}:${hero}`]).filter(Boolean)
    const avatar = heroes.find((unit) => unit.status === "board") ?? heroes[0]
    const reserve = heroes.filter((unit) => unit.status !== "board")
    return <div className={`bd-player-hud ${p.isMe ? "me" : "foe"} ${view.active === side ? "active" : ""}`} data-cg-player={side}>
        <div className="bd-avatar" title={avatar ? heroName(avatar.hero) : view.names[side]} onMouseEnter={() => { if (avatar) inspectionActions.unit(avatar.id) }}>
            {avatar ? <Img src={`/heroes/${avatar.hero}.jpg`} fallback={heroName(avatar.hero).slice(0,
                1)} /> : <span>{side}</span>}
            <span className="bd-side">{side}</span>
        </div>
        <div className="bd-player-meta">
            <div className="bd-pname"><b>{view.names[side]}</b>{p.isMe && view.you ? <small>{t.you}</small> : null}{view.bots[side] ? <small>BOT</small> : null}</div>
            <div className="bd-lives" title={`${t.lives} ${pl.lives}/${view.rules.lives}`} aria-label={`${t.lives} ${pl.lives}/${view.rules.lives}`}>
                {Array.from({
                    length: view.rules.lives
                },
                (_, i) => <i key={i} className={i < pl.lives ? "on" : ""} />)}
                <b className="bd-life-count">{pl.lives}/{view.rules.lives}</b>
            </div>
            <TeamManaMeter side={side} view={view} mine={p.isMe} />
            <div className="bd-player-details">
                <span className="bd-cnt hand" title={t.hand} data-cg-hand={side}>
                    {!p.isMe ? <span className="bd-fan">{Array.from({
                        length: Math.min(pl.handCount,
                            10)
                    },
                    (_, i) => <Img key={i} src={BACK} className="bd-mini" />)}</span> : null}
                    <em>{t.hand}</em><b>{pl.handCount}</b>
                </span>
                <div className="bd-reserve">{reserve.map((unit) => <button type="button" key={unit.id} className={`bd-res ${unit.status}`} onMouseEnter={() => inspectionActions.unit(unit.id)} onFocus={() => inspectionActions.unit(unit.id)} onClick={() => inspectionActions.unit(unit.id)} title={`${heroName(unit.hero)}${unit.status === "dead" ? ` · ${t.respawn} ${unit.respawnRound}` : ` · ${t.reserve}`}`}>
                    <Img src={`/heroes/${unit.hero}.jpg`} fallback={heroName(unit.hero).slice(0,
                        1)} />{unit.status === "dead" ? <em>{`${isEn() ? "R" : "V"}${unit.respawnRound}`}</em> : null}
                </button>)}</div>
            </div>
        </div>
    </div>
}

/** Vertical rail: all selectors used by deck/draw/grave/prize animations remain unique. */
export function PlayerPiles(p: PlayerDisplayProps & { g: cg.Game; onGrave(): void; onDeck(): void }) {
    const { side, view } = p
    const t = tr()
    const pl = view.players[side]
    const last = pl.grave.at(-1)
    return <div className={`bd-player-piles ${p.isMe ? "me" : "foe"}`} data-cg-piles={side}>
        <button type="button" className="bd-pile deck" data-cg-deck={side} title={`${t.deck} · ${pl.deckCount}`} onClick={p.onDeck}>
            <span className="bd-pile-art"><Img src={BACK} className="bd-pile-back" /></span>
            <span className="bd-pile-label">{t.deck}</span><b className="bd-pile-count">{pl.deckCount}</b>
        </button>
        <button type="button" className="bd-pile grave" data-cg-grave={side} title={`${t.grave} · ${pl.grave.length}`} onClick={p.onGrave}>
            <span className={`bd-pile-art ${last ? "has-card" : "empty"}`}>{last ? <CardFace card={last} name={cardName(p.g,
                last).name} /> : <Img src={BACK} className="bd-pile-back" />}</span>
            <span className="bd-pile-label">{t.grave}</span><b className="bd-pile-count">{pl.grave.length}</b>
        </button>
        <span className="bd-pile-prizes" title={`${t.prizes} · ${view.prizes[side]}`} data-cg-prizes={side}>
            <span className="bd-prizes">{Array.from({
                length: Math.max(6,
                    view.prizes[side])
            },
            (_, i) => <Img key={i} src={BACK} className={`bd-mini prize ${i < view.prizes[side] ? "" : "gone"}`} />)}</span>
            <span className="bd-pile-label">{t.prizes}</span><b className="bd-pile-count">{view.prizes[side]}</b>
        </span>
    </div>
}
