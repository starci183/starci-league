// Thanh dưới của chế độ thẻ bài: tay bài (xòe quạt), chọn tuỳ chọn, thanh hành động (gọi tướng, đánh, ghép đồ, kết thúc lượt).
import {
    useEffect, useMemo, useState
} from "react"
import {
    cg, combine, getItem
} from "@starci/shared"
import {
    actionsForHandCard, cardActions, cardSig, gameOf, useCard, type CardView
} from "./store"

type Action = cg.Action
type Card = cg.Card
type PlayArgs = cg.PlayArgs

let lang: "vi" | "en" = "vi"
try { lang = localStorage.getItem("lang") === "en" ? "en" : "vi" } catch { /* chế độ riêng tư */ }
if (lang === "en") cg.applyCardLocale("en")
const L = (vi: string, en: string) => (lang === "en" ? en : vi)

// ---------------------------------------------------------------- art
const heroPortrait = (hero: string) => `/heroes/${hero}.jpg`

function artSources(card: Card): string[] {
    const key = (card.copyOf ?? card.id).slice(-1).toLowerCase()
    const hero = card.hero
    if (card.kind === "skill" || card.copyOf) {
        return hero ? [`/card_skills/${hero}_${key}.png`,
            `/icons/${hero}_${key}.png`,
            `/skills_art/${hero}_${key}.jpg`,
            heroPortrait(hero)] : []
    }
    if (card.kind === "support") {
        switch (card.id) {
        case "gold": return ["/ui/coin.png"]
        case "item": return card.item ? [`/items/${card.item}.png`] : ["/ui/badge/item.png"]
        case "potion": return ["/cards/binh_mau.jpg"]
        case "draw": return ["/cards/bai_moi.jpg"]
        case "buff": return ["/cards/cuong_no.jpg"]
        default: return ["/ui/badge/combat.png"]
        }
    }
    if (card.kind === "special") return card.id === "mushroom" ? ["/cards/nam_teemo.jpg"] : ["/ui/badge/spell.png"]
    return []
}

function Art({ card, big }: { card: Card; big?: boolean }) {
    const srcs = useMemo(() => artSources(card),
        [card.id,
            card.hero,
            card.item,
            card.copyOf,
            card.kind])
    const [i,
        setI] = useState(0)
    useEffect(() => setI(0),
        [srcs])
    if (card.kind === "wild") {
        return <div className={`hd-art hd-wild${big ? " big" : ""}`}><b>{card.id.slice(-1).toUpperCase()}</b></div>
    }
    const icon = card.kind === "support" && card.id !== "buff" && card.id !== "draw" && card.id !== "potion"
    if (i >= srcs.length) return <div className="hd-art hd-wild"><b>?</b></div>
    return (
        <div className={`hd-art${icon ? " icon" : ""}${big ? " big" : ""}`}>
            <img src={srcs[i]} alt="" draggable={false} onError={() => setI(i + 1)} />
        </div>
    )
}

// ---------------------------------------------------------------- dữ liệu một lá
interface CardData {
    card: Card;
    name: string;
    desc: string;
    type: string;
    typeLabel: string;
    quick: boolean;
    chainOnly: boolean;
    dead: boolean;
    options: Action[];
    chainable: boolean;
}

const TYPE_LABEL: Record<string, [string, string]> = {
    skill: ["Chiêu",
        "Skill"], wild: ["Chiêu chung",
        "Wild"], support: ["Hỗ trợ",
        "Support"], special: ["Đặc biệt",
        "Special"],
}

function buildData(view: CardView, g: cg.Game, legal: Action[], hand: Card[]): CardData[] {
    return hand.map((card) => {
        const hero = card.hero
        const unit = hero ? view.units[`${card.side ?? view.you}:${hero}`] : undefined
        let info: { name: string; desc: string; type: string } = {
            name: card.id, desc: "", type: card.kind
        }
        try { info = cg.cardInfoL(g,
            card,
            unit) } catch { /* lá lạ */ }
        const def = card.kind === "skill" || card.copyOf ? cg.skillOfCard(card) : undefined
        const options = actionsForHandCard(legal,
            hand,
            card)
        const lbl = TYPE_LABEL[info.type] ?? TYPE_LABEL.support
        return {
            card, name: info.name, desc: info.desc, type: info.type, typeLabel: L(lbl[0],
                lbl[1]),
            quick: !!def?.quick, chainOnly: !!def?.chainOnly, dead: unit?.status === "dead",
            options, chainable: options.some((a) => a.t === "chain"),
        }
    })
}

