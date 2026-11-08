import {
    unitSkillIcon
} from "../anim/cardArt"
// Bảng chỉ số bên phải: tướng đang chọn (đồ, chỉ số, kỹ năng, hiệu ứng). Chỉ đọc từ store.
import {
    useEffect, useId, useMemo, useRef, useState, type ReactNode
} from "react"
import {
    cg, getItem
} from "@starci/shared"
import {
    createPortal
} from "react-dom"
import {
    cardActions, gameOf, useCard, type CardView
} from "../store"
import {
    isEn, roleName, turnsLeft, unitName
} from "../board/helpers"
import {
    RichText
} from "../RichText"
import {
    buildEffects, FxCellView
} from "./effects"

import {
    CardInspector
} from "../ui/CardInspector"
import {
    ScrollArea
} from "../ui/ScrollArea"
import {
    useGameOverlay, viewportToCanvasPoint
} from "../ui/GameCanvas"
import {
    GameIcon
} from "../ui/GameIcon"
import {
    inspectionActions, useInspection
} from "../ui/inspection"
import {
    ArtFrame
} from "../ui/ArtFrame"
import "../ui/inspector-dna.css"

type Side = cg.Side
type Unit = cg.Unit
const KEYS: cg.SkillKey[] = ["Q",
    "E",
    "R"]

/** Tướng đang xem: theo inspect, nếu không hợp lệ thì tướng đầu tiên của mình trên sân, rồi tướng đầu tiên bất kỳ */
export function inspectedUnit(view: CardView | null, inspect: string | null): Unit | undefined {
    if (!view) return undefined
    const sel = inspect ? view.units[inspect] : undefined
    if (sel) return sel
    const me: Side = view.you ?? "A"
    const onBoard = Object.values(view.units).filter((u) => u.status === "board")
    return onBoard.find((u) => u.side === me && !u.token) ?? onBoard.find((u) => !u.token) ?? onBoard[0]
}

const VI = {
    damage: "Sát thương",
    physical: "Vật lý",
    magic: "Phép",
    items: "Trang bị",
    skills: "Kỹ năng",
    passive: "Nội tại",
    effects: "Đang chịu hiệu ứng",
    none: "Không có",
    buff: "Có lợi",
    debuff: "Có hại",
    stacks: "Điểm tích",
    next: "Đòn đánh kế tiếp",
    quick: "Quick",
    chainOnly: "Chỉ nối chuỗi",
    ally: "Phe ta",
    enemy: "Phe địch",
    left: "còn",
    turns: "lượt",
    hand: "tay",
    grave: "mộ",
    deckLeft: "còn trong bộ",
    used: "đã dùng",
    owner: "Chủ",
    soak: "Che chắn cho chủ",
    overflow: "Tràn sang chủ",
    hidden: "Úp",
    token: "Vật triệu hồi",
    emptySlot: "Trống",
    source: "từ",
    reserve: "Chưa có tướng trên sân",
    mana: "Mana đội",
    costMana: "Tốn",
    supportNote: "Gọi ra sân: lấy Q và E từ bộ lên tay.",
    mageNote: "Mọi tướng dùng chung quỹ mana đội; chi phí ghi trên từng chiêu.",
    fighterNote: `Đấu sĩ: mỗi lượt đánh không cần lá 1 lần (${Math.round(cg.RULES.fighterCardlessMult * 100)}% sát thương).`,
}
const EN: typeof VI = {
    damage: "Damage",
    physical: "Physical",
    magic: "Magic",
    items: "Items",
    skills: "Skills",
    passive: "Passive",
    effects: "Active effects",
    none: "None",
    buff: "Buff",
    debuff: "Debuff",
    stacks: "Stacks",
    next: "Next attack",
    quick: "Quick",
    chainOnly: "Chain only",
    ally: "Ally",
    enemy: "Enemy",
    left: "left",
    turns: "turns",
    hand: "hand",
    grave: "grave",
    deckLeft: "left in deck",
    used: "used",
    owner: "Owner",
    soak: "Soaks for owner",
    overflow: "Overflows to owner",
    hidden: "Face-down",
    token: "Summon",
    emptySlot: "Empty",
    source: "from",
    reserve: "No champion on board",
    mana: "Team mana",
    costMana: "Costs",
    supportNote: "On summon: take its Q and E from the deck into your hand.",
    mageNote: "All champions spend the team's shared mana pool; costs appear on each skill.",
    fighterNote: `Fighter: one cardless attack per turn (${Math.round(cg.RULES.fighterCardlessMult * 100)}% damage).`,
}
const T = () => (isEn() ? EN : VI)

