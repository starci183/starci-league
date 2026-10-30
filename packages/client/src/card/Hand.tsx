// Thanh dưới của chế độ thẻ bài: tay bài (xòe quạt), chọn tuỳ chọn, thanh hành động (gọi tướng, đánh, ghép đồ, kết thúc lượt).
import {
    useEffect, useMemo, useState, useSyncExternalStore, type CSSProperties
} from "react"
import {
    cg
} from "@starci/shared"
import {
    actionsForHandCard, attacksOf, cardActions, cardSig, cardlessOptions, freeAttackOptions, gameOf, manaCostOf, useCard, type CardView
} from "./store"
import {
    RichText
} from "./RichText"
import {
    CraftDialog
} from "./hand/CraftDialog"
import {
    pendingSnapshot, subscribePending
} from "./anim/pending"

type Action = cg.Action
type Side = cg.Side
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
        kind: "trap", srcs: card.id === "mushroom" ? ["/cards/nam_teemo.jpg"] : card.id === "velkoz_decay" ? ["/card_skills/velkoz_p.png",
            "/ui/badge/spell.png"] : ["/ui/badge/spell.png"]
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
    /** Bị Hoá Băng (không đánh/nối/ghép được) */
    frozen: boolean;
    /** Tướng chủ đã chết (đang chờ hồi sinh) */
    dead: boolean;
    /** Tướng chủ còn dự bị, chưa gọi ra sân */
    reserve: boolean;
    /** Lá tạm của hiệu ứng tướng: tan biến cuối lượt nếu chưa dùng */
    temp: boolean;
    /** Mana lá chiêu Pháp sư tốn (undefined = không phải lá chiêu Pháp sư) */
    cost?: number;
    /** Mana hiện có của Pháp sư chủ lá */
    mana: number;
    /** Pháp sư không đủ mana để đánh lá này */
    lackMana: boolean;
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
        const cost = manaCostOf(g,
            card)
        const mana = unit?.mana ?? 0
        return {
            card, name: info.name, desc: info.desc, type: info.type, typeLabel: L(lbl[0],
                lbl[1]),
            quick: !!def?.quick, chainOnly: !!def?.chainOnly, dead: unit?.status === "dead", reserve: unit?.status === "reserve",
            frozen: !!card.frozen, temp: !!card.temp, cost, mana, lackMana: cost !== undefined && mana < cost,
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

/** Nhãn của lựa chọn args.pick không phải lá bài (Gangplank: úp lá làm Thùng giả, HeroDef.handUse) */
const PICK_LABEL: Record<string, [string, string]> = {
    gp_fake: ["Úp làm Thùng giả",
        "Face-down as a fake Keg"],
}

/** Thông báo lá bị đốt khi tay đầy */
interface BurnToast { k: number; text: string }
let burnSeq = 0
/** Tiền tố nguồn chọn mục tiêu của nút Đánh nhanh (để không lẫn với đòn miễn phí cùng tướng) */
const QUICK_PREFIX = "quick:"

// ---------------------------------------------------------------- Hand
export function Hand() {
    const s = useCard()
    const { view, legal, targeting, error } = s
    const [chooser,
        setChooser] = useState<Chooser | null>(null)
    const [craftOpen,
        setCraftOpen] = useState(false)
    const [burns,
        setBurns] = useState<BurnToast[]>([])
    // lá vừa bấm trên tay: hiện nút phụ "Bỏ vào mộ" cho lá đó
    const [picked,
        setPicked] = useState<string | null>(null)
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
        setPicked(null)
    },
    [view,
        legal])
    // lá bị đốt vì tay đầy: báo ngắn trên thanh tay (hoạt ảnh bay vào mộ do AnimLayer lo)
    useEffect(() => {
        if (!view || !g || !s.lastEvents.length) return
        const fresh: BurnToast[] = []
        for (const e of s.lastEvents) {
            if (e.t === "freeCard") { // V3: quà tặng đều đặn (không lấy từ bộ bài)
                const what = e.kind === "basic" ? L("lá Đánh Thường",
                    "Basic Attack card") : e.kind === "gold" ? L("lá Vàng",
                    "Gold card") : e.kind === "skill" ? L("lá chiêu",
                    "skill card") : L("mảnh đồ",
                    "item component")
                fresh.push({
                    k: ++burnSeq,
                    text: e.side === view.you
                        ? L(`Bạn được tặng 1 ${what} (không lấy từ bộ bài)`,
                            `You received a free ${what} (not from the deck)`)
                        : L(`Đối thủ được tặng 1 ${what}`,
                            `Opponent received a free ${what}`)
                })
                continue
            }
            if (e.t !== "cardBurned") continue
            const hid = (e.card as { hidden?: boolean }).hidden === true
            let name = L("một lá",
                "a card")
            if (!hid) {
                try { name = cg.cardInfoL(g,
                    e.card).name } catch { /* lá lạ */ }
            }
            fresh.push({
                k: ++burnSeq,
                text: e.side === view.you
                    ? L(`Tay đầy: ${name} bị đốt vào mộ`,
                        `Hand full: ${name} burned to the grave`)
                    : L(`Đối thủ tay đầy: ${name} bị đốt`,
                        `Opponent's hand is full: ${name} burned`)
            })
        }
        if (!fresh.length) return
        setBurns((old) => [...old,
            ...fresh].slice(-4))
        const ids = fresh.map((b) => b.k)
        const t = setTimeout(() => setBurns((old) => old.filter((b) => !ids.includes(b.k))),
            4500)
        return () => clearTimeout(t)
    },
    [s.tick])
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
    // lá có thể được nhắc tới qua args.pick: tay, mộ, và lá trên cùng bộ đang được xem (Twisted Fate Q)
    const peek = view.peek ?? []
    const cardOfUid = (uid: string): Card | undefined => [...hand,
        ...view.players[me].grave,
        ...peek].find((x) => x.uid === uid)
    const cardName = (uid: string): string | undefined => {
        const c = cardOfUid(uid)
        return c ? cg.cardInfoL(g,
            c).name : undefined
    }
    const sigOfUid = (uid: string) => {
        const c = cardOfUid(uid)
        // lá trong bộ: giữ uid (3 lá khác nhau dù cùng loại vẫn là 3 lựa chọn vị trí)
        return c && !peek.includes(c) ? cardSig(c) : uid
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
            const fromDeck = [...picks.keys()].some((k) => peek.some((c) => c.uid === k))
            return ask(fromDeck ? L(`Xem ${peek.length} lá trên cùng bộ: chọn lá xuống đáy (các lá còn lại lên tay)`,
                `Top ${peek.length} cards of your deck: choose the one to put on the bottom (the rest go to your hand)`) : L("Chọn",
                "Choose"),
            picks,
            (_k, opts) => {
                const p = argsOf(opts[0]).pick ?? ""
                const c = cardOfUid(p)
                const named = PICK_LABEL[p]
                return {
                    label: p === "" ? L("Đánh lá",
                        "Play card") : named ? L(named[0],
                        named[1]) : cardName(p) ?? p,
                    img: c ? artInfo(c).srcs[0] : undefined,
                    sub: c ? cg.cardInfoL(g,
                        c).desc : undefined,
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
        setPicked(d.card.uid)
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
    const attacks = legal.filter((a): a is Extract<Action, { t: "attack" }> => a.t === "attack" && !a.cardless)
    const quickHits = legal.filter((a): a is Extract<Action, { t: "attack" }> => a.t === "attack" && !!a.cardless)
    const upgrades = dedupe(legal.filter((a) => a.t === "upgrade")) as Extract<Action, { t: "upgrade" }>[]
    // bỏ bài xuống mộ (miễn phí): chỉ khi engine cho phép lá đang chọn (lá đóng băng vẫn bỏ được)
    const discardAct = picked ? legal.find((a): a is Extract<Action, { t: "discard" }> => a.t === "discard" && a.uid === picked) : undefined
    const pickedCard = discardAct ? hand.find((c) => c.uid === discardAct.uid) : undefined
    const foeHand = view.players[me === "A" ? "B" : "A"].hand
    const quickers = [...new Set(quickHits.map((a) => a.actor))]
    const cardlessPct = Math.round((view.rules.fighterCardlessMult ?? .66) * 100)
    const { used: atkUsed, limit: atkLimit } = attacksOf(view,
        me)
    const atkOut = atkUsed >= atkLimit
    const handOf = (h: string) => hand.filter((c) => c.kind === "skill" && c.hero === h).length
    // bước gọi tướng đầu lượt: nút lớn là "Rút bài" (gọi xong hoặc bỏ qua thì rút), sau đó mới là "Kết thúc lượt"
    const drawAct = legal.find((a) => (a.t as string) === "draw")
    // gọi tướng úp (phase "blind"): cả hai bên cùng chọn, nút lớn là "Chốt" rồi chờ đối thủ
    const blind = view.phase === "blind" ? view.blind : undefined
    const readyAct = legal.find((a) => a.t === "ready")
    const myPicks = blind?.picks[me] ?? []
    const iReady = !!blind?.ready[me]
    const foe: Side = me === "A" ? "B" : "A"
    const endAct = legal.find((a) => a.t === "end") ?? drawAct ?? readyAct
    const canEnd = !!endAct
    const summonHeroes = [...new Set(summons.map((a) => a.hero))]
    const attackers = [...new Set(attacks.map((a) => a.actor))]
    const chain = view.phase === "chain"
    const endLabel = readyAct ? L("Chốt gọi tướng",
        "Lock in summons") : blind ? (iReady ? L("Đã chốt, chờ đối thủ…",
        "Locked, waiting for opponent…") : L("Chưa gọi được",
        "Cannot summon")) : drawAct && !legal.some((a) => a.t === "end") ? L("Rút bài",
        "Draw") : canEnd ? L("Kết thúc lượt",
        "End turn") : chain ? L("Đang nối chuỗi…",
        "Chain…") : myMove ? L("Chờ…",
        "Wait…") : L("Lượt đối thủ",
        "Opponent's turn")

    const src = targeting?.source
    const confirms = targeting && targeting.options.length > 1 && targeting.options.length <= 8
        && targeting.options.every((a) => (argsOf(a).targets?.length ?? 0) > 0)
        ? targeting.options : []
    const srcId = src ? src.replace(QUICK_PREFIX,
        "") : ""
    const srcName = src ? (cardName(srcId) ?? (view.units[srcId] ? unitName(srcId) : (cg.getHero(srcId)?.name ?? ""))) : ""

    /** Hộp tuỳ chọn nổi (fixed) neo phía trên lá đang chọn; không nằm trong luồng của thanh nên không đẩy tay bài */
    const popStyle = (uid: string | null | undefined): CSSProperties => {
        const el = uid ? document.querySelector(`[data-hand-uid="${CSS.escape(uid)}"]`) : null
        const r = (el ?? document.querySelector(".cg-hand .hd-fan"))?.getBoundingClientRect()
        if (!r) return {
            left: 16, bottom: 220
        }
        const W = 360
        const cx = r.left + r.width / 2
        const left = Math.max(8,
            Math.min(cx - W / 2,
                window.innerWidth - W - 8))
        return {
            left, bottom: Math.max(8,
                window.innerHeight - r.top + (el ? 22 : 8))
        }
    }

    return (
        <section className={`cg-hand${myMove ? " mine" : ""}${chain ? " chain" : ""}`}>
            {error ? (
                <div className="hd-toast" role="alert">
                    <span>{error}</span>
                    <button onClick={() => cardActions.clearError()} aria-label="close">×</button>
                </div>
            ) : null}
            {burns.length ? (
                <div className="hd-burns" aria-live="polite">
                    {burns.map((b) => <div key={b.k} className="hd-burn">{b.text}</div>)}
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
            {chooser || (discardAct && pickedCard) ? (
                <div className="hd-pop" style={popStyle(chooser?.source ?? picked)}>
                    {chooser ? (
                        <>
                            <div className="hd-pop-title">{chooser.title}</div>
                            <div className="hd-pop-list">
                                {chooser.choices.map((c) => (
                                    <button key={c.key} className="hd-choice" title={c.sub} onClick={() => advance(chooser.source,
                                        c.options)}>
                                        {c.img ? <img src={c.img} alt="" /> : null}
                                        {c.dot ? <i style={{
                                            background: c.dot
                                        }} /> : null}
                                        <span>{c.label}</span>
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : null}
                    <div className="hd-pop-foot">
                        {discardAct && pickedCard ? (
                            <button className="hd-btn sec" title={L("Bỏ lá này xuống mộ, miễn phí, không giới hạn số lần",
                                "Discard this card to the grave: free, no limit")}
                            onClick={() => { cardActions.cancelTargeting(); cardActions.act(discardAct) }}>
                                {L("Bỏ vào mộ",
                                    "Discard")}
                            </button>
                        ) : null}
                        {chooser ? <button className="hd-cancel" onClick={() => { setChooser(null); cardActions.cancelTargeting() }}>{L("Huỷ",
                            "Cancel")}</button> : null}
                    </div>
                </div>
            ) : null}

            {foeHand && foeHand.length ? (
                <div className="hd-foehand" title={L("Tay bài đối thủ đang bị lộ",
                    "Opponent's hand is revealed")}>
                    <b>{L("Tay đối thủ (lộ)",
                        "Opponent's hand (revealed)")}</b>
                    <div className="hd-foerow">
                        {foeHand.map((c) => (
                            <div key={c.uid} className="hd-foecard">
                                <Framed card={c} name={cg.cardInfoL(g,
                                    c).name} />
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}
            <div className="hd-left">
                <div className="hd-count">
                    <b>{L("Tay",
                        "Hand")} {hand.filter((c) => !c.temp).length}/{handMax}
                    {hand.some((c) => c.temp) ? <i className="hd-tmpcount"> (+{hand.filter((c) => c.temp).length} {L("tạm",
                        "temp")})</i> : null}</b>
                    <span>{L("Bộ bài",
                        "Deck")} {view.players[me].deckCount}</span>
                    <span className={`hd-atk${atkOut ? " out" : ""}`}
                        title={L("Đánh thường mỗi lượt: lá Đánh thường và đòn không cần lá của Đấu sĩ. Đòn miễn phí từ chiêu không tính.",
                            "Basic attacks per turn: Basic Attack cards and the Fighter's cardless attack. Free attacks from skills do not count.")}>
                        {L("Đánh",
                            "Attacks")} {atkUsed}/{atkLimit}
                    </span>
                    {chain && view.chain?.priority === me ? <em>{L("Bạn có quyền nối chuỗi",
                        "You may chain")}</em> : null}
                </div>
                <div className="hd-fan">
                    {data.map((d) => <HandCard key={d.card.uid} d={d} chain={chain} selected={src === d.card.uid} onClick={() => onCard(d)} />)}
                </div>
            </div>

            <div className="hd-actions">
                {blind ? (
                    <div className="hd-group hd-blind">
                        <label>{L("Gọi tướng úp · cả hai cùng lúc",
                            "Blind summon · both at once")}</label>
                        <div className="hd-row">
                            {myPicks.map((p, i) => (
                                <span key={i} className="hd-pick" title={cg.getHero(p.hero)?.name ?? p.hero}>
                                    <img src={heroPortrait(p.hero)} alt="" />
                                    <b>{cg.getHero(p.hero)?.name ?? p.hero}</b>
                                    <i>{L("đường",
                                        "lane")} {p.lane + 1}</i>
                                </span>
                            ))}
                            {!myPicks.length ? <span className="hd-note">{L("Chưa chọn tướng nào",
                                "No champion picked yet")}</span> : null}
                        </div>
                        <div className="hd-note">
                            {L(`Hai bên gọi cùng số tướng (tối đa ${blind.cap}). `,
                                `Both sides summon the same number (max ${blind.cap}). `)}
                            {blind.ready[foe] ? L("Đối thủ đã chốt.",
                                "Opponent is locked in.") : L("Đối thủ đang chọn…",
                                "Opponent is choosing…")}
                        </div>
                    </div>
                ) : null}
                {summonHeroes.length ? (
                    <div className="hd-group">
                        <label>{blind ? L("Chọn tướng gọi úp",
                            "Pick a champion") : L("Triệu hồi",
                            "Summon")}</label>
                        <div className="hd-row">
                            {summonHeroes.map((h) => (
                                <button key={h} className={`hd-hero sm${src === h ? " sel" : ""}`} title={`${cg.getHero(h)?.name ?? h} · ${handOf(h)} ${L("lá trên tay",
                                    "cards in hand")}`}
                                onClick={() => { cardActions.cancelTargeting(); cardActions.beginTargeting(h,
                                    summons.filter((a) => a.hero === h)) }}>
                                    <img src={heroPortrait(h)} alt="" />
                                    <span>{cg.getHero(h)?.name ?? h}</span>
                                    <em className={handOf(h) ? "has" : ""}>{handOf(h)} {L("lá trên tay",
                                        "in hand")}</em>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : null}
                {upgrades.length ? (
                    <div className="hd-group">
                        <label>{L("Nâng cấp",
                            "Upgrade")}</label>
                        <div className="hd-row">
                            {upgrades.map((a, i) => {
                                const it = hand.find((c) => c.uid === a.item)
                                const nm = it ? cg.cardInfoL(g,
                                    it).name : a.item
                                return (
                                    <button key={i} className="hd-btn up" title={`${unitName(a.unit)} · ${nm}`}
                                        onClick={() => cardActions.act(a)}>
                                        {L("Nâng cấp",
                                            "Upgrade")} {unitName(a.unit)} · {nm}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                ) : null}
                {quickers.length ? (
                    <div className="hd-group">
                        <label>{L("Đánh không cần lá · lượt của bạn",
                            "Cardless attack · your turn")}</label>
                        <div className="hd-row">
                            {quickers.map((u) => (
                                <button key={u} className={`hd-quick${src === QUICK_PREFIX + u ? " sel" : ""}`} title={`${unitName(u)} · ${L("Đánh không cần lá",
                                    "Cardless attack")} ${cardlessPct}%`}
                                onClick={() => { cardActions.cancelTargeting(); cardActions.beginTargeting(QUICK_PREFIX + u,
                                    cardlessOptions(legal,
                                        u)) }}>
                                    <img src={view.units[u] ? heroPortrait(view.units[u].hero) : ""} alt="" />
                                    <span><b>{L("Đánh không cần lá",
                                        "Cardless attack")} {cardlessPct}%</b><i>{unitName(u)}</i></span>
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
                                        freeAttackOptions(legal,
                                            u)) }}>
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
        d.reserve ? "reserve" : "",
        d.temp ? "temp" : "",
        d.frozen ? "frozen" : "",
        d.lackMana ? "nomana" : "",
        selected ? "sel" : "",
        chain && d.chainable ? "chainable" : ""]
    const tag = d.quick ? (d.chainOnly ? L("Chỉ nối chuỗi",
        "Chain only") : "Quick") : ""
    // lá vừa rút/trộm: giữ chỗ nhưng ẩn tới khi hoạt ảnh bay tới
    const arriving = useSyncExternalStore(subscribePending,
        pendingSnapshot).has(d.card.uid)
    return (
        <div className={arriving ? "hd-slot arriving" : "hd-slot"} data-hand-uid={d.card.uid}>
            <div className={cls.filter(Boolean).join(" ")} onClick={onClick} role="button" aria-disabled={!playable}>
                <Framed card={d.card} name={d.name} />
                {tag ? <span className="hd-q hd-qtag">{tag}</span> : null}
                {d.cost !== undefined ? <span className={`hd-gem${d.lackMana ? " lack" : ""}`} title={L("Mana cần để tung chiêu",
                    "Mana needed to cast")}>{d.cost}</span> : null}
                {d.frozen ? <div className="hd-ice"><span>{L("Bị Hoá Băng",
                    "Frozen")}</span></div> : null}
                {d.temp ? <span className="hd-tmp">{L("Tạm",
                    "Temp")}</span> : null}
                {d.dead ? <div className="hd-dead">{L("ĐÃ CHẾT",
                    "DEAD")}</div> : null}
                {d.reserve ? <div className="hd-dead rsv">{L("Chưa gọi",
                    "Not summoned")}</div> : null}
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
                    {d.reserve ? <span className="dim">{L("Tướng chưa ra sân",
                        "Champion not on board")}</span> : null}
                    {d.cost !== undefined ? <span className="mana">{L("Tốn",
                        "Cost")} {d.cost} mana</span> : null}
                    {d.temp ? <span className="tmp">{L("Tạm",
                        "Temp")}</span> : null}
                </div>
                <div className="hd-zdesc"><RichText text={d.desc} /></div>
                {d.temp ? <div className="hd-zstate tmp">{L("Lá tạm: biến mất cuối lượt nếu không dùng",
                    "Temporary card: vanishes at end of turn if unused")}</div> : null}
                {d.frozen ? <div className="hd-zstate ice">{L("Bị Hoá Băng: không đánh được cho tới khi tan băng",
                    "Frozen: cannot be played until thawed")}</div> : null}
                {d.lackMana ? <div className="hd-zstate bad">{L(`Thiếu mana (cần ${d.cost}, còn ${d.mana})`,
                    `Not enough mana (need ${d.cost}, have ${d.mana})`)}</div> : null}
                <div className={`hd-zstate${playable ? " ok" : ""}`}>{playable ? L("Bấm để đánh",
                    "Click to play") : L("Chưa đánh được",
                    "Not playable now")}</div>
            </div>
        </div>
    )
}
