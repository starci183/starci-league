// Màn ngoài bàn của chế độ thẻ bài: chờ đối thủ, chọn tướng (draft), kết thúc trận.
import {
    useEffect, useState
} from "react"
import {
    cg
} from "@starci/shared"
import {
    cardActions, useCard, type DraftHero
} from "./store"

const EN = (() => {
    try { return localStorage.getItem("lang") === "en" } catch { return false }
})()

const TXT = {
    vi: {
        waiting: "Đang chờ đối thủ…", waitingSub: "Phòng sẽ tự bắt đầu khi có người vào.", back: "Về sảnh",
        draftTitle: "Chọn đội hình", draftSub: "Chọn {n} tướng. Chọn kín, hai bên có thể trùng tướng.",
        yourTeam: "Đội của bạn", confirm: "Xác nhận đội hình", confirmN: "Chọn đủ {n} tướng",
        clear: "Bỏ chọn hết", sent: "Đã chọn, chờ đối thủ…", sentSub: "Đội hình của bạn đã được gửi.",
        you: "Bạn", foe: "Đối thủ", ready: "Sẵn sàng", choosing: "Đang chọn", timeLeft: "Còn lại",
        hp: "Máu", ad: "Công", armor: "Giáp", mr: "Kháng phép", phys: "Vật lý", magic: "Phép",
        victory: "CHIẾN THẮNG", defeat: "THẤT BẠI", draw: "HÒA", over: "TRẬN ĐẤU KẾT THÚC",
        reason: {
            lives: "Hạ đủ mạng đối thủ", deck: "Đối thủ hết bài trong bộ", left: "Đối thủ đã thoát", resign: "Đối thủ đầu hàng",
            timeout: "Quá thời gian", error: "Lỗi hệ thống",
        } as Record<string, string>,
        reasonYouLose: {
            lives: "Bạn đã mất hết mạng", deck: "Bạn hết bài trong bộ", left: "Bạn đã thoát", resign: "Bạn đã đầu hàng",
            timeout: "Quá thời gian", error: "Lỗi hệ thống",
        } as Record<string, string>,
        round: "Vòng", turn: "Lượt", lives: "Mạng còn lại (bạn - địch)", deck: "Bài còn trong bộ (bạn - địch)",
        roles: {
            fighter: "Đấu sĩ", tank: "Đỡ đòn", assassin: "Sát thủ", marksman: "Xạ thủ", mage: "Pháp sư", support: "Hỗ trợ",
        } as Record<string, string>,
    },
    en: {
        waiting: "Waiting for an opponent…", waitingSub: "The match starts as soon as someone joins.", back: "Back to lobby",
        draftTitle: "Pick your team", draftSub: "Pick {n} champions. Picks are hidden; both sides may pick the same champion.",
        yourTeam: "Your team", confirm: "Confirm team", confirmN: "Pick {n} champions",
        clear: "Clear", sent: "Locked in, waiting for opponent…", sentSub: "Your team has been sent.",
        you: "You", foe: "Opponent", ready: "Ready", choosing: "Choosing", timeLeft: "Time left",
        hp: "HP", ad: "AD", armor: "Armor", mr: "MR", phys: "Physical", magic: "Magic",
        victory: "VICTORY", defeat: "DEFEAT", draw: "DRAW", over: "MATCH OVER",
        reason: {
            lives: "All enemy lives taken", deck: "Opponent ran out of cards", left: "Opponent left", resign: "Opponent resigned",
            timeout: "Timed out", error: "System error",
        } as Record<string, string>,
        reasonYouLose: {
            lives: "You lost all your lives", deck: "You ran out of cards", left: "You left", resign: "You resigned",
            timeout: "Timed out", error: "System error",
        } as Record<string, string>,
        round: "Round", turn: "Turn", lives: "Lives left (you - foe)", deck: "Cards in deck (you - foe)",
        roles: {
            fighter: "Fighter", tank: "Tank", assassin: "Assassin", marksman: "Marksman", mage: "Mage", support: "Support",
        } as Record<string, string>,
    },
}
const L = EN ? TXT.en : TXT.vi
const fmt = (s: string, n: number) => s.replace("{n}",
    String(n))

const heroName = (h: DraftHero) => (EN ? cg.HERO_EN[h.id]?.name : undefined) ?? h.name
const portrait = (id: string) => `/heroes/${id}.jpg`
const hideBroken = (e: { currentTarget: HTMLImageElement }) => { e.currentTarget.style.visibility = "hidden" }

const leave = () => { cardActions.leave(); location.reload() }

function Back() {
    return <button className="sc-btn" onClick={leave}>{L.back}</button>
}

export function WaitingScreen() {
    return (
        <div className="sc-stage">
            <div className="sc-card sc-wait">
                <div className="sc-spinner" />
                <h2>{L.waiting}</h2>
                <p>{L.waitingSub}</p>
                <Back />
            </div>
        </div>
    )
}

function useCountdown(deadlineMs: number, key: unknown): number | null {
    const [end,
        setEnd] = useState(0)
    const [now,
        setNow] = useState(Date.now())
    useEffect(() => {
        setNow(Date.now())
        setEnd(deadlineMs > 0 ? Date.now() + deadlineMs : 0)
    },
    [deadlineMs,
        key])
    useEffect(() => {
        if (!end) return
        const id = window.setInterval(() => setNow(Date.now()),
            250)
        return () => window.clearInterval(id)
    },
    [end])
    return end ? Math.max(0,
        Math.ceil((end - now) / 1000)) : null
}