/** Ảnh thử lần lượt các nguồn, hết thì hiện chữ */
function Pic(p: { srcs: string[]; cls: string; letter: string; pos?: string }) {
    const [i,
        setI] = useState(0)
    const key = p.srcs.join("|")
    const [seen,
        setSeen] = useState(key)
    // đổi tướng/nguồn ảnh: thử lại từ đầu (tránh kẹt ở chữ cái sau khi ảnh trước hỏng)
    if (seen !== key) {
        setSeen(key)
        setI(0)
        return null
    }
    if (i >= p.srcs.length) return <span className={`${p.cls} us-letter`}>{p.letter}</span>
    return (
        <img
            className={p.cls}
            src={p.srcs[i]}
            alt=""
            draggable={false}
            style={p.pos ? {
                objectPosition: p.pos
            } : undefined}
            onError={() => setI(i + 1)}
        />
    )
}

const pct = (n: number) => `${Math.round(n * 100)}%`
const clampPct = (n: number) => `${Math.max(0,
    Math.min(100,
        n * 100))}%`

function HpRow(p: { u: Unit }) {
    const { u } = p
    const total = Math.max(u.maxHp,
        u.hp + u.shield,
        1)
    return <div className="us-hp-module"><span className="us-hp-counter">{Math.ceil(u.hp)} / {u.maxHp}{u.shield > 0 ? <b> +{Math.ceil(u.shield)}</b> : null}</span>
        <ArtFrame kind="meter" height={34} className={`us-hp-frame ${u.hp / u.maxHp < 0.3 ? "low" : ""}`} fill={<div className="us-hp-fill"><i className="hp" style={{
            width: clampPct(u.hp / total)
        }} />{u.shield > 0 ? <i className="sh" style={{
            left: clampPct(u.hp / total), width: clampPct(u.shield / total)
        }} /> : null}</div>} />
    </div>
}

function Effects(p: { u: Unit; view: CardView }) {
    const t = T()
    const { u, view } = p
    const [openKey,
        setOpenKey] = useState<string | null>(null)
    const m = buildEffects(u,
        view.turnNo,
        (id) => view.units[id])
    const en = isEn()
    return (
        <>
            <section className="us-sec">
                <h4>{en ? "Active effects" : "Hiệu ứng đang chịu"}</h4>
                {m.cells.length ? (
                    <div className="fxm-grid">
                        {m.cells.map((c) => (
                            <FxCellView
                                key={c.key}
                                cell={c}
                                popover
                                open={openKey === c.key}
                                onToggle={() => setOpenKey(openKey === c.key ? null : c.key)}
                            />
                        ))}
                    </div>
                ) : <p className="us-none">{t.none}</p>}
            </section>
        </>
    )
}

