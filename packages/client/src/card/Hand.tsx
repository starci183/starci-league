// Thanh dưới của chế độ thẻ bài: tay bài (xòe quạt), chọn tuỳ chọn, thanh hành động (gọi tướng, đánh, ghép đồ, kết thúc lượt).
import {
    useEffect, useMemo, useState, useSyncExternalStore, type CSSProperties
} from "react"
import {
    cg
} from "@starci/shared"
import {
    actionsForHandCard, attacksOf, cardActions, cardSig, cardlessOptions, gameOf, manaCostOf, targetsOf, useCard, type CardView
} from "./store"
import {
    CraftDialog
} from "./hand/CraftDialog"
import {
    ActionDialog
} from "./ui/ActionDialog"
import {
    SylasStealDialog
} from "./hand/SylasStealDialog"
import {
    ChampionModeDialog
} from "./ui/ChampionModeDialog"
import {
    GAME_CANVAS_HEIGHT, GAME_CANVAS_WIDTH, viewportToCanvasPoint
} from "./ui/GameCanvas"
import {
    ForestIcon
} from "./ui/ForestIcon"
import {
    pendingSnapshot, subscribePending
} from "./anim/pending"

type Action = cg.Action
import {
    inspectionActions
} from "./ui/inspection"
import {
    GameIcon
} from "./ui/GameIcon"
import {
    CardFace, artInfo
} from "./anim/CardFace"
import "./ui/viktor-dialog.css"
import {
    ArtFrame
} from "./ui/ArtFrame"

type Card = cg.Card
type PlayArgs = cg.PlayArgs

let lang: "vi" | "en" = "vi"
try { lang = localStorage.getItem("lang") === "en" ? "en" : "vi" } catch { /* chế độ riêng tư */ }
if (lang === "en") cg.applyCardLocale("en")
const L = (vi: string, en: string) => (lang === "en" ? en : vi)

// Shared printed-card face: exactly the same family as the chain and travelling sprites.
const heroPortrait = (hero: string) => `/heroes-square/${hero}.jpg`
function Framed({ card, name, status }: { card: Card; name: string; status?: string }) {
    return <CardFace card={card} name={name} status={status} />
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
    /** Số đơn vị còn lại tới khi tan băng (card.frozenUntil), nếu engine ghi hạn */
    frozenLeft?: number;
    /** Lá tạm của hiệu ứng tướng: tan biến cuối lượt nếu chưa dùng */
    temp: boolean;
    /** Mana đội mà lá chiêu tiêu; undefined nếu lá không dùng mana. */
    cost?: number;
    /** Quỹ mana hiện có của đội chủ lá. */
    mana: number;
    /** Đội không đủ mana để đánh lá này. */
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
        const mana = g.teamManaOf(unit?.side ?? card.side ?? view.you ?? "A")
        return {
            card, name: info.name, desc: info.desc, type: info.type, typeLabel: L(lbl[0],
                lbl[1]),
            quick: !!def?.quick, chainOnly: !!def?.chainOnly, dead: unit?.status === "dead", reserve: unit?.status === "reserve",
            frozen: !!card.frozen, frozenLeft: card.frozen && card.frozenUntil !== undefined ? Math.max(0,
                card.frozenUntil - view.turnNo) : undefined, temp: !!card.temp, cost, mana, lackMana: cost !== undefined && mana < cost,
            options, chainable: options.some((a) => a.t === "chain"),
        }
    })
}

// ---------------------------------------------------------------- chọn tuỳ chọn trước khi chọn mục tiêu
interface Choice { key: string; label: string; sub?: string; img?: string; dot?: string; options: Action[] }
interface Chooser { title: string; source: string; choices: Choice[] }

