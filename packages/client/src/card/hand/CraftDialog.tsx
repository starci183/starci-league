// Hộp "Ghép đồ": bảng công thức 8x8 + chỉ ô ghép được ngay từ tay bài. Ghép xong lá đồ huyền thoại về TAY (đeo sau bằng cách đánh lá đó).
import {
    useEffect, useMemo, useRef, useState
} from "react"
import {
    cg
} from "@starci/shared"
import {
    cardActions, useCard
} from "../store"
import {
    ActionDialog
} from "../ui/ActionDialog"
import {
    GameIcon
} from "../ui/GameIcon"
import {
    ScrollArea
} from "../ui/ScrollArea"
import {
    ForestIcon
} from "../ui/ForestIcon"
import {
    ArtFrame
} from "../ui/ArtFrame"
import "./craft.css"

type CraftAction = Extract<cg.Action, { t: "craft" }>

let lang: "vi" | "en" = "vi"
try { lang = localStorage.getItem("lang") === "en" ? "en" : "vi" } catch { /* chế độ riêng tư */ }
const L = (vi: string, en: string) => (lang === "en" ? en : vi)

const COMPS: readonly string[] = cg.COMPONENTS

function Icon({ id }: { id: string }) {
    return (
        <img
            src={id === "gold" ? "/card_support/gold.png" : `/card_items/${id}.png`}
            alt=""
            onError={(e) => {
                const el = e.currentTarget
                if (!el.dataset.fb) {
                    el.dataset.fb = "1"
                    el.src = `/items/${id}.png`
                }
            }}
        />
    )
}

const nameOf = (id: string) => cg.itemText(id,
    lang)?.name ?? id

