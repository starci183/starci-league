// Hộp "Ghép đồ": bảng công thức 8x8 + chỉ ô ghép được ngay từ tay bài. Ghép xong lá đồ huyền thoại về TAY (đeo sau bằng cách đánh lá đó).
import {
    useEffect, useId, useMemo, useRef, useState
} from "react"
import {
    cg
} from "@starci/shared"
import {
    cardActions, useCard
} from "../store"
import "./craft.css"

type CraftAction = Extract<cg.Action, { t: "craft" }>

let lang: "vi" | "en" = "vi"
try { lang = localStorage.getItem("lang") === "en" ? "en" : "vi" } catch { /* chế độ riêng tư */ }
const L = (vi: string, en: string) => (lang === "en" ? en : vi)

const COMPS: readonly string[] = cg.COMPONENTS

function Icon({ id }: { id: string }) {
    return (
        <img
            src={`/card_items/${id}.png`}
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
    const titleId = useId()
    const dialog = useRef<HTMLDivElement>(null)
    const close = useRef(onClose)
    close.current = onClose
    useEffect(() => {
        const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
        dialog.current?.querySelector<HTMLButtonElement>("button")?.focus()
        const key = (e: KeyboardEvent) => {
            if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close.current(); return }
            if (e.key !== "Tab") return
            const targets = [...(dialog.current?.querySelectorAll<HTMLElement>("button:not([disabled]), input, select, [tabindex=\"0\"]") ?? [])]
            const first = targets[0], last = targets[targets.length - 1]
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
        }
        window.addEventListener("keydown",
            key,
            true)
        return () => { window.removeEventListener("keydown",
            key,
            true); previous?.focus() }
    },
    [])
    const [pick,
        setPick] = useState<CraftAction[] | null>(null)
    const [hover,
        setHover] = useState<string | null>(null)
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

    const click = (list: CraftAction[]) => {
        const withUnit = list.filter((a) => a.unit)
        if (withUnit.length) {
            setPick(withUnit)
            return
        }
        cardActions.act(list[0])
        onClose()
    }

    // chữ món theo bảng đồ chế độ thẻ V2 (cg.CARD_ITEMS)
    const hv = hover ? cg.itemText(hover,
        lang) : undefined

    return (
        <div className="cd-modal" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
            <div className="cd-dialog" ref={dialog} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={`${titleId}-rule`}>
                <div className="cd-head">
                    <h3 id={titleId}>{L("Ghép đồ",
                        "Craft")}</h3>
                    <span id={`${titleId}-rule`} className="cd-rule">{L("2 mảnh + 1 Vàng từ tay thành 1 đồ huyền thoại về tay",
                        "2 components + 1 Gold from hand make 1 legendary item card in hand")}</span>
                    <button type="button" className="cd-x" onClick={onClose} aria-label={L("Đóng ghép đồ",
                        "Close crafting")}>×</button>
                </div>
                <div className="cd-have">
                    <span className="cd-chip gold">
                        <img src="/ui/coin.png" alt="" />
                        <b>{counts.gold}</b>
                    </span>
                    {COMPS.map((c) => (
                        <span key={c} className={`cd-chip${counts.m.get(c) ? " on" : ""}`} title={nameOf(c)}>
                            <Icon id={c} />
                            <b>{counts.m.get(c) ?? 0}</b>
                        </span>
                    ))}
                </div>
                {hint ? <div className="cd-hint">{hint}</div> : null}
                <div className="cd-body">
                    <table className="cd-table" aria-label={L("Bảng công thức ghép trang bị",
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
                                        const cls = `cd-cell${list ? " ok" : ""}${ri === ci ? " diag" : ""}${ci < ri ? " cd-mirror" : ""}`
                                        return (
                                            <td
                                                key={c}
                                                className={cls}
                                                role="button"
                                                tabIndex={list || (!crafts.length && ri === 0 && ci === 0) ? 0 : -1}
                                                aria-disabled={!list}
                                                aria-label={`${nameOf(r)} + ${nameOf(c)}: ${res ? nameOf(res) : ""}${list ? "" : ` · ${hint || L("Chưa đủ nguyên liệu",
                                                    "Missing components")}`}`}
                                                onFocus={() => setHover(res ?? null)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (list) click(list); return }
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
                                                onMouseLeave={() => setHover(null)}
                                                onClick={() => (list ? click(list) : undefined)}
                                            >
                                                {res ? <Icon id={res} /> : null}
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="cd-info" aria-live="polite">
                        {hv ? (
                            <>
                                <b>{hv.name}</b>
                                {hv.stats ? <div className="cd-stats">{hv.stats}</div> : null}
                                {hv.passive ? (
                                    <div className="cd-pas">
                                        <i>{hv.passive}</i>
                                        {" "}
                                        {hv.desc}
                                    </div>
                                ) : null}
                            </>
                        ) : (
                            <span className="cd-mute">{L("Rê chuột hoặc dùng phím mũi tên để xem đồ. Ô sáng = ghép được ngay.",
                                "Hover or use arrow keys for details. Bright cells can be crafted now.")}</span>
                        )}
                    </div>
                </div>
                {pick ? (
                    <div className="cd-pick">
                        <span>{L("Chọn tướng nhận:",
                            "Choose a hero:")}</span>
                        {pick.map((a) => (
                            <button
                                key={a.unit}
                                className="cd-hero"
                                onClick={() => {
                                    cardActions.act(a)
                                    onClose()
                                }}
                            >
                                {a.unit ? unitName(a.unit) : ""}
                            </button>
                        ))}
                    </div>
                ) : null}
            </div>
        </div>
    )
}
