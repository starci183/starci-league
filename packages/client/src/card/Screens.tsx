// Màn ngoài bàn của chế độ thẻ bài: chờ đối thủ, chọn tướng (draft), kết thúc trận.
import {
    useEffect, useRef, useState
} from "react"
import {
    cg
} from "@starci/shared"
import {
    cardActions, useCard, type DraftHero
} from "./store"
import {
    RichText
} from "./RichText"

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
        briefPurpose: "Mục đích / cách thắng", briefEngines: "Động cơ", briefCopies: "lá", quick: "Quick", chainOnly: "Chỉ nối chuỗi",
        combos: "Combo tốt với", counteredBy: "Bị khắc chế bởi", counters: "Khắc chế", cx: {
            "Đơn giản": "Đơn giản", "Vừa": "Vừa", "Phức tạp": "Phức tạp"
        } as Record<string, string>,
        scout: "Phân tích đối thủ", weakTo: "Yếu trước", strongVs: "Khắc chế", warnYou: "Khắc đồng đội của bạn!", beat: "Cách đánh bại", beatUse: "Chọn {x}", beatNone: "Hết tướng khắc chế: chơi theo mục đích của đội mình",
        bCounter: "Khắc chế địch", bCombo: "Combo", bCountered: "Bị địch khắc", bBan: "Nên cấm",
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
        briefPurpose: "Purpose / how it wins", briefEngines: "Engines", briefCopies: "cards", quick: "Quick", chainOnly: "Chain only",
        combos: "Good with", counteredBy: "Countered by", counters: "Counters", cx: {
            "Đơn giản": "Simple", "Vừa": "Medium", "Phức tạp": "Complex"
        } as Record<string, string>,
        scout: "Opponent scouting", weakTo: "Weak to", strongVs: "Counters", warnYou: "Counters one of your picks!", beat: "How to beat", beatUse: "Pick {x}", beatNone: "No counters left: win with your own plan",
        bCounter: "Counters foe", bCombo: "Combo", bCountered: "Foe counters", bBan: "Suggest ban",
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

/** Mục đích + độ khó từng tướng (nguồn: docs/heroes/ENGINES.md; shared chưa export) */
const BRIEF: Record<string, [string, string]> = {
    darius: ["Đơn giản",
        "Đao phủ: rải Chảy Máu rồi kết liễu kẻ đang chảy máu"],
    zed: ["Vừa",
        "Một lượt dồn chết: nhân bản lá trong mộ bằng Bóng"],
    katarina: ["Vừa",
        "Mưa dao găm: tạo lá Dao tạm, hạ gục thì lấy lại chiêu từ mộ"],
    khazix: ["Vừa",
        "Săn mồi cô lập; tiến hoá theo lá thưởng đã lật"],
    qiyana: ["Phức tạp",
        "Nguyên tố = lá trên cùng mộ bài; tự đốt bài để đổi"],
    aatrox: ["Đơn giản",
        "Máu là đạn: tiêu máu mình để chém, yếu máu thì nguy hiểm"],
    garen: ["Đơn giản",
        "Công lý: trừng phạt phe đang dẫn trước (nhiều đồ/mạng/bài hơn)"],
    vayne: ["Vừa",
        "Săn tank: 3 Mũi Tên Bạc theo % máu, Kết Án ghim tường giữa chuỗi"],
    braum: ["Vừa",
        "Chỉ chơi trong lượt đối thủ: mọi lá là phản ứng"],
    blitzcrank: ["Phức tạp",
        "Cướp bài: lá của đối thủ thành vũ khí của mình"],
    leona: ["Vừa",
        "Khoá chặt: Choáng/ngắt chuỗi, Ánh Dương cho đồng đội kích nổ"],
    malphite: ["Đơn giản",
        "Giáp là tất cả; R không thể bị nối chuỗi"],
    ornn: ["Phức tạp",
        "Lò rèn của đội: cấp mảnh Đồ, tiêu Vàng rèn Kiệt Tác"],
    janna: ["Vừa",
        "Chống đòn đánh: thổi bay đòn tay giữa chuỗi"],
    soraka: ["Đơn giản",
        "Bền bài: lá thừa thành máu, xáo mộ để không bao giờ cạn"],
    yorick: ["Phức tạp",
        "Người chăn hồn: lá Yorick trong mộ = linh hồn, Thiếu Nữ ở ô phụ"],
    kogmaw: ["Đơn giản",
        "Lớn lên từ cái chết: Kog Stack sống/chết đều tăng"],
    jinx: ["Đơn giản",
        "Phấn khích dây chuyền: mỗi hạ gục mở đòn tiếp + bài"],
    ashe: ["Đơn giản",
        "Đóng băng nhịp đối thủ: Buốt tướng, đẩy lá chiêu địch xuống đáy bộ"],
    lux: ["Vừa",
        "Chiếu Sáng rồi kích nổ; R xuyên cả hàng"],
    ahri: ["Vừa",
        "Quyến Rũ rồi khai thác mục tiêu bị Quyến Rũ"],
    annie: ["Đơn giản",
        "Gấu Tibbers ở ô phụ là trung tâm mọi lá"],
    lissandra: ["Vừa",
        "Băng giá: Buốt là chìa khoá; Quan Tài Băng nối chuỗi"],
    gangplank: ["Phức tạp",
        "Thùng thuốc súng ở ô phụ, kích nổ bằng Quick giữa lượt địch"],
    renata: ["Phức tạp",
        "Lật kèo: đồng minh sắp chết vẫn đứng dậy, địch càng mạnh càng tự hại"],
    brand: ["Phức tạp",
        "Lửa lan: Bỏng (stack hiện) tự cháy mỗi lượt hoặc kích nổ ngay; chết thì lan"],
    nami: ["Đơn giản",
        "Thuỷ triều nuôi bài: mỗi lá rút thành sức mạnh cho đồng đội"],
    viktor: ["Phức tạp",
        "Tiến hoá bằng mộ bài: mỗi 3 lá Viktor trong mộ = 1 bậc"],
    twistedfate: ["Phức tạp",
        "Kiểm soát bộ bài: tìm lá, soi/huỷ Nấm, xem và phá tay"],
    teemo: ["Phức tạp",
        "Ép cạn bài: Nấm trong bộ địch, rút càng nhiều càng nổ"],
    tristana: ["Vừa",
        "Bom nổ chậm: gắn Bom rồi nện cho nổ, nổ hạ gục thì lá E về tay"],
    missfortune: ["Đơn giản",
        "Mưa đạn: đổi mục tiêu liên tục, Bão Đạn bắn hai nhịp"],
    velkoz: ["Vừa",
        "Phân Rã: chiêu trúng đủ 3 lần thì nổ sát thương chuẩn"],
}
const syn = (id: string) => cg.SYNERGY[id] as cg.HeroSynergy | undefined
const nameOf = (id: string) => (EN ? cg.HERO_EN[id]?.name : undefined) ?? cg.getHero(id)?.name ?? id
const skillIcon = (id: string, k: string) => `/card_skills/${id}_${k.toLowerCase()}.png`

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

