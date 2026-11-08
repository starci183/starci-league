// Thanh thông tin người chơi (tên, mạng, bộ bài, tay, mộ, lá thưởng, tướng dự bị) và cửa sổ xem mộ.
import {
    useState
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
    ArtFrame
} from "../ui/ArtFrame"
import {
    CardInspector
} from "../ui/CardInspector"
import {
    inspectionActions
} from "../ui/inspection"

import {
    ActionDialog
} from "../ui/ActionDialog"
import {
    ScrollArea
} from "../ui/ScrollArea"
import "../ui/collections-dna.css"

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
    const [source,
        setSource] = useState<"deck" | "grave">(p.source)
    const [query,
        setQuery] = useState("")
    const [kind,
        setKind] = useState("all")
    const [selected,
        setSelected] = useState<string | null>(null)
    const hidden = source === "deck" && p.view.you !== p.side
    const entries = hidden ? [] : source === "deck" ? p.view.players[p.side].deckSummary ?? [] : cg.deckSummaryFor(p.view.players[p.side].grave,
        p.side,
        p.side) ?? []
    const cards = entries.map((entry) => ({
        ...entry, info: cardName(p.g,
            entry.card)
    })).filter((entry) => (kind === "all" || entry.card.kind === kind) && `${entry.info.name} ${entry.info.desc}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
    const current = cards.find((entry) => entry.card.uid === selected) ?? cards[0]
    const total = source === "deck" ? p.view.players[p.side].deckCount : p.view.players[p.side].grave.length
    const title = en ? "Card archive" : "Kho bài"
    const filters = [
        {
            value: "all", label: en ? "All" : "Tất cả"
        },
        {
            value: "skill", label: en ? "Skills" : "Chiêu"
        },
        {
            value: "support", label: en ? "Support" : "Hỗ trợ"
        },
        {
            value: "wild", label: en ? "Wild" : "Chiêu chung"
        },
        {
            value: "special", label: en ? "Special" : "Đặc biệt"
        }
    ]
    return <ActionDialog className="collection-dialog" title={`${title} · ${p.view.names[p.side]}`} subtitle={`${total} ${en ? "cards" : "lá bài"}`} onClose={p.onClose}>
        <div className="bd-collection-toolbar"><nav className="bd-collection-tabs" aria-label={en ? "Collections" : "Kho bài"}>{(["deck",
            "grave"] as const).map(tab => <button type="button" key={tab} aria-pressed={source === tab} onClick={() => { setSource(tab); setSelected(null); setQuery(""); setKind("all") }}><ArtFrame kind="name" width={260} height={64}><GameIcon name="cards" />{tab === "deck" ? en ? "Deck" : "Bộ bài" : en ? "Graveyard" : "Mộ bài"}<b>{tab === "deck" ? p.view.players[p.side].deckCount : p.view.players[p.side].grave.length}</b></ArtFrame></button>)}</nav><span className="bd-collection-owner">{p.view.names[p.side]}</span></div>
        {hidden ? <p className="bd-collection-empty">{en ? "The opponent's remaining deck count is public; its contents and order stay hidden." : "Chỉ số lá còn lại của đối thủ là công khai; nội dung và thứ tự bộ bài được giữ kín."}</p> : <>
            <div className="bd-collection-controls"><label><ArtFrame kind="name" width={490} height={108} fitLabel={false} contentClassName="bd-collection-search"><GameIcon name="cards" /><input type="search" aria-label={en ? "Search cards" : "Tìm lá bài"} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={en ? "Card name or effect" : "Tên lá hoặc tác dụng"} /></ArtFrame></label><nav className="bd-collection-filters" aria-label={en ? "Card type" : "Loại lá"}>{filters.map(filter => <button type="button" key={filter.value} aria-pressed={kind === filter.value} onClick={() => setKind(filter.value)}><ArtFrame kind="name" width="100%" height={48}>{filter.label}</ArtFrame></button>)}</nav><span className="bd-collection-result-count" aria-live="polite">{cards.reduce((n, entry) => n + entry.count,
                0)} {en ? "cards" : "lá"}</span></div>
            {source === "deck" ? <p className="bd-collection-note">{en ? "Remaining composition. Cards are grouped; draw order is hidden." : "Thành phần còn lại, gộp theo loại lá; không hiển thị thứ tự rút."}</p> : null}
            <div className={`bd-collection-body${current ? "" : " empty"}`}><ScrollArea className="collection-list" label={en ? "Browse cards" : "Danh sách lá bài"}><div className="bd-collection-grid">
                {cards.map((entry) => <button type="button" key={entry.card.uid} className="bd-collection-card" aria-pressed={current?.card.uid === entry.card.uid} onMouseEnter={() => { setSelected(entry.card.uid); inspectionActions.card(entry.card,
                    {
                        source, side: p.side, count: entry.count
                    }) }} onFocus={() => setSelected(entry.card.uid)} onClick={() => { setSelected(entry.card.uid); inspectionActions.card(entry.card,
                    {
                        source, side: p.side, count: entry.count
                    }) }}><div className="bd-collection-visual"><CardFace card={entry.card} name={entry.info.name} /></div>
                    <ArtFrame kind="icon" className="bd-collection-count" width={66} height={66}><span>×{entry.count}</span></ArtFrame>
                    {current?.card.uid === entry.card.uid ? <ArtFrame kind="icon" className="bd-collection-seal" width={38} height={38} label={en ? "Selected" : "Đang chọn"}><GameIcon name="diamond" /></ArtFrame> : null}</button>)}
                {!cards.length ? <div className="bd-collection-empty"><GameIcon name="cards" /><p>{query || kind !== "all" ? (en ? "No matching cards." : "Không có lá phù hợp.") : (en ? "This collection is empty." : "Chưa có lá nào tại đây.")}</p></div> : null}
            </div></ScrollArea>{current ? <ScrollArea className="bd-collection-detail" label={en ? "Card detail" : "Chi tiết lá đã chọn"}><CardInspector dismissible={false} card={current.card} context={{
                source, side: p.side, count: current.count
            }} view={p.view} /></ScrollArea> : null}</div>
        </>}
    </ActionDialog>
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



