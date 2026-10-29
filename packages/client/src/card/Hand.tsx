// Thanh dưới của chế độ thẻ bài: tay bài (xòe quạt), chọn tuỳ chọn, thanh hành động (gọi tướng, đánh, ghép đồ, kết thúc lượt).
import {
    useEffect, useMemo, useState
} from "react"
import {
    cg
} from "@starci/shared"
import {
    actionsForHandCard, cardActions, cardSig, gameOf, useCard, type CardView
} from "./store"
import {
    CraftDialog
} from "./hand/CraftDialog"

type Action = cg.Action
type Card = cg.Card
type PlayArgs = cg.PlayArgs

let lang: "vi" | "en" = "vi"
try { lang = localStorage.getItem("lang") === "en" ? "en" : "vi" } catch { /* chế độ riêng tư */ }
if (lang === "en") cg.applyCardLocale("en")
const L = (vi: string, en: string) => (lang === "en" ? en : vi)

// ---------------------------------------------------------------- art
const heroPortrait = (hero: string) => `/heroes/${hero}.jpg`

type FrameKind = "spell" | "trap" | "stat" | "item" | "combat"

interface ArtInfo { kind: FrameKind; srcs: string[]; letter?: string }

function spellIdOf(card: Card): string | undefined {
    if (card.id.startsWith("spell_")) return card.id.slice(6)
    if (card.id.startsWith("spell:")) return card.id.slice(6)
    if (card.id === "spell") {
        const v = card.data?.spell ?? card.data?.id ?? card.item
        return v === undefined ? undefined : String(v)
    }
    return undefined
}

function artInfo(card: Card): ArtInfo {
    const key = (card.copyOf ?? card.id).slice(-1).toLowerCase()
    const hero = card.hero
    if (card.kind === "skill" || card.copyOf) {
        return {
            kind: "trap",
            srcs: hero ? [`/card_skills/${hero}_${key}.png`,
                `/icons/${hero}_${key}.png`,
                `/skills_art/${hero}_${key}.jpg`,
                heroPortrait(hero)] : []
        }
    }
    if (card.kind === "wild") {
        return {
            kind: "trap", srcs: [`/card_support/wild_${key}.png`], letter: key.toUpperCase()
        }
    }
    if (card.kind === "support") {
        const spell = spellIdOf(card)
        if (spell) {
            return {
                kind: "spell", srcs: [`/card_support/spell_${spell}.png`,
                    "/ui/badge/spell.png"]
            }
        }
        switch (card.id) {
        case "gold": return {
            kind: "stat", srcs: ["/card_support/gold.png",
                "/ui/coin.png"]
        }
        case "item":
        case "legend": return {
            kind: "item", srcs: card.item ? [`/card_items/${card.item}.png`,
                `/items/${card.item}.png`] : ["/ui/badge/item.png"]
        }
        case "potion": return {
            kind: "spell", srcs: ["/cards/binh_mau.jpg"]
        }
        case "draw": return {
            kind: "spell", srcs: ["/card_support/draw.png",
                "/cards/bai_moi.jpg"]
        }
        case "buff": return {
            kind: "spell", srcs: ["/cards/cuong_no.jpg"]
        }
        default: return {
            kind: "combat", srcs: ["/card_support/basic.png",
                "/ui/badge/combat.png"]
        }
        }
    }
    return {
        kind: "trap", srcs: card.id === "mushroom" ? ["/cards/nam_teemo.jpg"] : ["/ui/badge/spell.png"]
    }
}

/** Lá bài theo khung Hextech giống màn xếp bộ (.cv) */
function Framed({ card, name }: { card: Card; name: string }) {
    const info = useMemo(() => artInfo(card),
        [card.id,
            card.hero,
            card.item,
            card.copyOf,
            card.kind,
            card.data])
    const [i,
        setI] = useState(0)
    useEffect(() => setI(0),
        [info])
    const failed = i >= info.srcs.length
    return (
        <div className={`cv ${info.kind}`}>
            <div className="cv-in">
                <img className="cv-badge" src={`/ui/badge/${info.kind}.png`} alt="" draggable={false} onError={(e) => e.currentTarget.remove()} />
                <div className="cv-icon">
                    {failed ? (
                        <div className="hd-letter"><b>{info.letter ?? "?"}</b></div>
                    ) : (
                        <img className="cv-art" src={info.srcs[i]} alt="" draggable={false} onError={() => setI(i + 1)} />
                    )}
                </div>
                <b className="cv-name">{name}</b>
            </div>
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
    // bước gọi tướng đầu lượt: nút lớn là "Rút bài" (gọi xong hoặc bỏ qua thì rút), sau đó mới là "Kết thúc lượt"
    const drawAct = legal.find((a) => (a.t as string) === "draw")
    const endAct = legal.find((a) => a.t === "end") ?? drawAct
    const canEnd = !!endAct
    const summonHeroes = [...new Set(summons.map((a) => a.hero))]
    const attackers = [...new Set(attacks.map((a) => a.actor))]
    const chain = view.phase === "chain"
    const endLabel = drawAct && !legal.some((a) => a.t === "end") ? L("Rút bài",
        "Draw") : canEnd ? L("Kết thúc lượt",
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
                    <button className="hd-btn blue" onClick={() => setCraftOpen(true)}>{L("Ghép đồ",
                        "Craft")}</button>
                    <button className="hd-end" disabled={!canEnd} onClick={() => endAct && cardActions.act(endAct)}>{endLabel}</button>
                </div>
            </div>

            {craftOpen ? <CraftDialog onClose={() => setCraftOpen(false)} /> : null}
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
    const tag = d.quick ? (d.chainOnly ? L("Chỉ nối chuỗi",
        "Chain only") : "Quick") : ""
    return (
        <div className="hd-slot" data-hand-uid={d.card.uid}>
            <div className={cls.filter(Boolean).join(" ")} onClick={onClick} role="button" aria-disabled={!playable}>
                <Framed card={d.card} name={d.name} />
                {tag ? <span className="hd-q hd-qtag">{tag}</span> : null}
                {d.dead ? <div className="hd-dead">{L("ĐÃ CHẾT",
                    "DEAD")}</div> : null}
            </div>
            <div className={`hd-zoom ${d.type}`}>
                <div className="hd-zcard">
                    <Framed card={d.card} name={d.name} />
                </div>
                <div className="hd-ztags">
                    <span>{d.typeLabel}</span>
                    {d.quick ? <span className="hd-q">{tag}</span> : null}
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