interface Mark { counter: boolean; combo: boolean; countered: boolean; ban: boolean }
type Avail = (id: string) => "free" | "out" | "mine"

function HeroTile({ h, state, selected, canAct, mark, onClick, onHover }: {
    h: DraftHero; state: HeroState; selected: boolean; canAct: boolean; mark: Mark; onClick: () => void; onHover: (el: HTMLElement | null) => void
}) {
    const taken = state !== "free"
    const timer = useRef(0)
    const dis = taken || !canAct
    return (
        <button
            className={`sc-hero role-${h.role} st-${state}${selected ? " on" : ""}${dis ? " dis" : ""}`}
            onClick={() => { if (!dis) onClick() }}
            onMouseEnter={(e) => onHover(e.currentTarget)}
            onMouseLeave={() => onHover(null)}
            onTouchStart={(e) => {
                const el = e.currentTarget
                window.clearTimeout(timer.current)
                timer.current = window.setTimeout(() => onHover(el),
                    450)
            }}
            onTouchEnd={() => window.clearTimeout(timer.current)}
            onTouchMove={() => window.clearTimeout(timer.current)}
            onContextMenu={(e) => e.preventDefault()}
        >
            <div className="sc-art">
                <img src={portrait(h.id)} alt="" draggable={false} onError={hideBroken} />
                <span className="sc-role">{L.roles[h.role] ?? h.role}</span>
                {taken ? <span className="sc-taken">{state === "banned" ? L.banned : L.taken}</span> : null}
            </div>
            {!taken ? (
                <div className="sc-badges">
                    {mark.ban ? <span className="bd ban">{L.bBan}</span> : null}
                    {mark.counter ? <span className="bd ctr">{L.bCounter}</span> : null}
                    {mark.countered ? <span className="bd cntd">{L.bCountered}</span> : null}
                    {mark.combo ? <span className="bd cmb">{L.bCombo}</span> : null}
                </div>
            ) : null}
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

function Chip({ id, cls }: { id: string; cls: string }) {
    return (
        <span className={`sc-chip ${cls}`} title={nameOf(id)}>
            <img src={portrait(id)} alt="" draggable={false} onError={hideBroken} />
        </span>
    )
}

function ChipRow({ ids, avail, label, warn }: { ids: string[]; avail: Avail; label: string; warn?: string[] }) {
    if (!ids.length) return null
    return (
        <div className="sc-chiprow">
            <em>{label}</em>
            {ids.map((id) => <Chip key={id} id={id} cls={`${avail(id)}${warn?.includes(id) ? " warn" : ""}`} />)}
        </div>
    )
}

/** Popover thông tin tướng khi rê chuột / nhấn giữ */
function HeroBrief({ id, rect, avail }: { id: string; rect: DOMRect; avail: Avail }) {
    const def = cg.getHero(id)
    if (!def) return null
    const en = EN ? cg.HERO_EN[id] : undefined
    const sy = syn(id)
    const [cx,
        purpose] = BRIEF[id] ?? ["",
        ""]
    const W = 400
    const left = rect.right + 10 + W < window.innerWidth ? rect.right + 10 : Math.max(8,
        rect.left - 10 - W)
    const top = Math.max(8,
        Math.min(rect.top - 20,
            window.innerHeight - 320))
    // tính công thức theo chỉ số gốc của tướng (chưa vào trận, chưa đồ)
    const pv = cg.previewUnit(id)
    const txt = (raw: string) => cg.formulaText(raw,
        pv?.g,
        pv?.u)
    const keys = ["Q",
        "E",
        "R"] as const
    const rows: { k: string; name: string; desc: string; tags: string[]; copies?: number }[] = [
        {
            k: "P", name: en?.passive.name ?? def.passive.name, desc: txt(en?.passive.desc ?? def.passive.desc), tags: []
        },
        ...keys.map((k) => ({
            k,
            name: en?.skills[k].name ?? def.skills[k].name,
            desc: txt(en?.skills[k].desc ?? def.skills[k].desc),
            tags: [def.skills[k].quick ? L.quick : "",
                def.skills[k].chainOnly ? L.chainOnly : ""].filter(Boolean),
            copies: def.skillCopies?.[k] ?? cg.RULES.skillCopies[k],
        })),
    ]
    const heroDesc = en?.desc ?? def.desc
    return (
        <div className="sc-brief" style={{
            left, top, width: W, maxHeight: window.innerHeight - top - 8
        }}>
            <div className="bf-head">
                <img src={portrait(id)} alt="" onError={hideBroken} />
                <div>
                    <b>{en?.name ?? def.name}</b>
                    <div className="bf-tags">
                        <span className={`role-${def.role}`}>{L.roles[def.role] ?? def.role}</span>
                        <span className={`sc-dmg ${def.damage}`}>{def.damage === "magic" ? L.magic : L.phys}</span>
                        {cx ? <span className={`cx cx-${cx === "Đơn giản" ? 1 : cx === "Vừa" ? 2 : 3}`}>{L.cx[cx]}</span> : null}
                    </div>
                    <div className="bf-stats">
                        <span>{L.hp} {def.hp}</span>
                        <span>{L.ad} {def.atk}</span>
                        <span>{L.armor} {def.armor}</span>
                        <span>{L.mr} {def.mr}</span>
                    </div>
                </div>
            </div>
            {purpose ? <p className="bf-purpose"><em>{L.briefPurpose}</em>{purpose}</p> : null}
            {sy ? <p className="bf-eng"><em>{L.briefEngines}</em>{sy.engines.map((e) => cg.ENGINE_NAME[e][EN ? "en" : "vi"]).join(" · ")}</p> : null}
            {heroDesc ? <p className="bf-desc">{txt(heroDesc)}</p> : null}
            <div className="bf-skills">
                {rows.map((r) => (
                    <div key={r.k} className="bf-skill">
                        <img src={skillIcon(id,
                            r.k)} alt="" onError={hideBroken} />
                        <div>
                            <b>
                                <i>{r.k}</i>
                                {r.name}
                                {r.tags.map((t) => <u key={t}>{t}</u>)}
                                {r.copies !== undefined ? <s>{r.copies} {L.briefCopies}</s> : null}
                            </b>
                            <span><RichText text={r.desc} /></span>
                        </div>
                    </div>
                ))}
            </div>
            {sy ? (
                <div className="bf-rel">
                    <ChipRow ids={sy.combos} avail={avail} label={L.combos} />
                    <ChipRow ids={sy.counteredBy} avail={avail} label={L.counteredBy} />
                    <ChipRow ids={cg.countersOf(id)} avail={avail} label={L.counters} />
                </div>
            ) : null}
        </div>
    )
}

/** Ghi chú trinh sát một tướng địch: yếu trước ai, khắc ai, cách đánh bại */
function scoutOf(foeId: string, mine: string[], avail: Avail) {
    const weak = syn(foeId)?.counteredBy ?? []
    const strong = cg.countersOf(foeId)
    const warn = strong.filter((x) => mine.includes(x))
    const usable = weak.filter((x) => avail(x) === "free").map(nameOf)
    const have = weak.filter((x) => mine.includes(x))
    const beat = usable.length ? L.beatUse.replace("{x}",
        usable.slice(0,
            3).join(", ")) : have.length ? `✓ ${have.map(nameOf).join(", ")}` : L.beatNone
    return {
        weak, strong, warn, beat
    }
}

function ScoutBlock({ foeId, mine, avail, compact }: { foeId: string; mine: string[]; avail: Avail; compact?: boolean }) {
    const s = scoutOf(foeId,
        mine,
        avail)
    return (
        <div className={`sc-scout${compact ? " compact" : ""}${s.warn.length ? " danger" : ""}`}>
            <div className="sc-scout-h">
                <Chip id={foeId} cls="free" />
                <b>{nameOf(foeId)}</b>
                <small>{BRIEF[foeId]?.[1] ?? ""}</small>
            </div>
            <ChipRow ids={s.weak} avail={avail} label={L.weakTo} />
            <ChipRow ids={s.strong} avail={avail} label={L.strongVs} warn={s.warn} />
            {s.warn.length ? <div className="sc-warn">⚠ {L.warnYou} ({s.warn.map(nameOf).join(", ")})</div> : null}
            <div className="sc-beat"><em>{L.beat}</em>{s.beat}</div>
        </div>
    )
}

/** Cột đội: các ô chọn (portrait) + các ô cấm (gạch chéo); cột địch thêm ghi chú trinh sát */
function TeamColumn({ title, mine, picks, bans, size, banSlots, byId, active, scout }: {
    title: string; mine: boolean; picks: string[]; bans: string[]; size: number; banSlots: number; byId: Map<string, DraftHero>; active: "ban" | "pick" | null
    scout?: { mine: string[]; avail: Avail }
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
            {scout && picks.length ? (
                <>
                    <h4>{L.scout}</h4>
                    {picks.map((id) => <ScoutBlock key={id} foeId={id} mine={scout.mine} avail={scout.avail} />)}
                </>
            ) : null}
        </aside>
    )
}

export function DraftScreen() {
    const { draft } = useCard()
    const [sel,
        setSel] = useState<string | null>(null)
    const [hover,
        setHover] = useState<{ id: string; rect: DOMRect } | null>(null)
    const secs = useCountdown(draft?.deadlineMs ?? 0,
        draft?.step)
    useEffect(() => { setSel(null) },
        [draft?.step])
    useEffect(() => {
        // chạm ra ngoài thì đóng popover (nhấn giữ trên cảm ứng)
        const close = () => setHover(null)
        document.addEventListener("touchstart",
            close)
        return () => document.removeEventListener("touchstart",
            close)
    },
    [])
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
    const mine = draft.picks[me]
    const theirs = draft.picks[foe]
    const avail: Avail = (id) => {
        const st = stateOf(id)
        return st === "free" ? "free" : st === "mine" ? "mine" : "out"
    }
    const banning = myTurn && turn?.action === "ban"
    const markOf = (id: string): Mark => {
        const s = syn(id)
        return {
            counter: theirs.some((e) => syn(e)?.counteredBy.includes(id)),
            countered: theirs.some((e) => !!s?.counteredBy.includes(e)),
            combo: mine.some((a) => !!s?.combos.includes(a) || !!syn(a)?.combos.includes(id)),
            ban: banning && mine.some((a) => !!syn(a)?.counteredBy.includes(id)),
        }
    }
    const onHover = (id: string) => (el: HTMLElement | null) => setHover(el ? {
        id, rect: el.getBoundingClientRect()
    } : null)
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
                    <TeamColumn title={L.yourTeam} mine picks={mine} bans={bansOf(me)} size={draft.size} banSlots={banSlots} byId={byId} active={turn && turn.side === me ? turn.action : null} />
                    <div className="sc-center">
                        {theirs.length ? (
                            <div className="sc-analysis">
                                <h4>{L.scout}</h4>
                                <div className="sc-analysis-row">
                                    {theirs.map((id) => <ScoutBlock key={id} foeId={id} mine={mine} avail={avail} compact />)}
                                </div>
                            </div>
                        ) : null}
                        <div className="sc-grid">
                            {draft.pool.map((h) => (
                                <HeroTile key={h.id} h={h} state={stateOf(h.id)} selected={sel === h.id} canAct={myTurn} mark={markOf(h.id)} onClick={() => setSel(h.id)} onHover={onHover(h.id)} />
                            ))}
                        </div>
                    </div>
                    <TeamColumn title={L.foeTeam} mine={false} picks={theirs} bans={bansOf(foe)} size={draft.size} banSlots={banSlots} byId={byId} active={turn && turn.side === foe ? turn.action : null} scout={{
                        mine, avail
                    }} />
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
            {hover ? <HeroBrief id={hover.id} rect={hover.rect} avail={avail} /> : null}
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