// ---------------------------------------------------------------- chọn tuỳ chọn trước khi chọn mục tiêu
interface Choice { key: string; label: string; sub?: string; img?: string; dot?: string; options: Action[] }
interface Chooser { title: string; source: string; choices: Choice[] }

const argsOf = (a: Action): PlayArgs => ((a.t === "play" || a.t === "chain") ? a.args ?? {
} : {
})
const COLORS: Record<string, [string, string, string]> = {
    blue: ["Xanh",
        "Blue",
        "#4a9aff"], red: ["Đỏ",
        "Red",
        "#ff5a4a"], gold: ["Vàng",
        "Gold",
        "#f5d27a"],
}

function dedupe(list: Action[]): Action[] {
    const seen = new Set<string>()
    return list.filter((a) => { const k = JSON.stringify(a); if (seen.has(k)) return false; seen.add(k); return true })
}

function groupBy(options: Action[], keyOf: (a: PlayArgs) => string | undefined): Map<string, Action[]> {
    const m = new Map<string, Action[]>()
    for (const a of options) {
        const k = keyOf(argsOf(a)) ?? ""
        m.set(k,
            [...(m.get(k) ?? []),
                a])
    }
    return m
}

// ---------------------------------------------------------------- Hand
export function Hand() {
    const s = useCard()
    const { view, legal, targeting, error } = s
    const [chooser,
        setChooser] = useState<Chooser | null>(null)
    const [craftOpen,
        setCraftOpen] = useState(false)
    const g = useMemo(() => (view ? gameOf(view) : null),
        [view])
    const me = view?.you ?? null
    const hand = useMemo(() => (view && me ? view.players[me].hand ?? [] : []),
        [view,
            me])
    const data = useMemo(() => (view && g ? buildData(view,
        g,
        legal,
        hand) : []),
    [view,
        g,
        legal,
        hand])

    // đóng hộp chọn khi trạng thái đổi
    useEffect(() => {
        setChooser(null)
        setCraftOpen(false)
    },
    [view,
        legal])
    // tự tắt thông báo lỗi
    useEffect(() => {
        if (!error) return
        const t = setTimeout(() => cardActions.clearError(),
            6000)
        return () => clearTimeout(t)
    },
    [error])
    // Escape huỷ
    const busy = !!chooser || !!targeting || craftOpen
    useEffect(() => {
        if (!busy) return
        const on = (e: KeyboardEvent) => {
            if (e.key !== "Escape") return
            setChooser(null)
            setCraftOpen(false)
            cardActions.cancelTargeting()
        }
        window.addEventListener("keydown",
            on)
        return () => window.removeEventListener("keydown",
            on)
    },
    [busy])

    if (!view || !g || !me) return <section className="cg-hand" />

    const handMax = view.rules.handMax
    const myMove = view.toMove === me
    const unitName = (id: string) => {
        const u = view.units[id]
        return u ? (u.token?.name ?? cg.getHero(u.hero)?.name ?? u.hero) : id
    }
    const cardName = (uid: string): string | undefined => {
        const c = [...hand,
            ...view.players[me].grave].find((x) => x.uid === uid)
        return c ? cg.cardInfoL(g,
            c).name : undefined
    }
    const sigOfUid = (uid: string) => {
        const c = [...hand,
            ...view.players[me].grave].find((x) => x.uid === uid)
        return c ? cardSig(c) : uid
    }

    /** Tìm tuỳ chọn còn phân vân đầu tiên; không còn thì giao cho Board chọn mục tiêu */
    const advance = (source: string, optionsIn: Action[]) => {
        const options = dedupe(optionsIn)
        if (!options.length) return
        const ask = (title: string, groups: Map<string, Action[]>, mk: (k: string, opts: Action[]) => Omit<Choice, "key" | "options">) => {
            setChooser({
                title, source, choices: [...groups.entries()].map(([key,
                    opts]) => ({
                    key, options: opts, ...mk(key,
                        opts)
                }))
            })
        }
        const colors = groupBy(options,
            (a) => a.color)
        if (colors.size > 1) {
            return ask(L("Chọn màu",
                "Choose a color"),
            colors,
            (k) => ({
                label: (COLORS[k]?.[lang === "en" ? 1 : 0] ?? k), dot: COLORS[k]?.[2]
            }))
        }
        const discards = groupBy(options,
            (a) => a.discard?.map(sigOfUid).sort().join("+"))
        if (discards.size > 1) {
            return ask(L("Chọn lá bỏ",
                "Choose card(s) to discard"),
            discards,
            (_k, opts) => ({
                label: (argsOf(opts[0]).discard ?? []).map((u) => cardName(u) ?? u).join(" + ")
            }))
        }
        const picks = groupBy(options,
            (a) => (a.pick === undefined ? undefined : sigOfUid(a.pick)))
        if (picks.size > 1) {
            return ask(L("Chọn",
                "Choose"),
            picks,
            (_k, opts) => {
                const p = argsOf(opts[0]).pick ?? ""
                return {
                    label: cardName(p) ?? p
                }
            })
        }
        const actors = groupBy(options,
            (a) => a.actor)
        const needsBoard = options.some((a) => {
            const x = argsOf(a)
            return !!x.target || !!x.targets?.length || x.lane !== undefined
        })
        if (actors.size > 1 && needsBoard) {
            return ask(L("Chọn tướng tung chiêu",
                "Choose the champion"),
            actors,
            (k) => ({
                label: unitName(k), img: view.units[k] ? heroPortrait(view.units[k].hero) : undefined
            }))
        }
        setChooser(null)
        cardActions.beginTargeting(source,
            options)
    }

    const onCard = (d: CardData) => {
        if (!d.options.length) return
        if (targeting?.source === d.card.uid) {
            cardActions.cancelTargeting()
            return
        }
        cardActions.cancelTargeting()
        advance(d.card.uid,
            d.options)
    }

    // ---- hành động toàn cục
    const summons = legal.filter((a): a is Extract<Action, { t: "summon" }> => a.t === "summon")
    const attacks = legal.filter((a): a is Extract<Action, { t: "attack" }> => a.t === "attack")
    const crafts = legal.filter((a): a is Extract<Action, { t: "craft" }> => a.t === "craft")
    const canEnd = legal.some((a) => a.t === "end")
    const summonHeroes = [...new Set(summons.map((a) => a.hero))]
    const attackers = [...new Set(attacks.map((a) => a.actor))]
    const chain = view.phase === "chain"
    const endLabel = canEnd ? L("Kết thúc lượt",
        "End turn") : chain ? L("Đang nối chuỗi…",
        "Chain…") : myMove ? L("Chờ…",
        "Wait…") : L("Lượt đối thủ",
        "Opponent's turn")

    const src = targeting?.source
    const confirms = targeting && targeting.options.length > 1 && targeting.options.length <= 8
        && targeting.options.every((a) => (argsOf(a).targets?.length ?? 0) > 0)
        ? targeting.options : []
    const srcName = src ? (cardName(src) ?? (view.units[src] ? unitName(src) : (cg.getHero(src)?.name ?? ""))) : ""

    return (
        <section className={`cg-hand${myMove ? " mine" : ""}${chain ? " chain" : ""}`}>
            {error ? (
                <div className="hd-toast" role="alert">
                    <span>{error}</span>
                    <button onClick={() => cardActions.clearError()} aria-label="close">×</button>
                </div>
            ) : null}
            {targeting ? (
                <div className="hd-hint">
                    <b>{L("Chọn mục tiêu…",
                        "Choose a target…")}</b>
                    {srcName ? <span>{srcName}</span> : null}
                    {confirms.map((a, i) => (
                        <button key={i} className="hd-chip" onClick={() => cardActions.act(a)}>
                            {L("Xong: ",
                                "Done: ")}{(argsOf(a).targets ?? []).map(unitName).join(", ")}
                        </button>
                    ))}
                    <button className="hd-cancel" onClick={() => cardActions.cancelTargeting()}>{L("Huỷ",
                        "Cancel")}</button>
                </div>
            ) : null}
            {chooser ? (
                <div className="hd-pop">
                    <div className="hd-pop-title">{chooser.title}</div>
                    <div className="hd-pop-list">
                        {chooser.choices.map((c) => (
                            <button key={c.key} className="hd-choice" onClick={() => advance(chooser.source,
                                c.options)}>
                                {c.img ? <img src={c.img} alt="" /> : null}
                                {c.dot ? <i style={{
                                    background: c.dot
                                }} /> : null}
                                <span>{c.label}</span>
                            </button>
                        ))}
                    </div>
                    <button className="hd-cancel" onClick={() => { setChooser(null); cardActions.cancelTargeting() }}>{L("Huỷ",
                        "Cancel")}</button>
                </div>
            ) : null}

            <div className="hd-left">
                <div className="hd-count">
                    <b>{L("Tay",
                        "Hand")} {hand.length}/{handMax}</b>
                    <span>{L("Bộ bài",
                        "Deck")} {view.players[me].deckCount}</span>
                    {chain && view.chain?.priority === me ? <em>{L("Bạn có quyền nối chuỗi",
                        "You may chain")}</em> : null}
                </div>
                <div className="hd-fan">
                    {data.map((d) => <HandCard key={d.card.uid} d={d} chain={chain} selected={src === d.card.uid} onClick={() => onCard(d)} />)}
                </div>
            </div>

            <div className="hd-actions">
                {summonHeroes.length ? (
                    <div className="hd-group">
                        <label>{L("Triệu hồi",
                            "Summon")}</label>
                        <div className="hd-row">
                            {summonHeroes.map((h) => (
                                <button key={h} className={`hd-hero${src === h ? " sel" : ""}`} title={cg.getHero(h)?.name ?? h}
                                    onClick={() => { cardActions.cancelTargeting(); cardActions.beginTargeting(h,
                                        summons.filter((a) => a.hero === h)) }}>
                                    <img src={heroPortrait(h)} alt="" />
                                    <span>{cg.getHero(h)?.name ?? h}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : null}
                {attackers.length ? (
                    <div className="hd-group">
                        <label>{L("Đánh miễn phí",
                            "Free attack")}</label>
                        <div className="hd-row">
                            {attackers.map((u) => (
                                <button key={u} className={`hd-hero atk${src === u ? " sel" : ""}`} title={unitName(u)}
                                    onClick={() => { cardActions.cancelTargeting(); cardActions.beginTargeting(u,
                                        attacks.filter((a) => a.actor === u)) }}>
                                    <img src={view.units[u] ? heroPortrait(view.units[u].hero) : ""} alt="" />
                                    <span>{unitName(u)}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : null}
                <div className="hd-bottom">
                    {crafts.length ? <button className="hd-btn blue" onClick={() => setCraftOpen(true)}>{L("Ghép đồ",
                        "Craft")}</button> : null}
                    <button className="hd-end" disabled={!canEnd} onClick={() => cardActions.act(legal.find((a) => a.t === "end")!)}>{endLabel}</button>
                </div>
            </div>

            {craftOpen ? <CraftDialog crafts={crafts} view={view} onClose={() => setCraftOpen(false)} unitName={unitName} /> : null}
        </section>
    )
}

// ---------------------------------------------------------------- một lá trên tay
function HandCard({ d, chain, selected, onClick }: { d: CardData; chain: boolean; selected: boolean; onClick: () => void }) {
    const playable = d.options.length > 0
    const cls = ["hd-face",
        d.type,
        playable ? "playable" : "locked",
        d.dead ? "dead" : "",
        selected ? "sel" : "",
        chain && d.chainable ? "chainable" : ""]
    return (
        <div className="hd-slot">
            <div className={cls.filter(Boolean).join(" ")} onClick={onClick} role="button" aria-disabled={!playable}>
                <Art card={d.card} />
                <div className="hd-head">
                    <span className="hd-name">{d.name}</span>
                </div>
                <div className="hd-badges">
                    {d.quick ? <span className="hd-q">{d.chainOnly ? L("Chỉ nối chuỗi",
                        "Chain only") : "Quick"}</span> : null}
                </div>
                <div className="hd-desc">{d.desc}</div>
                {d.dead ? <div className="hd-dead">{L("ĐÃ CHẾT",
                    "DEAD")}</div> : null}
            </div>
            <div className={`hd-zoom ${d.type}`}>
                <Art card={d.card} big />
                <div className="hd-zname">{d.name}</div>
                <div className="hd-ztags">
                    <span>{d.typeLabel}</span>
                    {d.quick ? <span className="hd-q">{d.chainOnly ? L("Chỉ nối chuỗi",
                        "Chain only") : "Quick"}</span> : null}
                    {d.dead ? <span className="bad">{L("Tướng đã chết",
                        "Champion dead")}</span> : null}
                </div>
                <div className="hd-zdesc">{d.desc}</div>
                <div className={`hd-zstate${playable ? " ok" : ""}`}>{playable ? L("Bấm để đánh",
                    "Click to play") : L("Chưa đánh được",
                    "Not playable now")}</div>
            </div>
        </div>
    )
}

// ---------------------------------------------------------------- ghép đồ
function CraftDialog({ crafts, view, onClose, unitName }: { crafts: Extract<Action, { t: "craft" }>[]; view: CardView; onClose: () => void; unitName: (id: string) => string }) {
    const results = new Map<string, { recipe: [string, string]; list: Extract<Action, { t: "craft" }>[] }>()
    for (const a of crafts) {
        const id = combine(a.items[0],
            a.items[1])
        if (!id) continue
        const r = results.get(id) ?? {
            recipe: a.items, list: []
        }
        if (!r.list.some((x) => x.unit === a.unit)) r.list.push(a)
        results.set(id,
            r)
    }
    const nm = (id: string) => getItem(id)?.name ?? id
    return (
        <div className="hd-modal" onClick={onClose}>
            <div className="hd-dialog" onClick={(e) => e.stopPropagation()}>
                <h3>{L("Ghép đồ",
                    "Craft an item")}</h3>
                <p>{L("2 mảnh + 1 Vàng thành 1 món đồ. Chọn món và tướng nhận.",
                    "2 components + 1 Gold make 1 item. Pick the item and the champion.")}</p>
                <div className="hd-craft-list">
                    {[...results.entries()].map(([id,
                        r]) => (
                        <div key={id} className="hd-craft">
                            <div className="hd-craft-item">
                                <img className="big" src={`/items/${id}.png`} alt="" />
                                <div>
                                    <b>{nm(id)}</b>
                                    <span className="hd-recipe">
                                        <img src={`/items/${r.recipe[0]}.png`} alt="" title={nm(r.recipe[0])} />
                                        +
                                        <img src={`/items/${r.recipe[1]}.png`} alt="" title={nm(r.recipe[1])} />
                                        +
                                        <img src="/ui/coin.png" alt="" />
                                    </span>
                                </div>
                            </div>
                            <div className="hd-row">
                                {r.list.map((a) => (
                                    <button key={a.unit} className="hd-hero" title={unitName(a.unit)} onClick={() => cardActions.act(a)}>
                                        <img src={view.units[a.unit] ? heroPortrait(view.units[a.unit].hero) : ""} alt="" />
                                        <span>{unitName(a.unit)}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <button className="hd-cancel" onClick={onClose}>{L("Đóng",
                    "Close")}</button>
            </div>
        </div>
    )
}