const argsOf = (a: Action): PlayArgs => ((a.t === "play" || a.t === "chain" || a.t === "ability") ? a.args ?? {
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
const skillArt = (hero: string, key: string) => `/card_skills/${hero}_${key.toLowerCase()}.png`
const PICK_LABEL: Record<string, [string, string]> = {
    gp_fake: ["Úp làm Thùng giả",
        "Face-down as a fake Keg"],
}

/** Thông báo lá bị đốt khi tay đầy */
interface BurnToast { k: number; text: string }
let burnSeq = 0
/** Tiền tố nguồn chọn mục tiêu của đòn không cần lá của Đấu sĩ */
const QUICK_PREFIX = "quick:"
/** Tiền tố nguồn chọn của nút hành động tướng (HeroDef.abilities): `ability:<unit>:<id>` */
const ABILITY_PREFIX = "ability:"

// ---------------------------------------------------------------- Hand
export function Hand() {
    const s = useCard()
    const incoming = useSyncExternalStore(subscribePending,
        pendingSnapshot)
    const { view, legal, targeting, error } = s
    const [chooser,
        setChooser] = useState<Chooser | null>(null)
    const [steal,
        setSteal] = useState<{ source: string; options: Action[] } | null>(null)
    const [modeDialog,
        setModeDialog] = useState<Extract<Action, { t: "ability" }> | null>(null)
    // bỏ nhiều lá (Viktor Q): tick từng lá thay vì liệt kê mọi tổ hợp
    const [multi,
        setMulti] = useState<{ source: string; options: Action[]; max: number; uids: string[] } | null>(null)
    const [multiSel,
        setMultiSel] = useState<string[]>([])
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
        setSteal(null)
        setModeDialog(null)
        setMulti(null)
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
    const busy = !!chooser || !!targeting || !!multi || !!steal || !!modeDialog || craftOpen
    useEffect(() => {
        if (!busy) return
        const on = (e: KeyboardEvent) => {
            if (e.key !== "Escape") return
            setChooser(null)
            setSteal(null)
            setModeDialog(null)
            setMulti(null)
            setPicked(null)
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
        setMulti(null)
        if (options.some((a) => argsOf(a).pick?.startsWith("steal:"))) {
            setChooser(null)
            setSteal({
                source, options
            })
            return
        }
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
            const max = Math.max(...options.map((a) => argsOf(a).discard?.length ?? 0))
            if (max > 1) {
                setChooser(null)
                setMultiSel([])
                setMulti({
                    source, options, max, uids: [...new Set(options.flatMap((a) => argsOf(a).discard ?? []))]
                })
                return
            }
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
                const [stealTag,
                    stealHero,
                    stealKey] = p.split(":")
                if (stealTag === "steal") {
                    const h = cg.getHero(stealHero), key = stealKey as cg.SkillKey
                    const sk = h?.skills[key], en = h?.en?.skills?.[key]
                    return {
                        label: `${unitName(`${me === "A" ? "B" : "A"}:${stealHero}`)} ${key} · ${(lang === "en" ? en?.name : undefined) ?? sk?.name ?? ""}`,
                        img: skillArt(stealHero,
                            key),
                        sub: (lang === "en" ? en?.desc : undefined) ?? sk?.desc,
                    }
                }
                return {
                    label: p === "" ? L("Đánh lá",
                        "Play card") : named ? L(named[0],
                        named[1]) : cardName(p) ?? p,
                    img: c ? artInfo(c,
                        c.hero ? view.units[`${c.side ?? me}:${c.hero}`] : undefined).srcs[0] : undefined,
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
        if (d.card.id === "basic") {
            setChooser(null)
            setMulti(null)
            cardActions.beginAttack(d.card.uid,
                d.options)
            return
        }
        advance(d.card.uid,
            d.options)
    }

    // ---- hành động toàn cục
    const quickHits = legal.filter((a): a is Extract<Action, { t: "attack" }> => a.t === "attack" && !!a.cardless)
    const upgrades = dedupe(legal.filter((a) => a.t === "upgrade")) as Extract<Action, { t: "upgrade" }>[]
    // bỏ bài xuống mộ (miễn phí): chỉ khi engine cho phép lá đang chọn (lá đóng băng vẫn bỏ được)
    const discardAct = picked ? legal.find((a): a is Extract<Action, { t: "discard" }> => a.t === "discard" && a.uid === picked) : undefined
    const pickedCard = discardAct ? hand.find((c) => c.uid === discardAct.uid) : undefined
    const foeHand = view.players[me === "A" ? "B" : "A"].hand
    const quickers = [...new Set(quickHits.map((a) => a.actor))]
    // nút hành động của tướng (HeroDef.abilities): gom theo (tướng, nút); nhiều lựa chọn thì chọn mục tiêu / lá ở bước sau
    const abilityBtns = (() => {
        const groups = new Map<string, Extract<Action, { t: "ability" }>[]>()
        for (const a of legal) {
            if (a.t !== "ability" || a.side !== me) continue
            const k = `${a.unit}:${a.id}`
            groups.set(k,
                [...(groups.get(k) ?? []),
                    a])
        }
        return [...groups.entries()].map(([k,
            options]) => {
            const u = view.units[options[0].unit]
            const def = u ? cg.getHero(u.hero)?.abilities?.find((x) => x.id === options[0].id) : undefined
            return {
                key: k, unit: options[0].unit, options, hero: u?.hero ?? "",
                name: def ? L(def.name,
                    def.nameEn) : options[0].id,
                desc: def ? L(def.desc,
                    def.descEn) : "",
            }
        })
    })()
    const cardlessPct = Math.round((view.rules.fighterCardlessMult ?? .66) * 100)
    const { used: atkUsed } = attacksOf(view,
        me)
    // bước gọi tướng đầu lượt: nút lớn là "Rút bài" (gọi xong hoặc bỏ qua thì rút), sau đó mới là "Kết thúc lượt"
    const drawAct = legal.find((a) => (a.t as string) === "draw")
    // gọi tướng úp (phase "blind"): cả hai bên cùng chọn, nút lớn là "Chốt" rồi chờ đối thủ
    const blind = view.phase === "blind" ? view.blind : undefined
    const readyAct = legal.find((a) => a.t === "ready")
    const iReady = !!blind?.ready[me]
    const endAct = legal.find((a) => a.t === "end") ?? drawAct ?? readyAct
    const canEnd = !!endAct
    // nút chuyển bước tách khỏi nút kết thúc lượt (law.md "Trình tự lượt")
    const stepAct = legal.find((a) => a.t === "step")
    const stepLabel = view.step === "standby" ? L("Vào Main 1",
        "To Main 1") : view.step === "main1" ? L("Vào Battle",
        "To Battle") : L("Sang Main 2",
        "To Main 2")
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
    // Cùng mục tiêu nhưng khác mức chi (Nami E 20/30 mana, Lux R 20..bể, Teemo R số Nấm): hiện nút chọn mức
    const levels = targeting && targeting.options.length > 1 && !confirms.length
        && targeting.options.every((a) => argsOf(a).manaSpent !== undefined || argsOf(a).amount !== undefined)
        && new Set(targeting.options.map((a) => JSON.stringify(targetsOf(a)))).size === 1
        ? [...targeting.options].sort((a, b) => (argsOf(a).manaSpent ?? argsOf(a).amount ?? 0) - (argsOf(b).manaSpent ?? argsOf(b).amount ?? 0)) : []
    const srcId = src ? src.replace(QUICK_PREFIX,
        "") : ""
    const srcName = src?.startsWith(ABILITY_PREFIX) ? (abilityBtns.find((b) => ABILITY_PREFIX + b.key === src)?.name ?? "") : src ? (cardName(srcId) ?? (view.units[srcId] ? unitName(srcId) : (cg.getHero(srcId)?.name ?? ""))) : ""

    /** Hộp tuỳ chọn nổi (fixed) neo phía trên lá đang chọn; không nằm trong luồng của thanh nên không đẩy tay bài */
    const popStyle = (uid: string | null | undefined): CSSProperties => {
        const el = uid ? document.querySelector(`[data-hand-uid="${CSS.escape(uid)}"]`) : null
        const r = (el ?? document.querySelector(".cg-hand .hd-fan"))?.getBoundingClientRect()
        if (!r) return {
            left: 16, bottom: 220
        }
        const W = 360
        const anchor = viewportToCanvasPoint({
            x: r.left + r.width / 2, y: r.top
        })
        const staged = !!document.querySelector(".game-canvas-stage")
        const cx = anchor.x
        const left = Math.max(8,
            Math.min(cx - W / 2,
                (staged ? GAME_CANVAS_WIDTH : window.innerWidth) - W - 8))
        return {
            left, bottom: Math.max(8,
                (staged ? GAME_CANVAS_HEIGHT : window.innerHeight) - anchor.y + (el ? 22 : 8))
        }
    }

    return (
        <section className={`cg-hand${myMove ? " mine" : ""}${chain ? " chain" : ""}`}>
            {s.presenting ? <div className="hd-queue-status" role="status">{L("Đang giải quyết hành động…",
                "Resolving action…")}</div> : null}
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
                    <b>{targeting.step === "actor" ? L("1 · Chọn tướng mình đánh",
                        "1 · Choose your attacker") : targeting.step === "target" ? L("2 · Chọn mục tiêu địch",
                        "2 · Choose the enemy target") : L("Chọn mục tiêu…",
                        "Choose a target…")}</b>
                    {srcName ? <span>{srcName}</span> : null}
                    {targeting.step === "target" ? <button className="hd-cancel" onClick={() => cardActions.beginAttack(targeting.source,
                        targeting.attackOptions ?? targeting.options)}>Chọn lại tướng</button> : null}
                    {levels.map((a, i) => (
                        <button key={`lv${i}`} className="hd-chip" onClick={() => cardActions.act(a)}>
                            {argsOf(a).manaSpent !== undefined ? L(`Chi ${argsOf(a).manaSpent} mana`,
                                `Spend ${argsOf(a).manaSpent} mana`) : L(`Số lượng: ${argsOf(a).amount}`,
                                `Amount: ${argsOf(a).amount}`)}
                        </button>
                    ))}
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
            {multi ? (() => {
                const sigs = (uids: string[]) => uids.map(sigOfUid).sort().join("+")
                const match = multi.options.filter((a) => sigs(argsOf(a).discard ?? []) === sigs(multiSel))
                const origin = cardOfUid(multi.source)
                return <ActionDialog className="discard-dialog" title={origin?.id === "viktor_q" ? "Viktor Q · Tháo Rời" : "Chọn lá bỏ"} subtitle={`Chọn tối đa ${multi.max} lá khác trên tay. Có thể bỏ 0 lá; chọn xong sẽ chọn mục tiêu.`} onClose={() => { setMulti(null); setPicked(null); cardActions.cancelTargeting() }} footer={<>
                    <ArtFrame kind="name" width={360} height={80} className="discard-counter-plaque"><b className="discard-counter" aria-live="polite"><span>Đã chọn {multiSel.length}/{multi.max} lá</span><span className="discard-counter-gems" aria-hidden="true">{Array.from({
                        length: multi.max
                    },
                    (_, i) => <i key={i} className={i < multiSel.length ? "filled" : ""} />)}</span></b></ArtFrame>
                    <button className="action-secondary" onClick={() => setMultiSel([])}>Bỏ chọn tất cả</button>
                    <button className="action-primary" disabled={!match.length} onClick={() => { setPicked(null); advance(multi.source,
                        match) }}>Xác nhận bỏ {multiSel.length} lá</button>
                </>}><div className="discard-workbench"><aside className="discard-caster" aria-label="Tướng dùng chiêu"><ArtFrame kind="icon" width={250} height={250} image={`/heroes-square/${origin?.hero ?? "viktor"}.jpg`} className="discard-caster-frame" /><ArtFrame kind="name" width={250} height={62} className="discard-caster-caption"><b>{origin?.hero ? cg.getHero(origin.hero)?.name : "Viktor"}</b></ArtFrame></aside><section className="discard-hand"><div className="discard-selection-rule"><GameIcon name="cards" /><span>{multiSel.length >= multi.max ? "Đã đủ số lá. Bỏ chọn một lá để đổi lựa chọn." : `Chọn tối đa ${multi.max} lá · Bấm lại để giữ lá.`}</span></div><div className="action-discard-grid" aria-label="Các lá có thể bỏ">{multi.uids.map((uid) => {
                        const on = multiSel.includes(uid), card = cardOfUid(uid)
                        return <button key={uid} className={`action-option${on ? " selected" : ""}`} aria-pressed={on} disabled={!on && multiSel.length >= multi.max} onClick={() => setMultiSel(on ? multiSel.filter((x) => x !== uid) : [...multiSel,
                            uid])}>
                            <div className="discard-choice-frame">{card ? <CardFace card={card} name={cardName(uid) ?? uid} /> : null}</div><span className="action-check" aria-hidden="true">{on ? "✓" : "+"}</span><span className="discard-card-state">{on ? "Đã chọn bỏ" : "Giữ trên tay"}</span>
                        </button>
                    })}</div></section></div></ActionDialog>
            })() : null}
            {steal ? <SylasStealDialog view={view} source={steal.source} options={steal.options} onClose={() => { setSteal(null); setPicked(null); cardActions.cancelTargeting() }} onConfirm={(a) => { setSteal(null); setPicked(null); cardActions.act(a) }} /> : null}
            {modeDialog && view.units[modeDialog.unit] ? (() => {
                const unit = view.units[modeDialog.unit]
                const current = unit.hero === "jinx" ? (unit.stacks.jinx_gun ? "rocket" : "minigun") : (unit.stacks.jayce_form ? "cannon" : "hammer")
                return <ChampionModeDialog unit={unit} modes={unit.hero === "jinx" ? ["minigun",
                    "rocket"] : ["hammer",
                    "cannon"]} standby currentMode={current} onClose={() => setModeDialog(null)} onConfirm={(mode) => {
                    setModeDialog(null)
                    if (mode !== current) cardActions.act(modeDialog)
                }} />
            })() : null}
            {chooser || (!multi && !steal && !modeDialog && discardAct && pickedCard && !targeting) ? (
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
                        "Hand")} {hand.filter((c) => !c.temp && !incoming.has(c.uid)).length}/{handMax}
                    {hand.some((c) => c.temp && !incoming.has(c.uid)) ? <i className="hd-tmpcount"> (+{hand.filter((c) => c.temp && !incoming.has(c.uid)).length} {L("tạm",
                        "temp")})</i> : null}</b>
                    <span>{L("Bộ bài",
                        "Deck")} {view.players[me].deckCount}</span>
                    <span className="hd-atk"
                        title={L("Đánh thường mỗi lượt: lá Đánh thường và đòn không cần lá của Đấu sĩ.",
                            "Basic attacks per turn: Basic Attack cards and the Fighter's cardless attack.")}>
                        {L("Đánh",
                            "Attacks")} {atkUsed}
                    </span>
                    {chain && view.chain?.priority === me ? <em>{L("Bạn có quyền nối chuỗi",
                        "You may chain")}</em> : null}
                </div>
                <div className="hd-fan">
                    {data.map((d) => <HandCard key={d.card.uid} d={d} chain={chain} selected={src === d.card.uid} onClick={() => onCard(d)} />)}
                </div>
            </div>

            <div className="hd-actions">
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
                {abilityBtns.length ? (
                    <div className="hd-group">
                        <label>{L("Nút hành động của tướng",
                            "Champion ability")}</label>
                        <div className="hd-row">
                            {abilityBtns.map((b) => (
                                <button key={b.key} className={`hd-quick hd-ability${src === ABILITY_PREFIX + b.key ? " sel" : ""}`} title={b.desc}
                                    onClick={() => {
                                        cardActions.cancelTargeting()
                                        const action = b.options[0]
                                        if (action.id === "jinx_swap" || action.id === "jayce_swap") {
                                            setPicked(null)
                                            setModeDialog(action)
                                        } else advance(ABILITY_PREFIX + b.key,
                                            b.options)
                                    }}>
                                    {b.hero === "jinx" || b.hero === "jayce" ? <ForestIcon name="standby" /> : <img src={b.hero ? heroPortrait(b.hero) : ""} alt="" />}
                                    <span><b>{b.name}</b><i>{unitName(b.unit)}</i></span>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : null}
                <div className="hd-mode-locks">{Object.values(view.units).filter((u) => u.side === me && u.status === "board" && (u.hero === "jayce" || u.hero === "jinx") && !abilityBtns.some((b) => b.unit === u.id)).map((u) => <div className="hd-mode-lock" key={u.id}><ForestIcon name="lock" /><span>{unitName(u.id)} · {view.step === "standby" ? "Đã đổi hoặc không thể hành động" : "Chỉ đổi ở Standby"}</span></div>)}</div>
                {quickers.length ? (
                    <div className="hd-group">
                        <label>{L("Đánh không cần lá · lượt của bạn",
                            "Cardless attack · your turn")}</label>
                        <div className="hd-row">
                            {quickers.map((u) => (
                                <button key={u} className={`hd-quick${src === QUICK_PREFIX + u ? " sel" : ""}`} title={`${unitName(u)} · ${L("Đánh không cần lá",
                                    "Cardless attack")} ${cardlessPct}%`}
                                onClick={() => { cardActions.cancelTargeting(); cardActions.beginAttack(QUICK_PREFIX + u,
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
                <div className="hd-bottom">
                    <button className="hd-btn" disabled={!data.some((d) => d.card.id === "basic" && d.options.length) && !quickHits.length} onClick={() => {
                        const basic = data.find((d) => d.card.id === "basic" && d.options.length)
                        setChooser(null); setMulti(null); setSteal(null); setPicked(null)
                        cardActions.beginAttack(basic?.card.uid ?? "attack",
                            basic?.options ?? quickHits)
                    }}><GameIcon name="sword" /><span>{L("Đánh",
                            "Attack")}</span></button>
                    <button className="hd-btn blue" onClick={() => setCraftOpen(true)}><GameIcon name="anvil" /><span>{L("Ghép đồ",
                        "Craft")}</span></button>
                    {stepAct ? <button className="hd-step" onClick={() => cardActions.act(stepAct)}><GameIcon name="arrow" /><span>{stepLabel}</span></button> : null}
                    <button className="hd-end" disabled={!canEnd} onClick={() => endAct && cardActions.act(endAct)}><GameIcon name="arrow" /><span>{endLabel}</span></button>
                </div>
            </div>

            {craftOpen ? <CraftDialog onClose={() => setCraftOpen(false)} /> : null}
        </section>
    )
}

// ---------------------------------------------------------------- một lá trên tay
function HandCard({ d, chain, selected, onClick }: { d: CardData; chain: boolean; selected: boolean; onClick: () => void }) {
    const inspectCard = () => inspectionActions.card(d.card,
        {
            source: chain && d.chainable ? "reaction" : "hand"
        })
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
            <div className={cls.filter(Boolean).join(" ")} onMouseEnter={inspectCard} onFocus={inspectCard} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick() } }} onClick={() => { inspectCard(); onClick() }} role="button" aria-disabled={!playable}>
                <Framed card={d.card} name={d.name} status={d.dead ? L("Đã bị hạ",
                    "Fallen") : d.reserve ? L("Chưa gọi",
                    "Not summoned") : undefined} />
                {tag ? <span className="hd-q hd-qtag">{tag}</span> : null}
                {d.cost !== undefined ? <span className={`hd-gem${d.lackMana ? " lack" : ""}`} title={L(`Tốn ${d.cost} mana đội · đang có ${d.mana}`,
                    `Costs ${d.cost} team mana · ${d.mana} available`)}>{d.cost}</span> : null}
                {d.lackMana && d.cost !== undefined ? <span className="hd-mana-shortfall">{L(`Thiếu ${Math.max(0,
                    d.cost - d.mana)} mana`,
                `Need ${Math.max(0,
                    d.cost - d.mana)} mana`)}</span> : null}
                {d.frozen ? <div className="hd-ice"><span>{L("Bị Hoá Băng",
                    "Frozen")}{d.frozenLeft !== undefined ? ` · ${d.frozenLeft}` : ""}</span></div> : null}
                {d.temp ? <span className="hd-tmp">{L("Tạm",
                    "Temp")}</span> : null}
            </div>

        </div>
    )
}