function ItemSlots(p: { u: Unit; view: CardView; legal: cg.Action[] }) {
    const t = T()
    const en = isEn()
    const mine = p.view.you === p.u.side
    const used = new Set<number>()
    const handFull = mine && (p.view.players[p.u.side].hand ?? []).filter((c) => !c.temp).length >= p.view.rules.handMax
    return (
        <section className="us-sec">
            <h4>{t.items}</h4>
            <div className="us-items">
                {[0,
                    1,
                    2].map((i) => {
                    const id = p.u.items[i]
                    const it = id ? getItem(id) : undefined
                    if (!id) {
                        return (
                            <div key={i} className="us-item empty" aria-label={`${t.items} ${i + 1}: ${t.emptySlot}`}>
                                <ArtFrame kind="icon" width={70} height={70}><span className="us-slot-index">{i + 1}</span></ArtFrame><span>{t.emptySlot}</span>
                            </div>
                        )
                    }
                    const props = (it?.props ?? []).slice(1)
                    const un = mine ? p.legal.find((a, k) => a.t === "unequip" && a.unit === p.u.id && a.item === id && !used.has(k)) : undefined
                    if (un) used.add(p.legal.indexOf(un))
                    const tx = cg.itemText(id,
                        isEn() ? "en" : "vi")
                    return (
                        <div key={i} className="us-item" tabIndex={0} aria-label={tx?.name ?? it?.name ?? id}>
                            <ArtFrame kind="icon" width={70} height={70} fill={<Pic srcs={[`/card_items/${id}.png`,
                                `/items/${id}.png`]} cls="us-item-ic" letter={it?.emoji ?? "?"} />} />
                            <span className="us-item-n">{tx?.name ?? it?.name ?? id}</span>
                            {un ? (
                                <button
                                    className={`us-unequip${handFull ? " warn" : ""}`}
                                    title={handFull ? (en ? "Hand full: the item card will be burned" : "Tay đầy: lá đồ sẽ bị đốt vào mộ") : (en ? "The item card returns to your hand" : "Lá đồ về tay, lắp lại được cho tướng khác")}
                                    onClick={(e) => { e.stopPropagation(); cardActions.act(un) }}
                                >
                                    {en ? "Unequip" : "Tháo đồ"}
                                    {handFull ? " ⚠" : ""}
                                </button>
                            ) : null}
                            <div className="us-item-tip" role="tooltip">
                                <b>{tx?.name ?? it?.name ?? id}</b>
                                <p>{tx ? tx.stats : it ? cg.itemStatText(it) : ""}</p>
                                {tx ? (
                                    <p>
                                        <b>{`${tx.passive}: `}</b>
                                        <RichText text={tx.desc} />
                                        {tx.counter ? ` (${p.u.stacks[`item:${id}`] ?? 0}${tx.counter.max ? `/${tx.counter.max}` : ""})` : ""}
                                    </p>
                                ) : props.map((x, k) => (
                                    <p key={k}>
                                        <b>{`${x.name}: `}</b>
                                        <RichText text={x.desc} />
                                    </p>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>
        </section>
    )
}

/** Mana cơ bản của một chiêu (số cố định; chiêu tính động thì không hiện) */
function manaCostOfSkill(g: cg.Game, u: Unit, def: cg.SkillDef): number | "all" | undefined {
    return g.manaCost(u,
        def,
        {
            uid: `inspect:${u.id}:${def.key}`, kind: "skill", id: `${u.hero}_${def.key.toLowerCase()}`, hero: u.hero, side: u.side
        })
}

function copiesLine(view: CardView, u: Unit, key: cg.SkillKey, total: number): string {
    const t = T()
    const id = `${u.hero}_${key.toLowerCase()}`
    const isMine = (c: cg.Card) => c.kind === "skill" && c.id === id && (c.side ?? u.side) === u.side
    const grave = (["A",
        "B"] as Side[]).reduce((n, s) => n + view.players[s].grave.filter(isMine).length,
        0)
    if (view.you === u.side) {
        const hand = (view.players[u.side].hand ?? []).filter(isMine).length
        const left = view.players[u.side].deckSummary?.filter((e) => isMine(e.card)).reduce((n, e) => n + e.count,
            0)
        return `${key} ${total} · ${t.hand} ${hand} · ${t.grave} ${grave}${left === undefined ? "" : ` · ${t.deckLeft} ${left}`}`
    }
    return `${key} ${total} · ${t.used} ${grave}`
}

function Skills(p: { u: Unit; g: cg.Game; view: CardView }) {
    const t = T()
    const { u, g, view } = p
    const overlay = useGameOverlay()
    const hintId = useId()
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const keepHint = () => { if (hideTimer.current) clearTimeout(hideTimer.current) }
    const hideHint = () => { keepHint(); hideTimer.current = setTimeout(() => setHint(null),
        180) }
    useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current) },
        [])
    const [hint,
        setHint] = useState<{ key: cg.SkillKey | "P"; x: number; y: number } | null>(null)
    const h = cg.getHero(u.hero)
    if (!h) return null
    const en = isEn() ? cg.HERO_EN[u.hero] : undefined
    const text = (s: string) => {
        try {
            return cg.formulaText(s,
                g,
                u)
        } catch {
            return s
        }
    }
    const pas = en?.passive ?? h.passive
    const role = g.role(u)
    const showHint = (key: cg.SkillKey | "P", el: HTMLElement) => {
        keepHint()
        const rect = el.getBoundingClientRect()
        const at = viewportToCanvasPoint({
            x: rect.right, y: rect.top
        })
        setHint({
            key, x: Math.min(1428,
                Math.max(12,
                    at.x + 12)), y: Math.max(12,
                Math.min(748,
                    at.y))
        })
    }
    const hintCard: cg.Card | undefined = hint && hint.key !== "P" ? {
        uid: `inspect:${u.id}:${hint.key}`, kind: "skill", id: `${u.hero}_${hint.key.toLowerCase()}`, hero: u.hero, side: u.side
    } : undefined
    const hintInfo = hintCard ? cg.cardInfoL(g,
        hintCard,
        u) : hint?.key === "P" ? {
        name: pas.name, desc: text(pas.desc)
    } : undefined
    const hintDef = hint && hint.key !== "P" ? h.skills[hint.key] : undefined
    const hintCost = hintDef ? manaCostOfSkill(g,
        u,
        hintDef) : undefined
    return (
        <section className="us-sec">
            <h4>{t.skills}</h4>
            {role === "support" ? <p className="us-note">{t.supportNote}</p> : null}
            <p className="us-note">{t.mageNote}</p>
            {role === "fighter" ? <p className="us-note">{t.fighterNote}</p> : null}
            <details className="us-skill passive" onMouseEnter={(event) => showHint("P",
                event.currentTarget)} onMouseLeave={hideHint} onFocus={(event) => showHint("P",
                event.currentTarget)} onBlur={hideHint}>
                <summary aria-describedby={hint?.key === "P" ? hintId : undefined}>
                    <ArtFrame kind="icon" width={56} height={56} fill={<Pic srcs={[`/card_skills/${u.hero}_p.png`]} cls="us-sk-ic" letter="P" />} />
                    <div className="us-sk-b">
                        <div className="us-sk-h">
                            <span className="us-passive-label">{t.passive}</span>
                            <b>{pas.name}</b>
                        </div>
                        <span className="us-expand-hint">{isEn() ? "Inspect passive" : "Xem nội tại"}</span>
                    </div>
                </summary>
                <RichText className="us-rich" text={text(pas.desc)} />
            </details>
            {KEYS.map((k) => {
                const def = h.skills[k]
                const e = en?.skills[k]
                const card: cg.Card = {
                    uid: `inspect:${u.id}:${k}`, kind: "skill", id: `${u.hero}_${k.toLowerCase()}`, hero: u.hero, side: u.side
                }
                const info = cg.cardInfoL(g,
                    card,
                    u)
                const skillName = info.name.startsWith(`${unitName(u)}: `) ? info.name.slice(unitName(u).length + 2) : def.variant?.(u,
                    card)?.vi.name ?? e?.name ?? def.name
                const description = info.desc || text(e?.desc ?? def.desc)
                const total = view.rules.skillCopies[k]
                const cost = manaCostOfSkill(g,
                    u,
                    def)
                return (
                    <details key={k} className="us-skill" onMouseEnter={(event) => showHint(k,
                        event.currentTarget)} onMouseLeave={hideHint} onFocus={(event) => showHint(k,
                        event.currentTarget)} onBlur={hideHint}>
                        <summary aria-describedby={hint?.key === k ? hintId : undefined}>
                            <ArtFrame kind="icon" width={56} height={56} fill={<Pic srcs={[unitSkillIcon(u,
                                k)]} cls="us-sk-ic" letter={k} />} />
                            <div className="us-sk-b">
                                <div className="us-sk-h">
                                    <i className="us-key">{k}</i>
                                    <b>{skillName}</b>
                                    <span className="us-sk-tags">
                                        {def.quick ? <span className="us-tag q">{t.quick}</span> : null}
                                        {def.chainOnly ? <span className="us-tag c">{t.chainOnly}</span> : null}
                                        {cost !== undefined ? <span className="us-tag m">{cost === "all" ? (isEn() ? "All mana" : "Toàn bộ mana") : `${cost} mana`}</span> : null}
                                    </span>
                                </div>
                                <div className="us-copies">{copiesLine(view,
                                    u,
                                    k,
                                    total)}</div>
                            </div>
                        </summary>
                        <RichText className="us-rich" text={description} />
                    </details>
                )
            })}
            {overlay && hint && hintInfo ? createPortal(<aside id={hintId} className="us-skill-tooltip" role="tooltip" style={{
                left: hint.x, top: hint.y
            }} onMouseEnter={keepHint} onMouseLeave={hideHint} onFocus={keepHint} onBlur={hideHint}>
                <ArtFrame kind="panel" width={480} height={320} contentClassName="us-hint-safe">
                    <header><ArtFrame kind="icon" width={52} height={52} fill={<Pic srcs={[unitSkillIcon(u,
                        hint.key)]} cls="us-hint-icon" letter={hint.key} />} /><div><small>{unitName(u)} · {hint.key}</small><h3>{hintInfo.name.replace(`${unitName(u)}: `,
                        "")}</h3></div>{hintCost !== undefined ? <strong className="us-hint-cost"><GameIcon name="diamond" />{hintCost === "all" ? (isEn() ? "All" : "Toàn bộ") : hintCost}<small>mana</small></strong> : null}</header>
                    <p className="us-hint-activation">{hint.key === "P" ? t.passive : hintDef?.chainOnly ? (isEn() ? "Response only · Follow the printed condition" : "Chỉ nối chuỗi · Theo điều kiện ghi trên lá") : hintDef?.quick ? (isEn() ? "Skill · Quick when its condition is met" : "Tung chiêu · Quick khi đủ điều kiện") : (isEn() ? "Cast skill" : "Tung chiêu")}</p>
                    <ScrollArea className="us-hint-scroll" label={isEn() ? "Skill rules" : "Luật kỹ năng"}><RichText className="us-hint-rules" text={hintInfo.desc} /></ScrollArea>
                </ArtFrame>
            </aside>,
            overlay) : null}
        </section>
    )
}

function TokenInfo(p: { u: Unit; view: CardView }) {
    const t = T()
    const { u, view } = p
    const k = u.token!
    const owner = k.ownerId ? view.units[k.ownerId] : undefined
    return (
        <section className="us-sec">
            <h4>{t.token}</h4>
            <div className="us-chips">
                {owner ? (
                    <span className="us-chip">
                        {`${t.owner}: `}
                        <b>{unitName(owner)}</b>
                    </span>
                ) : null}
                {k.soak ? <span className="us-chip">{t.soak}</span> : null}
                {k.overflow ? <span className="us-chip">{t.overflow}</span> : null}
                {k.expires ? <span className="us-chip">{`${t.left} ${turnsLeft(k.expires,
                    view.turnNo)} ${t.turns}`}</span> : null}
            </div>
        </section>
    )
}

function supportCards(view: CardView, side: Side) {
    const entries = new Map<string, { card: cg.Card; source: "hand" | "deck" | "grave"; hand: number; deck: number; grave: number }>()
    const add = (card: cg.Card, source: "hand" | "deck" | "grave", count = 1) => {
        if (!card.id.startsWith("spell_")) return
        const row = entries.get(card.id) ?? {
            card: {
                ...card, side
            }, source, hand: 0, deck: 0, grave: 0
        }
        row[source] += count
        entries.set(card.id,
            row)
    }
    for (const card of view.players[side].hand ?? []) add(card,
        "hand")
    for (const entry of view.players[side].deckSummary ?? []) add(entry.card,
        "deck",
        entry.count)
    for (const card of view.players[side].grave) add(card,
        "grave")
    return [...entries.values()]
}

function SupportSheet(p: { u: Unit; g: cg.Game; view: CardView }) {
    const en = isEn()
    const cards = supportCards(p.view,
        p.u.side)
    const [selected,
        setSelected] = useState<string | null>(null)
    const active = cards.find((row) => row.card.id === selected)
    return <section className="us-sec us-support-sheet">
        <h4>{en ? "Team summoner cards" : "Phép bổ trợ của đội"}</h4>
        {active ? <><button type="button" className="us-support-back" onClick={() => setSelected(null)}>{en ? "Back to summoner cards" : "Danh sách bổ trợ"}</button><CardInspector card={active.card} context={{
            source: active.source, side: p.u.side, actor: p.u.id
        }} view={p.view} dismissible={false} /></> : <>
            <p className="us-note">{en ? "Inspect a visible card. Selecting it here does not play it." : "Chọn lá để xem. Thao tác tại đây không đánh lá bài."}</p>
            <div className="us-support-list">{cards.map((row) => {
                const info = cg.cardInfoL(p.g,
                    row.card,
                    p.u)
                return <button type="button" className={`us-support-card${row.card.id === selected ? " selected" : ""}`} key={row.card.id} aria-pressed={row.card.id === selected} onClick={() => setSelected(row.card.id)}>
                    <ArtFrame kind="icon" width={48} height={48} fill={<Pic srcs={[`/card_support/${row.card.id}.png`]} cls="us-support-icon" letter="S" />} />
                    <span><b>{info.name}</b><small>{en ? "Hand" : "Tay"} {p.view.players[p.u.side].hand ? row.hand : "?"} · {en ? "Deck" : "Bộ"} {p.view.players[p.u.side].deckSummary ? row.deck : "?"} · {en ? "Grave" : "Mộ"} {row.grave}</small></span>
                </button>
            })}</div>
        </>}
        {!cards.length ? <p className="us-none">{en ? "No visible summoner card. Active sources appear below." : "Chưa có lá bổ trợ công khai. Nguồn đang tác dụng hiển thị bên dưới."}</p> : null}
    </section>
}

function ChampionDetails(p: { u: Unit; g: cg.Game; view: CardView; legal: cg.Action[]; grid: ReactNode[] }) {
    const en = isEn()
    const id = useId()
    const [tab,
        setTab] = useState("skills")
    const hasSupport = supportCards(p.view,
        p.u.side).length > 0 || Object.values(p.u.statuses).some((status) => status.card?.startsWith("spell_"))
    const tabs = [{
        id: "items", label: en ? "Items" : "Đồ"
    },
    {
        id: "skills", label: en ? "Skills" : "Chiêu"
    },
    ...(hasSupport ? [{
        id: "support", label: en ? "Summoners" : "Bổ trợ"
    }] : [])]
    const active = tabs.some((entry) => entry.id === tab) ? tab : "skills"
    return <>
        <div className="us-grid">{p.grid}</div>
        <nav className="us-tabs" role="tablist" aria-label={en ? "Champion details" : "Chi tiết tướng"}><ArtFrame kind="name" height={52} fitLabel={false} contentClassName="us-tab-safe">{tabs.map((entry, index) => <button type="button" key={entry.id} id={`${id}-${entry.id}`} role="tab" aria-selected={active === entry.id} aria-controls={`${id}-panel`} tabIndex={active === entry.id ? 0 : -1} onClick={() => setTab(entry.id)} onKeyDown={(event) => {
            const next = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : undefined
            if (next === undefined) return
            event.preventDefault(); setTab(tabs[next].id)
            const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("button")
            buttons?.[next].focus()
        }}>{entry.label}</button>)}</ArtFrame></nav>
        <ScrollArea className="us-scroll" label={en ? "Champion details" : "Chi tiết tướng"} key={active}>
            <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${active}`}>
                {active === "items" ? <ItemSlots u={p.u} view={p.view} legal={p.legal} /> : active === "support" ? <SupportSheet u={p.u} g={p.g} view={p.view} /> : <Skills u={p.u} g={p.g} view={p.view} />}
                <Effects u={p.u} view={p.view} />
            </div>
        </ScrollArea>
    </>
}

export function UnitPanel() {
    const snap = useCard()
    const hover = useInspection()
    useEffect(() => {
        const key = (e: KeyboardEvent) => { if (e.key === "Escape") inspectionActions.clear() }
        window.addEventListener("keydown",
            key)
        return () => window.removeEventListener("keydown",
            key)
    },
    [])
    const { view } = snap
    const t = T()
    const u = inspectedUnit(view,
        hover?.kind === "unit" ? hover.unitId : snap.inspect)
    const g = useMemo(() => (view ? gameOf(view) : null),
        [view])
    if (!view || !g) return <div className="us-root" />
    if (hover?.kind === "card") {
        return <div className="us-root ci-active"><ScrollArea className="us-scroll" label="Chi tiết lá bài" key={`card:${hover.context.source}:${hover.card.uid}`}><CardInspector card={hover.card} context={hover.context} view={view} /></ScrollArea></div>
    }
    if (!u) {
        return (
            <div className="us-root">
                <p className="us-none">{t.reserve}</p>
            </div>
        )
    }
    const me: Side = view.you ?? "A"
    const mine = u.side === me
    const st = g.stats(u)
    const role = g.role(u)
    const tok = u.token
    const dmgKind = tok ? tok.damage : g.hero(u).damage
    const faceDown = !!tok?.hidden && !mine
    const art = tok ? [`/card_tokens/${tok.id}.png`,
        `/ui/fx/${tok.id}.png`,
        `/heroes-square/${u.hero}.jpg`] : [`/heroes-square/${u.hero}.jpg`]
    const row = (label: string, value: string | number, cls = "") => (
        <div key={label} className={`us-st ${cls}`}>
            <span>{label}</span>
            <b>{value}</b>
        </div>
    )
    const en = isEn()
    const grid: ReactNode[] = [
        row("AD",
            g.atk(u),
            "ad"),
        row("AP",
            g.ap(u),
            "ap"),
        row(en ? "Armor" : "Giáp",
            g.armor(u),
            "ar"),
        row(en ? "MR" : "KPhép",
            g.mr(u),
            "mr"),
    ]
    if (!tok) {
        const extra: [string, number, boolean][] = [
            [en ? "Crit" : "Chí mạng",
                st.crit,
                true],
            [en ? "Crit dmg" : "ST chí mạng",
                st.crit > 0 || st.critDmg > 0 ? cg.RULES.critBase + st.critDmg : 0,
                true],
            [en ? "Lifesteal" : "Hút máu",
                st.lifesteal,
                true],
            [en ? "Omnivamp" : "Hút máu toàn",
                st.omnivamp,
                true],
            [en ? "Lethality" : "Xuyên giáp",
                st.lethality,
                false],
            [en ? "Magic pen" : "Xuyên phép",
                st.magicPen,
                false],
            [en ? "AD mult" : "% AD",
                st.atkMult,
                true],
            [en ? "Spell amp" : "Khuếch đại phép",
                st.spellAmp,
                true],
            [en ? "Dmg amp" : "Tăng ST",
                st.dmgAmp,
                true],
            [en ? "Bonus HP" : "Máu thêm",
                st.hp,
                false],
        ]
        for (const [label,
            v,
            isPct] of extra) {
            if (v) grid.push(row(label,
                isPct ? pct(v) : Math.round(v),
                "x"))
        }
    }
    return (
        <div className={`us-root ${mine ? "mine" : "foe"}`}>
            <header className="us-head">
                {faceDown ? (
                    <ArtFrame kind="icon" width={92} height={92} fill={<span className="us-portrait us-back" />} />
                ) : (
                    <ArtFrame kind="icon" width={92} height={92} fill={<Pic srcs={art} cls="us-portrait" letter={unitName(u).slice(0,
                        1)} pos="50% 12%" />} />
                )}
                <div className="us-id">
                    <ArtFrame kind="name" height={44}><h3>{faceDown ? t.hidden : unitName(u)}</h3></ArtFrame>
                    {faceDown ? null : (
                        <div className="us-meta">
                            <span className={`us-role r-${role}`}>{roleName(role)}</span>
                            <span>{`${t.damage}: ${dmgKind === "magic" ? t.magic : t.physical}`}</span>
                            <span className={mine ? "ally" : "enemy"}>{mine ? t.ally : t.enemy}</span>
                        </div>
                    )}
                </div>
                <HpRow u={u} />
            </header>
            {faceDown ? null : !tok ? <ChampionDetails key={u.id} u={u} g={g} view={view} legal={snap.legal} grid={grid} /> : (
                <ScrollArea className="us-scroll" label="Chi tiết tướng" key={`unit:${u.id}`}>
                    <div className="us-grid">{grid}</div>
                    {tok ? (
                        <>
                            <TokenInfo u={u} view={view} />
                            <Effects u={u} view={view} />
                        </>
                    ) : (
                        <>
                            <ItemSlots u={u} view={view} legal={snap.legal} />
                            <Effects u={u} view={view} />
                            <Skills u={u} g={g} view={view} />
                        </>
                    )}
                </ScrollArea>
            )}
        </div>
    )
}