function HeroTile({ h, order, onClick, disabled }: { h: DraftHero; order: number; onClick: () => void; disabled: boolean }) {
    const on = order > 0
    return (
        <button className={`sc-hero role-${h.role}${on ? " on" : ""}`} onClick={onClick} disabled={disabled && !on}>
            <div className="sc-art">
                <img src={portrait(h.id)} alt="" draggable={false} onError={hideBroken} />
                {on ? <span className="sc-order">{order}</span> : null}
                <span className="sc-role">{L.roles[h.role] ?? h.role}</span>
            </div>
            <b className="sc-name">{heroName(h)}</b>
            <div className="sc-stats">
                <span title={L.hp}><i className="hp" />{h.hp}</span>
                <span title={L.ad}><i className="ad" />{h.atk}</span>
                <span title={L.armor}><i className="ar" />{h.armor}</span>
                <span title={L.mr}><i className="mr" />{h.mr}</span>
            </div>
            <small className={`sc-dmg ${h.damage}`}>{h.damage === "magic" ? L.magic : L.phys}</small>
        </button>
    )
}

export function DraftScreen() {
    const { draft, picked, view } = useCard()
    const [sel,
        setSel] = useState<string[]>([])
    const [sent,
        setSent] = useState(false)
    const secs = useCountdown(draft?.deadlineMs ?? 0,
        draft)
    if (!draft) return <div className="cg-center">…</div>
    const size = draft.size
    const byId = new Map(draft.pool.map((h) => [h.id,
        h]))
    const toggle = (id: string) => {
        if (sent) return
        setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < size ? [...s,
            id] : s))
    }
    const confirm = () => {
        if (sel.length !== size || sent) return
        setSent(true)
        cardActions.pick(sel)
    }
    const me = view?.you ?? "A"
    const foe = me === "A" ? "B" : "A"
    const done = (s: "A" | "B") => !!picked[s]
    return (
        <div className="sc-stage">
            <div className="sc-draft">
                <header className="sc-head">
                    <div>
                        <h1>{L.draftTitle}</h1>
                        <p>{fmt(L.draftSub,
                            size)}</p>
                    </div>
                    <div className="sc-status">
                        <span className={`sc-pill${sent || done(me) ? " ok" : ""}`}>{L.you}: {sent || done(me) ? L.ready : L.choosing}</span>
                        <span className={`sc-pill${done(foe) ? " ok" : ""}`}>{L.foe}: {done(foe) ? L.ready : L.choosing}</span>
                        {secs !== null ? <span className={`sc-timer${secs <= 15 ? " low" : ""}`}>{L.timeLeft} {secs}s</span> : null}
                    </div>
                </header>
                <div className="sc-grid">
                    {draft.pool.map((h) => (
                        <HeroTile key={h.id} h={h} order={sel.indexOf(h.id) + 1} onClick={() => toggle(h.id)} disabled={sent || sel.length >= size} />
                    ))}
                </div>
                <footer className="sc-foot">
                    <div className="sc-team">
                        <span className="sc-team-label">{L.yourTeam} {sel.length}/{size}</span>
                        <div className="sc-slots">
                            {Array.from({
                                length: size
                            },
                            (_, i) => {
                                const h = sel[i] ? byId.get(sel[i]) : undefined
                                return (
                                    <button key={i} className={`sc-slot${h ? " full" : ""}`} onClick={() => h && toggle(h.id)} disabled={!h || sent} title={h ? heroName(h) : ""}>
                                        {h ? <img src={portrait(h.id)} alt="" draggable={false} onError={hideBroken} /> : <span>{i + 1}</span>}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                    <div className="sc-actions">
                        {sent ? (
                            <div className="sc-sent"><div className="sc-spinner sm" /><div><b>{L.sent}</b><small>{L.sentSub}</small></div></div>
                        ) : (
                            <>
                                <button className="sc-btn" onClick={() => setSel([])} disabled={!sel.length}>{L.clear}</button>
                                <button className="sc-btn gold" onClick={confirm} disabled={sel.length !== size}>
                                    {sel.length === size ? L.confirm : fmt(L.confirmN,
                                        size)}
                                </button>
                            </>
                        )}
                        <Back />
                    </div>
                </footer>
            </div>
        </div>
    )
}

export function EndScreen() {
    const { end, view } = useCard()
    if (!end) return null
    const you = view?.you ?? null
    const won = end.winner !== null && you !== null && end.winner === you
    const kind = end.winner === null ? "draw" : you === null ? "over" : won ? "win" : "lose"
    const title = kind === "win" ? L.victory : kind === "lose" ? L.defeat : kind === "draw" ? L.draw : L.over
    const reason = (kind === "lose" ? L.reasonYouLose : L.reason)[end.reason] ?? end.reason
    const rows: { k: string; v: string }[] = []
    if (view) {
        rows.push({
            k: L.round, v: String(view.round)
        },
        {
            k: L.turn, v: String(view.turnNo)
        })
        if (you) {
            const other = you === "A" ? "B" : "A"
            rows.push({
                k: L.lives, v: `${view.players[you].lives} - ${view.players[other].lives}`
            })
            rows.push({
                k: L.deck, v: `${view.players[you].deckCount} - ${view.players[other].deckCount}`
            })
        }
    }
    return (
        <div className="sc-overlay">
            <div className={`sc-end ${kind}`}>
                <h1>{title}</h1>
                <p className="sc-reason">{reason}</p>
                {rows.length ? (
                    <dl className="sc-sum">
                        {rows.map((r) => (
                            <div key={r.k}><dt>{r.k}</dt><dd>{r.v}</dd></div>
                        ))}
                    </dl>
                ) : null}
                <button className="sc-btn gold" onClick={leave}>{L.back}</button>
            </div>
        </div>
    )
}