export function CraftDialog({ onClose }: { onClose: () => void }) {
    const { view, legal } = useCard()
    const [pick,
        setPick] = useState<CraftAction[] | null>(null)
    const [recipe,
        setRecipe] = useState<string | null>(null)
    const submitted = useRef(false)
    const [hover,
        setHover] = useState<string | null>(null)
    const [showMatrix,
        setShowMatrix] = useState(false)
    const me = view?.you ?? null
    const hand = useMemo(() => (view && me ? view.players[me].hand ?? [] : []),
        [view,
            me])
    const crafts = useMemo(() => legal.filter((a): a is CraftAction => a.t === "craft"),
        [legal])
    const counts = useMemo(() => {
        const m = new Map<string, number>()
        let gold = 0
        for (const c of hand) {
            if (c.kind !== "support") continue
            if (c.id === "gold") gold++
            else if (c.id === "item" && c.item) m.set(c.item,
                (m.get(c.item) ?? 0) + 1)
        }
        return {
            m, gold
        }
    },
    [hand])
    // uid -> id mảnh, để đối chiếu hành động hợp lệ với ô bảng
    const compOf = useMemo(() => {
        const m = new Map<string, string>()
        for (const c of hand) if (c.id === "item" && c.item) m.set(c.uid,
            c.item)
        return m
    },
    [hand])
    const byCell = useMemo(() => {
        const m = new Map<string, CraftAction[]>()
        for (const a of crafts) {
            const x = compOf.get(a.items[0])
            const y = compOf.get(a.items[1])
            if (!x || !y) continue
            const k = [x,
                y].sort().join("|")
            m.set(k,
                [...(m.get(k) ?? []),
                    a])
        }
        return m
    },
    [crafts,
        compOf])

    useEffect(() => {
        setPick(null)
        setRecipe(null)
        submitted.current = false
    },
    [legal])

    const unitName = (id: string) => {
        const u = view?.units[id]
        return u ? (u.token?.name ?? cg.getHero(u.hero)?.name ?? u.hero) : id
    }

    let hint = ""
    if (!crafts.length) {
        const total = [...counts.m.values()].reduce((s,
            n) => s + n,
        0)
        if (!view || view.toMove !== me) hint = L("Chưa tới lượt bạn.",
            "It is not your turn.")
        else if (counts.gold < 1) hint = L("Thiếu Vàng: cần 1 lá Vàng trên tay.",
            "Missing Gold: you need 1 Gold card in hand.")
        else if (total < 2) hint = L("Cần 2 mảnh đồ trên tay.",
            "You need 2 item components in hand.")
        else hint = L("Hiện chưa ghép được.",
            "Cannot craft right now.")
    }

    const click = (list: CraftAction[], result: string | undefined) => {
        setRecipe(result ?? null)
        const withUnit = list.filter((a) => a.unit)
        if (withUnit.length) {
            setPick(withUnit)
            return
        }
        setPick(list)
    }
    const confirm = (action: CraftAction) => {
        if (submitted.current || !crafts.includes(action)) return
        submitted.current = true
        cardActions.act(action)
        onClose()
    }

    const recipes = COMPS.flatMap((a, index) => COMPS.slice(index).flatMap(b => {
        const result = cg.cardCombine(a,
            b)
        return result ? [{
            a, b, result, legal: byCell.get([a,
                b].sort().join("|")) ?? []
        }] : []
    }))
    const shown = recipe ?? hover
    const hv = shown ? cg.itemText(shown,
        lang) : undefined
    const preview = recipes.find(r => r.result === shown)
    const sources = pick?.[0] ? pick[0].items.map(uid => compOf.get(uid)) : preview ? [preview.a,
        preview.b] : []

    return (
        <ActionDialog className="craft-dialog" title={L("Lò rèn · Ghép trang bị",
            "Forge · Craft equipment")} subtitle={L("2 mảnh + 1 Vàng từ tay → 1 đồ huyền thoại về tay",
            "2 components + 1 Gold from hand → 1 legendary item in hand")} onClose={onClose} footer={<>
            <span className="cd-footer-copy" role="status">{recipe ? <><b>{L("Đang chọn: ",
                "Selected: ")}{nameOf(recipe)}</b><span>{L("Tiêu 2 mảnh + 1 Vàng khi xác nhận.",
                "Consumes 2 components + 1 Gold on confirmation.")}</span></> : L("Chọn công thức, kiểm tra trang bị rồi xác nhận.",
                "Choose a recipe, inspect the item, then confirm.")}</span>
            {pick?.some(a => a.unit) ? <div className="cd-pick"><span>{L("Chọn tướng nhận:",
                "Choose a hero:")}</span>{pick.map(a => <button className="action-primary" key={a.unit} onClick={() => confirm(a)}><GameIcon name="anvil" />{a.unit ? unitName(a.unit) : ""}</button>)}</div> : <button className="action-primary" disabled={!pick?.length} onClick={() => { if (pick?.[0]) confirm(pick[0]) }}><GameIcon name="anvil" />{L("Xác nhận ghép",
                "Confirm crafting")}</button>}
        </>}>
            <div className="cd-have" aria-label={L("Nguyên liệu trên tay",
                "Components in hand")}>
                <span className="cd-chip gold" aria-label={`${L("Vàng",
                    "Gold")}: ${counts.gold}`}><ArtFrame kind="icon" width={66} height={66} fill={<Icon id="gold" />}><b className="cd-count">{counts.gold}</b></ArtFrame></span>
                {COMPS.map((c) => (
                    <span key={c} className={`cd-chip${counts.m.get(c) ? " on" : ""}`} title={nameOf(c)} aria-label={`${nameOf(c)}: ${counts.m.get(c) ?? 0}`}>
                        <ArtFrame kind="icon" width={66} height={66} fill={<Icon id={c} />}><b className="cd-count">{counts.m.get(c) ?? 0}</b></ArtFrame>
                    </span>
                ))}
            </div>
            {hint ? <ArtFrame kind="meter" width={1160} height={56} className="cd-hint" label={hint}><GameIcon name="anvil" /><span>{hint}</span></ArtFrame> : null}
            <div className={`cd-workbench${recipe ? " has-recipe" : ""}`}>
                <section className="cd-circle" aria-label={L("Nguyên liệu công thức",
                    "Recipe components")}>
                    <div className="cd-rune" aria-hidden="true"><GameIcon name="anvil" /></div>
                    {[0,
                        1].map(index => <div className={`cd-socket socket-${index}${sources[index] ? " filled" : ""}`} key={index}>
                        <ArtFrame kind="icon" width={88} height={88} fill={sources[index] ? <Icon id={sources[index]!} /> : undefined}>{!sources[index] ? <GameIcon name="anvil" /> : null}</ArtFrame>
                        <ArtFrame kind="name" width={190} height={44}><b>{sources[index] ? nameOf(sources[index]!) : L("Mảnh đồ",
                            "Component")}</b></ArtFrame>
                        {recipe ? <ArtFrame kind="icon" width={32} height={32} className="cd-ready-seal"><span>✓</span></ArtFrame> : null}
                    </div>)}
                    <div className={`cd-socket socket-gold${counts.gold ? " filled" : ""}`}><ArtFrame kind="icon" width={88} height={88} fill={<Icon id="gold" />} /><ArtFrame kind="name" width={190} height={44}><b>{L("Vàng ×1",
                        "Gold ×1")}</b></ArtFrame>{recipe ? <ArtFrame kind="icon" width={32} height={32} className="cd-ready-seal"><span>✓</span></ArtFrame> : null}</div>
                </section>
                <GameIcon name="arrow" />
                <section className="cd-result" aria-label={L("Trang bị nhận về tay",
                    "Equipment received in hand")} aria-live="polite">
                    <div className={`cd-result-art${recipe ? " ready" : ""}`}><ArtFrame kind="icon" width={220} height={220} fill={shown ? <Icon id={shown} /> : undefined}>{!shown ? <GameIcon name="anvil" /> : null}</ArtFrame><ArtFrame kind="name" width={260} height={60}><b>{hv?.name ?? L("Trang bị",
                        "Equipment")}</b></ArtFrame></div>
                    <div className="cd-info"><h4>{recipe ? L("Đang chọn công thức",
                        "Selected recipe") : L("Chi tiết trang bị",
                        "Equipment details")}</h4>
                    {hv ? <><b>{hv.name}</b>{hv.stats ? <div className="cd-stats">{hv.stats}</div> : null}{hv.passive ? <div className="cd-pas"><i>{hv.passive}</i> {hv.desc}</div> : null}</> : <span className="cd-mute">{L("Chọn công thức sáng bên dưới để xem trước.",
                        "Choose a glowing recipe below to preview.")}</span>}
                    <ArtFrame kind="name" width={330} height={68} className="cd-circle-rule"><span>{L("2 mảnh + 1 Vàng",
                        "2 components + 1 Gold")}</span></ArtFrame>
                    <span className="cd-output-note"><GameIcon name="cards" />{L("Trang bị nhận về tay",
                        "Equipment received in hand")}</span>
                    </div>
                </section>
            </div>
            <div className="cd-recipes-heading"><h4>{L("Công thức trang bị",
                "Equipment recipes")}</h4><button type="button" className="cd-matrix-toggle" onClick={() => setShowMatrix(!showMatrix)} aria-expanded={showMatrix}><ArtFrame kind="name" width={220} height={54}>{showMatrix ? L("Xem thẻ công thức",
                "Recipe cards") : L("Bảng 8 × 8",
                "8 × 8 matrix")}</ArtFrame></button></div>
            {!showMatrix ? <ScrollArea className="cd-gallery" label={L("Cuộn công thức trang bị",
                "Scroll equipment recipes")}><div className="cd-recipe-cards">{recipes.map(r => <button type="button" data-craft-recipe={r.result} key={r.result} className={`cd-recipe-card${r.legal.length ? " available" : " unavailable"}${recipe === r.result ? " selected" : ""}`} aria-label={`${nameOf(r.result)} · ${nameOf(r.a)} + ${nameOf(r.b)}${r.legal.length ? "" : ` · ${L("Chưa đủ nguyên liệu",
                    "Missing components")}`}`} aria-pressed={recipe === r.result} aria-disabled={!r.legal.length} onKeyDown={(e) => {
                    const moves: Record<string,number> = {
                        ArrowLeft:-1, ArrowRight:1, ArrowUp:-7, ArrowDown:7
                    }
                    const nodes = e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("button[data-craft-recipe]")
                    if (!nodes) return
                    const index = [...nodes].indexOf(e.currentTarget)
                    const next = e.key === "Home" ? 0 : e.key === "End" ? nodes.length - 1 : e.key in moves ? Math.max(0,
                        Math.min(nodes.length-1,
                            index+moves[e.key])) : undefined
                    if (next !== undefined) { e.preventDefault(); nodes[next]?.focus() }
                }} onFocus={() => { if (!recipe) setHover(r.result) }} onMouseEnter={() => { if (!recipe) setHover(r.result) }} onClick={() => { setHover(r.result); if (r.legal.length) click(r.legal,
                    r.result); else { setPick(null); setRecipe(null) } }}><ArtFrame kind="icon" width={92} height={92} fill={<Icon id={r.result} />} /><ArtFrame kind="name" width={180} height={44}><b>{nameOf(r.result)}</b></ArtFrame>{!r.legal.length ? <ArtFrame kind="icon" width={34} height={34} className="cd-recipe-lock"><ForestIcon name="lock" /></ArtFrame> : null}</button>)}</div></ScrollArea> : <div className="cd-body"><table className="cd-table" aria-label={L("Bảng công thức ghép trang bị",
                "Equipment recipes")}>
                <thead>
                    <tr>
                        <th />
                        {COMPS.map((c) => (
                            <th key={c} scope="col" title={nameOf(c)}>
                                <Icon id={c} />
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {COMPS.map((r,
                        ri) => (
                        <tr key={r}>
                            <th scope="row" title={nameOf(r)}>
                                <Icon id={r} />
                            </th>
                            {COMPS.map((c,
                                ci) => {
                                const res = cg.cardCombine(r,
                                    c)
                                const list = byCell.get([r,
                                    c].sort().join("|"))
                                const cls = `cd-cell${list ? " ok" : ""}${recipe === res && list?.some(a => pick?.includes(a)) ? " selected" : ""}${ri === ci ? " diag" : ""}${ci < ri ? " cd-mirror" : ""}`
                                return (
                                    <td
                                        key={c}
                                        className={cls}
                                        role="button"
                                        tabIndex={list || (!crafts.length && ri === 0 && ci === 0) ? 0 : -1}
                                        aria-disabled={!list}
                                        aria-pressed={!!list?.some(a => pick?.includes(a))}
                                        aria-label={`${nameOf(r)} + ${nameOf(c)}: ${res ? nameOf(res) : ""}${list ? "" : ` · ${hint || L("Chưa đủ nguyên liệu",
                                            "Missing components")}`}`}
                                        onFocus={() => setHover(res ?? null)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (list) click(list,
                                                res); return }
                                            const move: Record<string, number> = {
                                                ArrowLeft: -1, ArrowRight: 1, ArrowUp: -COMPS.length, ArrowDown: COMPS.length
                                            }
                                            if (!(e.key in move)) return
                                            e.preventDefault()
                                            const cells = e.currentTarget.closest("table")?.querySelectorAll<HTMLElement>("td.cd-cell")
                                            const next = ri * COMPS.length + ci + move[e.key]
                                            if (cells && next >= 0 && next < cells.length) cells[next].focus()
                                        }}
                                        onMouseEnter={() => setHover(res ?? null)}
                                        onClick={() => { if (list) { setHover(res ?? null); click(list,
                                            res) } }}
                                    >
                                        {res ? <ArtFrame kind="icon" width={66} height={66} fill={<Icon id={res} />} /> : null}
                                    </td>
                                )
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
            </div>}
        </ActionDialog>
    )
}
