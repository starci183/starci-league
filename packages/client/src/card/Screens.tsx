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
        draftTitle: "Cấm / Chọn tướng", draftSub: "Mỗi đội {n} tướng. Tướng đã bị cấm hoặc đã được chọn thì không ai lấy được nữa.",
        yourBan: "Lượt bạn: CẤM 1 tướng", yourPick: "Lượt bạn: CHỌN 1 tướng", foeBan: "Đối thủ đang cấm…", foePick: "Đối thủ đang chọn…",
        doBan: "Cấm", doPick: "Chọn", pickHero: "Chọn 1 tướng", banned: "Đã cấm", taken: "Đã chọn", bans: "Cấm", foeTeam: "Đội địch", done: "Xong, đang vào trận…",
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
        draftTitle: "Ban / Pick", draftSub: "{n} champions per team. Banned or picked champions can't be taken again.",
        yourBan: "Your turn: BAN a champion", yourPick: "Your turn: PICK a champion", foeBan: "Opponent is banning…", foePick: "Opponent is picking…",
        doBan: "Ban", doPick: "Pick", pickHero: "Choose a champion", banned: "Banned", taken: "Picked", bans: "Bans", foeTeam: "Enemy team", done: "Done, starting the match…",
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

type HeroState = "free" | "banned" | "mine" | "theirs"

function HeroTile({ h, state, selected, canAct, onClick }: { h: DraftHero; state: HeroState; selected: boolean; canAct: boolean; onClick: () => void }) {
    const taken = state !== "free"
    return (
        <button className={`sc-hero role-${h.role} st-${state}${selected ? " on" : ""}`} onClick={onClick} disabled={taken || !canAct}>
            <div className="sc-art">
                <img src={portrait(h.id)} alt="" draggable={false} onError={hideBroken} />
                <span className="sc-role">{L.roles[h.role] ?? h.role}</span>
                {taken ? <span className="sc-taken">{state === "banned" ? L.banned : L.taken}</span> : null}
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

/** Cột đội: các ô chọn (portrait) + các ô cấm (gạch chéo) */
function TeamColumn({ title, mine, picks, bans, size, banSlots, byId, active }: {
    title: string; mine: boolean; picks: string[]; bans: string[]; size: number; banSlots: number; byId: Map<string, DraftHero>; active: "ban" | "pick" | null
}) {
    return (
        <aside className={`sc-col${mine ? " mine" : " foe"}${active ? " active" : ""}`}>
            <h3>{title}</h3>
            <div className="sc-picks">
                {Array.from({
                    length: size
                },
                (_, i) => {
                    const h = picks[i] ? byId.get(picks[i]) : undefined
                    const next = active === "pick" && i === picks.length
                    return (
                        <div key={i} className={`sc-pickslot${h ? " full" : ""}${next ? " next" : ""}`}>
                            {h ? <img src={portrait(h.id)} alt="" draggable={false} onError={hideBroken} /> : <span>{i + 1}</span>}
                            {h ? <b>{heroName(h)}</b> : null}
                        </div>
                    )
                })}
            </div>
            {banSlots > 0 ? (
                <>
                    <h4>{L.bans}</h4>
                    <div className="sc-bans">
                        {Array.from({
                            length: banSlots
                        },
                        (_, i) => {
                            const h = bans[i] ? byId.get(bans[i]) : undefined
                            const next = active === "ban" && i === bans.length
                            return (
                                <div key={i} className={`sc-banslot${h ? " full" : ""}${next ? " next" : ""}`} title={h ? heroName(h) : ""}>
                                    {h ? <img src={portrait(h.id)} alt="" draggable={false} onError={hideBroken} /> : null}
                                </div>
                            )
                        })}
                    </div>
                </>
            ) : null}
        </aside>
    )
}

export function DraftScreen() {
    const { draft } = useCard()
    const [sel,
        setSel] = useState<string | null>(null)
    const secs = useCountdown(draft?.deadlineMs ?? 0,
        draft?.step)
    useEffect(() => { setSel(null) },
        [draft?.step])
    if (!draft) return <div className="cg-center">…</div>
    const me = draft.you ?? "A"
    const foe = me === "A" ? "B" : "A"
    const byId = new Map(draft.pool.map((h) => [h.id,
        h]))
    const turn = draft.turn
    const myTurn = !!turn && turn.side === me && draft.you !== null
    // cấm của mỗi bên: lượt cấm thứ i trong order thuộc về bên nào
    const banTurns = draft.order.filter((t) => t.action === "ban")
    const bansOf = (side: "A" | "B") => draft.bans.filter((_, i) => banTurns[i]?.side === side)
    const banSlots = banTurns.filter((t) => t.side === me).length
    const stateOf = (id: string): HeroState => draft.bans.includes(id) ? "banned" : draft.picks[me].includes(id) ? "mine" : draft.picks[foe].includes(id) ? "theirs" : "free"
    const status = !turn ? L.done : myTurn ? (turn.action === "ban" ? L.yourBan : L.yourPick) : (turn.action === "ban" ? L.foeBan : L.foePick)
    const confirm = () => { if (sel && myTurn) { cardActions.draftAct(sel); setSel(null) } }
    return (
        <div className="sc-stage">
            <div className="sc-draft bp">
                <header className="sc-head">
                    <div>
                        <h1>{L.draftTitle}</h1>
                        <p>{fmt(L.draftSub,
                            draft.size)}</p>
                    </div>
                    <div className="sc-status">
                        <span className={`sc-pill turn${myTurn ? " mine" : ""}${turn?.action === "ban" ? " ban" : ""}`}>{status}</span>
                        {secs !== null ? <span className={`sc-timer${secs <= 10 ? " low" : ""}`}>{L.timeLeft} {secs}s</span> : null}
                    </div>
                </header>
                <div className="sc-order-strip">
                    {draft.order.map((t, i) => (
                        <span key={i} className={`sc-step ${t.action}${t.side === me ? " me" : " foe"}${i === draft.step ? " now" : ""}${i < draft.step ? " past" : ""}`}>
                            {t.action === "ban" ? "✕" : "●"}
                        </span>
                    ))}
                </div>
                <div className="sc-bp-body">
                    <TeamColumn title={L.yourTeam} mine picks={draft.picks[me]} bans={bansOf(me)} size={draft.size} banSlots={banSlots} byId={byId} active={turn && turn.side === me ? turn.action : null} />
                    <div className="sc-grid">
                        {draft.pool.map((h) => (
                            <HeroTile key={h.id} h={h} state={stateOf(h.id)} selected={sel === h.id} canAct={myTurn} onClick={() => setSel(h.id)} />
                        ))}
                    </div>
                    <TeamColumn title={L.foeTeam} mine={false} picks={draft.picks[foe]} bans={bansOf(foe)} size={draft.size} banSlots={banSlots} byId={byId} active={turn && turn.side === foe ? turn.action : null} />
                </div>
                <footer className="sc-foot">
                    <div className="sc-team">
                        <span className="sc-team-label">{sel ? heroName(byId.get(sel)!) : myTurn ? L.pickHero : status}</span>
                    </div>
                    <div className="sc-actions">
                        {myTurn ? (
                            <button className={`sc-btn ${turn!.action === "ban" ? "red" : "gold"}`} onClick={confirm} disabled={!sel}>
                                {turn!.action === "ban" ? L.doBan : L.doPick}
                            </button>
                        ) : null}
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
